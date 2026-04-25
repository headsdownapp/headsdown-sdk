export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = {
  [_ in K]?: never;
};
export type Incremental<T> =
  | T
  | { [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  DateTime: { input: string; output: string };
  HttpUrl: { input: string; output: string };
  JSON: { input: Record<string, unknown>; output: Record<string, unknown> };
  Time: { input: string; output: string };
  UUID4: { input: string; output: string };
};

export type AgentControlDataState =
  | "EMPTY"
  | "FEATURE_DISABLED"
  | "PRIVACY_RESTRICTED"
  | "READY"
  | "UNKNOWN";

export type AgentControlOverview = {
  currentCall: CurrentCallView;
  generatedAt: Scalars["DateTime"]["output"];
  headsdownCall: HeadsdownCall;
  needsYourYes: Array<NeedsYourYesItem>;
  needsYourYesState: AgentControlDataState;
  runSummaries: Array<AgentRunSummary>;
  runSummariesState: AgentControlDataState;
  valueMetrics: Array<ValueMetricSummary>;
  valueMetricsState: AgentControlDataState;
};

export type AgentControlUiIntent =
  | "ADJUST_PLAYBOOKS"
  | "NONE"
  | "REVIEW_HANDOFF"
  | "REVIEW_REQUEST"
  | "REVIEW_RUNS"
  | "START_RUN"
  | "VIEW_DETAILS"
  | "VIEW_QUEUE"
  | "VIEW_RECEIPTS";

export type AgentRunActionState = "NONE" | "OPTIONAL" | "REQUIRED" | "UNKNOWN";

export type AgentRunConfidenceBucket = "HIGH" | "LOW" | "MEDIUM" | "UNKNOWN";

export type AgentRunEvent = {
  actor: AgentRunEventActor;
  causationEventId: Maybe<Scalars["UUID4"]["output"]>;
  client: AgentRunEventClient;
  correlationId: Maybe<Scalars["String"]["output"]>;
  emitterKey: Scalars["String"]["output"];
  eventId: Scalars["UUID4"]["output"];
  eventType: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  idempotencyKey: Scalars["String"]["output"];
  insertedAt: Scalars["DateTime"]["output"];
  occurredAt: Scalars["DateTime"]["output"];
  payload: Scalars["JSON"]["output"];
  privacyMode: AgentRunEventPrivacyMode;
  proposalRef: Maybe<Scalars["String"]["output"]>;
  receivedAt: Scalars["DateTime"]["output"];
  runId: Scalars["ID"]["output"];
  schemaVersion: Scalars["Int"]["output"];
  sequence: Maybe<Scalars["Int"]["output"]>;
  source: Scalars["String"]["output"];
  /** @deprecated Use proposalRef. This field is an opaque legacy alias and does not join to task_proposals. */
  taskProposalId: Maybe<Scalars["ID"]["output"]>;
  workspaceRef: Scalars["String"]["output"];
};

export type AgentRunEventActor = {
  kind: Scalars["String"]["output"];
  ref: Maybe<Scalars["String"]["output"]>;
};

export type AgentRunEventActorInput = {
  kind: Scalars["String"]["input"];
  ref: InputMaybe<Scalars["String"]["input"]>;
};

export type AgentRunEventClient = {
  kind: Scalars["String"]["output"];
  name: Scalars["String"]["output"];
  version: Scalars["String"]["output"];
};

export type AgentRunEventClientInput = {
  kind: Scalars["String"]["input"];
  name: Scalars["String"]["input"];
  version: Scalars["String"]["input"];
};

export type AgentRunEventError = {
  code: Scalars["String"]["output"];
  details: Scalars["JSON"]["output"];
  message: Scalars["String"]["output"];
};

export type AgentRunEventPrivacyMode = "EXPLICIT_USER_CONTENT" | "METADATA_ONLY" | "REDACTED";

export type AgentRunEventReportPrivacyMode = "METADATA_ONLY";

export type AgentRunFileCountBucket =
  | "OVER_10"
  | "UNKNOWN"
  | "_0"
  | "_1_TO_2"
  | "_3_TO_5"
  | "_6_TO_10";

export type AgentRunHandoffMetadata = {
  capturedAt: Maybe<Scalars["DateTime"]["output"]>;
  kind: Maybe<Scalars["String"]["output"]>;
  source: Maybe<Scalars["String"]["output"]>;
};

export type AgentRunHandoffState = "MISSING" | "SAVED" | "UNKNOWN";

export type AgentRunProgressPayloadInput = {
  blockedReasonCode: InputMaybe<Scalars["String"]["input"]>;
  confidenceBucket: InputMaybe<AgentRunConfidenceBucket>;
  elapsedSeconds: Scalars["Int"]["input"];
  failureCount: Scalars["Int"]["input"];
  filesModifiedBucket: AgentRunFileCountBucket;
  filesReadBucket: AgentRunFileCountBucket;
  noProgressDurationSeconds: InputMaybe<Scalars["Int"]["input"]>;
  progressState: AgentRunProgressState;
  redirectCount: Scalars["Int"]["input"];
  retryCount: Scalars["Int"]["input"];
  scopeChanged: Scalars["Boolean"]["input"];
  scopeGrowthBucket: InputMaybe<AgentRunScopeGrowthBucket>;
  spendEstimateBucket: InputMaybe<AgentRunSpendEstimateBucket>;
  testsPassed: InputMaybe<Scalars["Boolean"]["input"]>;
  toolCallsCount: Scalars["Int"]["input"];
  toolExternalCount: Scalars["Int"]["input"];
  toolReadCount: Scalars["Int"]["input"];
  toolWriteCount: Scalars["Int"]["input"];
  validationKind: InputMaybe<Scalars["String"]["input"]>;
  validationLevel: AgentRunValidationLevel;
  validationStatus: AgentRunValidationStatus;
};

export type AgentRunProgressState =
  | "BLOCKED"
  | "LOW_PROGRESS"
  | "READY_FOR_REVIEW"
  | "STARTING"
  | "VALIDATING"
  | "WAITING_ON_USER"
  | "WORKING";

export type AgentRunScopeGrowthBucket =
  | "NONE"
  | "OVER_10_FILES"
  | "UNKNOWN"
  | "_1_TO_2_FILES"
  | "_3_TO_5_FILES"
  | "_6_TO_10_FILES";

export type AgentRunSpendEstimateBucket =
  | "NONE"
  | "OVER_20"
  | "UNDER_1"
  | "UNKNOWN"
  | "_1_TO_5"
  | "_5_TO_20";

export type AgentRunState =
  | "ACTIVE"
  | "AWAITING_INPUT"
  | "COMPLETED"
  | "QUEUED"
  | "READY_TO_RESUME"
  | "UNKNOWN";

export type AgentRunSummary = {
  actionState: AgentRunActionState;
  allowedActionKeys: Array<HeadsdownActionKey>;
  budgetState: AgentControlDataState;
  callKey: HeadsdownCallKey;
  clientLabel: Scalars["String"]["output"];
  dataState: AgentControlDataState;
  deadlineState: AgentControlDataState;
  detailsState: AgentControlDataState;
  elapsedSeconds: Scalars["Int"]["output"];
  handoffAvailable: Scalars["Boolean"]["output"];
  handoffMetadata: Maybe<AgentRunHandoffMetadata>;
  handoffState: AgentRunHandoffState;
  insertedAt: Scalars["DateTime"]["output"];
  nextActionIntent: AgentControlUiIntent;
  nextActionLabel: Maybe<Scalars["String"]["output"]>;
  nextWorkWindowStartsAt: Maybe<Scalars["DateTime"]["output"]>;
  progressState: AgentControlDataState;
  reasonCodes: Array<Scalars["String"]["output"]>;
  recommendedActionKey: Maybe<HeadsdownActionKey>;
  resumeEligibleAt: Maybe<Scalars["DateTime"]["output"]>;
  runId: Scalars["ID"]["output"];
  runState: AgentRunState;
  safeTitle: Scalars["String"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
};

export type AgentRunValidationLevel =
  | "FULL"
  | "MANUAL"
  | "NONE"
  | "PLANNED"
  | "TARGETED"
  | "UNKNOWN";

export type AgentRunValidationStatus =
  | "FAILED"
  | "NOT_STARTED"
  | "PASSED"
  | "RUNNING"
  | "SKIPPED"
  | "UNKNOWN";

export type AlertValues =
  | "AFTER_HOURS"
  | "DO_NOT_DISTURB"
  | "INTERRUPTABLE"
  | "OFF"
  | "TAKE_A_NUMBER";

export type AlertsPolicy =
  | "AFTER_HOURS"
  | "DO_NOT_DISTURB"
  | "INTERRUPTABLE"
  | "OFF"
  | "TAKE_A_NUMBER";

export type ApplyHeadsdownActionInput = {
  actionExpiresAt: InputMaybe<Scalars["DateTime"]["input"]>;
  actionKey: Scalars["String"]["input"];
  client: InputMaybe<Scalars["String"]["input"]>;
  durationMinutes: InputMaybe<Scalars["Int"]["input"]>;
  expiresAt: InputMaybe<Scalars["DateTime"]["input"]>;
  handoffAvailable: InputMaybe<Scalars["Boolean"]["input"]>;
  handoffCapturedAt: InputMaybe<Scalars["DateTime"]["input"]>;
  handoffKind: InputMaybe<Scalars["String"]["input"]>;
  handoffSource: InputMaybe<Scalars["String"]["input"]>;
  handoffState: InputMaybe<AgentRunHandoffState>;
  idempotencyKey: InputMaybe<Scalars["String"]["input"]>;
  mode: InputMaybe<Mode>;
  nextWorkWindowStartsAt: InputMaybe<Scalars["DateTime"]["input"]>;
  overrideExpiresAt: InputMaybe<Scalars["DateTime"]["input"]>;
  reason: InputMaybe<Scalars["String"]["input"]>;
  resumeEligibleAt: InputMaybe<Scalars["DateTime"]["input"]>;
  runId: Scalars["ID"]["input"];
  source: InputMaybe<Scalars["String"]["input"]>;
  sourceState: InputMaybe<Scalars["String"]["input"]>;
};

export type ApplyHeadsdownActionPayload = {
  currentCall: Maybe<CurrentCallView>;
  error: Maybe<HeadsdownActionError>;
  headsdownCall: Maybe<HeadsdownCall>;
  ok: Scalars["Boolean"]["output"];
  result: Maybe<HeadsdownActionResult>;
  runSummary: Maybe<AgentRunSummary>;
};

export type AutoResponderSettings = {
  busyText: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  insertedAt: Scalars["DateTime"]["output"];
  limitedText: Scalars["String"]["output"];
  offlineText: Scalars["String"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
};

export type AvailabilityOverride = {
  cancelledAt: Maybe<Scalars["DateTime"]["output"]>;
  cancelledById: Maybe<Scalars["ID"]["output"]>;
  createdById: Scalars["ID"]["output"];
  expiredAt: Maybe<Scalars["DateTime"]["output"]>;
  expiresAt: Scalars["DateTime"]["output"];
  id: Scalars["ID"]["output"];
  insertedAt: Scalars["DateTime"]["output"];
  mode: Mode;
  reason: Maybe<Scalars["String"]["output"]>;
  source: Scalars["String"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
};

export type AvailabilityOverrideInput = {
  durationMinutes: InputMaybe<Scalars["Int"]["input"]>;
  expiresAt: InputMaybe<Scalars["DateTime"]["input"]>;
  mode: Mode;
  reason: InputMaybe<Scalars["String"]["input"]>;
  source: InputMaybe<Scalars["String"]["input"]>;
};

/** Availability resolution for the current user at a point in time */
export type AvailabilityResolution = {
  activeWindow: Maybe<ReachabilityWindow>;
  attentionDeadlineAt: Maybe<Scalars["DateTime"]["output"]>;
  inReachableHours: Scalars["Boolean"]["output"];
  nextTransitionAt: Maybe<Scalars["DateTime"]["output"]>;
  nextWindow: Maybe<ReachabilityWindow>;
  wrapUpGuidance: WrapUpGuidance;
};

export type CalibrationProfile = {
  /** Count of Gold-tier outcomes with outcome=cancelled for this profile's model/framework scope. */
  cancelledCount: Scalars["Int"]["output"];
  /** Count of Gold-tier outcomes with outcome=completed for this profile's model/framework scope. */
  completedCount: Scalars["Int"]["output"];
  confidenceLevel: ConfidenceLevel;
  durationCiLower: Maybe<Scalars["Float"]["output"]>;
  durationCiUpper: Maybe<Scalars["Float"]["output"]>;
  /** Count of Gold-tier outcomes with outcome=failed for this profile's model/framework scope. */
  failedCount: Scalars["Int"]["output"];
  framework: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  insertedAt: Scalars["DateTime"]["output"];
  /** Most recent task outcome write timestamp for this model/framework scope (all quality tiers). */
  lastTaskAt: Maybe<Scalars["DateTime"]["output"]>;
  medianDurationMinutes: Maybe<Scalars["Float"]["output"]>;
  model: Scalars["String"]["output"];
  overrideRate: Maybe<Scalars["Float"]["output"]>;
  p25DurationMinutes: Maybe<Scalars["Float"]["output"]>;
  p75DurationMinutes: Maybe<Scalars["Float"]["output"]>;
  /** Count of Gold-tier outcomes with outcome=partially_completed for this profile's model/framework scope. */
  partiallyCompletedCount: Scalars["Int"]["output"];
  sampleSize: Scalars["Int"]["output"];
  status: Scalars["String"]["output"];
  successRate: Maybe<Scalars["Float"]["output"]>;
  successRateCiLower: Maybe<Scalars["Float"]["output"]>;
  successRateCiUpper: Maybe<Scalars["Float"]["output"]>;
  tasksToHighConfidence: Scalars["Int"]["output"];
  tier: Scalars["String"]["output"];
  /** Count of Gold-tier outcomes with outcome=timed_out for this profile's model/framework scope. */
  timedOutCount: Scalars["Int"]["output"];
  /** Count of Gold-tier outcomes with unknown/legacy outcome values not in the canonical outcome enum. */
  unknownCount: Scalars["Int"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
};

export type Company = {
  id: Scalars["ID"]["output"];
  name: Maybe<Scalars["String"]["output"]>;
  teams: Maybe<Array<Team>>;
};

export type ConfidenceLevel = "HIGH" | "LEARNING";

/**
 * Private type: contains full contract details (exact expiration timestamps,
 * status text, rule set configuration). Must never be exposed through
 * unauthenticated queries. All queries resolving this type must pass through
 * the Authentication middleware. For public-facing availability data, use
 * the :public_availability type instead.
 */
export type Contract = {
  /** @deprecated Use mode instead. AFK is derived from mode. */
  afk: Scalars["Boolean"]["output"];
  autoRespond: Scalars["Boolean"]["output"];
  duration: Maybe<Scalars["Int"]["output"]>;
  expiresAt: Scalars["DateTime"]["output"];
  id: Scalars["ID"]["output"];
  insertedAt: Scalars["DateTime"]["output"];
  lock: Maybe<Scalars["Boolean"]["output"]>;
  mode: Mode;
  /** @deprecated Digest recording is now automatic. This field will be removed. */
  recordMessages: Scalars["Boolean"]["output"];
  ruleSetParams: Maybe<Scalars["JSON"]["output"]>;
  ruleSetType: Maybe<Scalars["String"]["output"]>;
  /** @deprecated Interrupt policy replaced snooze behavior. Use rule_set_type instead. */
  snooze: Scalars["Boolean"]["output"];
  status: Scalars["Boolean"]["output"];
  statusEmoji: Maybe<Scalars["String"]["output"]>;
  statusText: Maybe<Scalars["String"]["output"]>;
  user: User;
};

export type ContractInput = {
  autoRespond: Scalars["Boolean"]["input"];
  duration: InputMaybe<Scalars["Int"]["input"]>;
  lock: InputMaybe<Scalars["Boolean"]["input"]>;
  mode: Mode;
  ruleSetParams: InputMaybe<Scalars["JSON"]["input"]>;
  ruleSetType: InputMaybe<Scalars["String"]["input"]>;
  status: Scalars["Boolean"]["input"];
  statusEmoji: InputMaybe<Scalars["String"]["input"]>;
  statusText: InputMaybe<Scalars["String"]["input"]>;
};

export type CurrentCallView = {
  allowedActionKeys: Array<HeadsdownActionKey>;
  body: Scalars["String"]["output"];
  callKey: HeadsdownCallKey;
  dataState: AgentControlDataState;
  evaluatedAt: Maybe<Scalars["DateTime"]["output"]>;
  primaryActionIntent: AgentControlUiIntent;
  primaryActionLabel: Maybe<Scalars["String"]["output"]>;
  reasonCodes: Array<Scalars["String"]["output"]>;
  recommendedActionKey: Maybe<HeadsdownActionKey>;
  secondaryActionIntent: AgentControlUiIntent;
  secondaryActionLabel: Maybe<Scalars["String"]["output"]>;
  title: Scalars["String"]["output"];
};

export type DelegationGrant = {
  agentId: Maybe<Scalars["String"]["output"]>;
  createdById: Scalars["ID"]["output"];
  expiredAt: Maybe<Scalars["DateTime"]["output"]>;
  expiresAt: Scalars["DateTime"]["output"];
  id: Scalars["ID"]["output"];
  insertedAt: Scalars["DateTime"]["output"];
  permissions: Array<DelegationGrantPermission>;
  revokedAt: Maybe<Scalars["DateTime"]["output"]>;
  revokedById: Maybe<Scalars["ID"]["output"]>;
  scope: DelegationGrantScope;
  sessionId: Maybe<Scalars["String"]["output"]>;
  source: Scalars["String"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
  workspaceRef: Maybe<Scalars["String"]["output"]>;
};

export type DelegationGrantFilterInput = {
  active: InputMaybe<Scalars["Boolean"]["input"]>;
  agentId: InputMaybe<Scalars["String"]["input"]>;
  scope: InputMaybe<DelegationGrantScope>;
  sessionId: InputMaybe<Scalars["String"]["input"]>;
  source: InputMaybe<Scalars["String"]["input"]>;
  workspaceRef: InputMaybe<Scalars["String"]["input"]>;
};

export type DelegationGrantInput = {
  agentId: InputMaybe<Scalars["String"]["input"]>;
  durationMinutes: InputMaybe<Scalars["Int"]["input"]>;
  expiresAt: InputMaybe<Scalars["DateTime"]["input"]>;
  permissions: Array<DelegationGrantPermission>;
  scope: DelegationGrantScope;
  sessionId: InputMaybe<Scalars["String"]["input"]>;
  source: InputMaybe<Scalars["String"]["input"]>;
  workspaceRef: InputMaybe<Scalars["String"]["input"]>;
};

/** Delegated permissions for availability controls and preset application */
export type DelegationGrantPermission =
  /** Cancel temporary availability overrides */
  | "AVAILABILITY_OVERRIDE_CANCEL"
  /** Create temporary availability overrides */
  | "AVAILABILITY_OVERRIDE_CREATE"
  /** Apply canonical HeadsDown actions to agent runs */
  | "HEADSDOWN_ACTION_APPLY"
  /** Apply an existing status preset */
  | "PRESET_APPLY";

export type DelegationGrantScope = "AGENT" | "SESSION" | "WORKSPACE";

export type DeviceTypes = "ANDROID" | "IOS";

export type DigestEvent = {
  description: Scalars["String"]["output"];
  insertedAt: Scalars["DateTime"]["output"];
};

export type DigestSummary = {
  action: Scalars["String"]["output"];
  actorLabel: Scalars["String"]["output"];
  actorRef: Scalars["String"]["output"];
  channelRef: Maybe<Scalars["String"]["output"]>;
  entryCount: Scalars["Int"]["output"];
  events: Array<DigestEvent>;
  firstEventAt: Scalars["DateTime"]["output"];
  id: Scalars["ID"]["output"];
  lastEventAt: Scalars["DateTime"]["output"];
  sourceType: Scalars["String"]["output"];
};

export type HeadsdownActionError = {
  code: Scalars["String"]["output"];
  details: Scalars["JSON"]["output"];
  message: Scalars["String"]["output"];
};

export type HeadsdownActionKey =
  | "ALLOW_FOR_DURATION"
  | "ALLOW_ONCE"
  | "ASK_USER"
  | "CONTINUE"
  | "CONTINUE_WITH_LIMIT"
  | "CREATE_TEMPORARY_EXCEPTION"
  | "KEEP_QUEUED"
  | "NARROW_SCOPE"
  | "PAUSE_AND_SUMMARIZE"
  | "QUEUE_FOR_LATER"
  | "QUEUE_FOR_MORNING"
  | "RESUME_RUN"
  | "STOP_RUN";

export type HeadsdownActionResult = {
  actionKey: HeadsdownActionKey;
  availabilityOverrideId: Maybe<Scalars["ID"]["output"]>;
  eventId: Scalars["ID"]["output"];
  replayed: Scalars["Boolean"]["output"];
  resultingState: HeadsdownActionState;
  sourceState: HeadsdownActionState;
};

export type HeadsdownActionState =
  | "ALL_CONTAINED"
  | "GOOD_TO_RUN"
  | "KEEP_IT_TIGHT"
  | "NEEDS_AGENT_SCOPE"
  | "NEEDS_USER"
  | "NEEDS_YOUR_YES"
  | "NOT_WORTH_STARTING_NOW"
  | "OFF_THE_CLOCK"
  | "PAUSED"
  | "QUEUED"
  | "RABBIT_HOLE_DETECTED"
  | "READY_TO_RESUME"
  | "RUNNING"
  | "RUNNING_LIMITED"
  | "STOPPED"
  | "TEMPORARY_EXCEPTION";

/**
 * Canonical HeadsDown call payload for client rendering.
 *
 * Use `key` and `allowedActionKeys` as forward-compatible strings. If a new key appears before your client updates, apply the unknown/future fallback rules from docs/headsdown-call-contract.md.
 */
export type HeadsdownCall = {
  allowedActionKeys: Array<Scalars["String"]["output"]>;
  allowedActionKnownKeys: Array<HeadsdownActionKey>;
  allowedUiIntents: Array<AgentControlUiIntent>;
  body: Scalars["String"]["output"];
  confidence: HeadsdownCallConfidence;
  evidenceSource: HeadsdownCallEvidenceSource;
  expiresAt: Maybe<Scalars["DateTime"]["output"]>;
  key: Scalars["String"]["output"];
  knownKey: Maybe<HeadsdownCallKey>;
  primaryActionIntent: AgentControlUiIntent;
  primaryActionKey: Maybe<Scalars["String"]["output"]>;
  primaryActionKnownKey: Maybe<HeadsdownActionKey>;
  primaryActionLabel: Maybe<Scalars["String"]["output"]>;
  privacyMode: HeadsdownCallPrivacyMode;
  reasonCodes: Array<Scalars["String"]["output"]>;
  recommendedActionKey: Maybe<Scalars["String"]["output"]>;
  recommendedActionKnownKey: Maybe<HeadsdownActionKey>;
  secondaryActionIntent: AgentControlUiIntent;
  secondaryActionKey: Maybe<Scalars["String"]["output"]>;
  secondaryActionKnownKey: Maybe<HeadsdownActionKey>;
  secondaryActionLabel: Maybe<Scalars["String"]["output"]>;
  severity: HeadsdownCallSeverity;
  title: Scalars["String"]["output"];
  urgency: HeadsdownCallUrgency;
};

export type HeadsdownCallConfidence = "ESTIMATED" | "EXACT" | "UNKNOWN";

export type HeadsdownCallEvidenceSource =
  | "CONTRACT"
  | "ENGINE"
  | "FALLBACK"
  | "NEEDS_YOUR_YES"
  | "RUN_SUMMARY";

export type HeadsdownCallKey =
  | "ALL_CONTAINED"
  | "GOOD_TO_RUN"
  | "KEEP_IT_TIGHT"
  | "NEEDS_YOUR_YES"
  | "NOT_WORTH_STARTING_NOW"
  | "OFF_THE_CLOCK"
  | "RABBIT_HOLE_DETECTED"
  | "READY_TO_RESUME";

export type HeadsdownCallPrivacyMode = "PRIVACY_RESTRICTED" | "PRIVACY_SAFE" | "UNKNOWN";

export type HeadsdownCallSeverity =
  | "ACTION_REQUIRED"
  | "BOUNDARY"
  | "CAUTION"
  | "CRITICAL"
  | "NEUTRAL"
  | "POSITIVE";

export type HeadsdownCallUrgency = "ELEVATED" | "HIGH" | "LOW" | "NORMAL";

export type InterruptResult = {
  allowed: Scalars["Boolean"]["output"];
  autoResponse: Maybe<Scalars["String"]["output"]>;
  reason: Scalars["String"]["output"];
};

export type MobileClient = {
  /** iOS or Android */
  deviceType: DeviceTypes;
  hardwareId: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  model: Maybe<Scalars["String"]["output"]>;
  pushToken: Maybe<Scalars["String"]["output"]>;
  user: User;
};

export type MobileClientInput = {
  deviceType: DeviceTypes;
  hardwareId: InputMaybe<Scalars["String"]["input"]>;
  model: InputMaybe<Scalars["String"]["input"]>;
  pushToken: Scalars["String"]["input"];
};

/** Availability state for interruptibility and status */
export type Mode = "BUSY" | "LIMITED" | "OFFLINE" | "ONLINE";

export type NeedsYourYesItem = {
  allowedActionKeys: Array<HeadsdownActionKey>;
  body: Scalars["String"]["output"];
  callKey: HeadsdownCallKey;
  createdAt: Scalars["DateTime"]["output"];
  dataState: AgentControlDataState;
  itemState: NeedsYourYesItemState;
  primaryActionIntent: AgentControlUiIntent;
  primaryActionLabel: Maybe<Scalars["String"]["output"]>;
  reasonCodes: Array<Scalars["String"]["output"]>;
  recommendedActionKey: Maybe<HeadsdownActionKey>;
  runId: Scalars["ID"]["output"];
  title: Scalars["String"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
};

export type NeedsYourYesItemState = "ACTION_REQUIRED" | "QUEUED" | "READY_TO_RESUME" | "UNKNOWN";

export type OutcomeInput = {
  actualDurationMinutes: InputMaybe<Scalars["Int"]["input"]>;
  distinctTaskCount: InputMaybe<Scalars["Int"]["input"]>;
  errorCategory: InputMaybe<Scalars["String"]["input"]>;
  filesModified: InputMaybe<Scalars["Int"]["input"]>;
  linesChanged: InputMaybe<Scalars["Int"]["input"]>;
  metadata: InputMaybe<Scalars["JSON"]["input"]>;
  outcome: TaskOutcomeResult;
  proposalId: Scalars["ID"]["input"];
  redirectCount: InputMaybe<Scalars["Int"]["input"]>;
  retryCount: InputMaybe<Scalars["Int"]["input"]>;
  scopeChanged: InputMaybe<Scalars["Boolean"]["input"]>;
  testsPassed: InputMaybe<Scalars["Boolean"]["input"]>;
  tokensUsed: InputMaybe<Scalars["Int"]["input"]>;
  turnCount: InputMaybe<Scalars["Int"]["input"]>;
};

export type OverrideInput = {
  overrideVerdict: VerdictDecision;
  proposalId: Scalars["ID"]["input"];
  reason: InputMaybe<Scalars["String"]["input"]>;
};

/** Availability status derived from the active reachability window's notification policy. */
export type PolicyStatus =
  /** Messages queued for later review */
  | "AWAY"
  /** Urgent items only (deep work) */
  | "FOCUSED"
  /** Unavailable, no notifications */
  | "OFFLINE"
  /** Fully available, all notifications enabled */
  | "ONLINE";

export type PresenceValues = "AFK" | "DISTRACTED" | "ON_KEYS";

export type Preset = {
  /** @deprecated Use rule_set_type on contracts instead. Maps to interrupt policy. */
  alerts: AlertValues;
  /** Duration of this mode, when null, ends at next window transition */
  duration: Maybe<Scalars["Int"]["output"]>;
  id: Scalars["ID"]["output"];
  /** Creation timestamp */
  insertedAt: Scalars["DateTime"]["output"];
  /** Friendly name of the preset */
  name: Scalars["String"]["output"];
  /** @deprecated Use mode instead. Physical presence is derived from mode. */
  presence: PresenceValues;
  /** Whether to set a custom status */
  status: Scalars["Boolean"]["output"];
  /** Emoji to use for this preset */
  statusEmoji: Maybe<Scalars["String"]["output"]>;
  /** Status message text */
  statusText: Maybe<Scalars["String"]["output"]>;
  /** Updated timestamp */
  updatedAt: Scalars["DateTime"]["output"];
  user: User;
};

export type PresetInput = {
  alerts: AlertValues;
  duration: InputMaybe<Scalars["Int"]["input"]>;
  name: Scalars["String"]["input"];
  presence: PresenceValues;
  status: Scalars["Boolean"]["input"];
  statusEmoji: InputMaybe<Scalars["String"]["input"]>;
  statusText: InputMaybe<Scalars["String"]["input"]>;
};

export type ProposalInput = {
  agentRef: Scalars["String"]["input"];
  deliveryMode: InputMaybe<WrapUpMode>;
  description: Scalars["String"]["input"];
  estimatedFiles: InputMaybe<Scalars["Int"]["input"]>;
  estimatedMinutes: InputMaybe<Scalars["Int"]["input"]>;
  framework: InputMaybe<Scalars["String"]["input"]>;
  idempotencyKey: InputMaybe<Scalars["String"]["input"]>;
  model: InputMaybe<Scalars["String"]["input"]>;
  scopeSummary: InputMaybe<Scalars["String"]["input"]>;
  sourceRef: Scalars["String"]["input"];
};

export type PublicPageSettingsInput = {
  showStatusMessage: InputMaybe<Scalars["Boolean"]["input"]>;
  visibilityLevel: InputMaybe<VisibilityLevel>;
};

/** A named time window defining when a user is reachable and what policy applies. */
export type ReachabilityWindow = {
  alertsPolicy: AlertsPolicy;
  autoActivate: Scalars["Boolean"]["output"];
  days: Array<Scalars["String"]["output"]>;
  endTime: Scalars["Time"]["output"];
  id: Scalars["ID"]["output"];
  label: Scalars["String"]["output"];
  mode: Mode;
  priority: Scalars["Int"]["output"];
  snooze: Scalars["Boolean"]["output"];
  startTime: Scalars["Time"]["output"];
  status: Scalars["Boolean"]["output"];
  statusEmoji: Maybe<Scalars["String"]["output"]>;
  statusText: Maybe<Scalars["String"]["output"]>;
};

export type ReachabilityWindowInput = {
  alertsPolicy: InputMaybe<AlertsPolicy>;
  autoActivate: InputMaybe<Scalars["Boolean"]["input"]>;
  days: Array<Scalars["String"]["input"]>;
  endTime: Scalars["Time"]["input"];
  label: Scalars["String"]["input"];
  mode: InputMaybe<Mode>;
  priority: InputMaybe<Scalars["Int"]["input"]>;
  snooze: InputMaybe<Scalars["Boolean"]["input"]>;
  startTime: Scalars["Time"]["input"];
  status: InputMaybe<Scalars["Boolean"]["input"]>;
  statusEmoji: InputMaybe<Scalars["String"]["input"]>;
  statusText: InputMaybe<Scalars["String"]["input"]>;
};

export type ReachabilityWindowUpdateInput = {
  alertsPolicy: InputMaybe<AlertsPolicy>;
  autoActivate: InputMaybe<Scalars["Boolean"]["input"]>;
  days: InputMaybe<Array<Scalars["String"]["input"]>>;
  endTime: InputMaybe<Scalars["Time"]["input"]>;
  label: InputMaybe<Scalars["String"]["input"]>;
  mode: InputMaybe<Mode>;
  priority: InputMaybe<Scalars["Int"]["input"]>;
  snooze: InputMaybe<Scalars["Boolean"]["input"]>;
  startTime: InputMaybe<Scalars["Time"]["input"]>;
  status: InputMaybe<Scalars["Boolean"]["input"]>;
  statusEmoji: InputMaybe<Scalars["String"]["input"]>;
  statusText: InputMaybe<Scalars["String"]["input"]>;
};

export type ReportAgentRunEventInput = {
  actor: AgentRunEventActorInput;
  causationEventId: InputMaybe<Scalars["UUID4"]["input"]>;
  client: AgentRunEventClientInput;
  correlationId: InputMaybe<Scalars["String"]["input"]>;
  eventId: Scalars["UUID4"]["input"];
  eventType: Scalars["String"]["input"];
  idempotencyKey: Scalars["String"]["input"];
  occurredAt: Scalars["DateTime"]["input"];
  payload: InputMaybe<Scalars["JSON"]["input"]>;
  privacyMode: AgentRunEventReportPrivacyMode;
  progressPayload: InputMaybe<AgentRunProgressPayloadInput>;
  proposalRef: InputMaybe<Scalars["String"]["input"]>;
  runId: Scalars["ID"]["input"];
  schemaVersion: Scalars["Int"]["input"];
  sequence: InputMaybe<Scalars["Int"]["input"]>;
  source: Scalars["String"]["input"];
  taskProposalId: InputMaybe<Scalars["ID"]["input"]>;
  workspaceRef: Scalars["String"]["input"];
};

export type ReportAgentRunEventPayload = {
  error: Maybe<AgentRunEventError>;
  event: Maybe<AgentRunEvent>;
  ok: Scalars["Boolean"]["output"];
};

export type RevokeDelegationGrantsResult = {
  revokedCount: Scalars["Int"]["output"];
};

export type RootMutationType = {
  applyHeadsdownAction: ApplyHeadsdownActionPayload;
  applyPreset: Maybe<Contract>;
  cancelAvailabilityOverride: Maybe<AvailabilityOverride>;
  createAvailabilityOverride: Maybe<AvailabilityOverride>;
  createContract: Maybe<Contract>;
  createDelegationGrant: Maybe<DelegationGrant>;
  createPreset: Maybe<Preset>;
  createReachabilityWindow: Maybe<ReachabilityWindow>;
  deletePreset: Maybe<Preset>;
  deleteReachabilityWindow: Maybe<ReachabilityWindow>;
  dismissDigestEntry: Maybe<DigestSummary>;
  overrideVerdict: Maybe<VerdictOverride>;
  registerMobileClient: Maybe<MobileClient>;
  reportAgentRunEvent: ReportAgentRunEventPayload;
  /**
   * Report an agent task outcome (insert or update).
   *
   * First call for a proposal creates the outcome. Subsequent calls
   * update it in place. Clients should call this periodically during
   * long sessions (checkpoint) and once on session exit (final report).
   */
  reportOutcome: Maybe<TaskOutcome>;
  revokeDelegationGrant: Maybe<DelegationGrant>;
  revokeDelegationGrants: Maybe<RevokeDelegationGrantsResult>;
  submitProposal: Maybe<Verdict>;
  updateAutoResponderSettings: Maybe<AutoResponderSettings>;
  updateMobileClient: Maybe<MobileClient>;
  updatePreset: Maybe<Preset>;
  updatePublicPageSettings: Maybe<User>;
  updateReachabilityWindow: Maybe<ReachabilityWindow>;
  updateVerdictSettings: Maybe<VerdictSettings>;
};

export type RootMutationTypeApplyHeadsdownActionArgs = {
  input: ApplyHeadsdownActionInput;
};

export type RootMutationTypeApplyPresetArgs = {
  id: Scalars["ID"]["input"];
};

export type RootMutationTypeCancelAvailabilityOverrideArgs = {
  id: Scalars["ID"]["input"];
  reason: InputMaybe<Scalars["String"]["input"]>;
  source: InputMaybe<Scalars["String"]["input"]>;
};

export type RootMutationTypeCreateAvailabilityOverrideArgs = {
  input: AvailabilityOverrideInput;
};

export type RootMutationTypeCreateContractArgs = {
  input: ContractInput;
};

export type RootMutationTypeCreateDelegationGrantArgs = {
  input: DelegationGrantInput;
};

export type RootMutationTypeCreatePresetArgs = {
  input: PresetInput;
};

export type RootMutationTypeCreateReachabilityWindowArgs = {
  input: ReachabilityWindowInput;
};

export type RootMutationTypeDeletePresetArgs = {
  id: Scalars["ID"]["input"];
};

export type RootMutationTypeDeleteReachabilityWindowArgs = {
  id: Scalars["ID"]["input"];
};

export type RootMutationTypeDismissDigestEntryArgs = {
  id: Scalars["ID"]["input"];
};

export type RootMutationTypeOverrideVerdictArgs = {
  input: OverrideInput;
};

export type RootMutationTypeRegisterMobileClientArgs = {
  input: InputMaybe<MobileClientInput>;
};

export type RootMutationTypeReportAgentRunEventArgs = {
  input: ReportAgentRunEventInput;
};

export type RootMutationTypeReportOutcomeArgs = {
  input: OutcomeInput;
};

export type RootMutationTypeRevokeDelegationGrantArgs = {
  id: Scalars["ID"]["input"];
};

export type RootMutationTypeRevokeDelegationGrantsArgs = {
  filter: InputMaybe<DelegationGrantFilterInput>;
};

export type RootMutationTypeSubmitProposalArgs = {
  input: ProposalInput;
};

export type RootMutationTypeUpdateAutoResponderSettingsArgs = {
  busyText: InputMaybe<Scalars["String"]["input"]>;
  limitedText: InputMaybe<Scalars["String"]["input"]>;
  offlineText: InputMaybe<Scalars["String"]["input"]>;
};

export type RootMutationTypeUpdateMobileClientArgs = {
  id: Scalars["ID"]["input"];
  input: InputMaybe<MobileClientInput>;
};

export type RootMutationTypeUpdatePresetArgs = {
  id: Scalars["ID"]["input"];
  input: PresetInput;
};

export type RootMutationTypeUpdatePublicPageSettingsArgs = {
  input: PublicPageSettingsInput;
};

export type RootMutationTypeUpdateReachabilityWindowArgs = {
  id: Scalars["ID"]["input"];
  input: ReachabilityWindowUpdateInput;
};

export type RootMutationTypeUpdateVerdictSettingsArgs = {
  defaultWrapUpMode: InputMaybe<WrapUpMode>;
  thresholds: InputMaybe<VerdictModeThresholdsInput>;
  wrapUpThresholdMinutes: InputMaybe<Scalars["Int"]["input"]>;
};

export type RootQueryType = {
  activeAvailabilityOverride: Maybe<AvailabilityOverride>;
  activeContract: Maybe<Contract>;
  activeDelegationGrants: Array<DelegationGrant>;
  agentControlOverview: AgentControlOverview;
  agentRunEvent: Maybe<AgentRunEvent>;
  agentRunEvents: Array<AgentRunEvent>;
  autoResponderSettings: Maybe<AutoResponderSettings>;
  availability: Maybe<AvailabilityResolution>;
  /**
   * List calibration profiles for the current user.
   *
   * Returns the best available profile per model/framework pair:
   * per-user profile if it has >= 50 outcomes, otherwise the global
   * (community) profile. Ordered by sample size descending.
   */
  calibrationProfiles: Maybe<Array<CalibrationProfile>>;
  company: Maybe<Company>;
  delegationGrants: Array<DelegationGrant>;
  digestSummaries: Maybe<Array<DigestSummary>>;
  evaluateInterrupt: Maybe<InterruptResult>;
  /** Canonical HeadsDown call catalog for client rendering and unknown-key fallback. Clients should still render the current `agentControlOverview.headsdownCall` as the source of truth for the active call. */
  headsdownCallCatalog: Array<HeadsdownCall>;
  preset: Maybe<Preset>;
  presets: Maybe<Array<Preset>>;
  profile: Maybe<User>;
  proposals: Maybe<Array<TaskProposal>>;
  reachabilityWindow: Maybe<ReachabilityWindow>;
  reachabilityWindows: Maybe<Array<ReachabilityWindow>>;
  teamPresence: Maybe<Array<TeamPresence>>;
  teams: Maybe<Array<Team>>;
  verdictSettings: Maybe<VerdictSettings>;
};

export type RootQueryTypeAgentRunEventArgs = {
  eventId: Scalars["UUID4"]["input"];
};

export type RootQueryTypeAgentRunEventsArgs = {
  emitterKey: InputMaybe<Scalars["String"]["input"]>;
  eventType: InputMaybe<Scalars["String"]["input"]>;
  insertedAfter: InputMaybe<Scalars["DateTime"]["input"]>;
  insertedBefore: InputMaybe<Scalars["DateTime"]["input"]>;
  limit: InputMaybe<Scalars["Int"]["input"]>;
  occurredAfter: InputMaybe<Scalars["DateTime"]["input"]>;
  occurredBefore: InputMaybe<Scalars["DateTime"]["input"]>;
  proposalRef: InputMaybe<Scalars["String"]["input"]>;
  runId: InputMaybe<Scalars["ID"]["input"]>;
  taskProposalId: InputMaybe<Scalars["ID"]["input"]>;
};

export type RootQueryTypeAvailabilityArgs = {
  at: InputMaybe<Scalars["DateTime"]["input"]>;
};

export type RootQueryTypeDelegationGrantsArgs = {
  filter: InputMaybe<DelegationGrantFilterInput>;
};

export type RootQueryTypeDigestSummariesArgs = {
  latest: InputMaybe<Scalars["Int"]["input"]>;
};

export type RootQueryTypeEvaluateInterruptArgs = {
  handle: Scalars["String"]["input"];
};

export type RootQueryTypePresetArgs = {
  id: Scalars["ID"]["input"];
};

export type RootQueryTypeProposalsArgs = {
  latest: InputMaybe<Scalars["Int"]["input"]>;
  verdict: InputMaybe<VerdictDecision>;
};

export type RootQueryTypeReachabilityWindowArgs = {
  id: Scalars["ID"]["input"];
};

export type RootQueryTypeTeamPresenceArgs = {
  teamId: Scalars["ID"]["input"];
};

export type RootQueryTypeTeamsArgs = {
  id: InputMaybe<Scalars["ID"]["input"]>;
};

export type RootSubscriptionType = {
  contractChanged: Maybe<Contract>;
  digestChanged: Maybe<DigestSummary>;
  digestEntryCreated: Maybe<DigestSummary>;
  digestEntryDismissed: Maybe<DigestSummary>;
  presetChanged: Maybe<Preset>;
  teamMembershipChanged: Maybe<TeamMember>;
  teamPresenceChanged: Maybe<Array<TeamPresence>>;
  userStatusChanged: Maybe<Contract>;
  verdictSubmitted: Maybe<Verdict>;
};

export type RootSubscriptionTypeTeamMembershipChangedArgs = {
  teamId: Scalars["ID"]["input"];
};

export type RootSubscriptionTypeTeamPresenceChangedArgs = {
  teamId: Scalars["ID"]["input"];
};

export type RootSubscriptionTypeUserStatusChangedArgs = {
  userId: Scalars["ID"]["input"];
};

export type TaskOutcome = {
  actualDurationMinutes: Maybe<Scalars["Int"]["output"]>;
  dataQualityScore: Maybe<Scalars["Float"]["output"]>;
  distinctTaskCount: Maybe<Scalars["Int"]["output"]>;
  errorCategory: Maybe<Scalars["String"]["output"]>;
  filesModified: Maybe<Scalars["Int"]["output"]>;
  id: Scalars["ID"]["output"];
  insertedAt: Scalars["DateTime"]["output"];
  linesChanged: Maybe<Scalars["Int"]["output"]>;
  metadata: Maybe<Scalars["JSON"]["output"]>;
  outcome: TaskOutcomeResult;
  redirectCount: Maybe<Scalars["Int"]["output"]>;
  retryCount: Maybe<Scalars["Int"]["output"]>;
  scopeChanged: Maybe<Scalars["Boolean"]["output"]>;
  testsPassed: Maybe<Scalars["Boolean"]["output"]>;
  tokensUsed: Maybe<Scalars["Int"]["output"]>;
  turnCount: Maybe<Scalars["Int"]["output"]>;
};

export type TaskOutcomeResult =
  | "CANCELLED"
  | "COMPLETED"
  | "FAILED"
  | "PARTIALLY_COMPLETED"
  | "TIMED_OUT";

export type TaskProposal = {
  agentRef: Scalars["String"]["output"];
  deliveryMode: WrapUpMode;
  description: Scalars["String"]["output"];
  estimatedFiles: Maybe<Scalars["Int"]["output"]>;
  estimatedMinutes: Maybe<Scalars["Int"]["output"]>;
  framework: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  idempotencyKey: Maybe<Scalars["String"]["output"]>;
  insertedAt: Scalars["DateTime"]["output"];
  model: Maybe<Scalars["String"]["output"]>;
  scopeSummary: Maybe<Scalars["String"]["output"]>;
  sourceRef: Scalars["String"]["output"];
  verdict: VerdictDecision;
  verdictReason: Maybe<Scalars["String"]["output"]>;
  wrapUpGuidance: Maybe<WrapUpGuidance>;
  /** @deprecated Use wrapUpGuidance instead */
  wrapUpGuidanceSnapshot: Maybe<Scalars["JSON"]["output"]>;
};

export type Team = {
  description: Maybe<Scalars["String"]["output"]>;
  icon: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  members: Maybe<Array<TeamMember>>;
  name: Scalars["String"]["output"];
};

export type TeamMember = {
  avatar: Maybe<Scalars["String"]["output"]>;
  contract: Maybe<Contract>;
  email: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  location: Maybe<Scalars["String"]["output"]>;
  name: Maybe<Scalars["String"]["output"]>;
  reachabilityWindows: Maybe<Array<ReachabilityWindow>>;
  teams: Maybe<Array<Team>>;
};

export type TeamPresence = {
  connectionType: Scalars["String"]["output"];
  onlineAt: Scalars["DateTime"]["output"];
  userId: Scalars["ID"]["output"];
};

export type User = {
  avatar: Maybe<Scalars["HttpUrl"]["output"]>;
  confirmedAt: Maybe<Scalars["DateTime"]["output"]>;
  email: Scalars["String"]["output"];
  handle: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  insertedAt: Scalars["DateTime"]["output"];
  location: Maybe<Scalars["String"]["output"]>;
  name: Maybe<Scalars["String"]["output"]>;
  showStatusMessage: Scalars["Boolean"]["output"];
  timezone: Maybe<Scalars["String"]["output"]>;
  updatedAt: Scalars["DateTime"]["output"];
  visibilityLevel: VisibilityLevel;
};

export type ValueMetricConfidence = "ESTIMATED" | "EXACT" | "UNKNOWN";

export type ValueMetricKey =
  | "OFF_HOURS_INTERRUPTIONS_AVOIDED"
  | "RABBIT_HOLES_PREVENTED"
  | "SPEND_AVOIDED"
  | "TIME_NOT_WASTED";

export type ValueMetricSummary = {
  confidence: ValueMetricConfidence;
  dataState: AgentControlDataState;
  evidenceCount: Maybe<Scalars["Int"]["output"]>;
  explanation: Scalars["String"]["output"];
  label: Scalars["String"]["output"];
  metricKey: ValueMetricKey;
  unit: Maybe<Scalars["String"]["output"]>;
  value: Maybe<Scalars["Float"]["output"]>;
};

export type Verdict = {
  decision: VerdictDecision;
  evaluatedAt: Scalars["DateTime"]["output"];
  /** Availability policy from the active reachability window */
  policy: Maybe<AlertsPolicy>;
  /** Availability status */
  policyStatus: Maybe<PolicyStatus>;
  proposalId: Scalars["ID"]["output"];
  reason: Scalars["String"]["output"];
  wrapUpGuidance: Maybe<WrapUpGuidance>;
};

export type VerdictDecision = "APPROVED" | "DEFERRED";

export type VerdictModeThreshold = {
  maxEstimatedMinutes: Maybe<Scalars["Int"]["output"]>;
  maxFiles: Maybe<Scalars["Int"]["output"]>;
};

export type VerdictModeThresholdInput = {
  maxEstimatedMinutes: InputMaybe<Scalars["Int"]["input"]>;
  maxFiles: InputMaybe<Scalars["Int"]["input"]>;
};

export type VerdictModeThresholds = {
  busy: VerdictModeThreshold;
  limited: VerdictModeThreshold;
  offline: VerdictModeThreshold;
  online: VerdictModeThreshold;
};

export type VerdictModeThresholdsInput = {
  busy: VerdictModeThresholdInput;
  limited: VerdictModeThresholdInput;
  offline: VerdictModeThresholdInput;
  online: VerdictModeThresholdInput;
};

export type VerdictOverride = {
  id: Scalars["ID"]["output"];
  insertedAt: Scalars["DateTime"]["output"];
  originalVerdict: VerdictDecision;
  overrideVerdict: VerdictDecision;
  proposalId: Scalars["ID"]["output"];
  reason: Maybe<Scalars["String"]["output"]>;
};

export type VerdictSettings = {
  defaultWrapUpMode: WrapUpMode;
  id: Scalars["ID"]["output"];
  insertedAt: Scalars["DateTime"]["output"];
  /** @deprecated Use thresholds instead */
  modeThresholds: Scalars["JSON"]["output"];
  thresholds: VerdictModeThresholds;
  updatedAt: Scalars["DateTime"]["output"];
  wrapUpThresholdMinutes: Scalars["Int"]["output"];
};

/** Controls how much timing detail the public availability page reveals */
export type VisibilityLevel =
  /** Coarsened return times with jitter, timezone region */
  | "APPROXIMATE"
  /** Four-state signal only: available, busy, away, offline */
  | "MINIMAL"
  /** Exact return time and full timezone */
  | "PRECISE";

export type WrapUpGuidance = {
  active: Scalars["Boolean"]["output"];
  deadlineAt: Maybe<Scalars["DateTime"]["output"]>;
  hints: Array<Scalars["String"]["output"]>;
  profile: WrapUpProfile;
  reason: Scalars["String"]["output"];
  remainingMinutes: Maybe<Scalars["Int"]["output"]>;
  selectedMode: WrapUpMode;
  source: WrapUpGuidanceSource;
  thresholdMinutes: Scalars["Int"]["output"];
};

/** Why Wrap-Up guidance is active or inactive */
export type WrapUpGuidanceSource =
  | "FORCED_FULL_DEPTH"
  | "FORCED_WRAP_UP"
  | "INACTIVE"
  | "LOCKED"
  | "OUTSIDE_REACHABLE_HOURS"
  | "THRESHOLD"
  | "UNKNOWN_DEADLINE";

/** Wrap-Up guidance for execution style and task shaping, not an availability status */
export type WrapUpMode = "AUTO" | "FULL_DEPTH" | "WRAP_UP";

/** Wrap-Up execution profile currently applied */
export type WrapUpProfile = "NORMAL" | "WRAP_UP";

export type ActiveContractQueryVariables = Exact<{ [key: string]: never }>;

export type ActiveContractQuery = {
  activeContract: {
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
  } | null;
};

export type ScheduleQueryVariables = Exact<{
  at: InputMaybe<Scalars["DateTime"]["input"]>;
}>;

export type ScheduleQuery = {
  schedule: {
    inReachableHours: boolean;
    nextTransitionAt: string | null;
    attentionDeadlineAt: string | null;
    wrapUpGuidance: {
      active: boolean;
      deadlineAt: string | null;
      remainingMinutes: number | null;
      profile: WrapUpProfile;
      source: WrapUpGuidanceSource;
      reason: string;
      hints: Array<string>;
      thresholdMinutes: number;
      selectedMode: WrapUpMode;
    };
    activeWindow: {
      id: string;
      label: string;
      priority: number;
      startTime: string;
      endTime: string;
      days: Array<string>;
      mode: Mode;
      alertsPolicy: AlertsPolicy;
      snooze: boolean;
      status: boolean;
      statusEmoji: string | null;
      statusText: string | null;
      autoActivate: boolean;
    } | null;
    nextWindow: {
      id: string;
      label: string;
      priority: number;
      startTime: string;
      endTime: string;
      days: Array<string>;
      mode: Mode;
      alertsPolicy: AlertsPolicy;
      snooze: boolean;
      status: boolean;
      statusEmoji: string | null;
      statusText: string | null;
      autoActivate: boolean;
    } | null;
  } | null;
};

export type AgentControlOverviewQueryVariables = Exact<{ [key: string]: never }>;

export type AgentControlOverviewQuery = {
  agentControlOverview: {
    needsYourYesState: AgentControlDataState;
    runSummariesState: AgentControlDataState;
    valueMetricsState: AgentControlDataState;
    generatedAt: string;
    currentCall: {
      callKey: HeadsdownCallKey;
      title: string;
      body: string;
      primaryActionLabel: string | null;
      primaryActionIntent: AgentControlUiIntent;
      secondaryActionLabel: string | null;
      secondaryActionIntent: AgentControlUiIntent;
      recommendedActionKey: HeadsdownActionKey | null;
      allowedActionKeys: Array<HeadsdownActionKey>;
      reasonCodes: Array<string>;
      dataState: AgentControlDataState;
      evaluatedAt: string | null;
    };
    headsdownCall: {
      key: string;
      knownKey: HeadsdownCallKey | null;
      title: string;
      body: string;
      severity: HeadsdownCallSeverity;
      urgency: HeadsdownCallUrgency;
      primaryActionLabel: string | null;
      primaryActionKey: string | null;
      primaryActionKnownKey: HeadsdownActionKey | null;
      primaryActionIntent: AgentControlUiIntent;
      secondaryActionLabel: string | null;
      secondaryActionKey: string | null;
      secondaryActionKnownKey: HeadsdownActionKey | null;
      secondaryActionIntent: AgentControlUiIntent;
      recommendedActionKey: string | null;
      recommendedActionKnownKey: HeadsdownActionKey | null;
      allowedActionKeys: Array<string>;
      allowedActionKnownKeys: Array<HeadsdownActionKey>;
      allowedUiIntents: Array<AgentControlUiIntent>;
      reasonCodes: Array<string>;
      confidence: HeadsdownCallConfidence;
      evidenceSource: HeadsdownCallEvidenceSource;
      privacyMode: HeadsdownCallPrivacyMode;
      expiresAt: string | null;
    };
    needsYourYes: Array<{
      runId: string;
      callKey: HeadsdownCallKey;
      title: string;
      body: string;
      itemState: NeedsYourYesItemState;
      primaryActionLabel: string | null;
      primaryActionIntent: AgentControlUiIntent;
      recommendedActionKey: HeadsdownActionKey | null;
      allowedActionKeys: Array<HeadsdownActionKey>;
      reasonCodes: Array<string>;
      dataState: AgentControlDataState;
      createdAt: string;
      updatedAt: string;
    }>;
    runSummaries: Array<{
      runId: string;
      callKey: HeadsdownCallKey;
      runState: AgentRunState;
      actionState: AgentRunActionState;
      clientLabel: string;
      safeTitle: string;
      recommendedActionKey: HeadsdownActionKey | null;
      allowedActionKeys: Array<HeadsdownActionKey>;
      reasonCodes: Array<string>;
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
    }>;
    valueMetrics: Array<{
      metricKey: ValueMetricKey;
      label: string;
      value: number | null;
      unit: string | null;
      confidence: ValueMetricConfidence;
      evidenceCount: number | null;
      explanation: string;
      dataState: AgentControlDataState;
    }>;
  };
};

export type ReportAgentRunEventMutationVariables = Exact<{
  input: ReportAgentRunEventInput;
}>;

export type ReportAgentRunEventMutation = {
  reportAgentRunEvent: {
    ok: boolean;
    error: { code: string; message: string; details: Record<string, unknown> } | null;
    event: {
      id: string;
      eventId: string;
      eventType: string;
      schemaVersion: number;
      occurredAt: string;
      receivedAt: string;
      workspaceRef: string;
      runId: string;
      source: string;
      privacyMode: AgentRunEventPrivacyMode;
      idempotencyKey: string;
      correlationId: string | null;
      causationEventId: string | null;
      sequence: number | null;
      emitterKey: string;
      proposalRef: string | null;
      payload: Record<string, unknown>;
      insertedAt: string;
      client: { kind: string; name: string; version: string };
      actor: { kind: string; ref: string | null };
    } | null;
  };
};

export type ApplyHeadsdownActionMutationVariables = Exact<{
  input: ApplyHeadsdownActionInput;
}>;

export type ApplyHeadsdownActionMutation = {
  applyHeadsdownAction: {
    ok: boolean;
    error: { code: string; message: string; details: Record<string, unknown> } | null;
    result: {
      actionKey: HeadsdownActionKey;
      replayed: boolean;
      sourceState: HeadsdownActionState;
      resultingState: HeadsdownActionState;
      eventId: string;
      availabilityOverrideId: string | null;
    } | null;
    currentCall: {
      callKey: HeadsdownCallKey;
      title: string;
      body: string;
      primaryActionLabel: string | null;
      primaryActionIntent: AgentControlUiIntent;
      secondaryActionLabel: string | null;
      secondaryActionIntent: AgentControlUiIntent;
      recommendedActionKey: HeadsdownActionKey | null;
      allowedActionKeys: Array<HeadsdownActionKey>;
      reasonCodes: Array<string>;
      dataState: AgentControlDataState;
      evaluatedAt: string | null;
    } | null;
    headsdownCall: {
      key: string;
      knownKey: HeadsdownCallKey | null;
      title: string;
      body: string;
      severity: HeadsdownCallSeverity;
      urgency: HeadsdownCallUrgency;
      primaryActionLabel: string | null;
      primaryActionKey: string | null;
      primaryActionKnownKey: HeadsdownActionKey | null;
      primaryActionIntent: AgentControlUiIntent;
      secondaryActionLabel: string | null;
      secondaryActionKey: string | null;
      secondaryActionKnownKey: HeadsdownActionKey | null;
      secondaryActionIntent: AgentControlUiIntent;
      recommendedActionKey: string | null;
      recommendedActionKnownKey: HeadsdownActionKey | null;
      allowedActionKeys: Array<string>;
      allowedActionKnownKeys: Array<HeadsdownActionKey>;
      allowedUiIntents: Array<AgentControlUiIntent>;
      reasonCodes: Array<string>;
      confidence: HeadsdownCallConfidence;
      evidenceSource: HeadsdownCallEvidenceSource;
      privacyMode: HeadsdownCallPrivacyMode;
      expiresAt: string | null;
    } | null;
    runSummary: {
      runId: string;
      callKey: HeadsdownCallKey;
      runState: AgentRunState;
      actionState: AgentRunActionState;
      clientLabel: string;
      safeTitle: string;
      recommendedActionKey: HeadsdownActionKey | null;
      allowedActionKeys: Array<HeadsdownActionKey>;
      reasonCodes: Array<string>;
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
    } | null;
  };
};

export type AvailabilityQueryVariables = Exact<{
  at: InputMaybe<Scalars["DateTime"]["input"]>;
}>;

export type AvailabilityQuery = {
  activeContract: {
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
  } | null;
  schedule: {
    inReachableHours: boolean;
    nextTransitionAt: string | null;
    attentionDeadlineAt: string | null;
    wrapUpGuidance: {
      active: boolean;
      deadlineAt: string | null;
      remainingMinutes: number | null;
      profile: WrapUpProfile;
      source: WrapUpGuidanceSource;
      reason: string;
      hints: Array<string>;
      thresholdMinutes: number;
      selectedMode: WrapUpMode;
    };
    activeWindow: {
      id: string;
      label: string;
      priority: number;
      startTime: string;
      endTime: string;
      days: Array<string>;
      mode: Mode;
      alertsPolicy: AlertsPolicy;
      snooze: boolean;
      status: boolean;
      statusEmoji: string | null;
      statusText: string | null;
      autoActivate: boolean;
    } | null;
    nextWindow: {
      id: string;
      label: string;
      priority: number;
      startTime: string;
      endTime: string;
      days: Array<string>;
      mode: Mode;
      alertsPolicy: AlertsPolicy;
      snooze: boolean;
      status: boolean;
      statusEmoji: string | null;
      statusText: string | null;
      autoActivate: boolean;
    } | null;
  } | null;
};

export type SubmitProposalMutationVariables = Exact<{
  input: ProposalInput;
}>;

export type SubmitProposalMutation = {
  submitProposal: {
    decision: VerdictDecision;
    reason: string;
    proposalId: string;
    evaluatedAt: string;
    wrapUpGuidance: {
      active: boolean;
      deadlineAt: string | null;
      remainingMinutes: number | null;
      profile: WrapUpProfile;
      source: WrapUpGuidanceSource;
      reason: string;
      hints: Array<string>;
      thresholdMinutes: number;
      selectedMode: WrapUpMode;
    } | null;
  } | null;
};

export type ProposalsQueryVariables = Exact<{
  verdict: InputMaybe<VerdictDecision>;
  latest: InputMaybe<Scalars["Int"]["input"]>;
}>;

export type ProposalsQuery = {
  proposals: Array<{
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
    insertedAt: string;
    wrapUpGuidance: {
      active: boolean;
      deadlineAt: string | null;
      remainingMinutes: number | null;
      profile: WrapUpProfile;
      source: WrapUpGuidanceSource;
      reason: string;
      hints: Array<string>;
      thresholdMinutes: number;
      selectedMode: WrapUpMode;
    } | null;
  }> | null;
};

export type PresetsQueryVariables = Exact<{ [key: string]: never }>;

export type PresetsQuery = {
  presets: Array<{
    id: string;
    name: string;
    status: boolean;
    statusEmoji: string | null;
    statusText: string | null;
    duration: number | null;
    insertedAt: string;
    updatedAt: string;
  }> | null;
};

export type ApplyPresetMutationVariables = Exact<{
  id: Scalars["ID"]["input"];
}>;

export type ApplyPresetMutation = {
  applyPreset: {
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
  } | null;
};

export type CreateContractMutationVariables = Exact<{
  input: ContractInput;
}>;

export type CreateContractMutation = {
  createContract: {
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
  } | null;
};

export type ProfileQueryVariables = Exact<{ [key: string]: never }>;

export type ProfileQuery = {
  profile: {
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
  } | null;
};

export type OverrideVerdictMutationVariables = Exact<{
  input: OverrideInput;
}>;

export type OverrideVerdictMutation = {
  overrideVerdict: {
    id: string;
    originalVerdict: VerdictDecision;
    overrideVerdict: VerdictDecision;
    reason: string | null;
    proposalId: string;
    insertedAt: string;
  } | null;
};

export type CreateDelegationGrantMutationVariables = Exact<{
  input: DelegationGrantInput;
}>;

export type CreateDelegationGrantMutation = {
  createDelegationGrant: {
    id: string;
    scope: DelegationGrantScope;
    sessionId: string | null;
    workspaceRef: string | null;
    agentId: string | null;
    permissions: Array<DelegationGrantPermission>;
    source: string;
    expiresAt: string;
    revokedAt: string | null;
    expiredAt: string | null;
    createdById: string;
    revokedById: string | null;
    insertedAt: string;
    updatedAt: string;
  } | null;
};

export type DelegationGrantsQueryVariables = Exact<{
  filter: InputMaybe<DelegationGrantFilterInput>;
}>;

export type DelegationGrantsQuery = {
  delegationGrants: Array<{
    id: string;
    scope: DelegationGrantScope;
    sessionId: string | null;
    workspaceRef: string | null;
    agentId: string | null;
    permissions: Array<DelegationGrantPermission>;
    source: string;
    expiresAt: string;
    revokedAt: string | null;
    expiredAt: string | null;
    createdById: string;
    revokedById: string | null;
    insertedAt: string;
    updatedAt: string;
  }>;
};

export type ActiveDelegationGrantsQueryVariables = Exact<{ [key: string]: never }>;

export type ActiveDelegationGrantsQuery = {
  activeDelegationGrants: Array<{
    id: string;
    scope: DelegationGrantScope;
    sessionId: string | null;
    workspaceRef: string | null;
    agentId: string | null;
    permissions: Array<DelegationGrantPermission>;
    source: string;
    expiresAt: string;
    revokedAt: string | null;
    expiredAt: string | null;
    createdById: string;
    revokedById: string | null;
    insertedAt: string;
    updatedAt: string;
  }>;
};

export type RevokeDelegationGrantMutationVariables = Exact<{
  id: Scalars["ID"]["input"];
}>;

export type RevokeDelegationGrantMutation = {
  revokeDelegationGrant: {
    id: string;
    scope: DelegationGrantScope;
    sessionId: string | null;
    workspaceRef: string | null;
    agentId: string | null;
    permissions: Array<DelegationGrantPermission>;
    source: string;
    expiresAt: string;
    revokedAt: string | null;
    expiredAt: string | null;
    createdById: string;
    revokedById: string | null;
    insertedAt: string;
    updatedAt: string;
  } | null;
};

export type RevokeDelegationGrantsMutationVariables = Exact<{
  filter: InputMaybe<DelegationGrantFilterInput>;
}>;

export type RevokeDelegationGrantsMutation = {
  revokeDelegationGrants: { revokedCount: number } | null;
};

export type EvaluateInterruptQueryVariables = Exact<{
  handle: Scalars["String"]["input"];
}>;

export type EvaluateInterruptQuery = {
  evaluateInterrupt: { allowed: boolean; reason: string; autoResponse: string | null } | null;
};

export type CalibrationProfilesQueryVariables = Exact<{ [key: string]: never }>;

export type CalibrationProfilesQuery = {
  calibrationProfiles: Array<{
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
  }> | null;
};

export type VerdictSettingsQueryVariables = Exact<{ [key: string]: never }>;

export type VerdictSettingsQuery = {
  verdictSettings: {
    id: string;
    defaultWrapUpMode: WrapUpMode;
    wrapUpThresholdMinutes: number;
    insertedAt: string;
    updatedAt: string;
    thresholds: {
      online: { maxFiles: number | null; maxEstimatedMinutes: number | null };
      busy: { maxFiles: number | null; maxEstimatedMinutes: number | null };
      limited: { maxFiles: number | null; maxEstimatedMinutes: number | null };
      offline: { maxFiles: number | null; maxEstimatedMinutes: number | null };
    };
  } | null;
};

export type UpdateVerdictSettingsMutationVariables = Exact<{
  thresholds: InputMaybe<VerdictModeThresholdsInput>;
  defaultWrapUpMode: InputMaybe<WrapUpMode>;
  wrapUpThresholdMinutes: InputMaybe<Scalars["Int"]["input"]>;
}>;

export type UpdateVerdictSettingsMutation = {
  updateVerdictSettings: {
    id: string;
    defaultWrapUpMode: WrapUpMode;
    wrapUpThresholdMinutes: number;
    insertedAt: string;
    updatedAt: string;
    thresholds: {
      online: { maxFiles: number | null; maxEstimatedMinutes: number | null };
      busy: { maxFiles: number | null; maxEstimatedMinutes: number | null };
      limited: { maxFiles: number | null; maxEstimatedMinutes: number | null };
      offline: { maxFiles: number | null; maxEstimatedMinutes: number | null };
    };
  } | null;
};

export type DigestSummariesQueryVariables = Exact<{
  latest: InputMaybe<Scalars["Int"]["input"]>;
}>;

export type DigestSummariesQuery = {
  digestSummaries: Array<{
    id: string;
    actorRef: string;
    actorLabel: string;
    sourceType: string;
    action: string;
    channelRef: string | null;
    entryCount: number;
    firstEventAt: string;
    lastEventAt: string;
    events: Array<{ description: string; insertedAt: string }>;
  }> | null;
};

export type DismissDigestEntryMutationVariables = Exact<{
  id: Scalars["ID"]["input"];
}>;

export type DismissDigestEntryMutation = {
  dismissDigestEntry: {
    id: string;
    actorRef: string;
    actorLabel: string;
    sourceType: string;
    action: string;
    channelRef: string | null;
    entryCount: number;
    firstEventAt: string;
    lastEventAt: string;
    events: Array<{ description: string; insertedAt: string }>;
  } | null;
};

export type AutoResponderSettingsQueryVariables = Exact<{ [key: string]: never }>;

export type AutoResponderSettingsQuery = {
  autoResponderSettings: {
    id: string;
    busyText: string;
    limitedText: string;
    offlineText: string;
    insertedAt: string;
    updatedAt: string;
  } | null;
};

export type UpdateAutoResponderSettingsMutationVariables = Exact<{
  busyText: InputMaybe<Scalars["String"]["input"]>;
  limitedText: InputMaybe<Scalars["String"]["input"]>;
  offlineText: InputMaybe<Scalars["String"]["input"]>;
}>;

export type UpdateAutoResponderSettingsMutation = {
  updateAutoResponderSettings: {
    id: string;
    busyText: string;
    limitedText: string;
    offlineText: string;
    insertedAt: string;
    updatedAt: string;
  } | null;
};

export type TeamsQueryVariables = Exact<{
  id: InputMaybe<Scalars["ID"]["input"]>;
}>;

export type TeamsQuery = {
  teams: Array<{
    id: string;
    name: string;
    icon: string | null;
    description: string | null;
    members: Array<{
      id: string;
      email: string;
      name: string | null;
      location: string | null;
      avatar: string | null;
    }> | null;
  }> | null;
};

export type CompanyQueryVariables = Exact<{ [key: string]: never }>;

export type CompanyQuery = {
  company: {
    id: string;
    name: string | null;
    teams: Array<{
      id: string;
      name: string;
      icon: string | null;
      description: string | null;
    }> | null;
  } | null;
};

export type TeamPresenceQueryVariables = Exact<{
  teamId: Scalars["ID"]["input"];
}>;

export type TeamPresenceQuery = {
  teamPresence: Array<{ userId: string; onlineAt: string; connectionType: string }> | null;
};

export type ReportOutcomeMutationVariables = Exact<{
  input: OutcomeInput;
}>;

export type ReportOutcomeMutation = {
  reportOutcome: {
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
  } | null;
};
