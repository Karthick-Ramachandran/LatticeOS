import assert from "node:assert/strict";
import { lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { SHA256_PATTERN, sha256 } from "../src/contract.mjs";
import {
  listControlledFixtureFiles,
  prepareTrialPair,
  readPreparedContext,
  removeGeneratedTreatmentCache,
} from "../src/prepare.mjs";

const fixtureRoot = resolve(import.meta.dirname, "../../../fixtures/next-workspace");
const agentConfigurationHash = sha256("reuse-v1 test agent configuration");

function options(overrides = {}) {
  return {
    taskId: "notification-settings",
    pairId: "notification-pair-one",
    agentLabel: "test-agent",
    agentVersion: "test-version",
    agentConfigurationHash,
    ...overrides,
  };
}

test("trial preparation creates isolated paired workspaces and captures the real treatment context", async () => {
  const sourceBefore = await readFile(join(fixtureRoot, "packages/ui/src/button.tsx"), "utf8");
  const prepared = await prepareTrialPair(options(), { randomBoolean: () => true });
  try {
    assert.equal(prepared.plan.kind, "prepared-pair");
    assert.equal(prepared.plan.protocol, "reuse-v1");
    assert.equal(prepared.plan.fixture.path, "fixtures/next-workspace");
    assert.deepEqual(prepared.plan.runs.map((run) => [run.condition, run.order]), [["control", 1], ["treatment", 2]]);
    assert.equal(prepared.plan.agent.configurationHash, agentConfigurationHash);
    assert.match(prepared.plan.agent.configurationHash, SHA256_PATTERN);

    const controlPrompt = await readFile(join(prepared.trialRoot, "control/AGENT_PROMPT.txt"), "utf8");
    const treatmentPrompt = await readFile(join(prepared.trialRoot, "treatment/AGENT_PROMPT.txt"), "utf8");
    const treatmentContext = await readPreparedContext(prepared.trialRoot);
    assert.ok(!controlPrompt.includes(treatmentContext));
    assert.ok(treatmentPrompt.endsWith(treatmentContext));
    const parsedContext = JSON.parse(treatmentContext);
    assert.equal(parsedContext.command, "context");
    assert.equal(parsedContext.result.task, "Add a notification settings page with a save button.");

    assert.equal(await readFile(join(prepared.trialRoot, "control/workspace/packages/ui/src/button.tsx"), "utf8"), sourceBefore);
    assert.equal(await readFile(join(prepared.trialRoot, "treatment/workspace/packages/ui/src/button.tsx"), "utf8"), sourceBefore);
    await assert.rejects(lstat(join(prepared.trialRoot, "control/workspace/.lattice")));
    await assert.rejects(lstat(join(prepared.trialRoot, "treatment/workspace/.lattice")));
    assert.equal(await readFile(join(fixtureRoot, "packages/ui/src/button.tsx"), "utf8"), sourceBefore);

    const writtenPlan = JSON.parse(await readFile(join(prepared.trialRoot, "trial-plan.json"), "utf8"));
    assert.deepEqual(writtenPlan, prepared.plan);
  } finally {
    await rm(prepared.trialRoot, { recursive: true, force: true });
  }
});

test("trial preparation rejects unsafe declared agent metadata before creating a workspace", async () => {
  await assert.rejects(
    prepareTrialPair(options({ pairId: "../escape" })),
    /--pair must be a lowercase pair ID/u,
  );
  await assert.rejects(
    prepareTrialPair(options({ agentLabel: "agent@example.test" })),
    /--agent-label must be a bounded label/u,
  );
  await assert.rejects(
    prepareTrialPair(options({ agentConfigurationHash: "not-a-hash" })),
    /--agent-config-hash must be a SHA-256 hash/u,
  );
});

test("trial preparation rejects a symlink in a controlled fixture tree", async () => {
  const root = await mkdtemp(join(tmpdir(), "latticeos-reuse-fixture-"));
  try {
    await mkdir(join(root, "source"));
    await writeFile(join(root, "source/component.tsx"), "export {}\n", "utf8");
    if (process.platform === "win32") {
      assert.deepEqual((await listControlledFixtureFiles(root)).map((file) => file.path), ["source/component.tsx"]);
      return;
    }
    await symlink("source/component.tsx", join(root, "linked.tsx"));
    await assert.rejects(listControlledFixtureFiles(root), /cannot contain symlinks/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("fixture inventory excludes generated Lattice cache and report directories", async () => {
  const root = await mkdtemp(join(tmpdir(), "latticeos-reuse-fixture-"));
  try {
    await mkdir(join(root, ".lattice/cache"), { recursive: true });
    await mkdir(join(root, ".lattice/reports"), { recursive: true });
    await mkdir(join(root, "source"));
    await writeFile(join(root, ".lattice/config.json"), "{\"schemaVersion\":1}\n", "utf8");
    await writeFile(join(root, ".lattice/cache/reuse-index.json"), "generated\n", "utf8");
    await writeFile(join(root, ".lattice/reports/report.json"), "generated\n", "utf8");
    await writeFile(join(root, "source/component.tsx"), "export {}\n", "utf8");

    assert.deepEqual(
      (await listControlledFixtureFiles(root)).map((file) => file.path),
      [".lattice/config.json", "source/component.tsx"],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("treatment cleanup removes generated cache but preserves committed Lattice configuration", async () => {
  const workspace = await mkdtemp(join(tmpdir(), "latticeos-reuse-workspace-"));
  try {
    await mkdir(join(workspace, ".lattice/cache"), { recursive: true });
    await writeFile(join(workspace, ".lattice/config.json"), "{\"schemaVersion\":1}\n", "utf8");
    await writeFile(join(workspace, ".lattice/cache/reuse-index.json"), "generated\n", "utf8");

    await removeGeneratedTreatmentCache(workspace);

    assert.equal(await readFile(join(workspace, ".lattice/config.json"), "utf8"), "{\"schemaVersion\":1}\n");
    await assert.rejects(lstat(join(workspace, ".lattice/cache")));
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});
