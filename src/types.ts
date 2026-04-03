// === Enums ===

/** Availability mode. Controls how interruptible the user is. */
export type Mode = "online" | "busy" | "limited" | "offline";

/** Verdict on a task proposal. */
export type VerdictDecision = "approved" | "deferred";

/** Alert behavior preference. */
export type AlertLevel =
  | "interruptable"
  | "do_not_disturb"
  | "take_a_number"
  | "after_hours"
  | "off";

/** Physical presence during an activity. */
export type PresenceLevel = "on_keys" | "distracted" | "afk";

/** Day of the week. */
export type DayName =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

// === API Response Types ===

/** The user's active availability contract. */
export interface Contract {
  id: string;
  mode: Mode;
  status: boolean;
  statusEmoji: string | null;
  statusText: string | null;
  afk: boolean;
  autoRespond: boolean;
  lock: boolean | null;
  duration: number | null;
  expiresAt: string;
  insertedAt: string;
  recordMessages: boolean;
  snooze: boolean;
}

/** The user's current work schedule context. */
export interface Calendar {
  automateEndOfDay: boolean;
  automateStartOfDay: boolean;
  day: DayName;
  endsAt: string;
  nextWorkday: DayName;
  nextWorkdayStartsAt: string;
  now: string;
  offHours: boolean;
  startsAt: string;
  workHours: boolean;
  working: boolean;
}

/** A saved availability preset. */
export interface Preset {
  id: string;
  name: string;
  alerts: AlertLevel;
  presence: PresenceLevel;
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
  email: string;
  avatar: string | null;
  location: string | null;
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
  afk: boolean;
  autoRespond: boolean;
  status: boolean;
  statusEmoji?: string;
  statusText?: string;
  lock?: boolean;
  duration?: number;
}

/** Input for listing proposals with optional filters. */
export interface ListProposalsOptions {
  /** Filter by verdict decision. */
  verdict?: VerdictDecision;
  /** Limit to N most recent proposals. */
  latest?: number;
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
