import { createHash } from "node:crypto";

import {
  compareStrings,
  normalizeRepositoryPath,
  sortedUnique,
  type AnalysisDiagnostic,
  type EvidenceRecord,
  type RepositoryPath,
  type SourceLocation,
  type UiComponent,
  type UiImport,
} from "@latticeos/core";

import type {
  StorybookAnalysis,
  StorybookAnalysisInput,
  StorybookManifestInput,
} from "./types.js";

export const DEFAULT_MAX_STORYBOOK_DIAGNOSTICS = 100;
export const HARD_MAX_STORYBOOK_DIAGNOSTICS = 1_000;
export const DEFAULT_MAX_STORYBOOK_COMPONENTS = 1_000;
export const HARD_MAX_STORYBOOK_COMPONENTS = 10_000;
export const DEFAULT_MAX_STORIES_PER_COMPONENT = 100;
export const HARD_MAX_STORIES_PER_COMPONENT = 1_000;

interface ParsedStory {
  readonly id: string;
  readonly name: string;
}

interface ParsedManifestComponent {
  readonly key: string;
  readonly name: string;
  readonly storyPath: RepositoryPath;
  readonly stories: readonly ParsedStory[];
}

interface ParsedManifest {
  readonly source: StorybookManifestInput;
  readonly components: readonly ParsedManifestComponent[];
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sourceLocation(source: StorybookManifestInput): SourceLocation {
  return { path: source.path, line: 1, column: 1 };
}

function isSafeLabel(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 256 && !/[\u0000-\u001F\u007F]/u.test(value);
}

function isStoryPath(value: unknown): value is RepositoryPath {
  if (!isSafeLabel(value)) return false;
  try {
    const normalized = normalizeRepositoryPath(value.replace(/^\.\//u, ""));
    return /\.stories\.[cm]?[jt]sx?$/u.test(normalized);
  } catch {
    return false;
  }
}

function addDiagnostic(
  diagnostics: AnalysisDiagnostic[],
  maxDiagnostics: number,
  code: string,
  severity: AnalysisDiagnostic["severity"],
  message: string,
  limitations: readonly string[],
  source?: StorybookManifestInput,
): void {
  if (diagnostics.length >= maxDiagnostics) return;
  diagnostics.push({
    code,
    severity,
    message,
    ...(source ? { location: sourceLocation(source) } : {}),
    limitations,
  });
}

function parsedStory(
  value: unknown,
  source: StorybookManifestInput,
  componentKey: string,
  diagnostics: AnalysisDiagnostic[],
  maxDiagnostics: number,
): ParsedStory | undefined {
  if (!isRecord(value) || !isSafeLabel(value.id) || !isSafeLabel(value.name)) {
    addDiagnostic(
      diagnostics,
      maxDiagnostics,
      "STORYBOOK_STORY_INVALID",
      "warning",
      `Ignored an invalid Storybook story entry for manifest component '${componentKey}'.`,
      ["The malformed story is not attached as Reuse evidence."],
      source,
    );
    return undefined;
  }
  return { id: value.id, name: value.name };
}

function parseManifest(
  source: StorybookManifestInput,
  diagnostics: AnalysisDiagnostic[],
  maxDiagnostics: number,
): ParsedManifest | undefined {
  let value: unknown;
  try {
    value = JSON.parse(source.content);
  } catch {
    addDiagnostic(
      diagnostics,
      maxDiagnostics,
      "STORYBOOK_MANIFEST_INVALID",
      "warning",
      `Ignored malformed Storybook components manifest: ${source.path}`,
      ["Storybook example evidence from this manifest is unavailable."],
      source,
    );
    return undefined;
  }
  if (!isRecord(value) || !isRecord(value.components)) {
    addDiagnostic(
      diagnostics,
      maxDiagnostics,
      "STORYBOOK_MANIFEST_UNSUPPORTED",
      "warning",
      `Ignored unsupported Storybook components manifest: ${source.path}`,
      ["The current adapter expects a top-level components object."],
      source,
    );
    return undefined;
  }
  const entries = Object.entries(value.components).sort(([left], [right]) => compareStrings(left, right));
  if (entries.length > DEFAULT_MAX_STORYBOOK_COMPONENTS) {
    addDiagnostic(
      diagnostics,
      maxDiagnostics,
      "STORYBOOK_COMPONENT_LIMIT",
      "warning",
      `Storybook components manifest selection stopped after ${DEFAULT_MAX_STORYBOOK_COMPONENTS} entries.`,
      ["Later Storybook component entries are unavailable."],
      source,
    );
  }
  const components: ParsedManifestComponent[] = [];
  for (const [key, entry] of entries.slice(0, DEFAULT_MAX_STORYBOOK_COMPONENTS)) {
    if (!isSafeLabel(key) || !isRecord(entry) || !isSafeLabel(entry.name) || !isStoryPath(entry.path) || !Array.isArray(entry.stories)) {
      addDiagnostic(
        diagnostics,
        maxDiagnostics,
        "STORYBOOK_COMPONENT_INVALID",
        "warning",
        `Ignored an invalid Storybook manifest component entry in ${source.path}.`,
        ["The entry needs a name, repository-relative CSF path, and stories array."],
        source,
      );
      continue;
    }
    const parsedStories = entry.stories
      .slice(0, DEFAULT_MAX_STORIES_PER_COMPONENT)
      .map((story) => parsedStory(story, source, key, diagnostics, maxDiagnostics))
      .filter((story): story is ParsedStory => story !== undefined);
    const stories = [...new Map(parsedStories.map((story) => [story.id, story])).values()]
      .sort((left, right) => compareStrings(left.id, right.id));
    if (entry.stories.length > DEFAULT_MAX_STORIES_PER_COMPONENT) {
      addDiagnostic(
        diagnostics,
        maxDiagnostics,
        "STORYBOOK_STORY_LIMIT",
        "warning",
        `Storybook manifest component '${key}' stopped after ${DEFAULT_MAX_STORIES_PER_COMPONENT} stories.`,
        ["Later stories for this component are unavailable."],
        source,
      );
    }
    if (stories.length === 0) {
      addDiagnostic(
        diagnostics,
        maxDiagnostics,
        "STORYBOOK_STORIES_INVALID",
        "warning",
        `Ignored Storybook manifest component '${key}' because it has no valid stories.`,
        ["The component is not attached as Storybook example evidence."],
        source,
      );
      continue;
    }
    components.push({ key, name: entry.name, storyPath: entry.path.replace(/^\.\//u, "") as RepositoryPath, stories });
  }
  return { source, components };
}

function storyEvidence(
  manifest: ParsedManifest,
  entry: ParsedManifestComponent,
  story: ParsedStory,
  component: UiComponent,
): EvidenceRecord {
  return {
    id: `ev:storybook:story:${hash(`${manifest.source.path}\0${entry.key}\0${story.id}\0${component.id}`).slice(0, 20)}`,
    kind: "story",
    location: sourceLocation(manifest.source),
    method: "manifest",
    classification: "corroborating",
    fingerprint: `sha256:${hash(manifest.source.content)}`,
    limitations: [
      "The generated manifest corroborates that this component has a named Storybook example.",
      "The manifest does not prove rendered output, runtime behavior, semantic intent, or reuse suitability.",
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

export function analyzeStorybook(input: StorybookAnalysisInput): StorybookAnalysis {
  const maxDiagnostics = input.maxDiagnostics ?? DEFAULT_MAX_STORYBOOK_DIAGNOSTICS;
  if (!Number.isInteger(maxDiagnostics) || maxDiagnostics < 1 || maxDiagnostics > HARD_MAX_STORYBOOK_DIAGNOSTICS) {
    throw new Error(`maxDiagnostics must be an integer between 1 and ${HARD_MAX_STORYBOOK_DIAGNOSTICS}`);
  }
  const diagnostics: AnalysisDiagnostic[] = [];
  const evidence = new Map<string, EvidenceRecord>();
  const evidenceIdsByComponent = new Map<string, string[]>();
  const componentsById = new Map(input.components.map((component) => [component.id, component]));
  const importsByStoryPath = new Map<string, UiImport[]>();
  for (const item of input.imports) {
    const imports = importsByStoryPath.get(item.importerPath) ?? [];
    imports.push(item);
    importsByStoryPath.set(item.importerPath, imports);
  }
  for (const source of [...input.manifests].sort((left, right) => compareStrings(left.path, right.path))) {
    const manifest = parseManifest(source, diagnostics, maxDiagnostics);
    if (!manifest) continue;
    for (const entry of manifest.components) {
      const mapped = sortedUnique(
        (importsByStoryPath.get(entry.storyPath) ?? [])
          .filter((item) => !item.typeOnly)
          .flatMap((item) => item.resolvedComponentId ? [componentsById.get(item.resolvedComponentId)] : [])
          .filter((component): component is UiComponent => component !== undefined && component.displayName === entry.name)
          .map((component) => component.id),
      )
        .map((id) => componentsById.get(id) as UiComponent);
      if (mapped.length === 0) {
        addDiagnostic(
          diagnostics,
          maxDiagnostics,
          "STORYBOOK_COMPONENT_UNMAPPED",
          "info",
          `Could not map Storybook manifest component '${entry.name}' to a resolved React import from ${entry.storyPath}.`,
          ["The manifest entry is not attached as component evidence."],
          source,
        );
        continue;
      }
      for (const component of mapped) {
        for (const story of entry.stories) {
          const record = storyEvidence(manifest, entry, story, component);
          evidence.set(record.id, record);
          const ids = evidenceIdsByComponent.get(component.id) ?? [];
          ids.push(record.id);
          evidenceIdsByComponent.set(component.id, ids);
        }
      }
    }
  }
  return {
    components: input.components
      .map((component) => {
        const ids = evidenceIdsByComponent.get(component.id);
        return ids ? { ...component, evidenceIds: sortedUnique([...component.evidenceIds, ...ids]) } : component;
      })
      .sort((left, right) => compareStrings(left.id, right.id)),
    evidence: [...evidence.values()].sort((left, right) => compareStrings(left.id, right.id)),
    diagnostics: sortedDiagnostics(diagnostics),
  };
}
