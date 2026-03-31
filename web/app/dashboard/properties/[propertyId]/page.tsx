"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/lib/ToastContext";
import { requireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { PropertyWithStats, Unit } from "@/lib/types";
import PageHeader from "@/components/dashboard/PageHeader";
import StatCard from "@/components/dashboard/StatCard";

// ─── i18n ─────────────────────────────────────────────────────────────────────
const T = {
  back:          { fr: "← Propriétés",            en: "← Properties" },
  loading:       { fr: "Chargement…",             en: "Loading…" },
  notFound:      { fr: "Propriété introuvable.",   en: "Property not found." },
  overview:      { fr: "Aperçu",                  en: "Overview" },
  units:         { fr: "Unités",                  en: "Units" },
  assets:        { fr: "Actifs",                  en: "Assets" },
  audit:         { fr: "Audit",                   en: "Audit" },
  unit:          { fr: "Unité",                   en: "Unit" },
  finances:      { fr: "Finances →",              en: "Finances →" },
  manageUnits:   { fr: "Gérer les unités →",      en: "Manage units →" },
  address:       { fr: "Adresse",                 en: "Address" },
  type:          { fr: "Type",                    en: "Type" },
  totalUnits:    { fr: "Unités totales",           en: "Total units" },
  occupied:      { fr: "Occupées",                en: "Occupied" },
  vacant:        { fr: "Vacantes",                en: "Vacant" },
  purchasePrice: { fr: "Prix d'achat",            en: "Purchase price" },
  currentValue:  { fr: "Valeur actuelle",         en: "Current value" },
  description:   { fr: "Description",             en: "Description" },
  beds:          { fr: "Ch.",                     en: "Beds" },
  baths:         { fr: "SdB",                     en: "Baths" },
  sqft:          { fr: "Pi²",                     en: "Sq ft" },
  rentMo:        { fr: "Loyer/mois",              en: "Rent/mo" },
  timeline:      { fr: "Historique",              en: "Timeline" },
  noUnits:       { fr: "Aucune unité",            en: "No units yet" },
  noUnitsSub:    { fr: "Ajoutez des unités depuis la page Propriétés.", en: "Add units from the Properties page." },
  // Assets
  addAsset:      { fr: "Ajouter un actif",        en: "Add asset" },
  assetName:     { fr: "Nom",                     en: "Name" },
  assetType:     { fr: "Type",                    en: "Type" },
  assetId:       { fr: "Identifiant",             en: "Identifier" },
  assetUnit:     { fr: "Unité assignée",          en: "Assigned unit" },
  assetNotes:    { fr: "Notes",                   en: "Notes" },
  noAssets:      { fr: "Aucun actif enregistré",  en: "No assets recorded" },
  noAssetsSub:   { fr: "Ajoutez stationnements, rangements, équipements…", en: "Add parking, storage, equipment…" },
  save:          { fr: "Enregistrer",             en: "Save" },
  cancel:        { fr: "Annuler",                 en: "Cancel" },
  delete:        { fr: "Supprimer",               en: "Delete" },
  edit:          { fr: "Modifier",                en: "Edit" },
  // Audit
  noAudit:       { fr: "Aucune activité enregistrée", en: "No activity recorded yet" },
};

const ASSET_TYPES = [
  { value: "parking",   fr: "Stationnement", en: "Parking" },
  { value: "storage",   fr: "Rangement",     en: "Storage" },
  { value: "equipment", fr: "Équipement",    en: "Equipment" },
  { value: "other",     fr: "Autre",         en: "Other" },
];

const AUDIT_ICONS: Record<string, string> = {
  created: "M12 4.5v15m7.5-7.5h-15",
  updated: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z",
  deleted: "M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0",
};
const AUDIT_COLORS: Record<string, string> = {
  created: "bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400",
  updated: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
  deleted: "bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400",
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  try { return new Date(dateStr).toLocaleDateString("fr-CA"); } catch { return dateStr.slice(0, 10); }
}
function formatDateTime(dateStr?: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString("fr-CA", { dateStyle: "short", timeStyle: "short" });
  } catch { return dateStr.slice(0, 16).replace("T", " "); }
}

type Tab = "overview" | "units" | "assets" | "audit";
type Asset = { id: string; name: string; asset_type: string; identifier?: string; unit_id?: string; notes?: string; created_at: string };
type AuditEntry = { id: string; entity_type: string; entity_id: string; action: string; entity_label?: string; created_at: string };

const cardClass = "bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)]";

export default function PropertyDetailPage() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const router = useRouter();
  const { lang, t } = useLanguage();
  const { showToast } = useToast();

  const [tab, setTab] = useState<Tab>("overview");
  const [property, setProperty] = useState<PropertyWithStats | null>(null);
  const [units, setUnits]       = useState<Unit[]>([]);
  const [loading, setLoading]   = useState(true);

  // Assets state
  const [assets, setAssets]       = useState<Asset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset]     = useState<Asset | null>(null);
  const [assetForm, setAssetForm] = useState({ name: "", asset_type: "parking", identifier: "", unit_id: "", notes: "" });
  const [savingAsset, setSavingAsset] = useState(false);

  // Audit state
  const [auditLog, setAuditLog]   = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    if (!requireAuth()) return;
    Promise.all([
      api.getProperty(propertyId),
      api.getUnits(propertyId),
    ])
      .then(([prop, us]) => {
        setProperty(prop as PropertyWithStats);
        setUnits(us as Unit[]);
      })
      .catch(e => showToast(e instanceof Error ? e.message : String(e), "error"))
      .finally(() => setLoading(false));
  }, [propertyId]);

  useEffect(() => {
    if (tab === "assets" && assets.length === 0 && !assetsLoading) loadAssets();
    if (tab === "audit" && auditLog.length === 0 && !auditLoading) loadAudit();
  }, [tab]);

  async function loadAssets() {
    setAssetsLoading(true);
    try { setAssets(await api.getAssets(propertyId)); }
    catch (e: any) { showToast(e.message, "error"); }
    finally { setAssetsLoading(false); }
  }

  async function loadAudit() {
    setAuditLoading(true);
    try { setAuditLog(await api.getPropertyAudit(propertyId)); }
    catch (e: any) { showToast(e.message, "error"); }
    finally { setAuditLoading(false); }
  }

  function openAddAsset() {
    setEditingAsset(null);
    setAssetForm({ name: "", asset_type: "parking", identifier: "", unit_id: "", notes: "" });
    setShowAssetModal(true);
  }
  function openEditAsset(a: Asset) {
    setEditingAsset(a);
    setAssetForm({ name: a.name, asset_type: a.asset_type, identifier: a.identifier ?? "", unit_id: a.unit_id ?? "", notes: a.notes ?? "" });
    setShowAssetModal(true);
  }

  async function saveAsset() {
    if (!assetForm.name.trim()) return;
    setSavingAsset(true);
    try {
      const data = { name: assetForm.name, asset_type: assetForm.asset_type, identifier: assetForm.identifier || undefined, unit_id: assetForm.unit_id || undefined, notes: assetForm.notes || undefined };
      if (editingAsset) {
        const updated = await api.updateAsset(propertyId, editingAsset.id, data);
        setAssets(prev => prev.map(a => a.id === editingAsset.id ? updated : a));
      } else {
        const created = await api.createAsset(propertyId, data);
        setAssets(prev => [...prev, created]);
      }
      setShowAssetModal(false);
    } catch (e: any) { showToast(e.message, "error"); }
    finally { setSavingAsset(false); }
  }

  async function deleteAsset(a: Asset) {
    if (!confirm(lang === "fr" ? `Supprimer "${a.name}" ?` : `Delete "${a.name}"?`)) return;
    try {
      await api.deleteAsset(propertyId, a.id);
      setAssets(prev => prev.filter(x => x.id !== a.id));
    } catch (e: any) { showToast(e.message, "error"); }
  }

  if (loading) return (
    <div className="p-6 flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!property) return (
    <div className="p-6">
      <button onClick={() => router.back()} className="text-[13px] text-gray-500 hover:text-teal-600 font-medium mb-4 block">{t(T.back)}</button>
      <p className="text-gray-400">{t(T.notFound)}</p>
    </div>
  );

  const occupiedCount = units.filter(u => u.is_occupied).length;
  const vacantCount   = units.length - occupiedCount;
  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: t(T.overview) },
    { id: "units",    label: `${t(T.units)} (${units.length})` },
    { id: "assets",   label: t(T.assets) },
    { id: "audit",    label: t(T.audit) },
  ];

  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Back + header */}
      <button onClick={() => router.back()} className="text-[13px] text-gray-500 hover:text-teal-600 transition-colors font-medium">
        {t(T.back)}
      </button>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader title={property.name} subtitle={property.address ?? ""} />
        <div className="flex gap-2 flex-wrap">
          <Link href={`/dashboard/properties/${propertyId}/financials`}
            className="px-4 py-2 text-[13px] font-semibold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-900/40 rounded-xl transition-colors">
            {t(T.finances)}
          </Link>
          <Link href="/dashboard/properties"
            className="px-4 py-2 text-[13px] font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors">
            {t(T.manageUnits)}
          </Link>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon="home" label={t(T.totalUnits)} value={String(property.total_units ?? units.length ?? 0)} />
        <StatCard icon="users" label={t(T.occupied)} value={String(occupiedCount)} iconBg="bg-teal-50 dark:bg-teal-900/30" iconColor="text-teal-600 dark:text-teal-400" />
        <StatCard icon="dollar" label={t(T.vacant)} value={String(vacantCount)}
          iconBg={vacantCount > 0 ? "bg-amber-50 dark:bg-amber-900/20" : "bg-teal-50 dark:bg-teal-900/30"}
          iconColor={vacantCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-teal-600 dark:text-teal-400"} />
        <StatCard icon="credit-card" label={lang === "fr" ? "Loyers attendus" : "Expected rent"}
          value={formatCurrency(property.rent_expected ?? 0)}
          iconBg="bg-indigo-50 dark:bg-indigo-900/20" iconColor="text-indigo-600 dark:text-indigo-400" />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
        {TABS.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            className={`px-4 py-2 text-[13px] font-semibold rounded-lg transition-all ${
              tab === tb.id
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}>
            {tb.label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className={`${cardClass} p-6`}>
          <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">{t(T.overview)}</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {[
              { label: t(T.address), value: [property.address, property.city, property.province, property.postal_code].filter(Boolean).join(", ") },
              { label: t(T.type), value: property.property_type ?? "—" },
              { label: t(T.purchasePrice), value: property.purchase_price ? formatCurrency(property.purchase_price) : "—" },
              { label: t(T.currentValue), value: property.current_value ? formatCurrency(property.current_value) : "—" },
              { label: lang === "fr" ? "Créée le" : "Created", value: formatDate(property.created_at) },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col">
                <dt className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">{label}</dt>
                <dd className="text-[13px] text-gray-800 dark:text-gray-200 font-medium">{value || "—"}</dd>
              </div>
            ))}
            {property.description && (
              <div className="sm:col-span-2 flex flex-col">
                <dt className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">{t(T.description)}</dt>
                <dd className="text-[13px] text-gray-600 dark:text-gray-300">{property.description}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* ── Units tab ───────────────────────────────────────────────────── */}
      {tab === "units" && (
        <div className={`${cardClass} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white">
              {t(T.units)} <span className="text-gray-400 font-normal ml-1">({units.length})</span>
            </h3>
            <Link href="/dashboard/properties" className="text-[12px] text-teal-600 dark:text-teal-400 font-medium hover:underline">
              {lang === "fr" ? "Gérer →" : "Manage →"}
            </Link>
          </div>
          {units.length === 0 ? (
            <div className="py-10 text-center">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
              </div>
              <p className="text-[14px] text-gray-400">{t(T.noUnits)}</p>
              <p className="text-[12px] text-gray-300 mt-1">{t(T.noUnitsSub)}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="hidden sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 px-3 py-1">
                {[t(T.unit), t(T.beds)+"/"+t(T.baths), t(T.sqft), t(T.rentMo), lang === "fr" ? "Statut" : "Status", ""].map((h, i) => (
                  <span key={i} className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</span>
                ))}
              </div>
              {units.map(u => {
                const uid = u.id ?? (u as any)._id;
                return (
                  <div key={uid} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl px-3 py-3 flex flex-col sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] sm:items-center gap-2">
                    <span className="font-semibold text-[14px] text-gray-900 dark:text-white">{lang === "fr" ? "Unité" : "Unit"} {u.unit_number}</span>
                    <span className="text-[13px] text-gray-500">{u.bedrooms ?? "—"} / {u.bathrooms ?? "—"}</span>
                    <span className="text-[13px] text-gray-500">{u.square_feet ? `${u.square_feet}` : "—"}</span>
                    <span className="text-[13px] font-medium text-gray-800 dark:text-gray-200">{u.rent_amount ? formatCurrency(u.rent_amount) : "—"}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold w-fit ${u.is_occupied ? "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                      {u.is_occupied ? (lang === "fr" ? "Occupée" : "Occupied") : (lang === "fr" ? "Vacante" : "Vacant")}
                    </span>
                    <Link href={`/dashboard/units/${uid}/timeline`} className="px-3 py-1 text-[12px] font-medium text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg transition-colors">
                      {t(T.timeline)}
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Assets tab ──────────────────────────────────────────────────── */}
      {tab === "assets" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">
              {t(T.assets)} <span className="font-normal">({assets.length})</span>
            </p>
            <button onClick={openAddAsset}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              {t(T.addAsset)}
            </button>
          </div>

          {assetsLoading ? (
            <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : assets.length === 0 ? (
            <div className={`${cardClass} p-12 text-center`}>
              <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
              </div>
              <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">{t(T.noAssets)}</p>
              <p className="text-[13px] text-gray-400">{t(T.noAssetsSub)}</p>
            </div>
          ) : (
            <div className={`${cardClass} overflow-hidden`}>
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {assets.map(a => {
                  const typeLabel = ASSET_TYPES.find(x => x.value === a.asset_type)?.[lang === "fr" ? "fr" : "en"] ?? a.asset_type;
                  return (
                    <div key={a.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-gray-800 dark:text-gray-200">{a.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">{typeLabel}</span>
                          {a.identifier && <span className="text-[11px] text-gray-400">#{a.identifier}</span>}
                          {a.unit_id && <span className="text-[11px] text-gray-400">{lang === "fr" ? "Unité" : "Unit"}: {units.find(u => (u.id ?? (u as any)._id) === a.unit_id)?.unit_number ?? a.unit_id}</span>}
                          {a.notes && <span className="text-[11px] text-gray-400 truncate">{a.notes}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => openEditAsset(a)} className="text-[12px] text-teal-600 hover:underline">{t(T.edit)}</button>
                        <button onClick={() => deleteAsset(a)} className="text-[12px] text-red-500 hover:underline">{t(T.delete)}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Audit tab ───────────────────────────────────────────────────── */}
      {tab === "audit" && (
        <div className="space-y-4">
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">{t(T.audit)}</p>
          {auditLoading ? (
            <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : auditLog.length === 0 ? (
            <div className={`${cardClass} p-12 text-center`}>
              <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
              </div>
              <p className="font-semibold text-gray-700 dark:text-gray-300">{t(T.noAudit)}</p>
            </div>
          ) : (
            <div className={`${cardClass} overflow-hidden`}>
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {auditLog.map(entry => {
                  const colorClass = AUDIT_COLORS[entry.action] ?? AUDIT_COLORS.updated;
                  const iconPath = AUDIT_ICONS[entry.action] ?? AUDIT_ICONS.updated;
                  const actionLabel = {
                    created: lang === "fr" ? "Créé" : "Created",
                    updated: lang === "fr" ? "Modifié" : "Updated",
                    deleted: lang === "fr" ? "Supprimé" : "Deleted",
                  }[entry.action] ?? entry.action;
                  const entityLabel = {
                    property: lang === "fr" ? "Propriété" : "Property",
                    asset: lang === "fr" ? "Actif" : "Asset",
                    unit: lang === "fr" ? "Unité" : "Unit",
                  }[entry.entity_type] ?? entry.entity_type;
                  return (
                    <div key={entry.id} className="flex items-center gap-4 px-5 py-3.5">
                      <div className={`w-8 h-8 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d={iconPath} /></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">
                          {actionLabel} — <span className="font-normal text-gray-500">{entityLabel}{entry.entity_label ? ` · ${entry.entity_label}` : ""}</span>
                        </p>
                      </div>
                      <span className="text-[11px] text-gray-400 flex-shrink-0">{formatDateTime(entry.created_at)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Asset modal ─────────────────────────────────────────────────── */}
      {showAssetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-[15px] font-bold text-gray-900 dark:text-white">
                {editingAsset ? (lang === "fr" ? "Modifier l'actif" : "Edit asset") : t(T.addAsset)}
              </h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t(T.assetName)} *</label>
                <input value={assetForm.name} onChange={e => setAssetForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder={lang === "fr" ? "ex. Stationnement #1" : "e.g. Parking Stall #1"} />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t(T.assetType)}</label>
                <select value={assetForm.asset_type} onChange={e => setAssetForm(p => ({ ...p, asset_type: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-teal-500">
                  {ASSET_TYPES.map(x => <option key={x.value} value={x.value}>{lang === "fr" ? x.fr : x.en}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t(T.assetId)}</label>
                  <input value={assetForm.identifier} onChange={e => setAssetForm(p => ({ ...p, identifier: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="#3" />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t(T.assetUnit)}</label>
                  <select value={assetForm.unit_id} onChange={e => setAssetForm(p => ({ ...p, unit_id: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="">—</option>
                    {units.map(u => <option key={u.id ?? (u as any)._id} value={u.id ?? (u as any)._id}>{lang === "fr" ? "Unité" : "Unit"} {u.unit_number}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t(T.assetNotes)}</label>
                <input value={assetForm.notes} onChange={e => setAssetForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowAssetModal(false)}
                className="flex-1 py-2.5 text-[13px] font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors">
                {t(T.cancel)}
              </button>
              <button onClick={saveAsset} disabled={savingAsset || !assetForm.name.trim()}
                className="flex-1 py-2.5 text-[13px] font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-xl transition-colors">
                {savingAsset ? "…" : t(T.save)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
