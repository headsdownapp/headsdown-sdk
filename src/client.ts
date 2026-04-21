import { CredentialStore, DeviceFlow } from "./auth.js";
import { ApiError, AuthError, ValidationError } from "./errors.js";
import { GraphQLClient, toGraphQLEnum } from "./graphql.js";
import {
  ACTIVE_CONTRACT_QUERY,
  ACTIVE_DELEGATION_GRANTS_QUERY,
  APPLY_PRESET_MUTATION,
  AUTO_RESPONDER_SETTINGS_QUERY,
  AVAILABILITY_QUERY,
  CALIBRATION_PROFILES_QUERY,
  COMPANY_QUERY,
  CREATE_CONTRACT_MUTATION,
  CREATE_DELEGATION_GRANT_MUTATION,
  DIGEST_SUMMARIES_QUERY,
  DISMISS_DIGEST_ENTRY_MUTATION,
  EVALUATE_INTERRUPT_QUERY,
  LIST_DELEGATION_GRANTS_QUERY,
  LIST_PRESETS_QUERY,
  LIST_PROPOSALS_QUERY,
  OVERRIDE_VERDICT_MUTATION,
  PROFILE_QUERY,
  REPORT_OUTCOME_MUTATION,
  REVOKE_DELEGATION_GRANT_MUTATION,
  REVOKE_DELEGATION_GRANTS_MUTATION,
  SCHEDULE_QUERY,
  SUBMIT_PROPOSAL_MUTATION,
  TEAM_PRESENCE_QUERY,
  TEAMS_QUERY,
  UPDATE_AUTO_RESPONDER_SETTINGS_MUTATION,
  UPDATE_VERDICT_SETTINGS_MUTATION,
  VERDICT_SETTINGS_QUERY,
} from "./queries.js";
import type {
  ActorContext,
  AutoResponderSettings,
  CalibrationProfile,
  ClientOptions,
  DelegationGrant,
  DelegationGrantFilterInput,
  DelegationGrantInput,
  Company,
  Contract,
  ContractInput,
  DeviceAuthorization,
  DeviceFlowOptions,
  DigestSummary,
  InterruptResult,
  ListDigestOptions,
  ListProposalsOptions,
  ListTeamsOptions,
  OutcomeInput,
  OverrideInput,
  Preset,
  ProposalInput,
  ScheduleResolution,
  TaskOutcome,
  TaskProposal,
  Team,
  TeamPresence,
  RevokeDelegationGrantsResult,
  UpdateAutoResponderInput,
  UserProfile,
  Verdict,
  VerdictOverride,
  VerdictSettings,
} from "./types.js";
import type {
  ActiveContractQuery,
  ApplyPresetMutation,
  AutoResponderSettingsQuery,
  AvailabilityQuery,
  CalibrationProfilesQuery,
  CompanyQuery,
  CreateContractMutation,
  DigestSummariesQuery,
  DismissDigestEntryMutation,
  EvaluateInterruptQuery,
  OverrideVerdictMutation,
  PresetsQuery,
  ProfileQuery,
  ProposalsQuery,
  ReportOutcomeMutation,
  ScheduleQuery,
  SubmitProposalMutation,
  TeamPresenceQuery,
  TeamsQuery,
  UpdateAutoResponderSettingsMutation,
  UpdateVerdictSettingsMutation,
  VerdictSettingsQuery,
} from "./generated/graphql-types.js";

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
 * const { contract, schedule } = await client.getAvailability();
 * ```
 */
export class HeadsDownClient {
  private readonly graphql: GraphQLClient;
  private readonly clientOptions: ClientOptions & { apiKey: string };

  constructor(options: ClientOptions = {}) {
    const apiKey = resolveApiKey(options.apiKey);
    if (!apiKey) {
      throw new AuthError(
        "No API key provided. Pass { apiKey } explicitly, set HEADSDOWN_API_KEY, " +
          "or use HeadsDownClient.fromCredentials() to load from disk.",
      );
    }

    validateActorContext(options.actorContext);

    this.clientOptions = {
      apiKey,
      baseUrl: options.baseUrl,
      fetch: options.fetch,
      timeout: options.timeout,
      retry: options.retry,
      hooks: options.hooks,
      actorContext: options.actorContext,
    };

    this.graphql = new GraphQLClient({
      apiKey,
      baseUrl: options.baseUrl,
      fetch: options.fetch,
      timeout: options.timeout,
      retries: options.retry?.retries,
      retryDelayMs: options.retry?.retryDelayMs,
      hooks: options.hooks,
      actorContext: options.actorContext,
    });
  }

  /**
   * Create a derived client with actor context override for scoped authorization.
   *
   * @example
   * ```ts
   * await client.withActor({ source: "pi", sessionId: "sess_123" }).submitProposal({ ... });
   * ```
   */
  withActor(actorContext?: ActorContext): HeadsDownClient {
    return new HeadsDownClient({ ...this.clientOptions, actorContext });
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
      retry: options?.retry,
      hooks: options?.hooks,
      actorContext: options?.actorContext,
    });
  }

  // === Availability ===

  /** Get the user's active availability contract. Returns null if no contract is set. */
  async getActiveContract(): Promise<Contract | null> {
    try {
      const data = await this.graphql.request<ActiveContractQuery>(ACTIVE_CONTRACT_QUERY);
      return data.activeContract as Contract | null;
    } catch (error) {
      // The API returns a GraphQL error when no contract exists.
      if (error instanceof Error && error.message.includes("No active contract")) {
        return null;
      }
      throw error;
    }
  }

  /** Get the user's current schedule resolution. Optionally pass an ISO 8601 datetime to check at a specific time. */
  async getSchedule(options?: { at?: string }): Promise<ScheduleResolution> {
    const variables = options?.at ? { at: options.at } : undefined;
    const data = await this.graphql.request<ScheduleQuery>(SCHEDULE_QUERY, variables);
    if (!data.schedule) {
      throw new ApiError("HeadsDown API returned no schedule data.");
    }
    return data.schedule as ScheduleResolution;
  }

  /**
   * Get both contract and schedule in a single request.
   * This is the recommended way to check availability before starting work.
   * Optionally pass an ISO 8601 datetime to check at a specific time.
   */
  async getAvailability(options?: {
    at?: string;
  }): Promise<{ contract: Contract | null; schedule: ScheduleResolution }> {
    try {
      const variables = options?.at ? { at: options.at } : undefined;
      const data = await this.graphql.request<AvailabilityQuery>(AVAILABILITY_QUERY, variables);
      if (!data.schedule) {
        throw new ApiError("HeadsDown API returned no schedule data.");
      }
      return {
        contract: data.activeContract as Contract | null,
        schedule: data.schedule as ScheduleResolution,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("No active contract")) {
        const schedule = await this.getSchedule(options);
        return { contract: null, schedule };
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

    const data = await this.graphql.request<SubmitProposalMutation>(
      SUBMIT_PROPOSAL_MUTATION,
      variables,
    );
    if (!data.submitProposal) {
      throw new ApiError("HeadsDown API returned no submitProposal data.");
    }
    return data.submitProposal as Verdict;
  }

  /**
   * Override a verdict decision.
   * Lets a user change a deferred verdict to approved, or vice versa.
   */
  async overrideVerdict(input: OverrideInput): Promise<VerdictOverride> {
    if (!input.proposalId?.trim()) {
      throw new ValidationError("Proposal ID is required.", "proposalId");
    }

    const variables = {
      input: stripUndefined({
        proposalId: input.proposalId,
        overrideVerdict: toGraphQLEnum(input.overrideVerdict),
        reason: input.reason,
      }),
    };

    const data = await this.graphql.request<OverrideVerdictMutation>(
      OVERRIDE_VERDICT_MUTATION,
      variables,
    );
    if (!data.overrideVerdict) {
      throw new ApiError("HeadsDown API returned no overrideVerdict data.");
    }
    return data.overrideVerdict as VerdictOverride;
  }

  // === Delegation Grants ===

  /**
   * Create a delegation grant for actor-scoped authorization.
   * Session scope requires sessionId, workspace scope requires workspaceRef.
   */
  async createDelegationGrant(input: DelegationGrantInput): Promise<DelegationGrant> {
    validateDelegationGrantInput(input);

    const variables = {
      input: stripUndefined({
        scope: toGraphQLEnum(input.scope),
        sessionId: input.sessionId,
        workspaceRef: input.workspaceRef,
        agentId: input.agentId,
        permissions: input.permissions.map((permission) => toGraphQLEnum(permission)),
        durationMinutes: input.durationMinutes,
        expiresAt: input.expiresAt,
        source: input.source,
      }),
    };

    const data = await this.graphql.request<{ createDelegationGrant: DelegationGrant | null }>(
      CREATE_DELEGATION_GRANT_MUTATION,
      variables,
    );
    if (!data.createDelegationGrant) {
      throw new ApiError("HeadsDown API returned no createDelegationGrant data.");
    }
    return data.createDelegationGrant as DelegationGrant;
  }

  /** List delegation grants, optionally filtered. */
  async listDelegationGrants(filter?: DelegationGrantFilterInput): Promise<DelegationGrant[]> {
    validateDelegationGrantFilter(filter);

    const variables = filter
      ? {
          filter: stripUndefined({
            active: filter.active,
            scope: filter.scope ? toGraphQLEnum(filter.scope) : undefined,
            sessionId: filter.sessionId,
            workspaceRef: filter.workspaceRef,
            agentId: filter.agentId,
            source: filter.source,
          }),
        }
      : undefined;

    const data = await this.graphql.request<{ delegationGrants: DelegationGrant[] | null }>(
      LIST_DELEGATION_GRANTS_QUERY,
      variables,
    );
    return (data.delegationGrants ?? []) as DelegationGrant[];
  }

  /** List currently active delegation grants. */
  async listActiveDelegationGrants(): Promise<DelegationGrant[]> {
    const data = await this.graphql.request<{ activeDelegationGrants: DelegationGrant[] | null }>(
      ACTIVE_DELEGATION_GRANTS_QUERY,
    );
    return (data.activeDelegationGrants ?? []) as DelegationGrant[];
  }

  /** Revoke a delegation grant by id. */
  async revokeDelegationGrant(id: string): Promise<DelegationGrant> {
    if (!id?.trim()) {
      throw new ValidationError("Delegation grant ID is required.", "id");
    }

    const data = await this.graphql.request<{ revokeDelegationGrant: DelegationGrant | null }>(
      REVOKE_DELEGATION_GRANT_MUTATION,
      { id },
    );

    if (!data.revokeDelegationGrant) {
      throw new ApiError("HeadsDown API returned no revokeDelegationGrant data.");
    }

    return data.revokeDelegationGrant as DelegationGrant;
  }

  /** Revoke delegation grants in bulk, optionally filtered. */
  async revokeDelegationGrants(
    filter?: DelegationGrantFilterInput,
  ): Promise<RevokeDelegationGrantsResult> {
    validateDelegationGrantFilter(filter);

    const variables = filter
      ? {
          filter: stripUndefined({
            active: filter.active,
            scope: filter.scope ? toGraphQLEnum(filter.scope) : undefined,
            sessionId: filter.sessionId,
            workspaceRef: filter.workspaceRef,
            agentId: filter.agentId,
            source: filter.source,
          }),
        }
      : undefined;

    const data = await this.graphql.request<{
      revokeDelegationGrants: RevokeDelegationGrantsResult | null;
    }>(REVOKE_DELEGATION_GRANTS_MUTATION, variables);

    if (!data.revokeDelegationGrants) {
      throw new ApiError("HeadsDown API returned no revokeDelegationGrants data.");
    }

    return data.revokeDelegationGrants as RevokeDelegationGrantsResult;
  }

  /** List previously submitted proposals, optionally filtered by verdict or limited. */
  async listProposals(options?: ListProposalsOptions): Promise<TaskProposal[]> {
    const variables: Record<string, unknown> = {};
    if (options?.verdict) variables.verdict = toGraphQLEnum(options.verdict);
    if (options?.latest !== undefined) variables.latest = options.latest;

    const data = await this.graphql.request<ProposalsQuery>(
      LIST_PROPOSALS_QUERY,
      Object.keys(variables).length > 0 ? variables : undefined,
    );
    return (data.proposals ?? []) as TaskProposal[];
  }

  // === Presets ===

  /** List the user's saved availability presets. */
  async listPresets(): Promise<Preset[]> {
    const data = await this.graphql.request<PresetsQuery>(LIST_PRESETS_QUERY);
    return (data.presets ?? []) as Preset[];
  }

  /** Apply a preset to create a new availability contract. */
  async applyPreset(presetId: string): Promise<Contract> {
    if (!presetId?.trim()) {
      throw new ValidationError("Preset ID is required.", "presetId");
    }

    const data = await this.graphql.request<ApplyPresetMutation>(APPLY_PRESET_MUTATION, {
      id: presetId,
    });
    if (!data.applyPreset) {
      throw new ApiError("HeadsDown API returned no applyPreset data.");
    }
    return data.applyPreset as Contract;
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
        autoRespond: input.autoRespond,
        status: input.status,
        statusEmoji: input.statusEmoji,
        statusText: input.statusText,
        lock: input.lock,
        duration: input.duration,
        ruleSetType: input.ruleSetType,
        ruleSetParams: input.ruleSetParams,
      }),
    };

    const data = await this.graphql.request<CreateContractMutation>(
      CREATE_CONTRACT_MUTATION,
      variables,
    );
    if (!data.createContract) {
      throw new ApiError("HeadsDown API returned no createContract data.");
    }
    return data.createContract as Contract;
  }

  // === Profile ===

  /** Get the authenticated user's profile. Useful for verifying authentication. */
  async getProfile(): Promise<UserProfile> {
    const data = await this.graphql.request<ProfileQuery>(PROFILE_QUERY);
    if (!data.profile) {
      throw new ApiError("HeadsDown API returned no profile data.");
    }
    return data.profile as UserProfile;
  }

  // === Interrupts ===

  /**
   * Evaluate whether interrupting a user is allowed based on their current availability.
   * Returns whether the interrupt is allowed, the reason, and an optional auto-response message.
   */
  async evaluateInterrupt(handle: string): Promise<InterruptResult> {
    if (!handle?.trim()) {
      throw new ValidationError("Handle is required.", "handle");
    }

    const data = await this.graphql.request<EvaluateInterruptQuery>(EVALUATE_INTERRUPT_QUERY, {
      handle,
    });
    if (!data.evaluateInterrupt) {
      throw new ApiError("HeadsDown API returned no evaluateInterrupt data.");
    }
    return data.evaluateInterrupt as InterruptResult;
  }

  // === Digest ===

  /**
   * List digest summaries: aggregated notifications that arrived while the user was in focus mode.
   * Each summary groups events from the same actor and source.
   */
  async listDigestSummaries(options?: ListDigestOptions): Promise<DigestSummary[]> {
    const variables: Record<string, unknown> = {};
    if (options?.latest !== undefined) variables.latest = options.latest;

    const data = await this.graphql.request<DigestSummariesQuery>(
      DIGEST_SUMMARIES_QUERY,
      Object.keys(variables).length > 0 ? variables : undefined,
    );
    return (data.digestSummaries ?? []) as DigestSummary[];
  }

  /** Dismiss a digest summary entry by id. */
  async dismissDigestEntry(id: string): Promise<DigestSummary> {
    if (!id?.trim()) {
      throw new ValidationError("Digest entry ID is required.", "id");
    }

    const data = await this.graphql.request<DismissDigestEntryMutation>(
      DISMISS_DIGEST_ENTRY_MUTATION,
      { id },
    );
    if (!data.dismissDigestEntry) {
      throw new ApiError("HeadsDown API returned no dismissDigestEntry data.");
    }
    return data.dismissDigestEntry as DigestSummary;
  }

  // === Auto Responder ===

  /** Get auto-responder message templates. */
  async getAutoResponderSettings(): Promise<AutoResponderSettings> {
    const data = await this.graphql.request<AutoResponderSettingsQuery>(
      AUTO_RESPONDER_SETTINGS_QUERY,
    );
    if (!data.autoResponderSettings) {
      throw new ApiError("HeadsDown API returned no autoResponderSettings data.");
    }
    return data.autoResponderSettings as AutoResponderSettings;
  }

  /** Update auto-responder message templates. */
  async updateAutoResponderSettings(
    input: UpdateAutoResponderInput,
  ): Promise<AutoResponderSettings> {
    const variables = stripUndefined({
      busyText: input.busyText,
      limitedText: input.limitedText,
      offlineText: input.offlineText,
    });

    const data = await this.graphql.request<UpdateAutoResponderSettingsMutation>(
      UPDATE_AUTO_RESPONDER_SETTINGS_MUTATION,
      Object.keys(variables).length > 0 ? variables : undefined,
    );
    if (!data.updateAutoResponderSettings) {
      throw new ApiError("HeadsDown API returned no updateAutoResponderSettings data.");
    }
    return data.updateAutoResponderSettings as AutoResponderSettings;
  }

  // === Teams ===

  /** List teams for the current user, optionally filtered by team id. */
  async listTeams(options?: ListTeamsOptions): Promise<Team[]> {
    const variables = options?.id ? { id: options.id } : undefined;
    const data = await this.graphql.request<TeamsQuery>(TEAMS_QUERY, variables);
    return (data.teams ?? []) as Team[];
  }

  /** Get the current user's company and teams. */
  async getCompany(): Promise<Company | null> {
    const data = await this.graphql.request<CompanyQuery>(COMPANY_QUERY);
    return data.company as Company | null;
  }

  /** List currently online members for a team. */
  async listTeamPresence(teamId: string): Promise<TeamPresence[]> {
    if (!teamId?.trim()) {
      throw new ValidationError("Team ID is required.", "teamId");
    }

    const data = await this.graphql.request<TeamPresenceQuery>(TEAM_PRESENCE_QUERY, {
      teamId,
    });
    return (data.teamPresence ?? []) as TeamPresence[];
  }

  // === Calibration Profiles ===

  /** List calibration profiles for the current user's model/framework pairs. */
  async listCalibrationProfiles(): Promise<CalibrationProfile[]> {
    const data = await this.graphql.request<CalibrationProfilesQuery>(CALIBRATION_PROFILES_QUERY);
    return (data.calibrationProfiles ?? []) as CalibrationProfile[];
  }

  // === Verdict Settings ===

  /** Get the current verdict evaluation settings. */
  async getVerdictSettings(): Promise<VerdictSettings> {
    const data = await this.graphql.request<VerdictSettingsQuery>(VERDICT_SETTINGS_QUERY);
    if (!data.verdictSettings) {
      throw new ApiError("HeadsDown API returned no verdictSettings data.");
    }
    return data.verdictSettings as VerdictSettings;
  }

  /** Update the verdict evaluation mode thresholds. */
  async updateVerdictSettings(modeThresholds: Record<string, unknown>): Promise<VerdictSettings> {
    const data = await this.graphql.request<UpdateVerdictSettingsMutation>(
      UPDATE_VERDICT_SETTINGS_MUTATION,
      { modeThresholds },
    );
    if (!data.updateVerdictSettings) {
      throw new ApiError("HeadsDown API returned no updateVerdictSettings data.");
    }
    return data.updateVerdictSettings as VerdictSettings;
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

    const data = await this.graphql.request<ReportOutcomeMutation>(
      REPORT_OUTCOME_MUTATION,
      variables,
    );
    if (!data.reportOutcome) {
      throw new ApiError("HeadsDown API returned no reportOutcome data.");
    }
    return data.reportOutcome as TaskOutcome;
  }
}

// === Helpers ===

function validateDelegationGrantInput(input: DelegationGrantInput): void {
  if (!input.permissions || input.permissions.length === 0) {
    throw new ValidationError(
      "Delegation grant permissions must include at least one permission.",
      "permissions",
    );
  }

  if (input.scope === "session" && !isNonEmptyString(input.sessionId)) {
    throw new ValidationError("sessionId is required for session scope.", "sessionId");
  }

  if (input.scope === "workspace" && !isNonEmptyString(input.workspaceRef)) {
    throw new ValidationError("workspaceRef is required for workspace scope.", "workspaceRef");
  }
}

function validateDelegationGrantFilter(filter?: DelegationGrantFilterInput): void {
  if (!filter) return;

  if (
    filter.scope === "session" &&
    filter.sessionId !== undefined &&
    !isNonEmptyString(filter.sessionId)
  ) {
    throw new ValidationError("sessionId must be a non-empty string when provided.", "sessionId");
  }

  if (
    filter.scope === "workspace" &&
    filter.workspaceRef !== undefined &&
    !isNonEmptyString(filter.workspaceRef)
  ) {
    throw new ValidationError(
      "workspaceRef must be a non-empty string when provided.",
      "workspaceRef",
    );
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateActorContext(actorContext?: ActorContext): void {
  if (!actorContext) return;

  validateActorContextField("source", actorContext.source, true);
  validateActorContextField("agentId", actorContext.agentId, false);
  validateActorContextField("sessionId", actorContext.sessionId, false);
  validateActorContextField("workspaceRef", actorContext.workspaceRef, false);
}

function validateActorContextField(
  field: keyof ActorContext,
  value: unknown,
  required: boolean,
): void {
  if (value === undefined || value === null) {
    if (required) {
      throw new ValidationError(`Actor context ${field} is required.`, `actorContext.${field}`);
    }
    return;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(
      `Actor context ${field} must be a non-empty string when provided.`,
      `actorContext.${field}`,
    );
  }
}

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
