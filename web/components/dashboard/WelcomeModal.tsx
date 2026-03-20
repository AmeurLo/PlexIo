"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";

const WELCOME_KEY = "domely_welcomed";

export default function WelcomeModal() {
  const { lang } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(WELCOME_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(WELCOME_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden">

        {/* Gradient header */}
        <div className="relative px-8 pt-10 pb-8 text-center"
          style={{ background: "linear-gradient(135deg, #0f4c41 0%, #1E7A6E 50%, #3FAF86 100%)" }}>
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "radial-gradient(circle at 70% 30%, #ffffff 0%, transparent 60%)" }} />
          <img src="/logo.svg" alt="Domely" width={52} height={52} className="mx-auto mb-4 drop-shadow-lg" />
          <h1 className="text-[26px] font-bold text-white tracking-tight">
            {lang === "fr" ? "Bienvenue sur Domely 👋" : "Welcome to Domely 👋"}
          </h1>
          <p className="mt-2 text-[14px] text-teal-100">
            {lang === "fr"
              ? "Votre plateforme de gestion locative intelligente"
              : "Your smart rental management platform"}
          </p>
        </div>

        {/* Feature bullets */}
        <div className="px-8 py-6 space-y-4">
          {[
            {
              icon: "🏠",
              fr: "Gérez vos propriétés et unités",
              en: "Manage your properties and units",
              sub_fr: "Centralisez tout votre portefeuille en un seul endroit",
              sub_en: "Centralize your entire portfolio in one place",
            },
            {
              icon: "💳",
              fr: "Suivez les loyers en temps réel",
              en: "Track rent payments in real time",
              sub_fr: "Payés, en attente, en retard — d'un coup d'œil",
              sub_en: "Paid, pending, late — at a glance",
            },
            {
              icon: "✨",
              fr: "Laissez Domely AI travailler pour vous",
              en: "Let Domely AI work for you",
              sub_fr: "Automatisations, rappels, et analyse de reçus",
              sub_en: "Automations, reminders, and receipt scanning",
            },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-4">
              <span className="text-[22px] flex-shrink-0 mt-0.5">{item.icon}</span>
              <div>
                <p className="text-[14px] font-semibold text-gray-900 dark:text-white">
                  {lang === "fr" ? item.fr : item.en}
                </p>
                <p className="text-[12px] text-gray-400 mt-0.5">
                  {lang === "fr" ? item.sub_fr : item.sub_en}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="px-8 pb-8 space-y-3">
          <button
            onClick={dismiss}
            className="w-full py-3.5 text-[14px] font-bold text-white rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
            style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}>
            {lang === "fr" ? "Commencer →" : "Get started →"}
          </button>
          <p className="text-center text-[11px] text-gray-400">
            {lang === "fr"
              ? "Vous pouvez charger des données de démonstration depuis le tableau de bord."
              : "You can load demo data from the overview page."}
          </p>
        </div>

      </div>
    </div>
  );
}
