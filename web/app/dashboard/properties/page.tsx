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
  emptySub:      { fr: "Ajoutez vos immeubles, créez les logements et suivez le taux d'occupation en temps réel.", en: "Add your buildings, create units, and track occupancy rate in real time." },
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
  emailBtn:      { fr: "Email locataires",          en: "Email tenants" },
  documentsBtn:  { fr: "Documents",                 en: "Documents" },
  publish:       { fr: "Publier",                   en: "Publish" },
  unpublish:     { fr: "Dépublier",                 en: "Unpublish" },
  copyLink:      { fr: "Copier le lien",            en: "Copy link" },
  linkCopied:    { fr: "Lien copié !",              en: "Link copied!" },
  // Bulk email modal
  emailTitle:    { fr: "Envoyer un email aux locataires", en: "Email tenants" },
  emailSubject:  { fr: "Objet",                     en: "Subject" },
  emailBody:     { fr: "Message",                   en: "Message" },
  emailVars:     { fr: "Variables :",               en: "Variables:" },
  emailSend:     { fr: "Envoyer",                   en: "Send" },
  emailSending:  { fr: "Envoi…",                    en: "Sending…" },
  emailPreview:  { fr: "Aperçu",                    en: "Preview" },
  emailWrite:    { fr: "Éditer",                    en: "Write" },
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
  late_fee_amount: "", late_fee_grace_days: "",
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

  // Bulk email
  const [togglingId, setTogglingId]       = useState<string | null>(null);

  const handleToggleListing = async (p: Property) => {
    const pid = p.id ?? (p as any)._id;
    setTogglingId(pid);
    try {
      const updated = await api.togglePropertyListing(pid);
      setProperties(prev => prev.map(x => (x.id ?? (x as any)._id) === pid ? { ...x, listed: updated.listed } : x));
      if (updated.listed) {
        const url = `${window.location.origin}/listing/${pid}`;
        await navigator.clipboard.writeText(url).catch(() => {});
        showToast(t(T.linkCopied), "success");
      }
    } catch { showToast("Erreur", "error"); }
    finally { setTogglingId(null); }
  };

  const handleCopyLink = async (pid: string) => {
    const url = `${window.location.origin}/listing/${pid}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    showToast(t(T.linkCopied), "success");
  };

  const [emailProp, setEmailProp]         = useState<Property | null>(null);
  const [emailSubject, setEmailSubject]   = useState("");
  const [emailBody, setEmailBody]         = useState("");
  const [emailSending, setEmailSending]   = useState(false);
  const [emailResult, setEmailResult]     = useState<{ sent: number; skipped: number } | null>(null);
  const [emailPreview, setEmailPreview]   = useState(false);

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
      late_fee_amount: (p as any).late_fee_amount != null ? String((p as any).late_fee_amount) : "",
      late_fee_grace_days: (p as any).late_fee_grace_days != null ? String((p as any).late_fee_grace_days) : "",
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
        late_fee_amount: propForm.late_fee_amount !== "" ? Number(propForm.late_fee_amount) : undefined,
        late_fee_grace_days: propForm.late_fee_grace_days !== "" ? Number(propForm.late_fee_grace_days) : undefined,
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

  // ── Bulk email ───────────────────────────────────────────────────────────────
  function openEmailModal(p: Property) {
    setEmailProp(p);
    setEmailSubject("");
    setEmailBody("");
    setEmailResult(null);
    setEmailPreview(false);
  }

  async function handleSendEmail() {
    if (!emailProp || !emailSubject.trim() || !emailBody.trim()) return;
    setEmailSending(true);
    try {
      const res = await api.emailTenants(emailProp.id, emailSubject.trim(), emailBody.trim());
      setEmailResult({ sent: res.sent, skipped: res.skipped });
      showToast(
        `${res.sent} ${lang === "fr" ? "email(s) envoyé(s)" : "email(s) sent"}`,
        "success"
      );
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setEmailSending(false);
    }
  }

  /** Replace {{vars}} with placeholder example values for preview */
  function previewText(s: string) {
    return s
      .replace(/\{\{prenom\}\}/g, "Marie")
      .replace(/\{\{nom\}\}/g, "Tremblay")
      .replace(/\{\{montant_loyer\}\}/g, "$1 200,00")
      .replace(/\{\{adresse\}\}/g, emailProp?.address ?? "123 Rue Principale")
      .replace(/\{\{date_debut_bail\}\}/g, "2025-09-01")
      .replace(/\{\{date_fin_bail\}\}/g, "2026-08-31");
  }

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
        <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-4">
          <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m-12.728 0a9 9 0 010-12.728M12 8v4m0 4h.01" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">{lang === "fr" ? "Connexion impossible" : "Cannot connect"}</p>
            <p className="text-[12px] text-gray-400 dark:text-gray-500">{lang === "fr" ? "Vérifiez votre connexion et réessayez." : "Check your connection and try again."}</p>
          </div>
          <button onClick={() => { setError(""); loadProperties(); }} className="px-3 py-1.5 text-[12px] font-semibold rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0">
            {lang === "fr" ? "Réessayer" : "Retry"}
          </button>
        </div>
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
                {/* Property photo placeholder — monochrome */}
                <div className="h-28 bg-gray-100 dark:bg-gray-800 flex items-center justify-center relative overflow-hidden">
                  <svg className="w-16 h-16 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <div className="absolute top-2 right-2">
                    <StatusBadge status={p.status ?? "active"} lang={lang} />
                  </div>
                </div>
                <div className="p-5">

                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-[15px] truncate">{p.name}</h3>
                      <p className="text-[12px] text-gray-400 truncate">{p.address}{p.city ? `, ${p.city}` : ""}</p>
                    </div>
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
                      onClick={() => openEmailModal(p)}
                      className="px-3 py-1.5 text-[12px] font-medium text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/40 rounded-lg transition-colors"
                    >
                      {t(T.emailBtn)}
                    </button>
                    {/* Publish / Copy link */}
                    <button
                      onClick={() => handleToggleListing(p)}
                      disabled={togglingId === (p.id ?? (p as any)._id)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium rounded-lg transition-colors ${(p as any).listed ? "text-amber-700 bg-amber-50 hover:bg-amber-100" : "text-teal-700 bg-teal-50 hover:bg-teal-100"}`}
                    >
                      {(p as any).listed ? (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                      {(p as any).listed ? t(T.unpublish) : t(T.publish)}
                    </button>
                    {(p as any).listed && (
                      <button
                        onClick={() => handleCopyLink(p.id ?? (p as any)._id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        {t(T.copyLink)}
                      </button>
                    )}
                    <Link
                      href={`/dashboard/properties/${p.id ?? (p as any)._id}/documents`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-teal-600 dark:hover:text-teal-400 rounded-lg transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {t(T.documentsBtn)}
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
            <input className={inputClass} value={propForm.name} onChange={e => fp("name", e.target.value)} placeholder={lang === "fr" ? "Rempli automatiquement depuis l'adresse" : "Auto-filled from address"} />
          </FormField>
          <FormField label={t(T.type)}>
            <select className={selectClass} value={propForm.property_type} onChange={e => fp("property_type", e.target.value)}>
              {PROPERTY_TYPES.map(pt => <option key={pt.value} value={pt.value}>{lang === "fr" ? pt.fr : pt.en}</option>)}
            </select>
          </FormField>
          <FormField label={t(T.address)}>
            <AddressAutocomplete
              value={propForm.address}
              placeholder={lang === "fr" ? "123 Rue Principale, Montréal…" : "123 Main St, Montreal…"}
              onChange={(address, city, province, postal_code) => {
                setPropForm(prev => ({
                  ...prev,
                  address,
                  // Auto-fill name from address if the user hasn't typed a custom name yet
                  name: prev.name === "" || prev.name === prev.address ? address : prev.name,
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
          <div className="grid grid-cols-2 gap-3">
            <FormField label={lang === "fr" ? "Frais de retard ($)" : "Late fee ($)"}>
              <input
                className={inputClass}
                type="number"
                min={0}
                step={0.01}
                value={propForm.late_fee_amount}
                onChange={e => fp("late_fee_amount", e.target.value)}
                placeholder="25"
              />
            </FormField>
            <FormField label={lang === "fr" ? "Délai de grâce (jours)" : "Grace period (days)"}>
              <input
                className={inputClass}
                type="number"
                min={0}
                value={propForm.late_fee_grace_days}
                onChange={e => fp("late_fee_grace_days", e.target.value)}
                placeholder="5"
              />
            </FormField>
          </div>
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

      {/* ── Bulk email modal ──────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!emailProp}
        onClose={() => { setEmailProp(null); setEmailResult(null); }}
        title={t(T.emailTitle)}
        footer={
          emailResult ? (
            <div className="flex justify-end">
              <button
                onClick={() => { setEmailProp(null); setEmailResult(null); }}
                className="px-5 py-2 text-[13px] font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-colors"
              >
                {lang === "fr" ? "Fermer" : "Close"}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setEmailPreview(v => !v)}
                className="px-4 py-2 text-[13px] rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {emailPreview ? t(T.emailWrite) : t(T.emailPreview)}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setEmailProp(null)}
                  className="px-4 py-2 text-[13px] rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {t(T.cancel)}
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={emailSending || !emailSubject.trim() || !emailBody.trim()}
                  className="px-5 py-2 text-[13px] font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl transition-colors flex items-center gap-2"
                >
                  {emailSending && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {emailSending ? t(T.emailSending) : t(T.emailSend)}
                </button>
              </div>
            </div>
          )
        }
      >
        {emailResult ? (
          /* Success state */
          <div className="py-6 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
              <svg className="w-7 h-7 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-[17px] font-bold text-gray-900 dark:text-white">
                {emailResult.sent} {t(T.emailSend).toLowerCase()}s {lang === "fr" ? "envoyés" : "sent"}
              </p>
              {emailResult.skipped > 0 && (
                <p className="text-[13px] text-gray-400 mt-1">
                  {emailResult.skipped} {lang === "fr" ? "sans adresse courriel" : "without email address"}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Property badge */}
            <div className="flex items-center gap-2 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/40 rounded-xl px-3 py-2">
              <svg className="w-4 h-4 text-violet-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-[13px] text-violet-700 dark:text-violet-400 font-medium">{emailProp?.name}</span>
              <span className="text-[12px] text-violet-500 ml-auto">{emailProp?.address}</span>
            </div>

            {/* Merge variables palette */}
            <div>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-2">{t(T.emailVars)}</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { var: "{{prenom}}", label: lang === "fr" ? "Prénom" : "First name" },
                  { var: "{{nom}}", label: lang === "fr" ? "Nom" : "Last name" },
                  { var: "{{montant_loyer}}", label: lang === "fr" ? "Loyer" : "Rent" },
                  { var: "{{adresse}}", label: lang === "fr" ? "Adresse" : "Address" },
                  { var: "{{date_debut_bail}}", label: lang === "fr" ? "Début bail" : "Lease start" },
                  { var: "{{date_fin_bail}}", label: lang === "fr" ? "Fin bail" : "Lease end" },
                ].map(v => (
                  <button
                    key={v.var}
                    type="button"
                    onClick={() => setEmailBody(prev => prev + v.var)}
                    className="px-2 py-1 text-[11px] font-mono font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-700 dark:hover:text-violet-400 rounded-md transition-colors border border-gray-200 dark:border-gray-700"
                    title={v.label}
                  >
                    {v.var}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <FormField label={t(T.emailSubject)} required>
              <input
                className={inputClass}
                value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)}
                placeholder={lang === "fr" ? "Rappel de loyer — {{prenom}}" : "Rent reminder — {{prenom}}"}
              />
            </FormField>

            {/* Body: edit or preview */}
            <FormField label={t(T.emailBody)} required>
              {emailPreview ? (
                <div className="w-full min-h-[140px] px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[13px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {previewText(emailBody) || <span className="text-gray-400 italic">{lang === "fr" ? "Aperçu vide" : "Empty preview"}</span>}
                  <p className="mt-4 text-[11px] text-gray-400 italic border-t border-gray-200 dark:border-gray-700 pt-3">
                    {lang === "fr" ? "Exemple avec : Marie Tremblay" : "Example with: Marie Tremblay"}
                  </p>
                </div>
              ) : (
                <textarea
                  className={inputClass + " min-h-[140px] resize-y"}
                  value={emailBody}
                  onChange={e => setEmailBody(e.target.value)}
                  placeholder={
                    lang === "fr"
                      ? "Bonjour {{prenom}},\n\nVotre loyer de {{montant_loyer}} est dû prochainement.\n\nMerci,"
                      : "Hello {{prenom}},\n\nYour rent of {{montant_loyer}} is due soon.\n\nThank you,"
                  }
                />
              )}
            </FormField>
          </div>
        )}
      </Modal>
    </div>
  );
}
