"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/lib/ToastContext";
import { requireAuth, getUser } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import StatCard from "@/components/dashboard/StatCard";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { SkeletonCard, SkeletonRow } from "@/components/dashboard/SkeletonCard";
import type { DashboardStats } from "@/lib/types";
import WelcomeVideo from "@/components/dashboard/WelcomeVideo";

// Map alert type keywords → destination page
function alertLink(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("loyer") || m.includes("rent") || m.includes("paiement") || m.includes("payment")) return "/dashboard/rent";
  if (m.includes("bail") || m.includes("lease") || m.includes("expir")) return "/dashboard/leases";
  if (m.includes("maintenance") || m.includes("répar") || m.includes("repair")) return "/dashboard/maintenance";
  if (m.includes("vacant") || m.includes("vacancy")) return "/dashboard/vacancy";
  if (m.includes("inspection")) return "/dashboard/inspections";
  return "/dashboard";
}

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  try { return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000); }
  catch { return null; }
}

const T = {
  overview:    { fr: "Tableau de bord",       en: "Overview" },
  hello:       { fr: "Bonjour",               en: "Hello" },
  loading:     { fr: "Chargement…",           en: "Loading…" },
  properties:  { fr: "Propriétés",            en: "Properties" },
  tenants:     { fr: "Locataires",            en: "Tenants" },
  units:       { fr: "Unités",               en: "Units" },
  occupied:    { fr: "Occupées",              en: "Occupied" },
  revenue:     { fr: "Revenus du mois",       en: "Monthly Revenue" },
  collected:   { fr: "Perçus",               en: "Collected" },
  pending:     { fr: "En attente",            en: "Pending" },
  maintenance: { fr: "Maintenance",           en: "Maintenance" },
  open:        { fr: "Ouverts",              en: "Open" },
  recentRent:  { fr: "Loyers récents",        en: "Recent Rent" },
  noRent:      { fr: "Aucun paiement récent", en: "No recent payments" },
  alerts:      { fr: "Alertes",              en: "Alerts" },
  noAlerts:    { fr: "Aucune alerte",         en: "No alerts" },
  tenant:      { fr: "Locataire",            en: "Tenant" },
  amount:      { fr: "Montant",              en: "Amount" },
  status:      { fr: "Statut",              en: "Status" },
  due:         { fr: "Échéance",             en: "Due" },
  demoTitle:   { fr: "Bienvenue sur Domely !", en: "Welcome to Domely!" },
  demoSub:     { fr: "Chargez des données de démonstration pour explorer toutes les fonctionnalités.", en: "Load demo data to explore all features with realistic sample data." },
  demoBtn:     { fr: "Charger les données démo", en: "Load demo data" },
  demoLoading: { fr: "Chargement…", en: "Loading…" },
  demoLoaded:  { fr: "Données chargées avec succès !", en: "Demo data loaded successfully!" },
};

export default function OverviewPage() {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [leases, setLeases] = useState<any[]>([]);

  const loadStats = () => {
    api.getDashboard()
      .then(setStats)
      .catch(e => {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        showToast(msg, "error");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!requireAuth()) return;
    const user = getUser();
    setFirstName(user?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "");
    loadStats();
    api.getLeases().then((ls: any[]) => setLeases(ls)).catch(() => {});
  }, []);

  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      await api.seedDemoData();
      setSeeded(true);
      setLoading(true);
      loadStats();
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-6xl">
        <div className="h-8 w-48 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0,1,2,3].map(i => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[0,1].map(i => <SkeletonCard key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[0,1].map(i => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <div className="h-4 w-32 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              </div>
              {[0,1,2,3].map(j => <SkeletonRow key={j} />)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-[13px] text-red-600">
          {error}
        </div>
      </div>
    );
  }

  const rentPayments = stats?.recent_payments ?? [];
  const alerts = stats?.alerts ?? [];

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Greeting */}
      <div>
        <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">
          {t(T.hello)}{firstName ? `, ${firstName}` : ""} 👋
        </h1>
      </div>

      {/* ── Welcome video — shown to new users until dismissed ── */}
      <WelcomeVideo hidden={(stats?.total_properties ?? 0) > 0} />

      {/* ── Onboarding checklist — visible until all 3 setup steps done ── */}
      {(() => {
        const hasProperty = (stats?.total_properties ?? 0) > 0;
        const hasTenant   = (stats?.total_tenants   ?? 0) > 0;
        const hasLease    = (stats?.occupied_units  ?? 0) > 0;
        const allDone     = hasProperty && hasTenant && hasLease;
        if (loading || seeded || allDone) return null;

        const steps = [
          {
            done:  hasProperty,
            label: { fr: "Ajouter votre première propriété", en: "Add your first property" },
            sub:   { fr: "Adresse, logements, unités",        en: "Address, units, floors" },
            href:  "/dashboard/properties",
            cta:   { fr: "Ajouter →", en: "Add →" },
          },
          {
            done:  hasTenant,
            label: { fr: "Inviter un locataire",               en: "Invite a tenant" },
            sub:   { fr: "Accès au portail sans mot de passe", en: "Portal access, no password needed" },
            href:  "/dashboard/tenants",
            cta:   { fr: "Inviter →", en: "Invite →" },
          },
          {
            done:  hasLease,
            label: { fr: "Créer un bail",                                en: "Create a lease" },
            sub:   { fr: "Bail officiel TAL généré automatiquement", en: "Official TAL lease auto-generated" },
            href:  "/dashboard/leases",
            cta:   { fr: "Créer →", en: "Create →" },
          },
        ];
        const doneCount = steps.filter(s => s.done).length;

        return (
          <div className="rounded-2xl border border-teal-200 dark:border-teal-800 overflow-hidden"
            style={{ background: "linear-gradient(135deg,#f0fdfa,#e9fdf8)" }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-teal-100 dark:border-teal-800/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#1E7A6E,#3FAF86)" }}>
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-bold text-teal-900 dark:text-teal-100">
                    {lang === "fr" ? "Démarrage rapide" : "Quick start"}
                  </p>
                  <p className="text-[12px] text-teal-600 dark:text-teal-400">
                    {lang === "fr" ? "Complétez ces étapes pour débuter" : "Complete these steps to get going"}
                  </p>
                </div>
              </div>
              {/* Progress pill */}
              <div className="px-3 py-1 rounded-full text-[12px] font-semibold bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300">
                {doneCount} / 3
              </div>
            </div>

            {/* Steps */}
            <div className="divide-y divide-teal-100 dark:divide-teal-800/40">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                  {/* Check / number */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    step.done
                      ? "bg-teal-500"
                      : "border-2 border-teal-300 dark:border-teal-700 bg-white dark:bg-gray-900"
                  }`}>
                    {step.done ? (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      <span className="text-[12px] font-bold text-teal-500">{i + 1}</span>
                    )}
                  </div>

                  {/* Labels */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[14px] font-semibold leading-tight ${
                      step.done
                        ? "text-teal-500 dark:text-teal-500 line-through opacity-60"
                        : "text-teal-900 dark:text-teal-100"
                    }`}>
                      {lang === "fr" ? step.label.fr : step.label.en}
                    </p>
                    <p className="text-[12px] text-teal-600 dark:text-teal-400 mt-0.5">
                      {lang === "fr" ? step.sub.fr : step.sub.en}
                    </p>
                  </div>

                  {/* CTA link — only for incomplete steps */}
                  {!step.done && (
                    <Link href={step.href}
                      className="flex-shrink-0 text-[13px] font-semibold text-teal-700 dark:text-teal-300 hover:text-teal-900 dark:hover:text-white transition-colors whitespace-nowrap">
                      {lang === "fr" ? step.cta.fr : step.cta.en}
                    </Link>
                  )}
                </div>
              ))}
            </div>

            {/* Demo data footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-teal-100 dark:border-teal-800/40 bg-teal-50/60 dark:bg-teal-900/10">
              <p className="text-[12px] text-teal-600 dark:text-teal-400">
                {lang === "fr" ? "Vous voulez explorer d'abord ?" : "Want to explore first?"}
              </p>
              <button
                onClick={handleSeedDemo}
                disabled={seeding}
                className="text-[12px] font-semibold text-teal-700 dark:text-teal-300 hover:text-teal-900 dark:hover:text-white transition-colors disabled:opacity-50">
                {seeding
                  ? (lang === "fr" ? "Chargement…" : "Loading…")
                  : (lang === "fr" ? "Charger données démo" : "Load demo data")}
              </button>
            </div>
          </div>
        );
      })()}

      {seeded && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 text-[13px] font-medium text-teal-700 dark:text-teal-300">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          {lang === "fr" ? "Données démo chargées — explorez le tableau de bord !" : "Demo data loaded — explore the dashboard!"}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="home"        label={t(T.properties)}  value={String(stats?.total_properties ?? 0)} />
        <StatCard icon="users"       label={t(T.tenants)}     value={String(stats?.total_tenants ?? 0)} />
        <StatCard icon="credit-card" label={t(T.revenue)}     value={formatCurrency(stats?.monthly_revenue ?? 0)} />
        <StatCard icon="wrench"      label={t(T.maintenance)} value={String(stats?.open_maintenance_requests ?? 0)} />
      </div>

      {/* Occupancy + collected row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5">
          <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wide mb-2">{t(T.units)}</p>
          <div className="flex items-end gap-2">
            <span className="text-[28px] font-bold text-gray-900 dark:text-white">{stats?.occupied_units ?? 0}</span>
            <span className="text-[14px] text-gray-400 mb-1">/ {stats?.total_units ?? 0} {t(T.occupied).toLowerCase()}</span>
          </div>
          <div className="mt-3 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all"
              style={{ width: `${stats?.total_units ? Math.round(((stats.occupied_units ?? 0) / stats.total_units) * 100) : 0}%` }}
            />
          </div>
          <p className="text-[12px] text-gray-400 mt-1">
            {stats?.total_units ? Math.round(((stats.occupied_units ?? 0) / stats.total_units) * 100) : 0}% {t(T.occupied).toLowerCase()}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5">
          <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wide mb-2">{t(T.collected)}</p>
          <p className="text-[28px] font-bold text-gray-900 dark:text-white">{formatCurrency(stats?.collected_this_month ?? 0)}</p>
          <p className="text-[13px] text-gray-400 mt-1">
            {t(T.pending)}: <span className="text-orange-500 font-medium">{formatCurrency(stats?.pending_rent ?? 0)}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent rent payments */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white">{t(T.recentRent)}</h3>
            <Link href="/dashboard/rent" className="text-[12px] text-teal-600 hover:text-teal-700 font-medium">{lang === "fr" ? "Voir tout →" : "View all →"}</Link>
          </div>
          {rentPayments.length === 0 ? (
            <p className="text-[13px] text-gray-400 text-center py-10">{t(T.noRent)}</p>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {rentPayments.slice(0, 6).map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200 truncate">{p.tenant_name || p.tenant_id}</p>
                    <p className="text-[12px] text-gray-400">{formatDate(p.due_date)}</p>
                  </div>
                  <span className="text-[13px] font-semibold text-gray-900 dark:text-white">{formatCurrency(p.amount)}</span>
                  <StatusBadge status={p.status} lang={lang} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alerts */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white">{t(T.alerts)}</h3>
            <Link href="/dashboard/maintenance" className="text-[12px] text-teal-600 hover:text-teal-700 font-medium">{lang === "fr" ? "Voir tout →" : "View all →"}</Link>
          </div>
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <div className="w-10 h-10 bg-teal-50 dark:bg-teal-900/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-[13px] text-gray-400">{t(T.noAlerts)}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {alerts.slice(0, 6).map((a: any, i: number) => (
                <Link key={i} href={alertLink(a.message ?? "")}
                  className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${a.type === "urgent" ? "bg-red-500" : a.type === "warning" ? "bg-orange-400" : "bg-blue-400"}`} />
                  <p className="text-[13px] text-gray-700 dark:text-gray-300 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">{a.message}</p>
                  <svg className="ml-auto w-3 h-3 text-gray-300 dark:text-gray-600 group-hover:text-teal-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Expiring leases */}
      {(() => {
        const expiring = leases
          .filter((l: any) => {
            const d = daysUntil(l.end_date);
            return d !== null && d >= 0 && d <= 90;
          })
          .sort((a: any, b: any) => (daysUntil(a.end_date) ?? 999) - (daysUntil(b.end_date) ?? 999))
          .slice(0, 5);
        if (expiring.length === 0) return null;
        return (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-amber-100 dark:border-amber-900/40 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="px-5 py-4 border-b border-amber-100 dark:border-amber-900/40 flex items-center justify-between bg-amber-50/50 dark:bg-amber-900/10">
              <div className="flex items-center gap-2">
                <span className="text-base">📅</span>
                <h3 className="text-[14px] font-semibold text-amber-900 dark:text-amber-200">
                  {lang === "fr" ? "Baux expirant bientôt" : "Leases expiring soon"}
                </h3>
              </div>
              <Link href="/dashboard/leases" className="text-[12px] text-teal-600 hover:text-teal-700 font-medium">{lang === "fr" ? "Voir tout →" : "View all →"}</Link>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {expiring.map((l: any, i: number) => {
                const days = daysUntil(l.end_date)!;
                const urgent = days <= 30;
                return (
                  <Link key={l.id ?? i} href="/dashboard/leases"
                    className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200 truncate">
                        {l.tenant_name || (l.tenant_first_name ? `${l.tenant_first_name} ${l.tenant_last_name ?? ""}`.trim() : l.tenant_id)}
                      </p>
                      <p className="text-[12px] text-gray-400">{l.property_name || l.unit_number || ""}</p>
                    </div>
                    <span className={`text-[12px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                      urgent
                        ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    }`}>
                      {days === 0
                        ? (lang === "fr" ? "Aujourd'hui" : "Today")
                        : days === 1
                        ? (lang === "fr" ? "Demain" : "Tomorrow")
                        : `${days}${lang === "fr" ? " j" : "d"}`}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
