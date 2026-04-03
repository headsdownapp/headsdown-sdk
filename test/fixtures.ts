import type {
  Contract,
  Calendar,
  Verdict,
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
  afk: false,
  autoRespond: true,
  lock: true,
  duration: 120,
  expiresAt: "2025-06-15T18:00:00Z",
  insertedAt: "2025-06-15T16:00:00Z",
  recordMessages: false,
  snooze: false,
};

export const NORMALIZED_CONTRACT: Contract = {
  id: "contract-1",
  mode: "busy",
  status: true,
  statusEmoji: "🔨",
  statusText: "Deep work",
  afk: false,
  autoRespond: true,
  lock: true,
  duration: 120,
  expiresAt: "2025-06-15T18:00:00Z",
  insertedAt: "2025-06-15T16:00:00Z",
  recordMessages: false,
  snooze: false,
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
  alerts: "DO_NOT_DISTURB",
  presence: "ON_KEYS",
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
  alerts: "do_not_disturb",
  presence: "on_keys",
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
  email: "test@example.com",
  avatar: "https://example.com/avatar.png",
  location: "Denver, CO",
};

export const NORMALIZED_PROFILE: UserProfile = { ...RAW_PROFILE };

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
