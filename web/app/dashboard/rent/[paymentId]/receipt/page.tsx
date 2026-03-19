"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { requireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { RentPayment } from "@/lib/types";

const T = {
  receipt:     { fr: "Reçu de paiement",          en: "Payment Receipt" },
  receiptNo:   { fr: "Reçu no.",                  en: "Receipt no." },
  tenant:      { fr: "Locataire",                 en: "Tenant" },
  property:    { fr: "Propriété",                 en: "Property" },
  period:      { fr: "Période",                   en: "Period" },
  paymentDate: { fr: "Date de paiement",          en: "Payment date" },
  method:      { fr: "Mode de paiement",          en: "Payment method" },
  status:      { fr: "Statut",                    en: "Status" },
  amountPaid:  { fr: "Montant payé",              en: "Amount paid" },
  print:       { fr: "Imprimer / Enregistrer PDF", en: "Print / Save as PDF" },
  back:        { fr: "Retour",                    en: "Back" },
  loading:     { fr: "Chargement…",               en: "Loading…" },
  notFound:    { fr: "Paiement introuvable.",     en: "Payment not found." },
  methods: {
    cheque:       { fr: "Chèque",                 en: "Cheque" },
    virement:     { fr: "Virement",               en: "Transfer" },
    interac:      { fr: "Interac",                en: "Interac" },
    cash:         { fr: "Comptant",               en: "Cash" },
    credit_card:  { fr: "Carte de crédit",        en: "Credit card" },
    pre_auth:     { fr: "Prélèvement automatique",en: "Pre-authorized debit" },
    other:        { fr: "Autre",                  en: "Other" },
  } as Record<string, { fr: string; en: string }>,
  statuses: {
    paid:    { fr: "Payé",    en: "Paid" },
    pending: { fr: "En attente", en: "Pending" },
    late:    { fr: "En retard",  en: "Late" },
  } as Record<string, { fr: string; en: string }>,
};

function fmtDate(d?: string, locale = "fr-CA") {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(locale === "fr" ? "fr-CA" : "en-CA", {
    year: "numeric", month: "long", day: "numeric",
  });
}

function fmtAmount(n?: number) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n ?? 0);
}

function fmtPeriod(my?: string) {
  if (!my) return "—";
  const [y, m] = my.split("-");
  const months = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  return `${months[parseInt(m) - 1]} ${y}`;
}

export default function ReceiptPage() {
  const { lang, t } = useLanguage();
  const router = useRouter();
  const { paymentId } = useParams<{ paymentId: string }>();
  const [payment, setPayment] = useState<RentPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!requireAuth()) return;
    api.getRentPayment(paymentId)
      .then(setPayment)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [paymentId]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (notFound || !payment) return (
    <div className="p-8 text-gray-500">{t(T.notFound)}</div>
  );

  const methodLabel = payment.payment_method
    ? (T.methods[payment.payment_method]?.[lang] ?? payment.payment_method)
    : "—";
  const statusLabel = payment.status
    ? (T.statuses[payment.status]?.[lang] ?? payment.status)
    : "—";
  const statusColor = payment.status === "paid"
    ? "text-teal-700 bg-teal-50 border-teal-200"
    : payment.status === "late"
      ? "text-red-700 bg-red-50 border-red-200"
      : "text-amber-700 bg-amber-50 border-amber-200";

  return (
    <>
      {/* Print rules */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-card, #receipt-card * { visibility: visible; }
          #receipt-card { position: fixed; inset: 0; margin: 0; box-shadow: none !important; border: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Action bar — hidden on print */}
      <div className="no-print flex items-center gap-3 p-6 pb-0 max-w-2xl">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t(T.back)}
        </button>
        <div className="flex-1" />
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-[13px] font-semibold rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          {t(T.print)}
        </button>
      </div>

      {/* Receipt card */}
      <div id="receipt-card" className="p-6 max-w-2xl">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

          {/* Header */}
          <div className="bg-teal-600 px-8 py-7 flex items-center justify-between">
            <div>
              <p className="text-teal-200 text-[11px] font-semibold uppercase tracking-widest mb-1">Domely</p>
              <h1 className="text-white text-2xl font-bold">{t(T.receipt)}</h1>
            </div>
            <div className="text-right">
              <p className="text-teal-200 text-[11px] uppercase tracking-wide mb-0.5">{t(T.receiptNo)}</p>
              <p className="text-white font-mono text-[13px] font-semibold">{payment.id?.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>

          {/* Amount Hero */}
          <div className="px-8 py-7 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-[12px] text-gray-400 uppercase tracking-wide mb-1">{t(T.amountPaid)}</p>
              <p className="text-4xl font-bold text-gray-900 tracking-tight">{fmtAmount(payment.amount)}</p>
            </div>
            <span className={`px-3 py-1.5 text-[12px] font-semibold rounded-full border ${statusColor}`}>
              {statusLabel}
            </span>
          </div>

          {/* Details grid */}
          <div className="px-8 py-6 grid grid-cols-2 gap-x-8 gap-y-5">
            <Detail label={t(T.tenant)}      value={payment.tenant_name ?? "—"} />
            <Detail label={t(T.property)}    value={payment.property_name ?? "—"} />
            <Detail label={t(T.period)}      value={fmtPeriod(payment.month_year)} />
            <Detail label={t(T.paymentDate)} value={fmtDate(payment.payment_date, lang)} />
            <Detail label={t(T.method)}      value={methodLabel} />
          </div>

          {/* Footer */}
          <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-[11px] text-gray-400">
              {lang === "fr"
                ? "Ce reçu a été généré automatiquement par Domely."
                : "This receipt was automatically generated by Domely."}
            </p>
            <p className="text-[11px] text-gray-400 font-mono">{new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-[14px] font-medium text-gray-800">{value}</p>
    </div>
  );
}
