import { analyzeReact, type ReactAnalysis, type ReactCompilerSettings, type ReactSourceInput } from "@latticeos/adapter-react";
import {
  compareStrings,
  normalizeRepositoryPath,
  type AnalysisDiagnostic,
  type RepositoryPath,
} from "@latticeos/core";
import ts from "typescript";

import {
  DEFAULT_MAX_FILE_BYTES,
  HARD_MAX_FILE_BYTES,
  RepositoryRoot,
  type ListFileOptions,
} from "./repository-root.js";
import { detectProject, type ProjectDiscovery } from "./project-discovery.js";

export const DEFAULT_MAX_REACT_SOURCE_FILES = 5_000;
export const DEFAULT_MAX_REACT_SOURCE_BYTES = 20 * 1_024 * 1_024;
export const DEFAULT_MAX_REACT_DIAGNOSTICS = 100;
export const HARD_MAX_REACT_SOURCE_FILES = 20_000;
export const HARD_MAX_REACT_SOURCE_BYTES = 64 * 1_024 * 1_024;
export const HARD_MAX_REACT_DIAGNOSTICS = 1_000;

export interface AnalyzeReactProjectOptions extends ListFileOptions {
  readonly maxReactSourceFiles?: number;
  readonly maxReactSourceBytes?: number;
  readonly maxReactSourceFileBytes?: number;
  readonly maxReactDiagnostics?: number;
}

export interface ReactProjectAnalysis {
  readonly discovery: ProjectDiscovery;
  readonly compiler: ReactCompilerSettings;
  readonly sourcePaths: readonly RepositoryPath[];
  readonly analysis: ReactAnalysis;
  readonly truncated: boolean;
}

interface ReactBridgeLimits {
  readonly maxSourceFiles: number;
  readonly maxSourceBytes: number;
  readonly maxSourceFileBytes: number;
  readonly maxDiagnostics: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function resolveLimits(options: AnalyzeReactProjectOptions): ReactBridgeLimits {
  const values = {
    maxSourceFiles: [options.maxReactSourceFiles ?? DEFAULT_MAX_REACT_SOURCE_FILES, HARD_MAX_REACT_SOURCE_FILES],
    maxSourceBytes: [options.maxReactSourceBytes ?? DEFAULT_MAX_REACT_SOURCE_BYTES, HARD_MAX_REACT_SOURCE_BYTES],
    maxSourceFileBytes: [options.maxReactSourceFileBytes ?? DEFAULT_MAX_FILE_BYTES, HARD_MAX_FILE_BYTES],
    maxDiagnostics: [options.maxReactDiagnostics ?? DEFAULT_MAX_REACT_DIAGNOSTICS, HARD_MAX_REACT_DIAGNOSTICS],
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

function isReactSourcePath(path: RepositoryPath): boolean {
  if (path === ".storybook" || path.startsWith(".storybook/") || path.includes("/.storybook/")) return false;
  if (/(^|\/)(?:next|vite|vitest|tailwind|postcss|eslint|prettier|jest)\.config\.[cm]?[jt]s$/u.test(path)) {
    return false;
  }
  return /\.[cm]?[jt]sx?$/u.test(path);
}

function packageKeyForPath(path: RepositoryPath, discovery: ProjectDiscovery): string {
  const owner = discovery.packages
    .filter((candidate) => candidate.rootPath === "." || path.startsWith(`${candidate.rootPath}/`))
    .sort(
      (left, right) =>
        right.rootPath.length - left.rootPath.length || compareStrings(left.key, right.key),
    )[0];
  return owner?.key ?? "root";
}

function staticCompilerSettings(
  content: string,
  path: RepositoryPath,
  addDiagnostic: (item: AnalysisDiagnostic) => void,
): ReactCompilerSettings {
  const parsedResult = ts.parseConfigFileTextToJson(path, content);
  const parsed = parsedResult.config;
  if (parsedResult.error || !isRecord(parsed)) {
    addDiagnostic(
      createDiagnostic(
        "TSCONFIG_INVALID",
        "warning",
        `Ignored malformed TypeScript configuration: ${path}`,
        ["React import aliases from this tsconfig are unavailable."],
        path,
      ),
    );
    return {};
  }
  if (typeof parsed.extends === "string") {
    addDiagnostic(
      createDiagnostic(
        "TSCONFIG_EXTENDS_IGNORED",
        "info",
        `Ignored tsconfig extends entry in ${path}.`,
        ["The current bridge uses only direct root compilerOptions and does not load parent configuration."],
        path,
      ),
    );
  }
  const compilerOptions = isRecord(parsed.compilerOptions) ? parsed.compilerOptions : {};
  let baseUrl: ReactCompilerSettings["baseUrl"];
  if (compilerOptions.baseUrl !== undefined) {
    if (
      typeof compilerOptions.baseUrl !== "string" ||
      compilerOptions.baseUrl.length > 512 ||
      compilerOptions.baseUrl.includes("*")
    ) {
      addDiagnostic(
        createDiagnostic(
          "TSCONFIG_BASE_URL_INVALID",
          "warning",
          `Ignored non-string compilerOptions.baseUrl in ${path}.`,
          ["React module resolution uses the repository root instead."],
          path,
        ),
      );
    } else {
      try {
        baseUrl = normalizeRepositoryPath(compilerOptions.baseUrl, true);
      } catch {
        addDiagnostic(
          createDiagnostic(
            "TSCONFIG_BASE_URL_INVALID",
            "warning",
            `Ignored unsafe compilerOptions.baseUrl in ${path}.`,
            ["React module resolution uses the repository root instead."],
            path,
          ),
        );
      }
    }
  }

  const paths: Record<string, readonly string[]> = Object.create(null) as Record<string, readonly string[]>;
  if (compilerOptions.paths !== undefined && !isRecord(compilerOptions.paths)) {
    addDiagnostic(
      createDiagnostic(
        "TSCONFIG_PATHS_INVALID",
        "warning",
        `Ignored non-object compilerOptions.paths in ${path}.`,
        ["React import aliases from this tsconfig are unavailable."],
        path,
      ),
    );
  }
  if (isRecord(compilerOptions.paths)) {
    const entries = Object.entries(compilerOptions.paths).sort(([left], [right]) => compareStrings(left, right));
    if (entries.length > 200) {
      addDiagnostic(
        createDiagnostic(
          "TSCONFIG_PATHS_LIMIT",
          "warning",
          `Ignored compilerOptions.paths entries after the first 200 in ${path}.`,
          ["Additional import aliases are unavailable."],
          path,
        ),
      );
    }
    for (const [alias, rawTargets] of entries.slice(0, 200)) {
      if (
        alias.length === 0 ||
        alias.length > 256 ||
        alias === "__proto__" ||
        alias === "constructor" ||
        alias === "prototype" ||
        /[\u0000-\u001F\u007F]/u.test(alias)
      ) {
        addDiagnostic(
          createDiagnostic(
            "TSCONFIG_PATH_ALIAS_INVALID",
            "warning",
            `Ignored an unsafe compilerOptions.paths alias in ${path}.`,
            ["The alias is unavailable to React module resolution."],
            path,
          ),
        );
        continue;
      }
      if (!Array.isArray(rawTargets)) {
        addDiagnostic(
          createDiagnostic(
            "TSCONFIG_PATH_TARGETS_INVALID",
            "warning",
            `Ignored non-array targets for alias '${alias}' in ${path}.`,
            ["The alias is unavailable to React module resolution."],
            path,
          ),
        );
        continue;
      }
      const targets: string[] = [];
      for (const rawTarget of rawTargets.slice(0, 10)) {
        if (typeof rawTarget !== "string" || rawTarget.length > 512) {
          addDiagnostic(
            createDiagnostic(
              "TSCONFIG_PATH_TARGET_INVALID",
              "warning",
              `Ignored an invalid target for alias '${alias}' in ${path}.`,
              ["The invalid target is unavailable to React module resolution."],
              path,
            ),
          );
          continue;
        }
        try {
          targets.push(normalizeRepositoryPath(rawTarget, true));
        } catch {
          addDiagnostic(
            createDiagnostic(
              "TSCONFIG_PATH_TARGET_INVALID",
              "warning",
              `Ignored an unsafe target for alias '${alias}' in ${path}.`,
              ["The invalid target is unavailable to React module resolution."],
              path,
            ),
          );
        }
      }
      if (rawTargets.length > 10) {
        addDiagnostic(
          createDiagnostic(
            "TSCONFIG_PATH_TARGET_LIMIT",
            "warning",
            `Ignored compilerOptions.paths targets after the first 10 for alias '${alias}' in ${path}.`,
            ["Additional alias targets are unavailable."],
            path,
          ),
        );
      }
      if (targets.length > 0) paths[alias] = targets;
    }
  }
  return {
    ...(baseUrl ? { baseUrl } : {}),
    ...(Object.keys(paths).length > 0 ? { paths: Object.fromEntries(Object.entries(paths)) } : {}),
  };
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
      "REACT_PROJECT_DIAGNOSTIC_LIMIT",
      "warning",
      `React project diagnostics were limited to ${maxDiagnostics} records.`,
      ["Additional project and adapter diagnostics were omitted."],
    ),
  ];
}

export async function analyzeReactProjectFromDiscovery(
  root: RepositoryRoot,
  discovery: ProjectDiscovery,
  options: AnalyzeReactProjectOptions = {},
): Promise<ReactProjectAnalysis> {
  const limits = resolveLimits(options);
  const diagnostics: AnalysisDiagnostic[] = [];
  const addDiagnostic = (item: AnalysisDiagnostic): void => {
    if (diagnostics.length < limits.maxDiagnostics) diagnostics.push(item);
  };

  let compiler: ReactCompilerSettings = {};
  if (discovery.files.includes("tsconfig.json")) {
    try {
      compiler = staticCompilerSettings(await root.readText("tsconfig.json", limits.maxSourceFileBytes), "tsconfig.json", addDiagnostic);
    } catch {
      addDiagnostic(
        createDiagnostic(
          "TSCONFIG_UNREADABLE",
          "warning",
          "Could not read root tsconfig.json.",
          ["React import aliases from this tsconfig are unavailable."],
          "tsconfig.json",
        ),
      );
    }
  }

  const sources: ReactSourceInput[] = [];
  let sourceBytes = 0;
  let truncated = discovery.truncated;
  for (const path of discovery.files.filter(isReactSourcePath).sort(compareStrings)) {
    if (sources.length >= limits.maxSourceFiles) {
      addDiagnostic(
        createDiagnostic(
          "REACT_SOURCE_FILE_LIMIT",
          "warning",
          `React source selection stopped after ${limits.maxSourceFiles} files.`,
          ["Component, import, and usage evidence may be incomplete."],
        ),
      );
      truncated = true;
      break;
    }
    let content: string;
    try {
      content = await root.readText(path, limits.maxSourceFileBytes);
    } catch {
      addDiagnostic(
        createDiagnostic(
          "REACT_SOURCE_UNREADABLE",
          "warning",
          `Skipped unreadable React source: ${path}`,
          ["Component, import, and usage evidence from this source is unavailable."],
          path,
        ),
      );
      truncated = true;
      continue;
    }
    const bytes = Buffer.byteLength(content, "utf8");
    if (sourceBytes + bytes > limits.maxSourceBytes) {
      addDiagnostic(
        createDiagnostic(
          "REACT_SOURCE_BYTES_LIMIT",
          "warning",
          `React source selection reached the ${limits.maxSourceBytes}-byte aggregate limit.`,
          ["Component, import, and usage evidence from later sources is unavailable."],
          path,
        ),
      );
      truncated = true;
      break;
    }
    sourceBytes += bytes;
    sources.push({ path, packageKey: packageKeyForPath(path, discovery), content });
  }

  const analysis = analyzeReact({
    sources,
    compiler,
    maxDiagnostics: limits.maxDiagnostics,
  });
  return {
    discovery,
    compiler,
    sourcePaths: sources.map((source) => source.path),
    analysis: { ...analysis, diagnostics: sortDiagnostics([...diagnostics, ...analysis.diagnostics], limits.maxDiagnostics) },
    truncated,
  };
}

export async function analyzeReactProject(
  root: RepositoryRoot,
  options: AnalyzeReactProjectOptions = {},
): Promise<ReactProjectAnalysis> {
  return analyzeReactProjectFromDiscovery(root, await detectProject(root, options), options);
}
