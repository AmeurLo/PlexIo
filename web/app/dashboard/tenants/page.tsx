"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/lib/ToastContext";
import { requireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { Tenant, Property } from "@/lib/types";
import PageHeader from "@/components/dashboard/PageHeader";
import Modal from "@/components/dashboard/Modal";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import EmptyState from "@/components/dashboard/EmptyState";
import FormField, { inputClass, selectClass } from "@/components/dashboard/FormField";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { Icon } from "@/lib/icons";

const T = {
  title:       { fr: "Locataires",          en: "Tenants" },
  sub:         { fr: "Gérez vos locataires", en: "Manage your tenants" },
  add:         { fr: "Ajouter",             en: "Add" },
  edit:        { fr: "Modifier",            en: "Edit" },
  delete:      { fr: "Supprimer",           en: "Delete" },
  cancel:      { fr: "Annuler",             en: "Cancel" },
  save:        { fr: "Enregistrer",         en: "Save" },
  saving:      { fr: "Enregistrement…",     en: "Saving…" },
  empty:       { fr: "Aucun locataire",     en: "No tenants yet" },
  emptySub:    { fr: "Ajoutez votre premier locataire.", en: "Add your first tenant to get started." },
  delTitle:    { fr: "Supprimer le locataire ?", en: "Delete tenant?" },
  delMsg:      { fr: "Cette action est irréversible.", en: "This action cannot be undone." },
  search:      { fr: "Rechercher…",         en: "Search…" },
  firstName:   { fr: "Prénom",             en: "First name" },
  lastName:    { fr: "Nom",               en: "Last name" },
  email:       { fr: "Courriel",           en: "Email" },
  phone:       { fr: "Téléphone",          en: "Phone" },
  property:    { fr: "Propriété",          en: "Property" },
  unit:        { fr: "Unité",             en: "Unit" },
  moveIn:      { fr: "Date d'entrée",      en: "Move-in date" },
  status:      { fr: "Statut",            en: "Status" },
  selectProp:  { fr: "— Sélectionner —",  en: "— Select —" },
  noPhone:     { fr: "Aucun téléphone",    en: "No phone" },
  documents:   { fr: "Documents",          en: "Documents" },
};

const emptyForm = {
  first_name: "", last_name: "", email: "", phone: "", property_id: "", unit_number: "",
  move_in_date: "", emergency_contact_name: "", emergency_contact_phone: "",
};

export default function TenantsPage() {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!requireAuth()) return;
    Promise.all([api.getTenants(), api.getProperties()])
      .then(([ts, ps]) => { setTenants(ts); setProperties(ps); })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  async function load() {
    setTenants(await api.getTenants());
  }

  function openAdd() { setEditing(null); setForm({ ...emptyForm }); setFormError(""); setShowModal(true); }

  function openEdit(t: Tenant) {
    setEditing(t);
    setForm({
      first_name: t.first_name ?? "", last_name: t.last_name ?? "", email: t.email ?? "",
      phone: t.phone ?? "", property_id: t.property_id ?? "", unit_number: t.unit_number ?? "",
      move_in_date: t.move_in_date?.slice(0, 10) ?? "",
      emergency_contact_name: t.emergency_contact?.name ?? "",
      emergency_contact_phone: t.emergency_contact?.phone ?? "",
    });
    setFormError(""); setShowModal(true);
  }

  async function handleSave() {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setFormError(lang === "fr" ? "Prénom et nom requis." : "First and last name required."); return;
    }
    if (!form.email.trim()) { setFormError(lang === "fr" ? "Le courriel est requis." : "Email is required."); return; }
    setSaving(true); setFormError("");
    try {
      const payload: any = { ...form };
      if (form.emergency_contact_name || form.emergency_contact_phone) {
        payload.emergency_contact = { name: form.emergency_contact_name, phone: form.emergency_contact_phone };
      }
      delete payload.emergency_contact_name; delete payload.emergency_contact_phone;
      if (editing) { await api.updateTenant(editing.id, payload); }
      else { await api.createTenant(payload); }
      setShowModal(false); load();
    } catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await api.deleteTenant(deleteTarget.id); setDeleteTarget(null); load(); }
    catch (e: any) { showToast(e.message, "error"); }
    finally { setDeleting(false); }
  }

  const f = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const filtered = tenants.filter(t => {
    const q = search.toLowerCase();
    return !q || `${t.first_name} ${t.last_name} ${t.email}`.toLowerCase().includes(q);
  });

  const propName = (id: string) => properties.find(p => p.id === id || p._id === id)?.name ?? id;

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <PageHeader title={t(T.title)} subtitle={t(T.sub)} actions={[{ label: `+ ${t(T.add)}`, onClick: openAdd, primary: true }]} />

      {/* Search */}
      <div className="relative max-w-sm">
        <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t(T.search)}
          className="w-full pl-9 pr-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="users" title={t(T.empty)} description={t(T.emptySub)} actionLabel={`+ ${t(T.add)}`} onAction={openAdd} />
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">{lang === "fr" ? "Nom" : "Name"}</th>
                  <th className="px-5 py-3 text-left">{t(T.email)}</th>
                  <th className="px-5 py-3 text-left">{t(T.property)}</th>
                  <th className="px-5 py-3 text-left">{t(T.unit)}</th>
                  <th className="px-5 py-3 text-left">{t(T.status)}</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {filtered.map(ten => (
                  <tr key={ten.id ?? ten._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400">
                            {(ten.first_name?.[0] ?? "") + (ten.last_name?.[0] ?? "")}
                          </span>
                        </div>
                        <span className="font-medium text-gray-800 dark:text-gray-200">{ten.first_name} {ten.last_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{ten.email}</td>
                    <td className="px-5 py-3 text-gray-500">{ten.property_id ? propName(ten.property_id) : "—"}</td>
                    <td className="px-5 py-3 text-gray-500">{ten.unit_number || "—"}</td>
                    <td className="px-5 py-3"><StatusBadge status={ten.status ?? "active"} lang={lang} /></td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <Link href={`/dashboard/tenants/${ten.id ?? ten._id}/documents`}
                          className="text-[12px] text-blue-600 dark:text-blue-400 hover:underline font-medium">
                          {t(T.documents)}
                        </Link>
                        <button onClick={() => openEdit(ten)} className="text-[12px] text-teal-700 hover:underline">{t(T.edit)}</button>
                        <button onClick={() => setDeleteTarget(ten)} className="text-[12px] text-red-500 hover:underline">{t(T.delete)}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-50 dark:divide-gray-800">
            {filtered.map(ten => (
              <div key={ten.id ?? ten._id} className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-[12px] font-bold text-teal-700 dark:text-teal-400">
                    {(ten.first_name?.[0] ?? "") + (ten.last_name?.[0] ?? "")}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 dark:text-gray-200 text-[14px]">{ten.first_name} {ten.last_name}</p>
                  <p className="text-[12px] text-gray-400 truncate">{ten.email}</p>
                </div>
                <StatusBadge status={ten.status ?? "active"} lang={lang} />
                <Link href={`/dashboard/tenants/${ten.id ?? ten._id}/documents`}
                  className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20">
                  <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </Link>
                <button onClick={() => setDeleteTarget(ten)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                  <Icon name="x" size={14} className="text-red-400" />
                </button>
                <button onClick={() => openEdit(ten)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  <Icon name="chevron-right" size={16} className="text-gray-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? `${t(T.edit)} — ${t(T.title).slice(0, -1)}` : `${t(T.add)} — ${t(T.title).slice(0, -1)}`}
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
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t(T.firstName)} required>
              <input className={inputClass} value={form.first_name} onChange={e => f("first_name", e.target.value)} />
            </FormField>
            <FormField label={t(T.lastName)} required>
              <input className={inputClass} value={form.last_name} onChange={e => f("last_name", e.target.value)} />
            </FormField>
          </div>
          <FormField label={t(T.email)} required>
            <input className={inputClass} type="email" value={form.email} onChange={e => f("email", e.target.value)} placeholder="locataire@email.com" />
          </FormField>
          <FormField label={t(T.phone)}>
            <input className={inputClass} type="tel" value={form.phone} onChange={e => f("phone", e.target.value)} placeholder="514-555-0000" />
          </FormField>
          <FormField label={t(T.property)}>
            <select className={selectClass} value={form.property_id} onChange={e => f("property_id", e.target.value)}>
              <option value="">{t(T.selectProp)}</option>
              {properties.map(p => <option key={p.id ?? p._id} value={p.id ?? p._id}>{p.name}</option>)}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t(T.unit)}>
              <input className={inputClass} value={form.unit_number} onChange={e => f("unit_number", e.target.value)} placeholder="101" />
            </FormField>
            <FormField label={t(T.moveIn)}>
              <input className={inputClass} type="date" value={form.move_in_date} onChange={e => f("move_in_date", e.target.value)} />
            </FormField>
          </div>
          <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
            <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-3">{lang === "fr" ? "Contact d'urgence" : "Emergency contact"}</p>
            <div className="grid grid-cols-2 gap-3">
              <FormField label={lang === "fr" ? "Nom" : "Name"}>
                <input className={inputClass} value={form.emergency_contact_name} onChange={e => f("emergency_contact_name", e.target.value)} />
              </FormField>
              <FormField label={t(T.phone)}>
                <input className={inputClass} value={form.emergency_contact_phone} onChange={e => f("emergency_contact_phone", e.target.value)} />
              </FormField>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={t(T.delTitle)}
        message={`${deleteTarget?.first_name} ${deleteTarget?.last_name} — ${t(T.delMsg)}`}
        confirmLabel={t(T.delete)}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        danger
      />
    </div>
  );
}
