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
  ConfidenceLevel,
  VisibilityLevel,
  AlertsPolicy,
  DayName,
  TaskOutcomeResult,
  // Response types
  Contract,
  Calendar,
  Preset,
  Verdict,
  VerdictOverride,
  VerdictSettings,
  InterruptResult,
  CalibrationProfile,
  DigestSummary,
  DigestEvent,
  ApiKey,
  ApiKeyWithRaw,
  AutoResponderSettings,
  Team,
  TeamMember,
  TeamPresence,
  Company,
  TaskProposal,
  TaskOutcome,
  UserProfile,
  // Input types
  ProposalInput,
  ContractInput,
  OverrideInput,
  UpdateAutoResponderInput,
  ListProposalsOptions,
  ListDigestOptions,
  ListTeamsOptions,
  OutcomeInput,
  // Auth types
  DeviceAuthorization,
  Credentials,
  // Config types
  ClientOptions,
  RetryOptions,
  RequestHooks,
  DeviceFlowOptions,
  CredentialStoreOptions,
} from "./types.js";
