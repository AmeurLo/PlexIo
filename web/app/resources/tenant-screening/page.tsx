"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage } from "@/lib/LanguageContext";

const CONTENT = {
  fr: {
    category: "Locataires",
    readTime: "5 min de lecture",
    published: "28 fév. 2025",
    title: "Bien sélectionner ses locataires",
    intro: "Choisir le bon locataire est la décision la plus importante d'un propriétaire. Une mauvaise sélection peut coûter des mois de procédures, des milliers de dollars en loyers impayés et des dégâts importants.",
    sections: [
      {
        h: "Vérification de crédit et revenus",
        p: "Exigez systématiquement une vérification de crédit (avec consentement écrit du candidat). Le ratio revenus/loyer recommandé est de 3:1, un candidat gagnant 3 fois le loyer mensuel est généralement en mesure de payer. Vérifiez l'historique de paiement plutôt que le score brut.",
      },
      {
        h: "Références des anciens propriétaires",
        p: "Contactez toujours les deux derniers propriétaires (pas seulement le plus récent). Posez des questions précises : payait-il à temps ? A-t-il causé des problèmes de voisinage ? Recommanderiez-vous ce locataire ? Méfiez-vous des références trop courtes ou trop évasives.",
      },
      {
        h: "Droits de la personne et location",
        p: "Au Canada, il est illégal de refuser un locataire en raison de la race, l'origine ethnique, la religion, le genre, l'âge (sauf exceptions), la situation de famille ou le handicap. Les critères de sélection doivent être basés sur des éléments financiers et comportementaux objectifs. Documentez toujours vos critères et votre processus de décision.",
      },
      {
        h: "Entrevue et visite",
        p: "L'entrevue est votre meilleure chance d'évaluer un candidat. Posez des questions ouvertes : pourquoi quittez-vous votre logement actuel ? Depuis combien de temps êtes-vous chez votre employeur actuel ? Avez-vous des animaux ? Combien de personnes habiteront l'appartement ? Notez les réponses et comparez les candidats objectivement.",
      },
      {
        h: "Contrat de location conforme",
        p: "Une fois le candidat choisi, assurez-vous de signer un bail conforme aux lois provinciales. Au Québec, le bail standard du TAL est obligatoire. En Ontario, le standard lease form est requis depuis 2018. Un bail non conforme peut être difficile à faire respecter en cas de litige.",
      },
    ],
    cta: "Domely centralise tous vos dossiers de candidature et génère des baux conformes automatiquement.",
    ctaBtn: "S'inscrire à la liste d'attente",
    back: "Retour aux ressources",
  },
  en: {
    category: "Tenants",
    readTime: "5 min read",
    published: "February 28, 2025",
    title: "How to screen tenants effectively",
    intro: "Choosing the right tenant is a landlord's most important decision. A bad selection can cost months of proceedings, thousands in unpaid rent, and significant damage.",
    sections: [
      {
        h: "Credit and income verification",
        p: "Systematically require a credit check (with the applicant's written consent). The recommended income to rent ratio is 3:1, an applicant earning 3x the monthly rent can generally afford it. Check payment history rather than the raw score.",
      },
      {
        h: "Previous landlord references",
        p: "Always contact the last two landlords (not just the most recent). Ask specific questions: did they pay on time? Did they cause neighbor issues? Would you recommend them? Be wary of references that are too short or too vague.",
      },
      {
        h: "Human rights and rental",
        p: "In Canada, it is illegal to refuse a tenant based on race, ethnicity, religion, gender, age (with exceptions), family status, or disability. Selection criteria must be based on objective financial and behavioral factors. Always document your criteria and decision process.",
      },
      {
        h: "Interview and showing",
        p: "The interview is your best chance to assess a candidate. Ask open questions: why are you leaving your current place? How long have you been with your current employer? Do you have pets? How many people will live in the unit? Note the answers and compare candidates objectively.",
      },
      {
        h: "Compliant lease agreement",
        p: "Once you've chosen your candidate, make sure to sign a lease that complies with provincial laws. In Quebec, the TAL standard lease is mandatory. In Ontario, the standard lease form has been required since 2018. A noncompliant lease can be difficult to enforce in case of dispute.",
      },
    ],
    cta: "Domely centralizes all your rental applications and automatically generates compliant leases.",
    ctaBtn: "Join the waitlist",
    back: "Back to resources",
  },
};

export default function TenantScreeningPage() {
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
          <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full border mb-4 text-violet-700 bg-violet-50 border-violet-100 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800">
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
