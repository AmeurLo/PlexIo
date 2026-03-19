"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/lib/ToastContext";
import { requireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import PageHeader from "@/components/dashboard/PageHeader";
import EmptyState from "@/components/dashboard/EmptyState";

// ─── i18n ─────────────────────────────────────────────────────────────────────
const T = {
  title:         { fr: "Logements vacants",          en: "Vacant Units" },
  sub:           { fr: "Réduisez les vacances et maximisez vos revenus", en: "Reduce vacancy and maximize income" },
  loading:       { fr: "Chargement…",                en: "Loading…" },
  empty:         { fr: "Aucun logement vacant",       en: "No vacant units" },
  emptySub:      { fr: "Tous vos logements sont occupés. Excellent !",   en: "All your units are occupied. Excellent!" },
  daysVacant:    { fr: "Jours vacant",               en: "Days vacant" },
  rent:          { fr: "Loyer/mois",                 en: "Rent/mo" },
  beds:          { fr: "Ch.",                        en: "Beds" },
  sqft:          { fr: "Pi²",                        en: "Sq ft" },
  listingOn:     { fr: "Annonce active",             en: "Listing active" },
  listingOff:    { fr: "Annonce inactive",           en: "Listing inactive" },
  toggleOn:      { fr: "Activer l'annonce",          en: "Activate listing" },
  toggleOff:     { fr: "Désactiver",                 en: "Deactivate" },
  property:      { fr: "Propriété",                  en: "Property" },
  unit:          { fr: "Unité",                      en: "Unit" },
  toggling:      { fr: "Mise à jour…",               en: "Updating…" },
  // summary
  totalVacant:   { fr: "Logements vacants",          en: "Vacant units" },
  lostRent:      { fr: "Revenus perdus/mois",        en: "Lost revenue/mo" },
  avgVacancy:    { fr: "Vacance moyenne",            en: "Avg. vacancy" },
  days:          { fr: "jours",                      en: "days" },
  // urgency
  critical:      { fr: "Critique",                  en: "Critical" },
  warning:       { fr: "Attention",                 en: "Warning" },
  ok:            { fr: "OK",                        en: "OK" },
};

type VacantUnit = {
  id: string;
  unit_number?: string;
  property_name: string;
  property_address?: string;
  rent_amount?: number;
  bedrooms?: number;
  sq_ft?: number;
  days_vacant: number;
  listing_active: boolean;
};

export default function VacancyPage() {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const [units, setUnits]       = useState<VacantUnit[]>([]);
  const [loading, setLoading]   = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (!requireAuth()) return;
    api.getVacantUnits()
      .then(data => setUnits(data as VacantUnit[]))
      .catch(e => showToast(e.message, "error"))
      .finally(() => setLoading(false));
  }, []);

  async function toggleListing(unitId: string, current: boolean) {
    setToggling(unitId);
    try {
      await api.toggleListing(unitId);
      setUnits(prev => prev.map(u => u.id === unitId ? { ...u, listing_active: !current } : u));
      showToast(
        !current
          ? (lang === "fr" ? "Annonce activée" : "Listing activated")
          : (lang === "fr" ? "Annonce désactivée" : "Listing deactivated"),
        "success"
      );
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setToggling(null);
    }
  }

  function urgency(days: number): { label: string; color: string; dot: string } {
    if (days >= 30) return { label: t(T.critical), color: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",    dot: "bg-red-500" };
    if (days >= 14) return { label: t(T.warning),  color: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400", dot: "bg-amber-500" };
    return             { label: t(T.ok),        color: "bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400",  dot: "bg-teal-500" };
  }

  const totalLostRent = units.reduce((s, u) => s + (u.rent_amount ?? 0), 0);
  const avgVacancy = units.length > 0 ? Math.round(units.reduce((s, u) => s + u.days_vacant, 0) / units.length) : 0;

  const cardClass = "bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)]";

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <PageHeader title={t(T.title)} subtitle={t(T.sub)} />

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : units.length === 0 ? (
        <EmptyState icon="home" title={t(T.empty)} description={t(T.emptySub)} />
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className={`${cardClass} p-5 text-center`}>
              <p className="text-[32px] font-bold text-red-500">{units.length}</p>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">{t(T.totalVacant)}</p>
            </div>
            <div className={`${cardClass} p-5 text-center`}>
              <p className="text-[32px] font-bold text-gray-900 dark:text-white">{formatCurrency(totalLostRent)}</p>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">{t(T.lostRent)}</p>
            </div>
            <div className={`${cardClass} p-5 text-center`}>
              <p className="text-[32px] font-bold text-gray-900 dark:text-white">{avgVacancy} <span className="text-[16px] font-normal text-gray-400">{t(T.days)}</span></p>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">{t(T.avgVacancy)}</p>
            </div>
          </div>

          {/* Unit cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {units.map(u => {
              const urg = urgency(u.days_vacant);
              const isToggling = toggling === u.id;
              return (
                <div key={u.id} className={`${cardClass} p-6`}>
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 dark:text-white text-[15px]">
                          {u.unit_number ? `${t(T.unit)} ${u.unit_number}` : u.property_name}
                        </p>
                        <span className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${urg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${urg.dot}`} />
                          {urg.label}
                        </span>
                      </div>
                      <p className="text-[13px] text-gray-500 dark:text-gray-400">
                        {u.unit_number ? u.property_name : u.property_address ?? ""}
                      </p>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                      <p className="text-[18px] font-bold text-red-500">{u.days_vacant}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{t(T.daysVacant)}</p>
                    </div>
                    {u.rent_amount ? (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                        <p className="text-[16px] font-bold text-gray-900 dark:text-white">{formatCurrency(u.rent_amount)}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{t(T.rent)}</p>
                      </div>
                    ) : null}
                    {u.bedrooms ? (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                        <p className="text-[18px] font-bold text-gray-900 dark:text-white">{u.bedrooms}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{t(T.beds)}</p>
                      </div>
                    ) : null}
                  </div>

                  {/* Listing toggle */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                    <div>
                      <p className="text-[13px] font-medium text-gray-700 dark:text-gray-300">
                        {u.listing_active ? t(T.listingOn) : t(T.listingOff)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Toggle switch */}
                      <button
                        onClick={() => toggleListing(u.id, u.listing_active)}
                        disabled={isToggling}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${u.listing_active ? "bg-teal-600" : "bg-gray-200 dark:bg-gray-700"} ${isToggling ? "opacity-50" : ""}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${u.listing_active ? "translate-x-6" : "translate-x-1"}`} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
