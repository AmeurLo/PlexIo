"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/lib/ToastContext";
import { requireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatPhone } from "@/lib/format";
import type { Contractor } from "@/lib/types";
import PageHeader from "@/components/dashboard/PageHeader";
import Modal from "@/components/dashboard/Modal";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import EmptyState from "@/components/dashboard/EmptyState";
import FormField, { inputClass, selectClass } from "@/components/dashboard/FormField";
import { Icon } from "@/lib/icons";

const SPECIALTIES = [
  { value: "plumbing",       fr: "Plomberie",       en: "Plumbing" },
  { value: "electrical",     fr: "Électricité",     en: "Electrical" },
  { value: "hvac",           fr: "HVAC",            en: "HVAC" },
  { value: "carpentry",      fr: "Menuiserie",      en: "Carpentry" },
  { value: "painting",       fr: "Peinture",        en: "Painting" },
  { value: "roofing",        fr: "Toiture",         en: "Roofing" },
  { value: "landscaping",    fr: "Aménagement",     en: "Landscaping" },
  { value: "cleaning",       fr: "Nettoyage",       en: "Cleaning" },
  { value: "general",        fr: "Général",         en: "General" },
];

const T = {
  title:    { fr: "Entrepreneurs",       en: "Contractors" },
  sub:      { fr: "Votre carnet de contact", en: "Your contact book" },
  add:      { fr: "Ajouter",            en: "Add" },
  edit:     { fr: "Modifier",           en: "Edit" },
  delete:   { fr: "Supprimer",          en: "Delete" },
  cancel:   { fr: "Annuler",            en: "Cancel" },
  save:     { fr: "Enregistrer",        en: "Save" },
  saving:   { fr: "Enregistrement…",    en: "Saving…" },
  empty:    { fr: "Aucun entrepreneur", en: "No contractors yet" },
  emptySub: { fr: "Ajoutez vos entrepreneurs de confiance.", en: "Add your trusted contractors." },
  delTitle: { fr: "Supprimer ?",        en: "Delete?" },
  delMsg:   { fr: "Cette action est irréversible.", en: "This action cannot be undone." },
  name:     { fr: "Nom",              en: "Name" },
  company:  { fr: "Entreprise",       en: "Company" },
  specialty: { fr: "Spécialité",      en: "Specialty" },
  phone:    { fr: "Téléphone",        en: "Phone" },
  email:    { fr: "Courriel",         en: "Email" },
  rate:     { fr: "Taux horaire ($)", en: "Hourly rate ($)" },
  rating:   { fr: "Note (/5)",        en: "Rating (/5)" },
  notes:    { fr: "Notes",            en: "Notes" },
};

const emptyForm = { name: "", company: "", specialty: "general", phone: "", email: "", hourly_rate: "", rating: "", notes: "" };

export default function ContractorsPage() {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Contractor | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Contractor | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { if (!requireAuth()) return; load(); }, []);

  async function load() {
    setLoading(true);
    try { setContractors(await api.getContractors()); }
    catch (e: any) { showToast(e instanceof Error ? e.message : String(e), "error"); }
    finally { setLoading(false); }
  }

  function openAdd() { setEditing(null); setForm({ ...emptyForm }); setFormError(""); setShowModal(true); }
  function openEdit(c: Contractor) {
    setEditing(c);
    setForm({
      name: c.name ?? "", company: c.company ?? "", specialty: c.specialty ?? "general",
      phone: c.phone ?? "", email: c.email ?? "", hourly_rate: c.hourly_rate ? String(c.hourly_rate) : "",
      rating: c.rating ? String(c.rating) : "", notes: c.notes ?? "",
    });
    setFormError(""); setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormError(lang === "fr" ? "Nom requis." : "Name required."); return; }
    setSaving(true); setFormError("");
    try {
      const payload = { ...form, hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : undefined, rating: form.rating ? Number(form.rating) : undefined };
      if (editing) { await api.updateContractor(editing.id, payload); }
      else { await api.createContractor(payload); }
      setShowModal(false); load();
    } catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await api.deleteContractor(deleteTarget.id); setDeleteTarget(null); load(); }
    catch (e: any) { showToast(e.message, "error"); }
    finally { setDeleting(false); }
  }

  const f = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));
  const specLabel = (v: string) => SPECIALTIES.find(s => s.value === v)?.[lang === "fr" ? "fr" : "en"] ?? v;

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <PageHeader title={t(T.title)} subtitle={t(T.sub)} actions={[{ label: `+ ${t(T.add)}`, onClick: openAdd, primary: true }]} />

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : contractors.length === 0 ? (
        <EmptyState icon="building" title={t(T.empty)} description={t(T.emptySub)} actionLabel={`+ ${t(T.add)}`} onAction={openAdd} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {contractors.map(c => (
            <div key={c.id ?? c._id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-[13px] font-bold text-teal-700 dark:text-teal-400">{(c.name ?? "?")[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white text-[14px]">{c.name}</p>
                  {c.company && <p className="text-[12px] text-gray-400">{c.company}</p>}
                  <span className="text-[11px] font-medium px-2 py-0.5 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 rounded-full">{specLabel(c.specialty ?? "general")}</span>
                </div>
                {c.rating && (
                  <div className="flex items-center gap-0.5 text-yellow-500 flex-shrink-0">
                    <Icon name="sparkles" size={13} />
                    <span className="text-[12px] font-semibold">{c.rating}</span>
                  </div>
                )}
              </div>
              <div className="space-y-1 mb-3">
                {c.phone && (
                  <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-[13px] text-gray-500 hover:text-teal-600 transition-colors">
                    <Icon name="users" size={13} />
                    {c.phone}
                  </a>
                )}
                {c.email && (
                  <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-[13px] text-gray-500 hover:text-teal-600 transition-colors truncate">
                    <Icon name="chat" size={13} />
                    {c.email}
                  </a>
                )}
                {c.hourly_rate && <p className="text-[12px] text-gray-400">{lang === "fr" ? "Taux" : "Rate"}: ${c.hourly_rate}/h</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(c)} className="flex-1 py-1.5 text-[12px] font-medium text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-900/40 rounded-lg transition-colors">{t(T.edit)}</button>
                <button onClick={() => setDeleteTarget(c)} className="flex-1 py-1.5 text-[12px] font-medium text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors">{t(T.delete)}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? t(T.edit) : `${t(T.add)} — ${t(T.title).slice(0, -1)}`}
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
          <FormField label={t(T.name)} required><input className={inputClass} value={form.name} onChange={e => f("name", e.target.value)} /></FormField>
          <FormField label={t(T.company)}><input className={inputClass} value={form.company} onChange={e => f("company", e.target.value)} /></FormField>
          <FormField label={t(T.specialty)}>
            <select className={selectClass} value={form.specialty} onChange={e => f("specialty", e.target.value)}>
              {SPECIALTIES.map(s => <option key={s.value} value={s.value}>{lang === "fr" ? s.fr : s.en}</option>)}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t(T.phone)}><input className={inputClass} type="tel" placeholder="514-555-0000" value={form.phone} onChange={e => f("phone", formatPhone(e.target.value))} /></FormField>
            <FormField label={t(T.email)}><input className={inputClass} type="email" value={form.email} onChange={e => f("email", e.target.value)} /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t(T.rate)}><input className={inputClass} type="number" min={0} value={form.hourly_rate} onChange={e => f("hourly_rate", e.target.value)} /></FormField>
            <FormField label={t(T.rating)}><input className={inputClass} type="number" min={1} max={5} step={0.1} value={form.rating} onChange={e => f("rating", e.target.value)} /></FormField>
          </div>
          <FormField label={t(T.notes)}><textarea className={inputClass + " resize-none"} rows={2} value={form.notes} onChange={e => f("notes", e.target.value)} /></FormField>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={t(T.delTitle)}
        message={`${deleteTarget?.name} — ${t(T.delMsg)}`}
        confirmLabel={t(T.delete)}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        danger
      />
    </div>
  );
}
