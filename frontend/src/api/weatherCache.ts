// Lightweight, versioned localStorage cache for slow weather-provider responses
// (gridMET netCDF pulls take ~12-16s per variable). Entries expire after a TTL
// so the ~2-day-lagging current-season tail refreshes naturally; prior full
// years are immutable and keyed by a stable date range, so they survive across
// sessions within the TTL. All access is best-effort — any storage failure
// (private mode, quota, disabled) silently degrades to no caching.

const CACHE_VERSION = "v1";
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface CacheEnvelope<T> {
  storedAt: number;
  value: T;
}

function storageKey(namespace: string, key: string): string {
  return `w3d.cache.${CACHE_VERSION}.${namespace}.${key}`;
}

export function readWeatherCache<T>(namespace: string, key: string, ttlMs = DEFAULT_TTL_MS): T | undefined {
  try {
    const raw = window.localStorage.getItem(storageKey(namespace, key));
    if (!raw) return undefined;
    const envelope = JSON.parse(raw) as CacheEnvelope<T>;
    if (!envelope || typeof envelope.storedAt !== "number") return undefined;
    if (Date.now() - envelope.storedAt > ttlMs) {
      window.localStorage.removeItem(storageKey(namespace, key));
      return undefined;
    }
    return envelope.value;
  } catch {
    return undefined;
  }
}

export function writeWeatherCache<T>(namespace: string, key: string, value: T): void {
  try {
    const envelope: CacheEnvelope<T> = { storedAt: Date.now(), value };
    window.localStorage.setItem(storageKey(namespace, key), JSON.stringify(envelope));
  } catch {
    // Quota or unavailable storage — caching is purely an optimization.
  }
}
