import { describe, expect, it } from "vitest";
import {
  LOCAL_SESSION_SUMMARY_JSON_SCHEMA,
  LOCAL_SESSION_SUMMARY_VERSION,
  ValidationError,
  assertLocalSessionSummary,
  type LocalSessionSummary,
} from "../src/index.js";

function validSummary(): LocalSessionSummary {
  return {
    version: LOCAL_SESSION_SUMMARY_VERSION,
    sessionId: "session_123",
    generatedAt: "2026-04-29T15:00:00.000Z",
    stale: false,
    toolCallCount: 12,
    fileChangeCount: 4,
    deferredDecisionCount: 1,
    continuationArtifactAvailable: true,
    validationLocallyPassed: true,
    approvedProposalRef: "proposal_abc",
    outcomeCategory: "completed",
  };
}

describe("local session summary contract", () => {
  it("accepts a valid local session summary", () => {
    const summary = validSummary();
    expect(() => assertLocalSessionSummary(summary)).not.toThrow();
  });

  it("rejects unsupported versions", () => {
    const summary = { ...validSummary(), version: 2 };
    expect(() => assertLocalSessionSummary(summary)).toThrow(ValidationError);
  });

  it("rejects negative counters", () => {
    const summary = { ...validSummary(), fileChangeCount: -1 };
    expect(() => assertLocalSessionSummary(summary)).toThrow(ValidationError);
  });

  it("rejects missing required fields", () => {
    const summary = { ...validSummary() } as Record<string, unknown>;
    delete summary.stale;
    expect(() => assertLocalSessionSummary(summary)).toThrow(ValidationError);
  });

  it("rejects invalid timestamps", () => {
    const naturalLanguage = { ...validSummary(), generatedAt: "tomorrow" };
    expect(() => assertLocalSessionSummary(naturalLanguage)).toThrow(ValidationError);

    const dateOnly = { ...validSummary(), generatedAt: "2026-04-29" };
    expect(() => assertLocalSessionSummary(dateOnly)).toThrow(ValidationError);
  });

  it("rejects free-form outcome category values", () => {
    const summary = { ...validSummary(), outcomeCategory: "ship_it" };
    expect(() => assertLocalSessionSummary(summary)).toThrow(ValidationError);
  });

  it("rejects prohibited nested raw-context fields", () => {
    const summary = {
      ...validSummary(),
      injected: { prompt: "do everything" },
    } as unknown;
    expect(() => assertLocalSessionSummary(summary)).toThrow(ValidationError);
  });

  it("rejects unsafe token shapes for identifiers", () => {
    const withPathSessionId = { ...validSummary(), sessionId: "repo/path" };
    expect(() => assertLocalSessionSummary(withPathSessionId)).toThrow(ValidationError);

    const withUrlProposalRef = { ...validSummary(), approvedProposalRef: "https://example.com" };
    expect(() => assertLocalSessionSummary(withUrlProposalRef)).toThrow(ValidationError);
  });

  it("round-trips schema JSON serialization", () => {
    const serialized = JSON.stringify(LOCAL_SESSION_SUMMARY_JSON_SCHEMA, null, 2);
    const parsed = JSON.parse(serialized);
    expect(parsed).toEqual(LOCAL_SESSION_SUMMARY_JSON_SCHEMA);
  });
});
