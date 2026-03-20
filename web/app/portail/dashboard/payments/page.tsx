"use client";
import { useEffect, useState, useCallback } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { requireTenantAuth, tenantApi } from "@/lib/tenantApi";
import { formatCurrency, formatDate } from "@/lib/format";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const STRIPE_PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : null;

const T = {
  title:      { fr: "Historique des loyers",  en: "Payment history" },
  sub:        { fr: "Tous vos paiements",      en: "All your rent payments" },
  date:       { fr: "Date",                    en: "Date" },
  amount:     { fr: "Montant",                en: "Amount" },
  status:     { fr: "Statut",                en: "Status" },
  period:     { fr: "Période",               en: "Period" },
  empty:      { fr: "Aucun paiement trouvé",  en: "No payments found" },
  loading:    { fr: "Chargement…",            en: "Loading…" },
  payBtn:     { fr: "Payer le loyer",         en: "Pay rent" },
  paying:     { fr: "Traitement…",            en: "Processing…" },
  paySuccess: { fr: "Paiement réussi ! ✅",   en: "Payment successful! ✅" },
  payError:   { fr: "Erreur de paiement",     en: "Payment error" },
  cancel:     { fr: "Annuler",                en: "Cancel" },
  payTitle:   { fr: "Payer votre loyer",      en: "Pay your rent" },
  noStripe:   { fr: "Le propriétaire n'a pas encore configuré les paiements en ligne.", en: "Your landlord hasn't set up online payments yet." },
};

const STATUS: Record<string, { fr: string; en: string; classes: string }> = {
  paid:    { fr: "Payé",       en: "Paid",    classes: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  late:    { fr: "En retard",  en: "Late",    classes: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  pending: { fr: "En attente", en: "Pending", classes: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
};

// ─── Inner checkout form (needs to be inside <Elements>) ─────────────────────
function CheckoutForm({
  amount,
  onSuccess,
  onCancel,
  lang,
}: {
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
  lang: string;
}) {
  const stripe   = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError("");
    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });
    if (stripeError) {
      setError(stripeError.message ?? (lang === "fr" ? "Erreur inconnue" : "Unknown error"));
      setProcessing(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="text-center mb-4">
        <p className="text-[28px] font-bold text-gray-900 dark:text-white">{formatCurrency(amount)}</p>
        <p className="text-[12px] text-gray-400 mt-0.5">{lang === "fr" ? "Loyer mensuel" : "Monthly rent"}</p>
      </div>
      <PaymentElement />
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-[13px] text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={processing || !stripe}
          className="flex-1 py-3 text-[14px] font-semibold text-white rounded-xl disabled:opacity-60 hover:scale-[1.01] active:scale-[0.99] transition-all"
          style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}
        >
          {processing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {lang === "fr" ? "Traitement…" : "Processing…"}
            </span>
          ) : (
            lang === "fr" ? `Payer ${formatCurrency(amount)}` : `Pay ${formatCurrency(amount)}`
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-3 text-[14px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl transition-colors"
        >
          {lang === "fr" ? "Annuler" : "Cancel"}
        </button>
      </div>
    </form>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TenantPaymentsPage() {
  const { lang, t } = useLanguage();
  const [payments, setPayments]           = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [showPayModal, setShowPayModal]   = useState(false);
  const [clientSecret, setClientSecret]   = useState<string | null>(null);
  const [payAmount, setPayAmount]         = useState(0);
  const [intentLoading, setIntentLoading] = useState(false);
  const [intentError, setIntentError]     = useState("");
  const [paySuccess, setPaySuccess]       = useState(false);

  const hasPendingPayment = payments.some(p => p.status === "pending" || p.status === "late");

  useEffect(() => {
    if (!requireTenantAuth()) return;
    tenantApi.getPayments()
      .then(p => setPayments(Array.isArray(p) ? p : []))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const handleOpenPay = useCallback(async () => {
    setIntentLoading(true);
    setIntentError("");
    try {
      const { client_secret, amount } = await tenantApi.createPaymentIntent();
      setClientSecret(client_secret);
      setPayAmount(amount);
      setShowPayModal(true);
    } catch (e: any) {
      setIntentError(e.message ?? (lang === "fr" ? "Erreur de création" : "Creation failed"));
    } finally {
      setIntentLoading(false);
    }
  }, [lang]);

  function handlePaySuccess() {
    setShowPayModal(false);
    setClientSecret(null);
    setPaySuccess(true);
    // Refresh payments list
    tenantApi.getPayments()
      .then(p => setPayments(Array.isArray(p) ? p : []))
      .catch(() => {});
    setTimeout(() => setPaySuccess(false), 6000);
  }

  const cardClass = "bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)]";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-bold text-gray-900 dark:text-white">{t(T.title)}</h1>
        <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-0.5">{t(T.sub)}</p>
      </div>

      {/* Pay Rent CTA */}
      {!loading && (
        <div className={`${cardClass} p-5 flex items-center justify-between gap-4 flex-wrap`}>
          <div>
            <p className="text-[14px] font-semibold text-gray-800 dark:text-gray-200">
              {lang === "fr" ? "Payer en ligne" : "Pay online"}
            </p>
            <p className="text-[12px] text-gray-400 mt-0.5">
              {lang === "fr" ? "Visa, Mastercard, Amex acceptés" : "Visa, Mastercard, Amex accepted"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={handleOpenPay}
              disabled={intentLoading || !stripePromise}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold text-white rounded-xl disabled:opacity-60 hover:scale-[1.01] active:scale-[0.99] transition-all"
              style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}
            >
              {intentLoading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>💳</span>
              )}
              {t(T.payBtn)}
            </button>
            {!stripePromise && (
              <p className="text-[11px] text-gray-400 text-right max-w-[220px]">{t(T.noStripe)}</p>
            )}
            {intentError && (
              <p className="text-[12px] text-red-500">{intentError}</p>
            )}
          </div>
        </div>
      )}

      {/* Payment success banner */}
      {paySuccess && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl px-5 py-4 text-[14px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-3">
          <span className="text-xl">✅</span>
          {t(T.paySuccess)}
        </div>
      )}

      {/* Payments list */}
      <div className={`${cardClass} overflow-hidden`}>
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
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

      {/* Stripe Payment Modal */}
      {showPayModal && clientSecret && stripePromise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`${cardClass} w-full max-w-md p-6`}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">{t(T.payTitle)}</h2>
              <button
                onClick={() => { setShowPayModal(false); setClientSecret(null); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors text-lg"
              >
                ×
              </button>
            </div>
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: "stripe",
                  variables: { colorPrimary: "#1E7A6E" },
                },
              }}
            >
              <CheckoutForm
                amount={payAmount}
                onSuccess={handlePaySuccess}
                onCancel={() => { setShowPayModal(false); setClientSecret(null); }}
                lang={lang}
              />
            </Elements>
          </div>
        </div>
      )}
    </div>
  );
}
