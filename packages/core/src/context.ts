import { rankReuseCandidates } from "./search.js";
import { sortedUnique } from "./stable.js";
import { REUSE_CONTEXT_SCHEMA_VERSION, type ReuseContext, type ReuseContextItem, type ReuseIndex } from "./types.js";

export interface ContextBudget {
  readonly maxItems: number;
  readonly maxCharacters: number;
}

function renderItem(item: ReuseContextItem): string {
  const evidenceIds = sortedUnique(item.recommendation.reasons.flatMap((reason) => reason.evidenceIds));
  return [
    `${item.recommendation.displayName} (${item.recommendation.sourcePath})`,
    `Why: ${item.recommendation.reasons.map((reason) => reason.message).join("; ")}`,
    `Evidence: ${evidenceIds.join(", ")}`,
  ].join("\n");
}

export function buildReuseContext(index: ReuseIndex, task: string, budget: ContextBudget): ReuseContext {
  if (!Number.isInteger(budget.maxItems) || budget.maxItems < 1) {
    throw new Error("Context maxItems must be a positive integer");
  }
  if (!Number.isInteger(budget.maxCharacters) || budget.maxCharacters < 1) {
    throw new Error("Context maxCharacters must be a positive integer");
  }

  const recommendations = rankReuseCandidates(index, task, { limit: Number.MAX_SAFE_INTEGER });
  const items: ReuseContextItem[] = [];
  let text = "";

  for (const recommendation of recommendations) {
    if (items.length >= budget.maxItems) break;
    const provisional: ReuseContextItem = { recommendation, text: "" };
    const rendered = renderItem(provisional);
    const nextText = text.length === 0 ? rendered : `${text}\n\n${rendered}`;
    if (nextText.length > budget.maxCharacters) break;
    items.push({ recommendation, text: rendered });
    text = nextText;
  }

  const omittedItems = recommendations.length - items.length;
  return {
    schemaVersion: REUSE_CONTEXT_SCHEMA_VERSION,
    task,
    items,
    text,
    characterCount: text.length,
    truncated: omittedItems > 0,
    omittedItems,
  };
}
