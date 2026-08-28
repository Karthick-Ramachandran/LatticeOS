import ts from "typescript";

import { normalizeRepositoryPath } from "@latticeos/core";

import type { ReactAnalysisInput, ReactCompilerSettings, ReactSourceInput } from "./types.js";

const virtualRoot = "/__lattice_repository__";

function virtualPath(repositoryPath: string): string {
  return `${virtualRoot}/${repositoryPath}`;
}

function portableCompilerPath(fileName: string): string {
  return fileName.replaceAll("\\", "/");
}

function scriptKind(path: string): ts.ScriptKind {
  if (path.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (path.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (path.endsWith(".js") || path.endsWith(".mjs") || path.endsWith(".cjs")) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function clonePaths(paths: ReactCompilerSettings["paths"]): Record<string, string[]> | undefined {
  if (!paths) return undefined;
  return Object.fromEntries(Object.entries(paths).map(([key, values]) => [key, [...values]]));
}

export interface VirtualProgram {
  readonly program: ts.Program;
  readonly sourcesByPath: ReadonlyMap<string, ReactSourceInput>;
  readonly repositoryPathByFileName: ReadonlyMap<string, string>;
}

export function createVirtualProgram(input: ReactAnalysisInput): VirtualProgram {
  const sourcesByPath = new Map<string, ReactSourceInput>();
  const contentByFileName = new Map<string, ReactSourceInput>();

  for (const source of input.sources) {
    const path = normalizeRepositoryPath(source.path);
    if (path !== source.path) throw new Error(`React source path must be normalized: ${source.path}`);
    if (source.packageKey.length === 0) throw new Error(`React source package key is empty: ${source.path}`);
    if (sourcesByPath.has(path)) throw new Error(`React source path is duplicated: ${path}`);
    sourcesByPath.set(path, source);
    contentByFileName.set(virtualPath(path), source);
  }

  const baseUrl = input.compiler?.baseUrl && input.compiler.baseUrl !== "."
    ? virtualPath(normalizeRepositoryPath(input.compiler.baseUrl, true))
    : virtualRoot;
  const configuredPaths = clonePaths(input.compiler?.paths);
  const options: ts.CompilerOptions = {
    allowJs: true,
    checkJs: false,
    jsx: ts.JsxEmit.Preserve,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmit: true,
    noLib: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ESNext,
    baseUrl,
    ...(configuredPaths ? { paths: configuredPaths } : {}),
  };

  const directories = new Set<string>([virtualRoot]);
  for (const fileName of contentByFileName.keys()) {
    const segments = fileName.split("/");
    segments.pop();
    while (segments.length > 1) {
      directories.add(segments.join("/") || "/");
      segments.pop();
    }
  }

  const fileExists = (fileName: string): boolean => contentByFileName.has(portableCompilerPath(fileName));
  const readVirtualFile = (fileName: string): string | undefined => contentByFileName.get(portableCompilerPath(fileName))?.content;
  const directoryExists = (directoryName: string): boolean => directories.has(portableCompilerPath(directoryName));
  const realpath = (fileName: string): string => portableCompilerPath(fileName);
  const moduleHost: ts.ModuleResolutionHost = {
    fileExists,
    readFile: readVirtualFile,
    directoryExists,
    realpath,
    getCurrentDirectory: () => virtualRoot,
  };
  const host: ts.CompilerHost = {
    fileExists,
    readFile: readVirtualFile,
    directoryExists,
    realpath,
    getCurrentDirectory: () => virtualRoot,
    getCanonicalFileName: (fileName) => portableCompilerPath(fileName),
    getDefaultLibFileName: () => `${virtualRoot}/__lib__.d.ts`,
    getDirectories: () => [],
    getNewLine: () => "\n",
    getSourceFile: (fileName, languageVersion) => {
      const normalized = portableCompilerPath(fileName);
      const source = contentByFileName.get(normalized);
      return source
        ? ts.createSourceFile(normalized, source.content, languageVersion, true, scriptKind(source.path))
        : undefined;
    },
    useCaseSensitiveFileNames: () => true,
    writeFile: () => undefined,
    resolveModuleNames: (moduleNames, containingFile) =>
      moduleNames.map(
        (moduleName) => ts.resolveModuleName(moduleName, containingFile, options, moduleHost).resolvedModule,
      ),
  };

  const rootNames = [...contentByFileName.keys()].sort();
  const program = ts.createProgram({ rootNames, options, host });
  const repositoryPathByFileName = new Map<string, string>();
  for (const [path] of sourcesByPath) repositoryPathByFileName.set(virtualPath(path), path);
  return { program, sourcesByPath, repositoryPathByFileName };
}
