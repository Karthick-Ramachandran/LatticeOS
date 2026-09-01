import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import { createComponentId, stableStringify } from "@latticeos/core";

import { analyzeReact } from "./analyze-react.js";
import type { ReactAnalysisInput, ReactSourceInput } from "./types.js";

const fixtureRoot = resolve(import.meta.dirname, "../../../../fixtures/next-workspace");

const fixtureFiles: readonly { readonly path: string; readonly packageKey: string }[] = [
  { path: "packages/ui/src/button.tsx", packageKey: "@fixture/ui" },
  { path: "packages/ui/src/button.stories.tsx", packageKey: "@fixture/ui" },
  { path: "packages/ui/src/index.ts", packageKey: "@fixture/ui" },
  { path: "packages/ui/src/settings-section.tsx", packageKey: "@fixture/ui" },
  { path: "apps/web/app/page.tsx", packageKey: "web" },
];

async function fixtureInput(): Promise<ReactAnalysisInput> {
  const sources: ReactSourceInput[] = await Promise.all(
    fixtureFiles.map(async ({ path, packageKey }) => ({
      path,
      packageKey,
      content: await readFile(resolve(fixtureRoot, path), "utf8"),
    })),
  );
  return {
    sources,
    compiler: {
      baseUrl: ".",
      paths: { "@fixture/ui": ["packages/ui/src/index.ts"] },
    },
  };
}

test("indexes supported React component forms, props, imports, and usage evidence", async () => {
  const result = analyzeReact(await fixtureInput());
  const expectedComponentIds = [
    createComponentId({ packageKey: "@fixture/ui", sourcePath: "packages/ui/src/button.tsx", exportKey: "Button" }),
    createComponentId({ packageKey: "@fixture/ui", sourcePath: "packages/ui/src/button.tsx", exportKey: "ForwardedButton" }),
    createComponentId({ packageKey: "@fixture/ui", sourcePath: "packages/ui/src/button.tsx", exportKey: "MemoButton" }),
    createComponentId({ packageKey: "@fixture/ui", sourcePath: "packages/ui/src/button.tsx", exportKey: "SecondaryButton" }),
    createComponentId({ packageKey: "@fixture/ui", sourcePath: "packages/ui/src/button.tsx", exportKey: "default" }),
    createComponentId({ packageKey: "@fixture/ui", sourcePath: "packages/ui/src/settings-section.tsx", exportKey: "SettingsSection" }),
    createComponentId({ packageKey: "web", sourcePath: "apps/web/app/page.tsx", exportKey: "default" }),
  ].sort();

  assert.deepEqual(result.components.map((component) => component.id), expectedComponentIds);
  assert.equal(result.components.some((component) => component.displayName === "lowercaseComponent"), false);
  assert.equal(result.components.some((component) => component.displayName === "rejectedValue"), false);

  const button = result.components.find((component) => component.displayName === "Button");
  assert.ok(button);
  assert.deepEqual(
    button.props.map(({ name, required, defaulted, variants }) => ({ name, required, defaulted, variants })),
    [
      { name: "count", required: false, defaulted: false, variants: [] },
      { name: "id", required: false, defaulted: false, variants: [] },
      { name: "label", required: true, defaulted: false, variants: [] },
      { name: "variant", required: false, defaulted: true, variants: ["primary", "secondary"] },
    ],
  );

  const primaryImport = result.imports.find(
    (item) => item.importerPath === "apps/web/app/page.tsx" && item.localName === "PrimaryButton",
  );
  assert.equal(primaryImport?.resolvedComponentId, button.id);
  assert.ok(result.usages.some((item) => item.componentId === button.id && item.kind === "call"));
  assert.ok(result.usages.some((item) => item.componentId === button.id && item.kind === "jsx"));
  assert.ok(result.usages.some((item) => item.kind === "composition"));
  assert.equal(result.diagnostics.length, 0);

  const evidenceIds = new Set(result.evidence.map((item) => item.id));
  for (const component of result.components) {
    assert.ok(component.evidenceIds.every((id) => evidenceIds.has(id)));
    assert.ok(component.props.every((prop) => prop.evidenceIds.every((id) => evidenceIds.has(id))));
  }
  assert.ok(result.imports.every((item) => item.evidenceIds.every((id) => evidenceIds.has(id))));
  assert.ok(result.usages.every((item) => item.evidenceIds.every((id) => evidenceIds.has(id))));

  const golden = await readFile(resolve(fixtureRoot, "../goldens/react-analysis.next-workspace.golden.json"), "utf8");
  assert.equal(stableStringify(result), golden);
});

test("keeps malformed source bounded and rejects paths outside the virtual repository", () => {
  assert.throws(
    () => analyzeReact({ sources: [{ path: "../outside.tsx", packageKey: "root", content: "export {}" }] }),
    /path/u,
  );

  const result = analyzeReact({
    sources: [
      {
        path: "src/broken.tsx",
        packageKey: "root",
        content: "const secret = 'not-for-output'; export function Broken({ title: ) { return <div>{title}</div>; }",
      },
    ],
    maxDiagnostics: 1,
  });

  assert.equal(result.diagnostics.length, 1);
  assert.ok(result.diagnostics[0]?.code.startsWith("TYPESCRIPT_"));
  assert.equal(JSON.stringify(result).includes("not-for-output"), false);

  const defaultResult = analyzeReact({
    sources: [
      {
        path: "src/private.tsx",
        packageKey: "root",
        content: "export function Private({ token = 'not-for-output' }: { token?: string }) { return <div>{token}</div>; }",
      },
    ],
  });
  const token = defaultResult.components[0]?.props.find((prop) => prop.name === "token");
  assert.equal(token?.defaulted, true);
  assert.equal(JSON.stringify(defaultResult).includes("not-for-output"), false);
});
