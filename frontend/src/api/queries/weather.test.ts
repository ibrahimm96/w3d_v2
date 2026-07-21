import { describe, expect, it } from "vitest";
import type { WeatherRecord } from "../../types/domain";
import { applyWeatherSupplements, mergeWeatherRecords } from "./weather";

function record(date: string, source: WeatherRecord["source"], tmaxC: number): WeatherRecord {
  return { date, source, tminC: 10, tmaxC, etoMm: 0, precipMm: 0 };
}

describe("staged season weather", () => {
  it("keeps historical records when the forecast overlaps their dates", () => {
    const merged = mergeWeatherRecords([
      record("2026-06-01", "historical", 25),
      record("2026-06-01", "forecast", 31),
    ]);

    expect(merged).toEqual([record("2026-06-01", "historical", 25)]);
  });

  it("adds background metrics without changing GDD temperatures", () => {
    const base = [record("2026-06-01", "historical", 25)];
    const enriched = applyWeatherSupplements(base, [
      { date: "2026-06-01", etoMm: 5.4, precipMm: 1.2, vpdKpa: 1.1 },
    ]);

    expect(enriched[0]).toMatchObject({ tminC: 10, tmaxC: 25, etoMm: 5.4, precipMm: 1.2, vpdKpa: 1.1 });
  });
});
