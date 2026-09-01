import { assertReuseIndex } from "./validation.js";
import { compareStrings, sortedUnique, stableStringify } from "./stable.js";
import type {
  AnalysisDiagnostic,
  EvidenceRecord,
  ReuseIndex,
  SourceLocation,
  UiComponent,
  UiImport,
  UiUsage,
} from "./types.js";

function compareLocations(left: SourceLocation, right: SourceLocation): number {
  return (
    compareStrings(left.path, right.path) ||
    left.line - right.line ||
    left.column - right.column ||
    (left.endLine ?? 0) - (right.endLine ?? 0) ||
    (left.endColumn ?? 0) - (right.endColumn ?? 0)
  );
}

function sortComponent(component: UiComponent): UiComponent {
  return {
    ...component,
    props: [...component.props]
      .map((prop) => ({ ...prop, variants: sortedUnique(prop.variants), evidenceIds: sortedUnique(prop.evidenceIds) }))
      .sort((left, right) => compareStrings(left.name, right.name)),
    composedComponentIds: sortedUnique(component.composedComponentIds),
    usageIds: sortedUnique(component.usageIds),
    evidenceIds: sortedUnique(component.evidenceIds),
  };
}

function compareEvidence(left: EvidenceRecord, right: EvidenceRecord): number {
  return compareStrings(left.id, right.id);
}

function compareImports(left: UiImport, right: UiImport): number {
  return compareStrings(left.id, right.id);
}

function compareUsages(left: UiUsage, right: UiUsage): number {
  return compareStrings(left.id, right.id);
}

function compareDiagnostics(left: AnalysisDiagnostic, right: AnalysisDiagnostic): number {
  return (
    compareStrings(left.code, right.code) ||
    compareStrings(left.location?.path ?? "", right.location?.path ?? "") ||
    compareStrings(left.message, right.message)
  );
}

export function sortReuseIndex(index: ReuseIndex): ReuseIndex {
  return {
    ...index,
    project: {
      ...index.project,
      tools: Object.fromEntries(
        Object.entries(index.project.tools).map(([name, detection]) => [
          name,
          { ...detection, evidenceIds: sortedUnique(detection.evidenceIds) },
        ]),
      ) as unknown as ReuseIndex["project"]["tools"],
    },
    packages: [...index.packages]
      .map((item) => ({ ...item, evidenceIds: sortedUnique(item.evidenceIds) }))
      .sort((left, right) => compareStrings(left.key, right.key)),
    components: [...index.components].map(sortComponent).sort((left, right) => compareStrings(left.id, right.id)),
    imports: [...index.imports]
      .map((item) => ({ ...item, evidenceIds: sortedUnique(item.evidenceIds) }))
      .sort(compareImports),
    usages: [...index.usages]
      .map((item) => ({ ...item, propNames: sortedUnique(item.propNames), evidenceIds: sortedUnique(item.evidenceIds) }))
      .sort(compareUsages),
    tailwind: {
      tokens: [...index.tailwind.tokens]
        .map((item) => ({ ...item, evidenceIds: sortedUnique(item.evidenceIds) }))
        .sort((left, right) => compareStrings(left.name, right.name) || compareStrings(left.sourcePath, right.sourcePath)),
      repeatedClassBundles: [...index.tailwind.repeatedClassBundles]
        .map((item) => {
          const occurrences = item.locations
            .map((location, index) => ({ location, original: item.originals[index] as string }))
            .sort((left, right) => compareLocations(left.location, right.location));
          return {
            ...item,
            classes: [...item.classes].sort(compareStrings),
            originals: occurrences.map((occurrence) => occurrence.original),
            locations: occurrences.map((occurrence) => occurrence.location),
            evidenceIds: sortedUnique(item.evidenceIds),
          };
        })
        .sort((left, right) => compareStrings(left.classes.join(" "), right.classes.join(" "))),
    },
    evidence: [...index.evidence]
      .map((item) => ({ ...item, limitations: sortedUnique(item.limitations) }))
      .sort(compareEvidence),
    diagnostics: [...index.diagnostics]
      .map((item) => ({ ...item, limitations: sortedUnique(item.limitations) }))
      .sort(compareDiagnostics),
  };
}

export function serializeReuseIndex(index: ReuseIndex): string {
  assertReuseIndex(index);
  return stableStringify(sortReuseIndex(index));
}
