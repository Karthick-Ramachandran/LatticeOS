import assert from "node:assert/strict";
import { cp, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { validateReuseIndex } from "@latticeos/core";

import { analyzeProject } from "./project-analysis.js";
import { detectProject } from "./project-discovery.js";
import { analyzeReactProjectFromDiscovery } from "./react-project.js";
import { RepositoryRoot, STORYBOOK_COMPONENTS_MANIFEST_PATH } from "./repository-root.js";
import { analyzeShadcnProjectFromDiscovery } from "./shadcn-project.js";
import { analyzeStorybookProjectFromDiscovery } from "./storybook-project.js";

const fixtureRoot = resolve(import.meta.dirname, "../../../fixtures/next-workspace");

async function copiedFixture(): Promise<string> {
  const parent = await mkdtemp(join(tmpdir(), "lattice-storybook-"));
  const target = join(parent, "consumer");
  await cp(fixtureRoot, target, { recursive: true });
  return target;
}

test("maps the fixed local Storybook manifest through a resolved React story import", async () => {
  const root = await RepositoryRoot.open(fixtureRoot);
  const discovery = await detectProject(root);
  const react = await analyzeReactProjectFromDiscovery(root, discovery);
  const shadcn = await analyzeShadcnProjectFromDiscovery(root, discovery, react);
  const result = await analyzeStorybookProjectFromDiscovery(root, discovery, react, shadcn.analysis.components);

  assert.equal(result.truncated, false);
  assert.deepEqual(result.manifestPaths, [STORYBOOK_COMPONENTS_MANIFEST_PATH]);
  assert.deepEqual(result.analysis.diagnostics, []);
  const button = result.analysis.components.find((component) => component.displayName === "Button");
  assert.ok(button?.evidenceIds.some((id) => id.startsWith("ev:storybook:story:")));
  assert.equal(result.analysis.evidence.length, 1);
  assert.ok(result.analysis.evidence.every((item) => item.kind === "story" && item.classification === "corroborating"));
});

test("bounds, absence, and malformed Storybook manifests preserve valid React-backed output", async () => {
  const root = await RepositoryRoot.open(fixtureRoot);
  const discovery = await detectProject(root);
  const react = await analyzeReactProjectFromDiscovery(root, discovery);
  const limited = await analyzeStorybookProjectFromDiscovery(root, discovery, react, react.analysis.components, {
    maxStorybookManifestBytes: 1,
  });
  assert.equal(limited.truncated, true);
  assert.deepEqual(limited.manifestPaths, []);
  assert.deepEqual(limited.analysis.components, react.analysis.components);
  assert.ok(limited.analysis.diagnostics.some((item) => item.code === "STORYBOOK_MANIFEST_BYTES_LIMIT"));

  const absent = await analyzeStorybookProjectFromDiscovery(root, {
    ...discovery,
    project: {
      ...discovery.project,
      tools: { ...discovery.project.tools, storybook: { status: "absent", evidenceIds: [] } },
    },
  }, react, react.analysis.components);
  assert.deepEqual(absent.analysis.components, react.analysis.components);
  assert.deepEqual(absent.analysis.evidence, []);

  const copied = await copiedFixture();
  await writeFile(join(copied, STORYBOOK_COMPONENTS_MANIFEST_PATH), '{"components":{"not-for-output":', "utf8");
  const malformed = await analyzeProject(await RepositoryRoot.open(copied), { generatorVersion: "0.0.0-test" });
  assert.deepEqual(validateReuseIndex(malformed.index), { ok: true, value: malformed.index });
  assert.ok(malformed.index.components.some((component) => component.displayName === "Button"));
  assert.equal(malformed.index.evidence.some((item) => item.kind === "story"), false);
  assert.ok(malformed.index.diagnostics.some((item) => item.code === "STORYBOOK_MANIFEST_INVALID"));
  assert.equal(JSON.stringify(malformed.index).includes("not-for-output"), false);
});
