import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import {
  createComponentId,
  stableStringify,
  type UiComponent,
  type UiImport,
} from "@latticeos/core";

import { analyzeStorybook } from "./analyze-storybook.js";
import type { StorybookAnalysisInput } from "./types.js";

const fixtureRoot = resolve(import.meta.dirname, "../../../../fixtures/next-workspace");
const manifestPath = "storybook-static/manifests/components.json";

function component(): UiComponent {
  return {
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
}

function buttonImport(target: UiComponent): UiImport {
  return {
    id: "im:fixture:button-story",
    importerPath: "packages/ui/src/button.stories.tsx",
    source: "./button",
    importedName: "Button",
    localName: "Button",
    typeOnly: false,
    resolvedComponentId: target.id,
    location: { path: "packages/ui/src/button.stories.tsx", line: 1, column: 1 },
    evidenceIds: ["ev:react:import:button-story"],
  };
}

async function fixtureInput(): Promise<StorybookAnalysisInput> {
  const target = component();
  return {
    manifests: [{ path: manifestPath, content: await readFile(resolve(fixtureRoot, manifestPath), "utf8") }],
    components: [target],
    imports: [buttonImport(target)],
  };
}

test("maps a current Storybook components manifest through a resolved React story import", async () => {
  const first = analyzeStorybook(await fixtureInput());
  const second = analyzeStorybook(await fixtureInput());

  assert.deepEqual(first.diagnostics, []);
  assert.equal(first.evidence.length, 1);
  assert.equal(first.evidence[0]?.kind, "story");
  assert.equal(first.evidence[0]?.method, "manifest");
  assert.equal(first.evidence[0]?.classification, "corroborating");
  assert.equal(first.evidence[0]?.location.path, manifestPath);
  assert.ok(first.components[0]?.evidenceIds.some((id) => id.startsWith("ev:storybook:story:")));
  assert.equal(stableStringify(first), stableStringify(second));
  const input = await fixtureInput();
  const duplicated = analyzeStorybook({ ...input, manifests: [...input.manifests, ...input.manifests] });
  assert.equal(duplicated.evidence.length, 1);
  const golden = await readFile(resolve(fixtureRoot, "../goldens/storybook-analysis.next-workspace.golden.json"), "utf8");
  assert.equal(stableStringify(first), golden);
});

test("keeps malformed or unmapped Storybook data out of evidence", () => {
  const target = component();
  const malformed = analyzeStorybook({
    manifests: [{ path: manifestPath, content: '{"components":{"not-for-output":' }],
    components: [target],
    imports: [buttonImport(target)],
  });
  assert.deepEqual(malformed.evidence, []);
  assert.deepEqual(malformed.diagnostics.map((item) => item.code), ["STORYBOOK_MANIFEST_INVALID"]);
  assert.equal(JSON.stringify(malformed).includes("not-for-output"), false);

  const unmapped = analyzeStorybook({
    manifests: [{ path: manifestPath, content: '{"components":{"card":{"name":"Card","path":"./src/card.stories.tsx","stories":[{"id":"card--basic","name":"Basic"}]}}}' }],
    components: [target],
    imports: [buttonImport(target)],
  });
  assert.deepEqual(unmapped.evidence, []);
  assert.deepEqual(unmapped.diagnostics.map((item) => item.code), ["STORYBOOK_COMPONENT_UNMAPPED"]);

  const typeOnly = analyzeStorybook({
    manifests: [{ path: manifestPath, content: '{"components":{"button":{"name":"Button","path":"./packages/ui/src/button.stories.tsx","stories":[{"id":"button--basic","name":"Basic"}]}}}' }],
    components: [target],
    imports: [{ ...buttonImport(target), typeOnly: true }],
  });
  assert.deepEqual(typeOnly.evidence, []);
  assert.deepEqual(typeOnly.diagnostics.map((item) => item.code), ["STORYBOOK_COMPONENT_UNMAPPED"]);
  assert.throws(() => analyzeStorybook({ manifests: [], components: [target], imports: [], maxDiagnostics: 0 }), /maxDiagnostics/u);
});
