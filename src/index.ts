// Client
export { HeadsDownClient } from "./client.js";

// Auth
export { CredentialStore, DeviceFlow } from "./auth.js";

// Config
export { ConfigStore, DEFAULT_SENSITIVE_PATHS, DEFAULT_CONFIG } from "./config.js";
export type { HeadsDownConfig, TrustLevel } from "./config.js";

// Proposal State
export { ProposalStateStore } from "./proposals.js";
export type { StoredProposal } from "./proposals.js";

// Calibration
export { CalibrationTracker } from "./calibration.js";
export type { CalibrationTrackerOptions } from "./calibration.js";

// Errors
export {
  HeadsDownError,
  AuthError,
  ApiError,
  NetworkError,
  ValidationError,
  HeadsDownActionApplyError,
  HeadsDownActionInvalidStateError,
  HeadsDownActionExpiredError,
  HeadsDownActionFeatureDisabledError,
  HeadsDownActionAuthError,
} from "./errors.js";

// Wrap-Up guidance helpers
export { describeWrapUpGuidance } from "./wrap-up.js";
export type { WrapUpInstruction } from "./wrap-up.js";

// Execution directive helpers
export { describeExecutionDirective } from "./execution-directive.js";
export type {
  DirectiveCode,
  EnforcementLevel,
  ExecutionDirective,
  ExecutionDirectiveInput,
} from "./execution-directive.js";

// Local Referee helpers
export {
  LOCAL_REFEREE_CHECK_LABELS,
  LOCAL_REFEREE_CONTRACT_PATH,
  LocalRefereeContractError,
  assertLocalRefereeOutcomeSummaryPayload,
  assertLocalRefereeOutcomeSummaryPayloadIsSafe,
  assertLocalRefereeReceipt,
  bucketCount,
  bucketMinutes,
  buildLocalRefereeContractRef,
  buildLocalRefereeOutcomeSummaryPayload,
  buildLocalRefereeReceipt,
  evaluateLocalRefereeContract,
  labelLocalRefereeCheckType,
  normalizeLocalRefereeEvidence,
  parseLocalRefereeContract,
  parseLocalRefereeContractJson,
  renderLocalRefereeOutcomeSharePreview,
  renderLocalRefereeReceipt,
  renderLocalRefereeReceiptMarkdown,
  shouldShareLocalRefereeOutcomeSummary,
  submitLocalRefereeOutcomeSummary,
} from "./referee/index.js";
export type {
  LocalRefereeCheck,
  LocalRefereeCheckResult,
  LocalRefereeCheckStatus,
  LocalRefereeCheckType,
  LocalRefereeClientKind,
  LocalRefereeContract,
  LocalRefereeEvaluation,
  LocalRefereeEvidence,
  LocalRefereeOutcome,
  LocalRefereeOutcomeShareChoice,
  LocalRefereeOutcomeSharingConfig,
  LocalRefereeOutcomeSharingPreference,
  LocalRefereeOutcomeSource,
  LocalRefereeOutcomeSummaryPayload,
  LocalRefereeRawEvidence,
  LocalRefereeReceipt,
  LocalRefereeValidationStatus,
  LocalRefereeVerdict,
  SubmitLocalRefereeOutcomeSummaryOptions,
  SubmitLocalRefereeOutcomeSummaryResult,
} from "./referee/index.js";

// Agent-control helpers and constants
export { resolveHeadsDownCallFallback } from "./agent-control.js";
export {
  AUTOPILOT_CLASSIFIER_VERSION,
  CLASSIFIER_FIXTURES,
  LATITUDE_MAX_SEVERITY,
  SEVERITY_TAXONOMY,
  buildClassifierPromptFragments,
  classifyActionShapeFallback,
  classifyFixtureAction,
  computeEscalationPath,
  evaluateClassifierVersionCompatibility,
  isInteractionAskUserActionShape,
} from "./autopilot-classifier.js";
export {
  AUTOPILOT_POLICY_QUERY,
  assertAutopilotPolicy,
  fetchAutopilotPolicy,
} from "./autopilot-policy.js";
export type { AutopilotPolicyResponse } from "./autopilot-policy.js";
export {
  AUTOPILOT_ACTION_SHAPE_VERSION,
  CLASSIFIER_TELEMETRY_ACTION_FAMILIES,
  CLASSIFIER_TELEMETRY_CATALOG_MATCH_KEYS,
  CLASSIFIER_TELEMETRY_CLASSIFIER_LAYERS,
  CLASSIFIER_TELEMETRY_CONFIDENCE_BUCKETS,
  CLASSIFIER_TELEMETRY_DECISION_KEYS,
  CLASSIFIER_TELEMETRY_ESCALATION_REASON_CODES,
  CLASSIFIER_TELEMETRY_FAILURE_REASON_CODES,
  CLASSIFIER_TELEMETRY_MATCHER_KEYS,
  CLASSIFIER_TELEMETRY_NETWORK_TARGET_CLASSES,
  buildClassifierTelemetryManifest,
} from "./classifier-telemetry.js";
export type {
  BuildClassifierTelemetryManifestInput,
  ClassifierTelemetryActionFamily,
  ClassifierTelemetryCatalogMatchKey,
  ClassifierTelemetryClassifierLayer,
  ClassifierTelemetryConfidenceBucket,
  ClassifierTelemetryDecisionKey,
  ClassifierTelemetryEscalationReasonCode,
  ClassifierTelemetryFailureReasonCode,
  ClassifierTelemetryManifest,
  ClassifierTelemetryMatcherKey,
  ClassifierTelemetryNetworkTargetClass,
} from "./classifier-telemetry.js";
export {
  buildActionIdempotencyKey,
  mapHeadsDownActionError,
  mapHeadsDownActionPayloadError,
} from "./agent-control-actions.js";
export type { HeadsDownCallFallback } from "./agent-control.js";
export type {
  ActionShape,
  BaseActionShape,
  BashActionShape,
  ClassifiedAction,
  ClassifierEscalationStep,
  ClassifierLatitude,
  ClassifierOutcome,
  ClassifierPolicy,
  ClassifierPromptFragments,
  ClassifierPromptFragmentsInput,
  ClassifierSeverity,
  ClassifierVersionCompatibility,
  ComputerUseActionShape,
  EditActionShape,
  EscalationDecision,
  IntegrationCapabilities,
  InteractionAskUserActionShape,
  McpActionShape,
  QuestionCategory,
  RecentToolContext,
  SeverityTierDefinition,
  UnknownActionShape,
  VersionMismatchDirection,
  VersionMismatchLevel,
  WebfetchActionShape,
} from "./autopilot-classifier.js";
export { HEADSDOWN_CALL_KEYS, HEADSDOWN_ACTION_KEYS } from "./types.js";
export {
  AGENT_RUN_EVENT_PRIVACY_MODE,
  AGENT_RUN_EVENT_SCHEMA_VERSION,
  AGENT_RUN_PROGRESS_EVENT_TYPE,
  assertPrivacySafe,
  bucketFileCount,
  bucketScopeGrowth,
  buildAgentRunEventIdempotencyKey,
  buildAgentRunEventInput,
  cancelledEvent,
  completedEvent,
  continuationSavedEvent,
  deferredDecisionReAttemptedEvent,
  deferredDecisionResolvedEvent,
  failedEvent,
  progressEvent,
  queuedForLaterEvent,
  queuedForMorningEvent,
  resumedEvent,
  scopeDriftDetectedEvent,
  startedEvent,
  steeringOutcomeReportedEvent,
} from "./agent-run-events.js";
export type {
  AgentRunConfidenceBucket,
  AgentRunEvent,
  AgentRunEventActorMetadata,
  AgentRunEventClientMetadata,
  AgentRunEventContext,
  AgentRunEventInput,
  AgentRunEventPrivacyMode,
  AgentRunEventType,
  AgentRunFileCountBucket,
  AgentRunProgressMetadata,
  AgentRunProgressState,
  AgentRunScopeGrowthBucket,
  AgentRunSpendEstimateBucket,
  AgentRunValidationLevel,
  AgentRunValidationStatus,
  DeferredDecisionNotesBucket,
  DeferredDecisionReAttemptOutcome,
  DeferredDecisionReAttemptedPayload,
  DeferredDecisionResolutionKind,
  DeferredDecisionResolvedPayload,
  ReportAgentRunEventPayload,
  RequiredEnvelopeInput,
} from "./agent-run-events.js";
export {
  LOCAL_SESSION_SUMMARY_JSON_SCHEMA,
  LOCAL_SESSION_SUMMARY_OUTCOME_CATEGORIES,
  LOCAL_SESSION_SUMMARY_VERSION,
  assertLocalSessionSummary,
} from "./local-session-summary.js";
export type {
  LocalSessionSummary,
  LocalSessionSummaryOutcomeCategory,
} from "./local-session-summary.js";

// Types
export type {
  // Enums
  Mode,
  VerdictDecision,
  WrapUpMode,
  WrapUpProfile,
  WrapUpGuidanceSource,
  ConfidenceLevel,
  VisibilityLevel,
  AlertsPolicy,
  DayName,
  TaskOutcomeResult,
  DelegationGrantScope,
  DelegationGrantPermission,
  HeadsDownCallKey,
  HeadsDownActionKey,
  HeadsDownActionState,
  AgentControlUiIntent,
  HeadsDownCallSeverity,
  HeadsDownCallUrgency,
  HeadsDownCallEvidenceSource,
  HeadsDownCallPrivacyMode,
  HeadsDownCallConfidence,
  AgentControlDataState,
  AgentRunState,
  AgentRunActionState,
  NeedsYourYesItemState,
  ValueMetricKey,
  // Response types
  Contract,
  AvailabilityOverride,
  ScheduleResolution,
  ReachabilityWindow,
  Preset,
  Verdict,
  VerdictOverride,
  VerdictSettings,
  WrapUpGuidance,
  InterruptResult,
  CalibrationProfile,
  DigestSummary,
  DigestEvent,
  AutoResponderSettings,
  Team,
  TeamMember,
  TeamPresence,
  Company,
  TaskProposal,
  TaskOutcome,
  UserProfile,
  DelegationGrant,
  RevokeDelegationGrantsResult,
  CurrentCallView,
  HeadsDownCall,
  NeedsYourYesItem,
  AgentRunSummary,
  ValueMetricSummary,
  InterventionReplayRow,
  InterventionReplay,
  AgentControlOverview,
  HeadsDownActionErrorPayload,
  HeadsDownActionMutationResult,
  HeadsDownActionMutationPayload,
  // Input types
  ProposalInput,
  ContractInput,
  AvailabilityOverrideInput,
  OverrideInput,
  UpdateAutoResponderInput,
  ListProposalsOptions,
  ListDigestOptions,
  ListTeamsOptions,
  OutcomeInput,
  DelegationGrantInput,
  DelegationGrantFilterInput,
  HeadsDownActionOptions,
  HeadsDownActionInputByKey,
  TemporaryExceptionActionOptions,
  AllowForDurationActionOptions,
  CreateTemporaryExceptionActionOptions,
  // Auth types
  DeviceAuthorization,
  Credentials,
  // Config types
  ActorContext,
  ClientOptions,
  RetryOptions,
  RequestHooks,
  DeviceFlowOptions,
  CredentialStoreOptions,
} from "./types.js";
