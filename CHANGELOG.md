# Changelog

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
