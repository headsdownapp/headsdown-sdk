import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ProposalStateStore } from "../src/proposals.js";
import type { StoredProposal } from "../src/proposals.js";

let tempDir: string;
let statePath: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "hd-proposals-test-"));
  statePath = join(tempDir, "proposals.json");
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

function makeProposal(overrides?: Partial<StoredProposal>): StoredProposal {
  return {
    id: `proposal-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    decision: "approved",
    description: "Test task",
    evaluatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("ProposalStateStore", () => {
  describe("recordApproval + hasApprovedProposal", () => {
    it("records and retrieves an approved proposal", async () => {
      const store = new ProposalStateStore({ path: statePath });
      expect(await store.hasApprovedProposal()).toBe(false);

      await store.recordApproval(makeProposal());
      expect(await store.hasApprovedProposal()).toBe(true);
    });

    it("sets 0600 file permissions", async () => {
      const store = new ProposalStateStore({ path: statePath });
      await store.recordApproval(makeProposal());

      const stats = await stat(statePath);
      const mode = stats.mode & 0o777;
      expect(mode).toBe(0o600);
    });

    it("deduplicates by proposal id", async () => {
      const store = new ProposalStateStore({ path: statePath });
      const proposal = makeProposal({ id: "dup-id" });

      await store.recordApproval(proposal);
      await store.recordApproval({ ...proposal, description: "Updated" });

      const latest = await store.getLatestApproved();
      expect(latest?.id).toBe("dup-id");
      expect(latest?.description).toBe("Updated");
    });
  });

  describe("getLatestApproved", () => {
    it("returns null when empty", async () => {
      const store = new ProposalStateStore({ path: statePath });
      expect(await store.getLatestApproved()).toBeNull();
    });

    it("returns the most recently evaluated proposal", async () => {
      const store = new ProposalStateStore({ path: statePath });

      await store.recordApproval(
        makeProposal({
          id: "older",
          evaluatedAt: new Date(Date.now() - 60000).toISOString(),
        }),
      );
      await store.recordApproval(
        makeProposal({
          id: "newer",
          evaluatedAt: new Date().toISOString(),
        }),
      );

      const latest = await store.getLatestApproved();
      expect(latest?.id).toBe("newer");
    });

    it("ignores proposals older than 8 hours", async () => {
      const store = new ProposalStateStore({ path: statePath });
      const nineHoursAgo = new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString();

      await store.recordApproval(makeProposal({ evaluatedAt: nineHoursAgo }));
      expect(await store.hasApprovedProposal()).toBe(false);
      expect(await store.getLatestApproved()).toBeNull();
    });
  });

  describe("stale entry pruning", () => {
    it("prunes stale entries when recording new ones", async () => {
      const store = new ProposalStateStore({ path: statePath });
      const nineHoursAgo = new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString();

      await store.recordApproval(makeProposal({ id: "stale", evaluatedAt: nineHoursAgo }));
      await store.recordApproval(makeProposal({ id: "fresh" }));

      // Only the fresh one should remain
      const latest = await store.getLatestApproved();
      expect(latest?.id).toBe("fresh");
    });
  });

  describe("resilience", () => {
    it("returns empty state when file does not exist", async () => {
      const store = new ProposalStateStore({ path: join(tempDir, "nope.json") });
      expect(await store.hasApprovedProposal()).toBe(false);
    });

    it("returns empty state for corrupted file", async () => {
      const { writeFile: wf } = await import("node:fs/promises");
      await wf(statePath, "not json");
      const store = new ProposalStateStore({ path: statePath });
      expect(await store.hasApprovedProposal()).toBe(false);
    });

    it("creates parent directories if needed", async () => {
      const nestedPath = join(tempDir, "deep", "nested", "proposals.json");
      const store = new ProposalStateStore({ path: nestedPath });
      await store.recordApproval(makeProposal());
      expect(await store.hasApprovedProposal()).toBe(true);
    });
  });

  describe("filePath", () => {
    it("returns the configured path", () => {
      const store = new ProposalStateStore({ path: "/tmp/test.json" });
      expect(store.filePath).toBe("/tmp/test.json");
    });
  });
});
