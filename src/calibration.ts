import type { HeadsDownClient } from "./client.js";
import type { TaskOutcomeResult, TaskOutcome, OutcomeInput } from "./types.js";

const DEFAULT_CHECKPOINT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MIN_CHECKPOINT_INTERVAL_MS = 60 * 1000; // 1 minute minimum

export interface CalibrationTrackerOptions {
  /** Checkpoint interval in milliseconds. Default: 300000 (5 min). Min: 60000 (1 min). */
  intervalMs?: number;
  /** If false, tracking is disabled (no API calls made). Default: true. */
  enabled?: boolean;
}

/**
 * Tracks agent session signals locally and reports outcomes to HeadsDown
 * periodically via checkpoint-and-update.
 *
 * Create after a proposal is approved. Call signal methods as the agent works.
 * The tracker handles the 5-minute checkpoint timer internally.
 *
 * @example
 * ```ts
 * const tracker = new CalibrationTracker(client, verdict.proposalId);
 * tracker.start();
 *
 * // During the session:
 * tracker.recordTurn();
 * tracker.recordFilesModified(3);
 *
 * // When done:
 * await tracker.complete('completed');
 * ```
 */
export class CalibrationTracker {
  private readonly client: HeadsDownClient;
  private readonly proposalId: string;
  private readonly intervalMs: number;
  private readonly enabled: boolean;
  private timer: ReturnType<typeof setInterval> | null = null;
  private startedAt: number = Date.now();
  private disposed = false;

  // Accumulated signals
  private turnCount = 0;
  private scopeChanged = false;
  private redirectCount = 0;
  private distinctTaskCount = 1;
  private filesModified = 0;
  private linesChanged = 0;
  private tokensUsed = 0;
  private retryCount = 0;
  private testsPassed: boolean | undefined;
  private errorCategory: string | undefined;
  private metadata: Record<string, unknown> = {};

  constructor(client: HeadsDownClient, proposalId: string, options?: CalibrationTrackerOptions) {
    this.client = client;
    this.proposalId = proposalId;
    this.enabled = options?.enabled ?? true;
    this.intervalMs = Math.max(
      MIN_CHECKPOINT_INTERVAL_MS,
      options?.intervalMs ?? DEFAULT_CHECKPOINT_INTERVAL_MS,
    );
  }

  /** Start the checkpoint timer. Call once after creating the tracker. */
  start(): void {
    if (!this.enabled || this.disposed) return;
    this.startedAt = Date.now();
    this.timer = setInterval(() => {
      this.checkpoint().catch((err) => {
        // Log but don't crash - checkpoint is fire-and-forget
        if (process.env.NODE_ENV !== "test") {
          console.warn(
            "[CalibrationTracker] Checkpoint failed:",
            err instanceof Error ? err.message : String(err),
          );
        }
      });
    }, this.intervalMs);
    // Unref so the timer doesn't keep Node.js alive if the process is exiting
    if (this.timer && typeof this.timer.unref === "function") {
      this.timer.unref();
    }
  }

  // === Signal accumulation ===

  /** Record one conversational turn (human message + agent response). */
  recordTurn(): void {
    this.turnCount++;
  }

  /** Record that the developer redirected the agent from the original task. */
  recordScopeChange(): void {
    this.scopeChanged = true;
    this.redirectCount++;
  }

  /** Record a logical task boundary (agent worked on a new, separate task). */
  recordTaskBoundary(): void {
    this.distinctTaskCount++;
  }

  /** Set or update the total number of files modified. */
  recordFilesModified(count: number): void {
    this.filesModified = count;
  }

  /** Set or update the total number of lines changed. */
  recordLinesChanged(count: number): void {
    this.linesChanged = count;
  }

  /** Set or update the total tokens used. */
  recordTokensUsed(count: number): void {
    this.tokensUsed = count;
  }

  /** Set or update the retry count. */
  recordRetry(): void {
    this.retryCount++;
  }

  /** Record whether tests passed. */
  recordTestResult(passed: boolean): void {
    this.testsPassed = passed;
  }

  /** Record an error category for failed tasks. */
  recordError(category: string): void {
    this.errorCategory = category;
  }

  /** Add arbitrary metadata. Merged with existing metadata. */
  addMetadata(data: Record<string, unknown>): void {
    // Filter out prototype pollution keys
    const safe = Object.keys(data).reduce(
      (acc, key) => {
        if (key !== "__proto__" && key !== "constructor" && key !== "prototype") {
          acc[key] = data[key];
        }
        return acc;
      },
      {} as Record<string, unknown>,
    );
    this.metadata = { ...this.metadata, ...safe };
  }

  // === Reporting ===

  /** Send a checkpoint report with current accumulated state. */
  async checkpoint(): Promise<TaskOutcome | null> {
    if (!this.enabled || this.disposed) return null;

    const durationMinutes = Math.round((Date.now() - this.startedAt) / 60_000);

    return this.client.reportOutcome({
      proposalId: this.proposalId,
      outcome: "partially_completed",
      actualDurationMinutes: durationMinutes,
      filesModified: this.filesModified || undefined,
      linesChanged: this.linesChanged || undefined,
      tokensUsed: this.tokensUsed || undefined,
      retryCount: this.retryCount || undefined,
      turnCount: this.turnCount || undefined,
      scopeChanged: this.scopeChanged,
      redirectCount: this.redirectCount || undefined,
      distinctTaskCount: this.distinctTaskCount,
      errorCategory: this.errorCategory,
      testsPassed: this.testsPassed,
      metadata: Object.keys(this.metadata).length > 0 ? this.metadata : undefined,
    });
  }

  /**
   * Send the final outcome report and stop the tracker.
   * Call this when the agent session ends (if you can catch the exit).
   */
  async complete(
    outcome: TaskOutcomeResult,
    extras?: Partial<OutcomeInput>,
  ): Promise<TaskOutcome | null> {
    if (!this.enabled || this.disposed) return null;

    this.stopTimer();
    this.disposed = true;

    const durationMinutes = Math.round((Date.now() - this.startedAt) / 60_000);

    return this.client.reportOutcome({
      proposalId: this.proposalId,
      outcome,
      actualDurationMinutes: durationMinutes,
      filesModified: this.filesModified || undefined,
      linesChanged: this.linesChanged || undefined,
      tokensUsed: this.tokensUsed || undefined,
      retryCount: this.retryCount || undefined,
      turnCount: this.turnCount || undefined,
      scopeChanged: this.scopeChanged,
      redirectCount: this.redirectCount || undefined,
      distinctTaskCount: this.distinctTaskCount,
      errorCategory: this.errorCategory,
      testsPassed: this.testsPassed,
      metadata: Object.keys(this.metadata).length > 0 ? this.metadata : undefined,
      ...extras,
    });
  }

  /** Stop the checkpoint timer and clean up. Does NOT send a final report. */
  dispose(): void {
    this.stopTimer();
    this.disposed = true;
  }

  /** Whether the tracker is still active. */
  get isActive(): boolean {
    return this.enabled && !this.disposed;
  }

  /** Current accumulated turn count. */
  get turns(): number {
    return this.turnCount;
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
