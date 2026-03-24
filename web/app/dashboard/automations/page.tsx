"use client";
import { useEffect, useState, useRef } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/lib/ToastContext";
import { requireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Icon } from "@/lib/icons";
import PageHeader from "@/components/dashboard/PageHeader";

const T = {
  title:    { fr: "Automatisations",              en: "Automations" },
  sub:      { fr: "18 automatisations disponibles — activez celles dont vous avez besoin", en: "18 automations available — enable the ones you need" },
  active:   { fr: "Active",                       en: "Active" },
  inactive: { fr: "Inactive",                     en: "Inactive" },
  logTitle: { fr: "Journal d'activité",           en: "Activity log" },
  logSub:   { fr: "Historique des 20 derniers événements", en: "Last 20 events" },
  clearLog: { fr: "Effacer",                      en: "Clear" },
  logEmpty: { fr: "Aucune activité enregistrée", en: "No activity recorded yet" },
  enabled:  { fr: "Activée",                      en: "Enabled" },
  disabled: { fr: "Désactivée",                   en: "Disabled" },
};

const AUTOMATION_GROUPS = [
  {
    categoryFr: "Loyers & Paiements",
    categoryEn: "Rent & Payments",
    items: [
      { key: "rent_reminder",       icon: "credit-card" as const, fr: "Rappel de loyer",              en: "Rent reminder",              descFr: "Envoyer un rappel au locataire avant la date d'échéance mensuelle.",          descEn: "Send a reminder to the tenant before the monthly rent due date." },
      { key: "late_alert",          icon: "credit-card" as const, fr: "Alerte retard de paiement",    en: "Late payment alert",         descFr: "Vous notifier et relancer le locataire en retard de paiement.",               descEn: "Notify you and follow up with the tenant on overdue payments." },
      { key: "payment_receipt",     icon: "credit-card" as const, fr: "Reçu automatique",             en: "Automatic receipt",          descFr: "Envoyer un reçu de paiement au locataire dès la confirmation.",               descEn: "Send a payment receipt to the tenant upon confirmation." },
      { key: "e_transfer_reminder", icon: "credit-card" as const, fr: "Instructions de virement",     en: "Transfer instructions",      descFr: "Rappeler les instructions Interac e-Transfer à chaque début de mois.",        descEn: "Remind tenants of Interac e-Transfer instructions each month." },
    ],
  },
  {
    categoryFr: "Baux & Renouvellements",
    categoryEn: "Leases & Renewals",
    items: [
      { key: "lease_renewal",   icon: "document" as const, fr: "Avis de renouvellement",           en: "Renewal notice",             descFr: "Vous rappeler de préparer le renouvellement avant l'échéance du bail.",      descEn: "Remind you to prepare lease renewal before expiry." },
      { key: "rent_increase",   icon: "document" as const, fr: "Génération avis de hausse (TAL)",  en: "Rent increase notice (TAL)", descFr: "Préparer automatiquement l'avis de hausse conforme au formulaire TAL.",     descEn: "Automatically prepare a TAL-compliant rent increase notice." },
      { key: "non_renewal",     icon: "document" as const, fr: "Délai non-renouvellement (90j)",   en: "Non-renewal deadline (90d)", descFr: "Vous alerter du délai légal de 90 jours pour un avis de non-renouvellement.", descEn: "Alert you of the 90-day legal deadline for a non-renewal notice." },
      { key: "lease_signature", icon: "document" as const, fr: "Rappel signature de bail",         en: "Lease signature reminder",   descFr: "Relancer le locataire si un bail n'a pas été signé dans les délais.",        descEn: "Follow up if a lease hasn't been signed within the deadline." },
    ],
  },
  {
    categoryFr: "Entretien",
    categoryEn: "Maintenance",
    items: [
      { key: "maintenance_assign",   icon: "wrench" as const, fr: "Assignation automatique",    en: "Auto-assignment",        descFr: "Attribuer les nouveaux tickets à votre équipe selon la catégorie.",       descEn: "Assign new tickets to your team based on issue category." },
      { key: "maintenance_followup", icon: "wrench" as const, fr: "Suivi d'inactivité",          en: "Inactivity follow-up",   descFr: "Relancer votre équipe si un ticket reste sans mise à jour.",             descEn: "Follow up with your team if a ticket has no updates." },
      { key: "maintenance_tenant",   icon: "wrench" as const, fr: "Mise à jour locataire",       en: "Tenant update",          descFr: "Tenir le locataire informé de l'avancement de son ticket.",             descEn: "Keep the tenant informed of their maintenance ticket progress." },
      { key: "maintenance_complete", icon: "wrench" as const, fr: "Confirmation de fermeture",   en: "Closure confirmation",   descFr: "Demander la confirmation du locataire avant de clore un ticket.",        descEn: "Request tenant confirmation before closing a ticket." },
    ],
  },
  {
    categoryFr: "Finances",
    categoryEn: "Finances",
    items: [
      { key: "mortgage_renewal",  icon: "dollar" as const,    fr: "Renouvellement hypothèque",  en: "Mortgage renewal",   descFr: "Vous alerter avant l'échéance de vos prêts hypothécaires.",         descEn: "Alert you before your mortgage maturity date." },
      { key: "insurance_renewal", icon: "shield" as const,    fr: "Renouvellement assurance",   en: "Insurance renewal",  descFr: "Rappel avant l'expiration de vos polices d'assurance.",             descEn: "Reminder before your insurance policies expire." },
      { key: "monthly_report",    icon: "chart-bar" as const, fr: "Rapport mensuel",            en: "Monthly report",     descFr: "Recevoir un résumé financier chaque début de mois.",                descEn: "Receive a financial summary at the start of each month." },
    ],
  },
  {
    categoryFr: "Portail locataire",
    categoryEn: "Tenant Portal",
    items: [
      { key: "portal_welcome",           icon: "users" as const, fr: "Accueil nouveau locataire",   en: "New tenant welcome",      descFr: "Envoyer automatiquement les identifiants du portail à la signature du bail.", descEn: "Automatically send portal credentials upon lease signing." },
      { key: "portal_document",          icon: "users" as const, fr: "Notification de document",    en: "Document notification",   descFr: "Alerter le locataire lorsqu'un nouveau document est disponible.",            descEn: "Alert the tenant when a new document is available." },
      { key: "portal_maintenance_reply", icon: "users" as const, fr: "Réponse aux demandes",        en: "Request acknowledgement", descFr: "Envoyer un accusé de réception lors d'une demande d'entretien.",             descEn: "Send an acknowledgement when a maintenance request is submitted." },
    ],
  },
];

// Flat map for quick lookup by key
const ALL_AUTOMATIONS = AUTOMATION_GROUPS.flatMap(g => g.items);

const LOG_KEY = "domely_automation_log";
const MAX_LOG = 20;

interface LogEntry {
  id: string;
  key: string;
  nameFr: string;
  nameEn: string;
  enabled: boolean;
  ts: number; // unix ms
}

function readLog(): LogEntry[] {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) ?? "[]"); } catch { return []; }
}

function appendLog(entry: Omit<LogEntry, "id" | "ts">) {
  const prev = readLog();
  const next: LogEntry[] = [{ ...entry, id: Math.random().toString(36).slice(2), ts: Date.now() }, ...prev].slice(0, MAX_LOG);
  try { localStorage.setItem(LOG_KEY, JSON.stringify(next)); } catch {}
  return next;
}

function formatRelative(ts: number, lang: string): string {
  const diffMs = Date.now() - ts;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);
  if (diffMin < 1) return lang === "fr" ? "à l'instant" : "just now";
  if (diffMin < 60) return lang === "fr" ? `il y a ${diffMin} min` : `${diffMin}m ago`;
  if (diffH < 24) return lang === "fr" ? `il y a ${diffH}h` : `${diffH}h ago`;
  return lang === "fr" ? `il y a ${diffD}j` : `${diffD}d ago`;
}

export default function AutomationsPage() {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const [automations, setAutomations] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [log, setLog] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (!requireAuth()) return;
    setLog(readLog());
    api.getAutomations()
      .then((data: any) => {
        const map: Record<string, boolean> = {};
        if (Array.isArray(data)) {
          data.forEach((a: any) => { map[a.type ?? a.key ?? a.automation_id] = a.is_active ?? a.enabled ?? a.is_enabled ?? false; });
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
    const next = !current;
    setSaving(key);
    try {
      await api.toggleAutomation(key, next);
      setAutomations(prev => ({ ...prev, [key]: next }));
      const item = ALL_AUTOMATIONS.find(a => a.key === key);
      if (item) {
        const updated = appendLog({ key, nameFr: item.fr, nameEn: item.en, enabled: next });
        setLog(updated);
      }
    } catch (e: any) {
      showToast(e.message ?? (lang === "fr" ? "Erreur de sauvegarde" : "Save error"), "error");
    } finally {
      setSaving(null);
    }
  }

  function clearLog() {
    try { localStorage.removeItem(LOG_KEY); } catch {}
    setLog([]);
  }

  const activeCount = Object.values(automations).filter(Boolean).length;

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <PageHeader
        title={t(T.title)}
        subtitle={t(T.sub)}
        actions={activeCount > 0 ? [{
          label: `${activeCount} ${lang === "fr" ? "active" : "active"}${activeCount > 1 ? "s" : ""}`,
          onClick: () => {},
        }] : undefined}
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {AUTOMATION_GROUPS.map(group => (
            <div key={group.categoryFr}>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
                {lang === "fr" ? group.categoryFr : group.categoryEn}
              </p>
              <div className="space-y-2">
                {group.items.map(auto => {
                  const isActive = automations[auto.key] ?? false;
                  const isSaving = saving === auto.key;
                  return (
                    <div key={auto.key}
                      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isActive ? "bg-teal-100 dark:bg-teal-900/30" : "bg-gray-100 dark:bg-gray-800"}`}>
                          <Icon name={auto.icon} size={16} className={isActive ? "text-teal-600 dark:text-teal-400" : "text-gray-400"} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-[13px]">
                              {lang === "fr" ? auto.fr : auto.en}
                            </h3>
                            <button
                              onClick={() => toggleAutomation(auto.key)}
                              disabled={isSaving}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${isActive ? "bg-teal-600" : "bg-gray-200 dark:bg-gray-700"} ${isSaving ? "opacity-50" : ""}`}
                            >
                              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${isActive ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                            </button>
                          </div>
                          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                            {lang === "fr" ? auto.descFr : auto.descEn}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Activity Log */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  {t(T.logTitle)}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">{t(T.logSub)}</p>
              </div>
              {log.length > 0 && (
                <button
                  onClick={clearLog}
                  className="text-[11px] text-gray-400 hover:text-red-500 transition-colors"
                >
                  {t(T.clearLog)}
                </button>
              )}
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
              {log.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-[13px] text-gray-400">{t(T.logEmpty)}</p>
                  <p className="text-[11px] text-gray-300 dark:text-gray-600 mt-1">
                    {lang === "fr" ? "Activez ou désactivez une automatisation pour commencer." : "Toggle an automation above to start logging."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                  {log.map(entry => {
                    const item = ALL_AUTOMATIONS.find(a => a.key === entry.key);
                    return (
                      <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${entry.enabled ? "bg-teal-50 dark:bg-teal-900/20" : "bg-gray-100 dark:bg-gray-800"}`}>
                          {item && <Icon name={item.icon} size={13} className={entry.enabled ? "text-teal-600" : "text-gray-400"} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-gray-800 dark:text-gray-200 truncate">
                            {lang === "fr" ? entry.nameFr : entry.nameEn}
                          </p>
                          <p className="text-[11px] text-gray-400">{formatRelative(entry.ts, lang)}</p>
                        </div>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${entry.enabled ? "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                          {entry.enabled ? t(T.enabled) : t(T.disabled)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
