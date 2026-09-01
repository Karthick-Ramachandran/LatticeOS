import { mkdir, writeFile } from "node:fs/promises";

import { stableStringify } from "@latticeos/core";

import { detectProject, RepositoryRoot } from "../dist/index.js";

const fixtureUrl = new URL("../../../fixtures/next-workspace/", import.meta.url);
const outputUrl = new URL("../../../fixtures/goldens/project-discovery.next-workspace.golden.json", import.meta.url);
const root = await RepositoryRoot.open(fixtureUrl.pathname);
const discovery = await detectProject(root);

await mkdir(new URL("../../../fixtures/goldens/", import.meta.url), { recursive: true });
await writeFile(outputUrl, stableStringify(discovery), "utf8");
process.stdout.write("Updated fixtures/goldens/project-discovery.next-workspace.golden.json.\n");
