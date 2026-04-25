# Changelog

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
