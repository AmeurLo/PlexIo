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
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  try { return new Date(dateStr).toLocaleDateString("fr-CA"); } catch { return dateStr.slice(0, 10); }
}

export default function PropertyDetailPage() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const router = useRouter();
  const { lang, t } = useLanguage();
  const { showToast } = useToast();

  const [property, setProperty] = useState<PropertyWithStats | null>(null);
  const [units, setUnits]       = useState<Unit[]>([]);
  const [loading, setLoading]   = useState(true);

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

  if (loading) {
    return (
      <div className="p-6 flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="p-6">
        <button onClick={() => router.back()} className="text-[13px] text-gray-500 hover:text-teal-600 font-medium mb-4 block">
          {t(T.back)}
        </button>
        <p className="text-gray-400">{t(T.notFound)}</p>
      </div>
    );
  }

  const occupiedCount = units.filter(u => u.is_occupied).length;
  const vacantCount   = units.length - occupiedCount;

  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Back + header */}
      <button
        onClick={() => router.back()}
        className="text-[13px] text-gray-500 hover:text-teal-600 transition-colors font-medium"
      >
        {t(T.back)}
      </button>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader title={property.name} subtitle={property.address ?? ""} />
        <div className="flex gap-2 flex-wrap">
          <Link
            href={`/dashboard/properties/${propertyId}/financials`}
            className="px-4 py-2 text-[13px] font-semibold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-900/40 rounded-xl transition-colors"
          >
            {t(T.finances)}
          </Link>
          <Link
            href={`/dashboard/properties`}
            className="px-4 py-2 text-[13px] font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            {t(T.manageUnits)}
          </Link>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon="home"
          label={t(T.totalUnits)}
          value={String(property.total_units ?? units.length ?? 0)}
        />
        <StatCard
          icon="users"
          label={t(T.occupied)}
          value={String(occupiedCount)}
          iconBg="bg-teal-50 dark:bg-teal-900/30"
          iconColor="text-teal-600 dark:text-teal-400"
        />
        <StatCard
          icon="dollar"
          label={t(T.vacant)}
          value={String(vacantCount)}
          iconBg={vacantCount > 0 ? "bg-amber-50 dark:bg-amber-900/20" : "bg-teal-50 dark:bg-teal-900/30"}
          iconColor={vacantCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-teal-600 dark:text-teal-400"}
        />
        <StatCard
          icon="credit-card"
          label={lang === "fr" ? "Loyers attendus" : "Expected rent"}
          value={formatCurrency(property.rent_expected ?? 0)}
          iconBg="bg-indigo-50 dark:bg-indigo-900/20"
          iconColor="text-indigo-600 dark:text-indigo-400"
        />
      </div>

      {/* Details card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-6">
        <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">{t(T.overview)}</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
          {[
            { label: t(T.address),       value: [property.address, property.city, property.province, property.postal_code].filter(Boolean).join(", ") },
            { label: t(T.type),          value: property.property_type ?? "—" },
            { label: t(T.purchasePrice), value: property.purchase_price ? formatCurrency(property.purchase_price) : "—" },
            { label: t(T.currentValue),  value: property.current_value  ? formatCurrency(property.current_value)  : "—" },
            { label: lang === "fr" ? "Créée le" : "Created",
              value: formatDate(property.created_at) },
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

      {/* Units list */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white">
            {t(T.units)} <span className="text-gray-400 font-normal ml-1">({units.length})</span>
          </h3>
          <Link
            href="/dashboard/properties"
            className="text-[12px] text-teal-600 dark:text-teal-400 font-medium hover:underline"
          >
            {lang === "fr" ? "Gérer →" : "Manage →"}
          </Link>
        </div>

        {units.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-4xl mb-2">🏠</p>
            <p className="text-[14px] text-gray-400">{t(T.noUnits)}</p>
            <p className="text-[12px] text-gray-300 mt-1">{t(T.noUnitsSub)}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Header */}
            <div className="hidden sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 px-3 py-1">
              {[t(T.unit), t(T.beds)+"/"+t(T.baths), t(T.sqft), t(T.rentMo), lang === "fr" ? "Statut" : "Status", ""].map((h, i) => (
                <span key={i} className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</span>
              ))}
            </div>
            {units.map(u => {
              const uid = u.id ?? (u as any)._id;
              return (
                <div
                  key={uid}
                  className="bg-gray-50 dark:bg-gray-800/50 rounded-xl px-3 py-3 flex flex-col sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] sm:items-center gap-2"
                >
                  <span className="font-semibold text-[14px] text-gray-900 dark:text-white">
                    {lang === "fr" ? "Unité" : "Unit"} {u.unit_number}
                  </span>
                  <span className="text-[13px] text-gray-500">
                    {u.bedrooms ?? "—"} / {u.bathrooms ?? "—"}
                  </span>
                  <span className="text-[13px] text-gray-500">
                    {u.square_feet ? `${u.square_feet}` : "—"}
                  </span>
                  <span className="text-[13px] font-medium text-gray-800 dark:text-gray-200">
                    {u.rent_amount ? formatCurrency(u.rent_amount) : "—"}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold w-fit ${
                    u.is_occupied
                      ? "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  }`}>
                    {u.is_occupied
                      ? (lang === "fr" ? "Occupée" : "Occupied")
                      : (lang === "fr" ? "Vacante" : "Vacant")}
                  </span>
                  <Link
                    href={`/dashboard/units/${uid}/timeline`}
                    className="px-3 py-1 text-[12px] font-medium text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg transition-colors"
                  >
                    {t(T.timeline)}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
