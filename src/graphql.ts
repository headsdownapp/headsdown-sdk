import { ApiError, AuthError, NetworkError } from "./errors.js";
import type {
  GraphQLResponse,
  Mode,
  VerdictDecision,
  DayName,
} from "./types.js";

const DEFAULT_BASE_URL = "https://headsdown.app";
const DEFAULT_TIMEOUT = 30_000;

export interface GraphQLClientOptions {
  apiKey: string;
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  timeout?: number;
}

/**
 * Low-level GraphQL client. Handles HTTP, auth headers, error mapping,
 * and enum case conversion. Used internally by HeadsDownClient.
 */
export class GraphQLClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof globalThis.fetch;
  private readonly timeout: number;

  constructor(options: GraphQLClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.fetchFn = options.fetch ?? globalThis.fetch;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
  }

  /** Execute a GraphQL query or mutation. Returns the `data` payload with enums lowercased. */
  async request<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    let response: Response;
    try {
      response = await this.fetchFn(`${this.baseUrl}/graphql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new NetworkError(`Request timed out after ${this.timeout}ms`);
      }
      const cause = error instanceof Error ? error : undefined;
      throw new NetworkError(
        `Failed to connect to HeadsDown API at ${this.baseUrl}: ${cause?.message ?? String(error)}`,
        cause,
      );
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 401) {
      throw new AuthError(
        "API key is invalid or expired. Authenticate again with DeviceFlow or provide a valid key.",
      );
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new ApiError(`HeadsDown API returned ${response.status}: ${body}`, {
        status: response.status,
      });
    }

    let json: GraphQLResponse<T>;
    try {
      json = (await response.json()) as GraphQLResponse<T>;
    } catch {
      throw new ApiError("HeadsDown API returned invalid JSON.");
    }

    if (json.errors?.length) {
      const messages = json.errors.map((e) => e.message).join("; ");
      throw new ApiError(`GraphQL error: ${messages}`, { graphqlErrors: json.errors });
    }

    if (!json.data) {
      throw new ApiError("HeadsDown API returned an empty response.");
    }

    return normalizeEnums(json.data);
  }
}

// === Enum Normalization ===
//
// Absinthe returns enum values in SCREAMING_CASE (e.g., "ONLINE", "APPROVED").
// The SDK normalizes these to lowercase for a clean TypeScript experience.
// Input enums are converted to SCREAMING_CASE before sending.

const ENUM_FIELDS = new Set([
  "mode",
  "decision",
  "verdict",
  "day",
  "nextWorkday",
  "outcome",
  "confidenceLevel",
  "policyStatus",
  "visibilityLevel",
  "alertsPolicy",
]);

/** Convert SCREAMING_CASE enum values to lowercase in a response object. */
function normalizeEnums<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) return data.map(normalizeEnums) as T;
  if (typeof data !== "object") return data;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (ENUM_FIELDS.has(key) && typeof value === "string") {
      result[key] = value.toLowerCase();
    } else if (typeof value === "object" && value !== null) {
      result[key] = normalizeEnums(value);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

/** Convert lowercase enum values to SCREAMING_CASE for GraphQL input. */
export function toGraphQLEnum(value: string): string {
  return value.toUpperCase();
}

// Re-export for type narrowing in the client
export type { Mode, VerdictDecision, DayName };
