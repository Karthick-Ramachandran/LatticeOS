import { compareStrings, sortedUnique } from "./stable.js";
import type {
  EvidenceRecord,
  RecommendationReason,
  ReuseIndex,
  ReuseRecommendation,
  UiComponent,
} from "./types.js";

function tokenize(value: string): string[] {
  const splitCamelCase = value.replace(/([a-z0-9])([A-Z])/gu, "$1 $2");
  return sortedUnique(splitCamelCase.toLocaleLowerCase("en-US").split(/[^a-z0-9]+/u).filter(Boolean));
}

function matchedTokens(queryTokens: readonly string[], value: string): string[] {
  const target = new Set(tokenize(value));
  return queryTokens.filter((token) => target.has(token));
}

function reason(
  code: RecommendationReason["code"],
  score: number,
  message: string,
  evidenceIds: readonly string[],
  knownEvidence: ReadonlyMap<string, EvidenceRecord>,
): RecommendationReason | undefined {
  const supported = sortedUnique(evidenceIds).filter((id) => knownEvidence.has(id));
  if (supported.length === 0) return undefined;
  return { code, score, message, evidenceIds: supported };
}

function rankComponent(
  index: ReuseIndex,
  component: UiComponent,
  query: string,
  queryTokens: readonly string[],
  knownEvidence: ReadonlyMap<string, EvidenceRecord>,
): ReuseRecommendation | undefined {
  const reasons: RecommendationReason[] = [];
  const normalizedName = component.displayName.toLocaleLowerCase("en-US");
  const normalizedQuery = query.toLocaleLowerCase("en-US").trim();

  if (normalizedName === normalizedQuery) {
    const item = reason("name-exact", 100, `Exact component name '${component.displayName}'`, component.evidenceIds, knownEvidence);
    if (item) reasons.push(item);
  } else {
    const tokens = matchedTokens(queryTokens, component.displayName);
    if (tokens.length > 0) {
      const item = reason(
        "name-token",
        tokens.length * 30,
        `Component name matches: ${tokens.join(", ")}`,
        component.evidenceIds,
        knownEvidence,
      );
      if (item) reasons.push(item);
    }
  }

  const pathTokens = matchedTokens(queryTokens, component.sourcePath);
  if (pathTokens.length > 0) {
    const item = reason(
      "path-token",
      pathTokens.length * 12,
      `Source path matches: ${pathTokens.join(", ")}`,
      component.evidenceIds,
      knownEvidence,
    );
    if (item) reasons.push(item);
  }

  const matchingProps = component.props.filter((prop) => matchedTokens(queryTokens, prop.name).length > 0);
  if (matchingProps.length > 0) {
    const item = reason(
      "prop-token",
      matchingProps.length * 8,
      `Declared props match: ${matchingProps.map((prop) => prop.name).sort(compareStrings).join(", ")}`,
      matchingProps.flatMap((prop) => prop.evidenceIds),
      knownEvidence,
    );
    if (item) reasons.push(item);
  }

  const matchingUsages = index.usages.filter(
    (usage) => usage.componentId === component.id && matchedTokens(queryTokens, usage.sourcePath).length > 0,
  );
  if (matchingUsages.length > 0) {
    const item = reason(
      "usage-path-token",
      Math.min(matchingUsages.length, 5) * 6,
      `${matchingUsages.length} usage path${matchingUsages.length === 1 ? "" : "s"} match the query`,
      matchingUsages.flatMap((usage) => usage.evidenceIds),
      knownEvidence,
    );
    if (item) reasons.push(item);
  }

  if (reasons.length === 0) return undefined;
  const sortedReasons = reasons.sort(
    (left, right) => right.score - left.score || compareStrings(left.code, right.code) || compareStrings(left.message, right.message),
  );
  return {
    componentId: component.id,
    displayName: component.displayName,
    sourcePath: component.sourcePath,
    score: sortedReasons.reduce((total, item) => total + item.score, 0),
    reasons: sortedReasons,
  };
}

export interface RankOptions {
  readonly limit?: number;
}

export function rankReuseCandidates(index: ReuseIndex, query: string, options: RankOptions = {}): ReuseRecommendation[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) throw new Error("Search query must contain at least one letter or number");
  const limit = options.limit ?? 20;
  if (!Number.isInteger(limit) || limit < 1) throw new Error("Search limit must be a positive integer");

  const knownEvidence = new Map(index.evidence.map((item) => [item.id, item]));
  return index.components
    .filter((component) => component.visibility === "public")
    .map((component) => rankComponent(index, component, query, queryTokens, knownEvidence))
    .filter((item): item is ReuseRecommendation => item !== undefined)
    .sort((left, right) => right.score - left.score || compareStrings(left.componentId, right.componentId))
    .slice(0, limit);
}
