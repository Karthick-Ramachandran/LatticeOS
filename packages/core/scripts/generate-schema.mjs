import { mkdir, readFile, writeFile } from "node:fs/promises";

const stringArray = { type: "array", items: { type: "string" } };
const location = {
  type: "object",
  additionalProperties: false,
  required: ["path", "line", "column"],
  properties: {
    path: { type: "string", minLength: 1 },
    line: { type: "integer", minimum: 1 },
    column: { type: "integer", minimum: 1 },
    endLine: { type: "integer", minimum: 1 },
    endColumn: { type: "integer", minimum: 1 },
  },
};
const evidenceIds = { ...stringArray, uniqueItems: true };
const toolDetection = {
  type: "object",
  additionalProperties: false,
  required: ["status", "evidenceIds"],
  properties: {
    status: { enum: ["present", "absent", "unknown"] },
    evidenceIds,
  },
};

const schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "urn:latticeos:schema:reuse-index:v1",
  title: "LatticeOS Reuse index",
  type: "object",
  additionalProperties: false,
  required: [
    "schemaVersion",
    "generator",
    "project",
    "packages",
    "components",
    "imports",
    "usages",
    "tailwind",
    "evidence",
    "diagnostics",
  ],
  properties: {
    schemaVersion: { const: 1 },
    generator: {
      type: "object",
      additionalProperties: false,
      required: ["name", "version"],
      properties: { name: { const: "lattice" }, version: { type: "string", minLength: 1 } },
    },
    project: {
      type: "object",
      additionalProperties: false,
      required: ["rootPath", "packageManager", "tools"],
      properties: {
        rootPath: { const: "." },
        packageManager: { enum: ["pnpm", "npm", "yarn", "bun", "unknown"] },
        tools: {
          type: "object",
          additionalProperties: false,
          required: ["react", "nextjs", "typescript", "tailwind", "shadcn", "storybook"],
          properties: {
            react: toolDetection,
            nextjs: toolDetection,
            typescript: toolDetection,
            tailwind: toolDetection,
            shadcn: toolDetection,
            storybook: toolDetection,
          },
        },
      },
    },
    packages: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "rootPath", "evidenceIds"],
        properties: {
          key: { type: "string", minLength: 1 },
          name: { type: "string", minLength: 1 },
          rootPath: { type: "string", minLength: 1 },
          manifestPath: { type: "string", minLength: 1 },
          evidenceIds,
        },
      },
    },
    components: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "packageKey",
          "sourcePath",
          "exportKey",
          "displayName",
          "visibility",
          "props",
          "composedComponentIds",
          "usageIds",
          "evidenceIds",
        ],
        properties: {
          id: { type: "string", pattern: "^react:[^:]+:.+#[^#]+$" },
          packageKey: { type: "string", minLength: 1 },
          sourcePath: { type: "string", minLength: 1 },
          exportKey: { type: "string", minLength: 1 },
          displayName: { type: "string", minLength: 1 },
          visibility: { enum: ["public", "local"] },
          props: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["name", "type", "required", "defaulted", "variants", "evidenceIds"],
              properties: {
                name: { type: "string", minLength: 1 },
                type: { type: "string", minLength: 1 },
                required: { type: "boolean" },
                defaulted: { type: "boolean" },
                variants: stringArray,
                evidenceIds,
              },
            },
          },
          composedComponentIds: stringArray,
          usageIds: stringArray,
          evidenceIds,
        },
      },
    },
    imports: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "importerPath", "source", "importedName", "localName", "typeOnly", "location", "evidenceIds"],
        properties: {
          id: { type: "string", minLength: 1 },
          importerPath: { type: "string", minLength: 1 },
          source: { type: "string", minLength: 1 },
          importedName: { type: "string", minLength: 1 },
          localName: { type: "string", minLength: 1 },
          typeOnly: { type: "boolean" },
          resolvedComponentId: { type: "string", minLength: 1 },
          location,
          evidenceIds,
        },
      },
    },
    usages: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "componentId", "kind", "sourcePath", "location", "propNames", "evidenceIds"],
        properties: {
          id: { type: "string", minLength: 1 },
          componentId: { type: "string", minLength: 1 },
          kind: { enum: ["jsx", "call", "composition"] },
          sourcePath: { type: "string", minLength: 1 },
          location,
          propNames: stringArray,
          evidenceIds,
        },
      },
    },
    tailwind: {
      type: "object",
      additionalProperties: false,
      required: ["tokens", "repeatedClassBundles"],
      properties: {
        tokens: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["name", "value", "sourcePath", "evidenceIds"],
            properties: {
              name: { type: "string", minLength: 1 },
              value: { type: "string" },
              sourcePath: { type: "string", minLength: 1 },
              evidenceIds,
            },
          },
        },
        repeatedClassBundles: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["classes", "count", "locations", "evidenceIds"],
            properties: {
              classes: stringArray,
              count: { type: "integer", minimum: 1 },
              locations: { type: "array", items: location },
              evidenceIds,
            },
          },
        },
      },
    },
    evidence: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "kind", "location", "method", "classification", "fingerprint", "limitations"],
        properties: {
          id: { type: "string", minLength: 1 },
          kind: { enum: ["project", "package", "export", "prop", "import", "usage", "composition", "story", "registry", "token", "class-bundle"] },
          location,
          method: { enum: ["manifest", "ast", "type-checker", "css", "static-config"] },
          classification: { enum: ["exact", "corroborating", "heuristic"] },
          fingerprint: { type: "string", minLength: 1 },
          limitations: stringArray,
        },
      },
    },
    diagnostics: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["code", "severity", "message", "limitations"],
        properties: {
          code: { type: "string", minLength: 1 },
          severity: { enum: ["info", "warning", "error"] },
          message: { type: "string", minLength: 1 },
          location,
          limitations: stringArray,
        },
      },
    },
  },
};

const outputUrl = new URL("../schema/reuse-index.schema.json", import.meta.url);
const expected = `${JSON.stringify(schema, null, 2)}\n`;

if (process.argv.includes("--check")) {
  let actual = "";
  try {
    actual = await readFile(outputUrl, "utf8");
  } catch {
    process.stderr.write("Generated Reuse index schema is missing. Run pnpm schema:generate.\n");
    process.exitCode = 1;
  }
  if (actual && actual !== expected) {
    process.stderr.write("Generated Reuse index schema is stale. Run pnpm schema:generate.\n");
    process.exitCode = 1;
  }
} else {
  await mkdir(new URL("../schema/", import.meta.url), { recursive: true });
  await writeFile(outputUrl, expected, "utf8");
  process.stdout.write("Generated schema/reuse-index.schema.json.\n");
}
