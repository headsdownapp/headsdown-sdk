import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildAgentRunEventInput,
  renderHeadsDownCallForAgent,
  ValidationError,
} from "../src/agent.js";
import type { AgentRunEventContext } from "../src/agent.js";
import type { HeadsDownCall } from "../src/types.js";

function makeCall(overrides: Partial<HeadsDownCall> = {}): HeadsDownCall {
  return {
    key: "future_call",
    knownKey: null,
    title: "Future call",
    body: "Server-provided copy",
    severity: "neutral",
    urgency: "normal",
    primaryActionLabel: null,
    primaryActionKey: null,
    primaryActionKnownKey: null,
    primaryActionIntent: "none",
    secondaryActionLabel: null,
    secondaryActionKey: null,
    secondaryActionKnownKey: null,
    secondaryActionIntent: "view_details",
    recommendedActionKey: null,
    recommendedActionKnownKey: null,
    allowedActionKeys: [],
    allowedActionKnownKeys: [],
    allowedUiIntents: ["view_details"],
    reasonCodes: [],
    confidence: "exact",
    evidenceSource: "fallback",
    privacyMode: "privacy_safe",
    expiresAt: null,
    ...overrides,
  };
}

describe("agent subpath", () => {
  it("exports agent helpers from a public package subpath", async () => {
    const agent = await import("../src/agent.js");
    const packageJson = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ) as { exports: Record<string, unknown> };

    expect(agent.renderHeadsDownCallForAgent).toBe(renderHeadsDownCallForAgent);
    expect(agent.buildAgentRunEventInput).toBe(buildAgentRunEventInput);
    expect("AGENT_ACTION_LABELS" in agent).toBe(false);
    expect("AGENT_CALL_FALLBACK_COPY" in agent).toBe(false);
    expect("AGENT_UNKNOWN_CALL_SAFE_ACTIONS" in agent).toBe(false);
    expect(packageJson.exports["./agent"]).toEqual({
      types: "./dist/agent.d.ts",
      import: "./dist/agent.js",
    });
  });

  it("preserves known call rendering and server-selected known actions", () => {
    const render = renderHeadsDownCallForAgent(
      makeCall({
        key: "ready_to_resume",
        knownKey: "ready_to_resume",
        title: "Ready to resume",
        body: "The handoff is saved and the run can continue.",
        primaryActionLabel: "Resume",
        primaryActionKnownKey: "resume_run",
        primaryActionIntent: "none",
        secondaryActionLabel: "Keep queued",
        secondaryActionKnownKey: "keep_queued",
        secondaryActionIntent: "none",
        recommendedActionKnownKey: "resume_run",
        allowedActionKnownKeys: ["resume_run", "resume_run", "keep_queued"],
      }),
    );

    expect(render.callKey).toBe("ready_to_resume");
    expect(render.unknownKey).toBeNull();
    expect(render.title).toBe("Ready to resume");
    expect(render.titleSource).toBe("server");
    expect(render.body).toBe("The handoff is saved and the run can continue.");
    expect(render.primaryAction).toEqual({
      key: "resume_run",
      label: "Resume",
      renderHint: "none",
      source: "primary",
    });
    expect(render.secondaryAction).toEqual({
      key: "keep_queued",
      label: "Keep queued",
      renderHint: "none",
      source: "secondary",
    });
    expect(render.allowedActions.map((action) => action.key)).toEqual([
      "resume_run",
      "keep_queued",
    ]);
    expect(render.fallbackReason).toBe("known_key");
  });

  it("normalizes unknown future calls to a conservative review state", () => {
    const render = renderHeadsDownCallForAgent(
      makeCall({
        key: "future_backend_call",
        knownKey: "future_backend_enum" as never,
        severity: "action_required",
        urgency: "high",
        allowedUiIntents: ["review_request"],
        allowedActionKeys: ["future_safe_action"],
        allowedActionKnownKeys: ["continue", "keep_queued"],
        reasonCodes: ["approval_required", "external_side_effect"],
      }),
    );

    expect(render.callKey).toBe("needs_your_yes");
    expect(render.originalKey).toBe("future_backend_call");
    expect(render.unknownKey).toBe("future_backend_call");
    expect(render.primaryAction).toEqual({
      key: "keep_queued",
      label: "Keep queued",
      renderHint: "none",
      source: "fallback",
    });
    expect(render.allowedActions.map((action) => action.key)).toEqual(["keep_queued"]);
    expect(render.fallbackReason).toBe("human_decision_signal");
  });

  it("ignores server action metadata when rendering unknown future calls", () => {
    const render = renderHeadsDownCallForAgent(
      makeCall({
        key: "future_backend_call",
        knownKey: null,
        severity: "action_required",
        primaryActionLabel: "Continue from /Users/example/private.txt",
        primaryActionKnownKey: "keep_queued",
        primaryActionIntent: "start_run",
        allowedActionKnownKeys: ["keep_queued"],
        reasonCodes: ["approval_required"],
      }),
    );

    expect(render.primaryAction).toEqual({
      key: "keep_queued",
      label: "Keep queued",
      renderHint: "none",
      source: "fallback",
    });
    expect(render.allowedActions).toEqual([
      {
        key: "keep_queued",
        label: "Keep queued",
        renderHint: "none",
        source: "allowed",
      },
    ]);
  });

  it("does not surface unknown raw action keys as executable actions", () => {
    const render = renderHeadsDownCallForAgent(
      makeCall({
        allowedActionKeys: ["future_safe_action"],
        allowedActionKnownKeys: [],
        reasonCodes: ["approval_required"],
        severity: "action_required",
      }),
    );

    expect(render.callKey).toBe("needs_your_yes");
    expect(render.primaryAction).toBeNull();
    expect(render.allowedActions).toEqual([]);
  });

  it("keeps contained calls contained only when no raw action is present", () => {
    const containedSignals = [
      "no_action_needed",
      "runs_within_bounds",
      "zero_pending_asks",
      "limits_holding",
    ];

    const contained = renderHeadsDownCallForAgent(
      makeCall({
        allowedActionKeys: [],
        allowedActionKnownKeys: [],
        allowedUiIntents: ["view_details"],
        reasonCodes: containedSignals,
      }),
    );

    const withUnknownAction = renderHeadsDownCallForAgent(
      makeCall({
        allowedActionKeys: ["future_action"],
        allowedActionKnownKeys: [],
        allowedUiIntents: ["view_details"],
        reasonCodes: containedSignals,
      }),
    );

    expect(contained.callKey).toBe("all_contained");
    expect(withUnknownAction.callKey).toBe("needs_your_yes");
  });

  it("drops unsafe or privacy-restricted render copy", () => {
    const unsafe = renderHeadsDownCallForAgent(
      makeCall({
        key: "keep_it_tight",
        knownKey: "keep_it_tight",
        title: "Review /Users/example/private.txt",
        body: "See https://example.com/private-log before continuing.",
        privacyMode: "privacy_safe",
      }),
    );

    const restricted = renderHeadsDownCallForAgent(
      makeCall({
        key: "good_to_run",
        knownKey: "good_to_run",
        title: "Server title",
        body: "Server body",
        privacyMode: "privacy_restricted",
      }),
    );

    expect(unsafe.title).toBe("Keep it tight");
    expect(unsafe.titleSource).toBe("fallback");
    expect(unsafe.body).toBe(
      "HeadsDown needs the agent to stay inside a tighter slice before continuing.",
    );
    expect(unsafe.bodySource).toBe("fallback");
    expect(restricted.title).toBe("Good to run");
    expect(restricted.body).toBe(
      "HeadsDown says this run can proceed inside the current boundary.",
    );
  });

  it("drops unsafe action labels", () => {
    const render = renderHeadsDownCallForAgent(
      makeCall({
        key: "ready_to_resume",
        knownKey: "ready_to_resume",
        primaryActionLabel: "Resume /Users/example/private.txt",
        primaryActionKnownKey: "resume_run",
        primaryActionIntent: "none",
        allowedActionKnownKeys: ["resume_run"],
      }),
    );

    expect(render.primaryAction).toEqual({
      key: "resume_run",
      label: "Resume run",
      renderHint: "none",
      source: "primary",
    });
  });

  it("exports metadata-only event builders that fail closed on unsafe payloads", () => {
    const context: AgentRunEventContext = { runId: "run_123" };

    expect(() =>
      buildAgentRunEventInput({
        ...context,
        eventType: "agent_run.started",
        payload: { path: "/Users/example/private.txt" },
      }),
    ).toThrow(ValidationError);

    expect(() =>
      buildAgentRunEventInput({
        ...context,
        eventType: "agent_run.started",
        payload: { nested: { path: "/Users/example/private.txt" } },
      }),
    ).toThrow(ValidationError);

    expect(() =>
      buildAgentRunEventInput({
        ...context,
        eventType: "agent_run.started",
        payload: { items: [{ url: "https://example.com/private-log" }] },
      }),
    ).toThrow(ValidationError);

    expect(() =>
      buildAgentRunEventInput({
        ...context,
        eventType: "agent_run.started",
        privacyMode: "privacy_safe" as never,
        payload: { reason_code: "safe" },
      }),
    ).toThrow(ValidationError);
  });
});
