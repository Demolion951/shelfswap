/**
 * In-memory session caches for cover probe wins (shared by CoverImageChain + prefetch).
 * Does not change which covers are chosen — only skips repeat network probes.
 * Location: lib/client/coverSessionCache.ts
 */

const MAX_CHAIN = 400;
const MAX_URL = 600;

/** Full candidate-chain key → winning display URL. */
const chainWins = new Map<string, string>();

/** Individual URL known to be a valid cover this session. */
const urlOk = new Set<string>();

function trimMap(map: Map<string, string>, max: number) {
  while (map.size > max) {
    const first = map.keys().next().value;
    if (first === undefined) break;
    map.delete(first);
  }
}

function trimSet(set: Set<string>, max: number) {
  while (set.size > max) {
    const first = set.values().next().value;
    if (first === undefined) break;
    set.delete(first);
  }
}

export function getCoverChainWin(chainKey: string): string | null {
  return chainWins.get(chainKey) ?? null;
}

export function rememberCoverChainWin(chainKey: string, src: string) {
  if (!src || src.startsWith("blob:")) return;
  chainWins.set(chainKey, src);
  rememberCoverUrlOk(src);
  trimMap(chainWins, MAX_CHAIN);
}

export function forgetCoverChainWin(chainKey: string) {
  chainWins.delete(chainKey);
}

export function isCoverUrlOk(url: string): boolean {
  return urlOk.has(url);
}

export function rememberCoverUrlOk(url: string) {
  if (!url || url.startsWith("blob:")) return;
  urlOk.add(url);
  trimSet(urlOk, MAX_URL);
}
