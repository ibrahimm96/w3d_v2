import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readWeatherCache, writeWeatherCache } from "./weatherCache";

function installLocalStorageMock() {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  };
  (globalThis as unknown as { window: { localStorage: typeof localStorage } }).window = { localStorage };
  return store;
}

describe("weatherCache", () => {
  beforeEach(() => {
    installLocalStorageMock();
  });

  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it("round-trips a value within the TTL", () => {
    writeWeatherCache("gridmet", "key-a", { records: [1, 2, 3] });
    expect(readWeatherCache("gridmet", "key-a")).toEqual({ records: [1, 2, 3] });
  });

  it("namespaces keys so different namespaces do not collide", () => {
    writeWeatherCache("gridmet", "shared", "a");
    writeWeatherCache("openmeteo", "shared", "b");
    expect(readWeatherCache("gridmet", "shared")).toBe("a");
    expect(readWeatherCache("openmeteo", "shared")).toBe("b");
  });

  it("treats entries older than the TTL as a miss", () => {
    writeWeatherCache("gridmet", "key-b", "stale");
    // A negative TTL makes any positive age expire immediately.
    expect(readWeatherCache("gridmet", "key-b", -1)).toBeUndefined();
    // The expired entry is evicted, so a later read also misses.
    expect(readWeatherCache("gridmet", "key-b")).toBeUndefined();
  });

  it("returns undefined for an unknown key", () => {
    expect(readWeatherCache("gridmet", "missing")).toBeUndefined();
  });
});
