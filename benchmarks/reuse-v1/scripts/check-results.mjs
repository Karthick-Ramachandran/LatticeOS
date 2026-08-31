import { lstat } from "node:fs/promises";
import { resolve } from "node:path";

import { BENCHMARK_SCHEMA_VERSION } from "../src/contract.mjs";
import { validateResultFile } from "../src/validate.mjs";

const benchmarkRoot = resolve(import.meta.dirname, "..");
const resultPath = resolve(benchmarkRoot, "results/results.json");
const tasksDirectory = resolve(benchmarkRoot, "tasks");

let result;
try {
  await lstat(resultPath);
  result = await validateResultFile({ tasksDirectory, resultPath });
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
  result = {
    errors: [],
    summary: {
      schemaVersion: BENCHMARK_SCHEMA_VERSION,
      benchmark: "reuse-v1",
      resultKind: "none",
      taskResults: [],
      totals: { control: { appropriate: 0, inappropriate: 0 }, treatment: { appropriate: 0, inappropriate: 0 } },
      gate: { status: "insufficient", reasons: ["No result set is recorded."] },
    },
  };
}

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.summary.gate.status !== "pass" || result.errors.length > 0) process.exitCode = 1;
