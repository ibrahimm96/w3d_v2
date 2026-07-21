import { describe, expect, it } from "vitest";
import { parseClimateToolboxForecastPet, parseClimateToolboxForecastSupplements, parseClimateToolboxForecastWeather } from "./climate";

// Mirrors the live calc-mode=all response: a table of dates plus one column per
// ensemble member, with values serialized as strings.
function memberTable(variable: string, unit: string, dates: string[], members: number[][]) {
  const record: Record<string, unknown> = { "yyyy-mm-dd": dates };
  members.forEach((values, index) => {
    record[`${variable}_${index}(${unit})`] = values.map((value) => value.toFixed(2));
  });
  return { data: [record] };
}

const DATES = ["2026-06-13", "2026-06-14", "2026-06-15"];

describe("Climate Toolbox API client", () => {
  it("de-accumulates cumulative PET members and reduces to median with p10/p90 bands", () => {
    const payload = memberTable("pet", "mm", DATES, [
      [5, 10.5, 17],
      [4, 9, 15],
      [6, 12, 18.5],
    ]);

    const records = parseClimateToolboxForecastPet(payload, 28);

    expect(records).toEqual([
      {
        date: "2026-06-13",
        etoMm: 5,
        etReferenceMm: 5,
        forecastPetP10Mm: 4.2,
        forecastPetP90Mm: 5.8,
        source: "forecast",
      },
      {
        date: "2026-06-14",
        etoMm: 5.5,
        etReferenceMm: 5.5,
        forecastPetP10Mm: 5.1,
        forecastPetP90Mm: 5.9,
        source: "forecast",
      },
      {
        date: "2026-06-15",
        etoMm: 6.5,
        etReferenceMm: 6.5,
        forecastPetP10Mm: 6.1,
        forecastPetP90Mm: 6.5,
        source: "forecast",
      },
    ]);
  });

  it("respects the forecast horizon", () => {
    const payload = memberTable("pet", "mm", DATES, [[5, 10.5, 17]]);

    expect(parseClimateToolboxForecastPet(payload, 2)).toHaveLength(2);
  });

  it("builds forecast weather records with Kelvin conversion and per-variable cumulative handling", () => {
    const records = parseClimateToolboxForecastWeather({
      pet: memberTable("pet", "mm", DATES, [[5, 10.5, 17]]),
      // Monotonically rising daily values — must NOT be treated as cumulative.
      tmmx: memberTable("tmmx", "K", DATES, [[296.6, 298.1, 304]]),
      tmmn: memberTable("tmmn", "K", DATES, [[283.15, 284.15, 285.15]]),
      // Running precip total: 1.1 mm falls on the third day.
      pr: memberTable("pr", "mm", DATES, [[0, 0, 1.1]]),
      sph: memberTable("sph", "kg/kg", DATES, [[0.008, 0.008, 0.008]]),
      vpd: memberTable("vpd", "kPa", DATES, [[1.2, 1.5, 1.8]]),
    });

    expect(records).toHaveLength(3);
    expect(records[0]).toMatchObject({
      date: "2026-06-13",
      tminC: 10,
      tmaxC: 23.45,
      precipMm: 0,
      etoMm: 5,
      vpdKpa: 1.2,
      source: "forecast",
    });
    expect(records[2]).toMatchObject({
      date: "2026-06-15",
      tmaxC: 30.85,
      precipMm: 1.1,
      etoMm: 6.5,
      vpdKpa: 1.8,
    });
    expect(records[0].hourlyTempsC).toHaveLength(24);
    expect(records[0].rhMin).toBeGreaterThan(0);
    expect(records[0].tdewC).toBeDefined();
  });

  it("skips dates missing required temperature or PET values", () => {
    const records = parseClimateToolboxForecastWeather({
      pet: memberTable("pet", "mm", DATES, [[5, 10.5, 17]]),
      tmmx: memberTable("tmmx", "K", DATES.slice(0, 2), [[296.6, 298.1]]),
      tmmn: memberTable("tmmn", "K", DATES, [[283.15, 284.15, 285.15]]),
    });

    expect(records.map((record) => record.date)).toEqual(["2026-06-13", "2026-06-14"]);
  });

  it("builds the GDD forecast from temperature calls alone", () => {
    const records = parseClimateToolboxForecastWeather(
      {
        tmmx: memberTable("tmmx", "K", DATES, [[296.6, 298.1, 304]]),
        tmmn: memberTable("tmmn", "K", DATES, [[283.15, 284.15, 285.15]]),
      },
      28,
      { requireEto: false },
    );

    expect(records).toHaveLength(3);
    expect(records[0]).toMatchObject({ tminC: 10, tmaxC: 23.45, etoMm: 0, precipMm: 0 });
  });

  it("enriches temperature records from non-temperature forecast payloads", () => {
    const temperatureRecords = parseClimateToolboxForecastWeather(
      {
        tmmx: memberTable("tmmx", "K", DATES, [[296.6, 298.1, 304]]),
        tmmn: memberTable("tmmn", "K", DATES, [[283.15, 284.15, 285.15]]),
      },
      28,
      { requireEto: false },
    );
    const supplements = parseClimateToolboxForecastSupplements(
      {
        pet: memberTable("pet", "mm", DATES, [[5, 10.5, 17]]),
        pr: memberTable("pr", "mm", DATES, [[0, 0, 1.1]]),
      },
      temperatureRecords,
    );

    expect(supplements).toHaveLength(3);
    expect(supplements[2]).toMatchObject({ etoMm: 6.5, precipMm: 1.1 });
  });
});
