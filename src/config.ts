import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const DEFAULT_CONFIG_DIR = join(homedir(), ".config", "headsdown");
const DEFAULT_CONFIG_PATH = join(DEFAULT_CONFIG_DIR, "config.json");

/** How aggressively the plugin controls file write permissions. */
export type TrustLevel = "advisory" | "active" | "guarded";

/** Plugin configuration stored at ~/.config/headsdown/config.json. */
export interface HeadsDownConfig {
  /**
   * Controls how the PreToolUse hook handles file write permissions.
   * - "advisory" (default): warnings only, never auto-approves
   * - "active": auto-approves writes when an approved proposal exists
   * - "guarded": requires an approved proposal for writes in busy/limited/offline modes
   */
  trustLevel: TrustLevel;

  /**
   * Glob patterns for sensitive files that always require user confirmation,
   * regardless of trust level or proposal status.
   */
  sensitivePaths: string[];

  /** Whether calibration reporting is enabled. Default: true. */
  calibration: boolean;
}

const VALID_TRUST_LEVELS: TrustLevel[] = ["advisory", "active", "guarded"];

export const DEFAULT_SENSITIVE_PATHS: string[] = [
  ".env*",
  "**/.env*",
  ".ssh/*",
  "**/.ssh/*",
  "**/secrets/*",
  "**/secret/*",
  "package.json",
  "package-lock.json",
  "Dockerfile*",
  "docker-compose*",
  ".github/**",
  ".gitlab-ci*",
  ".circleci/**",
  "Makefile",
  "**/config/credentials*",
  "**/config/secrets*",
];

export const DEFAULT_CONFIG: HeadsDownConfig = {
  trustLevel: "advisory",
  sensitivePaths: DEFAULT_SENSITIVE_PATHS,
  calibration: true,
};

/**
 * Manages HeadsDown plugin configuration on disk.
 * Config lives at `~/.config/headsdown/config.json`.
 */
export class ConfigStore {
  private readonly path: string;

  constructor(options?: { path?: string }) {
    this.path = options?.path ?? DEFAULT_CONFIG_PATH;
  }

  /** Load configuration, falling back to defaults for missing or invalid values. */
  async load(): Promise<HeadsDownConfig> {
    try {
      const raw = await readFile(this.path, "utf-8");
      const parsed = JSON.parse(raw) as Partial<HeadsDownConfig>;
      return {
        trustLevel: isValidTrustLevel(parsed.trustLevel)
          ? parsed.trustLevel
          : DEFAULT_CONFIG.trustLevel,
        sensitivePaths: Array.isArray(parsed.sensitivePaths)
          ? parsed.sensitivePaths.filter((p): p is string => typeof p === "string")
          : DEFAULT_CONFIG.sensitivePaths,
        calibration:
          typeof parsed.calibration === "boolean" ? parsed.calibration : DEFAULT_CONFIG.calibration,
      };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  /** Save configuration to disk. Creates parent directories if needed. */
  async save(config: HeadsDownConfig): Promise<void> {
    const dir = join(this.path, "..");
    await mkdir(dir, { recursive: true });
    await writeFile(this.path, JSON.stringify(config, null, 2) + "\n", { mode: 0o644 });
  }

  /** Return the config file path. */
  get filePath(): string {
    return this.path;
  }
}

function isValidTrustLevel(value: unknown): value is TrustLevel {
  return typeof value === "string" && VALID_TRUST_LEVELS.includes(value as TrustLevel);
}
