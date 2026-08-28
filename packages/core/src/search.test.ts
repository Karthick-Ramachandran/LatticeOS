import assert from "node:assert/strict";
import test from "node:test";

import { buildReuseContext } from "./context.js";
import { resolveComponent } from "./resolve.js";
import { rankReuseCandidates } from "./search.js";
import { createTestReuseIndex } from "./testing.js";

test("ranking is lexical, deterministic, public-only, and backed by inspectable evidence", () => {
  const index = createTestReuseIndex();
  const first = rankReuseCandidates(index, "team settings title");
  const second = rankReuseCandidates(index, "team settings title");

  assert.deepEqual(first, second);
  assert.equal(first[0]?.displayName, "SettingsSection");
  assert.equal(first.some((item) => item.displayName === "PrivateShell"), false);
  assert.ok(first[0]?.reasons.some((reason) => reason.code === "prop-token"));
  assert.ok(first[0]?.reasons.some((reason) => reason.code === "usage-path-token"));

  const knownEvidence = new Set(index.evidence.map((item) => item.id));
  for (const recommendation of first) {
    for (const reason of recommendation.reasons) {
      assert.ok(reason.evidenceIds.length > 0);
      assert.ok(reason.evidenceIds.every((id) => knownEvidence.has(id)));
    }
  }
});

test("ranking rejects empty queries and invalid limits", () => {
  const index = createTestReuseIndex();
  assert.throws(() => rankReuseCandidates(index, " --- "), /at least one/u);
  assert.throws(() => rankReuseCandidates(index, "settings", { limit: 0 }), /positive integer/u);
});

test("inspect resolution reports name ambiguity instead of choosing a component", () => {
  const resolution = resolveComponent(createTestReuseIndex(), "Button");
  assert.equal(resolution.status, "ambiguous");
  if (resolution.status === "ambiguous") {
    assert.deepEqual(
      resolution.candidates.map((item) => item.id),
      [...resolution.candidates.map((item) => item.id)].sort(),
    );
  }
});

test("context obeys item and exact rendered-character budgets", () => {
  const index = createTestReuseIndex();
  const oneItem = buildReuseContext(index, "settings", { maxItems: 1, maxCharacters: 10_000 });
  assert.equal(oneItem.items.length, 1);
  assert.equal(oneItem.truncated, true);
  assert.equal(oneItem.characterCount, oneItem.text.length);

  const exact = buildReuseContext(index, "settings", {
    maxItems: 10,
    maxCharacters: oneItem.characterCount,
  });
  assert.equal(exact.items.length, 1);
  assert.ok(exact.characterCount <= oneItem.characterCount);

  const tooSmall = buildReuseContext(index, "settings", { maxItems: 10, maxCharacters: 1 });
  assert.equal(tooSmall.items.length, 0);
  assert.equal(tooSmall.characterCount, 0);
  assert.equal(tooSmall.truncated, true);
});
