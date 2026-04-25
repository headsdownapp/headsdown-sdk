// Client
export { HeadsDownClient } from "./client.js";

// Auth
export { CredentialStore, DeviceFlow } from "./auth.js";

// Config
export { ConfigStore, DEFAULT_SENSITIVE_PATHS, DEFAULT_CONFIG } from "./config.js";
export type { HeadsDownConfig, TrustLevel } from "./config.js";

// Proposal State
export { ProposalStateStore } from "./proposals.js";
export type { StoredProposal } from "./proposals.js";

// Calibration
export { CalibrationTracker } from "./calibration.js";
export type { CalibrationTrackerOptions } from "./calibration.js";

// Errors
export {
  HeadsDownError,
  AuthError,
  ApiError,
  NetworkError,
  ValidationError,
  HeadsDownActionApplyError,
  HeadsDownActionInvalidStateError,
  HeadsDownActionExpiredError,
  HeadsDownActionFeatureDisabledError,
  HeadsDownActionAuthError,
} from "./errors.js";

// Wrap-Up guidance helpers
export { describeWrapUpGuidance } from "./wrap-up.js";
export type { WrapUpInstruction } from "./wrap-up.js";

// Execution directive helpers
export { describeExecutionDirective } from "./execution-directive.js";
export type {
  DirectiveCode,
  EnforcementLevel,
  ExecutionDirective,
  ExecutionDirectiveInput,
} from "./execution-directive.js";

// Agent-control helpers and constants
export { resolveHeadsDownCallFallback } from "./agent-control.js";
export {
  buildActionIdempotencyKey,
  mapHeadsDownActionError,
  mapHeadsDownActionPayloadError,
} from "./agent-control-actions.js";
export type { HeadsDownCallFallback } from "./agent-control.js";
export { HEADSDOWN_CALL_KEYS, HEADSDOWN_ACTION_KEYS } from "./types.js";

// Types
export type {
  // Enums
  Mode,
  VerdictDecision,
  WrapUpMode,
  WrapUpProfile,
  WrapUpGuidanceSource,
  ConfidenceLevel,
  VisibilityLevel,
  AlertsPolicy,
  DayName,
  TaskOutcomeResult,
  DelegationGrantScope,
  DelegationGrantPermission,
  HeadsDownCallKey,
  HeadsDownActionKey,
  HeadsDownActionState,
  AgentControlUiIntent,
  HeadsDownCallSeverity,
  HeadsDownCallUrgency,
  HeadsDownCallEvidenceSource,
  HeadsDownCallPrivacyMode,
  HeadsDownCallConfidence,
  AgentControlDataState,
  AgentRunState,
  AgentRunActionState,
  NeedsYourYesItemState,
  ValueMetricKey,
  // Response types
  Contract,
  ScheduleResolution,
  ReachabilityWindow,
  Preset,
  Verdict,
  VerdictOverride,
  VerdictSettings,
  WrapUpGuidance,
  InterruptResult,
  CalibrationProfile,
  DigestSummary,
  DigestEvent,
  AutoResponderSettings,
  Team,
  TeamMember,
  TeamPresence,
  Company,
  TaskProposal,
  TaskOutcome,
  UserProfile,
  DelegationGrant,
  RevokeDelegationGrantsResult,
  CurrentCallView,
  HeadsDownCall,
  NeedsYourYesItem,
  AgentRunSummary,
  ValueMetricSummary,
  AgentControlOverview,
  HeadsDownActionErrorPayload,
  HeadsDownActionMutationResult,
  HeadsDownActionMutationPayload,
  // Input types
  ProposalInput,
  ContractInput,
  OverrideInput,
  UpdateAutoResponderInput,
  ListProposalsOptions,
  ListDigestOptions,
  ListTeamsOptions,
  OutcomeInput,
  DelegationGrantInput,
  DelegationGrantFilterInput,
  HeadsDownActionOptions,
  HeadsDownActionInputByKey,
  TemporaryExceptionActionOptions,
  AllowForDurationActionOptions,
  CreateTemporaryExceptionActionOptions,
  // Auth types
  DeviceAuthorization,
  Credentials,
  // Config types
  ActorContext,
  ClientOptions,
  RetryOptions,
  RequestHooks,
  DeviceFlowOptions,
  CredentialStoreOptions,
} from "./types.js";
