import { validateRepository } from "./content-contract.mjs";

const errors = await validateRepository();

if (errors.length > 0) {
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log("Documentation content contract passed.");
}
