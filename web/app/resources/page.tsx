"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage } from "@/lib/LanguageContext";

const ARTICLES = [
  {
    slug: "/guide",
    category: { fr: "Guide complet", en: "Full guide" },
    categoryColor: "text-teal-700 bg-teal-50 border-teal-100 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800",
    title: { fr: "Guide de gestion locative", en: "Rental management guide" },
    desc: {
      fr: "De la sélection des locataires à la gestion des litiges, tout ce qu'il faut savoir pour gérer un immeuble à revenus en Amérique du Nord.",
      en: "From tenant screening to dispute resolution, everything you need to know to manage a rental property in North America.",
    },
    read: { fr: "15 min", en: "15 min" },
    date: { fr: "15 janv. 2025", en: "Jan 15, 2025" },
    featured: true,
  },
  {
    slug: "/resources/grow-portfolio",
    category: { fr: "Croissance", en: "Growth" },
    categoryColor: "text-emerald-700 bg-emerald-50 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
    title: { fr: "Comment faire croître votre portefeuille locatif", en: "How to grow your rental portfolio" },
    desc: {
      fr: "Stratégies concrètes pour passer de 1 à 10 logements : financement, analyse de rendement, et les erreurs à éviter.",
      en: "Practical strategies to go from 1 to 10 units: financing, return analysis, and mistakes to avoid.",
    },
    read: { fr: "8 min", en: "8 min" },
    date: { fr: "10 mars 2025", en: "Mar 10, 2025" },
    featured: false,
  },
  {
    slug: "/resources/rent-increases",
    category: { fr: "Conformité", en: "Compliance" },
    categoryColor: "text-blue-700 bg-blue-50 border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    title: { fr: "Hausses de loyer : guide TAL & LTB", en: "Rent increases: TAL & LTB guide" },
    desc: {
      fr: "Comment calculer et appliquer une hausse de loyer légale au Québec (TAL) et en Ontario (LTB), avec les délais et les formulaires requis.",
      en: "How to calculate and apply a legal rent increase in Quebec (TAL) and Ontario (LTB), with required timelines and forms.",
    },
    read: { fr: "6 min", en: "6 min" },
    date: { fr: "5 mars 2025", en: "Mar 5, 2025" },
    featured: false,
  },
  {
    slug: "/resources/tenant-screening",
    category: { fr: "Locataires", en: "Tenants" },
    categoryColor: "text-violet-700 bg-violet-50 border-violet-100 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800",
    title: { fr: "Bien sélectionner ses locataires", en: "How to screen tenants effectively" },
    desc: {
      fr: "Les critères légaux et pratiques pour choisir les bons locataires, en respectant les droits de la personne et les lois provinciales.",
      en: "Legal and practical criteria for choosing the right tenants while respecting human rights and provincial laws.",
    },
    read: { fr: "5 min", en: "5 min" },
    date: { fr: "28 fév. 2025", en: "Feb 28, 2025" },
    featured: false,
  },
  {
    slug: "/resources/cash-flow",
    category: { fr: "Finances", en: "Finances" },
    categoryColor: "text-amber-700 bg-amber-50 border-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
    title: { fr: "Comprendre vos flux de trésorerie", en: "Understanding your cash flow" },
    desc: {
      fr: "Comment calculer votre rendement net réel, identifier les logements qui perdent de l'argent et optimiser vos revenus locatifs.",
      en: "How to calculate your real net return, identify units losing money, and optimize your rental income.",
    },
    read: { fr: "7 min", en: "7 min" },
    date: { fr: "20 fév. 2025", en: "Feb 20, 2025" },
    featured: false,
  },
  {
    slug: "/resources/maintenance",
    category: { fr: "Maintenance", en: "Maintenance" },
    categoryColor: "text-rose-700 bg-rose-50 border-rose-100 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800",
    title: { fr: "Gérer la maintenance efficacement", en: "Managing maintenance efficiently" },
    desc: {
      fr: "Systèmes et bonnes pratiques pour traiter les demandes de réparation rapidement, contrôler les coûts et protéger votre investissement.",
      en: "Systems and best practices to handle repair requests quickly, control costs, and protect your investment.",
    },
    read: { fr: "5 min", en: "5 min" },
    date: { fr: "15 fév. 2025", en: "Feb 15, 2025" },
    featured: false,
  },
];

export default function ResourcesPage() {
  const { t } = useLanguage();
  const featured = ARTICLES[0];
  const rest = ARTICLES.slice(1);

  return (
    <>
      <Header />
      <main className="bg-white dark:bg-gray-950">

        {/* ── Hero ──────────────────────────────────────────────────── */}
        <section className="pt-32 pb-20 relative overflow-hidden" style={{ background: "var(--bg-section)" }}>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(63,175,134,0.07) 0%, transparent 65%)", transform: "translate(30%,-30%)" }} />
          <div className="max-w-[1200px] mx-auto px-6 relative text-center">
            <span className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 text-[13px] font-semibold px-4 py-2 rounded-full border border-teal-100 mb-6 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800">
              ✦ {t({ fr: "Ressources", en: "Resources" })}
            </span>
            <h1 className="text-[42px] lg:text-[58px] font-bold text-gray-900 dark:text-white leading-[1.05] tracking-tight mb-5">
              {t({
                fr: <>Tout ce qu'il faut savoir pour <span className="text-gradient">réussir.</span></>,
                en: <>Everything you need to know to <span className="text-gradient">succeed.</span></>,
              })}
            </h1>
            <p className="text-[17px] max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
              {t({
                fr: "Guides pratiques, stratégies de croissance et conseils de conformité pour les propriétaires d'Amérique du Nord.",
                en: "Practical guides, growth strategies, and compliance tips for North American landlords.",
              })}
            </p>
          </div>
        </section>

        {/* ── Featured article ──────────────────────────────────────── */}
        <section className="py-16 bg-white dark:bg-gray-950">
          <div className="max-w-[1200px] mx-auto px-6">
            <p className="text-[12px] font-semibold uppercase tracking-widest mb-6" style={{ color: "var(--text-secondary)" }}>
              {t({ fr: "À la une", en: "Featured" })}
            </p>
            <Link href={featured.slug} className="group block rounded-2xl p-8 lg:p-10 transition-all hover:shadow-lg"
              style={{ border: "1px solid var(--border-subtle)", background: "linear-gradient(135deg, rgba(30,122,110,0.04) 0%, rgba(63,175,134,0.06) 100%)" }}>
              <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                <div className="flex-1">
                  <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full border mb-4 ${featured.categoryColor}`}>
                    {t(featured.category)}
                  </span>
                  <h2 className="text-[26px] lg:text-[32px] font-bold text-gray-900 dark:text-white mb-3 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                    {t(featured.title)}
                  </h2>
                  <p className="text-[15px] leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>
                    {t(featured.desc)}
                  </p>
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-[13px] font-medium text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
                      {t({ fr: "Lire", en: "Read" })} · {t(featured.read)}
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                    <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>{t(featured.date)}</span>
                  </div>
                </div>
                {/* Decorative illustration */}
                <div className="flex-shrink-0 w-full lg:w-48 h-32 lg:h-40 rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #1E7A6E22, #3FAF8633)" }}>
                  <svg className="w-16 h-16 text-teal-500 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* ── Article grid ──────────────────────────────────────────── */}
        <section className="pb-24" style={{ background: "var(--bg-section)" }}>
          <div className="max-w-[1200px] mx-auto px-6 pt-16">
            <p className="text-[12px] font-semibold uppercase tracking-widest mb-8" style={{ color: "var(--text-secondary)" }}>
              {t({ fr: "Tous les articles", en: "All articles" })}
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rest.map((a) => (
                <Link key={a.slug} href={a.slug}
                  className="group bg-white dark:bg-gray-900 rounded-2xl p-6 flex flex-col transition-all hover:shadow-lg"
                  style={{ border: "1px solid var(--border-subtle)" }}>
                  <span className={`self-start inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full border mb-4 ${a.categoryColor}`}>
                    {t(a.category)}
                  </span>
                  <h3 className="text-[17px] font-bold text-gray-900 dark:text-white mb-2.5 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors leading-snug">
                    {t(a.title)}
                  </h3>
                  <p className="text-[13px] leading-relaxed flex-1 mb-4" style={{ color: "var(--text-secondary)" }}>
                    {t(a.desc)}
                  </p>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[12px] font-medium text-teal-600 dark:text-teal-400 flex items-center gap-1">
                      {t({ fr: "Lire", en: "Read" })} · {t(a.read)}
                      <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                    <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{t(a.date)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────── */}
        <section className="py-20 bg-white dark:bg-gray-950">
          <div className="max-w-[1200px] mx-auto px-6 text-center">
            <h2 className="text-[32px] font-bold text-gray-900 dark:text-white mb-4">
              {t({ fr: <>Prêt à mettre tout ça en pratique ?</>, en: <>Ready to put this into practice?</> })}
            </h2>
            <p className="text-[16px] mb-8" style={{ color: "var(--text-secondary)" }}>
              {t({ fr: "Domely automatise tout ce que vous venez de lire.", en: "Domely automates everything you just read." })}
            </p>
            <Link href="/login?signup=true"
              className="inline-flex items-center gap-2 px-7 py-3 text-[15px] font-semibold text-white rounded-xl transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}>
              {t({ fr: "Essayer gratuitement · 14 jours", en: "Try free · 14 days" })}
            </Link>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
