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
            {lang === "fr" ? "Bienvenue sur Domely" : "Welcome to Domely"}
          </h1>
          <p className="mt-2 text-[14px] text-teal-100">
            {lang === "fr"
              ? "Votre plateforme de gestion locative intelligente"
              : "Your smart rental management platform"}
          </p>
        </div>

        {/* Feature bullets */}
        <div className="px-8 py-6 space-y-4">
          {([
            {
              d: "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25",
              fr: "Gérez vos propriétés et unités",
              en: "Manage your properties and units",
              sub_fr: "Centralisez tout votre portefeuille en un seul endroit",
              sub_en: "Centralize your entire portfolio in one place",
            },
            {
              d: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z",
              fr: "Suivez les loyers en temps réel",
              en: "Track rent payments in real time",
              sub_fr: "Payés, en attente, en retard — d'un coup d'œil",
              sub_en: "Paid, pending, late — at a glance",
            },
            {
              d: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z",
              fr: "Laissez Domely AI travailler pour vous",
              en: "Let Domely AI work for you",
              sub_fr: "Automatisations, rappels, et analyse de reçus",
              sub_en: "Automations, reminders, and receipt scanning",
            },
          ] as { d: string; fr: string; en: string; sub_fr: string; sub_en: string }[]).map((item, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={item.d} /></svg>
              </div>
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
