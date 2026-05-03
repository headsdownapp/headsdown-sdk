# Changelog

## Unreleased

## 0.9.0

### Added

- Added the `@headsdown/sdk/referee` subpath with shared local Referee contract parsing, evidence normalization, evaluation, structured and markdown receipt rendering, outcome payload shaping, preview text, share-decision helpers, and recursive privacy filtering.
- Added `submitLocalRefereeOutcomeSummary` for privacy-filtered hosted outcome submission with a typed endpoint-unavailable result when the endpoint is unavailable.
- Added parameterized Local Referee client metadata so integrations can report privacy-safe client kind and version metadata without changing the outcome schema.
- Added an additive classifier telemetry manifest with SDK-owned vocabularies, a conversion helper for existing classifier results, and documentation for consumers that can keep using the SDK 0.6.0 minimal classifier subset until they adopt the richer manifest.
- Added shared deferred-decision re-attempt outcome helpers: `DeferredDecisionReAttemptOutcome`, `DeferredDecisionReAttemptedPayload`, `deferredDecisionReAttemptedEvent`, and `client.reportDeferredDecisionReAttempted()`.

### Fixed

- Updated the ask-user classifier fixture to use the canonical `recovery_decision` category.

## 0.8.0

### Added

- Added first-class SDK helpers for temporary availability overrides: `getActiveAvailabilityOverride`, `createAvailabilityOverride`, and `cancelAvailabilityOverride`.

## 0.7.0

### Added

- Added the `@headsdown/sdk/agent` subpath for pure agent adapter helpers, including shared HeadsDown call/action rendering and privacy-safe event builder exports.
- Added `fetchAutopilotPolicy`, `AUTOPILOT_POLICY_QUERY`, `assertAutopilotPolicy`, and `AutopilotPolicyResponse` for typed per-mode autopilot policy reads.

### Fixed

- Tightened metadata-only agent event validation and context-aware enum handling for agent run event helpers.

## 0.6.0

### Added

- Added `interaction.ask_user` variant to `ActionShape` discriminated union with required `question_category` and `recent_tool_context` fields.
- Added exported types `QuestionCategory` and `RecentToolContext` for the new variant.
- Added `isInteractionAskUserActionShape` type guard.
- Extended `classifyActionShapeFallback` with deterministic classification for `interaction.ask_user`: baseline `notable`, reclassified to `permanent` on `recovery_decision + failed`, reclassified to `routine` on `tooling_choice + succeeded`.
- Extended `buildClassifierPromptFragments` with ask_user fixture references in `taxonomyFragment` and ask_user guidance in `instructionsFragment`.
- Added four representative `CLASSIFIER_FIXTURES` entries for the new variant.
- Bumped `AUTOPILOT_CLASSIFIER_VERSION` from `1.0.0` to `1.1.0`. Old SDKs pinned to `1.0.0` degrade safely via the existing unknown-variant fallback.
- Added tests: type-level discrimination, all four fixture cases, malformed-shape fail-closed coverage, valid-combination property coverage (no valid combination produces `trivial`/`critical`/`classification_failed`), and `1.0.0 ↔ 1.1.0` version-compatibility regression.
- Updated README with `interaction.ask_user` usage, deterministic rules table, and action-schema extension guide.

## 0.5.1

### Added

- Added `deferred_decision.resolved` agent-run SDK support:
  - `DeferredDecisionResolutionKind`, `DeferredDecisionNotesBucket`, and `DeferredDecisionResolvedPayload` types.
  - `deferredDecisionResolvedEvent(context, payload)` builder with deterministic idempotency key format `{run_id}:deferred_decision.resolved:{decision_id}`.
  - `client.reportDeferredDecisionResolved(context, payload)` helper.
- Added `client.listAgentRunEvents(args)` and `LIST_AGENT_RUN_EVENTS_QUERY` for reading event streams with optional `resolutionKind` filtering.
- Added tests for resolved-event builder/client round-trip and `listAgentRunEvents` query variable wiring.

## 0.5.0

### Added

- Added a shared autopilot classifier substrate export surface:
  - severity taxonomy definitions and fixtures
  - policy-aware classifier prompt fragments
  - typed action-shape schema with conservative unknown-variant fallback
  - pure escalation decision logic with capability-aware sandbox handling
- Added classifier version compatibility helpers for major/minor mismatch handling semantics.
- Added classifier substrate tests for fixtures, escalation path properties, unknown variant fallback, capability-aware behavior, and version mismatch handling.
- Added a shared `LocalSessionSummary` SDK contract with strict TypeScript typing, schema export constants, and `assertLocalSessionSummary()` validation.
- Added a published JSON schema artifact at `schemas/local-session-summary.schema.json` for non-TypeScript consumers and validator pipelines.

### Changed

- Expanded README with classifier substrate usage, extension expectations, read-fresh policy contract, and version-mismatch behavior.

### LocalSessionSummary guidance

Include only derived session facts:

- Version and generated timestamp metadata.
- Opaque session/proposal references.
- Boolean state flags (stale, continuation artifact availability, local validation outcome).
- Numeric counters (tool calls, file changes, deferred decisions).
- Outcome category (`in_progress`, `completed`, `tabled`, `deferred_for_review`).

Do not include raw context:

- Prompts, model outputs, or transcripts.
- File paths, repo names, branch names, or diffs.
- Logs, stack traces, URLs, or secrets.

Example:

```ts
const summary: LocalSessionSummary = {
  version: 1,
  sessionId: "session_123",
  generatedAt: new Date().toISOString(),
  stale: false,
  toolCallCount: 8,
  fileChangeCount: 3,
  deferredDecisionCount: 1,
  continuationArtifactAvailable: true,
  validationLocallyPassed: true,
  approvedProposalRef: "proposal_456",
  outcomeCategory: "completed",
};
```

## 0.4.0

### Added

- Added SDK type support for the `attention_window_closing` HeadsDown call key, covering the attended-mode window-closing rescue flow.

### Changed

- Refreshed generated schema types for `finish_line_friction`. The server now recommends `narrow_scope` for this call via the `recommended_action_key` field, replacing the previous `pause_and_summarize` recommendation. SDK consumers should read the server-provided value and avoid hardcoding the old default.

### Note

- `rabbit_hole_detected` remains in the type union and is still valid for compatibility. Do not introduce new uses of it. Clients implementing the new contract must not render it as a hard-stop; treat it like `keep_it_tight` if encountered.

## 0.3.1

- Added SDK type support for the `finish_line_friction` HeadsDown call key.

## 0.3.0

- Added privacy-safe agent run event reporting helpers for canonical HeadsDown event taxonomy.
- Added `reportAgentRunEvent()` and named helpers for run lifecycle, progress, scope drift, continuation, queue, resume, terminal, and steering outcome events.
- Added structured `progressPayload` GraphQL serialization, metadata-only privacy validation, bucket helpers, and generated schema/types for the #906 backend event ingestion API.

## 0.2.15

- Added SDK helpers for applying canonical HeadsDown actions, including queueing, pausing, resuming, narrowing, stopping, and temporary exception flows.
- Added typed action errors for invalid state, expired action, feature disabled, and auth failure.
- Added idempotency key derivation for HeadsDown action helpers and typed GraphQL operation coverage for `applyHeadsdownAction`.

## 0.2.13

- Added `describeExecutionDirective()` for canonical cold-start LLM execution guidance.
- Added structured directive output fields: `directiveCode`, `primaryDirective`, `enforcement`, `reasonCode`, `explanation`, `generatedAt`, `refreshAt`, `hardLimits`, and `supportingSignals`.
- Added `describeWrapUpGuidance()` helper exports for Wrap-Up-only guidance formatting.
- Added scenario-based tests for execution-directive precedence and guidance behavior.
