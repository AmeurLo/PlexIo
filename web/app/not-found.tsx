"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";

const T = {
  code:    { fr: "404", en: "404" },
  title:   { fr: "Page introuvable", en: "Page not found" },
  sub:     { fr: "Cette page n'existe pas ou a été déplacée.", en: "This page doesn't exist or has been moved." },
  cta:     { fr: "Retour à l'accueil", en: "Back to home" },
};

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center px-5 text-center">
      <p className="text-[80px] font-extrabold text-gray-100 dark:text-gray-800 leading-none mb-4 select-none">
        {t(T.code)}
      </p>
      <h1 className="text-[28px] font-bold text-gray-900 dark:text-white mb-3">
        {t(T.title)}
      </h1>
      <p className="text-[16px] text-gray-400 dark:text-gray-500 mb-8 max-w-sm">
        {t(T.sub)}
      </p>
      <Link
        href="/"
        className="px-6 py-3 text-[14px] font-semibold text-white rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
        style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}
      >
        {t(T.cta)}
      </Link>
    </div>
  );
}
