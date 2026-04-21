import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HeadsDownClient } from "../src/client.js";
import { CredentialStore } from "../src/auth.js";
import { AuthError, ApiError, ValidationError } from "../src/errors.js";
import {
  mockGraphQL,
  mockGraphQLError,
  mockHttpError,
  RAW_CONTRACT,
  RAW_SCHEDULE,
  RAW_VERDICT_APPROVED,
  RAW_VERDICT_DEFERRED,
  RAW_PROPOSAL,
  RAW_PRESET,
  RAW_PROFILE,
  RAW_VERDICT_OVERRIDE,
  RAW_DELEGATION_GRANT,
  RAW_REVOKE_DELEGATION_GRANTS_RESULT,
  RAW_INTERRUPT_ALLOWED,
  RAW_INTERRUPT_DENIED,
  RAW_CALIBRATION_PROFILE,
  RAW_VERDICT_SETTINGS,
  RAW_DIGEST_SUMMARY,
  RAW_AUTO_RESPONDER_SETTINGS,
  RAW_TEAM,
  RAW_COMPANY,
  RAW_TEAM_PRESENCE,
  NORMALIZED_CONTRACT,
  NORMALIZED_SCHEDULE,
  NORMALIZED_VERDICT_APPROVED,
  NORMALIZED_PRESET,
  NORMALIZED_PROFILE,
  NORMALIZED_VERDICT_OVERRIDE,
  NORMALIZED_DELEGATION_GRANT,
  NORMALIZED_CALIBRATION_PROFILE,
  NORMALIZED_VERDICT_SETTINGS,
  NORMALIZED_DIGEST_SUMMARY,
  NORMALIZED_AUTO_RESPONDER_SETTINGS,
  NORMALIZED_TEAM,
  NORMALIZED_COMPANY,
  NORMALIZED_TEAM_PRESENCE,
} from "./fixtures.js";

const CLIENT_OPTS = { apiKey: "hd_test_key", baseUrl: "https://test.headsdown.app" };

describe("HeadsDownClient", () => {
  // === Constructor ===

  describe("constructor", () => {
    it("creates client with explicit API key", () => {
      const client = new HeadsDownClient({ apiKey: "hd_explicit_key" });
      expect(client).toBeInstanceOf(HeadsDownClient);
    });

    it("creates client from HEADSDOWN_API_KEY env var", () => {
      const original = process.env.HEADSDOWN_API_KEY;
      try {
        process.env.HEADSDOWN_API_KEY = "hd_env_key";
        const client = new HeadsDownClient();
        expect(client).toBeInstanceOf(HeadsDownClient);
      } finally {
        if (original) {
          process.env.HEADSDOWN_API_KEY = original;
        } else {
          delete process.env.HEADSDOWN_API_KEY;
        }
      }
    });

    it("throws AuthError when no API key is available", () => {
      const original = process.env.HEADSDOWN_API_KEY;
      try {
        delete process.env.HEADSDOWN_API_KEY;
        expect(() => new HeadsDownClient()).toThrow(AuthError);
      } finally {
        if (original) process.env.HEADSDOWN_API_KEY = original;
      }
    });

    it("throws ValidationError for invalid actor context", () => {
      expect(
        () =>
          new HeadsDownClient({
            ...CLIENT_OPTS,
            actorContext: { source: "" },
          }),
      ).toThrow(ValidationError);
    });
  });

  describe("withActor", () => {
    it("creates a derived client with actor context override", async () => {
      let capturedHeaders: Record<string, string> | undefined;
      const fetchFn = ((_url: string, init: RequestInit) => {
        capturedHeaders = init.headers as Record<string, string>;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { profile: RAW_PROFILE } }),
        });
      }) as unknown as typeof globalThis.fetch;

      const client = new HeadsDownClient({
        ...CLIENT_OPTS,
        fetch: fetchFn,
        actorContext: { source: "pi", sessionId: "session-default" },
      });

      await client.withActor({ source: "pi", sessionId: "session-override" }).getProfile();

      expect(capturedHeaders?.["x-headsdown-actor-context"]).toBe(
        JSON.stringify({ source: "pi", sessionId: "session-override" }),
      );
    });

    it("preserves original client actor context", async () => {
      const capturedActorHeaders: string[] = [];
      const fetchFn = ((_url: string, init: RequestInit) => {
        const headers = init.headers as Record<string, string>;
        capturedActorHeaders.push(headers["x-headsdown-actor-context"]);
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { profile: RAW_PROFILE } }),
        });
      }) as unknown as typeof globalThis.fetch;

      const client = new HeadsDownClient({
        ...CLIENT_OPTS,
        fetch: fetchFn,
        actorContext: { source: "pi", sessionId: "session-default" },
      });

      await client.withActor({ source: "pi", sessionId: "session-override" }).getProfile();
      await client.getProfile();

      expect(capturedActorHeaders[0]).toBe(
        JSON.stringify({ source: "pi", sessionId: "session-override" }),
      );
      expect(capturedActorHeaders[1]).toBe(
        JSON.stringify({ source: "pi", sessionId: "session-default" }),
      );
    });
  });

  // === fromCredentials ===

  describe("fromCredentials", () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await mkdtemp(join(tmpdir(), "hd-client-test-"));
    });

    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });

    it("loads client from saved credentials", async () => {
      const store = new CredentialStore({ path: join(tempDir, "creds.json") });
      await store.save("hd_saved_key");

      const client = await HeadsDownClient.fromCredentials({
        credentialsPath: join(tempDir, "creds.json"),
      });
      expect(client).toBeInstanceOf(HeadsDownClient);
    });

    it("throws AuthError when no credentials file exists", async () => {
      await expect(
        HeadsDownClient.fromCredentials({ credentialsPath: join(tempDir, "missing.json") }),
      ).rejects.toThrow(AuthError);
    });
  });

  // === getActiveContract ===

  describe("getActiveContract", () => {
    it("returns the active contract with normalized enums", async () => {
      const client = new HeadsDownClient({
        ...CLIENT_OPTS,
        fetch: mockGraphQL({ activeContract: RAW_CONTRACT }),
      });

      const contract = await client.getActiveContract();
      expect(contract).toEqual(NORMALIZED_CONTRACT);
    });

    it("returns null when no contract is active", async () => {
      const client = new HeadsDownClient({
        ...CLIENT_OPTS,
        fetch: mockGraphQLError([{ message: "No active contract found" }]),
      });

      const contract = await client.getActiveContract();
      expect(contract).toBeNull();
    });

    it("throws on unexpected API errors", async () => {
      const client = new HeadsDownClient({
        ...CLIENT_OPTS,
        fetch: mockHttpError(500, "Server error"),
      });

      await expect(client.getActiveContract()).rejects.toThrow(ApiError);
    });
  });

  // === getSchedule ===

  describe("getSchedule", () => {
    it("returns schedule with normalized enums", async () => {
      const client = new HeadsDownClient({
        ...CLIENT_OPTS,
        fetch: mockGraphQL({ schedule: RAW_SCHEDULE }),
      });

      const schedule = await client.getSchedule();
      expect(schedule).toEqual(NORMALIZED_SCHEDULE);
      expect(schedule.activeWindow?.mode).toBe("online");
      expect(schedule.activeWindow?.alertsPolicy).toBe("interruptable");
    });
  });

  // === getAvailability ===

  describe("getAvailability", () => {
    it("returns both contract and schedule", async () => {
      const client = new HeadsDownClient({
        ...CLIENT_OPTS,
        fetch: mockGraphQL({
          activeContract: RAW_CONTRACT,
          schedule: RAW_SCHEDULE,
        }),
      });

      const result = await client.getAvailability();
      expect(result.contract).toEqual(NORMALIZED_CONTRACT);
      expect(result.schedule).toEqual(NORMALIZED_SCHEDULE);
    });

    it("returns null contract when none is active, still gets schedule", async () => {
      let callCount = 0;
      const fetchFn = (() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                errors: [{ message: "No active contract found" }],
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { schedule: RAW_SCHEDULE } }),
        });
      }) as unknown as typeof globalThis.fetch;

      const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch: fetchFn });
      const result = await client.getAvailability();

      expect(result.contract).toBeNull();
      expect(result.schedule).toEqual(NORMALIZED_SCHEDULE);
    });
  });

  // === submitProposal ===

  describe("submitProposal", () => {
    it("submits a proposal and returns approved verdict", async () => {
      let capturedBody: string | undefined;
      const fetchFn = ((_url: string, init: RequestInit) => {
        capturedBody = init.body as string;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { submitProposal: RAW_VERDICT_APPROVED } }),
        });
      }) as unknown as typeof globalThis.fetch;

      const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch: fetchFn });
      const verdict = await client.submitProposal({
        agentRef: "claude-code",
        description: "Refactor auth module",
        estimatedFiles: 4,
        estimatedMinutes: 20,
        scopeSummary: "4 files in lib/auth",
        framework: "claude-code",
        model: "claude-sonnet-4",
      });

      expect(verdict).toEqual(NORMALIZED_VERDICT_APPROVED);

      // Verify the GraphQL variables
      const body = JSON.parse(capturedBody!);
      expect(body.variables.input.agentRef).toBe("claude-code");
      expect(body.variables.input.description).toBe("Refactor auth module");
      expect(body.variables.input.estimatedFiles).toBe(4);
      expect(body.variables.input.framework).toBe("claude-code");
    });

    it("returns deferred verdict", async () => {
      const client = new HeadsDownClient({
        ...CLIENT_OPTS,
        fetch: mockGraphQL({ submitProposal: RAW_VERDICT_DEFERRED }),
      });

      const verdict = await client.submitProposal({
        agentRef: "pi-agent",
        description: "Big refactor",
      });

      expect(verdict.decision).toBe("deferred");
    });

    it("generates sourceRef when not provided", async () => {
      let capturedBody: string | undefined;
      const fetchFn = ((_url: string, init: RequestInit) => {
        capturedBody = init.body as string;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { submitProposal: RAW_VERDICT_APPROVED } }),
        });
      }) as unknown as typeof globalThis.fetch;

      const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch: fetchFn });
      await client.submitProposal({
        agentRef: "test-agent",
        description: "Some task",
      });

      const body = JSON.parse(capturedBody!);
      expect(body.variables.input.sourceRef).toMatch(/^test-agent-\d+-[a-f0-9]+$/);
    });

    it("strips undefined optional fields", async () => {
      let capturedBody: string | undefined;
      const fetchFn = ((_url: string, init: RequestInit) => {
        capturedBody = init.body as string;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { submitProposal: RAW_VERDICT_APPROVED } }),
        });
      }) as unknown as typeof globalThis.fetch;

      const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch: fetchFn });
      await client.submitProposal({
        agentRef: "test-agent",
        description: "Minimal proposal",
      });

      const body = JSON.parse(capturedBody!);
      expect(body.variables.input).not.toHaveProperty("model");
      expect(body.variables.input).not.toHaveProperty("estimatedFiles");
      expect(body.variables.input).not.toHaveProperty("scopeSummary");
    });

    it("throws ValidationError for empty description", async () => {
      const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch: mockGraphQL({}) });
      await expect(client.submitProposal({ agentRef: "test", description: "" })).rejects.toThrow(
        ValidationError,
      );
    });

    it("throws ValidationError for missing agentRef", async () => {
      const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch: mockGraphQL({}) });
      await expect(
        client.submitProposal({ agentRef: "", description: "Do something" }),
      ).rejects.toThrow(ValidationError);
    });
  });

  // === listProposals ===

  describe("listProposals", () => {
    it("returns proposals list", async () => {
      const client = new HeadsDownClient({
        ...CLIENT_OPTS,
        fetch: mockGraphQL({ proposals: [RAW_PROPOSAL] }),
      });

      const proposals = await client.listProposals();
      expect(proposals).toHaveLength(1);
      expect(proposals[0].verdict).toBe("approved");
    });

    it("passes verdict filter as SCREAMING_CASE", async () => {
      let capturedBody: string | undefined;
      const fetchFn = ((_url: string, init: RequestInit) => {
        capturedBody = init.body as string;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { proposals: [] } }),
        });
      }) as unknown as typeof globalThis.fetch;

      const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch: fetchFn });
      await client.listProposals({ verdict: "deferred", latest: 5 });

      const body = JSON.parse(capturedBody!);
      expect(body.variables.verdict).toBe("DEFERRED");
      expect(body.variables.latest).toBe(5);
    });

    it("omits variables when no filters provided", async () => {
      let capturedBody: string | undefined;
      const fetchFn = ((_url: string, init: RequestInit) => {
        capturedBody = init.body as string;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { proposals: [] } }),
        });
      }) as unknown as typeof globalThis.fetch;

      const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch: fetchFn });
      await client.listProposals();

      const body = JSON.parse(capturedBody!);
      expect(body.variables).toBeUndefined();
    });
  });

  // === listPresets ===

  describe("listPresets", () => {
    it("returns presets with normalized enums", async () => {
      const client = new HeadsDownClient({
        ...CLIENT_OPTS,
        fetch: mockGraphQL({ presets: [RAW_PRESET] }),
      });

      const presets = await client.listPresets();
      expect(presets).toHaveLength(1);
      expect(presets[0]).toEqual(NORMALIZED_PRESET);
    });
  });

  // === applyPreset ===

  describe("applyPreset", () => {
    it("applies preset and returns new contract", async () => {
      const client = new HeadsDownClient({
        ...CLIENT_OPTS,
        fetch: mockGraphQL({ applyPreset: RAW_CONTRACT }),
      });

      const contract = await client.applyPreset("preset-1");
      expect(contract).toEqual(NORMALIZED_CONTRACT);
    });

    it("throws ValidationError for empty preset ID", async () => {
      const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch: mockGraphQL({}) });
      await expect(client.applyPreset("")).rejects.toThrow(ValidationError);
    });
  });

  // === createContract ===

  describe("createContract", () => {
    it("creates contract with SCREAMING_CASE mode", async () => {
      let capturedBody: string | undefined;
      const fetchFn = ((_url: string, init: RequestInit) => {
        capturedBody = init.body as string;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { createContract: RAW_CONTRACT } }),
        });
      }) as unknown as typeof globalThis.fetch;

      const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch: fetchFn });
      const contract = await client.createContract({
        mode: "busy",
        autoRespond: true,
        status: true,
        statusText: "Deep work",
        statusEmoji: "🔨",
        duration: 120,
      });

      expect(contract).toEqual(NORMALIZED_CONTRACT);

      const body = JSON.parse(capturedBody!);
      expect(body.variables.input.mode).toBe("BUSY");
    });
  });

  // === getProfile ===

  describe("getProfile", () => {
    it("returns user profile", async () => {
      const client = new HeadsDownClient({
        ...CLIENT_OPTS,
        fetch: mockGraphQL({ profile: RAW_PROFILE }),
      });

      const profile = await client.getProfile();
      expect(profile).toEqual(NORMALIZED_PROFILE);
    });
  });

  // === overrideVerdict ===

  describe("overrideVerdict", () => {
    it("overrides a verdict and returns the override", async () => {
      let capturedBody: string | undefined;
      const fetchFn = ((_url: string, init: RequestInit) => {
        capturedBody = init.body as string;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { overrideVerdict: RAW_VERDICT_OVERRIDE } }),
        });
      }) as unknown as typeof globalThis.fetch;

      const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch: fetchFn });
      const override = await client.overrideVerdict({
        proposalId: "proposal-def-456",
        overrideVerdict: "approved",
        reason: "Urgent hotfix needed",
      });

      expect(override).toEqual(NORMALIZED_VERDICT_OVERRIDE);

      const body = JSON.parse(capturedBody!);
      expect(body.variables.input.overrideVerdict).toBe("APPROVED");
    });

    it("throws ValidationError for empty proposal ID", async () => {
      const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch: mockGraphQL({}) });
      await expect(
        client.overrideVerdict({ proposalId: "", overrideVerdict: "approved" }),
      ).rejects.toThrow(ValidationError);
    });
  });

  // === delegation grants ===

  describe("delegation grants", () => {
    it("creates a delegation grant and converts enums to SCREAMING_CASE", async () => {
      let capturedBody: string | undefined;
      const fetchFn = ((_url: string, init: RequestInit) => {
        capturedBody = init.body as string;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { createDelegationGrant: RAW_DELEGATION_GRANT } }),
        });
      }) as unknown as typeof globalThis.fetch;

      const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch: fetchFn });
      const grant = await client.createDelegationGrant({
        scope: "session",
        sessionId: "session-123",
        permissions: ["availability_override_create", "preset_apply"],
        durationMinutes: 30,
      });

      expect(grant).toEqual(NORMALIZED_DELEGATION_GRANT);

      const body = JSON.parse(capturedBody!);
      expect(body.variables.input.scope).toBe("SESSION");
      expect(body.variables.input.permissions).toEqual([
        "AVAILABILITY_OVERRIDE_CREATE",
        "PRESET_APPLY",
      ]);
    });

    it("validates required scope identifiers before request", async () => {
      const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch: mockGraphQL({}) });

      await expect(
        client.createDelegationGrant({
          scope: "session",
          permissions: ["availability_override_create"],
        }),
      ).rejects.toThrow(ValidationError);

      await expect(
        client.createDelegationGrant({
          scope: "workspace",
          permissions: ["availability_override_create"],
        }),
      ).rejects.toThrow(ValidationError);
    });

    it("lists delegation grants with optional filter", async () => {
      let capturedBody: string | undefined;
      const fetchFn = ((_url: string, init: RequestInit) => {
        capturedBody = init.body as string;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { delegationGrants: [RAW_DELEGATION_GRANT] } }),
        });
      }) as unknown as typeof globalThis.fetch;

      const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch: fetchFn });
      const grants = await client.listDelegationGrants({
        scope: "session",
        sessionId: "session-123",
        active: true,
      });

      expect(grants).toEqual([NORMALIZED_DELEGATION_GRANT]);

      const body = JSON.parse(capturedBody!);
      expect(body.variables.filter.scope).toBe("SESSION");
      expect(body.variables.filter.sessionId).toBe("session-123");
      expect(body.variables.filter.active).toBe(true);
    });

    it("lists active delegation grants", async () => {
      const client = new HeadsDownClient({
        ...CLIENT_OPTS,
        fetch: mockGraphQL({ activeDelegationGrants: [RAW_DELEGATION_GRANT] }),
      });

      const grants = await client.listActiveDelegationGrants();
      expect(grants).toEqual([NORMALIZED_DELEGATION_GRANT]);
    });

    it("revokes a delegation grant by id", async () => {
      const client = new HeadsDownClient({
        ...CLIENT_OPTS,
        fetch: mockGraphQL({ revokeDelegationGrant: RAW_DELEGATION_GRANT }),
      });

      const revoked = await client.revokeDelegationGrant("grant-1");
      expect(revoked).toEqual(NORMALIZED_DELEGATION_GRANT);
    });

    it("revokeDelegationGrant validates id", async () => {
      const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch: mockGraphQL({}) });
      await expect(client.revokeDelegationGrant("")).rejects.toThrow(ValidationError);
    });

    it("bulk revokes delegation grants", async () => {
      let capturedBody: string | undefined;
      const fetchFn = ((_url: string, init: RequestInit) => {
        capturedBody = init.body as string;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              data: { revokeDelegationGrants: RAW_REVOKE_DELEGATION_GRANTS_RESULT },
            }),
        });
      }) as unknown as typeof globalThis.fetch;

      const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch: fetchFn });
      const result = await client.revokeDelegationGrants({ scope: "workspace" });

      expect(result.revokedCount).toBe(2);
      const body = JSON.parse(capturedBody!);
      expect(body.variables.filter.scope).toBe("WORKSPACE");
    });
  });

  // === evaluateInterrupt ===

  describe("evaluateInterrupt", () => {
    it("returns allowed interrupt result", async () => {
      const client = new HeadsDownClient({
        ...CLIENT_OPTS,
        fetch: mockGraphQL({ evaluateInterrupt: RAW_INTERRUPT_ALLOWED }),
      });

      const result = await client.evaluateInterrupt("testuser");
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe("User is online and interruptable");
      expect(result.autoResponse).toBeNull();
    });

    it("returns denied interrupt result with auto-response", async () => {
      const client = new HeadsDownClient({
        ...CLIENT_OPTS,
        fetch: mockGraphQL({ evaluateInterrupt: RAW_INTERRUPT_DENIED }),
      });

      const result = await client.evaluateInterrupt("busyuser");
      expect(result.allowed).toBe(false);
      expect(result.autoResponse).toBeTruthy();
    });

    it("passes handle as variable", async () => {
      let capturedBody: string | undefined;
      const fetchFn = ((_url: string, init: RequestInit) => {
        capturedBody = init.body as string;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { evaluateInterrupt: RAW_INTERRUPT_ALLOWED } }),
        });
      }) as unknown as typeof globalThis.fetch;

      const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch: fetchFn });
      await client.evaluateInterrupt("targethandle");

      const body = JSON.parse(capturedBody!);
      expect(body.variables.handle).toBe("targethandle");
    });

    it("throws ValidationError for empty handle", async () => {
      const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch: mockGraphQL({}) });
      await expect(client.evaluateInterrupt("")).rejects.toThrow(ValidationError);
    });
  });

  // === listCalibrationProfiles ===

  describe("listCalibrationProfiles", () => {
    it("returns calibration profiles with normalized enums", async () => {
      const client = new HeadsDownClient({
        ...CLIENT_OPTS,
        fetch: mockGraphQL({ calibrationProfiles: [RAW_CALIBRATION_PROFILE] }),
      });

      const profiles = await client.listCalibrationProfiles();
      expect(profiles).toHaveLength(1);
      expect(profiles[0]).toEqual(NORMALIZED_CALIBRATION_PROFILE);
      expect(profiles[0].confidenceLevel).toBe("high");
    });
  });

  // === verdictSettings ===

  describe("getVerdictSettings", () => {
    it("returns verdict settings", async () => {
      const client = new HeadsDownClient({
        ...CLIENT_OPTS,
        fetch: mockGraphQL({ verdictSettings: RAW_VERDICT_SETTINGS }),
      });

      const settings = await client.getVerdictSettings();
      expect(settings).toEqual(NORMALIZED_VERDICT_SETTINGS);
    });
  });

  describe("updateVerdictSettings", () => {
    it("sends mode thresholds and returns updated settings", async () => {
      let capturedBody: string | undefined;
      const fetchFn = ((_url: string, init: RequestInit) => {
        capturedBody = init.body as string;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { updateVerdictSettings: RAW_VERDICT_SETTINGS } }),
        });
      }) as unknown as typeof globalThis.fetch;

      const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch: fetchFn });
      const thresholds = { online: 60, busy: 15, limited: 5, offline: 0 };
      const settings = await client.updateVerdictSettings({
        modeThresholds: thresholds,
        defaultWrapUpMode: "wrap_up",
        wrapUpThresholdMinutes: 45,
      });

      expect(settings).toEqual(NORMALIZED_VERDICT_SETTINGS);

      const body = JSON.parse(capturedBody!);
      expect(body.variables.modeThresholds).toEqual(thresholds);
      expect(body.variables.defaultWrapUpMode).toBe("WRAP_UP");
      expect(body.variables.wrapUpThresholdMinutes).toBe(45);
    });
  });

  // === digest ===

  describe("listDigestSummaries", () => {
    it("returns digest summaries", async () => {
      const client = new HeadsDownClient({
        ...CLIENT_OPTS,
        fetch: mockGraphQL({ digestSummaries: [RAW_DIGEST_SUMMARY] }),
      });

      const digests = await client.listDigestSummaries();
      expect(digests).toEqual([NORMALIZED_DIGEST_SUMMARY]);
    });

    it("passes latest variable when provided", async () => {
      let capturedBody: string | undefined;
      const fetchFn = ((_url: string, init: RequestInit) => {
        capturedBody = init.body as string;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { digestSummaries: [RAW_DIGEST_SUMMARY] } }),
        });
      }) as unknown as typeof globalThis.fetch;

      const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch: fetchFn });
      await client.listDigestSummaries({ latest: 3 });

      const body = JSON.parse(capturedBody!);
      expect(body.variables.latest).toBe(3);
    });
  });

  describe("dismissDigestEntry", () => {
    it("dismisses a digest entry", async () => {
      const client = new HeadsDownClient({
        ...CLIENT_OPTS,
        fetch: mockGraphQL({ dismissDigestEntry: RAW_DIGEST_SUMMARY }),
      });

      const digest = await client.dismissDigestEntry("digest-1");
      expect(digest).toEqual(NORMALIZED_DIGEST_SUMMARY);
    });

    it("throws ValidationError for empty digest id", async () => {
      const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch: mockGraphQL({}) });
      await expect(client.dismissDigestEntry("")).rejects.toThrow(ValidationError);
    });
  });

  // === auto responder ===

  describe("getAutoResponderSettings", () => {
    it("returns auto responder settings", async () => {
      const client = new HeadsDownClient({
        ...CLIENT_OPTS,
        fetch: mockGraphQL({ autoResponderSettings: RAW_AUTO_RESPONDER_SETTINGS }),
      });

      const settings = await client.getAutoResponderSettings();
      expect(settings).toEqual(NORMALIZED_AUTO_RESPONDER_SETTINGS);
    });
  });

  describe("updateAutoResponderSettings", () => {
    it("updates auto responder settings", async () => {
      let capturedBody: string | undefined;
      const fetchFn = ((_url: string, init: RequestInit) => {
        capturedBody = init.body as string;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({ data: { updateAutoResponderSettings: RAW_AUTO_RESPONDER_SETTINGS } }),
        });
      }) as unknown as typeof globalThis.fetch;

      const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch: fetchFn });
      const settings = await client.updateAutoResponderSettings({
        busyText: "Busy",
        offlineText: "Offline",
      });

      expect(settings).toEqual(NORMALIZED_AUTO_RESPONDER_SETTINGS);
      const body = JSON.parse(capturedBody!);
      expect(body.variables.busyText).toBe("Busy");
      expect(body.variables.offlineText).toBe("Offline");
      expect(body.variables).not.toHaveProperty("limitedText");
    });
  });

  // === teams ===

  describe("listTeams", () => {
    it("returns teams", async () => {
      const client = new HeadsDownClient({
        ...CLIENT_OPTS,
        fetch: mockGraphQL({ teams: [RAW_TEAM] }),
      });

      const teams = await client.listTeams();
      expect(teams).toEqual([NORMALIZED_TEAM]);
    });

    it("passes id variable when provided", async () => {
      let capturedBody: string | undefined;
      const fetchFn = ((_url: string, init: RequestInit) => {
        capturedBody = init.body as string;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { teams: [RAW_TEAM] } }),
        });
      }) as unknown as typeof globalThis.fetch;

      const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch: fetchFn });
      await client.listTeams({ id: "team-1" });

      const body = JSON.parse(capturedBody!);
      expect(body.variables.id).toBe("team-1");
    });
  });

  describe("getCompany", () => {
    it("returns company", async () => {
      const client = new HeadsDownClient({
        ...CLIENT_OPTS,
        fetch: mockGraphQL({ company: RAW_COMPANY }),
      });

      const company = await client.getCompany();
      expect(company).toEqual(NORMALIZED_COMPANY);
    });
  });

  describe("listTeamPresence", () => {
    it("returns team presence entries", async () => {
      const client = new HeadsDownClient({
        ...CLIENT_OPTS,
        fetch: mockGraphQL({ teamPresence: [RAW_TEAM_PRESENCE] }),
      });

      const presence = await client.listTeamPresence("team-1");
      expect(presence).toEqual([NORMALIZED_TEAM_PRESENCE]);
    });

    it("throws ValidationError for empty team id", async () => {
      const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch: mockGraphQL({}) });
      await expect(client.listTeamPresence("")).rejects.toThrow(ValidationError);
    });
  });

  // === schedule with at parameter ===

  describe("getSchedule with at parameter", () => {
    it("passes at variable when provided", async () => {
      let capturedBody: string | undefined;
      const fetchFn = ((_url: string, init: RequestInit) => {
        capturedBody = init.body as string;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { schedule: RAW_SCHEDULE } }),
        });
      }) as unknown as typeof globalThis.fetch;

      const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch: fetchFn });
      await client.getSchedule({ at: "2025-06-16T09:00:00Z" });

      const body = JSON.parse(capturedBody!);
      expect(body.variables.at).toBe("2025-06-16T09:00:00Z");
    });

    it("omits variables when no at provided", async () => {
      let capturedBody: string | undefined;
      const fetchFn = ((_url: string, init: RequestInit) => {
        capturedBody = init.body as string;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { schedule: RAW_SCHEDULE } }),
        });
      }) as unknown as typeof globalThis.fetch;

      const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch: fetchFn });
      await client.getSchedule();

      const body = JSON.parse(capturedBody!);
      expect(body.variables).toBeUndefined();
    });
  });

  // === Auth integration ===

  describe("authenticate", () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await mkdtemp(join(tmpdir(), "hd-auth-test-"));
    });

    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });

    it("runs full Device Flow and returns authenticated client", async () => {
      let userCodeSeen = "";

      const { fetch } = (() => {
        let callCount = 0;
        const calls: Array<{ url: string; init: RequestInit }> = [];

        const fetchFn = ((url: string, init: RequestInit) => {
          calls.push({ url: String(url), init });
          callCount++;

          // First call: device flow start
          if (callCount === 1) {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: () =>
                Promise.resolve({
                  device_code: "dev_test",
                  user_code: "TEST-CODE",
                  verification_uri: "https://headsdown.app/activate",
                  verification_uri_complete: "https://headsdown.app/activate?user_code=TEST-CODE",
                  expires_in: 900,
                  interval: 0.01,
                }),
            });
          }

          // Second call: poll (pending)
          if (callCount === 2) {
            return Promise.resolve({
              ok: false,
              status: 400,
              json: () => Promise.resolve({ error: "authorization_pending" }),
            });
          }

          // Third call: poll (approved)
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                access_token: "hd_authenticated_key",
                token_type: "bearer",
              }),
          });
        }) as unknown as typeof globalThis.fetch;

        return { fetch: fetchFn, calls };
      })();

      const client = await HeadsDownClient.authenticate(
        (auth) => {
          userCodeSeen = auth.userCode;
        },
        {
          baseUrl: "https://test.headsdown.app",
          fetch,
          label: "Test Integration",
          credentialsPath: join(tempDir, "creds.json"),
        },
      );

      expect(client).toBeInstanceOf(HeadsDownClient);
      expect(userCodeSeen).toBe("TEST-CODE");

      // Verify credentials were saved
      const store = new CredentialStore({ path: join(tempDir, "creds.json") });
      const creds = await store.load();
      expect(creds!.apiKey).toBe("hd_authenticated_key");
      expect(creds!.label).toBe("Test Integration");
    });
  });
});
