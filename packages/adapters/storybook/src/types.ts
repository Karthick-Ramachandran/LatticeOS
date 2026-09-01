import type {
  AnalysisDiagnostic,
  EvidenceRecord,
  RepositoryPath,
  UiComponent,
  UiImport,
} from "@latticeos/core";

export interface StorybookManifestInput {
  readonly path: RepositoryPath;
  readonly content: string;
}

export interface StorybookAnalysisInput {
  readonly manifests: readonly StorybookManifestInput[];
  readonly components: readonly UiComponent[];
  readonly imports: readonly UiImport[];
  readonly maxDiagnostics?: number;
}

export interface StorybookAnalysis {
  readonly components: readonly UiComponent[];
  readonly evidence: readonly EvidenceRecord[];
  readonly diagnostics: readonly AnalysisDiagnostic[];
}
