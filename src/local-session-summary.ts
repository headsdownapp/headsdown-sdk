import type { FromSchema } from "json-schema-to-ts";
import { assertPrivacySafe } from "./agent-run-events.js";
import { ValidationError } from "./errors.js";

export const LOCAL_SESSION_SUMMARY_VERSION = 1 as const;
export const LOCAL_SESSION_SUMMARY_OUTCOME_CATEGORIES = [
  "in_progress",
  "completed",
  "tabled",
  "deferred_for_review",
] as const;

export type LocalSessionSummaryOutcomeCategory =
  (typeof LOCAL_SESSION_SUMMARY_OUTCOME_CATEGORIES)[number];

const SAFE_TOKEN_PATTERN = "^[A-Za-z0-9_.:-]{1,256}$";
const SAFE_TOKEN_REGEX = new RegExp(SAFE_TOKEN_PATTERN);
const ISO_DATE_TIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export const LOCAL_SESSION_SUMMARY_JSON_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "LocalSessionSummary",
  type: "object",
  additionalProperties: false,
  required: [
    "version",
    "sessionId",
    "generatedAt",
    "stale",
    "toolCallCount",
    "fileChangeCount",
    "deferredDecisionCount",
    "continuationArtifactAvailable",
    "validationLocallyPassed",
    "approvedProposalRef",
    "outcomeCategory",
  ],
  properties: {
    version: {
      type: "integer",
      const: LOCAL_SESSION_SUMMARY_VERSION,
    },
    sessionId: {
      type: "string",
      maxLength: 256,
      pattern: SAFE_TOKEN_PATTERN,
    },
    generatedAt: {
      type: "string",
      format: "date-time",
    },
    stale: {
      type: "boolean",
    },
    toolCallCount: {
      type: "integer",
      minimum: 0,
    },
    fileChangeCount: {
      type: "integer",
      minimum: 0,
    },
    deferredDecisionCount: {
      type: "integer",
      minimum: 0,
    },
    continuationArtifactAvailable: {
      type: "boolean",
    },
    validationLocallyPassed: {
      type: "boolean",
    },
    approvedProposalRef: {
      type: ["string", "null"],
      maxLength: 256,
      pattern: SAFE_TOKEN_PATTERN,
    },
    outcomeCategory: {
      type: "string",
      enum: LOCAL_SESSION_SUMMARY_OUTCOME_CATEGORIES,
    },
  },
} as const;

const LOCAL_SESSION_SUMMARY_FIELD_NAMES = new Set([
  "version",
  "sessionId",
  "generatedAt",
  "stale",
  "toolCallCount",
  "fileChangeCount",
  "deferredDecisionCount",
  "continuationArtifactAvailable",
  "validationLocallyPassed",
  "approvedProposalRef",
  "outcomeCategory",
]);

/**
 * Privacy-safe summary of integration-local session context.
 * Contains derived facts only and excludes raw transcripts, prompts, file paths, URLs, and logs.
 */
export type LocalSessionSummary = {
  version: typeof LOCAL_SESSION_SUMMARY_VERSION;
  sessionId: string;
  generatedAt: string;
  stale: boolean;
  toolCallCount: number;
  fileChangeCount: number;
  deferredDecisionCount: number;
  continuationArtifactAvailable: boolean;
  validationLocallyPassed: boolean;
  approvedProposalRef: string | null;
  outcomeCategory: LocalSessionSummaryOutcomeCategory;
};

type LocalSessionSummaryFromSchema = FromSchema<typeof LOCAL_SESSION_SUMMARY_JSON_SCHEMA>;
type _SchemaToExportedType = LocalSessionSummaryFromSchema extends LocalSessionSummary
  ? true
  : never;
type _ExportedTypeToSchema = LocalSessionSummary extends LocalSessionSummaryFromSchema
  ? true
  : never;

export function assertLocalSessionSummary(value: unknown): asserts value is LocalSessionSummary {
  assertPrivacySafe(value, "localSessionSummary");

  if (!isRecord(value)) {
    throw new ValidationError("localSessionSummary must be an object.", "localSessionSummary");
  }

  const keys = Object.keys(value);

  for (const field of LOCAL_SESSION_SUMMARY_FIELD_NAMES) {
    if (!(field in value)) {
      throw new ValidationError(`Missing required localSessionSummary field '${field}'.`, field);
    }
  }

  for (const key of keys) {
    if (!LOCAL_SESSION_SUMMARY_FIELD_NAMES.has(key)) {
      throw new ValidationError(`Unexpected localSessionSummary field '${key}'.`, key);
    }
  }

  const summary = value as Record<string, unknown>;

  if (summary.version !== LOCAL_SESSION_SUMMARY_VERSION) {
    throw new ValidationError(
      `localSessionSummary.version must be ${LOCAL_SESSION_SUMMARY_VERSION}.`,
      "version",
    );
  }

  assertSafeToken(summary.sessionId, "sessionId");
  assertIsoTimestamp(summary.generatedAt, "generatedAt");
  assertBoolean(summary.stale, "stale");
  assertCount(summary.toolCallCount, "toolCallCount");
  assertCount(summary.fileChangeCount, "fileChangeCount");
  assertCount(summary.deferredDecisionCount, "deferredDecisionCount");
  assertBoolean(summary.continuationArtifactAvailable, "continuationArtifactAvailable");
  assertBoolean(summary.validationLocallyPassed, "validationLocallyPassed");

  if (summary.approvedProposalRef !== null) {
    assertSafeToken(summary.approvedProposalRef, "approvedProposalRef");
  }

  if (
    typeof summary.outcomeCategory !== "string" ||
    !LOCAL_SESSION_SUMMARY_OUTCOME_CATEGORIES.includes(
      summary.outcomeCategory as LocalSessionSummaryOutcomeCategory,
    )
  ) {
    throw new ValidationError(
      "localSessionSummary.outcomeCategory must be a supported enum value.",
      "outcomeCategory",
    );
  }
}

function assertSafeToken(value: unknown, field: string): void {
  if (typeof value !== "string" || value.length === 0 || !SAFE_TOKEN_REGEX.test(value)) {
    throw new ValidationError(
      `${field} must be a 1-256 character token using only letters, numbers, _, ., :, or -.`,
      field,
    );
  }
}

function assertIsoTimestamp(value: unknown, field: string): void {
  if (
    typeof value !== "string" ||
    !ISO_DATE_TIME_REGEX.test(value) ||
    Number.isNaN(Date.parse(value))
  ) {
    throw new ValidationError(`${field} must be a valid RFC3339 date-time timestamp.`, field);
  }
}

function assertBoolean(value: unknown, field: string): void {
  if (typeof value !== "boolean") {
    throw new ValidationError(`${field} must be a boolean.`, field);
  }
}

function assertCount(value: unknown, field: string): void {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ValidationError(`${field} must be a non-negative integer.`, field);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

void (true as _SchemaToExportedType);
void (true as _ExportedTypeToSchema);
