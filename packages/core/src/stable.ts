function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function normalizeForJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeForJson);
  if (value === null || typeof value !== "object") return value;

  const input = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const key of Object.keys(input).sort(compareText)) {
    const item = input[key];
    if (item !== undefined) output[key] = normalizeForJson(item);
  }
  return output;
}

export function stableStringify(value: unknown, indentation = 2): string {
  return `${JSON.stringify(normalizeForJson(value), null, indentation)}\n`;
}

export function compareStrings(left: string, right: string): number {
  return compareText(left, right);
}

export function sortedUnique<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)].sort(compareText);
}
