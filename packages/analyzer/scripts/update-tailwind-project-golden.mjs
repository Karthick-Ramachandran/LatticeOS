import { writeFile } from "node:fs/promises";

import { stableStringify } from "@latticeos/core";

import { analyzeTailwindProject, RepositoryRoot } from "../dist/index.js";

const fixtureUrl = new URL("../../../fixtures/next-workspace/", import.meta.url);
const outputUrl = new URL("../../../fixtures/goldens/tailwind-project.next-workspace.golden.json", import.meta.url);
const result = await analyzeTailwindProject(await RepositoryRoot.open(fixtureUrl.pathname));

await writeFile(outputUrl, stableStringify(result), "utf8");
process.stdout.write("Updated fixtures/goldens/tailwind-project.next-workspace.golden.json.\n");
