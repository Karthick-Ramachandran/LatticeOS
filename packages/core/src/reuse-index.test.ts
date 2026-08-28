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

test("validation rejects unsupported prop defaults and imports that resolve nowhere", () => {
  const index = createTestReuseIndex();
  const invalid = {
    ...index,
    components: index.components.map((component, position) =>
      position === 0
        ? { ...component, props: component.props.map((prop) => ({ ...prop, defaulted: "yes" })) }
        : component,
    ),
    imports: [
      {
        id: "import.missing",
        importerPath: "src/example.tsx",
        source: "./missing",
        importedName: "Missing",
        localName: "Missing",
        typeOnly: false,
        resolvedComponentId: "react:root:src/missing.tsx#Missing",
        location: { path: "src/example.tsx", line: 1, column: 1 },
        evidenceIds: ["e.component.settings"],
      },
    ],
  };
  const result = validateReuseIndex(invalid);

  assert.equal(result.ok, false);
  if (!result.ok) {
    const defaultedIssue = result.issues.find((issue) => issue.path.endsWith(".defaulted"));
    assert.equal(defaultedIssue?.message, "must be a boolean");
    assert.ok(result.issues.some((issue) => issue.message.includes("known component")));
  }
});

test("validation keeps class-bundle source literals aligned with their locations", () => {
  const index = createTestReuseIndex();
  const evidence = {
    id: "e.class.bundle",
    kind: "class-bundle" as const,
    location: { path: "src/card.tsx", line: 3, column: 1 },
    method: "static-source" as const,
    classification: "exact" as const,
    fingerprint: "sha256:class-bundle",
    limitations: [],
  };
  const invalid = {
    ...index,
    tailwind: {
      tokens: [],
      repeatedClassBundles: [
        {
          classes: ["border", "rounded-lg"],
          originals: ["rounded-lg border"],
          count: 2,
          locations: [
            { path: "src/card.tsx", line: 3, column: 1 },
            { path: "src/card.tsx", line: 4, column: 1 },
          ],
          evidenceIds: ["e.class.bundle"],
        },
      ],
    },
    evidence: [...index.evidence, evidence],
  };
  const result = validateReuseIndex(invalid);

  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.issues.some((issue) => issue.path.endsWith(".originals")));
});

test("serialization keeps each original class literal with its sorted location", () => {
  const index = createTestReuseIndex();
  const evidence = {
    id: "e.class.bundle",
    kind: "class-bundle" as const,
    location: { path: "src/b.tsx", line: 3, column: 1 },
    method: "static-source" as const,
    classification: "exact" as const,
    fingerprint: "sha256:class-bundle",
    limitations: [],
  };
  const serialized = serializeReuseIndex({
    ...index,
    tailwind: {
      tokens: [],
      repeatedClassBundles: [
        {
          classes: ["rounded-lg", "border"],
          originals: ["rounded-lg border", "border rounded-lg"],
          count: 2,
          locations: [
            { path: "src/b.tsx", line: 3, column: 1 },
            { path: "src/a.tsx", line: 2, column: 1 },
          ],
          evidenceIds: ["e.class.bundle"],
        },
      ],
    },
    evidence: [...index.evidence, evidence],
  });
  const bundle = JSON.parse(serialized).tailwind.repeatedClassBundles[0];

  assert.deepEqual(bundle.classes, ["border", "rounded-lg"]);
  assert.deepEqual(bundle.locations.map((item: { path: string }) => item.path), ["src/a.tsx", "src/b.tsx"]);
  assert.deepEqual(bundle.originals, ["border rounded-lg", "rounded-lg border"]);
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
