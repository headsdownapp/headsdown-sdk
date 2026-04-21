import { describe, expect, it } from "vitest";
import { describeExecutionDirective } from "../src/execution-directive.js";
import type { Contract, ScheduleResolution, Verdict } from "../src/types.js";

function makeContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: "contract-1",
    mode: "online",
    status: true,
    statusEmoji: null,
    statusText: null,
    autoRespond: false,
    lock: false,
    duration: null,
    ruleSetType: null,
    ruleSetParams: null,
    expiresAt: "2026-04-22T01:00:00Z",
    insertedAt: "2026-04-21T22:00:00Z",
    ...overrides,
  };
}

function makeSchedule(overrides: Partial<ScheduleResolution> = {}): ScheduleResolution {
  return {
    inReachableHours: true,
    nextTransitionAt: "2026-04-22T01:00:00Z",
    attentionDeadlineAt: "2026-04-22T01:00:00Z",
    wrapUpGuidance: {
      active: false,
      deadlineAt: null,
      remainingMinutes: null,
      profile: "normal",
      source: "inactive",
      reason: "",
      hints: [],
      thresholdMinutes: 30,
      selectedMode: "auto",
    },
    activeWindow: null,
    nextWindow: null,
    ...overrides,
  };
}

function makeVerdict(overrides: Partial<Verdict> = {}): Verdict {
  return {
    decision: "approved",
    reason: "Within scope",
    proposalId: "proposal-1",
    evaluatedAt: "2026-04-21T22:30:00Z",
    wrapUpGuidance: null,
    ...overrides,
  };
}

describe("describeExecutionDirective", () => {
  it("handles online + wrap-up active", () => {
    const directive = describeExecutionDirective({
      contract: makeContract({ mode: "online" }),
      schedule: makeSchedule({
        wrapUpGuidance: {
          active: true,
          deadlineAt: "2026-04-22T01:00:00Z",
          remainingMinutes: 22,
          profile: "wrap_up",
          source: "threshold",
          reason: "Within wrap-up threshold",
          hints: ["completion_first"],
          thresholdMinutes: 30,
          selectedMode: "wrap_up",
        },
      }),
      generatedAt: "2026-04-21T22:38:00Z",
    });

    expect(directive.directiveCode).toBe("proceed_with_caution");
    expect(directive.reasonCode).toBe("threshold");
    expect(directive.hardLimits.maxScope).toBe("minimal");
    expect(directive.hardLimits.avoidNewRefactors).toBe(true);
    expect(directive.primaryDirective).toContain("Execution policy");
    expect(directive.primaryDirective).toContain("22 minutes");
  });

  it("handles busy + lock enabled", () => {
    const directive = describeExecutionDirective({
      contract: makeContract({ mode: "busy", lock: true }),
      schedule: makeSchedule(),
    });

    expect(directive.directiveCode).toBe("proceed_with_caution");
    expect(directive.hardLimits.requireConfirmationBeforeLargeChanges).toBe(true);
    expect(directive.reasonCode).toBe("locked");
  });

  it("handles deferred verdict with reason as highest priority", () => {
    const directive = describeExecutionDirective({
      contract: makeContract({ mode: "online" }),
      schedule: makeSchedule(),
      verdict: {
        decision: "deferred",
        reason: "Too large for current focus window",
        wrapUpGuidance: null,
      },
    });

    expect(directive.directiveCode).toBe("defer");
    expect(directive.enforcement).toBe("hard");
    expect(directive.reasonCode).toBe("verdict_deferred");
    expect(directive.explanation).toContain("Too large");
  });

  it("keeps caution semantics when verdict is approved", () => {
    const directive = describeExecutionDirective({
      contract: makeContract({ mode: "busy" }),
      schedule: makeSchedule(),
      verdict: {
        decision: "approved",
        reason: "Approved within busy constraints",
        wrapUpGuidance: null,
      },
    });

    expect(directive.directiveCode).toBe("proceed_with_caution");
    expect(directive.enforcement).toBe("hard");
    expect(directive.hardLimits.maxScope).toBe("minimal");
  });

  it("handles full-depth override with inactive guidance", () => {
    const directive = describeExecutionDirective({
      contract: makeContract({ mode: "online" }),
      schedule: makeSchedule({
        wrapUpGuidance: {
          active: false,
          deadlineAt: "2026-04-22T01:00:00Z",
          remainingMinutes: 18,
          profile: "normal",
          source: "forced_full_depth",
          reason: "Per-task deep override",
          hints: ["full_validation"],
          thresholdMinutes: 30,
          selectedMode: "full_depth",
        },
      }),
    });

    expect(directive.directiveCode).toBe("proceed");
    expect(directive.reasonCode).toBe("forced_full_depth");
    expect(directive.hardLimits.maxScope).toBe("full_depth");
    expect(directive.hardLimits.prioritizeTests).toBe("robust");
    expect(directive.primaryDirective).toContain("full implementation depth");
  });

  it("does not emit narrow-scope policy for busy plus forced full-depth", () => {
    const directive = describeExecutionDirective({
      contract: makeContract({ mode: "busy" }),
      schedule: makeSchedule({
        wrapUpGuidance: {
          active: false,
          deadlineAt: "2026-04-22T01:00:00Z",
          remainingMinutes: 12,
          profile: "normal",
          source: "forced_full_depth",
          reason: "Per-task deep override during busy mode",
          hints: ["full_validation"],
          thresholdMinutes: 30,
          selectedMode: "full_depth",
        },
      }),
    });

    expect(directive.directiveCode).toBe("proceed_with_caution");
    expect(directive.hardLimits.maxScope).toBe("full_depth");
    expect(directive.primaryDirective).toContain("full implementation depth");
    expect(directive.primaryDirective).not.toContain("keep scope narrow");
  });

  it("prefers verdict wrap-up guidance over schedule guidance", () => {
    const verdict = makeVerdict({
      wrapUpGuidance: {
        active: true,
        deadlineAt: "2026-04-22T01:10:00Z",
        remainingMinutes: 10,
        profile: "wrap_up",
        source: "forced_wrap_up",
        reason: "Forced by policy",
        hints: ["ship_handoff_if_needed"],
        thresholdMinutes: 30,
        selectedMode: "wrap_up",
      },
    });

    const directive = describeExecutionDirective({
      contract: makeContract({ mode: "online" }),
      schedule: makeSchedule({
        wrapUpGuidance: {
          active: false,
          deadlineAt: null,
          remainingMinutes: null,
          profile: "normal",
          source: "inactive",
          reason: "",
          hints: [],
          thresholdMinutes: 30,
          selectedMode: "auto",
        },
      }),
      verdict,
    });

    expect(directive.reasonCode).toBe("forced_wrap_up");
    expect(directive.supportingSignals.remainingMinutes).toBe(10);
    expect(directive.primaryDirective).toContain("10 minutes");
  });
});
