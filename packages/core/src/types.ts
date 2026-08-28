export const REUSE_INDEX_SCHEMA_VERSION = 1 as const;
export const REUSE_CONTEXT_SCHEMA_VERSION = 1 as const;
export const LATTICE_CLI_SCHEMA_VERSION = 1 as const;

export type ComponentId = `react:${string}:${string}#${string}`;
export type RepositoryPath = string;

export const evidenceKinds = [
  "project",
  "package",
  "export",
  "prop",
  "import",
  "usage",
  "composition",
  "story",
  "registry",
  "token",
  "class-bundle",
] as const;

export type EvidenceKind = (typeof evidenceKinds)[number];

export const evidenceMethods = [
  "manifest",
  "ast",
  "type-checker",
  "css",
  "static-config",
  "static-source",
] as const;

export type EvidenceMethod = (typeof evidenceMethods)[number];
export type EvidenceClassification = "exact" | "corroborating" | "heuristic";

export interface SourceLocation {
  readonly path: RepositoryPath;
  readonly line: number;
  readonly column: number;
  readonly endLine?: number;
  readonly endColumn?: number;
}

export interface EvidenceRecord {
  readonly id: string;
  readonly kind: EvidenceKind;
  readonly location: SourceLocation;
  readonly method: EvidenceMethod;
  readonly classification: EvidenceClassification;
  readonly fingerprint: string;
  readonly limitations: readonly string[];
}

export interface RecommendationReason {
  readonly code:
    | "name-exact"
    | "name-token"
    | "path-token"
    | "prop-token"
    | "usage-path-token";
  readonly score: number;
  readonly message: string;
  readonly evidenceIds: readonly string[];
}

export interface AnalysisDiagnostic {
  readonly code: string;
  readonly severity: "info" | "warning" | "error";
  readonly message: string;
  readonly location?: SourceLocation;
  readonly limitations: readonly string[];
}

export interface ToolDetection {
  readonly status: "present" | "absent" | "unknown";
  readonly evidenceIds: readonly string[];
}

export interface UiProject {
  readonly rootPath: ".";
  readonly packageManager: "pnpm" | "npm" | "yarn" | "bun" | "unknown";
  readonly tools: Readonly<{
    react: ToolDetection;
    nextjs: ToolDetection;
    typescript: ToolDetection;
    tailwind: ToolDetection;
    shadcn: ToolDetection;
    storybook: ToolDetection;
  }>;
}

export interface UiPackage {
  readonly key: string;
  readonly name?: string;
  readonly rootPath: RepositoryPath;
  readonly manifestPath?: RepositoryPath;
  readonly evidenceIds: readonly string[];
}

export interface UiProp {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
  readonly defaulted: boolean;
  readonly variants: readonly string[];
  readonly evidenceIds: readonly string[];
}

export interface UiComponent {
  readonly id: ComponentId;
  readonly packageKey: string;
  readonly sourcePath: RepositoryPath;
  readonly exportKey: string;
  readonly displayName: string;
  readonly visibility: "public" | "local";
  readonly props: readonly UiProp[];
  readonly composedComponentIds: readonly ComponentId[];
  readonly usageIds: readonly string[];
  readonly evidenceIds: readonly string[];
}

export interface UiImport {
  readonly id: string;
  readonly importerPath: RepositoryPath;
  readonly source: string;
  readonly importedName: string;
  readonly localName: string;
  readonly typeOnly: boolean;
  readonly resolvedComponentId?: ComponentId;
  readonly location: SourceLocation;
  readonly evidenceIds: readonly string[];
}

export interface UiUsage {
  readonly id: string;
  readonly componentId: ComponentId;
  readonly kind: "jsx" | "call" | "composition";
  readonly sourcePath: RepositoryPath;
  readonly location: SourceLocation;
  readonly propNames: readonly string[];
  readonly evidenceIds: readonly string[];
}

export interface TailwindToken {
  readonly name: string;
  readonly value: string;
  readonly sourcePath: RepositoryPath;
  readonly evidenceIds: readonly string[];
}

export interface TailwindClassBundle {
  readonly classes: readonly string[];
  readonly originals: readonly string[];
  readonly count: number;
  readonly locations: readonly SourceLocation[];
  readonly evidenceIds: readonly string[];
}

export interface TailwindEvidence {
  readonly tokens: readonly TailwindToken[];
  readonly repeatedClassBundles: readonly TailwindClassBundle[];
}

export interface ReuseIndex {
  readonly schemaVersion: typeof REUSE_INDEX_SCHEMA_VERSION;
  readonly generator: Readonly<{
    name: "lattice";
    version: string;
  }>;
  readonly project: UiProject;
  readonly packages: readonly UiPackage[];
  readonly components: readonly UiComponent[];
  readonly imports: readonly UiImport[];
  readonly usages: readonly UiUsage[];
  readonly tailwind: TailwindEvidence;
  readonly evidence: readonly EvidenceRecord[];
  readonly diagnostics: readonly AnalysisDiagnostic[];
}

export interface ReuseRecommendation {
  readonly componentId: ComponentId;
  readonly displayName: string;
  readonly sourcePath: RepositoryPath;
  readonly score: number;
  readonly reasons: readonly RecommendationReason[];
}

export type ComponentResolution =
  | Readonly<{ status: "found"; component: UiComponent }>
  | Readonly<{ status: "ambiguous"; candidates: readonly UiComponent[] }>
  | Readonly<{ status: "not-found" }>;

export interface ReuseContextItem {
  readonly recommendation: ReuseRecommendation;
  readonly text: string;
}

export interface ReuseContext {
  readonly schemaVersion: typeof REUSE_CONTEXT_SCHEMA_VERSION;
  readonly task: string;
  readonly items: readonly ReuseContextItem[];
  readonly text: string;
  readonly characterCount: number;
  readonly truncated: boolean;
  readonly omittedItems: number;
}

export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
}

export type ValidationResult<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; issues: readonly ValidationIssue[] }>;
