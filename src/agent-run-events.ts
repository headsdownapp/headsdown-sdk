import type { LocalSessionSummary } from "./local-session-summary.js";
import { ValidationError } from "./errors.js";

export const AGENT_RUN_EVENT_SCHEMA_VERSION = 1;
export const AGENT_RUN_EVENT_PRIVACY_MODE = "metadata_only" as const;

export const AGENT_RUN_PROGRESS_EVENT_TYPE = "agent_run.progress_reported" as const;

export type AgentRunEventPrivacyMode = typeof AGENT_RUN_EVENT_PRIVACY_MODE;

export type AgentRunEventType =
  | "agent_run.started"
  | typeof AGENT_RUN_PROGRESS_EVENT_TYPE
  | "scope_drift.detected"
  | "agent_run.continuation_saved"
  | "agent_run.queued_for_morning"
  | "agent_run.queued_for_later"
  | "agent_run.resumed"
  | "agent_run.completed"
  | "agent_run.failed"
  | "agent_run.cancelled"
  | "steering_outcome.reported"
  | "deferred_decision.resolved"
  | "deferred_decision.re_attempted"
  | (string & {});

export type AgentRunFileCountBucket = "0" | "1_to_2" | "3_to_5" | "6_to_10" | "over_10" | "unknown";
export type AgentRunScopeGrowthBucket =
  | "none"
  | "1_to_2_files"
  | "3_to_5_files"
  | "6_to_10_files"
  | "over_10_files"
  | "unknown";
export type AgentRunValidationLevel =
  | "none"
  | "planned"
  | "targeted"
  | "full"
  | "manual"
  | "unknown";
export type AgentRunValidationStatus =
  | "not_started"
  | "running"
  | "passed"
  | "failed"
  | "skipped"
  | "unknown";
export type AgentRunProgressState =
  | "starting"
  | "working"
  | "blocked"
  | "waiting_on_user"
  | "validating"
  | "low_progress"
  | "ready_for_review";
export type AgentRunConfidenceBucket = "low" | "medium" | "high" | "unknown";
export type AgentRunSpendEstimateBucket =
  | "none"
  | "under_1"
  | "1_to_5"
  | "5_to_20"
  | "over_20"
  | "unknown";
export type DeferredDecisionResolutionKind = "approved" | "overridden" | "refined" | "dismissed";
export type DeferredDecisionNotesBucket =
  | "needs_more_info"
  | "wrong_framing"
  | "split_into_two"
  | "duplicate"
  | "other";

export interface DeferredDecisionResolvedPayload {
  decision_id: string;
  resolution_kind: DeferredDecisionResolutionKind;
  resolved_action_key?: string;
  refined_urgency_bucket?: string;
  refined_decision_category?: string;
  notes_bucket?: DeferredDecisionNotesBucket;
  local_session_summary?: LocalSessionSummary;
}

export type DeferredDecisionReAttemptOutcome = "superseded" | "succeeded" | "failed" | "abandoned";

/**
 * Outcome for one refined deferred-decision re-attempt within the supplied run context.
 * The event idempotency key is `{runId}:deferred_decision.re_attempted:{decision_id}`, so callers that need per-session attempts should pass a session-scoped runId.
 */
export interface DeferredDecisionReAttemptedPayload {
  decision_id: string;
  outcome: DeferredDecisionReAttemptOutcome;
  local_session_summary?: LocalSessionSummary;
  notes_bucket?: DeferredDecisionNotesBucket;
}

export interface AgentRunProgressMetadata {
  elapsedSeconds: number;
  toolCallsCount: number;
  toolReadCount: number;
  toolWriteCount: number;
  toolExternalCount: number;
  filesReadBucket: AgentRunFileCountBucket;
  filesModifiedBucket: AgentRunFileCountBucket;
  validationLevel: AgentRunValidationLevel;
  validationStatus: AgentRunValidationStatus;
  retryCount: number;
  failureCount: number;
  scopeChanged: boolean;
  redirectCount: number;
  progressState: AgentRunProgressState;
  testsPassed?: boolean;
  validationKind?: string;
  noProgressDurationSeconds?: number;
  scopeGrowthBucket?: AgentRunScopeGrowthBucket;
  confidenceBucket?: AgentRunConfidenceBucket;
  spendEstimateBucket?: AgentRunSpendEstimateBucket;
  blockedReasonCode?: string;
}

export interface AgentRunEventClientMetadata {
  kind: string;
  name: string;
  version: string;
}

export interface AgentRunEventActorMetadata {
  kind: "agent" | "system" | "user" | string;
  ref?: string;
}

export interface AgentRunEventContext {
  workspaceRef?: string;
  runId: string;
  source?: string;
  client?: AgentRunEventClientMetadata;
  actor?: AgentRunEventActorMetadata;
  proposalRef?: string;
  correlationId?: string;
  sequence?: number;
  idempotencyKey?: string;
}

export interface AgentRunEventInput extends AgentRunEventContext {
  eventId?: string;
  eventType: AgentRunEventType;
  schemaVersion?: number;
  occurredAt?: string;
  privacyMode?: AgentRunEventPrivacyMode;
  idempotencyKey?: string;
  causationEventId?: string;
  payload?: Record<string, unknown>;
  progressPayload?: AgentRunProgressMetadata;
}

export interface AgentRunEvent {
  id: string;
  eventId: string;
  eventType: string;
  schemaVersion: number;
  occurredAt: string;
  receivedAt: string;
  workspaceRef: string;
  client: AgentRunEventClientMetadata;
  actor: AgentRunEventActorMetadata;
  runId: string;
  source: string;
  privacyMode: string;
  idempotencyKey: string;
  correlationId?: string | null;
  causationEventId?: string | null;
  sequence?: number | null;
  emitterKey: string;
  proposalRef?: string | null;
  payload: Record<string, unknown>;
  insertedAt: string;
}

export interface ReportAgentRunEventPayload {
  ok: boolean;
  event: AgentRunEvent | null;
  error: { code: string; message: string; details: Record<string, unknown> } | null;
}

const DEFAULT_CLIENT: AgentRunEventClientMetadata = {
  kind: "sdk",
  name: "SDK",
  version: "unknown",
};

const DEFAULT_ACTOR: AgentRunEventActorMetadata = {
  kind: "agent",
  ref: "sdk",
};

const PROHIBITED_KEYS = new Set([
  "prompt",
  "prompts",
  "model_response",
  "message",
  "messages",
  "content",
  "body",
  "text",
  "description",
  "code",
  "diff",
  "patch",
  "snippet",
  "file",
  "files",
  "file_contents",
  "file_path",
  "file_paths",
  "path",
  "paths",
  "repo",
  "repository",
  "repository_name",
  "branch",
  "branch_name",
  "directory",
  "directory_name",
  "terminal_output",
  "stdout",
  "stderr",
  "log",
  "logs",
  "build_log",
  "build_logs",
  "test_log",
  "output",
  "stacktrace",
  "traceback",
  "url",
  "remote_url",
  "commit_message",
  "pr_body",
  "issue_body",
  "ticket_body",
  "ticket_description",
  "calendar_title",
  "calendar_description",
  "calendar_location",
  "attendee",
  "attendees",
  "location",
  "locations",
  "meeting_link",
  "meeting_links",
  "slack_message",
  "email_body",
  "chat_message",
  "notification_body",
  "dm_content",
  "screenshot",
  "screen_recording",
  "secret",
  "secrets",
  "token",
  "tokens",
  "access_token",
  "access_tokens",
  "refresh_token",
  "refresh_tokens",
  "api_key",
  "api_keys",
  "password",
  "cookie",
  "environment",
  "environment_variable",
  "environment_variables",
  "env_var",
  "env_vars",
]);

const PROHIBITED_COMPACT_KEYS = new Set(
  Array.from(PROHIBITED_KEYS, (key) => key.replace(/_/g, "")),
);

const PROHIBITED_KEY_TOKENS = new Set([
  "body",
  "code",
  "content",
  "contents",
  "cookie",
  "description",
  "diff",
  "log",
  "logs",
  "output",
  "password",
  "patch",
  "prompt",
  "prompts",
  "secret",
  "secrets",
  "snippet",
  "stderr",
  "stdout",
  "stacktrace",
  "text",
  "token",
  "tokens",
  "traceback",
]);

const UNSAFE_VALUE_PATTERNS = [
  /(?:^|\s)(?:[./~]|[A-Za-z]:\\)[^\s]+/,
  /^[^\s]+\/[^\s]+$/,
  /\b(?:https?|git|ssh):\/\//i,
  /\b(?:stdout|stderr|stacktrace|traceback|diff --git)\b/i,
  /\b(?:secret|api[_-]?key|token|password)\b/i,
];

export function buildAgentRunEventInput(input: AgentRunEventInput): RequiredEnvelopeInput {
  validateBaseInput(input);

  const eventType = input.eventType;
  const progressPayload =
    eventType === AGENT_RUN_PROGRESS_EVENT_TYPE
      ? normalizeProgressPayload(input.progressPayload)
      : undefined;
  const payload =
    eventType === AGENT_RUN_PROGRESS_EVENT_TYPE ? undefined : normalizePayload(input.payload);

  const variablesInput = stripUndefined({
    eventId: input.eventId ?? randomUuid(),
    eventType,
    schemaVersion: input.schemaVersion ?? AGENT_RUN_EVENT_SCHEMA_VERSION,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    workspaceRef: input.workspaceRef?.trim() || "unknown",
    client: input.client ?? DEFAULT_CLIENT,
    actor: input.actor ?? DEFAULT_ACTOR,
    runId: input.runId,
    source: input.source ?? "sdk",
    privacyMode: input.privacyMode ?? AGENT_RUN_EVENT_PRIVACY_MODE,
    idempotencyKey:
      input.idempotencyKey ??
      buildAgentRunEventIdempotencyKey(input.runId, eventType, input.sequence),
    correlationId: input.correlationId,
    causationEventId: input.causationEventId,
    sequence: input.sequence,
    proposalRef: input.proposalRef,
    payload,
    progressPayload,
  });

  return privacySafeClone(variablesInput, "input") as RequiredEnvelopeInput;
}

export function startedEvent(
  context: AgentRunEventContext,
  payload: Record<string, unknown>,
): AgentRunEventInput {
  return { ...context, eventType: "agent_run.started", payload };
}

export function progressEvent(
  context: AgentRunEventContext,
  progressPayload: AgentRunProgressMetadata,
): AgentRunEventInput {
  return { ...context, eventType: AGENT_RUN_PROGRESS_EVENT_TYPE, progressPayload };
}

export function scopeDriftDetectedEvent(
  context: AgentRunEventContext,
  payload: Record<string, unknown>,
): AgentRunEventInput {
  return { ...context, eventType: "scope_drift.detected", payload };
}

export function continuationSavedEvent(
  context: AgentRunEventContext,
  payload: Record<string, unknown>,
): AgentRunEventInput {
  return { ...context, eventType: "agent_run.continuation_saved", payload };
}

export function queuedForMorningEvent(
  context: AgentRunEventContext,
  payload: Record<string, unknown>,
): AgentRunEventInput {
  return { ...context, eventType: "agent_run.queued_for_morning", payload };
}

export function queuedForLaterEvent(
  context: AgentRunEventContext,
  payload: Record<string, unknown>,
): AgentRunEventInput {
  return { ...context, eventType: "agent_run.queued_for_later", payload };
}

export function resumedEvent(
  context: AgentRunEventContext,
  payload: Record<string, unknown>,
): AgentRunEventInput {
  return { ...context, eventType: "agent_run.resumed", payload };
}

export function completedEvent(
  context: AgentRunEventContext,
  payload: Record<string, unknown>,
): AgentRunEventInput {
  return { ...context, eventType: "agent_run.completed", payload };
}

export function failedEvent(
  context: AgentRunEventContext,
  payload: Record<string, unknown>,
): AgentRunEventInput {
  return { ...context, eventType: "agent_run.failed", payload };
}

export function cancelledEvent(
  context: AgentRunEventContext,
  payload: Record<string, unknown>,
): AgentRunEventInput {
  return { ...context, eventType: "agent_run.cancelled", payload };
}

export function steeringOutcomeReportedEvent(
  context: AgentRunEventContext,
  payload: Record<string, unknown>,
): AgentRunEventInput {
  return { ...context, eventType: "steering_outcome.reported", payload };
}

export function deferredDecisionResolvedEvent(
  context: AgentRunEventContext,
  payload: DeferredDecisionResolvedPayload,
): AgentRunEventInput {
  return {
    ...context,
    eventType: "deferred_decision.resolved",
    idempotencyKey: `${context.runId}:deferred_decision.resolved:${payload.decision_id}`,
    payload: payload as unknown as Record<string, unknown>,
  };
}

export function deferredDecisionReAttemptedEvent(
  context: AgentRunEventContext,
  payload: DeferredDecisionReAttemptedPayload,
): AgentRunEventInput {
  return {
    ...context,
    eventType: "deferred_decision.re_attempted",
    idempotencyKey: `${context.runId}:deferred_decision.re_attempted:${payload.decision_id}`,
    payload: payload as unknown as Record<string, unknown>,
  };
}

export function buildAgentRunEventIdempotencyKey(
  runId: string,
  eventType: string,
  sequence?: number,
): string {
  const suffix = sequence === undefined ? Date.now().toString(36) : String(sequence);
  return `${safeToken(runId)}:${safeToken(eventType)}:${suffix}`;
}

export function bucketFileCount(count: number | undefined): AgentRunFileCountBucket {
  if (count === undefined || !Number.isFinite(count) || count < 0) return "unknown";
  if (count === 0) return "0";
  if (count <= 2) return "1_to_2";
  if (count <= 5) return "3_to_5";
  if (count <= 10) return "6_to_10";
  return "over_10";
}

export function bucketScopeGrowth(count: number | undefined): AgentRunScopeGrowthBucket {
  if (count === undefined || !Number.isFinite(count) || count < 0) return "unknown";
  if (count === 0) return "none";
  if (count <= 2) return "1_to_2_files";
  if (count <= 5) return "3_to_5_files";
  if (count <= 10) return "6_to_10_files";
  return "over_10_files";
}

export function assertPrivacySafe(value: unknown, path = "input"): void {
  void privacySafeClone(value, path);
}

function privacySafeClone(value: unknown, path: string): unknown {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    assertPlainJsonArray(value, path);
    const clone: unknown[] = [];
    Object.setPrototypeOf(clone, null);

    for (let index = 0; index < value.length; index += 1) {
      clone[index] = privacySafeClone(value[index], `${path}[${index}]`);
    }

    return clone;
  }

  if (typeof value === "object") {
    if (!isPlainRecord(value)) {
      throw new ValidationError(
        "Agent run events can only include plain JSON-compatible metadata objects.",
        path,
      );
    }

    const clone = Object.create(null) as Record<string, unknown>;

    for (const [key, entry] of plainRecordEntries(value, path)) {
      if (isProhibitedPrivacyKey(key)) {
        throw new ValidationError(
          `Agent run events cannot include raw-content field '${key}'.`,
          path,
        );
      }
      clone[key] = privacySafeClone(entry, `${path}.${key}`);
    }

    return clone;
  }

  if (typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") {
    throw new ValidationError(
      "Agent run events can only include JSON-compatible metadata values.",
      path,
    );
  }

  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new ValidationError(
      "Agent run events can only include finite numeric metadata values.",
      path,
    );
  }

  if (typeof value === "string" && UNSAFE_VALUE_PATTERNS.some((pattern) => pattern.test(value))) {
    throw new ValidationError(
      "Agent run events cannot include paths, URLs, logs, secrets, or raw content.",
      path,
    );
  }

  return value;
}

function isProhibitedPrivacyKey(key: string): boolean {
  const normalizedKey = normalizePrivacyKey(key);
  const compactKey = normalizedKey.replace(/_/g, "");

  return (
    PROHIBITED_KEYS.has(normalizedKey) ||
    PROHIBITED_COMPACT_KEYS.has(compactKey) ||
    normalizedKey.split("_").some((token) => PROHIBITED_KEY_TOKENS.has(token))
  );
}

function normalizePrivacyKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function plainRecordEntries(
  value: Record<string, unknown>,
  path: string,
): Array<[string, unknown]> {
  assertNoJsonSerializer(value, path);

  const entries: Array<[string, unknown]> = [];
  const descriptors = Object.getOwnPropertyDescriptors(value);

  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== "string") {
      throw new ValidationError(
        "Agent run events can only include string-keyed metadata fields.",
        path,
      );
    }

    const descriptor = descriptors[key];
    assertJsonDataProperty(key, descriptor, path);
    entries.push([key, descriptor.value]);
  }

  return entries;
}

function assertPlainJsonArray(value: unknown[], path: string): void {
  assertNoJsonSerializer(value, path);

  const descriptors = Object.getOwnPropertyDescriptors(value);

  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(descriptors, String(index))) {
      throw new ValidationError(
        "Agent run events can only include dense JSON-compatible metadata arrays.",
        path,
      );
    }
  }

  for (const key of Reflect.ownKeys(descriptors)) {
    if (key === "length") continue;

    if (typeof key !== "string" || !isArrayIndexKey(key)) {
      throw new ValidationError(
        "Agent run events can only include plain JSON-compatible metadata arrays.",
        path,
      );
    }

    assertJsonDataProperty(key, descriptors[key], path);
  }
}

function assertJsonDataProperty(
  key: string,
  descriptor: PropertyDescriptor | undefined,
  path: string,
): asserts descriptor is PropertyDescriptor & { value: unknown } {
  if (!descriptor || key === "toJSON" || !descriptor.enumerable || !("value" in descriptor)) {
    throw new ValidationError(
      "Agent run events can only include plain JSON-compatible metadata properties.",
      path,
    );
  }
}

function assertNoJsonSerializer(value: object, path: string): void {
  if ("toJSON" in value) {
    throw new ValidationError(
      "Agent run events cannot include custom JSON serialization hooks.",
      path,
    );
  }
}

function isArrayIndexKey(key: string): boolean {
  const index = Number(key);
  return Number.isInteger(index) && index >= 0 && index < 2 ** 32 - 1 && String(index) === key;
}

function isPlainRecord(value: object): value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validateBaseInput(input: AgentRunEventInput): void {
  if (!input.eventType?.trim()) throw new ValidationError("eventType is required.", "eventType");
  if (!input.runId?.trim()) throw new ValidationError("runId is required.", "runId");
  if (input.privacyMode && input.privacyMode !== AGENT_RUN_EVENT_PRIVACY_MODE) {
    throw new ValidationError(
      "Only metadata_only agent run event reporting is supported.",
      "privacyMode",
    );
  }
  if (input.schemaVersion !== undefined && input.schemaVersion !== AGENT_RUN_EVENT_SCHEMA_VERSION) {
    throw new ValidationError("Unsupported agent run event schema version.", "schemaVersion");
  }
  if (input.sequence !== undefined && (!Number.isInteger(input.sequence) || input.sequence < 0)) {
    throw new ValidationError("sequence must be a non-negative integer.", "sequence");
  }
}

function normalizePayload(payload: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!payload || !isPlainRecord(payload) || Object.keys(payload).length === 0) {
    throw new ValidationError("payload is required for this agent run event.", "payload");
  }
  return privacySafeClone(payload, "payload") as Record<string, unknown>;
}

function normalizeProgressPayload(
  payload: AgentRunProgressMetadata | undefined,
): AgentRunProgressMetadata {
  if (!payload) {
    throw new ValidationError(
      "progressPayload is required for agent_run.progress_reported.",
      "progressPayload",
    );
  }

  const normalized = privacySafeClone(payload, "progressPayload") as AgentRunProgressMetadata;

  for (const [field, value] of Object.entries(normalized)) {
    if (typeof value === "number" && (!Number.isInteger(value) || value < 0)) {
      throw new ValidationError(`${field} must be a non-negative integer.`, field);
    }
  }

  return normalized;
}

function randomUuid(): string {
  return globalThis.crypto?.randomUUID?.() ?? fallbackUuid();
}

function fallbackUuid(): string {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (char) =>
    (Number(char) ^ ((Math.random() * 16) >> (Number(char) / 4))).toString(16),
  );
}

function safeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]+/g, "_")
    .slice(0, 96);
}

function stripUndefined<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

export type RequiredEnvelopeInput = {
  eventId: string;
  eventType: string;
  schemaVersion: number;
  occurredAt: string;
  workspaceRef: string;
  client: AgentRunEventClientMetadata;
  actor: AgentRunEventActorMetadata;
  runId: string;
  source: string;
  privacyMode: AgentRunEventPrivacyMode;
  idempotencyKey: string;
  correlationId?: string;
  causationEventId?: string;
  sequence?: number;
  proposalRef?: string;
  payload?: Record<string, unknown>;
  progressPayload?: AgentRunProgressMetadata;
};
