export type LocalRefereeValidationStatus = "passed" | "failed" | "unknown";
export type LocalRefereeOutcome = "completed" | "partially_completed" | "blocked" | "unknown";

export interface LocalRefereeRawEvidence {
  filesTouched?: unknown;
  toolCalls?: unknown;
  validationStatus?: unknown;
  testsRun?: unknown;
  networkRequired?: unknown;
  gitCommitPresent?: unknown;
  elapsedMinutes?: unknown;
  manualReviewRoundTripsAvoided?: unknown;
  outcome?: unknown;
}

export interface LocalRefereeEvidence {
  filesTouched: number;
  filesTouchedKnown: boolean;
  filesTouchedBucket: string;
  toolCalls: number;
  toolCallsKnown: boolean;
  toolCallsBucket: string;
  validationStatus: LocalRefereeValidationStatus;
  testsRun: boolean;
  networkRequired: boolean;
  gitCommitPresent: boolean;
  elapsedMinutes: number | null;
  elapsedMinutesBucket: string;
  manualReviewRoundTripsAvoided: number | null;
  outcome: LocalRefereeOutcome;
}

function normalizeOptionalNonNegativeInteger(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.max(0, Math.floor(parsed));
  }
  return null;
}

function normalizeCountEvidence(value: unknown): { count: number; known: boolean } {
  const count = normalizeOptionalNonNegativeInteger(value);
  return count === null ? { count: 0, known: false } : { count, known: true };
}

function normalizeOptionalMinutes(value: unknown): number | null {
  return normalizeOptionalNonNegativeInteger(value);
}

function normalizeBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "y", "1", "passed", "run", "present", "committed"].includes(normalized))
      return true;
    if (["false", "no", "n", "0", "failed", "none", "missing", "absent"].includes(normalized))
      return false;
  }
  return fallback;
}

function normalizeValidationStatus(value: unknown): LocalRefereeValidationStatus {
  if (typeof value !== "string") return "unknown";
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (["passed", "pass", "success", "succeeded", "ok", "green"].includes(normalized))
    return "passed";
  if (["failed", "fail", "failure", "error", "red"].includes(normalized)) return "failed";
  return "unknown";
}

function normalizeOutcome(value: unknown): LocalRefereeOutcome {
  if (typeof value !== "string") return "unknown";
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (["completed", "complete", "succeeded", "success"].includes(normalized)) return "completed";
  if (["partially_completed", "partial", "paused", "needs_review"].includes(normalized))
    return "partially_completed";
  if (["blocked", "deferred", "stopped"].includes(normalized)) return "blocked";
  return "unknown";
}

export function bucketCount(count: number): string {
  if (count <= 0) return "0";
  if (count <= 2) return "1_to_2";
  if (count <= 5) return "3_to_5";
  if (count <= 10) return "6_to_10";
  return "over_10";
}

export function bucketMinutes(minutes: number | null): string {
  if (minutes === null) return "unknown";
  if (minutes < 15) return "under_15";
  if (minutes <= 30) return "15_to_30";
  if (minutes <= 60) return "30_to_60";
  if (minutes <= 120) return "60_to_120";
  return "over_120";
}

export function normalizeLocalRefereeEvidence(
  raw: LocalRefereeRawEvidence = {},
): LocalRefereeEvidence {
  const filesTouched = normalizeCountEvidence(raw.filesTouched);
  const toolCalls = normalizeCountEvidence(raw.toolCalls);
  const elapsedMinutes = normalizeOptionalMinutes(raw.elapsedMinutes);

  return {
    filesTouched: filesTouched.count,
    filesTouchedKnown: filesTouched.known,
    filesTouchedBucket: bucketCount(filesTouched.count),
    toolCalls: toolCalls.count,
    toolCallsKnown: toolCalls.known,
    toolCallsBucket: bucketCount(toolCalls.count),
    validationStatus: normalizeValidationStatus(raw.validationStatus),
    testsRun: normalizeBoolean(raw.testsRun),
    networkRequired: normalizeBoolean(raw.networkRequired),
    gitCommitPresent: normalizeBoolean(raw.gitCommitPresent),
    elapsedMinutes,
    elapsedMinutesBucket: bucketMinutes(elapsedMinutes),
    manualReviewRoundTripsAvoided: normalizeOptionalNonNegativeInteger(
      raw.manualReviewRoundTripsAvoided,
    ),
    outcome: normalizeOutcome(raw.outcome),
  };
}
