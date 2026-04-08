export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = {
  [_ in K]?: never;
};
export type Incremental<T> =
  | T
  | { [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  DateTime: { input: string; output: string };
  HttpUrl: { input: string; output: string };
  JSON: { input: Record<string, unknown>; output: Record<string, unknown> };
  Time: { input: string; output: string };
};

export type AlertValues =
  | "AFTER_HOURS"
  | "DO_NOT_DISTURB"
  | "INTERRUPTABLE"
  | "OFF"
  | "TAKE_A_NUMBER";

export type ApiKey = {
  id: Scalars["ID"]["output"];
  insertedAt: Scalars["DateTime"]["output"];
  label: Scalars["String"]["output"];
  lastUsedAt: Maybe<Scalars["DateTime"]["output"]>;
  prefix: Scalars["String"]["output"];
};

/** Returned once at creation time. The raw_key is never visible again. */
export type ApiKeyWithRaw = {
  apiKey: ApiKey;
  rawKey: Scalars["String"]["output"];
};

export type AutoResponderSettings = {
  busyText: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  insertedAt: Scalars["DateTime"]["output"];
  limitedText: Scalars["String"]["output"];
  offlineText: Scalars["String"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
};

export type Calendar = {
  automateEndOfDay: Scalars["Boolean"]["output"];
  automateStartOfDay: Scalars["Boolean"]["output"];
  day: DayName;
  endsAt: Scalars["DateTime"]["output"];
  nextWorkday: DayName;
  nextWorkdayStartsAt: Scalars["DateTime"]["output"];
  now: Scalars["DateTime"]["output"];
  offHours: Scalars["Boolean"]["output"];
  startsAt: Scalars["DateTime"]["output"];
  workHours: Scalars["Boolean"]["output"];
  working: Scalars["Boolean"]["output"];
};

export type CalibrationProfile = {
  confidenceLevel: ConfidenceLevel;
  durationCiLower: Maybe<Scalars["Float"]["output"]>;
  durationCiUpper: Maybe<Scalars["Float"]["output"]>;
  framework: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  insertedAt: Scalars["DateTime"]["output"];
  medianDurationMinutes: Maybe<Scalars["Float"]["output"]>;
  model: Scalars["String"]["output"];
  overrideRate: Maybe<Scalars["Float"]["output"]>;
  p25DurationMinutes: Maybe<Scalars["Float"]["output"]>;
  p75DurationMinutes: Maybe<Scalars["Float"]["output"]>;
  sampleSize: Scalars["Int"]["output"];
  status: Scalars["String"]["output"];
  successRate: Maybe<Scalars["Float"]["output"]>;
  successRateCiLower: Maybe<Scalars["Float"]["output"]>;
  successRateCiUpper: Maybe<Scalars["Float"]["output"]>;
  tasksToHighConfidence: Scalars["Int"]["output"];
  tier: Scalars["String"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
};

export type Company = {
  id: Scalars["ID"]["output"];
  name: Maybe<Scalars["String"]["output"]>;
  teams: Maybe<Array<Team>>;
};

export type ConfidenceLevel = "HIGH" | "LEARNING";

/**
 * Private type: contains full contract details (exact expiration timestamps,
 * status text, rule set configuration). Must never be exposed through
 * unauthenticated queries. All queries resolving this type must pass through
 * the Authentication middleware. For public-facing availability data, use
 * the :public_availability type instead.
 */
export type Contract = {
  /** @deprecated Use mode instead. AFK is derived from mode. */
  afk: Scalars["Boolean"]["output"];
  autoRespond: Scalars["Boolean"]["output"];
  duration: Maybe<Scalars["Int"]["output"]>;
  expiresAt: Scalars["DateTime"]["output"];
  id: Scalars["ID"]["output"];
  insertedAt: Scalars["DateTime"]["output"];
  lock: Maybe<Scalars["Boolean"]["output"]>;
  mode: Mode;
  /** @deprecated Digest recording is now automatic. This field will be removed. */
  recordMessages: Scalars["Boolean"]["output"];
  ruleSetParams: Maybe<Scalars["JSON"]["output"]>;
  ruleSetType: Maybe<Scalars["String"]["output"]>;
  /** @deprecated Interrupt policy replaced snooze behavior. Use rule_set_type instead. */
  snooze: Scalars["Boolean"]["output"];
  status: Scalars["Boolean"]["output"];
  statusEmoji: Maybe<Scalars["String"]["output"]>;
  statusText: Maybe<Scalars["String"]["output"]>;
  user: User;
};

export type ContractInput = {
  autoRespond: Scalars["Boolean"]["input"];
  duration: InputMaybe<Scalars["Int"]["input"]>;
  lock: InputMaybe<Scalars["Boolean"]["input"]>;
  mode: Mode;
  ruleSetParams: InputMaybe<Scalars["JSON"]["input"]>;
  ruleSetType: InputMaybe<Scalars["String"]["input"]>;
  status: Scalars["Boolean"]["input"];
  statusEmoji: InputMaybe<Scalars["String"]["input"]>;
  statusText: InputMaybe<Scalars["String"]["input"]>;
};

/** Days of the week */
export type DayName =
  | "FRIDAY"
  | "MONDAY"
  | "SATURDAY"
  | "SUNDAY"
  | "THURSDAY"
  | "TUESDAY"
  | "WEDNESDAY";

export type DeviceTypes = "ANDROID" | "IOS";

export type DigestEvent = {
  description: Scalars["String"]["output"];
  insertedAt: Scalars["DateTime"]["output"];
};

export type DigestSummary = {
  action: Scalars["String"]["output"];
  actorLabel: Scalars["String"]["output"];
  actorRef: Scalars["String"]["output"];
  channelRef: Maybe<Scalars["String"]["output"]>;
  entryCount: Scalars["Int"]["output"];
  events: Array<DigestEvent>;
  firstEventAt: Scalars["DateTime"]["output"];
  id: Scalars["ID"]["output"];
  lastEventAt: Scalars["DateTime"]["output"];
  sourceType: Scalars["String"]["output"];
};

export type InterruptResult = {
  allowed: Scalars["Boolean"]["output"];
  autoResponse: Maybe<Scalars["String"]["output"]>;
  reason: Scalars["String"]["output"];
};

export type MobileClient = {
  /** iOS or Android */
  deviceType: DeviceTypes;
  hardwareId: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  model: Maybe<Scalars["String"]["output"]>;
  pushToken: Maybe<Scalars["String"]["output"]>;
  user: User;
};

export type MobileClientInput = {
  deviceType: DeviceTypes;
  hardwareId: InputMaybe<Scalars["String"]["input"]>;
  model: InputMaybe<Scalars["String"]["input"]>;
  pushToken: Scalars["String"]["input"];
};

export type Mode = "BUSY" | "LIMITED" | "OFFLINE" | "ONLINE";

export type OutcomeInput = {
  actualDurationMinutes: InputMaybe<Scalars["Int"]["input"]>;
  distinctTaskCount: InputMaybe<Scalars["Int"]["input"]>;
  errorCategory: InputMaybe<Scalars["String"]["input"]>;
  filesModified: InputMaybe<Scalars["Int"]["input"]>;
  linesChanged: InputMaybe<Scalars["Int"]["input"]>;
  metadata: InputMaybe<Scalars["JSON"]["input"]>;
  outcome: TaskOutcomeResult;
  proposalId: Scalars["ID"]["input"];
  redirectCount: InputMaybe<Scalars["Int"]["input"]>;
  retryCount: InputMaybe<Scalars["Int"]["input"]>;
  scopeChanged: InputMaybe<Scalars["Boolean"]["input"]>;
  testsPassed: InputMaybe<Scalars["Boolean"]["input"]>;
  tokensUsed: InputMaybe<Scalars["Int"]["input"]>;
  turnCount: InputMaybe<Scalars["Int"]["input"]>;
};

export type OverrideInput = {
  overrideVerdict: VerdictDecision;
  proposalId: Scalars["ID"]["input"];
  reason: InputMaybe<Scalars["String"]["input"]>;
};

export type PresenceValues = "AFK" | "DISTRACTED" | "ON_KEYS";

export type Preset = {
  /** @deprecated Use rule_set_type on contracts instead. Maps to interrupt policy. */
  alerts: AlertValues;
  /** Duration of this mode, when null ends at workday */
  duration: Maybe<Scalars["Int"]["output"]>;
  id: Scalars["ID"]["output"];
  /** Creation timestamp */
  insertedAt: Scalars["DateTime"]["output"];
  /** Friendly name of the preset */
  name: Scalars["String"]["output"];
  /** @deprecated Use mode instead. Physical presence is derived from mode. */
  presence: PresenceValues;
  /** Whether to set a custom status */
  status: Scalars["Boolean"]["output"];
  /** Emoji to use for this preset */
  statusEmoji: Maybe<Scalars["String"]["output"]>;
  /** Status message text */
  statusText: Maybe<Scalars["String"]["output"]>;
  /** Updated timestamp */
  updatedAt: Scalars["DateTime"]["output"];
  user: User;
};

export type PresetInput = {
  alerts: AlertValues;
  duration: InputMaybe<Scalars["Int"]["input"]>;
  name: Scalars["String"]["input"];
  presence: PresenceValues;
  status: Scalars["Boolean"]["input"];
  statusEmoji: InputMaybe<Scalars["String"]["input"]>;
  statusText: InputMaybe<Scalars["String"]["input"]>;
};

export type ProposalInput = {
  agentRef: Scalars["String"]["input"];
  description: Scalars["String"]["input"];
  estimatedFiles: InputMaybe<Scalars["Int"]["input"]>;
  estimatedMinutes: InputMaybe<Scalars["Int"]["input"]>;
  framework: InputMaybe<Scalars["String"]["input"]>;
  model: InputMaybe<Scalars["String"]["input"]>;
  scopeSummary: InputMaybe<Scalars["String"]["input"]>;
  sourceRef: Scalars["String"]["input"];
};

export type PublicPageSettingsInput = {
  showStatusMessage: InputMaybe<Scalars["Boolean"]["input"]>;
  visibilityLevel: InputMaybe<VisibilityLevel>;
};

export type RootMutationType = {
  applyPreset: Maybe<Contract>;
  createApiKey: Maybe<ApiKeyWithRaw>;
  createContract: Maybe<Contract>;
  createPreset: Maybe<Preset>;
  deletePreset: Maybe<Preset>;
  dismissDigestEntry: Maybe<DigestSummary>;
  overrideVerdict: Maybe<VerdictOverride>;
  registerMobileClient: Maybe<MobileClient>;
  /**
   * Report an agent task outcome (insert or update).
   *
   * First call for a proposal creates the outcome. Subsequent calls
   * update it in place. Clients should call this periodically during
   * long sessions (checkpoint) and once on session exit (final report).
   */
  reportOutcome: Maybe<TaskOutcome>;
  revokeApiKey: Maybe<ApiKey>;
  submitProposal: Maybe<Verdict>;
  updateAutoResponderSettings: Maybe<AutoResponderSettings>;
  updateMobileClient: Maybe<MobileClient>;
  updatePreset: Maybe<Preset>;
  updatePublicPageSettings: Maybe<User>;
  updateVerdictSettings: Maybe<VerdictSettings>;
};

export type RootMutationTypeApplyPresetArgs = {
  id: Scalars["ID"]["input"];
};

export type RootMutationTypeCreateApiKeyArgs = {
  label: Scalars["String"]["input"];
};

export type RootMutationTypeCreateContractArgs = {
  input: ContractInput;
};

export type RootMutationTypeCreatePresetArgs = {
  input: PresetInput;
};

export type RootMutationTypeDeletePresetArgs = {
  id: Scalars["ID"]["input"];
};

export type RootMutationTypeDismissDigestEntryArgs = {
  id: Scalars["ID"]["input"];
};

export type RootMutationTypeOverrideVerdictArgs = {
  input: OverrideInput;
};

export type RootMutationTypeRegisterMobileClientArgs = {
  input: InputMaybe<MobileClientInput>;
};

export type RootMutationTypeReportOutcomeArgs = {
  input: OutcomeInput;
};

export type RootMutationTypeRevokeApiKeyArgs = {
  id: Scalars["ID"]["input"];
};

export type RootMutationTypeSubmitProposalArgs = {
  input: ProposalInput;
};

export type RootMutationTypeUpdateAutoResponderSettingsArgs = {
  busyText: InputMaybe<Scalars["String"]["input"]>;
  limitedText: InputMaybe<Scalars["String"]["input"]>;
  offlineText: InputMaybe<Scalars["String"]["input"]>;
};

export type RootMutationTypeUpdateMobileClientArgs = {
  id: Scalars["ID"]["input"];
  input: InputMaybe<MobileClientInput>;
};

export type RootMutationTypeUpdatePresetArgs = {
  id: Scalars["ID"]["input"];
  input: PresetInput;
};

export type RootMutationTypeUpdatePublicPageSettingsArgs = {
  input: PublicPageSettingsInput;
};

export type RootMutationTypeUpdateVerdictSettingsArgs = {
  modeThresholds: Scalars["JSON"]["input"];
};

export type RootQueryType = {
  activeContract: Maybe<Contract>;
  apiKeys: Maybe<Array<ApiKey>>;
  autoResponderSettings: Maybe<AutoResponderSettings>;
  calendar: Maybe<Calendar>;
  /**
   * List calibration profiles for the current user.
   *
   * Returns the best available profile per model/framework pair:
   * per-user profile if it has >= 50 outcomes, otherwise the global
   * (community) profile. Ordered by sample size descending.
   */
  calibrationProfiles: Maybe<Array<CalibrationProfile>>;
  company: Maybe<Company>;
  digestSummaries: Maybe<Array<DigestSummary>>;
  evaluateInterrupt: Maybe<InterruptResult>;
  preset: Maybe<Preset>;
  presets: Maybe<Array<Preset>>;
  profile: Maybe<User>;
  proposals: Maybe<Array<TaskProposal>>;
  teamPresence: Maybe<Array<TeamPresence>>;
  teams: Maybe<Array<Team>>;
  verdictSettings: Maybe<VerdictSettings>;
};

export type RootQueryTypeCalendarArgs = {
  at: InputMaybe<Scalars["DateTime"]["input"]>;
};

export type RootQueryTypeDigestSummariesArgs = {
  latest: InputMaybe<Scalars["Int"]["input"]>;
};

export type RootQueryTypeEvaluateInterruptArgs = {
  handle: Scalars["String"]["input"];
};

export type RootQueryTypePresetArgs = {
  id: Scalars["ID"]["input"];
};

export type RootQueryTypeProposalsArgs = {
  latest: InputMaybe<Scalars["Int"]["input"]>;
  verdict: InputMaybe<VerdictDecision>;
};

export type RootQueryTypeTeamPresenceArgs = {
  teamId: Scalars["ID"]["input"];
};

export type RootQueryTypeTeamsArgs = {
  id: InputMaybe<Scalars["ID"]["input"]>;
};

export type RootSubscriptionType = {
  contractChanged: Maybe<Contract>;
  digestChanged: Maybe<DigestSummary>;
  digestEntryCreated: Maybe<DigestSummary>;
  digestEntryDismissed: Maybe<DigestSummary>;
  presetChanged: Maybe<Preset>;
  teamMembershipChanged: Maybe<TeamMember>;
  teamPresenceChanged: Maybe<Array<TeamPresence>>;
  userStatusChanged: Maybe<Contract>;
  verdictSubmitted: Maybe<Verdict>;
};

export type RootSubscriptionTypeTeamMembershipChangedArgs = {
  teamId: Scalars["ID"]["input"];
};

export type RootSubscriptionTypeTeamPresenceChangedArgs = {
  teamId: Scalars["ID"]["input"];
};

export type RootSubscriptionTypeUserStatusChangedArgs = {
  userId: Scalars["ID"]["input"];
};

export type TaskOutcome = {
  actualDurationMinutes: Maybe<Scalars["Int"]["output"]>;
  dataQualityScore: Maybe<Scalars["Float"]["output"]>;
  distinctTaskCount: Maybe<Scalars["Int"]["output"]>;
  errorCategory: Maybe<Scalars["String"]["output"]>;
  filesModified: Maybe<Scalars["Int"]["output"]>;
  id: Scalars["ID"]["output"];
  insertedAt: Scalars["DateTime"]["output"];
  linesChanged: Maybe<Scalars["Int"]["output"]>;
  metadata: Maybe<Scalars["JSON"]["output"]>;
  outcome: TaskOutcomeResult;
  redirectCount: Maybe<Scalars["Int"]["output"]>;
  retryCount: Maybe<Scalars["Int"]["output"]>;
  scopeChanged: Maybe<Scalars["Boolean"]["output"]>;
  testsPassed: Maybe<Scalars["Boolean"]["output"]>;
  tokensUsed: Maybe<Scalars["Int"]["output"]>;
  turnCount: Maybe<Scalars["Int"]["output"]>;
};

export type TaskOutcomeResult =
  | "CANCELLED"
  | "COMPLETED"
  | "FAILED"
  | "PARTIALLY_COMPLETED"
  | "TIMED_OUT";

export type TaskProposal = {
  agentRef: Scalars["String"]["output"];
  description: Scalars["String"]["output"];
  estimatedFiles: Maybe<Scalars["Int"]["output"]>;
  estimatedMinutes: Maybe<Scalars["Int"]["output"]>;
  framework: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  insertedAt: Scalars["DateTime"]["output"];
  model: Maybe<Scalars["String"]["output"]>;
  scopeSummary: Maybe<Scalars["String"]["output"]>;
  sourceRef: Scalars["String"]["output"];
  verdict: VerdictDecision;
  verdictReason: Maybe<Scalars["String"]["output"]>;
};

export type Team = {
  description: Maybe<Scalars["String"]["output"]>;
  icon: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  members: Maybe<Array<TeamMember>>;
  name: Scalars["String"]["output"];
};

export type TeamMember = {
  avatar: Maybe<Scalars["String"]["output"]>;
  contract: Maybe<Contract>;
  email: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  location: Maybe<Scalars["String"]["output"]>;
  name: Maybe<Scalars["String"]["output"]>;
  teams: Maybe<Array<Team>>;
  workweek: Maybe<Workweek>;
};

export type TeamPresence = {
  connectionType: Scalars["String"]["output"];
  onlineAt: Scalars["DateTime"]["output"];
  userId: Scalars["ID"]["output"];
};

export type User = {
  avatar: Maybe<Scalars["HttpUrl"]["output"]>;
  confirmedAt: Maybe<Scalars["DateTime"]["output"]>;
  email: Scalars["String"]["output"];
  handle: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  insertedAt: Scalars["DateTime"]["output"];
  location: Maybe<Scalars["String"]["output"]>;
  name: Maybe<Scalars["String"]["output"]>;
  showStatusMessage: Scalars["Boolean"]["output"];
  timezone: Maybe<Scalars["String"]["output"]>;
  updatedAt: Scalars["DateTime"]["output"];
  visibilityLevel: VisibilityLevel;
};

export type Verdict = {
  decision: VerdictDecision;
  evaluatedAt: Scalars["DateTime"]["output"];
  proposalId: Scalars["ID"]["output"];
  reason: Scalars["String"]["output"];
};

export type VerdictDecision = "APPROVED" | "DEFERRED";

export type VerdictOverride = {
  id: Scalars["ID"]["output"];
  insertedAt: Scalars["DateTime"]["output"];
  originalVerdict: VerdictDecision;
  overrideVerdict: VerdictDecision;
  proposalId: Scalars["ID"]["output"];
  reason: Maybe<Scalars["String"]["output"]>;
};

export type VerdictSettings = {
  id: Scalars["ID"]["output"];
  insertedAt: Scalars["DateTime"]["output"];
  modeThresholds: Scalars["JSON"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
};

/** Controls how much timing detail the public availability page reveals */
export type VisibilityLevel =
  /** Coarsened return times with jitter, timezone region */
  | "APPROXIMATE"
  /** Four-state signal only: available, busy, away, offline */
  | "MINIMAL"
  /** Exact return time and full timezone */
  | "PRECISE";

/**
 * Private type: contains full schedule details (timezone, exact start/end times,
 * every day of the week). Must never be exposed through unauthenticated queries.
 * All queries resolving this type must pass through the Authentication middleware.
 * For public-facing availability data, use the :public_availability type instead.
 */
export type Workweek = {
  autoEnd: Scalars["Boolean"]["output"];
  autoStart: Scalars["Boolean"]["output"];
  endTime: Scalars["Time"]["output"];
  friday: Scalars["Boolean"]["output"];
  id: Scalars["ID"]["output"];
  monday: Scalars["Boolean"]["output"];
  saturday: Scalars["Boolean"]["output"];
  startTime: Scalars["Time"]["output"];
  sunday: Scalars["Boolean"]["output"];
  thursday: Scalars["Boolean"]["output"];
  tuesday: Scalars["Boolean"]["output"];
  tz: Scalars["String"]["output"];
  user: User;
  wednesday: Scalars["Boolean"]["output"];
};

export type ActiveContractQueryVariables = Exact<{ [key: string]: never }>;

export type ActiveContractQuery = {
  activeContract: {
    id: string;
    mode: Mode;
    status: boolean;
    statusEmoji: string | null;
    statusText: string | null;
    autoRespond: boolean;
    lock: boolean | null;
    duration: number | null;
    ruleSetType: string | null;
    ruleSetParams: Record<string, unknown> | null;
    expiresAt: string;
    insertedAt: string;
  } | null;
};

export type CalendarQueryVariables = Exact<{
  at: InputMaybe<Scalars["DateTime"]["input"]>;
}>;

export type CalendarQuery = {
  calendar: {
    automateEndOfDay: boolean;
    automateStartOfDay: boolean;
    day: DayName;
    endsAt: string;
    nextWorkday: DayName;
    nextWorkdayStartsAt: string;
    now: string;
    offHours: boolean;
    startsAt: string;
    workHours: boolean;
    working: boolean;
  } | null;
};

export type AvailabilityQueryVariables = Exact<{ [key: string]: never }>;

export type AvailabilityQuery = {
  activeContract: {
    id: string;
    mode: Mode;
    status: boolean;
    statusEmoji: string | null;
    statusText: string | null;
    autoRespond: boolean;
    lock: boolean | null;
    duration: number | null;
    ruleSetType: string | null;
    ruleSetParams: Record<string, unknown> | null;
    expiresAt: string;
    insertedAt: string;
  } | null;
  calendar: {
    automateEndOfDay: boolean;
    automateStartOfDay: boolean;
    day: DayName;
    endsAt: string;
    nextWorkday: DayName;
    nextWorkdayStartsAt: string;
    now: string;
    offHours: boolean;
    startsAt: string;
    workHours: boolean;
    working: boolean;
  } | null;
};

export type SubmitProposalMutationVariables = Exact<{
  input: ProposalInput;
}>;

export type SubmitProposalMutation = {
  submitProposal: {
    decision: VerdictDecision;
    reason: string;
    proposalId: string;
    evaluatedAt: string;
  } | null;
};

export type ProposalsQueryVariables = Exact<{
  verdict: InputMaybe<VerdictDecision>;
  latest: InputMaybe<Scalars["Int"]["input"]>;
}>;

export type ProposalsQuery = {
  proposals: Array<{
    id: string;
    agentRef: string;
    model: string | null;
    framework: string | null;
    description: string;
    estimatedFiles: number | null;
    estimatedMinutes: number | null;
    scopeSummary: string | null;
    sourceRef: string;
    verdict: VerdictDecision;
    verdictReason: string | null;
    insertedAt: string;
  }> | null;
};

export type PresetsQueryVariables = Exact<{ [key: string]: never }>;

export type PresetsQuery = {
  presets: Array<{
    id: string;
    name: string;
    status: boolean;
    statusEmoji: string | null;
    statusText: string | null;
    duration: number | null;
    insertedAt: string;
    updatedAt: string;
  }> | null;
};

export type ApplyPresetMutationVariables = Exact<{
  id: Scalars["ID"]["input"];
}>;

export type ApplyPresetMutation = {
  applyPreset: {
    id: string;
    mode: Mode;
    status: boolean;
    statusEmoji: string | null;
    statusText: string | null;
    autoRespond: boolean;
    lock: boolean | null;
    duration: number | null;
    ruleSetType: string | null;
    ruleSetParams: Record<string, unknown> | null;
    expiresAt: string;
    insertedAt: string;
  } | null;
};

export type CreateContractMutationVariables = Exact<{
  input: ContractInput;
}>;

export type CreateContractMutation = {
  createContract: {
    id: string;
    mode: Mode;
    status: boolean;
    statusEmoji: string | null;
    statusText: string | null;
    autoRespond: boolean;
    lock: boolean | null;
    duration: number | null;
    ruleSetType: string | null;
    ruleSetParams: Record<string, unknown> | null;
    expiresAt: string;
    insertedAt: string;
  } | null;
};

export type ProfileQueryVariables = Exact<{ [key: string]: never }>;

export type ProfileQuery = {
  profile: {
    id: string;
    name: string | null;
    handle: string | null;
    email: string;
    avatar: string | null;
    timezone: string | null;
    visibilityLevel: VisibilityLevel;
    showStatusMessage: boolean;
    confirmedAt: string | null;
    location: string | null;
    insertedAt: string;
    updatedAt: string;
  } | null;
};

export type OverrideVerdictMutationVariables = Exact<{
  input: OverrideInput;
}>;

export type OverrideVerdictMutation = {
  overrideVerdict: {
    id: string;
    originalVerdict: VerdictDecision;
    overrideVerdict: VerdictDecision;
    reason: string | null;
    proposalId: string;
    insertedAt: string;
  } | null;
};

export type EvaluateInterruptQueryVariables = Exact<{
  handle: Scalars["String"]["input"];
}>;

export type EvaluateInterruptQuery = {
  evaluateInterrupt: { allowed: boolean; reason: string; autoResponse: string | null } | null;
};

export type CalibrationProfilesQueryVariables = Exact<{ [key: string]: never }>;

export type CalibrationProfilesQuery = {
  calibrationProfiles: Array<{
    id: string;
    model: string;
    framework: string;
    sampleSize: number;
    medianDurationMinutes: number | null;
    successRate: number | null;
    overrideRate: number | null;
    p25DurationMinutes: number | null;
    p75DurationMinutes: number | null;
    durationCiLower: number | null;
    durationCiUpper: number | null;
    successRateCiLower: number | null;
    successRateCiUpper: number | null;
    confidenceLevel: ConfidenceLevel;
    tier: string;
    status: string;
    tasksToHighConfidence: number;
    insertedAt: string;
    updatedAt: string;
  }> | null;
};

export type VerdictSettingsQueryVariables = Exact<{ [key: string]: never }>;

export type VerdictSettingsQuery = {
  verdictSettings: {
    id: string;
    modeThresholds: Record<string, unknown>;
    insertedAt: string;
    updatedAt: string;
  } | null;
};

export type UpdateVerdictSettingsMutationVariables = Exact<{
  modeThresholds: Scalars["JSON"]["input"];
}>;

export type UpdateVerdictSettingsMutation = {
  updateVerdictSettings: {
    id: string;
    modeThresholds: Record<string, unknown>;
    insertedAt: string;
    updatedAt: string;
  } | null;
};

export type AvailabilityAtQueryVariables = Exact<{
  at: InputMaybe<Scalars["DateTime"]["input"]>;
}>;

export type AvailabilityAtQuery = {
  activeContract: {
    id: string;
    mode: Mode;
    status: boolean;
    statusEmoji: string | null;
    statusText: string | null;
    autoRespond: boolean;
    lock: boolean | null;
    duration: number | null;
    ruleSetType: string | null;
    ruleSetParams: Record<string, unknown> | null;
    expiresAt: string;
    insertedAt: string;
  } | null;
  calendar: {
    automateEndOfDay: boolean;
    automateStartOfDay: boolean;
    day: DayName;
    endsAt: string;
    nextWorkday: DayName;
    nextWorkdayStartsAt: string;
    now: string;
    offHours: boolean;
    startsAt: string;
    workHours: boolean;
    working: boolean;
  } | null;
};

export type DigestSummariesQueryVariables = Exact<{
  latest: InputMaybe<Scalars["Int"]["input"]>;
}>;

export type DigestSummariesQuery = {
  digestSummaries: Array<{
    id: string;
    actorRef: string;
    actorLabel: string;
    sourceType: string;
    action: string;
    channelRef: string | null;
    entryCount: number;
    firstEventAt: string;
    lastEventAt: string;
    events: Array<{ description: string; insertedAt: string }>;
  }> | null;
};

export type DismissDigestEntryMutationVariables = Exact<{
  id: Scalars["ID"]["input"];
}>;

export type DismissDigestEntryMutation = {
  dismissDigestEntry: {
    id: string;
    actorRef: string;
    actorLabel: string;
    sourceType: string;
    action: string;
    channelRef: string | null;
    entryCount: number;
    firstEventAt: string;
    lastEventAt: string;
    events: Array<{ description: string; insertedAt: string }>;
  } | null;
};

export type ApiKeysQueryVariables = Exact<{ [key: string]: never }>;

export type ApiKeysQuery = {
  apiKeys: Array<{
    id: string;
    prefix: string;
    label: string;
    lastUsedAt: string | null;
    insertedAt: string;
  }> | null;
};

export type CreateApiKeyMutationVariables = Exact<{
  label: Scalars["String"]["input"];
}>;

export type CreateApiKeyMutation = {
  createApiKey: {
    rawKey: string;
    apiKey: {
      id: string;
      prefix: string;
      label: string;
      lastUsedAt: string | null;
      insertedAt: string;
    };
  } | null;
};

export type RevokeApiKeyMutationVariables = Exact<{
  id: Scalars["ID"]["input"];
}>;

export type RevokeApiKeyMutation = {
  revokeApiKey: {
    id: string;
    prefix: string;
    label: string;
    lastUsedAt: string | null;
    insertedAt: string;
  } | null;
};

export type AutoResponderSettingsQueryVariables = Exact<{ [key: string]: never }>;

export type AutoResponderSettingsQuery = {
  autoResponderSettings: {
    id: string;
    busyText: string;
    limitedText: string;
    offlineText: string;
    insertedAt: string;
    updatedAt: string;
  } | null;
};

export type UpdateAutoResponderSettingsMutationVariables = Exact<{
  busyText: InputMaybe<Scalars["String"]["input"]>;
  limitedText: InputMaybe<Scalars["String"]["input"]>;
  offlineText: InputMaybe<Scalars["String"]["input"]>;
}>;

export type UpdateAutoResponderSettingsMutation = {
  updateAutoResponderSettings: {
    id: string;
    busyText: string;
    limitedText: string;
    offlineText: string;
    insertedAt: string;
    updatedAt: string;
  } | null;
};

export type TeamsQueryVariables = Exact<{
  id: InputMaybe<Scalars["ID"]["input"]>;
}>;

export type TeamsQuery = {
  teams: Array<{
    id: string;
    name: string;
    icon: string | null;
    description: string | null;
    members: Array<{
      id: string;
      email: string;
      name: string | null;
      location: string | null;
      avatar: string | null;
    }> | null;
  }> | null;
};

export type CompanyQueryVariables = Exact<{ [key: string]: never }>;

export type CompanyQuery = {
  company: {
    id: string;
    name: string | null;
    teams: Array<{
      id: string;
      name: string;
      icon: string | null;
      description: string | null;
    }> | null;
  } | null;
};

export type TeamPresenceQueryVariables = Exact<{
  teamId: Scalars["ID"]["input"];
}>;

export type TeamPresenceQuery = {
  teamPresence: Array<{ userId: string; onlineAt: string; connectionType: string }> | null;
};

export type ReportOutcomeMutationVariables = Exact<{
  input: OutcomeInput;
}>;

export type ReportOutcomeMutation = {
  reportOutcome: {
    id: string;
    outcome: TaskOutcomeResult;
    actualDurationMinutes: number | null;
    filesModified: number | null;
    linesChanged: number | null;
    errorCategory: string | null;
    testsPassed: boolean | null;
    tokensUsed: number | null;
    retryCount: number | null;
    turnCount: number | null;
    scopeChanged: boolean | null;
    redirectCount: number | null;
    distinctTaskCount: number | null;
    dataQualityScore: number | null;
    insertedAt: string;
  } | null;
};
