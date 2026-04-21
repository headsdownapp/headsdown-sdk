// === Enums ===

/** Availability mode. Controls how interruptible the user is. */
export type Mode = "online" | "busy" | "limited" | "offline";

/** Verdict on a task proposal. */
export type VerdictDecision = "approved" | "deferred";

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
  | "preset_apply";

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

/** Current schedule resolution for the authenticated user. */
export interface ScheduleResolution {
  inReachableHours: boolean;
  nextTransitionAt: string | null;
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

/** Verdict evaluation settings. */
export interface VerdictSettings {
  id: string;
  modeThresholds: Record<string, unknown>;
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
  verdict: VerdictDecision;
  verdictReason: string | null;
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

/** Temporary availability override that takes precedence over schedule-derived mode. */
export interface AvailabilityOverride {
  id: string;
  mode: Mode;
  reason: string | null;
  source: string;
  expiresAt: string;
  cancelledAt: string | null;
  expiredAt: string | null;
  createdById: string;
  cancelledById: string | null;
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

/** Input for creating a temporary availability override. */
export interface AvailabilityOverrideInput {
  mode: Mode;
  durationMinutes?: number;
  expiresAt?: string;
  reason?: string;
  source?: string;
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
