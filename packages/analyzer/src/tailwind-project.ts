import {
  analyzeTailwind,
  type TailwindAnalysis,
  type TailwindSourceInput,
} from "@latticeos/adapter-tailwind";
import {
  compareStrings,
  type AnalysisDiagnostic,
  type RepositoryPath,
} from "@latticeos/core";

import {
  DEFAULT_MAX_FILE_BYTES,
  HARD_MAX_FILE_BYTES,
  RepositoryRoot,
  type ListFileOptions,
} from "./repository-root.js";
import { detectProject, type ProjectDiscovery } from "./project-discovery.js";

export const DEFAULT_MAX_TAILWIND_SOURCE_FILES = 5_000;
export const DEFAULT_MAX_TAILWIND_SOURCE_BYTES = 20 * 1_024 * 1_024;
export const DEFAULT_MAX_TAILWIND_DIAGNOSTICS = 100;
export const HARD_MAX_TAILWIND_SOURCE_FILES = 20_000;
export const HARD_MAX_TAILWIND_SOURCE_BYTES = 64 * 1_024 * 1_024;
export const HARD_MAX_TAILWIND_DIAGNOSTICS = 1_000;

export interface AnalyzeTailwindProjectOptions extends ListFileOptions {
  readonly maxTailwindSourceFiles?: number;
  readonly maxTailwindSourceBytes?: number;
  readonly maxTailwindSourceFileBytes?: number;
  readonly maxTailwindDiagnostics?: number;
}

export interface TailwindProjectAnalysis {
  readonly discovery: ProjectDiscovery;
  readonly sourcePaths: readonly RepositoryPath[];
  readonly analysis: TailwindAnalysis;
  readonly truncated: boolean;
}

interface TailwindBridgeLimits {
  readonly maxSourceFiles: number;
  readonly maxSourceBytes: number;
  readonly maxSourceFileBytes: number;
  readonly maxDiagnostics: number;
}

function createDiagnostic(
  code: string,
  severity: AnalysisDiagnostic["severity"],
  message: string,
  limitations: readonly string[],
  path?: RepositoryPath,
): AnalysisDiagnostic {
  return {
    code,
    severity,
    message,
    ...(path ? { location: { path, line: 1, column: 1 } } : {}),
    limitations,
  };
}

function resolveLimits(options: AnalyzeTailwindProjectOptions): TailwindBridgeLimits {
  const values = {
    maxSourceFiles: [options.maxTailwindSourceFiles ?? DEFAULT_MAX_TAILWIND_SOURCE_FILES, HARD_MAX_TAILWIND_SOURCE_FILES],
    maxSourceBytes: [options.maxTailwindSourceBytes ?? DEFAULT_MAX_TAILWIND_SOURCE_BYTES, HARD_MAX_TAILWIND_SOURCE_BYTES],
    maxSourceFileBytes: [options.maxTailwindSourceFileBytes ?? DEFAULT_MAX_FILE_BYTES, HARD_MAX_FILE_BYTES],
    maxDiagnostics: [options.maxTailwindDiagnostics ?? DEFAULT_MAX_TAILWIND_DIAGNOSTICS, HARD_MAX_TAILWIND_DIAGNOSTICS],
  } as const;
  for (const [name, [value, hardMaximum]] of Object.entries(values)) {
    if (!Number.isInteger(value) || value < 1 || value > hardMaximum) {
      throw new Error(`${name} must be an integer between 1 and ${hardMaximum}`);
    }
  }
  return {
    maxSourceFiles: values.maxSourceFiles[0],
    maxSourceBytes: values.maxSourceBytes[0],
    maxSourceFileBytes: values.maxSourceFileBytes[0],
    maxDiagnostics: values.maxDiagnostics[0],
  };
}

function sourceKind(path: RepositoryPath): TailwindSourceInput["kind"] | undefined {
  if (/(^|\/)tailwind\.config\.(?:js|cjs|mjs|ts)$/u.test(path)) return "config";
  if (path.endsWith(".css")) return "css";
  if (path === ".storybook" || path.startsWith(".storybook/") || path.includes("/.storybook/")) return undefined;
  if (/(^|\/)(?:next|vite|vitest|tailwind|postcss|eslint|prettier|jest)\.config\.[cm]?[jt]s$/u.test(path)) {
    return undefined;
  }
  return /\.[cm]?[jt]sx?$/u.test(path) ? "source" : undefined;
}

function sortDiagnostics(diagnostics: readonly AnalysisDiagnostic[], maxDiagnostics: number): AnalysisDiagnostic[] {
  const sorted = [...diagnostics].sort(
    (left, right) =>
      compareStrings(left.code, right.code) ||
      compareStrings(left.location?.path ?? "", right.location?.path ?? "") ||
      compareStrings(left.message, right.message),
  );
  if (sorted.length <= maxDiagnostics) return sorted;
  return [
    ...sorted.slice(0, maxDiagnostics - 1),
    createDiagnostic(
      "TAILWIND_PROJECT_DIAGNOSTIC_LIMIT",
      "warning",
      `Tailwind project diagnostics were limited to ${maxDiagnostics} records.`,
      ["Additional project and adapter diagnostics were omitted."],
    ),
  ];
}

export async function analyzeTailwindProjectFromDiscovery(
  root: RepositoryRoot,
  discovery: ProjectDiscovery,
  options: AnalyzeTailwindProjectOptions = {},
): Promise<TailwindProjectAnalysis> {
  const limits = resolveLimits(options);
  const diagnostics: AnalysisDiagnostic[] = [];
  const addDiagnostic = (item: AnalysisDiagnostic): void => {
    if (diagnostics.length < limits.maxDiagnostics) diagnostics.push(item);
  };
  const candidates =
    discovery.project.tools.tailwind.status === "absent"
      ? []
      : discovery.files
          .map((path) => ({ path, kind: sourceKind(path) }))
          .filter((item): item is { readonly path: RepositoryPath; readonly kind: TailwindSourceInput["kind"] } => item.kind !== undefined)
          .sort((left, right) => compareStrings(left.path, right.path));

  const sources: TailwindSourceInput[] = [];
  let sourceBytes = 0;
  let truncated = discovery.truncated;
  for (const candidate of candidates) {
    if (sources.length >= limits.maxSourceFiles) {
      addDiagnostic(
        createDiagnostic(
          "TAILWIND_SOURCE_FILE_LIMIT",
          "warning",
          `Tailwind source selection stopped after ${limits.maxSourceFiles} files.`,
          ["Theme token and repeated-bundle evidence may be incomplete."],
        ),
      );
      truncated = true;
      break;
    }
    let content: string;
    try {
      content = await root.readText(candidate.path, limits.maxSourceFileBytes);
    } catch {
      addDiagnostic(
        createDiagnostic(
          "TAILWIND_SOURCE_UNREADABLE",
          "warning",
          `Skipped unreadable Tailwind source: ${candidate.path}`,
          ["Theme token and repeated-bundle evidence from this source is unavailable."],
          candidate.path,
        ),
      );
      truncated = true;
      continue;
    }
    const bytes = Buffer.byteLength(content, "utf8");
    if (sourceBytes + bytes > limits.maxSourceBytes) {
      addDiagnostic(
        createDiagnostic(
          "TAILWIND_SOURCE_BYTES_LIMIT",
          "warning",
          `Tailwind source selection reached the ${limits.maxSourceBytes}-byte aggregate limit.`,
          ["Theme token and repeated-bundle evidence from later sources is unavailable."],
          candidate.path,
        ),
      );
      truncated = true;
      break;
    }
    sourceBytes += bytes;
    sources.push({ path: candidate.path, kind: candidate.kind, content });
  }

  const analysis = analyzeTailwind({
    sources,
    maxDiagnostics: limits.maxDiagnostics,
  });
  return {
    discovery,
    sourcePaths: sources.map((source) => source.path),
    analysis: { ...analysis, diagnostics: sortDiagnostics([...diagnostics, ...analysis.diagnostics], limits.maxDiagnostics) },
    truncated,
  };
}

export async function analyzeTailwindProject(
  root: RepositoryRoot,
  options: AnalyzeTailwindProjectOptions = {},
): Promise<TailwindProjectAnalysis> {
  return analyzeTailwindProjectFromDiscovery(root, await detectProject(root, options), options);
}
