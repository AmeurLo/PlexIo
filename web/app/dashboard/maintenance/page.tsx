"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/lib/ToastContext";
import { requireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { MaintenanceRequest, Property } from "@/lib/types";
import PageHeader from "@/components/dashboard/PageHeader";
import Modal from "@/components/dashboard/Modal";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import EmptyState from "@/components/dashboard/EmptyState";
import FormField, { inputClass, selectClass } from "@/components/dashboard/FormField";
import StatusBadge from "@/components/dashboard/StatusBadge";

const T = {
  title:       { fr: "Maintenance",            en: "Maintenance" },
  sub:         { fr: "Gérez les demandes",      en: "Manage requests" },
  add:         { fr: "Ajouter",               en: "Add" },
  edit:        { fr: "Modifier",              en: "Edit" },
  delete:      { fr: "Supprimer",             en: "Delete" },
  cancel:      { fr: "Annuler",               en: "Cancel" },
  save:        { fr: "Enregistrer",           en: "Save" },
  saving:      { fr: "Enregistrement…",       en: "Saving…" },
  empty:       { fr: "Aucune demande",         en: "No requests" },
  emptySub:    { fr: "Aucune demande de maintenance.", en: "No maintenance requests yet." },
  delTitle:    { fr: "Supprimer la demande ?", en: "Delete request?" },
  delMsg:      { fr: "Cette action est irréversible.", en: "This action cannot be undone." },
  titleField:  { fr: "Titre",                 en: "Title" },
  description: { fr: "Description",           en: "Description" },
  property:    { fr: "Propriété",             en: "Property" },
  unit:        { fr: "Unité",                en: "Unit" },
  priority:    { fr: "Priorité",              en: "Priority" },
  status:      { fr: "Statut",               en: "Status" },
  date:        { fr: "Date",                 en: "Date" },
  all:         { fr: "Toutes",               en: "All" },
  cost:        { fr: "Coût ($)",             en: "Cost ($)" },
  contractor:  { fr: "Entrepreneur",          en: "Contractor" },
};

const PRIORITIES = [
  { value: "low",    fr: "Faible",  en: "Low" },
  { value: "medium", fr: "Moyen",   en: "Medium" },
  { value: "high",   fr: "Élevé",  en: "High" },
  { value: "urgent", fr: "Urgent", en: "Urgent" },
];

const STATUSES = ["open", "in_progress", "completed", "cancelled"];

const emptyForm = {
  title: "", description: "", property_id: "", unit_number: "",
  priority: "medium", status: "open", estimated_cost: "", assigned_contractor: "",
};

export default function MaintenancePage() {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MaintenanceRequest | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceRequest | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!requireAuth()) return;
    Promise.all([api.getMaintenanceRequests(), api.getProperties()])
      .then(([rs, ps]) => { setRequests(rs); setProperties(ps); })
      .catch(e => showToast(e instanceof Error ? e.message : String(e), "error"))
      .finally(() => setLoading(false));
  }, []);

  async function load() { setRequests(await api.getMaintenanceRequests()); }

  function openAdd() { setEditing(null); setForm({ ...emptyForm }); setFormError(""); setShowModal(true); }

  function openEdit(r: MaintenanceRequest) {
    setEditing(r);
    setForm({
      title: r.title ?? "", description: r.description ?? "", property_id: r.property_id ?? "",
      unit_number: r.unit_number ?? "", priority: r.priority ?? "medium", status: r.status ?? "open",
      estimated_cost: r.estimated_cost ? String(r.estimated_cost) : "", assigned_contractor: r.assigned_contractor ?? "",
    });
    setFormError(""); setShowModal(true);
  }

  async function handleSave() {
    if (!form.title.trim()) { setFormError(lang === "fr" ? "Titre requis." : "Title required."); return; }
    setSaving(true); setFormError("");
    try {
      const payload = { ...form, estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : undefined };
      if (editing) { await api.updateMaintenanceRequest(editing.id, payload); }
      else { await api.createMaintenanceRequest(payload); }
      setShowModal(false); load();
    } catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await api.deleteMaintenanceRequest(deleteTarget.id); setDeleteTarget(null); load(); }
    catch (e: any) { showToast(e.message, "error"); }
    finally { setDeleting(false); }
  }

  const f = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));
  const propName = (id: string) => properties.find(p => p.id === id || p._id === id)?.name ?? id;

  const filtered = requests.filter(r => statusFilter === "all" || r.status === statusFilter);

  const priorityColor: Record<string, string> = {
    low: "bg-gray-100 text-gray-600",
    medium: "bg-blue-50 text-blue-700",
    high: "bg-orange-50 text-orange-700",
    urgent: "bg-red-50 text-red-700",
  };
  const priorityLabel = (p: string) => PRIORITIES.find(x => x.value === p)?.[lang === "fr" ? "fr" : "en"] ?? p;

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <PageHeader title={t(T.title)} subtitle={t(T.sub)} actions={[{ label: `+ ${t(T.add)}`, onClick: openAdd, primary: true }]} />

      {/* Status filters */}
      <div className="flex gap-2 flex-wrap">
        {["all", ...STATUSES].map(s => (
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
        <EmptyState icon="wrench" title={t(T.empty)} description={t(T.emptySub)} actionLabel={`+ ${t(T.add)}`} onAction={openAdd} />
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id ?? r._id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-[14px]">{r.title}</h3>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${priorityColor[r.priority ?? "medium"]}`}>
                      {priorityLabel(r.priority ?? "medium")}
                    </span>
                    <StatusBadge status={r.status ?? "open"} lang={lang} />
                  </div>
                  {r.description && <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">{r.description}</p>}
                  <div className="flex gap-3 flex-wrap text-[12px] text-gray-400">
                    {r.property_id && <span>{propName(r.property_id)}</span>}
                    {r.unit_number && <span>· {lang === "fr" ? "Unité" : "Unit"} {r.unit_number}</span>}
                    {r.created_at && <span>· {formatDate(r.created_at)}</span>}
                    {r.estimated_cost && <span>· ${r.estimated_cost}</span>}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => openEdit(r)} className="text-[12px] text-teal-700 hover:underline">{t(T.edit)}</button>
                  <button onClick={() => setDeleteTarget(r)} className="text-[12px] text-red-500 hover:underline">{t(T.delete)}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? t(T.edit) : `${t(T.add)} — ${t(T.title)}`}
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
          <FormField label={t(T.titleField)} required>
            <input className={inputClass} value={form.title} onChange={e => f("title", e.target.value)} placeholder={lang === "fr" ? "Ex: Fuite sous l'évier" : "Ex: Leaking faucet"} />
          </FormField>
          <FormField label={t(T.description)}>
            <textarea className={inputClass + " resize-none"} rows={3} value={form.description} onChange={e => f("description", e.target.value)} />
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
            <FormField label={t(T.priority)}>
              <select className={selectClass} value={form.priority} onChange={e => f("priority", e.target.value)}>
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{lang === "fr" ? p.fr : p.en}</option>)}
              </select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t(T.status)}>
              <select className={selectClass} value={form.status} onChange={e => f("status", e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
            </FormField>
            <FormField label={t(T.cost)}>
              <input className={inputClass} type="number" min={0} value={form.estimated_cost} onChange={e => f("estimated_cost", e.target.value)} />
            </FormField>
          </div>
          <FormField label={t(T.contractor)}>
            <input className={inputClass} value={form.assigned_contractor} onChange={e => f("assigned_contractor", e.target.value)} />
          </FormField>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={t(T.delTitle)}
        message={`${deleteTarget?.title} — ${t(T.delMsg)}`}
        confirmLabel={t(T.delete)}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        danger
      />
    </div>
  );
}
