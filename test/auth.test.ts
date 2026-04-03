import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, readFile, stat, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CredentialStore, DeviceFlow } from "../src/auth.js";
import { AuthError, NetworkError } from "../src/errors.js";
import { mockFetchSequence } from "./fixtures.js";

// === CredentialStore ===

describe("CredentialStore", () => {
  let tempDir: string;
  let credPath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "hd-sdk-test-"));
    credPath = join(tempDir, "credentials.json");
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("save + load", () => {
    it("round-trips credentials", async () => {
      const store = new CredentialStore({ path: credPath });
      await store.save("hd_test_key_abc123", "Test Label");

      const creds = await store.load();
      expect(creds).not.toBeNull();
      expect(creds!.apiKey).toBe("hd_test_key_abc123");
      expect(creds!.label).toBe("Test Label");
      expect(creds!.createdAt).toBeTruthy();
    });

    it("sets file permissions to 0600", async () => {
      const store = new CredentialStore({ path: credPath });
      await store.save("hd_test_key_abc123");

      const stats = await stat(credPath);
      const mode = stats.mode & 0o777;
      expect(mode).toBe(0o600);
    });

    it("creates parent directories if needed", async () => {
      const nestedPath = join(tempDir, "deep", "nested", "credentials.json");
      const store = new CredentialStore({ path: nestedPath });
      await store.save("hd_test_key_nested");

      const creds = await store.load();
      expect(creds!.apiKey).toBe("hd_test_key_nested");
    });

    it("writes valid JSON", async () => {
      const store = new CredentialStore({ path: credPath });
      await store.save("hd_test_key_json");

      const raw = await readFile(credPath, "utf-8");
      const parsed = JSON.parse(raw);
      expect(parsed.apiKey).toBe("hd_test_key_json");
      expect(parsed.createdAt).toBeTruthy();
    });
  });

  describe("load", () => {
    it("returns null when file does not exist", async () => {
      const store = new CredentialStore({ path: join(tempDir, "nonexistent.json") });
      expect(await store.load()).toBeNull();
    });

    it("returns null for invalid JSON", async () => {
      const { writeFile: wf } = await import("node:fs/promises");
      await wf(credPath, "not json at all");

      const store = new CredentialStore({ path: credPath });
      expect(await store.load()).toBeNull();
    });

    it("returns null when apiKey is missing", async () => {
      const { writeFile: wf } = await import("node:fs/promises");
      await wf(credPath, JSON.stringify({ createdAt: "2025-01-01" }));

      const store = new CredentialStore({ path: credPath });
      expect(await store.load()).toBeNull();
    });

    it("returns null when apiKey has wrong prefix", async () => {
      const { writeFile: wf } = await import("node:fs/promises");
      await wf(credPath, JSON.stringify({ apiKey: "sk_not_a_hd_key" }));

      const store = new CredentialStore({ path: credPath });
      expect(await store.load()).toBeNull();
    });
  });

  describe("clear", () => {
    it("removes the credentials file", async () => {
      const store = new CredentialStore({ path: credPath });
      await store.save("hd_test_key_clear");
      expect(await store.load()).not.toBeNull();

      await store.clear();
      expect(await store.load()).toBeNull();
    });

    it("does not throw when file does not exist", async () => {
      const store = new CredentialStore({ path: join(tempDir, "nope.json") });
      await expect(store.clear()).resolves.not.toThrow();
    });
  });

  describe("filePath", () => {
    it("returns the configured path", () => {
      const store = new CredentialStore({ path: "/custom/path.json" });
      expect(store.filePath).toBe("/custom/path.json");
    });
  });
});

// === DeviceFlow ===

describe("DeviceFlow", () => {
  describe("start", () => {
    it("initiates device flow and returns authorization details", async () => {
      const { fetch, calls } = mockFetchSequence([
        {
          status: 200,
          body: {
            device_code: "dev_abc",
            user_code: "ABCD-1234",
            verification_uri: "https://headsdown.app/activate",
            verification_uri_complete: "https://headsdown.app/activate?user_code=ABCD-1234",
            expires_in: 900,
            interval: 5,
          },
        },
      ]);

      const flow = new DeviceFlow({ baseUrl: "https://test.headsdown.app", fetch });
      const auth = await flow.start("Test Agent");

      expect(auth.deviceCode).toBe("dev_abc");
      expect(auth.userCode).toBe("ABCD-1234");
      expect(auth.verificationUri).toBe("https://headsdown.app/activate");
      expect(auth.verificationUriComplete).toBe(
        "https://headsdown.app/activate?user_code=ABCD-1234",
      );
      expect(auth.expiresIn).toBe(900);
      expect(auth.interval).toBe(5);

      // Verify it sent the right request
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toBe("https://test.headsdown.app/oauth/device");
      const body = JSON.parse(calls[0].init.body as string);
      expect(body.label).toBe("Test Agent");
    });

    it("throws AuthError on HTTP error", async () => {
      const { fetch } = mockFetchSequence([{ status: 500, body: "Server Error" }]);
      const flow = new DeviceFlow({ fetch });

      await expect(flow.start()).rejects.toThrow(AuthError);
    });

    it("throws NetworkError on connection failure", async () => {
      const fetchFn = (() =>
        Promise.reject(new TypeError("fetch failed"))) as unknown as typeof globalThis.fetch;
      const flow = new DeviceFlow({ fetch: fetchFn });

      await expect(flow.start()).rejects.toThrow(NetworkError);
    });
  });

  describe("poll", () => {
    it("returns API key after approval", async () => {
      const { fetch } = mockFetchSequence([
        { status: 400, body: { error: "authorization_pending" } },
        { status: 400, body: { error: "authorization_pending" } },
        { status: 200, body: { access_token: "hd_new_key_123", token_type: "bearer" } },
      ]);

      const flow = new DeviceFlow({ fetch });
      // Use very short interval for testing (0.01 seconds = 10ms)
      const key = await flow.poll("dev_abc", 0.01, 10);

      expect(key).toBe("hd_new_key_123");
    });

    it("backs off on slow_down response", async () => {
      vi.useFakeTimers();

      const { fetch, calls } = mockFetchSequence([
        { status: 400, body: { error: "slow_down" } },
        { status: 200, body: { access_token: "hd_slowdown_key", token_type: "bearer" } },
      ]);

      const flow = new DeviceFlow({ fetch });
      const pollPromise = flow.poll("dev_abc", 0.01, 30);

      // Advance past the initial sleep (10ms) + first request
      await vi.advanceTimersByTimeAsync(20);
      // After slow_down, interval increases by 5000ms. Advance past that.
      await vi.advanceTimersByTimeAsync(5100);

      const key = await pollPromise;
      expect(key).toBe("hd_slowdown_key");
      expect(calls.length).toBe(2);

      vi.useRealTimers();
    });

    it("throws AuthError on access_denied", async () => {
      const { fetch } = mockFetchSequence([{ status: 400, body: { error: "access_denied" } }]);

      const flow = new DeviceFlow({ fetch });
      await expect(flow.poll("dev_abc", 0.01, 10)).rejects.toThrow(/denied/i);
    });

    it("throws AuthError on expired_token", async () => {
      const { fetch } = mockFetchSequence([{ status: 400, body: { error: "expired_token" } }]);

      const flow = new DeviceFlow({ fetch });
      await expect(flow.poll("dev_abc", 0.01, 10)).rejects.toThrow(/expired/i);
    });

    it("throws AuthError on unknown error", async () => {
      const { fetch } = mockFetchSequence([
        {
          status: 400,
          body: { error: "server_error", error_description: "Something broke" },
        },
      ]);

      const flow = new DeviceFlow({ fetch });
      await expect(flow.poll("dev_abc", 0.01, 10)).rejects.toThrow(/Something broke/);
    });

    it("throws AuthError on timeout", async () => {
      const { fetch } = mockFetchSequence([
        { status: 400, body: { error: "authorization_pending" } },
        { status: 400, body: { error: "authorization_pending" } },
        { status: 400, body: { error: "authorization_pending" } },
      ]);

      const flow = new DeviceFlow({ fetch });
      // expiresIn of 0.05 seconds = 50ms, with 10ms interval, will timeout quickly
      await expect(flow.poll("dev_abc", 0.01, 0.05)).rejects.toThrow(/timed out|expired/i);
    });

    it("respects AbortSignal", async () => {
      const { fetch } = mockFetchSequence([
        { status: 400, body: { error: "authorization_pending" } },
        { status: 400, body: { error: "authorization_pending" } },
      ]);

      const controller = new AbortController();
      const flow = new DeviceFlow({ fetch });

      // Abort after a short delay
      setTimeout(() => controller.abort(), 30);

      await expect(flow.poll("dev_abc", 0.01, 60, controller.signal)).rejects.toThrow(/cancelled/i);
    });

    it("retries silently on transient network errors", async () => {
      let callCount = 0;
      const fetchFn = (() => {
        callCount++;
        if (callCount <= 2) return Promise.reject(new TypeError("network glitch"));
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ access_token: "hd_retry_key", token_type: "bearer" }),
        });
      }) as unknown as typeof globalThis.fetch;

      const flow = new DeviceFlow({ fetch: fetchFn });
      const key = await flow.poll("dev_abc", 0.01, 10);

      expect(key).toBe("hd_retry_key");
      expect(callCount).toBe(3);
    });
  });
});
