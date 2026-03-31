"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage } from "@/lib/LanguageContext";

const CONTENT = {
  fr: {
    category: "Croissance",
    readTime: "8 min de lecture",
    published: "10 mars 2025",
    title: "Comment faire croître votre portefeuille locatif",
    intro: "Passer de 1 à 10 logements n'est pas qu'une question de capital — c'est une question de systèmes. Les investisseurs qui réussissent à l'échelle ne travaillent pas plus fort, ils travaillent plus intelligemment.",
    sections: [
      {
        h: "1. Comprendre votre rendement réel avant d'acheter",
        p: "La première erreur des nouveaux investisseurs est d'acheter sur l'émotion plutôt que sur les chiffres. Avant chaque acquisition, calculez votre rendement brut (revenus annuels ÷ prix d'achat) et votre rendement net (après taxes, assurances, entretien, vacance locative). Un rendement brut de 7 % peut devenir 2 % net dans un marché à haute imposition. Utilisez des outils comme Domely pour modéliser vos flux de trésorerie avant même de faire une offre.",
      },
      {
        h: "2. Refinancer plutôt que vendre",
        p: "La stratégie BRRRR (Buy, Renovate, Rent, Refinance, Repeat) est l'un des moyens les plus efficaces de croître sans épuiser votre capital. En achetant un immeuble sous-évalué, en le rénovant et en le refinançant à sa nouvelle valeur, vous récupérez une partie ou la totalité de votre mise de fonds pour réinvestir. Cette approche nécessite une bonne relation avec votre institution financière et une analyse rigoureuse des coûts de rénovation.",
      },
      {
        h: "3. Acheter en bas de marché, louer au prix du marché",
        p: "De nombreux propriétaires louent en dessous du prix du marché par habitude ou par manque d'information. Une analyse de marché régulière — basée sur des appartements comparables dans votre secteur — peut révéler des opportunités d'augmentation de 10 à 20 % sans changer un locataire. Domely intègre des données de marché pour vous alerter quand vos loyers s'éloignent des prix actuels.",
      },
      {
        h: "4. Automatiser avant de croître",
        p: "Chaque propriété que vous ajoutez multiplie les tâches administratives si vous n'avez pas de systèmes en place. Avant d'acheter votre prochain immeuble, assurez-vous d'avoir automatisé la collecte des loyers, les rappels de paiement, les suivis de maintenance et la communication locataire. La croissance non organisée mène au burnout — pas à la liberté financière.",
      },
      {
        h: "5. Diversifier les marchés et les types d'actifs",
        p: "Concentrer tout votre portefeuille dans un seul quartier ou type de logement vous expose à des risques spécifiques (vacance, dévaluation, changements législatifs). Envisagez de diversifier entre résidentiel locatif standard, plex (duplex, triplex), et petits immeubles à revenus. Chaque marché canadien a ses propres règles, taux de rendement et dynamiques — la connaissance locale est un avantage compétitif.",
      },
      {
        h: "6. Constituer une équipe fiable",
        p: "Les grands portfolios se gèrent avec une équipe : un comptable spécialisé en immobilier, un courtier hypothécaire, un entrepreneur général de confiance et un gestionnaire immobilier (ou un outil comme Domely). Investir dans cette infrastructure dès le début vous permettra de passer à l'échelle sans que votre qualité de vie en souffre.",
      },
    ],
    cta: "Domely calcule votre rendement net en temps réel et vous alerte quand vos loyers s'éloignent du marché.",
    ctaBtn: "S'inscrire à la liste d'attente",
    back: "Retour aux ressources",
  },
  en: {
    category: "Growth",
    readTime: "8 min read",
    published: "March 10, 2025",
    title: "How to grow your rental portfolio",
    intro: "Going from 1 to 10 units isn't just about capital — it's about systems. Investors who scale successfully don't work harder, they work smarter.",
    sections: [
      {
        h: "1. Understand your real return before buying",
        p: "The first mistake new investors make is buying on emotion rather than numbers. Before every acquisition, calculate your gross return (annual income ÷ purchase price) and your net return (after taxes, insurance, maintenance, and vacancy). A 7% gross return can become 2% net in a high-tax market. Use tools like Domely to model your cash flow before even making an offer.",
      },
      {
        h: "2. Refinance rather than sell",
        p: "The BRRRR strategy (Buy, Renovate, Rent, Refinance, Repeat) is one of the most effective ways to grow without depleting your capital. By buying an undervalued property, renovating it and refinancing at its new value, you recover part or all of your down payment to reinvest. This approach requires a good relationship with your lender and rigorous renovation cost analysis.",
      },
      {
        h: "3. Buy below market, rent at market price",
        p: "Many landlords rent below market out of habit or lack of information. Regular market analysis — based on comparable units in your area — can reveal opportunities for 10 to 20% increases without changing tenants. Domely integrates market data to alert you when your rents diverge from current prices.",
      },
      {
        h: "4. Automate before you scale",
        p: "Every property you add multiplies your administrative tasks if you don't have systems in place. Before buying your next building, make sure you've automated rent collection, payment reminders, maintenance follow ups and tenant communication. Unorganized growth leads to burnout — not financial freedom.",
      },
      {
        h: "5. Diversify markets and asset types",
        p: "Concentrating your entire portfolio in one neighborhood or property type exposes you to specific risks (vacancy, devaluation, legislative changes). Consider diversifying between standard residential rentals, plexes (duplex, triplex), and small income properties. Each market has its own rules, return rates and dynamics — local knowledge is a competitive advantage.",
      },
      {
        h: "6. Build a reliable team",
        p: "Large portfolios are managed with a team: a real estate accountant, a mortgage broker, a trusted general contractor, and a property manager (or a tool like Domely). Investing in this infrastructure early will allow you to scale without your quality of life suffering.",
      },
    ],
    cta: "Domely calculates your net return in real time and alerts you when your rents diverge from the market.",
    ctaBtn: "Join the waitlist",
    back: "Back to resources",
  },
};

export default function GrowPortfolioPage() {
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
          <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full border mb-4 text-emerald-700 bg-emerald-50 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800">
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
            <Link href="/early-access"
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
