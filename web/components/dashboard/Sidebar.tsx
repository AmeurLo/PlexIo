"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/lib/icons";
import { useLanguage } from "@/lib/LanguageContext";
import { getUser } from "@/lib/auth";
import { useBadges } from "@/lib/BadgeContext";

// ─── Navigation groups ────────────────────────────────────────────────────────
// Daily:     what a landlord checks every day — rent, maintenance, messages.
// Portfolio: the core objects you manage — properties, tenants, leases, pipeline.
// Finances:  money in/out, analytics, automations.
// Admin:     people you work with + app settings.

const NAV_TOP = [
  { href: "/dashboard", icon: "grid" as const, fr: "Tableau de bord", en: "Overview" },
];

const NAV_DAILY = [
  { href: "/dashboard/rent",        icon: "credit-card" as const, fr: "Loyers",      en: "Rent" },
  { href: "/dashboard/maintenance", icon: "wrench"      as const, fr: "Maintenance", en: "Maintenance" },
  { href: "/dashboard/messages",    icon: "chat"        as const, fr: "Messages",    en: "Messages" },
  { href: "/dashboard/tasks",       icon: "calendar"    as const, fr: "Tâches",      en: "Tasks" },
];

const NAV_PORTFOLIO = [
  { href: "/dashboard/properties", icon: "home"     as const, fr: "Propriétés",  en: "Properties" },
  { href: "/dashboard/tenants",    icon: "users"    as const, fr: "Locataires",  en: "Tenants" },
  { href: "/dashboard/leases",     icon: "document" as const, fr: "Baux",        en: "Leases" },
  { href: "/dashboard/documents",  icon: "document" as const, fr: "Documents",   en: "Documents" },
  { href: "/dashboard/applicants", icon: "users"    as const, fr: "Candidats",   en: "Applicants" },
];

const NAV_FINANCES = [
  { href: "/dashboard/expenses",    icon: "dollar"    as const, fr: "Finances",        en: "Finances" },
  { href: "/dashboard/insights",    icon: "chart-bar" as const, fr: "Analytiques",     en: "Analytics" },
  { href: "/dashboard/automations", icon: "zap"       as const, fr: "Automatisations", en: "Automations" },
];

const NAV_ADMIN = [
  { href: "/dashboard/contractors", icon: "briefcase" as const, fr: "Entrepreneurs", en: "Contractors" },
  { href: "/dashboard/settings",    icon: "user"      as const, fr: "Paramètres",    en: "Settings" },
];

interface Props { onClose?: () => void }

export default function Sidebar({ onClose }: Props) {
  const pathname = usePathname();
  const { lang } = useLanguage();
  const [isAdmin, setIsAdmin] = useState(false);
  const badges = useBadges();

  useEffect(() => {
    setIsAdmin(getUser()?.is_admin === true);
  }, []);

  // Map href → badge count
  const badgeFor = (href: string): number => {
    if (href === "/dashboard/rent")        return badges.lateRent;
    if (href === "/dashboard/maintenance") return badges.openMaintenance;
    if (href === "/dashboard/messages")    return badges.unreadMessages;
    return 0;
  };

  function NavLink({ href, icon, fr, en }: { href: string; icon: IconName; fr: string; en: string }) {
    const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
    const count = badgeFor(href);
    return (
      <Link
        href={href}
        onClick={onClose}
        className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 ${
          isActive
            ? "bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300"
            : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-800 dark:hover:text-gray-200"
        }`}
      >
        {/* Active left-border accent */}
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-teal-500 dark:bg-teal-400" />
        )}
        <Icon
          name={icon}
          size={16}
          strokeWidth={isActive ? 2.2 : 1.6}
          className={isActive
            ? "text-teal-600 dark:text-teal-400"
            : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300"}
        />
        <span className="tracking-[-0.01em] flex-1">{lang === "fr" ? fr : en}</span>
        {count > 0 && (
          <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center leading-none ${
            href === "/dashboard/rent"
              ? "bg-red-500 text-white"
              : href === "/dashboard/messages"
              ? "bg-blue-500 text-white"
              : "bg-orange-500 text-white"
          }`}>
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    );
  }

  function SectionLabel({ fr, en }: { fr: string; en: string }) {
    return (
      <p className="px-3 pt-5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] select-none"
        style={{ color: "#B0B0B0" }}>
        {lang === "fr" ? fr : en}
      </p>
    );
  }

  return (
    <div className="h-full w-[260px] bg-white dark:bg-gray-950 border-r border-gray-100 dark:border-gray-800/80 flex flex-col">

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-[60px] flex-shrink-0">
        <img src="/logo.svg" alt="Domely" width={30} height={30} className="flex-shrink-0" />
        <span className="brand-name text-[18px]">Domely</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">

        {/* Overview sits alone at the top — the dashboard entry point */}
        <div className="pt-3">
          {NAV_TOP.map(item => <NavLink key={item.href} {...item} />)}
        </div>

        {/* Daily — what you check every day */}
        <SectionLabel fr="Quotidien" en="Daily" />
        {NAV_DAILY.map(item => <NavLink key={item.href} {...item} />)}
        {/* Domely AI — opens the floating chat widget from any page */}
        <button
          onClick={() => { window.dispatchEvent(new CustomEvent("domely:openAI")); onClose?.(); }}
          className="group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-800 dark:hover:text-gray-200"
        >
          <Icon name="sparkles" size={16} strokeWidth={1.6} className="text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
          <span className="tracking-[-0.01em]">{lang === "fr" ? "Domely AI" : "Domely AI"}</span>
        </button>

        {/* Portfolio — your properties, tenants and tenant pipeline */}
        <SectionLabel fr="Portefeuille" en="Portfolio" />
        {NAV_PORTFOLIO.map(item => <NavLink key={item.href} {...item} />)}

        {/* Finances — expenses, analytics, automations */}
        <SectionLabel fr="Finances" en="Finances" />
        {NAV_FINANCES.map(item => <NavLink key={item.href} {...item} />)}

        {/* Admin — people you work with + app settings */}
        <SectionLabel fr="Admin" en="Admin" />
        {NAV_ADMIN.map(item => <NavLink key={item.href} {...item} />)}

        {/* Super-admin panel — only visible to admins */}
        {isAdmin && (
          <NavLink href="/dashboard/admin" icon="shield" fr="Administration" en="Admin Panel" />
        )}

      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800/80">
        <p className="text-[11px] text-gray-300 dark:text-gray-700">© {new Date().getFullYear()} Domely</p>
      </div>
    </div>
  );
}
