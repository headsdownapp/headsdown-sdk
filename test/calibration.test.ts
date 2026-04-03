import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CalibrationTracker } from "../src/calibration.js";
import { HeadsDownClient } from "../src/client.js";
import type { OutcomeInput, TaskOutcome } from "../src/types.js";

describe("CalibrationTracker", () => {
  let mockClient: HeadsDownClient;
  let mockReportOutcome: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockReportOutcome = vi.fn().mockResolvedValue({
      id: "outcome-1",
      outcome: "partially_completed",
      actualDurationMinutes: 5,
      insertedAt: new Date().toISOString(),
    } as TaskOutcome);

    mockClient = {
      reportOutcome: mockReportOutcome,
    } as unknown as HeadsDownClient;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("lifecycle", () => {
    it("should start and set up checkpoint timer", () => {
      const tracker = new CalibrationTracker(mockClient, "proposal-123");
      tracker.start();

      expect(tracker.isActive).toBe(true);
      expect(mockReportOutcome).not.toHaveBeenCalled();
    });

    it("should send checkpoint every 5 minutes by default", async () => {
      const tracker = new CalibrationTracker(mockClient, "proposal-123");
      tracker.start();

      // Advance 5 minutes
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
      expect(mockReportOutcome).toHaveBeenCalledTimes(1);
      expect(mockReportOutcome).toHaveBeenCalledWith(
        expect.objectContaining({
          proposalId: "proposal-123",
          outcome: "partially_completed",
        }),
      );

      // Advance another 5 minutes
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
      expect(mockReportOutcome).toHaveBeenCalledTimes(2);
    });

    it("should respect custom checkpoint interval", async () => {
      const tracker = new CalibrationTracker(mockClient, "proposal-123", {
        intervalMs: 2 * 60 * 1000, // 2 minutes
      });
      tracker.start();

      await vi.advanceTimersByTimeAsync(2 * 60 * 1000);
      expect(mockReportOutcome).toHaveBeenCalledTimes(1);
    });

    it("should enforce minimum checkpoint interval", () => {
      const tracker = new CalibrationTracker(mockClient, "proposal-123", {
        intervalMs: 30 * 1000, // 30 seconds, below minimum
      });
      tracker.start();

      // Should use 1 minute minimum instead
      vi.advanceTimersByTime(30 * 1000);
      expect(mockReportOutcome).not.toHaveBeenCalled();

      vi.advanceTimersByTime(30 * 1000); // Total 60 seconds
      expect(mockReportOutcome).toHaveBeenCalledTimes(1);
    });

    it("should stop timer when disposed", async () => {
      const tracker = new CalibrationTracker(mockClient, "proposal-123");
      tracker.start();

      tracker.dispose();
      expect(tracker.isActive).toBe(false);

      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
      expect(mockReportOutcome).not.toHaveBeenCalled();
    });

    it("should send final report and stop on complete", async () => {
      const tracker = new CalibrationTracker(mockClient, "proposal-123");
      tracker.start();

      await tracker.complete("completed");

      expect(mockReportOutcome).toHaveBeenCalledWith(
        expect.objectContaining({
          proposalId: "proposal-123",
          outcome: "completed",
        }),
      );
      expect(tracker.isActive).toBe(false);

      // Should not send more checkpoints
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
      expect(mockReportOutcome).toHaveBeenCalledTimes(1);
    });

    it("should do nothing when disabled", async () => {
      const tracker = new CalibrationTracker(mockClient, "proposal-123", {
        enabled: false,
      });
      tracker.start();

      expect(tracker.isActive).toBe(false);

      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
      await tracker.complete("completed");

      expect(mockReportOutcome).not.toHaveBeenCalled();
    });
  });

  describe("signal accumulation", () => {
    it("should accumulate turn count", async () => {
      const tracker = new CalibrationTracker(mockClient, "proposal-123");
      tracker.start();

      tracker.recordTurn();
      tracker.recordTurn();
      tracker.recordTurn();

      expect(tracker.turns).toBe(3);

      await tracker.complete("completed");
      expect(mockReportOutcome).toHaveBeenCalledWith(
        expect.objectContaining({
          turnCount: 3,
        }),
      );
    });

    it("should record files and lines changed", async () => {
      const tracker = new CalibrationTracker(mockClient, "proposal-123");
      tracker.start();

      tracker.recordFilesModified(5);
      tracker.recordLinesChanged(150);

      await tracker.complete("completed");
      expect(mockReportOutcome).toHaveBeenCalledWith(
        expect.objectContaining({
          filesModified: 5,
          linesChanged: 150,
        }),
      );
    });

    it("should record tokens and retries", async () => {
      const tracker = new CalibrationTracker(mockClient, "proposal-123");
      tracker.start();

      tracker.recordTokensUsed(50000);
      tracker.recordRetry();
      tracker.recordRetry();

      await tracker.complete("completed");
      expect(mockReportOutcome).toHaveBeenCalledWith(
        expect.objectContaining({
          tokensUsed: 50000,
          retryCount: 2,
        }),
      );
    });

    it("should record scope changes and redirects", async () => {
      const tracker = new CalibrationTracker(mockClient, "proposal-123");
      tracker.start();

      tracker.recordScopeChange();
      tracker.recordScopeChange();

      await tracker.complete("completed");
      expect(mockReportOutcome).toHaveBeenCalledWith(
        expect.objectContaining({
          scopeChanged: true,
          redirectCount: 2,
        }),
      );
    });

    it("should record task boundaries", async () => {
      const tracker = new CalibrationTracker(mockClient, "proposal-123");
      tracker.start();

      tracker.recordTaskBoundary();
      tracker.recordTaskBoundary();

      await tracker.complete("completed");
      expect(mockReportOutcome).toHaveBeenCalledWith(
        expect.objectContaining({
          distinctTaskCount: 3, // Starts at 1
        }),
      );
    });

    it("should record test results and errors", async () => {
      const tracker = new CalibrationTracker(mockClient, "proposal-123");
      tracker.start();

      tracker.recordTestResult(false);
      tracker.recordError("compilation_error");

      await tracker.complete("failed");
      expect(mockReportOutcome).toHaveBeenCalledWith(
        expect.objectContaining({
          testsPassed: false,
          errorCategory: "compilation_error",
        }),
      );
    });

    it("should add and merge metadata", async () => {
      const tracker = new CalibrationTracker(mockClient, "proposal-123");
      tracker.start();

      tracker.addMetadata({ source: "pi", framework: "claude" });
      tracker.addMetadata({ model: "sonnet" });

      await tracker.complete("completed");
      expect(mockReportOutcome).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { source: "pi", framework: "claude", model: "sonnet" },
        }),
      );
    });

    it("should filter out prototype pollution keys from metadata", async () => {
      const tracker = new CalibrationTracker(mockClient, "proposal-123");
      tracker.start();

      tracker.addMetadata({
        __proto__: { polluted: true },
        constructor: { polluted: true },
        prototype: { polluted: true },
        safe: "value",
      } as Record<string, unknown>);

      await tracker.complete("completed");
      expect(mockReportOutcome).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { safe: "value" },
        }),
      );
    });
  });

  describe("error handling", () => {
    it("should not crash when checkpoint fails", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      mockReportOutcome.mockRejectedValue(new Error("Network error"));

      const tracker = new CalibrationTracker(mockClient, "proposal-123");
      tracker.start();

      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

      // Timer should continue
      expect(tracker.isActive).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[CalibrationTracker] Checkpoint failed:",
        "Network error",
      );

      consoleWarnSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it("should not log errors in test environment", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      mockReportOutcome.mockRejectedValue(new Error("Network error"));

      const tracker = new CalibrationTracker(mockClient, "proposal-123");
      tracker.start();

      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

      // NODE_ENV is 'test' in vitest
      expect(consoleWarnSpy).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe("duration calculation", () => {
    it("should calculate duration in minutes", async () => {
      const tracker = new CalibrationTracker(mockClient, "proposal-123");
      tracker.start();

      // Advance 7.5 minutes
      vi.advanceTimersByTime(7.5 * 60 * 1000);

      await tracker.complete("completed");
      expect(mockReportOutcome).toHaveBeenCalledWith(
        expect.objectContaining({
          actualDurationMinutes: 8, // Rounded up
        }),
      );
    });
  });
});

describe("HeadsDownClient.reportOutcome", () => {
  let client: HeadsDownClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    client = new HeadsDownClient({
      apiKey: "hd_test_key",
      fetch: fetchMock,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should send outcome to API", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          reportOutcome: {
            id: "outcome-1",
            outcome: "COMPLETED",
            actualDurationMinutes: 10,
            filesModified: 3,
            insertedAt: new Date().toISOString(),
          },
        },
      }),
    });

    const input: OutcomeInput = {
      proposalId: "proposal-123",
      outcome: "completed",
      actualDurationMinutes: 10,
      filesModified: 3,
    };

    const result = await client.reportOutcome(input);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/graphql"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer hd_test_key",
        }),
        body: expect.stringContaining("ReportOutcome"),
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: "outcome-1",
        outcome: "completed",
        actualDurationMinutes: 10,
        filesModified: 3,
      }),
    );
  });

  it("should validate required proposalId", async () => {
    await expect(
      client.reportOutcome({
        proposalId: "",
        outcome: "completed",
      }),
    ).rejects.toThrow("Proposal ID is required");
  });

  it("should validate required outcome", async () => {
    await expect(
      client.reportOutcome({
        proposalId: "proposal-123",
        outcome: "" as any,
      }),
    ).rejects.toThrow("Outcome is required");
  });

  it("should convert outcome enum to uppercase", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          reportOutcome: {
            id: "outcome-1",
            outcome: "FAILED",
            insertedAt: new Date().toISOString(),
          },
        },
      }),
    });

    await client.reportOutcome({
      proposalId: "proposal-123",
      outcome: "failed",
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.variables.input.outcome).toBe("FAILED");
  });

  it("should strip undefined values from input", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          reportOutcome: {
            id: "outcome-1",
            outcome: "COMPLETED",
            insertedAt: new Date().toISOString(),
          },
        },
      }),
    });

    await client.reportOutcome({
      proposalId: "proposal-123",
      outcome: "completed",
      filesModified: undefined,
      linesChanged: undefined,
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.variables.input).not.toHaveProperty("filesModified");
    expect(body.variables.input).not.toHaveProperty("linesChanged");
  });
});
