import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile as wf } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConfigStore, DEFAULT_CONFIG, DEFAULT_SENSITIVE_PATHS } from "../src/config.js";

let tempDir: string;
let configPath: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "hd-config-test-"));
  configPath = join(tempDir, "config.json");
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("ConfigStore", () => {
  describe("load", () => {
    it("returns defaults when file does not exist", async () => {
      const store = new ConfigStore({ path: join(tempDir, "nonexistent.json") });
      const config = await store.load();

      expect(config.trustLevel).toBe("advisory");
      expect(config.sensitivePaths).toEqual(DEFAULT_SENSITIVE_PATHS);
    });

    it("returns defaults for invalid JSON", async () => {
      await wf(configPath, "not valid json");
      const store = new ConfigStore({ path: configPath });
      const config = await store.load();

      expect(config.trustLevel).toBe("advisory");
    });

    it("loads valid config", async () => {
      await wf(
        configPath,
        JSON.stringify({ trustLevel: "active", sensitivePaths: [".env*", ".ssh/*"] }),
      );
      const store = new ConfigStore({ path: configPath });
      const config = await store.load();

      expect(config.trustLevel).toBe("active");
      expect(config.sensitivePaths).toEqual([".env*", ".ssh/*"]);
    });

    it("falls back to default trust level for invalid value", async () => {
      await wf(configPath, JSON.stringify({ trustLevel: "yolo" }));
      const store = new ConfigStore({ path: configPath });
      const config = await store.load();

      expect(config.trustLevel).toBe("advisory");
    });

    it("falls back to default sensitive paths for non-array", async () => {
      await wf(configPath, JSON.stringify({ trustLevel: "active", sensitivePaths: "not-array" }));
      const store = new ConfigStore({ path: configPath });
      const config = await store.load();

      expect(config.sensitivePaths).toEqual(DEFAULT_SENSITIVE_PATHS);
    });

    it("filters non-string entries from sensitive paths", async () => {
      await wf(configPath, JSON.stringify({ sensitivePaths: [".env*", 123, null, ".ssh/*"] }));
      const store = new ConfigStore({ path: configPath });
      const config = await store.load();

      expect(config.sensitivePaths).toEqual([".env*", ".ssh/*"]);
    });

    it("accepts all three trust levels", async () => {
      for (const level of ["advisory", "active", "guarded"]) {
        await wf(configPath, JSON.stringify({ trustLevel: level }));
        const store = new ConfigStore({ path: configPath });
        const config = await store.load();
        expect(config.trustLevel).toBe(level);
      }
    });
  });

  describe("save + load", () => {
    it("round-trips configuration", async () => {
      const store = new ConfigStore({ path: configPath });
      await store.save({ trustLevel: "guarded", sensitivePaths: ["custom/*"] });

      const loaded = await store.load();
      expect(loaded.trustLevel).toBe("guarded");
      expect(loaded.sensitivePaths).toEqual(["custom/*"]);
    });

    it("creates parent directories", async () => {
      const nestedPath = join(tempDir, "deep", "nested", "config.json");
      const store = new ConfigStore({ path: nestedPath });
      await store.save(DEFAULT_CONFIG);

      const loaded = await store.load();
      expect(loaded.trustLevel).toBe("advisory");
    });
  });

  describe("filePath", () => {
    it("returns the configured path", () => {
      const store = new ConfigStore({ path: "/custom/config.json" });
      expect(store.filePath).toBe("/custom/config.json");
    });
  });
});
