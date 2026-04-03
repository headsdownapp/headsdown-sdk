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
const { contract, calendar } = await client.getAvailability();

if (contract?.mode === "busy") {
  console.log(`User is in focus mode: ${contract.statusText}`);
  console.log(`Expires at: ${contract.expiresAt}`);
}

if (calendar.offHours) {
  console.log(`Off hours. Next workday: ${calendar.nextWorkday}`);
}
```

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
});

if (verdict.decision === "approved") {
  // Proceed with the task
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
  afk: false,
  autoRespond: true,
  status: true,
  statusText: "Deep work",
  statusEmoji: "🔨",
  duration: 120, // minutes
});
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
  apiKey: "hd_...",                           // API key (or set HEADSDOWN_API_KEY)
  baseUrl: "https://headsdown.app",           // API base URL
  timeout: 30000,                             // Request timeout in ms
  fetch: customFetch,                         // Custom fetch implementation
});
```

| Option | Default | Description |
|--------|---------|-------------|
| `apiKey` | `HEADSDOWN_API_KEY` env var | HeadsDown API key (`hd_` prefix) |
| `baseUrl` | `https://headsdown.app` | API endpoint |
| `timeout` | `30000` | Request timeout in milliseconds |
| `fetch` | `globalThis.fetch` | Custom fetch (for testing or proxies) |

## Data Transparency

This SDK sends requests only to the HeadsDown API (`https://headsdown.app/graphql` by default). Every request includes your API key as a Bearer token. The exact GraphQL queries are in [`src/queries.ts`](src/queries.ts), readable in full.

**What is sent:** Your API key, and the specific query/mutation being executed (availability checks, task proposals, preset operations).

**What is received:** Your availability status, calendar schedule, task verdicts, and preset configurations.

**What is stored locally:** Your API key at `~/.config/headsdown/credentials.json` (file permissions: 0600, user-only read/write).

No telemetry. No analytics. No third-party requests.

## License

MIT
