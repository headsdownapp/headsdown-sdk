import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { AuthError, NetworkError } from "./errors.js";
import type {
  Credentials,
  DeviceAuthorization,
  DeviceFlowOptions,
  CredentialStoreOptions,
} from "./types.js";

const DEFAULT_BASE_URL = "https://headsdown.app";
const DEFAULT_CREDENTIALS_DIR = join(homedir(), ".config", "headsdown");
const DEFAULT_CREDENTIALS_PATH = join(DEFAULT_CREDENTIALS_DIR, "credentials.json");
const DEVICE_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code";

// === Credential Store ===

/**
 * Manages HeadsDown API credentials on disk.
 * Credentials are stored at `~/.config/headsdown/credentials.json` with 0600 permissions.
 */
export class CredentialStore {
  private readonly path: string;

  constructor(options?: CredentialStoreOptions) {
    this.path = options?.path ?? DEFAULT_CREDENTIALS_PATH;
  }

  /** Load saved credentials. Returns null if no credentials exist or the file is invalid. */
  async load(): Promise<Credentials | null> {
    try {
      const raw = await readFile(this.path, "utf-8");
      const parsed = JSON.parse(raw) as Partial<Credentials>;

      if (!parsed.apiKey || typeof parsed.apiKey !== "string") return null;
      if (!parsed.apiKey.startsWith("hd_")) return null;

      return {
        apiKey: parsed.apiKey,
        createdAt: parsed.createdAt ?? new Date().toISOString(),
        label: parsed.label,
      };
    } catch {
      return null;
    }
  }

  /** Save credentials to disk. Creates parent directories if needed. */
  async save(apiKey: string, label?: string): Promise<void> {
    const dir = join(this.path, "..");
    await mkdir(dir, { recursive: true });

    const credentials: Credentials = {
      apiKey,
      createdAt: new Date().toISOString(),
      label,
    };

    await writeFile(this.path, JSON.stringify(credentials, null, 2) + "\n", { mode: 0o600 });
  }

  /** Delete saved credentials. */
  async clear(): Promise<void> {
    try {
      await unlink(this.path);
    } catch {
      // File doesn't exist; nothing to clear.
    }
  }

  /** Return the credentials file path. */
  get filePath(): string {
    return this.path;
  }
}

// === Device Flow ===

interface TokenResponse {
  access_token: string;
  token_type: string;
}

interface TokenErrorResponse {
  error: string;
  error_description?: string;
}

/**
 * OAuth 2.0 Device Authorization Grant (RFC 8628).
 *
 * The flow:
 * 1. Call `start()` to get a user code and verification URL.
 * 2. Direct the user to approve at the URL.
 * 3. Call `poll()` to wait for approval and receive an API key.
 */
export class DeviceFlow {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof globalThis.fetch;

  constructor(options?: DeviceFlowOptions) {
    this.baseUrl = (options?.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.fetchFn = options?.fetch ?? globalThis.fetch;
  }

  /**
   * Initiate Device Flow authorization.
   * Returns device/user codes and the verification URL.
   */
  async start(label?: string): Promise<DeviceAuthorization> {
    const body: Record<string, string> = { client_id: "headsdown-sdk" };
    if (label) body.label = label;

    let response: Response;
    try {
      response = await this.fetchFn(`${this.baseUrl}/oauth/device`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (error) {
      const cause = error instanceof Error ? error : undefined;
      throw new NetworkError(
        `Failed to connect to HeadsDown at ${this.baseUrl}: ${cause?.message ?? String(error)}`,
        cause,
      );
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new AuthError(`Device flow initiation failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as {
      device_code: string;
      user_code: string;
      verification_uri: string;
      verification_uri_complete: string;
      expires_in: number;
      interval: number;
    };

    return {
      deviceCode: data.device_code,
      userCode: data.user_code,
      verificationUri: data.verification_uri,
      verificationUriComplete: data.verification_uri_complete,
      expiresIn: data.expires_in,
      interval: data.interval,
    };
  }

  /**
   * Poll for authorization approval. Blocks until the user approves, denies,
   * or the code expires. Returns the raw API key on success.
   *
   * @param deviceCode - The device_code from `start()`.
   * @param interval - Polling interval in seconds from `start()`.
   * @param expiresIn - Expiry time in seconds from `start()`.
   * @param signal - Optional AbortSignal to cancel polling early.
   */
  async poll(
    deviceCode: string,
    interval: number,
    expiresIn: number,
    signal?: AbortSignal,
  ): Promise<string> {
    const deadline = Date.now() + expiresIn * 1000;
    let pollMs = interval * 1000;

    while (Date.now() < deadline) {
      if (signal?.aborted) {
        throw new AuthError("Authentication cancelled.");
      }

      await sleep(pollMs);

      if (signal?.aborted) {
        throw new AuthError("Authentication cancelled.");
      }

      let response: Response;
      try {
        response = await this.fetchFn(`${this.baseUrl}/oauth/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grant_type: DEVICE_GRANT_TYPE,
            device_code: deviceCode,
          }),
          signal,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          throw new AuthError("Authentication cancelled.");
        }
        // Transient network error during polling; retry on next interval.
        continue;
      }

      if (response.ok) {
        const data = (await response.json()) as TokenResponse;
        return data.access_token;
      }

      const error = (await response.json()) as TokenErrorResponse;

      switch (error.error) {
        case "authorization_pending":
          break; // Keep polling.
        case "slow_down":
          pollMs += 5000;
          break;
        case "access_denied":
          throw new AuthError("Authorization denied by the user.");
        case "expired_token":
          throw new AuthError("Device code expired. Start authentication again.");
        default:
          throw new AuthError(`Authentication failed: ${error.error_description ?? error.error}`);
      }
    }

    throw new AuthError("Authentication timed out. The device code expired.");
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
