import type { LocalRefereeCheckType } from "./contract.js";

export const LOCAL_REFEREE_CHECK_LABELS: Record<LocalRefereeCheckType, string> = {
  validation_status: "Validation completed",
  max_files_touched: "Scope within contract",
  max_tool_calls: "Scope within contract",
  require_tests: "Validation completed",
  network_required: "Local-only execution preserved",
  outcome: "Definition of done satisfied",
  git_commit_present: "Commit present",
};

export function labelLocalRefereeCheckType(type: LocalRefereeCheckType): string {
  return LOCAL_REFEREE_CHECK_LABELS[type];
}
