import type { WrapUpGuidance, WrapUpMode } from "./types.js";

export type WrapUpInstruction = {
  active: boolean;
  mode: WrapUpMode;
  summary: string | null;
  instruction: string | null;
};

function formatMode(mode: WrapUpMode): string {
  if (mode === "wrap_up") return "wrap_up";
  if (mode === "full_depth") return "full_depth";
  return "auto";
}

function baseInstruction(mode: WrapUpMode): string {
  if (mode === "wrap_up") {
    return "Wrap-Up mode is active. Keep scope narrow, avoid broad refactors, prioritize finishing the current slice, and include clear handoff notes for anything deferred.";
  }

  if (mode === "full_depth") {
    return "Full-depth mode is active. Proceed with complete implementation depth, include robust validation, and avoid prematurely shrinking scope because of Wrap-Up timing.";
  }

  return "Auto Wrap-Up guidance is active. Follow server guidance for scope and pacing, stay focused on the requested outcome, and avoid unnecessary expansion.";
}

export function describeWrapUpGuidance(
  guidance: WrapUpGuidance | null | undefined,
): WrapUpInstruction {
  const mode = guidance?.selectedMode ?? "auto";

  if (!guidance || !guidance.active) {
    return {
      active: false,
      mode,
      summary: null,
      instruction: null,
    };
  }

  const timing =
    typeof guidance.remainingMinutes === "number"
      ? `${guidance.remainingMinutes}m remaining`
      : "timing active";

  const context: string[] = [];

  if (typeof guidance.remainingMinutes === "number") {
    context.push(
      `About ${guidance.remainingMinutes} minutes remain before the attention deadline.`,
    );
  }

  if (guidance.reason) {
    context.push(`Reason: ${guidance.reason}`);
  }

  if (guidance.hints.length > 0) {
    context.push(`Hints: ${guidance.hints.join("; ")}`);
  }

  return {
    active: true,
    mode,
    summary: `Wrap-Up ${formatMode(mode)} (${timing})`,
    instruction: [baseInstruction(mode), ...context].join(" "),
  };
}
