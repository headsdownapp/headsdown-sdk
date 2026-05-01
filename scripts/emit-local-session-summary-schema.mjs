import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export async function emitLocalSessionSummarySchema(options = {}) {
  const sdkDir = options.sdkDir ?? resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const modulePath = options.modulePath ?? join(sdkDir, "dist/local-session-summary.js");
  const targetPath =
    options.targetPath ?? join(sdkDir, "schemas/local-session-summary.schema.json");

  if (!existsSync(modulePath)) {
    throw new Error(
      `Built schema module not found at ${modulePath}. Run 'npm run build' before emitting schemas.`,
    );
  }

  const moduleUrl = pathToFileURL(modulePath).href;
  const module = await import(moduleUrl);
  const schema = module.LOCAL_SESSION_SUMMARY_JSON_SCHEMA;

  if (!schema || typeof schema !== "object") {
    throw new Error("LOCAL_SESSION_SUMMARY_JSON_SCHEMA export is missing or invalid.");
  }

  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, `${JSON.stringify(schema, null, 2)}\n`);

  return { modulePath, targetPath };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await emitLocalSessionSummarySchema();
    process.stdout.write(`Wrote ${result.targetPath} from ${result.modulePath}\n`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
