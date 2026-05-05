import type { AgentRunEventContext, AgentRunEventInput } from "./agent-run-events.js";
import { assertPrivacySafe } from "./agent-run-events.js";
import { ValidationError } from "./errors.js";

/**
 * Vendor-neutral lifecycle vocabulary that any integration emits to describe
 * what is happening inside an agent runtime. The wire transport is the
 * existing `reportAgentRunEvent` GraphQL mutation; `IntegrationEvent` adds a
 * typed contract on top so callers and hosted validate the same shape.
 *
 * Variants carry privacy-safe metadata only: counts, opaque IDs, timestamps,
 * and enum reasons. Raw content (prompts, file paths, URLs, secrets, log
 * output) is rejected by the privacy filter; see `assertPrivacySafe` in
 * `agent-run-events.ts` for the exact prohibited-key set.
 */
export type IntegrationEvent =
  | SessionStartedEvent
  | SessionEndedEvent
  | TurnStartedEvent
  | TurnEndedEvent
  | TurnFailedEvent
  | ToolInvokedEvent
  | ToolSucceededEvent
  | ToolFailedEvent
  | PermissionDeniedEvent
  | ContextCompactedEvent;

export type IntegrationEventVariant = IntegrationEvent["type"];

export interface SessionStartedEvent {
  type: "session_started";
  session_id: string;
  capabilities?: readonly string[];
}

export interface SessionEndedEvent {
  type: "session_ended";
  session_id: string;
  outcome: SessionOutcome;
  duration_seconds?: number;
  turn_count?: number;
}

export type SessionOutcome = "succeeded" | "failed" | "cancelled" | "timed_out";

export interface TurnStartedEvent {
  type: "turn_started";
  turn_id: string;
  session_id: string;
  sequence?: number;
}

export interface TurnEndedEvent {
  type: "turn_ended";
  turn_id: string;
  session_id: string;
  tool_calls_count: number;
  duration_seconds?: number;
}

export interface TurnFailedEvent {
  type: "turn_failed";
  turn_id: string;
  session_id: string;
  reason: TurnFailedReason;
  duration_seconds?: number;
}

/**
 * Open string union: known reasons are constrained, but a forward-compatible
 * escape hatch (`string & {}`) lets future integrations report a reason this
 * SDK version does not yet enumerate without an SDK upgrade. Falling back to
 * `"unknown"` is still encouraged when the integration does not know the
 * specific cause.
 */
export type TurnFailedReason =
  | "api_error"
  | "timeout"
  | "cancelled"
  | "rate_limited"
  | "unknown"
  | (string & {});

export type ToolKind = "read" | "write" | "external";

export interface ToolInvokedEvent {
  type: "tool_invoked";
  tool_id: string;
  session_id: string;
  turn_id?: string;
  tool_kind: ToolKind;
  tool_name_bucket?: BucketLabel;
}

export interface ToolSucceededEvent {
  type: "tool_succeeded";
  tool_id: string;
  session_id: string;
  turn_id?: string;
  duration_ms_bucket?: ToolDurationBucket;
}

export type ToolDurationBucket =
  | "under_100ms"
  | "100ms_to_1s"
  | "1s_to_10s"
  | "over_10s"
  | "unknown";

export interface ToolFailedEvent {
  type: "tool_failed";
  tool_id: string;
  session_id: string;
  turn_id?: string;
  reason: ToolFailedReason;
}

/**
 * Open string union (see `TurnFailedReason`). Allows new failure categories
 * without breaking existing callers; integrations that do not know the cause
 * should pass `"unknown"`.
 */
export type ToolFailedReason =
  | "permission_denied"
  | "execution_error"
  | "timeout"
  | "unknown"
  | (string & {});

export interface PermissionDeniedEvent {
  type: "permission_denied";
  /** Strict opaque format enforced by hosted: `decision_<16+ alphanumerics>`. */
  decision_id: string;
  session_id: string;
  /** Privacy-safe categorical label, not the actual command or arguments. */
  action_kind_bucket: BucketLabel;
  resolution: PermissionDeniedResolution;
}

export type PermissionDeniedResolution = "user_denied" | "auto_denied" | "policy";

export interface ContextCompactedEvent {
  type: "context_compacted";
  session_id: string;
  turn_id?: string;
  prior_context_bucket?: ContextSizeBucket;
  /** Required: a compaction event with no post-size carries no useful signal. */
  post_context_bucket: ContextSizeBucket;
}

export type ContextSizeBucket =
  | "under_10k"
  | "10k_to_50k"
  | "50k_to_100k"
  | "100k_to_200k"
  | "over_200k"
  | "unknown";

/**
 * Nominal alias for fields whose values are privacy-safe categorical labels
 * (not raw user content). Structurally a string, but the alias documents
 * intent and gives reviewers something to grep for.
 */
export type BucketLabel = string;

export const INTEGRATION_EVENT_TYPE = {
  session_started: "integration.session_started",
  session_ended: "integration.session_ended",
  turn_started: "integration.turn_started",
  turn_ended: "integration.turn_ended",
  turn_failed: "integration.turn_failed",
  tool_invoked: "integration.tool_invoked",
  tool_succeeded: "integration.tool_succeeded",
  tool_failed: "integration.tool_failed",
  permission_denied: "integration.permission_denied",
  context_compacted: "integration.context_compacted",
} as const satisfies Record<IntegrationEventVariant, string>;

export type IntegrationEventTypeWire =
  (typeof INTEGRATION_EVENT_TYPE)[keyof typeof INTEGRATION_EVENT_TYPE];

const SESSION_OUTCOMES = new Set<SessionOutcome>(["succeeded", "failed", "cancelled", "timed_out"]);

const KNOWN_TURN_FAILED_REASONS = new Set([
  "api_error",
  "timeout",
  "cancelled",
  "rate_limited",
  "unknown",
]);

const TOOL_KINDS = new Set<ToolKind>(["read", "write", "external"]);

const TOOL_DURATION_BUCKETS = new Set<ToolDurationBucket>([
  "under_100ms",
  "100ms_to_1s",
  "1s_to_10s",
  "over_10s",
  "unknown",
]);

const KNOWN_TOOL_FAILED_REASONS = new Set([
  "permission_denied",
  "execution_error",
  "timeout",
  "unknown",
]);

const PERMISSION_DENIED_RESOLUTIONS = new Set<PermissionDeniedResolution>([
  "user_denied",
  "auto_denied",
  "policy",
]);

const CONTEXT_SIZE_BUCKETS = new Set<ContextSizeBucket>([
  "under_10k",
  "10k_to_50k",
  "50k_to_100k",
  "100k_to_200k",
  "over_200k",
  "unknown",
]);

/**
 * Hosted accepts opaque identifiers and bucket labels matching this token
 * shape. Validating at the SDK boundary makes failures local: a caller
 * passing an email or URL gets a `ValidationError` at construction time
 * instead of a server `validation_error` after the round-trip.
 */
const SAFE_TOKEN_PATTERN = /^[A-Za-z0-9_.:-]{1,256}$/;

const STRICT_OPAQUE_DECISION_ID_PATTERN = /^decision_[A-Za-z0-9]{16,}$/;

/**
 * Validates an `IntegrationEvent` shape and runs the SDK privacy filter on
 * its payload. Throws `ValidationError` on shape, enum, opaque-id, or
 * privacy-safety failures. The privacy filter is load-bearing: do not
 * remove the `assertPrivacySafe` call below, since per-field checks here
 * do not cover nested-structure or substring privacy violations.
 *
 * Returns the wire-level `event_type` and serializable payload.
 */
export function assertIntegrationEvent(event: IntegrationEvent): {
  eventType: IntegrationEventTypeWire;
  payload: Record<string, unknown>;
} {
  if (!event || typeof event !== "object") {
    throw new ValidationError("IntegrationEvent must be an object.", "event");
  }

  if (!Object.prototype.hasOwnProperty.call(INTEGRATION_EVENT_TYPE, event.type)) {
    throw new ValidationError(`Unknown IntegrationEvent type: ${String(event.type)}.`, "type");
  }

  const wireType = INTEGRATION_EVENT_TYPE[event.type];

  validateVariant(event);

  const { type: _discriminator, ...rest } = event;
  const payload = rest as Record<string, unknown>;

  assertPrivacySafe(payload, "payload");

  return { eventType: wireType, payload };
}

function validateVariant(event: IntegrationEvent): void {
  switch (event.type) {
    case "session_started":
      requireOpaqueId(event.session_id, "session_id");
      if (event.capabilities !== undefined) {
        if (!Array.isArray(event.capabilities)) {
          throw new ValidationError("capabilities must be an array of strings.", "capabilities");
        }
        for (const [i, cap] of event.capabilities.entries()) {
          if (typeof cap !== "string" || !cap.trim()) {
            throw new ValidationError(
              "capabilities must contain non-empty strings.",
              `capabilities[${i}]`,
            );
          }
        }
      }
      return;
    case "session_ended":
      requireOpaqueId(event.session_id, "session_id");
      requireMember(event.outcome, SESSION_OUTCOMES, "outcome");
      requireOptionalNonNegativeInteger(event.duration_seconds, "duration_seconds");
      requireOptionalNonNegativeInteger(event.turn_count, "turn_count");
      return;
    case "turn_started":
      requireOpaqueId(event.turn_id, "turn_id");
      requireOpaqueId(event.session_id, "session_id");
      requireOptionalNonNegativeInteger(event.sequence, "sequence");
      return;
    case "turn_ended":
      requireOpaqueId(event.turn_id, "turn_id");
      requireOpaqueId(event.session_id, "session_id");
      requireNonNegativeInteger(event.tool_calls_count, "tool_calls_count");
      requireOptionalNonNegativeInteger(event.duration_seconds, "duration_seconds");
      return;
    case "turn_failed":
      requireOpaqueId(event.turn_id, "turn_id");
      requireOpaqueId(event.session_id, "session_id");
      requireOpenReason(event.reason, KNOWN_TURN_FAILED_REASONS, "reason");
      requireOptionalNonNegativeInteger(event.duration_seconds, "duration_seconds");
      return;
    case "tool_invoked":
      requireOpaqueId(event.tool_id, "tool_id");
      requireOpaqueId(event.session_id, "session_id");
      if (event.turn_id !== undefined) requireOpaqueId(event.turn_id, "turn_id");
      requireMember(event.tool_kind, TOOL_KINDS, "tool_kind");
      if (event.tool_name_bucket !== undefined) {
        requireBucketLabel(event.tool_name_bucket, "tool_name_bucket");
      }
      return;
    case "tool_succeeded":
      requireOpaqueId(event.tool_id, "tool_id");
      requireOpaqueId(event.session_id, "session_id");
      if (event.turn_id !== undefined) requireOpaqueId(event.turn_id, "turn_id");
      if (event.duration_ms_bucket !== undefined) {
        requireMember(event.duration_ms_bucket, TOOL_DURATION_BUCKETS, "duration_ms_bucket");
      }
      return;
    case "tool_failed":
      requireOpaqueId(event.tool_id, "tool_id");
      requireOpaqueId(event.session_id, "session_id");
      if (event.turn_id !== undefined) requireOpaqueId(event.turn_id, "turn_id");
      requireOpenReason(event.reason, KNOWN_TOOL_FAILED_REASONS, "reason");
      return;
    case "permission_denied":
      requireStrictOpaqueDecisionId(event.decision_id);
      requireOpaqueId(event.session_id, "session_id");
      requireBucketLabel(event.action_kind_bucket, "action_kind_bucket");
      requireMember(event.resolution, PERMISSION_DENIED_RESOLUTIONS, "resolution");
      return;
    case "context_compacted":
      requireOpaqueId(event.session_id, "session_id");
      if (event.turn_id !== undefined) requireOpaqueId(event.turn_id, "turn_id");
      if (event.prior_context_bucket !== undefined) {
        requireMember(event.prior_context_bucket, CONTEXT_SIZE_BUCKETS, "prior_context_bucket");
      }
      requireMember(event.post_context_bucket, CONTEXT_SIZE_BUCKETS, "post_context_bucket");
      return;
    default: {
      const exhaustive: never = event;
      void exhaustive;
      throw new ValidationError("Unhandled IntegrationEvent variant.", "type");
    }
  }
}

function requireOpaqueId(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || !SAFE_TOKEN_PATTERN.test(value)) {
    throw new ValidationError(
      `${field} must be a non-empty opaque identifier matching [A-Za-z0-9_.:-]{1,256}.`,
      field,
    );
  }
}

function requireStrictOpaqueDecisionId(value: unknown): asserts value is string {
  if (typeof value !== "string" || !STRICT_OPAQUE_DECISION_ID_PATTERN.test(value)) {
    throw new ValidationError(
      "decision_id must match the opaque format `decision_<16+ alphanumerics>`.",
      "decision_id",
    );
  }
}

function requireBucketLabel(value: unknown, field: string): asserts value is BucketLabel {
  if (typeof value !== "string" || !SAFE_TOKEN_PATTERN.test(value)) {
    throw new ValidationError(
      `${field} must be a non-empty bucket label matching [A-Za-z0-9_.:-]{1,256}.`,
      field,
    );
  }
}

function requireMember<T extends string>(
  value: unknown,
  allowed: ReadonlySet<T>,
  field: string,
): asserts value is T {
  if (typeof value !== "string" || !allowed.has(value as T)) {
    throw new ValidationError(`${field} must be one of ${Array.from(allowed).join(", ")}.`, field);
  }
}

/**
 * Validates an open-union reason field. Rejects non-strings and tokens that
 * fail the privacy regex; accepts unknown reason strings so future
 * integrations can report categories this SDK version has not enumerated.
 */
function requireOpenReason(value: unknown, known: ReadonlySet<string>, field: string): void {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`${field} must be a non-empty string.`, field);
  }
  if (known.has(value)) return;
  if (!SAFE_TOKEN_PATTERN.test(value)) {
    throw new ValidationError(
      `${field} must be one of ${Array.from(known).join(", ")} or a privacy-safe token.`,
      field,
    );
  }
}

function requireNonNegativeInteger(value: unknown, field: string): asserts value is number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ValidationError(`${field} must be a non-negative integer.`, field);
  }
}

function requireOptionalNonNegativeInteger(value: unknown, field: string): void {
  if (value === undefined) return;
  requireNonNegativeInteger(value, field);
}

/**
 * Construct an `AgentRunEventInput` envelope from an `IntegrationEvent`. The
 * envelope rides the existing `reportAgentRunEvent` mutation; the wire-level
 * `eventType` is namespaced under `integration.*` so it does not collide with
 * the existing `agent_run.*` vocabulary.
 *
 * Validation runs eagerly: privacy-unsafe payloads, unknown variants, and
 * out-of-range bucket values throw `ValidationError` here, not deep inside
 * the client.
 */
export function integrationEvent(
  context: AgentRunEventContext,
  event: IntegrationEvent,
): AgentRunEventInput {
  const { eventType, payload } = assertIntegrationEvent(event);
  return { ...context, eventType, payload };
}

export function sessionStartedEvent(
  context: AgentRunEventContext,
  payload: Omit<SessionStartedEvent, "type">,
): AgentRunEventInput {
  return integrationEvent(context, { type: "session_started", ...payload });
}

export function sessionEndedEvent(
  context: AgentRunEventContext,
  payload: Omit<SessionEndedEvent, "type">,
): AgentRunEventInput {
  return integrationEvent(context, { type: "session_ended", ...payload });
}

export function turnStartedEvent(
  context: AgentRunEventContext,
  payload: Omit<TurnStartedEvent, "type">,
): AgentRunEventInput {
  return integrationEvent(context, { type: "turn_started", ...payload });
}

export function turnEndedEvent(
  context: AgentRunEventContext,
  payload: Omit<TurnEndedEvent, "type">,
): AgentRunEventInput {
  return integrationEvent(context, { type: "turn_ended", ...payload });
}

export function turnFailedEvent(
  context: AgentRunEventContext,
  payload: Omit<TurnFailedEvent, "type">,
): AgentRunEventInput {
  return integrationEvent(context, { type: "turn_failed", ...payload });
}

export function toolInvokedEvent(
  context: AgentRunEventContext,
  payload: Omit<ToolInvokedEvent, "type">,
): AgentRunEventInput {
  return integrationEvent(context, { type: "tool_invoked", ...payload });
}

export function toolSucceededEvent(
  context: AgentRunEventContext,
  payload: Omit<ToolSucceededEvent, "type">,
): AgentRunEventInput {
  return integrationEvent(context, { type: "tool_succeeded", ...payload });
}

export function toolFailedEvent(
  context: AgentRunEventContext,
  payload: Omit<ToolFailedEvent, "type">,
): AgentRunEventInput {
  return integrationEvent(context, { type: "tool_failed", ...payload });
}

export function permissionDeniedEvent(
  context: AgentRunEventContext,
  payload: Omit<PermissionDeniedEvent, "type">,
): AgentRunEventInput {
  return integrationEvent(context, { type: "permission_denied", ...payload });
}

export function contextCompactedEvent(
  context: AgentRunEventContext,
  payload: Omit<ContextCompactedEvent, "type">,
): AgentRunEventInput {
  return integrationEvent(context, { type: "context_compacted", ...payload });
}
