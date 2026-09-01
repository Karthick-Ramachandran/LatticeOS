import { createHash } from "node:crypto";
import { posix } from "node:path";

import {
  compareStrings,
  normalizeRepositoryPath,
  sortedUnique,
  type AnalysisDiagnostic,
  type EvidenceRecord,
  type RepositoryPath,
  type SourceLocation,
  type UiComponent,
} from "@latticeos/core";

import type {
  ShadcnAnalysis,
  ShadcnAnalysisInput,
  ShadcnCompilerSettings,
  ShadcnConfigInput,
} from "./types.js";

export const DEFAULT_MAX_SHADCN_DIAGNOSTICS = 100;
export const HARD_MAX_SHADCN_DIAGNOSTICS = 1_000;

interface ParsedConfig {
  readonly source: ShadcnConfigInput;
  readonly uiAlias: string;
  readonly location: SourceLocation;
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function location(source: ShadcnConfigInput, start: number, end = start + 1): SourceLocation {
  const before = source.content.slice(0, start);
  const throughEnd = source.content.slice(0, end);
  const line = before.split("\n").length;
  const column = before.length - before.lastIndexOf("\n");
  const endLine = throughEnd.split("\n").length;
  const endColumn = throughEnd.length - throughEnd.lastIndexOf("\n");
  return { path: source.path, line, column, endLine, endColumn };
}

function addDiagnostic(
  diagnostics: AnalysisDiagnostic[],
  maxDiagnostics: number,
  code: string,
  severity: AnalysisDiagnostic["severity"],
  message: string,
  limitations: readonly string[],
  source?: ShadcnConfigInput,
): void {
  if (diagnostics.length >= maxDiagnostics) return;
  diagnostics.push({
    code,
    severity,
    message,
    ...(source ? { location: location(source, 0) } : {}),
    limitations,
  });
}

function isSupportedConfig(value: Record<string, unknown>): boolean {
  const schema = value.$schema;
  return (typeof schema === "string" && schema.includes("ui.shadcn.com")) ||
    (typeof value.style === "string" && isRecord(value.aliases));
}

function uiLocation(source: ShadcnConfigInput): SourceLocation {
  const match = /"ui"\s*:/u.exec(source.content);
  return location(source, match?.index ?? 0, (match?.index ?? 0) + (match?.[0].length ?? 1));
}

function parseConfig(
  source: ShadcnConfigInput,
  diagnostics: AnalysisDiagnostic[],
  maxDiagnostics: number,
): ParsedConfig | undefined {
  let value: unknown;
  try {
    value = JSON.parse(source.content);
  } catch {
    addDiagnostic(
      diagnostics,
      maxDiagnostics,
      "SHADCN_CONFIG_INVALID",
      "warning",
      `Ignored malformed shadcn configuration: ${source.path}`,
      ["Installed shadcn component mapping from this file is unavailable."],
      source,
    );
    return undefined;
  }
  if (!isRecord(value) || !isSupportedConfig(value)) {
    addDiagnostic(
      diagnostics,
      maxDiagnostics,
      "SHADCN_CONFIG_UNSUPPORTED",
      "warning",
      `Ignored unsupported shadcn configuration: ${source.path}`,
      ["The file does not declare a supported shadcn configuration shape."],
      source,
    );
    return undefined;
  }
  const aliases = value.aliases;
  if (!isRecord(aliases)) {
    addDiagnostic(
      diagnostics,
      maxDiagnostics,
      "SHADCN_UI_ALIAS_MISSING",
      "info",
      `No shadcn aliases.ui value was found in ${source.path}.`,
      ["LatticeOS cannot map a configured UI source tree from this file."],
      source,
    );
    return undefined;
  }
  const ui = aliases.ui;
  if (typeof ui !== "string" || ui.length === 0 || ui.length > 512 || /[\u0000-\u001F\u007F]/u.test(ui)) {
    addDiagnostic(
      diagnostics,
      maxDiagnostics,
      "SHADCN_UI_ALIAS_INVALID",
      "warning",
      `Ignored an invalid shadcn aliases.ui value in ${source.path}.`,
      ["LatticeOS cannot map a configured UI source tree from this file."],
      source,
    );
    return undefined;
  }
  return { source, uiAlias: ui, location: uiLocation(source) };
}

function normalizeRelativePath(value: string, base: string): RepositoryPath | undefined {
  try {
    const candidate = value.startsWith(".") ? posix.join(base, value) : value;
    return normalizeRepositoryPath(candidate, true);
  } catch {
    return undefined;
  }
}

function rootForTarget(target: string, baseUrl: RepositoryPath | "." | undefined): RepositoryPath | undefined {
  let normalized: RepositoryPath;
  try {
    const targetPath = normalizeRepositoryPath(target, true);
    normalized = baseUrl && baseUrl !== "."
      ? normalizeRepositoryPath(`${baseUrl}/${targetPath}`, true)
      : targetPath;
  } catch {
    return undefined;
  }
  const basename = posix.basename(normalized);
  return /\.[cm]?[jt]sx?$/u.test(basename) ? normalizeRepositoryPath(posix.dirname(normalized), true) : normalized;
}

function aliasCapture(pattern: string, alias: string): string | undefined {
  const first = pattern.indexOf("*");
  if (first === -1) return pattern === alias ? "" : undefined;
  if (first !== pattern.lastIndexOf("*")) return undefined;
  const prefix = pattern.slice(0, first);
  const suffix = pattern.slice(first + 1);
  if (!alias.startsWith(prefix) || !alias.endsWith(suffix) || alias.length < prefix.length + suffix.length) return undefined;
  return alias.slice(prefix.length, alias.length - suffix.length);
}

function rootsFromCompilerAlias(alias: string, compiler: ShadcnCompilerSettings | undefined): RepositoryPath[] {
  if (!compiler?.paths) return [];
  const roots: string[] = [];
  for (const [pattern, targets] of Object.entries(compiler.paths).sort(([left], [right]) => compareStrings(left, right))) {
    const capture = aliasCapture(pattern, alias);
    if (capture === undefined) continue;
    for (const target of targets) {
      if (typeof target !== "string" || target.length > 512) continue;
      const stars = [...target].filter((character) => character === "*").length;
      if (stars > 1 || (capture.length === 0 && stars > 0)) continue;
      const substituted = stars === 1 ? target.replace("*", capture) : target;
      const root = rootForTarget(substituted, compiler.baseUrl);
      if (root) roots.push(root);
    }
  }
  return sortedUnique(roots);
}

function resolveUiRoots(config: ParsedConfig, compiler: ShadcnCompilerSettings | undefined): RepositoryPath[] {
  const alias = config.uiAlias;
  if (alias.startsWith(".") || (!alias.startsWith("@") && !alias.startsWith("~") && !alias.includes(":"))) {
    const configDirectory = posix.dirname(config.source.path);
    const root = normalizeRelativePath(alias, configDirectory);
    return root ? [root] : [];
  }
  return rootsFromCompilerAlias(alias, compiler);
}

function componentInRoot(component: UiComponent, root: RepositoryPath): boolean {
  return root === "." || component.sourcePath === root || component.sourcePath.startsWith(`${root}/`);
}

function registryEvidence(config: ParsedConfig, component: UiComponent): EvidenceRecord {
  const id = `ev:shadcn:registry:${hash(`${config.source.path}\0${config.uiAlias}\0${component.id}`).slice(0, 20)}`;
  return {
    id,
    kind: "registry",
    location: config.location,
    method: "static-config",
    classification: "corroborating",
    fingerprint: `sha256:${hash(config.source.content)}`,
    limitations: [
      "The configured UI source tree does not prove this component came from a particular registry.",
      "This evidence does not establish product intent or universal reuse suitability.",
    ],
  };
}

function sortedDiagnostics(diagnostics: readonly AnalysisDiagnostic[]): AnalysisDiagnostic[] {
  return [...diagnostics].sort(
    (left, right) =>
      compareStrings(left.code, right.code) ||
      compareStrings(left.location?.path ?? "", right.location?.path ?? "") ||
      compareStrings(left.message, right.message),
  );
}

export function analyzeShadcn(input: ShadcnAnalysisInput): ShadcnAnalysis {
  const maxDiagnostics = input.maxDiagnostics ?? DEFAULT_MAX_SHADCN_DIAGNOSTICS;
  if (!Number.isInteger(maxDiagnostics) || maxDiagnostics < 1 || maxDiagnostics > HARD_MAX_SHADCN_DIAGNOSTICS) {
    throw new Error(`maxDiagnostics must be an integer between 1 and ${HARD_MAX_SHADCN_DIAGNOSTICS}`);
  }
  const diagnostics: AnalysisDiagnostic[] = [];
  const evidence: EvidenceRecord[] = [];
  const evidenceIdsByComponent = new Map<string, string[]>();
  for (const source of [...input.configs].sort((left, right) => compareStrings(left.path, right.path))) {
    const config = parseConfig(source, diagnostics, maxDiagnostics);
    if (!config) continue;
    const roots = resolveUiRoots(config, input.compiler);
    if (roots.length === 0) {
      addDiagnostic(
        diagnostics,
        maxDiagnostics,
        "SHADCN_UI_ALIAS_UNRESOLVED",
        "warning",
        `Could not resolve shadcn aliases.ui in ${source.path} through the supported static paths mapping.`,
        ["Only repository-relative paths and direct root TypeScript paths aliases are supported."],
        source,
      );
      continue;
    }
    const matched = input.components
      .filter((component) => roots.some((root) => componentInRoot(component, root)))
      .sort((left, right) => compareStrings(left.id, right.id));
    if (matched.length === 0) {
      addDiagnostic(
        diagnostics,
        maxDiagnostics,
        "SHADCN_COMPONENTS_NOT_FOUND",
        "info",
        `No indexed React component was found under the configured shadcn UI source tree from ${source.path}.`,
        ["The UI alias may point to files outside the current React analysis boundary."],
        source,
      );
      continue;
    }
    for (const component of matched) {
      const record = registryEvidence(config, component);
      evidence.push(record);
      const ids = evidenceIdsByComponent.get(component.id) ?? [];
      ids.push(record.id);
      evidenceIdsByComponent.set(component.id, ids);
    }
  }
  const components = input.components
    .map((component) => {
      const ids = evidenceIdsByComponent.get(component.id);
      return ids ? { ...component, evidenceIds: sortedUnique([...component.evidenceIds, ...ids]) } : component;
    })
    .sort((left, right) => compareStrings(left.id, right.id));
  return {
    components,
    evidence: evidence.sort((left, right) => compareStrings(left.id, right.id)),
    diagnostics: sortedDiagnostics(diagnostics),
  };
}
