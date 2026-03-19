"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { requireTenantAuth, tenantApi, getTenantUser } from "@/lib/tenantApi";
import { formatCurrency, formatDate, daysUntil } from "@/lib/format";
import { Icon } from "@/lib/icons";
import Link from "next/link";

const T = {
  greeting:   { fr: "Bonjour",          en: "Hello" },
  lease:      { fr: "Bail actif",        en: "Active lease" },
  noLease:    { fr: "Aucun bail actif",  en: "No active lease" },
  nextRent:   { fr: "Prochain loyer",   en: "Next payment" },
  dueIn:      { fr: "Dû dans",          en: "Due in" },
  days:       { fr: "jours",            en: "days" },
  overdue:    { fr: "En retard",        en: "Overdue" },
  today:      { fr: "Aujourd'hui",      en: "Today" },
  unit:       { fr: "Unité",            en: "Unit" },
  property:   { fr: "Propriété",        en: "Property" },
  landlord:   { fr: "Propriétaire",     en: "Landlord" },
  monthly:    { fr: "Loyer mensuel",    en: "Monthly rent" },
  deposit:    { fr: "Dépôt de garantie", en: "Security deposit" },
  start:      { fr: "Début",            en: "Start" },
  end:        { fr: "Fin",              en: "End" },
  quick:      { fr: "Accès rapide",     en: "Quick access" },
  payHistory: { fr: "Historique loyers", en: "Payment history" },
  maint:      { fr: "Maintenance",      en: "Maintenance" },
  messages:   { fr: "Messages",         en: "Messages" },
  loading:    { fr: "Chargement…",      en: "Loading…" },
};

export default function TenantOverviewPage() {
  const { lang, t } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const user = typeof window !== "undefined" ? getTenantUser() : null;

  useEffect(() => {
    if (!requireTenantAuth()) return;
    tenantApi.getProfile()
      .then(p => setProfile(p))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const lease = profile?.lease;
  const nextDue = lease?.next_payment_date;
  const daysLeft = nextDue ? daysUntil(nextDue) : null;

  function DueBadge() {
    if (daysLeft === null) return null;
    if (daysLeft < 0) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-semibold bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400">{t(T.overdue)}</span>;
    if (daysLeft === 0) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{t(T.today)}</span>;
    return <span className="text-[13px] text-gray-500 dark:text-gray-400">{t(T.dueIn)} <span className="font-semibold text-gray-800 dark:text-gray-200">{daysLeft}</span> {t(T.days)}</span>;
  }

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-[22px] font-bold text-gray-900 dark:text-white">
          {t(T.greeting)}{user?.first_name ? `, ${user.first_name}` : ""} 👋
        </h1>
        <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-0.5">
          {user?.email}
        </p>
      </div>

      {/* Next payment card */}
      {lease ? (
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-2xl px-6 py-5 text-white shadow-md">
          <p className="text-[12px] font-medium text-teal-200 uppercase tracking-wide">{t(T.nextRent)}</p>
          <div className="flex items-end justify-between mt-2">
            <p className="text-[32px] font-bold leading-none">{formatCurrency(lease.monthly_rent ?? 0)}</p>
            <div className="text-right">
              <p className="text-[13px] text-teal-200">{formatDate(nextDue, lang === "fr" ? "fr-CA" : "en-CA")}</p>
              <DueBadge />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-6 py-5">
          <p className="text-[14px] text-gray-400">{t(T.noLease)}</p>
        </div>
      )}

      {/* Lease details */}
      {lease && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-[14px] font-semibold text-gray-900 dark:text-white">{t(T.lease)}</h2>
          </div>
          <div className="grid grid-cols-2 gap-px bg-gray-100 dark:bg-gray-800">
            {[
              { label: t(T.property), value: profile?.property_name ?? lease.property_id },
              { label: t(T.unit),     value: lease.unit_number ?? "—" },
              { label: t(T.monthly),  value: formatCurrency(lease.monthly_rent ?? 0) },
              { label: t(T.deposit),  value: formatCurrency(lease.deposit_amount ?? 0) },
              { label: t(T.start),    value: formatDate(lease.start_date) },
              { label: t(T.end),      value: formatDate(lease.end_date) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white dark:bg-gray-900 px-5 py-3.5">
                <p className="text-[11px] text-gray-400 uppercase tracking-wide">{label}</p>
                <p className="text-[14px] font-medium text-gray-800 dark:text-gray-200 mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick access */}
      <div>
        <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide mb-2">{t(T.quick)}</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { href: "/portail/dashboard/payments",    icon: "credit-card" as const, label: lang === "fr" ? T.payHistory.fr : T.payHistory.en, color: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" },
            { href: "/portail/dashboard/maintenance", icon: "wrench"      as const, label: lang === "fr" ? T.maint.fr : T.maint.en,           color: "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400" },
            { href: "/portail/dashboard/messages",    icon: "chat"        as const, label: lang === "fr" ? T.messages.fr : T.messages.en,     color: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                <Icon name={item.icon} size={18} strokeWidth={1.8} />
              </div>
              <p className="text-[12px] font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">{item.label}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
