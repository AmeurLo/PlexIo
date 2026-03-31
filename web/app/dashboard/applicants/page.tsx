"use client";
import { useEffect, useState, useRef } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/lib/ToastContext";
import { requireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatDate, formatPhone, isValidPhone } from "@/lib/format";
import type { Applicant, Property } from "@/lib/types";
import PageHeader from "@/components/dashboard/PageHeader";
import Modal from "@/components/dashboard/Modal";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import EmptyState from "@/components/dashboard/EmptyState";
import FormField, { inputClass } from "@/components/dashboard/FormField";
import SmartSelect from "@/components/dashboard/SmartSelect";
import StatusBadge from "@/components/dashboard/StatusBadge";

const COLUMNS: Array<{ status: string; fr: string; en: string; color: string }> = [
  { status: "pending",   fr: "En attente",  en: "Pending",   color: "bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-900" },
  { status: "reviewing", fr: "En révision", en: "Reviewing", color: "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900" },
  { status: "approved",  fr: "Approuvé",    en: "Approved",  color: "bg-teal-50 dark:bg-teal-900/10 border-teal-200 dark:border-teal-900" },
  { status: "rejected",  fr: "Refusé",      en: "Rejected",  color: "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900" },
];

const T = {
  title:    { fr: "Candidats",         en: "Applicants" },
  sub:      { fr: "Suivi des candidatures", en: "Application pipeline" },
  add:      { fr: "Ajouter",          en: "Add" },
  edit:     { fr: "Modifier",         en: "Edit" },
  delete:   { fr: "Supprimer",        en: "Delete" },
  cancel:   { fr: "Annuler",          en: "Cancel" },
  save:     { fr: "Enregistrer",      en: "Save" },
  saving:   { fr: "Enregistrement…",  en: "Saving…" },
  empty:    { fr: "Aucun candidat",   en: "No applicants" },
  emptySub: { fr: "Suivez toutes les candidatures dans un tableau Kanban. Faites avancer chaque dossier de la réception à l'approbation.", en: "Track all applications in a Kanban board. Move each file from reception to approval." },
  delTitle: { fr: "Supprimer le candidat ?", en: "Delete applicant?" },
  delMsg:   { fr: "Cette action est irréversible.", en: "This action cannot be undone." },
  name:     { fr: "Nom complet",      en: "Full name" },
  email:    { fr: "Courriel",         en: "Email" },
  phone:    { fr: "Téléphone",        en: "Phone" },
  property: { fr: "Propriété",        en: "Property" },
  unit:     { fr: "Unité",           en: "Unit" },
  income:   { fr: "Revenu mensuel ($)", en: "Monthly income ($)" },
  score:    { fr: "Score crédit",     en: "Credit score" },
  status:   { fr: "Statut",          en: "Status" },
  applied:  { fr: "Date de demande", en: "Applied date" },
  notes:    { fr: "Notes",           en: "Notes" },
};

const emptyForm = {
  full_name: "", email: "", phone: "", property_id: "", unit_number: "",
  monthly_income: "", credit_score: "", status: "pending", notes: "",
};

function isValidEmail(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

export default function ApplicantsPage() {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Applicant | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Applicant | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [emailError, setEmailError] = useState("");
  const dragId = useRef<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  useEffect(() => {
    if (!requireAuth()) return;
    Promise.all([api.getApplicants(), api.getProperties()])
      .then(([as_, ps]) => { setApplicants(as_); setProperties(ps); })
      .catch(e => showToast(e instanceof Error ? e.message : String(e), "error"))
      .finally(() => setLoading(false));
  }, []);

  async function load() { setApplicants(await api.getApplicants()); }

  function resetMeta() { setFormError(""); setPhoneError(""); setEmailError(""); }

  function openAdd() { setEditing(null); setForm({ ...emptyForm }); resetMeta(); setShowModal(true); }
  function openEdit(a: Applicant) {
    setEditing(a);
    setForm({
      full_name: a.full_name ?? "", email: a.email ?? "", phone: a.phone ?? "",
      property_id: a.property_id ?? "", unit_number: a.unit_number ?? "",
      monthly_income: a.monthly_income ? String(a.monthly_income) : "",
      credit_score: a.credit_score ? String(a.credit_score) : "",
      status: a.status ?? "pending", notes: a.notes ?? "",
    });
    resetMeta(); setShowModal(true);
  }

  async function handleSave() {
    if (!form.full_name.trim()) { setFormError(lang === "fr" ? "Nom requis." : "Name required."); return; }
    if (form.email && !isValidEmail(form.email)) { setFormError(lang === "fr" ? "Format de courriel invalide." : "Invalid email format."); return; }
    if (form.phone && !isValidPhone(form.phone)) { setFormError(lang === "fr" ? "Numéro de téléphone invalide (10 chiffres requis)." : "Invalid phone (10 digits required)."); return; }
    setSaving(true); setFormError("");
    try {
      const payload = {
        ...form,
        monthly_income: form.monthly_income ? Number(form.monthly_income) : undefined,
        credit_score: form.credit_score ? Number(form.credit_score) : undefined,
      };
      if (editing) { await api.updateApplicant(editing.id, payload as any); }
      else { await api.createApplicant(payload as any); }
      setShowModal(false); load();
    } catch (e: any) {
      setFormError(typeof e.message === "string" ? e.message : (lang === "fr" ? "Une erreur est survenue." : "An error occurred."));
    }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await api.deleteApplicant(deleteTarget.id); setDeleteTarget(null); load(); }
    catch (e: any) { showToast(e.message, "error"); }
    finally { setDeleting(false); }
  }

  async function moveStatus(a: Applicant, status: string) {
    try { await api.updateApplicant(a.id ?? a._id, { status } as any); load(); }
    catch (e: any) { showToast(e instanceof Error ? e.message : String(e), "error"); }
  }

  const f = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));
  const propName = (id: string) => properties.find(p => p.id === id || p._id === id)?.name ?? id;

  return (
    <div className="p-6 space-y-6">
      <PageHeader title={t(T.title)} subtitle={t(T.sub)} actions={[{ label: `+ ${t(T.add)}`, onClick: openAdd, primary: true }]} />

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : applicants.length === 0 ? (
        <EmptyState icon="users" title={t(T.empty)} description={t(T.emptySub)} actionLabel={`+ ${t(T.add)}`} onAction={openAdd} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 overflow-x-auto">
          {COLUMNS.map(col => {
            const colApplicants = applicants.filter(a => a.status === col.status);
            const isOver = dragOver === col.status;
            return (
              <div
                key={col.status}
                className={`rounded-2xl border p-4 transition-all ${col.color} ${isOver ? "ring-2 ring-teal-400 ring-offset-1 scale-[1.01]" : ""}`}
                onDragOver={e => { e.preventDefault(); setDragOver(col.status); }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null); }}
                onDrop={e => {
                  e.preventDefault();
                  setDragOver(null);
                  const id = dragId.current;
                  if (!id) return;
                  const a = applicants.find(ap => (ap.id ?? ap._id) === id);
                  if (a && a.status !== col.status) moveStatus(a, col.status);
                  dragId.current = null;
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">
                    {lang === "fr" ? col.fr : col.en}
                  </h3>
                  <span className="text-[11px] font-bold bg-white dark:bg-gray-800 rounded-full px-2 py-0.5 text-gray-500">{colApplicants.length}</span>
                </div>
                <div className="space-y-2">
                  {colApplicants.map(a => (
                    <div
                      key={a.id ?? a._id}
                      draggable
                      onDragStart={e => {
                        dragId.current = a.id ?? a._id ?? null;
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => { dragId.current = null; setDragOver(null); }}
                      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 p-3 shadow-sm cursor-grab active:cursor-grabbing active:shadow-md active:scale-[1.02] transition-transform select-none"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 dark:text-gray-200 text-[13px] truncate">{a.full_name}</p>
                          <p className="text-[11px] text-gray-400 truncate">{a.email}</p>
                          {a.property_id && <p className="text-[11px] text-gray-400 truncate">{propName(a.property_id)}</p>}
                          {a.applied_at && <p className="text-[11px] text-gray-400">{formatDate(a.applied_at)}</p>}
                        </div>
                        {/* Drag handle hint */}
                        <div className="text-gray-300 dark:text-gray-600 mt-0.5 flex-shrink-0" aria-hidden>⠿</div>
                      </div>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {COLUMNS.filter(c => c.status !== col.status).map(target => (
                          <button
                            key={target.status}
                            onClick={() => moveStatus(a, target.status)}
                            className="text-[10px] px-2 py-0.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 transition-colors"
                          >
                            → {lang === "fr" ? target.fr : target.en}
                          </button>
                        ))}
                        <button onClick={() => openEdit(a)} className="text-[10px] px-2 py-0.5 text-teal-700 hover:underline">
                          {t(T.edit)}
                        </button>
                        <button onClick={() => setDeleteTarget(a)} className="text-[10px] px-2 py-0.5 text-red-500 hover:underline">
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                  {/* Drop zone hint when column is empty and dragging */}
                  {colApplicants.length === 0 && isOver && (
                    <div className="h-16 rounded-xl border-2 border-dashed border-teal-400 flex items-center justify-center">
                      <p className="text-[11px] text-teal-500">{lang === "fr" ? "Déposer ici" : "Drop here"}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
          <FormField label={t(T.name)} required>
            <input className={inputClass} value={form.full_name} onChange={e => f("full_name", e.target.value)} />
          </FormField>
          <FormField label={t(T.email)} error={emailError}>
            <input
              className={`${inputClass}${emailError ? " !ring-2 !ring-red-400 !border-transparent" : ""}`}
              type="email"
              value={form.email}
              onChange={e => { f("email", e.target.value); setEmailError(""); }}
              onBlur={e => setEmailError(e.target.value && !isValidEmail(e.target.value) ? (lang === "fr" ? "Format invalide" : "Invalid format") : "")}
              placeholder="candidat@email.com"
            />
          </FormField>
          <FormField label={t(T.phone)} error={phoneError}>
            <input
              className={`${inputClass}${phoneError ? " !ring-2 !ring-red-400 !border-transparent" : ""}`}
              type="tel"
              value={form.phone}
              onChange={e => { f("phone", formatPhone(e.target.value)); setPhoneError(""); }}
              onBlur={e => setPhoneError(e.target.value && !isValidPhone(e.target.value) ? (lang === "fr" ? "10 chiffres requis" : "10 digits required") : "")}
              placeholder="514-555-0000"
            />
          </FormField>
          <FormField label={t(T.property)}>
            <SmartSelect
              value={form.property_id}
              onChange={v => f("property_id", v)}
              placeholder={lang === "fr" ? "— Sélectionner —" : "— Select —"}
              options={properties.map(p => ({ value: p.id ?? p._id ?? "", label: p.name }))}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t(T.unit)}>
              <input className={inputClass} value={form.unit_number} onChange={e => f("unit_number", e.target.value)} />
            </FormField>
            <FormField label={t(T.status)}>
              <SmartSelect
                value={form.status}
                onChange={v => f("status", v)}
                options={COLUMNS.map(c => ({ value: c.status, label: lang === "fr" ? c.fr : c.en }))}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t(T.income)}>
              <input className={inputClass} type="number" min={0} value={form.monthly_income} onChange={e => f("monthly_income", e.target.value)} />
            </FormField>
            <FormField label={t(T.score)}>
              <input className={inputClass} type="number" min={300} max={900} value={form.credit_score} onChange={e => f("credit_score", e.target.value)} />
            </FormField>
          </div>
          <FormField label={t(T.notes)}>
            <textarea className={inputClass + " resize-none"} rows={3} value={form.notes} onChange={e => f("notes", e.target.value)} />
          </FormField>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={t(T.delTitle)}
        message={`${deleteTarget?.full_name} — ${t(T.delMsg)}`}
        confirmLabel={t(T.delete)}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        danger
      />
    </div>
  );
}
