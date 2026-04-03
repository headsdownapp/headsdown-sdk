import { readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

/** An approved proposal stored for hook consumption. */
export interface StoredProposal {
  id: string;
  decision: "approved";
  description: string;
  evaluatedAt: string;
}

interface ProposalStateFile {
  proposals: StoredProposal[];
}

const MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours

/**
 * Tracks approved proposals in a temp file so hooks can check
 * whether a proposal was approved without calling the API.
 *
 * The file is UID-scoped and has 0600 permissions.
 */
export class ProposalStateStore {
  private readonly path: string;

  constructor(options?: { path?: string }) {
    this.path = options?.path ?? defaultProposalStatePath();
  }

  /** Record an approved proposal. Prunes stale entries. */
  async recordApproval(proposal: StoredProposal): Promise<void> {
    const current = await this.loadRaw();
    const now = Date.now();

    // Prune stale entries
    const fresh = current.proposals.filter((p) => {
      const age = now - new Date(p.evaluatedAt).getTime();
      return age < MAX_AGE_MS;
    });

    // Add new proposal (deduplicate by id)
    const existing = fresh.findIndex((p) => p.id === proposal.id);
    if (existing >= 0) {
      fresh[existing] = proposal;
    } else {
      fresh.push(proposal);
    }

    await this.writeRaw({ proposals: fresh });
  }

  /** Check if any approved proposal exists within the TTL window. */
  async hasApprovedProposal(): Promise<boolean> {
    const state = await this.loadRaw();
    const now = Date.now();
    return state.proposals.some((p) => {
      const age = now - new Date(p.evaluatedAt).getTime();
      return p.decision === "approved" && age < MAX_AGE_MS;
    });
  }

  /** Get the most recent approved proposal, if any. */
  async getLatestApproved(): Promise<StoredProposal | null> {
    const state = await this.loadRaw();
    const now = Date.now();

    const valid = state.proposals
      .filter(
        (p) => p.decision === "approved" && now - new Date(p.evaluatedAt).getTime() < MAX_AGE_MS,
      )
      .sort((a, b) => new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime());

    return valid[0] ?? null;
  }

  /** Return the state file path. */
  get filePath(): string {
    return this.path;
  }

  private async loadRaw(): Promise<ProposalStateFile> {
    try {
      const raw = await readFile(this.path, "utf-8");
      const parsed = JSON.parse(raw) as Partial<ProposalStateFile>;
      if (Array.isArray(parsed.proposals)) {
        return { proposals: parsed.proposals };
      }
      return { proposals: [] };
    } catch {
      return { proposals: [] };
    }
  }

  private async writeRaw(state: ProposalStateFile): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path, JSON.stringify(state, null, 2) + "\n", { mode: 0o600 });
  }
}

function defaultProposalStatePath(): string {
  const uid = process.getuid?.() ?? process.pid;
  return join(tmpdir(), `headsdown-proposals-${uid}.json`);
}
