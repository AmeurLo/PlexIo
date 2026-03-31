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
  const [payments, setPayments]         = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    if (!requireTenantAuth()) return;
    tenantApi.getPayments()
      .then(p => setPayments(Array.isArray(p) ? p : []))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  async function handleDownloadReceipt(id: string, monthYear: string) {
    setDownloadingId(id);
    setDownloadError("");
    try {
      const blob = await tenantApi.downloadReceipt(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recu-${(monthYear || "loyer").replace(/\//g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError(lang === "fr" ? "Erreur lors du téléchargement du reçu." : "Failed to download receipt.");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-bold text-gray-900 dark:text-white">{t(T.title)}</h1>
        <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-0.5">{t(T.sub)}</p>
      </div>

      {downloadError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-[13px] text-red-600 dark:text-red-400">
          {downloadError}
        </div>
      )}

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
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {payments.map((p: any, i: number) => {
                    const st = STATUS[p.status] ?? STATUS.pending;
                    const pid = String(p.id ?? p._id ?? i);
                    return (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-5 py-3.5 font-medium text-gray-800 dark:text-gray-200">{p.month ?? p.period ?? p.month_year ?? "—"}</td>
                        <td className="px-5 py-3.5 text-gray-500">{formatDate(p.paid_at ?? p.payment_date ?? p.due_at)}</td>
                        <td className="px-5 py-3.5 text-right">
                          {(p.late_fee_amount > 0 && !p.late_fee_waived) ? (
                            <div className="text-right">
                              <p className="text-[11px] text-gray-400">{lang === "fr" ? "Loyer" : "Rent"}: {formatCurrency(p.amount ?? 0)}</p>
                              <p className="text-[11px] text-red-500">+ {formatCurrency(p.late_fee_amount)} {lang === "fr" ? "frais retard" : "late fee"}</p>
                              <p className="font-semibold text-gray-800 dark:text-gray-200">{formatCurrency((p.amount ?? 0) + p.late_fee_amount)}</p>
                            </div>
                          ) : (
                            <span className="font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(p.amount ?? 0)}</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${st.classes}`}>
                            {lang === "fr" ? st.fr : st.en}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {p.status === "paid" && (
                            <button
                              onClick={() => handleDownloadReceipt(pid, p.month_year ?? p.month ?? "")}
                              disabled={downloadingId === pid}
                              className="inline-flex items-center gap-1 text-[12px] text-gray-500 hover:text-teal-600 hover:underline disabled:opacity-50"
                              title={lang === "fr" ? "Télécharger le reçu PDF" : "Download PDF receipt"}
                            >
                              {downloadingId === pid ? (
                                <span className="w-3 h-3 border border-teal-500 border-t-transparent rounded-full animate-spin inline-block" />
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              )}
                              {lang === "fr" ? "Reçu" : "Receipt"}
                            </button>
                          )}
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
                const pid = String(p.id ?? p._id ?? i);
                return (
                  <div key={i} className="px-5 py-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-gray-800 dark:text-gray-200">{p.month ?? p.period ?? p.month_year ?? "—"}</p>
                      <p className="text-[12px] text-gray-400 mt-0.5">{formatDate(p.paid_at ?? p.payment_date ?? p.due_at)}</p>
                    </div>
                    <div className="text-right">
                      {(p.late_fee_amount > 0 && !p.late_fee_waived) ? (
                        <div>
                          <p className="text-[11px] text-gray-400">{formatCurrency(p.amount ?? 0)} + <span className="text-red-500">{formatCurrency(p.late_fee_amount)}</span></p>
                          <p className="text-[15px] font-semibold text-gray-800 dark:text-gray-200">{formatCurrency((p.amount ?? 0) + p.late_fee_amount)}</p>
                        </div>
                      ) : (
                        <p className="text-[15px] font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(p.amount ?? 0)}</p>
                      )}
                      <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${st.classes}`}>
                        {lang === "fr" ? st.fr : st.en}
                      </span>
                    </div>
                    {p.status === "paid" && (
                      <button
                        onClick={() => handleDownloadReceipt(pid, p.month_year ?? p.month ?? "")}
                        disabled={downloadingId === pid}
                        className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-900/20 disabled:opacity-50"
                      >
                        {downloadingId === pid ? (
                          <span className="w-3 h-3 border border-teal-500 border-t-transparent rounded-full animate-spin inline-block" />
                        ) : (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        )}
                        {lang === "fr" ? "Reçu" : "Receipt"}
                      </button>
                    )}
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
