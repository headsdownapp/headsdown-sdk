import { describe, expect, it } from "vitest";
import { resolveHeadsDownCallFallback } from "../src/agent-control.js";
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

describe("resolveHeadsDownCallFallback", () => {
  it("preserves known call keys and server-provided primary actions", () => {
    const fallback = resolveHeadsDownCallFallback(
      makeCall({
        key: "good_to_run",
        knownKey: "good_to_run",
        primaryActionKnownKey: "continue",
        primaryActionIntent: "none",
        recommendedActionKnownKey: "continue",
        allowedActionKnownKeys: ["continue"],
      }),
    );

    expect(fallback.effectiveKey).toBe("good_to_run");
    expect(fallback.unknownKey).toBeNull();
    expect(fallback.primaryActionKey).toBe("continue");
    expect(fallback.primaryActionIntent).toBe("none");
    expect(fallback.reason).toBe("known_key");
  });

  it("preserves known off-the-clock primary action instead of applying unknown-key safe ordering", () => {
    const fallback = resolveHeadsDownCallFallback(
      makeCall({
        key: "off_the_clock",
        knownKey: "off_the_clock",
        primaryActionKnownKey: "queue_for_later",
        primaryActionIntent: "none",
        recommendedActionKnownKey: "queue_for_later",
        allowedActionKnownKeys: ["queue_for_later", "keep_queued"],
      }),
    );

    expect(fallback.effectiveKey).toBe("off_the_clock");
    expect(fallback.primaryActionKey).toBe("queue_for_later");
  });

  it("preserves known finish-line friction calls instead of applying unknown-key fallback", () => {
    const fallback = resolveHeadsDownCallFallback(
      makeCall({
        key: "finish_line_friction",
        knownKey: "finish_line_friction",
        title: "Finish-line friction",
        body: "Validation or delivery is stuck while scope appears stable.",
        severity: "caution",
        primaryActionKnownKey: "pause_and_summarize",
        primaryActionIntent: "none",
        recommendedActionKnownKey: "pause_and_summarize",
        allowedActionKnownKeys: ["pause_and_summarize", "allow_for_duration"],
        reasonCodes: ["validation_required", "low_progress_loop"],
      }),
    );

    expect(fallback.effectiveKey).toBe("finish_line_friction");
    expect(fallback.unknownKey).toBeNull();
    expect(fallback.primaryActionKey).toBe("pause_and_summarize");
    expect(fallback.reason).toBe("known_key");
  });

  it("does not copy primary intent onto a recommended fallback action", () => {
    const fallback = resolveHeadsDownCallFallback(
      makeCall({
        key: "off_the_clock",
        knownKey: "off_the_clock",
        primaryActionKnownKey: null,
        primaryActionIntent: "start_run",
        recommendedActionKnownKey: "queue_for_morning",
        allowedActionKnownKeys: ["queue_for_morning"],
      }),
    );

    expect(fallback.primaryActionKey).toBe("queue_for_morning");
    expect(fallback.primaryActionIntent).toBe("none");
  });

  it("does not copy server intents onto unknown-key safe actions", () => {
    const fallback = resolveHeadsDownCallFallback(
      makeCall({
        primaryActionKnownKey: "keep_queued",
        primaryActionIntent: "start_run",
        allowedActionKnownKeys: ["keep_queued"],
        severity: "action_required",
        reasonCodes: ["approval_required"],
      }),
    );

    expect(fallback.primaryActionKey).toBe("keep_queued");
    expect(fallback.primaryActionIntent).toBe("none");
  });

  it("preserves known secondary action semantics", () => {
    const fallback = resolveHeadsDownCallFallback(
      makeCall({
        key: "ready_to_resume",
        knownKey: "ready_to_resume",
        primaryActionKnownKey: "resume_run",
        secondaryActionKnownKey: "keep_queued",
        primaryActionIntent: "none",
        secondaryActionIntent: "none",
        allowedActionKnownKeys: ["resume_run", "keep_queued"],
      }),
    );

    expect(fallback.primaryActionKey).toBe("resume_run");
    expect(fallback.secondaryActionKey).toBe("keep_queued");
    expect(fallback.secondaryActionIntent).toBe("none");
  });

  it("treats future knownKey runtime values as unknown until this SDK knows them", () => {
    const fallback = resolveHeadsDownCallFallback(
      makeCall({
        knownKey: "future_backend_enum" as never,
        severity: "action_required",
        allowedUiIntents: ["review_request"],
        reasonCodes: ["approval_required"],
      }),
    );

    expect(fallback.effectiveKey).toBe("needs_your_yes");
    expect(fallback.unknownKey).toBe("future_call");
    expect(fallback.reason).toBe("human_decision_signal");
  });

  it("treats unknown approval or boundary signals as needs your yes", () => {
    const fallback = resolveHeadsDownCallFallback(
      makeCall({
        severity: "action_required",
        urgency: "high",
        allowedUiIntents: ["review_request", "view_details"],
        allowedActionKnownKeys: ["keep_queued", "allow_once"],
        reasonCodes: ["approval_required", "external_side_effect"],
      }),
    );

    expect(fallback.effectiveKey).toBe("needs_your_yes");
    expect(fallback.primaryActionKey).toBe("keep_queued");
    expect(fallback.reason).toBe("human_decision_signal");
  });

  it("treats unknown boundary severity as needs your yes", () => {
    const fallback = resolveHeadsDownCallFallback(
      makeCall({
        severity: "boundary",
        allowedUiIntents: ["view_details"],
        reasonCodes: ["future_boundary_signal"],
      }),
    );

    expect(fallback.effectiveKey).toBe("needs_your_yes");
    expect(fallback.reason).toBe("human_decision_signal");
  });

  it("treats unknown limits and validation uncertainty as keep it tight", () => {
    const fallback = resolveHeadsDownCallFallback(
      makeCall({
        severity: "caution",
        confidence: "estimated",
        allowedActionKnownKeys: ["queue_for_later"],
        reasonCodes: ["validation_required", "scope_needs_cap"],
      }),
    );

    expect(fallback.effectiveKey).toBe("keep_it_tight");
    expect(fallback.primaryActionKey).toBe("queue_for_later");
    expect(fallback.reason).toBe("keep_tight_signal");
  });

  it("treats explicit no-action payloads as all contained", () => {
    const fallback = resolveHeadsDownCallFallback(
      makeCall({
        severity: "neutral",
        allowedActionKnownKeys: [],
        allowedUiIntents: ["review_runs", "view_details"],
        reasonCodes: [
          "no_action_needed",
          "runs_within_bounds",
          "zero_pending_asks",
          "limits_holding",
        ],
      }),
    );

    expect(fallback.effectiveKey).toBe("all_contained");
    expect(fallback.primaryActionKey).toBeNull();
    expect(fallback.primaryActionIntent).toBe("view_details");
  });

  it("does not treat unknown raw action keys as all contained", () => {
    const fallback = resolveHeadsDownCallFallback(
      makeCall({
        allowedActionKeys: ["future_safe_action"],
        allowedActionKnownKeys: [],
        allowedUiIntents: ["view_details"],
        reasonCodes: [
          "no_action_needed",
          "runs_within_bounds",
          "zero_pending_asks",
          "limits_holding",
        ],
      }),
    );

    expect(fallback.effectiveKey).toBe("needs_your_yes");
    expect(fallback.reason).toBe("safe_default");
  });

  it("uses conservative copy when an unknown payload omits title and body", () => {
    const fallback = resolveHeadsDownCallFallback(
      makeCall({
        title: "",
        body: "",
        reasonCodes: ["unrecognized_server_signal"],
      }),
    );

    expect(fallback.effectiveKey).toBe("needs_your_yes");
    expect(fallback.title).toBe("Needs your yes");
    expect(fallback.body).toBe("HeadsDown needs a human decision before this agent continues.");
    expect(fallback.reason).toBe("safe_default");
  });
});
