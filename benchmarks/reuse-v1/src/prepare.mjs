import { randomInt } from "node:crypto";
import { copyFile, lstat, mkdir, mkdtemp, readdir, readFile, rm, rmdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";

import { runCli } from "../../../packages/cli/dist/index.js";

import {
  BENCHMARK_SCHEMA_VERSION,
  SHA256_PATTERN,
  isBoundedString,
  isSafeRelativePath,
  sha256,
} from "./contract.mjs";
import { loadTaskManifests } from "./validate.mjs";

const TASK_ID_PATTERN = /^[a-z][a-z0-9-]{2,63}$/u;
const PREPARED_PAIR_KIND = "prepared-pair";
const PROMPT_REVISION = "reuse-v1.0";
const TRIAL_DIRECTORY_PREFIX = "latticeos-reuse-trial-";
const MAX_FIXTURE_FILES = 500;
const MAX_FIXTURE_BYTES = 8 * 1024 * 1024;
const GENERATED_FIXTURE_DIRECTORIES = new Set([".lattice/cache", ".lattice/reports"]);
const repositoryRoot = resolve(import.meta.dirname, "../../..");
const tasksDirectory = resolve(import.meta.dirname, "../tasks");
const fixtureRoot = resolve(repositoryRoot, "fixtures/next-workspace");

function safeAgentLabel(value) {
  return isBoundedString(value, 160) && !value.includes("@");
}

function safeAgentVersion(value) {
  return isBoundedString(value, 160);
}

function asArtifact(path, content) {
  return { path, sha256: sha256(content) };
}

function trialError(message) {
  return new Error(`reuse-v1 preparation failed: ${message}`);
}

function isGeneratedFixtureDirectory(path) {
  return GENERATED_FIXTURE_DIRECTORIES.has(path);
}

function validateOptions(options) {
  if (!TASK_ID_PATTERN.test(options.taskId ?? "")) throw trialError("--task must name a pre-registered task ID.");
  if (!TASK_ID_PATTERN.test(options.pairId ?? "")) throw trialError("--pair must be a lowercase pair ID.");
  if (!safeAgentLabel(options.agentLabel)) throw trialError("--agent-label must be a bounded label without an @ sign.");
  if (!safeAgentVersion(options.agentVersion)) throw trialError("--agent-version must be a bounded value.");
  if (!SHA256_PATTERN.test(options.agentConfigurationHash ?? "")) throw trialError("--agent-config-hash must be a SHA-256 hash.");
}

export async function listControlledFixtureFiles(root) {
  let rootMetadata;
  try {
    rootMetadata = await lstat(root);
  } catch {
    throw trialError("the controlled fixture is unavailable.");
  }
  if (!rootMetadata.isDirectory() || rootMetadata.isSymbolicLink()) {
    throw trialError("the controlled fixture must be a regular directory.");
  }

  const files = [];
  let totalBytes = 0;
  async function visit(current, currentRelative) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name, "en-US"))) {
      const childRelative = currentRelative.length === 0 ? entry.name : `${currentRelative}/${entry.name}`;
      const child = resolve(current, entry.name);
      const metadata = await lstat(child);
      if (metadata.isSymbolicLink()) throw trialError("the controlled fixture cannot contain symlinks.");
      if (metadata.isDirectory()) {
        if (isGeneratedFixtureDirectory(childRelative)) continue;
        await visit(child, childRelative);
        continue;
      }
      if (!metadata.isFile() || !isSafeRelativePath(childRelative)) {
        throw trialError("the controlled fixture contains an unsupported path.");
      }
      totalBytes += metadata.size;
      files.push({ path: childRelative, size: metadata.size });
      if (files.length > MAX_FIXTURE_FILES || totalBytes > MAX_FIXTURE_BYTES) {
        throw trialError("the controlled fixture exceeds the preparation bounds.");
      }
    }
  }
  await visit(root, "");
  return files;
}

export async function removeGeneratedTreatmentCache(workspace) {
  const latticeDirectory = join(workspace, ".lattice");
  const cacheDirectory = join(latticeDirectory, "cache");
  await rm(join(cacheDirectory, "reuse-index.json"), { force: true });
  for (const directory of [cacheDirectory, latticeDirectory]) {
    try {
      await rmdir(directory);
    } catch (error) {
      if (error && typeof error === "object" && (error.code === "ENOENT" || error.code === "ENOTEMPTY")) continue;
      throw error;
    }
  }
}

async function copyFixture(files, sourceRoot, targetRoot) {
  await mkdir(targetRoot, { recursive: true, mode: 0o700 });
  for (const file of files) {
    const source = resolve(sourceRoot, file.path);
    const target = resolve(targetRoot, file.path);
    if (relative(targetRoot, target).startsWith("..")) throw trialError("fixture copy path escaped its workspace.");
    const current = await lstat(source);
    if (!current.isFile() || current.isSymbolicLink() || current.size !== file.size) {
      throw trialError("the controlled fixture changed while it was being copied.");
    }
    await mkdir(dirname(target), { recursive: true, mode: 0o700 });
    await copyFile(source, target);
  }
}

async function captureTreatmentContext(task, workspace) {
  const stdout = [];
  const stderr = [];
  const outcome = await runCli(["--root", workspace, "--json", "context", task.task], {
    cwd: workspace,
    writeStdout: (value) => stdout.push(value),
    writeStderr: (value) => stderr.push(value),
  });
  if (outcome.exitCode !== 0 || stderr.length > 0) throw trialError("the treatment context could not be generated.");
  const content = stdout.join("");
  try {
    const parsed = JSON.parse(content);
    if (parsed?.schemaVersion !== 1 || parsed?.command !== "context" || parsed?.result?.task !== task.task) {
      throw trialError("the treatment context did not match the pre-registered task.");
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("reuse-v1 preparation failed:")) throw error;
    throw trialError("the treatment context was not valid JSON.");
  }
  return content;
}

function promptFor(task, condition, context) {
  const common = `You are completing a controlled source-only implementation trial.\n\nWork only in the provided workspace. Implement this task:\n\n${task.task}\n\nYou may change only:\n${task.allowedSubmissionPaths.map((path) => `- ${path}`).join("\n")}\n\nInspect existing source before you implement. Do not change dependencies, configuration, generated files, or any path outside the permitted list. Do not read files outside this workspace.\n\nWhen you finish, leave the implementation in the permitted path. Do not write a benchmark result or reviewer annotation.\n`;
  if (condition === "control") return common;
  return `${common}\n${context}`;
}

function trialInstructions(plan) {
  const orderedRuns = [...plan.runs].sort((left, right) => left.order - right.order);
  return `# reuse-v1 prepared pair\n\nThis directory holds a prepared control and treatment pair. It is not a benchmark result.\n\nRun the two prompts in this order:\n\n${orderedRuns.map((run) => `${run.order}. ${run.condition}: ${run.bundlePath}/AGENT_PROMPT.txt`).join("\n")}\n\nGive each agent only its own prompt and workspace. Do not show an agent the other bundle. The treatment prompt contains the saved JSON from \`lattice context\`; the control prompt does not.\n\nAfter both agents finish, an independent reviewer must inspect the permitted submission file, record test outcomes and metrics, and create the result artifacts. Do not copy synthetic verifier data into this directory or call this prepared pair a qualified trial.\n`;
}

function planRun(condition, order, pairId, workspacePath, prompt, context) {
  const run = {
    id: `${pairId}-${condition}`,
    condition,
    order,
    workspacePath,
    prompt: asArtifact(`${condition}/AGENT_PROMPT.txt`, prompt),
  };
  if (condition === "treatment") {
    return { ...run, treatmentContext: asArtifact(`${condition}/LATTICE_CONTEXT.json`, context) };
  }
  return run;
}

export async function prepareTrialPair(options, dependencies = {}) {
  validateOptions(options);
  const loaded = await loadTaskManifests(tasksDirectory);
  if (loaded.errors.length > 0) throw trialError("the pre-registered task manifests are invalid.");
  const task = loaded.tasks.find((candidate) => candidate.id === options.taskId);
  if (!task) throw trialError("--task did not match a pre-registered task.");
  if (task.fixture.path !== "fixtures/next-workspace") throw trialError("the task fixture is not supported by this runner.");

  const fixtureFiles = await listControlledFixtureFiles(fixtureRoot);
  const trialRoot = await mkdtemp(join(tmpdir(), TRIAL_DIRECTORY_PREFIX));
  try {
    const controlWorkspace = join(trialRoot, "control/workspace");
    const treatmentWorkspace = join(trialRoot, "treatment/workspace");
    await Promise.all([
      copyFixture(fixtureFiles, fixtureRoot, controlWorkspace),
      copyFixture(fixtureFiles, fixtureRoot, treatmentWorkspace),
    ]);

    const treatmentContext = await captureTreatmentContext(task, treatmentWorkspace);
    await removeGeneratedTreatmentCache(treatmentWorkspace);
    const controlPrompt = promptFor(task, "control");
    const treatmentPrompt = promptFor(task, "treatment", treatmentContext);
    await Promise.all([
      writeFile(join(trialRoot, "control/AGENT_PROMPT.txt"), controlPrompt, { encoding: "utf8", mode: 0o600 }),
      writeFile(join(trialRoot, "treatment/AGENT_PROMPT.txt"), treatmentPrompt, { encoding: "utf8", mode: 0o600 }),
      writeFile(join(trialRoot, "treatment/LATTICE_CONTEXT.json"), treatmentContext, { encoding: "utf8", mode: 0o600 }),
    ]);

    const controlFirst = dependencies.randomBoolean ? dependencies.randomBoolean() : randomInt(2) === 0;
    const controlOrder = controlFirst ? 1 : 2;
    const treatmentOrder = controlFirst ? 2 : 1;
    const plan = {
      schemaVersion: BENCHMARK_SCHEMA_VERSION,
      protocol: "reuse-v1",
      kind: PREPARED_PAIR_KIND,
      pairId: options.pairId,
      taskId: task.id,
      fixture: task.fixture,
      promptRevision: PROMPT_REVISION,
      agent: {
        label: options.agentLabel,
        version: options.agentVersion,
        configurationHash: options.agentConfigurationHash,
      },
      runs: [
        planRun("control", controlOrder, options.pairId, "control/workspace", controlPrompt),
        planRun("treatment", treatmentOrder, options.pairId, "treatment/workspace", treatmentPrompt, treatmentContext),
      ],
    };
    await writeFile(join(trialRoot, "trial-plan.json"), `${JSON.stringify(plan, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await writeFile(join(trialRoot, "README.md"), trialInstructions({ ...plan, runs: plan.runs.map((run) => ({ ...run, bundlePath: run.condition })) }), { encoding: "utf8", mode: 0o600 });
    return { trialRoot, plan };
  } catch (error) {
    await rm(trialRoot, { recursive: true, force: true });
    throw error;
  }
}

export async function readPreparedContext(trialRoot) {
  return readFile(join(trialRoot, "treatment/LATTICE_CONTEXT.json"), "utf8");
}
