import type { LocalRefereeCheckType } from "./contract.js";

export const LOCAL_REFEREE_CHECK_LABELS: Record<LocalRefereeCheckType, string> = {
  validation_status: "Validation completed",
  max_files_touched: "Scope within contract",
  max_tool_calls: "Scope within contract",
  require_tests: "Validation completed",
  network_required: "Network requirement satisfied",
  outcome: "Definition of done satisfied",
  git_commit_present: "Commit present",
};

export function labelLocalRefereeCheckType(type: LocalRefereeCheckType): string {
  const label = (LOCAL_REFEREE_CHECK_LABELS as Record<string, string | undefined>)[type];
  if (!label) throw new Error(`Unsupported Local Referee check type: ${String(type)}.`);
  return label;
}
