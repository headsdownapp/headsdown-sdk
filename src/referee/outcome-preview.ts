import {
  assertLocalRefereeOutcomeSummaryPayload,
  type LocalRefereeOutcomeSummaryPayload,
} from "./outcome-payload.js";

export function renderLocalRefereeOutcomeSharePreview(
  payload: LocalRefereeOutcomeSummaryPayload,
): string {
  assertLocalRefereeOutcomeSummaryPayload(payload);
  return [
    "Share this run summary with HeadsDown?",
    "",
    "HeadsDown can learn from the outcome without seeing the work itself.",
    "",
    "Summary to share:",
    `✓ Final state: ${payload.finalState}`,
    `✓ Validation status: ${payload.validationStatus}`,
    `✓ Control decisions: ${payload.controlDecisionCounts.passed} passed, ${payload.controlDecisionCounts.failed} failed`,
    `! Completion exceptions: ${payload.completionExceptionCount}`,
    `↩ Manual review estimate: ${payload.manualReviewRoundTripEstimate}`,
    `◷ Elapsed time: ${payload.elapsedTimeBucket}`,
    `◇ Mode: ${payload.executionMode}`,
    `◇ Client: ${payload.client.kind} ${payload.client.version}`,
    "",
    "Privacy boundary: this summary contains structured metadata only. It does not include prompts, source code, diffs, file contents, file paths, repository names, branch names, terminal output, logs, issue or PR text, URLs, message contents, or hashes of those values.",
    "",
    "Choose: share_once, always_share, or keep_local.",
  ].join("\n");
}
