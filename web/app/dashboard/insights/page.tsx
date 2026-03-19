"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { requireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { PortfolioInsights, PropertyPerformance, PropertyHealthScore, HealthScoreResponse } from "@/lib/types";
import StatCard from "@/components/dashboard/StatCard";
import PageHeader from "@/components/dashboard/PageHeader";

// ─── i18n ─────────────────────────────────────────────────────────────────────
const T = {
  title:         { fr: "Analytiques",              en: "Analytics" },
  sub:           { fr: "Vue financière du portefeuille", en: "Portfolio financial overview" },
  revenue:       { fr: "Loyers perçus",            en: "Rent collected" },
  expected:      { fr: "Loyers attendus",           en: "Rent expected" },
  netCashFlow:   { fr: "Flux de trésorerie net",   en: "Net cash flow" },
  occupancy:     { fr: "Taux d'occupation",         en: "Occupancy rate" },
  collections:   { fr: "Taux de recouvrement",     en: "Collection rate" },
  maintenanceCost:{ fr: "Coûts maintenance",       en: "Maintenance costs" },
  healthTitle:   { fr: "Santé du portefeuille",    en: "Portfolio health" },
  healthAvg:     { fr: "Score moyen",              en: "Average score" },
  healthy:       { fr: "Sain",                     en: "Healthy" },
  moderate:      { fr: "Modéré",                   en: "Moderate" },
  atRisk:        { fr: "À risque",                 en: "At risk" },
  byProperty:    { fr: "Par propriété",            en: "By property" },
  property:      { fr: "Propriété",                en: "Property" },
  occ:           { fr: "Occ.",                     en: "Occ." },
  collected:     { fr: "Perçu",                    en: "Collected" },
  expenses_col:  { fr: "Dépenses",                 en: "Expenses" },
  net:           { fr: "Net",                      en: "Net" },
  issues:        { fr: "Problèmes",                en: "Issues" },
  byCategory:    { fr: "Dépenses par catégorie",  en: "Expenses by category" },
  alerts:        { fr: "Alertes",                  en: "Alerts" },
  recommendations: { fr: "Recommandations",        en: "Recommendations" },
  noAlerts:      { fr: "Aucune alerte active",     en: "No active alerts" },
  loading:       { fr: "Chargement…",              en: "Loading…" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function scoreColor(status: string) {
  if (status === "healthy")  return { bar: "bg-teal-500",  badge: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" };
  if (status === "moderate") return { bar: "bg-amber-400", badge: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
  return                            { bar: "bg-red-400",   badge: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
}

const EXPENSE_COLORS = [
  "bg-teal-500", "bg-indigo-500", "bg-violet-500", "bg-amber-400",
  "bg-sky-500",  "bg-rose-500",   "bg-emerald-500","bg-orange-400",
];

const severityConfig = {
  critical: { dot: "bg-red-500",    bg: "bg-red-50 dark:bg-red-900/20",    text: "text-red-700 dark:text-red-400",    border: "border-red-200 dark:border-red-800" },
  warning:  { dot: "bg-amber-500",  bg: "bg-amber-50 dark:bg-amber-900/20",text: "text-amber-700 dark:text-amber-400",border: "border-amber-200 dark:border-amber-800" },
  info:     { dot: "bg-blue-400",   bg: "bg-blue-50 dark:bg-blue-900/20",  text: "text-blue-700 dark:text-blue-400",  border: "border-blue-200 dark:border-blue-800" },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function InsightsPage() {
  const { lang, t } = useLanguage();
  const [insights, setInsights]     = useState<PortfolioInsights | null>(null);
  const [health, setHealth]         = useState<HealthScoreResponse | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  useEffect(() => {
    if (!requireAuth()) return;
    Promise.all([api.getInsights(), api.getHealthScores()])
      .then(([ins, hlt]) => { setInsights(ins); setHealth(hlt); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="p-6">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-[13px] text-red-600">{error}</div>
    </div>
  );

  const d = insights ?? {};
  const properties: PropertyPerformance[] = d.property_performance ?? d.property_breakdown ?? [];
  const expenseBreakdown = d.expense_breakdown ?? [];
  const alerts = d.alerts ?? [];
  const recommendations = d.recommendations ?? [];
  const healthScores: PropertyHealthScore[] = health?.properties ?? [];
  const portfolioStatus = health?.portfolio_status ?? "healthy";
  const portfolioAvg = health?.portfolio_average ?? 0;
  const netCashFlow = d.net_cash_flow ?? 0;

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <PageHeader title={t(T.title)} subtitle={t(T.sub)} />

      {/* ── KPI tiles ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon="dollar"      label={t(T.revenue)}        value={formatCurrency(d.total_rent_collected ?? 0)} />
        <StatCard icon="dollar"      label={t(T.expected)}       value={formatCurrency(d.total_rent_expected ?? 0)} />
        <StatCard
          icon="chart-bar"
          label={t(T.netCashFlow)}
          value={formatCurrency(netCashFlow)}
          iconBg={netCashFlow >= 0 ? "bg-teal-50 dark:bg-teal-900/30" : "bg-red-50 dark:bg-red-900/20"}
          iconColor={netCashFlow >= 0 ? "text-teal-600 dark:text-teal-400" : "text-red-500 dark:text-red-400"}
        />
        <StatCard icon="home"        label={t(T.occupancy)}      value={`${Math.round(d.occupancy_rate ?? 0)}%`} />
        <StatCard icon="check"       label={t(T.collections)}    value={`${Math.round(d.collection_rate ?? 0)}%`} />
        <StatCard icon="wrench"      label={t(T.maintenanceCost)} value={formatCurrency(d.maintenance_expenses ?? 0)} />
      </div>

      {/* ── Portfolio health scores ────────────────────────────────────────────── */}
      {healthScores.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
          {/* Section header */}
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4">
            <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white">{t(T.healthTitle)}</h3>
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-gray-400">{t(T.healthAvg)}</span>
              <span className={`text-[12px] font-semibold px-2.5 py-0.5 rounded-full ${scoreColor(portfolioStatus).badge}`}>
                {Math.round(portfolioAvg)}/100
              </span>
            </div>
          </div>

          {/* Per-property scores */}
          <div className="divide-y divide-gray-50 dark:divide-gray-800/80">
            {healthScores.map((hs, i) => {
              const colors = scoreColor(hs.status);
              const statusLabel = hs.status === "healthy" ? t(T.healthy) : hs.status === "moderate" ? t(T.moderate) : t(T.atRisk);
              return (
                <div key={hs.property_id ?? i} className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Name + status */}
                  <div className="sm:w-52 flex-shrink-0">
                    <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200 truncate">{hs.property_name}</p>
                    <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full mt-0.5 ${colors.badge}`}>
                      {statusLabel}
                    </span>
                  </div>

                  {/* Score bar */}
                  <div className="flex-1 flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${colors.bar}`} style={{ width: `${hs.score}%` }} />
                    </div>
                    <span className="text-[13px] font-bold text-gray-900 dark:text-white w-10 text-right">{hs.score}</span>
                  </div>

                  {/* Mini stats */}
                  <div className="flex gap-4 sm:gap-6 text-[12px] text-gray-500 dark:text-gray-400 flex-shrink-0">
                    {hs.occupied_units != null && hs.total_units != null && (
                      <span>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          {hs.total_units > 0 ? Math.round((hs.occupied_units / hs.total_units) * 100) : 0}%
                        </span>
                        {" "}{lang === "fr" ? "occ." : "occ."}
                      </span>
                    )}
                    {hs.collection_rate != null && (
                      <span>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          {Math.round(hs.collection_rate)}%
                        </span>
                        {" "}{lang === "fr" ? "recouvr." : "collect."}
                      </span>
                    )}
                    {hs.open_issues != null && hs.open_issues > 0 && (
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">
                        {hs.open_issues} {lang === "fr" ? "problème(s)" : "issue(s)"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Property performance + Expense breakdown ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Property performance table */}
        {properties.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white">{t(T.byProperty)}</h3>
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-gray-50 dark:border-gray-800 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                    <th className="px-5 py-2.5 text-left">{t(T.property)}</th>
                    <th className="px-5 py-2.5 text-right">{t(T.occ)}</th>
                    <th className="px-5 py-2.5 text-right">{t(T.collected)}</th>
                    <th className="px-5 py-2.5 text-right">{t(T.expenses_col)}</th>
                    <th className="px-5 py-2.5 text-right">{t(T.net)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {properties.map((p, i) => {
                    const rev = p.rent_collected ?? p.revenue ?? 0;
                    const exp = p.expenses ?? p.maintenance_expenses ?? 0;
                    const net = p.estimated_profit ?? (rev - exp);
                    const occ = p.occupancy_rate != null
                      ? Math.round(p.occupancy_rate)
                      : (p.total_units && p.occupied_units != null)
                        ? Math.round((p.occupied_units / p.total_units) * 100)
                        : null;
                    return (
                      <tr key={p.property_id ?? i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-5 py-3">
                          <p className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-[140px]">{p.property_name}</p>
                          {p.open_issues != null && p.open_issues > 0 && (
                            <span className="text-[11px] text-amber-600 dark:text-amber-400">
                              {p.open_issues} {lang === "fr" ? "problème(s)" : "issue(s)"}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {occ != null ? (
                            <span className={`text-[12px] font-semibold ${occ >= 90 ? "text-teal-600" : occ >= 60 ? "text-amber-600" : "text-red-500"}`}>
                              {occ}%
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-600 dark:text-gray-400">{formatCurrency(rev)}</td>
                        <td className="px-5 py-3 text-right text-gray-600 dark:text-gray-400">{formatCurrency(exp)}</td>
                        <td className={`px-5 py-3 text-right font-semibold ${net >= 0 ? "text-teal-600" : "text-red-500"}`}>
                          {formatCurrency(net)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-gray-50 dark:divide-gray-800">
              {properties.map((p, i) => {
                const rev = p.rent_collected ?? p.revenue ?? 0;
                const exp = p.expenses ?? p.maintenance_expenses ?? 0;
                const net = p.estimated_profit ?? (rev - exp);
                return (
                  <div key={p.property_id ?? i} className="px-5 py-4 space-y-2">
                    <p className="font-semibold text-[14px] text-gray-900 dark:text-white">{p.property_name}</p>
                    <div className="grid grid-cols-3 gap-2 text-[12px]">
                      <div>
                        <p className="text-gray-400">{t(T.collected)}</p>
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(rev)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">{t(T.expenses_col)}</p>
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(exp)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">{t(T.net)}</p>
                        <p className={`font-semibold ${net >= 0 ? "text-teal-600" : "text-red-500"}`}>{formatCurrency(net)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Expense breakdown by category */}
        {expenseBreakdown.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white">{t(T.byCategory)}</h3>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-800/80">
              {(() => {
                const total = expenseBreakdown.reduce((s: number, c: any) => s + (c.total ?? 0), 0);
                return expenseBreakdown.map((cat, i) => {
                const pct = total > 0 ? Math.round(((cat.total ?? 0) / total) * 100) : 0;
                const color = EXPENSE_COLORS[i % EXPENSE_COLORS.length];
                return (
                  <div key={i} className="px-5 py-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color}`} />
                        <span className="text-[13px] text-gray-700 dark:text-gray-300 font-medium">{cat.category}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-gray-400">{pct}%</span>
                        <span className="text-[13px] font-semibold text-gray-900 dark:text-white">{formatCurrency(cat.total ?? 0)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              });
              })()}
            </div>
          </div>
        )}
      </div>

      {/* ── Alerts + Recommendations ─────────────────────────────────────────── */}
      {(alerts.length > 0 || recommendations.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Alerts */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white">{t(T.alerts)}</h3>
            </div>
            {alerts.length === 0 ? (
              <div className="px-5 py-6 text-center text-[13px] text-gray-400">{t(T.noAlerts)}</div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-800/80">
                {alerts.map((a: any, i: number) => {
                  const sev = severityConfig[a.severity as keyof typeof severityConfig] ?? severityConfig.info;
                  return (
                    <div key={a.id ?? i} className={`px-5 py-3 flex gap-3 items-start ${sev.bg}`}>
                      <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${sev.dot}`} />
                      <div>
                        {a.title && <p className={`text-[13px] font-medium ${sev.text}`}>{a.title}</p>}
                        <p className={`text-[12px] ${sev.text} opacity-80`}>{a.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white">{t(T.recommendations)}</h3>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800/80">
                {recommendations.map((r: any, i: number) => {
                  const pri = r.priority === "high" ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : r.priority === "medium" ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
                  return (
                    <div key={r.id ?? i} className="px-5 py-3.5 flex gap-3 items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200 truncate">{r.title}</p>
                          {r.priority && (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${pri}`}>
                              {r.priority}
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-gray-500 dark:text-gray-400">{r.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
