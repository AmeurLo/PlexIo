"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/lib/ToastContext";
import { requireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { TeamMember } from "@/lib/types";
import PageHeader from "@/components/dashboard/PageHeader";
import Modal from "@/components/dashboard/Modal";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import EmptyState from "@/components/dashboard/EmptyState";
import FormField, { inputClass, selectClass } from "@/components/dashboard/FormField";
import StatusBadge from "@/components/dashboard/StatusBadge";

const ROLES = [
  { value: "owner",   fr: "Propriétaire",  en: "Owner" },
  { value: "manager", fr: "Gestionnaire",  en: "Manager" },
  { value: "admin",   fr: "Administrateur", en: "Admin" },
  { value: "viewer",  fr: "Lecteur",        en: "Viewer" },
];

const T = {
  title:    { fr: "Équipe",              en: "Team" },
  sub:      { fr: "Gérez les accès",    en: "Manage access" },
  invite:   { fr: "Inviter",            en: "Invite" },
  edit:     { fr: "Modifier",           en: "Edit" },
  remove:   { fr: "Retirer",            en: "Remove" },
  cancel:   { fr: "Annuler",            en: "Cancel" },
  save:     { fr: "Enregistrer",        en: "Save" },
  saving:   { fr: "Enregistrement…",    en: "Saving…" },
  empty:    { fr: "Aucun membre",       en: "No team members" },
  emptySub: { fr: "Invitez votre équipe.", en: "Invite your team." },
  delTitle: { fr: "Retirer ce membre ?", en: "Remove this member?" },
  delMsg:   { fr: "Cette action est irréversible.", en: "This action cannot be undone." },
  name:     { fr: "Nom",              en: "Name" },
  email:    { fr: "Courriel",         en: "Email" },
  role:     { fr: "Rôle",            en: "Role" },
  status:   { fr: "Statut",          en: "Status" },
};

const emptyForm = { full_name: "", email: "", role: "manager" };

export default function TeamPage() {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { if (!requireAuth()) return; load(); }, []);

  async function load() {
    setLoading(true);
    try { setMembers(await api.getTeamMembers()); }
    catch (e: any) { showToast(e instanceof Error ? e.message : String(e), "error"); }
    finally { setLoading(false); }
  }

  function openInvite() { setEditing(null); setForm({ ...emptyForm }); setFormError(""); setShowModal(true); }
  function openEdit(m: TeamMember) {
    setEditing(m);
    setForm({ full_name: m.full_name ?? "", email: m.email ?? "", role: m.role ?? "manager" });
    setFormError(""); setShowModal(true);
  }

  async function handleSave() {
    if (!form.email.trim()) { setFormError(lang === "fr" ? "Courriel requis." : "Email required."); return; }
    setSaving(true); setFormError("");
    try {
      if (editing) { await api.updateTeamMember(editing.id, { role: form.role }); }
      else { await api.inviteTeamMember(form); }
      setShowModal(false); load();
    } catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await api.removeTeamMember(deleteTarget.id); setDeleteTarget(null); load(); }
    catch (e: any) { showToast(e.message, "error"); }
    finally { setDeleting(false); }
  }

  const f = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));
  const roleLabel = (r: string) => ROLES.find(x => x.value === r)?.[lang === "fr" ? "fr" : "en"] ?? r;

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <PageHeader title={t(T.title)} subtitle={t(T.sub)} actions={[{ label: `+ ${t(T.invite)}`, onClick: openInvite, primary: true }]} />

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : members.length === 0 ? (
        <EmptyState icon="users" title={t(T.empty)} description={t(T.emptySub)} actionLabel={`+ ${t(T.invite)}`} onAction={openInvite} />
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] divide-y divide-gray-50 dark:divide-gray-800 overflow-hidden">
          {members.map(m => (
            <div key={m.id ?? m._id} className="flex items-center gap-4 px-5 py-4">
              <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-[13px] font-bold text-teal-700 dark:text-teal-400">
                  {(m.full_name ?? m.email ?? "?")[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white text-[14px]">{m.full_name || m.email}</p>
                <p className="text-[12px] text-gray-400">{m.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-medium text-gray-500 dark:text-gray-400 hidden sm:block">{roleLabel(m.role ?? "")}</span>
                <StatusBadge status={m.status ?? "active"} lang={lang} />
                <button onClick={() => openEdit(m)} className="text-[12px] text-teal-700 hover:underline">{t(T.edit)}</button>
                <button onClick={() => setDeleteTarget(m)} className="text-[12px] text-red-500 hover:underline">{t(T.remove)}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? t(T.edit) : `${t(T.invite)} — ${t(T.title)}`}
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-[13px] rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">{t(T.cancel)}</button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-[13px] font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl transition-colors">
              {saving ? t(T.saving) : (editing ? t(T.save) : t(T.invite))}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {formError && <p className="text-[13px] text-red-500">{formError}</p>}
          {!editing && (
            <>
              <FormField label={t(T.name)}><input className={inputClass} value={form.full_name} onChange={e => f("full_name", e.target.value)} /></FormField>
              <FormField label={t(T.email)} required><input className={inputClass} type="email" value={form.email} onChange={e => f("email", e.target.value)} /></FormField>
            </>
          )}
          <FormField label={t(T.role)}>
            <select className={selectClass} value={form.role} onChange={e => f("role", e.target.value)}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{lang === "fr" ? r.fr : r.en}</option>)}
            </select>
          </FormField>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={t(T.delTitle)}
        message={`${deleteTarget?.full_name ?? deleteTarget?.email} — ${t(T.delMsg)}`}
        confirmLabel={t(T.remove)}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        danger
      />
    </div>
  );
}
