"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { requireTenantAuth, tenantApi } from "@/lib/tenantApi";
import { formatCurrency, formatDate } from "@/lib/format";

const T = {
  title:   { fr: "Historique des loyers",  en: "Payment history" },
  sub:     { fr: "Tous vos paiements",     en: "All your rent payments" },
  date:    { fr: "Date",                   en: "Date" },
  amount:  { fr: "Montant",               en: "Amount" },
  status:  { fr: "Statut",               en: "Status" },
  period:  { fr: "Période",              en: "Period" },
  empty:   { fr: "Aucun paiement trouvé", en: "No payments found" },
  loading: { fr: "Chargement…",           en: "Loading…" },
  paid:    { fr: "Payé",                  en: "Paid" },
  late:    { fr: "En retard",             en: "Late" },
  pending: { fr: "En attente",            en: "Pending" },
};

const STATUS: Record<string, { fr: string; en: string; classes: string }> = {
  paid:    { fr: "Payé",       en: "Paid",    classes: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  late:    { fr: "En retard",  en: "Late",    classes: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  pending: { fr: "En attente", en: "Pending", classes: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
};

export default function TenantPaymentsPage() {
  const { lang, t } = useLanguage();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!requireTenantAuth()) return;
    tenantApi.getPayments()
      .then(p => setPayments(Array.isArray(p) ? p : []))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-bold text-gray-900 dark:text-white">{t(T.title)}</h1>
        <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-0.5">{t(T.sub)}</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : payments.length === 0 ? (
          <p className="text-[14px] text-gray-400 text-center py-16">{t(T.empty)}</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                    <th className="px-5 py-3 text-left">{t(T.period)}</th>
                    <th className="px-5 py-3 text-left">{t(T.date)}</th>
                    <th className="px-5 py-3 text-right">{t(T.amount)}</th>
                    <th className="px-5 py-3 text-left">{t(T.status)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {payments.map((p: any, i: number) => {
                    const st = STATUS[p.status] ?? STATUS.pending;
                    return (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-5 py-3.5 font-medium text-gray-800 dark:text-gray-200">{p.month ?? p.period ?? "—"}</td>
                        <td className="px-5 py-3.5 text-gray-500">{formatDate(p.paid_at ?? p.due_at)}</td>
                        <td className="px-5 py-3.5 text-right font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(p.amount ?? 0)}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${st.classes}`}>
                            {lang === "fr" ? st.fr : st.en}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-50 dark:divide-gray-800">
              {payments.map((p: any, i: number) => {
                const st = STATUS[p.status] ?? STATUS.pending;
                return (
                  <div key={i} className="px-5 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-[14px] font-medium text-gray-800 dark:text-gray-200">{p.month ?? p.period ?? "—"}</p>
                      <p className="text-[12px] text-gray-400 mt-0.5">{formatDate(p.paid_at ?? p.due_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[15px] font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(p.amount ?? 0)}</p>
                      <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${st.classes}`}>
                        {lang === "fr" ? st.fr : st.en}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
