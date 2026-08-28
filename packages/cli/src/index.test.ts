import assert from "node:assert/strict";
import { cp, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { LATTICE_CLI_SCHEMA_VERSION } from "@latticeos/core";
import { RepositoryRoot, readReuseIndex } from "@latticeos/analyzer";

import { CLI_VERSION, runCli, type CliIo } from "./index.js";

const fixtureRoot = resolve(import.meta.dirname, "../../../fixtures/next-workspace");

async function copiedFixture(): Promise<string> {
  const parent = await mkdtemp(join(tmpdir(), "lattice-cli-"));
  const target = join(parent, "consumer");
  await cp(fixtureRoot, target, { recursive: true });
  return target;
}

function capturedIo(cwd: string): { readonly io: CliIo; readonly stdout: string[]; readonly stderr: string[] } {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    io: { cwd, writeStdout: (value) => stdout.push(value), writeStderr: (value) => stderr.push(value) },
    stdout,
    stderr,
  };
}

test("search emits deterministic JSON evidence and refreshes only the generated cache", async () => {
  const root = await copiedFixture();
  const sourceBefore = await readFile(join(root, "packages/ui/src/button.tsx"), "utf8");
  const capture = capturedIo(root);
  const result = await runCli(["--root", root, "--json", "search", "button"], capture.io);

  assert.equal(result.exitCode, 0);
  assert.deepEqual(capture.stderr, []);
  const output: unknown = JSON.parse(capture.stdout.join(""));
  assert.equal((output as { schemaVersion: unknown }).schemaVersion, LATTICE_CLI_SCHEMA_VERSION);
  assert.equal((output as { command: unknown }).command, "search");
  assert.ok(((output as { result: readonly unknown[] }).result).length > 0);
  assert.equal(await readFile(join(root, "packages/ui/src/button.tsx"), "utf8"), sourceBefore);
  const cache = await readReuseIndex(await RepositoryRoot.open(root));
  assert.equal(cache.status, "hit");
});

test("inspect and context expose source-backed results in human and JSON forms", async () => {
  const root = await copiedFixture();
  const inspectCapture = capturedIo(root);
  const inspectResult = await runCli(["inspect", "SettingsSection"], inspectCapture.io);
  assert.equal(inspectResult.exitCode, 0);
  assert.match(inspectCapture.stdout.join(""), /Evidence:/u);
  assert.match(inspectCapture.stdout.join(""), /packages\/ui\/src\/settings-section\.tsx/u);

  const contextCapture = capturedIo(root);
  const contextResult = await runCli(["--json", "context", "settings section"], contextCapture.io);
  assert.equal(contextResult.exitCode, 0);
  const output = JSON.parse(contextCapture.stdout.join("")) as { readonly command: string; readonly result: { readonly schemaVersion: number } };
  assert.equal(output.command, "context");
  assert.equal(output.result.schemaVersion, 1);
});

test("help, version, and command errors use predictable streams and exit codes", async () => {
  const capture = capturedIo(process.cwd());
  assert.equal((await runCli(["--help"], capture.io)).exitCode, 0);
  assert.match(capture.stdout.join(""), /lattice search/u);

  const versionCapture = capturedIo(process.cwd());
  assert.equal((await runCli(["--version"], versionCapture.io)).exitCode, 0);
  assert.equal(versionCapture.stdout.join(""), `${CLI_VERSION}\n`);

  const errorCapture = capturedIo(process.cwd());
  assert.equal((await runCli(["search"], errorCapture.io)).exitCode, 2);
  assert.match(errorCapture.stderr.join(""), /requires a query/u);
});
