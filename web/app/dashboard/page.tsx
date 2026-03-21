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
import type { DashboardStats } from "@/lib/types";

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
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
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

      {/* Demo data banner — shown only when account is empty */}
      {!loading && (stats?.total_properties ?? 0) === 0 && !seeded && (
        <div className="relative overflow-hidden rounded-2xl border border-teal-200 dark:border-teal-800"
          style={{ background: "linear-gradient(135deg, #f0fdfa, #e6faf5)" }}>
          <div className="dark:hidden absolute inset-0 opacity-5"
            style={{ backgroundImage: "radial-gradient(circle at 80% 50%, #3FAF86 0%, transparent 60%)" }} />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4 p-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}>
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-bold text-teal-900 dark:text-teal-100">{t(T.demoTitle)}</p>
              <p className="text-[13px] text-teal-700 dark:text-teal-300 mt-0.5">{t(T.demoSub)}</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0">
              <button
                onClick={handleSeedDemo}
                disabled={seeding}
                className="px-5 py-2.5 text-[13px] font-semibold text-white rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 shadow-sm"
                style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}>
                {seeding ? t(T.demoLoading) : t(T.demoBtn)}
              </button>
              <Link href="/dashboard/properties"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-[14px] font-semibold text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800 rounded-xl hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors">
                {lang === "fr" ? "+ Ajouter une propriété" : "+ Add a property"}
              </Link>
            </div>
          </div>
        </div>
      )}

      {seeded && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 text-[13px] font-medium text-teal-700 dark:text-teal-300">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          {t(T.demoLoaded)}
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
                <div key={i} className="flex items-start gap-3 px-5 py-3">
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${a.type === "urgent" ? "bg-red-500" : a.type === "warning" ? "bg-orange-400" : "bg-blue-400"}`} />
                  <p className="text-[13px] text-gray-700 dark:text-gray-300">{a.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
