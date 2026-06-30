import type { WeatherRecord } from "../types/domain";

function saturationVaporPressure(tempC: number): number {
  return 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
}

export function dailyMeanVpd(record: WeatherRecord): number | undefined {
  if (typeof record.vpdKpa === "number") {
    return Number(record.vpdKpa.toFixed(2));
  }

  const tMean = (record.tminC + record.tmaxC) / 2;
  const es = saturationVaporPressure(tMean);

  if (typeof record.tdewC === "number") {
    return Number((es - saturationVaporPressure(record.tdewC)).toFixed(2));
  }

  if (typeof record.rhMin === "number" && typeof record.rhMax === "number") {
    // FAO-56: saturation vapor pressure is the mean of e°(Tmin) and e°(Tmax),
    // and actual vapor pressure pairs RHmax with Tmin and RHmin with Tmax.
    const esTmin = saturationVaporPressure(record.tminC);
    const esTmax = saturationVaporPressure(record.tmaxC);
    const esMean = (esTmin + esTmax) / 2;
    const ea = (esTmin * (record.rhMax / 100) + esTmax * (record.rhMin / 100)) / 2;
    return Number(Math.max(0, esMean - ea).toFixed(2));
  }

  return undefined;
}
