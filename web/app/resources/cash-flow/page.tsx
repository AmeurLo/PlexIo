"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage } from "@/lib/LanguageContext";

const CONTENT = {
  fr: {
    category: "Finances",
    readTime: "7 min de lecture",
    published: "20 fév. 2025",
    title: "Comprendre vos flux de trésorerie locatifs",
    intro: "La majorité des propriétaires ne connaissent pas leur vrai rendement. Revenus bruts moins dépenses réelles — le résultat peut surprendre. Voici comment calculer et optimiser vos flux de trésorerie.",
    sections: [
      {
        h: "Revenus vs rendement brut",
        p: "Le rendement brut se calcule simplement : (loyers annuels ÷ prix d'achat) × 100. Mais ce chiffre ne tient pas compte des dépenses. Un duplex à 400 000$ générant 30 000$ de loyers affiche un rendement brut de 7,5% — mais une fois les taxes, assurances, entretien et vacance locative déduits, le rendement net peut tomber à 3-4%.",
      },
      {
        h: "Les dépenses souvent oublié",
        p: "Les propriétaires sous-estiment systématiquement : la vacance locative (prévoir 5% des revenus), l'entretien courant (prévoir 1% de la valeur du bien par an), les frais de gestion, les réparations majeures (toiture, fondations, systèmes mécaniques), et les frais juridiques en cas de litige. Construire un fonds de réserve de 5-10% des loyers est essentiel.",
      },
      {
        h: "L'analyse avant achat",
        p: "Avant d'acheter un immeuble, modélisez trois scénarios : optimiste (pleine occupation, loyers au marché), réaliste (5% de vacance, dépenses normales) et pessimiste (10-15% de vacance, réparation majeure l'an 1). Si le scénario pessimiste génère encore un flux positif, l'investissement est solide. Si non, revoyez le prix ou l'offre.",
      },
      {
        h: "Identifier les logements déficitaires",
        p: "Dans un portefeuille de plusieurs unités, certains logements peuvent drainer vos finances sans que vous le réalisiez. Des loyers en dessous du marché, des dépenses d'entretien élevées ou une mauvaise localisation peuvent transformer un actif en passif. Domely vous donne une vue par logement de vos flux nets, pour agir où ça compte.",
      },
    ],
    cta: "Domely calcule vos flux de trésorerie nets en temps réel, par logement et par portefeuille.",
    ctaBtn: "Voir mes rendements",
    back: "Retour aux ressources",
  },
  en: {
    category: "Finances",
    readTime: "7 min read",
    published: "February 20, 2025",
    title: "Understanding your rental cash flow",
    intro: "Most landlords don't know their real return. Gross income minus actual expenses — the result can be surprising. Here's how to calculate and optimize your cash flow.",
    sections: [
      {
        h: "Income vs gross return",
        p: "Gross return is simple: (annual rent ÷ purchase price) × 100. But this doesn't account for expenses. A duplex at $400,000 generating $30,000 in rent shows a 7.5% gross return — but once taxes, insurance, maintenance and vacancy are deducted, net return can drop to 3-4%.",
      },
      {
        h: "Often-forgotten expenses",
        p: "Landlords systematically underestimate: vacancy (budget 5% of revenues), routine maintenance (budget 1% of property value per year), management fees, major repairs (roof, foundations, mechanical systems), and legal fees in case of dispute. Building a reserve fund of 5-10% of rents is essential.",
      },
      {
        h: "Prepurchase analysis",
        p: "Before buying a property, model three scenarios: optimistic (full occupancy, market rents), realistic (5% vacancy, normal expenses), and pessimistic (10-15% vacancy, major repair in year 1). If the pessimistic scenario still generates positive cash flow, the investment is solid. If not, revisit the price or the offer.",
      },
      {
        h: "Identifying loss making units",
        p: "In a multi-unit portfolio, some units may drain your finances without you realizing it. Below-market rents, high maintenance costs, or poor location can turn an asset into a liability. Domely gives you a per-unit view of your net cash flows, so you can act where it matters.",
      },
    ],
    cta: "Domely calculates your net cash flows in real time, by unit and by portfolio.",
    ctaBtn: "See my returns",
    back: "Back to resources",
  },
};

export default function CashFlowPage() {
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
          <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full border mb-4 text-amber-700 bg-amber-50 border-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">
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
