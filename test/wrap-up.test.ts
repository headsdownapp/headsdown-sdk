import { describe, it, expect } from "vitest";
import { describeWrapUpGuidance } from "../src/wrap-up.js";
import type { WrapUpGuidance } from "../src/types.js";

function makeGuidance(overrides: Partial<WrapUpGuidance> = {}): WrapUpGuidance {
  return {
    active: true,
    deadlineAt: "2026-04-21T23:00:00Z",
    remainingMinutes: 24,
    profile: "wrap_up",
    source: "threshold",
    reason: "Approaching end of focus window",
    hints: ["Summarize progress", "Leave handoff notes"],
    thresholdMinutes: 30,
    selectedMode: "wrap_up",
    ...overrides,
  };
}

describe("describeWrapUpGuidance", () => {
  it("returns null instruction fields when guidance is inactive", () => {
    const result = describeWrapUpGuidance(makeGuidance({ active: false }));

    expect(result.active).toBe(false);
    expect(result.instruction).toBeNull();
    expect(result.summary).toBeNull();
  });

  it("returns wrap_up instruction text with timing, reason, and hints", () => {
    const result = describeWrapUpGuidance(makeGuidance({ selectedMode: "wrap_up" }));

    expect(result.active).toBe(true);
    expect(result.summary).toContain("Wrap-Up wrap_up");
    expect(result.summary).toContain("24m remaining");
    expect(result.instruction).toContain("Keep scope narrow");
    expect(result.instruction).toContain("About 24 minutes remain");
    expect(result.instruction).toContain("Reason: Approaching end of focus window");
    expect(result.instruction).toContain("Hints: Summarize progress; Leave handoff notes");
  });

  it("returns full_depth instruction text", () => {
    const result = describeWrapUpGuidance(makeGuidance({ selectedMode: "full_depth" }));

    expect(result.summary).toContain("full_depth");
    expect(result.instruction).toContain("Full-depth mode is active");
    expect(result.instruction).toContain("complete implementation depth");
  });

  it("returns auto instruction text", () => {
    const result = describeWrapUpGuidance(makeGuidance({ selectedMode: "auto" }));

    expect(result.summary).toContain("auto");
    expect(result.instruction).toContain("Auto Wrap-Up guidance is active");
    expect(result.instruction).toContain("Follow server guidance");
  });
});
