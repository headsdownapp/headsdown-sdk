# @headsdown/sdk

TypeScript client SDK for the [HeadsDown](https://headsdown.app) API. Gives AI agents and developer tools typed access to HeadsDown calls, availability boundaries, focus modes, and task verdicts.

Zero dependencies. Node 18+ (uses native `fetch`).

## Install

```bash
npm install @headsdown/sdk
```

## Quick Start

```typescript
import { HeadsDownClient } from "@headsdown/sdk";

// From an explicit API key
const client = new HeadsDownClient({ apiKey: "hd_..." });

// From saved credentials (~/.config/headsdown/credentials.json)
const client = await HeadsDownClient.fromCredentials();

// Or from the HEADSDOWN_API_KEY environment variable
const client = new HeadsDownClient();

// Optional: set default actor context for delegated authorization
const scopedClient = new HeadsDownClient({
  actorContext: { source: "pi", sessionId: "session-123" },
});
```

## Authentication

The SDK uses [Device Flow](https://www.rfc-editor.org/rfc/rfc8628) (OAuth 2.0) for authentication. This is the "scan a code" flow designed for CLI tools and agents.

```typescript
import { HeadsDownClient } from "@headsdown/sdk";

const client = await HeadsDownClient.authenticate(
  (auth) => {
    console.log(`Open ${auth.verificationUriComplete}`);
    console.log(`Or go to ${auth.verificationUri} and enter: ${auth.userCode}`);
  },
  { label: "My Tool" },
);
// Credentials are saved automatically to ~/.config/headsdown/credentials.json
```

For lower-level control over the auth flow:

```typescript
import { DeviceFlow, CredentialStore } from "@headsdown/sdk";

const flow = new DeviceFlow();
const auth = await flow.start("My Tool");
console.log(`Enter code ${auth.userCode} at ${auth.verificationUri}`);

const apiKey = await flow.poll(auth.deviceCode, auth.interval, auth.expiresIn);

const store = new CredentialStore();
await store.save(apiKey, "My Tool");
```

## Usage

### Read the HeadsDown call

Lead with what HeadsDown recommends for the run, then use availability as supporting context.

```typescript
import { resolveHeadsDownCallFallback } from "@headsdown/sdk";

const overview = await client.getAgentControlOverview();
const call = resolveHeadsDownCallFallback(overview.headsdownCall);
console.log(`${call.title}: ${call.body}`);
console.log(`HeadsDown call: ${call.primaryActionKey ?? call.primaryActionIntent}`);
```

### Apply canonical HeadsDown actions

Use the built-in action helpers so clients do not hand-roll mutation payloads. Helpers send canonical action keys and derive idempotency keys by default.

```typescript
const queued = await client.queueForMorning({ runId: "run_123" });
console.log(queued.result?.actionKey); // "queue_for_morning"

await client.continueRun({ runId: "run_123" });
await client.continueWithLimit({ runId: "run_123" });
await client.askUser({ runId: "run_123" });
await client.queueForLater({ runId: "run_123" });

await client.pauseAndSummarize({
  runId: "run_123",
  reason: "Rabbit hole detected. Save the handoff.",
});

await client.allowForDuration({
  runId: "run_123",
  durationMinutes: 15,
  reason: "One targeted validation path",
});

await client.allowOnce({ runId: "run_123" });
await client.createTemporaryException({
  runId: "run_123",
  durationMinutes: 30,
  mode: "limited",
});

await client.keepQueued({ runId: "run_123" });
await client.resumeRun({ runId: "run_123" });
await client.narrowScope({ runId: "run_123" });
await client.stopRun({ runId: "run_123" });

// For a lower-level integration, use the typed generic action surface.
await client.applyHeadsDownAction("queue_for_morning", { runId: "run_123" });
```

### Check Availability

Use availability to understand the user’s current boundary when a workflow still needs the lower-level schedule or mode inputs.

```typescript
const { contract, schedule } = await client.getAvailability();

if (contract?.mode === "busy") {
  console.log(`User is in focus mode: ${contract.statusText}`);
  console.log(`Expires at: ${contract.expiresAt}`);
}

if (!schedule.inReachableHours) {
  console.log(`Not currently reachable. Next transition: ${schedule.nextTransitionAt}`);
}

if (schedule.wrapUpGuidance.active) {
  console.log(`Wrap-Up active: ${schedule.wrapUpGuidance.remainingMinutes} minutes left`);
  console.log(`Guidance source: ${schedule.wrapUpGuidance.source}`);
}
```

You can also check availability at a specific point in time:

```typescript
const later = await client.getAvailability({ at: "2025-06-16T09:00:00Z" });
```

### Execution Directive (cold-start model guidance)

Use `describeExecutionDirective()` to convert availability, Wrap-Up guidance, and verdict context into one canonical instruction payload for LLMs.

```typescript
import { describeExecutionDirective } from "@headsdown/sdk";

const { contract, schedule } = await client.getAvailability();
const verdict = await client.submitProposal({
  agentRef: "pi",
  framework: "pi",
  description: "Ship the scoped fix",
});

const directive = describeExecutionDirective({ contract, schedule, verdict });
console.log(directive.primaryDirective);
```

### Autopilot classifier substrate

Use the shared classifier substrate when an integration needs to classify an imminent action and derive a conservative escalation path.

```typescript
import {
  AUTOPILOT_CLASSIFIER_VERSION,
  buildClassifierPromptFragments,
  classifyActionShapeFallback,
  computeEscalationPath,
} from "@headsdown/sdk";

const fragments = buildClassifierPromptFragments({
  latitude: "balanced",
  identityActionOverrides: ["identity_action:git_push"],
  houseRules: ["prefer_dry_run", "defer_publishes"],
});
// Pass trusted operator configuration only. Do not pass end-user free-form text.

const classified = classifyActionShapeFallback({
  tool_kind: "bash",
  command: "git push origin main",
  external_side_effect: true,
  destructive: true,
  public_facing: true,
});

const decision = computeEscalationPath({
  classifiedAction: classified,
  policy: {
    classifierVersion: AUTOPILOT_CLASSIFIER_VERSION,
    latitude: "balanced",
    sandboxPreference: "preferred",
  },
  capabilities: {
    classifierVersion: AUTOPILOT_CLASSIFIER_VERSION,
    capturedAt: new Date().toISOString(),
    sandbox: {
      available: true,
      modes: ["bash"],
      fsIsolation: "ephemeral",
      networkIsolation: "allowlist",
      identityIsolation: "isolated",
    },
    toolKinds: ["bash", "edit", "webfetch", "mcp", "computer_use"],
  },
});
```

Classifier substrate contract:

- Severity taxonomy: five tiers (`trivial`, `routine`, `notable`, `permanent`, `critical`) with criteria and fixtures.
- Prompt fragments: taxonomy and policy-aware text blocks integrations can inject into their system prompts.
- Action-shape schema: discriminated by `tool_kind` (`bash`, `edit`, `webfetch`, `mcp`, `computer_use`, `interaction.ask_user`) and extensible with optional additive fields.
- Escalation logic: pure function from `(classifiedAction, policy, capabilities)` to an ordered escalation path.

#### interaction.ask_user variant

Use `interaction.ask_user` when an LLM ends a turn without a tool call in order to ask the user something. This is a stall signal — the run is paused waiting for human input — so classifying it correctly keeps autopilot consumers from treating the pause as an unknown event.

```typescript
import type { InteractionAskUserActionShape } from "@headsdown/sdk";

const shape: InteractionAskUserActionShape = {
  tool_kind: "interaction.ask_user",
  question_category: "recovery_decision",
  recent_tool_context: {
    last_tool_kind: "edit",
    last_tool_outcome: "failed",
    turns_since: 0,
  },
};
```

`question_category` values: `scope_clarification`, `approval_request`, `tooling_choice`, `data_input`, `recovery_decision`, `other`.

Deterministic classification rules (no LLM round-trip required):

| `question_category` | `last_tool_outcome` | severity |
|---|---|---|
| `recovery_decision` | `failed` | `permanent` |
| `tooling_choice` | `succeeded` | `routine` |
| anything else | anything else | `notable` |

`notable` is the safe baseline: stalling an automated run is an external side effect even if the question itself is low-stakes. `permanent` applies when the LLM is asking for human accountability after a failure. `routine` applies only for low-stakes preference questions mid-progress.

When ending a turn to ask the user a question, construct an `interaction.ask_user` action shape rather than leaving the turn unclassified. An unclassified turn would fall through to `classification_failed` and force an immediate `defer_for_human_review` regardless of latitude.

#### Action-schema extension guide

Adding a new variant requires a classifier minor version bump (`AUTOPILOT_CLASSIFIER_VERSION`). Additive fields on an existing variant do not require a bump. Old SDKs pinned to a lower minor version degrade safely via the unknown-variant fallback (`classification_failed`). The safe release order is backend bump first, then SDK release — backend-ahead is a warning that proceeds; SDK-ahead is an error that locks down.

Behavioral guarantees:

- Read fresh policy every decision: pass a newly fetched policy object into each `computeEscalationPath()` call.
- Capability snapshots can be cached and refreshed independently from policy reads.
- Additive schema changes on known variants do not require a classifier version bump.
- Unknown action variants fail closed as `classification_failed` and defer for human review until SDK-reviewed handling exists.
- `sandboxPreference: "preferred"` prioritizes `try_in_sandbox` when sandbox support is usable for the action tool kind.
- Version mismatch behavior:
  - major mismatch: error + lockdown fallback (`defer_for_human_review`)
  - backend minor ahead: warning + proceed with known fields
  - SDK minor ahead: error + lockdown fallback

### Actor Context (session/workspace-aware authorization)

For endpoints protected by delegation grants, the backend can require actor context metadata. Set it once at client construction, or override it for one call with `withActor()`.

```typescript
const client = new HeadsDownClient({
  apiKey: "hd_...",
  actorContext: { source: "pi", sessionId: "session-default" },
});

// Per-request override via a derived client
await client
  .withActor({
    source: "pi",
    workspaceRef: "headsdown/headsdown-pi",
    sessionId: "session-override",
  })
  .submitProposal({ agentRef: "pi", description: "Refactor auth resolver" });
```

Transport format is a single HTTP header:

- `x-headsdown-actor-context: {"source":"...","agentId":"...?","sessionId":"...?","workspaceRef":"...?"}`

### Submit a Task Proposal

Ask HeadsDown whether a task should proceed given the user's current availability.

```typescript
const verdict = await client.submitProposal({
  agentRef: "my-agent",
  description: "Refactor the auth module to use JWT tokens",
  estimatedFiles: 4,
  estimatedMinutes: 30,
  scopeSummary: "4 files in lib/auth/",
  sourceRef: "ticket-142", // provenance (ticket/PR/chat reference)
  idempotencyKey: "pi-toolcall-123", // retry safety for this invocation
  deliveryMode: "auto", // optional: "auto" | "wrap_up" | "full_depth"
});

if (verdict.decision === "approved") {
  // Proceed with the task
  if (verdict.wrapUpGuidance?.active) {
    console.log(`Wrap-Up is active until ${verdict.wrapUpGuidance.deadlineAt}`);
  }
} else {
  // verdict.decision === "deferred"
  console.log(`Deferred: ${verdict.reason}`);
}
```

### List Past Proposals

```typescript
// All proposals
const proposals = await client.listProposals();

// Only deferred, last 5
const deferred = await client.listProposals({ verdict: "deferred", latest: 5 });
```

### Presets

```typescript
const presets = await client.listPresets();
const contract = await client.applyPreset(presets[0].id);
```

### Create a Contract Directly

```typescript
const contract = await client.createContract({
  mode: "busy",
  autoRespond: true,
  status: true,
  statusText: "Deep work",
  statusEmoji: "🔨",
  duration: 120, // minutes
  ruleSetType: "focus",
  ruleSetParams: { maxInterruptions: 0 },
});

// Two-axis boundary: createContract is availability status only.
// Wrap-Up fields are rejected here and should be set via updateVerdictSettings or deliveryMode.
```

### Delegation Grants

Delegation grant management mutations now require a session-token auth path in the backend. Because this SDK authenticates with API keys, create/revoke grant calls will raise an auth error with actionable guidance.

```typescript
try {
  await client.createDelegationGrant({
    scope: "session",
    sessionId: "session-123",
    permissions: ["availability_override_create", "availability_override_cancel"],
    durationMinutes: 30,
    source: "pi",
  });
} catch (error) {
  // AuthError: Delegation grant management requires a session-token auth path.
}
```

### Verdict and Calibration Utilities

```typescript
const interrupt = await client.evaluateInterrupt("brezn");
if (!interrupt.allowed) {
  console.log(interrupt.autoResponse ?? interrupt.reason);
}

const settings = await client.getVerdictSettings();
const updated = await client.updateVerdictSettings({
  thresholds: {
    online: { maxFiles: null, maxEstimatedMinutes: null },
    busy: { maxFiles: 5, maxEstimatedMinutes: 30 },
    limited: { maxFiles: 3, maxEstimatedMinutes: 10 },
    offline: { maxFiles: 0, maxEstimatedMinutes: 0 },
  },
  defaultWrapUpMode: "auto",
  wrapUpThresholdMinutes: 30,
});

const profiles = await client.listCalibrationProfiles();
```

### User Profile

```typescript
const profile = await client.getProfile();
console.log(`Authenticated as ${profile.name} (${profile.email})`);
```

## Error Handling

The SDK uses a typed error hierarchy. All errors extend `HeadsDownError`.

```typescript
import {
  AuthError,
  ApiError,
  NetworkError,
  ValidationError,
  HeadsDownActionInvalidStateError,
  HeadsDownActionExpiredError,
  HeadsDownActionFeatureDisabledError,
  HeadsDownActionAuthError,
} from "@headsdown/sdk";

try {
  await client.pauseAndSummarize({
    runId: "run_123",
    reason: "Rabbit hole detected. Save the handoff.",
  });
} catch (error) {
  if (error instanceof HeadsDownActionInvalidStateError) {
    // Action no longer matches the current call state.
  } else if (error instanceof HeadsDownActionExpiredError) {
    // Action request expired before apply.
  } else if (error instanceof HeadsDownActionFeatureDisabledError) {
    // Backend feature is disabled for this workspace/user.
  } else if (error instanceof HeadsDownActionAuthError || error instanceof AuthError) {
    // Auth failed. Re-authenticate or refresh actor context.
  } else if (error instanceof NetworkError) {
    // Connection failed, DNS error, or timeout.
  } else if (error instanceof ValidationError) {
    // Bad input (for example missing runId or invalid durationMinutes).
  } else if (error instanceof ApiError) {
    // Server returned an error. Check error.status, error.graphqlErrors.
  }
}
```

## Configuration

```typescript
const client = new HeadsDownClient({
  apiKey: "hd_...", // API key (or set HEADSDOWN_API_KEY)
  baseUrl: "https://headsdown.app", // API base URL
  timeout: 30000, // Request timeout in ms
  fetch: customFetch, // Custom fetch implementation
  retry: { retries: 2, retryDelayMs: 250 }, // Transient failure retries
  hooks: {
    onRetry: ({ attempt, reason }) => console.log(`retry #${attempt + 1}: ${reason}`),
  },
  actorContext: { source: "pi", sessionId: "session-123" },
});
```

| Option               | Default                     | Description                                               |
| -------------------- | --------------------------- | --------------------------------------------------------- |
| `apiKey`             | `HEADSDOWN_API_KEY` env var | HeadsDown API key (`hd_` prefix)                          |
| `baseUrl`            | `https://headsdown.app`     | API endpoint                                              |
| `timeout`            | `30000`                     | Request timeout in milliseconds                           |
| `fetch`              | `globalThis.fetch`          | Custom fetch (for testing or proxies)                     |
| `retry.retries`      | `2`                         | Number of retries for transient failures                  |
| `retry.retryDelayMs` | `250`                       | Base retry delay in ms (exponential backoff)              |
| `hooks`              | `undefined`                 | Optional onRequest/onResponse/onRetry hooks               |
| `actorContext`       | `undefined`                 | Default actor context sent as `x-headsdown-actor-context` |

## Data Transparency

This SDK sends requests only to the HeadsDown API (`https://headsdown.app/graphql` by default). Every request includes your API key as a Bearer token. The exact GraphQL queries are in [`src/queries.ts`](src/queries.ts), readable in full.

**What is sent:** Your API key, the specific query/mutation being executed (HeadsDown call reads, canonical action applies, availability checks, task proposals, preset operations, verdict settings, interrupt evaluation), and optional actor context metadata when configured (`source`, `agentId`, `sessionId`, `workspaceRef`).

**What is received:** HeadsDown call metadata, availability boundaries, schedule resolution, task verdicts, calibration data, and preset configurations.

**What is stored locally:** Your API key at `~/.config/headsdown/credentials.json` (file permissions: 0600, user-only read/write).

No telemetry. No analytics. No third-party requests.

## Schema Sync

The app repo is the source of truth for the GraphQL schema, and this SDK only consumes a pushed schema file.

When the app exports a new schema, import it here:

```bash
npm run schema:sync -- --source /absolute/path/to/schema.json
```

(Equivalent env var form: `HEADSDOWN_SCHEMA_SOURCE=/absolute/path/to/schema.json npm run schema:sync`.)

Then regenerate operation and variable types:

```bash
npm run codegen:types
```

If a ticket only updates SDK runtime normalization or exported TypeScript aliases without changing `src/queries.ts` or the schema snapshot, regeneration is not required.

The schema compatibility test uses this local snapshot to make drift obvious in CI.

## Releases

Releases are tag-driven. Push a tag like `v0.1.0` and GitHub Actions will run tests, verify the tag matches `package.json`, and publish to npm using trusted publishing.

```bash
git tag v0.1.0
git push origin v0.1.0
```

Before the first publish, configure npm trusted publishing for this repository and make sure the package version matches the tag.

## Dependency update automation

This repo uses Renovate to keep routine dependencies current, including grouped development dependency updates. Eligible routine updates can automerge after required CI checks pass. In normal maintenance flow, do not manually edit dependency versions unless you are intentionally overriding automation.

## License

MIT
