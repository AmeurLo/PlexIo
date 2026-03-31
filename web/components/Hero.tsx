"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { translations as T } from "@/lib/translations";
import { Icon, type IconName } from "@/lib/icons";

// ─── App Mockup (CSS rendered, swap for real screenshot via /public/screenshot-dashboard.png) ───
function AppMockup() {
  const { lang } = useLanguage();
  const fr = lang === "fr";

  return (
    <div className="relative w-full max-w-[480px] mx-auto select-none">
      {/* Floating badge — late rent alert */}
      <div className="absolute -left-6 top-20 z-10 bg-white border border-amber-100 rounded-2xl px-4 py-3 shadow-card animate-float hidden lg:flex items-center gap-3 dark:bg-gray-800 dark:border-amber-900/30">
        <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
          <Icon name="warning" size={18} className="text-amber-500" />
        </div>
        <div>
          <p className="text-[12px] font-semibold text-gray-800 dark:text-gray-100">{fr ? "2 loyers en retard" : "2 overdue rents"}</p>
          <p className="text-[11px] text-amber-500">{fr ? "Rappels envoyés automatiquement" : "Reminders sent automatically"}</p>
        </div>
      </div>

      {/* Floating badge — AI insight */}
      <div className="absolute -right-6 bottom-28 z-10 bg-white border border-violet-100 rounded-2xl px-4 py-3 shadow-card animate-float hidden lg:flex items-center gap-3 dark:bg-gray-800 dark:border-violet-900/30" style={{ animationDelay: "2s" }}>
        <div className="w-9 h-9 rounded-full bg-violet-50 flex items-center justify-center flex-shrink-0">
          <Icon name="sparkles" size={18} className="text-violet-500" />
        </div>
        <div>
          <p className="text-[12px] font-semibold text-gray-800 dark:text-gray-100">Domely AI</p>
          <p className="text-[11px] text-violet-500">{fr ? "+41$/mois possible · Unité 201" : "+$41/mo possible · Unit 201"}</p>
        </div>
      </div>

      {/* Floating badge — lease renewal */}
      <div className="absolute -right-4 top-14 z-10 bg-white border border-teal-100 rounded-2xl px-3.5 py-2.5 shadow-card animate-float hidden lg:flex items-center gap-2.5 dark:bg-gray-800 dark:border-teal-900/30" style={{ animationDelay: "4s" }}>
        <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
          <Icon name="document" size={16} className="text-teal-500" />
        </div>
        <div>
          <p className="text-[11px] font-semibold text-gray-800 dark:text-gray-100">{fr ? "Bail renouvelé" : "Lease renewed"}</p>
          <p className="text-[10px] text-teal-500">+2.5% · {fr ? "Conforme" : "Compliant"} ✓</p>
        </div>
      </div>

      {/* Phone frame */}
      <div className="relative mx-auto w-[278px] lg:w-[318px] bg-gray-900 rounded-[44px] p-[10px] shadow-[0_32px_80px_rgba(20,79,84,0.28),0_0_0_1px_rgba(255,255,255,0.05)]">
        {/* Dynamic island */}
        <div className="absolute top-[14px] left-1/2 -translate-x-1/2 w-[90px] h-[26px] bg-gray-900 rounded-full z-10 border border-gray-800" />

        {/* Screen */}
        <div className="relative bg-[#F5F7FA] rounded-[36px] overflow-hidden" style={{ height: 580 }}>
          {/* Status bar area */}
          <div className="h-10 bg-white" />

          {/* App Header */}
          <div className="bg-white px-5 pt-1 pb-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-gray-400">{fr ? "Bonjour, Alex" : "Hello, Alex"}</p>
              <p className="text-[16px] font-bold text-gray-900 tracking-tight">Alex Martin</p>
            </div>
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center">
                <span className="text-teal-700 font-bold text-[12px]">AM</span>
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 border-2 border-white flex items-center justify-center">
                <span className="text-white text-[8px] font-bold">3</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 px-4 py-3">
            {[
              { l: fr ? "Logements" : "Units",    v: "8",       c: "bg-teal-500" },
              { l: fr ? "Occupés" : "Occupied",   v: "7/8",     c: "bg-emerald-500" },
              { l: fr ? "Revenus" : "Revenue",    v: "$8,600",  c: "bg-violet-500" },
            ].map((s) => (
              <div key={s.l} className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
                <p className="text-[13px] font-bold text-gray-900">{s.v}</p>
                <p className="text-[9px] text-gray-400 mt-0.5">{s.l}</p>
                <div className={`h-0.5 ${s.c} rounded-full mt-2 opacity-40`} />
              </div>
            ))}
          </div>

          {/* Properties */}
          <div className="px-4">
            <p className="text-[10px] font-semibold text-gray-400 mb-2 uppercase tracking-widest">{fr ? "Mes immeubles" : "My properties"}</p>
            {[
              { name: "Duplex Montréal, QC",  units: fr ? "2 logements" : "2 units", paid: true,  cashFlow: "+$1,450" },
              { name: "Triplex Toronto, ON",   units: fr ? "3 logements" : "3 units", paid: false, cashFlow: "+$2,100" },
              { name: "Condo Miami, FL",       units: fr ? "1 logement"  : "1 unit",  paid: true,  cashFlow: "+$820" },
            ].map((p) => (
              <div key={p.name} className="flex items-center justify-between bg-white rounded-xl px-3.5 py-3 mb-2 shadow-[0_1px_4px_rgba(0,0,0,0.05)] border border-gray-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                       style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}>
                    <Icon name="home" size={14} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-gray-800 leading-tight">{p.name}</p>
                    <p className="text-[9px] text-gray-400">{p.units}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold text-emerald-600">{p.cashFlow}</p>
                  <div className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full ${p.paid ? "bg-teal-50 text-teal-600" : "bg-amber-50 text-amber-600"}`}>
                    {p.paid ? "✓ OK" : `⚠ ${fr ? "Retard" : "Late"}`}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom nav */}
          <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around py-2.5 px-4">
            {([
              { icon: "grid" as const, label: fr ? "Tableau" : "Board", on: true  },
              { icon: "home" as const, label: fr ? "Biens"   : "Props", on: false },
              { icon: "chat" as const, label: "Msgs",                   on: false },
              { icon: "more" as const, label: fr ? "Plus"    : "More",  on: false },
            ] as const).map((tab) => (
              <div key={tab.label} className="flex flex-col items-center gap-0.5">
                <Icon name={tab.icon} size={16} className={tab.on ? "text-teal-600" : "text-gray-300"} />
                <span className={`text-[8px] font-semibold ${tab.on ? "text-teal-600" : "text-gray-300"}`}>{tab.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}

export default function Hero() {
  const { t } = useLanguage();
  const H = T.hero;
  const scrollToHow = () => {
    document.getElementById("how")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-dot-grid" />
      <div className="absolute -top-40 -right-40 w-[900px] h-[900px] rounded-full pointer-events-none"
           style={{ background: "radial-gradient(circle, rgba(63,175,134,0.13) 0%, transparent 60%)" }} />
      <div className="absolute bottom-0 -left-40 w-[700px] h-[700px] rounded-full pointer-events-none"
           style={{ background: "radial-gradient(circle, rgba(30,122,110,0.09) 0%, transparent 60%)" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full pointer-events-none opacity-40"
           style={{ background: "radial-gradient(ellipse, rgba(63,175,134,0.06) 0%, transparent 70%)" }} />

      <div className="relative max-w-[1200px] mx-auto px-6 py-20 lg:py-28 grid lg:grid-cols-2 gap-14 items-center w-full">

        {/* ── Left copy ── */}
        <div className="max-w-xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 text-teal-700 text-[13px] font-semibold px-4 py-2 rounded-full border border-teal-200 bg-teal-50 mb-7 dark:bg-teal-900/30 dark:border-teal-800 dark:text-teal-300">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            {t(H.badge)}
          </div>

          {/* Headline */}
          <h1 className="text-[52px] lg:text-[72px] font-extrabold leading-[1.0] text-gray-900 dark:text-white mb-6">
            {t(H.h1a)}
            <br />
            <span className="text-gradient">{t(H.h1b)}</span>
          </h1>

          <p className="text-[17px] text-gray-500 dark:text-gray-400 leading-relaxed mb-8 max-w-lg">
            {t(H.sub)}
          </p>

          {/* Micro badges */}
          <div className="flex flex-wrap gap-2 mb-10">
            {[t(H.badge1), t(H.badge2), t(H.badge3)].map((b) => (
              <span key={b} className="flex items-center gap-1.5 text-[13px] font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-3.5 py-1.5 shadow-sm">
                <svg className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {b}
              </span>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 mb-9">
            <Link href="/early-access"
              className="inline-flex items-center justify-center gap-2 px-6 py-4 text-[15px] font-semibold text-white rounded-xl shadow-teal-md hover:shadow-teal-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
              style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}>
              {t(H.cta1)}
            </Link>
            <button
              onClick={scrollToHow}
              className="inline-flex items-center justify-center gap-2.5 px-6 py-4 text-[15px] font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 transition-all shadow-sm">
              <span className="w-8 h-8 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-3.5 h-3.5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
              {t(H.cta2)}
            </button>
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2.5">
              {["MG", "SA", "JL", "EB", "PC"].map((init, i) => (
                <div key={i}
                  className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                  style={{ background: `hsl(${162 + i * 14}, 48%, ${42 - i * 3}%)` }}>
                  {init}
                </div>
              ))}
            </div>
            <p className="text-[13px] text-gray-400">
              <span className="font-semibold text-gray-700 dark:text-gray-200">414 {t(H.social)}</span>
              {" · "}{t({ fr: "À 500, on ouvre les portes", en: "At 500, we launch" })}
            </p>
          </div>
        </div>

        {/* ── Right mockup ── */}
        <div className="flex justify-center lg:justify-end lg:pr-0 lg:translate-x-24">
          <AppMockup />
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="absolute bottom-0 left-0 right-0">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="bg-white dark:bg-gray-900 rounded-t-2xl shadow-card grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100 dark:divide-gray-800" style={{ border: "1px solid var(--border-subtle)" }}>
            {[
              { v: t(H.stat1v), l: t(H.stat1l) },
              { v: t(H.stat2v), l: t(H.stat2l) },
              { v: t(H.stat3v), l: t(H.stat3l) },
              { v: t(H.stat4v), l: t(H.stat4l) },
            ].map((s) => (
              <div key={s.l} className="px-6 py-6 text-center">
                <p className="text-[26px] font-bold text-gradient">{s.v}</p>
                <p className="text-[12px] mt-0.5" style={{ color: "var(--text-secondary)" }}>{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

    </section>
  );
}
