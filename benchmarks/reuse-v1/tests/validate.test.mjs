import assert from "node:assert/strict";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { sha256 } from "../src/contract.mjs";
import { loadTaskManifests, validateResultSet } from "../src/validate.mjs";
import { createSyntheticResultSet } from "./fixtures.mjs";

const benchmarkRoot = resolve(import.meta.dirname, "..");
const tasksDirectory = join(benchmarkRoot, "tasks");

async function temporaryRoot() {
  return mkdtemp(join(tmpdir(), "latticeos-reuse-benchmark-"));
}

test("reuse-v1 pre-registers three source-backed tasks", async () => {
  const loaded = await loadTaskManifests(tasksDirectory);
  assert.deepEqual(loaded.errors, []);
  assert.deepEqual(loaded.tasks.map((task) => task.id), ["billing-settings-card", "notification-settings", "team-settings-section"]);
  assert.ok(loaded.tasks.every((task) => task.expectedCanonicalComponents.length > 0));
  assert.ok(loaded.tasks.every((task) => task.fixture.gitTree === "474f8c8841997b2105d1cfcaf9226f23b08a2e7a"));
});

test("synthetic verifier records validate but cannot satisfy the release gate", async () => {
  const root = await temporaryRoot();
  try {
    const { tasks, errors } = await loadTaskManifests(tasksDirectory);
    assert.deepEqual(errors, []);
    const resultSet = await createSyntheticResultSet(root, tasks);
    const result = await validateResultSet({ tasks, resultSet, artifactRoot: root });
    assert.deepEqual(result.errors, []);
    assert.equal(result.summary.gate.status, "not-eligible");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("qualified paired trials require three pairs per task and reject an inappropriate-reuse regression", async () => {
  const root = await temporaryRoot();
  try {
    const { tasks, errors } = await loadTaskManifests(tasksDirectory);
    assert.deepEqual(errors, []);
    const insufficient = await createSyntheticResultSet(root, tasks, { kind: "agent-trials", pairsPerTask: 1 });
    assert.equal((await validateResultSet({ tasks, resultSet: insufficient, artifactRoot: root })).summary.gate.status, "insufficient");

    const qualifying = await createSyntheticResultSet(root, tasks, { kind: "agent-trials", pairsPerTask: 3 });
    const qualifiedResult = await validateResultSet({ tasks, resultSet: qualifying, artifactRoot: root });
    assert.deepEqual(qualifiedResult.errors, []);
    assert.equal(qualifiedResult.summary.gate.status, "pass");

    const treatment = qualifying.runs.find((run) => run.condition === "treatment");
    treatment.review.annotations[0] = { ...treatment.review.annotations[0], classification: "inappropriate" };
    const regressiveResult = await validateResultSet({ tasks, resultSet: qualifying, artifactRoot: root });
    assert.equal(regressiveResult.summary.gate.status, "fail");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the validator rejects changed treatment context, control leakage, and symlinked submission artifacts", async () => {
  const root = await temporaryRoot();
  try {
    const { tasks, errors } = await loadTaskManifests(tasksDirectory);
    assert.deepEqual(errors, []);
    const resultSet = await createSyntheticResultSet(root, tasks);
    const control = resultSet.runs.find((run) => run.condition === "control");
    const treatments = resultSet.runs.filter((run) => run.condition === "treatment");
    const [contextMismatch, hashMismatch, symlinkedSubmission] = treatments;
    control.treatmentContext = contextMismatch.treatmentContext;

    const mismatchedContext = '{"schemaVersion":1,"command":"context","result":{"task":"wrong task"}}\n';
    await writeFile(join(root, contextMismatch.treatmentContext.path), mismatchedContext, "utf8");
    contextMismatch.treatmentContext.sha256 = sha256(mismatchedContext);
    await writeFile(join(root, hashMismatch.treatmentContext.path), '{"not-for-output":true}\n', "utf8");

    let symlinkChecked = false;
    if (process.platform !== "win32") {
      const submission = symlinkedSubmission.submission.files[0];
      const target = join(root, submission.path);
      await writeFile(join(root, "secret.txt"), "secret-for-verifier-only\n", "utf8");
      await rm(target);
      await symlink("../../secret.txt", target);
      symlinkChecked = true;
    }

    const result = await validateResultSet({ tasks, resultSet, artifactRoot: root });
    assert.ok(result.errors.some((error) => error.includes("control-has-treatment-context")));
    assert.ok(result.errors.some((error) => error.includes("treatment-context-mismatch")));
    assert.ok(result.errors.some((error) => error.includes("artifact-hash-mismatch")));
    if (symlinkChecked) assert.ok(result.errors.some((error) => error.includes("artifact-symlink")));
    assert.ok(result.errors.every((error) => !error.includes("not-for-output") && !error.includes("secret-for-verifier-only")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the validator rejects a treatment prompt that does not end with its saved context", async () => {
  const root = await temporaryRoot();
  try {
    const { tasks, errors } = await loadTaskManifests(tasksDirectory);
    assert.deepEqual(errors, []);
    const resultSet = await createSyntheticResultSet(root, tasks);
    const treatment = resultSet.runs.find((run) => run.condition === "treatment");
    const shortenedPrompt = "Task: delivery proof\nCondition: treatment\n";
    await writeFile(join(root, treatment.prompt.path), shortenedPrompt, "utf8");
    treatment.prompt.sha256 = sha256(shortenedPrompt);

    const result = await validateResultSet({ tasks, resultSet, artifactRoot: root });
    assert.ok(result.errors.some((error) => error.includes("treatment-prompt-context-mismatch")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the validator requires a raw delivered prompt that exactly matches the recorded prompt", async () => {
  const root = await temporaryRoot();
  try {
    const { tasks, errors } = await loadTaskManifests(tasksDirectory);
    assert.deepEqual(errors, []);
    const resultSet = await createSyntheticResultSet(root, tasks);
    const control = resultSet.runs.find((run) => run.condition === "control");
    delete control.deliveredPrompt;
    const treatment = resultSet.runs.find((run) => run.condition === "treatment");
    const modifiedDelivery = "Task: altered by a wrapper\n";
    await writeFile(join(root, treatment.deliveredPrompt.path), modifiedDelivery, "utf8");
    treatment.deliveredPrompt.sha256 = sha256(modifiedDelivery);

    const result = await validateResultSet({ tasks, resultSet, artifactRoot: root });
    assert.ok(result.errors.some((error) => error.includes("missing-delivered-prompt")));
    assert.ok(result.errors.some((error) => error.includes("delivered-prompt-mismatch")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("review annotations must cite a line in their declared submission file", async () => {
  const root = await temporaryRoot();
  try {
    const { tasks, errors } = await loadTaskManifests(tasksDirectory);
    assert.deepEqual(errors, []);
    const resultSet = await createSyntheticResultSet(root, tasks);
    const treatment = resultSet.runs.find((run) => run.condition === "treatment");
    treatment.review.annotations[0].location = "untrusted source text";
    const result = await validateResultSet({ tasks, resultSet, artifactRoot: root });
    assert.ok(result.errors.some((error) => error.includes("invalid-review-annotation")));
    assert.ok(result.errors.every((error) => !error.includes("untrusted source text")));

    const unsupported = await createSyntheticResultSet(root, tasks);
    const unsupportedTreatment = unsupported.runs.find((run) => run.condition === "treatment");
    unsupportedTreatment.review.annotations[0].componentId = "react:packages/ui/unknown.tsx#Unknown";
    const unsupportedResult = await validateResultSet({ tasks, resultSet: unsupported, artifactRoot: root });
    assert.ok(unsupportedResult.errors.some((error) => error.includes("invalid-review-annotation")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the validator rejects unpaired and mismatched trial records", async () => {
  const root = await temporaryRoot();
  try {
    const { tasks, errors } = await loadTaskManifests(tasksDirectory);
    assert.deepEqual(errors, []);

    const unpaired = await createSyntheticResultSet(root, tasks);
    unpaired.runs.pop();
    const unpairedResult = await validateResultSet({ tasks, resultSet: unpaired, artifactRoot: root });
    assert.ok(unpairedResult.errors.some((error) => error.includes("unpaired-run")));
    assert.ok(unpairedResult.errors.some((error) => error.includes("missing-condition")));

    const mismatched = await createSyntheticResultSet(root, tasks);
    const treatment = mismatched.runs.find((run) => run.condition === "treatment");
    treatment.agent.configurationHash = sha256("a distinct, declared agent configuration");
    const mismatchedResult = await validateResultSet({ tasks, resultSet: mismatched, artifactRoot: root });
    assert.ok(mismatchedResult.errors.some((error) => error.includes("mismatched-pair")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("invalid record identifiers do not echo submitted text in diagnostics", async () => {
  const { tasks, errors } = await loadTaskManifests(tasksDirectory);
  assert.deepEqual(errors, []);
  const result = await validateResultSet({
    tasks,
    artifactRoot: tasksDirectory,
    resultSet: {
      schemaVersion: 1,
      protocol: "reuse-v1",
      kind: "agent-trials",
      runs: [
        { id: "secret-for-verifier-only@", pairId: "pair", condition: "control" },
        { id: "secret-for-verifier-only@", pairId: "pair", condition: "treatment" },
      ],
    },
  });
  assert.ok(result.errors.some((error) => error.includes("invalid-run-identity")));
  assert.ok(result.errors.every((error) => !error.includes("secret-for-verifier-only@")));
});

test("the validator rejects unsafe task and artifact paths", async () => {
  const root = await temporaryRoot();
  try {
    const { tasks, errors } = await loadTaskManifests(tasksDirectory);
    assert.deepEqual(errors, []);
    const unsafeTasks = structuredClone(tasks);
    unsafeTasks[0].fixture.path = "../outside";
    const resultSet = await createSyntheticResultSet(root, tasks);
    const control = resultSet.runs.find((run) => run.condition === "control" && run.taskId !== unsafeTasks[0].id);
    control.prompt.path = "../outside.txt";
    control.submission.files[0].path = "/outside.tsx";
    const result = await validateResultSet({ tasks: unsafeTasks, resultSet, artifactRoot: root });
    assert.ok(result.errors.some((error) => error.includes("invalid-task-fixture")));
    assert.ok(result.errors.filter((error) => error.includes("invalid-artifact-path")).length >= 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the benchmark summary is byte-deterministic", async () => {
  const root = await temporaryRoot();
  try {
    const { tasks, errors } = await loadTaskManifests(tasksDirectory);
    assert.deepEqual(errors, []);
    const resultSet = await createSyntheticResultSet(root, tasks);
    const first = await validateResultSet({ tasks, resultSet, artifactRoot: root });
    const second = await validateResultSet({ tasks, resultSet, artifactRoot: root });
    assert.equal(JSON.stringify(first), JSON.stringify(second));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
