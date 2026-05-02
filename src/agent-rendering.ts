import { resolveHeadsDownCallFallback, type HeadsDownCallFallback } from "./agent-control.js";
import { assertPrivacySafe } from "./agent-run-events.js";
import {
  HEADSDOWN_ACTION_KEYS,
  HEADSDOWN_CALL_KEYS,
  type AgentControlUiIntent,
  type HeadsDownActionKey,
  type HeadsDownCall,
  type HeadsDownCallConfidence,
  type HeadsDownCallKey,
  type HeadsDownCallPrivacyMode,
  type HeadsDownCallSeverity,
  type HeadsDownCallUrgency,
} from "./types.js";

export type AgentRenderCopySource = "server" | "fallback";
export type AgentActionRenderHint =
  | "none"
  | "inspect"
  | "review"
  | "queue"
  | "handoff"
  | "receipts";
export type AgentRenderedActionSource =
  | "primary"
  | "secondary"
  | "recommended"
  | "fallback"
  | "allowed";

export interface AgentRenderedAction {
  readonly key: HeadsDownActionKey;
  readonly label: string;
  readonly renderHint: AgentActionRenderHint;
  readonly source: AgentRenderedActionSource;
}

export interface AgentHeadsDownCallRender {
  readonly callKey: HeadsDownCallKey;
  readonly originalKey: string;
  readonly unknownKey: string | null;
  readonly title: string;
  readonly titleSource: AgentRenderCopySource;
  readonly body: string;
  readonly bodySource: AgentRenderCopySource;
  readonly severity: HeadsDownCallSeverity;
  readonly urgency: HeadsDownCallUrgency;
  readonly primaryAction: AgentRenderedAction | null;
  readonly secondaryAction: AgentRenderedAction | null;
  readonly allowedActions: readonly AgentRenderedAction[];
  readonly reasonCodes: readonly string[];
  readonly confidence: HeadsDownCallConfidence;
  readonly privacyMode: HeadsDownCallPrivacyMode;
  readonly expiresAt: string | null;
  readonly fallbackReason: HeadsDownCallFallback["reason"];
}

const AGENT_UNKNOWN_CALL_SAFE_ACTIONS: readonly HeadsDownActionKey[] = [
  "keep_queued",
  "pause_and_summarize",
  "queue_for_later",
  "stop_run",
];

const AGENT_ACTION_LABELS: Record<HeadsDownActionKey, string> = {
  continue: "Continue",
  continue_with_limit: "Continue with limit",
  narrow_scope: "Narrow scope",
  ask_user: "Ask user",
  queue_for_later: "Queue for later",
  queue_for_morning: "Queue for morning",
  pause_and_summarize: "Pause and summarize",
  stop_run: "Stop run",
  resume_run: "Resume run",
  allow_once: "Allow once",
  allow_for_duration: "Allow for duration",
  create_temporary_exception: "Create temporary exception",
  keep_queued: "Keep queued",
};

const AGENT_CALL_FALLBACK_COPY: Record<HeadsDownCallKey, { title: string; body: string }> = {
  good_to_run: {
    title: "Good to run",
    body: "HeadsDown says this run can proceed inside the current boundary.",
  },
  keep_it_tight: {
    title: "Keep it tight",
    body: "HeadsDown needs the agent to stay inside a tighter slice before continuing.",
  },
  attention_window_closing: {
    title: "Window closing",
    body: "The current attention window is closing soon. Wrap up or extend intentionally.",
  },
  not_worth_starting_now: {
    title: "Not worth starting now",
    body: "HeadsDown recommends queueing this instead of starting it right now.",
  },
  off_the_clock: {
    title: "Off the clock",
    body: "Queue this for later so the work is not lost.",
  },
  finish_line_friction: {
    title: "Finish-line friction",
    body: "Validation or delivery is stuck while scope appears stable.",
  },
  rabbit_hole_detected: {
    title: "Rabbit hole detected",
    body: "Progress signals suggest the run should pause, summarize, or narrow before continuing.",
  },
  ready_to_resume: {
    title: "Ready to resume",
    body: "A queued run has a saved handoff and is ready to continue.",
  },
  all_contained: {
    title: "All contained",
    body: "Runs are staying inside your time, scope, and interruption limits. Nothing needs you right now.",
  },
  needs_your_yes: {
    title: "Needs your yes",
    body: "HeadsDown needs a human decision before this agent continues.",
  },
};

export function renderHeadsDownCallForAgent(call: HeadsDownCall): AgentHeadsDownCallRender {
  const fallback = resolveHeadsDownCallFallback(call);
  const fallbackCopy = AGENT_CALL_FALLBACK_COPY[fallback.effectiveKey];
  const useServerActionMetadata = fallback.reason === "known_key";
  const title = safeRenderCopy(call.title, fallbackCopy.title, call.privacyMode);
  const body = safeRenderCopy(call.body, fallbackCopy.body, call.privacyMode);

  return {
    callKey: fallback.effectiveKey,
    originalKey: call.key,
    unknownKey: fallback.unknownKey,
    title: title.value,
    titleSource: title.source,
    body: body.value,
    bodySource: body.source,
    severity: call.severity,
    urgency: call.urgency,
    primaryAction: fallback.primaryActionKey
      ? renderAction(
          call,
          fallback.primaryActionKey,
          useServerActionMetadata ? fallback.primaryActionIntent : "none",
          useServerActionMetadata ? "primary" : "fallback",
          useServerActionMetadata,
        )
      : null,
    secondaryAction: fallback.secondaryActionKey
      ? renderAction(
          call,
          fallback.secondaryActionKey,
          fallback.secondaryActionIntent,
          "secondary",
          useServerActionMetadata,
        )
      : null,
    allowedActions: knownAllowedActions(call, fallback.reason).map((actionKey) =>
      renderAction(
        call,
        actionKey,
        useServerActionMetadata ? intentForAllowedAction(call, actionKey) : "none",
        "allowed",
        useServerActionMetadata,
      ),
    ),
    reasonCodes: [...call.reasonCodes],
    confidence: call.confidence,
    privacyMode: call.privacyMode,
    expiresAt: call.expiresAt,
    fallbackReason: fallback.reason,
  };
}

export function isHeadsDownCallKey(value: unknown): value is HeadsDownCallKey {
  return typeof value === "string" && HEADSDOWN_CALL_KEYS.includes(value as HeadsDownCallKey);
}

export function isHeadsDownActionKey(value: unknown): value is HeadsDownActionKey {
  return typeof value === "string" && HEADSDOWN_ACTION_KEYS.includes(value as HeadsDownActionKey);
}

export function isSafeAgentRenderCopy(
  value: string,
  privacyMode: HeadsDownCallPrivacyMode,
): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0 || privacyMode !== "privacy_safe") return false;

  try {
    assertPrivacySafe(trimmed, "headsdownCall.copy");
    return true;
  } catch {
    return false;
  }
}

function safeRenderCopy(
  value: string,
  fallback: string,
  privacyMode: HeadsDownCallPrivacyMode,
): { value: string; source: AgentRenderCopySource } {
  const trimmed = value.trim();

  if (isSafeAgentRenderCopy(trimmed, privacyMode)) {
    return { value: trimmed, source: "server" };
  }

  return { value: fallback, source: "fallback" };
}

function knownAllowedActions(
  call: HeadsDownCall,
  fallbackReason: HeadsDownCallFallback["reason"],
): HeadsDownActionKey[] {
  const knownActions = Array.from(
    new Set(call.allowedActionKnownKeys.filter(isHeadsDownActionKey)),
  );
  if (fallbackReason === "known_key") return knownActions;

  return knownActions.filter((actionKey) => AGENT_UNKNOWN_CALL_SAFE_ACTIONS.includes(actionKey));
}

function renderAction(
  call: HeadsDownCall,
  actionKey: HeadsDownActionKey,
  intent: AgentControlUiIntent,
  requestedSource: AgentRenderedActionSource,
  useServerActionMetadata: boolean,
): AgentRenderedAction {
  const source = useServerActionMetadata
    ? actionSource(call, actionKey, requestedSource)
    : requestedSource;

  return {
    key: actionKey,
    label: useServerActionMetadata
      ? actionLabel(call, actionKey, source)
      : AGENT_ACTION_LABELS[actionKey],
    renderHint: renderHintForIntent(intent),
    source,
  };
}

function actionSource(
  call: HeadsDownCall,
  actionKey: HeadsDownActionKey,
  requestedSource: AgentRenderedActionSource,
): AgentRenderedActionSource {
  if (call.primaryActionKnownKey === actionKey) return "primary";
  if (call.secondaryActionKnownKey === actionKey) return "secondary";
  if (call.recommendedActionKnownKey === actionKey) return "recommended";
  return requestedSource;
}

function actionLabel(
  call: HeadsDownCall,
  actionKey: HeadsDownActionKey,
  source: AgentRenderedActionSource,
): string {
  const serverLabel =
    source === "primary"
      ? call.primaryActionLabel
      : source === "secondary"
        ? call.secondaryActionLabel
        : null;

  if (serverLabel && isSafeAgentRenderCopy(serverLabel, call.privacyMode)) {
    return serverLabel.trim();
  }

  return AGENT_ACTION_LABELS[actionKey];
}

function intentForAllowedAction(
  call: HeadsDownCall,
  actionKey: HeadsDownActionKey,
): AgentControlUiIntent {
  if (call.primaryActionKnownKey === actionKey) return call.primaryActionIntent;
  if (call.secondaryActionKnownKey === actionKey) return call.secondaryActionIntent;
  return "none";
}

function renderHintForIntent(intent: AgentControlUiIntent): AgentActionRenderHint {
  switch (intent) {
    case "review_request":
      return "review";
    case "view_queue":
      return "queue";
    case "review_handoff":
      return "handoff";
    case "view_receipts":
      return "receipts";
    case "view_details":
    case "review_runs":
    case "adjust_playbooks":
    case "start_run":
      return "inspect";
    case "none":
      return "none";
  }
}
