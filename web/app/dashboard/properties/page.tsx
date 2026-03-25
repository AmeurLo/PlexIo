"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/lib/ToastContext";
import { requireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { PROPERTY_TYPES, PROVINCES } from "@/lib/types";
import type { Property, Unit } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import PageHeader from "@/components/dashboard/PageHeader";
import Modal from "@/components/dashboard/Modal";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import EmptyState from "@/components/dashboard/EmptyState";
import FormField, { inputClass, selectClass } from "@/components/dashboard/FormField";
import StatusBadge from "@/components/dashboard/StatusBadge";
import AddressAutocomplete from "@/components/dashboard/AddressAutocomplete";

// ─── i18n ─────────────────────────────────────────────────────────────────────
const T = {
  title:         { fr: "Propriétés",              en: "Properties" },
  sub:           { fr: "Gérez vos immeubles",      en: "Manage your properties" },
  add:           { fr: "Ajouter",                  en: "Add" },
  edit:          { fr: "Modifier",                 en: "Edit" },
  delete:        { fr: "Supprimer",                en: "Delete" },
  cancel:        { fr: "Annuler",                  en: "Cancel" },
  save:          { fr: "Enregistrer",              en: "Save" },
  loading:       { fr: "Chargement…",              en: "Loading…" },
  saving:        { fr: "Enregistrement…",          en: "Saving…" },
  empty:         { fr: "Aucune propriété",          en: "No properties yet" },
  emptySub:      { fr: "Ajoutez votre premier immeuble pour commencer.", en: "Add your first property to get started." },
  delTitle:      { fr: "Supprimer la propriété ?", en: "Delete property?" },
  delMsg:        { fr: "Cette action est irréversible.", en: "This action cannot be undone." },
  name:          { fr: "Nom",                      en: "Name" },
  address:       { fr: "Adresse",                  en: "Address" },
  city:          { fr: "Ville",                    en: "City" },
  province:      { fr: "Province",                 en: "Province" },
  postalCode:    { fr: "Code postal",              en: "Postal code" },
  type:          { fr: "Type",                     en: "Type" },
  unitsLabel:    { fr: "Unités",                   en: "Units" },
  occupancy:     { fr: "Occupation",               en: "Occupancy" },
  purchasePrice: { fr: "Prix d'achat",             en: "Purchase price" },
  currentValue:  { fr: "Valeur actuelle",          en: "Current value" },
  description:   { fr: "Description",              en: "Description" },
  manageUnits:   { fr: "Unités",                   en: "Units" },
  finances:      { fr: "Finances",                 en: "Finances" },
  // Unit modal
  unitsOf:       { fr: "Unités —",                 en: "Units —" },
  addUnit:       { fr: "+ Ajouter une unité",       en: "+ Add unit" },
  unitNum:       { fr: "N° d'unité",               en: "Unit #" },
  beds:          { fr: "Ch.",                       en: "Beds" },
  baths:         { fr: "SdB",                      en: "Baths" },
  sqft:          { fr: "Pi²",                      en: "Sq ft" },
  rentMo:        { fr: "Loyer/mois",               en: "Rent/mo" },
  occupied:      { fr: "Occupée",                  en: "Occupied" },
  vacant:        { fr: "Vacante",                  en: "Vacant" },
  notes:         { fr: "Notes",                    en: "Notes" },
  noUnits:       { fr: "Aucune unité",              en: "No units yet" },
  noUnitsSub:    { fr: "Ajoutez des unités à cette propriété.", en: "Add units to this property." },
  delUnitTitle:  { fr: "Supprimer l'unité ?",       en: "Delete unit?" },
  delUnitMsg:    { fr: "Cette action est irréversible.", en: "This action cannot be undone." },
  backToList:    { fr: "← Retour",                  en: "← Back" },
  editUnit:      { fr: "Modifier l'unité",          en: "Edit unit" },
  addUnitTitle:  { fr: "Nouvelle unité",            en: "New unit" },
};

// ─── Empty forms ──────────────────────────────────────────────────────────────
const emptyPropForm = {
  name: "", address: "", city: "", province: "QC", postal_code: "",
  property_type: "apartment", total_units: 1,
  purchase_price: "", current_value: "", description: "",
};

const emptyUnitForm = {
  unit_number: "", bedrooms: "", bathrooms: "", square_feet: "",
  rent_amount: "", is_occupied: false, notes: "",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function PropertiesPage() {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();

  // Property CRUD
  const [properties, setProperties]       = useState<Property[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [showPropModal, setShowPropModal] = useState(false);
  const [editingProp, setEditingProp]     = useState<Property | null>(null);
  const [propForm, setPropForm]           = useState({ ...emptyPropForm });
  const [savingProp, setSavingProp]       = useState(false);
  const [propFormError, setPropFormError] = useState("");
  const [deletePropTarget, setDeletePropTarget] = useState<Property | null>(null);
  const [deletingProp, setDeletingProp]   = useState(false);

  // Unit management
  const [unitsProp, setUnitsProp]         = useState<Property | null>(null);
  const [units, setUnits]                 = useState<Unit[]>([]);
  const [unitsLoading, setUnitsLoading]   = useState(false);
  const [unitView, setUnitView]           = useState<"list" | "form">("list");
  const [editingUnit, setEditingUnit]     = useState<Unit | null>(null);
  const [unitForm, setUnitForm]           = useState({ ...emptyUnitForm });
  const [savingUnit, setSavingUnit]       = useState(false);
  const [unitFormError, setUnitFormError] = useState("");
  const [deleteUnitTarget, setDeleteUnitTarget] = useState<Unit | null>(null);
  const [deletingUnit, setDeletingUnit]   = useState(false);

  useEffect(() => { if (!requireAuth()) return; loadProperties(); }, []);

  // ── Property loaders ────────────────────────────────────────────────────────
  async function loadProperties() {
    setLoading(true);
    try { setProperties(await api.getProperties()); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  function openAddProp() {
    setEditingProp(null);
    setPropForm({ ...emptyPropForm });
    setPropFormError("");
    setShowPropModal(true);
  }

  function openEditProp(p: Property) {
    setEditingProp(p);
    setPropForm({
      name: p.name ?? "",
      address: p.address ?? "",
      city: p.city ?? "",
      province: p.province ?? "QC",
      postal_code: p.postal_code ?? "",
      property_type: p.property_type ?? "apartment",
      total_units: p.total_units ?? 1,
      purchase_price: p.purchase_price ? String(p.purchase_price) : "",
      current_value: p.current_value ? String(p.current_value) : "",
      description: p.description ?? "",
    });
    setPropFormError("");
    setShowPropModal(true);
  }

  async function handleSaveProp() {
    if (!propForm.name.trim()) {
      setPropFormError(lang === "fr" ? "Le nom est requis." : "Name is required.");
      return;
    }
    setSavingProp(true); setPropFormError("");
    try {
      const payload = {
        ...propForm,
        total_units: Number(propForm.total_units),
        purchase_price: propForm.purchase_price ? Number(propForm.purchase_price) : undefined,
        current_value: propForm.current_value ? Number(propForm.current_value) : undefined,
      };
      if (editingProp) await api.updateProperty(editingProp.id, payload);
      else await api.createProperty(payload);
      setShowPropModal(false);
      loadProperties();
    } catch (e: any) { setPropFormError(e.message); }
    finally { setSavingProp(false); }
  }

  async function handleDeleteProp() {
    if (!deletePropTarget) return;
    setDeletingProp(true);
    try { await api.deleteProperty(deletePropTarget.id); setDeletePropTarget(null); loadProperties(); }
    catch (e: any) { showToast(e.message, "error"); }
    finally { setDeletingProp(false); }
  }

  const fp = (k: string, v: any) => setPropForm(prev => ({ ...prev, [k]: v }));

  // ── Unit loaders ────────────────────────────────────────────────────────────
  async function openUnitsModal(p: Property) {
    setUnitsProp(p);
    setUnitView("list");
    setUnitsLoading(true);
    setUnits([]);
    try { setUnits(await api.getUnits(p.id)); }
    catch { setUnits([]); }
    finally { setUnitsLoading(false); }
  }

  function openAddUnit() {
    setEditingUnit(null);
    setUnitForm({ ...emptyUnitForm });
    setUnitFormError("");
    setUnitView("form");
  }

  function openEditUnit(u: Unit) {
    setEditingUnit(u);
    setUnitForm({
      unit_number: u.unit_number ?? "",
      bedrooms: u.bedrooms != null ? String(u.bedrooms) : "",
      bathrooms: u.bathrooms != null ? String(u.bathrooms) : "",
      square_feet: u.square_feet != null ? String(u.square_feet) : "",
      rent_amount: u.rent_amount != null ? String(u.rent_amount) : "",
      is_occupied: u.is_occupied ?? false,
      notes: u.notes ?? "",
    });
    setUnitFormError("");
    setUnitView("form");
  }

  async function handleSaveUnit() {
    if (!unitForm.unit_number.trim()) {
      setUnitFormError(lang === "fr" ? "Le numéro d'unité est requis." : "Unit number is required.");
      return;
    }
    if (!unitsProp) return;
    setSavingUnit(true); setUnitFormError("");
    try {
      const payload = {
        property_id: unitsProp.id,
        unit_number: unitForm.unit_number.trim(),
        bedrooms: unitForm.bedrooms ? Number(unitForm.bedrooms) : undefined,
        bathrooms: unitForm.bathrooms ? Number(unitForm.bathrooms) : undefined,
        square_feet: unitForm.square_feet ? Number(unitForm.square_feet) : undefined,
        rent_amount: unitForm.rent_amount ? Number(unitForm.rent_amount) : undefined,
        is_occupied: unitForm.is_occupied,
        notes: unitForm.notes || undefined,
      };
      if (editingUnit) await api.updateUnit(editingUnit.id, payload);
      else await api.createUnit(payload as any);
      setUnits(await api.getUnits(unitsProp.id));
      setUnitView("list");
    } catch (e: any) { setUnitFormError(e.message); }
    finally { setSavingUnit(false); }
  }

  async function handleDeleteUnit() {
    if (!deleteUnitTarget || !unitsProp) return;
    setDeletingUnit(true);
    try {
      await api.deleteUnit(deleteUnitTarget.id);
      setUnits(await api.getUnits(unitsProp.id));
      setDeleteUnitTarget(null);
    } catch (e: any) { showToast(e.message, "error"); }
    finally { setDeletingUnit(false); }
  }

  const fu = (k: string, v: any) => setUnitForm(prev => ({ ...prev, [k]: v }));

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-6xl space-y-6">
      <PageHeader
        title={t(T.title)}
        subtitle={t(T.sub)}
        actions={[{ label: `+ ${t(T.add)}`, onClick: openAddProp, primary: true }]}
      />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-[13px] text-red-600">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : properties.length === 0 ? (
        <EmptyState icon="home" title={t(T.empty)} description={t(T.emptySub)} actionLabel={`+ ${t(T.add)}`} onAction={openAddProp} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {properties.map(p => {
            const occupancy = p.total_units ? Math.round(((p.occupied_units ?? 0) / p.total_units) * 100) : 0;
            const id = p.id ?? (p as any)._id;
            return (
              <div key={id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-1.5 bg-gradient-to-r from-teal-500 to-teal-400" />
                <div className="p-5">

                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-[15px] truncate">{p.name}</h3>
                      <p className="text-[12px] text-gray-400 truncate">{p.address}{p.city ? `, ${p.city}` : ""}</p>
                    </div>
                    <StatusBadge status={p.status ?? "active"} lang={lang} />
                  </div>

                  {/* Stats row */}
                  <div className="flex gap-4 text-[13px] text-gray-500 dark:text-gray-400 mb-3">
                    <span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{p.total_units ?? 0}</span>
                      {" "}{t(T.unitsLabel).toLowerCase()}
                    </span>
                    <span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{occupancy}%</span>
                      {" "}{t(T.occupancy).toLowerCase()}
                    </span>
                  </div>

                  {/* Occupancy bar */}
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-4">
                    <div
                      className={`h-full rounded-full transition-all ${occupancy >= 90 ? "bg-teal-500" : occupancy >= 60 ? "bg-amber-400" : "bg-red-400"}`}
                      style={{ width: `${occupancy}%` }}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => openUnitsModal(p)}
                      className="flex-1 py-1.5 text-[12px] font-medium text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg transition-colors"
                    >
                      {t(T.manageUnits)} ({p.total_units ?? 0})
                    </button>
                    <Link
                      href={`/dashboard/properties/${p.id ?? (p as any)._id}/financials`}
                      className="px-3 py-1.5 text-[12px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg transition-colors"
                    >
                      {t(T.finances)}
                    </Link>
                    <button
                      onClick={() => openEditProp(p)}
                      className="px-3 py-1.5 text-[12px] font-medium text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-900/40 rounded-lg transition-colors"
                    >
                      {t(T.edit)}
                    </button>
                    <button
                      onClick={() => setDeletePropTarget(p)}
                      className="px-3 py-1.5 text-[12px] font-medium text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                    >
                      {t(T.delete)}
                    </button>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Property add / edit modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={showPropModal}
        onClose={() => setShowPropModal(false)}
        title={editingProp ? t(T.edit) : `${t(T.add)} — ${t(T.title)}`}
        footer={
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowPropModal(false)}
              className="px-4 py-2 text-[13px] rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {t(T.cancel)}
            </button>
            <button
              onClick={handleSaveProp}
              disabled={savingProp}
              className="px-5 py-2 text-[13px] font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl transition-colors"
            >
              {savingProp ? t(T.saving) : t(T.save)}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {propFormError && <p className="text-[13px] text-red-500">{propFormError}</p>}
          <FormField label={t(T.name)} required>
            <input className={inputClass} value={propForm.name} onChange={e => fp("name", e.target.value)} placeholder="Ex: Immeuble Laurier" />
          </FormField>
          <FormField label={t(T.type)}>
            <select className={selectClass} value={propForm.property_type} onChange={e => fp("property_type", e.target.value)}>
              {PROPERTY_TYPES.map(pt => <option key={pt.value} value={pt.value}>{lang === "fr" ? pt.fr : pt.en}</option>)}
            </select>
          </FormField>
          <FormField label={t(T.address)}>
            <AddressAutocomplete
              value={propForm.address}
              placeholder={lang === "fr" ? "45 rue Chevalier, Montréal…" : "45 Chevalier St, Montreal…"}
              onChange={(address, city, province, postal_code) => {
                setPropForm(prev => ({
                  ...prev,
                  address,
                  ...(city        ? { city }        : {}),
                  ...(province    ? { province }    : {}),
                  ...(postal_code ? { postal_code } : {}),
                }));
              }}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t(T.city)}>
              <input className={inputClass} value={propForm.city} onChange={e => fp("city", e.target.value)} placeholder="Montréal" />
            </FormField>
            <FormField label={t(T.province)}>
              <select className={selectClass} value={propForm.province} onChange={e => fp("province", e.target.value)}>
                {PROVINCES.map(pv => <option key={pv.value} value={pv.value}>{pv.value}</option>)}
              </select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t(T.postalCode)}>
              <input className={inputClass} value={propForm.postal_code} onChange={e => fp("postal_code", e.target.value)} placeholder="H2X 1Y2" />
            </FormField>
            <FormField label={t(T.unitsLabel)}>
              <input className={inputClass} type="number" min={1} value={propForm.total_units} onChange={e => fp("total_units", e.target.value)} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={`${t(T.purchasePrice)} ($)`}>
              <input className={inputClass} type="number" value={propForm.purchase_price} onChange={e => fp("purchase_price", e.target.value)} placeholder="0" />
            </FormField>
            <FormField label={`${t(T.currentValue)} ($)`}>
              <input className={inputClass} type="number" value={propForm.current_value} onChange={e => fp("current_value", e.target.value)} placeholder="0" />
            </FormField>
          </div>
          <FormField label={t(T.description)}>
            <textarea className={inputClass + " resize-none"} rows={3} value={propForm.description} onChange={e => fp("description", e.target.value)} />
          </FormField>
        </div>
      </Modal>

      {/* ── Units modal ───────────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!unitsProp}
        onClose={() => { setUnitsProp(null); setUnitView("list"); setDeleteUnitTarget(null); }}
        title={unitsProp ? `${t(T.unitsOf)} ${unitsProp.name}` : ""}
        maxWidth="max-w-2xl"
        footer={
          unitView === "form" ? (
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setUnitView("list"); setEditingUnit(null); }}
                className="px-4 py-2 text-[13px] rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {t(T.cancel)}
              </button>
              <button
                onClick={handleSaveUnit}
                disabled={savingUnit}
                className="px-5 py-2 text-[13px] font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl transition-colors"
              >
                {savingUnit ? t(T.saving) : t(T.save)}
              </button>
            </div>
          ) : (
            <button
              onClick={openAddUnit}
              className="w-full py-2 text-[13px] font-semibold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-900/40 rounded-xl transition-colors"
            >
              {t(T.addUnit)}
            </button>
          )
        }
      >
        {/* LIST VIEW */}
        {unitView === "list" && (
          <div>
            {unitsLoading ? (
              <div className="flex justify-center py-10">
                <div className="w-7 h-7 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : units.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-[14px] font-medium text-gray-700 dark:text-gray-300">{t(T.noUnits)}</p>
                <p className="text-[13px] text-gray-400 mt-1">{t(T.noUnitsSub)}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Desktop table header */}
                <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  <span>{t(T.unitNum)}</span>
                  <span>{t(T.beds)} / {t(T.baths)}</span>
                  <span>{t(T.rentMo)}</span>
                  <span>{lang === "fr" ? "Statut" : "Status"}</span>
                  <span />
                </div>

                {units.map(u => {
                  const uid = u.id ?? (u as any)._id;
                  return (
                    <div
                      key={uid}
                      className="bg-gray-50 dark:bg-gray-800/50 rounded-xl px-3 py-3 flex flex-col sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-center gap-2"
                    >
                      {/* Unit # */}
                      <div>
                        <span className="font-semibold text-[14px] text-gray-900 dark:text-white">
                          {lang === "fr" ? "Unité" : "Unit"} {u.unit_number}
                        </span>
                        {u.square_feet && (
                          <span className="ml-2 text-[12px] text-gray-400">{u.square_feet} {t(T.sqft)}</span>
                        )}
                      </div>

                      {/* Beds / Baths */}
                      <span className="text-[13px] text-gray-500 dark:text-gray-400">
                        {u.bedrooms != null ? u.bedrooms : "—"} / {u.bathrooms != null ? u.bathrooms : "—"}
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
                      <div className="flex gap-1.5 sm:justify-end flex-wrap">
                        <Link
                          href={`/dashboard/units/${uid}/timeline`}
                          className="px-3 py-1 text-[12px] font-medium text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg transition-colors"
                        >
                          {lang === "fr" ? "Historique" : "Timeline"}
                        </Link>
                        <button
                          onClick={() => openEditUnit(u)}
                          className="px-3 py-1 text-[12px] font-medium text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-900/40 rounded-lg transition-colors"
                        >
                          {t(T.edit)}
                        </button>
                        <button
                          onClick={() => setDeleteUnitTarget(u)}
                          className="px-3 py-1 text-[12px] font-medium text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                        >
                          {t(T.delete)}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* FORM VIEW */}
        {unitView === "form" && (
          <div className="space-y-4">
            <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">
              {editingUnit ? t(T.editUnit) : t(T.addUnitTitle)}
            </p>
            {unitFormError && <p className="text-[13px] text-red-500">{unitFormError}</p>}
            <FormField label={t(T.unitNum)} required>
              <input
                className={inputClass}
                value={unitForm.unit_number}
                onChange={e => fu("unit_number", e.target.value)}
                placeholder="101"
                autoFocus
              />
            </FormField>
            <div className="grid grid-cols-3 gap-3">
              <FormField label={t(T.beds)}>
                <input className={inputClass} type="number" min={0} value={unitForm.bedrooms} onChange={e => fu("bedrooms", e.target.value)} placeholder="2" />
              </FormField>
              <FormField label={t(T.baths)}>
                <input className={inputClass} type="number" min={0} step={0.5} value={unitForm.bathrooms} onChange={e => fu("bathrooms", e.target.value)} placeholder="1" />
              </FormField>
              <FormField label={t(T.sqft)}>
                <input className={inputClass} type="number" min={0} value={unitForm.square_feet} onChange={e => fu("square_feet", e.target.value)} placeholder="750" />
              </FormField>
            </div>
            <FormField label={`${t(T.rentMo)} ($)`}>
              <input className={inputClass} type="number" min={0} value={unitForm.rent_amount} onChange={e => fu("rent_amount", e.target.value)} placeholder="1200" />
            </FormField>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => fu("is_occupied", !unitForm.is_occupied)}
                className={`relative w-10 h-6 rounded-full transition-colors ${unitForm.is_occupied ? "bg-teal-500" : "bg-gray-200 dark:bg-gray-700"}`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${unitForm.is_occupied ? "translate-x-4" : ""}`} />
              </div>
              <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300">
                {t(T.occupied)}
              </span>
            </label>
            <FormField label={t(T.notes)}>
              <textarea className={inputClass + " resize-none"} rows={2} value={unitForm.notes} onChange={e => fu("notes", e.target.value)} />
            </FormField>
          </div>
        )}
      </Modal>

      {/* ── Delete property confirm ────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!deletePropTarget}
        title={t(T.delTitle)}
        message={`${deletePropTarget?.name} — ${t(T.delMsg)}`}
        confirmLabel={t(T.delete)}
        onConfirm={handleDeleteProp}
        onCancel={() => setDeletePropTarget(null)}
        loading={deletingProp}
        danger
      />

      {/* ── Delete unit confirm ────────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!deleteUnitTarget}
        title={t(T.delUnitTitle)}
        message={`${lang === "fr" ? "Unité" : "Unit"} ${deleteUnitTarget?.unit_number} — ${t(T.delUnitMsg)}`}
        confirmLabel={t(T.delete)}
        onConfirm={handleDeleteUnit}
        onCancel={() => setDeleteUnitTarget(null)}
        loading={deletingUnit}
        danger
      />
    </div>
  );
}
