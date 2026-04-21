# @headsdown/sdk

TypeScript client SDK for the [HeadsDown](https://headsdown.app) availability API. Gives AI agents and developer tools typed access to availability status, focus modes, and task verdicts.

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

### Check Availability

The primary use case: check whether the user is available before starting work.

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
  console.log(`Finish Today active: ${schedule.wrapUpGuidance.remainingMinutes} minutes left`);
  console.log(`Guidance source: ${schedule.wrapUpGuidance.source}`);
}
```

You can also check availability at a specific point in time:

```typescript
const later = await client.getAvailability({ at: "2025-06-16T09:00:00Z" });
```

### Actor Context (session/workspace-aware authorization)

For endpoints protected by delegation grants, the backend can require actor context metadata. Set it once at client construction, or override it for one call with `withActor()`.

```typescript
const client = new HeadsDownClient({
  apiKey: "hd_...",
  actorContext: { source: "pi", sessionId: "session-default" },
});

// Per-request override via a derived client
await client
  .withActor({ source: "pi", workspaceRef: "headsdown/headsdown-pi", sessionId: "session-override" })
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
  sourceRef: "ticket-142",
  deliveryMode: "auto", // optional: "auto" | "wrap_up" | "full_depth"
});

if (verdict.decision === "approved") {
  // Proceed with the task
  if (verdict.wrapUpGuidance?.active) {
    console.log(`Finish Today is active until ${verdict.wrapUpGuidance.deadlineAt}`);
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
```

### Delegation Grants

```typescript
const grant = await client.createDelegationGrant({
  scope: "session",
  sessionId: "session-123",
  permissions: ["availability_override_create", "availability_override_cancel"],
  durationMinutes: 30,
  source: "pi",
});

const active = await client.listActiveDelegationGrants();

await client.revokeDelegationGrant(grant.id);
```

### Verdict and Calibration Utilities

```typescript
const interrupt = await client.evaluateInterrupt("brezn");
if (!interrupt.allowed) {
  console.log(interrupt.autoResponse ?? interrupt.reason);
}

const settings = await client.getVerdictSettings();
const updated = await client.updateVerdictSettings({
  modeThresholds: {
    online: 60,
    busy: 15,
    limited: 5,
    offline: 0,
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
import { AuthError, ApiError, NetworkError, ValidationError } from "@headsdown/sdk";

try {
  const verdict = await client.submitProposal({ ... });
} catch (error) {
  if (error instanceof AuthError) {
    // API key missing, invalid, or expired. Re-authenticate.
  } else if (error instanceof NetworkError) {
    // Connection failed, DNS error, or timeout.
  } else if (error instanceof ValidationError) {
    // Bad input (e.g., empty description). Check error.field.
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

| Option               | Default                     | Description                                  |
| -------------------- | --------------------------- | -------------------------------------------- |
| `apiKey`             | `HEADSDOWN_API_KEY` env var | HeadsDown API key (`hd_` prefix)             |
| `baseUrl`            | `https://headsdown.app`     | API endpoint                                 |
| `timeout`            | `30000`                     | Request timeout in milliseconds              |
| `fetch`              | `globalThis.fetch`          | Custom fetch (for testing or proxies)        |
| `retry.retries`      | `2`                         | Number of retries for transient failures     |
| `retry.retryDelayMs` | `250`                       | Base retry delay in ms (exponential backoff) |
| `hooks`              | `undefined`                 | Optional onRequest/onResponse/onRetry hooks  |
| `actorContext`       | `undefined`                 | Default actor context sent as `x-headsdown-actor-context` |

## Data Transparency

This SDK sends requests only to the HeadsDown API (`https://headsdown.app/graphql` by default). Every request includes your API key as a Bearer token. The exact GraphQL queries are in [`src/queries.ts`](src/queries.ts), readable in full.

**What is sent:** Your API key, the specific query/mutation being executed (availability checks, task proposals, preset operations, verdict settings, interrupt evaluation), and optional actor context metadata when configured (`source`, `agentId`, `sessionId`, `workspaceRef`).

**What is received:** Your availability status, schedule resolution, task verdicts, calibration data, and preset configurations.

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

The schema compatibility test uses this local snapshot to make drift obvious in CI.

## Releases

Releases are tag-driven. Push a tag like `v0.1.0` and GitHub Actions will run tests, verify the tag matches `package.json`, and publish to npm using trusted publishing.

```bash
git tag v0.1.0
git push origin v0.1.0
```

Before the first publish, configure npm trusted publishing for this repository and make sure the package version matches the tag.

## License

MIT
