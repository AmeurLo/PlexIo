"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/lib/ToastContext";
import { requireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { Mortgage } from "@/lib/types";
import PageHeader from "@/components/dashboard/PageHeader";
import Modal from "@/components/dashboard/Modal";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import EmptyState from "@/components/dashboard/EmptyState";
import FormField, { inputClass, selectClass } from "@/components/dashboard/FormField";

// ─── i18n ─────────────────────────────────────────────────────────────────────
const T = {
  title:          { fr: "Hypothèques",              en: "Mortgages" },
  sub:            { fr: "Gérez vos prêts hypothécaires", en: "Manage your mortgage loans" },
  add:            { fr: "Ajouter",                  en: "Add" },
  edit:           { fr: "Modifier",                 en: "Edit" },
  delete:         { fr: "Supprimer",                en: "Delete" },
  cancel:         { fr: "Annuler",                  en: "Cancel" },
  save:           { fr: "Enregistrer",              en: "Save" },
  saving:         { fr: "Enregistrement…",          en: "Saving…" },
  loading:        { fr: "Chargement…",              en: "Loading…" },
  empty:          { fr: "Aucune hypothèque",         en: "No mortgages yet" },
  emptySub:       { fr: "Ajoutez vos prêts hypothécaires pour suivre vos remboursements.", en: "Add your mortgages to track your repayments." },
  delTitle:       { fr: "Supprimer l'hypothèque ?", en: "Delete mortgage?" },
  delMsg:         { fr: "Cette action est irréversible.", en: "This action cannot be undone." },
  // form
  propertyName:   { fr: "Propriété",               en: "Property" },
  lender:         { fr: "Prêteur",                  en: "Lender" },
  balance:        { fr: "Solde actuel",             en: "Current balance" },
  originalAmount: { fr: "Montant original",         en: "Original amount" },
  interestRate:   { fr: "Taux d'intérêt (%)",       en: "Interest rate (%)" },
  monthlyPayment: { fr: "Paiement mensuel",         en: "Monthly payment" },
  termYears:      { fr: "Terme (ans)",              en: "Term (years)" },
  amortYears:     { fr: "Amortissement (ans)",      en: "Amortization (years)" },
  type:           { fr: "Type",                     en: "Type" },
  startDate:      { fr: "Date de début",            en: "Start date" },
  maturityDate:   { fr: "Date d'échéance",          en: "Maturity date" },
  nextPayment:    { fr: "Prochain paiement",        en: "Next payment" },
  fixed:          { fr: "Fixe",                     en: "Fixed" },
  variable:       { fr: "Variable",                 en: "Variable" },
  // card labels
  monthly:        { fr: "Paiement/mois",            en: "Monthly payment" },
  rate:           { fr: "Taux",                     en: "Rate" },
  remaining:      { fr: "Solde restant",            en: "Remaining balance" },
  maturity:       { fr: "Échéance",                 en: "Maturity" },
  // summary
  totalBalance:   { fr: "Solde total",              en: "Total balance" },
  totalMonthly:   { fr: "Paiements mensuels",       en: "Monthly payments" },
  mortgageCount:  { fr: "Hypothèques actives",      en: "Active mortgages" },
};

const EMPTY_FORM = {
  property_name: "", lender: "", balance: "", original_amount: "",
  interest_rate: "", monthly_payment: "", term_years: "5",
  amortization_years: "25", type: "fixed",
  start_date: "", maturity_date: "", next_payment_date: "",
};

export default function MortgagePage() {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const [mortgages, setMortgages] = useState<Mortgage[]>([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(false);
  const [editing, setEditing]     = useState<Mortgage | null>(null);
  const [delId, setDelId]         = useState<string | null>(null);
  const [form, setForm]           = useState({ ...EMPTY_FORM });
  const [saving, setSaving]       = useState(false);

  const fp = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!requireAuth()) return;
    api.getMortgages()
      .then(setMortgages)
      .catch(e => showToast(e.message, "error"))
      .finally(() => setLoading(false));
  }, []);

  function openAdd() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setModal(true);
  }

  function openEdit(m: Mortgage) {
    setEditing(m);
    setForm({
      property_name: m.property_name ?? "",
      lender: m.lender ?? "",
      balance: String(m.balance ?? ""),
      original_amount: String(m.original_amount ?? ""),
      interest_rate: String(m.interest_rate ?? ""),
      monthly_payment: String(m.monthly_payment ?? ""),
      term_years: String(m.term_years ?? "5"),
      amortization_years: String(m.amortization_years ?? "25"),
      type: m.type ?? "fixed",
      start_date: m.start_date ?? "",
      maturity_date: m.maturity_date ?? "",
      next_payment_date: m.next_payment_date ?? "",
    });
    setModal(true);
  }

  async function save() {
    if (!form.property_name || !form.lender || !form.balance || !form.monthly_payment) {
      showToast(lang === "fr" ? "Champs requis manquants" : "Required fields missing", "error");
      return;
    }
    setSaving(true);
    const payload = {
      property_name: form.property_name,
      lender: form.lender,
      balance: parseFloat(form.balance) || 0,
      original_amount: parseFloat(form.original_amount) || 0,
      interest_rate: parseFloat(form.interest_rate) || 0,
      monthly_payment: parseFloat(form.monthly_payment) || 0,
      term_years: parseInt(form.term_years) || 5,
      amortization_years: parseInt(form.amortization_years) || 25,
      type: form.type,
      start_date: form.start_date || null,
      maturity_date: form.maturity_date || null,
      next_payment_date: form.next_payment_date || null,
    };
    try {
      if (editing) {
        await (api as any).updateMortgage(editing.id, payload);
        setMortgages(prev => prev.map(m => m.id === editing.id ? { ...m, ...payload } : m));
        showToast(lang === "fr" ? "Hypothèque mise à jour" : "Mortgage updated", "success");
      } else {
        const created = await (api as any).createMortgage(payload);
        setMortgages(prev => [...prev, created]);
        showToast(lang === "fr" ? "Hypothèque ajoutée" : "Mortgage added", "success");
      }
      setModal(false);
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteMortgage() {
    if (!delId) return;
    try {
      await (api as any).deleteMortgage(delId);
      setMortgages(prev => prev.filter(m => m.id !== delId));
      showToast(lang === "fr" ? "Hypothèque supprimée" : "Mortgage deleted", "success");
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setDelId(null);
    }
  }

  const totalBalance  = mortgages.reduce((s, m) => s + (m.balance ?? 0), 0);
  const totalMonthly  = mortgages.reduce((s, m) => s + (m.monthly_payment ?? 0), 0);

  const cardClass = "bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)]";

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <PageHeader
        title={t(T.title)}
        subtitle={t(T.sub)}
        actions={
          <button onClick={openAdd}
            className="px-4 py-2 text-[13px] font-semibold text-white rounded-xl bg-teal-600 hover:bg-teal-700 transition-colors">
            + {t(T.add)}
          </button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : mortgages.length === 0 ? (
        <EmptyState icon="building" title={t(T.empty)} description={t(T.emptySub)} action={{ label: t(T.add), onClick: openAdd }} />
      ) : (
        <>
          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: t(T.mortgageCount), value: String(mortgages.length) },
              { label: t(T.totalBalance),  value: formatCurrency(totalBalance) },
              { label: t(T.totalMonthly),  value: formatCurrency(totalMonthly) + "/mo" },
            ].map(s => (
              <div key={s.label} className={`${cardClass} p-5 text-center`}>
                <p className="text-[26px] font-bold text-gray-900 dark:text-white">{s.value}</p>
                <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mortgages.map(m => (
              <div key={m.id} className={`${cardClass} p-6`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-[15px]">{m.property_name}</p>
                    <p className="text-[13px] text-gray-500 dark:text-gray-400">{m.lender}</p>
                  </div>
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                    m.type === "variable"
                      ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  }`}>
                    {m.type === "variable" ? t(T.variable) : t(T.fixed)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <p className="text-[11px] text-gray-400 mb-0.5">{t(T.remaining)}</p>
                    <p className="text-[15px] font-bold text-gray-900 dark:text-white">{formatCurrency(m.balance ?? 0)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <p className="text-[11px] text-gray-400 mb-0.5">{t(T.monthly)}</p>
                    <p className="text-[15px] font-bold text-gray-900 dark:text-white">{formatCurrency(m.monthly_payment ?? 0)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <p className="text-[11px] text-gray-400 mb-0.5">{t(T.rate)}</p>
                    <p className="text-[15px] font-bold text-gray-900 dark:text-white">{m.interest_rate ?? 0}%</p>
                  </div>
                  {m.maturity_date && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                      <p className="text-[11px] text-gray-400 mb-0.5">{t(T.maturity)}</p>
                      <p className="text-[14px] font-semibold text-gray-900 dark:text-white">{m.maturity_date.slice(0, 10)}</p>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {m.original_amount && m.balance && m.original_amount > 0 && (
                  <div className="mb-4">
                    <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                      <span>{lang === "fr" ? "Remboursé" : "Repaid"}</span>
                      <span>{Math.round(((m.original_amount - m.balance) / m.original_amount) * 100)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.round(((m.original_amount - m.balance) / m.original_amount) * 100))}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <button onClick={() => openEdit(m)}
                    className="flex-1 py-2 text-[13px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/20 dark:text-teal-400 dark:hover:bg-teal-900/40 rounded-xl transition-colors">
                    {t(T.edit)}
                  </button>
                  <button onClick={() => setDelId(m.id)}
                    className="py-2 px-4 text-[13px] font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                    {t(T.delete)}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)}
        title={editing ? t(T.edit) : `${t(T.add)} — ${t(T.title)}`}
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => setModal(false)} className="px-4 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">{t(T.cancel)}</button>
            <button onClick={save} disabled={saving}
              className="px-5 py-2 text-[13px] font-semibold text-white rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 transition-colors">
              {saving ? t(T.saving) : t(T.save)}
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t(T.propertyName)} required>
            <input className={inputClass} value={form.property_name} onChange={e => fp("property_name", e.target.value)} />
          </FormField>
          <FormField label={t(T.lender)} required>
            <input className={inputClass} value={form.lender} onChange={e => fp("lender", e.target.value)} />
          </FormField>
          <FormField label={t(T.balance)} required>
            <input className={inputClass} type="number" min="0" value={form.balance} onChange={e => fp("balance", e.target.value)} />
          </FormField>
          <FormField label={t(T.originalAmount)}>
            <input className={inputClass} type="number" min="0" value={form.original_amount} onChange={e => fp("original_amount", e.target.value)} />
          </FormField>
          <FormField label={t(T.interestRate)} required>
            <input className={inputClass} type="number" step="0.01" min="0" value={form.interest_rate} onChange={e => fp("interest_rate", e.target.value)} />
          </FormField>
          <FormField label={t(T.monthlyPayment)} required>
            <input className={inputClass} type="number" min="0" value={form.monthly_payment} onChange={e => fp("monthly_payment", e.target.value)} />
          </FormField>
          <FormField label={t(T.termYears)}>
            <input className={inputClass} type="number" min="1" max="30" value={form.term_years} onChange={e => fp("term_years", e.target.value)} />
          </FormField>
          <FormField label={t(T.amortYears)}>
            <input className={inputClass} type="number" min="1" max="30" value={form.amortization_years} onChange={e => fp("amortization_years", e.target.value)} />
          </FormField>
          <FormField label={t(T.type)}>
            <select className={selectClass} value={form.type} onChange={e => fp("type", e.target.value)}>
              <option value="fixed">{t(T.fixed)}</option>
              <option value="variable">{t(T.variable)}</option>
            </select>
          </FormField>
          <FormField label={t(T.startDate)}>
            <input className={inputClass} type="date" value={form.start_date} onChange={e => fp("start_date", e.target.value)} />
          </FormField>
          <FormField label={t(T.maturityDate)}>
            <input className={inputClass} type="date" value={form.maturity_date} onChange={e => fp("maturity_date", e.target.value)} />
          </FormField>
          <FormField label={t(T.nextPayment)}>
            <input className={inputClass} type="date" value={form.next_payment_date} onChange={e => fp("next_payment_date", e.target.value)} />
          </FormField>
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!delId}
        title={t(T.delTitle)}
        message={t(T.delMsg)}
        onConfirm={deleteMortgage}
        onCancel={() => setDelId(null)}
      />
    </div>
  );
}
