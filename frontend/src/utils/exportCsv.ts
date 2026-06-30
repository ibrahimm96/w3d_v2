export interface CsvColumn {
  key: string;
  label: string;
}

function escapeCsvValue(value: string | number | undefined): string {
  if (value === undefined || value === null) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function buildCsv(columns: CsvColumn[], rows: Array<Record<string, string | number | undefined>>): string {
  const header = columns.map((column) => escapeCsvValue(column.label)).join(",");
  const lines = rows.map((row) => columns.map((column) => escapeCsvValue(row[column.key])).join(","));
  return [header, ...lines].join("\n");
}

export function downloadCsv(filename: string, columns: CsvColumn[], rows: Array<Record<string, string | number | undefined>>): void {
  const blob = new Blob([buildCsv(columns, rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
