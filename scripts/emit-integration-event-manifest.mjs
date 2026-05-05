import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export async function emitIntegrationEventManifest(options = {}) {
  const sdkDir = options.sdkDir ?? resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const modulePath = options.modulePath ?? join(sdkDir, "dist/integration-event.js");
  const targetPath = options.targetPath ?? join(sdkDir, "schemas/integration-event-manifest.json");

  if (!existsSync(modulePath)) {
    throw new Error(
      `Built integration-event module not found at ${modulePath}. Run 'npm run build' before emitting the manifest.`,
    );
  }

  const moduleUrl = pathToFileURL(modulePath).href;
  const module = await import(moduleUrl);
  const manifest = module.INTEGRATION_EVENT_MANIFEST;

  if (!manifest || typeof manifest !== "object") {
    throw new Error("INTEGRATION_EVENT_MANIFEST export is missing or invalid.");
  }

  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, `${JSON.stringify(manifest, null, 2)}\n`);

  return { modulePath, targetPath };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await emitIntegrationEventManifest();
    process.stdout.write(`Wrote ${result.targetPath} from ${result.modulePath}\n`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
