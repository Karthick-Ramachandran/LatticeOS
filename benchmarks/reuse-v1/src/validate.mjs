import { readdir } from "node:fs/promises";
import { basename, dirname } from "node:path";

import {
  BENCHMARK_SCHEMA_VERSION,
  SHA256_PATTERN,
  addError,
  isBoundedString,
  isRecord,
  isSafeRelativePath,
  readBoundedFile,
  readVerifiedArtifact,
} from "./contract.mjs";

const TASK_ID_PATTERN = /^[a-z][a-z0-9-]{2,63}$/u;
const GIT_TREE_PATTERN = /^[a-f0-9]{40}$/u;
const COMPONENT_ID_PATTERN = /^react:[^\s:]+:[^\s#]+#[^\s#]+$/u;
const TASK_PATH_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right, "en-US"));
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort((left, right) => left.localeCompare(right, "en-US")).map((key) => [key, canonicalize(value[key])]));
}

function sameJson(left, right) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function metric(value) {
  return Number.isInteger(value) && value >= 0 && value <= 10_000;
}

function isSourceLocation(path, value) {
  if (!isBoundedString(value, 240) || !value.startsWith(`${path}:`)) return false;
  return /^[1-9][0-9]*(?::[1-9][0-9]*)?$/u.test(value.slice(path.length + 1));
}

function validateTask(task, source) {
  const errors = [];
  if (!isRecord(task) || task.schemaVersion !== BENCHMARK_SCHEMA_VERSION) {
    addError(errors, "invalid-task-schema", source);
    return errors;
  }
  if (!TASK_ID_PATTERN.test(task.id ?? "")) addError(errors, "invalid-task-id", source);
  if (!isRecord(task.fixture) || !isSafeRelativePath(task.fixture.path) || !GIT_TREE_PATTERN.test(task.fixture.gitTree ?? "")) {
    addError(errors, "invalid-task-fixture", source);
  }
  if (!isBoundedString(task.task) || !isBoundedString(task.reviewRubric)) addError(errors, "invalid-task-text", source);
  if (!Array.isArray(task.allowedSubmissionPaths) || task.allowedSubmissionPaths.length === 0 || task.allowedSubmissionPaths.some((path) => !isSafeRelativePath(path, TASK_PATH_EXTENSIONS))) {
    addError(errors, "invalid-task-submission-paths", source);
  }
  if (!Array.isArray(task.expectedCanonicalComponents) || task.expectedCanonicalComponents.length === 0) {
    addError(errors, "missing-expected-components", source);
    return errors;
  }
  const componentIds = new Set();
  for (const component of task.expectedCanonicalComponents) {
    if (!isRecord(component) || !COMPONENT_ID_PATTERN.test(component.componentId ?? "") || !isBoundedString(component.displayName, 160) || !isSafeRelativePath(component.sourcePath, TASK_PATH_EXTENSIONS) || !isBoundedString(component.importSpecifier, 160)) {
      addError(errors, "invalid-expected-component", source);
      continue;
    }
    if (componentIds.has(component.componentId)) addError(errors, "duplicate-expected-component", source);
    componentIds.add(component.componentId);
  }
  return errors;
}

export async function loadTaskManifests(tasksDirectory) {
  const errors = [];
  const tasks = [];
  let entries = [];
  try {
    entries = await readdir(tasksDirectory, { withFileTypes: true });
  } catch {
    return { tasks, errors: ["task-directory-unavailable"] };
  }
  for (const entry of entries.filter((item) => item.isFile() && item.name.endsWith(".json")).sort((left, right) => left.name.localeCompare(right.name, "en-US"))) {
    const content = await readBoundedFile(tasksDirectory, entry.name, [".json"], entry.name, errors);
    if (!content) continue;
    let task;
    try {
      task = JSON.parse(content.toString("utf8"));
    } catch {
      addError(errors, "invalid-task-json", entry.name);
      continue;
    }
    errors.push(...validateTask(task, entry.name));
    tasks.push(task);
  }
  const ids = new Set();
  for (const task of tasks) {
    if (ids.has(task.id)) addError(errors, "duplicate-task-id", task.id);
    ids.add(task.id);
  }
  if (tasks.length < 3) addError(errors, "insufficient-pre-registered-tasks", "reuse-v1 requires at least three tasks");
  return { tasks: tasks.sort((left, right) => left.id.localeCompare(right.id, "en-US")), errors: sorted(errors) };
}

function buildTaskMap(tasks, errors) {
  const map = new Map();
  for (const task of tasks) {
    const taskId = TASK_ID_PATTERN.test(task?.id ?? "") ? task.id : "unknown-task";
    const taskErrors = validateTask(task, taskId);
    errors.push(...taskErrors);
    if (taskErrors.length === 0 && !map.has(taskId)) map.set(taskId, task);
    else if (map.has(taskId)) addError(errors, "duplicate-task-id", taskId);
  }
  if (map.size < 3) addError(errors, "insufficient-pre-registered-tasks", "reuse-v1 requires at least three tasks");
  return map;
}

async function validateRun(run, taskMap, artifactRoot) {
  const errors = [];
  if (!isRecord(run) || !TASK_ID_PATTERN.test(run.id ?? "") || !TASK_ID_PATTERN.test(run.pairId ?? "")) {
    addError(errors, "invalid-run-identity", "run");
    return { errors, run, score: { appropriate: 0, inappropriate: 0 } };
  }
  const label = `run ${run.id}`;
  const task = taskMap.get(run.taskId);
  if (!task) addError(errors, "unknown-task", label);
  if (run.condition !== "control" && run.condition !== "treatment") addError(errors, "invalid-condition", label);
  if (run.order !== 1 && run.order !== 2) addError(errors, "invalid-condition-order", label);
  if (!isBoundedString(run.promptRevision, 160)) addError(errors, "invalid-prompt-revision", label);
  if (!isRecord(run.agent) || !isBoundedString(run.agent.label, 160) || !isBoundedString(run.agent.version, 160) || !SHA256_PATTERN.test(run.agent.configurationHash ?? "") || run.agent.label.includes("@")) {
    addError(errors, "invalid-agent-label", label);
  }
  if (!task || !isRecord(run.fixture) || !sameJson(run.fixture, task.fixture)) addError(errors, "fixture-mismatch", label);

  const prompt = await readVerifiedArtifact(artifactRoot, run.prompt, [".txt"], `${label} prompt`, errors);
  let deliveredPrompt;
  if (!isRecord(run.deliveredPrompt)) {
    addError(errors, "missing-delivered-prompt", label);
  } else {
    deliveredPrompt = await readVerifiedArtifact(artifactRoot, run.deliveredPrompt, [".txt"], `${label} delivered prompt`, errors);
    if (prompt && deliveredPrompt && !deliveredPrompt.equals(prompt)) {
      addError(errors, "delivered-prompt-mismatch", label);
    }
  }
  if (run.condition === "control") {
    if (run.treatmentContext !== undefined && run.treatmentContext !== null) addError(errors, "control-has-treatment-context", label);
  } else if (run.condition === "treatment") {
    const context = await readVerifiedArtifact(artifactRoot, run.treatmentContext, [".json"], `${label} context`, errors);
    if (context) {
      if (prompt && (prompt.length < context.length || !prompt.subarray(prompt.length - context.length).equals(context))) {
        addError(errors, "treatment-prompt-context-mismatch", label);
      }
      try {
        const parsed = JSON.parse(context.toString("utf8"));
        if (!isRecord(parsed) || parsed.schemaVersion !== 1 || parsed.command !== "context" || !isRecord(parsed.result) || parsed.result.task !== task?.task) {
          addError(errors, "treatment-context-mismatch", label);
        }
      } catch {
        addError(errors, "invalid-treatment-context-json", label);
      }
    }
  }

  const submissionPaths = new Set();
  if (!isRecord(run.submission) || !Array.isArray(run.submission.files) || run.submission.files.length === 0 || !isRecord(run.submission.test) || run.submission.test.status !== "passed" || !isBoundedString(run.submission.test.command, 1_024)) {
    addError(errors, "invalid-submission", label);
  } else {
    for (const file of run.submission.files) {
      if (!isRecord(file) || !task?.allowedSubmissionPaths.includes(file.fixturePath) || submissionPaths.has(file.fixturePath)) {
        addError(errors, "invalid-submission-path", label);
        continue;
      }
      submissionPaths.add(file.fixturePath);
      await readVerifiedArtifact(artifactRoot, file, TASK_PATH_EXTENSIONS, `${label} submission`, errors);
    }
  }

  let appropriate = 0;
  let inappropriate = 0;
  if (!isRecord(run.review) || run.review.status !== "reviewed" || !isBoundedString(run.review.reviewerLabel, 160) || run.review.reviewerLabel.includes("@") || !metric(run.review.duplicateComponentCount) || !metric(run.review.rawTailwindClassCount) || !metric(run.review.correctionTurns) || !Array.isArray(run.review.annotations)) {
    addError(errors, "invalid-review", label);
  } else {
    const expected = new Set(task?.expectedCanonicalComponents.map((component) => component.componentId));
    const annotations = new Set();
    for (const annotation of run.review.annotations) {
      const key = `${annotation?.componentId}\u0000${annotation?.submissionPath}`;
      if (!isRecord(annotation) || !expected.has(annotation.componentId) || !submissionPaths.has(annotation.submissionPath) || (annotation.classification !== "appropriate" && annotation.classification !== "inappropriate") || !isSourceLocation(annotation.submissionPath, annotation.location) || !isBoundedString(annotation.reason, 1_024) || annotations.has(key)) {
        addError(errors, "invalid-review-annotation", label);
        continue;
      }
      annotations.add(key);
      if (annotation.classification === "appropriate") appropriate += 1;
      else inappropriate += 1;
    }
  }
  return { errors: sorted(errors), run, score: { appropriate, inappropriate } };
}

function summarize(resultSet, taskMap, validatedRuns, errors) {
  const byTask = new Map([...taskMap.keys()].map((id) => [id, { pairs: 0, control: { appropriate: 0, inappropriate: 0 }, treatment: { appropriate: 0, inappropriate: 0 } }]));
  const pairs = new Map();
  for (const item of validatedRuns) {
    if (!TASK_ID_PATTERN.test(item.run?.pairId ?? "")) continue;
    const group = pairs.get(item.run.pairId) ?? [];
    group.push(item);
    pairs.set(item.run.pairId, group);
  }
  for (const [pairId, items] of pairs) {
    const pairErrors = [];
    if (items.length !== 2) addError(pairErrors, "unpaired-run", pairId);
    const control = items.find((item) => item.run?.condition === "control");
    const treatment = items.find((item) => item.run?.condition === "treatment");
    if (!control || !treatment) addError(pairErrors, "missing-condition", pairId);
    if (control && treatment && (!sameJson(control.run.fixture, treatment.run.fixture) || !sameJson(control.run.agent, treatment.run.agent) || control.run.taskId !== treatment.run.taskId || control.run.promptRevision !== treatment.run.promptRevision || control.run.order === treatment.run.order)) {
      addError(pairErrors, "mismatched-pair", pairId);
    }
    errors.push(...pairErrors);
    if (pairErrors.length > 0 || !control || !treatment || control.errors.length > 0 || treatment.errors.length > 0) continue;
    const task = byTask.get(control.run.taskId);
    if (!task) continue;
    task.pairs += 1;
    task.control.appropriate += control.score.appropriate;
    task.control.inappropriate += control.score.inappropriate;
    task.treatment.appropriate += treatment.score.appropriate;
    task.treatment.inappropriate += treatment.score.inappropriate;
  }
  const taskResults = [...byTask.entries()].map(([taskId, data]) => ({ taskId, ...data }));
  const totals = taskResults.reduce((current, item) => ({
    control: {
      appropriate: current.control.appropriate + item.control.appropriate,
      inappropriate: current.control.inappropriate + item.control.inappropriate,
    },
    treatment: {
      appropriate: current.treatment.appropriate + item.treatment.appropriate,
      inappropriate: current.treatment.inappropriate + item.treatment.inappropriate,
    },
  }), { control: { appropriate: 0, inappropriate: 0 }, treatment: { appropriate: 0, inappropriate: 0 } });

  let gate;
  if (resultSet.kind === "synthetic-verifier") {
    gate = { status: "not-eligible", reasons: ["Synthetic verifier data cannot satisfy the Phase 1 release gate."] };
  } else if (errors.length > 0) {
    gate = { status: "invalid", reasons: ["Result records contain validation errors."] };
  } else if (taskResults.some((item) => item.pairs < 3)) {
    gate = { status: "insufficient", reasons: ["Each pre-registered task needs at least three qualified pairs."] };
  } else if (totals.treatment.appropriate <= totals.control.appropriate || totals.treatment.inappropriate > totals.control.inappropriate) {
    gate = { status: "fail", reasons: ["Treatment did not improve appropriate reuse without increasing inappropriate reuse."] };
  } else {
    gate = { status: "pass", reasons: [] };
  }
  return { schemaVersion: BENCHMARK_SCHEMA_VERSION, benchmark: "reuse-v1", resultKind: resultSet.kind, taskResults, totals, gate };
}

export async function validateResultSet({ tasks, resultSet, artifactRoot }) {
  const errors = [];
  const taskMap = buildTaskMap(tasks, errors);
  if (!isRecord(resultSet) || resultSet.schemaVersion !== BENCHMARK_SCHEMA_VERSION || resultSet.protocol !== "reuse-v1" || (resultSet.kind !== "synthetic-verifier" && resultSet.kind !== "agent-trials") || !Array.isArray(resultSet.runs)) {
    addError(errors, "invalid-result-set", "reuse-v1");
    return { errors: sorted(errors), summary: { schemaVersion: BENCHMARK_SCHEMA_VERSION, benchmark: "reuse-v1", resultKind: "invalid", taskResults: [], totals: { control: { appropriate: 0, inappropriate: 0 }, treatment: { appropriate: 0, inappropriate: 0 } }, gate: { status: "invalid", reasons: ["Result set does not match the reuse-v1 contract."] } } };
  }
  const seenRunIds = new Set();
  const validatedRuns = [];
  for (const run of resultSet.runs) {
    const runId = TASK_ID_PATTERN.test(run?.id ?? "") ? run.id : undefined;
    if (runId && seenRunIds.has(runId)) addError(errors, "duplicate-run-id", runId);
    if (runId) seenRunIds.add(runId);
    const validated = await validateRun(run, taskMap, artifactRoot);
    errors.push(...validated.errors);
    validatedRuns.push(validated);
  }
  const summary = summarize(resultSet, taskMap, validatedRuns, errors);
  return { errors: sorted(errors), summary };
}

export async function validateResultFile({ tasksDirectory, resultPath }) {
  const taskLoad = await loadTaskManifests(tasksDirectory);
  const fileErrors = [...taskLoad.errors];
  const artifactRoot = dirname(resultPath);
  const result = await readBoundedFile(artifactRoot, basename(resultPath), [".json"], "result set", fileErrors);
  if (!result) {
    addError(fileErrors, "result-set-unavailable", "reuse-v1");
    return { errors: sorted(fileErrors), summary: { schemaVersion: BENCHMARK_SCHEMA_VERSION, benchmark: "reuse-v1", resultKind: "none", taskResults: [], totals: { control: { appropriate: 0, inappropriate: 0 }, treatment: { appropriate: 0, inappropriate: 0 } }, gate: { status: "insufficient", reasons: ["No result set is recorded."] } } };
  }
  let resultSet;
  try {
    resultSet = JSON.parse(result.toString("utf8"));
  } catch {
    addError(fileErrors, "result-set-unavailable", "reuse-v1");
    return { errors: sorted(fileErrors), summary: { schemaVersion: BENCHMARK_SCHEMA_VERSION, benchmark: "reuse-v1", resultKind: "none", taskResults: [], totals: { control: { appropriate: 0, inappropriate: 0 }, treatment: { appropriate: 0, inappropriate: 0 } }, gate: { status: "insufficient", reasons: ["No result set is recorded."] } } };
  }
  const validated = await validateResultSet({ tasks: taskLoad.tasks, resultSet, artifactRoot });
  return { errors: sorted([...fileErrors, ...validated.errors]), summary: validated.summary };
}
