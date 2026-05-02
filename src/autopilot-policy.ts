import { assertPrivacySafe } from "./agent-run-events.js";
import type {
  ClassifierEscalationStep,
  ClassifierLatitude,
  ClassifierPolicy,
} from "./autopilot-classifier.js";
import type { HeadsDownClient } from "./client.js";
import { ValidationError } from "./errors.js";
import { AUTOPILOT_POLICY_QUERY } from "./queries.js";
import type { Mode } from "./types.js";

export { AUTOPILOT_POLICY_QUERY } from "./queries.js";

export interface AutopilotPolicyIdentityActionOverrideResponse {
  actionKey: string;
  strategy: string;
}

export interface AutopilotPolicyResponse {
  classifierVersion: string;
  latitude: string;
  escalationStrategy?: string[] | null;
  sandboxPreference?: string | null;
  identityActionOverrides?: AutopilotPolicyIdentityActionOverrideResponse[] | string[] | null;
  houseRules?: string | string[] | null;
}

export async function fetchAutopilotPolicy(
  client: HeadsDownClient,
  mode: Mode,
): Promise<ClassifierPolicy> {
  const transport = (client as unknown as { graphql?: { request?: Function } }).graphql;
  if (!transport || typeof transport.request !== "function") {
    throw new ValidationError("HeadsDownClient GraphQL transport is unavailable.", "client");
  }

  const data = await transport.request(AUTOPILOT_POLICY_QUERY, { mode: toGraphQLEnum(mode) });
  const policy = normalizeAutopilotPolicy((data as { autopilotPolicy?: unknown }).autopilotPolicy);
  assertAutopilotPolicy(policy);
  return policy;
}

export function assertAutopilotPolicy(value: unknown): asserts value is ClassifierPolicy {
  const policy = value as Partial<ClassifierPolicy> | null;
  if (!policy || typeof policy !== "object") {
    throw new ValidationError("Autopilot policy is required.", "autopilotPolicy");
  }
  if (typeof policy.classifierVersion !== "string" || !policy.classifierVersion.trim()) {
    throw new ValidationError(
      "classifierVersion is required.",
      "autopilotPolicy.classifierVersion",
    );
  }
  if (!isLatitude(policy.latitude)) {
    throw new ValidationError("latitude is invalid.", "autopilotPolicy.latitude");
  }
  if (
    policy.escalationStrategy !== undefined &&
    (!Array.isArray(policy.escalationStrategy) ||
      !policy.escalationStrategy.every(isEscalationStep))
  ) {
    throw new ValidationError(
      "escalationStrategy is invalid.",
      "autopilotPolicy.escalationStrategy",
    );
  }
  if (
    policy.identityActionOverrides !== undefined &&
    !isStringArray(policy.identityActionOverrides)
  ) {
    throw new ValidationError(
      "identityActionOverrides is invalid.",
      "autopilotPolicy.identityActionOverrides",
    );
  }
  if (policy.houseRules !== undefined && !isStringArray(policy.houseRules)) {
    throw new ValidationError("houseRules is invalid.", "autopilotPolicy.houseRules");
  }
  if (policy.sandboxPreference !== undefined && !isSandboxPreference(policy.sandboxPreference)) {
    throw new ValidationError("sandboxPreference is invalid.", "autopilotPolicy.sandboxPreference");
  }
  assertPrivacySafe(policy, "autopilotPolicy");
}

function normalizeAutopilotPolicy(value: unknown): ClassifierPolicy {
  if (!value || typeof value !== "object") {
    throw new ValidationError("autopilotPolicy response is missing.", "autopilotPolicy");
  }
  const raw = value as Record<string, unknown>;
  return stripUndefined({
    classifierVersion: requireString(raw.classifierVersion, "classifierVersion"),
    latitude: normalizeLatitude(raw.latitude),
    escalationStrategy: normalizeEscalationStrategy(raw.escalationStrategy),
    sandboxPreference: normalizeSandboxPreference(raw.sandboxPreference),
    identityActionOverrides: normalizeIdentityActionOverrides(raw.identityActionOverrides),
    houseRules: normalizeHouseRules(raw.houseRules),
  });
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`${field} is required.`, `autopilotPolicy.${field}`);
  }
  return value.trim();
}

function normalizeLatitude(value: unknown): ClassifierLatitude {
  const normalized = normalizeEnumToken(value);
  if (isLatitude(normalized)) return normalized;
  throw new ValidationError("latitude is invalid.", "autopilotPolicy.latitude");
}

function normalizeEscalationStrategy(value: unknown): ClassifierEscalationStep[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) {
    throw new ValidationError(
      "escalationStrategy is invalid.",
      "autopilotPolicy.escalationStrategy",
    );
  }
  const normalized = value.map(normalizeEnumToken);
  if (!normalized.every(isEscalationStep)) {
    throw new ValidationError(
      "escalationStrategy is invalid.",
      "autopilotPolicy.escalationStrategy",
    );
  }
  return normalized;
}

function normalizeSandboxPreference(
  value: unknown,
): "preferred" | "required" | "avoid" | undefined {
  if (value === undefined || value === null) return undefined;
  const normalized = normalizeEnumToken(value);
  if (normalized === "optional") return undefined;
  if (normalized === "disabled") return "avoid";
  if (isSandboxPreference(normalized)) return normalized;
  throw new ValidationError("sandboxPreference is invalid.", "autopilotPolicy.sandboxPreference");
}

function normalizeIdentityActionOverrides(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) {
    return normalizeStringArray(value);
  }
  if (!Array.isArray(value)) {
    throw new ValidationError(
      "identityActionOverrides is invalid.",
      "autopilotPolicy.identityActionOverrides",
    );
  }
  return value.map((entry) => {
    if (!entry || typeof entry !== "object") {
      throw new ValidationError(
        "identityActionOverrides is invalid.",
        "autopilotPolicy.identityActionOverrides",
      );
    }
    const record = entry as Record<string, unknown>;
    const actionKey = requireString(record.actionKey, "identityActionOverrides.actionKey");
    const strategy = normalizeEnumToken(
      requireString(record.strategy, "identityActionOverrides.strategy"),
    );
    if (!strategy) {
      throw new ValidationError(
        "identityActionOverrides is invalid.",
        "autopilotPolicy.identityActionOverrides",
      );
    }
    return `${actionKey}:${strategy}`;
  });
}

function normalizeHouseRules(value: unknown): string[] {
  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
  return normalizeStringArray(value);
}

function normalizeStringArray(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) {
    throw new ValidationError("Expected string array.", "autopilotPolicy");
  }
  return value.map((entry) => entry.trim()).filter((entry) => entry.length > 0);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function normalizeEnumToken(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim().toLowerCase().replaceAll("_", "-").replaceAll("-", "_")
    : null;
}

function isLatitude(value: unknown): value is ClassifierLatitude {
  return (
    value === "hold" ||
    value === "verify" ||
    value === "balanced" ||
    value === "cautious" ||
    value === "lockdown"
  );
}

function isEscalationStep(value: unknown): value is ClassifierEscalationStep {
  return (
    value === "try_alternative" ||
    value === "try_in_sandbox" ||
    value === "defer_to_end_of_run" ||
    value === "defer_for_human_review"
  );
}

function isSandboxPreference(value: unknown): value is "preferred" | "required" | "avoid" {
  return value === "preferred" || value === "required" || value === "avoid";
}

function toGraphQLEnum(value: string): string {
  return value.toUpperCase();
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined),
  ) as T;
}
