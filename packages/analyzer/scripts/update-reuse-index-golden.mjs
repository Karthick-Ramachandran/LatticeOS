import { writeFile } from "node:fs/promises";

import { stableStringify } from "@latticeos/core";

import { analyzeProject, RepositoryRoot } from "../dist/index.js";

const fixtureUrl = new URL("../../../fixtures/next-workspace/", import.meta.url);
const outputUrl = new URL("../../../fixtures/goldens/reuse-index.next-workspace.golden.json", import.meta.url);
const result = await analyzeProject(await RepositoryRoot.open(fixtureUrl.pathname), { generatorVersion: "0.0.0-test" });

await writeFile(outputUrl, stableStringify(result), "utf8");
process.stdout.write("Updated fixtures/goldens/reuse-index.next-workspace.golden.json.\n");
