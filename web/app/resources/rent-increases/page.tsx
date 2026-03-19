"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage } from "@/lib/LanguageContext";

const CONTENT = {
  fr: {
    category: "Conformité",
    readTime: "6 min de lecture",
    published: "5 mars 2025",
    title: "Hausses de loyer : guide TAL & LTB",
    intro: "La hausse de loyer est l'un des outils les plus puissants, parmi les plus mal compris, pour optimiser vos revenus locatifs. Chaque province a ses propres règles, délais et formulaires. Ce guide couvre le Québec (TAL) et l'Ontario (LTB).",
    sections: [
      {
        h: "Québec : Le Tribunal administratif du logement (TAL)",
        p: "Au Québec, il n'existe pas de plafond légal pour les hausses de loyer, mais le TAL publie chaque année des indices de référence permettant aux locataires de contester une hausse jugée abusive. Pour augmenter le loyer, vous devez envoyer un avis écrit entre 3 et 6 mois avant l'échéance du bail (ou entre 1 et 2 mois pour un bail mensuel). L'avis doit indiquer le nouveau loyer proposé et informer le locataire de son droit de refuser dans les 30 jours. En l'absence de réponse du locataire dans ce délai, la hausse est présumée acceptée.",
      },
      {
        h: "Calcul recommandé au Québec",
        p: "Le TAL publie chaque année en janvier un tableau de fixation des loyers basé sur les variations des coûts de chauffage, taxes, assurances et entretien. Pour 2025, l'indice de référence était de 2,9 % pour les logements sans chauffage inclus. Ce taux sert de référence en cas de litige. Dépasser fortement cet indice sans justification augmente le risque de contestation. Domely calcule automatiquement la hausse recommandée basée sur vos dépenses réelles et les données du TAL.",
      },
      {
        h: "Ontario : Le Tribunal de location immobilière (LTB)",
        p: "En Ontario, les logements construits avant le 15 novembre 2018 sont soumis au contrôle des loyers (Rent Control). Le gouvernement provincial fixe chaque année un pourcentage maximal de hausse (guideline). Pour 2025, ce plafond était de 2,5 %. Pour les logements exemptés (construits après 2018), aucun plafond ne s'applique. L'avis de hausse doit être remis au locataire au moins 90 jours avant la prise d'effet, en utilisant le formulaire N1 du LTB.",
      },
      {
        h: "Hausses hors guideline en Ontario",
        p: "Si vos coûts d'exploitation ont augmenté de façon significative (rénovations majeures, hausse de taxes foncières), vous pouvez demander une hausse supérieure au guideline via le formulaire L5 auprès du LTB. Cette demande nécessite des preuves documentées et peut prendre plusieurs mois à traiter. La plupart des propriétaires évitent cette procédure en raison de sa complexité, c'est pourquoi il est essentiel d'optimiser le loyer dès la fin d'un bail.",
      },
      {
        h: "Les erreurs fréquentes à éviter",
        p: "Les erreurs les plus courantes sont : envoyer l'avis trop tard (le délai est strict), utiliser un formulaire non conforme, oublier d'inclure toutes les informations obligatoires, ou appliquer une hausse sans avis préalable. Ces erreurs peuvent invalider la hausse et vous obliger à rembourser le trop-perçu. Domely génère automatiquement des avis conformes et vous rappelle les dates limites.",
      },
      {
        h: "Stratégie de long terme",
        p: "La meilleure stratégie est d'appliquer des hausses régulières et modestes chaque année plutôt que d'attendre des années et de tenter une hausse importante d'un coup. Des hausses régulières maintiennent votre loyer proche du marché, réduisent le risque de litige et sont plus facilement acceptées par les locataires. Domely peut programmer automatiquement les rappels annuels de hausse pour chaque logement.",
      },
    ],
    cta: "Domely calcule vos hausses de loyer automatiquement selon le TAL ou la LTB et génère les avis conformes en un clic.",
    ctaBtn: "Calculer mes hausses",
    back: "Retour aux ressources",
  },
  en: {
    category: "Compliance",
    readTime: "6 min read",
    published: "March 5, 2025",
    title: "Rent increases: TAL & LTB guide",
    intro: "Rent increases are one of the most powerful, and most misunderstood, tools for optimizing your rental income. Each province has its own rules, timelines and forms. This guide covers Quebec (TAL) and Ontario (LTB).",
    sections: [
      {
        h: "Quebec: The Administrative Housing Tribunal (TAL)",
        p: "In Quebec, there is no legal cap on rent increases, but the TAL publishes annual reference indexes allowing tenants to challenge increases deemed abusive. To raise rent, you must send written notice between 3 and 6 months before the lease expires (or between 1 and 2 months for a monthly lease). The notice must state the proposed new rent and inform the tenant of their right to refuse within 30 days. If the tenant doesn't respond within this period, the increase is presumed accepted.",
      },
      {
        h: "Recommended calculation in Quebec",
        p: "The TAL publishes a rent setting table each January based on changes in heating costs, taxes, insurance and maintenance. For 2025, the reference rate was 2.9% for units without heating included. This rate serves as a reference in case of dispute. Exceeding it significantly without justification increases the risk of challenge. Domely automatically calculates the recommended increase based on your actual expenses and TAL data.",
      },
      {
        h: "Ontario: Landlord and Tenant Board (LTB)",
        p: "In Ontario, units built before November 15, 2018 are subject to rent control. The provincial government sets a maximum annual increase percentage (guideline). For 2025, this cap was 2.5%. For exempt units (built after 2018), no cap applies. The rent increase notice must be given to the tenant at least 90 days before it takes effect, using the LTB's N1 form.",
      },
      {
        h: "Above guideline increases in Ontario",
        p: "If your operating costs have increased significantly (major renovations, property tax increases), you can apply for an above guideline increase using the L5 form at the LTB. This application requires documented evidence and can take several months to process. Most landlords avoid this process due to its complexity, which is why it's essential to optimize rent at the end of each tenancy.",
      },
      {
        h: "Common mistakes to avoid",
        p: "The most common mistakes are: sending notice too late (deadlines are strict), using a noncompliant form, forgetting to include all required information, or applying an increase without prior notice. These mistakes can invalidate the increase and require you to refund any overpayment. Domely automatically generates compliant notices and reminds you of deadlines.",
      },
      {
        h: "Long term strategy",
        p: "The best strategy is to apply regular, modest increases each year rather than waiting years and attempting a large increase all at once. Regular increases keep your rent close to market rates, reduce dispute risk, and are more easily accepted by tenants. Domely can automatically schedule annual rent increase reminders for each unit.",
      },
    ],
    cta: "Domely automatically calculates your rent increases according to TAL or LTB guidelines and generates compliant notices in one click.",
    ctaBtn: "Calculate my increases",
    back: "Back to resources",
  },
};

export default function RentIncreasesPage() {
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
          <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full border mb-4 text-blue-700 bg-blue-50 border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
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
