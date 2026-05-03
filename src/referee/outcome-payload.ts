import { assertLocalRefereeReceipt, type LocalRefereeReceipt } from "./receipt.js";

export type LocalRefereeClientKind = string;

export interface LocalRefereeOutcomeSummaryPayload {
  schemaVersion: 1;
  finalState: LocalRefereeReceipt["verdict"];
  controlDecisionCounts: {
    passed: number;
    failed: number;
  };
  completionExceptionCount: number;
  validationStatus: string;
  elapsedTimeBucket: string;
  manualReviewRoundTripEstimate: string;
  executionMode: "local_only" | "hosted";
  client: {
    kind: LocalRefereeClientKind;
    version: string;
  };
}

const PROHIBITED_KEYS = new Set([
  "prompt",
  "prompts",
  "source_code",
  "code",
  "diff",
  "patch",
  "file",
  "files",
  "file_path",
  "path",
  "repo",
  "repository",
  "branch",
  "terminal",
  "stdout",
  "stderr",
  "output",
  "log",
  "logs",
  "issue_body",
  "pr_body",
  "ticket_body",
  "url",
  "message",
  "content",
  "contents",
  "hash",
  "secret",
  "secrets",
  "token",
  "tokens",
  "access_token",
  "access_tokens",
  "refresh_token",
  "refresh_tokens",
  "api_key",
  "api_keys",
  "password",
  "cookie",
  "environment",
  "environment_variable",
  "environment_variables",
  "env_var",
  "env_vars",
]);
const PROHIBITED_COMPACT_KEYS = new Set(
  Array.from(PROHIBITED_KEYS, (key) => key.replace(/_/g, "")),
);
const PROHIBITED_KEY_TOKENS = new Set([
  "body",
  "code",
  "content",
  "contents",
  "cookie",
  "description",
  "diff",
  "file",
  "files",
  "hash",
  "log",
  "logs",
  "message",
  "output",
  "password",
  "patch",
  "path",
  "prompt",
  "prompts",
  "repo",
  "repository",
  "secret",
  "secrets",
  "stderr",
  "stdout",
  "terminal",
  "text",
  "token",
  "tokens",
  "url",
]);
const PROHIBITED_VALUE_PATTERNS = [
  /(?:^|\s)(?:[./~]|[A-Za-z]:\\)[^\s]+/,
  /^[^\s]+\/[^\s]+$/,
  /\b[A-Za-z][A-Za-z0-9+.-]*:\/\//i,
  /\bgit@/i,
  /\b(?:stdout|stderr|stacktrace|traceback|diff --git)\b/i,
  /BEGIN [A-Z ]+PRIVATE KEY/i,
  /@@\s+-\d+/,
  /console\.log/i,
  /\bdefmodule\s+\w+/i,
  /\bfunction\s+\w+/i,
  /\bclass\s+\w+/i,
  /\b(?:secret|api[_-]?key|token|password|cookie)\b/i,
  /\bhd_[A-Za-z0-9_.:-]{6,}\b/i,
];

const PAYLOAD_KEYS = new Set([
  "schemaVersion",
  "finalState",
  "controlDecisionCounts",
  "completionExceptionCount",
  "validationStatus",
  "elapsedTimeBucket",
  "manualReviewRoundTripEstimate",
  "executionMode",
  "client",
]);
const COUNT_KEYS = new Set(["passed", "failed"]);
const CLIENT_KEYS = new Set(["kind", "version"]);
const FINAL_STATES = new Set(["passed", "needs_review"]);
const VALIDATION_STATUSES = new Set(["passed", "failed", "unknown"]);
const ELAPSED_TIME_BUCKETS = new Set([
  "under_15",
  "15_to_30",
  "30_to_60",
  "60_to_120",
  "over_120",
  "unknown",
]);
const MANUAL_REVIEW_ESTIMATES = new Set(["none", "one", "multiple"]);
const EXECUTION_MODES = new Set(["local_only", "hosted"]);
const SAFE_TOKEN_PATTERN = /^[A-Za-z0-9_.:-]{1,256}$/;

function countChecks(receipt: LocalRefereeReceipt, status: "passed" | "failed"): number {
  return receipt.checks.filter((check) => check.status === status).length;
}

function manualReviewRoundTripEstimate(failedCount: number): string {
  if (failedCount >= 3) return "multiple";
  if (failedCount >= 1) return "one";
  return "none";
}

export function buildLocalRefereeOutcomeSummaryPayload(input: {
  receipt: LocalRefereeReceipt;
  client: LocalRefereeOutcomeSummaryPayload["client"];
  executionMode?: "local_only" | "hosted";
}): LocalRefereeOutcomeSummaryPayload {
  assertLocalRefereeReceipt(input.receipt);

  const passedCount = countChecks(input.receipt, "passed");
  const failedCount = countChecks(input.receipt, "failed");
  const payload: LocalRefereeOutcomeSummaryPayload = {
    schemaVersion: 1,
    finalState: input.receipt.verdict,
    controlDecisionCounts: {
      passed: passedCount,
      failed: failedCount,
    },
    completionExceptionCount: failedCount,
    validationStatus: input.receipt.evidence.validationStatus,
    elapsedTimeBucket: input.receipt.evidence.elapsedMinutesBucket,
    manualReviewRoundTripEstimate: manualReviewRoundTripEstimate(failedCount),
    executionMode: input.executionMode ?? "local_only",
    client: input.client,
  };

  assertLocalRefereeOutcomeSummaryPayload(payload);
  return payload;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function assertExactKeys(
  record: Record<string, unknown>,
  allowed: Set<string>,
  path: string,
): void {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key))
      throw new Error(`Outcome summary contains unsupported field '${key}' at ${path}.`);
  }
}

function assertNonNegativeInteger(value: unknown, path: string): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Outcome summary requires a non-negative integer at ${path}.`);
  }
}

function assertEnum(value: unknown, allowed: Set<string>, path: string): asserts value is string {
  if (typeof value !== "string" || !allowed.has(value)) {
    throw new Error(`Outcome summary contains unsupported value at ${path}.`);
  }
}

function assertSafeToken(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string" || !isSafeToken(value)) {
    throw new Error(`Outcome summary requires a safe token at ${path}.`);
  }
}

function isSafeToken(value: string): boolean {
  return (
    SAFE_TOKEN_PATTERN.test(value) &&
    !value.includes("://") &&
    !value.toLowerCase().includes(".git")
  );
}

function normalizePrivacyKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function containsProhibitedPrivacyToken(value: string): boolean {
  const normalizedValue = normalizePrivacyKey(value);
  const compactValue = normalizedValue.replace(/_/g, "");

  return (
    PROHIBITED_KEYS.has(normalizedValue) ||
    PROHIBITED_COMPACT_KEYS.has(compactValue) ||
    normalizedValue.split("_").some((token) => PROHIBITED_KEY_TOKENS.has(token))
  );
}

export function assertLocalRefereeOutcomeSummaryPayload(
  value: unknown,
): asserts value is LocalRefereeOutcomeSummaryPayload {
  assertLocalRefereeOutcomeSummaryPayloadIsSafe(value);

  const payload = asRecord(value);
  if (!payload) throw new Error("Outcome summary payload must be an object.");
  assertExactKeys(payload, PAYLOAD_KEYS, "payload");

  if (payload.schemaVersion !== 1) throw new Error("Outcome summary schemaVersion must be 1.");
  assertEnum(payload.finalState, FINAL_STATES, "payload.finalState");
  assertNonNegativeInteger(payload.completionExceptionCount, "payload.completionExceptionCount");
  assertEnum(payload.validationStatus, VALIDATION_STATUSES, "payload.validationStatus");
  assertEnum(payload.elapsedTimeBucket, ELAPSED_TIME_BUCKETS, "payload.elapsedTimeBucket");
  assertEnum(
    payload.manualReviewRoundTripEstimate,
    MANUAL_REVIEW_ESTIMATES,
    "payload.manualReviewRoundTripEstimate",
  );
  assertEnum(payload.executionMode, EXECUTION_MODES, "payload.executionMode");

  const counts = asRecord(payload.controlDecisionCounts);
  if (!counts) throw new Error("Outcome summary controlDecisionCounts must be an object.");
  assertExactKeys(counts, COUNT_KEYS, "payload.controlDecisionCounts");
  assertNonNegativeInteger(counts.passed, "payload.controlDecisionCounts.passed");
  assertNonNegativeInteger(counts.failed, "payload.controlDecisionCounts.failed");
  if (counts.passed + counts.failed === 0) {
    throw new Error("Outcome summary requires at least one control decision.");
  }

  if (payload.completionExceptionCount !== counts.failed) {
    throw new Error("Outcome summary completionExceptionCount must match failed decisions.");
  }
  if (payload.finalState === "passed" && counts.failed > 0) {
    throw new Error("Outcome summary finalState does not match failed decisions.");
  }
  if (payload.finalState === "needs_review" && counts.failed === 0) {
    throw new Error("Outcome summary finalState does not match passed decisions.");
  }

  const expectedReviewEstimate =
    counts.failed >= 3 ? "multiple" : counts.failed >= 1 ? "one" : "none";
  if (payload.manualReviewRoundTripEstimate !== expectedReviewEstimate) {
    throw new Error(
      "Outcome summary manualReviewRoundTripEstimate does not match failed decisions.",
    );
  }

  const client = asRecord(payload.client);
  if (!client) throw new Error("Outcome summary client must be an object.");
  assertExactKeys(client, CLIENT_KEYS, "payload.client");
  assertSafeToken(client.kind, "payload.client.kind");
  assertSafeToken(client.version, "payload.client.version");
}

export function assertLocalRefereeOutcomeSummaryPayloadIsSafe(
  value: unknown,
  path = "payload",
): void {
  if (value === null || value === undefined) return;

  if (typeof value === "string") {
    if (
      !isSafeToken(value) ||
      containsProhibitedPrivacyToken(value) ||
      PROHIBITED_VALUE_PATTERNS.some((pattern) => pattern.test(value))
    ) {
      throw new Error(`Outcome summary contains prohibited content at ${path}.`);
    }
    return;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Outcome summary contains unsupported number at ${path}.`);
    }
    return;
  }

  if (typeof value === "boolean") return;

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertLocalRefereeOutcomeSummaryPayloadIsSafe(item, `${path}[${index}]`),
    );
    return;
  }

  if (typeof value === "object") {
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      if (containsProhibitedPrivacyToken(key)) {
        throw new Error(`Outcome summary contains prohibited field '${key}' at ${path}.`);
      }
      assertLocalRefereeOutcomeSummaryPayloadIsSafe(nestedValue, `${path}.${key}`);
    }
    return;
  }

  throw new Error(`Outcome summary contains unsupported value at ${path}.`);
}
