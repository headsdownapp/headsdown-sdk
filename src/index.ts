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
export { HeadsDownError, AuthError, ApiError, NetworkError, ValidationError } from "./errors.js";

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
