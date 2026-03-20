"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/lib/ToastContext";
import { requireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, currentMonthYear, downloadCsv } from "@/lib/format";
import type { RentPayment, Property } from "@/lib/types";
import PageHeader from "@/components/dashboard/PageHeader";
import Modal from "@/components/dashboard/Modal";
import EmptyState from "@/components/dashboard/EmptyState";
import FormField, { inputClass, selectClass } from "@/components/dashboard/FormField";
import StatusBadge from "@/components/dashboard/StatusBadge";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";

const T = {
  title:      { fr: "Loyers",              en: "Rent" },
  sub:        { fr: "Suivi des paiements", en: "Payment tracking" },
  add:        { fr: "Ajouter",            en: "Add" },
  markPaid:   { fr: "Marquer payé",       en: "Mark paid" },
  export:     { fr: "Exporter CSV",       en: "Export CSV" },
  cancel:     { fr: "Annuler",            en: "Cancel" },
  save:       { fr: "Enregistrer",        en: "Save" },
  saving:     { fr: "Enregistrement…",    en: "Saving…" },
  empty:      { fr: "Aucun paiement",     en: "No payments" },
  emptySub:   { fr: "Ajoutez votre premier paiement de loyer.", en: "Add your first rent payment." },
  tenant:     { fr: "Locataire",          en: "Tenant" },
  property:   { fr: "Propriété",          en: "Property" },
  amount:     { fr: "Montant",            en: "Amount" },
  due:        { fr: "Échéance",           en: "Due date" },
  paid:       { fr: "Payé le",           en: "Paid on" },
  status:     { fr: "Statut",            en: "Status" },
  method:     { fr: "Méthode",           en: "Method" },
  month:      { fr: "Mois",              en: "Month" },
  notes:      { fr: "Notes",             en: "Notes" },
  total:      { fr: "Total perçu",        en: "Total collected" },
  pending:    { fr: "En attente",         en: "Pending" },
  all:        { fr: "Tous",              en: "All" },
};

const METHODS = ["bank_transfer", "cheque", "cash", "e_transfer", "credit_card"];

const emptyForm = {
  tenant_id: "", property_id: "", amount: "", due_date: "", payment_date: "",
  status: "pending", payment_method: "bank_transfer", notes: "", month_year: currentMonthYear(),
};

export default function RentPage() {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<RentPayment | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirmPay, setConfirmPay] = useState<RentPayment | null>(null);

  useEffect(() => {
    if (!requireAuth()) return;
    Promise.all([api.getRentPayments(), api.getProperties(), api.getTenants()])
      .then(([rp, ps, ts]) => { setPayments(rp); setProperties(ps); setTenants(ts); })
      .catch(e => showToast(e instanceof Error ? e.message : String(e), "error"))
      .finally(() => setLoading(false));
  }, []);

  async function load() { setPayments(await api.getRentPayments()); }

  function openAdd() { setEditing(null); setForm({ ...emptyForm }); setFormError(""); setShowModal(true); }

  function openEdit(p: RentPayment) {
    setEditing(p);
    setForm({
      tenant_id: p.tenant_id ?? "", property_id: p.property_id ?? "",
      amount: String(p.amount ?? ""), due_date: p.due_date?.slice(0, 10) ?? "",
      payment_date: p.payment_date?.slice(0, 10) ?? "", status: p.status ?? "pending",
      payment_method: p.payment_method ?? "bank_transfer", notes: p.notes ?? "",
      month_year: p.month_year ?? currentMonthYear(),
    });
    setFormError(""); setShowModal(true);
  }

  async function handleSave() {
    if (!form.amount || isNaN(Number(form.amount))) { setFormError(lang === "fr" ? "Montant invalide." : "Invalid amount."); return; }
    setSaving(true); setFormError("");
    try {
      const payload = { ...form, amount: Number(form.amount) };
      if (editing) { await api.updateRentPayment(editing.id, payload as any); }
      else { await api.createRentPayment(payload as any); }
      setShowModal(false); load();
    } catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  }

  async function markPaid(p: RentPayment) {
    try {
      await api.updateRentPayment(p.id ?? p._id, { status: "paid", payment_date: new Date().toISOString().slice(0, 10) });
      load();
    } catch (e: any) { showToast(e instanceof Error ? e.message : String(e), "error"); }
  }

  function handleExport() {
    const rows = filtered.map(p => ({
      [t(T.tenant)]: p.tenant_name ?? p.tenant_id,
      [t(T.property)]: p.property_name ?? p.property_id,
      [t(T.amount)]: p.amount,
      [t(T.due)]: p.due_date,
      [t(T.paid)]: p.payment_date ?? "",
      [t(T.status)]: p.status,
      [t(T.method)]: p.payment_method ?? "",
    }));
    if (rows.length) downloadCsv(rows, `loyers-${currentMonthYear()}.csv`);
  }

  const f = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const filtered = payments.filter(p => statusFilter === "all" || p.status === statusFilter);
  const totalCollected = filtered.filter(p => p.status === "paid").reduce((s, p) => s + (p.amount ?? 0), 0);
  const totalPending = filtered.filter(p => p.status !== "paid").reduce((s, p) => s + (p.amount ?? 0), 0);

  const tenantName = (id: string) => { const t = tenants.find(t => t.id === id || t._id === id); return t ? `${t.first_name} ${t.last_name}` : id; };
  const propName = (id: string) => properties.find(p => p.id === id || p._id === id)?.name ?? id;

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <PageHeader
        title={t(T.title)}
        subtitle={t(T.sub)}
        actions={[
          { label: t(T.export), onClick: handleExport },
          { label: `+ ${t(T.add)}`, onClick: openAdd, primary: true },
        ]}
      />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5">
          <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wide mb-1">{t(T.total)}</p>
          <p className="text-[26px] font-bold text-teal-600">{formatCurrency(totalCollected)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5">
          <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wide mb-1">{t(T.pending)}</p>
          <p className="text-[26px] font-bold text-orange-500">{formatCurrency(totalPending)}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["all", "pending", "paid", "late"].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all ${
              statusFilter === s ? "bg-teal-600 text-white" : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-teal-400"
            }`}
          >
            {s === "all" ? t(T.all) : <StatusBadge status={s} lang={lang} />}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="credit-card" title={t(T.empty)} description={t(T.emptySub)} actionLabel={`+ ${t(T.add)}`} onAction={openAdd} />
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">{t(T.tenant)}</th>
                  <th className="px-5 py-3 text-left">{t(T.property)}</th>
                  <th className="px-5 py-3 text-right">{t(T.amount)}</th>
                  <th className="px-5 py-3 text-left">{t(T.due)}</th>
                  <th className="px-5 py-3 text-left">{t(T.status)}</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {filtered.map(p => (
                  <tr key={p.id ?? p._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-800 dark:text-gray-200">{p.tenant_name || tenantName(p.tenant_id ?? "")}</td>
                    <td className="px-5 py-3 text-gray-500">{p.property_name || propName(p.property_id ?? "")}</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(p.amount ?? 0)}</td>
                    <td className="px-5 py-3 text-gray-500">{p.due_date ? formatDate(p.due_date) : "—"}</td>
                    <td className="px-5 py-3"><StatusBadge status={p.status ?? "pending"} lang={lang} /></td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2 justify-end">
                        {p.status !== "paid" && (
                          <button onClick={() => setConfirmPay(p)} className="text-[12px] text-teal-700 hover:underline whitespace-nowrap">{t(T.markPaid)}</button>
                        )}
                        <Link href={`/dashboard/rent/${p.id}/receipt`}
                          className="text-[12px] text-blue-600 dark:text-blue-400 hover:underline font-medium">
                          {lang === "fr" ? "Reçu" : "Receipt"}
                        </Link>
                        <button onClick={() => openEdit(p)} className="text-[12px] text-gray-500 hover:underline">{lang === "fr" ? "Modifier" : "Edit"}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile */}
          <div className="md:hidden divide-y divide-gray-50 dark:divide-gray-800">
            {filtered.map(p => (
              <div key={p.id ?? p._id} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 dark:text-gray-200 text-[14px] truncate">{p.tenant_name || tenantName(p.tenant_id ?? "")}</p>
                  <p className="text-[12px] text-gray-400">{p.due_date ? formatDate(p.due_date) : "—"}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-semibold text-[14px] text-gray-900 dark:text-white">{formatCurrency(p.amount ?? 0)}</span>
                  <StatusBadge status={p.status ?? "pending"} lang={lang} />
                </div>
                {p.status !== "paid" && (
                  <button onClick={() => setConfirmPay(p)} className="ml-1 px-2 py-1 text-[11px] font-medium bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 rounded-lg">{t(T.markPaid)}</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmPay}
        title={lang === "fr" ? "Confirmer le paiement" : "Confirm Payment"}
        message={lang === "fr"
          ? `Marquer le loyer de ${confirmPay?.tenant_name ?? ""} comme payé ?`
          : `Mark rent for ${confirmPay?.tenant_name ?? ""} as paid?`}
        onConfirm={() => { if (confirmPay) markPaid(confirmPay); setConfirmPay(null); }}
        onCancel={() => setConfirmPay(null)}
      />

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? (lang === "fr" ? "Modifier paiement" : "Edit payment") : (lang === "fr" ? "Nouveau paiement" : "New payment")}
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-[13px] rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">{t(T.cancel)}</button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-[13px] font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl transition-colors">
              {saving ? t(T.saving) : t(T.save)}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {formError && <p className="text-[13px] text-red-500">{formError}</p>}
          <FormField label={lang === "fr" ? "Locataire" : "Tenant"}>
            <select className={selectClass} value={form.tenant_id} onChange={e => f("tenant_id", e.target.value)}>
              <option value="">— {lang === "fr" ? "Sélectionner" : "Select"} —</option>
              {tenants.map(ten => <option key={ten.id ?? ten._id} value={ten.id ?? ten._id}>{ten.first_name} {ten.last_name}</option>)}
            </select>
          </FormField>
          <FormField label={lang === "fr" ? "Propriété" : "Property"}>
            <select className={selectClass} value={form.property_id} onChange={e => f("property_id", e.target.value)}>
              <option value="">— {lang === "fr" ? "Sélectionner" : "Select"} —</option>
              {properties.map(p => <option key={p.id ?? p._id} value={p.id ?? p._id}>{p.name}</option>)}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={`${t(T.amount)} ($)`} required>
              <input className={inputClass} type="number" min={0} value={form.amount} onChange={e => f("amount", e.target.value)} placeholder="1200" />
            </FormField>
            <FormField label={t(T.month)}>
              <input className={inputClass} value={form.month_year} onChange={e => f("month_year", e.target.value)} placeholder="2024-01" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t(T.due)}>
              <input className={inputClass} type="date" value={form.due_date} onChange={e => f("due_date", e.target.value)} />
            </FormField>
            <FormField label={t(T.paid)}>
              <input className={inputClass} type="date" value={form.payment_date} onChange={e => f("payment_date", e.target.value)} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t(T.status)}>
              <select className={selectClass} value={form.status} onChange={e => f("status", e.target.value)}>
                {["pending", "paid", "late", "partial"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
            <FormField label={t(T.method)}>
              <select className={selectClass} value={form.payment_method} onChange={e => f("payment_method", e.target.value)}>
                {METHODS.map(m => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label={t(T.notes)}>
            <textarea className={inputClass + " resize-none"} rows={2} value={form.notes} onChange={e => f("notes", e.target.value)} />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
