import { readFile, readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const promptSections = [
  "Read first:",
  "Outcome:",
  "Scope:",
  "Ordered work:",
  "Acceptance:",
  "Tests:",
  "Documentation:",
  "Stop conditions:",
  "Completion evidence:",
];

export const defaultRepoRoot = fileURLToPath(new URL("../../..", import.meta.url));

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

export function validateAgentPrompt(content, fileLabel = "document") {
  const errors = [];
  const heading = "## Agent implementation prompt";

  if (count(content, heading) !== 1) {
    errors.push(`${fileLabel}: expected exactly one '${heading}' heading`);
    return errors;
  }

  const promptMatch = content.match(
    /## Agent implementation prompt[\s\S]*?```text title="Agent implementation prompt"\n([\s\S]*?)\n```/,
  );

  if (!promptMatch) {
    errors.push(`${fileLabel}: Agent prompt must be one copy-enabled text code block`);
    return errors;
  }

  for (const section of promptSections) {
    if (!promptMatch[1].includes(section)) {
      errors.push(`${fileLabel}: Agent prompt is missing '${section}'`);
    }
  }

  return errors;
}

function stripLiteralBlocks(content) {
  return content.replace(/^---[\s\S]*?---\s*/u, "").replace(/```[\s\S]*?```/gu, "");
}

function validateHumanizedProse(content, fileLabel) {
  const prose = stripLiteralBlocks(content);
  const errors = [];

  if (/[—–]/u.test(prose)) {
    errors.push(`${fileLabel}: explanatory prose contains an em or en dash`);
  }
  if (/[“”]/u.test(prose)) {
    errors.push(`${fileLabel}: explanatory prose contains curly quotation marks`);
  }

  return errors;
}

async function walkFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walkFiles(path)));
    if (entry.isFile()) files.push(path);
  }

  return files;
}

function pageUrl(docsRoot, path) {
  const portable = relative(docsRoot, path).split(sep).join("/").replace(/\.mdx?$/u, "");
  if (portable === "index") return "/docs";
  if (portable.endsWith("/index")) return `/docs/${portable.slice(0, -6)}`;
  return `/docs/${portable}`;
}

function validateInternalLinks(content, fileLabel, knownUrls) {
  const errors = [];
  const links = content.matchAll(/\]\((\/docs(?:\/[^)#?]*)?)(?:#[^)]+)?\)/gu);

  for (const match of links) {
    const url = match[1].replace(/\/$/u, "") || "/docs";
    if (!knownUrls.has(url)) errors.push(`${fileLabel}: unresolved internal link '${match[1]}'`);
  }

  return errors;
}

export async function validateRepository(repoRoot = defaultRepoRoot) {
  const errors = [];
  const featuresRoot = join(repoRoot, "docs/40-features");
  const docsRoot = join(repoRoot, "apps/docs/content/docs");
  const mapPath = join(repoRoot, "apps/docs/content/feature-map.json");
  const featureMap = JSON.parse(await readFile(mapPath, "utf8"));
  const featureEntries = await readdir(featuresRoot, { withFileTypes: true });
  const featureNames = featureEntries
    .filter((entry) => entry.isDirectory() && /^F-\d+-/u.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  const docsFiles = (await walkFiles(docsRoot)).filter((path) => /\.mdx?$/u.test(path));
  const knownUrls = new Set(docsFiles.map((path) => pageUrl(docsRoot, path)));

  for (const featureName of featureNames) {
    const mapped = featureMap[featureName];
    if (!mapped) {
      errors.push(`${featureName}: missing entry in content/feature-map.json`);
      continue;
    }

    const guidePath = join(docsRoot, mapped);
    let guide;
    try {
      guide = await readFile(guidePath, "utf8");
    } catch {
      errors.push(`${featureName}: mapped guide does not exist at '${mapped}'`);
      continue;
    }

    errors.push(...validateAgentPrompt(guide, mapped));
  }

  for (const path of docsFiles) {
    const label = relative(docsRoot, path).split(sep).join("/");
    const content = await readFile(path, "utf8");
    errors.push(...validateHumanizedProse(content, label));
    errors.push(...validateInternalLinks(content, label, knownUrls));
  }

  const packageJson = JSON.parse(await readFile(join(repoRoot, "apps/docs/package.json"), "utf8"));
  const dependencyNames = Object.keys({
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  });
  const disallowed = dependencyNames.filter(
    (name) => name === "ai" || name.startsWith("@ai-sdk/") || name.includes("analytics"),
  );
  if (disallowed.length > 0) {
    errors.push(`docs package has disallowed runtime integrations: ${disallowed.join(", ")}`);
  }

  return errors;
}
