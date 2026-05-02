export const AUTOPILOT_CLASSIFIER_VERSION = "1.1.0";

export type ClassifierSeverity = "trivial" | "routine" | "notable" | "permanent" | "critical";

export type ClassifierOutcome = ClassifierSeverity | "classification_failed";

export type ClassifierLatitude = "hold" | "verify" | "balanced" | "cautious" | "lockdown";

export type ClassifierEscalationStep =
  | "try_alternative"
  | "try_in_sandbox"
  | "defer_to_end_of_run"
  | "defer_for_human_review";

export type VersionMismatchLevel = "none" | "warning" | "error";

export type VersionMismatchDirection = "match" | "backend_ahead" | "sdk_ahead" | "major_mismatch";

export interface SeverityTierDefinition {
  tier: 1 | 2 | 3 | 4 | 5;
  label: "Trivial" | "Routine" | "Notable" | "Permanent" | "Critical";
  severity: ClassifierSeverity;
  profile: string;
  criteria: string[];
  examples: string[];
}

export interface ClassifiedAction {
  outcome: ClassifierOutcome;
  reasonCode: string;
  source: "deterministic" | "llm_fallback" | "unknown_variant_fallback";
  toolKind: string;
}

export interface ClassifierVersionCompatibility {
  level: VersionMismatchLevel;
  direction: VersionMismatchDirection;
  message: string;
  shouldProceed: boolean;
  fallbackLatitude: ClassifierLatitude | null;
}

export interface ClassifierPromptFragmentsInput {
  latitude: ClassifierLatitude;
  identityActionOverrides?: string[];
  houseRules?: string[];
}

export interface ClassifierPromptFragments {
  taxonomyFragment: string;
  policyFragment: string;
  outputSchemaFragment: string;
  instructionsFragment: string;
  fullSystemAddendum: string;
}

export interface ClassifierPolicy {
  classifierVersion: string;
  latitude: ClassifierLatitude;
  escalationStrategy?: ClassifierEscalationStep[];
  sandboxPreference?: "preferred" | "required" | "avoid";
  identityActionOverrides?: string[];
  houseRules?: string[];
}

export interface IntegrationCapabilities {
  classifierVersion: string;
  snapshotId?: string;
  capturedAt: string;
  stale?: boolean;
  sandbox: {
    available: boolean;
    modes?: Array<"bash" | "full_session" | "edit_only" | "webfetch_only">;
    fsIsolation: "none" | "cwd_only" | "ephemeral";
    networkIsolation: "none" | "allowlist" | "block_all";
    identityIsolation: "none" | "redacted" | "isolated";
  };
  toolKinds: Array<"bash" | "edit" | "webfetch" | "mcp" | "computer_use">;
  identityActionCategories?: string[];
}

export interface EscalationDecision {
  steps: ClassifierEscalationStep[];
  reasonCode: string;
  version: ClassifierVersionCompatibility;
}

export type KnownToolKind = "bash" | "edit" | "webfetch" | "mcp" | "computer_use";

export type QuestionCategory =
  | "scope_clarification"
  | "approval_request"
  | "tooling_choice"
  | "data_input"
  | "recovery_decision"
  | "other";

export type RecentToolContext =
  | {
      last_tool_kind: KnownToolKind;
      last_tool_outcome: "succeeded" | "failed";
      turns_since: number;
    }
  | {
      last_tool_kind: "none";
      last_tool_outcome: "unavailable";
      turns_since: number;
    };

export interface InteractionAskUserActionShape extends BaseActionShape {
  tool_kind: "interaction.ask_user";
  question_category: QuestionCategory;
  recent_tool_context: RecentToolContext;
}

export interface BaseActionShape {
  tool_kind: string;
  external_side_effect?: boolean;
  reversible?: boolean;
  destructive?: boolean;
  public_facing?: boolean;
}

export interface BashActionShape extends BaseActionShape {
  tool_kind: "bash";
  command: string;
  write_local?: boolean;
}

export interface EditActionShape extends BaseActionShape {
  tool_kind: "edit";
  operation: "create" | "replace" | "append" | "delete";
}

export interface WebfetchActionShape extends BaseActionShape {
  tool_kind: "webfetch";
  url: string;
  known_safe_domain?: boolean;
}

export interface McpActionShape extends BaseActionShape {
  tool_kind: "mcp";
  server: string;
  tool: string;
  read_only_declared?: boolean;
}

export interface ComputerUseActionShape extends BaseActionShape {
  tool_kind: "computer_use";
  action: string;
}

export interface UnknownActionShape extends BaseActionShape {
  tool_kind: string;
  side_effect_risk?: "none" | "possible" | "high";
}

export type ActionShape =
  | BashActionShape
  | EditActionShape
  | WebfetchActionShape
  | McpActionShape
  | ComputerUseActionShape
  | InteractionAskUserActionShape
  | UnknownActionShape;

export const SEVERITY_TAXONOMY: Record<ClassifierSeverity, SeverityTierDefinition> = {
  trivial: {
    tier: 1,
    label: "Trivial",
    severity: "trivial",
    profile: "Read-only, local, or well-known safe target",
    criteria: [
      "No external side effect",
      "No identity-bound publish or communication",
      "Low reversal risk",
    ],
    examples: ["cat README.md", "ls", "fetch github.com/foo/bar README"],
  },
  routine: {
    tier: 2,
    label: "Routine",
    severity: "routine",
    profile: "Local write, reversible, project-scoped",
    criteria: [
      "Writes local state inside working scope",
      "Recoverable through normal workflows",
      "No immediate public artifact",
    ],
    examples: ["mkdir local/dir", "npm install in project dir", "edit local file"],
  },
  notable: {
    tier: 3,
    label: "Notable",
    severity: "notable",
    profile: "External side effect, usually recoverable",
    criteria: [
      "Touches external systems or unknown network targets",
      "May spend money or emit a side effect outside local filesystem",
      "Recovery possible but non-zero cost",
    ],
    examples: ["fetch random-blog.tld/x.pdf", "idempotent API write", "small money-spend"],
  },
  permanent: {
    tier: 4,
    label: "Permanent",
    severity: "permanent",
    profile: "Destructive, irreversible, or public-facing",
    criteria: [
      "Can destroy data or publish durable artifacts",
      "Not trivially reversible",
      "Likely to require explicit human accountability",
    ],
    examples: ["rm -rf project-subdir", "git push origin main", "gh pr create", "send email"],
  },
  critical: {
    tier: 5,
    label: "Critical",
    severity: "critical",
    profile: "Always defer regardless of latitude",
    criteria: [
      "High-risk irreversible action",
      "Large blast radius or compliance exposure",
      "Must never auto-attempt in v1",
    ],
    examples: ["force-push origin main", "drop database", "publish package", "send mass email"],
  },
};

export const LATITUDE_MAX_SEVERITY: Record<ClassifierLatitude, ClassifierSeverity | "none"> = {
  // Intentional: "hold" permits up to permanent actions because the user is assumed available for fast escalation handling.
  hold: "permanent",
  verify: "notable",
  balanced: "notable",
  cautious: "routine",
  lockdown: "none",
};

export const CLASSIFIER_FIXTURES: Array<{ action: string; expected: ClassifierSeverity }> = [
  { action: "fetch github.com README", expected: "trivial" },
  { action: "mkdir local/dir", expected: "routine" },
  { action: "npm install in project dir", expected: "routine" },
  { action: "fetch random-blog.tld/x.pdf", expected: "notable" },
  { action: "rm -rf project-subdir", expected: "permanent" },
  { action: "git push origin main", expected: "permanent" },
  { action: "force-push origin main", expected: "critical" },
  { action: "drop database", expected: "critical" },
  { action: "ask_user{recovery, last=edit:failed}", expected: "permanent" },
  { action: "ask_user{tooling_choice, last=bash:succeeded}", expected: "routine" },
  { action: "ask_user{scope_clarification, last=webfetch:succeeded}", expected: "notable" },
  { action: "ask_user{approval_request, last=none:unavailable}", expected: "notable" },
];

const KNOWN_TOOL_KINDS: KnownToolKind[] = ["bash", "edit", "webfetch", "mcp", "computer_use"];

const QUESTION_CATEGORIES: QuestionCategory[] = [
  "scope_clarification",
  "approval_request",
  "tooling_choice",
  "data_input",
  "recovery_decision",
  "other",
];

const SEVERITY_ORDER: ClassifierSeverity[] = [
  "trivial",
  "routine",
  "notable",
  "permanent",
  "critical",
];

const DEFAULT_ESCALATION_STRATEGY: ClassifierEscalationStep[] = [
  "try_alternative",
  "try_in_sandbox",
  "defer_to_end_of_run",
  "defer_for_human_review",
];

function severityIndex(severity: ClassifierSeverity): number {
  return SEVERITY_ORDER.indexOf(severity);
}

function parseVersionParts(
  version: string,
): { major: number; minor: number; patch: number } | null {
  const match = version.trim().match(/^(\d+)\.(\d+)(?:\.(\d+))?$/);
  if (!match) return null;
  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3] ?? "0", 10),
  };
}

function clampStepOrder(steps: ClassifierEscalationStep[]): ClassifierEscalationStep[] {
  const unique = new Set<ClassifierEscalationStep>();
  for (const step of steps) unique.add(step);
  return [...unique];
}

function hasPlausibleSideEffects(action: BaseActionShape): boolean {
  return (
    action.external_side_effect === true ||
    action.destructive === true ||
    action.public_facing === true
  );
}

function isBashActionShape(action: ActionShape): action is BashActionShape {
  return action.tool_kind === "bash" && typeof (action as BashActionShape).command === "string";
}

function isEditActionShape(action: ActionShape): action is EditActionShape {
  return action.tool_kind === "edit" && typeof (action as EditActionShape).operation === "string";
}

function isWebfetchActionShape(action: ActionShape): action is WebfetchActionShape {
  return action.tool_kind === "webfetch" && typeof (action as WebfetchActionShape).url === "string";
}

function isMcpActionShape(action: ActionShape): action is McpActionShape {
  return action.tool_kind === "mcp" && typeof (action as McpActionShape).tool === "string";
}

function isComputerUseActionShape(action: ActionShape): action is ComputerUseActionShape {
  return (
    action.tool_kind === "computer_use" &&
    typeof (action as ComputerUseActionShape).action === "string"
  );
}

export function isInteractionAskUserActionShape(
  action: ActionShape,
): action is InteractionAskUserActionShape {
  return (
    action.tool_kind === "interaction.ask_user" &&
    isQuestionCategory((action as InteractionAskUserActionShape).question_category) &&
    isRecentToolContext((action as InteractionAskUserActionShape).recent_tool_context)
  );
}

function isQuestionCategory(value: unknown): value is QuestionCategory {
  return typeof value === "string" && QUESTION_CATEGORIES.includes(value as QuestionCategory);
}

function isKnownToolKind(value: unknown): value is KnownToolKind {
  return typeof value === "string" && KNOWN_TOOL_KINDS.includes(value as KnownToolKind);
}

function isRecentToolContext(value: unknown): value is RecentToolContext {
  if (typeof value !== "object" || value === null) return false;

  const context = value as Partial<RecentToolContext>;
  const turnsSince = context.turns_since;
  if (!Number.isInteger(turnsSince) || turnsSince === undefined || turnsSince < 0) return false;

  if (context.last_tool_kind === "none") return context.last_tool_outcome === "unavailable";
  if (!isKnownToolKind(context.last_tool_kind)) return false;
  return context.last_tool_outcome === "succeeded" || context.last_tool_outcome === "failed";
}

function isValidSandboxSnapshot(capabilities: IntegrationCapabilities): boolean {
  if (capabilities.stale) return false;
  if (!capabilities.capturedAt.trim()) return false;
  if (capabilities.sandbox.available === false) return false;
  if (capabilities.sandbox.fsIsolation === "none") return false;
  if (capabilities.sandbox.identityIsolation === "none") return false;
  return true;
}

function supportsSandboxForToolKind(
  capabilities: IntegrationCapabilities,
  toolKind: string,
): boolean {
  const toolKindSupported = capabilities.toolKinds.includes(
    toolKind as IntegrationCapabilities["toolKinds"][number],
  );
  if (!toolKindSupported) return false;

  const modes = capabilities.sandbox.modes ?? [];
  if (modes.includes("full_session")) return true;

  if (toolKind === "bash") return modes.includes("bash");
  if (toolKind === "edit") return modes.includes("edit_only");
  if (toolKind === "webfetch") return modes.includes("webfetch_only");

  return false;
}

function materialSteps(
  strategy: ClassifierEscalationStep[],
  sandboxUsable: boolean,
): ClassifierEscalationStep[] {
  const filtered = strategy.filter((step) => {
    if (step !== "try_in_sandbox") return true;
    return sandboxUsable;
  });

  return filtered.length > 0 ? filtered : ["defer_for_human_review"];
}

function prioritizeSandboxStep(
  steps: ClassifierEscalationStep[],
  sandboxUsable: boolean,
): ClassifierEscalationStep[] {
  if (!sandboxUsable) return steps;

  const withoutSandbox = steps.filter((step) => step !== "try_in_sandbox");
  return ["try_in_sandbox", ...withoutSandbox];
}

export function evaluateClassifierVersionCompatibility(params: {
  sdkVersion: string;
  policyVersion: string;
}): ClassifierVersionCompatibility {
  const sdk = parseVersionParts(params.sdkVersion);
  const policy = parseVersionParts(params.policyVersion);

  if (!sdk || !policy) {
    return {
      level: "error",
      direction: "major_mismatch",
      message: "Classifier version format is invalid. Fallback to lockdown behavior.",
      shouldProceed: false,
      fallbackLatitude: "lockdown",
    };
  }

  if (sdk.major !== policy.major) {
    return {
      level: "error",
      direction: "major_mismatch",
      message: `Classifier major version mismatch (sdk=${params.sdkVersion}, policy=${params.policyVersion}). Fallback to lockdown behavior.`,
      shouldProceed: false,
      fallbackLatitude: "lockdown",
    };
  }

  if (policy.minor > sdk.minor) {
    return {
      level: "warning",
      direction: "backend_ahead",
      message: `Policy classifier version is ahead of SDK (sdk=${params.sdkVersion}, policy=${params.policyVersion}). Proceeding with known fields only.`,
      shouldProceed: true,
      fallbackLatitude: null,
    };
  }

  if (sdk.minor > policy.minor) {
    return {
      level: "error",
      direction: "sdk_ahead",
      message: `SDK classifier version is ahead of policy version (sdk=${params.sdkVersion}, policy=${params.policyVersion}). Fallback to lockdown behavior.`,
      shouldProceed: false,
      fallbackLatitude: "lockdown",
    };
  }

  return {
    level: "none",
    direction: "match",
    message: "Classifier version match.",
    shouldProceed: true,
    fallbackLatitude: null,
  };
}

export function buildClassifierPromptFragments(
  input: ClassifierPromptFragmentsInput,
): ClassifierPromptFragments {
  const rules = input.houseRules?.length ? input.houseRules.join(", ") : "none";
  const identityOverrides = input.identityActionOverrides?.length
    ? input.identityActionOverrides.join(", ")
    : "none";

  const taxonomyLines = SEVERITY_ORDER.map((severity) => {
    const tier = SEVERITY_TAXONOMY[severity];
    return `- Tier ${tier.tier} (${tier.label} / ${severity}): ${tier.profile}. Criteria: ${tier.criteria.join("; ")}. Examples: ${tier.examples.join(", ")}.`;
  }).join("\n");

  const fixtureLines = CLASSIFIER_FIXTURES.map(
    (fixture) => `- ${fixture.action} => ${fixture.expected}`,
  ).join("\n");

  const taxonomyFragment = [
    "Severity taxonomy:",
    taxonomyLines,
    "",
    "Reference fixtures:",
    fixtureLines,
  ].join("\n");

  const policyFragment = [
    `Latitude: ${input.latitude}`,
    `Max severity attemptable: ${LATITUDE_MAX_SEVERITY[input.latitude]}`,
    `Identity-action overrides: ${identityOverrides}`,
    `Enumerated house rules: ${rules}`,
  ].join("\n");

  const outputSchemaFragment = [
    "Output JSON only:",
    '{"classification":"trivial|routine|notable|permanent|critical|classification_failed","confidence":"low|medium|high","reason_code":"sdk_enum"}',
  ].join("\n");

  const instructionsFragment = [
    "Classify the imminent action against the taxonomy.",
    "Never downgrade deterministic Critical findings.",
    "If the variant is unknown and side effects are plausible, return classification_failed.",
    "classification_failed bypasses latitude and must defer for human review.",
    "Return one of the allowed classification values only.",
    "When ending a turn to ask the user a question, construct an interaction.ask_user action shape rather than leaving the turn unclassified.",
  ].join("\n");

  const fullSystemAddendum = [
    "Autopilot classifier addendum:",
    taxonomyFragment,
    "",
    policyFragment,
    "",
    instructionsFragment,
    "",
    outputSchemaFragment,
  ].join("\n");

  return {
    taxonomyFragment,
    policyFragment,
    outputSchemaFragment,
    instructionsFragment,
    fullSystemAddendum,
  };
}

export function classifyActionShapeFallback(action: ActionShape): ClassifiedAction {
  if (action.tool_kind === "interaction.ask_user") {
    if (!isInteractionAskUserActionShape(action)) {
      return {
        outcome: "classification_failed",
        reasonCode: "malformed_ask_user_action_shape",
        source: "deterministic",
        toolKind: action.tool_kind,
      };
    }

    const { question_category, recent_tool_context } = action;

    if (
      recent_tool_context.last_tool_outcome === "failed" &&
      question_category === "recovery_decision"
    ) {
      return {
        outcome: "permanent",
        reasonCode: "ask_user_recovery_after_failure",
        source: "deterministic",
        toolKind: action.tool_kind,
      };
    }

    if (
      question_category === "tooling_choice" &&
      recent_tool_context.last_tool_outcome === "succeeded"
    ) {
      return {
        outcome: "routine",
        reasonCode: "ask_user_tooling_choice",
        source: "deterministic",
        toolKind: action.tool_kind,
      };
    }

    return {
      outcome: "notable",
      reasonCode: "ask_user_baseline",
      source: "deterministic",
      toolKind: action.tool_kind,
    };
  }

  if (!KNOWN_TOOL_KINDS.includes(action.tool_kind as KnownToolKind)) {
    const risk = (action as UnknownActionShape).side_effect_risk ?? "possible";
    return {
      outcome: "classification_failed",
      reasonCode:
        risk === "none" && !hasPlausibleSideEffects(action)
          ? "unknown_variant_unverified_read_only"
          : "unknown_variant_side_effect_possible",
      source: "unknown_variant_fallback",
      toolKind: action.tool_kind,
    };
  }

  if (action.tool_kind === "bash") {
    if (!isBashActionShape(action)) {
      return {
        outcome: "classification_failed",
        reasonCode: "malformed_bash_action_shape",
        source: "deterministic",
        toolKind: action.tool_kind,
      };
    }

    const normalizedCommand = action.command.toLowerCase();

    if (
      normalizedCommand.includes("force-push") ||
      normalizedCommand.includes("drop database") ||
      normalizedCommand.includes("npm publish") ||
      normalizedCommand.includes("cargo publish") ||
      normalizedCommand.includes("twine upload") ||
      normalizedCommand.includes("hex.publish")
    ) {
      return {
        outcome: "critical",
        reasonCode: "critical_command_pattern",
        source: "deterministic",
        toolKind: action.tool_kind,
      };
    }

    if (action.destructive) {
      return {
        outcome: action.public_facing ? "critical" : "permanent",
        reasonCode: action.public_facing ? "destructive_public" : "destructive_local",
        source: "deterministic",
        toolKind: action.tool_kind,
      };
    }

    if (
      /(^|\s)git\s+push\s+origin\s+main(\s|$)/.test(normalizedCommand) ||
      normalizedCommand.includes("rm -rf")
    ) {
      return {
        outcome: "permanent",
        reasonCode: "permanent_command_pattern",
        source: "deterministic",
        toolKind: action.tool_kind,
      };
    }

    if (normalizedCommand.includes("mkdir") || normalizedCommand.includes("npm install")) {
      return {
        outcome: "routine",
        reasonCode: "routine_local_bash",
        source: "deterministic",
        toolKind: action.tool_kind,
      };
    }

    if (/^\s*(cat|ls|pwd|git\s+status|git\s+diff|grep|find|head|tail)\b/.test(normalizedCommand)) {
      return {
        outcome: "trivial",
        reasonCode: "read_only_bash",
        source: "deterministic",
        toolKind: action.tool_kind,
      };
    }

    if (action.external_side_effect) {
      return {
        outcome: "notable",
        reasonCode: "external_side_effect",
        source: "deterministic",
        toolKind: action.tool_kind,
      };
    }

    return {
      outcome: "classification_failed",
      reasonCode: "unknown_bash_command",
      source: "deterministic",
      toolKind: action.tool_kind,
    };
  }

  if (action.destructive) {
    return {
      outcome: action.public_facing ? "critical" : "permanent",
      reasonCode: action.public_facing ? "destructive_public" : "destructive_local",
      source: "deterministic",
      toolKind: action.tool_kind,
    };
  }

  if (action.external_side_effect) {
    return {
      outcome: "notable",
      reasonCode: "external_side_effect",
      source: "deterministic",
      toolKind: action.tool_kind,
    };
  }

  if (action.tool_kind === "webfetch") {
    if (!isWebfetchActionShape(action)) {
      return {
        outcome: "classification_failed",
        reasonCode: "malformed_webfetch_action_shape",
        source: "deterministic",
        toolKind: action.tool_kind,
      };
    }

    if (action.known_safe_domain) {
      return {
        outcome: "trivial",
        reasonCode: "known_safe_webfetch",
        source: "deterministic",
        toolKind: action.tool_kind,
      };
    }

    return {
      outcome: "notable",
      reasonCode: "unknown_web_domain",
      source: "deterministic",
      toolKind: action.tool_kind,
    };
  }

  if (action.tool_kind === "edit") {
    if (!isEditActionShape(action)) {
      return {
        outcome: "classification_failed",
        reasonCode: "malformed_edit_action_shape",
        source: "deterministic",
        toolKind: action.tool_kind,
      };
    }

    return {
      outcome: action.operation === "delete" ? "permanent" : "routine",
      reasonCode: action.operation === "delete" ? "edit_delete" : "edit_local_write",
      source: "deterministic",
      toolKind: action.tool_kind,
    };
  }

  if (action.tool_kind === "mcp") {
    if (!isMcpActionShape(action)) {
      return {
        outcome: "classification_failed",
        reasonCode: "malformed_mcp_action_shape",
        source: "deterministic",
        toolKind: action.tool_kind,
      };
    }

    return {
      outcome: action.read_only_declared ? "routine" : "notable",
      reasonCode: action.read_only_declared ? "mcp_read_only_declared" : "mcp_side_effect_possible",
      source: "deterministic",
      toolKind: action.tool_kind,
    };
  }

  if (action.tool_kind === "computer_use") {
    if (!isComputerUseActionShape(action)) {
      return {
        outcome: "classification_failed",
        reasonCode: "malformed_computer_use_action_shape",
        source: "deterministic",
        toolKind: action.tool_kind,
      };
    }

    return {
      outcome: action.external_side_effect ? "notable" : "routine",
      reasonCode: action.external_side_effect
        ? "computer_use_external_side_effect"
        : "computer_use_local",
      source: "deterministic",
      toolKind: action.tool_kind,
    };
  }

  return {
    outcome: "classification_failed",
    reasonCode: "unhandled_known_tool_kind",
    source: "deterministic",
    toolKind: action.tool_kind,
  };
}

export function classifyFixtureAction(action: string): ClassifierSeverity {
  const normalized = action.trim().toLowerCase();
  const matched = CLASSIFIER_FIXTURES.find(
    (fixture) => fixture.action.toLowerCase() === normalized,
  );
  if (matched) return matched.expected;

  if (normalized.includes("force-push") || normalized.includes("drop database")) return "critical";
  if (normalized.includes("git push") || normalized.includes("rm -rf")) return "permanent";

  const askUserFixture = normalized.match(/^ask_user\{([^,]+),\s*last=([^:}]+):([^}]+)\}$/);
  if (askUserFixture) {
    const [, category, , outcome] = askUserFixture;
    if (category === "recovery" && outcome === "failed") return "permanent";
    if (category === "tooling_choice" && outcome === "succeeded") return "routine";
    return "notable";
  }

  if (normalized.startsWith("ask_user{")) return "notable";
  if (normalized.includes("random-") || normalized.includes("idempotent api write"))
    return "notable";
  if (
    normalized.includes("mkdir") ||
    normalized.includes("npm install") ||
    normalized.includes("edit ")
  )
    return "routine";
  return "trivial";
}

export function computeEscalationPath(params: {
  classifiedAction: ClassifiedAction;
  policy: ClassifierPolicy;
  capabilities: IntegrationCapabilities;
  sdkVersion?: string;
}): EscalationDecision {
  const sdkVersion = params.sdkVersion ?? AUTOPILOT_CLASSIFIER_VERSION;
  const version = evaluateClassifierVersionCompatibility({
    sdkVersion,
    policyVersion: params.policy.classifierVersion,
  });

  if (!version.shouldProceed) {
    return {
      steps: ["defer_for_human_review"],
      reasonCode: "version_mismatch_lockdown",
      version,
    };
  }

  if (params.classifiedAction.outcome === "classification_failed") {
    return {
      steps: ["defer_for_human_review"],
      reasonCode: "classification_failed",
      version,
    };
  }

  const maxSeverity = LATITUDE_MAX_SEVERITY[params.policy.latitude];
  if (params.policy.latitude === "lockdown") {
    return {
      steps: ["defer_for_human_review"],
      reasonCode: "latitude_lockdown",
      version,
    };
  }

  if (params.classifiedAction.outcome === "critical") {
    return {
      steps: ["defer_for_human_review"],
      reasonCode: "critical_always_defer",
      version,
    };
  }

  if (maxSeverity === "none") {
    return {
      steps: ["defer_for_human_review"],
      reasonCode: "latitude_defer_all",
      version,
    };
  }

  if (severityIndex(params.classifiedAction.outcome) > severityIndex(maxSeverity)) {
    return {
      steps: ["defer_for_human_review"],
      reasonCode: "severity_above_latitude",
      version,
    };
  }

  const requested = clampStepOrder(params.policy.escalationStrategy ?? DEFAULT_ESCALATION_STRATEGY);
  const sandboxUsable =
    isValidSandboxSnapshot(params.capabilities) &&
    supportsSandboxForToolKind(params.capabilities, params.classifiedAction.toolKind);

  if (params.policy.sandboxPreference === "required" && !sandboxUsable) {
    return {
      steps: ["defer_for_human_review"],
      reasonCode: "sandbox_required_but_unavailable",
      version,
    };
  }

  let candidate = materialSteps(requested, sandboxUsable);

  if (params.policy.sandboxPreference === "preferred") {
    candidate = prioritizeSandboxStep(candidate, sandboxUsable);
  }

  if (params.policy.sandboxPreference === "avoid") {
    candidate = candidate.filter((step) => step !== "try_in_sandbox");
  }

  if (params.policy.sandboxPreference === "required") {
    candidate = candidate.filter(
      (step) => step === "try_in_sandbox" || step === "defer_for_human_review",
    );

    if (!candidate.includes("try_in_sandbox")) {
      candidate = ["try_in_sandbox", ...candidate];
    }
  }

  if (candidate.length === 0) {
    candidate = ["defer_for_human_review"];
  }

  if (!candidate.includes("defer_for_human_review")) {
    candidate = [...candidate, "defer_for_human_review"];
  }

  return {
    steps: candidate,
    reasonCode: "escalation_strategy_selected",
    version,
  };
}
