import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { sha256 } from "../src/contract.mjs";

async function writeArtifact(root, path, content) {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
  return { path, sha256: sha256(content) };
}

function submissionSource(task) {
  const names = task.expectedCanonicalComponents.map((component) => component.displayName).join(", ");
  return `import { ${names} } from "@fixture/ui";\n\nexport default function BenchmarkSubmission() {\n  return null;\n}\n`;
}

export async function createSyntheticResultSet(root, tasks, { kind = "synthetic-verifier", pairsPerTask = 1 } = {}) {
  const runs = [];
  for (const task of tasks) {
    for (let iteration = 1; iteration <= pairsPerTask; iteration += 1) {
      const pairId = `${task.id}-pair-${iteration}`;
      const treatmentFirst = iteration % 2 === 0;
      const source = submissionSource(task);
      const contextText = `${JSON.stringify({ schemaVersion: 1, command: "context", result: { schemaVersion: 1, task: task.task } })}\n`;
      const context = await writeArtifact(root, `artifacts/contexts/${pairId}.json`, contextText);
      const controlPromptText = `Task: ${task.task}\nCondition: control\n`;
      const treatmentPromptText = `Task: ${task.task}\nCondition: treatment\n${contextText}`;
      const controlPrompt = await writeArtifact(root, `artifacts/prompts/${pairId}-control.txt`, controlPromptText);
      const treatmentPrompt = await writeArtifact(root, `artifacts/prompts/${pairId}-treatment.txt`, treatmentPromptText);
      const controlDeliveredPrompt = await writeArtifact(root, `artifacts/delivery/${pairId}-control.txt`, controlPromptText);
      const treatmentDeliveredPrompt = await writeArtifact(root, `artifacts/delivery/${pairId}-treatment.txt`, treatmentPromptText);
      const controlSubmission = await writeArtifact(root, `artifacts/submissions/${pairId}-control.tsx`, source);
      const treatmentSubmission = await writeArtifact(root, `artifacts/submissions/${pairId}-treatment.tsx`, source);
      const fixturePath = task.allowedSubmissionPaths[0];
      const base = {
        pairId,
        taskId: task.id,
        promptRevision: "reuse-v1.0",
        agent: {
          label: "synthetic-agent",
          version: "fixture-1",
          configurationHash: sha256("synthetic-agent fixture-1"),
        },
        fixture: task.fixture,
        review: {
          status: "reviewed",
          reviewerLabel: "synthetic-reviewer",
          duplicateComponentCount: 0,
          rawTailwindClassCount: 0,
          correctionTurns: 0,
        },
      };
      const control = {
        ...base,
        agent: { ...base.agent },
        fixture: { ...base.fixture },
        id: `${pairId}-control`,
        condition: "control",
        order: treatmentFirst ? 2 : 1,
        prompt: controlPrompt,
        deliveredPrompt: controlDeliveredPrompt,
        submission: {
          files: [{ ...controlSubmission, fixturePath }],
          test: { status: "passed", command: "synthetic static check" },
        },
        review: { ...base.review, annotations: [] },
      };
      const treatment = {
        ...base,
        agent: { ...base.agent },
        fixture: { ...base.fixture },
        id: `${pairId}-treatment`,
        condition: "treatment",
        order: treatmentFirst ? 1 : 2,
        prompt: treatmentPrompt,
        deliveredPrompt: treatmentDeliveredPrompt,
        treatmentContext: context,
        submission: {
          files: [{ ...treatmentSubmission, fixturePath }],
          test: { status: "passed", command: "synthetic static check" },
        },
        review: {
          ...base.review,
          annotations: task.expectedCanonicalComponents.map((component, index) => ({
            componentId: component.componentId,
            submissionPath: fixturePath,
            classification: "appropriate",
            location: `${fixturePath}:${index + 1}`,
            reason: "Synthetic verifier annotation.",
          })),
        },
      };
      runs.push(control, treatment);
    }
  }
  return { schemaVersion: 1, protocol: "reuse-v1", kind, runs };
}
