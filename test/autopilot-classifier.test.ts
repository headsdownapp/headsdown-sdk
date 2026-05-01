import { describe, expect, it } from "vitest";
import {
  AUTOPILOT_CLASSIFIER_VERSION,
  buildClassifierPromptFragments,
  classifyActionShapeFallback,
  classifyFixtureAction,
  computeEscalationPath,
  evaluateClassifierVersionCompatibility,
} from "../src/autopilot-classifier.js";

describe("autopilot classifier substrate", () => {
  it("classifies fixture actions to expected severities", () => {
    expect(classifyFixtureAction("fetch github.com README")).toBe("trivial");
    expect(classifyFixtureAction("mkdir local/dir")).toBe("routine");
    expect(classifyFixtureAction("npm install in project dir")).toBe("routine");
    expect(classifyFixtureAction("fetch random-blog.tld/x.pdf")).toBe("notable");
    expect(classifyFixtureAction("rm -rf project-subdir")).toBe("permanent");
    expect(classifyFixtureAction("git push origin main")).toBe("permanent");
    expect(classifyFixtureAction("force-push origin main")).toBe("critical");
    expect(classifyFixtureAction("drop database")).toBe("critical");
  });

  it("builds stable prompt fragments with taxonomy and fixture references", () => {
    const fragments = buildClassifierPromptFragments({
      latitude: "balanced",
      identityActionOverrides: ["identity_action:git_push"],
      houseRules: ["prefer_dry_run", "defer_publishes"],
    });

    expect(fragments.taxonomyFragment).toContain("Tier 1 (Trivial / trivial)");
    expect(fragments.taxonomyFragment).toContain("force-push origin main => critical");
    expect(fragments.policyFragment).toContain("Latitude: balanced");
    expect(fragments.policyFragment).toContain("Max severity attemptable: notable");
    expect(fragments.instructionsFragment).toContain("return classification_failed");
    expect(fragments.fullSystemAddendum).toContain("Output JSON only");
  });

  it("handles sandbox required with missing capability conservatively", () => {
    const decision = computeEscalationPath({
      classifiedAction: {
        outcome: "notable",
        reasonCode: "external_side_effect",
        source: "deterministic",
        toolKind: "webfetch",
      },
      policy: {
        classifierVersion: AUTOPILOT_CLASSIFIER_VERSION,
        latitude: "balanced",
        sandboxPreference: "required",
      },
      capabilities: {
        classifierVersion: AUTOPILOT_CLASSIFIER_VERSION,
        capturedAt: "2026-04-29T00:00:00Z",
        sandbox: {
          available: false,
          fsIsolation: "none",
          networkIsolation: "none",
          identityIsolation: "none",
        },
        toolKinds: ["bash", "edit", "webfetch", "mcp", "computer_use"],
      },
    });

    expect(decision.steps).toEqual(["defer_for_human_review"]);
    expect(decision.reasonCode).toBe("sandbox_required_but_unavailable");
  });

  it("returns sandbox required unavailable when tool kind is unsupported", () => {
    const decision = computeEscalationPath({
      classifiedAction: {
        outcome: "routine",
        reasonCode: "edit_local_write",
        source: "deterministic",
        toolKind: "bash",
      },
      policy: {
        classifierVersion: AUTOPILOT_CLASSIFIER_VERSION,
        latitude: "balanced",
        sandboxPreference: "required",
      },
      capabilities: {
        classifierVersion: AUTOPILOT_CLASSIFIER_VERSION,
        capturedAt: "2026-04-29T00:00:00Z",
        sandbox: {
          available: true,
          modes: ["edit_only"],
          fsIsolation: "ephemeral",
          networkIsolation: "allowlist",
          identityIsolation: "isolated",
        },
        toolKinds: ["edit", "webfetch", "mcp", "computer_use"],
      },
    });

    expect(decision.steps).toEqual(["defer_for_human_review"]);
    expect(decision.reasonCode).toBe("sandbox_required_but_unavailable");
  });

  it("classifies unknown action variants conservatively", () => {
    const unknown = classifyActionShapeFallback({
      tool_kind: "interaction.ask_user",
      side_effect_risk: "possible",
    });

    expect(unknown.outcome).toBe("classification_failed");
    expect(unknown.reasonCode).toBe("unknown_variant_side_effect_possible");
    expect(unknown.source).toBe("unknown_variant_fallback");
  });

  it("fails closed for unknown variants even when claimed low risk is unverified", () => {
    const unknown = classifyActionShapeFallback({
      tool_kind: "interaction.ask_user",
      side_effect_risk: "none",
    });

    expect(unknown.outcome).toBe("classification_failed");
    expect(unknown.reasonCode).toBe("unknown_variant_unverified_read_only");
  });

  it("fails closed when unknown variant flags conflict with claimed low risk", () => {
    const unknown = classifyActionShapeFallback({
      tool_kind: "interaction.ask_user",
      side_effect_risk: "none",
      external_side_effect: true,
    });

    expect(unknown.outcome).toBe("classification_failed");
    expect(unknown.reasonCode).toBe("unknown_variant_side_effect_possible");
  });

  it("fails closed for malformed known action shapes", () => {
    const malformed = classifyActionShapeFallback({ tool_kind: "bash" } as never);

    expect(malformed.outcome).toBe("classification_failed");
    expect(malformed.reasonCode).toBe("malformed_bash_action_shape");
  });

  it("classifies publish commands as critical", () => {
    const published = classifyActionShapeFallback({
      tool_kind: "bash",
      command: "npm publish",
      external_side_effect: true,
    });

    expect(published.outcome).toBe("critical");
    expect(published.reasonCode).toBe("critical_command_pattern");
  });

  it("does not downgrade destructive public bash actions", () => {
    const destructivePublic = classifyActionShapeFallback({
      tool_kind: "bash",
      command: "cat package.json",
      destructive: true,
      public_facing: true,
    });

    expect(destructivePublic.outcome).toBe("critical");
    expect(destructivePublic.reasonCode).toBe("destructive_public");
  });

  it("classifies destructive public non-bash variants as critical", () => {
    const edit = classifyActionShapeFallback({
      tool_kind: "edit",
      operation: "replace",
      destructive: true,
      public_facing: true,
    });
    const mcp = classifyActionShapeFallback({
      tool_kind: "mcp",
      server: "example",
      tool: "mutate",
      destructive: true,
      public_facing: true,
    });
    const computerUse = classifyActionShapeFallback({
      tool_kind: "computer_use",
      action: "click",
      destructive: true,
      public_facing: true,
    });

    expect(edit.outcome).toBe("critical");
    expect(mcp.outcome).toBe("critical");
    expect(computerUse.outcome).toBe("critical");
  });

  it("evaluates version mismatch behavior for major and minor drift", () => {
    const majorMismatch = evaluateClassifierVersionCompatibility({
      sdkVersion: "1.0.0",
      policyVersion: "2.0.0",
    });
    expect(majorMismatch.level).toBe("error");
    expect(majorMismatch.direction).toBe("major_mismatch");
    expect(majorMismatch.shouldProceed).toBe(false);
    expect(majorMismatch.fallbackLatitude).toBe("lockdown");

    const backendAhead = evaluateClassifierVersionCompatibility({
      sdkVersion: "1.0.0",
      policyVersion: "1.2.0",
    });
    expect(backendAhead.level).toBe("warning");
    expect(backendAhead.direction).toBe("backend_ahead");
    expect(backendAhead.shouldProceed).toBe(true);

    const sdkAhead = evaluateClassifierVersionCompatibility({
      sdkVersion: "1.2.0",
      policyVersion: "1.0.0",
    });
    expect(sdkAhead.level).toBe("error");
    expect(sdkAhead.direction).toBe("sdk_ahead");
    expect(sdkAhead.shouldProceed).toBe(false);
  });

  it("returns deterministic escalation decisions and respects strategy order", () => {
    const input = {
      classifiedAction: {
        outcome: "routine" as const,
        reasonCode: "edit_local_write",
        source: "deterministic" as const,
        toolKind: "edit",
      },
      policy: {
        classifierVersion: AUTOPILOT_CLASSIFIER_VERSION,
        latitude: "cautious" as const,
        escalationStrategy: [
          "try_in_sandbox",
          "try_alternative",
          "defer_for_human_review",
        ] as const,
      },
      capabilities: {
        classifierVersion: AUTOPILOT_CLASSIFIER_VERSION,
        capturedAt: "2026-04-29T00:00:00Z",
        sandbox: {
          available: true,
          modes: ["edit_only"],
          fsIsolation: "ephemeral",
          networkIsolation: "allowlist",
          identityIsolation: "isolated",
        },
        toolKinds: ["bash", "edit", "webfetch", "mcp", "computer_use"],
      },
    };

    const first = computeEscalationPath(input);
    const second = computeEscalationPath(input);

    expect(first).toEqual(second);
    expect(first.steps[0]).toBe("try_in_sandbox");
    expect(first.steps[1]).toBe("try_alternative");
    expect(first.steps[first.steps.length - 1]).toBe("defer_for_human_review");
  });

  it("prefers try_in_sandbox first when sandboxPreference is preferred and sandbox is usable", () => {
    const decision = computeEscalationPath({
      classifiedAction: {
        outcome: "routine",
        reasonCode: "edit_local_write",
        source: "deterministic",
        toolKind: "edit",
      },
      policy: {
        classifierVersion: AUTOPILOT_CLASSIFIER_VERSION,
        latitude: "balanced",
        sandboxPreference: "preferred",
        escalationStrategy: ["try_alternative", "try_in_sandbox", "defer_for_human_review"],
      },
      capabilities: {
        classifierVersion: AUTOPILOT_CLASSIFIER_VERSION,
        capturedAt: "2026-04-29T00:00:00Z",
        sandbox: {
          available: true,
          modes: ["edit_only"],
          fsIsolation: "ephemeral",
          networkIsolation: "allowlist",
          identityIsolation: "isolated",
        },
        toolKinds: ["bash", "edit", "webfetch", "mcp", "computer_use"],
      },
    });

    expect(decision.steps[0]).toBe("try_in_sandbox");
  });

  it("skips try_in_sandbox when sandboxPreference is avoid", () => {
    const decision = computeEscalationPath({
      classifiedAction: {
        outcome: "routine",
        reasonCode: "edit_local_write",
        source: "deterministic",
        toolKind: "edit",
      },
      policy: {
        classifierVersion: AUTOPILOT_CLASSIFIER_VERSION,
        latitude: "balanced",
        sandboxPreference: "avoid",
        escalationStrategy: ["try_in_sandbox", "try_alternative", "defer_for_human_review"],
      },
      capabilities: {
        classifierVersion: AUTOPILOT_CLASSIFIER_VERSION,
        capturedAt: "2026-04-29T00:00:00Z",
        sandbox: {
          available: true,
          modes: ["edit_only"],
          fsIsolation: "ephemeral",
          networkIsolation: "allowlist",
          identityIsolation: "isolated",
        },
        toolKinds: ["bash", "edit", "webfetch", "mcp", "computer_use"],
      },
    });

    expect(decision.steps).toEqual(["try_alternative", "defer_for_human_review"]);
  });

  it("skips try_in_sandbox when capabilities do not support the action tool kind", () => {
    const decision = computeEscalationPath({
      classifiedAction: {
        outcome: "routine",
        reasonCode: "edit_local_write",
        source: "deterministic",
        toolKind: "bash",
      },
      policy: {
        classifierVersion: AUTOPILOT_CLASSIFIER_VERSION,
        latitude: "balanced",
        escalationStrategy: ["try_in_sandbox", "try_alternative", "defer_for_human_review"],
      },
      capabilities: {
        classifierVersion: AUTOPILOT_CLASSIFIER_VERSION,
        capturedAt: "2026-04-29T00:00:00Z",
        sandbox: {
          available: true,
          modes: ["edit_only"],
          fsIsolation: "ephemeral",
          networkIsolation: "allowlist",
          identityIsolation: "isolated",
        },
        toolKinds: ["edit", "webfetch", "mcp", "computer_use"],
      },
    });

    expect(decision.steps).toEqual(["try_alternative", "defer_for_human_review"]);
  });

  it("returns lockdown reason code for lockdown latitude", () => {
    const decision = computeEscalationPath({
      classifiedAction: {
        outcome: "routine",
        reasonCode: "edit_local_write",
        source: "deterministic",
        toolKind: "edit",
      },
      policy: {
        classifierVersion: AUTOPILOT_CLASSIFIER_VERSION,
        latitude: "lockdown",
      },
      capabilities: {
        classifierVersion: AUTOPILOT_CLASSIFIER_VERSION,
        capturedAt: "2026-04-29T00:00:00Z",
        sandbox: {
          available: true,
          modes: ["edit_only"],
          fsIsolation: "ephemeral",
          networkIsolation: "allowlist",
          identityIsolation: "isolated",
        },
        toolKinds: ["bash", "edit", "webfetch", "mcp", "computer_use"],
      },
    });

    expect(decision.steps).toEqual(["defer_for_human_review"]);
    expect(decision.reasonCode).toBe("latitude_lockdown");
  });

  it("never returns an empty escalation path in pseudo property sweep", () => {
    const latitudes = ["hold", "verify", "balanced", "cautious", "lockdown"] as const;
    const outcomes = [
      "trivial",
      "routine",
      "notable",
      "permanent",
      "critical",
      "classification_failed",
    ] as const;

    for (const latitude of latitudes) {
      for (const outcome of outcomes) {
        const decision = computeEscalationPath({
          classifiedAction: {
            outcome,
            reasonCode: "test",
            source: "deterministic",
            toolKind: "bash",
          },
          policy: {
            classifierVersion: AUTOPILOT_CLASSIFIER_VERSION,
            latitude,
            escalationStrategy: [
              "try_alternative",
              "try_in_sandbox",
              "defer_to_end_of_run",
              "defer_for_human_review",
            ],
          },
          capabilities: {
            classifierVersion: AUTOPILOT_CLASSIFIER_VERSION,
            capturedAt: "2026-04-29T00:00:00Z",
            sandbox: {
              available: outcome !== "critical",
              modes: ["bash"],
              fsIsolation: "cwd_only",
              networkIsolation: "allowlist",
              identityIsolation: "isolated",
            },
            toolKinds: ["bash", "edit", "webfetch", "mcp", "computer_use"],
          },
        });

        expect(decision.steps.length).toBeGreaterThan(0);
        expect(decision.steps[decision.steps.length - 1]).toBe("defer_for_human_review");

        if (outcome === "classification_failed") {
          expect(decision.steps).toEqual(["defer_for_human_review"]);
          expect(decision.reasonCode).toBe("classification_failed");
        }
      }
    }
  });
});
