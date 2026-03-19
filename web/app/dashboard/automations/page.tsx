"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/lib/ToastContext";
import { requireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Icon } from "@/lib/icons";
import PageHeader from "@/components/dashboard/PageHeader";

const T = {
  title:    { fr: "Automatisations",    en: "Automations" },
  sub:      { fr: "Gérez vos rappels automatiques", en: "Manage your automatic reminders" },
  active:   { fr: "Active",            en: "Active" },
  inactive: { fr: "Inactive",          en: "Inactive" },
  saving:   { fr: "Enregistrement…",   en: "Saving…" },
  noAuto:   { fr: "Aucune automatisation disponible.", en: "No automations available." },
};

const DEFAULT_AUTOMATIONS = [
  {
    key: "rent_reminder_3_days",
    icon: "credit-card" as const,
    fr: "Rappel de loyer (3 jours avant)",
    en: "Rent reminder (3 days before)",
    descFr: "Envoie un rappel par email/SMS au locataire 3 jours avant l'échéance du loyer.",
    descEn: "Sends an email/SMS reminder to the tenant 3 days before rent is due.",
  },
  {
    key: "rent_reminder_day_of",
    icon: "credit-card" as const,
    fr: "Rappel de loyer (jour J)",
    en: "Rent reminder (due day)",
    descFr: "Envoie un rappel le jour même de l'échéance du loyer.",
    descEn: "Sends a reminder on the actual rent due date.",
  },
  {
    key: "late_rent_notification",
    icon: "credit-card" as const,
    fr: "Notification de loyer en retard",
    en: "Late rent notification",
    descFr: "Alerte le propriétaire dès qu'un loyer n'est pas payé après l'échéance.",
    descEn: "Alerts the landlord when a rent payment is overdue.",
  },
  {
    key: "lease_expiry_60_days",
    icon: "document" as const,
    fr: "Expiration de bail (60 jours)",
    en: "Lease expiry (60 days)",
    descFr: "Rappel 60 jours avant l'expiration d'un bail.",
    descEn: "Reminder 60 days before a lease expires.",
  },
  {
    key: "lease_expiry_30_days",
    icon: "document" as const,
    fr: "Expiration de bail (30 jours)",
    en: "Lease expiry (30 days)",
    descFr: "Rappel 30 jours avant l'expiration d'un bail.",
    descEn: "Reminder 30 days before a lease expires.",
  },
  {
    key: "maintenance_followup",
    icon: "wrench" as const,
    fr: "Suivi de maintenance",
    en: "Maintenance follow-up",
    descFr: "Rappel si une demande de maintenance reste ouverte plus de 7 jours.",
    descEn: "Reminder if a maintenance request remains open for more than 7 days.",
  },
  {
    key: "monthly_report",
    icon: "chart-bar" as const,
    fr: "Rapport mensuel",
    en: "Monthly report",
    descFr: "Rapport mensuel de loyers, dépenses et occupation envoyé par email.",
    descEn: "Monthly rent, expenses and occupancy report sent by email.",
  },
  {
    key: "insurance_expiry_30_days",
    icon: "shield" as const,
    fr: "Expiration d'assurance (30 jours)",
    en: "Insurance expiry (30 days)",
    descFr: "Rappel 30 jours avant l'expiration d'une assurance.",
    descEn: "Reminder 30 days before an insurance policy expires.",
  },
];

export default function AutomationsPage() {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const [automations, setAutomations] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!requireAuth()) return;
    api.getAutomations()
      .then((data: any) => {
        const map: Record<string, boolean> = {};
        if (Array.isArray(data)) {
          data.forEach((a: any) => { map[a.type ?? a.key] = a.is_active ?? a.enabled ?? false; });
        } else if (data && typeof data === "object") {
          Object.assign(map, data);
        }
        setAutomations(map);
      })
      .catch(e => showToast(e.message ?? (lang === "fr" ? "Erreur de chargement" : "Load error"), "error"))
      .finally(() => setLoading(false));
  }, []);

  async function toggleAutomation(key: string) {
    const current = automations[key] ?? false;
    setSaving(key);
    try {
      await api.toggleAutomation(key, !current);
      setAutomations(prev => ({ ...prev, [key]: !current }));
    } catch (e: any) { showToast(e.message ?? (lang === "fr" ? "Erreur de sauvegarde" : "Save error"), "error"); }
    finally { setSaving(null); }
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <PageHeader title={t(T.title)} subtitle={t(T.sub)} />

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {DEFAULT_AUTOMATIONS.map(auto => {
            const isActive = automations[auto.key] ?? false;
            const isSaving = saving === auto.key;
            return (
              <div key={auto.key} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isActive ? "bg-teal-100 dark:bg-teal-900/30" : "bg-gray-100 dark:bg-gray-800"}`}>
                    <Icon name={auto.icon} size={18} className={isActive ? "text-teal-600 dark:text-teal-400" : "text-gray-400"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-[14px]">
                        {lang === "fr" ? auto.fr : auto.en}
                      </h3>
                      {/* Toggle */}
                      <button
                        onClick={() => toggleAutomation(auto.key)}
                        disabled={isSaving}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${isActive ? "bg-teal-600" : "bg-gray-200 dark:bg-gray-700"} ${isSaving ? "opacity-50" : ""}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${isActive ? "translate-x-6" : "translate-x-1"}`} />
                      </button>
                    </div>
                    <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {lang === "fr" ? auto.descFr : auto.descEn}
                    </p>
                    <span className={`mt-2 inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${isActive ? "bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400" : "bg-gray-100 dark:bg-gray-800 text-gray-400"}`}>
                      {isActive ? t(T.active) : t(T.inactive)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
