"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/lib/ToastContext";
import { requireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { Inspection } from "@/lib/types";
import PageHeader from "@/components/dashboard/PageHeader";
import Modal from "@/components/dashboard/Modal";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import EmptyState from "@/components/dashboard/EmptyState";
import FormField, { inputClass, selectClass } from "@/components/dashboard/FormField";

// ─── i18n ─────────────────────────────────────────────────────────────────────
const T = {
  title:        { fr: "Inspections",                en: "Inspections" },
  sub:          { fr: "Suivez les inspections de vos logements", en: "Track property inspections" },
  add:          { fr: "Ajouter",                    en: "Add" },
  edit:         { fr: "Modifier",                   en: "Edit" },
  delete:       { fr: "Supprimer",                  en: "Delete" },
  cancel:       { fr: "Annuler",                    en: "Cancel" },
  save:         { fr: "Enregistrer",                en: "Save" },
  saving:       { fr: "Enregistrement…",            en: "Saving…" },
  loading:      { fr: "Chargement…",                en: "Loading…" },
  empty:        { fr: "Aucune inspection",           en: "No inspections yet" },
  emptySub:     { fr: "Documentez l'état de vos logements avec des inspections régulières.", en: "Document the condition of your units with regular inspections." },
  delTitle:     { fr: "Supprimer l'inspection ?",   en: "Delete inspection?" },
  delMsg:       { fr: "Cette action est irréversible.", en: "This action cannot be undone." },
  // form
  type:         { fr: "Type",                       en: "Type" },
  unit:         { fr: "Logement",                   en: "Unit" },
  tenant:       { fr: "Locataire",                  en: "Tenant" },
  date:         { fr: "Date",                       en: "Date" },
  status:       { fr: "Statut",                     en: "Status" },
  itemsDone:    { fr: "Points vérifiés",            en: "Items checked" },
  totalItems:   { fr: "Total points",               en: "Total items" },
  // types
  move_in:      { fr: "Entrée",                     en: "Move-in" },
  move_out:     { fr: "Sortie",                     en: "Move-out" },
  routine:      { fr: "Périodique",                 en: "Routine" },
  emergency:    { fr: "Urgence",                    en: "Emergency" },
  // statuses
  completed:    { fr: "Complétée",                  en: "Completed" },
  scheduled:    { fr: "Planifiée",                  en: "Scheduled" },
  pending:      { fr: "En attente",                 en: "Pending" },
  // columns
  colType:      { fr: "Type",                       en: "Type" },
  colUnit:      { fr: "Logement / Locataire",       en: "Unit / Tenant" },
  colDate:      { fr: "Date",                       en: "Date" },
  colStatus:    { fr: "Statut",                     en: "Status" },
  colProgress:  { fr: "Progression",               en: "Progress" },
};

const INSPECTION_TYPES = ["move_in", "move_out", "routine", "emergency"] as const;
const STATUSES = ["completed", "scheduled", "pending"] as const;

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  scheduled: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  pending:   "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const TYPE_ICONS: Record<string, string> = {
  move_in:   "🔑",
  move_out:  "🚪",
  routine:   "🔍",
  emergency: "🚨",
};

const EMPTY_FORM = {
  type: "routine", unit: "", tenant: "", date: "", status: "completed",
  items_done: "0", total_items: "10",
};

export default function InspectionsPage() {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState(false);
  const [editing, setEditing]         = useState<Inspection | null>(null);
  const [delId, setDelId]             = useState<string | null>(null);
  const [form, setForm]               = useState({ ...EMPTY_FORM });
  const [saving, setSaving]           = useState(false);

  const fp = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!requireAuth()) return;
    api.getInspections()
      .then(setInspections)
      .catch(e => showToast(e.message, "error"))
      .finally(() => setLoading(false));
  }, []);

  function openAdd() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0, 10) });
    setModal(true);
  }

  function openEdit(ins: Inspection) {
    setEditing(ins);
    setForm({
      type: ins.type ?? "routine",
      unit: ins.unit ?? "",
      tenant: ins.tenant ?? "",
      date: ins.date?.slice(0, 10) ?? "",
      status: ins.status ?? "completed",
      items_done: String(ins.items_done ?? 0),
      total_items: String(ins.total_items ?? 10),
    });
    setModal(true);
  }

  async function save() {
    if (!form.unit || !form.date) {
      showToast(lang === "fr" ? "Logement et date requis" : "Unit and date required", "error");
      return;
    }
    setSaving(true);
    const payload = {
      type: form.type,
      unit: form.unit,
      tenant: form.tenant,
      date: form.date,
      status: form.status,
      items_done: parseInt(form.items_done) || 0,
      total_items: parseInt(form.total_items) || 0,
    };
    try {
      if (editing) {
        const updated = await api.updateInspection(editing.id, payload);
        setInspections(prev => prev.map(i => i.id === editing.id ? updated as Inspection : i));
        showToast(lang === "fr" ? "Inspection mise à jour" : "Inspection updated", "success");
      } else {
        const created = await api.createInspection(payload);
        setInspections(prev => [created as Inspection, ...prev]);
        showToast(lang === "fr" ? "Inspection ajoutée" : "Inspection added", "success");
      }
      setModal(false);
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteInspection() {
    if (!delId) return;
    try {
      await api.deleteInspection(delId);
      setInspections(prev => prev.filter(i => i.id !== delId));
      showToast(lang === "fr" ? "Inspection supprimée" : "Inspection deleted", "success");
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setDelId(null);
    }
  }

  function getLabel(key: string, obj: Record<string, { fr: string; en: string }>): string {
    return lang === "fr" ? (obj[key]?.fr ?? key) : (obj[key]?.en ?? key);
  }

  const typeLabels = { move_in: T.move_in, move_out: T.move_out, routine: T.routine, emergency: T.emergency };
  const statusLabels = { completed: T.completed, scheduled: T.scheduled, pending: T.pending };

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
      ) : inspections.length === 0 ? (
        <EmptyState icon="document" title={t(T.empty)} description={t(T.emptySub)} action={{ label: t(T.add), onClick: openAdd }} />
      ) : (
        <div className={`${cardClass} overflow-hidden`}>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  {[T.colType, T.colUnit, T.colDate, T.colStatus, T.colProgress].map(col => (
                    <th key={col.fr} className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                      {t(col)}
                    </th>
                  ))}
                  <th className="px-5 py-3 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {inspections.map(ins => {
                  const totalItems = ins.total_items ?? 0;
                  const itemsDone  = ins.items_done  ?? 0;
                  const pct = totalItems > 0 ? Math.round((itemsDone / totalItems) * 100) : 0;
                  return (
                    <tr key={ins.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{TYPE_ICONS[ins.type] ?? "🔍"}</span>
                          <span className="text-[13px] font-medium text-gray-800 dark:text-gray-200">
                            {getLabel(ins.type, typeLabels)}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200">{ins.unit}</p>
                        {ins.tenant && <p className="text-[11px] text-gray-400">{ins.tenant}</p>}
                      </td>
                      <td className="px-5 py-4 text-[13px] text-gray-600 dark:text-gray-400">
                        {ins.date ? ins.date.slice(0, 10) : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[ins.status] ?? STATUS_STYLES.pending}`}>
                          {getLabel(ins.status, statusLabels)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {totalItems > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden" style={{ minWidth: 60 }}>
                              <div className="h-full bg-teal-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[11px] text-gray-400">{itemsDone}/{totalItems}</span>
                          </div>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 justify-end">
                          <button onClick={() => openEdit(ins)}
                            className="text-[12px] text-teal-600 hover:text-teal-800 font-medium transition-colors">
                            {t(T.edit)}
                          </button>
                          <button onClick={() => setDelId(ins.id)}
                            className="text-[12px] text-red-500 hover:text-red-700 font-medium transition-colors">
                            {t(T.delete)}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-50 dark:divide-gray-800">
            {inspections.map(ins => {
              const totalItems = ins.total_items ?? 0;
              const itemsDone  = ins.items_done  ?? 0;
              const pct = totalItems > 0 ? Math.round((itemsDone / totalItems) * 100) : 0;
              return (
                <div key={ins.id} className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{TYPE_ICONS[ins.type] ?? "🔍"}</span>
                      <div>
                        <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">{ins.unit}</p>
                        <p className="text-[11px] text-gray-400">{getLabel(ins.type, typeLabels)} · {ins.date?.slice(0, 10)}</p>
                      </div>
                    </div>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[ins.status] ?? STATUS_STYLES.pending}`}>
                      {getLabel(ins.status, statusLabels)}
                    </span>
                  </div>
                  {totalItems > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] text-gray-400">{pct}%</span>
                    </div>
                  )}
                  <div className="flex gap-3 mt-3">
                    <button onClick={() => openEdit(ins)} className="text-[12px] text-teal-600 font-medium">{t(T.edit)}</button>
                    <button onClick={() => setDelId(ins.id)} className="text-[12px] text-red-500 font-medium">{t(T.delete)}</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal isOpen={modal} onClose={() => setModal(false)}
        title={editing ? `${t(T.edit)} — ${t(T.title)}` : `${t(T.add)} — ${t(T.title)}`}
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
          <FormField label={t(T.type)}>
            <select className={selectClass} value={form.type} onChange={e => fp("type", e.target.value)}>
              {INSPECTION_TYPES.map(tp => (
                <option key={tp} value={tp}>{getLabel(tp, typeLabels)}</option>
              ))}
            </select>
          </FormField>
          <FormField label={t(T.date)} required>
            <input className={inputClass} type="date" value={form.date} onChange={e => fp("date", e.target.value)} />
          </FormField>
          <FormField label={t(T.unit)} required>
            <input className={inputClass} placeholder={lang === "fr" ? "ex: App. 3, 123 rue Principale" : "e.g. Unit 3, 123 Main St"} value={form.unit} onChange={e => fp("unit", e.target.value)} />
          </FormField>
          <FormField label={t(T.tenant)}>
            <input className={inputClass} placeholder={lang === "fr" ? "Nom du locataire" : "Tenant name"} value={form.tenant} onChange={e => fp("tenant", e.target.value)} />
          </FormField>
          <FormField label={t(T.status)}>
            <select className={selectClass} value={form.status} onChange={e => fp("status", e.target.value)}>
              {STATUSES.map(s => (
                <option key={s} value={s}>{getLabel(s, statusLabels)}</option>
              ))}
            </select>
          </FormField>
          <FormField label={t(T.totalItems)}>
            <input className={inputClass} type="number" min="0" value={form.total_items} onChange={e => fp("total_items", e.target.value)} />
          </FormField>
          <FormField label={t(T.itemsDone)}>
            <input className={inputClass} type="number" min="0" value={form.items_done} onChange={e => fp("items_done", e.target.value)} />
          </FormField>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!delId}
        title={t(T.delTitle)}
        message={t(T.delMsg)}
        onConfirm={deleteInspection}
        onCancel={() => setDelId(null)}
      />
    </div>
  );
}
