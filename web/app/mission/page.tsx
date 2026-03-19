"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage } from "@/lib/LanguageContext";

const PILLARS = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    color: "from-teal-500 to-teal-600",
    title: { fr: "Autonomiser les investisseurs", en: "Empower investors" },
    desc: {
      fr: "Nous donnons aux propriétaires et investisseurs les outils, les données et l'intelligence artificielle pour prendre de meilleures décisions, plus vite. Gérer un portefeuille locatif ne devrait pas exiger une équipe.",
      en: "We give landlords and investors the tools, data, and AI to make better decisions, faster. Managing a rental portfolio shouldn't require a full team.",
    },
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: "from-emerald-500 to-teal-500",
    title: { fr: "Offrir une expérience locataire exceptionnelle", en: "Elevate the tenant experience" },
    desc: {
      fr: "Les locataires méritent un propriétaire professionnel. Notre portail locataire permet de soumettre des demandes, consulter les documents et communiquer facilement — le tout sans appel à 22h.",
      en: "Tenants deserve a professional landlord. Our tenant portal makes it easy to submit requests, access documents, and communicate clearly — no more calls at 10pm.",
    },
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    color: "from-blue-500 to-teal-500",
    title: { fr: "Croître intelligemment", en: "Grow smarter" },
    desc: {
      fr: "Domely vous donne une vision claire de votre rendement réel : flux de trésorerie, taux d'occupation, hausses optimales. Parce que croître sans données, c'est naviguer à l'aveugle.",
      en: "Domely gives you a clear picture of your real returns: cash flow, occupancy rates, optimal rent increases. Because growing without data is flying blind.",
    },
  },
];

const VALUES = [
  {
    title: { fr: "Transparence", en: "Transparency" },
    desc: {
      fr: "Pas de frais cachés. Pas de langage juridique opaque. Vous savez exactement ce que vous payez et pourquoi.",
      en: "No hidden fees. No opaque legalese. You know exactly what you're paying for and why.",
    },
  },
  {
    title: { fr: "Efficacité", en: "Efficiency" },
    desc: {
      fr: "Chaque fonctionnalité de Domely a été conçue pour vous faire gagner du temps. Ce que d'autres font en une journée, vous le faites en 10 minutes.",
      en: "Every Domely feature is designed to save you time. What others do in a day, you do in 10 minutes.",
    },
  },
  {
    title: { fr: "Croissance", en: "Growth" },
    desc: {
      fr: "Nous ne sommes pas juste un outil de gestion — nous sommes votre partenaire pour augmenter vos revenus et agrandir votre portefeuille sereinement.",
      en: "We're not just a management tool — we're your partner for increasing revenue and growing your portfolio with confidence.",
    },
  },
  {
    title: { fr: "Conformité", en: "Compliance" },
    desc: {
      fr: "Les lois locatives changent. Domely vous tient informé et génère automatiquement les documents conformes, pour que vous ne manquiez jamais une échéance.",
      en: "Rental laws change. Domely keeps you informed and automatically generates compliant documents so you never miss a deadline.",
    },
  },
];

export default function MissionPage() {
  const { t } = useLanguage();

  return (
    <>
      <Header />
      <main className="bg-white dark:bg-gray-950">

        {/* ── Hero ──────────────────────────────────────────────────── */}
        <section className="pt-32 pb-20 relative overflow-hidden" style={{ background: "var(--bg-section)" }}>
          {/* Blob */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(63,175,134,0.08) 0%, transparent 65%)", transform: "translate(30%, -30%)" }} />

          <div className="max-w-[1200px] mx-auto px-6 relative">
            <span className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 text-[13px] font-semibold px-4 py-2 rounded-full border border-teal-100 mb-6 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800">
              ✦ {t({ fr: "Qui nous sommes", en: "Who we are" })}
            </span>
            <h1 className="text-[44px] lg:text-[64px] font-bold text-gray-900 dark:text-white leading-[1.05] tracking-tight mb-6 max-w-3xl">
              {t({
                fr: <>Chaque propriétaire mérite de gérer <span className="text-gradient">comme un pro.</span></>,
                en: <>Every landlord deserves to manage <span className="text-gradient">like a pro.</span></>,
              })}
            </h1>
            <p className="text-[18px] max-w-2xl leading-relaxed mb-10" style={{ color: "var(--text-secondary)" }}>
              {t({
                fr: "Domely est né d'une frustration simple : gérer un portefeuille locatif demandait trop de temps, trop de paperasse et trop d'incertitude. Nous avons construit la plateforme que nous aurions voulu avoir.",
                en: "Domely was born from a simple frustration: managing a rental portfolio took too much time, too much paperwork, and too much uncertainty. We built the platform we wished we had.",
              })}
            </p>
            <Link
              href="/login?signup=true"
              className="inline-flex items-center gap-2 px-6 py-3 text-[15px] font-semibold text-white rounded-xl transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}
            >
              {t({ fr: "Essayer gratuitement", en: "Try for free" })}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>

        {/* ── Mission pillars ───────────────────────────────────────── */}
        <section className="py-24 bg-white dark:bg-gray-950">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-[38px] lg:text-[52px] font-bold text-gray-900 dark:text-white mb-4">
                {t({ fr: "Notre ", en: "Our " })}
                <span className="text-gradient">{t({ fr: "mission", en: "mission" })}</span>
              </h2>
              <p className="text-[17px] max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
                {t({
                  fr: "Trois engagements au coeur de tout ce que nous construisons.",
                  en: "Three commitments at the heart of everything we build.",
                })}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {PILLARS.map((p, i) => (
                <div key={i} className="rounded-2xl p-8" style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-section)" }}>
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${p.color} flex items-center justify-center text-white mb-6`}>
                    {p.icon}
                  </div>
                  <h3 className="text-[18px] font-bold text-gray-900 dark:text-white mb-3">{t(p.title)}</h3>
                  <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{t(p.desc)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Story ────────────────────────────────────────────────── */}
        <section className="py-24" style={{ background: "var(--bg-section)" }}>
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <span className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 text-[13px] font-semibold px-4 py-2 rounded-full border border-teal-100 mb-6 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800">
                  ✦ {t({ fr: "Notre histoire", en: "Our story" })}
                </span>
                <h2 className="text-[32px] lg:text-[42px] font-bold text-gray-900 dark:text-white mb-6 leading-tight">
                  {t({
                    fr: "Construit au Québec. Conçu pour toute l'Amérique du Nord.",
                    en: "Built in Quebec. Designed for all of North America.",
                  })}
                </h2>
                <div className="space-y-4 text-[15px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  <p>
                    {t({
                      fr: "Domely a été fondé par une équipe ayant vécu de l'intérieur les défis de la gestion locative : oublis de hausses de loyer, litiges au TAL, locataires difficiles à joindre. Nous avons réalisé que les propriétaires n'avaient pas besoin d'un simple logiciel de plus, ils avaient besoin d'un vrai partenaire.",
                      en: "Domely was founded by a team who experienced rental management challenges firsthand: missed rent increase deadlines, TAL disputes, tenants hard to reach. We realized landlords didn't need just another piece of software — they needed a real partner.",
                    })}
                  </p>
                  <p>
                    {t({
                      fr: "Nous avons conçu Domely pour s'adapter aux réalités nord-américaines : le TAL au Québec, la LTB en Ontario, et les lois locatives dans chaque province et État. Un seul outil, toute la conformité.",
                      en: "We designed Domely to adapt to North American realities: the TAL in Quebec, the LTB in Ontario, and rental laws across every province and state. One tool, full compliance.",
                    })}
                  </p>
                  <p>
                    {t({
                      fr: "Aujourd'hui, Domely aide des centaines de propriétaires à récupérer des centaines d'heures par année, à augmenter leurs revenus locatifs et à offrir de meilleures conditions à leurs locataires.",
                      en: "Today, Domely helps hundreds of landlords reclaim hundreds of hours per year, increase their rental income, and provide better conditions for their tenants.",
                    })}
                  </p>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { v: "500h+", l: { fr: "Redonnées aux propriétaires", en: "Given back to landlords" } },
                  { v: "14 j", l: { fr: "Essai gratuit, sans carte", en: "Free trial, no card" } },
                  { v: "$0", l: { fr: "Frais cachés", en: "Hidden fees" } },
                  { v: "< 10 min", l: { fr: "Pour démarrer", en: "To get started" } },
                ].map((s) => (
                  <div key={s.v} className="rounded-2xl p-6 text-center bg-white dark:bg-gray-900"
                    style={{ border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-card)" }}>
                    <p className="text-[36px] font-bold text-gradient leading-none mb-2">{s.v}</p>
                    <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>{t(s.l)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Values ───────────────────────────────────────────────── */}
        <section className="py-24 bg-white dark:bg-gray-950">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-[38px] lg:text-[52px] font-bold text-gray-900 dark:text-white mb-4">
                {t({ fr: "Nos ", en: "Our " })}
                <span className="text-gradient">{t({ fr: "valeurs", en: "values" })}</span>
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {VALUES.map((v, i) => (
                <div key={i} className="rounded-2xl p-6" style={{ border: "1px solid var(--border-subtle)" }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-bold text-white mb-4"
                    style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}>
                    {i + 1}
                  </div>
                  <h3 className="text-[16px] font-bold text-gray-900 dark:text-white mb-2">{t(v.title)}</h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{t(v.desc)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────── */}
        <section className="py-20" style={{ background: "var(--bg-section)" }}>
          <div className="max-w-[1200px] mx-auto px-6 text-center">
            <h2 className="text-[32px] lg:text-[44px] font-bold text-gray-900 dark:text-white mb-4">
              {t({
                fr: <>Rejoignez les propriétaires qui gèrent <span className="text-gradient">mieux.</span></>,
                en: <>Join the landlords who manage <span className="text-gradient">better.</span></>,
              })}
            </h2>
            <p className="text-[17px] mb-8 max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>
              {t({
                fr: "14 jours gratuits. Aucune carte requise. Configuré en moins de 10 minutes.",
                en: "14 days free. No credit card required. Set up in under 10 minutes.",
              })}
            </p>
            <Link
              href="/login?signup=true"
              className="inline-flex items-center gap-2 px-8 py-3.5 text-[16px] font-semibold text-white rounded-xl transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}
            >
              {t({ fr: "Démarrer gratuitement", en: "Start for free" })}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
