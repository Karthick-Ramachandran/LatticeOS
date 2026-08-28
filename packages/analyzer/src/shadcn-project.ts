import {
  analyzeShadcn,
  type ShadcnAnalysis,
  type ShadcnConfigInput,
} from "@latticeos/adapter-shadcn";
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
import type { ProjectDiscovery } from "./project-discovery.js";
import type { ReactProjectAnalysis } from "./react-project.js";

export const DEFAULT_MAX_SHADCN_CONFIG_FILES = 20;
export const DEFAULT_MAX_SHADCN_CONFIG_BYTES = 1_024 * 1_024;
export const DEFAULT_MAX_SHADCN_DIAGNOSTICS = 100;
export const HARD_MAX_SHADCN_CONFIG_FILES = 100;
export const HARD_MAX_SHADCN_CONFIG_BYTES = 16 * 1_024 * 1_024;
export const HARD_MAX_SHADCN_DIAGNOSTICS = 1_000;

export interface AnalyzeShadcnProjectOptions extends ListFileOptions {
  readonly maxShadcnConfigFiles?: number;
  readonly maxShadcnConfigBytes?: number;
  readonly maxShadcnConfigFileBytes?: number;
  readonly maxShadcnDiagnostics?: number;
}

export interface ShadcnProjectAnalysis {
  readonly discovery: ProjectDiscovery;
  readonly configPaths: readonly RepositoryPath[];
  readonly analysis: ShadcnAnalysis;
  readonly truncated: boolean;
}

interface ShadcnBridgeLimits {
  readonly maxConfigFiles: number;
  readonly maxConfigBytes: number;
  readonly maxConfigFileBytes: number;
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

function resolveLimits(options: AnalyzeShadcnProjectOptions): ShadcnBridgeLimits {
  const values = {
    maxConfigFiles: [options.maxShadcnConfigFiles ?? DEFAULT_MAX_SHADCN_CONFIG_FILES, HARD_MAX_SHADCN_CONFIG_FILES],
    maxConfigBytes: [options.maxShadcnConfigBytes ?? DEFAULT_MAX_SHADCN_CONFIG_BYTES, HARD_MAX_SHADCN_CONFIG_BYTES],
    maxConfigFileBytes: [options.maxShadcnConfigFileBytes ?? DEFAULT_MAX_FILE_BYTES, HARD_MAX_FILE_BYTES],
    maxDiagnostics: [options.maxShadcnDiagnostics ?? DEFAULT_MAX_SHADCN_DIAGNOSTICS, HARD_MAX_SHADCN_DIAGNOSTICS],
  } as const;
  for (const [name, [value, hardMaximum]] of Object.entries(values)) {
    if (!Number.isInteger(value) || value < 1 || value > hardMaximum) {
      throw new Error(`${name} must be an integer between 1 and ${hardMaximum}`);
    }
  }
  return {
    maxConfigFiles: values.maxConfigFiles[0],
    maxConfigBytes: values.maxConfigBytes[0],
    maxConfigFileBytes: values.maxConfigFileBytes[0],
    maxDiagnostics: values.maxDiagnostics[0],
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
      "SHADCN_PROJECT_DIAGNOSTIC_LIMIT",
      "warning",
      `shadcn project diagnostics were limited to ${maxDiagnostics} records.`,
      ["Additional project and adapter diagnostics were omitted."],
    ),
  ];
}

export async function analyzeShadcnProjectFromDiscovery(
  root: RepositoryRoot,
  discovery: ProjectDiscovery,
  react: ReactProjectAnalysis,
  options: AnalyzeShadcnProjectOptions = {},
): Promise<ShadcnProjectAnalysis> {
  const limits = resolveLimits(options);
  if (discovery.project.tools.shadcn.status === "absent") {
    return {
      discovery,
      configPaths: [],
      analysis: { components: react.analysis.components, evidence: [], diagnostics: [] },
      truncated: discovery.truncated,
    };
  }

  const diagnostics: AnalysisDiagnostic[] = [];
  const addDiagnostic = (item: AnalysisDiagnostic): void => {
    if (diagnostics.length < limits.maxDiagnostics) diagnostics.push(item);
  };
  const candidates = discovery.files.filter((path) => path === "components.json" || path.endsWith("/components.json")).sort(compareStrings);
  const configs: ShadcnConfigInput[] = [];
  let configBytes = 0;
  let truncated = discovery.truncated;
  for (const path of candidates) {
    if (configs.length >= limits.maxConfigFiles) {
      addDiagnostic(
        createDiagnostic(
          "SHADCN_CONFIG_FILE_LIMIT",
          "warning",
          `shadcn configuration selection stopped after ${limits.maxConfigFiles} files.`,
          ["Configured shadcn component evidence may be incomplete."],
        ),
      );
      truncated = true;
      break;
    }
    let content: string;
    try {
      content = await root.readText(path, limits.maxConfigFileBytes);
    } catch {
      addDiagnostic(
        createDiagnostic(
          "SHADCN_CONFIG_UNREADABLE",
          "warning",
          `Skipped unreadable shadcn configuration: ${path}`,
          ["Configured shadcn component evidence from this file is unavailable."],
          path,
        ),
      );
      truncated = true;
      continue;
    }
    const bytes = Buffer.byteLength(content, "utf8");
    if (configBytes + bytes > limits.maxConfigBytes) {
      addDiagnostic(
        createDiagnostic(
          "SHADCN_CONFIG_BYTES_LIMIT",
          "warning",
          `shadcn configuration selection reached the ${limits.maxConfigBytes}-byte aggregate limit.`,
          ["Configured shadcn component evidence from later files is unavailable."],
          path,
        ),
      );
      truncated = true;
      break;
    }
    configBytes += bytes;
    configs.push({ path, content });
  }
  const analysis = analyzeShadcn({
    configs,
    components: react.analysis.components,
    compiler: react.compiler,
    maxDiagnostics: limits.maxDiagnostics,
  });
  return {
    discovery,
    configPaths: configs.map((config) => config.path),
    analysis: { ...analysis, diagnostics: sortDiagnostics([...diagnostics, ...analysis.diagnostics], limits.maxDiagnostics) },
    truncated,
  };
}
