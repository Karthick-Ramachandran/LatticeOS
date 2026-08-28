import assert from "node:assert/strict";
import test from "node:test";

import {
  promptSections,
  validateAgentPrompt,
  validateRepository,
} from "../scripts/content-contract.mjs";

function promptDocument(sections = promptSections) {
  return `## Agent implementation prompt\n\n\`\`\`text title="Agent implementation prompt"\n${sections.join("\nvalue\n")}\n\`\`\``;
}

test("accepts a complete copy-ready Agent prompt", () => {
  assert.deepEqual(validateAgentPrompt(promptDocument()), []);
});

test("reports a missing Agent prompt section", () => {
  const sections = promptSections.filter((section) => section !== "Stop conditions:");
  assert.deepEqual(validateAgentPrompt(promptDocument(sections)), [
    "document: Agent prompt is missing 'Stop conditions:'",
  ]);
});

test("the repository documentation satisfies the content contract", async () => {
  assert.deepEqual(await validateRepository(), []);
});
