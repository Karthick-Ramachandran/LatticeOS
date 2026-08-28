import assert from "node:assert/strict";
import test from "node:test";

import { createComponentId, isComponentId, normalizeRepositoryPath, parseComponentId } from "./component-id.js";

test("component identity round trips in the accepted canonical form", () => {
  const id = createComponentId({
    packageKey: "@acme/ui",
    sourcePath: "packages\\ui\\src\\button.tsx",
    exportKey: "Button",
  });

  assert.equal(id, "react:@acme/ui:packages/ui/src/button.tsx#Button");
  assert.deepEqual(parseComponentId(id), {
    packageKey: "@acme/ui",
    sourcePath: "packages/ui/src/button.tsx",
    exportKey: "Button",
  });
  assert.equal(isComponentId(id), true);
});

test("component identity supports local export keys without making paths host-specific", () => {
  const id = createComponentId({ packageKey: "root", sourcePath: "src/card.tsx", exportKey: "local:CardBody" });
  assert.equal(id, "react:root:src/card.tsx#local:CardBody");
  assert.equal(parseComponentId(id)?.exportKey, "local:CardBody");
});

test("repository paths reject traversal and absolute inputs", () => {
  for (const path of ["../secret.ts", "/tmp/source.ts", "C:\\source.ts", "src//button.tsx", "src/"]) {
    assert.throws(() => normalizeRepositoryPath(path));
  }
  assert.equal(normalizeRepositoryPath("./src/button.tsx"), "src/button.tsx");
  assert.equal(normalizeRepositoryPath(".", true), ".");
});

test("component IDs reject ambiguous separators and non-canonical paths", () => {
  assert.throws(() => createComponentId({ packageKey: "bad:key", sourcePath: "src/x.tsx", exportKey: "X" }));
  assert.throws(() => createComponentId({ packageKey: "root", sourcePath: "../x.tsx", exportKey: "X" }));
  assert.equal(isComponentId("react:root:./src/x.tsx#X"), false);
  assert.equal(isComponentId("button"), false);
});
