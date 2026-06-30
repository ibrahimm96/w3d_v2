import { dailyGdd } from "./gdd";
import type { CropProfile, DailyAnalytics, StageThreshold, WeatherRecord } from "../types/domain";
import { addUtcDays, toIsoDate } from "../utils/dateRange";

export type StageStatus = "reached" | "forecast" | "projected" | "beyond-projection";

export interface StageProjection {
  label: string;
  thresholdGdd: number;
  status: StageStatus;
  date?: string;
}

function monthDay(date: string): string {
  return date.slice(5, 10);
}

/**
 * Average daily GDD keyed by month-day ("MM-DD") across the supplied prior-year
 * weather records. Used as the "normal" accumulation rate when projecting past
 * the end of the forecast window.
 */
export function averageDailyGddByMonthDay(
  weatherByYear: Record<number, WeatherRecord[]>,
  crop: Pick<CropProfile, "tBaseC" | "tUpperC">,
): Map<string, number> {
  const totals = new Map<string, { sum: number; count: number }>();

  for (const records of Object.values(weatherByYear)) {
    for (const record of records) {
      const key = monthDay(record.date);
      const bucket = totals.get(key) ?? { sum: 0, count: 0 };
      bucket.sum += dailyGdd(record, crop);
      bucket.count += 1;
      totals.set(key, bucket);
    }
  }

  return new Map([...totals.entries()].map(([key, bucket]) => [key, bucket.sum / bucket.count]));
}

/**
 * Resolve a date (actual, forecast, or projected) for each numeric GDD stage.
 *
 * - Stages crossed by the analytics records get the crossing date: "reached"
 *   when on/before `todayIso`, otherwise "forecast".
 * - Stages beyond the records are projected by walking forward with the normal
 *   daily accumulation rates; if the threshold is not met within
 *   `maxProjectionDays`, the stage is marked "beyond-projection".
 */
export function buildStageProjections(
  stages: StageThreshold[],
  records: DailyAnalytics[],
  todayIso: string,
  normalDailyGddByMonthDay: Map<string, number>,
  maxProjectionDays = 400,
): StageProjection[] {
  const numericStages = stages
    .filter((stage): stage is StageThreshold & { gdd: number } => typeof stage.gdd === "number")
    .sort((left, right) => left.gdd - right.gdd);
  const lastRecord = records.at(-1);

  return numericStages.map((stage) => {
    const crossing = records.find((record) => record.cumulativeGdd >= stage.gdd);
    if (crossing) {
      return {
        label: stage.label,
        thresholdGdd: stage.gdd,
        status: crossing.date <= todayIso ? "reached" : "forecast",
        date: crossing.date,
      } satisfies StageProjection;
    }

    if (lastRecord && normalDailyGddByMonthDay.size) {
      let cumulative = lastRecord.cumulativeGdd;
      let cursor = new Date(`${lastRecord.date}T00:00:00Z`);

      for (let day = 0; day < maxProjectionDays; day += 1) {
        cursor = addUtcDays(cursor, 1);
        const iso = toIsoDate(cursor);
        cumulative += normalDailyGddByMonthDay.get(monthDay(iso)) ?? 0;
        if (cumulative >= stage.gdd) {
          return {
            label: stage.label,
            thresholdGdd: stage.gdd,
            status: "projected",
            date: iso,
          } satisfies StageProjection;
        }
      }
    }

    return {
      label: stage.label,
      thresholdGdd: stage.gdd,
      status: "beyond-projection",
    } satisfies StageProjection;
  });
}

/**
 * First date in an analytics series whose cumulative GDD crosses the
 * threshold. Used to read prior-year stage dates from comparison snapshots.
 */
export function findThresholdDate(records: DailyAnalytics[], thresholdGdd: number): string | undefined {
  return records.find((record) => record.cumulativeGdd >= thresholdGdd)?.date;
}

/**
 * How many days ahead (positive) or behind (negative) the current cumulative
 * GDD is versus the normal series, both indexed by days since season start.
 *
 * "Ahead by N days" means the normal curve only reaches today's accumulation
 * N days later in the season (normalIndex > currentIndex). Returns undefined
 * when the normal series never reaches the current value, since the lead
 * cannot be quantified from the available data.
 */
export function daysAheadOfNormal(
  currentGdd: number,
  normalSeries: Array<number | undefined>,
  currentIndex: number,
): number | undefined {
  const definedValues = normalSeries.filter((value): value is number => typeof value === "number");
  if (!definedValues.length || currentIndex < 0) return undefined;

  const normalIndex = normalSeries.findIndex((value) => typeof value === "number" && value >= currentGdd);
  if (normalIndex === -1) return undefined;

  return normalIndex - currentIndex;
}
