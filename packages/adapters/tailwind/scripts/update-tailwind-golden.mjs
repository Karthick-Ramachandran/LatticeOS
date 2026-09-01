import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { stableStringify } from "@latticeos/core";

import { analyzeTailwind } from "../dist/index.js";

const fixtureRoot = resolve(import.meta.dirname, "../../../../fixtures/next-workspace");
const files = [
  ["apps/web/app/globals.css", "css"],
  ["tailwind.config.ts", "config"],
  ["apps/web/app/page.tsx", "source"],
  ["packages/ui/src/button.tsx", "source"],
  ["packages/ui/src/settings-section.tsx", "source"],
];
const sources = await Promise.all(
  files.map(async ([path, kind]) => ({ path, kind, content: await readFile(resolve(fixtureRoot, path), "utf8") })),
);
const result = analyzeTailwind({ sources, repeatedBundleThreshold: 2 });

await writeFile(
  resolve(fixtureRoot, "../goldens/tailwind-analysis.next-workspace.golden.json"),
  stableStringify(result),
  "utf8",
);
