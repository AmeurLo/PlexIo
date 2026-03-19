"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/lib/ToastContext";
import { requireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatCurrency, downloadCsv } from "@/lib/format";
import type { PropertyFinancials, Expense } from "@/lib/types";
import PageHeader from "@/components/dashboard/PageHeader";
import StatCard from "@/components/dashboard/StatCard";

// ─── i18n ─────────────────────────────────────────────────────────────────────
const T = {
  title:         { fr: "Finances",                  en: "Financials" },
  sub:           { fr: "Revenus et dépenses",        en: "Revenue & expenses" },
  back:          { fr: "← Propriétés",              en: "← Properties" },
  monthly:       { fr: "Mensuel",                   en: "Monthly" },
  ytd:           { fr: "Année en cours",            en: "Year to date" },
  expected:      { fr: "Loyers attendus",           en: "Expected rent" },
  collected:     { fr: "Loyers perçus",             en: "Collected rent" },
  expenses:      { fr: "Dépenses",                  en: "Expenses" },
  net:           { fr: "Flux net",                  en: "Net cash flow" },
  occupancy:     { fr: "Taux d'occupation",         en: "Occupancy rate" },
  expRatio:      { fr: "Ratio de dépenses",         en: "Expense ratio" },
  expTitle:      { fr: "Détail des dépenses",       en: "Expense detail" },
  noExp:         { fr: "Aucune dépense sur cette période.", en: "No expenses for this period." },
  exportCsv:     { fr: "Exporter CSV",              en: "Export CSV" },
  loading:       { fr: "Chargement…",               en: "Loading…" },
  date:          { fr: "Date",                      en: "Date" },
  category:      { fr: "Catégorie",                 en: "Category" },
  description:   { fr: "Description",              en: "Description" },
  amount:        { fr: "Montant",                   en: "Amount" },
};

const MONTH_LABELS: Record<string, string> = {
  "01":"Jan","02":"Fév","03":"Mar","04":"Avr","05":"Mai","06":"Jun",
  "07":"Jul","08":"Aoû","09":"Sep","10":"Oct","11":"Nov","12":"Déc",
};

function buildMonthOptions(): { value: string; label: string }[] {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 13; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    opts.push({ value, label: `${MONTH_LABELS[mo] ?? mo} ${d.getFullYear()}` });
  }
  return opts;
}

const CATEGORY_COLORS: Record<string, string> = {
  maintenance:    "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  utilities:      "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  insurance:      "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
  taxes:          "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  management:     "bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400",
  mortgage:       "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400",
  repairs:        "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
  other:          "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export default function PropertyFinancialsPage() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const router = useRouter();
  const { lang, t } = useLanguage();
  const { showToast } = useToast();

  const [data, setData]       = useState<PropertyFinancials | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState<"monthly" | "ytd">("monthly");
  const [month, setMonth]     = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  });

  const monthOpts = buildMonthOptions();

  useEffect(() => {
    if (!requireAuth()) return;
    setLoading(true);
    api.getPropertyFinancials(propertyId, period === "monthly" ? month : undefined, period)
      .then(setData)
      .catch(e => showToast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [propertyId, period, month]);

  function handleExport() {
    if (!data?.expenses?.length) return;
    const rows = data.expenses.map((e: Expense) => ({
      [lang === "fr" ? "Date" : "Date"]: e.expense_date ?? "",
      [lang === "fr" ? "Catégorie" : "Category"]: e.category ?? "",
      [lang === "fr" ? "Description" : "Description"]: e.title ?? "",
      [lang === "fr" ? "Montant ($)" : "Amount ($)"]: e.amount ?? 0,
      Notes: e.notes ?? "",
    }));
    downloadCsv(rows, `finances-${data.property_name ?? propertyId}-${data.month_year}.csv`);
  }

  const netPositive = (data?.net_cash_flow ?? 0) >= 0;
  const cardClass = "bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)]";

  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Back */}
      <button onClick={() => router.push("/dashboard/properties")}
        className="text-[13px] text-gray-500 hover:text-teal-600 transition-colors font-medium">
        {t(T.back)}
      </button>

      <PageHeader
        title={data?.property_name ? `${data.property_name} — ${t(T.title)}` : t(T.title)}
        subtitle={t(T.sub)}
        actions={
          <button onClick={handleExport}
            className="px-4 py-2 text-[13px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/20 dark:text-teal-300 dark:hover:bg-teal-900/40 rounded-xl transition-colors">
            ↓ {t(T.exportCsv)}
          </button>
        }
      />

      {/* Period controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
          {(["monthly", "ytd"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${period === p ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700"}`}>
              {p === "monthly" ? t(T.monthly) : t(T.ytd)}
            </button>
          ))}
        </div>
        {period === "monthly" && (
          <select
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="px-3 py-2 text-[13px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-teal-500 outline-none"
          >
            {monthOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data ? null : (
        <>
          {/* KPI grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard icon="dollar"    label={t(T.expected)}  value={formatCurrency(data.expected_rent ?? 0)} />
            <StatCard icon="dollar"    label={t(T.collected)} value={formatCurrency(data.collected_rent ?? 0)}
              iconBg="bg-teal-50 dark:bg-teal-900/30" iconColor="text-teal-600 dark:text-teal-400" />
            <StatCard icon="dollar"    label={t(T.expenses)}  value={formatCurrency(data.total_expenses ?? 0)}
              iconBg="bg-red-50 dark:bg-red-900/20" iconColor="text-red-500 dark:text-red-400" />
            <StatCard icon="chart-bar" label={t(T.net)}       value={formatCurrency(data.net_cash_flow ?? 0)}
              iconBg={netPositive ? "bg-teal-50 dark:bg-teal-900/30" : "bg-red-50 dark:bg-red-900/20"}
              iconColor={netPositive ? "text-teal-600 dark:text-teal-400" : "text-red-500 dark:text-red-400"} />
            <StatCard icon="home"      label={t(T.occupancy)} value={`${data.occupancy_rate ?? 0}%`} />
            <StatCard icon="chart-bar" label={t(T.expRatio)}  value={`${Math.round((data.expense_ratio ?? 0) * 100)}%`} />
          </div>

          {/* Visual cash flow bar */}
          {(data.collected_rent ?? 0) > 0 && (
            <div className={`${cardClass} p-6`}>
              <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-3">
                {lang === "fr" ? "Répartition des revenus" : "Revenue breakdown"}
              </p>
              <div className="h-8 rounded-xl overflow-hidden flex">
                {/* Expenses portion */}
                {(data.total_expenses ?? 0) > 0 && (
                  <div
                    className="bg-red-400 h-full flex items-center justify-center"
                    style={{ width: `${Math.min(100, ((data.total_expenses ?? 0) / (data.collected_rent ?? 1)) * 100)}%` }}
                  >
                    <span className="text-white text-[10px] font-bold px-1 truncate">
                      {lang === "fr" ? "Dép." : "Exp."}
                    </span>
                  </div>
                )}
                {/* Net portion */}
                <div className="bg-teal-500 h-full flex-1 flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold px-1">
                    {lang === "fr" ? "Net" : "Net"}
                  </span>
                </div>
              </div>
              <div className="flex justify-between mt-2 text-[11px] text-gray-400">
                <span>{lang === "fr" ? "Dépenses" : "Expenses"}: {formatCurrency(data.total_expenses ?? 0)}</span>
                <span>Net: {formatCurrency(data.net_cash_flow ?? 0)}</span>
              </div>
            </div>
          )}

          {/* Expenses table */}
          <div className={`${cardClass} overflow-hidden`}>
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <p className="font-semibold text-gray-800 dark:text-gray-200">{t(T.expTitle)}</p>
              <span className="text-[12px] text-gray-400">{data.expenses?.length ?? 0} {lang === "fr" ? "entrée(s)" : "entry(s)"}</span>
            </div>

            {!data.expenses?.length ? (
              <p className="text-center py-10 text-[14px] text-gray-400">{t(T.noExp)}</p>
            ) : (
              <>
                {/* Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/50">
                        {[T.date, T.category, T.description, T.amount].map(col => (
                          <th key={col.fr} className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                            {t(col)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      {data.expenses.map((e: Expense) => (
                        <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                          <td className="px-5 py-3.5 text-[13px] text-gray-600 dark:text-gray-400 whitespace-nowrap">{e.expense_date?.slice(0, 10) ?? "—"}</td>
                          <td className="px-5 py-3.5">
                            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${CATEGORY_COLORS[e.category] ?? CATEGORY_COLORS.other}`}>
                              {e.category}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-[13px] text-gray-800 dark:text-gray-200">{e.title}</td>
                          <td className="px-5 py-3.5 text-[13px] font-semibold text-gray-900 dark:text-white text-right">{formatCurrency(e.amount ?? 0)}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 dark:bg-gray-800/50 border-t-2 border-gray-200 dark:border-gray-700">
                        <td colSpan={3} className="px-5 py-3.5 text-[13px] font-bold text-gray-700 dark:text-gray-300">Total</td>
                        <td className="px-5 py-3.5 text-[13px] font-bold text-gray-900 dark:text-white text-right">{formatCurrency(data.total_expenses ?? 0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Mobile */}
                <div className="md:hidden divide-y divide-gray-50 dark:divide-gray-800">
                  {data.expenses.map((e: Expense) => (
                    <div key={e.id} className="px-5 py-4 flex items-center justify-between">
                      <div>
                        <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200">{e.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[e.category] ?? CATEGORY_COLORS.other}`}>{e.category}</span>
                          <span className="text-[11px] text-gray-400">{e.expense_date?.slice(0, 10)}</span>
                        </div>
                      </div>
                      <p className="text-[14px] font-semibold text-gray-900 dark:text-white">{formatCurrency(e.amount ?? 0)}</p>
                    </div>
                  ))}
                  <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 flex justify-between">
                    <span className="text-[13px] font-bold text-gray-700 dark:text-gray-300">Total</span>
                    <span className="text-[13px] font-bold text-gray-900 dark:text-white">{formatCurrency(data.total_expenses ?? 0)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
