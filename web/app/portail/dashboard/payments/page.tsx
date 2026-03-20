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
  // Online pay
  payOnline:  { fr: "Payer par carte",        en: "Pay by card" },
  payOnlineSub: { fr: "Visa, Mastercard, Amex", en: "Visa, Mastercard, Amex" },
  payBtn:     { fr: "Payer en ligne",         en: "Pay online" },
  payTitle:   { fr: "Payer votre loyer",      en: "Pay your rent" },
  paySuccess: { fr: "Paiement réussi ! ✅",   en: "Payment successful! ✅" },
  noStripe:   { fr: "Le propriétaire n'a pas encore activé les paiements en ligne.", en: "Your landlord hasn't enabled online payments yet." },
  // Manual confirm
  confirmTitle:  { fr: "Confirmer un paiement", en: "Confirm a payment" },
  confirmSub:    { fr: "Virement Interac, comptant, chèque", en: "E-transfer, cash, cheque" },
  confirmBtn:    { fr: "J'ai payé",             en: "I've paid" },
  confirmModal:  { fr: "Confirmer mon paiement", en: "Confirm my payment" },
  methodLabel:   { fr: "Méthode de paiement",    en: "Payment method" },
  noteLabel:     { fr: "Note pour le propriétaire (optionnel)", en: "Note to landlord (optional)" },
  notePlaceholder: { fr: "Ex: Virement envoyé le 1er…", en: "E.g. Transfer sent on the 1st…" },
  send:          { fr: "Envoyer la confirmation", en: "Send confirmation" },
  sending:       { fr: "Envoi…",                  en: "Sending…" },
  confirmSuccess: { fr: "Confirmation envoyée ! Le propriétaire sera notifié. ✅", en: "Confirmation sent! Your landlord will be notified. ✅" },
  cancel:        { fr: "Annuler",                  en: "Cancel" },
  pendingConfirm: { fr: "En attente de confirmation", en: "Awaiting confirmation" },
};

const PAYMENT_METHODS = [
  { value: "etransfer", fr: "Virement Interac (e-Transfer)", en: "Interac e-Transfer" },
  { value: "cash",      fr: "Comptant",                      en: "Cash" },
  { value: "cheque",    fr: "Chèque",                        en: "Cheque" },
  { value: "other",     fr: "Autre",                         en: "Other" },
];

const STATUS: Record<string, { fr: string; en: string; classes: string }> = {
  paid:                 { fr: "Payé",                      en: "Paid",                  classes: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  late:                 { fr: "En retard",                 en: "Late",                  classes: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  pending:              { fr: "En attente",                en: "Pending",               classes: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  pending_confirmation: { fr: "En attente de confirmation", en: "Awaiting confirmation", classes: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
};

// ─── Stripe inline checkout form ─────────────────────────────────────────────
function CheckoutForm({
  amount, rentAmount, processingFee, onSuccess, onCancel, lang,
}: {
  amount: number; rentAmount: number; processingFee: number;
  onSuccess: () => void; onCancel: () => void; lang: string;
}) {
  const stripe   = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true); setError("");
    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });
    if (stripeError) { setError(stripeError.message ?? "Error"); setProcessing(false); }
    else { onSuccess(); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Fee breakdown */}
      <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 space-y-2 text-[13px]">
        <div className="flex justify-between text-gray-600 dark:text-gray-400">
          <span>{lang === "fr" ? "Loyer" : "Rent"}</span>
          <span>{formatCurrency(rentAmount)}</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>{lang === "fr" ? "Frais de traitement" : "Processing fee"}</span>
          <span>{formatCurrency(processingFee)}</span>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between font-bold text-gray-900 dark:text-white text-[14px]">
          <span>Total</span>
          <span>{formatCurrency(amount)}</span>
        </div>
        <p className="text-[10px] text-gray-400">
          {lang === "fr" ? "Frais : Stripe (2,9%+0,30$) + Domely (1%)" : "Fees: Stripe (2.9%+$0.30) + Domely (1%)"}
        </p>
      </div>
      <PaymentElement />
      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-[13px] text-red-600 dark:text-red-400">{error}</div>}
      <div className="flex gap-3">
        <button type="submit" disabled={processing || !stripe}
          className="flex-1 py-3 text-[14px] font-semibold text-white rounded-xl disabled:opacity-60 transition-all"
          style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}>
          {processing
            ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{lang === "fr" ? "Traitement…" : "Processing…"}</span>
            : (lang === "fr" ? `Payer ${formatCurrency(amount)}` : `Pay ${formatCurrency(amount)}`)}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-3 text-[14px] font-medium text-gray-500 border border-gray-200 dark:border-gray-700 rounded-xl transition-colors">
          {lang === "fr" ? "Annuler" : "Cancel"}
        </button>
      </div>
    </form>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TenantPaymentsPage() {
  const { lang, t } = useLanguage();
  const [payments, setPayments]               = useState<any[]>([]);
  const [loading, setLoading]                 = useState(true);

  // Online pay (Stripe)
  const [showPayModal, setShowPayModal]         = useState(false);
  const [clientSecret, setClientSecret]         = useState<string | null>(null);
  const [payAmount, setPayAmount]               = useState(0);
  const [payRentAmount, setPayRentAmount]       = useState(0);
  const [payProcessingFee, setPayProcessingFee] = useState(0);
  const [intentLoading, setIntentLoading]       = useState(false);
  const [intentError, setIntentError]           = useState("");
  const [paySuccess, setPaySuccess]             = useState(false);

  // Manual confirm (e-transfer etc.)
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMethod, setConfirmMethod]       = useState("etransfer");
  const [confirmNote, setConfirmNote]           = useState("");
  const [confirmSending, setConfirmSending]     = useState(false);
  const [confirmError, setConfirmError]         = useState("");
  const [confirmSuccess, setConfirmSuccess]     = useState(false);

  const reload = () => tenantApi.getPayments().then(p => setPayments(Array.isArray(p) ? p : [])).catch(() => {});

  useEffect(() => {
    if (!requireTenantAuth()) return;
    reload().finally(() => setLoading(false));
  }, []);

  // Online pay handlers
  const handleOpenPay = useCallback(async () => {
    setIntentLoading(true); setIntentError("");
    try {
      const res = await tenantApi.createPaymentIntent() as any;
      setClientSecret(res.client_secret);
      setPayAmount(res.amount);
      setPayRentAmount(res.rent_amount ?? res.amount);
      setPayProcessingFee(res.processing_fee ?? 0);
      setShowPayModal(true);
    } catch (e: any) {
      setIntentError(e.message ?? (lang === "fr" ? "Erreur" : "Error"));
    } finally { setIntentLoading(false); }
  }, [lang]);

  function handlePaySuccess() {
    setShowPayModal(false); setClientSecret(null); setPaySuccess(true);
    reload();
    setTimeout(() => setPaySuccess(false), 6000);
  }

  // Manual confirm handlers
  async function handleConfirmSubmit(e: React.FormEvent) {
    e.preventDefault();
    setConfirmSending(true); setConfirmError("");
    try {
      await tenantApi.confirmPayment({ method: confirmMethod, note: confirmNote || undefined });
      setShowConfirmModal(false); setConfirmNote(""); setConfirmSuccess(true);
      reload();
      setTimeout(() => setConfirmSuccess(false), 6000);
    } catch (e: any) {
      setConfirmError(e.message ?? (lang === "fr" ? "Erreur" : "Error"));
    } finally { setConfirmSending(false); }
  }

  const cardClass = "bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)]";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-bold text-gray-900 dark:text-white">{t(T.title)}</h1>
        <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-0.5">{t(T.sub)}</p>
      </div>

      {/* Payment options — two cards */}
      {!loading && (
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Card 1 — Online (Stripe) */}
          <div className={`${cardClass} p-5 flex flex-col gap-3`}>
            <div>
              <p className="text-[14px] font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <span>💳</span> {t(T.payOnline)}
              </p>
              <p className="text-[12px] text-gray-400 mt-0.5">{t(T.payOnlineSub)}</p>
            </div>
            <button
              onClick={handleOpenPay}
              disabled={intentLoading || !stripePromise}
              className="mt-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-white rounded-xl disabled:opacity-50 transition-all hover:scale-[1.01]"
              style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}
            >
              {intentLoading
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <span>💳</span>}
              {t(T.payBtn)}
            </button>
            {!stripePromise && <p className="text-[11px] text-gray-400">{t(T.noStripe)}</p>}
            {intentError && <p className="text-[12px] text-red-500">{intentError}</p>}
          </div>

          {/* Card 2 — Manual confirm */}
          <div className={`${cardClass} p-5 flex flex-col gap-3`}>
            <div>
              <p className="text-[14px] font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <span>📨</span> {t(T.confirmTitle)}
              </p>
              <p className="text-[12px] text-gray-400 mt-0.5">{t(T.confirmSub)}</p>
            </div>
            <button
              onClick={() => { setConfirmError(""); setShowConfirmModal(true); }}
              className="mt-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-semibold rounded-xl border-2 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
            >
              <span>✅</span> {t(T.confirmBtn)}
            </button>
          </div>
        </div>
      )}

      {/* Success banners */}
      {paySuccess && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl px-5 py-4 text-[14px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-3">
          <span className="text-xl">✅</span> {t(T.paySuccess)}
        </div>
      )}
      {confirmSuccess && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl px-5 py-4 text-[14px] font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-3">
          <span className="text-xl">📨</span> {t(T.confirmSuccess)}
        </div>
      )}

      {/* Payment history */}
      <div className={`${cardClass} overflow-hidden`}>
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
                        <td className="px-5 py-3.5 font-medium text-gray-800 dark:text-gray-200">{p.month ?? p.period ?? p.month_year ?? "—"}</td>
                        <td className="px-5 py-3.5 text-gray-500">{formatDate(p.paid_at ?? p.payment_date ?? p.due_at)}</td>
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
                      <p className="text-[14px] font-medium text-gray-800 dark:text-gray-200">{p.month ?? p.period ?? p.month_year ?? "—"}</p>
                      <p className="text-[12px] text-gray-400 mt-0.5">{formatDate(p.paid_at ?? p.payment_date ?? p.due_at)}</p>
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

      {/* ── Stripe Payment Modal ─────────────────────────────────────────── */}
      {showPayModal && clientSecret && stripePromise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`${cardClass} w-full max-w-md p-6`}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">{t(T.payTitle)}</h2>
              <button onClick={() => { setShowPayModal(false); setClientSecret(null); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 text-lg">×</button>
            </div>
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe", variables: { colorPrimary: "#1E7A6E" } } }}>
              <CheckoutForm
                amount={payAmount} rentAmount={payRentAmount} processingFee={payProcessingFee}
                onSuccess={handlePaySuccess}
                onCancel={() => { setShowPayModal(false); setClientSecret(null); }}
                lang={lang}
              />
            </Elements>
          </div>
        </div>
      )}

      {/* ── Manual Confirm Modal ─────────────────────────────────────────── */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`${cardClass} w-full max-w-sm p-6`}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">{t(T.confirmModal)}</h2>
              <button onClick={() => setShowConfirmModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 text-lg">×</button>
            </div>
            <form onSubmit={handleConfirmSubmit} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-gray-600 dark:text-gray-400 mb-1.5">{t(T.methodLabel)}</label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(m => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setConfirmMethod(m.value)}
                      className={`py-2 px-3 rounded-xl text-[13px] font-medium border-2 transition-all text-left ${
                        confirmMethod === m.value
                          ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400"
                          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                      }`}
                    >
                      {lang === "fr" ? m.fr : m.en}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-600 dark:text-gray-400 mb-1.5">{t(T.noteLabel)}</label>
                <textarea
                  value={confirmNote}
                  onChange={e => setConfirmNote(e.target.value)}
                  rows={2}
                  placeholder={t(T.notePlaceholder)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[13px] resize-none focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                />
              </div>
              {confirmError && <p className="text-[12px] text-red-500">{confirmError}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={confirmSending}
                  className="flex-1 py-3 text-[14px] font-semibold text-white rounded-xl disabled:opacity-60 transition-all"
                  style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}
                >
                  {confirmSending
                    ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{t(T.sending)}</span>
                    : t(T.send)}
                </button>
                <button type="button" onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-3 text-[14px] font-medium text-gray-500 border border-gray-200 dark:border-gray-700 rounded-xl">
                  {t(T.cancel)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
