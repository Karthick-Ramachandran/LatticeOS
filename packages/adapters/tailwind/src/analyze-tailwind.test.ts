import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import { stableStringify } from "@latticeos/core";

import { analyzeTailwind } from "./analyze-tailwind.js";
import type { TailwindAnalysisInput, TailwindSourceInput } from "./types.js";

const fixtureRoot = resolve(import.meta.dirname, "../../../../fixtures/next-workspace");

const fixtureFiles: readonly { readonly path: string; readonly kind: TailwindSourceInput["kind"] }[] = [
  { path: "apps/web/app/globals.css", kind: "css" },
  { path: "tailwind.config.ts", kind: "config" },
  { path: "apps/web/app/page.tsx", kind: "source" },
  { path: "packages/ui/src/button.tsx", kind: "source" },
  { path: "packages/ui/src/settings-section.tsx", kind: "source" },
];

async function fixtureInput(): Promise<TailwindAnalysisInput> {
  const sources: TailwindSourceInput[] = await Promise.all(
    fixtureFiles.map(async ({ path, kind }) => ({ path, kind, content: await readFile(resolve(fixtureRoot, path), "utf8") })),
  );
  return { sources, repeatedBundleThreshold: 2 };
}

test("extracts static v4 and v3 tokens plus exact normalized repeated bundles", async () => {
  const result = analyzeTailwind(await fixtureInput());

  assert.deepEqual(
    result.tailwind.tokens.map(({ name, value, sourcePath }) => ({ name, value, sourcePath })),
    [
      { name: "--color-brand", value: "oklch(0.62 0.18 255)", sourcePath: "apps/web/app/globals.css" },
      { name: "colors.accent", value: "#7c3aed", sourcePath: "tailwind.config.ts" },
      { name: "spacing.card", value: "1.25rem", sourcePath: "tailwind.config.ts" },
    ],
  );
  assert.deepEqual(
    result.tailwind.repeatedClassBundles.map((bundle) => ({
      classes: bundle.classes,
      originals: bundle.originals,
      count: bundle.count,
      paths: bundle.locations.map((location) => location.path),
    })),
    [
      {
        classes: ["border", "p-4", "rounded-lg"],
        originals: ["border p-4 rounded-lg", "rounded-lg border p-4"],
        count: 2,
        paths: ["apps/web/app/page.tsx", "packages/ui/src/settings-section.tsx"],
      },
      {
        classes: ["gap-2", "inline-flex", "items-center", "px-4", "py-2", "rounded-md"],
        originals: [
          "inline-flex items-center gap-2 rounded-md px-4 py-2",
          "py-2 px-4 rounded-md gap-2 items-center inline-flex",
        ],
        count: 2,
        paths: ["packages/ui/src/button.tsx", "packages/ui/src/button.tsx"],
      },
    ],
  );
  assert.ok(result.evidence.every((item) => !item.location.path.startsWith("/")));
  assert.ok(result.evidence.some((item) => item.method === "static-source"));
  assert.ok(result.evidence.some((item) => item.classification === "heuristic"));
  assert.equal(result.diagnostics.length, 0);

  const golden = await readFile(resolve(fixtureRoot, "../goldens/tailwind-analysis.next-workspace.golden.json"), "utf8");
  assert.equal(stableStringify(result), golden);
});

test("reports dynamic class expressions without turning their source values into classes", () => {
  const result = analyzeTailwind({
    sources: [
      {
        path: "src/dynamic.tsx",
        kind: "source",
        content: "const secret = 'not-for-output'; const note = 'className=\"not-for-output\"'; // className=\"not-for-output\"\n<div className={secret} />; cn('p-4', secret);",
      },
      {
        path: "tailwind.config.ts",
        kind: "config",
        content: "export default { theme: { extend: { colors: { brand: notForOutput } } } };",
      },
    ],
  });

  assert.deepEqual(result.tailwind.repeatedClassBundles, []);
  assert.deepEqual(result.diagnostics.map((item) => item.code), [
    "TAILWIND_CLASSNAME_DYNAMIC",
    "TAILWIND_CONFIG_DYNAMIC_VALUE",
    "TAILWIND_MERGE_DYNAMIC",
  ]);
  assert.equal(JSON.stringify(result).includes("not-for-output"), false);
  assert.throws(() => analyzeTailwind({ sources: [], repeatedBundleThreshold: 1 }), /threshold/ui);
});
