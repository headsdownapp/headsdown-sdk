import { describe, expect, it, vi } from "vitest";
import type { HeadsDownClient } from "../src/client.js";
import { ValidationError } from "../src/errors.js";
import {
  AUTOPILOT_POLICY_QUERY,
  assertAutopilotPolicy,
  fetchAutopilotPolicy,
} from "../src/autopilot-policy.js";

describe("autopilot policy", () => {
  it("fetches and maps the hosted policy into ClassifierPolicy", async () => {
    const request = vi.fn(async () => ({
      autopilotPolicy: {
        classifierVersion: "1.1.0",
        latitude: "BALANCED",
        escalationStrategy: ["TRY_ALTERNATIVE", "DEFER_FOR_HUMAN_REVIEW"],
        sandboxPreference: "DISABLED",
        identityActionOverrides: [{ actionKey: "deployment", strategy: "DEFER_FOR_HUMAN_REVIEW" }],
        houseRules: "prefer local validation",
      },
    }));

    const policy = await fetchAutopilotPolicy(mockClient(request), "offline");

    expect(request).toHaveBeenCalledWith(AUTOPILOT_POLICY_QUERY, { mode: "OFFLINE" });
    expect(policy).toEqual({
      classifierVersion: "1.1.0",
      latitude: "balanced",
      escalationStrategy: ["try_alternative", "defer_for_human_review"],
      sandboxPreference: "avoid",
      identityActionOverrides: ["deployment:defer_for_human_review"],
      houseRules: ["prefer local validation"],
    });
  });

  it("defaults optional arrays and treats optional sandbox as no preference", async () => {
    const policy = await fetchAutopilotPolicy(
      mockClient(async () => ({
        autopilotPolicy: {
          classifierVersion: "1.1.0",
          latitude: "cautious",
          sandboxPreference: "OPTIONAL",
        },
      })),
      "limited",
    );

    expect(policy).toEqual({
      classifierVersion: "1.1.0",
      latitude: "cautious",
      identityActionOverrides: [],
      houseRules: [],
    });
  });

  it("exports the helper from the public entrypoint", async () => {
    const sdk = await import("../src/index.js");

    expect(sdk.fetchAutopilotPolicy).toBe(fetchAutopilotPolicy);
    expect(sdk.assertAutopilotPolicy).toBe(assertAutopilotPolicy);
    expect(sdk.AUTOPILOT_POLICY_QUERY).toBe(AUTOPILOT_POLICY_QUERY);
  });

  it("rejects clients without a GraphQL transport", async () => {
    await expect(fetchAutopilotPolicy({} as HeadsDownClient, "offline")).rejects.toThrow(
      ValidationError,
    );
  });

  it("propagates transport errors", async () => {
    const error = new Error("network unavailable");

    await expect(
      fetchAutopilotPolicy(
        mockClient(async () => {
          throw error;
        }),
        "offline",
      ),
    ).rejects.toBe(error);
  });

  it("rejects malformed or privacy-unsafe policy payloads", () => {
    expect(() =>
      assertAutopilotPolicy({ classifierVersion: "1.1.0", latitude: "not-a-latitude" }),
    ).toThrow(ValidationError);
    expect(() =>
      assertAutopilotPolicy({
        classifierVersion: "1.1.0",
        latitude: "balanced",
        escalationStrategy: "try_alternative",
      }),
    ).toThrow(ValidationError);
    expect(() =>
      assertAutopilotPolicy({
        classifierVersion: "1.1.0",
        latitude: "balanced",
        identityActionOverrides: "deployment",
      }),
    ).toThrow(ValidationError);
    expect(() =>
      assertAutopilotPolicy({
        classifierVersion: "1.1.0",
        latitude: "balanced",
        houseRules: ["Read /Users/alice/private.ts before continuing"],
      }),
    ).toThrow(ValidationError);
  });
});

function mockClient(
  request: (query: string, variables?: unknown) => Promise<unknown>,
): HeadsDownClient {
  return { graphql: { request } } as unknown as HeadsDownClient;
}
