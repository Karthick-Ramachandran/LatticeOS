import { isComponentId, normalizeRepositoryPath, parseComponentId } from "./component-id.js";
import {
  REUSE_INDEX_SCHEMA_VERSION,
  evidenceKinds,
  evidenceMethods,
  type ReuseIndex,
  type SourceLocation,
  type ValidationIssue,
  type ValidationResult,
} from "./types.js";

const evidenceKindSet = new Set<string>(evidenceKinds);
const evidenceMethodSet = new Set<string>(evidenceMethods);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function checkRepositoryPath(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  allowRoot = false,
): value is string {
  if (typeof value !== "string") {
    issues.push({ path, message: "must be a repository-relative POSIX path" });
    return false;
  }

  try {
    if (normalizeRepositoryPath(value, allowRoot) !== value) {
      issues.push({ path, message: "must already be normalized" });
      return false;
    }
  } catch (error) {
    issues.push({ path, message: error instanceof Error ? error.message : "invalid path" });
    return false;
  }

  return true;
}

function checkLocation(value: unknown, path: string, issues: ValidationIssue[]): value is SourceLocation {
  if (!isRecord(value)) {
    issues.push({ path, message: "must be a source location" });
    return false;
  }

  let valid = checkRepositoryPath(value.path, `${path}.path`, issues);
  for (const key of ["line", "column"] as const) {
    if (!isPositiveInteger(value[key])) {
      issues.push({ path: `${path}.${key}`, message: "must be a positive integer" });
      valid = false;
    }
  }
  for (const key of ["endLine", "endColumn"] as const) {
    if (value[key] !== undefined && !isPositiveInteger(value[key])) {
      issues.push({ path: `${path}.${key}`, message: "must be a positive integer when present" });
      valid = false;
    }
  }
  return valid;
}

function checkEvidenceReferences(
  value: unknown,
  path: string,
  evidenceIds: ReadonlySet<string>,
  issues: ValidationIssue[],
  requireOne = false,
): value is string[] {
  if (!isStringArray(value) || (requireOne && value.length === 0)) {
    issues.push({ path, message: requireOne ? "must contain at least one evidence ID" : "must be an array of evidence IDs" });
    return false;
  }

  let valid = true;
  for (const [index, id] of value.entries()) {
    if (!evidenceIds.has(id)) {
      issues.push({ path: `${path}[${index}]`, message: `references unknown evidence '${id}'` });
      valid = false;
    }
  }
  return valid;
}

function collectEvidence(value: unknown, issues: ValidationIssue[]): Set<string> {
  const ids = new Set<string>();
  if (!Array.isArray(value)) {
    issues.push({ path: "evidence", message: "must be an array" });
    return ids;
  }

  for (const [index, item] of value.entries()) {
    const path = `evidence[${index}]`;
    if (!isRecord(item)) {
      issues.push({ path, message: "must be an evidence record" });
      continue;
    }
    if (!isNonEmptyString(item.id)) {
      issues.push({ path: `${path}.id`, message: "must be a non-empty string" });
    } else if (ids.has(item.id)) {
      issues.push({ path: `${path}.id`, message: `duplicates evidence ID '${item.id}'` });
    } else {
      ids.add(item.id);
    }
    if (!isNonEmptyString(item.kind) || !evidenceKindSet.has(item.kind)) {
      issues.push({ path: `${path}.kind`, message: "is not a supported evidence kind" });
    }
    if (!isNonEmptyString(item.method) || !evidenceMethodSet.has(item.method)) {
      issues.push({ path: `${path}.method`, message: "is not a supported evidence method" });
    }
    if (!["exact", "corroborating", "heuristic"].includes(String(item.classification))) {
      issues.push({ path: `${path}.classification`, message: "must be exact, corroborating, or heuristic" });
    }
    if (!isNonEmptyString(item.fingerprint)) {
      issues.push({ path: `${path}.fingerprint`, message: "must be a non-empty string" });
    }
    if (!isStringArray(item.limitations)) {
      issues.push({ path: `${path}.limitations`, message: "must be an array of strings" });
    }
    checkLocation(item.location, `${path}.location`, issues);
  }
  return ids;
}

function checkProject(value: unknown, evidenceIds: ReadonlySet<string>, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path: "project", message: "must be a project record" });
    return;
  }
  if (value.rootPath !== ".") issues.push({ path: "project.rootPath", message: "must be '.'" });
  if (!["pnpm", "npm", "yarn", "bun", "unknown"].includes(String(value.packageManager))) {
    issues.push({ path: "project.packageManager", message: "is not a supported package manager" });
  }
  if (!isRecord(value.tools)) {
    issues.push({ path: "project.tools", message: "must be a tool detection record" });
    return;
  }
  for (const tool of ["react", "nextjs", "typescript", "tailwind", "shadcn", "storybook"] as const) {
    const detection = value.tools[tool];
    const path = `project.tools.${tool}`;
    if (!isRecord(detection)) {
      issues.push({ path, message: "must be a tool detection" });
      continue;
    }
    if (!["present", "absent", "unknown"].includes(String(detection.status))) {
      issues.push({ path: `${path}.status`, message: "must be present, absent, or unknown" });
    }
    checkEvidenceReferences(
      detection.evidenceIds,
      `${path}.evidenceIds`,
      evidenceIds,
      issues,
      detection.status === "present",
    );
  }
}

function checkPackages(value: unknown, evidenceIds: ReadonlySet<string>, issues: ValidationIssue[]): Set<string> {
  const keys = new Set<string>();
  if (!Array.isArray(value)) {
    issues.push({ path: "packages", message: "must be an array" });
    return keys;
  }
  for (const [index, item] of value.entries()) {
    const path = `packages[${index}]`;
    if (!isRecord(item)) {
      issues.push({ path, message: "must be a package record" });
      continue;
    }
    if (!isNonEmptyString(item.key)) {
      issues.push({ path: `${path}.key`, message: "must be a non-empty string" });
    } else if (keys.has(item.key)) {
      issues.push({ path: `${path}.key`, message: `duplicates package key '${item.key}'` });
    } else {
      keys.add(item.key);
    }
    if (item.name !== undefined && !isNonEmptyString(item.name)) {
      issues.push({ path: `${path}.name`, message: "must be a non-empty string when present" });
    }
    checkRepositoryPath(item.rootPath, `${path}.rootPath`, issues, true);
    if (item.manifestPath !== undefined) checkRepositoryPath(item.manifestPath, `${path}.manifestPath`, issues);
    checkEvidenceReferences(item.evidenceIds, `${path}.evidenceIds`, evidenceIds, issues);
  }
  return keys;
}

function checkComponents(
  value: unknown,
  packageKeys: ReadonlySet<string>,
  evidenceIds: ReadonlySet<string>,
  issues: ValidationIssue[],
): Set<string> {
  const ids = new Set<string>();
  if (!Array.isArray(value)) {
    issues.push({ path: "components", message: "must be an array" });
    return ids;
  }
  for (const [index, item] of value.entries()) {
    const path = `components[${index}]`;
    if (!isRecord(item)) {
      issues.push({ path, message: "must be a component record" });
      continue;
    }
    if (!isNonEmptyString(item.id) || !isComponentId(item.id)) {
      issues.push({ path: `${path}.id`, message: "must be a canonical component ID" });
    } else if (ids.has(item.id)) {
      issues.push({ path: `${path}.id`, message: `duplicates component ID '${item.id}'` });
    } else {
      ids.add(item.id);
      const identity = parseComponentId(item.id);
      if (
        identity &&
        (identity.packageKey !== item.packageKey ||
          identity.sourcePath !== item.sourcePath ||
          identity.exportKey !== item.exportKey)
      ) {
        issues.push({ path, message: "component identity fields do not match its ID" });
      }
    }
    if (!isNonEmptyString(item.packageKey) || !packageKeys.has(item.packageKey)) {
      issues.push({ path: `${path}.packageKey`, message: "must reference a known package" });
    }
    checkRepositoryPath(item.sourcePath, `${path}.sourcePath`, issues);
    for (const key of ["exportKey", "displayName"] as const) {
      if (!isNonEmptyString(item[key])) issues.push({ path: `${path}.${key}`, message: "must be a non-empty string" });
    }
    if (!["public", "local"].includes(String(item.visibility))) {
      issues.push({ path: `${path}.visibility`, message: "must be public or local" });
    }
    if (item.visibility === "local" && isNonEmptyString(item.exportKey) && !item.exportKey.startsWith("local:")) {
      issues.push({ path: `${path}.exportKey`, message: "a local component export key must start with 'local:'" });
    }
    if (item.visibility === "public" && isNonEmptyString(item.exportKey) && item.exportKey.startsWith("local:")) {
      issues.push({ path: `${path}.exportKey`, message: "a public component cannot use a local export key" });
    }
    if (!Array.isArray(item.props)) {
      issues.push({ path: `${path}.props`, message: "must be an array" });
    } else {
      for (const [propIndex, prop] of item.props.entries()) {
        const propPath = `${path}.props[${propIndex}]`;
        if (!isRecord(prop)) {
          issues.push({ path: propPath, message: "must be a prop record" });
          continue;
        }
        if (!isNonEmptyString(prop.name)) issues.push({ path: `${propPath}.name`, message: "must be a non-empty string" });
        if (!isNonEmptyString(prop.type)) issues.push({ path: `${propPath}.type`, message: "must be a non-empty string" });
        if (typeof prop.required !== "boolean") issues.push({ path: `${propPath}.required`, message: "must be a boolean" });
        if (typeof prop.defaulted !== "boolean") issues.push({ path: `${propPath}.defaulted`, message: "must be a boolean" });
        if (!isStringArray(prop.variants)) issues.push({ path: `${propPath}.variants`, message: "must be an array of strings" });
        checkEvidenceReferences(prop.evidenceIds, `${propPath}.evidenceIds`, evidenceIds, issues, true);
      }
    }
    if (!isStringArray(item.composedComponentIds) || !item.composedComponentIds.every(isComponentId)) {
      issues.push({ path: `${path}.composedComponentIds`, message: "must be an array of component IDs" });
    }
    if (!isStringArray(item.usageIds)) issues.push({ path: `${path}.usageIds`, message: "must be an array of usage IDs" });
    checkEvidenceReferences(item.evidenceIds, `${path}.evidenceIds`, evidenceIds, issues, true);
  }
  return ids;
}

function checkImports(
  value: unknown,
  componentIds: ReadonlySet<string>,
  evidenceIds: ReadonlySet<string>,
  issues: ValidationIssue[],
): void {
  if (!Array.isArray(value)) {
    issues.push({ path: "imports", message: "must be an array" });
    return;
  }
  const ids = new Set<string>();
  for (const [index, item] of value.entries()) {
    const path = `imports[${index}]`;
    if (!isRecord(item)) {
      issues.push({ path, message: "must be an import record" });
      continue;
    }
    for (const key of ["id", "source", "importedName", "localName"] as const) {
      if (!isNonEmptyString(item[key])) issues.push({ path: `${path}.${key}`, message: "must be a non-empty string" });
    }
    if (isNonEmptyString(item.id)) {
      if (ids.has(item.id)) issues.push({ path: `${path}.id`, message: `duplicates import ID '${item.id}'` });
      ids.add(item.id);
    }
    checkRepositoryPath(item.importerPath, `${path}.importerPath`, issues);
    if (typeof item.typeOnly !== "boolean") issues.push({ path: `${path}.typeOnly`, message: "must be a boolean" });
    if (item.resolvedComponentId !== undefined && !componentIds.has(String(item.resolvedComponentId))) {
      issues.push({ path: `${path}.resolvedComponentId`, message: "must reference a known component when present" });
    }
    checkLocation(item.location, `${path}.location`, issues);
    checkEvidenceReferences(item.evidenceIds, `${path}.evidenceIds`, evidenceIds, issues, true);
  }
}

function checkUsages(
  value: unknown,
  componentIds: ReadonlySet<string>,
  evidenceIds: ReadonlySet<string>,
  issues: ValidationIssue[],
): Set<string> {
  const ids = new Set<string>();
  if (!Array.isArray(value)) {
    issues.push({ path: "usages", message: "must be an array" });
    return ids;
  }
  for (const [index, item] of value.entries()) {
    const path = `usages[${index}]`;
    if (!isRecord(item)) {
      issues.push({ path, message: "must be a usage record" });
      continue;
    }
    if (!isNonEmptyString(item.id)) {
      issues.push({ path: `${path}.id`, message: "must be a non-empty string" });
    } else {
      if (ids.has(item.id)) issues.push({ path: `${path}.id`, message: `duplicates usage ID '${item.id}'` });
      ids.add(item.id);
    }
    if (!isNonEmptyString(item.componentId) || !componentIds.has(item.componentId)) {
      issues.push({ path: `${path}.componentId`, message: "must reference a known component" });
    }
    if (!["jsx", "call", "composition"].includes(String(item.kind))) {
      issues.push({ path: `${path}.kind`, message: "must be jsx, call, or composition" });
    }
    checkRepositoryPath(item.sourcePath, `${path}.sourcePath`, issues);
    checkLocation(item.location, `${path}.location`, issues);
    if (!isStringArray(item.propNames)) issues.push({ path: `${path}.propNames`, message: "must be an array of strings" });
    checkEvidenceReferences(item.evidenceIds, `${path}.evidenceIds`, evidenceIds, issues, true);
  }
  return ids;
}

function checkComponentLinks(
  value: unknown,
  componentIds: ReadonlySet<string>,
  usageIds: ReadonlySet<string>,
  issues: ValidationIssue[],
): void {
  if (!Array.isArray(value)) return;
  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) continue;
    if (isStringArray(item.composedComponentIds)) {
      for (const [linkIndex, id] of item.composedComponentIds.entries()) {
        if (!componentIds.has(id)) {
          issues.push({
            path: `components[${index}].composedComponentIds[${linkIndex}]`,
            message: `references unknown component '${id}'`,
          });
        }
      }
    }
    if (isStringArray(item.usageIds)) {
      for (const [linkIndex, id] of item.usageIds.entries()) {
        if (!usageIds.has(id)) {
          issues.push({
            path: `components[${index}].usageIds[${linkIndex}]`,
            message: `references unknown usage '${id}'`,
          });
        }
      }
    }
  }
}

function checkTailwind(value: unknown, evidenceIds: ReadonlySet<string>, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path: "tailwind", message: "must be a Tailwind evidence record" });
    return;
  }
  if (!Array.isArray(value.tokens)) {
    issues.push({ path: "tailwind.tokens", message: "must be an array" });
  } else {
    for (const [index, token] of value.tokens.entries()) {
      const path = `tailwind.tokens[${index}]`;
      if (!isRecord(token)) {
        issues.push({ path, message: "must be a token record" });
        continue;
      }
      if (!isNonEmptyString(token.name)) issues.push({ path: `${path}.name`, message: "must be a non-empty string" });
      if (typeof token.value !== "string") issues.push({ path: `${path}.value`, message: "must be a string" });
      checkRepositoryPath(token.sourcePath, `${path}.sourcePath`, issues);
      checkEvidenceReferences(token.evidenceIds, `${path}.evidenceIds`, evidenceIds, issues, true);
    }
  }
  if (!Array.isArray(value.repeatedClassBundles)) {
    issues.push({ path: "tailwind.repeatedClassBundles", message: "must be an array" });
  } else {
    for (const [index, bundle] of value.repeatedClassBundles.entries()) {
      const path = `tailwind.repeatedClassBundles[${index}]`;
      if (!isRecord(bundle)) {
        issues.push({ path, message: "must be a class bundle record" });
        continue;
      }
      if (!isStringArray(bundle.classes) || bundle.classes.length === 0) {
        issues.push({ path: `${path}.classes`, message: "must contain at least one class" });
      }
      if (!isPositiveInteger(bundle.count)) issues.push({ path: `${path}.count`, message: "must be a positive integer" });
      if (!Array.isArray(bundle.locations)) {
        issues.push({ path: `${path}.locations`, message: "must be an array" });
      } else {
        bundle.locations.forEach((location, locationIndex) => checkLocation(location, `${path}.locations[${locationIndex}]`, issues));
        if (isPositiveInteger(bundle.count) && bundle.count !== bundle.locations.length) {
          issues.push({ path: `${path}.count`, message: "must equal the number of recorded locations" });
        }
      }
      checkEvidenceReferences(bundle.evidenceIds, `${path}.evidenceIds`, evidenceIds, issues, true);
    }
  }
}

function checkDiagnostics(value: unknown, issues: ValidationIssue[]): void {
  if (!Array.isArray(value)) {
    issues.push({ path: "diagnostics", message: "must be an array" });
    return;
  }
  for (const [index, item] of value.entries()) {
    const path = `diagnostics[${index}]`;
    if (!isRecord(item)) {
      issues.push({ path, message: "must be a diagnostic record" });
      continue;
    }
    if (!isNonEmptyString(item.code)) issues.push({ path: `${path}.code`, message: "must be a non-empty string" });
    if (!["info", "warning", "error"].includes(String(item.severity))) {
      issues.push({ path: `${path}.severity`, message: "must be info, warning, or error" });
    }
    if (!isNonEmptyString(item.message)) issues.push({ path: `${path}.message`, message: "must be a non-empty string" });
    if (!isStringArray(item.limitations)) issues.push({ path: `${path}.limitations`, message: "must be an array of strings" });
    if (item.location !== undefined) checkLocation(item.location, `${path}.location`, issues);
  }
}

export function validateReuseIndex(value: unknown): ValidationResult<ReuseIndex> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) return { ok: false, issues: [{ path: "$", message: "must be an object" }] };

  if (value.schemaVersion !== REUSE_INDEX_SCHEMA_VERSION) {
    issues.push({ path: "schemaVersion", message: `must equal ${REUSE_INDEX_SCHEMA_VERSION}` });
  }
  if (!isRecord(value.generator) || value.generator.name !== "lattice" || !isNonEmptyString(value.generator.version)) {
    issues.push({ path: "generator", message: "must identify lattice with a non-empty version" });
  }

  const evidenceIds = collectEvidence(value.evidence, issues);
  checkProject(value.project, evidenceIds, issues);
  const packageKeys = checkPackages(value.packages, evidenceIds, issues);
  const componentIds = checkComponents(value.components, packageKeys, evidenceIds, issues);
  checkImports(value.imports, componentIds, evidenceIds, issues);
  const usageIds = checkUsages(value.usages, componentIds, evidenceIds, issues);
  checkComponentLinks(value.components, componentIds, usageIds, issues);
  checkTailwind(value.tailwind, evidenceIds, issues);
  checkDiagnostics(value.diagnostics, issues);

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, value: value as unknown as ReuseIndex };
}

export class ReuseIndexValidationError extends Error {
  readonly issues: readonly ValidationIssue[];

  constructor(issues: readonly ValidationIssue[]) {
    super(`Invalid Reuse index:\n${issues.map((issue) => `- ${issue.path}: ${issue.message}`).join("\n")}`);
    this.name = "ReuseIndexValidationError";
    this.issues = issues;
  }
}

export function assertReuseIndex(value: unknown): asserts value is ReuseIndex {
  const result = validateReuseIndex(value);
  if (!result.ok) throw new ReuseIndexValidationError(result.issues);
}
