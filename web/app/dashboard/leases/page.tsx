"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/lib/ToastContext";
import { requireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatDate, formatCurrency, downloadCsv } from "@/lib/format";
import type { Lease, Property, Tenant } from "@/lib/types";
import PageHeader from "@/components/dashboard/PageHeader";
import Modal from "@/components/dashboard/Modal";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import EmptyState from "@/components/dashboard/EmptyState";
import FormField, { inputClass, selectClass } from "@/components/dashboard/FormField";
import StatusBadge from "@/components/dashboard/StatusBadge";

const T = {
  title:    { fr: "Baux",              en: "Leases" },
  sub:      { fr: "Gérez vos baux",    en: "Manage your leases" },
  add:      { fr: "Ajouter",          en: "Add" },
  edit:     { fr: "Modifier",         en: "Edit" },
  delete:   { fr: "Supprimer",        en: "Delete" },
  cancel:   { fr: "Annuler",          en: "Cancel" },
  save:     { fr: "Enregistrer",      en: "Save" },
  saving:   { fr: "Enregistrement…",  en: "Saving…" },
  empty:    { fr: "Aucun bail",       en: "No leases yet" },
  emptySub: { fr: "Ajoutez votre premier bail.", en: "Add your first lease." },
  export:   { fr: "Exporter CSV",     en: "Export CSV" },
  tenant:   { fr: "Locataire",        en: "Tenant" },
  property: { fr: "Propriété",        en: "Property" },
  unit:     { fr: "Unité",           en: "Unit" },
  start:    { fr: "Début",           en: "Start" },
  end:      { fr: "Fin",             en: "End" },
  rent:     { fr: "Loyer",           en: "Rent" },
  deposit:  { fr: "Dépôt",           en: "Deposit" },
  status:   { fr: "Statut",          en: "Status" },
  notes:    { fr: "Notes",           en: "Notes" },
  delTitle: { fr: "Supprimer le bail ?", en: "Delete lease?" },
  delMsg:   { fr: "Cette action est irréversible.", en: "This action cannot be undone." },
  type:     { fr: "Type",            en: "Type" },
  genBail:  { fr: "Bail PDF",        en: "Bail PDF" },
  generating: { fr: "Génération…",   en: "Generating…" },
};

const LEASE_TYPES = [
  { value: "fixed_term", fr: "Durée fixe", en: "Fixed term" },
  { value: "month_to_month", fr: "Mois par mois", en: "Month to month" },
  { value: "yearly", fr: "Annuel", en: "Yearly" },
];

const LEASE_STATUSES = [
  { value: "active",    fr: "Actif",    en: "Active" },
  { value: "pending",   fr: "En attente", en: "Pending" },
  { value: "expired",   fr: "Expiré",   en: "Expired" },
  { value: "cancelled", fr: "Annulé",   en: "Cancelled" },
];

const emptyForm = {
  tenant_id: "", property_id: "", unit_number: "", start_date: "", end_date: "",
  monthly_rent: "", deposit_amount: "", lease_type: "fixed_term", status: "active", notes: "",
};

export default function LeasesPage() {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Lease | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Lease | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [generatingBail, setGeneratingBail] = useState<string | null>(null);

  useEffect(() => {
    if (!requireAuth()) return;
    Promise.all([api.getLeases(), api.getProperties(), api.getTenants()])
      .then(([ls, ps, ts]) => { setLeases(ls); setProperties(ps); setTenants(ts); })
      .catch(e => showToast(e instanceof Error ? e.message : String(e), "error"))
      .finally(() => setLoading(false));
  }, []);

  async function load() { setLeases(await api.getLeases()); }

  function openAdd() { setEditing(null); setForm({ ...emptyForm }); setFormError(""); setShowModal(true); }

  function openEdit(l: Lease) {
    setEditing(l);
    setForm({
      tenant_id: l.tenant_id ?? "", property_id: l.property_id ?? "", unit_number: l.unit_number ?? "",
      start_date: l.start_date?.slice(0, 10) ?? "", end_date: l.end_date?.slice(0, 10) ?? "",
      monthly_rent: String(l.monthly_rent ?? ""), deposit_amount: String(l.deposit_amount ?? ""),
      lease_type: l.lease_type ?? "fixed_term", status: l.status ?? "active", notes: l.notes ?? "",
    });
    setFormError(""); setShowModal(true);
  }

  async function handleSave() {
    if (!form.monthly_rent || isNaN(Number(form.monthly_rent))) { setFormError(lang === "fr" ? "Loyer invalide." : "Invalid rent."); return; }
    if (!form.tenant_id) {
      setFormError(lang === "fr" ? "Sélectionnez un locataire." : "Please select a tenant.");
      return;
    }
    if (!form.property_id) {
      setFormError(lang === "fr" ? "Sélectionnez une propriété." : "Please select a property.");
      return;
    }
    setSaving(true); setFormError("");
    try {
      const payload = { ...form, monthly_rent: Number(form.monthly_rent), deposit_amount: Number(form.deposit_amount) || 0 };
      if (editing) { await api.updateLease(editing.id, payload as any); }
      else { await api.createLease(payload as any); }
      setShowModal(false); load();
    } catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await api.deleteLease(deleteTarget.id); setDeleteTarget(null); load(); }
    catch (e: any) { showToast(e.message, "error"); }
    finally { setDeleting(false); }
  }

  async function handleGenerateBail(leaseId: string) {
    setGeneratingBail(leaseId);
    try {
      const blob = await api.generateBail(leaseId);
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement("a"), { href: url, download: `bail-${leaseId.slice(0, 8)}.pdf` }).click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      showToast(e.message ?? (lang === "fr" ? "Erreur de génération" : "Generation failed"), "error");
    } finally {
      setGeneratingBail(null);
    }
  }

  function handleExport() {
    const rows = leases.map(l => ({
      [t(T.tenant)]: tenantName(l.tenant_id ?? ""),
      [t(T.property)]: propName(l.property_id ?? ""),
      [t(T.unit)]: l.unit_number ?? "",
      [t(T.start)]: l.start_date ?? "",
      [t(T.end)]: l.end_date ?? "",
      [t(T.rent)]: l.monthly_rent ?? "",
      [t(T.deposit)]: l.deposit_amount ?? "",
      [t(T.status)]: l.status ?? "",
    }));
    if (rows.length) downloadCsv(rows, "baux.csv");
  }

  const f = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));
  const tenantName = (id: string) => { const ten = tenants.find(t => t.id === id || t._id === id); return ten ? `${ten.first_name} ${ten.last_name}` : id; };
  const propName = (id: string) => properties.find(p => p.id === id || p._id === id)?.name ?? id;

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <PageHeader
        title={t(T.title)} subtitle={t(T.sub)}
        actions={[
          { label: t(T.export), onClick: handleExport },
          { label: `+ ${t(T.add)}`, onClick: openAdd, primary: true },
        ]}
      />

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : leases.length === 0 ? (
        <EmptyState icon="document" title={t(T.empty)} description={t(T.emptySub)} actionLabel={`+ ${t(T.add)}`} onAction={openAdd} />
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  {[T.tenant, T.property, T.unit, T.start, T.end, T.rent, T.status].map(h => (
                    <th key={h.en} className="px-5 py-3 text-left">{t(h)}</th>
                  ))}
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {leases.map(l => (
                  <tr key={l.id ?? l._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-800 dark:text-gray-200">{tenantName(l.tenant_id ?? "")}</td>
                    <td className="px-5 py-3 text-gray-500">{propName(l.property_id ?? "")}</td>
                    <td className="px-5 py-3 text-gray-500">{l.unit_number || "—"}</td>
                    <td className="px-5 py-3 text-gray-500">{l.start_date ? formatDate(l.start_date) : "—"}</td>
                    <td className="px-5 py-3 text-gray-500">{l.end_date ? formatDate(l.end_date) : "—"}</td>
                    <td className="px-5 py-3 font-semibold text-gray-900 dark:text-white">{formatCurrency(l.monthly_rent ?? 0)}/mo</td>
                    <td className="px-5 py-3"><StatusBadge status={l.status ?? "active"} lang={lang} /></td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2 justify-end items-center">
                        <button
                          onClick={() => handleGenerateBail(l.id ?? l._id ?? "")}
                          disabled={generatingBail === (l.id ?? l._id)}
                          className="inline-flex items-center gap-1 text-[12px] text-violet-600 hover:underline disabled:opacity-50"
                        >
                          {generatingBail === (l.id ?? l._id) ? (
                            <span className="w-3 h-3 border border-violet-500 border-t-transparent rounded-full animate-spin inline-block" />
                          ) : "📄"} {t(T.genBail)}
                        </button>
                        <button onClick={() => openEdit(l)} className="text-[12px] text-teal-700 hover:underline">{t(T.edit)}</button>
                        <button onClick={() => setDeleteTarget(l)} className="text-[12px] text-red-500 hover:underline">{t(T.delete)}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-50 dark:divide-gray-800">
            {leases.map(l => (
              <div key={l.id ?? l._id} className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-gray-800 dark:text-gray-200">{tenantName(l.tenant_id ?? "")}</p>
                  <StatusBadge status={l.status ?? "active"} lang={lang} />
                </div>
                <p className="text-[12px] text-gray-400">{propName(l.property_id ?? "")} · {l.unit_number || "—"}</p>
                <p className="text-[12px] text-gray-400">{formatDate(l.start_date ?? "")} → {l.end_date ? formatDate(l.end_date) : "∞"}</p>
                <div className="flex gap-3 mt-2 items-center">
                  <button
                    onClick={() => handleGenerateBail(l.id ?? l._id ?? "")}
                    disabled={generatingBail === (l.id ?? l._id)}
                    className="inline-flex items-center gap-1 text-[12px] text-violet-600 hover:underline disabled:opacity-50"
                  >
                    {generatingBail === (l.id ?? l._id) ? (
                      <span className="w-3 h-3 border border-violet-500 border-t-transparent rounded-full animate-spin inline-block" />
                    ) : "📄"} {t(T.genBail)}
                  </button>
                  <button onClick={() => openEdit(l)} className="text-[12px] text-teal-700 hover:underline">{t(T.edit)}</button>
                  <button onClick={() => setDeleteTarget(l)} className="text-[12px] text-red-500 hover:underline">{t(T.delete)}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? t(T.edit) : `${t(T.add)} — Bail`}
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-[13px] rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">{t(T.cancel)}</button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-[13px] font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl transition-colors">
              {saving ? t(T.saving) : t(T.save)}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {formError && <p className="text-[13px] text-red-500">{formError}</p>}
          <FormField label={t(T.tenant)}>
            <select className={selectClass} value={form.tenant_id} onChange={e => f("tenant_id", e.target.value)}>
              <option value="">—</option>
              {tenants.map(ten => <option key={ten.id ?? ten._id} value={ten.id ?? ten._id}>{ten.first_name} {ten.last_name}</option>)}
            </select>
          </FormField>
          <FormField label={t(T.property)}>
            <select className={selectClass} value={form.property_id} onChange={e => f("property_id", e.target.value)}>
              <option value="">—</option>
              {properties.map(p => <option key={p.id ?? p._id} value={p.id ?? p._id}>{p.name}</option>)}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t(T.unit)}>
              <input className={inputClass} value={form.unit_number} onChange={e => f("unit_number", e.target.value)} placeholder="101" />
            </FormField>
            <FormField label={t(T.type)}>
              <select className={selectClass} value={form.lease_type} onChange={e => f("lease_type", e.target.value)}>
                {LEASE_TYPES.map(lt => <option key={lt.value} value={lt.value}>{lang === "fr" ? lt.fr : lt.en}</option>)}
              </select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t(T.start)}>
              <input className={inputClass} type="date" value={form.start_date} onChange={e => f("start_date", e.target.value)} />
            </FormField>
            <FormField label={t(T.end)}>
              <input className={inputClass} type="date" value={form.end_date} onChange={e => f("end_date", e.target.value)} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={`${t(T.rent)}/mois ($)`} required>
              <input className={inputClass} type="number" min={0} value={form.monthly_rent} onChange={e => f("monthly_rent", e.target.value)} />
            </FormField>
            <FormField label={`${t(T.deposit)} ($)`}>
              <input className={inputClass} type="number" min={0} value={form.deposit_amount} onChange={e => f("deposit_amount", e.target.value)} />
            </FormField>
          </div>
          <FormField label={t(T.status)}>
            <select className={selectClass} value={form.status} onChange={e => f("status", e.target.value)}>
              {LEASE_STATUSES.map(s => <option key={s.value} value={s.value}>{lang === "fr" ? s.fr : s.en}</option>)}
            </select>
          </FormField>
          <FormField label={t(T.notes)}>
            <textarea className={inputClass} rows={3} value={form.notes} onChange={e => f("notes", e.target.value)} />
          </FormField>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={t(T.delTitle)}
        message={`${tenantName(deleteTarget?.tenant_id ?? "")} — ${t(T.delMsg)}`}
        confirmLabel={t(T.delete)}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        danger
      />
    </div>
  );
}
