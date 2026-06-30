import type { GraphSettingsSection } from "./graphSettings";

export interface SummaryChip {
  section: GraphSettingsSection;
  label: string;
}

interface ActiveSettingsSummaryProps {
  chips: SummaryChip[];
  onOpenSection: (section: GraphSettingsSection) => void;
}

export function ActiveSettingsSummary({ chips, onOpenSection }: ActiveSettingsSummaryProps) {
  if (!chips.length) return null;

  return (
    <div className="active-settings-summary" aria-label="Active graph settings">
      {chips.map((chip) => (
        <button
          key={`${chip.section}-${chip.label}`}
          type="button"
          className="active-setting-chip"
          onClick={() => onOpenSection(chip.section)}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
