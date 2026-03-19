"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage } from "@/lib/LanguageContext";

const CONTENT = {
  fr: {
    category: "Maintenance",
    readTime: "5 min de lecture",
    published: "15 fév. 2025",
    title: "Gérer la maintenance efficacement",
    intro: "La maintenance est le poste de dépense le plus variable et le plus difficile à contrôler. Un bon système de maintenance réduit les coûts, prolonge la vie de vos actifs et améliore la satisfaction des locataires.",
    sections: [
      {
        h: "Maintenance préventive et corrective",
        p: "La maintenance préventive (inspections régulières, entretien planifié) coûte en moyenne 3 à 5 fois moins cher que la maintenance corrective (réparations d'urgence). Planifiez des inspections semi-annuelles de vos unités, vérifiez les systèmes de chauffage avant l'hiver et les toitures au printemps. Un propriétaire réactif paie des urgences. Un propriétaire proactif paie de l'entretien.",
      },
      {
        h: "Système de gestion des demandes",
        p: "Sans système, les demandes de réparation arrivent par texto, courriel, appel téléphonique, et certaines se perdent. Utilisez un portail dédié (comme celui de Domely) où les locataires soumettent leurs demandes avec photos. Vous recevez une notification, vous assignez un entrepreneur, vous suivez l'avancement. Zéro texto à 22h, zéro oubli.",
      },
      {
        h: "Réseau d'entrepreneurs fiables",
        p: "Votre réseau d'entrepreneurs est l'un de vos actifs les plus précieux. Identifiez et qualifiez un plombier, un électricien, un menuisier et un entrepreneur général de confiance dans chacun de vos marchés. Négociez des tarifs préférentiels en échange de volume. Payez rapidement et donnez de bons avis : les meilleurs entrepreneurs choisissent leurs clients.",
      },
      {
        h: "Protéger votre investissement long terme",
        p: "Les réparations différées sont les plus coûteuses. Une fuite non traitée peut causer des dommages à la structure pour des dizaines de milliers de dollars. Une chaudière défectueuse non remplacée peut tomber en panne en hiver, forçant un logement temporaire pour votre locataire. Traitez chaque demande de maintenance dans les 48 heures pour les urgences non prioritaires, immédiatement pour les urgences.",
      },
    ],
    cta: "Domely centralise toutes vos demandes de maintenance avec suivi en temps réel.",
    ctaBtn: "Essayer gratuitement",
    back: "Retour aux ressources",
  },
  en: {
    category: "Maintenance",
    readTime: "5 min read",
    published: "February 15, 2025",
    title: "Managing maintenance efficiently",
    intro: "Maintenance is the most variable and hardest to control expense. A good maintenance system reduces costs, extends asset life, and improves tenant satisfaction.",
    sections: [
      {
        h: "Preventive and reactive maintenance",
        p: "Preventive maintenance (regular inspections, planned upkeep) costs on average 3 to 5 times less than reactive maintenance (emergency repairs). Schedule semi annual unit inspections, check heating systems before winter and roofs in spring. A reactive landlord pays for emergencies. A proactive landlord pays for maintenance.",
      },
      {
        h: "Request management system",
        p: "Without a system, repair requests come in by text, email, phone call, and some get lost. Use a dedicated portal (like Domely's) where tenants submit requests with photos. You get a notification, assign a contractor, and track progress. Zero 10pm texts, zero forgotten repairs.",
      },
      {
        h: "Network of reliable contractors",
        p: "Your contractor network is one of your most valuable assets. Identify and qualify a plumber, electrician, carpenter, and trusted general contractor in each of your markets. Negotiate preferred rates in exchange for volume. Pay promptly and leave good reviews: the best contractors choose their clients.",
      },
      {
        h: "Protecting your long term investment",
        p: "Deferred repairs are the most expensive. An untreated leak can cause structural damage worth tens of thousands. A failing furnace not replaced can break down in winter, forcing temporary housing for your tenant. Address every maintenance request within 48 hours for non emergencies, immediately for emergencies.",
      },
    ],
    cta: "Domely centralizes all your maintenance requests with real time tracking.",
    ctaBtn: "Try for free",
    back: "Back to resources",
  },
};

export default function MaintenancePage() {
  const { lang, t } = useLanguage();
  const S = CONTENT[lang];

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white dark:bg-gray-950">
        <div className="max-w-3xl mx-auto px-6 pt-28 pb-24">

          {/* Back */}
          <Link href="/resources" className="flex w-fit items-center gap-3 text-[13px] mb-8 hover:text-teal-600 transition-colors" style={{ color: "var(--text-secondary)" }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {S.back}
          </Link>

          {/* Header */}
          <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full border mb-4 text-rose-700 bg-rose-50 border-rose-100 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800">
            {S.category}
          </span>
          <h1 className="text-[36px] sm:text-[46px] font-bold text-gray-900 dark:text-white mb-4 leading-tight tracking-tight">
            {S.title}
          </h1>
          <p className="text-[13px] mb-8" style={{ color: "var(--text-secondary)" }}>{S.readTime} · {S.published}</p>

          <p className="text-[17px] leading-relaxed text-gray-600 dark:text-gray-300 mb-12 pb-10 border-b" style={{ borderColor: "var(--border-subtle)" }}>
            {S.intro}
          </p>

          {/* Sections */}
          <div className="space-y-10">
            {S.sections.map((sec) => (
              <div key={sec.h}>
                <h2 className="text-[19px] font-bold text-gray-900 dark:text-white mb-3">{sec.h}</h2>
                <p className="text-[15px] leading-relaxed text-gray-600 dark:text-gray-300">{sec.p}</p>
              </div>
            ))}
          </div>

          {/* Domely CTA */}
          <div className="mt-16 rounded-2xl p-8 text-center" style={{ background: "linear-gradient(135deg, rgba(30,122,110,0.06), rgba(63,175,134,0.08))", border: "1px solid var(--border-subtle)" }}>
            <p className="text-[15px] text-gray-700 dark:text-gray-200 mb-5 font-medium">{S.cta}</p>
            <Link href="/login?signup=true"
              className="inline-flex items-center gap-2 px-6 py-3 text-[14px] font-semibold text-white rounded-xl transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}>
              {S.ctaBtn}
            </Link>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
