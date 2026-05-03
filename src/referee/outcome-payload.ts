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

export const PROHIBITED_KEY_PATTERN =
  /(?:prompt|source|code|diff|file|path|repo|repository|branch|terminal|output|log|issue|pr|url|message|content|hash)/i;
export const PROHIBITED_VALUE_PATTERN =
  /(?:https?:\/\/|git@|\b[A-Za-z]:\\|\/(?:Users|home|private|tmp|var|src|lib|test)\/|\.git\b|BEGIN [A-Z ]+PRIVATE KEY|diff --git|@@\s+-\d+|console\.log|defmodule\s+|function\s+\w+|class\s+\w+)/i;

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

function manualReviewRoundTripEstimate(receipt: LocalRefereeReceipt): string {
  const failed = countChecks(receipt, "failed");
  if (failed >= 3) return "multiple";
  if (failed >= 1) return "one";
  return "none";
}

export function buildLocalRefereeOutcomeSummaryPayload(input: {
  receipt: LocalRefereeReceipt;
  client: LocalRefereeOutcomeSummaryPayload["client"];
  executionMode?: "local_only" | "hosted";
}): LocalRefereeOutcomeSummaryPayload {
  assertLocalRefereeReceipt(input.receipt);

  const payload: LocalRefereeOutcomeSummaryPayload = {
    schemaVersion: 1,
    finalState: input.receipt.verdict,
    controlDecisionCounts: {
      passed: countChecks(input.receipt, "passed"),
      failed: countChecks(input.receipt, "failed"),
    },
    completionExceptionCount: countChecks(input.receipt, "failed"),
    validationStatus: input.receipt.evidence.validationStatus,
    elapsedTimeBucket: input.receipt.evidence.elapsedMinutesBucket,
    manualReviewRoundTripEstimate: manualReviewRoundTripEstimate(input.receipt),
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
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`Outcome summary requires a non-negative integer at ${path}.`);
  }
}

function assertEnum(value: unknown, allowed: Set<string>, path: string): asserts value is string {
  if (typeof value !== "string" || !allowed.has(value)) {
    throw new Error(`Outcome summary contains unsupported value at ${path}.`);
  }
}

function assertSafeToken(value: unknown, path: string): asserts value is string {
  if (
    typeof value !== "string" ||
    !SAFE_TOKEN_PATTERN.test(value) ||
    value.includes("://") ||
    value.includes(".git")
  ) {
    throw new Error(`Outcome summary requires a safe token at ${path}.`);
  }
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
    if (PROHIBITED_VALUE_PATTERN.test(value)) {
      throw new Error(`Outcome summary contains prohibited content at ${path}.`);
    }
    return;
  }

  if (typeof value === "number" || typeof value === "boolean") return;

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertLocalRefereeOutcomeSummaryPayloadIsSafe(item, `${path}[${index}]`),
    );
    return;
  }

  if (typeof value === "object") {
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      if (PROHIBITED_KEY_PATTERN.test(key)) {
        throw new Error(`Outcome summary contains prohibited field '${key}' at ${path}.`);
      }
      assertLocalRefereeOutcomeSummaryPayloadIsSafe(nestedValue, `${path}.${key}`);
    }
    return;
  }

  throw new Error(`Outcome summary contains unsupported value at ${path}.`);
}
