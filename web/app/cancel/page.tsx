"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";

const T = {
  title: { fr: "Paiement annulé", en: "Payment cancelled" },
  sub:   {
    fr: "Votre paiement n'a pas été complété. Aucun montant n'a été débité.",
    en: "Your payment was not completed. You have not been charged.",
  },
  retry:  { fr: "Réessayer",         en: "Try again" },
  home:   { fr: "Retour à l'accueil", en: "Back to home" },
  help:   { fr: "Besoin d'aide ?",    en: "Need help?" },
};

export default function CancelPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center px-5 text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-gray-100 dark:bg-gray-800">
        <svg className="w-9 h-9 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>

      <h1 className="text-[32px] font-extrabold tracking-tight text-gray-900 dark:text-white mb-3">
        {t(T.title)}
      </h1>
      <p className="text-[16px] text-gray-500 dark:text-gray-400 max-w-sm mb-10 leading-relaxed">
        {t(T.sub)}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Link href="/#pricing"
          className="px-6 py-3 text-[14px] font-semibold text-white rounded-xl shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
          style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}>
          {t(T.retry)}
        </Link>
        <Link href="/"
          className="px-6 py-3 text-[14px] font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          {t(T.home)}
        </Link>
      </div>

      <Link href="/contact" className="text-[13px] text-teal-600 dark:text-teal-400 hover:underline">
        {t(T.help)}
      </Link>
    </div>
  );
}
