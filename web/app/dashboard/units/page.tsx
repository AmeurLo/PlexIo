"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/lib/ToastContext";
import { requireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { Unit, Property } from "@/lib/types";
import PageHeader from "@/components/dashboard/PageHeader";
import Modal from "@/components/dashboard/Modal";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import EmptyState from "@/components/dashboard/EmptyState";
import FormField, { inputClass, selectClass } from "@/components/dashboard/FormField";

// ─── i18n ─────────────────────────────────────────────────────────────────────
const T = {
  title:       { fr: "Unités",                   en: "Units" },
  sub:         { fr: "Gérez toutes vos unités",  en: "Manage all your units" },
  add:         { fr: "Ajouter une unité",        en: "Add unit" },
  edit:        { fr: "Modifier l'unité",         en: "Edit unit" },
  addTitle:    { fr: "Nouvelle unité",           en: "New unit" },
  delete:      { fr: "Supprimer",               en: "Delete" },
  cancel:      { fr: "Annuler",                 en: "Cancel" },
  save:        { fr: "Enregistrer",             en: "Save" },
  saving:      { fr: "Enregistrement…",         en: "Saving…" },
  loading:     { fr: "Chargement…",             en: "Loading…" },
  empty:       { fr: "Aucune unité",            en: "No units yet" },
  emptySub:    { fr: "Ajoutez votre première unité pour commencer.", en: "Add your first unit to get started." },
  delTitle:    { fr: "Supprimer l'unité ?",     en: "Delete unit?" },
  delMsg:      { fr: "Cette action est irréversible.", en: "This action cannot be undone." },
  property:    { fr: "Propriété",               en: "Property" },
  allProps:    { fr: "Toutes les propriétés",   en: "All properties" },
  unitNum:     { fr: "N° d'unité",              en: "Unit #" },
  beds:        { fr: "Chambres",                en: "Bedrooms" },
  baths:       { fr: "Salles de bain",          en: "Bathrooms" },
  sqft:        { fr: "Superficie (pi²)",        en: "Square feet" },
  rentMo:      { fr: "Loyer / mois ($)",        en: "Rent / month ($)" },
  occupied:    { fr: "Occupée",                 en: "Occupied" },
  vacant:      { fr: "Vacante",                 en: "Vacant" },
  notes:       { fr: "Notes",                   en: "Notes" },
  timeline:    { fr: "Historique",              en: "Timeline" },
  noMatch:     { fr: "Aucune unité pour cette propriété.", en: "No units for this property." },
  occupiedLbl: { fr: "Statut occupé",           en: "Occupied status" },
};

const emptyForm = {
  property_id: "",
  unit_number: "",
  bedrooms: "",
  bathrooms: "",
  square_feet: "",
  rent_amount: "",
  is_occupied: false as boolean,
  notes: "",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function UnitsPage() {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();

  const [units, setUnits]           = useState<Unit[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filterProp, setFilterProp] = useState("");

  // Modal
  const [showModal, setShowModal]   = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [form, setForm]             = useState({ ...emptyForm });
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState("");

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Unit | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // ─── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!requireAuth()) return;
    Promise.all([
      api.getUnits(),
      api.getProperties(),
    ])
      .then(([us, ps]) => {
        setUnits(us as Unit[]);
        setProperties(ps as Property[]);
      })
      .catch(e => showToast(e instanceof Error ? e.message : String(e), "error"))
      .finally(() => setLoading(false));
  }, []);

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const f = (k: string, v: unknown) => setForm(prev => ({ ...prev, [k]: v }));

  function propName(propId: string): string {
    const p = properties.find(p => (p.id ?? (p as any)._id) === propId);
    return p?.name ?? propId;
  }

  // ─── Open / reset modal ─────────────────────────────────────────────────────
  function openAdd() {
    setEditingUnit(null);
    setForm({ ...emptyForm, property_id: filterProp });
    setFormError("");
    setShowModal(true);
  }

  function openEdit(u: Unit) {
    setEditingUnit(u);
    setForm({
      property_id:  u.property_id ?? "",
      unit_number:  u.unit_number ?? "",
      bedrooms:     u.bedrooms != null ? String(u.bedrooms) : "",
      bathrooms:    u.bathrooms != null ? String(u.bathrooms) : "",
      square_feet:  u.square_feet != null ? String(u.square_feet) : "",
      rent_amount:  u.rent_amount != null ? String(u.rent_amount) : "",
      is_occupied:  u.is_occupied ?? false,
      notes:        u.notes ?? "",
    });
    setFormError("");
    setShowModal(true);
  }

  function closeModal() { setShowModal(false); setEditingUnit(null); }

  // ─── Save ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.property_id) { setFormError(lang === "fr" ? "Sélectionnez une propriété." : "Select a property."); return; }
    if (!form.unit_number.trim()) { setFormError(lang === "fr" ? "Le numéro d'unité est requis." : "Unit number is required."); return; }
    setSaving(true); setFormError("");
    const payload: Partial<Unit> = {
      property_id:  form.property_id,
      unit_number:  form.unit_number.trim(),
      bedrooms:     form.bedrooms !== "" ? Number(form.bedrooms) : undefined,
      bathrooms:    form.bathrooms !== "" ? Number(form.bathrooms) : undefined,
      square_feet:  form.square_feet !== "" ? Number(form.square_feet) : undefined,
      rent_amount:  form.rent_amount !== "" ? Number(form.rent_amount) : undefined,
      is_occupied:  form.is_occupied,
      notes:        form.notes || undefined,
    };
    try {
      if (editingUnit) {
        const uid = editingUnit.id ?? (editingUnit as any)._id;
        const updated = await api.updateUnit(uid, payload);
        setUnits(prev => prev.map(u => (u.id ?? (u as any)._id) === uid ? (updated as Unit) : u));
        showToast(lang === "fr" ? "Unité mise à jour" : "Unit updated", "success");
      } else {
        const created = await api.createUnit(payload as Parameters<typeof api.createUnit>[0]);
        setUnits(prev => [...prev, created as Unit]);
        showToast(lang === "fr" ? "Unité ajoutée" : "Unit added", "success");
      }
      closeModal();
    } catch (e: any) {
      setFormError(e?.message ?? (lang === "fr" ? "Erreur serveur" : "Server error"));
    } finally {
      setSaving(false);
    }
  }

  // ─── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const uid = deleteTarget.id ?? (deleteTarget as any)._id;
    try {
      await api.deleteUnit(uid);
      setUnits(prev => prev.filter(u => (u.id ?? (u as any)._id) !== uid));
      showToast(lang === "fr" ? "Unité supprimée" : "Unit deleted", "success");
      setDeleteTarget(null);
    } catch (e: any) {
      showToast(e?.message ?? "Error", "error");
    } finally {
      setDeleting(false);
    }
  }

  // ─── Filtered list ──────────────────────────────────────────────────────────
  const displayed = filterProp
    ? units.filter(u => u.property_id === filterProp)
    : units;

  // ─── Stats ──────────────────────────────────────────────────────────────────
  const occupiedCount = displayed.filter(u => u.is_occupied).length;
  const vacantCount   = displayed.length - occupiedCount;
  const totalRent     = displayed.reduce((s, u) => s + (u.rent_amount ?? 0), 0);

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <PageHeader
        title={t(T.title)}
        subtitle={t(T.sub)}
        actions={
          <button
            onClick={openAdd}
            className="px-4 py-2.5 text-[13px] font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-colors"
          >
            + {t(T.add)}
          </button>
        }
      />

      {/* Summary pills */}
      {!loading && units.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {[
            { label: lang === "fr" ? "Total" : "Total",      value: String(displayed.length),       bg: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300" },
            { label: lang === "fr" ? "Occupées" : "Occupied", value: String(occupiedCount),          bg: "bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400" },
            { label: lang === "fr" ? "Vacantes" : "Vacant",   value: String(vacantCount),            bg: vacantCount > 0 ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500" },
            { label: lang === "fr" ? "Loyer total" : "Total rent", value: formatCurrency(totalRent), bg: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400" },
          ].map(({ label, value, bg }) => (
            <div key={label} className={`px-4 py-2 rounded-xl text-[13px] font-semibold ${bg}`}>
              {label}: {value}
            </div>
          ))}
        </div>
      )}

      {/* Filter by property */}
      {properties.length > 1 && (
        <select
          className={selectClass + " max-w-xs"}
          value={filterProp}
          onChange={e => setFilterProp(e.target.value)}
        >
          <option value="">{t(T.allProps)}</option>
          {properties.map(p => {
            const pid = p.id ?? (p as any)._id;
            return <option key={pid} value={pid}>{p.name}</option>;
          })}
        </select>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : displayed.length === 0 ? (
        filterProp ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3"><svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg></div>
            <p className="text-[14px] text-gray-400">{t(T.noMatch)}</p>
          </div>
        ) : (
          <EmptyState
            icon="home"
            title={t(T.empty)}
            description={t(T.emptySub)}
            action={{ label: `+ ${t(T.add)}`, onClick: openAdd }}
          />
        )
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid md:grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr_auto] gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
            {[t(T.unitNum), t(T.property), t(T.beds)+"/"+t(T.baths), t(T.sqft), t(T.rentMo), lang === "fr" ? "Statut" : "Status", ""].map((h, i) => (
              <span key={i} className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</span>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
            {displayed.map(u => {
              const uid = u.id ?? (u as any)._id;
              return (
                <div
                  key={uid}
                  className="px-4 py-3 flex flex-col md:grid md:grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr_auto] md:items-center gap-2 hover:bg-gray-50/60 dark:hover:bg-gray-800/20 transition-colors"
                >
                  {/* Unit # */}
                  <span className="font-semibold text-[14px] text-gray-900 dark:text-white">
                    {lang === "fr" ? "Unité" : "Unit"} {u.unit_number}
                  </span>

                  {/* Property */}
                  <span className="text-[13px] text-gray-500 dark:text-gray-400">
                    {propName(u.property_id)}
                  </span>

                  {/* Beds / Baths */}
                  <span className="text-[13px] text-gray-500">
                    {u.bedrooms ?? "—"} / {u.bathrooms ?? "—"}
                  </span>

                  {/* Sq ft */}
                  <span className="text-[13px] text-gray-500">
                    {u.square_feet ?? "—"}
                  </span>

                  {/* Rent */}
                  <span className="text-[13px] font-medium text-gray-800 dark:text-gray-200">
                    {u.rent_amount ? formatCurrency(u.rent_amount) : "—"}
                  </span>

                  {/* Status */}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold w-fit ${
                    u.is_occupied
                      ? "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  }`}>
                    {u.is_occupied ? t(T.occupied) : t(T.vacant)}
                  </span>

                  {/* Actions */}
                  <div className="flex gap-1.5 flex-wrap">
                    <Link
                      href={`/dashboard/units/${uid}/timeline`}
                      className="px-2.5 py-1 text-[11px] font-medium text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg transition-colors"
                    >
                      {t(T.timeline)}
                    </Link>
                    <button
                      onClick={() => openEdit(u)}
                      className="px-2.5 py-1 text-[11px] font-medium text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-900/40 rounded-lg transition-colors"
                    >
                      {t(T.edit)}
                    </button>
                    <button
                      onClick={() => setDeleteTarget(u)}
                      className="px-2.5 py-1 text-[11px] font-medium text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                    >
                      {t(T.delete)}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Add / Edit Modal ──────────────────────────────────────────────────── */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingUnit ? t(T.edit) : t(T.addTitle)}
      >
        <div className="space-y-4">
          {/* Property selector */}
          <FormField label={t(T.property)} required>
            <select
              className={selectClass}
              value={form.property_id}
              onChange={e => f("property_id", e.target.value)}
            >
              <option value="">{lang === "fr" ? "Choisir une propriété…" : "Choose a property…"}</option>
              {properties.map(p => {
                const pid = p.id ?? (p as any)._id;
                return <option key={pid} value={pid}>{p.name}</option>;
              })}
            </select>
          </FormField>

          <FormField label={t(T.unitNum)} required>
            <input
              className={inputClass}
              value={form.unit_number}
              onChange={e => f("unit_number", e.target.value)}
              placeholder="101"
              autoFocus
            />
          </FormField>

          <div className="grid grid-cols-3 gap-3">
            <FormField label={t(T.beds)}>
              <input className={inputClass} type="number" min={0} value={form.bedrooms} onChange={e => f("bedrooms", e.target.value)} placeholder="2" />
            </FormField>
            <FormField label={t(T.baths)}>
              <input className={inputClass} type="number" min={0} step={0.5} value={form.bathrooms} onChange={e => f("bathrooms", e.target.value)} placeholder="1" />
            </FormField>
            <FormField label={t(T.sqft)}>
              <input className={inputClass} type="number" min={0} value={form.square_feet} onChange={e => f("square_feet", e.target.value)} placeholder="750" />
            </FormField>
          </div>

          <FormField label={t(T.rentMo)}>
            <input className={inputClass} type="number" min={0} value={form.rent_amount} onChange={e => f("rent_amount", e.target.value)} placeholder="1200" />
          </FormField>

          {/* Occupied toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => f("is_occupied", !form.is_occupied)}
              className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${form.is_occupied ? "bg-teal-500" : "bg-gray-200 dark:bg-gray-700"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_occupied ? "translate-x-5" : ""}`} />
            </div>
            <span className="text-[13px] text-gray-700 dark:text-gray-300 font-medium">{t(T.occupied)}</span>
          </label>

          <FormField label={lang === "fr" ? "Notes" : "Notes"}>
            <textarea
              className={inputClass}
              rows={2}
              value={form.notes}
              onChange={e => f("notes", e.target.value)}
              placeholder={lang === "fr" ? "Observations facultatives…" : "Optional notes…"}
            />
          </FormField>

          {formError && <p className="text-[13px] text-red-500">{formError}</p>}

          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 text-[13px] font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl transition-colors"
            >
              {saving ? t(T.saving) : t(T.save)}
            </button>
            <button
              onClick={closeModal}
              className="px-5 py-2.5 text-[13px] font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              {t(T.cancel)}
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Delete confirm ───────────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={t(T.delTitle)}
        message={`${t(T.delMsg)}${deleteTarget ? ` — ${lang === "fr" ? "Unité" : "Unit"} ${deleteTarget.unit_number}` : ""}`}
        confirmLabel={t(T.delete)}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        danger
      />
    </div>
  );
}
