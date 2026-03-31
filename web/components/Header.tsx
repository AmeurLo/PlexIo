"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { translations as T } from "@/lib/translations";
import { useTheme } from "@/lib/ThemeContext";
import { Icon } from "@/lib/icons";

export default function Header() {
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const NAV_LINKS = [
    { label: t(T.nav.features), href: "/#features" },
    { label: t(T.nav.how),      href: "/#how" },
    { label: t(T.nav.pricing),  href: "/#pricing" },
    { label: t(T.nav.mission),  href: "/mission" },
    { label: t(T.nav.tenants),  href: "/portail" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 glass border-b transition-all duration-300 ${
        scrolled
          ? "border-gray-200/60 dark:border-gray-700/40 shadow-sm"
          : "border-transparent"
      }`}
    >
      <div className="max-w-[1200px] mx-auto px-6 h-[60px] flex items-center justify-between gap-4">

        {/* ── Logo ─────────────────────────────────────────────────────── */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Domely" width={32} height={32} className="flex-shrink-0" />
          <span className="brand-name text-[17px]">Domely</span>
        </Link>

        {/* ── Desktop Nav ──────────────────────────────────────────────── */}
        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href}
              className="px-4 py-2 text-[14px] text-[#6d6d6d] dark:text-gray-400 font-medium hover:text-teal-600 dark:hover:text-teal-400 rounded-lg hover:bg-teal-50/60 dark:hover:bg-teal-900/30 transition-all whitespace-nowrap tracking-[-0.01em]">
              {link.label}
            </Link>
          ))}
        </nav>

        {/* ── Desktop Right ────────────────────────────────────────────── */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          {/* Lang toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 mr-1">
            {(["fr", "en"] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={`px-2.5 py-1 text-[12px] font-semibold rounded-md transition-all ${
                  lang === l ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-400 dark:text-gray-500 hover:text-gray-600"
                }`}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Dark mode toggle */}
          <button onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle dark mode">
            <Icon name={theme === "dark" ? "sun" : "moon"} size={18} className="text-gray-500 dark:text-gray-400" />
          </button>

          <Link href="/login"
            className="px-4 py-2 text-[14px] font-medium text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-lg transition-all">
            {t(T.nav.login)}
          </Link>

          <Link href="/early-access"
            className="px-4 py-2 text-[14px] font-semibold text-white rounded-lg transition-all shadow-teal-sm hover:shadow-teal-md hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
            style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}>
            {t(T.nav.cta)}
          </Link>
        </div>

        {/* ── Mobile ───────────────────────────────────────────────────── */}
        <div className="md:hidden flex items-center gap-2">
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            {(["fr", "en"] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all ${
                  lang === l ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-400"
                }`}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <button onClick={toggleTheme}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle dark mode">
            <Icon name={theme === "dark" ? "sun" : "moon"} size={16} className="text-gray-500 dark:text-gray-400" />
          </button>
          <button onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Menu">
            <div className="w-5 flex flex-col gap-1.5">
              <span className={`h-0.5 bg-gray-700 dark:bg-gray-300 rounded transition-all ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
              <span className={`h-0.5 bg-gray-700 dark:bg-gray-300 rounded transition-all ${menuOpen ? "opacity-0" : ""}`} />
              <span className={`h-0.5 bg-gray-700 dark:bg-gray-300 rounded transition-all ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
            </div>
          </button>
        </div>
      </div>

      {/* ── Mobile menu ──────────────────────────────────────────────────── */}
      {menuOpen && (
        <div className="md:hidden glass border-t border-gray-100 dark:border-gray-800 px-6 pb-5">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href}
              className="block py-3 text-[15px] font-medium text-gray-600 dark:text-gray-300 border-b border-gray-50 dark:border-gray-800 last:border-0"
              onClick={() => setMenuOpen(false)}>
              {link.label}
            </Link>
          ))}
          <div className="mt-4 flex flex-col gap-2.5">
            <Link href="/login"
              className="block text-center py-3 text-[14px] font-medium text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800 rounded-xl hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-all">
              {t(T.nav.login)}
            </Link>
            <Link href="/early-access"
              className="block text-center py-3 text-[14px] font-semibold text-white rounded-xl"
              style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}>
              {t(T.nav.cta)}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
