import type { WeatherRecord } from "../types/domain";

export type ChillStartRule = "none" | "previous-july-15" | "previous-nov-01";

/**
 * Start of the dormant-season chill window that contains `todayIso`.
 * "previous-july-15" means the most recent July 15 on or before today, so a
 * June dashboard reads the season that started the prior calendar year.
 */
export function getChillSeasonStart(rule: ChillStartRule, todayIso: string): string | undefined {
  if (rule === "none") return undefined;

  const monthDay = rule === "previous-july-15" ? "07-15" : "11-01";
  const year = Number(todayIso.slice(0, 4));
  const startThisYear = `${year}-${monthDay}`;
  return todayIso >= startThisYear ? startThisYear : `${year - 1}-${monthDay}`;
}

export function dailyChillHours(record: WeatherRecord, minC = 0, maxC = 7.2): number {
  if (record.hourlyTempsC?.length) {
    return record.hourlyTempsC.filter((temp) => temp >= minC && temp <= maxC).length;
  }

  // No hourly data: model the diurnal cycle with the same sine curve used by
  // interpolateHourlyTemps (climate.ts) and count the hours falling in range,
  // giving a graduated 0-24 result instead of an all-or-nothing 0/24 step.
  const mean = (record.tminC + record.tmaxC) / 2;
  const amplitude = (record.tmaxC - record.tminC) / 2;
  let hours = 0;
  for (let hour = 0; hour < 24; hour += 1) {
    const radians = ((hour - 9) / 24) * Math.PI * 2;
    const temp = mean + amplitude * Math.sin(radians);
    if (temp >= minC && temp <= maxC) {
      hours += 1;
    }
  }
  return hours;
}

export function cumulativeChillHours(records: WeatherRecord[], minC = 0, maxC = 7.2): Array<{ date: string; chillHours: number; cumulativeChillHours: number }> {
  let total = 0;

  return records.map((record) => {
    const chillHours = dailyChillHours(record, minC, maxC);
    total += chillHours;
    return {
      date: record.date,
      chillHours,
      cumulativeChillHours: total,
    };
  });
}
