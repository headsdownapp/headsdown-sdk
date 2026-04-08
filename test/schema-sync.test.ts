import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { syncSchema } from "../scripts/schema-sync.mjs";

const SCHEMA = JSON.stringify({ data: { __schema: { types: [] } } }, null, 2);

describe("schema sync", () => {
  let sdkDir: string;
  let sourceDir: string;

  beforeEach(async () => {
    sdkDir = await mkdtemp(join(tmpdir(), "hd-sdk-"));
    sourceDir = await mkdtemp(join(tmpdir(), "hd-schema-src-"));

    await mkdir(join(sdkDir, "test/fixtures"), { recursive: true });
    await writeFile(join(sourceDir, "schema.json"), SCHEMA);
  });

  afterEach(async () => {
    await rm(sdkDir, { recursive: true, force: true });
    await rm(sourceDir, { recursive: true, force: true });
  });

  it("copies the pushed schema into the SDK fixture", () => {
    const result = syncSchema({ sdkDir, sourcePath: join(sourceDir, "schema.json") });

    expect(result.targetPath).toBe(join(sdkDir, "test/fixtures/app-schema.json"));
  });

  it("writes the source schema into the SDK fixture", async () => {
    syncSchema({ sdkDir, sourcePath: join(sourceDir, "schema.json") });

    const copied = await readFile(join(sdkDir, "test/fixtures/app-schema.json"), "utf8");
    expect(copied).toBe(SCHEMA);
  });

  it("throws if source path is missing", () => {
    expect(() => syncSchema({ sdkDir })).toThrow(/Missing schema source/);
  });

  it("throws if source file does not exist", () => {
    expect(() => syncSchema({ sdkDir, sourcePath: join(sourceDir, "missing.json") })).toThrow(
      /Schema source not found/,
    );
  });
});
