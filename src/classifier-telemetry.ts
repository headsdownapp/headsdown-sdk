import {
  AUTOPILOT_CLASSIFIER_VERSION,
  type ActionShape,
  type ClassifiedAction,
  type ClassifierEscalationStep,
  type ClassifierOutcome,
  type ClassifierSeverity,
  type EscalationDecision,
} from "./autopilot-classifier.js";
import { ValidationError } from "./errors.js";

export const AUTOPILOT_ACTION_SHAPE_VERSION = AUTOPILOT_CLASSIFIER_VERSION;

export const CLASSIFIER_TELEMETRY_ACTION_FAMILIES = [
  "read",
  "local_write",
  "network_read",
  "external_side_effect",
  "destructive",
  "public_publish",
  "human_input",
  "unknown",
] as const;

export const CLASSIFIER_TELEMETRY_NETWORK_TARGET_CLASSES = [
  "not_applicable",
  "sdk_known_safe",
  "unknown_external",
] as const;

export const CLASSIFIER_TELEMETRY_CLASSIFIER_LAYERS = [
  "deterministic",
  "llm_fallback",
  "unknown_variant_fallback",
] as const;

export const CLASSIFIER_TELEMETRY_DECISION_KEYS = [
  "ask_user_baseline",
  "ask_user_recovery_after_failure",
  "ask_user_tooling_choice",
  "classification_failed",
  "computer_use_external_side_effect",
  "computer_use_local",
  "critical_command_pattern",
  "destructive_local",
  "destructive_public",
  "edit_delete",
  "edit_local_write",
  "external_side_effect",
  "known_safe_webfetch",
  "malformed_ask_user_action_shape",
  "malformed_bash_action_shape",
  "malformed_computer_use_action_shape",
  "malformed_edit_action_shape",
  "malformed_mcp_action_shape",
  "malformed_webfetch_action_shape",
  "mcp_read_only_declared",
  "mcp_side_effect_possible",
  "permanent_command_pattern",
  "read_only_bash",
  "routine_local_bash",
  "unknown_bash_command",
  "unknown_variant_side_effect_possible",
  "unknown_variant_unverified_read_only",
  "unknown_web_domain",
  "unclassified_unknown",
  "unhandled_known_tool_kind",
] as const;

export const CLASSIFIER_TELEMETRY_MATCHER_KEYS = [
  "ask_user_context",
  "bash_critical_command_pattern",
  "bash_permanent_command_pattern",
  "bash_read_only_pattern",
  "bash_routine_local_pattern",
  "bash_unknown_command",
  "computer_use_side_effect_flags",
  "edit_operation",
  "malformed_action_shape",
  "mcp_read_only_declaration",
  "side_effect_flags",
  "unknown_variant_risk",
  "unhandled_tool_kind",
  "webfetch_known_safe_flag",
  "webfetch_unknown_target",
] as const;

export const CLASSIFIER_TELEMETRY_CATALOG_MATCH_KEYS = [
  "fixture_known_read",
  "fixture_local_directory_create",
  "fixture_local_package_install",
  "fixture_unknown_network_fetch",
  "fixture_local_delete",
  "fixture_identity_publish",
  "fixture_high_risk_publish",
  "fixture_destructive_data_operation",
  "fixture_ask_user_recovery_after_failure",
  "fixture_ask_user_tooling_choice",
  "fixture_ask_user_scope_clarification",
  "fixture_ask_user_approval_request",
] as const;

export const CLASSIFIER_TELEMETRY_FAILURE_REASON_CODES = [
  "classification_failed",
  "malformed_action_shape",
  "unknown_action_variant",
  "unknown_bash_command",
  "unhandled_tool_kind",
  "unknown_classifier_decision_key",
] as const;

export const CLASSIFIER_TELEMETRY_CONFIDENCE_BUCKETS = ["low", "medium", "high"] as const;

export const CLASSIFIER_TELEMETRY_ESCALATION_REASON_CODES = [
  "classification_failed",
  "critical_always_defer",
  "escalation_strategy_selected",
  "latitude_defer_all",
  "latitude_lockdown",
  "sandbox_required_but_unavailable",
  "severity_above_latitude",
  "version_mismatch_lockdown",
] as const;

export type ClassifierTelemetryActionFamily = (typeof CLASSIFIER_TELEMETRY_ACTION_FAMILIES)[number];
export type ClassifierTelemetryNetworkTargetClass =
  (typeof CLASSIFIER_TELEMETRY_NETWORK_TARGET_CLASSES)[number];
export type ClassifierTelemetryClassifierLayer =
  (typeof CLASSIFIER_TELEMETRY_CLASSIFIER_LAYERS)[number];
export type ClassifierTelemetryDecisionKey = (typeof CLASSIFIER_TELEMETRY_DECISION_KEYS)[number];
export type ClassifierTelemetryMatcherKey = (typeof CLASSIFIER_TELEMETRY_MATCHER_KEYS)[number];
export type ClassifierTelemetryCatalogMatchKey =
  (typeof CLASSIFIER_TELEMETRY_CATALOG_MATCH_KEYS)[number];
export type ClassifierTelemetryFailureReasonCode =
  (typeof CLASSIFIER_TELEMETRY_FAILURE_REASON_CODES)[number];
export type ClassifierTelemetryConfidenceBucket =
  (typeof CLASSIFIER_TELEMETRY_CONFIDENCE_BUCKETS)[number];
export type ClassifierTelemetryEscalationReasonCode =
  (typeof CLASSIFIER_TELEMETRY_ESCALATION_REASON_CODES)[number];

export interface ClassifierTelemetryManifest {
  classifierVersion: string;
  actionShapeVersion: string;
  toolKind: string;
  classifierLayer: ClassifierTelemetryClassifierLayer;
  classifierDecisionKey: ClassifierTelemetryDecisionKey;
  actionFamily: ClassifierTelemetryActionFamily;
  networkTargetClass: ClassifierTelemetryNetworkTargetClass;
  confidenceBucket: ClassifierTelemetryConfidenceBucket;
  severity?: ClassifierSeverity;
  failureReasonCode?: ClassifierTelemetryFailureReasonCode;
  matcherKey?: ClassifierTelemetryMatcherKey;
  catalogMatchKey?: ClassifierTelemetryCatalogMatchKey;
  escalationReasonCode?: ClassifierTelemetryEscalationReasonCode;
  escalationSteps?: ClassifierEscalationStep[];
}

export interface ClassifierTelemetryDerivationMetadata {
  matcherKey?: ClassifierTelemetryMatcherKey;
  catalogMatchKey?: ClassifierTelemetryCatalogMatchKey;
}

export interface BuildClassifierTelemetryManifestInput {
  classifiedAction: ClassifiedAction;
  actionShape?: ActionShape;
  escalationDecision?: EscalationDecision;
  classifierVersion?: string;
  actionShapeVersion?: string;
  metadata?: ClassifierTelemetryDerivationMetadata;
}

const INPUT_FIELDS = new Set([
  "classifiedAction",
  "actionShape",
  "escalationDecision",
  "classifierVersion",
  "actionShapeVersion",
  "metadata",
]);

const CLASSIFIED_ACTION_FIELDS = new Set(["outcome", "reasonCode", "source", "toolKind"]);

const METADATA_FIELDS = new Set(["matcherKey", "catalogMatchKey"]);

const RAW_CONTENT_KEY_PARTS = [
  "arg",
  "branch",
  "code",
  "command",
  "content",
  "diff",
  "domain",
  "file",
  "hash",
  "log",
  "output",
  "path",
  "prompt",
  "reasoning",
  "repo",
  "repository",
  "source",
  "terminal",
  "transcript",
  "url",
] as const;

const CLASSIFIER_ESCALATION_STEPS: ClassifierEscalationStep[] = [
  "try_alternative",
  "try_in_sandbox",
  "defer_to_end_of_run",
  "defer_for_human_review",
];

const CLASSIFIER_OUTCOMES = [
  "trivial",
  "routine",
  "notable",
  "permanent",
  "critical",
  "classification_failed",
] as const satisfies readonly ClassifierOutcome[];

const MATCHER_KEY_BY_DECISION_KEY: Partial<
  Record<ClassifierTelemetryDecisionKey, ClassifierTelemetryMatcherKey>
> = {
  ask_user_baseline: "ask_user_context",
  ask_user_recovery_after_failure: "ask_user_context",
  ask_user_tooling_choice: "ask_user_context",
  computer_use_external_side_effect: "computer_use_side_effect_flags",
  computer_use_local: "computer_use_side_effect_flags",
  critical_command_pattern: "bash_critical_command_pattern",
  destructive_local: "side_effect_flags",
  destructive_public: "side_effect_flags",
  edit_delete: "edit_operation",
  edit_local_write: "edit_operation",
  external_side_effect: "side_effect_flags",
  known_safe_webfetch: "webfetch_known_safe_flag",
  malformed_ask_user_action_shape: "malformed_action_shape",
  malformed_bash_action_shape: "malformed_action_shape",
  malformed_computer_use_action_shape: "malformed_action_shape",
  malformed_edit_action_shape: "malformed_action_shape",
  malformed_mcp_action_shape: "malformed_action_shape",
  malformed_webfetch_action_shape: "malformed_action_shape",
  mcp_read_only_declared: "mcp_read_only_declaration",
  mcp_side_effect_possible: "mcp_read_only_declaration",
  permanent_command_pattern: "bash_permanent_command_pattern",
  read_only_bash: "bash_read_only_pattern",
  routine_local_bash: "bash_routine_local_pattern",
  unknown_bash_command: "bash_unknown_command",
  unknown_variant_side_effect_possible: "unknown_variant_risk",
  unknown_variant_unverified_read_only: "unknown_variant_risk",
  unknown_web_domain: "webfetch_unknown_target",
  unhandled_known_tool_kind: "unhandled_tool_kind",
};

const FAILURE_REASON_BY_DECISION_KEY: Partial<
  Record<ClassifierTelemetryDecisionKey, ClassifierTelemetryFailureReasonCode>
> = {
  malformed_ask_user_action_shape: "malformed_action_shape",
  malformed_bash_action_shape: "malformed_action_shape",
  malformed_computer_use_action_shape: "malformed_action_shape",
  malformed_edit_action_shape: "malformed_action_shape",
  malformed_mcp_action_shape: "malformed_action_shape",
  malformed_webfetch_action_shape: "malformed_action_shape",
  unknown_bash_command: "unknown_bash_command",
  unknown_variant_side_effect_possible: "unknown_action_variant",
  unknown_variant_unverified_read_only: "unknown_action_variant",
  unclassified_unknown: "unknown_classifier_decision_key",
  unhandled_known_tool_kind: "unhandled_tool_kind",
};

export function buildClassifierTelemetryManifest(
  input: BuildClassifierTelemetryManifestInput,
): ClassifierTelemetryManifest {
  assertExpectedObject(input, INPUT_FIELDS, "classifierTelemetry");
  assertExpectedObject(input.classifiedAction, CLASSIFIED_ACTION_FIELDS, "classifiedAction");

  const metadata = input.metadata;
  if (metadata !== undefined) {
    assertExpectedObject(metadata, METADATA_FIELDS, "classifierTelemetry.metadata");
  }

  const classifierVersion = normalizeVersion(
    input.classifierVersion ?? AUTOPILOT_CLASSIFIER_VERSION,
    "classifierTelemetry.classifierVersion",
  );
  const actionShapeVersion = normalizeVersion(
    input.actionShapeVersion ?? AUTOPILOT_ACTION_SHAPE_VERSION,
    "classifierTelemetry.actionShapeVersion",
  );
  const toolKind = normalizeToolKind(input.classifiedAction.toolKind);
  validateActionShapeToolKind(input.actionShape, toolKind);

  const classifierOutcome = assertKnownValue(
    input.classifiedAction.outcome,
    CLASSIFIER_OUTCOMES,
    "classifiedAction.outcome",
  );
  const classifierLayer = assertKnownValue(
    input.classifiedAction.source,
    CLASSIFIER_TELEMETRY_CLASSIFIER_LAYERS,
    "classifiedAction.source",
  );
  const classifierDecisionKey = normalizeDecisionKey(input.classifiedAction.reasonCode);
  const confidenceBucket = deriveConfidenceBucket(classifierOutcome, classifierLayer);
  const actionFamily = deriveActionFamily(
    input.actionShape,
    input.classifiedAction,
    classifierDecisionKey,
  );
  const networkTargetClass = deriveNetworkTargetClass(
    input.actionShape,
    input.classifiedAction,
    classifierDecisionKey,
  );

  const manifest: ClassifierTelemetryManifest = {
    classifierVersion,
    actionShapeVersion,
    toolKind,
    classifierLayer,
    classifierDecisionKey,
    actionFamily,
    networkTargetClass,
    confidenceBucket,
  };

  if (classifierOutcome === "classification_failed") {
    manifest.failureReasonCode =
      FAILURE_REASON_BY_DECISION_KEY[classifierDecisionKey] ?? "classification_failed";
  } else {
    manifest.severity = classifierOutcome;
  }

  const matcherKey = metadata?.matcherKey ?? MATCHER_KEY_BY_DECISION_KEY[classifierDecisionKey];
  if (matcherKey !== undefined) {
    manifest.matcherKey = assertKnownValue(
      matcherKey,
      CLASSIFIER_TELEMETRY_MATCHER_KEYS,
      "classifierTelemetry.metadata.matcherKey",
    );
  }

  if (metadata?.catalogMatchKey !== undefined) {
    manifest.catalogMatchKey = assertKnownValue(
      metadata.catalogMatchKey,
      CLASSIFIER_TELEMETRY_CATALOG_MATCH_KEYS,
      "classifierTelemetry.metadata.catalogMatchKey",
    );
  }

  if (input.escalationDecision !== undefined) {
    manifest.escalationReasonCode = assertKnownValue(
      input.escalationDecision.reasonCode,
      CLASSIFIER_TELEMETRY_ESCALATION_REASON_CODES,
      "escalationDecision.reasonCode",
    );
    manifest.escalationSteps = normalizeEscalationSteps(input.escalationDecision.steps);
  }

  return manifest;
}

function normalizeVersion(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^\d+\.\d+(?:\.\d+)?$/.test(value)) {
    throw new ValidationError(
      "Classifier telemetry versions must use major.minor or major.minor.patch format.",
      field,
    );
  }

  return value;
}

function normalizeToolKind(value: unknown): string {
  if (typeof value !== "string" || !/^[a-z][a-z0-9._:-]{0,79}$/.test(value)) {
    throw new ValidationError(
      "Classifier telemetry toolKind must be a stable SDK action-shape identifier.",
      "classifiedAction.toolKind",
    );
  }

  return value;
}

function validateActionShapeToolKind(actionShape: ActionShape | undefined, toolKind: string): void {
  if (actionShape === undefined) return;

  if (typeof actionShape !== "object" || actionShape === null || Array.isArray(actionShape)) {
    throw new ValidationError("classifierTelemetry.actionShape must be an object.", "actionShape");
  }

  const actionShapeToolKind = (actionShape as { tool_kind?: unknown }).tool_kind;
  if (actionShapeToolKind !== toolKind) {
    throw new ValidationError(
      "classifierTelemetry.actionShape.tool_kind must match classifiedAction.toolKind.",
      "actionShape.tool_kind",
    );
  }
}

function normalizeDecisionKey(reasonCode: unknown): ClassifierTelemetryDecisionKey {
  if (typeof reasonCode !== "string" || reasonCode.length === 0) {
    throw new ValidationError(
      "classifiedAction.reasonCode must be a non-empty string.",
      "classifiedAction.reasonCode",
    );
  }

  if (isKnownValue(reasonCode, CLASSIFIER_TELEMETRY_DECISION_KEYS)) return reasonCode;
  return "unclassified_unknown";
}

function deriveConfidenceBucket(
  outcome: ClassifierOutcome,
  classifierLayer: ClassifierTelemetryClassifierLayer,
): ClassifierTelemetryConfidenceBucket {
  if (outcome === "classification_failed") return "low";
  if (classifierLayer === "llm_fallback") return "medium";
  if (classifierLayer === "unknown_variant_fallback") return "low";
  return "high";
}

function deriveActionFamily(
  actionShape: ActionShape | undefined,
  classifiedAction: ClassifiedAction,
  decisionKey: ClassifierTelemetryDecisionKey,
): ClassifierTelemetryActionFamily {
  if (
    classifiedAction.toolKind === "interaction.ask_user" ||
    actionShape?.tool_kind === "interaction.ask_user"
  ) {
    return "human_input";
  }

  if (decisionKey === "critical_command_pattern" || actionShape?.public_facing === true) {
    return "public_publish";
  }

  if (
    actionShape?.destructive === true ||
    decisionKey === "destructive_local" ||
    decisionKey === "destructive_public" ||
    decisionKey === "edit_delete" ||
    decisionKey === "permanent_command_pattern"
  ) {
    return "destructive";
  }

  if (
    actionShape?.external_side_effect === true ||
    decisionKey === "external_side_effect" ||
    decisionKey === "mcp_side_effect_possible" ||
    decisionKey === "computer_use_external_side_effect"
  ) {
    return "external_side_effect";
  }

  if (classifiedAction.toolKind === "webfetch" || actionShape?.tool_kind === "webfetch") {
    return "network_read";
  }

  if (
    decisionKey === "routine_local_bash" ||
    decisionKey === "edit_local_write" ||
    decisionKey === "computer_use_local"
  ) {
    return "local_write";
  }

  if (
    decisionKey === "read_only_bash" ||
    decisionKey === "known_safe_webfetch" ||
    decisionKey === "mcp_read_only_declared"
  ) {
    return "read";
  }

  return "unknown";
}

function deriveNetworkTargetClass(
  actionShape: ActionShape | undefined,
  classifiedAction: ClassifiedAction,
  decisionKey: ClassifierTelemetryDecisionKey,
): ClassifierTelemetryNetworkTargetClass {
  if (classifiedAction.toolKind !== "webfetch" && actionShape?.tool_kind !== "webfetch") {
    return "not_applicable";
  }

  if (decisionKey === "known_safe_webfetch") return "sdk_known_safe";

  if (
    actionShape?.tool_kind === "webfetch" &&
    "known_safe_domain" in actionShape &&
    actionShape.known_safe_domain === true
  ) {
    return "sdk_known_safe";
  }

  return "unknown_external";
}

function normalizeEscalationSteps(value: unknown): ClassifierEscalationStep[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(
      "escalationDecision.steps must be an array.",
      "escalationDecision.steps",
    );
  }

  return value.map((step, index) =>
    assertKnownValue(step, CLASSIFIER_ESCALATION_STEPS, `escalationDecision.steps.${index}`),
  );
}

function assertExpectedObject(value: unknown, allowedFields: Set<string>, field: string): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError("Classifier telemetry input must be an object.", field);
  }

  for (const key of Object.keys(value)) {
    if (allowedFields.has(key)) continue;

    const normalized = key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    if (RAW_CONTENT_KEY_PARTS.some((part) => normalized.includes(part))) {
      throw new ValidationError(
        "Classifier telemetry input cannot include raw local content.",
        `${field}.${key}`,
      );
    }

    throw new ValidationError(
      "Classifier telemetry input includes an unknown field.",
      `${field}.${key}`,
    );
  }
}

function assertKnownValue<T extends string>(
  value: unknown,
  values: readonly T[],
  field: string,
): T {
  if (isKnownValue(value, values)) return value;
  throw new ValidationError("Classifier telemetry value is not SDK-owned.", field);
}

function isKnownValue<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}
