import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { createComponentId, stableStringify } from "@latticeos/core";

import { analyzeShadcn } from "../dist/index.js";

const fixtureRoot = resolve(import.meta.dirname, "../../../../fixtures/next-workspace");

function component(sourcePath, exportKey) {
  return {
    id: createComponentId({ packageKey: "@fixture/ui", sourcePath, exportKey }),
    packageKey: "@fixture/ui",
    sourcePath,
    exportKey,
    displayName: exportKey,
    visibility: "public",
    props: [],
    composedComponentIds: [],
    usageIds: [],
    evidenceIds: [`ev:react:export:${exportKey.toLowerCase()}`],
  };
}

const result = analyzeShadcn({
  configs: [{ path: "components.json", content: await readFile(resolve(fixtureRoot, "components.json"), "utf8") }],
  components: [
    component("packages/ui/src/button.tsx", "Button"),
    component("packages/ui/src/settings-section.tsx", "SettingsSection"),
    component("apps/web/app/page.tsx", "Page"),
  ],
  compiler: { baseUrl: ".", paths: { "@fixture/ui": ["packages/ui/src/index.ts"] } },
});

await writeFile(
  resolve(fixtureRoot, "../goldens/shadcn-analysis.next-workspace.golden.json"),
  stableStringify(result),
  "utf8",
);
