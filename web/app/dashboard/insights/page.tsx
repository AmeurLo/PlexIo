"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { requireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { PortfolioInsights, PropertyPerformance, PropertyHealthScore, HealthScoreResponse } from "@/lib/types";
import StatCard from "@/components/dashboard/StatCard";
import PageHeader from "@/components/dashboard/PageHeader";
import { SkeletonCard } from "@/components/dashboard/SkeletonCard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ─── Build 6-month cash flow from raw data ────────────────────────────────────
function buildMonthlyCashFlow(payments: any[], expenses: any[], lang: string) {
  const months: { key: string; label: string; collected: number; expenses: number; net: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", { month: "short", year: "2-digit" });
    months.push({ key, label, collected: 0, expenses: 0, net: 0 });
  }
  for (const p of payments) {
    if (p.status !== "paid") continue;
    const d = p.payment_date ?? p.created_at;
    if (!d) continue;
    const m = months.find(x => x.key === (d as string).slice(0, 7));
    if (m) m.collected += p.amount ?? 0;
  }
  for (const e of expenses) {
    const d = e.date ?? e.expense_date ?? e.created_at;
    if (!d) continue;
    const m = months.find(x => x.key === (d as string).slice(0, 7));
    if (m) m.expenses += e.amount ?? 0;
  }
  return months.map(m => ({ ...m, net: m.collected - m.expenses }));
}

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
  const [cashFlowData, setCashFlowData] = useState<ReturnType<typeof buildMonthlyCashFlow>>([]);
  const [vacancyData, setVacancyData] = useState<any>(null);
  const [reportMonth, setReportMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [reportDownloading, setReportDownloading] = useState(false);
  const [reportError, setReportError] = useState("");

  const handleDownloadReport = async () => {
    setReportDownloading(true);
    setReportError("");
    try {
      const blob = await api.downloadPortfolioReport(reportMonth);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `domely-rapport-${reportMonth}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setReportError(lang === "fr" ? "Erreur lors de la génération du rapport" : "Error generating report");
    } finally {
      setReportDownloading(false);
    }
  };

  function loadData() {
    if (!requireAuth()) return;
    setLoading(true);
    setError("");
    // Vacancy losses — non-blocking, loaded independently
    api.getVacancyLosses().then(setVacancyData).catch(() => {});

    Promise.allSettled([
      api.getInsights(),
      api.getHealthScores(),
      api.getRentPayments(),
      api.getExpenses(),
    ]).then(([insRes, hltRes, paymentsRes, expensesRes]) => {
      if (insRes.status === "fulfilled") setInsights(insRes.value);
      if (hltRes.status === "fulfilled") setHealth(hltRes.value);

      const payments = paymentsRes.status === "fulfilled" ? paymentsRes.value as any[] : [];
      const expenses = expensesRes.status === "fulfilled" ? expensesRes.value as any[] : [];
      setCashFlowData(buildMonthlyCashFlow(payments, expenses, lang));

      // Only show error if the main insights call failed (all others are supplementary)
      const mainFailed = insRes.status === "rejected" && hltRes.status === "rejected";
      if (mainFailed) {
        const err = (insRes as PromiseRejectedResult).reason;
        setError(err instanceof Error ? err.message : String(err));
      }
    }).finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  if (loading) return (
    <div className="p-6 max-w-6xl space-y-6">
      <div className="h-8 w-40 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[0,1,2,3,4,5].map(i => <SkeletonCard key={i} />)}
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 animate-pulse">
        <div className="h-4 w-48 bg-gray-100 dark:bg-gray-800 rounded mb-5" />
        <div className="h-[220px] bg-gray-100 dark:bg-gray-800 rounded-xl" />
      </div>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 gap-5 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a9 9 0 0118 0c0 3.536-1.646 6.684-4.24 8.747M12 21v-1m0-4v-1M9 15l-1.5 1.5M15 15l1.5 1.5" />
        </svg>
      </div>
      <div>
        <p className="text-[17px] font-bold text-gray-800 dark:text-white mb-1">
          {lang === "fr" ? "Connexion impossible" : "Cannot connect"}
        </p>
        <p className="text-[13px] text-gray-500 dark:text-gray-400 max-w-sm">
          {lang === "fr" ? "Vérifiez votre connexion et réessayez." : "Check your connection and try again."}
        </p>
      </div>
      <button onClick={loadData} className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-[13px] font-semibold rounded-xl transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {lang === "fr" ? "Réessayer" : "Retry"}
      </button>
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

      {/* ── Portfolio Report ─────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-[13px] font-medium text-gray-700 dark:text-gray-300">
            {lang === "fr" ? "Mois du rapport" : "Report month"}
          </label>
          <input
            type="month"
            value={reportMonth}
            onChange={e => setReportMonth(e.target.value)}
            className="text-[13px] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <button
          onClick={handleDownloadReport}
          disabled={reportDownloading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-[13px] font-medium rounded-xl transition-colors"
        >
          {reportDownloading ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          )}
          {lang === "fr" ? "Télécharger le rapport PDF" : "Download PDF report"}
        </button>
        {reportError && <p className="text-[12px] text-red-500">{reportError}</p>}
      </div>

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

      {/* ── Vacancy losses ──────────────────────────────────────────────────── */}
      {vacancyData && vacancyData.total_vacant_units > 0 && (
        <div className="mb-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
              {lang === "fr" ? "Pertes locatives" : "Vacancy Losses"}
            </h3>
            <span className="text-[12px] text-red-500 font-medium">
              -{formatCurrency(vacancyData.total_daily_loss)}/{lang === "fr" ? "jour" : "day"}
            </span>
          </div>
          <p className="text-[12px] text-gray-400 mb-4">
            {lang === "fr"
              ? `${vacancyData.total_vacant_units} unité(s) vacante(s) · ${formatCurrency(vacancyData.total_loss_mtd)} perdu ce mois`
              : `${vacancyData.total_vacant_units} vacant unit(s) · ${formatCurrency(vacancyData.total_loss_mtd)} lost this month`}
          </p>
          <div className="space-y-0 divide-y divide-gray-50 dark:divide-gray-800">
            {vacancyData.units.map((u: any) => (
              <div key={u.unit_id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200">
                    {u.property_name} — {u.unit_number}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {lang === "fr" ? `Vacant depuis ${u.days_vacant} jour(s)` : `Vacant for ${u.days_vacant} day(s)`}
                    {u.vacant_since ? ` · ${u.vacant_since.slice(0, 10)}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-semibold text-red-500">-{formatCurrency(u.total_loss)}</p>
                  <p className="text-[11px] text-gray-400">{formatCurrency(u.daily_loss)}/{lang === "fr" ? "jour" : "day"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 6-month cash flow chart ──────────────────────────────────────────── */}
      {cashFlowData.some(m => m.collected > 0 || m.expenses > 0) && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-6">
          <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-5">
            {lang === "fr" ? "Flux de trésorerie — 6 derniers mois" : "Cash Flow — Last 6 months"}
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cashFlowData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
              />
              <Tooltip
                formatter={(value: unknown, name: unknown) => {
                  const label = name === "collected" ? (lang === "fr" ? "Loyers perçus" : "Rent collected")
                    : name === "expenses" ? (lang === "fr" ? "Dépenses" : "Expenses")
                    : (lang === "fr" ? "Flux net" : "Net flow");
                  return [formatCurrency(Number(value ?? 0)), label];
                }}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
              <Legend
                formatter={(v) =>
                  v === "collected" ? (lang === "fr" ? "Loyers perçus" : "Rent collected")
                  : v === "expenses" ? (lang === "fr" ? "Dépenses" : "Expenses")
                  : (lang === "fr" ? "Net" : "Net")
                }
                wrapperStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="collected" fill="#14b8a6" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="expenses"  fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

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
