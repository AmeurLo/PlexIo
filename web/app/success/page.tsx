"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";

const T = {
  title: { fr: "Bienvenue chez Domely !", en: "Welcome to Domely!" },
  sub:   {
    fr: "Votre abonnement est actif. Téléchargez l'application mobile pour commencer à gérer votre parc locatif.",
    en: "Your subscription is active. Download the mobile app to start managing your rental portfolio.",
  },
  appTitle: { fr: "Accéder à l'application", en: "Access the app" },
  dashboard: { fr: "Aller au tableau de bord", en: "Go to dashboard" },
  home:      { fr: "Retour à l'accueil", en: "Back to home" },
};

export default function SuccessPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center px-5 text-center">
      {/* Checkmark */}
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{ background: "linear-gradient(135deg, #1E7A6E22, #3FAF8633)", border: "1px solid #3FAF8644" }}>
        <svg className="w-10 h-10 text-teal-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>

      <h1 className="text-[32px] font-extrabold tracking-tight text-gray-900 dark:text-white mb-3">
        {t(T.title)}
      </h1>
      <p className="text-[16px] text-gray-500 dark:text-gray-400 max-w-md mb-10 leading-relaxed">
        {t(T.sub)}
      </p>

      {/* App store badges */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <a href="#"
          className="flex items-center gap-3 bg-gray-900 dark:bg-gray-800 text-white px-5 py-3 rounded-xl hover:bg-gray-800 transition-colors">
          <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
          </svg>
          <div className="text-left">
            <p className="text-[10px] text-gray-400 leading-none mb-0.5">Télécharger sur</p>
            <p className="text-[14px] font-semibold leading-none">App Store</p>
          </div>
        </a>
        <a href="#"
          className="flex items-center gap-3 bg-gray-900 dark:bg-gray-800 text-white px-5 py-3 rounded-xl hover:bg-gray-800 transition-colors">
          <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 20.5v-17c0-.83 1.01-1.3 1.7-.8l14 8.5c.6.37.6 1.27 0 1.63l-14 8.5c-.69.5-1.7.03-1.7-.83z"/>
          </svg>
          <div className="text-left">
            <p className="text-[10px] text-gray-400 leading-none mb-0.5">Disponible sur</p>
            <p className="text-[14px] font-semibold leading-none">Google Play</p>
          </div>
        </a>
      </div>

      <div className="flex gap-3">
        <Link href="/dashboard"
          className="px-6 py-3 text-[14px] font-semibold text-white rounded-xl shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
          style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}>
          {t(T.dashboard)}
        </Link>
        <Link href="/"
          className="px-6 py-3 text-[14px] font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          {t(T.home)}
        </Link>
      </div>
    </div>
  );
}
