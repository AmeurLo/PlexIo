"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { api } from "@/lib/api";
import { Icon } from "@/lib/icons";

type Result = {
  id: string;
  label: string;
  sub?: string;
  href: string;
  icon: "home" | "users" | "document" | "wrench" | "credit-card";
  category: string;
};

const CATEGORY_ORDER = ["properties", "tenants", "leases", "maintenance", "rent"];

export default function GlobalSearch() {
  const { lang } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cache = useRef<{
    properties: any[]; tenants: any[]; leases: any[];
    maintenance: any[]; payments: any[];
  } | null>(null);

  // ─── Open/close ─────────────────────────────────────────────────────────────
  const openSearch = useCallback(() => {
    setOpen(true);
    setQuery("");
    setResults([]);
    setActive(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const closeSearch = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
  }, []);

  // ─── Keyboard shortcut ──────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) closeSearch(); else openSearch();
      }
      if (e.key === "Escape") closeSearch();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, openSearch, closeSearch]);

  // ─── Preload data once ───────────────────────────────────────────────────────
  async function loadCache() {
    if (cache.current) return;
    setLoading(true);
    try {
      const [properties, tenants, leases, maintenance, payments] = await Promise.all([
        api.getProperties(),
        api.getTenants(),
        api.getLeases(),
        api.getMaintenanceRequests(),
        api.getRentPayments(),
      ]);
      cache.current = {
        properties: properties as any[],
        tenants: tenants as any[],
        leases: leases as any[],
        maintenance: maintenance as any[],
        payments: payments as any[],
      };
    } catch {}
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (open) loadCache();
  }, [open]);

  // ─── Search ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!query.trim() || !cache.current) { setResults([]); return; }
    const q = query.toLowerCase();
    const res: Result[] = [];

    const { properties, tenants, leases, maintenance, payments } = cache.current;

    for (const p of properties) {
      if ((p.name ?? "").toLowerCase().includes(q) || (p.address ?? "").toLowerCase().includes(q)) {
        res.push({ id: p.id ?? p._id, label: p.name, sub: p.address, href: `/dashboard/properties/${p.id ?? p._id}`, icon: "home", category: lang === "fr" ? "Propriétés" : "Properties" });
      }
    }
    for (const t of tenants) {
      const name = `${t.first_name ?? ""} ${t.last_name ?? ""}`.trim();
      if (name.toLowerCase().includes(q) || (t.email ?? "").toLowerCase().includes(q) || (t.phone ?? "").includes(q)) {
        res.push({ id: t.id ?? t._id, label: name, sub: t.email, href: `/dashboard/tenants`, icon: "users", category: lang === "fr" ? "Locataires" : "Tenants" });
      }
    }
    for (const l of leases) {
      const name = l.tenant_name ?? `${l.tenant_first_name ?? ""} ${l.tenant_last_name ?? ""}`.trim();
      if (name.toLowerCase().includes(q) || (l.property_name ?? "").toLowerCase().includes(q)) {
        res.push({ id: l.id ?? l._id, label: lang === "fr" ? `Bail — ${name}` : `Lease — ${name}`, sub: l.property_name, href: `/dashboard/leases`, icon: "document", category: lang === "fr" ? "Baux" : "Leases" });
      }
    }
    for (const m of maintenance) {
      if ((m.title ?? "").toLowerCase().includes(q) || (m.description ?? "").toLowerCase().includes(q)) {
        res.push({ id: m.id ?? m._id, label: m.title, sub: m.status, href: `/dashboard/maintenance`, icon: "wrench", category: lang === "fr" ? "Maintenance" : "Maintenance" });
      }
    }
    for (const p of payments) {
      const name = p.tenant_name ?? "";
      if (name.toLowerCase().includes(q)) {
        res.push({ id: p.id ?? p._id, label: lang === "fr" ? `Loyer — ${name}` : `Rent — ${name}`, sub: p.month_year, href: `/dashboard/rent`, icon: "credit-card", category: lang === "fr" ? "Loyers" : "Rent" });
      }
    }

    setResults(res.slice(0, 12));
    setActive(0);
  }, [query, lang]);

  // ─── Navigate to result ──────────────────────────────────────────────────────
  function navigate(r: Result) {
    router.push(r.href);
    closeSearch();
  }

  // ─── Arrow key navigation ────────────────────────────────────────────────────
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    if (e.key === "Enter" && results[active]) navigate(results[active]);
  }

  if (!open) return null;

  // Group results by category
  const grouped: Record<string, Result[]> = {};
  for (const r of results) {
    if (!grouped[r.category]) grouped[r.category] = [];
    grouped[r.category].push(r);
  }

  let globalIdx = 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4" onClick={closeSearch}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-800">
          <Icon name="search" size={16} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={lang === "fr" ? "Rechercher propriétés, locataires, baux…" : "Search properties, tenants, leases…"}
            className="flex-1 bg-transparent text-[14px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
          />
          {loading && <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />}
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-[11px] text-gray-400 font-mono border border-gray-200 dark:border-gray-700">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto py-2">
          {query.trim() === "" ? (
            <p className="text-[13px] text-gray-400 text-center py-8">
              {lang === "fr" ? "Commencez à écrire…" : "Start typing to search…"}
            </p>
          ) : results.length === 0 && !loading ? (
            <p className="text-[13px] text-gray-400 text-center py-8">
              {lang === "fr" ? "Aucun résultat pour" : "No results for"} &ldquo;{query}&rdquo;
            </p>
          ) : (
            Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <p className="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{cat}</p>
                {items.map(r => {
                  const idx = globalIdx++;
                  const isActive = idx === active;
                  return (
                    <button
                      key={r.id}
                      onClick={() => navigate(r)}
                      onMouseEnter={() => setActive(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isActive ? "bg-teal-50 dark:bg-teal-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isActive ? "bg-teal-100 dark:bg-teal-900/40" : "bg-gray-100 dark:bg-gray-800"
                      }`}>
                        <Icon name={r.icon} size={13} className={isActive ? "text-teal-600 dark:text-teal-400" : "text-gray-500"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] font-medium truncate ${isActive ? "text-teal-700 dark:text-teal-300" : "text-gray-800 dark:text-gray-200"}`}>{r.label}</p>
                        {r.sub && <p className="text-[11px] text-gray-400 truncate">{r.sub}</p>}
                      </div>
                      {isActive && (
                        <kbd className="text-[10px] text-gray-400 font-mono border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded flex-shrink-0">↵</kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-center gap-4 text-[11px] text-gray-400">
          <span>↑↓ {lang === "fr" ? "naviguer" : "navigate"}</span>
          <span>↵ {lang === "fr" ? "ouvrir" : "open"}</span>
          <span>ESC {lang === "fr" ? "fermer" : "close"}</span>
          <span className="ml-auto font-semibold text-teal-500">⌘K</span>
        </div>
      </div>
    </div>
  );
}
