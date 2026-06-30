import { ChevronDown, Sprout } from "lucide-react";
import { cropOptions } from "../data/crops";
import { getCropMetricProfile } from "../data/cropMetrics";
import type { CropId } from "../types/domain";

interface CropSelectProps {
  value: CropId;
  onChange: (cropId: CropId) => void;
  id?: string;
  /** Render the agronomic summary line under the dropdown. */
  showSummary?: boolean;
}

export function cropOptionLabel(cropId: CropId): string {
  const crop = cropOptions.find((option) => option.id === cropId) ?? cropOptions[0];
  return crop.varietyHint ? `${crop.label} (${crop.varietyHint})` : crop.label;
}

export function CropSelect({ value, onChange, id, showSummary = true }: CropSelectProps) {
  const metrics = getCropMetricProfile(value);

  return (
    <div className="crop-select">
      <div className="crop-select-control">
        <Sprout className="crop-select-icon" size={18} aria-hidden />
        <select
          id={id}
          className="crop-select-input"
          value={value}
          onChange={(event) => onChange(event.target.value as CropId)}
        >
          {cropOptions.map((crop) => (
            <option key={crop.id} value={crop.id}>
              {crop.varietyHint ? `${crop.label} (${crop.varietyHint})` : crop.label}
            </option>
          ))}
        </select>
        <ChevronDown className="crop-select-chevron" size={18} aria-hidden />
      </div>
      {showSummary ? (
        <p className="crop-select-summary">
          {metrics.perennial ? "Perennial" : "Annual"} &middot; Base {metrics.gdd.baseTempC}&deg;C / Cap {metrics.gdd.upperTempC}&deg;C
          {metrics.chill.enabled && metrics.chill.requirement ? ` · ~${metrics.chill.requirement} chill hrs` : ""}
        </p>
      ) : null}
    </div>
  );
}
