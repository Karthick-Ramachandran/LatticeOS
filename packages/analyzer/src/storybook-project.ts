import {
  analyzeStorybook,
  type StorybookAnalysis,
} from "@latticeos/adapter-storybook";
import {
  compareStrings,
  type AnalysisDiagnostic,
  type RepositoryPath,
  type UiComponent,
} from "@latticeos/core";

import {
  AnalyzerError,
  RepositoryRoot,
  STORYBOOK_COMPONENTS_MANIFEST_PATH,
  type ListFileOptions,
} from "./repository-root.js";
import type { ProjectDiscovery } from "./project-discovery.js";
import type { ReactProjectAnalysis } from "./react-project.js";

export const DEFAULT_MAX_STORYBOOK_MANIFEST_BYTES = 1_024 * 1_024;
export const DEFAULT_MAX_STORYBOOK_DIAGNOSTICS = 100;
export const HARD_MAX_STORYBOOK_MANIFEST_BYTES = 16 * 1_024 * 1_024;
export const HARD_MAX_STORYBOOK_DIAGNOSTICS = 1_000;

export interface AnalyzeStorybookProjectOptions extends ListFileOptions {
  readonly maxStorybookManifestBytes?: number;
  readonly maxStorybookDiagnostics?: number;
}

export interface StorybookProjectAnalysis {
  readonly discovery: ProjectDiscovery;
  readonly manifestPaths: readonly RepositoryPath[];
  readonly analysis: StorybookAnalysis;
  readonly truncated: boolean;
}

interface StorybookBridgeLimits {
  readonly maxManifestBytes: number;
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

function resolveLimits(options: AnalyzeStorybookProjectOptions): StorybookBridgeLimits {
  const values = {
    maxManifestBytes: [options.maxStorybookManifestBytes ?? DEFAULT_MAX_STORYBOOK_MANIFEST_BYTES, HARD_MAX_STORYBOOK_MANIFEST_BYTES],
    maxDiagnostics: [options.maxStorybookDiagnostics ?? DEFAULT_MAX_STORYBOOK_DIAGNOSTICS, HARD_MAX_STORYBOOK_DIAGNOSTICS],
  } as const;
  for (const [name, [value, hardMaximum]] of Object.entries(values)) {
    if (!Number.isInteger(value) || value < 1 || value > hardMaximum) {
      throw new Error(`${name} must be an integer between 1 and ${hardMaximum}`);
    }
  }
  return { maxManifestBytes: values.maxManifestBytes[0], maxDiagnostics: values.maxDiagnostics[0] };
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
      "STORYBOOK_PROJECT_DIAGNOSTIC_LIMIT",
      "warning",
      `Storybook project diagnostics were limited to ${maxDiagnostics} records.`,
      ["Additional bridge and adapter diagnostics were omitted."],
    ),
  ];
}

function unchanged(discovery: ProjectDiscovery, components: readonly UiComponent[]): StorybookProjectAnalysis {
  return {
    discovery,
    manifestPaths: [],
    analysis: { components, evidence: [], diagnostics: [] },
    truncated: discovery.truncated,
  };
}

export async function analyzeStorybookProjectFromDiscovery(
  root: RepositoryRoot,
  discovery: ProjectDiscovery,
  react: ReactProjectAnalysis,
  components: readonly UiComponent[],
  options: AnalyzeStorybookProjectOptions = {},
): Promise<StorybookProjectAnalysis> {
  const limits = resolveLimits(options);
  if (discovery.project.tools.storybook.status === "absent") return unchanged(discovery, components);

  let content: string;
  try {
    content = await root.readStorybookComponentsManifest(limits.maxManifestBytes);
  } catch (error) {
    if (error instanceof AnalyzerError && error.code === "PATH_NOT_FOUND") return unchanged(discovery, components);
    const code = error instanceof AnalyzerError && error.code === "FILE_TOO_LARGE"
      ? "STORYBOOK_MANIFEST_BYTES_LIMIT"
      : "STORYBOOK_MANIFEST_UNREADABLE";
    return {
      discovery,
      manifestPaths: [],
      analysis: {
        components,
        evidence: [],
        diagnostics: [createDiagnostic(
          code,
          "warning",
          code === "STORYBOOK_MANIFEST_BYTES_LIMIT"
            ? `Storybook components manifest exceeds the ${limits.maxManifestBytes}-byte read limit.`
            : "Could not read the fixed Storybook components manifest safely.",
          ["Storybook example evidence is unavailable."],
          STORYBOOK_COMPONENTS_MANIFEST_PATH,
        )],
      },
      truncated: true,
    };
  }
  const analysis = analyzeStorybook({
    manifests: [{ path: STORYBOOK_COMPONENTS_MANIFEST_PATH, content }],
    components,
    imports: react.analysis.imports,
    maxDiagnostics: limits.maxDiagnostics,
  });
  return {
    discovery,
    manifestPaths: [STORYBOOK_COMPONENTS_MANIFEST_PATH],
    analysis: { ...analysis, diagnostics: sortDiagnostics(analysis.diagnostics, limits.maxDiagnostics) },
    truncated: discovery.truncated,
  };
}
