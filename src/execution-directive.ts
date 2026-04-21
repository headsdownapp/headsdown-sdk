import type { Contract, Mode, ScheduleResolution, Verdict, WrapUpMode } from "./types.js";

export type DirectiveCode = "proceed" | "proceed_with_caution" | "defer";
export type EnforcementLevel = "hard" | "soft";

export type ExecutionDirective = {
  directiveCode: DirectiveCode;
  primaryDirective: string;
  enforcement: EnforcementLevel;
  reasonCode: string;
  explanation: string;
  generatedAt: string;
  refreshAt: string | null;
  summary: string;
  hardLimits: {
    requireConfirmationBeforeLargeChanges: boolean;
    avoidNewRefactors: boolean;
    requireHandoffIfIncomplete: boolean;
    maxScope: "minimal" | "normal" | "full_depth";
    prioritizeTests: "minimal" | "standard" | "robust";
  };
  supportingSignals: {
    availabilityMode: Mode | null;
    locked: boolean;
    wrapUpMode: WrapUpMode;
    wrapUpActive: boolean;
    remainingMinutes: number | null;
    verdictDecision: Verdict["decision"] | null;
    verdictReason: string | null;
    guidanceReason: string | null;
    hints: string[];
  };
};

export type ExecutionDirectiveInput = {
  contract?: Contract | null;
  schedule?: ScheduleResolution | null;
  verdict?: Pick<Verdict, "decision" | "reason"> | null;
  generatedAt?: string;
};

function defaultRefreshAt(schedule: ScheduleResolution | null | undefined): string | null {
  if (!schedule) return null;

  return schedule.wrapUpGuidance?.deadlineAt ?? schedule.nextTransitionAt ?? null;
}

function availabilityDirective(mode: Mode | null): {
  directiveCode: DirectiveCode;
  reasonCode: string;
  explanation: string;
  maxScope: "minimal" | "normal";
  avoidNewRefactors: boolean;
  requireHandoffIfIncomplete: boolean;
  prioritizeTests: "minimal" | "standard";
} {
  if (mode === "offline") {
    return {
      directiveCode: "defer",
      reasonCode: "availability_offline",
      explanation: "The user is offline right now, so non-urgent work should be deferred.",
      maxScope: "minimal",
      avoidNewRefactors: true,
      requireHandoffIfIncomplete: true,
      prioritizeTests: "minimal",
    };
  }

  if (mode === "busy" || mode === "limited") {
    return {
      directiveCode: "proceed_with_caution",
      reasonCode: `availability_${mode}`,
      explanation:
        "The user is in a focused or limited state, so execution should stay narrow and completion-oriented.",
      maxScope: "minimal",
      avoidNewRefactors: true,
      requireHandoffIfIncomplete: true,
      prioritizeTests: mode === "limited" ? "minimal" : "standard",
    };
  }

  return {
    directiveCode: "proceed",
    reasonCode: "availability_online",
    explanation: "The user is available for normal progress.",
    maxScope: "normal",
    avoidNewRefactors: false,
    requireHandoffIfIncomplete: false,
    prioritizeTests: "standard",
  };
}

function directiveInstruction(
  directiveCode: DirectiveCode,
  maxScope: "minimal" | "normal" | "full_depth",
): string {
  if (directiveCode === "defer") {
    return "Execution policy: do not proceed with this work now. Defer or reduce scope until conditions change.";
  }

  if (directiveCode === "proceed_with_caution") {
    return "Execution policy: proceed with caution, keep scope narrow, and optimize for safe completion of the current slice.";
  }

  if (maxScope === "full_depth") {
    return "Execution policy: proceed with full implementation depth, include robust validation and tests, and complete the requested outcome thoroughly.";
  }

  return "Execution policy: proceed normally with the requested task outcome.";
}

export function describeExecutionDirective(input: ExecutionDirectiveInput): ExecutionDirective {
  const contract = input.contract ?? null;
  const schedule = input.schedule ?? null;
  const verdict = input.verdict ?? null;

  const mode = contract?.mode ?? null;
  const locked = contract?.lock === true;
  const wrapUpGuidance = schedule?.wrapUpGuidance;
  const wrapUpMode = wrapUpGuidance?.selectedMode ?? "auto";
  const wrapUpActive = wrapUpGuidance?.active === true;

  const base = availabilityDirective(mode);

  let directiveCode: DirectiveCode = base.directiveCode;
  let enforcement: EnforcementLevel = "soft";
  let reasonCode = base.reasonCode;
  let explanation = base.explanation;
  let maxScope: "minimal" | "normal" | "full_depth" = base.maxScope;
  let avoidNewRefactors = base.avoidNewRefactors;
  let requireHandoffIfIncomplete = base.requireHandoffIfIncomplete;
  let prioritizeTests: "minimal" | "standard" | "robust" = base.prioritizeTests;

  if (wrapUpActive) {
    if (wrapUpMode === "wrap_up") {
      if (directiveCode === "proceed") {
        directiveCode = "proceed_with_caution";
      }
      reasonCode = "wrap_up_active";
      explanation =
        "Wrap-Up guidance is active, so execution should emphasize finishing current scope over starting new work.";
      maxScope = "minimal";
      avoidNewRefactors = true;
      requireHandoffIfIncomplete = true;
      prioritizeTests = "minimal";
    }

    if (wrapUpMode === "full_depth" && directiveCode !== "defer") {
      reasonCode = "wrap_up_full_depth_override";
      explanation =
        "A full-depth override is active, so execution should prioritize complete implementation depth despite deadline proximity.";
      maxScope = "full_depth";
      avoidNewRefactors = false;
      requireHandoffIfIncomplete = true;
      prioritizeTests = "robust";
    }
  }

  if (locked) {
    if (directiveCode === "proceed") {
      directiveCode = "proceed_with_caution";
    }

    reasonCode = "status_locked";
    explanation =
      "The user has locked status behavior. Large or risky changes require confirmation before proceeding.";
  }

  if (verdict?.decision === "deferred") {
    directiveCode = "defer";
    enforcement = "hard";
    reasonCode = "verdict_deferred";
    explanation = verdict.reason || "HeadsDown deferred this task under current conditions.";
  }

  if (verdict?.decision === "approved") {
    directiveCode = "proceed";
    enforcement = "hard";
    reasonCode = "verdict_approved";
    explanation = verdict.reason || "HeadsDown approved this task under current conditions.";
  }

  const context: string[] = [];

  if (typeof wrapUpGuidance?.remainingMinutes === "number") {
    context.push(
      `About ${wrapUpGuidance.remainingMinutes} minutes remain before the next attention boundary.`,
    );
  }

  if (wrapUpGuidance?.reason) {
    context.push(`Guidance reason: ${wrapUpGuidance.reason}`);
  }

  if (wrapUpGuidance?.hints?.length) {
    context.push(`Hints: ${wrapUpGuidance.hints.join("; ")}`);
  }

  const instructionParts = [
    directiveInstruction(directiveCode, maxScope),
    `Do not: ${avoidNewRefactors ? "start new refactors or expand scope unnecessarily" : "ignore required validation or quality checks"}.`,
    `Context: ${explanation}`,
    ...context,
  ];

  return {
    directiveCode,
    primaryDirective: instructionParts.join(" "),
    enforcement,
    reasonCode,
    explanation,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    refreshAt: defaultRefreshAt(schedule),
    summary: `${directiveCode.toUpperCase()} (${reasonCode})`,
    hardLimits: {
      requireConfirmationBeforeLargeChanges: locked,
      avoidNewRefactors,
      requireHandoffIfIncomplete,
      maxScope,
      prioritizeTests,
    },
    supportingSignals: {
      availabilityMode: mode,
      locked,
      wrapUpMode,
      wrapUpActive,
      remainingMinutes: wrapUpGuidance?.remainingMinutes ?? null,
      verdictDecision: verdict?.decision ?? null,
      verdictReason: verdict?.reason ?? null,
      guidanceReason: wrapUpGuidance?.reason ?? null,
      hints: wrapUpGuidance?.hints ?? [],
    },
  };
}
