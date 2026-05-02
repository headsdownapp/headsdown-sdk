import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generate } from "@graphql-codegen/cli";

const sdkDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const queriesPath = resolve(sdkDir, "src/queries.ts");
const schemaPath = resolve(sdkDir, "test/fixtures/app-schema.json");
const generatedDir = resolve(sdkDir, "src/generated");
const documentsPath = resolve(generatedDir, "operations.graphql");
const typesPath = resolve(generatedDir, "graphql-types.ts");

function extractOperationDocuments(source) {
  const pattern = /export const\s+\w+\s*=\s*`([\s\S]*?)`;/g;
  const docs = [];
  let match;

  while ((match = pattern.exec(source)) !== null) {
    docs.push(match[1].trim());
  }

  if (docs.length === 0) {
    throw new Error(`No GraphQL documents found in ${queriesPath}`);
  }

  return docs.join("\n\n");
}

async function main() {
  const queriesSource = readFileSync(queriesPath, "utf8");
  const operations = extractOperationDocuments(queriesSource);

  mkdirSync(generatedDir, { recursive: true });
  writeFileSync(documentsPath, operations + "\n", "utf8");

  await generate(
    {
      schema: schemaPath,
      documents: [documentsPath],
      generates: {
        [typesPath]: {
          plugins: ["typescript", "typescript-operations"],
          config: {
            avoidOptionals: true,
            maybeValue: "T | null",
            enumsAsTypes: true,
            skipTypename: true,
            scalars: {
              DateTime: "string",
              Date: "string",
              Time: "string",
              JSON: "Record<string, unknown>",
              HttpUrl: "string",
              UUID4: "string",
            },
          },
        },
      },
      silent: true,
    },
    true,
  );

  const generatedSource = readFileSync(typesPath, "utf8");
  const firstOperationIndex = generatedSource.indexOf("export type ActiveContractQueryVariables");
  const firstSchemaTypeIndex = generatedSource.indexOf("export type AgentControlDataState =");
  const duplicateSchemaTypeIndex = generatedSource.indexOf(
    "export type AgentControlDataState =",
    firstSchemaTypeIndex + 1,
  );
  if (
    firstOperationIndex > -1 &&
    duplicateSchemaTypeIndex > -1 &&
    duplicateSchemaTypeIndex < firstOperationIndex
  ) {
    writeFileSync(
      typesPath,
      generatedSource.slice(0, duplicateSchemaTypeIndex) +
        generatedSource.slice(firstOperationIndex),
      "utf8",
    );
  }

  process.stdout.write(`Generated ${typesPath} from ${queriesPath} and ${schemaPath}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
