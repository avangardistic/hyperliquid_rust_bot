import type { CandleData, TimeFrame } from "./types";

type CacheKey = string;

export const candleCache = new Map<CacheKey, Map<number, CandleData>>();

const buildCacheKey = (asset: string, tf: TimeFrame) =>
    `hyperliquid:${asset}:${tf}`;

export function getTimeframeCache(asset: string, tf: TimeFrame) {
    const cacheKey = buildCacheKey(asset, tf);
    let tfCache = candleCache.get(cacheKey);
    if (!tfCache) {
        tfCache = new Map();
        candleCache.set(cacheKey, tfCache);
    }

    return tfCache;
}

export function clearCandleCache() {
    candleCache.clear();
}
