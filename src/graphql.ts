import { ApiError, AuthError, NetworkError } from "./errors.js";
import type { ActorContext, GraphQLResponse, Mode, VerdictDecision, DayName } from "./types.js";

type NormalizeEnumString<T extends string> = Uppercase<T> extends T ? Lowercase<T> : T;
export type Normalized<T> = T extends string
  ? NormalizeEnumString<T>
  : T extends Array<infer U>
    ? Array<Normalized<U>>
    : T extends object
      ? { [K in keyof T]: Normalized<T[K]> }
      : T;

const DEFAULT_BASE_URL = "https://headsdown.app";
const DEFAULT_TIMEOUT = 30_000;

export interface GraphQLClientOptions {
  apiKey: string;
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  timeout?: number;
  retries?: number;
  retryDelayMs?: number;
  actorContext?: ActorContext;
  hooks?: {
    onRequest?: (event: {
      url: string;
      attempt: number;
      query: string;
      variables?: Record<string, unknown>;
    }) => void;
    onResponse?: (event: {
      url: string;
      attempt: number;
      status: number;
      ok: boolean;
      requestId?: string;
    }) => void;
    onRetry?: (event: { url: string; attempt: number; delayMs: number; reason: string }) => void;
  };
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
  private readonly retries: number;
  private readonly retryDelayMs: number;
  private readonly actorContext?: ActorContext;
  private readonly hooks: NonNullable<GraphQLClientOptions["hooks"]>;

  constructor(options: GraphQLClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.fetchFn = options.fetch ?? globalThis.fetch;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.retries = options.retries ?? 2;
    this.retryDelayMs = options.retryDelayMs ?? 250;
    this.actorContext = options.actorContext;
    this.hooks = options.hooks ?? {};
  }

  /** Execute a GraphQL query or mutation. Returns the `data` payload with enums lowercased. */
  async request<
    T,
    TVariables extends Record<string, unknown> | undefined = Record<string, unknown>,
  >(query: string, variables?: TVariables): Promise<Normalized<T>> {
    const url = `${this.baseUrl}/graphql`;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      this.hooks.onRequest?.({ url, attempt, query, variables });

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);

      let response: Response;
      try {
        response = await this.fetchFn(url, {
          method: "POST",
          headers: buildHeaders(this.apiKey, this.actorContext),
          body: JSON.stringify({ query, variables }),
          signal: controller.signal,
        });
      } catch (error) {
        clearTimeout(timer);
        const networkError =
          error instanceof DOMException && error.name === "AbortError"
            ? new NetworkError(`Request timed out after ${this.timeout}ms`)
            : new NetworkError(
                `Failed to connect to HeadsDown API at ${this.baseUrl}: ${(error as Error)?.message ?? String(error)}`,
                error instanceof Error ? error : undefined,
              );

        if (attempt < this.retries) {
          const delayMs = this.retryDelayMs * Math.pow(2, attempt);
          this.hooks.onRetry?.({ url, attempt, delayMs, reason: networkError.message });
          await sleep(delayMs);
          continue;
        }

        throw networkError;
      } finally {
        clearTimeout(timer);
      }

      const requestId = response.headers?.get?.("x-request-id") ?? undefined;
      this.hooks.onResponse?.({
        url,
        attempt,
        status: response.status,
        ok: response.ok,
        requestId,
      });

      if (response.status === 401) {
        throw new AuthError(
          "API key is invalid or expired. Authenticate again with DeviceFlow or provide a valid key.",
        );
      }

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        const message = `HeadsDown API returned ${response.status}: ${body}`;

        if (attempt < this.retries && isRetryableStatus(response.status)) {
          const delayMs = retryDelayFromResponse(
            response,
            this.retryDelayMs * Math.pow(2, attempt),
          );
          this.hooks.onRetry?.({ url, attempt, delayMs, reason: message });
          await sleep(delayMs);
          continue;
        }

        throw new ApiError(message, { status: response.status, requestId });
      }

      let json: GraphQLResponse<T>;
      try {
        json = (await response.json()) as GraphQLResponse<T>;
      } catch {
        throw new ApiError("HeadsDown API returned invalid JSON.", { requestId });
      }

      if (json.errors?.length) {
        const messages = json.errors.map((e) => e.message).join("; ");
        throw new ApiError(`GraphQL error: ${messages}`, {
          graphqlErrors: json.errors,
          requestId,
        });
      }

      if (!json.data) {
        throw new ApiError("HeadsDown API returned an empty response.", { requestId });
      }

      return normalizeEnums(json.data) as Normalized<T>;
    }

    throw new ApiError("Unexpected request loop termination.");
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 502 || status === 503 || status === 504;
}

function retryDelayFromResponse(response: Response, fallbackMs: number): number {
  const retryAfter = response.headers?.get?.("retry-after");
  if (!retryAfter) return fallbackMs;

  const asSeconds = Number(retryAfter);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return Math.round(asSeconds * 1000);
  }

  const retryAt = Date.parse(retryAfter);
  if (!Number.isNaN(retryAt)) {
    return Math.max(0, retryAt - Date.now());
  }

  return fallbackMs;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildHeaders(apiKey: string, actorContext?: ActorContext): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  if (actorContext) {
    headers["x-headsdown-actor-context"] = JSON.stringify(actorContext);
  }

  return headers;
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
  "originalVerdict",
  "overrideVerdict",
  "day",
  "nextWorkday",
  "outcome",
  "confidenceLevel",
  "policyStatus",
  "visibilityLevel",
  "alertsPolicy",
  "scope",
  "permissions",
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
    } else if (ENUM_FIELDS.has(key) && Array.isArray(value)) {
      result[key] = value.map((item) => (typeof item === "string" ? item.toLowerCase() : item));
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
