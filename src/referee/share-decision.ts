export type LocalRefereeOutcomeSharingPreference = "local_only" | "always_share";
export type LocalRefereeOutcomeShareChoice =
  | "preview"
  | "share_once"
  | "always_share"
  | "keep_local";

export interface LocalRefereeOutcomeSharingConfig {
  preference?: LocalRefereeOutcomeSharingPreference;
}

export function shouldShareLocalRefereeOutcomeSummary(input: {
  choice?: LocalRefereeOutcomeShareChoice;
  config?: LocalRefereeOutcomeSharingConfig;
}): boolean {
  if (input.choice !== undefined) {
    switch (input.choice) {
      case "share_once":
      case "always_share":
        return true;
      case "keep_local":
      case "preview":
        return false;
      default:
        return false;
    }
  }

  return input.config?.preference === "always_share";
}
