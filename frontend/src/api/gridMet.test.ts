import { describe, expect, it } from "vitest";
import { buildGridMetQualityFlags, buildGridMetWeatherRecords, parseGridMetSeries } from "./gridMet";

describe("gridMET API client", () => {
  it("parses the live response envelope with string-valued series", () => {
    // Captured from a live get-netcdf-data response.
    const payload = {
      data: [
        {
          metadata: ["#Variables:", "#daily_mean_reference_evapotranspiration_grass(mm):pet"],
          lat_lon: ["46.7333", "-117.0167"],
          "yyyy-mm-dd": ["2026-06-01", "2026-06-02", "2026-06-03"],
          "daily_mean_reference_evapotranspiration_grass(mm)": ["3.50", "4.40", "4.40"],
        },
      ],
    };

    expect(parseGridMetSeries(payload, "pet")).toEqual([
      { date: "2026-06-01", value: 3.5 },
      { date: "2026-06-02", value: 4.4 },
      { date: "2026-06-03", value: 4.4 },
    ]);
  });

  it("converts Kelvin temperatures to Celsius", () => {
    const payload = {
      data: [
        {
          "yyyy-mm-dd": ["2026-06-01", "2026-06-02"],
          "daily_maximum_temperature(K)": ["296.60", "308.00"],
        },
      ],
    };

    expect(parseGridMetSeries(payload, "tmmx")).toEqual([
      { date: "2026-06-01", value: 23.45 },
      { date: "2026-06-02", value: 34.85 },
    ]);
  });

  it("joins variable series into weather records and skips dates missing required values", () => {
    const records = buildGridMetWeatherRecords({
      tmmn: [
        { date: "2026-06-01", value: 10 },
        { date: "2026-06-02", value: 11 },
      ],
      tmmx: [{ date: "2026-06-01", value: 25 }],
      pet: [
        { date: "2026-06-01", value: 5 },
        { date: "2026-06-02", value: 5.5 },
      ],
      rmax: [{ date: "2026-06-01", value: 90 }],
      rmin: [{ date: "2026-06-01", value: 30 }],
      vpd: [{ date: "2026-06-01", value: 1.1 }],
    });

    expect(records).toEqual([
      {
        date: "2026-06-01",
        tminC: 10,
        tmaxC: 25,
        precipMm: 0,
        etoMm: 5,
        source: "historical",
        rhMin: 30,
        rhMax: 90,
        vpdKpa: 1.1,
      },
    ]);
  });

  it("builds temperature-only records without requiring ETo", () => {
    const records = buildGridMetWeatherRecords(
      {
        tmmn: [{ date: "2022-03-01", value: 8 }],
        tmmx: [{ date: "2022-03-01", value: 21 }],
      },
      { requireEto: false },
    );

    expect(records).toEqual([
      {
        date: "2022-03-01",
        tminC: 8,
        tmaxC: 21,
        precipMm: 0,
        etoMm: 0,
        source: "historical",
        rhMin: undefined,
        rhMax: undefined,
        vpdKpa: undefined,
      },
    ]);
  });

  it("flags silently truncated ranges with the actual last available date", () => {
    const records = buildGridMetWeatherRecords({
      tmmn: [{ date: "2026-06-10", value: 10 }],
      tmmx: [{ date: "2026-06-10", value: 25 }],
      pet: [{ date: "2026-06-10", value: 5 }],
    });

    expect(buildGridMetQualityFlags(records, "2026-06-12")).toEqual(["data-available-through:2026-06-10"]);
    expect(buildGridMetQualityFlags(records, "2026-06-10")).toEqual([]);
  });
});
