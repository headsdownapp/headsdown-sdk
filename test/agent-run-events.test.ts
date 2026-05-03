import { describe, expect, it } from "vitest";
import {
  HeadsDownClient,
  ValidationError,
  bucketFileCount,
  bucketScopeGrowth,
  buildAgentRunEventInput,
  deferredDecisionReAttemptedEvent,
  deferredDecisionResolvedEvent,
  DeferredDecisionReAttemptOutcome,
  DeferredDecisionResolutionKind,
} from "../src/index.js";

const CLIENT_OPTS = { apiKey: "hd_test_key", baseUrl: "https://test.headsdown.app" };

function captureGraphQL(data: unknown) {
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
      json: async () => ({ data }),
      text: async () => JSON.stringify({ data }),
      headers: new Headers(),
    };
  }) as unknown as typeof globalThis.fetch;

  return { fetch, calls };
}

describe("agent run event helpers", () => {
  it("serializes progress events through progressPayload with GraphQL enum names", async () => {
    const { fetch, calls } = captureGraphQL({
      reportAgentRunEvent: {
        ok: true,
        error: null,
        event: {
          id: "evt-row-1",
          eventId: "018f3f3a-5555-7cc8-9a20-000000000005",
          eventType: "AGENT_RUN.PROGRESS_REPORTED",
          schemaVersion: 1,
          occurredAt: "2026-04-24T17:29:00Z",
          receivedAt: "2026-04-24T17:29:01Z",
          workspaceRef: "unknown",
          client: { kind: "pi", name: "Pi", version: "0.2.0" },
          actor: { kind: "agent", ref: "pi" },
          runId: "run_1",
          source: "pi_skill",
          privacyMode: "METADATA_ONLY",
          idempotencyKey: "run_1:progress:1",
          sequence: 1,
          emitterKey: "pi:agent",
          proposalRef: "proposal-1",
          payload: { elapsed_seconds: 30 },
          insertedAt: "2026-04-24T17:29:01Z",
        },
      },
    });
    const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch });

    await client.reportAgentRunProgress(
      {
        runId: "run_1",
        workspaceRef: "unknown",
        source: "pi_skill",
        client: { kind: "pi", name: "Pi", version: "0.2.0" },
        actor: { kind: "agent", ref: "pi" },
        proposalRef: "proposal-1",
        sequence: 1,
        idempotencyKey: "run_1:progress:1",
      },
      {
        elapsedSeconds: 30,
        toolCallsCount: 3,
        toolReadCount: 1,
        toolWriteCount: 1,
        toolExternalCount: 1,
        filesReadBucket: "0",
        filesModifiedBucket: "3_to_5",
        validationLevel: "targeted",
        validationStatus: "running",
        retryCount: 0,
        failureCount: 0,
        scopeChanged: true,
        redirectCount: 1,
        progressState: "working",
        scopeGrowthBucket: "1_to_2_files",
        spendEstimateBucket: "1_to_5",
      },
    );

    const input = calls[0]!.variables!.input as Record<string, unknown>;
    expect(calls[0]!.query).toContain("reportAgentRunEvent");
    expect(input.eventType).toBe("agent_run.progress_reported");
    expect(input.privacyMode).toBe("METADATA_ONLY");
    expect(input.payload).toBeUndefined();
    expect(input.progressPayload).toMatchObject({
      filesReadBucket: "_0",
      filesModifiedBucket: "_3_TO_5",
      validationLevel: "TARGETED",
      validationStatus: "RUNNING",
      progressState: "WORKING",
      scopeGrowthBucket: "_1_TO_2_FILES",
      spendEstimateBucket: "_1_TO_5",
    });
  });

  it("serializes non-progress taxonomy events as metadata-only payloads", async () => {
    const { fetch, calls } = captureGraphQL({
      reportAgentRunEvent: { ok: true, error: null, event: null },
    });
    const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch });

    await client.reportAgentRunStarted(
      {
        runId: "run_2",
        workspaceRef: "unknown",
        idempotencyKey: "run_2:started",
      },
      {
        task_category: "coding_agent_change",
        task_size_bucket: "small",
        started_by: "agent",
        initial_call_key: "good_to_run",
      },
    );

    const input = calls[0]!.variables!.input as Record<string, unknown>;
    expect(input.progressPayload).toBeUndefined();
    expect(input.client).toEqual({ kind: "sdk", name: "SDK", version: "unknown" });
    expect(input.actor).toEqual({ kind: "agent", ref: "sdk" });
    expect(input.source).toBe("sdk");
    expect(input.payload).toEqual({
      task_category: "coding_agent_change",
      task_size_bucket: "small",
      started_by: "agent",
      initial_call_key: "good_to_run",
    });
  });

  it("rejects prohibited raw-content fields and unsafe values before GraphQL", () => {
    expect(() =>
      buildAgentRunEventInput({
        eventType: "agent_run.started",
        runId: "run_3",
        payload: {
          task_category: "coding_agent_change",
          file_path: "/private/repo/src/foo.ts",
        },
      }),
    ).toThrow(ValidationError);

    expect(() =>
      buildAgentRunEventInput({
        eventType: "agent_run.started",
        runId: "run_3",
        payload: {
          task_category: "coding_agent_change",
          branch_hint: "feature/my-branch",
        },
      }),
    ).toThrow(ValidationError);
  });

  it("rejects prohibited camelCase and compact raw-content aliases", () => {
    for (const payload of [
      { filePath: "/private/repo/src/foo.ts" },
      { fileContent: "export const safe = false;" },
      { promptText: "summarize this private transcript" },
      { commandOutput: "tests passed" },
      { apiKey: "hd_secret" },
      { nested: { calendarDescription: "private planning notes" } },
      { items: [{ terminalOutput: "stdout from a command" }] },
      { "api.key": "hd_secret" },
      { "file/path": "/private/repo/src/foo.ts" },
    ]) {
      expect(() =>
        buildAgentRunEventInput({
          eventType: "agent_run.started",
          runId: "run_3",
          payload,
        }),
      ).toThrow(ValidationError);
    }
  });

  it("rejects serializable objects before JSON can expand them", () => {
    class UnsafeSerializable {
      toJSON() {
        return { file_path: "/private/repo/src/foo.ts" };
      }
    }

    const rootToJson = { task_category: "coding_agent_change" };
    Object.defineProperty(rootToJson, "toJSON", {
      value: () => ({ file_path: "/private/repo/src/foo.ts" }),
    });

    const nestedToJson = { task_category: "coding_agent_change", nested: {} };
    Object.defineProperty(nestedToJson.nested, "toJSON", {
      value: () => ({ prompt_text: "private prompt" }),
    });

    for (const payload of [{ wrapped: new UnsafeSerializable() }, rootToJson, nestedToJson]) {
      expect(() =>
        buildAgentRunEventInput({
          eventType: "agent_run.started",
          runId: "run_3",
          payload,
        }),
      ).toThrow(ValidationError);
    }
  });

  it("rejects accessor metadata properties before JSON can observe changing values", () => {
    let serializeUnsafeValue = false;
    const payload = {} as Record<string, unknown>;
    Object.defineProperty(payload, "task_category", {
      enumerable: true,
      get: () => (serializeUnsafeValue ? "/private/repo/src/foo.ts" : "coding_agent_change"),
    });
    serializeUnsafeValue = true;

    expect(() =>
      buildAgentRunEventInput({
        eventType: "agent_run.started",
        runId: "run_3",
        payload,
      }),
    ).toThrow(ValidationError);
  });

  it("rejects arrays that could read inherited index values during JSON serialization", () => {
    const inheritedIndexArray: unknown[] = [];
    const prototype = Object.create(Array.prototype) as unknown[];
    Object.defineProperty(prototype, "0", {
      configurable: true,
      get: () => "/private/repo/src/foo.ts",
    });
    Object.setPrototypeOf(inheritedIndexArray, prototype);
    inheritedIndexArray.length = 1;

    expect(() =>
      buildAgentRunEventInput({
        eventType: "agent_run.started",
        runId: "run_3",
        payload: { categories: inheritedIndexArray },
      }),
    ).toThrow(ValidationError);
  });

  it("rejects inherited JSON serialization hooks", () => {
    const objectToJson = Object.getOwnPropertyDescriptor(Object.prototype, "toJSON");
    const arrayToJson = Object.getOwnPropertyDescriptor(Array.prototype, "toJSON");

    try {
      Object.defineProperty(Object.prototype, "toJSON", {
        configurable: true,
        value: () => ({ file_path: "/private/repo/src/foo.ts" }),
      });
      expect(() =>
        buildAgentRunEventInput({
          eventType: "agent_run.started",
          runId: "run_3",
          payload: { task_category: "coding_agent_change" },
        }),
      ).toThrow(ValidationError);

      delete (Object.prototype as { toJSON?: unknown }).toJSON;
      Object.defineProperty(Array.prototype, "toJSON", {
        configurable: true,
        value: () => [{ file_path: "/private/repo/src/foo.ts" }],
      });
      expect(() =>
        buildAgentRunEventInput({
          eventType: "agent_run.started",
          runId: "run_3",
          payload: { categories: ["coding_agent_change"] },
        }),
      ).toThrow(ValidationError);
    } finally {
      restorePrototypeProperty(Object.prototype, "toJSON", objectToJson);
      restorePrototypeProperty(Array.prototype, "toJSON", arrayToJson);
    }
  });

  it("builds deferred decision resolved events with deterministic idempotency key", () => {
    const event = deferredDecisionResolvedEvent(
      { runId: "run_42" },
      {
        decision_id: "decision_abcdef1234567890",
        resolution_kind: "approved",
      },
    );

    expect(event.eventType).toBe("deferred_decision.resolved");
    expect(event.idempotencyKey).toBe(
      "run_42:deferred_decision.resolved:decision_abcdef1234567890",
    );
    expect(event.payload).toEqual({
      decision_id: "decision_abcdef1234567890",
      resolution_kind: "approved",
    });
  });

  it("reports deferred decision resolved events through the client", async () => {
    const { fetch, calls } = captureGraphQL({
      reportAgentRunEvent: { ok: true, error: null, event: null },
    });
    const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch });

    await client.reportDeferredDecisionResolved(
      { runId: "run_42" },
      {
        decision_id: "decision_abcdef1234567890",
        resolution_kind: "refined",
        refined_urgency_bucket: "elevated",
        refined_decision_category: "validation",
      },
    );

    const input = calls[0]!.variables!.input as Record<string, unknown>;
    expect(input.eventType).toBe("deferred_decision.resolved");
    expect(input.idempotencyKey).toBe(
      "run_42:deferred_decision.resolved:decision_abcdef1234567890",
    );
    expect(input.payload).toEqual({
      decision_id: "decision_abcdef1234567890",
      resolution_kind: "refined",
      refined_urgency_bucket: "elevated",
      refined_decision_category: "validation",
    });
  });

  it("builds deferred decision re-attempted events with deterministic idempotency key", () => {
    const event = deferredDecisionReAttemptedEvent(
      { runId: "run_42" },
      {
        decision_id: "decision_abcdef1234567890",
        outcome: "succeeded",
        notes_bucket: "wrong_framing",
      },
    );

    expect(event.eventType).toBe("deferred_decision.re_attempted");
    expect(event.idempotencyKey).toBe(
      "run_42:deferred_decision.re_attempted:decision_abcdef1234567890",
    );
    expect(event.payload).toEqual({
      decision_id: "decision_abcdef1234567890",
      outcome: "succeeded",
      notes_bucket: "wrong_framing",
    });
  });

  it("reports deferred decision re-attempted events through the client", async () => {
    const { fetch, calls } = captureGraphQL({
      reportAgentRunEvent: { ok: true, error: null, event: null },
    });
    const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch });

    await client.reportDeferredDecisionReAttempted(
      { runId: "run_42" },
      {
        decision_id: "decision_abcdef1234567890",
        outcome: "superseded",
      },
    );

    const input = calls[0]!.variables!.input as Record<string, unknown>;
    expect(input.eventType).toBe("deferred_decision.re_attempted");
    expect(input.idempotencyKey).toBe(
      "run_42:deferred_decision.re_attempted:decision_abcdef1234567890",
    );
    expect(input.payload).toEqual({
      decision_id: "decision_abcdef1234567890",
      outcome: "superseded",
    });
  });

  it("rejects unsafe re-attempt payload values before submission", () => {
    const event = deferredDecisionReAttemptedEvent(
      { runId: "run_42" },
      {
        decision_id: "decision_abcdef1234567890",
        outcome: "failed",
        local_session_summary: {
          version: 1,
          sessionId: "session_123",
          generatedAt: new Date().toISOString(),
          stale: false,
          toolCallCount: 1,
          fileChangeCount: 0,
          deferredDecisionCount: 1,
          continuationArtifactAvailable: false,
          validationLocallyPassed: false,
          approvedProposalRef: null,
          outcomeCategory: "deferred_for_review",
          token: "redacted",
        } as never,
      },
    );

    expect(() => buildAgentRunEventInput(event)).toThrow(ValidationError);
  });

  it("keeps re-attempt outcome narrowed at compile time", () => {
    const allowed: DeferredDecisionReAttemptOutcome[] = [
      "superseded",
      "succeeded",
      "failed",
      "abandoned",
    ];
    expect(allowed).toHaveLength(4);
  });

  it("keeps resolution kind narrowed at compile time", () => {
    const allowed: DeferredDecisionResolutionKind[] = [
      "approved",
      "overridden",
      "refined",
      "dismissed",
    ];
    expect(allowed).toHaveLength(4);
  });

  it("buckets file counts and scope growth without exposing names", () => {
    expect(bucketFileCount(0)).toBe("0");
    expect(bucketFileCount(2)).toBe("1_to_2");
    expect(bucketFileCount(5)).toBe("3_to_5");
    expect(bucketFileCount(10)).toBe("6_to_10");
    expect(bucketFileCount(11)).toBe("over_10");
    expect(bucketScopeGrowth(0)).toBe("none");
    expect(bucketScopeGrowth(2)).toBe("1_to_2_files");
  });
});

function restorePrototypeProperty(
  prototype: object,
  key: string,
  descriptor: PropertyDescriptor | undefined,
): void {
  if (descriptor) {
    Object.defineProperty(prototype, key, descriptor);
  } else {
    delete (prototype as Record<string, unknown>)[key];
  }
}
