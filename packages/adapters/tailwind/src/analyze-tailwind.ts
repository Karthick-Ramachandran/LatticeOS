import { createHash } from "node:crypto";

import {
  compareStrings,
  normalizeRepositoryPath,
  type AnalysisDiagnostic,
  type EvidenceRecord,
  type SourceLocation,
  type TailwindClassBundle,
  type TailwindToken,
} from "@latticeos/core";

import type { TailwindAnalysis, TailwindAnalysisInput, TailwindSourceInput } from "./types.js";

interface StaticClassOccurrence {
  readonly classes: readonly string[];
  readonly original: string;
  readonly location: SourceLocation;
  readonly evidenceId: string;
}

interface QuotedValue {
  readonly value: string;
  readonly end: number;
  readonly dynamic: boolean;
}

interface ConfigObject {
  readonly kind: "object";
  readonly entries: readonly ConfigEntry[];
}

interface ConfigLiteral {
  readonly kind: "literal";
  readonly value: string;
}

interface ConfigDynamic {
  readonly kind: "dynamic";
}

type ConfigValue = ConfigObject | ConfigLiteral | ConfigDynamic;

interface ConfigEntry {
  readonly key: string;
  readonly start: number;
  readonly value: ConfigValue;
}

const knownMergeNames = new Set(["cn", "clsx", "classnames"]);
const sourceKinds = new Set<TailwindSourceInput["kind"]>(["css", "config", "source"]);

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function skipTrivia(content: string, start: number): number {
  let cursor = start;
  while (cursor < content.length) {
    if (/\s/u.test(content[cursor] ?? "")) {
      cursor += 1;
      continue;
    }
    if (content.startsWith("//", cursor)) {
      const lineEnd = content.indexOf("\n", cursor + 2);
      cursor = lineEnd === -1 ? content.length : lineEnd + 1;
      continue;
    }
    if (content.startsWith("/*", cursor)) {
      const commentEnd = content.indexOf("*/", cursor + 2);
      cursor = commentEnd === -1 ? content.length : commentEnd + 2;
      continue;
    }
    break;
  }
  return cursor;
}

function readQuoted(content: string, start: number): QuotedValue | undefined {
  const quote = content[start];
  if (quote !== "'" && quote !== '"' && quote !== "`") return undefined;
  let cursor = start + 1;
  let dynamic = false;
  while (cursor < content.length) {
    const character = content[cursor] ?? "";
    if (character === "\\") {
      cursor += 2;
      continue;
    }
    if (quote === "`" && content.startsWith("${", cursor)) dynamic = true;
    if (character === quote) {
      return { value: content.slice(start + 1, cursor), end: cursor + 1, dynamic };
    }
    cursor += 1;
  }
  return undefined;
}

function codeMask(content: string): readonly boolean[] {
  const mask = Array.from({ length: content.length }, () => true);
  let cursor = 0;
  while (cursor < content.length) {
    if (content.startsWith("//", cursor)) {
      const end = content.indexOf("\n", cursor + 2);
      const stop = end === -1 ? content.length : end;
      mask.fill(false, cursor, stop);
      cursor = stop;
      continue;
    }
    if (content.startsWith("/*", cursor)) {
      const end = content.indexOf("*/", cursor + 2);
      const stop = end === -1 ? content.length : end + 2;
      mask.fill(false, cursor, stop);
      cursor = stop;
      continue;
    }
    const quoted = readQuoted(content, cursor);
    if (quoted) {
      mask.fill(false, cursor, quoted.end);
      cursor = quoted.end;
      continue;
    }
    cursor += 1;
  }
  return mask;
}

function findMatching(content: string, start: number, opening: string, closing: string): number | undefined {
  if (content[start] !== opening) return undefined;
  let depth = 0;
  for (let cursor = start; cursor < content.length; cursor += 1) {
    const quoted = readQuoted(content, cursor);
    if (quoted) {
      cursor = quoted.end - 1;
      continue;
    }
    if (content.startsWith("//", cursor)) {
      const lineEnd = content.indexOf("\n", cursor + 2);
      cursor = lineEnd === -1 ? content.length : lineEnd;
      continue;
    }
    if (content.startsWith("/*", cursor)) {
      const commentEnd = content.indexOf("*/", cursor + 2);
      cursor = commentEnd === -1 ? content.length : commentEnd + 1;
      continue;
    }
    if (content[cursor] === opening) depth += 1;
    if (content[cursor] === closing) {
      depth -= 1;
      if (depth === 0) return cursor;
    }
  }
  return undefined;
}

function location(source: TailwindSourceInput, start: number, end = start + 1): SourceLocation {
  const before = source.content.slice(0, start);
  const throughEnd = source.content.slice(0, end);
  const line = before.split("\n").length;
  const column = before.length - before.lastIndexOf("\n");
  const endLine = throughEnd.split("\n").length;
  const endColumn = throughEnd.length - throughEnd.lastIndexOf("\n");
  return { path: source.path, line, column, endLine, endColumn };
}

function normalizedClasses(value: string): string[] {
  return value
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .sort(compareStrings);
}

function readExpressionString(content: string, start: number, end: number): QuotedValue | undefined {
  const expressionStart = skipTrivia(content, start);
  const quoted = readQuoted(content, expressionStart);
  if (!quoted || quoted.dynamic) return undefined;
  return skipTrivia(content, quoted.end) === end ? quoted : undefined;
}

function splitCallArguments(content: string, start: number, end: number): readonly { readonly start: number; readonly end: number }[] {
  const values: { start: number; end: number }[] = [];
  let valueStart = start;
  let depth = 0;
  for (let cursor = start; cursor < end; cursor += 1) {
    const quoted = readQuoted(content, cursor);
    if (quoted) {
      cursor = quoted.end - 1;
      continue;
    }
    const character = content[cursor];
    if (character === "(" || character === "[" || character === "{") depth += 1;
    if (character === ")" || character === "]" || character === "}") depth -= 1;
    if (character === "," && depth === 0) {
      values.push({ start: valueStart, end: cursor });
      valueStart = cursor + 1;
    }
  }
  if (valueStart < end || values.length > 0) values.push({ start: valueStart, end });
  return values;
}

function readConfigKey(content: string, start: number): { readonly key: string; readonly end: number } | undefined {
  const quoted = readQuoted(content, start);
  if (quoted && !quoted.dynamic) return { key: quoted.value, end: quoted.end };
  const match = /^[A-Za-z_$][A-Za-z0-9_$-]*/u.exec(content.slice(start));
  if (!match?.[0]) return undefined;
  return { key: match[0], end: start + match[0].length };
}

function skipConfigValue(content: string, start: number): number {
  let cursor = start;
  let depth = 0;
  while (cursor < content.length) {
    const quoted = readQuoted(content, cursor);
    if (quoted) {
      cursor = quoted.end;
      continue;
    }
    const character = content[cursor];
    if (character === "(" || character === "[" || character === "{") depth += 1;
    if (character === ")" || character === "]" || character === "}") {
      if (depth === 0) return cursor;
      depth -= 1;
    }
    if (character === "," && depth === 0) return cursor;
    cursor += 1;
  }
  return cursor;
}

function parseConfigValue(content: string, start: number): { readonly value: ConfigValue; readonly end: number } {
  const cursor = skipTrivia(content, start);
  if (content[cursor] === "{") return parseConfigObject(content, cursor);
  const quoted = readQuoted(content, cursor);
  if (quoted) {
    return {
      value: quoted.dynamic ? { kind: "dynamic" } : { kind: "literal", value: quoted.value },
      end: quoted.end,
    };
  }
  const number = /^[+-]?(?:\d+\.?\d*|\.\d+)/u.exec(content.slice(cursor));
  if (number?.[0]) return { value: { kind: "literal", value: number[0] }, end: cursor + number[0].length };
  return { value: { kind: "dynamic" }, end: skipConfigValue(content, cursor) };
}

function parseConfigObject(content: string, start: number): { readonly value: ConfigObject; readonly end: number } {
  const entries: ConfigEntry[] = [];
  let cursor = start + 1;
  while (cursor < content.length) {
    cursor = skipTrivia(content, cursor);
    if (content[cursor] === "}") return { value: { kind: "object", entries }, end: cursor + 1 };
    const entryStart = cursor;
    const key = readConfigKey(content, cursor);
    if (!key) {
      cursor = skipConfigValue(content, cursor);
      if (content[cursor] === ",") cursor += 1;
      continue;
    }
    cursor = skipTrivia(content, key.end);
    if (content[cursor] !== ":") {
      entries.push({ key: key.key, start: entryStart, value: { kind: "dynamic" } });
      cursor = skipConfigValue(content, cursor);
      if (content[cursor] === ",") cursor += 1;
      continue;
    }
    const parsed = parseConfigValue(content, cursor + 1);
    entries.push({ key: key.key, start: entryStart, value: parsed.value });
    cursor = skipTrivia(content, parsed.end);
    if (content[cursor] === ",") cursor += 1;
  }
  return { value: { kind: "object", entries }, end: cursor };
}

function findThemeObject(content: string): { readonly value: ConfigObject; readonly start: number } | undefined {
  const match = /(?:\btheme|["']theme["'])\s*:\s*\{/gu.exec(content);
  if (!match) return undefined;
  const start = content.indexOf("{", match.index);
  if (start < 0) return undefined;
  const parsed = parseConfigObject(content, start);
  return { value: parsed.value, start };
}

export function analyzeTailwind(input: TailwindAnalysisInput): TailwindAnalysis {
  const repeatedBundleThreshold = input.repeatedBundleThreshold ?? 2;
  const maxDiagnostics = input.maxDiagnostics ?? 100;
  if (!Number.isInteger(repeatedBundleThreshold) || repeatedBundleThreshold < 2 || repeatedBundleThreshold > 1_000) {
    throw new Error("Tailwind repeatedBundleThreshold must be an integer between 2 and 1000");
  }
  if (!Number.isInteger(maxDiagnostics) || maxDiagnostics < 1 || maxDiagnostics > 1_000) {
    throw new Error("Tailwind maxDiagnostics must be an integer between 1 and 1000");
  }

  const sources: TailwindSourceInput[] = [];
  const knownPaths = new Set<string>();
  for (const source of input.sources) {
    const path = normalizeRepositoryPath(source.path);
    if (path !== source.path) throw new Error(`Tailwind source path must be normalized: ${source.path}`);
    if (!sourceKinds.has(source.kind)) throw new Error(`Unsupported Tailwind source kind: ${source.kind}`);
    if (knownPaths.has(path)) throw new Error(`Tailwind source path is duplicated: ${path}`);
    knownPaths.add(path);
    sources.push(source);
  }
  sources.sort((left, right) => compareStrings(left.path, right.path));

  const evidence = new Map<string, EvidenceRecord>();
  const diagnostics: AnalysisDiagnostic[] = [];
  let diagnosticOverflow = false;
  const addDiagnostic = (item: AnalysisDiagnostic): void => {
    if (diagnostics.length < maxDiagnostics) diagnostics.push(item);
    else diagnosticOverflow = true;
  };
  const addEvidence = (
    source: TailwindSourceInput,
    kind: EvidenceRecord["kind"],
    start: number,
    end: number,
    label: string,
    method: EvidenceRecord["method"],
    classification: EvidenceRecord["classification"] = "exact",
    limitations: readonly string[] = [],
  ): string => {
    const id = `ev:tailwind:${kind}:${hash(`${source.path}\0${start}\0${label}`).slice(0, 20)}`;
    if (!evidence.has(id)) {
      evidence.set(id, {
        id,
        kind,
        location: location(source, start, end),
        method,
        classification,
        fingerprint: `sha256:${hash(source.content)}`,
        limitations,
      });
    }
    return id;
  };

  const tokens: TailwindToken[] = [];
  const occurrences: StaticClassOccurrence[] = [];
  const addOccurrence = (
    source: TailwindSourceInput,
    original: string,
    start: number,
    end: number,
    classification: EvidenceRecord["classification"] = "exact",
    limitations: readonly string[] = [],
  ): void => {
    const classes = normalizedClasses(original);
    if (classes.length === 0) return;
    const evidenceId = addEvidence(source, "class-bundle", start, end, original, "static-source", classification, limitations);
    occurrences.push({ classes, original, location: location(source, start, end), evidenceId });
  };

  for (const source of sources) {
    if (source.kind === "css") {
      const themePattern = /@theme(?:\s+[A-Za-z-]+)*\s*\{/gu;
      for (const match of source.content.matchAll(themePattern)) {
        const start = (match.index ?? 0) + match[0].lastIndexOf("{");
        const end = findMatching(source.content, start, "{", "}");
        if (end === undefined) {
          addDiagnostic({
            code: "TAILWIND_THEME_BLOCK_UNTERMINATED",
            severity: "warning",
            message: `Skipped unterminated @theme block in ${source.path}.`,
            location: location(source, start),
            limitations: ["Theme tokens from this block are unavailable."],
          });
          continue;
        }
        const body = source.content.slice(start + 1, end);
        const declarations = /(--[A-Za-z0-9_-]+)\s*:\s*([^;{}]+);/gu;
        for (const declaration of body.matchAll(declarations)) {
          const name = declaration[1] ?? "";
          const value = (declaration[2] ?? "").trim();
          if (!name || !value) continue;
          const declarationStart = start + 1 + (declaration.index ?? 0);
          const evidenceId = addEvidence(source, "token", declarationStart, declarationStart + name.length, name, "css");
          tokens.push({ name, value, sourcePath: source.path, evidenceIds: [evidenceId] });
        }
      }
    }

    if (source.kind === "config") {
      const theme = findThemeObject(source.content);
      if (theme) {
        const visit = (object: ConfigObject, prefix: readonly string[]): void => {
          for (const entry of [...object.entries].sort((left, right) => compareStrings(left.key, right.key))) {
            const nextPrefix = entry.key === "extend" ? prefix : [...prefix, entry.key];
            if (entry.value.kind === "object") {
              visit(entry.value, nextPrefix);
              continue;
            }
            if (entry.value.kind === "literal") {
              if (nextPrefix.length === 0) continue;
              const name = nextPrefix.join(".");
              const evidenceId = addEvidence(source, "token", entry.start, entry.start + entry.key.length, name, "static-config");
              tokens.push({ name, value: entry.value.value, sourcePath: source.path, evidenceIds: [evidenceId] });
              continue;
            }
            addDiagnostic({
              code: "TAILWIND_CONFIG_DYNAMIC_VALUE",
              severity: "info",
              message: `Skipped dynamic Tailwind theme value '${nextPrefix.join(".")}' in ${source.path}.`,
              location: location(source, entry.start),
              limitations: ["Only static string and numeric theme values are indexed."],
            });
          }
        };
        visit(theme.value, []);
      }
    }

    if (source.kind === "source") {
      const mask = codeMask(source.content);
      const classNamePattern = /\bclassName\s*=/gu;
      for (const match of source.content.matchAll(classNamePattern)) {
        const attributeStart = match.index ?? 0;
        if (!mask[attributeStart]) continue;
        const valueStart = skipTrivia(source.content, attributeStart + match[0].length);
        const quoted = readQuoted(source.content, valueStart);
        if (quoted && !quoted.dynamic) {
          addOccurrence(source, quoted.value, valueStart, quoted.end);
          continue;
        }
        if (source.content[valueStart] === "{") {
          const expressionEnd = findMatching(source.content, valueStart, "{", "}");
          if (expressionEnd !== undefined) {
            const literal = readExpressionString(source.content, valueStart + 1, expressionEnd);
            if (literal) {
              addOccurrence(source, literal.value, valueStart, expressionEnd + 1);
              continue;
            }
            const expression = source.content.slice(valueStart + 1, expressionEnd).trim();
            if ([...knownMergeNames].some((name) => new RegExp(`^${name}\\s*\\(`, "u").test(expression))) continue;
          }
        }
        addDiagnostic({
          code: "TAILWIND_CLASSNAME_DYNAMIC",
          severity: "info",
          message: `Skipped dynamic className expression in ${source.path}.`,
          location: location(source, attributeStart),
          limitations: ["Only literal className strings are indexed."],
        });
      }

      const mergePattern = /(?:^|[^A-Za-z0-9_$\.])(cn|clsx|classnames)\s*\(/gu;
      for (const match of source.content.matchAll(mergePattern)) {
        const name = match[1] ?? "";
        if (!knownMergeNames.has(name)) continue;
        const opening = (match.index ?? 0) + match[0].lastIndexOf("(");
        const nameStart = (match.index ?? 0) + match[0].lastIndexOf(name);
        if (!mask[nameStart]) continue;
        const closing = findMatching(source.content, opening, "(", ")");
        if (closing === undefined) {
          addDiagnostic({
            code: "TAILWIND_MERGE_UNTERMINATED",
            severity: "warning",
            message: `Skipped unterminated ${name} call in ${source.path}.`,
            location: location(source, opening),
            limitations: ["Static class arguments from this call are unavailable."],
          });
          continue;
        }
        const strings: string[] = [];
        let dynamic = false;
        for (const argument of splitCallArguments(source.content, opening + 1, closing)) {
          const literal = readExpressionString(source.content, argument.start, argument.end);
          if (!literal) {
            dynamic = true;
            break;
          }
          strings.push(literal.value);
        }
        if (!dynamic && strings.length > 0) {
          addOccurrence(
            source,
            strings.join(" "),
            opening,
            closing + 1,
            "heuristic",
            ["The known merge-helper name was matched statically; its import was not resolved."],
          );
          continue;
        }
        addDiagnostic({
          code: "TAILWIND_MERGE_DYNAMIC",
          severity: "info",
          message: `Skipped ${name} call with dynamic or unsupported arguments in ${source.path}.`,
          location: location(source, opening),
          limitations: ["Only merge calls whose arguments are all static strings are indexed as bundles."],
        });
      }
    }
  }

  if (diagnosticOverflow) {
    diagnostics.splice(maxDiagnostics - 1, 1, {
      code: "TAILWIND_DIAGNOSTIC_LIMIT",
      severity: "warning",
      message: `Tailwind diagnostics were limited to ${maxDiagnostics} records.`,
      limitations: ["Additional unsupported static-analysis cases were omitted."],
    });
  }

  const grouped = new Map<string, StaticClassOccurrence[]>();
  for (const occurrence of occurrences) {
    const key = occurrence.classes.join("\0");
    const values = grouped.get(key) ?? [];
    values.push(occurrence);
    grouped.set(key, values);
  }
  const repeatedClassBundles: TailwindClassBundle[] = [...grouped.values()]
    .filter((group) => group.length >= repeatedBundleThreshold)
    .map((group) => {
      const sorted = [...group].sort(
        (left, right) =>
          compareStrings(left.location.path, right.location.path) ||
          left.location.line - right.location.line ||
          left.location.column - right.location.column,
      );
      return {
        classes: sorted[0]?.classes ?? [],
        originals: sorted.map((occurrence) => occurrence.original),
        count: sorted.length,
        locations: sorted.map((occurrence) => occurrence.location),
        evidenceIds: sorted.map((occurrence) => occurrence.evidenceId).sort(compareStrings),
      };
    })
    .sort((left, right) => compareStrings(left.classes.join(" "), right.classes.join(" ")));

  return {
    tailwind: {
      tokens: tokens.sort(
        (left, right) => compareStrings(left.name, right.name) || compareStrings(left.sourcePath, right.sourcePath),
      ),
      repeatedClassBundles,
    },
    evidence: [...evidence.values()].sort((left, right) => compareStrings(left.id, right.id)),
    diagnostics: diagnostics.sort(
      (left, right) =>
        compareStrings(left.code, right.code) ||
        compareStrings(left.location?.path ?? "", right.location?.path ?? "") ||
        compareStrings(left.message, right.message),
    ),
  };
}
