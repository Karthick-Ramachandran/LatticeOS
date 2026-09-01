import { writeFile } from "node:fs/promises";

import { stableStringify } from "@latticeos/core";

import { analyzeReactProject, RepositoryRoot } from "../dist/index.js";

const fixtureUrl = new URL("../../../fixtures/next-workspace/", import.meta.url);
const outputUrl = new URL("../../../fixtures/goldens/react-project.next-workspace.golden.json", import.meta.url);
const result = await analyzeReactProject(await RepositoryRoot.open(fixtureUrl.pathname));

await writeFile(outputUrl, stableStringify(result), "utf8");
process.stdout.write("Updated fixtures/goldens/react-project.next-workspace.golden.json.\n");
