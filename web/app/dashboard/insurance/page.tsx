"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/lib/ToastContext";
import { requireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { Insurance } from "@/lib/types";
import PageHeader from "@/components/dashboard/PageHeader";
import Modal from "@/components/dashboard/Modal";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import EmptyState from "@/components/dashboard/EmptyState";
import FormField, { inputClass, selectClass } from "@/components/dashboard/FormField";

// ─── i18n ─────────────────────────────────────────────────────────────────────
const T = {
  title:          { fr: "Assurances",               en: "Insurance" },
  sub:            { fr: "Gérez vos polices d'assurance", en: "Manage your insurance policies" },
  add:            { fr: "Ajouter",                  en: "Add" },
  edit:           { fr: "Modifier",                 en: "Edit" },
  delete:         { fr: "Supprimer",                en: "Delete" },
  cancel:         { fr: "Annuler",                  en: "Cancel" },
  save:           { fr: "Enregistrer",              en: "Save" },
  saving:         { fr: "Enregistrement…",          en: "Saving…" },
  loading:        { fr: "Chargement…",              en: "Loading…" },
  empty:          { fr: "Aucune assurance",          en: "No insurance policies yet" },
  emptySub:       { fr: "Ajoutez vos polices pour ne jamais manquer un renouvellement.", en: "Add your policies to never miss a renewal." },
  delTitle:       { fr: "Supprimer la police ?",    en: "Delete policy?" },
  delMsg:         { fr: "Cette action est irréversible.", en: "This action cannot be undone." },
  // form
  propertyName:   { fr: "Propriété",               en: "Property" },
  insurer:        { fr: "Assureur",                 en: "Insurer" },
  policyNumber:   { fr: "N° de police",             en: "Policy number" },
  type:           { fr: "Type",                     en: "Type" },
  annualPremium:  { fr: "Prime annuelle",           en: "Annual premium" },
  coverageAmount: { fr: "Montant de couverture",   en: "Coverage amount" },
  renewalDate:    { fr: "Date de renouvellement",  en: "Renewal date" },
  deductible:     { fr: "Franchise",               en: "Deductible" },
  contactPhone:   { fr: "Téléphone contact",        en: "Contact phone" },
  // types
  comprehensive:  { fr: "Tous risques",            en: "Comprehensive" },
  liability:      { fr: "Responsabilité civile",   en: "Liability" },
  fire:           { fr: "Incendie",                en: "Fire" },
  flood:          { fr: "Inondation",              en: "Flood" },
  other:          { fr: "Autre",                   en: "Other" },
  // card
  premium:        { fr: "Prime/an",                en: "Premium/yr" },
  coverage:       { fr: "Couverture",              en: "Coverage" },
  renewal:        { fr: "Renouvellement",          en: "Renewal" },
  expiringSoon:   { fr: "Bientôt expiré",          en: "Expiring soon" },
  // summary
  totalPolicies:  { fr: "Polices actives",         en: "Active policies" },
  totalPremium:   { fr: "Primes annuelles",        en: "Annual premiums" },
  expiring:       { fr: "Expirent bientôt",        en: "Expiring soon" },
};

const POLICY_TYPES = ["comprehensive", "liability", "fire", "flood", "other"] as const;

const EMPTY_FORM = {
  property_name: "", insurer: "", policy_number: "",
  type: "comprehensive", annual_premium: "", coverage_amount: "",
  renewal_date: "", deductible: "", contact_phone: "",
};

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  return Math.round((d.getTime() - Date.now()) / 86400000);
}

export default function InsurancePage() {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const [policies, setPolicies] = useState<Insurance[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState<Insurance | null>(null);
  const [delId, setDelId]       = useState<string | null>(null);
  const [form, setForm]         = useState({ ...EMPTY_FORM });
  const [saving, setSaving]     = useState(false);

  const fp = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!requireAuth()) return;
    api.getInsurances()
      .then(setPolicies)
      .catch(e => showToast(e.message, "error"))
      .finally(() => setLoading(false));
  }, []);

  function openAdd() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setModal(true);
  }

  function openEdit(p: Insurance) {
    setEditing(p);
    setForm({
      property_name: p.property_name ?? "",
      insurer: p.insurer ?? "",
      policy_number: p.policy_number ?? "",
      type: p.type ?? "comprehensive",
      annual_premium: String(p.annual_premium ?? ""),
      coverage_amount: String(p.coverage_amount ?? ""),
      renewal_date: p.renewal_date ?? "",
      deductible: String(p.deductible ?? ""),
      contact_phone: p.contact_phone ?? "",
    });
    setModal(true);
  }

  async function save() {
    if (!form.property_name || !form.insurer || !form.annual_premium) {
      showToast(lang === "fr" ? "Champs requis manquants" : "Required fields missing", "error");
      return;
    }
    setSaving(true);
    const payload = {
      property_name: form.property_name,
      insurer: form.insurer,
      policy_number: form.policy_number || "",
      type: form.type,
      annual_premium: parseFloat(form.annual_premium) || 0,
      coverage_amount: parseFloat(form.coverage_amount) || 0,
      renewal_date: form.renewal_date || null,
      deductible: parseFloat(form.deductible) || 0,
      contact_phone: form.contact_phone || "",
    };
    try {
      if (editing) {
        await (api as any).updateInsurance(editing.id, payload);
        setPolicies(prev => prev.map(p => p.id === editing.id ? { ...p, ...payload } : p));
        showToast(lang === "fr" ? "Police mise à jour" : "Policy updated", "success");
      } else {
        const created = await (api as any).createInsurance(payload);
        setPolicies(prev => [...prev, created]);
        showToast(lang === "fr" ? "Police ajoutée" : "Policy added", "success");
      }
      setModal(false);
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function deletePolicy() {
    if (!delId) return;
    try {
      await (api as any).deleteInsurance(delId);
      setPolicies(prev => prev.filter(p => p.id !== delId));
      showToast(lang === "fr" ? "Police supprimée" : "Policy deleted", "success");
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setDelId(null);
    }
  }

  const expiringSoon = policies.filter(p => p.renewal_date && daysUntil(p.renewal_date) <= 30 && daysUntil(p.renewal_date) >= 0).length;
  const totalPremium = policies.reduce((s, p) => s + (p.annual_premium ?? 0), 0);

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
      ) : policies.length === 0 ? (
        <EmptyState icon="shield" title={t(T.empty)} description={t(T.emptySub)} action={{ label: t(T.add), onClick: openAdd }} />
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: t(T.totalPolicies), value: String(policies.length) },
              { label: t(T.totalPremium),  value: formatCurrency(totalPremium) + "/an" },
              { label: t(T.expiring),       value: String(expiringSoon), warn: expiringSoon > 0 },
            ].map(s => (
              <div key={s.label} className={`${cardClass} p-5 text-center`}>
                <p className={`text-[26px] font-bold ${s.warn ? "text-amber-500" : "text-gray-900 dark:text-white"}`}>{s.value}</p>
                <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {policies.map(p => {
              const days = p.renewal_date ? daysUntil(p.renewal_date) : null;
              const isExpiring = days !== null && days <= 30 && days >= 0;
              return (
                <div key={p.id} className={`${cardClass} p-6 ${isExpiring ? "border-amber-200 dark:border-amber-800" : ""}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white text-[15px]">{p.property_name}</p>
                      <p className="text-[13px] text-gray-500 dark:text-gray-400">{p.insurer}</p>
                      {p.policy_number && <p className="text-[11px] text-gray-400 font-mono">{p.policy_number}</p>}
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {lang === "fr" ? (T as any)[p.type]?.fr ?? p.type : (T as any)[p.type]?.en ?? p.type}
                      </span>
                      {isExpiring && (
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          ⚠ {t(T.expiringSoon)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                      <p className="text-[11px] text-gray-400 mb-0.5">{t(T.premium)}</p>
                      <p className="text-[15px] font-bold text-gray-900 dark:text-white">{formatCurrency(p.annual_premium ?? 0)}</p>
                    </div>
                    {p.coverage_amount ? (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                        <p className="text-[11px] text-gray-400 mb-0.5">{t(T.coverage)}</p>
                        <p className="text-[15px] font-bold text-gray-900 dark:text-white">{formatCurrency(p.coverage_amount)}</p>
                      </div>
                    ) : null}
                    {p.renewal_date && (
                      <div className={`rounded-xl p-3 ${isExpiring ? "bg-amber-50 dark:bg-amber-900/20" : "bg-gray-50 dark:bg-gray-800"}`}>
                        <p className="text-[11px] text-gray-400 mb-0.5">{t(T.renewal)}</p>
                        <p className={`text-[14px] font-semibold ${isExpiring ? "text-amber-700 dark:text-amber-400" : "text-gray-900 dark:text-white"}`}>
                          {p.renewal_date.slice(0, 10)}
                          {days !== null && days >= 0 && <span className="text-[11px] ml-1">({days}j)</span>}
                        </p>
                      </div>
                    )}
                    {p.deductible ? (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                        <p className="text-[11px] text-gray-400 mb-0.5">{t(T.deductible)}</p>
                        <p className="text-[14px] font-semibold text-gray-900 dark:text-white">{formatCurrency(p.deductible)}</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <button onClick={() => openEdit(p)}
                      className="flex-1 py-2 text-[13px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/20 dark:text-teal-400 dark:hover:bg-teal-900/40 rounded-xl transition-colors">
                      {t(T.edit)}
                    </button>
                    <button onClick={() => setDelId(p.id)}
                      className="py-2 px-4 text-[13px] font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                      {t(T.delete)}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal */}
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
          <FormField label={t(T.insurer)} required>
            <input className={inputClass} value={form.insurer} onChange={e => fp("insurer", e.target.value)} />
          </FormField>
          <FormField label={t(T.policyNumber)}>
            <input className={inputClass} value={form.policy_number} onChange={e => fp("policy_number", e.target.value)} />
          </FormField>
          <FormField label={t(T.type)}>
            <select className={selectClass} value={form.type} onChange={e => fp("type", e.target.value)}>
              {POLICY_TYPES.map(pt => (
                <option key={pt} value={pt}>{lang === "fr" ? (T as any)[pt]?.fr : (T as any)[pt]?.en}</option>
              ))}
            </select>
          </FormField>
          <FormField label={t(T.annualPremium)} required>
            <input className={inputClass} type="number" min="0" value={form.annual_premium} onChange={e => fp("annual_premium", e.target.value)} />
          </FormField>
          <FormField label={t(T.coverageAmount)}>
            <input className={inputClass} type="number" min="0" value={form.coverage_amount} onChange={e => fp("coverage_amount", e.target.value)} />
          </FormField>
          <FormField label={t(T.deductible)}>
            <input className={inputClass} type="number" min="0" value={form.deductible} onChange={e => fp("deductible", e.target.value)} />
          </FormField>
          <FormField label={t(T.renewalDate)}>
            <input className={inputClass} type="date" value={form.renewal_date} onChange={e => fp("renewal_date", e.target.value)} />
          </FormField>
          <FormField label={t(T.contactPhone)}>
            <input className={inputClass} type="tel" value={form.contact_phone} onChange={e => fp("contact_phone", e.target.value)} />
          </FormField>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!delId}
        title={t(T.delTitle)}
        message={t(T.delMsg)}
        onConfirm={deletePolicy}
        onCancel={() => setDelId(null)}
      />
    </div>
  );
}
