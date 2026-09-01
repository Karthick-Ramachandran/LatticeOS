import assert from "node:assert/strict";
import { cp, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { validateReuseIndex } from "@latticeos/core";

import { analyzeProject } from "./project-analysis.js";
import { detectProject } from "./project-discovery.js";
import { analyzeReactProjectFromDiscovery } from "./react-project.js";
import { RepositoryRoot } from "./repository-root.js";
import { analyzeShadcnProjectFromDiscovery } from "./shadcn-project.js";

const fixtureRoot = resolve(import.meta.dirname, "../../../fixtures/next-workspace");

async function copiedFixture(): Promise<string> {
  const parent = await mkdtemp(join(tmpdir(), "lattice-shadcn-"));
  const target = join(parent, "consumer");
  await cp(fixtureRoot, target, { recursive: true });
  return target;
}

test("maps bounded static shadcn config through the direct root alias boundary", async () => {
  const root = await RepositoryRoot.open(fixtureRoot);
  const discovery = await detectProject(root);
  const react = await analyzeReactProjectFromDiscovery(root, discovery);
  const result = await analyzeShadcnProjectFromDiscovery(root, discovery, react);

  assert.equal(result.truncated, false);
  assert.deepEqual(result.configPaths, ["components.json"]);
  assert.equal(result.analysis.diagnostics.length, 0);
  const button = result.analysis.components.find((component) => component.displayName === "Button");
  assert.ok(button?.evidenceIds.some((id) => id.startsWith("ev:shadcn:registry:")));
  assert.equal(result.analysis.evidence.length, 6);
  assert.ok(result.analysis.evidence.every((item) => item.kind === "registry" && item.classification === "corroborating"));
});

test("bounds shadcn config admission and leaves React components usable when config is unavailable", async () => {
  const root = await RepositoryRoot.open(fixtureRoot);
  const discovery = await detectProject(root);
  const react = await analyzeReactProjectFromDiscovery(root, discovery);
  const result = await analyzeShadcnProjectFromDiscovery(root, discovery, react, { maxShadcnConfigBytes: 1 });

  assert.equal(result.truncated, true);
  assert.deepEqual(result.configPaths, []);
  assert.equal(result.analysis.evidence.length, 0);
  assert.deepEqual(result.analysis.components, react.analysis.components);
  assert.ok(result.analysis.diagnostics.some((item) => item.code === "SHADCN_CONFIG_BYTES_LIMIT"));
});

test("optional shadcn absence and malformed config leave a valid bounded Reuse index", async () => {
  const root = await RepositoryRoot.open(fixtureRoot);
  const discovery = await detectProject(root);
  const react = await analyzeReactProjectFromDiscovery(root, discovery);
  const absent = await analyzeShadcnProjectFromDiscovery(root, {
    ...discovery,
    project: {
      ...discovery.project,
      tools: { ...discovery.project.tools, shadcn: { status: "absent", evidenceIds: [] } },
    },
  }, react);
  assert.deepEqual(absent.analysis.components, react.analysis.components);
  assert.deepEqual(absent.analysis.evidence, []);

  const copied = await copiedFixture();
  await writeFile(join(copied, "components.json"), '{"aliases":{"ui":"not-for-output"}', "utf8");
  const malformed = await analyzeProject(await RepositoryRoot.open(copied), { generatorVersion: "0.0.0-test" });
  assert.deepEqual(validateReuseIndex(malformed.index), { ok: true, value: malformed.index });
  assert.ok(malformed.index.components.some((component) => component.displayName === "Button"));
  assert.equal(malformed.index.evidence.some((item) => item.kind === "registry"), false);
  assert.ok(malformed.index.diagnostics.some((item) => item.code === "SHADCN_CONFIG_INVALID"));
  assert.equal(JSON.stringify(malformed.index).includes("not-for-output"), false);
});
