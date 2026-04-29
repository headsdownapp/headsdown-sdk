// === Enums ===

/** Availability mode. Controls interruptibility/status, independent from Wrap-Up execution guidance. */
export type Mode = "online" | "busy" | "limited" | "offline";

/** Verdict on a task proposal. */
export type VerdictDecision = "approved" | "deferred";

/** Wrap-Up delivery mode for task execution style. This does not change availability status. */
export type WrapUpMode = "auto" | "wrap_up" | "full_depth";

/** Active wrap-up profile. */
export type WrapUpProfile = "normal" | "wrap_up";

/** Why wrap-up guidance is active or inactive. */
export type WrapUpGuidanceSource =
  | "inactive"
  | "threshold"
  | "forced_wrap_up"
  | "forced_full_depth"
  | "outside_reachable_hours"
  | "unknown_deadline"
  | "locked";

/** Confidence level for a calibration profile. */
export type ConfidenceLevel = "learning" | "high";

/** Controls how much timing detail the public availability page reveals. */
export type VisibilityLevel = "minimal" | "approximate" | "precise";

/** Notification policy for a reachability window. */
export type AlertsPolicy =
  | "interruptable"
  | "do_not_disturb"
  | "take_a_number"
  | "after_hours"
  | "off";

/** Day of the week. */
export type DayName =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

/** Outcome of an agent task after receiving a verdict. */
export type TaskOutcomeResult =
  | "completed"
  | "failed"
  | "partially_completed"
  | "cancelled"
  | "timed_out";

/** Scope for delegation grants. */
export type DelegationGrantScope = "session" | "workspace" | "agent";

/** Permission that can be delegated to an agent context. */
export type DelegationGrantPermission =
  | "availability_override_create"
  | "availability_override_cancel"
  | "headsdown_action_apply"
  | "preset_apply";

/** Canonical HeadsDown call keys used across app, SDK, CLI, and agent clients. */
export const HEADSDOWN_CALL_KEYS = [
  "good_to_run",
  "keep_it_tight",
  "attention_window_closing",
  "not_worth_starting_now",
  "off_the_clock",
  "finish_line_friction",
  "rabbit_hole_detected",
  "ready_to_resume",
  "all_contained",
  "needs_your_yes",
] as const;

/** Canonical HeadsDown call key. */
export type HeadsDownCallKey = (typeof HEADSDOWN_CALL_KEYS)[number];

/** Canonical action keys that HeadsDown can expose for a call. */
export const HEADSDOWN_ACTION_KEYS = [
  "continue",
  "continue_with_limit",
  "narrow_scope",
  "ask_user",
  "queue_for_later",
  "queue_for_morning",
  "pause_and_summarize",
  "stop_run",
  "resume_run",
  "allow_once",
  "allow_for_duration",
  "create_temporary_exception",
  "keep_queued",
] as const;

/** Canonical action key for HeadsDown call actions. */
export type HeadsDownActionKey = (typeof HEADSDOWN_ACTION_KEYS)[number];

/** Action lifecycle state returned by the action mutation result. */
export type HeadsDownActionState =
  | "all_contained"
  | "attention_window_closing"
  | "good_to_run"
  | "keep_it_tight"
  | "needs_agent_scope"
  | "needs_user"
  | "needs_your_yes"
  | "not_worth_starting_now"
  | "off_the_clock"
  | "finish_line_friction"
  | "paused"
  | "queued"
  | "rabbit_hole_detected"
  | "ready_to_resume"
  | "running"
  | "running_limited"
  | "stopped"
  | "temporary_exception";

/** Common options accepted by canonical HeadsDown action helpers. */
export interface HeadsDownActionOptions {
  runId: string;
  /** Optional source state expected by the caller when applying this action. */
  sourceState?: string;
  /** Optional expiry timestamp for this action request. */
  actionExpiresAt?: string;
  /** Compatibility alias for actionExpiresAt accepted by the GraphQL contract. */
  expiresAt?: string;
  /** Optional free-form reason attached to the action event. */
  reason?: string;
  /** Optional client identifier for tracing. */
  client?: string;
  /** Optional source identifier for tracing. */
  source?: string;
  /** Optional idempotency key. When omitted, SDK helpers derive one. */
  idempotencyKey?: string;
}

/** Input for temporary exception actions. */
export interface TemporaryExceptionActionOptions extends HeadsDownActionOptions {
  /** Duration for the temporary exception window. */
  durationMinutes?: number;
  /** Explicit expiry timestamp for the temporary exception window. */
  overrideExpiresAt?: string;
  /** Temporary mode to apply. Defaults server-side except for createTemporaryException. */
  mode?: Mode;
}

/** Input for allow-for-duration actions. */
export interface AllowForDurationActionOptions extends TemporaryExceptionActionOptions {
  durationMinutes: number;
}

type TemporaryExceptionWindow =
  | { durationMinutes: number; overrideExpiresAt?: string }
  | { durationMinutes?: never; overrideExpiresAt: string };

/** Input for create-temporary-exception actions. */
export type CreateTemporaryExceptionActionOptions = HeadsDownActionOptions &
  TemporaryExceptionWindow & { mode: Mode };

/** Typed inputs accepted by each canonical HeadsDown action key. */
export interface HeadsDownActionInputByKey {
  continue: HeadsDownActionOptions;
  continue_with_limit: HeadsDownActionOptions;
  narrow_scope: HeadsDownActionOptions;
  ask_user: HeadsDownActionOptions;
  queue_for_later: HeadsDownActionOptions;
  queue_for_morning: HeadsDownActionOptions;
  pause_and_summarize: HeadsDownActionOptions;
  stop_run: HeadsDownActionOptions;
  resume_run: HeadsDownActionOptions;
  allow_once: TemporaryExceptionActionOptions;
  allow_for_duration: AllowForDurationActionOptions;
  create_temporary_exception: CreateTemporaryExceptionActionOptions;
  keep_queued: HeadsDownActionOptions;
}

/** Normalized error payload returned by applyHeadsdownAction. */
export interface HeadsDownActionErrorPayload {
  code: string;
  message: string;
  details: Record<string, unknown>;
}

/** Normalized action result payload returned by applyHeadsdownAction. */
export interface HeadsDownActionMutationResult {
  actionKey: HeadsDownActionKey;
  availabilityOverrideId: string | null;
  eventId: string;
  replayed: boolean;
  resultingState: HeadsDownActionState;
  sourceState: HeadsDownActionState;
}

/** Aggregate result from applying a canonical HeadsDown action. */
export interface HeadsDownActionMutationPayload {
  ok: boolean;
  result: HeadsDownActionMutationResult | null;
  error: HeadsDownActionErrorPayload | null;
  currentCall: CurrentCallView | null;
  headsdownCall: HeadsDownCall | null;
  runSummary: AgentRunSummary | null;
}

/** UI intents clients can use to render secondary navigation or action affordances. */
export type AgentControlUiIntent =
  | "view_details"
  | "review_request"
  | "review_runs"
  | "review_handoff"
  | "view_queue"
  | "view_receipts"
  | "adjust_playbooks"
  | "start_run"
  | "none";

/** Visual severity bucket for the current HeadsDown call. */
export type HeadsDownCallSeverity =
  | "positive"
  | "neutral"
  | "caution"
  | "boundary"
  | "action_required"
  | "critical";

/** Relative urgency level for a HeadsDown call. */
export type HeadsDownCallUrgency = "low" | "normal" | "elevated" | "high";

/** Which backend signal produced the current HeadsDown call. */
export type HeadsDownCallEvidenceSource =
  | "contract"
  | "engine"
  | "run_summary"
  | "needs_your_yes"
  | "fallback";

/** Data handling mode for call payloads. */
export type HeadsDownCallPrivacyMode = "privacy_safe" | "privacy_restricted" | "unknown";

/** Confidence for call/value payloads. */
export type HeadsDownCallConfidence = "exact" | "estimated" | "unknown";

/** Data completeness status for read-model sections. */
export type AgentControlDataState =
  | "ready"
  | "partial"
  | "empty"
  | "unknown"
  | "feature_disabled"
  | "privacy_restricted";

/** Current run lifecycle state. */
export type AgentRunState =
  | "active"
  | "queued"
  | "ready_to_resume"
  | "awaiting_input"
  | "completed"
  | "unknown";

/** Whether user action is required for a run. */
export type AgentRunActionState = "required" | "optional" | "none" | "unknown";

/** State of an item in the Needs your yes queue. */
export type NeedsYourYesItemState = "action_required" | "queued" | "ready_to_resume" | "unknown";

/** Value metric keys exposed by the agent-control overview read model. */
export type ValueMetricKey =
  | "time_not_wasted"
  | "spend_avoided"
  | "rabbit_holes_prevented"
  | "off_hours_interruptions_avoided";

/** Current call view as returned by `agentControlOverview.currentCall`. */
export interface CurrentCallView {
  callKey: HeadsDownCallKey;
  title: string;
  body: string;
  primaryActionLabel: string | null;
  primaryActionIntent: AgentControlUiIntent;
  secondaryActionLabel: string | null;
  secondaryActionIntent: AgentControlUiIntent;
  recommendedActionKey: HeadsDownActionKey | null;
  allowedActionKeys: HeadsDownActionKey[];
  reasonCodes: string[];
  dataState: AgentControlDataState;
  evaluatedAt: string | null;
}

/** Canonical HeadsDown call payload used by SDK/CLI/Pi/Claude renderers. */
export interface HeadsDownCall {
  key: string;
  knownKey: HeadsDownCallKey | null;
  title: string;
  body: string;
  severity: HeadsDownCallSeverity;
  urgency: HeadsDownCallUrgency;
  primaryActionLabel: string | null;
  primaryActionKey: string | null;
  primaryActionKnownKey: HeadsDownActionKey | null;
  primaryActionIntent: AgentControlUiIntent;
  secondaryActionLabel: string | null;
  secondaryActionKey: string | null;
  secondaryActionKnownKey: HeadsDownActionKey | null;
  secondaryActionIntent: AgentControlUiIntent;
  recommendedActionKey: string | null;
  recommendedActionKnownKey: HeadsDownActionKey | null;
  allowedActionKeys: string[];
  allowedActionKnownKeys: HeadsDownActionKey[];
  allowedUiIntents: AgentControlUiIntent[];
  reasonCodes: string[];
  confidence: HeadsDownCallConfidence;
  evidenceSource: HeadsDownCallEvidenceSource;
  privacyMode: HeadsDownCallPrivacyMode;
  expiresAt: string | null;
}

/** Action-needed item shown in `agentControlOverview.needsYourYes`. */
export interface NeedsYourYesItem {
  /** Deprecated compatibility alias for the task proposal/action target id. Prefer proposalId for new clients. */
  runId: string;
  proposalId: string;
  actionTargetId: string;
  callKey: HeadsDownCallKey;
  title: string;
  body: string;
  itemState: NeedsYourYesItemState;
  primaryActionLabel: string | null;
  primaryActionIntent: AgentControlUiIntent;
  recommendedActionKey: HeadsDownActionKey | null;
  allowedActionKeys: HeadsDownActionKey[];
  reasonCodes: string[];
  dataState: AgentControlDataState;
  createdAt: string;
  updatedAt: string;
}

/** Safe run summary for `agentControlOverview.runSummaries`. */
export interface AgentRunSummary {
  /** Deprecated compatibility alias for the task proposal/action target id. Prefer proposalId for new clients. */
  runId: string;
  proposalId: string;
  actionTargetId: string;
  callKey: HeadsDownCallKey;
  runState: AgentRunState;
  actionState: AgentRunActionState;
  clientLabel: string;
  safeTitle: string;
  recommendedActionKey: HeadsDownActionKey | null;
  allowedActionKeys: HeadsDownActionKey[];
  reasonCodes: string[];
  elapsedSeconds: number;
  deadlineState: AgentControlDataState;
  budgetState: AgentControlDataState;
  nextActionLabel: string | null;
  nextActionIntent: AgentControlUiIntent;
  dataState: AgentControlDataState;
  detailsState: AgentControlDataState;
  progressState: AgentControlDataState;
  insertedAt: string;
  updatedAt: string;
}

/** Value metric summary from `agentControlOverview.valueMetrics`. */
export interface ValueMetricSummary {
  metricKey: ValueMetricKey;
  label: string;
  value: number | null;
  unit: string | null;
  confidence: HeadsDownCallConfidence;
  evidenceCount: number | null;
  explanation: string;
  dataState: AgentControlDataState;
}

/** Aggregate read model for HeadsDown command-center and agent-control clients. */
export interface InterventionReplayRow {
  key: string;
  label: string;
  value: string;
}

/** Privacy-safe replay for an intervention or queued run. */
export interface InterventionReplay {
  /** Deprecated compatibility alias for the task proposal/action target id. Prefer proposalId for new clients. */
  runId: string;
  proposalId: string;
  actionTargetId: string;
  callKey: HeadsDownCallKey;
  title: string;
  whatWasAboutToHappen: string;
  whatHeadsdownSaw: InterventionReplayRow[];
  headsdownCall: string;
  thePlay: string;
  result: string;
  nextTime: string;
  reasonCodes: string[];
  recommendedActionKey: HeadsDownActionKey | null;
  valueEvidence: string | null;
  dataState: AgentControlDataState;
  updatedAt: string;
}

export interface AgentControlOverview {
  currentCall: CurrentCallView;
  headsdownCall: HeadsDownCall;
  needsYourYes: NeedsYourYesItem[];
  needsYourYesState: AgentControlDataState;
  runSummaries: AgentRunSummary[];
  runSummariesState: AgentControlDataState;
  valueMetrics: ValueMetricSummary[];
  valueMetricsState: AgentControlDataState;
  generatedAt: string;
}

// === Digest Types ===

/** A single event within a digest summary. */
export interface DigestEvent {
  description: string;
  insertedAt: string;
}

/** An aggregated digest summary grouping related events that arrived during focus time. */
export interface DigestSummary {
  id: string;
  actorRef: string;
  actorLabel: string;
  sourceType: string;
  action: string;
  channelRef: string | null;
  events: DigestEvent[];
  entryCount: number;
  firstEventAt: string;
  lastEventAt: string;
}

/** Options for listing digest summaries. */
export interface ListDigestOptions {
  /** Limit to N most recent summaries. */
  latest?: number;
}

/** Auto-responder message templates for non-online modes. */
export interface AutoResponderSettings {
  id: string;
  busyText: string;
  limitedText: string;
  offlineText: string;
  insertedAt: string;
  updatedAt: string;
}

/** Presence info for a team member currently online. */
export interface TeamPresence {
  userId: string;
  onlineAt: string;
  connectionType: string;
}

/** Lightweight team member projection used by team queries. */
export interface TeamMember {
  id: string;
  email: string;
  name: string | null;
  location: string | null;
  avatar: string | null;
}

/** Lightweight team projection used by company/team queries. */
export interface Team {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  members?: TeamMember[] | null;
}

/** Organization-level container for teams. */
export interface Company {
  id: string;
  name: string | null;
  teams: Team[] | null;
}

// === API Response Types ===

/** The user's active availability contract. */
export interface Contract {
  id: string;
  mode: Mode;
  status: boolean;
  statusEmoji: string | null;
  statusText: string | null;
  autoRespond: boolean;
  lock: boolean | null;
  duration: number | null;
  ruleSetType: string | null;
  ruleSetParams: Record<string, unknown> | null;
  expiresAt: string;
  insertedAt: string;
}

/** Reachability window resolved by the scheduler. */
export interface ReachabilityWindow {
  id: string;
  label: string;
  priority: number;
  startTime: string;
  endTime: string;
  days: string[];
  mode: Mode;
  alertsPolicy: AlertsPolicy;
  snooze: boolean;
  status: boolean;
  statusEmoji: string | null;
  statusText: string | null;
  autoActivate: boolean;
}

/** Guidance describing how clients should shape execution near the user's attention deadline. */
export interface WrapUpGuidance {
  active: boolean;
  deadlineAt: string | null;
  remainingMinutes: number | null;
  profile: WrapUpProfile;
  source: WrapUpGuidanceSource;
  reason: string;
  hints: string[];
  thresholdMinutes: number;
  selectedMode: WrapUpMode;
}

/** Current schedule resolution for the authenticated user. */
export interface ScheduleResolution {
  inReachableHours: boolean;
  nextTransitionAt: string | null;
  attentionDeadlineAt: string | null;
  wrapUpGuidance: WrapUpGuidance;
  activeWindow: ReachabilityWindow | null;
  nextWindow: ReachabilityWindow | null;
}

/** A saved availability preset. */
export interface Preset {
  id: string;
  name: string;
  status: boolean;
  statusEmoji: string | null;
  statusText: string | null;
  duration: number | null;
  insertedAt: string;
  updatedAt: string;
}

/** The result of evaluating a task proposal. */
export interface Verdict {
  decision: VerdictDecision;
  reason: string;
  proposalId: string;
  evaluatedAt: string;
  wrapUpGuidance: WrapUpGuidance | null;
}

/** The result of overriding a verdict. */
export interface VerdictOverride {
  id: string;
  originalVerdict: VerdictDecision;
  overrideVerdict: VerdictDecision;
  reason: string | null;
  proposalId: string;
  insertedAt: string;
}

/** Threshold values for a single availability mode. */
export interface VerdictModeThreshold {
  maxFiles: number | null;
  maxEstimatedMinutes: number | null;
}

/** Mode-indexed threshold settings used for verdict evaluation. */
export interface VerdictModeThresholds {
  online: VerdictModeThreshold;
  busy: VerdictModeThreshold;
  limited: VerdictModeThreshold;
  offline: VerdictModeThreshold;
}

/** Verdict evaluation settings. */
export interface VerdictSettings {
  id: string;
  thresholds: VerdictModeThresholds;
  defaultWrapUpMode: WrapUpMode;
  wrapUpThresholdMinutes: number;
  insertedAt: string;
  updatedAt: string;
}

/** The result of evaluating whether an interrupt is allowed. */
export interface InterruptResult {
  allowed: boolean;
  reason: string;
  autoResponse: string | null;
}

/** A calibration profile for a model/framework pair. */
export interface CalibrationProfile {
  id: string;
  model: string;
  framework: string;
  sampleSize: number;
  medianDurationMinutes: number | null;
  successRate: number | null;
  overrideRate: number | null;
  p25DurationMinutes: number | null;
  p75DurationMinutes: number | null;
  durationCiLower: number | null;
  durationCiUpper: number | null;
  successRateCiLower: number | null;
  successRateCiUpper: number | null;
  confidenceLevel: ConfidenceLevel;
  tier: string;
  status: string;
  tasksToHighConfidence: number;
  insertedAt: string;
  updatedAt: string;
}

/** A previously submitted task proposal with its verdict. */
export interface TaskProposal {
  id: string;
  agentRef: string;
  model: string | null;
  framework: string | null;
  description: string;
  estimatedFiles: number | null;
  estimatedMinutes: number | null;
  scopeSummary: string | null;
  sourceRef: string;
  deliveryMode: WrapUpMode;
  verdict: VerdictDecision;
  verdictReason: string | null;
  wrapUpGuidance: WrapUpGuidance | null;
  insertedAt: string;
}

/** Authenticated user's profile. */
export interface UserProfile {
  id: string;
  name: string | null;
  handle: string | null;
  email: string;
  avatar: string | null;
  timezone: string | null;
  visibilityLevel: VisibilityLevel;
  showStatusMessage: boolean;
  confirmedAt: string | null;
  location: string | null;
  insertedAt: string;
  updatedAt: string;
}

/** Delegated permission grant for actor-scoped authorization. */
export interface DelegationGrant {
  id: string;
  scope: DelegationGrantScope;
  sessionId: string | null;
  workspaceRef: string | null;
  agentId: string | null;
  permissions: DelegationGrantPermission[];
  source: string;
  expiresAt: string;
  revokedAt: string | null;
  expiredAt: string | null;
  createdById: string;
  revokedById: string | null;
  insertedAt: string;
  updatedAt: string;
}

/** Bulk revoke result for delegation grants. */
export interface RevokeDelegationGrantsResult {
  revokedCount: number;
}

/** A recorded task outcome with calibration data. */
export interface TaskOutcome {
  id: string;
  outcome: TaskOutcomeResult;
  actualDurationMinutes: number | null;
  filesModified: number | null;
  linesChanged: number | null;
  errorCategory: string | null;
  testsPassed: boolean | null;
  tokensUsed: number | null;
  retryCount: number | null;
  turnCount: number | null;
  scopeChanged: boolean | null;
  redirectCount: number | null;
  distinctTaskCount: number | null;
  dataQualityScore: number | null;
  insertedAt: string;
}

// === Input Types ===

/** Input for submitting a task proposal. */
export interface ProposalInput {
  /** What the agent plans to do. Be specific. */
  description: string;
  /** Reference to the agent (e.g., "claude-code", "pi-agent"). */
  agentRef: string;
  /** The AI model being used (e.g., "claude-sonnet-4"). */
  model?: string;
  /** The agent framework (e.g., "claude-code", "pi"). */
  framework?: string;
  /** Estimated number of files to modify. */
  estimatedFiles?: number;
  /** Estimated time in minutes. */
  estimatedMinutes?: number;
  /** Brief scope summary: which modules, what kind of changes. */
  scopeSummary?: string;
  /** Reference to the task source: ticket number, PR URL, etc. */
  sourceRef?: string;
  /**
   * Optional idempotency key for safe retries.
   * Reusing the same key for the same user returns the original proposal verdict.
   */
  idempotencyKey?: string;
  /** Optional per-task override for delivery style. */
  deliveryMode?: WrapUpMode;
}

/** Input for creating a new availability contract. */
export interface ContractInput {
  mode: Mode;
  autoRespond: boolean;
  status: boolean;
  statusEmoji?: string;
  statusText?: string;
  lock?: boolean;
  duration?: number;
  ruleSetType?: string;
  ruleSetParams?: Record<string, unknown>;
}

/** Input for overriding a verdict. */
export interface OverrideInput {
  /** ID of the proposal to override. */
  proposalId: string;
  /** The new verdict decision. */
  overrideVerdict: VerdictDecision;
  /** Reason for the override. */
  reason?: string;
}

/** Optional fields to update verdict settings. */
export interface UpdateVerdictSettingsInput {
  thresholds?: VerdictModeThresholds;
  defaultWrapUpMode?: WrapUpMode;
  wrapUpThresholdMinutes?: number;
}

/** Optional fields to update auto-responder templates. */
export interface UpdateAutoResponderInput {
  busyText?: string;
  limitedText?: string;
  offlineText?: string;
}

/** Input for listing proposals with optional filters. */
export interface ListProposalsOptions {
  /** Filter by verdict decision. */
  verdict?: VerdictDecision;
  /** Limit to N most recent proposals. */
  latest?: number;
}

/** Optional filters for listing teams. */
export interface ListTeamsOptions {
  /** Restrict to a single team id when provided. */
  id?: string;
}

/** Input for creating a delegation grant. */
export interface DelegationGrantInput {
  scope: DelegationGrantScope;
  sessionId?: string;
  workspaceRef?: string;
  agentId?: string;
  permissions: DelegationGrantPermission[];
  durationMinutes?: number;
  expiresAt?: string;
  source?: string;
}

/** Filter input for listing/revoking delegation grants. */
export interface DelegationGrantFilterInput {
  active?: boolean;
  scope?: DelegationGrantScope;
  sessionId?: string;
  workspaceRef?: string;
  agentId?: string;
  source?: string;
}

/** Input for reporting a task outcome. */
export interface OutcomeInput {
  /** ID of the proposal this outcome is for. */
  proposalId: string;
  /** What happened: completed, failed, partially_completed, cancelled, timed_out. */
  outcome: TaskOutcomeResult;
  /** Actual time spent in minutes. */
  actualDurationMinutes?: number;
  /** Number of files actually modified. */
  filesModified?: number;
  /** Number of lines changed. */
  linesChanged?: number;
  /** Category of error if failed (e.g., "compilation_error", "test_failure"). */
  errorCategory?: string;
  /** Whether the agent's changes passed tests. */
  testsPassed?: boolean;
  /** Number of tokens consumed. */
  tokensUsed?: number;
  /** Number of retries the agent needed. */
  retryCount?: number;
  /** Number of conversational turns in the session. */
  turnCount?: number;
  /** Whether the developer redirected the agent from the original task. */
  scopeChanged?: boolean;
  /** How many times the developer changed direction. */
  redirectCount?: number;
  /** Agent's assessment of how many logical tasks were in this session. */
  distinctTaskCount?: number;
  /** Arbitrary metadata. */
  metadata?: Record<string, unknown>;
}

// === Auth Types ===

/** Device authorization response from the OAuth endpoint. */
export interface DeviceAuthorization {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
  expiresIn: number;
  interval: number;
}

/** Stored API credentials. */
export interface Credentials {
  apiKey: string;
  createdAt: string;
  label?: string;
}

// === Client Configuration ===

/** Retry behavior for transient request failures. */
export interface RetryOptions {
  /** Number of retries after the initial attempt. Default: 2. */
  retries?: number;
  /** Base retry delay in milliseconds (exponential backoff). Default: 250. */
  retryDelayMs?: number;
}

/** Runtime actor identity metadata used for session/workspace-aware authorization. */
export interface ActorContext {
  /** Client source identifier, for example "pi" or "headsdown-sdk". */
  source: string;
  /** Optional agent instance identifier. */
  agentId?: string;
  /** Optional session identifier for session-scoped grants. */
  sessionId?: string;
  /** Optional workspace/repo reference for workspace-scoped grants. */
  workspaceRef?: string;
}

/** Request lifecycle hooks for debugging and observability. */
export interface RequestHooks {
  /** Called before each request attempt. */
  onRequest?: (event: {
    url: string;
    attempt: number;
    query: string;
    variables?: Record<string, unknown>;
  }) => void;
  /** Called after each response. */
  onResponse?: (event: {
    url: string;
    attempt: number;
    status: number;
    ok: boolean;
    requestId?: string;
  }) => void;
  /** Called before retrying a transient failure. */
  onRetry?: (event: { url: string; attempt: number; delayMs: number; reason: string }) => void;
}

/** Options for creating a HeadsDownClient. */
export interface ClientOptions {
  /** HeadsDown API key (hd_...). Falls back to credentials file, then HEADSDOWN_API_KEY env var. */
  apiKey?: string;
  /** Base URL for the HeadsDown API. Default: https://headsdown.app */
  baseUrl?: string;
  /** Custom fetch implementation. Default: global fetch. */
  fetch?: typeof globalThis.fetch;
  /** Request timeout in milliseconds. Default: 30000. */
  timeout?: number;
  /** Retry behavior for transient errors. */
  retry?: RetryOptions;
  /** Optional request lifecycle hooks for debugging/telemetry. */
  hooks?: RequestHooks;
  /** Optional default actor context sent on each GraphQL request. */
  actorContext?: ActorContext;
}

/** Options for the Device Flow authentication. */
export interface DeviceFlowOptions {
  /** Label for the API key (shown in HeadsDown dashboard). */
  label?: string;
  /** Base URL for the HeadsDown API. Default: https://headsdown.app */
  baseUrl?: string;
  /** Custom fetch implementation. */
  fetch?: typeof globalThis.fetch;
}

/** Options for the credential store. */
export interface CredentialStoreOptions {
  /** Custom path for the credentials file. */
  path?: string;
}

// === Internal GraphQL Types ===

/** @internal */
export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; path?: string[] }>;
}
