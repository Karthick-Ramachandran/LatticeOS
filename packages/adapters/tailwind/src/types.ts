import type {
  AnalysisDiagnostic,
  EvidenceRecord,
  RepositoryPath,
  TailwindEvidence,
} from "@latticeos/core";

export type TailwindSourceKind = "css" | "config" | "source";

export interface TailwindSourceInput {
  readonly path: RepositoryPath;
  readonly kind: TailwindSourceKind;
  readonly content: string;
}

export interface TailwindAnalysisInput {
  readonly sources: readonly TailwindSourceInput[];
  readonly repeatedBundleThreshold?: number;
  readonly maxDiagnostics?: number;
}

export interface TailwindAnalysis {
  readonly tailwind: TailwindEvidence;
  readonly evidence: readonly EvidenceRecord[];
  readonly diagnostics: readonly AnalysisDiagnostic[];
}
