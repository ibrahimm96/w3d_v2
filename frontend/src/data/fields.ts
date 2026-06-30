import type { FieldConfig } from "../types/domain";
import { cropProfiles } from "./crops";
import { getCurrentYearStartDate } from "../utils/dateRange";

const almond = cropProfiles.almond;

export const defaultFields: FieldConfig[] = [
  {
    id: "green-valley-a12",
    name: "Green Valley Ranch",
    cropId: almond.id,
    cropLabel: `${almond.label} (${almond.varietyHint})`,
    lat: 36.7378,
    lon: -119.7871,
    stageStartDate: getCurrentYearStartDate(),
  },
];
