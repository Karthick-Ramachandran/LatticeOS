import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import { serializeReuseIndex, stableStringify, validateReuseIndex } from "@latticeos/core";

import { analyzeProject, buildReuseIndex } from "./project-analysis.js";
import { detectProject } from "./project-discovery.js";
import { analyzeReactProjectFromDiscovery } from "./react-project.js";
import { RepositoryRoot } from "./repository-root.js";
import { analyzeTailwindProjectFromDiscovery } from "./tailwind-project.js";

const fixtureRoot = resolve(import.meta.dirname, "../../../fixtures/next-workspace");

test("builds one validated deterministic Reuse index from shared project discovery", async () => {
  const root = await RepositoryRoot.open(fixtureRoot);
  const first = await analyzeProject(root, { generatorVersion: "0.0.0-test" });
  const second = await analyzeProject(root, { generatorVersion: "0.0.0-test" });

  assert.equal(first.truncated, false);
  assert.deepEqual(validateReuseIndex(first.index), { ok: true, value: first.index });
  assert.ok(first.index.components.some((component) => component.displayName === "Button"));
  assert.ok(
    first.index.components
      .find((component) => component.displayName === "Button")
      ?.evidenceIds.some((id) => id.startsWith("ev:shadcn:registry:")),
  );
  assert.ok(
    first.index.components
      .find((component) => component.displayName === "Button")
      ?.evidenceIds.some((id) => id.startsWith("ev:storybook:story:")),
  );
  assert.ok(first.index.tailwind.tokens.some((token) => token.name === "--color-brand"));
  assert.ok(first.index.tailwind.repeatedClassBundles.some((bundle) => bundle.count === 2));
  assert.equal(
    serializeReuseIndex(first.index),
    serializeReuseIndex(second.index),
  );

  const golden = await readFile(resolve(fixtureRoot, "../goldens/reuse-index.next-workspace.golden.json"), "utf8");
  assert.equal(stableStringify(first), golden);
});

test("keeps a valid partial index when an adapter source cap is reached", async () => {
  const result = await analyzeProject(await RepositoryRoot.open(fixtureRoot), {
    generatorVersion: "0.0.0-test",
    maxTailwindSourceFiles: 1,
  });

  assert.equal(result.truncated, true);
  assert.ok(result.index.diagnostics.some((item) => item.code === "TAILWIND_SOURCE_FILE_LIMIT"));
  assert.deepEqual(validateReuseIndex(result.index), { ok: true, value: result.index });
});

test("rejects conflicting evidence IDs during index assembly", async () => {
  const root = await RepositoryRoot.open(fixtureRoot);
  const discovery = await detectProject(root);
  const react = await analyzeReactProjectFromDiscovery(root, discovery);
  const tailwind = await analyzeTailwindProjectFromDiscovery(root, discovery);
  const record = react.analysis.evidence[0];
  assert.ok(record);

  assert.throws(
    () =>
      buildReuseIndex({
        discovery,
        react: react.analysis,
        tailwind: {
          ...tailwind.analysis,
          evidence: [
            ...tailwind.analysis.evidence,
            { ...record, location: { ...record.location, line: record.location.line + 1 } },
          ],
        },
      }),
    /Conflicting evidence/u,
  );
});

test("rejects an unsafe generator version before building an index", async () => {
  const root = await RepositoryRoot.open(fixtureRoot);
  await assert.rejects(
    () => analyzeProject(root, { generatorVersion: " unsafe" }),
    /generatorVersion/u,
  );
});
