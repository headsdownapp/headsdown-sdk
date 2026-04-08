import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

export function syncSchema(options = {}) {
  const sdkDir = options.sdkDir ?? resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const appDir = options.appDir ?? resolve(sdkDir, "..", "app");
  const runner = options.runner ?? defaultRunner;
  const sourcePath = join(appDir, "priv/graphql/schema.json");
  const targetPath = join(sdkDir, "test/fixtures/app-schema.json");

  if (!existsSync(join(appDir, "Makefile"))) {
    throw new Error(`Could not find app Makefile at ${join(appDir, "Makefile")}`);
  }

  runner(appDir);

  if (!existsSync(sourcePath)) {
    throw new Error(`Expected schema export at ${sourcePath}`);
  }

  mkdirSync(dirname(targetPath), { recursive: true });
  copyFileSync(sourcePath, targetPath);

  return { appDir, sdkDir, sourcePath, targetPath };
}

function defaultRunner(appDir) {
  execFileSync("make", ["graphql-export"], {
    cwd: appDir,
    stdio: "inherit",
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = syncSchema();
    process.stdout.write(`Synced schema from ${result.sourcePath} to ${result.targetPath}\n`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
