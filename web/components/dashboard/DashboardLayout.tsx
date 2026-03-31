"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "./Sidebar";
import DashboardHeader from "./DashboardHeader";
import AIChatWidget from "./AIChatWidget";
// REMOVED: redundant with OnboardingChecklist
// import WelcomeModal from "./WelcomeModal";
import OnboardingChecklist from "./OnboardingChecklist";
import ProductTour from "./ProductTour";
import GlobalSearch from "./GlobalSearch";
import { Icon } from "@/lib/icons";
import { useLanguage } from "@/lib/LanguageContext";

const MOBILE_TABS = [
  { href: "/dashboard",           icon: "grid"        as const, fr: "Accueil",   en: "Home" },
  { href: "/dashboard/rent",      icon: "credit-card" as const, fr: "Loyers",    en: "Rent" },
  { href: "/dashboard/messages",  icon: "chat"        as const, fr: "Messages",  en: "Messages" },
  { href: "/dashboard/ai",        icon: "sparkles"    as const, fr: "AI",        en: "AI" },
  { href: "/dashboard/properties",icon: "home"        as const, fr: "Plus",      en: "More" },
];
import { ToastProvider } from "@/lib/ToastContext";
import { BadgeProvider } from "@/lib/BadgeContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { lang } = useLanguage();

  // Close sidebar on navigation
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  // Lock body scroll when sidebar open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  return (
    <ToastProvider>
    <BadgeProvider>
    <div className="flex h-screen bg-[#F8FAFB] dark:bg-gray-950 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-50 lg:hidden transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DashboardHeader onMenuClick={() => setSidebarOpen(v => !v)} />
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          {children}
        </main>
      </div>

      {/* AI chat widget — floats over all dashboard pages */}
      <AIChatWidget />

      {/* Global search overlay — ⌘K / Ctrl+K */}
      <GlobalSearch />

      {/* Mobile bottom tab bar — visible on small screens only */}
      <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-stretch h-16 safe-area-inset-bottom">
        {MOBILE_TABS.map(tab => {
          const isActive = tab.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive ? "text-teal-600 dark:text-teal-400" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
              }`}
            >
              <Icon name={tab.icon} size={20} />
              <span className="text-[10px] font-medium">{lang === "fr" ? tab.fr : tab.en}</span>
              {isActive && <span className="absolute bottom-0 w-8 h-0.5 bg-teal-500 rounded-full" />}
            </Link>
          );
        })}
      </nav>

      {/* Guided product tour — spotlight walkthrough, first visit only */}
      <ProductTour />

      {/* Onboarding — activation checklist (WelcomeModal removed: redundant with OnboardingChecklist) */}
      {/* REMOVED: redundant with OnboardingChecklist */}
      {/* <WelcomeModal /> */}
      <OnboardingChecklist />
    </div>
    </BadgeProvider>
    </ToastProvider>
  );
}
