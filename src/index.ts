// Client
export { HeadsDownClient } from "./client.js";

// Auth
export { CredentialStore, DeviceFlow } from "./auth.js";

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
