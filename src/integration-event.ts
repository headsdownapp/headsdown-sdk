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

/**
 * Single-source manifest for the IntegrationEvent vocabulary. Every variant
 * lists its wire-level event type, required and optional payload fields, and
 * the closed enum sets per field. Type aliases below are derived from this
 * structure; runtime validation Sets are derived too. The manifest is also
 * emitted as JSON via `scripts/emit-integration-event-manifest.mjs` so
 * hosted (Elixir) can assert parity in its own test suite.
 *
 * Adding a new variant or a new enum value: update this manifest only. Types,
 * Sets, the wire-type namespace, and the JSON schema all derive from here.
 */
export const INTEGRATION_EVENT_MANIFEST_VERSION = 1;

const VARIANT_SPECS = {
  session_started: {
    wire_type: "integration.session_started",
    required: ["session_id"],
    optional: ["capabilities"],
    enums: {},
  },
  session_ended: {
    wire_type: "integration.session_ended",
    required: ["session_id", "outcome"],
    optional: ["duration_seconds", "turn_count", "reason", "ended_at"],
    enums: {
      outcome: ["succeeded", "failed", "cancelled", "timed_out"],
      reason: [
        "clear",
        "resume",
        "logout",
        "prompt_input_exit",
        "bypass_permissions_disabled",
        "other",
      ],
    },
  },
  turn_started: {
    wire_type: "integration.turn_started",
    required: ["turn_id", "session_id"],
    optional: ["sequence"],
    enums: {},
  },
  turn_ended: {
    wire_type: "integration.turn_ended",
    required: ["turn_id", "session_id", "tool_calls_count"],
    optional: ["duration_seconds"],
    enums: {},
  },
  turn_failed: {
    wire_type: "integration.turn_failed",
    required: ["turn_id", "session_id", "reason"],
    optional: ["duration_seconds"],
    enums: {
      reason: ["api_error", "timeout", "cancelled", "rate_limited", "unknown"],
    },
  },
  tool_invoked: {
    wire_type: "integration.tool_invoked",
    required: ["tool_id", "session_id", "tool_kind"],
    optional: ["turn_id", "tool_name_bucket"],
    enums: {
      tool_kind: ["read", "write", "external"],
    },
  },
  tool_succeeded: {
    wire_type: "integration.tool_succeeded",
    required: ["tool_id", "session_id"],
    optional: ["turn_id", "duration_ms_bucket"],
    enums: {
      duration_ms_bucket: ["under_100ms", "100ms_to_1s", "1s_to_10s", "over_10s", "unknown"],
    },
  },
  tool_failed: {
    wire_type: "integration.tool_failed",
    required: ["tool_id", "session_id", "reason"],
    optional: ["turn_id"],
    enums: {
      reason: ["permission_denied", "execution_error", "timeout", "unknown"],
    },
  },
  permission_denied: {
    wire_type: "integration.permission_denied",
    required: ["decision_id", "session_id", "action_kind_bucket", "resolution"],
    optional: [],
    enums: {
      resolution: ["user_denied", "auto_denied", "policy"],
    },
  },
  context_compacted: {
    wire_type: "integration.context_compacted",
    required: ["session_id", "post_context_bucket"],
    optional: ["turn_id", "prior_context_bucket"],
    enums: {
      prior_context_bucket: [
        "under_10k",
        "10k_to_50k",
        "50k_to_100k",
        "100k_to_200k",
        "over_200k",
        "unknown",
      ],
      post_context_bucket: [
        "under_10k",
        "10k_to_50k",
        "50k_to_100k",
        "100k_to_200k",
        "over_200k",
        "unknown",
      ],
    },
  },
} as const;

export const INTEGRATION_EVENT_MANIFEST = {
  version: INTEGRATION_EVENT_MANIFEST_VERSION,
  variants: VARIANT_SPECS,
} as const;

export type IntegrationEventManifest = typeof INTEGRATION_EVENT_MANIFEST;
export type IntegrationEventVariant = keyof typeof VARIANT_SPECS;

export const INTEGRATION_EVENT_TYPE = {
  session_started: VARIANT_SPECS.session_started.wire_type,
  session_ended: VARIANT_SPECS.session_ended.wire_type,
  turn_started: VARIANT_SPECS.turn_started.wire_type,
  turn_ended: VARIANT_SPECS.turn_ended.wire_type,
  turn_failed: VARIANT_SPECS.turn_failed.wire_type,
  tool_invoked: VARIANT_SPECS.tool_invoked.wire_type,
  tool_succeeded: VARIANT_SPECS.tool_succeeded.wire_type,
  tool_failed: VARIANT_SPECS.tool_failed.wire_type,
  permission_denied: VARIANT_SPECS.permission_denied.wire_type,
  context_compacted: VARIANT_SPECS.context_compacted.wire_type,
} as const satisfies Record<IntegrationEventVariant, string>;

export type IntegrationEventTypeWire =
  (typeof INTEGRATION_EVENT_TYPE)[keyof typeof INTEGRATION_EVENT_TYPE];

// Type aliases derived from the manifest. Adding a new value to an enum in
// the manifest automatically widens the corresponding type — no separate
// declaration to keep in sync.
export type SessionOutcome = (typeof VARIANT_SPECS.session_ended.enums.outcome)[number];
export type SessionEndedReason = (typeof VARIANT_SPECS.session_ended.enums.reason)[number];

export type TurnFailedReason = (typeof VARIANT_SPECS.turn_failed.enums.reason)[number];

export type ToolKind = (typeof VARIANT_SPECS.tool_invoked.enums.tool_kind)[number];

export type ToolDurationBucket =
  (typeof VARIANT_SPECS.tool_succeeded.enums.duration_ms_bucket)[number];

export type ToolFailedReason = (typeof VARIANT_SPECS.tool_failed.enums.reason)[number];

export type PermissionDeniedResolution =
  (typeof VARIANT_SPECS.permission_denied.enums.resolution)[number];

export type ContextSizeBucket =
  (typeof VARIANT_SPECS.context_compacted.enums.post_context_bucket)[number];

/**
 * Nominal alias for fields whose values are privacy-safe categorical labels
 * (not raw user content). Structurally just a `string`: this alias does not
 * give the type system any extra leverage, it documents intent and gives
 * reviewers a grep target. The actual constraint is the `SAFE_TOKEN_PATTERN`
 * regex enforced at runtime by `requireBucketLabel`.
 */
export type BucketLabel = string;

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

export interface SessionStartedEvent {
  type: "session_started";
  session_id: string;
  capabilities?: readonly string[];
}

export interface SessionEndedEvent {
  type: "session_ended";
  session_id: string;
  outcome: SessionOutcome;
  reason?: SessionEndedReason;
  /** Must be an ISO 8601 UTC timestamp string. */
  ended_at?: string;
  /** Must be a non-negative integer. Fractional seconds are rejected at runtime. */
  duration_seconds?: number;
  /** Must be a non-negative integer. */
  turn_count?: number;
}

export interface TurnStartedEvent {
  type: "turn_started";
  turn_id: string;
  session_id: string;
  /** Must be a non-negative integer. */
  sequence?: number;
}

export interface TurnEndedEvent {
  type: "turn_ended";
  turn_id: string;
  session_id: string;
  /** Must be a non-negative integer. */
  tool_calls_count: number;
  /** Must be a non-negative integer. Fractional seconds are rejected at runtime. */
  duration_seconds?: number;
}

export interface TurnFailedEvent {
  type: "turn_failed";
  turn_id: string;
  session_id: string;
  reason: TurnFailedReason;
  /** Must be a non-negative integer. Fractional seconds are rejected at runtime. */
  duration_seconds?: number;
}

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

export interface ToolFailedEvent {
  type: "tool_failed";
  tool_id: string;
  session_id: string;
  turn_id?: string;
  reason: ToolFailedReason;
}

export interface PermissionDeniedEvent {
  type: "permission_denied";
  /** Strict opaque format enforced by hosted: `decision_<16+ alphanumerics>`. */
  decision_id: string;
  session_id: string;
  /** Privacy-safe categorical label, not the actual command or arguments. */
  action_kind_bucket: BucketLabel;
  resolution: PermissionDeniedResolution;
}

export interface ContextCompactedEvent {
  type: "context_compacted";
  session_id: string;
  turn_id?: string;
  prior_context_bucket?: ContextSizeBucket;
  /** Required: a compaction event with no post-size carries no useful signal. */
  post_context_bucket: ContextSizeBucket;
}

// Runtime Sets derived from the manifest. The freezing guarantee is
// transitive: editing a manifest array changes the corresponding Set.
const SESSION_OUTCOMES = new Set<SessionOutcome>(VARIANT_SPECS.session_ended.enums.outcome);
const SESSION_ENDED_REASONS = new Set<SessionEndedReason>(VARIANT_SPECS.session_ended.enums.reason);

const TURN_FAILED_REASONS = new Set<TurnFailedReason>(VARIANT_SPECS.turn_failed.enums.reason);

const TOOL_KINDS = new Set<ToolKind>(VARIANT_SPECS.tool_invoked.enums.tool_kind);

const TOOL_DURATION_BUCKETS = new Set<ToolDurationBucket>(
  VARIANT_SPECS.tool_succeeded.enums.duration_ms_bucket,
);

const TOOL_FAILED_REASONS = new Set<ToolFailedReason>(VARIANT_SPECS.tool_failed.enums.reason);

const PERMISSION_DENIED_RESOLUTIONS = new Set<PermissionDeniedResolution>(
  VARIANT_SPECS.permission_denied.enums.resolution,
);

const CONTEXT_SIZE_BUCKETS = new Set<ContextSizeBucket>(
  VARIANT_SPECS.context_compacted.enums.post_context_bucket,
);

/**
 * Hosted accepts opaque identifiers and bucket labels matching this token
 * shape. Validating at the SDK boundary makes failures local: a caller
 * passing an email or URL gets a `ValidationError` at construction time
 * instead of a server `validation_error` after the round-trip.
 */
const SAFE_TOKEN_PATTERN = /^[A-Za-z0-9_.:-]{1,256}$/;

const STRICT_OPAQUE_DECISION_ID_PATTERN = /^decision_[A-Za-z0-9]{16,}$/;
const ISO_8601_UTC_TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?Z$/;

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
      if (event.reason !== undefined) requireMember(event.reason, SESSION_ENDED_REASONS, "reason");
      requireOptionalIso8601Timestamp(event.ended_at, "ended_at");
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
      requireMember(event.reason, TURN_FAILED_REASONS, "reason");
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
      requireMember(event.reason, TOOL_FAILED_REASONS, "reason");
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

function requireNonNegativeInteger(value: unknown, field: string): asserts value is number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ValidationError(`${field} must be a non-negative integer.`, field);
  }
}

function requireOptionalNonNegativeInteger(value: unknown, field: string): void {
  if (value === undefined) return;
  requireNonNegativeInteger(value, field);
}

function requireOptionalIso8601Timestamp(value: unknown, field: string): void {
  if (value === undefined) return;
  if (typeof value !== "string") {
    throw new ValidationError(`${field} must be a valid ISO 8601 UTC timestamp string.`, field);
  }

  const match = ISO_8601_UTC_TIMESTAMP_PATTERN.exec(value);
  if (!match) {
    throw new ValidationError(`${field} must be a valid ISO 8601 UTC timestamp string.`, field);
  }

  const [, yearValue, monthValue, dayValue, hourValue, minuteValue, secondValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const hour = Number(hourValue);
  const minute = Number(minuteValue);
  const second = Number(secondValue);

  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, 0);

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== second
  ) {
    throw new ValidationError(`${field} must be a valid ISO 8601 UTC timestamp string.`, field);
  }
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
