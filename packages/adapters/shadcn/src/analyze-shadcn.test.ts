import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import { createComponentId, stableStringify, type UiComponent } from "@latticeos/core";

import { analyzeShadcn } from "./analyze-shadcn.js";
import type { ShadcnAnalysisInput } from "./types.js";

const fixtureRoot = resolve(import.meta.dirname, "../../../../fixtures/next-workspace");

function component(sourcePath: string, exportKey: string): UiComponent {
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

async function fixtureInput(): Promise<ShadcnAnalysisInput> {
  return {
    configs: [{ path: "components.json", content: await readFile(resolve(fixtureRoot, "components.json"), "utf8") }],
    components: [
      component("packages/ui/src/button.tsx", "Button"),
      component("packages/ui/src/settings-section.tsx", "SettingsSection"),
      component("apps/web/app/page.tsx", "Page"),
    ],
    compiler: {
      baseUrl: ".",
      paths: { "@fixture/ui": ["packages/ui/src/index.ts"] },
    },
  };
}

test("maps the configured shadcn UI source tree to existing React components", async () => {
  const first = analyzeShadcn(await fixtureInput());
  const second = analyzeShadcn(await fixtureInput());

  assert.equal(first.diagnostics.length, 0);
  assert.deepEqual(first.components.map((item) => item.displayName), ["Page", "Button", "SettingsSection"]);
  const configured = first.components.filter((item) => item.sourcePath.startsWith("packages/ui/src/"));
  assert.equal(configured.length, 2);
  assert.ok(configured.every((item) => item.evidenceIds.some((id) => id.startsWith("ev:shadcn:registry:"))));
  assert.equal(first.components.find((item) => item.displayName === "Page")?.evidenceIds.length, 1);
  assert.equal(first.evidence.length, 2);
  assert.ok(first.evidence.every((item) => item.kind === "registry" && item.method === "static-config"));
  assert.ok(first.evidence.every((item) => item.classification === "corroborating"));
  assert.ok(first.evidence.every((item) => item.location.path === "components.json"));
  assert.equal(stableStringify(first), stableStringify(second));
  const golden = await readFile(resolve(fixtureRoot, "../goldens/shadcn-analysis.next-workspace.golden.json"), "utf8");
  assert.equal(stableStringify(first), golden);
});

test("reports malformed or unresolved config without exposing config contents", () => {
  const components = [component("src/components/ui/button.tsx", "Button")];
  const malformed = analyzeShadcn({
    configs: [{ path: "components.json", content: '{"aliases":{"ui":"not-for-output"}' }],
    components,
  });
  assert.deepEqual(malformed.evidence, []);
  assert.deepEqual(malformed.diagnostics.map((item) => item.code), ["SHADCN_CONFIG_INVALID"]);
  assert.equal(JSON.stringify(malformed).includes("not-for-output"), false);

  const unresolved = analyzeShadcn({
    configs: [{ path: "components.json", content: '{"style":"new-york","aliases":{"ui":"@/components/ui"}}\n' }],
    components,
  });
  assert.deepEqual(unresolved.evidence, []);
  assert.deepEqual(unresolved.diagnostics.map((item) => item.code), ["SHADCN_UI_ALIAS_UNRESOLVED"]);
  assert.throws(() => analyzeShadcn({ configs: [], components, maxDiagnostics: 0 }), /maxDiagnostics/u);
});

test("supports repository-relative and one-wildcard direct root aliases", () => {
  const components = [component("src/components/ui/button.tsx", "Button")];
  const relative = analyzeShadcn({
    configs: [{ path: "components.json", content: '{"style":"new-york","aliases":{"ui":"src/components/ui"}}\n' }],
    components,
  });
  assert.equal(relative.evidence.length, 1);

  const wildcard = analyzeShadcn({
    configs: [{ path: "components.json", content: '{"style":"new-york","aliases":{"ui":"@/components/ui"}}\n' }],
    components,
    compiler: { baseUrl: "src", paths: { "@/*": ["*"] } },
  });
  assert.equal(wildcard.evidence.length, 1);
  assert.equal(wildcard.diagnostics.length, 0);
});
