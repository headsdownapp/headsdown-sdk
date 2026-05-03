import { ApiError, AuthError, NetworkError } from "../errors.js";
import type { ClientOptions } from "../types.js";
import {
  assertLocalRefereeOutcomeSummaryPayload,
  type LocalRefereeOutcomeSummaryPayload,
} from "./outcome-payload.js";

const DEFAULT_BASE_URL = "https://headsdown.app";
const DEFAULT_TIMEOUT = 30_000;
const OUTCOME_ENDPOINT_PATH = "/v1/referee/outcomes";

export type LocalRefereeOutcomeSource = "local" | "hosted";

export type SubmitLocalRefereeOutcomeSummaryResult =
  | { ok: true; status: number; requestId?: string }
  | { ok: false; reason: "endpoint_unavailable"; status: 404; requestId?: string }
  | { ok: false; reason: "request_failed"; status: number; message: string; requestId?: string };

export interface SubmitLocalRefereeOutcomeSummaryOptions extends Omit<
  ClientOptions,
  "actorContext"
> {
  source: LocalRefereeOutcomeSource;
}

function resolveApiKey(explicit?: string): string | undefined {
  if (explicit) return explicit;
  return process.env.HEADSDOWN_API_KEY || undefined;
}

function buildHeaders(apiKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function retryDelayFromResponse(response: Response, fallbackMs: number): number {
  const retryAfter = response.headers?.get?.("retry-after");
  if (!retryAfter) return fallbackMs;

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;

  const date = Date.parse(retryAfter);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());

  return fallbackMs;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assertOutcomeSource(source: unknown): asserts source is LocalRefereeOutcomeSource {
  if (source !== "local" && source !== "hosted") {
    throw new Error("Local Referee outcome source must be local or hosted.");
  }
}

function requestBody(
  payload: LocalRefereeOutcomeSummaryPayload,
  source: LocalRefereeOutcomeSource,
): string {
  return JSON.stringify({ source, payload });
}

export async function submitLocalRefereeOutcomeSummary(
  payload: LocalRefereeOutcomeSummaryPayload,
  options: SubmitLocalRefereeOutcomeSummaryOptions,
): Promise<SubmitLocalRefereeOutcomeSummaryResult> {
  assertLocalRefereeOutcomeSummaryPayload(payload);
  assertOutcomeSource(options.source);

  const apiKey = resolveApiKey(options.apiKey);
  if (!apiKey) {
    throw new AuthError(
      "No API key provided. Pass { apiKey } explicitly or set HEADSDOWN_API_KEY before submitting a Local Referee outcome summary.",
    );
  }

  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const url = `${baseUrl}${OUTCOME_ENDPOINT_PATH}`;
  const fetchFn = options.fetch ?? globalThis.fetch;
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const retries = options.retry?.retries ?? 2;
  const retryDelayMs = options.retry?.retryDelayMs ?? 250;
  const body = requestBody(payload, options.source);

  for (let attempt = 0; attempt <= retries; attempt++) {
    options.hooks?.onRequest?.({ url, attempt, query: `POST ${OUTCOME_ENDPOINT_PATH}` });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetchFn(url, {
        method: "POST",
        headers: buildHeaders(apiKey),
        body,
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timer);
      const networkError =
        error instanceof DOMException && error.name === "AbortError"
          ? new NetworkError(`Request timed out after ${timeout}ms`)
          : new NetworkError(
              `Failed to connect to HeadsDown API at ${baseUrl}: ${(error as Error)?.message ?? String(error)}`,
              error instanceof Error ? error : undefined,
            );

      if (attempt < retries) {
        const delayMs = retryDelayMs * Math.pow(2, attempt);
        options.hooks?.onRetry?.({ url, attempt, delayMs, reason: networkError.message });
        await sleep(delayMs);
        continue;
      }

      throw networkError;
    } finally {
      clearTimeout(timer);
    }

    const requestId = response.headers?.get?.("x-request-id") ?? undefined;
    options.hooks?.onResponse?.({
      url,
      attempt,
      status: response.status,
      ok: response.ok,
      requestId,
    });

    if (response.status === 404) {
      return { ok: false, reason: "endpoint_unavailable", status: 404, requestId };
    }

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      const message = `HeadsDown API returned ${response.status}: ${bodyText}`;

      if (attempt < retries && isRetryableStatus(response.status)) {
        const delayMs = retryDelayFromResponse(response, retryDelayMs * Math.pow(2, attempt));
        options.hooks?.onRetry?.({ url, attempt, delayMs, reason: message });
        await sleep(delayMs);
        continue;
      }

      if (response.status === 401) {
        throw new AuthError(
          "API key is invalid or expired. Authenticate again with DeviceFlow or provide a valid key.",
        );
      }

      return { ok: false, reason: "request_failed", status: response.status, message, requestId };
    }

    return { ok: true, status: response.status, requestId };
  }

  throw new ApiError("HeadsDown API request loop exited without a response.");
}
