import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { syncSchema } from "../scripts/schema-sync.mjs";

const SCHEMA = JSON.stringify({ data: { __schema: { types: [] } } }, null, 2);

describe("schema sync", () => {
  let sdkDir: string;
  let appDir: string;

  beforeEach(async () => {
    sdkDir = await mkdtemp(join(tmpdir(), "hd-sdk-"));
    appDir = await mkdtemp(join(tmpdir(), "hd-app-"));

    await mkdir(join(sdkDir, "test/fixtures"), { recursive: true });
    await mkdir(join(appDir, "priv/graphql"), { recursive: true });
    await writeFile(join(appDir, "Makefile"), "graphql-export:\n\t@true\n");
    await writeFile(join(appDir, "priv/graphql/schema.json"), SCHEMA);
  });

  afterEach(async () => {
    await rm(sdkDir, { recursive: true, force: true });
    await rm(appDir, { recursive: true, force: true });
  });

  it("runs the app codegen step and copies the exported schema into the SDK fixture", () => {
    const runner = vi.fn();

    const result = syncSchema({ sdkDir, appDir, runner });

    expect(runner).toHaveBeenCalledWith(appDir);
    expect(result.targetPath).toBe(join(sdkDir, "test/fixtures/app-schema.json"));
  });

  it("writes the exported schema into the SDK fixture", async () => {
    const runner = vi.fn();

    syncSchema({ sdkDir, appDir, runner });

    const copied = await readFile(join(sdkDir, "test/fixtures/app-schema.json"), "utf8");
    expect(copied).toBe(SCHEMA);
  });

  it("throws if the app schema export is missing", async () => {
    const runner = vi.fn();
    await rm(join(appDir, "priv/graphql/schema.json"));

    expect(() => syncSchema({ sdkDir, appDir, runner })).toThrow(/Expected schema export/);
  });
});
