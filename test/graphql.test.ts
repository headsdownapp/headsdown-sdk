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
