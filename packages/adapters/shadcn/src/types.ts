import type {
  AnalysisDiagnostic,
  EvidenceRecord,
  RepositoryPath,
  UiComponent,
} from "@latticeos/core";

export interface ShadcnConfigInput {
  readonly path: RepositoryPath;
  readonly content: string;
}

export interface ShadcnCompilerSettings {
  readonly baseUrl?: RepositoryPath | ".";
  readonly paths?: Readonly<Record<string, readonly string[]>>;
}

export interface ShadcnAnalysisInput {
  readonly configs: readonly ShadcnConfigInput[];
  readonly components: readonly UiComponent[];
  readonly compiler?: ShadcnCompilerSettings;
  readonly maxDiagnostics?: number;
}

export interface ShadcnAnalysis {
  readonly components: readonly UiComponent[];
  readonly evidence: readonly EvidenceRecord[];
  readonly diagnostics: readonly AnalysisDiagnostic[];
}
