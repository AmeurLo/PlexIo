"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import DashboardHeader from "./DashboardHeader";
import AIChatWidget from "./AIChatWidget";
import WelcomeModal from "./WelcomeModal";
import OnboardingChecklist from "./OnboardingChecklist";
import { ToastProvider } from "@/lib/ToastContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

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
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* AI chat widget — floats over all dashboard pages */}
      <AIChatWidget />

      {/* Onboarding — welcome modal (first login) + activation checklist */}
      <WelcomeModal />
      <OnboardingChecklist />
    </div>
    </ToastProvider>
  );
}
