/**
 * Domely — CSV export utility
 * Generates a properly-formatted UTF-8 CSV (with BOM for Excel compatibility)
 * and triggers a browser download.
 */

type CsvRow = Record<string, string | number | boolean | null | undefined>;

/** Escape a single cell value for CSV output */
function escapeCell(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return "";
  const str = String(v);
  // Wrap in quotes if contains comma, double-quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Download `data` as a CSV file.
 * @param data     - Array of row objects. Column order follows key order of the first row.
 * @param filename - Filename without extension (e.g. "loyers-2025-05")
 * @param headers  - Optional human-readable column headers (same order as data keys)
 */
export function downloadCSV(
  data: CsvRow[],
  filename: string,
  headers?: Record<string, string>,
): void {
  if (!data.length) return;

  const keys    = Object.keys(data[0]);
  const colLine = keys.map(k => escapeCell(headers?.[k] ?? k)).join(",");
  const rows    = data.map(row => keys.map(k => escapeCell(row[k])).join(","));
  const csv     = [colLine, ...rows].join("\n");

  // UTF-8 BOM so Excel opens accented characters correctly
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Format a date string to YYYY-MM-DD for CSV columns */
export function csvDate(d?: string | null): string {
  if (!d) return "";
  try { return new Date(d).toISOString().slice(0, 10); } catch { return d; }
}
