import { describe, expect, it } from "vitest";
import {
  HeadsDownClient,
  INTEGRATION_EVENT_MANIFEST,
  INTEGRATION_EVENT_TYPE,
  ValidationError,
  assertIntegrationEvent,
  buildAgentRunEventInput,
  contextCompactedEvent,
  integrationEvent,
  permissionDeniedEvent,
  sessionEndedEvent,
  sessionStartedEvent,
  toolFailedEvent,
  toolInvokedEvent,
  toolSucceededEvent,
  turnEndedEvent,
  turnFailedEvent,
  turnStartedEvent,
  type IntegrationEvent,
  type IntegrationEventVariant,
} from "../src/index.js";

const CONTEXT = {
  runId: "run_test",
  workspaceRef: "ws_test",
  source: "sdk",
  client: { kind: "sdk", name: "SDK", version: "0.0.0" },
  actor: { kind: "agent" as const, ref: "test" },
};

const STRICT_DECISION_ID = "decision_abcdef0123456789";

const ALL_VARIANT_FIXTURES: ReadonlyArray<{
  name: IntegrationEventVariant;
  event: IntegrationEvent;
}> = [
  { name: "session_started", event: { type: "session_started", session_id: "sess_1" } },
  {
    name: "session_ended",
    event: {
      type: "session_ended",
      session_id: "sess_1",
      outcome: "succeeded",
      duration_seconds: 120,
      turn_count: 4,
    },
  },
  {
    name: "turn_started",
    event: { type: "turn_started", turn_id: "turn_1", session_id: "sess_1", sequence: 0 },
  },
  {
    name: "turn_ended",
    event: {
      type: "turn_ended",
      turn_id: "turn_1",
      session_id: "sess_1",
      tool_calls_count: 3,
      duration_seconds: 8,
    },
  },
  {
    name: "turn_failed",
    event: {
      type: "turn_failed",
      turn_id: "turn_1",
      session_id: "sess_1",
      reason: "api_error",
    },
  },
  {
    name: "tool_invoked",
    event: {
      type: "tool_invoked",
      tool_id: "tool_1",
      session_id: "sess_1",
      turn_id: "turn_1",
      tool_kind: "write",
      tool_name_bucket: "bash",
    },
  },
  {
    name: "tool_succeeded",
    event: {
      type: "tool_succeeded",
      tool_id: "tool_1",
      session_id: "sess_1",
      duration_ms_bucket: "100ms_to_1s",
    },
  },
  {
    name: "tool_failed",
    event: {
      type: "tool_failed",
      tool_id: "tool_1",
      session_id: "sess_1",
      reason: "execution_error",
    },
  },
  {
    name: "permission_denied",
    event: {
      type: "permission_denied",
      decision_id: STRICT_DECISION_ID,
      session_id: "sess_1",
      action_kind_bucket: "shell_destructive",
      resolution: "user_denied",
    },
  },
  {
    name: "context_compacted",
    event: {
      type: "context_compacted",
      session_id: "sess_1",
      prior_context_bucket: "100k_to_200k",
      post_context_bucket: "10k_to_50k",
    },
  },
];

describe("INTEGRATION_EVENT_MANIFEST", () => {
  it("manifest variants cover every key in INTEGRATION_EVENT_TYPE", () => {
    expect(new Set(Object.keys(INTEGRATION_EVENT_MANIFEST.variants))).toEqual(
      new Set(Object.keys(INTEGRATION_EVENT_TYPE)),
    );
  });

  it("manifest wire types match INTEGRATION_EVENT_TYPE values", () => {
    for (const [variant, spec] of Object.entries(INTEGRATION_EVENT_MANIFEST.variants)) {
      expect(spec.wire_type).toBe(INTEGRATION_EVENT_TYPE[variant as IntegrationEventVariant]);
    }
  });

  it("manifest wire types are uniformly namespaced under integration.*", () => {
    for (const spec of Object.values(INTEGRATION_EVENT_MANIFEST.variants)) {
      expect(spec.wire_type.startsWith("integration.")).toBe(true);
    }
  });

  it("manifest version is a positive integer", () => {
    expect(INTEGRATION_EVENT_MANIFEST.version).toBeGreaterThan(0);
    expect(Number.isInteger(INTEGRATION_EVENT_MANIFEST.version)).toBe(true);
  });

  it("manifest enum value lists are non-empty when present and use only privacy-safe tokens", () => {
    const SAFE_TOKEN = /^[A-Za-z0-9_.:-]{1,256}$/;

    for (const [variant, spec] of Object.entries(INTEGRATION_EVENT_MANIFEST.variants)) {
      for (const [field, values] of Object.entries(spec.enums)) {
        expect(values.length, `${variant}.${field} enum is empty`).toBeGreaterThan(0);
        for (const value of values) {
          expect(value, `${variant}.${field} value '${value}' is unsafe`).toMatch(SAFE_TOKEN);
        }
      }
    }
  });

  it("required and optional field lists are disjoint per variant", () => {
    for (const [variant, spec] of Object.entries(INTEGRATION_EVENT_MANIFEST.variants)) {
      const requiredSet = new Set<string>(spec.required);
      const overlap = (spec.optional as readonly string[]).filter((field) =>
        requiredSet.has(field),
      );
      expect(overlap, `${variant} has fields in both required and optional: ${overlap}`).toEqual(
        [],
      );
    }
  });
});

describe("IntegrationEvent variants", () => {
  it("covers every variant in INTEGRATION_EVENT_TYPE", () => {
    expect(new Set(ALL_VARIANT_FIXTURES.map((f) => f.name))).toEqual(
      new Set(Object.keys(INTEGRATION_EVENT_TYPE) as IntegrationEventVariant[]),
    );
  });

  for (const { name, event } of ALL_VARIANT_FIXTURES) {
    it(`${name} round-trips through assertIntegrationEvent`, () => {
      const { eventType, payload } = assertIntegrationEvent(event);

      expect(eventType).toBe(INTEGRATION_EVENT_TYPE[name]);
      expect(eventType.startsWith("integration.")).toBe(true);
      expect(payload).not.toHaveProperty("type");

      for (const [key, value] of Object.entries(event)) {
        if (key === "type") continue;
        expect(payload[key]).toEqual(value);
      }
    });

    it(`${name} survives buildAgentRunEventInput end-to-end`, () => {
      const input = integrationEvent(CONTEXT, event);
      const envelope = buildAgentRunEventInput(input);

      expect(envelope.eventType).toBe(INTEGRATION_EVENT_TYPE[name]);
      expect(envelope.runId).toBe(CONTEXT.runId);
      expect(envelope.privacyMode).toBe("metadata_only");
      expect(envelope.payload).toBeDefined();
    });
  }
});

describe("IntegrationEvent privacy filter", () => {
  it("rejects prohibited fields nested in payload", () => {
    expect(() =>
      assertIntegrationEvent({
        type: "session_started",
        session_id: "sess_1",
        // @ts-expect-error injecting a non-typed field to assert runtime rejection
        prompt: "the user typed something here",
      }),
    ).toThrow(ValidationError);
  });

  // Tokens previously in the hosted prohibited list but not on the SDK side.
  // Adding a fresh case here so any future drift between the two lists is
  // caught at the SDK boundary rather than only at the hosted resolver.
  for (const prohibited of [
    "model_responses",
    "transcript",
    "transcripts",
    "repo_name",
    "git_repo",
    "git_repository",
    "git_branch",
    "source",
  ]) {
    it(`rejects '${prohibited}' as a top-level payload key`, () => {
      const event = {
        type: "session_started",
        session_id: "sess_1",
        [prohibited]: "any value",
      } as unknown as IntegrationEvent;

      expect(() => assertIntegrationEvent(event)).toThrow(ValidationError);
    });
  }

  it("allows envelope-level 'source' through buildAgentRunEventInput (regression guard)", () => {
    const envelope = buildAgentRunEventInput(
      integrationEvent(CONTEXT, { type: "session_started", session_id: "sess_1" }),
    );
    expect(envelope.source).toBe(CONTEXT.source);
  });

  it("rejects 'source' nested inside an integration payload", () => {
    const event = {
      type: "session_started",
      session_id: "sess_1",
      source: "smuggled",
    } as unknown as IntegrationEvent;

    expect(() => assertIntegrationEvent(event)).toThrow(ValidationError);
  });

  it("rejects file paths smuggled in bucket strings", () => {
    expect(() =>
      assertIntegrationEvent({
        type: "tool_invoked",
        tool_id: "tool_1",
        session_id: "sess_1",
        tool_kind: "write",
        tool_name_bucket: "/Users/me/secrets/file.json",
      }),
    ).toThrow(ValidationError);
  });

  it("rejects URLs in action_kind_bucket", () => {
    expect(() =>
      assertIntegrationEvent({
        type: "permission_denied",
        decision_id: STRICT_DECISION_ID,
        session_id: "sess_1",
        action_kind_bucket: "https://example.com/private",
        resolution: "user_denied",
      }),
    ).toThrow(ValidationError);
  });
});

describe("IntegrationEvent variant validation", () => {
  it("rejects unknown variant types", () => {
    expect(() =>
      assertIntegrationEvent({
        // @ts-expect-error invalid type
        type: "unknown_variant",
        session_id: "sess_1",
      }),
    ).toThrow(/Unknown IntegrationEvent type/);
  });

  it("rejects prototype-pollution lookups via inherited properties", () => {
    expect(() =>
      assertIntegrationEvent({
        // @ts-expect-error toString is a prototype property, not a variant
        type: "toString",
      }),
    ).toThrow(/Unknown IntegrationEvent type/);
  });

  it("rejects empty session_id on session_started", () => {
    expect(() => assertIntegrationEvent({ type: "session_started", session_id: "" })).toThrow(
      /session_id/,
    );
  });

  it("rejects empty turn_id on turn_started", () => {
    expect(() =>
      assertIntegrationEvent({ type: "turn_started", turn_id: "", session_id: "sess_1" }),
    ).toThrow(/turn_id/);
  });

  it("rejects empty tool_id on tool_invoked", () => {
    expect(() =>
      assertIntegrationEvent({
        type: "tool_invoked",
        tool_id: "",
        session_id: "sess_1",
        tool_kind: "read",
      }),
    ).toThrow(/tool_id/);
  });

  it("rejects ill-formed decision_id on permission_denied (strict opaque format)", () => {
    expect(() =>
      assertIntegrationEvent({
        type: "permission_denied",
        decision_id: "dec_1",
        session_id: "sess_1",
        action_kind_bucket: "shell_destructive",
        resolution: "user_denied",
      }),
    ).toThrow(/decision_id/);
  });

  it("rejects negative integer counts", () => {
    expect(() =>
      assertIntegrationEvent({
        type: "turn_ended",
        turn_id: "turn_1",
        session_id: "sess_1",
        tool_calls_count: -1,
      }),
    ).toThrow(/tool_calls_count/);
  });

  it("rejects non-array capabilities", () => {
    expect(() =>
      assertIntegrationEvent({
        type: "session_started",
        session_id: "sess_1",
        // @ts-expect-error capabilities must be an array
        capabilities: "not-an-array",
      }),
    ).toThrow(/capabilities/);
  });

  it("rejects empty-string elements in capabilities", () => {
    expect(() =>
      assertIntegrationEvent({
        type: "session_started",
        session_id: "sess_1",
        capabilities: ["bash", ""],
      }),
    ).toThrow(/capabilities must contain non-empty strings/);
  });

  it("rejects non-string elements in capabilities", () => {
    expect(() =>
      assertIntegrationEvent({
        type: "session_started",
        session_id: "sess_1",
        // @ts-expect-error 42 is not a string
        capabilities: ["bash", 42],
      }),
    ).toThrow(/capabilities must contain non-empty strings/);
  });

  it("rejects out-of-range tool_kind", () => {
    expect(() =>
      assertIntegrationEvent({
        type: "tool_invoked",
        tool_id: "tool_1",
        session_id: "sess_1",
        // @ts-expect-error invalid tool_kind
        tool_kind: "network",
      }),
    ).toThrow(/tool_kind/);
  });

  it("rejects out-of-range duration_ms_bucket", () => {
    expect(() =>
      assertIntegrationEvent({
        type: "tool_succeeded",
        tool_id: "tool_1",
        session_id: "sess_1",
        // @ts-expect-error invalid bucket
        duration_ms_bucket: "very_fast",
      }),
    ).toThrow(/duration_ms_bucket/);
  });

  it("rejects out-of-range prior_context_bucket", () => {
    expect(() =>
      assertIntegrationEvent({
        type: "context_compacted",
        session_id: "sess_1",
        // @ts-expect-error invalid bucket
        prior_context_bucket: "huge",
        post_context_bucket: "10k_to_50k",
      }),
    ).toThrow(/prior_context_bucket/);
  });

  it("requires post_context_bucket on context_compacted", () => {
    const partial = {
      type: "context_compacted",
      session_id: "sess_1",
    } as unknown as IntegrationEvent;

    expect(() => assertIntegrationEvent(partial)).toThrow(/post_context_bucket/);
  });
});

describe("IntegrationEvent open reason unions", () => {
  it("accepts a known turn_failed reason", () => {
    const { payload } = assertIntegrationEvent({
      type: "turn_failed",
      turn_id: "turn_1",
      session_id: "sess_1",
      reason: "rate_limited",
    });
    expect(payload.reason).toBe("rate_limited");
  });

  it("accepts an unknown but privacy-safe turn_failed reason", () => {
    const { payload } = assertIntegrationEvent({
      type: "turn_failed",
      turn_id: "turn_1",
      session_id: "sess_1",
      reason: "context_length_exceeded",
    });
    expect(payload.reason).toBe("context_length_exceeded");
  });

  it("rejects a privacy-unsafe reason value", () => {
    expect(() =>
      assertIntegrationEvent({
        type: "turn_failed",
        turn_id: "turn_1",
        session_id: "sess_1",
        reason: "user said: secret token=abc123",
      }),
    ).toThrow(/reason/);
  });

  it("accepts unknown but privacy-safe tool_failed reasons", () => {
    const { payload } = assertIntegrationEvent({
      type: "tool_failed",
      tool_id: "tool_1",
      session_id: "sess_1",
      reason: "transient_network_blip",
    });
    expect(payload.reason).toBe("transient_network_blip");
  });
});

describe("per-variant helpers", () => {
  it("sessionStartedEvent constructs an envelope with capabilities", () => {
    const input = sessionStartedEvent(CONTEXT, {
      session_id: "sess_1",
      capabilities: ["bash", "web_fetch"],
    });
    expect(input.eventType).toBe(INTEGRATION_EVENT_TYPE.session_started);
    expect(input.payload).toEqual({
      session_id: "sess_1",
      capabilities: ["bash", "web_fetch"],
    });
  });

  it("sessionEndedEvent carries outcome and counts", () => {
    const input = sessionEndedEvent(CONTEXT, {
      session_id: "sess_1",
      outcome: "cancelled",
      turn_count: 7,
    });
    expect(input.payload?.outcome).toBe("cancelled");
    expect(input.payload?.turn_count).toBe(7);
  });

  it("turnStartedEvent / turnEndedEvent / turnFailedEvent share session_id", () => {
    const started = turnStartedEvent(CONTEXT, { turn_id: "t1", session_id: "s1" });
    const ended = turnEndedEvent(CONTEXT, {
      turn_id: "t1",
      session_id: "s1",
      tool_calls_count: 2,
    });
    const failed = turnFailedEvent(CONTEXT, {
      turn_id: "t1",
      session_id: "s1",
      reason: "timeout",
    });
    expect(started.payload?.session_id).toBe("s1");
    expect(ended.payload?.session_id).toBe("s1");
    expect(failed.payload?.session_id).toBe("s1");
    expect(failed.payload?.reason).toBe("timeout");
  });

  it("toolInvokedEvent / toolSucceededEvent / toolFailedEvent share tool_id", () => {
    const invoked = toolInvokedEvent(CONTEXT, {
      tool_id: "t1",
      session_id: "s1",
      tool_kind: "read",
    });
    const succeeded = toolSucceededEvent(CONTEXT, {
      tool_id: "t1",
      session_id: "s1",
      duration_ms_bucket: "under_100ms",
    });
    const failed = toolFailedEvent(CONTEXT, {
      tool_id: "t1",
      session_id: "s1",
      reason: "permission_denied",
    });
    expect(invoked.payload?.tool_kind).toBe("read");
    expect(succeeded.payload?.duration_ms_bucket).toBe("under_100ms");
    expect(failed.payload?.reason).toBe("permission_denied");
  });

  it("permissionDeniedEvent and contextCompactedEvent build envelopes", () => {
    const denied = permissionDeniedEvent(CONTEXT, {
      decision_id: STRICT_DECISION_ID,
      session_id: "s1",
      action_kind_bucket: "shell_destructive",
      resolution: "user_denied",
    });
    const compacted = contextCompactedEvent(CONTEXT, {
      session_id: "s1",
      prior_context_bucket: "over_200k",
      post_context_bucket: "50k_to_100k",
    });
    expect(denied.eventType).toBe(INTEGRATION_EVENT_TYPE.permission_denied);
    expect(compacted.eventType).toBe(INTEGRATION_EVENT_TYPE.context_compacted);
  });
});

describe("HeadsDownClient.reportAgentRunEvent transports integration events", () => {
  it("wires an IntegrationEvent envelope through to the GraphQL mutation", async () => {
    const calls: Array<{ query: string; variables?: Record<string, unknown> }> = [];
    const fetch = (async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body ?? "{}")) as {
        query: string;
        variables?: Record<string, unknown>;
      };
      calls.push(body);
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          data: {
            reportAgentRunEvent: {
              ok: true,
              error: null,
              event: {
                id: "row-1",
                eventId: "018f3f3a-5555-7cc8-9a20-000000000099",
                eventType: "INTEGRATION.SESSION_STARTED",
                schemaVersion: 1,
                occurredAt: "2026-04-24T17:29:00Z",
                receivedAt: "2026-04-24T17:29:01Z",
                workspaceRef: "ws_test",
                client: { kind: "sdk", name: "SDK", version: "0.0.0" },
                actor: { kind: "agent", ref: "test" },
                runId: "run_test",
                source: "sdk",
                privacyMode: "METADATA_ONLY",
                idempotencyKey: "run_test:integration.session_started:0",
                emitterKey: "sdk:agent",
                payload: { session_id: "sess_1" },
                insertedAt: "2026-04-24T17:29:01Z",
              },
            },
          },
        }),
        text: async () => "",
      };
    }) as unknown as typeof globalThis.fetch;

    const client = new HeadsDownClient({
      apiKey: "hd_test_key",
      baseUrl: "https://test.headsdown.app",
      fetch,
    });

    const result = await client.reportAgentRunEvent(
      sessionStartedEvent(CONTEXT, { session_id: "sess_1" }),
    );

    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(1);
    const variables = calls[0]?.variables ?? {};
    const sentInput = variables.input as { eventType?: string; idempotencyKey?: string };
    expect(sentInput.eventType).toBe(INTEGRATION_EVENT_TYPE.session_started);
    expect(typeof sentInput.idempotencyKey).toBe("string");
    expect(sentInput.idempotencyKey).toMatch(/^run_test:integration\.session_started:/);
  });
});

describe("idempotency-key generation for integration events", () => {
  it("buildAgentRunEventInput assigns a stable idempotency key per integration variant", () => {
    const a = buildAgentRunEventInput(
      integrationEvent(CONTEXT, { type: "session_started", session_id: "s1" }),
    );
    const b = buildAgentRunEventInput(
      integrationEvent(CONTEXT, { type: "session_started", session_id: "s1" }),
    );
    expect(a.idempotencyKey).toBeDefined();
    expect(b.idempotencyKey).toBeDefined();
    expect(a.idempotencyKey).toMatch(/^run_test:integration\.session_started:/);
    expect(b.idempotencyKey).toMatch(/^run_test:integration\.session_started:/);
  });

  it("respects a caller-supplied idempotency key", () => {
    const envelope = buildAgentRunEventInput({
      ...integrationEvent(CONTEXT, { type: "session_started", session_id: "s1" }),
      idempotencyKey: "custom-key",
    });
    expect(envelope.idempotencyKey).toBe("custom-key");
  });
});
