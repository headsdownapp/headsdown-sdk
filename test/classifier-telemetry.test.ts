import { describe, expect, it } from "vitest";
import {
  AUTOPILOT_ACTION_SHAPE_VERSION,
  AUTOPILOT_CLASSIFIER_VERSION,
  CLASSIFIER_TELEMETRY_ACTION_FAMILIES,
  CLASSIFIER_TELEMETRY_CATALOG_MATCH_KEYS,
  CLASSIFIER_TELEMETRY_CLASSIFIER_LAYERS,
  CLASSIFIER_TELEMETRY_CONFIDENCE_BUCKETS,
  CLASSIFIER_TELEMETRY_DECISION_KEYS,
  CLASSIFIER_TELEMETRY_ESCALATION_REASON_CODES,
  CLASSIFIER_TELEMETRY_FAILURE_REASON_CODES,
  CLASSIFIER_TELEMETRY_MATCHER_KEYS,
  CLASSIFIER_TELEMETRY_NETWORK_TARGET_CLASSES,
  ValidationError,
  buildClassifierTelemetryManifest,
} from "../src/index.js";
import type { ClassifiedAction, EscalationDecision } from "../src/index.js";

const VERSION_OK: EscalationDecision["version"] = {
  level: "none",
  direction: "match",
  message: "Versions match.",
  shouldProceed: true,
  fallbackLatitude: null,
};

describe("classifier telemetry manifest", () => {
  it("exports canonical SDK-owned classifier telemetry vocabularies", () => {
    expect(CLASSIFIER_TELEMETRY_ACTION_FAMILIES).toEqual([
      "read",
      "local_write",
      "network_read",
      "external_side_effect",
      "destructive",
      "public_publish",
      "human_input",
      "unknown",
    ]);
    expect(CLASSIFIER_TELEMETRY_NETWORK_TARGET_CLASSES).toEqual([
      "not_applicable",
      "sdk_known_safe",
      "unknown_external",
    ]);
    expect(CLASSIFIER_TELEMETRY_CLASSIFIER_LAYERS).toEqual([
      "deterministic",
      "llm_fallback",
      "unknown_variant_fallback",
    ]);
    expect(CLASSIFIER_TELEMETRY_DECISION_KEYS).toEqual([
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
    ]);
    expect(CLASSIFIER_TELEMETRY_MATCHER_KEYS).toEqual([
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
    ]);
    expect(CLASSIFIER_TELEMETRY_CATALOG_MATCH_KEYS).toEqual([
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
    ]);
    expect(CLASSIFIER_TELEMETRY_FAILURE_REASON_CODES).toEqual([
      "classification_failed",
      "malformed_action_shape",
      "unknown_action_variant",
      "unknown_bash_command",
      "unhandled_tool_kind",
      "unknown_classifier_decision_key",
    ]);
    expect(CLASSIFIER_TELEMETRY_CONFIDENCE_BUCKETS).toEqual(["low", "medium", "high"]);
    expect(CLASSIFIER_TELEMETRY_ESCALATION_REASON_CODES).toEqual([
      "classification_failed",
      "critical_always_defer",
      "escalation_strategy_selected",
      "latitude_defer_all",
      "latitude_lockdown",
      "sandbox_required_but_unavailable",
      "severity_above_latitude",
      "version_mismatch_lockdown",
    ]);
  });

  it("keeps telemetry vocabularies unique", () => {
    for (const vocabulary of [
      CLASSIFIER_TELEMETRY_ACTION_FAMILIES,
      CLASSIFIER_TELEMETRY_NETWORK_TARGET_CLASSES,
      CLASSIFIER_TELEMETRY_CLASSIFIER_LAYERS,
      CLASSIFIER_TELEMETRY_DECISION_KEYS,
      CLASSIFIER_TELEMETRY_MATCHER_KEYS,
      CLASSIFIER_TELEMETRY_CATALOG_MATCH_KEYS,
      CLASSIFIER_TELEMETRY_FAILURE_REASON_CODES,
      CLASSIFIER_TELEMETRY_CONFIDENCE_BUCKETS,
      CLASSIFIER_TELEMETRY_ESCALATION_REASON_CODES,
    ]) {
      expect(new Set(vocabulary).size).toBe(vocabulary.length);
    }
  });

  it("derives telemetry from ClassifiedAction and safe escalation metadata", () => {
    const classifiedAction: ClassifiedAction = {
      outcome: "permanent",
      reasonCode: "edit_delete",
      source: "deterministic",
      toolKind: "edit",
    };
    const escalationDecision: EscalationDecision = {
      steps: ["try_in_sandbox", "defer_for_human_review"],
      reasonCode: "escalation_strategy_selected",
      version: VERSION_OK,
    };

    expect(
      buildClassifierTelemetryManifest({
        classifiedAction,
        actionShape: {
          tool_kind: "edit",
          operation: "delete",
          public_facing: true,
        },
        escalationDecision,
        metadata: { catalogMatchKey: "fixture_local_delete" },
      }),
    ).toEqual({
      classifierVersion: AUTOPILOT_CLASSIFIER_VERSION,
      actionShapeVersion: AUTOPILOT_ACTION_SHAPE_VERSION,
      toolKind: "edit",
      classifierLayer: "deterministic",
      classifierDecisionKey: "edit_delete",
      actionFamily: "public_publish",
      networkTargetClass: "not_applicable",
      confidenceBucket: "high",
      severity: "permanent",
      matcherKey: "edit_operation",
      catalogMatchKey: "fixture_local_delete",
      escalationReasonCode: "escalation_strategy_selected",
      escalationSteps: ["try_in_sandbox", "defer_for_human_review"],
    });
  });

  it("accepts classifier versions that match existing classifier compatibility parsing", () => {
    expect(
      buildClassifierTelemetryManifest({
        classifierVersion: "1.1",
        actionShapeVersion: "1.1",
        classifiedAction: {
          outcome: "routine",
          reasonCode: "edit_local_write",
          source: "deterministic",
          toolKind: "edit",
        },
      }),
    ).toMatchObject({
      classifierVersion: "1.1",
      actionShapeVersion: "1.1",
    });
  });

  it("omits unavailable optional fields instead of serializing undefined", () => {
    const manifest = buildClassifierTelemetryManifest({
      classifiedAction: {
        outcome: "routine",
        reasonCode: "edit_local_write",
        source: "deterministic",
        toolKind: "edit",
      },
      actionShape: { tool_kind: "edit", operation: "replace" },
    });

    expect(manifest).toMatchObject({
      classifierVersion: AUTOPILOT_CLASSIFIER_VERSION,
      actionShapeVersion: AUTOPILOT_ACTION_SHAPE_VERSION,
      toolKind: "edit",
      classifierLayer: "deterministic",
      classifierDecisionKey: "edit_local_write",
      actionFamily: "local_write",
      networkTargetClass: "not_applicable",
      confidenceBucket: "high",
      severity: "routine",
      matcherKey: "edit_operation",
    });
    expect(manifest).not.toHaveProperty("catalogMatchKey");
    expect(manifest).not.toHaveProperty("escalationReasonCode");
    expect(manifest).not.toHaveProperty("escalationSteps");
    expect(manifest).not.toHaveProperty("failureReasonCode");
    expect(JSON.stringify(manifest)).not.toContain("undefined");
  });

  it("keeps network reads as the action family and reports unknown targets separately", () => {
    expect(
      buildClassifierTelemetryManifest({
        classifiedAction: {
          outcome: "notable",
          reasonCode: "unknown_web_domain",
          source: "deterministic",
          toolKind: "webfetch",
        },
        actionShape: { tool_kind: "webfetch", url: "SHOULD_NOT_APPEAR_URL" },
      }),
    ).toMatchObject({
      actionFamily: "network_read",
      networkTargetClass: "unknown_external",
      matcherKey: "webfetch_unknown_target",
    });
  });

  it("uses failure reason codes instead of severity for classification failures", () => {
    const manifest = buildClassifierTelemetryManifest({
      classifiedAction: {
        outcome: "classification_failed",
        reasonCode: "unknown_variant_side_effect_possible",
        source: "unknown_variant_fallback",
        toolKind: "custom.vendor_action",
      },
    });

    expect(manifest).toMatchObject({
      toolKind: "custom.vendor_action",
      classifierLayer: "unknown_variant_fallback",
      classifierDecisionKey: "unknown_variant_side_effect_possible",
      actionFamily: "unknown",
      networkTargetClass: "not_applicable",
      confidenceBucket: "low",
      failureReasonCode: "unknown_action_variant",
      matcherKey: "unknown_variant_risk",
    });
    expect(manifest).not.toHaveProperty("severity");
  });

  it("uses the dedicated matcher key for unknown bash commands", () => {
    expect(
      buildClassifierTelemetryManifest({
        classifiedAction: {
          outcome: "classification_failed",
          reasonCode: "unknown_bash_command",
          source: "deterministic",
          toolKind: "bash",
        },
      }),
    ).toMatchObject({
      classifierDecisionKey: "unknown_bash_command",
      failureReasonCode: "unknown_bash_command",
      matcherKey: "bash_unknown_command",
    });
  });

  it("omits raw action-shape content from the telemetry payload", () => {
    const manifest = buildClassifierTelemetryManifest({
      classifiedAction: {
        outcome: "routine",
        reasonCode: "routine_local_bash",
        source: "deterministic",
        toolKind: "bash",
      },
      actionShape: {
        tool_kind: "bash",
        command: "SHOULD_NOT_APPEAR_COMMAND",
        raw_prompt: "SHOULD_NOT_APPEAR_PROMPT",
        terminalOutput: "SHOULD_NOT_APPEAR_OUTPUT",
      } as never,
    });

    const serialized = JSON.stringify(manifest);
    expect(serialized).not.toContain("SHOULD_NOT_APPEAR_COMMAND");
    expect(serialized).not.toContain("SHOULD_NOT_APPEAR_PROMPT");
    expect(serialized).not.toContain("SHOULD_NOT_APPEAR_OUTPUT");
  });

  it("rejects direct raw-content fields and arbitrary enum strings", () => {
    const classifiedAction: ClassifiedAction = {
      outcome: "routine",
      reasonCode: "edit_local_write",
      source: "deterministic",
      toolKind: "edit",
    };

    expect(() =>
      buildClassifierTelemetryManifest({
        classifiedAction,
        rawCommand: "SHOULD_NOT_APPEAR_COMMAND",
      } as never),
    ).toThrow(ValidationError);

    expect(() =>
      buildClassifierTelemetryManifest({
        classifiedAction,
        metadata: { promptText: "SHOULD_NOT_APPEAR_PROMPT" } as never,
      }),
    ).toThrow(ValidationError);

    expect(() =>
      buildClassifierTelemetryManifest({
        classifiedAction,
        metadata: { catalogMatchKey: "integration_defined_catalog" } as never,
      }),
    ).toThrow(ValidationError);

    expect(() =>
      buildClassifierTelemetryManifest({
        classifiedAction,
        metadata: { matcherKey: "edit_operation" } as never,
      }),
    ).toThrow(ValidationError);

    expect(() =>
      buildClassifierTelemetryManifest({
        classifiedAction,
        metadata: { actionFamily: "public_publish" } as never,
      }),
    ).toThrow(ValidationError);
  });

  it("rejects malformed classified actions and mismatched action-shape metadata", () => {
    expect(() =>
      buildClassifierTelemetryManifest({
        classifiedAction: {
          outcome: "integration_defined_outcome",
          reasonCode: "edit_local_write",
          source: "deterministic",
          toolKind: "edit",
        } as never,
      }),
    ).toThrow(ValidationError);

    expect(() =>
      buildClassifierTelemetryManifest({
        classifiedAction: {
          outcome: "routine",
          reasonCode: "edit_local_write",
          source: "deterministic",
          toolKind: "edit",
          rawCommand: "SHOULD_NOT_APPEAR_COMMAND",
        } as never,
      }),
    ).toThrow(ValidationError);

    expect(() =>
      buildClassifierTelemetryManifest({
        classifiedAction: {
          outcome: "routine",
          reasonCode: "edit_local_write",
          source: "deterministic",
          toolKind: "edit",
        },
        actionShape: { tool_kind: "bash", command: "SHOULD_NOT_APPEAR_COMMAND" },
      }),
    ).toThrow(ValidationError);
  });
});
