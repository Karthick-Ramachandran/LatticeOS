import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { createComponentId, stableStringify } from "@latticeos/core";

import { analyzeStorybook } from "../dist/index.js";

const fixtureRoot = resolve(import.meta.dirname, "../../../../fixtures/next-workspace");
const manifestPath = "storybook-static/manifests/components.json";
const button = {
  id: createComponentId({ packageKey: "@fixture/ui", sourcePath: "packages/ui/src/button.tsx", exportKey: "Button" }),
  packageKey: "@fixture/ui",
  sourcePath: "packages/ui/src/button.tsx",
  exportKey: "Button",
  displayName: "Button",
  visibility: "public",
  props: [],
  composedComponentIds: [],
  usageIds: [],
  evidenceIds: ["ev:react:export:button"],
};
const result = analyzeStorybook({
  manifests: [{ path: manifestPath, content: await readFile(resolve(fixtureRoot, manifestPath), "utf8") }],
  components: [button],
  imports: [{
    id: "im:fixture:button-story",
    importerPath: "packages/ui/src/button.stories.tsx",
    source: "./button",
    importedName: "Button",
    localName: "Button",
    typeOnly: false,
    resolvedComponentId: button.id,
    location: { path: "packages/ui/src/button.stories.tsx", line: 1, column: 1 },
    evidenceIds: ["ev:react:import:button-story"],
  }],
});

await writeFile(
  resolve(fixtureRoot, "../goldens/storybook-analysis.next-workspace.golden.json"),
  stableStringify(result),
  "utf8",
);
