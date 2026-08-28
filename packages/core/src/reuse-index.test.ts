import assert from "node:assert/strict";
import test from "node:test";

import { serializeReuseIndex, sortReuseIndex } from "./reuse-index.js";
import { createTestReuseIndex } from "./testing.js";
import { validateReuseIndex } from "./validation.js";

test("a complete schema version 1 index validates", () => {
  const result = validateReuseIndex(createTestReuseIndex());
  assert.equal(result.ok, true);
});

test("validation rejects an evidence reference that cannot be inspected", () => {
  const index = createTestReuseIndex();
  const invalid = {
    ...index,
    components: index.components.map((component, position) =>
      position === 0 ? { ...component, evidenceIds: ["e.missing"] } : component,
    ),
  };
  const result = validateReuseIndex(invalid);

  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.issues.map((issue) => issue.message).join("\n"), /unknown evidence/u);
});

test("validation rejects identity fields that disagree with the canonical ID", () => {
  const index = createTestReuseIndex();
  const invalid = {
    ...index,
    components: index.components.map((component, position) =>
      position === 0 ? { ...component, sourcePath: "src/moved.tsx" } : component,
    ),
  };
  const result = validateReuseIndex(invalid);

  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.issues.map((issue) => issue.message).join("\n"), /identity fields/u);
});

test("validation rejects component links that cannot be resolved", () => {
  const index = createTestReuseIndex();
  const invalid = {
    ...index,
    components: index.components.map((component, position) =>
      position === 0 ? { ...component, usageIds: ["u.missing"] } : component,
    ),
  };
  const result = validateReuseIndex(invalid);

  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.issues.map((issue) => issue.message).join("\n"), /unknown usage/u);
});

test("serialization is byte-stable regardless of collection insertion order", () => {
  const index = createTestReuseIndex();
  const reordered = {
    ...index,
    packages: [...index.packages].reverse(),
    components: [...index.components].reverse(),
    evidence: [...index.evidence].reverse(),
  };

  assert.equal(serializeReuseIndex(index), serializeReuseIndex(reordered));
  assert.equal(serializeReuseIndex(index), serializeReuseIndex(sortReuseIndex(index)));
  assert.match(serializeReuseIndex(index), /^\{\n  "components":/u);
});

test("serialized data contains repository-relative paths and no absolute fixture root", () => {
  const serialized = serializeReuseIndex(createTestReuseIndex());
  assert.doesNotMatch(serialized, /\/Users\/|[A-Za-z]:\\/u);
  assert.match(serialized, /src\/settings-section\.tsx/u);
});
