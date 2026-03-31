// ─── Currency ─────────────────────────────────────────────────────────────────
export function formatCurrency(n: number, currency = "CAD"): string {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

// ─── Dates ────────────────────────────────────────────────────────────────────
export function formatDate(d: string | undefined | null, locale = "fr-CA"): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString(locale, {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch { return d; }
}

export function formatDateShort(d: string | undefined | null): string {
  if (!d) return "—";
  return d.slice(0, 10); // YYYY-MM-DD
}

export function formatDateTime(d: string | undefined | null, locale = "fr-CA"): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString(locale, {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });
  } catch { return d; }
}

export function currentMonthYear(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86_400_000);
}

// ─── Phone formatting ─────────────────────────────────────────────────────────
/**
 * Smart North-American phone formatter.
 * • Leading digit 1 is treated as country code (indicatif)
 *   → 1-XXX-XXX-XXXX  (11 digits)
 * • Otherwise → XXX-XXX-XXXX  (10 digits)
 * Works during live typing AND on paste.
 */
export function formatPhone(val: string): string {
  const d = val.replace(/\D/g, "");
  if (d.length === 0) return "";

  // Country-code variant: leading "1" → 1-XXX-XXX-XXXX
  if (d[0] === "1" && d.length > 1) {
    const rest = d.slice(1, 11); // up to 10 digits after the country code
    if (rest.length <= 3) return `1-${rest}`;
    if (rest.length <= 6) return `1-${rest.slice(0, 3)}-${rest.slice(3)}`;
    return `1-${rest.slice(0, 3)}-${rest.slice(3, 6)}-${rest.slice(6)}`;
  }

  // Standard 10-digit: XXX-XXX-XXXX
  const n = d.slice(0, 10);
  if (n.length <= 3) return n;
  if (n.length <= 6) return `${n.slice(0, 3)}-${n.slice(3)}`;
  return `${n.slice(0, 3)}-${n.slice(3, 6)}-${n.slice(6)}`;
}

/** Returns true for a complete 10-digit or 11-digit (1 + 10) phone number. */
export function isValidPhone(v: string): boolean {
  const d = v.replace(/\D/g, "");
  return d.length === 10 || (d.length === 11 && d[0] === "1");
}

// ─── CSV download ─────────────────────────────────────────────────────────────
export function downloadCsv(rows: Record<string, unknown>[], filename: string): void {
  if (!rows.length) return;
  const header = Object.keys(rows[0]).join(",");
  const body = rows
    .map(r => Object.values(r).map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Print HTML (PDF via browser) ─────────────────────────────────────────────
export function printHtml(html: string, title: string): void {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;width:0;height:0;border:0;";
  document.body.appendChild(iframe);
  const win = iframe.contentWindow!;
  win.document.open();
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
    <meta charset="utf-8">
    <style>
      body{font-family:system-ui,sans-serif;color:#111;padding:32px;font-size:14px}
      h1{font-size:20px;font-weight:700;margin-bottom:4px}
      h2{font-size:15px;font-weight:600;margin:20px 0 8px}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      th,td{padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:left}
      th{font-weight:600;background:#f9fafb}
      .badge{display:inline-block;padding:2px 8px;border-radius:9999px;font-size:12px;font-weight:600}
      .meta{color:#6b7280;font-size:13px}
      @media print{@page{margin:20mm}}
    </style>
  </head><body>${html}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    document.body.removeChild(iframe);
  }, 250);
}

// ─── Status configs ───────────────────────────────────────────────────────────
export function getRentStatusConfig(status: string) {
  switch (status) {
    case "paid":    return { label: { fr: "Payé",     en: "Paid"    }, classes: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" };
    case "late":    return { label: { fr: "En retard", en: "Late"   }, classes: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
    case "pending": return { label: { fr: "En attente",en: "Pending"}, classes: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
    default:        return { label: { fr: status,      en: status   }, classes: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" };
  }
}

export function getMaintenanceStatusConfig(status: string) {
  switch (status) {
    case "open":        return { label: { fr: "Ouvert",       en: "Open"       }, classes: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" };
    case "in_progress": return { label: { fr: "En cours",     en: "In Progress"}, classes: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" };
    case "completed":   return { label: { fr: "Complété",     en: "Completed"  }, classes: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" };
    case "cancelled":   return { label: { fr: "Annulé",       en: "Cancelled"  }, classes: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" };
    default:            return { label: { fr: status,          en: status       }, classes: "bg-gray-100 text-gray-600" };
  }
}

export function getPriorityConfig(priority: string) {
  switch (priority) {
    case "urgent": return { label: { fr: "Urgent",  en: "Urgent"  }, classes: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
    case "high":   return { label: { fr: "Élevé",   en: "High"    }, classes: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" };
    case "medium": return { label: { fr: "Moyen",   en: "Medium"  }, classes: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
    case "low":    return { label: { fr: "Bas",     en: "Low"     }, classes: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" };
    default:       return { label: { fr: priority,  en: priority  }, classes: "bg-gray-100 text-gray-600" };
  }
}
