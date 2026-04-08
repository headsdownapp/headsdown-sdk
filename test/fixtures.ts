import type {
  ApiKey,
  ApiKeyWithRaw,
  AutoResponderSettings,
  Company,
  Contract,
  Calendar,
  CalibrationProfile,
  DigestSummary,
  InterruptResult,
  Team,
  TeamPresence,
  Verdict,
  VerdictOverride,
  VerdictSettings,
  TaskProposal,
  Preset,
  UserProfile,
} from "../src/types.js";

// === Response Fixtures (as returned by the API, before enum normalization) ===

export const RAW_CONTRACT = {
  id: "contract-1",
  mode: "BUSY",
  status: true,
  statusEmoji: "🔨",
  statusText: "Deep work",
  autoRespond: true,
  lock: true,
  duration: 120,
  ruleSetType: null,
  ruleSetParams: null,
  expiresAt: "2025-06-15T18:00:00Z",
  insertedAt: "2025-06-15T16:00:00Z",
};

export const NORMALIZED_CONTRACT: Contract = {
  id: "contract-1",
  mode: "busy",
  status: true,
  statusEmoji: "🔨",
  statusText: "Deep work",
  autoRespond: true,
  lock: true,
  duration: 120,
  ruleSetType: null,
  ruleSetParams: null,
  expiresAt: "2025-06-15T18:00:00Z",
  insertedAt: "2025-06-15T16:00:00Z",
};

export const RAW_CALENDAR = {
  automateEndOfDay: true,
  automateStartOfDay: true,
  day: "WEDNESDAY",
  endsAt: "2025-06-15T17:00:00-06:00",
  nextWorkday: "THURSDAY",
  nextWorkdayStartsAt: "2025-06-16T09:00:00-06:00",
  now: "2025-06-15T14:30:00-06:00",
  offHours: false,
  startsAt: "2025-06-15T09:00:00-06:00",
  workHours: true,
  working: true,
};

export const NORMALIZED_CALENDAR: Calendar = {
  automateEndOfDay: true,
  automateStartOfDay: true,
  day: "wednesday",
  endsAt: "2025-06-15T17:00:00-06:00",
  nextWorkday: "thursday",
  nextWorkdayStartsAt: "2025-06-16T09:00:00-06:00",
  now: "2025-06-15T14:30:00-06:00",
  offHours: false,
  startsAt: "2025-06-15T09:00:00-06:00",
  workHours: true,
  working: true,
};

export const RAW_VERDICT_APPROVED = {
  decision: "APPROVED",
  reason: "Task is within scope for online mode",
  proposalId: "proposal-abc-123",
  evaluatedAt: "2025-06-15T14:30:00Z",
};

export const NORMALIZED_VERDICT_APPROVED: Verdict = {
  decision: "approved",
  reason: "Task is within scope for online mode",
  proposalId: "proposal-abc-123",
  evaluatedAt: "2025-06-15T14:30:00Z",
};

export const RAW_VERDICT_DEFERRED = {
  decision: "DEFERRED",
  reason: "User is in offline mode; defers all proposals",
  proposalId: "proposal-def-456",
  evaluatedAt: "2025-06-15T14:35:00Z",
};

export const NORMALIZED_VERDICT_DEFERRED: Verdict = {
  decision: "deferred",
  reason: "User is in offline mode; defers all proposals",
  proposalId: "proposal-def-456",
  evaluatedAt: "2025-06-15T14:35:00Z",
};

export const RAW_PROPOSAL: TaskProposal = {
  id: "prop-1",
  agentRef: "claude-code",
  model: "claude-sonnet-4",
  framework: "claude-code",
  description: "Refactor auth module",
  estimatedFiles: 4,
  estimatedMinutes: 20,
  scopeSummary: "4 files in lib/auth",
  sourceRef: "ticket-142",
  verdict: "APPROVED" as "approved",
  verdictReason: "Within scope",
  insertedAt: "2025-06-15T14:30:00Z",
};

export const NORMALIZED_PROPOSAL: TaskProposal = {
  id: "prop-1",
  agentRef: "claude-code",
  model: "claude-sonnet-4",
  framework: "claude-code",
  description: "Refactor auth module",
  estimatedFiles: 4,
  estimatedMinutes: 20,
  scopeSummary: "4 files in lib/auth",
  sourceRef: "ticket-142",
  verdict: "approved",
  verdictReason: "Within scope",
  insertedAt: "2025-06-15T14:30:00Z",
};

export const RAW_PRESET = {
  id: "preset-1",
  name: "Deep Work",
  status: true,
  statusEmoji: "🔨",
  statusText: "Deep work",
  duration: 120,
  insertedAt: "2025-06-01T10:00:00Z",
  updatedAt: "2025-06-10T10:00:00Z",
};

export const NORMALIZED_PRESET: Preset = {
  id: "preset-1",
  name: "Deep Work",
  status: true,
  statusEmoji: "🔨",
  statusText: "Deep work",
  duration: 120,
  insertedAt: "2025-06-01T10:00:00Z",
  updatedAt: "2025-06-10T10:00:00Z",
};

export const RAW_PROFILE = {
  id: "user-1",
  name: "Test User",
  handle: "testuser",
  email: "test@example.com",
  avatar: "https://example.com/avatar.png",
  timezone: "America/Denver",
  visibilityLevel: "APPROXIMATE",
  showStatusMessage: true,
  confirmedAt: "2025-01-01T00:00:00Z",
  location: "Denver, CO",
  insertedAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-06-01T00:00:00Z",
};

export const NORMALIZED_PROFILE: UserProfile = {
  id: "user-1",
  name: "Test User",
  handle: "testuser",
  email: "test@example.com",
  avatar: "https://example.com/avatar.png",
  timezone: "America/Denver",
  visibilityLevel: "approximate",
  showStatusMessage: true,
  confirmedAt: "2025-01-01T00:00:00Z",
  location: "Denver, CO",
  insertedAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-06-01T00:00:00Z",
};

export const RAW_VERDICT_OVERRIDE = {
  id: "override-1",
  originalVerdict: "DEFERRED",
  overrideVerdict: "APPROVED",
  reason: "Urgent hotfix needed",
  proposalId: "proposal-def-456",
  insertedAt: "2025-06-15T15:00:00Z",
};

export const NORMALIZED_VERDICT_OVERRIDE: VerdictOverride = {
  id: "override-1",
  originalVerdict: "deferred",
  overrideVerdict: "approved",
  reason: "Urgent hotfix needed",
  proposalId: "proposal-def-456",
  insertedAt: "2025-06-15T15:00:00Z",
};

export const RAW_INTERRUPT_ALLOWED: InterruptResult = {
  allowed: true,
  reason: "User is online and interruptable",
  autoResponse: null,
};

export const RAW_INTERRUPT_DENIED: InterruptResult = {
  allowed: false,
  reason: "User is in do_not_disturb mode",
  autoResponse: "I'm heads down right now. I'll get back to you later.",
};

export const RAW_CALIBRATION_PROFILE = {
  id: "profile-1",
  model: "claude-sonnet-4",
  framework: "claude-code",
  sampleSize: 50,
  medianDurationMinutes: 15.0,
  successRate: 0.85,
  overrideRate: 0.1,
  p25DurationMinutes: 8.0,
  p75DurationMinutes: 25.0,
  durationCiLower: 12.0,
  durationCiUpper: 18.0,
  successRateCiLower: 0.75,
  successRateCiUpper: 0.92,
  confidenceLevel: "HIGH",
  tier: "established",
  status: "active",
  tasksToHighConfidence: 0,
  insertedAt: "2025-06-01T00:00:00Z",
  updatedAt: "2025-06-15T00:00:00Z",
};

export const NORMALIZED_CALIBRATION_PROFILE: CalibrationProfile = {
  ...RAW_CALIBRATION_PROFILE,
  confidenceLevel: "high",
};

export const RAW_VERDICT_SETTINGS = {
  id: "settings-1",
  modeThresholds: { online: 60, busy: 15, limited: 5, offline: 0 },
  insertedAt: "2025-06-01T00:00:00Z",
  updatedAt: "2025-06-10T00:00:00Z",
};

export const NORMALIZED_VERDICT_SETTINGS: VerdictSettings = { ...RAW_VERDICT_SETTINGS };

export const RAW_DIGEST_SUMMARY = {
  id: "digest-1",
  actorRef: "slack:user:123",
  actorLabel: "Jane Dev",
  sourceType: "slack",
  action: "message",
  channelRef: "C123",
  events: [{ description: "Pinged you in #eng", insertedAt: "2025-06-15T12:01:00Z" }],
  entryCount: 1,
  firstEventAt: "2025-06-15T12:01:00Z",
  lastEventAt: "2025-06-15T12:01:00Z",
};

export const NORMALIZED_DIGEST_SUMMARY: DigestSummary = { ...RAW_DIGEST_SUMMARY };

export const RAW_API_KEY = {
  id: "key-1",
  prefix: "hd_abc",
  label: "CLI",
  lastUsedAt: "2025-06-15T12:00:00Z",
  insertedAt: "2025-06-01T10:00:00Z",
};

export const NORMALIZED_API_KEY: ApiKey = { ...RAW_API_KEY };

export const RAW_API_KEY_WITH_RAW = {
  rawKey: "hd_full_secret_value",
  apiKey: RAW_API_KEY,
};

export const NORMALIZED_API_KEY_WITH_RAW: ApiKeyWithRaw = {
  rawKey: "hd_full_secret_value",
  apiKey: NORMALIZED_API_KEY,
};

export const RAW_AUTO_RESPONDER_SETTINGS = {
  id: "ars-1",
  busyText: "Heads down, will reply later",
  limitedText: "In limited mode right now",
  offlineText: "Offline for now",
  insertedAt: "2025-06-01T10:00:00Z",
  updatedAt: "2025-06-10T10:00:00Z",
};

export const NORMALIZED_AUTO_RESPONDER_SETTINGS: AutoResponderSettings = {
  ...RAW_AUTO_RESPONDER_SETTINGS,
};

export const RAW_TEAM = {
  id: "team-1",
  name: "Platform",
  icon: "rocket",
  description: "Core platform team",
  members: [
    {
      id: "user-2",
      email: "member@example.com",
      name: "Team Member",
      location: "Denver",
      avatar: "https://example.com/member.png",
    },
  ],
};

export const NORMALIZED_TEAM: Team = { ...RAW_TEAM };

export const RAW_COMPANY = {
  id: "company-1",
  name: "HeadsDown",
  teams: [
    {
      id: "team-1",
      name: "Platform",
      icon: "rocket",
      description: "Core platform team",
    },
  ],
};

export const NORMALIZED_COMPANY: Company = { ...RAW_COMPANY };

export const RAW_TEAM_PRESENCE = {
  userId: "user-2",
  onlineAt: "2025-06-15T12:03:00Z",
  connectionType: "websocket",
};

export const NORMALIZED_TEAM_PRESENCE: TeamPresence = { ...RAW_TEAM_PRESENCE };

// === Helper: Create a mock fetch that returns a GraphQL response ===

export function mockGraphQL<T>(data: T, status = 200): typeof globalThis.fetch {
  return (() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve({ data }),
      text: () => Promise.resolve(JSON.stringify({ data })),
      headers: new Headers(),
    })) as unknown as typeof globalThis.fetch;
}

export function mockGraphQLError(
  errors: Array<{ message: string }>,
  status = 200,
): typeof globalThis.fetch {
  return (() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve({ errors }),
      text: () => Promise.resolve(JSON.stringify({ errors })),
      headers: new Headers(),
    })) as unknown as typeof globalThis.fetch;
}

export function mockHttpError(status: number, body = ""): typeof globalThis.fetch {
  return (() =>
    Promise.resolve({
      ok: false,
      status,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(body),
      headers: new Headers(),
    })) as unknown as typeof globalThis.fetch;
}

export function mockNetworkError(message = "fetch failed"): typeof globalThis.fetch {
  return (() => Promise.reject(new TypeError(message))) as unknown as typeof globalThis.fetch;
}

/**
 * Create a mock fetch that records calls and responds with a sequence of responses.
 * Useful for testing polling flows.
 */
export function mockFetchSequence(
  responses: Array<{
    status: number;
    body: unknown;
  }>,
): { fetch: typeof globalThis.fetch; calls: Array<{ url: string; init: RequestInit }> } {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  let index = 0;

  const fetchFn = ((url: string, init: RequestInit) => {
    calls.push({ url: String(url), init });
    const response = responses[Math.min(index++, responses.length - 1)];
    return Promise.resolve({
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      json: () => Promise.resolve(response.body),
      text: () => Promise.resolve(JSON.stringify(response.body)),
      headers: new Headers(),
    });
  }) as unknown as typeof globalThis.fetch;

  return { fetch: fetchFn, calls };
}
