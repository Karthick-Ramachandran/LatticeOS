import { createNpmCliTarball } from "./npm-package.mjs";

try {
  const release = await createNpmCliTarball();
  process.stdout.write(`Prepared local @latticeos/cli pre-release tarball:\n${release.tarballPath}\n`);
  process.stdout.write("This artifact is not published. Copy it before your operating system cleans temporary files.\n");
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : "npm CLI package failed."}\n`);
  process.exitCode = 1;
}
