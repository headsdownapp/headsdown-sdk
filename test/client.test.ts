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
  RAW_CALENDAR,
  RAW_VERDICT_APPROVED,
  RAW_VERDICT_DEFERRED,
  RAW_PROPOSAL,
  RAW_PRESET,
  RAW_PROFILE,
  NORMALIZED_CONTRACT,
  NORMALIZED_CALENDAR,
  NORMALIZED_VERDICT_APPROVED,
  NORMALIZED_PRESET,
  NORMALIZED_PROFILE,
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

  // === getCalendar ===

  describe("getCalendar", () => {
    it("returns calendar with normalized day enums", async () => {
      const client = new HeadsDownClient({
        ...CLIENT_OPTS,
        fetch: mockGraphQL({ calendar: RAW_CALENDAR }),
      });

      const calendar = await client.getCalendar();
      expect(calendar).toEqual(NORMALIZED_CALENDAR);
      expect(calendar.day).toBe("wednesday");
      expect(calendar.nextWorkday).toBe("thursday");
    });
  });

  // === getAvailability ===

  describe("getAvailability", () => {
    it("returns both contract and calendar", async () => {
      const client = new HeadsDownClient({
        ...CLIENT_OPTS,
        fetch: mockGraphQL({
          activeContract: RAW_CONTRACT,
          calendar: RAW_CALENDAR,
        }),
      });

      const result = await client.getAvailability();
      expect(result.contract).toEqual(NORMALIZED_CONTRACT);
      expect(result.calendar).toEqual(NORMALIZED_CALENDAR);
    });

    it("returns null contract when none is active, still gets calendar", async () => {
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
          json: () => Promise.resolve({ data: { calendar: RAW_CALENDAR } }),
        });
      }) as unknown as typeof globalThis.fetch;

      const client = new HeadsDownClient({ ...CLIENT_OPTS, fetch: fetchFn });
      const result = await client.getAvailability();

      expect(result.contract).toBeNull();
      expect(result.calendar).toEqual(NORMALIZED_CALENDAR);
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
