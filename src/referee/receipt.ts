import { createHash } from "node:crypto";
import type { LocalRefereeContract } from "./contract.js";
import type { LocalRefereeEvaluation, LocalRefereeCheckStatus } from "./evaluate.js";
import type { LocalRefereeEvidence } from "./evidence.js";
import { LOCAL_REFEREE_CHECK_LABELS, labelLocalRefereeCheckType } from "./labels.js";

export interface LocalRefereeReceipt {
  schemaVersion: 1;
  generatedAt: string;
  contractRef: string;
  verdict: LocalRefereeEvaluation["verdict"];
  evidence: {
    filesTouchedBucket: string;
    toolCallsBucket: string;
    validationStatus: string;
    testsRun: boolean;
    networkRequired: boolean;
    gitCommitPresent?: boolean;
    elapsedMinutesBucket: string;
    manualReviewRoundTripsAvoided?: number;
    outcome: string;
  };
  checks: LocalRefereeEvaluation["checks"];
}

export function buildLocalRefereeContractRef(contract: LocalRefereeContract): string {
  const digest = createHash("sha256").update(JSON.stringify(contract)).digest("hex").slice(0, 16);
  return `contract_${digest}`;
}

const RECEIPT_KEYS = new Set([
  "schemaVersion",
  "generatedAt",
  "contractRef",
  "verdict",
  "evidence",
  "checks",
]);
const RECEIPT_EVIDENCE_KEYS = new Set([
  "filesTouchedBucket",
  "toolCallsBucket",
  "validationStatus",
  "testsRun",
  "networkRequired",
  "gitCommitPresent",
  "elapsedMinutesBucket",
  "manualReviewRoundTripsAvoided",
  "outcome",
]);
const RECEIPT_CHECK_KEYS = new Set(["id", "type", "status", "reasonCode"]);
const RECEIPT_VERDICTS = new Set(["passed", "needs_review"]);
const RECEIPT_STATUSES = new Set(["passed", "failed"]);
const RECEIPT_VALIDATION_STATUSES = new Set(["passed", "failed", "unknown"]);
const RECEIPT_OUTCOMES = new Set(["completed", "partially_completed", "blocked", "unknown"]);
const RECEIPT_COUNT_BUCKETS = new Set(["0", "1_to_2", "3_to_5", "6_to_10", "over_10"]);
const RECEIPT_TIME_BUCKETS = new Set([
  "under_15",
  "15_to_30",
  "30_to_60",
  "60_to_120",
  "over_120",
  "unknown",
]);
const RECEIPT_SAFE_TOKEN_PATTERN = /^[A-Za-z0-9_.:-]{1,256}$/;

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
      throw new Error(`Local Referee receipt contains unsupported field '${key}' at ${path}.`);
  }
}

function assertSafeToken(value: unknown, path: string): asserts value is string {
  if (
    typeof value !== "string" ||
    !RECEIPT_SAFE_TOKEN_PATTERN.test(value) ||
    value.includes("://") ||
    value.includes(".git")
  ) {
    throw new Error(`Local Referee receipt requires a safe token at ${path}.`);
  }
}

function assertEnum(value: unknown, allowed: Set<string>, path: string): asserts value is string {
  if (typeof value !== "string" || !allowed.has(value)) {
    throw new Error(`Local Referee receipt contains unsupported value at ${path}.`);
  }
}

function assertBoolean(value: unknown, path: string): asserts value is boolean {
  if (typeof value !== "boolean")
    throw new Error(`Local Referee receipt requires a boolean at ${path}.`);
}

function assertOptionalNonNegativeInteger(value: unknown, path: string): void {
  if (value !== undefined && (typeof value !== "number" || !Number.isInteger(value) || value < 0)) {
    throw new Error(`Local Referee receipt requires a non-negative integer at ${path}.`);
  }
}

export function assertLocalRefereeReceipt(value: unknown): asserts value is LocalRefereeReceipt {
  const receipt = asRecord(value);
  if (!receipt) throw new Error("Local Referee receipt must be an object.");
  assertExactKeys(receipt, RECEIPT_KEYS, "receipt");
  if (receipt.schemaVersion !== 1)
    throw new Error("Local Referee receipt schemaVersion must be 1.");
  assertSafeToken(receipt.generatedAt, "receipt.generatedAt");
  assertSafeToken(receipt.contractRef, "receipt.contractRef");
  assertEnum(receipt.verdict, RECEIPT_VERDICTS, "receipt.verdict");

  const evidence = asRecord(receipt.evidence);
  if (!evidence) throw new Error("Local Referee receipt evidence must be an object.");
  assertExactKeys(evidence, RECEIPT_EVIDENCE_KEYS, "receipt.evidence");
  assertEnum(
    evidence.filesTouchedBucket,
    RECEIPT_COUNT_BUCKETS,
    "receipt.evidence.filesTouchedBucket",
  );
  assertEnum(evidence.toolCallsBucket, RECEIPT_COUNT_BUCKETS, "receipt.evidence.toolCallsBucket");
  assertEnum(
    evidence.validationStatus,
    RECEIPT_VALIDATION_STATUSES,
    "receipt.evidence.validationStatus",
  );
  assertBoolean(evidence.testsRun, "receipt.evidence.testsRun");
  assertBoolean(evidence.networkRequired, "receipt.evidence.networkRequired");
  if (evidence.gitCommitPresent !== undefined)
    assertBoolean(evidence.gitCommitPresent, "receipt.evidence.gitCommitPresent");
  assertEnum(
    evidence.elapsedMinutesBucket,
    RECEIPT_TIME_BUCKETS,
    "receipt.evidence.elapsedMinutesBucket",
  );
  assertOptionalNonNegativeInteger(
    evidence.manualReviewRoundTripsAvoided,
    "receipt.evidence.manualReviewRoundTripsAvoided",
  );
  assertEnum(evidence.outcome, RECEIPT_OUTCOMES, "receipt.evidence.outcome");

  if (!Array.isArray(receipt.checks))
    throw new Error("Local Referee receipt checks must be an array.");
  for (const [index, value] of receipt.checks.entries()) {
    const check = asRecord(value);
    if (!check) throw new Error(`Local Referee receipt check ${index + 1} must be an object.`);
    assertExactKeys(check, RECEIPT_CHECK_KEYS, `receipt.checks[${index}]`);
    assertSafeToken(check.id, `receipt.checks[${index}].id`);
    assertEnum(
      check.type,
      new Set(Object.keys(LOCAL_REFEREE_CHECK_LABELS)),
      `receipt.checks[${index}].type`,
    );
    assertEnum(check.status, RECEIPT_STATUSES, `receipt.checks[${index}].status`);
    assertSafeToken(check.reasonCode, `receipt.checks[${index}].reasonCode`);
  }
}

export function buildLocalRefereeReceipt(input: {
  contract: LocalRefereeContract;
  evidence: LocalRefereeEvidence;
  evaluation: LocalRefereeEvaluation;
  now?: Date;
}): LocalRefereeReceipt {
  const hasGitCommitCheck = input.contract.checks.some(
    (check) => check.type === "git_commit_present",
  );
  const manualReviewRoundTripsAvoided = input.evidence.manualReviewRoundTripsAvoided;

  return {
    schemaVersion: 1,
    generatedAt: (input.now ?? new Date()).toISOString(),
    contractRef: buildLocalRefereeContractRef(input.contract),
    verdict: input.evaluation.verdict,
    evidence: {
      filesTouchedBucket: input.evidence.filesTouchedBucket,
      toolCallsBucket: input.evidence.toolCallsBucket,
      validationStatus: input.evidence.validationStatus,
      testsRun: input.evidence.testsRun,
      networkRequired: input.evidence.networkRequired,
      ...(hasGitCommitCheck ? { gitCommitPresent: input.evidence.gitCommitPresent } : {}),
      elapsedMinutesBucket: input.evidence.elapsedMinutesBucket,
      ...(manualReviewRoundTripsAvoided === null ? {} : { manualReviewRoundTripsAvoided }),
      outcome: input.evidence.outcome,
    },
    checks: input.evaluation.checks,
  };
}

export function renderLocalRefereeReceipt(receipt: LocalRefereeReceipt): string {
  assertLocalRefereeReceipt(receipt);
  const checkLines = receipt.checks.map(
    (check) => `- ${check.id}: ${check.status} (${check.type}, ${check.reasonCode})`,
  );
  return [
    "HEADSDOWN LOCAL REFEREE RECEIPT",
    `Verdict: ${receipt.verdict}`,
    `Contract: ${receipt.contractRef}`,
    `Generated: ${receipt.generatedAt}`,
    "Evidence:",
    `- Files touched: ${receipt.evidence.filesTouchedBucket}`,
    `- Tool calls: ${receipt.evidence.toolCallsBucket}`,
    `- Validation: ${receipt.evidence.validationStatus}`,
    `- Tests run: ${receipt.evidence.testsRun ? "yes" : "no"}`,
    `- Network required: ${receipt.evidence.networkRequired ? "yes" : "no"}`,
    `- Elapsed: ${receipt.evidence.elapsedMinutesBucket}`,
    `- Outcome: ${receipt.evidence.outcome}`,
    "Checks:",
    ...checkLines,
    "",
    "Local-only: this receipt contains derived review fields only. It does not include prompts, source code, file paths, repository names, branch names, terminal output, logs, or message contents.",
  ].join("\n");
}

interface MarkdownCheckLine {
  label: string;
  status: LocalRefereeCheckStatus;
}

function markdownCheckLines(receipt: LocalRefereeReceipt): MarkdownCheckLine[] {
  const lines: MarkdownCheckLine[] = [];

  for (const check of receipt.checks) {
    const label = labelLocalRefereeCheckType(check.type);
    const existing = lines.find((line) => line.label === label);
    if (!existing) {
      lines.push({ label, status: check.status });
      continue;
    }
    if (check.status === "failed") existing.status = "failed";
  }

  return lines;
}

export function renderLocalRefereeReceiptMarkdown(receipt: LocalRefereeReceipt): string {
  assertLocalRefereeReceipt(receipt);
  const lines = ["### HeadsDown Referee", ""];

  for (const check of markdownCheckLines(receipt)) {
    lines.push(`${check.status === "passed" ? "✓" : "↩"} ${check.label}`);
  }

  if (receipt.evidence.manualReviewRoundTripsAvoided !== undefined) {
    lines.push(
      `↩ Manual review round trips avoided: ${receipt.evidence.manualReviewRoundTripsAvoided}`,
    );
  }

  lines.push("🔒 Verified locally");
  return lines.join("\n");
}
