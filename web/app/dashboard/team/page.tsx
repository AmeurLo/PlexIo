"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/lib/ToastContext";
import { requireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { TeamMember } from "@/lib/types";
import PageHeader from "@/components/dashboard/PageHeader";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import EmptyState from "@/components/dashboard/EmptyState";
import FormField, { inputClass, selectClass } from "@/components/dashboard/FormField";
import { Icon } from "@/lib/icons";

// ─── Role configuration ───────────────────────────────────────────────────────
const ROLES = [
  {
    value: "manager",
    fr: "Gestionnaire",
    en: "Manager",
    descFr: "Peut voir et modifier propriétés, locataires, baux, maintenance et loyers. Ne peut pas supprimer ni accéder aux finances.",
    descEn: "Can view and edit properties, tenants, leases, maintenance, and rent. Cannot delete or access finances.",
  },
  {
    value: "accountant",
    fr: "Comptable",
    en: "Accountant",
    descFr: "Accès lecture seule aux finances (loyers, dépenses, analytiques). Ne peut rien modifier.",
    descEn: "Read-only access to finances (rent, expenses, analytics). Cannot edit anything.",
  },
];

// ─── Translations ─────────────────────────────────────────────────────────────
const T = {
  title:       { fr: "Équipe",                      en: "Team" },
  sub:         { fr: "Gérez les accès à votre compte", en: "Manage access to your account" },
  invite:      { fr: "Inviter un membre",            en: "Invite a member" },
  edit:        { fr: "Modifier le rôle",             en: "Edit role" },
  remove:      { fr: "Retirer",                      en: "Remove" },
  cancel:      { fr: "Annuler",                      en: "Cancel" },
  send:        { fr: "Envoyer l'invitation",         en: "Send invitation" },
  sending:     { fr: "Envoi…",                       en: "Sending…" },
  save:        { fr: "Enregistrer",                  en: "Save" },
  saving:      { fr: "Enregistrement…",              en: "Saving…" },
  empty:       { fr: "Aucun membre dans votre équipe", en: "No team members yet" },
  emptySub:    { fr: "Invitez un gestionnaire ou un comptable pour collaborer.", en: "Invite a manager or accountant to collaborate." },
  delTitle:    { fr: "Retirer ce membre ?",          en: "Remove this member?" },
  delMsg:      { fr: "Cette personne perdra immédiatement l'accès.", en: "This person will immediately lose access." },
  name:        { fr: "Nom (optionnel)",              en: "Name (optional)" },
  email:       { fr: "Courriel",                     en: "Email" },
  role:        { fr: "Rôle",                         en: "Role" },
  status:      { fr: "Statut",                       en: "Status" },
  pending:     { fr: "En attente",                   en: "Pending" },
  active:      { fr: "Actif",                        en: "Active" },
  inviteSent:  { fr: "Invitation envoyée par email", en: "Invitation sent by email" },
  roleHint:    { fr: "Permissions du rôle :",        en: "Role permissions:" },
};

const emptyForm = { email: "", name: "", role: "manager" };

// ─── Role badge ───────────────────────────────────────────────────────────────
function RoleBadge({ role, lang }: { role: string; lang: string }) {
  const def = ROLES.find(r => r.value === role);
  const label = def ? (lang === "fr" ? def.fr : def.en) : role;
  const colors =
    role === "manager"
      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
      : role === "accountant"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
      : "bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${colors}`}>
      {label}
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadgeTeam({ status, lang }: { status: string; lang: string }) {
  const isPending = status === "pending";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
      isPending
        ? "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
        : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
    }`}>
      {isPending ? (
        <Icon name="calendar" size={10} strokeWidth={2} />
      ) : (
        <Icon name="check" size={10} strokeWidth={2.5} />
      )}
      {isPending
        ? (lang === "fr" ? T.pending.fr : T.pending.en)
        : (lang === "fr" ? T.active.fr : T.active.en)}
    </span>
  );
}

// ─── Avatar initials ──────────────────────────────────────────────────────────
function Avatar({ member }: { member: TeamMember }) {
  const label = member.full_name ?? member.name ?? member.email ?? "?";
  const initials = label
    .split(" ")
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center flex-shrink-0">
      <span className="text-[13px] font-bold text-teal-700 dark:text-teal-400">{initials || "?"}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TeamPage() {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");
  const [invitedSuccess, setInvitedSuccess] = useState(false);

  // Edit role inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("manager");
  const [savingRole, setSavingRole] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  const t = (o: { fr: string; en: string }) => lang === "fr" ? o.fr : o.en;

  useEffect(() => { if (!requireAuth()) return; load(); }, []);

  async function load() {
    setLoading(true);
    try { setMembers(await api.getTeamMembers()); }
    catch (e: any) { showToast(e instanceof Error ? e.message : String(e), "error"); }
    finally { setLoading(false); }
  }

  function openInvite() {
    setForm({ ...emptyForm });
    setFormError("");
    setInvitedSuccess(false);
    setShowInviteForm(true);
  }

  async function handleInvite() {
    if (!form.email.trim()) {
      setFormError(lang === "fr" ? "Courriel requis." : "Email required.");
      return;
    }
    setSending(true); setFormError("");
    try {
      await api.inviteTeamMember({ email: form.email.trim(), role: form.role, name: form.name.trim() || undefined });
      setInvitedSuccess(true);
      setForm({ ...emptyForm });
      load();
    } catch (e: any) { setFormError(e.message); }
    finally { setSending(false); }
  }

  function openEditRole(m: TeamMember) {
    setEditingId(m.id);
    setEditRole(m.role ?? "manager");
  }

  async function handleSaveRole(m: TeamMember) {
    setSavingRole(true);
    try {
      await api.updateTeamMemberRole(m.id, editRole);
      setEditingId(null);
      load();
    } catch (e: any) { showToast(e.message, "error"); }
    finally { setSavingRole(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.removeTeamMember(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (e: any) { showToast(e.message, "error"); }
    finally { setDeleting(false); }
  }

  const selectedRoleDef = ROLES.find(r => r.value === form.role);

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <PageHeader
        title={t(T.title)}
        subtitle={t(T.sub)}
        actions={[{ label: `+ ${t(T.invite)}`, onClick: openInvite, primary: true }]}
      />

      {/* ── Invite form ─────────────────────────────────────────────────── */}
      {showInviteForm && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5 space-y-4">
          <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white">{t(T.invite)}</h3>

          {invitedSuccess ? (
            <div className="flex items-center gap-3 py-3 px-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <Icon name="check" size={16} strokeWidth={2.5} className="text-green-600 dark:text-green-400 flex-shrink-0" />
              <p className="text-[13px] text-green-700 dark:text-green-300">{t(T.inviteSent)}</p>
              <button
                onClick={() => { setInvitedSuccess(false); }}
                className="ml-auto text-[12px] text-green-700 dark:text-green-300 underline"
              >
                {lang === "fr" ? "Inviter un autre" : "Invite another"}
              </button>
            </div>
          ) : (
            <>
              {formError && (
                <p className="text-[13px] text-red-500">{formError}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label={t(T.email)} required>
                  <input
                    className={inputClass}
                    type="email"
                    placeholder="jane@example.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  />
                </FormField>
                <FormField label={t(T.name)}>
                  <input
                    className={inputClass}
                    placeholder={lang === "fr" ? "Prénom Nom" : "First Last"}
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </FormField>
              </div>
              <FormField label={t(T.role)}>
                <select
                  className={selectClass}
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>
                      {lang === "fr" ? r.fr : r.en}
                    </option>
                  ))}
                </select>
              </FormField>

              {/* Role description hint */}
              {selectedRoleDef && (
                <div className="flex gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <Icon name="info" size={14} strokeWidth={2} className="text-gray-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[12px] text-gray-500 dark:text-gray-400">
                    <span className="font-medium">{t(T.roleHint)}</span>{" "}
                    {lang === "fr" ? selectedRoleDef.descFr : selectedRoleDef.descEn}
                  </p>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-1">
                <button
                  onClick={() => setShowInviteForm(false)}
                  className="px-4 py-2 text-[13px] rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {t(T.cancel)}
                </button>
                <button
                  onClick={handleInvite}
                  disabled={sending}
                  className="px-5 py-2 text-[13px] font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl transition-colors"
                >
                  {sending ? t(T.sending) : t(T.send)}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Member list ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          icon="users"
          title={t(T.empty)}
          description={t(T.emptySub)}
          actionLabel={`+ ${t(T.invite)}`}
          onAction={openInvite}
        />
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] divide-y divide-gray-50 dark:divide-gray-800 overflow-hidden">
          {members.map(m => (
            <div key={m.id ?? m._id} className="flex items-center gap-4 px-5 py-4 flex-wrap sm:flex-nowrap">
              <Avatar member={m} />

              {/* Name + email */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white text-[14px] truncate">
                  {m.full_name ?? m.name ?? m.email}
                </p>
                <p className="text-[12px] text-gray-400 truncate">{m.email}</p>
              </div>

              {/* Badges + actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {editingId === m.id ? (
                  <>
                    <select
                      className={`${selectClass} !py-1 !text-[12px] !w-auto`}
                      value={editRole}
                      onChange={e => setEditRole(e.target.value)}
                    >
                      {ROLES.map(r => (
                        <option key={r.value} value={r.value}>
                          {lang === "fr" ? r.fr : r.en}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleSaveRole(m)}
                      disabled={savingRole}
                      className="px-3 py-1 text-[12px] font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-lg transition-colors"
                    >
                      {savingRole ? "…" : t(T.save)}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1 text-[12px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      {t(T.cancel)}
                    </button>
                  </>
                ) : (
                  <>
                    <RoleBadge role={m.role ?? "manager"} lang={lang} />
                    <StatusBadgeTeam status={m.status ?? "pending"} lang={lang} />
                    <button
                      onClick={() => openEditRole(m)}
                      className="text-[12px] text-teal-700 dark:text-teal-400 hover:underline"
                    >
                      {t(T.edit)}
                    </button>
                    <button
                      onClick={() => setDeleteTarget(m)}
                      className="text-[12px] text-red-500 hover:underline"
                    >
                      {t(T.remove)}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Role legend ─────────────────────────────────────────────────── */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-3">
        <p className="text-[12px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {lang === "fr" ? "Permissions par rôle" : "Role permissions"}
        </p>
        <div className="space-y-2">
          {ROLES.map(r => (
            <div key={r.value} className="flex items-start gap-3">
              <RoleBadge role={r.value} lang={lang} />
              <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed">
                {lang === "fr" ? r.descFr : r.descEn}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Confirm remove ───────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={t(T.delTitle)}
        message={`${deleteTarget?.full_name ?? deleteTarget?.name ?? deleteTarget?.email} — ${t(T.delMsg)}`}
        confirmLabel={t(T.remove)}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        danger
      />
    </div>
  );
}
