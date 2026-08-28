import { createHash } from "node:crypto";

import ts from "typescript";

import {
  compareStrings,
  createComponentId,
  sortedUnique,
  type AnalysisDiagnostic,
  type ComponentId,
  type EvidenceKind,
  type EvidenceMethod,
  type EvidenceRecord,
  type SourceLocation,
  type UiComponent,
  type UiImport,
  type UiProp,
  type UiUsage,
} from "@latticeos/core";

import type { ReactAnalysis, ReactAnalysisInput, ReactSourceInput } from "./types.js";
import { createVirtualProgram } from "./virtual-program.js";

interface ComponentCandidate {
  readonly source: ReactSourceInput;
  readonly declaration: ts.Node;
  readonly functionNode: ts.FunctionLikeDeclaration;
  readonly nameNode: ts.Identifier | undefined;
  readonly localName: string;
  readonly displayName: string;
  readonly exportKeys: readonly string[];
  readonly propsParameter: ts.ParameterDeclaration | undefined;
}

interface WorkingComponent {
  readonly value: UiComponent;
  readonly usageIds: Set<string>;
  readonly composedComponentIds: Set<ComponentId>;
}

interface PendingImport {
  readonly value: Omit<UiImport, "resolvedComponentId">;
  readonly localNode: ts.Identifier;
}

const wrapperNames = new Set(["memo", "forwardRef"]);

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return ts.canHaveModifiers(node) && (ts.getModifiers(node)?.some((modifier) => modifier.kind === kind) ?? false);
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isTypeAssertionExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function expressionName(expression: ts.Expression): string | undefined {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) return current.text;
  if (ts.isPropertyAccessExpression(current)) return current.name.text;
  return undefined;
}

function unwrapFunction(expression: ts.Expression): ts.FunctionLikeDeclaration | undefined {
  const current = unwrapExpression(expression);
  if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) return current;
  if (!ts.isCallExpression(current) || !wrapperNames.has(expressionName(current.expression) ?? "")) return undefined;
  for (const argument of current.arguments) {
    const candidate = unwrapFunction(argument);
    if (candidate) return candidate;
  }
  return undefined;
}

function isJsxExpression(node: ts.Node): boolean {
  const current = ts.isParenthesizedExpression(node) ? unwrapExpression(node) : node;
  return ts.isJsxElement(current) || ts.isJsxSelfClosingElement(current) || ts.isJsxFragment(current);
}

function returnsJsx(node: ts.FunctionLikeDeclaration): boolean {
  if (!node.body) return false;
  if (!ts.isBlock(node.body)) return isJsxExpression(node.body);
  let found = false;
  const visit = (child: ts.Node): void => {
    if (found) return;
    if (child !== node.body && ts.isFunctionLike(child)) return;
    if (ts.isReturnStatement(child) && child.expression && isJsxExpression(child.expression)) {
      found = true;
      return;
    }
    child.forEachChild(visit);
  };
  node.body.forEachChild(visit);
  return found;
}

function pascalCase(value: string): string {
  const parts = value.split(/[^A-Za-z0-9]+/u).filter(Boolean);
  const joined = parts.map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`).join("");
  return joined.length > 0 ? joined : "DefaultComponent";
}

function defaultDisplayName(path: string): string {
  const fileName = path.split("/").at(-1)?.replace(/\.(?:[cm]?[jt]sx?)$/u, "") ?? "default-component";
  return pascalCase(fileName === "index" ? "default-component" : fileName);
}

function localExportMap(sourceFile: ts.SourceFile): Map<string, string[]> {
  const exports = new Map<string, string[]>();
  const add = (localName: string, exportKey: string): void => {
    const values = exports.get(localName) ?? [];
    values.push(exportKey);
    exports.set(localName, values);
  };
  for (const statement of sourceFile.statements) {
    if (ts.isExportAssignment(statement) && ts.isIdentifier(statement.expression)) {
      add(statement.expression.text, "default");
    }
    if (ts.isExportDeclaration(statement) && !statement.moduleSpecifier && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
      for (const element of statement.exportClause.elements) {
        add((element.propertyName ?? element.name).text, element.name.text);
      }
    }
  }
  return exports;
}

function statementExportKeys(node: ts.Node, localName: string, additional: ReadonlyMap<string, readonly string[]>): string[] {
  const owner = ts.isVariableDeclaration(node) ? node.parent.parent : node;
  const direct = hasModifier(owner, ts.SyntaxKind.ExportKeyword)
    ? [hasModifier(owner, ts.SyntaxKind.DefaultKeyword) ? "default" : localName]
    : [];
  return sortedUnique([...direct, ...(additional.get(localName) ?? [])]);
}

function collectCandidates(
  sourceFile: ts.SourceFile,
  source: ReactSourceInput,
): ComponentCandidate[] {
  const candidates: ComponentCandidate[] = [];
  const exports = localExportMap(sourceFile);

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement)) {
      const functionNode = statement;
      if (!returnsJsx(functionNode)) continue;
      const anonymousDefault = !statement.name && hasModifier(statement, ts.SyntaxKind.DefaultKeyword);
      const localName = statement.name?.text ?? defaultDisplayName(source.path);
      if (!anonymousDefault && !/^[A-Z]/u.test(localName)) continue;
      candidates.push({
        source,
        declaration: statement,
        functionNode,
        nameNode: statement.name,
        localName,
        displayName: localName,
        exportKeys: anonymousDefault ? ["default"] : statementExportKeys(statement, localName, exports),
        propsParameter: statement.parameters[0],
      });
      continue;
    }

    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer || !/^[A-Z]/u.test(declaration.name.text)) continue;
      const functionNode = unwrapFunction(declaration.initializer);
      if (!functionNode || !returnsJsx(functionNode)) continue;
      candidates.push({
        source,
        declaration,
        functionNode,
        nameNode: declaration.name,
        localName: declaration.name.text,
        displayName: declaration.name.text,
        exportKeys: statementExportKeys(declaration, declaration.name.text, exports),
        propsParameter: functionNode.parameters[0],
      });
    }
  }

  return candidates;
}

function canonicalSymbol(checker: ts.TypeChecker, symbol: ts.Symbol | undefined): ts.Symbol | undefined {
  let current = symbol;
  const visited = new Set<ts.Symbol>();
  while (current && (current.flags & ts.SymbolFlags.Alias) !== 0 && !visited.has(current)) {
    visited.add(current);
    try {
      current = checker.getAliasedSymbol(current);
    } catch {
      return current;
    }
  }
  return current;
}

function literalVariants(type: ts.Type): string[] {
  if (type.isUnion()) return sortedUnique(type.types.flatMap(literalVariants));
  if ((type.flags & ts.TypeFlags.StringLiteral) !== 0) return [(type as ts.StringLiteralType).value];
  if ((type.flags & ts.TypeFlags.NumberLiteral) !== 0) return [String((type as ts.NumberLiteralType).value)];
  if ((type.flags & ts.TypeFlags.BooleanLiteral) !== 0) return [String((type as { intrinsicName?: string }).intrinsicName ?? "")];
  return [];
}

function defaultedBindings(parameter: ts.ParameterDeclaration | undefined): Set<string> {
  const names = new Set<string>();
  if (!parameter || !ts.isObjectBindingPattern(parameter.name)) return names;
  for (const element of parameter.name.elements) {
    if (!element.initializer) continue;
    if (ts.isIdentifier(element.name)) names.add((element.propertyName && ts.isIdentifier(element.propertyName) ? element.propertyName : element.name).text);
  }
  return names;
}

function objectLiteralNames(expression: ts.Expression | undefined): string[] {
  if (!expression || !ts.isObjectLiteralExpression(unwrapExpression(expression))) return [];
  const object = unwrapExpression(expression) as ts.ObjectLiteralExpression;
  return sortedUnique(
    object.properties.flatMap((property) => {
      if (
        (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property) || ts.isMethodDeclaration(property)) &&
        property.name
      ) {
        return [property.name.getText().replace(/^['"]|['"]$/gu, "")];
      }
      return [];
    }),
  );
}

export function analyzeReact(input: ReactAnalysisInput): ReactAnalysis {
  const maxDiagnostics = input.maxDiagnostics ?? 100;
  if (!Number.isInteger(maxDiagnostics) || maxDiagnostics < 1 || maxDiagnostics > 1_000) {
    throw new Error("React maxDiagnostics must be an integer between 1 and 1000");
  }

  const virtual = createVirtualProgram(input);
  const checker = virtual.program.getTypeChecker();
  const evidence = new Map<string, EvidenceRecord>();
  const diagnostics: AnalysisDiagnostic[] = [];
  let diagnosticOverflow = false;

  const repositoryPath = (sourceFile: ts.SourceFile): string => {
    const path = virtual.repositoryPathByFileName.get(sourceFile.fileName);
    if (!path) throw new Error(`TypeScript returned an unknown source file: ${sourceFile.fileName}`);
    return path;
  };
  const sourceInput = (sourceFile: ts.SourceFile): ReactSourceInput => {
    const source = virtual.sourcesByPath.get(repositoryPath(sourceFile));
    if (!source) throw new Error(`React source input is missing: ${sourceFile.fileName}`);
    return source;
  };
  const location = (node: ts.Node): SourceLocation => {
    const sourceFile = node.getSourceFile();
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    return {
      path: repositoryPath(sourceFile),
      line: start.line + 1,
      column: start.character + 1,
      endLine: end.line + 1,
      endColumn: end.character + 1,
    };
  };
  const addDiagnostic = (item: AnalysisDiagnostic): void => {
    if (diagnostics.length < maxDiagnostics) diagnostics.push(item);
    else diagnosticOverflow = true;
  };
  const addEvidence = (
    kind: EvidenceKind,
    node: ts.Node,
    label: string,
    method: EvidenceMethod,
    classification: EvidenceRecord["classification"],
    limitations: readonly string[] = [],
  ): string => {
    const sourceFile = node.getSourceFile();
    const path = repositoryPath(sourceFile);
    const id = `ev:react:${kind}:${hash(`${path}\0${node.getStart(sourceFile)}\0${label}`).slice(0, 20)}`;
    if (!evidence.has(id)) {
      evidence.set(id, {
        id,
        kind,
        location: location(node),
        method,
        classification,
        fingerprint: `sha256:${hash(sourceInput(sourceFile).content)}`,
        limitations,
      });
    }
    return id;
  };

  const sourceFiles = virtual.program
    .getSourceFiles()
    .filter((sourceFile) => virtual.repositoryPathByFileName.has(sourceFile.fileName))
    .sort((left, right) => compareStrings(repositoryPath(left), repositoryPath(right)));
  const candidates = sourceFiles.flatMap((sourceFile) =>
    collectCandidates(sourceFile, sourceInput(sourceFile)),
  );

  const propsForCandidate = (candidate: ComponentCandidate): UiProp[] => {
    const parameter = candidate.propsParameter;
    if (!parameter) return [];
    const defaults = defaultedBindings(parameter);
    const parameterType = checker.getTypeAtLocation(parameter);
    const properties = checker.getPropertiesOfType(parameterType);
    if (properties.length === 0 && ts.isObjectBindingPattern(parameter.name)) {
      return parameter.name.elements.flatMap((element) => {
        if (!ts.isIdentifier(element.name)) return [];
        const name = element.propertyName && ts.isIdentifier(element.propertyName) ? element.propertyName.text : element.name.text;
        const evidenceId = addEvidence("prop", element, name, "ast", "exact", ["The prop type could not be resolved."]);
        addDiagnostic({
          code: "REACT_PROP_TYPE_UNRESOLVED",
          severity: "warning",
          message: `Could not resolve the type of prop '${name}' in ${candidate.displayName}.`,
          location: location(element),
          limitations: ["The prop is recorded with type unknown."],
        });
        return [{ name, type: "unknown", required: !element.initializer, defaulted: Boolean(element.initializer), variants: [], evidenceIds: [evidenceId] }];
      });
    }

    return properties
      .map((property): UiProp => {
        const declaration = property.valueDeclaration ?? property.declarations?.[0] ?? parameter;
        const propType = checker.getTypeOfSymbolAtLocation(property, parameter);
        const evidenceId = addEvidence("prop", declaration, property.name, "type-checker", "exact");
        return {
          name: property.name,
          type: checker.typeToString(propType, parameter, ts.TypeFormatFlags.NoTruncation),
          required: (property.flags & ts.SymbolFlags.Optional) === 0,
          defaulted: defaults.has(property.name),
          variants: literalVariants(propType).filter(Boolean),
          evidenceIds: [evidenceId],
        };
      })
      .sort((left, right) => compareStrings(left.name, right.name));
  };

  const working = new Map<ComponentId, WorkingComponent>();
  const idsBySymbol = new Map<ts.Symbol, ComponentId[]>();
  const primaryIdByFunction = new Map<ts.SignatureDeclaration, ComponentId>();
  const registerSymbol = (symbol: ts.Symbol | undefined, id: ComponentId): void => {
    const resolved = canonicalSymbol(checker, symbol);
    if (!resolved) return;
    const ids = idsBySymbol.get(resolved) ?? [];
    ids.push(id);
    idsBySymbol.set(resolved, sortedUnique(ids));
  };

  for (const candidate of candidates) {
    const exportKeys = candidate.exportKeys.length > 0 ? candidate.exportKeys : [`local:${candidate.localName}`];
    const props = propsForCandidate(candidate);
    const candidateIds: ComponentId[] = [];
    for (const exportKey of exportKeys) {
      const visibility = exportKey.startsWith("local:") ? "local" : "public";
      const id = createComponentId({
        packageKey: candidate.source.packageKey,
        sourcePath: candidate.source.path,
        exportKey,
      });
      const componentEvidenceId = addEvidence(
        visibility === "public" ? "export" : "composition",
        candidate.declaration,
        exportKey,
        "ast",
        "exact",
      );
      working.set(id, {
        value: {
          id,
          packageKey: candidate.source.packageKey,
          sourcePath: candidate.source.path,
          exportKey,
          displayName: candidate.displayName,
          visibility,
          props,
          composedComponentIds: [],
          usageIds: [],
          evidenceIds: [componentEvidenceId],
        },
        usageIds: new Set(),
        composedComponentIds: new Set(),
      });
      candidateIds.push(id);
    }
    const preferred = [...candidateIds].sort((left, right) => {
      const leftPublic = working.get(left)?.value.visibility === "public" ? 0 : 1;
      const rightPublic = working.get(right)?.value.visibility === "public" ? 0 : 1;
      return leftPublic - rightPublic || compareStrings(left, right);
    })[0];
    if (preferred) {
      primaryIdByFunction.set(candidate.functionNode, preferred);
    }
    if (candidate.nameNode) registerSymbol(checker.getSymbolAtLocation(candidate.nameNode), preferred as ComponentId);
  }

  const componentIdForSymbol = (symbol: ts.Symbol | undefined): ComponentId | undefined => {
    const resolved = canonicalSymbol(checker, symbol);
    if (!resolved) return undefined;
    const ids = idsBySymbol.get(resolved);
    return ids?.find((id) => working.get(id)?.value.visibility === "public") ?? ids?.[0];
  };

  const pendingImports: PendingImport[] = [];
  for (const sourceFile of sourceFiles) {
    for (const statement of sourceFile.statements) {
      if (!ts.isImportDeclaration(statement) || !statement.importClause || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const moduleName = statement.moduleSpecifier.text;
      if (moduleName.length > 512) {
        addDiagnostic({
          code: "REACT_IMPORT_SPECIFIER_LIMIT",
          severity: "warning",
          message: `Skipped an import specifier longer than 512 characters in ${repositoryPath(sourceFile)}.`,
          location: location(statement.moduleSpecifier),
          limitations: ["The import is not represented in the Reuse index."],
        });
        continue;
      }
      const addImport = (
        localNode: ts.Identifier,
        importedName: string,
        typeOnly: boolean,
        evidenceNode: ts.Node,
      ): void => {
        const evidenceId = addEvidence("import", evidenceNode, `${moduleName}:${importedName}:${localNode.text}`, "ast", "exact");
        pendingImports.push({
          localNode,
          value: {
            id: `import:${hash(`${repositoryPath(sourceFile)}\0${evidenceNode.getStart(sourceFile)}\0${localNode.text}`).slice(0, 20)}`,
            importerPath: repositoryPath(sourceFile),
            source: moduleName,
            importedName,
            localName: localNode.text,
            typeOnly,
            location: location(evidenceNode),
            evidenceIds: [evidenceId],
          },
        });
      };
      if (statement.importClause.name) {
        addImport(statement.importClause.name, "default", statement.importClause.isTypeOnly, statement.importClause.name);
      }
      const bindings = statement.importClause.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) {
        addImport(bindings.name, "*", statement.importClause.isTypeOnly, bindings.name);
      }
      if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          addImport(
            element.name,
            (element.propertyName ?? element.name).text,
            statement.importClause.isTypeOnly || element.isTypeOnly,
            element,
          );
        }
      }
    }
  }

  const imports: UiImport[] = pendingImports.map((item) => {
    const resolvedComponentId = componentIdForSymbol(checker.getSymbolAtLocation(item.localNode));
    return { ...item.value, ...(resolvedComponentId ? { resolvedComponentId } : {}) };
  });

  const enclosingComponent = (node: ts.Node): ComponentId | undefined => {
    let current: ts.Node | undefined = node.parent;
    while (current) {
      if (ts.isFunctionLike(current)) {
        const id = primaryIdByFunction.get(current);
        if (id) return id;
      }
      current = current.parent;
    }
    return undefined;
  };
  const usages: UiUsage[] = [];
  const usageIds = new Set<string>();
  const recordUsage = (
    node: ts.Node,
    symbolNode: ts.Node,
    baseKind: "jsx" | "call",
    propNames: readonly string[],
  ): void => {
    const targetId = componentIdForSymbol(checker.getSymbolAtLocation(symbolNode));
    if (!targetId) return;
    const ownerId = enclosingComponent(node);
    const kind: UiUsage["kind"] = ownerId && ownerId !== targetId ? "composition" : baseKind;
    const path = repositoryPath(node.getSourceFile());
    const id = `usage:${hash(`${targetId}\0${path}\0${node.getStart()}\0${kind}`).slice(0, 20)}`;
    if (usageIds.has(id)) return;
    usageIds.add(id);
    const evidenceId = addEvidence("usage", node, `${targetId}:${kind}`, "ast", "corroborating");
    usages.push({
      id,
      componentId: targetId,
      kind,
      sourcePath: path,
      location: location(node),
      propNames: sortedUnique(propNames),
      evidenceIds: [evidenceId],
    });
    working.get(targetId)?.usageIds.add(id);
    if (ownerId && ownerId !== targetId) working.get(ownerId)?.composedComponentIds.add(targetId);
  };

  for (const sourceFile of sourceFiles) {
    const visit = (node: ts.Node): void => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const names: string[] = [];
        for (const attribute of node.attributes.properties) {
          if (ts.isJsxAttribute(attribute)) names.push(attribute.name.getText(sourceFile));
          else {
            addDiagnostic({
              code: "REACT_JSX_SPREAD_PROPS",
              severity: "info",
              message: `JSX spread props are not expanded at ${repositoryPath(sourceFile)}:${location(attribute).line}.`,
              location: location(attribute),
              limitations: ["The usage lists only statically named props."],
            });
          }
        }
        recordUsage(node, node.tagName, "jsx", names);
      }
      if (ts.isCallExpression(node)) {
        recordUsage(node, node.expression, "call", objectLiteralNames(node.arguments[0]));
      }
      node.forEachChild(visit);
    };
    sourceFile.forEachChild(visit);
  }

  for (const sourceFile of sourceFiles) {
    for (const item of virtual.program.getSyntacticDiagnostics(sourceFile)) {
      const start = item.start ?? 0;
      const nodeLocation = sourceFile.getLineAndCharacterOfPosition(start);
      addDiagnostic({
        code: `TYPESCRIPT_${item.code}`,
        severity: "warning",
        message: ts.flattenDiagnosticMessageText(item.messageText, " "),
        location: {
          path: repositoryPath(sourceFile),
          line: nodeLocation.line + 1,
          column: nodeLocation.character + 1,
        },
        limitations: ["React evidence from malformed syntax may be incomplete."],
      });
    }
  }
  if (diagnosticOverflow) {
    diagnostics.splice(maxDiagnostics - 1, 1, {
      code: "REACT_DIAGNOSTIC_LIMIT",
      severity: "warning",
      message: `React diagnostics were limited to ${maxDiagnostics} records.`,
      limitations: ["Additional unsupported or malformed syntax was omitted."],
    });
  }

  const components = [...working.values()]
    .map(({ value, usageIds: componentUsageIds, composedComponentIds }) => ({
      ...value,
      usageIds: [...componentUsageIds].sort(compareStrings),
      composedComponentIds: [...composedComponentIds].sort(compareStrings),
    }))
    .sort((left, right) => compareStrings(left.id, right.id));

  return {
    components,
    imports: imports.sort((left, right) => compareStrings(left.id, right.id)),
    usages: usages.sort((left, right) => compareStrings(left.id, right.id)),
    evidence: [...evidence.values()].sort((left, right) => compareStrings(left.id, right.id)),
    diagnostics: diagnostics.sort(
      (left, right) =>
        compareStrings(left.code, right.code) ||
        compareStrings(left.location?.path ?? "", right.location?.path ?? "") ||
        compareStrings(left.message, right.message),
    ),
  };
}
