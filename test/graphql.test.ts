import { describe, it, expect, vi } from "vitest";
import { GraphQLClient } from "../src/graphql.js";
import { ApiError, AuthError, NetworkError } from "../src/errors.js";
import {
  mockGraphQL,
  mockGraphQLError,
  mockHttpError,
  mockNetworkError,
  RAW_CONTRACT,
  NORMALIZED_CONTRACT,
} from "./fixtures.js";

const BASE_OPTIONS = { apiKey: "hd_test_key_123", baseUrl: "https://test.headsdown.app" };

describe("GraphQLClient", () => {
  describe("request", () => {
    it("sends correct headers and body", async () => {
      let capturedUrl = "";
      let capturedInit: RequestInit | undefined;

      const fetchFn = ((url: string, init: RequestInit) => {
        capturedUrl = url;
        capturedInit = init;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { test: true } }),
          text: () => Promise.resolve(""),
        });
      }) as unknown as typeof globalThis.fetch;

      const client = new GraphQLClient({ ...BASE_OPTIONS, fetch: fetchFn });
      await client.request("query { test }");

      expect(capturedUrl).toBe("https://test.headsdown.app/graphql");
      expect(capturedInit?.method).toBe("POST");
      expect(capturedInit?.headers).toEqual({
        "Content-Type": "application/json",
        Authorization: "Bearer hd_test_key_123",
      });

      const body = JSON.parse(capturedInit?.body as string);
      expect(body.query).toBe("query { test }");
    });

    it("sends actor context header when configured", async () => {
      let capturedInit: RequestInit | undefined;

      const fetchFn = ((_url: string, init: RequestInit) => {
        capturedInit = init;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: {} }),
        });
      }) as unknown as typeof globalThis.fetch;

      const client = new GraphQLClient({
        ...BASE_OPTIONS,
        fetch: fetchFn,
        actorContext: {
          source: "pi",
          agentId: "agent-1",
          sessionId: "session-1",
          workspaceRef: "headsdown/sdk",
        },
      });

      await client.request("query { test }");

      const headers = capturedInit?.headers as Record<string, string>;
      expect(headers["x-headsdown-actor-context"]).toBe(
        JSON.stringify({
          source: "pi",
          agentId: "agent-1",
          sessionId: "session-1",
          workspaceRef: "headsdown/sdk",
        }),
      );
    });

    it("sends variables when provided", async () => {
      let capturedBody: string | undefined;

      const fetchFn = ((_url: string, init: RequestInit) => {
        capturedBody = init.body as string;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: {} }),
        });
      }) as unknown as typeof globalThis.fetch;

      const client = new GraphQLClient({ ...BASE_OPTIONS, fetch: fetchFn });
      await client.request("mutation Test($id: ID!) { test(id: $id) }", { id: "123" });

      const body = JSON.parse(capturedBody!);
      expect(body.variables).toEqual({ id: "123" });
    });

    it("normalizes enum values in responses to lowercase", async () => {
      const client = new GraphQLClient({
        ...BASE_OPTIONS,
        fetch: mockGraphQL({ activeContract: RAW_CONTRACT }),
      });

      const data = await client.request<{ activeContract: typeof NORMALIZED_CONTRACT }>(
        "query { activeContract { mode } }",
      );

      expect(data.activeContract.mode).toBe("busy");
    });

    it("normalizes nested enum values", async () => {
      const client = new GraphQLClient({
        ...BASE_OPTIONS,
        fetch: mockGraphQL({
          proposals: [
            { verdict: "APPROVED", description: "task 1" },
            { verdict: "DEFERRED", description: "task 2" },
          ],
        }),
      });

      const data = await client.request<{
        proposals: Array<{ verdict: string; description: string }>;
      }>("query { proposals { verdict } }");

      expect(data.proposals[0].verdict).toBe("approved");
      expect(data.proposals[1].verdict).toBe("deferred");
    });

    it("normalizes enum arrays for delegation permissions", async () => {
      const client = new GraphQLClient({
        ...BASE_OPTIONS,
        fetch: mockGraphQL({
          delegationGrants: [
            {
              scope: "SESSION",
              permissions: [
                "AVAILABILITY_OVERRIDE_CREATE",
                "HEADSDOWN_ACTION_APPLY",
                "PRESET_APPLY",
              ],
            },
          ],
        }),
      });

      const data = await client.request<{
        delegationGrants: Array<{ scope: string; permissions: string[] }>;
      }>("query { delegationGrants { scope permissions } }");

      expect(data.delegationGrants[0].scope).toBe("session");
      expect(data.delegationGrants[0].permissions).toEqual([
        "availability_override_create",
        "headsdown_action_apply",
        "preset_apply",
      ]);
    });

    it("normalizes agent-control enum-backed fields to lowercase", async () => {
      const client = new GraphQLClient({
        ...BASE_OPTIONS,
        fetch: mockGraphQL({
          agentControlOverview: {
            currentCall: {
              callKey: "OFF_THE_CLOCK",
              primaryActionIntent: "NONE",
              secondaryActionIntent: "VIEW_DETAILS",
              recommendedActionKey: "QUEUE_FOR_MORNING",
              allowedActionKeys: ["QUEUE_FOR_MORNING", "KEEP_QUEUED"],
              dataState: "READY",
            },
            headsdownCall: {
              key: "future_call_alpha",
              knownKey: null,
              severity: "BOUNDARY",
              urgency: "ELEVATED",
              primaryActionKnownKey: "QUEUE_FOR_MORNING",
              primaryActionIntent: "NONE",
              secondaryActionKnownKey: "KEEP_QUEUED",
              secondaryActionIntent: "VIEW_DETAILS",
              recommendedActionKey: "QUEUE_FOR_MORNING",
              recommendedActionKnownKey: "QUEUE_FOR_MORNING",
              allowedActionKeys: ["QUEUE_FOR_MORNING", "KEEP_QUEUED"],
              allowedActionKnownKeys: ["QUEUE_FOR_MORNING", "KEEP_QUEUED"],
              allowedUiIntents: ["VIEW_DETAILS", "VIEW_QUEUE"],
              confidence: "ESTIMATED",
              evidenceSource: "ENGINE",
              privacyMode: "PRIVACY_SAFE",
            },
            needsYourYes: [
              {
                callKey: "NEEDS_YOUR_YES",
                itemState: "ACTION_REQUIRED",
                primaryActionIntent: "REVIEW_REQUEST",
                recommendedActionKey: "ALLOW_ONCE",
                allowedActionKeys: ["ALLOW_ONCE", "KEEP_QUEUED"],
                dataState: "READY",
              },
            ],
            runSummaries: [
              {
                callKey: "KEEP_IT_TIGHT",
                runState: "ACTIVE",
                actionState: "OPTIONAL",
                recommendedActionKey: "NARROW_SCOPE",
                allowedActionKeys: ["NARROW_SCOPE", "ALLOW_FOR_DURATION"],
                deadlineState: "READY",
                budgetState: "PRIVACY_RESTRICTED",
                nextActionIntent: "REVIEW_REQUEST",
                dataState: "READY",
                detailsState: "READY",
                progressState: "UNKNOWN",
              },
            ],
            valueMetrics: [
              {
                metricKey: "TIME_NOT_WASTED",
                confidence: "EXACT",
                dataState: "READY",
              },
            ],
            needsYourYesState: "FEATURE_DISABLED",
            runSummariesState: "READY",
            valueMetricsState: "PRIVACY_RESTRICTED",
          },
        }),
      });

      const data = await client.request<{
        agentControlOverview: Record<string, unknown>;
      }>("query { agentControlOverview { headsdownCall { key knownKey } } }");

      const overview = data.agentControlOverview as Record<string, unknown>;
      const currentCall = overview.currentCall as Record<string, unknown>;
      const headsdownCall = overview.headsdownCall as Record<string, unknown>;
      const needsYourYes = overview.needsYourYes as Array<Record<string, unknown>>;
      const runSummaries = overview.runSummaries as Array<Record<string, unknown>>;
      const valueMetrics = overview.valueMetrics as Array<Record<string, unknown>>;

      expect(currentCall.callKey).toBe("off_the_clock");
      expect(currentCall.primaryActionIntent).toBe("none");
      expect(currentCall.secondaryActionIntent).toBe("view_details");
      expect(currentCall.recommendedActionKey).toBe("queue_for_morning");
      expect(currentCall.allowedActionKeys).toEqual(["queue_for_morning", "keep_queued"]);
      expect(currentCall.dataState).toBe("ready");

      expect(headsdownCall.key).toBe("future_call_alpha");
      expect(headsdownCall.knownKey).toBeNull();
      expect(headsdownCall.severity).toBe("boundary");
      expect(headsdownCall.urgency).toBe("elevated");
      expect(headsdownCall.primaryActionKnownKey).toBe("queue_for_morning");
      expect(headsdownCall.primaryActionIntent).toBe("none");
      expect(headsdownCall.secondaryActionKnownKey).toBe("keep_queued");
      expect(headsdownCall.secondaryActionIntent).toBe("view_details");
      expect(headsdownCall.recommendedActionKey).toBe("queue_for_morning");
      expect(headsdownCall.recommendedActionKnownKey).toBe("queue_for_morning");
      expect(headsdownCall.allowedActionKeys).toEqual(["queue_for_morning", "keep_queued"]);
      expect(headsdownCall.allowedActionKnownKeys).toEqual(["queue_for_morning", "keep_queued"]);
      expect(headsdownCall.allowedUiIntents).toEqual(["view_details", "view_queue"]);
      expect(headsdownCall.confidence).toBe("estimated");
      expect(headsdownCall.evidenceSource).toBe("engine");
      expect(headsdownCall.privacyMode).toBe("privacy_safe");

      expect(needsYourYes[0].callKey).toBe("needs_your_yes");
      expect(needsYourYes[0].itemState).toBe("action_required");
      expect(needsYourYes[0].primaryActionIntent).toBe("review_request");
      expect(needsYourYes[0].recommendedActionKey).toBe("allow_once");
      expect(needsYourYes[0].allowedActionKeys).toEqual(["allow_once", "keep_queued"]);
      expect(needsYourYes[0].dataState).toBe("ready");

      expect(runSummaries[0].callKey).toBe("keep_it_tight");
      expect(runSummaries[0].runState).toBe("active");
      expect(runSummaries[0].actionState).toBe("optional");
      expect(runSummaries[0].recommendedActionKey).toBe("narrow_scope");
      expect(runSummaries[0].allowedActionKeys).toEqual(["narrow_scope", "allow_for_duration"]);
      expect(runSummaries[0].deadlineState).toBe("ready");
      expect(runSummaries[0].budgetState).toBe("privacy_restricted");
      expect(runSummaries[0].nextActionIntent).toBe("review_request");
      expect(runSummaries[0].dataState).toBe("ready");
      expect(runSummaries[0].detailsState).toBe("ready");
      expect(runSummaries[0].progressState).toBe("unknown");

      expect(valueMetrics[0].metricKey).toBe("time_not_wasted");
      expect(valueMetrics[0].confidence).toBe("exact");
      expect(valueMetrics[0].dataState).toBe("ready");

      expect(overview.needsYourYesState).toBe("feature_disabled");
      expect(overview.runSummariesState).toBe("ready");
      expect(overview.valueMetricsState).toBe("privacy_restricted");
    });

    it("preserves uppercase free-string source values while normalizing source enums", async () => {
      const client = new GraphQLClient({
        ...BASE_OPTIONS,
        fetch: mockGraphQL({
          agentRunEvents: [
            {
              source: "SDK",
              privacyMode: "METADATA_ONLY",
            },
          ],
          schedule: {
            wrapUpGuidance: {
              source: "THRESHOLD",
            },
          },
        }),
      });

      const data = await client.request<{
        agentRunEvents: Array<{ source: string; privacyMode: string }>;
        schedule: { wrapUpGuidance: { source: string } };
      }>("query { agentRunEvents { source privacyMode } schedule { wrapUpGuidance { source } } }");

      expect(data.agentRunEvents[0].source).toBe("SDK");
      expect(data.agentRunEvents[0].privacyMode).toBe("metadata_only");
      expect(data.schedule.wrapUpGuidance.source).toBe("threshold");
    });

    it("normalizes agent-control action mutation enum-backed fields", async () => {
      const client = new GraphQLClient({
        ...BASE_OPTIONS,
        fetch: mockGraphQL({
          applyHeadsdownAction: {
            ok: true,
            result: {
              actionKey: "PAUSE_AND_SUMMARIZE",
              sourceState: "PENDING",
              resultingState: "APPLIED",
            },
            error: null,
          },
        }),
      });

      const data = await client.request<{
        applyHeadsdownAction: {
          result: { actionKey: string; sourceState: string; resultingState: string };
        };
      }>(
        'mutation { applyHeadsdownAction(input: { runId: "run-1", actionKey: "pause_and_summarize" }) { result { actionKey sourceState resultingState } } }',
      );

      expect(data.applyHeadsdownAction.result.actionKey).toBe("pause_and_summarize");
      expect(data.applyHeadsdownAction.result.sourceState).toBe("pending");
      expect(data.applyHeadsdownAction.result.resultingState).toBe("applied");
    });

    it("does not crash when headsdownCall.key is an unknown future value", async () => {
      const client = new GraphQLClient({
        ...BASE_OPTIONS,
        fetch: mockGraphQL({
          headsdownCallCatalog: [
            {
              key: "future_call_key_from_server",
              knownKey: null,
              title: "Future call",
              body: "Future-proof payload",
              severity: "CAUTION",
              urgency: "NORMAL",
              primaryActionIntent: "VIEW_DETAILS",
              secondaryActionIntent: "NONE",
              allowedActionKeys: [],
              allowedActionKnownKeys: [],
              allowedUiIntents: ["VIEW_DETAILS"],
              reasonCodes: [],
              confidence: "UNKNOWN",
              evidenceSource: "FALLBACK",
              privacyMode: "UNKNOWN",
            },
          ],
        }),
      });

      const data = await client.request<{
        headsdownCallCatalog: Array<{ key: string; knownKey: string | null; severity: string }>;
      }>("query { headsdownCallCatalog { key knownKey severity } }");

      expect(data.headsdownCallCatalog[0].key).toBe("future_call_key_from_server");
      expect(data.headsdownCallCatalog[0].knownKey).toBeNull();
      expect(data.headsdownCallCatalog[0].severity).toBe("caution");
    });

    it("throws AuthError on 401", async () => {
      const client = new GraphQLClient({ ...BASE_OPTIONS, fetch: mockHttpError(401) });

      await expect(client.request("query { test }")).rejects.toThrow(AuthError);
      await expect(client.request("query { test }")).rejects.toThrow(/invalid or expired/);
    });

    it("throws ApiError on non-401 HTTP error", async () => {
      const client = new GraphQLClient({
        ...BASE_OPTIONS,
        fetch: mockHttpError(500, "Internal Server Error"),
      });

      await expect(client.request("query { test }")).rejects.toThrow(ApiError);
      await expect(client.request("query { test }")).rejects.toThrow(/500/);
    });

    it("throws ApiError on GraphQL errors", async () => {
      const client = new GraphQLClient({
        ...BASE_OPTIONS,
        fetch: mockGraphQLError([{ message: "Field not found" }, { message: "Invalid type" }]),
      });

      const error = await client.request("query { bad }").catch((e) => e);
      expect(error).toBeInstanceOf(ApiError);
      expect(error.message).toContain("Field not found");
      expect(error.message).toContain("Invalid type");
      expect(error.graphqlErrors).toHaveLength(2);
    });

    it("throws ApiError on empty response", async () => {
      const fetchFn = (() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
        })) as unknown as typeof globalThis.fetch;

      const client = new GraphQLClient({ ...BASE_OPTIONS, fetch: fetchFn });
      await expect(client.request("query { test }")).rejects.toThrow(/empty response/i);
    });

    it("throws NetworkError on fetch failure", async () => {
      const client = new GraphQLClient({
        ...BASE_OPTIONS,
        fetch: mockNetworkError("ECONNREFUSED"),
      });

      const error = await client.request("query { test }").catch((e) => e);
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.message).toContain("ECONNREFUSED");
      expect(error.cause).toBeInstanceOf(TypeError);
    });

    it("retries transient network errors and eventually succeeds", async () => {
      let calls = 0;
      const fetchFn = (() => {
        calls++;
        if (calls < 3) {
          return Promise.reject(new TypeError("ECONNRESET"));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { test: true } }),
          headers: new Headers(),
        });
      }) as unknown as typeof globalThis.fetch;

      const onRetry = vi.fn();
      const client = new GraphQLClient({
        ...BASE_OPTIONS,
        fetch: fetchFn,
        retries: 2,
        retryDelayMs: 0,
        hooks: { onRetry },
      });

      const data = await client.request<{ test: boolean }>("query { test }");
      expect(data.test).toBe(true);
      expect(calls).toBe(3);
      expect(onRetry).toHaveBeenCalledTimes(2);
    });

    it("retries retryable HTTP status codes and eventually succeeds", async () => {
      let calls = 0;
      const fetchFn = (() => {
        calls++;
        if (calls < 3) {
          return Promise.resolve({
            ok: false,
            status: 503,
            text: () => Promise.resolve("Service unavailable"),
            headers: new Headers(),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { test: true } }),
          headers: new Headers(),
        });
      }) as unknown as typeof globalThis.fetch;

      const client = new GraphQLClient({
        ...BASE_OPTIONS,
        fetch: fetchFn,
        retries: 2,
        retryDelayMs: 0,
      });
      const data = await client.request<{ test: boolean }>("query { test }");
      expect(data.test).toBe(true);
      expect(calls).toBe(3);
    });

    it("captures x-request-id on API errors", async () => {
      const fetchFn = (() =>
        Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve("Internal Server Error"),
          headers: new Headers({ "x-request-id": "req_123" }),
        })) as unknown as typeof globalThis.fetch;

      const client = new GraphQLClient({ ...BASE_OPTIONS, fetch: fetchFn, retries: 0 });
      const error = await client.request("query { test }").catch((e) => e as ApiError);
      expect(error).toBeInstanceOf(ApiError);
      expect(error.requestId).toBe("req_123");
    });

    it("calls request and response hooks", async () => {
      const onRequest = vi.fn();
      const onResponse = vi.fn();
      const client = new GraphQLClient({
        ...BASE_OPTIONS,
        fetch: mockGraphQL({ test: true }),
        hooks: { onRequest, onResponse },
      });

      await client.request("query { test }");

      expect(onRequest).toHaveBeenCalledTimes(1);
      expect(onResponse).toHaveBeenCalledTimes(1);
      expect(onResponse.mock.calls[0][0].status).toBe(200);
    });

    it("throws NetworkError on timeout", async () => {
      const slowFetch = ((_url: string, init: RequestInit) =>
        new Promise((resolve, reject) => {
          const timer = setTimeout(
            () =>
              resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ data: {} }),
              }),
            10_000,
          );
          init?.signal?.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        })) as unknown as typeof globalThis.fetch;

      const client = new GraphQLClient({ ...BASE_OPTIONS, fetch: slowFetch, timeout: 50 });
      await expect(client.request("query { test }")).rejects.toThrow(NetworkError);

      const client2 = new GraphQLClient({ ...BASE_OPTIONS, fetch: slowFetch, timeout: 50 });
      await expect(client2.request("query { test }")).rejects.toThrow(/timed out/i);
    });

    it("strips trailing slash from base URL", async () => {
      let capturedUrl = "";
      const fetchFn = ((url: string) => {
        capturedUrl = url;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: {} }),
        });
      }) as unknown as typeof globalThis.fetch;

      const client = new GraphQLClient({
        apiKey: "hd_test",
        baseUrl: "https://example.com///",
        fetch: fetchFn,
      });
      await client.request("query { test }");

      expect(capturedUrl).toBe("https://example.com/graphql");
    });
  });
});
