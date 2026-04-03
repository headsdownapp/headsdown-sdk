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

// Errors
export { HeadsDownError, AuthError, ApiError, NetworkError, ValidationError } from "./errors.js";

// Types
export type {
  // Enums
  Mode,
  VerdictDecision,
  AlertLevel,
  PresenceLevel,
  DayName,
  // Response types
  Contract,
  Calendar,
  Preset,
  Verdict,
  TaskProposal,
  UserProfile,
  // Input types
  ProposalInput,
  ContractInput,
  ListProposalsOptions,
  // Auth types
  DeviceAuthorization,
  Credentials,
  // Config types
  ClientOptions,
  DeviceFlowOptions,
  CredentialStoreOptions,
} from "./types.js";
