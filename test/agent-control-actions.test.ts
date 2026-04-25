import { describe, expect, it } from "vitest";
import { HeadsDownClient } from "../src/client.js";
import {
  HeadsDownActionAuthError,
  HeadsDownActionExpiredError,
  HeadsDownActionFeatureDisabledError,
  HeadsDownActionInvalidStateError,
} from "../src/errors.js";
import { mockGraphQL, mockGraphQLError, mockHttpError } from "./fixtures.js";

const CLIENT_OPTS = { apiKey: "hd_test_key", baseUrl: "https://test.headsdown.app" };

const RAW_ACTION_SUCCESS = {
  ok: true,
  error: null,
  result: {
    actionKey: "QUEUE_FOR_MORNING",
    replayed: false,
    sourceState: "OFF_THE_CLOCK",
    resultingState: "QUEUED",
    eventId: "evt_123",
    availabilityOverrideId: null,
  },
  currentCall: null,
  headsdownCall: null,
  runSummary: null,
};

describe("HeadsDown action helpers", () => {
  it("maps ergonomic helper names to canonical action keys and derives idempotency keys", async () => {
    const captures: Array<Record<string, unknown>> = [];

    const fetchFn = ((_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      captures.push(body);
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: { applyHeadsdownAction: RAW_ACTION_SUCCESS } }),
        text: () => Promise.resolve(""),
        headers: new Headers(),
      });
    }) as unknown as typeof globalThis.fetch;

    const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch: fetchFn });

    await client.continueRun({ runId: "run-1" });
    await client.continueWithLimit({ runId: "run-1" });
    await client.narrowScope({ runId: "run-1" });
    await client.askUser({ runId: "run-1" });
    await client.queueForLater({ runId: "run-1" });
    await client.queueForMorning({ runId: "run-1" });
    await client.pauseAndSummarize({ runId: "run-1" });
    await client.stopRun({ runId: "run-1" });
    await client.resumeRun({ runId: "run-1" });
    await client.allowOnce({ runId: "run-1" });
    await client.allowForDuration({ runId: "run-1", durationMinutes: 15 });
    await client.createTemporaryException({
      runId: "run-1",
      durationMinutes: 30,
      mode: "limited",
    });
    await client.keepQueued({ runId: "run-1" });

    const actionKeys = captures.map(
      (entry) => (entry.variables as { input: { actionKey: string } }).input.actionKey,
    );
    expect(actionKeys).toEqual([
      "continue",
      "continue_with_limit",
      "narrow_scope",
      "ask_user",
      "queue_for_later",
      "queue_for_morning",
      "pause_and_summarize",
      "stop_run",
      "resume_run",
      "allow_once",
      "allow_for_duration",
      "create_temporary_exception",
      "keep_queued",
    ]);

    const idempotencyKeys = captures.map(
      (entry) => (entry.variables as { input: { idempotencyKey: string } }).input.idempotencyKey,
    );
    for (const idempotencyKey of idempotencyKeys) {
      expect(idempotencyKey).toMatch(/^[a-z_]+-run-1-\d+-[a-f0-9]+$/);
    }

    const durationInput = captures[10].variables as { input: { durationMinutes: number } };
    expect(durationInput.input.durationMinutes).toBe(15);

    const temporaryExceptionInput = captures[11].variables as {
      input: { durationMinutes: number; mode: string };
    };
    expect(temporaryExceptionInput.input.durationMinutes).toBe(30);
    expect(temporaryExceptionInput.input.mode).toBe("LIMITED");
  });

  it("keeps caller-provided idempotency key", async () => {
    let capturedBody = "";
    const fetchFn = ((_url: string, init: RequestInit) => {
      capturedBody = String(init.body);
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: { applyHeadsdownAction: RAW_ACTION_SUCCESS } }),
        text: () => Promise.resolve(""),
        headers: new Headers(),
      });
    }) as unknown as typeof globalThis.fetch;

    const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch: fetchFn });
    await client.queueForMorning({ runId: "run-1", idempotencyKey: "idem-abc" });

    const parsed = JSON.parse(capturedBody);
    expect(parsed.variables.input.idempotencyKey).toBe("idem-abc");
  });

  it("throws typed invalid-state error when action payload reports invalid transition", async () => {
    const client = new HeadsDownClient({
      ...CLIENT_OPTS,
      fetch: mockGraphQL({
        applyHeadsdownAction: {
          ok: false,
          result: null,
          currentCall: null,
          headsdownCall: null,
          runSummary: null,
          error: {
            code: "invalid_transition",
            message: "Action is not valid for this run state",
            details: { sourceState: "off_the_clock" },
          },
        },
      }),
    });

    await expect(client.stopRun({ runId: "run-1" })).rejects.toBeInstanceOf(
      HeadsDownActionInvalidStateError,
    );
  });

  it("throws typed invalid-state error for invalid source state", async () => {
    const client = new HeadsDownClient({
      ...CLIENT_OPTS,
      fetch: mockGraphQL({
        applyHeadsdownAction: {
          ok: false,
          result: null,
          currentCall: null,
          headsdownCall: null,
          runSummary: null,
          error: {
            code: "invalid_source_state",
            message: "Source state is not canonical",
            details: { sourceState: "not-a-state" },
          },
        },
      }),
    });

    await expect(client.resumeRun({ runId: "run-1" })).rejects.toBeInstanceOf(
      HeadsDownActionInvalidStateError,
    );
  });

  it("throws typed invalid-state error for stale client state", async () => {
    const client = new HeadsDownClient({
      ...CLIENT_OPTS,
      fetch: mockGraphQL({
        applyHeadsdownAction: {
          ok: false,
          result: null,
          currentCall: null,
          headsdownCall: null,
          runSummary: null,
          error: {
            code: "stale_action_state",
            message: "Supplied source state no longer matches the current run state",
            details: { suppliedSourceState: "ready_to_resume", currentSourceState: "running" },
          },
        },
      }),
    });

    await expect(client.resumeRun({ runId: "run-1" })).rejects.toBeInstanceOf(
      HeadsDownActionInvalidStateError,
    );
  });

  it("throws typed expired-action error when action payload reports expiry", async () => {
    const client = new HeadsDownClient({
      ...CLIENT_OPTS,
      fetch: mockGraphQL({
        applyHeadsdownAction: {
          ok: false,
          result: null,
          currentCall: null,
          headsdownCall: null,
          runSummary: null,
          error: {
            code: "ACTION_EXPIRED",
            message: "Action request expired",
            details: { actionExpiresAt: "2026-01-01T00:00:00Z" },
          },
        },
      }),
    });

    await expect(client.resumeRun({ runId: "run-1" })).rejects.toBeInstanceOf(
      HeadsDownActionExpiredError,
    );
  });

  it("throws typed feature-disabled error when action payload reports disabled feature", async () => {
    const client = new HeadsDownClient({
      ...CLIENT_OPTS,
      fetch: mockGraphQL({
        applyHeadsdownAction: {
          ok: false,
          result: null,
          currentCall: null,
          headsdownCall: null,
          runSummary: null,
          error: {
            code: "FEATURE_DISABLED",
            message: "HeadsDown action feature is disabled",
            details: {},
          },
        },
      }),
    });

    await expect(client.queueForMorning({ runId: "run-1" })).rejects.toBeInstanceOf(
      HeadsDownActionFeatureDisabledError,
    );
  });

  it("throws typed auth error for GraphQL auth failures", async () => {
    const client = new HeadsDownClient({
      ...CLIENT_OPTS,
      fetch: mockGraphQLError([{ message: "not authorized to perform this action" }]),
    });

    await expect(client.keepQueued({ runId: "run-1" })).rejects.toBeInstanceOf(
      HeadsDownActionAuthError,
    );
  });

  it("throws typed auth error for HTTP 401 responses", async () => {
    const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch: mockHttpError(401) });

    await expect(client.keepQueued({ runId: "run-1" })).rejects.toBeInstanceOf(
      HeadsDownActionAuthError,
    );
  });
});
