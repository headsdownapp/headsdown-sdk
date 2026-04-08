import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export function syncSchema(options = {}) {
  const sdkDir = options.sdkDir ?? resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const sourcePath = options.sourcePath ?? process.env.HEADSDOWN_SCHEMA_SOURCE;
  const targetPath = options.targetPath ?? join(sdkDir, "test/fixtures/app-schema.json");

  if (!sourcePath) {
    throw new Error("Missing schema source. Pass --source <path> or set HEADSDOWN_SCHEMA_SOURCE.");
  }

  if (!existsSync(sourcePath)) {
    throw new Error(`Schema source not found at ${sourcePath}`);
  }

  mkdirSync(dirname(targetPath), { recursive: true });
  copyFileSync(sourcePath, targetPath);

  return { sdkDir, sourcePath, targetPath };
}

function parseSourceArg(argv) {
  const sourceFlagIndex = argv.findIndex((arg) => arg === "--source");
  if (sourceFlagIndex >= 0 && argv[sourceFlagIndex + 1]) {
    return argv[sourceFlagIndex + 1];
  }
  return undefined;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const sourcePath = parseSourceArg(process.argv);
    const result = syncSchema({ sourcePath });
    process.stdout.write(`Synced schema from ${result.sourcePath} to ${result.targetPath}\n`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
