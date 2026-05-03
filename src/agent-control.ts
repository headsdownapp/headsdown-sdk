import {
  HEADSDOWN_ACTION_KEYS,
  HEADSDOWN_CALL_KEYS,
  type AgentControlUiIntent,
  type HeadsDownActionKey,
  type HeadsDownCall,
  type HeadsDownCallKey,
} from "./types.js";

const SAFE_ACTION_ORDER: HeadsDownActionKey[] = [
  "keep_queued",
  "pause_and_summarize",
  "queue_for_later",
  "stop_run",
];

const HUMAN_DECISION_SIGNALS = [
  "approval",
  "approve",
  "risk",
  "risky",
  "boundary",
  "spend",
  "external",
  "side_effect",
  "escalation",
  "human_decision",
  "needs_your_yes",
];

const KEEP_TIGHT_SIGNALS = [
  "limit",
  "limited",
  "low_confidence",
  "short",
  "scope",
  "validation",
  "uncertain",
  "tool_budget",
  "timebox",
];

const CONTAINED_SIGNALS = [
  "no_action_needed",
  "runs_within_bounds",
  "zero_pending_asks",
  "limits_holding",
];

export type HeadsDownCallFallback = {
  effectiveKey: HeadsDownCallKey;
  originalKey: string;
  unknownKey: string | null;
  title: string;
  body: string;
  primaryActionKey: HeadsDownActionKey | null;
  primaryActionIntent: AgentControlUiIntent;
  secondaryActionKey: HeadsDownActionKey | null;
  secondaryActionIntent: AgentControlUiIntent;
  reason:
    | "known_key"
    | "human_decision_signal"
    | "keep_tight_signal"
    | "all_contained_signal"
    | "safe_default";
};

function hasAnySignal(reasonCodes: string[], signals: string[]): boolean {
  return reasonCodes.some((reasonCode) =>
    signals.some((signal) => reasonCode.toLowerCase().includes(signal)),
  );
}

function localCallKey(value: unknown): value is HeadsDownCallKey {
  return typeof value === "string" && HEADSDOWN_CALL_KEYS.includes(value as HeadsDownCallKey);
}

function localActionKey(value: unknown): value is HeadsDownActionKey {
  return typeof value === "string" && HEADSDOWN_ACTION_KEYS.includes(value as HeadsDownActionKey);
}

function knownAction(call: HeadsDownCall): HeadsDownActionKey | null {
  if (
    localActionKey(call.primaryActionKnownKey) &&
    call.allowedActionKnownKeys.includes(call.primaryActionKnownKey)
  ) {
    return call.primaryActionKnownKey;
  }

  if (
    localActionKey(call.recommendedActionKnownKey) &&
    call.allowedActionKnownKeys.includes(call.recommendedActionKnownKey)
  ) {
    return call.recommendedActionKnownKey;
  }

  return null;
}

function knownSecondaryAction(call: HeadsDownCall): HeadsDownActionKey | null {
  if (
    localActionKey(call.secondaryActionKnownKey) &&
    call.allowedActionKnownKeys.includes(call.secondaryActionKnownKey)
  ) {
    return call.secondaryActionKnownKey;
  }

  return null;
}

function safestAction(call: HeadsDownCall): HeadsDownActionKey | null {
  return (
    SAFE_ACTION_ORDER.find((actionKey) => call.allowedActionKnownKeys.includes(actionKey)) ?? null
  );
}

function fallbackKey(call: HeadsDownCall): Pick<HeadsDownCallFallback, "effectiveKey" | "reason"> {
  if (localCallKey(call.knownKey)) return { effectiveKey: call.knownKey, reason: "known_key" };

  if (
    call.severity === "action_required" ||
    call.severity === "critical" ||
    call.severity === "boundary" ||
    call.urgency === "high" ||
    call.allowedUiIntents.includes("review_request") ||
    hasAnySignal(call.reasonCodes, HUMAN_DECISION_SIGNALS)
  ) {
    return { effectiveKey: "needs_your_yes", reason: "human_decision_signal" };
  }

  const hasExplicitContainedSignals = CONTAINED_SIGNALS.every((signal) =>
    call.reasonCodes.some((reasonCode) => reasonCode.toLowerCase().includes(signal)),
  );

  if (hasExplicitContainedSignals) {
    if (
      call.allowedActionKeys.length === 0 &&
      call.allowedActionKnownKeys.length === 0 &&
      !call.allowedUiIntents.includes("review_request")
    ) {
      return { effectiveKey: "all_contained", reason: "all_contained_signal" };
    }

    return { effectiveKey: "needs_your_yes", reason: "safe_default" };
  }

  if (
    call.severity === "caution" ||
    call.confidence !== "exact" ||
    hasAnySignal(call.reasonCodes, KEEP_TIGHT_SIGNALS)
  ) {
    return { effectiveKey: "keep_it_tight", reason: "keep_tight_signal" };
  }

  return { effectiveKey: "needs_your_yes", reason: "safe_default" };
}

function fallbackTitle(key: HeadsDownCallKey, title: string): string {
  if (title.trim().length > 0) return title;
  if (key === "keep_it_tight") return "Keep it tight";
  if (key === "all_contained") return "All contained";
  return "Needs your yes";
}

function fallbackBody(key: HeadsDownCallKey, body: string): string {
  if (body.trim().length > 0) return body;
  if (key === "keep_it_tight") {
    return "HeadsDown needs the agent to stay inside a tighter slice before continuing.";
  }
  if (key === "all_contained") {
    return "Runs are staying inside your time, scope, and interruption limits. Nothing needs you right now.";
  }
  return "HeadsDown needs a human decision before this agent continues.";
}

function resolvedPrimaryActionIntent(
  call: HeadsDownCall,
  resolved: Pick<HeadsDownCallFallback, "effectiveKey" | "reason">,
  primaryAction: HeadsDownActionKey | null,
): AgentControlUiIntent {
  if (!primaryAction) {
    return resolved.effectiveKey === "needs_your_yes" ? "review_request" : "view_details";
  }

  if (resolved.reason === "known_key" && call.primaryActionKnownKey === primaryAction) {
    return call.primaryActionIntent;
  }

  return "none";
}

export function resolveHeadsDownCallFallback(call: HeadsDownCall): HeadsDownCallFallback {
  const resolved = fallbackKey(call);
  const primaryAction = resolved.reason === "known_key" ? knownAction(call) : safestAction(call);
  const secondaryAction = resolved.reason === "known_key" ? knownSecondaryAction(call) : null;

  return {
    effectiveKey: resolved.effectiveKey,
    originalKey: call.key,
    unknownKey: resolved.reason === "known_key" ? null : call.key,
    title: fallbackTitle(resolved.effectiveKey, call.title),
    body: fallbackBody(resolved.effectiveKey, call.body),
    primaryActionKey: primaryAction,
    primaryActionIntent: resolvedPrimaryActionIntent(call, resolved, primaryAction),
    secondaryActionKey: secondaryAction,
    secondaryActionIntent:
      resolved.reason === "known_key" ? call.secondaryActionIntent : "view_details",
    reason: resolved.reason,
  };
}
