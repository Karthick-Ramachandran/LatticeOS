import {
  REUSE_INDEX_SCHEMA_VERSION,
  assertReuseIndex,
  sortReuseIndex,
  stableStringify,
  type AnalysisDiagnostic,
  type EvidenceRecord,
  type ReuseIndex,
} from "@latticeos/core";

import { detectProject, type ProjectDiscovery } from "./project-discovery.js";
import {
  analyzeReactProjectFromDiscovery,
  type AnalyzeReactProjectOptions,
  type ReactProjectAnalysis,
} from "./react-project.js";
import { RepositoryRoot } from "./repository-root.js";
import {
  analyzeTailwindProjectFromDiscovery,
  type AnalyzeTailwindProjectOptions,
  type TailwindProjectAnalysis,
} from "./tailwind-project.js";
import {
  analyzeShadcnProjectFromDiscovery,
  type AnalyzeShadcnProjectOptions,
  type ShadcnProjectAnalysis,
} from "./shadcn-project.js";

const DEFAULT_GENERATOR_VERSION = "0.0.0-dev";

export interface AnalyzeProjectOptions extends AnalyzeReactProjectOptions, AnalyzeTailwindProjectOptions, AnalyzeShadcnProjectOptions {
  readonly generatorVersion?: string;
}

export interface BuildReuseIndexInput {
  readonly discovery: ProjectDiscovery;
  readonly react: ReactProjectAnalysis["analysis"];
  readonly tailwind: TailwindProjectAnalysis["analysis"];
  readonly shadcn?: ShadcnProjectAnalysis["analysis"];
  readonly generatorVersion?: string;
}

export interface ProjectAnalysis {
  readonly index: ReuseIndex;
  readonly truncated: boolean;
}

function resolveGeneratorVersion(value: string | undefined): string {
  const version = value ?? DEFAULT_GENERATOR_VERSION;
  if (
    typeof version !== "string" ||
    version.length === 0 ||
    version.length > 128 ||
    version.trim() !== version ||
    /[\u0000-\u001F\u007F]/u.test(version)
  ) {
    throw new Error("generatorVersion must be a trimmed non-empty string of at most 128 characters");
  }
  return version;
}

function mergeEvidence(records: readonly EvidenceRecord[]): EvidenceRecord[] {
  const byId = new Map<string, EvidenceRecord>();
  for (const record of records) {
    const existing = byId.get(record.id);
    if (existing && stableStringify(existing) !== stableStringify(record)) {
      throw new Error("Conflicting evidence records use the same ID");
    }
    byId.set(record.id, record);
  }
  return [...byId.values()];
}

function mergeDiagnostics(
  discovery: readonly AnalysisDiagnostic[],
  react: readonly AnalysisDiagnostic[],
  tailwind: readonly AnalysisDiagnostic[],
  shadcn: readonly AnalysisDiagnostic[],
): AnalysisDiagnostic[] {
  return [...discovery, ...react, ...tailwind, ...shadcn];
}

export function buildReuseIndex(input: BuildReuseIndexInput): ReuseIndex {
  const index = sortReuseIndex({
    schemaVersion: REUSE_INDEX_SCHEMA_VERSION,
    generator: { name: "lattice", version: resolveGeneratorVersion(input.generatorVersion) },
    project: input.discovery.project,
    packages: input.discovery.packages,
    components: input.shadcn?.components ?? input.react.components,
    imports: input.react.imports,
    usages: input.react.usages,
    tailwind: input.tailwind.tailwind,
    evidence: mergeEvidence([
      ...input.discovery.evidence,
      ...input.react.evidence,
      ...input.tailwind.evidence,
      ...(input.shadcn?.evidence ?? []),
    ]),
    diagnostics: mergeDiagnostics(
      input.discovery.diagnostics,
      input.react.diagnostics,
      input.tailwind.diagnostics,
      input.shadcn?.diagnostics ?? [],
    ),
  });
  assertReuseIndex(index);
  return index;
}

export async function analyzeProject(root: RepositoryRoot, options: AnalyzeProjectOptions = {}): Promise<ProjectAnalysis> {
  const discovery = await detectProject(root, options);
  const react = await analyzeReactProjectFromDiscovery(root, discovery, options);
  const tailwind = await analyzeTailwindProjectFromDiscovery(root, discovery, options);
  const shadcn = await analyzeShadcnProjectFromDiscovery(root, discovery, react, options);
  return {
    index: buildReuseIndex({
      discovery,
      react: react.analysis,
      tailwind: tailwind.analysis,
      shadcn: shadcn.analysis,
      ...(options.generatorVersion !== undefined ? { generatorVersion: options.generatorVersion } : {}),
    }),
    truncated: react.truncated || tailwind.truncated || shadcn.truncated,
  };
}
