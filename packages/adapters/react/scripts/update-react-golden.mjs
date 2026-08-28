import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { stableStringify } from "@latticeos/core";

import { analyzeReact } from "../dist/index.js";

const fixtureRoot = resolve(import.meta.dirname, "../../../../fixtures/next-workspace");
const files = [
  ["packages/ui/src/button.tsx", "@fixture/ui"],
  ["packages/ui/src/button.stories.tsx", "@fixture/ui"],
  ["packages/ui/src/index.ts", "@fixture/ui"],
  ["packages/ui/src/settings-section.tsx", "@fixture/ui"],
  ["apps/web/app/page.tsx", "web"],
];
const sources = await Promise.all(
  files.map(async ([path, packageKey]) => ({
    path,
    packageKey,
    content: await readFile(resolve(fixtureRoot, path), "utf8"),
  })),
);
const result = analyzeReact({
  sources,
  compiler: { baseUrl: ".", paths: { "@fixture/ui": ["packages/ui/src/index.ts"] } },
});

await writeFile(
  resolve(fixtureRoot, "../goldens/react-analysis.next-workspace.golden.json"),
  stableStringify(result),
  "utf8",
);
