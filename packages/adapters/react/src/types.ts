import type {
  AnalysisDiagnostic,
  EvidenceRecord,
  RepositoryPath,
  UiComponent,
  UiImport,
  UiUsage,
} from "@latticeos/core";

export interface ReactSourceInput {
  readonly path: RepositoryPath;
  readonly packageKey: string;
  readonly content: string;
}

export interface ReactCompilerSettings {
  readonly baseUrl?: RepositoryPath | ".";
  readonly paths?: Readonly<Record<string, readonly string[]>>;
}

export interface ReactAnalysisInput {
  readonly sources: readonly ReactSourceInput[];
  readonly compiler?: ReactCompilerSettings;
  readonly maxDiagnostics?: number;
}

export interface ReactAnalysis {
  readonly components: readonly UiComponent[];
  readonly imports: readonly UiImport[];
  readonly usages: readonly UiUsage[];
  readonly evidence: readonly EvidenceRecord[];
  readonly diagnostics: readonly AnalysisDiagnostic[];
}
