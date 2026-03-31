"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { getTenantUser, tenantLogout } from "@/lib/tenantApi";
import { Icon, type IconName } from "@/lib/icons";
import { ToastProvider } from "@/lib/ToastContext";

const NAV = [
  { href: "/portail/dashboard",             icon: "grid"        as IconName, fr: "Accueil",    en: "Overview" },
  { href: "/portail/dashboard/payments",     icon: "credit-card" as IconName, fr: "Loyers",     en: "Rent" },
  { href: "/portail/dashboard/maintenance",  icon: "wrench"      as IconName, fr: "Maintenance", en: "Maintenance" },
  { href: "/portail/dashboard/messages",     icon: "chat"        as IconName, fr: "Messages",   en: "Messages" },
  { href: "/portail/dashboard/documents",    icon: "document"    as IconName, fr: "Documents",  en: "Documents" },
];

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  const { lang, setLang } = useLanguage() as any;
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => { setUser(getTenantUser()); }, []);
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const initials = user
    ? ((user.first_name?.[0] ?? "") + (user.last_name?.[0] ?? "")).toUpperCase() || "?"
    : "?";

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#F8FAFB] dark:bg-gray-950">
        {/* Top nav bar */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 h-14 flex items-center px-4 gap-3">
          {/* Logo */}
          <Link href="/portail/dashboard" className="flex items-center gap-2 flex-shrink-0">
            <img src="/logo.svg" alt="Domely" width={26} height={26} />
            <span className="brand-name text-[16px] hidden sm:block">Domely</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 ml-4 flex-1">
            {NAV.map(item => {
              const isActive = pathname === item.href || (item.href !== "/portail/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                    isActive
                      ? "bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200"
                  }`}
                >
                  <Icon name={item.icon} size={15} strokeWidth={isActive ? 2.2 : 1.6} />
                  {lang === "fr" ? item.fr : item.en}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-2">
            {/* Lang toggle */}
            <button
              onClick={() => setLang?.(lang === "fr" ? "en" : "fr")}
              className="hidden sm:flex text-[12px] font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {lang === "fr" ? "EN" : "FR"}
            </button>

            {/* Avatar + logout */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center">
                <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400">{initials}</span>
              </div>
              {user && (
                <span className="hidden lg:block text-[13px] text-gray-700 dark:text-gray-300 font-medium">
                  {user.first_name}
                </span>
              )}
              <button
                onClick={tenantLogout}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={lang === "fr" ? "Déconnexion" : "Sign out"}
              >
                <Icon name="logout" size={16} />
              </button>
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              onClick={() => setMenuOpen(v => !v)}
            >
              <Icon name="menu" size={18} />
            </button>
          </div>
        </header>

        {/* Mobile nav drawer */}
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setMenuOpen(false)} />
            <div className="fixed top-14 inset-x-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 md:hidden">
              {NAV.map(item => {
                const isActive = pathname === item.href || (item.href !== "/portail/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-colors mb-1 ${
                      isActive
                        ? "bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <Icon name={item.icon} size={16} strokeWidth={isActive ? 2.2 : 1.6} />
                    {lang === "fr" ? item.fr : item.en}
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {/* Page content */}
        <main className="max-w-3xl mx-auto px-4 py-6">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
