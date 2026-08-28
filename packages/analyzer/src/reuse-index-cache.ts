import {
  serializeReuseIndex,
  validateReuseIndex,
  type ReuseIndex,
} from "@latticeos/core";

import { AnalyzerError, RepositoryRoot } from "./repository-root.js";

export type ReuseIndexCacheRead =
  | Readonly<{ status: "hit"; index: ReuseIndex }>
  | Readonly<{ status: "missing" }>
  | Readonly<{ status: "invalid" }>;

export async function readReuseIndex(root: RepositoryRoot): Promise<ReuseIndexCacheRead> {
  let content: string;
  try {
    content = await root.readReuseIndexCache();
  } catch (error) {
    if (error instanceof AnalyzerError && error.code === "CACHE_NOT_FOUND") return { status: "missing" };
    if (error instanceof AnalyzerError && error.code === "CACHE_TOO_LARGE") {
      return { status: "invalid" };
    }
    throw error;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { status: "invalid" };
  }
  const validation = validateReuseIndex(parsed);
  return validation.ok ? { status: "hit", index: validation.value } : { status: "invalid" };
}

export async function writeReuseIndex(root: RepositoryRoot, index: ReuseIndex): Promise<void> {
  await root.writeReuseIndexCache(serializeReuseIndex(index));
}
