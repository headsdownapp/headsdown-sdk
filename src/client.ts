import { CredentialStore, DeviceFlow } from "./auth.js";
import { AuthError, ValidationError } from "./errors.js";
import { GraphQLClient, toGraphQLEnum } from "./graphql.js";
import {
  ACTIVE_CONTRACT_QUERY,
  APPLY_PRESET_MUTATION,
  AVAILABILITY_QUERY,
  CALENDAR_QUERY,
  CREATE_CONTRACT_MUTATION,
  LIST_PRESETS_QUERY,
  LIST_PROPOSALS_QUERY,
  PROFILE_QUERY,
  REPORT_OUTCOME_MUTATION,
  SUBMIT_PROPOSAL_MUTATION,
} from "./queries.js";
import type {
  Calendar,
  ClientOptions,
  Contract,
  ContractInput,
  DeviceAuthorization,
  DeviceFlowOptions,
  ListProposalsOptions,
  OutcomeInput,
  Preset,
  ProposalInput,
  TaskOutcome,
  TaskProposal,
  UserProfile,
  Verdict,
} from "./types.js";

/**
 * HeadsDown API client. Provides typed methods for all API operations:
 * availability, verdicts, presets, contracts, and user profile.
 *
 * @example
 * ```ts
 * // With explicit API key
 * const client = new HeadsDownClient({ apiKey: "hd_..." });
 *
 * // From saved credentials
 * const client = await HeadsDownClient.fromCredentials();
 *
 * // Check availability
 * const { contract, calendar } = await client.getAvailability();
 * ```
 */
export class HeadsDownClient {
  private readonly graphql: GraphQLClient;

  constructor(options: ClientOptions = {}) {
    const apiKey = resolveApiKey(options.apiKey);
    if (!apiKey) {
      throw new AuthError(
        "No API key provided. Pass { apiKey } explicitly, set HEADSDOWN_API_KEY, " +
          "or use HeadsDownClient.fromCredentials() to load from disk.",
      );
    }

    this.graphql = new GraphQLClient({
      apiKey,
      baseUrl: options.baseUrl,
      fetch: options.fetch,
      timeout: options.timeout,
    });
  }

  /**
   * Create a client using credentials saved on disk
   * (from Device Flow auth or manual setup).
   */
  static async fromCredentials(
    options?: Omit<ClientOptions, "apiKey"> & { credentialsPath?: string },
  ): Promise<HeadsDownClient> {
    const store = new CredentialStore(
      options?.credentialsPath ? { path: options.credentialsPath } : undefined,
    );
    const creds = await store.load();
    if (!creds) {
      throw new AuthError(
        `No credentials found at ${store.filePath}. Run Device Flow authentication first.`,
      );
    }
    return new HeadsDownClient({ ...options, apiKey: creds.apiKey });
  }

  /**
   * Authenticate via Device Flow: start the flow, let the caller handle the user
   * interaction, poll for approval, save credentials, and return a ready client.
   *
   * @param onUserCode - Called with the authorization details so the caller can
   *   display the verification URL and user code to the user.
   * @param options - Device Flow and client options.
   * @param signal - Optional AbortSignal to cancel the flow.
   */
  static async authenticate(
    onUserCode: (auth: DeviceAuthorization) => void | Promise<void>,
    options?: DeviceFlowOptions & Omit<ClientOptions, "apiKey"> & { credentialsPath?: string },
    signal?: AbortSignal,
  ): Promise<HeadsDownClient> {
    const flow = new DeviceFlow({
      baseUrl: options?.baseUrl,
      fetch: options?.fetch,
    });

    const auth = await flow.start(options?.label);
    await onUserCode(auth);

    const apiKey = await flow.poll(auth.deviceCode, auth.interval, auth.expiresIn, signal);

    const store = new CredentialStore(
      options?.credentialsPath ? { path: options.credentialsPath } : undefined,
    );
    await store.save(apiKey, options?.label);

    return new HeadsDownClient({
      apiKey,
      baseUrl: options?.baseUrl,
      fetch: options?.fetch,
      timeout: options?.timeout,
    });
  }

  // === Availability ===

  /** Get the user's active availability contract. Returns null if no contract is set. */
  async getActiveContract(): Promise<Contract | null> {
    try {
      const data = await this.graphql.request<{ activeContract: Contract }>(ACTIVE_CONTRACT_QUERY);
      return data.activeContract;
    } catch (error) {
      // The API returns a GraphQL error when no contract exists.
      if (error instanceof Error && error.message.includes("No active contract")) {
        return null;
      }
      throw error;
    }
  }

  /** Get the user's current work schedule context. */
  async getCalendar(): Promise<Calendar> {
    const data = await this.graphql.request<{ calendar: Calendar }>(CALENDAR_QUERY);
    return data.calendar;
  }

  /**
   * Get both contract and calendar in a single request.
   * This is the recommended way to check availability before starting work.
   */
  async getAvailability(): Promise<{ contract: Contract | null; calendar: Calendar }> {
    try {
      const data = await this.graphql.request<{
        activeContract: Contract;
        calendar: Calendar;
      }>(AVAILABILITY_QUERY);
      return { contract: data.activeContract, calendar: data.calendar };
    } catch (error) {
      if (error instanceof Error && error.message.includes("No active contract")) {
        // Fall back to calendar-only when no contract exists.
        const calendar = await this.getCalendar();
        return { contract: null, calendar };
      }
      throw error;
    }
  }

  // === Verdicts ===

  /**
   * Submit a task proposal for verdict evaluation.
   * HeadsDown evaluates the proposal against the user's current availability.
   *
   * @returns The verdict: `approved` (proceed) or `deferred` (postpone/reduce scope).
   */
  async submitProposal(input: ProposalInput): Promise<Verdict> {
    if (!input.description?.trim()) {
      throw new ValidationError("Proposal description is required.", "description");
    }
    if (!input.agentRef?.trim()) {
      throw new ValidationError("Agent reference is required.", "agentRef");
    }

    // Generate a unique sourceRef if not provided, to avoid duplicate-key errors.
    const sourceRef = input.sourceRef ?? `${input.agentRef}-${Date.now()}-${randomHex(6)}`;

    const variables = {
      input: stripUndefined({
        agentRef: input.agentRef,
        model: input.model,
        framework: input.framework,
        description: input.description.trim(),
        estimatedFiles: input.estimatedFiles,
        estimatedMinutes: input.estimatedMinutes,
        scopeSummary: input.scopeSummary,
        sourceRef,
      }),
    };

    const data = await this.graphql.request<{ submitProposal: Verdict }>(
      SUBMIT_PROPOSAL_MUTATION,
      variables,
    );
    return data.submitProposal;
  }

  /** List previously submitted proposals, optionally filtered by verdict or limited. */
  async listProposals(options?: ListProposalsOptions): Promise<TaskProposal[]> {
    const variables: Record<string, unknown> = {};
    if (options?.verdict) variables.verdict = toGraphQLEnum(options.verdict);
    if (options?.latest !== undefined) variables.latest = options.latest;

    const data = await this.graphql.request<{ proposals: TaskProposal[] }>(
      LIST_PROPOSALS_QUERY,
      Object.keys(variables).length > 0 ? variables : undefined,
    );
    return data.proposals;
  }

  // === Presets ===

  /** List the user's saved availability presets. */
  async listPresets(): Promise<Preset[]> {
    const data = await this.graphql.request<{ presets: Preset[] }>(LIST_PRESETS_QUERY);
    return data.presets;
  }

  /** Apply a preset to create a new availability contract. */
  async applyPreset(presetId: string): Promise<Contract> {
    if (!presetId?.trim()) {
      throw new ValidationError("Preset ID is required.", "presetId");
    }

    const data = await this.graphql.request<{ applyPreset: Contract }>(APPLY_PRESET_MUTATION, {
      id: presetId,
    });
    return data.applyPreset;
  }

  // === Contracts ===

  /**
   * Create a new availability contract directly (without a preset).
   * This sets the user's current mode, status, and availability.
   */
  async createContract(input: ContractInput): Promise<Contract> {
    const variables = {
      input: stripUndefined({
        mode: toGraphQLEnum(input.mode),
        afk: input.afk,
        autoRespond: input.autoRespond,
        status: input.status,
        statusEmoji: input.statusEmoji,
        statusText: input.statusText,
        lock: input.lock,
        duration: input.duration,
      }),
    };

    const data = await this.graphql.request<{ createContract: Contract }>(
      CREATE_CONTRACT_MUTATION,
      variables,
    );
    return data.createContract;
  }

  // === Profile ===

  /** Get the authenticated user's profile. Useful for verifying authentication. */
  async getProfile(): Promise<UserProfile> {
    const data = await this.graphql.request<{ profile: UserProfile }>(PROFILE_QUERY);
    return data.profile;
  }

  // === Calibration ===

  /**
   * Report a task outcome (insert or update).
   * First call for a proposal creates the outcome. Subsequent calls update it.
   * This supports checkpoint-and-update semantics for reliable reporting.
   */
  async reportOutcome(input: OutcomeInput): Promise<TaskOutcome> {
    if (!input.proposalId?.trim()) {
      throw new ValidationError("Proposal ID is required.", "proposalId");
    }
    if (!input.outcome?.trim()) {
      throw new ValidationError("Outcome is required.", "outcome");
    }

    const variables = {
      input: stripUndefined({
        proposalId: input.proposalId,
        outcome: toGraphQLEnum(input.outcome),
        actualDurationMinutes: input.actualDurationMinutes,
        filesModified: input.filesModified,
        linesChanged: input.linesChanged,
        errorCategory: input.errorCategory,
        testsPassed: input.testsPassed,
        tokensUsed: input.tokensUsed,
        retryCount: input.retryCount,
        turnCount: input.turnCount,
        scopeChanged: input.scopeChanged,
        redirectCount: input.redirectCount,
        distinctTaskCount: input.distinctTaskCount,
        metadata: input.metadata,
      }),
    };

    const data = await this.graphql.request<{ reportOutcome: TaskOutcome }>(
      REPORT_OUTCOME_MUTATION,
      variables,
    );
    return data.reportOutcome;
  }
}

// === Helpers ===

function resolveApiKey(explicit?: string): string | undefined {
  if (explicit) return explicit;
  return process.env.HEADSDOWN_API_KEY || undefined;
}

/** Remove keys with undefined values so GraphQL doesn't receive null for optional fields. */
function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) result[key] = value;
  }
  return result;
}

function randomHex(bytes: number): string {
  try {
    // Node 19+ and browsers have globalThis.crypto
    const array = new Uint8Array(bytes);
    globalThis.crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    // Fallback for Node 18 where globalThis.crypto may not exist
    const { randomBytes } = require("node:crypto") as typeof import("node:crypto");
    return randomBytes(bytes).toString("hex");
  }
}
