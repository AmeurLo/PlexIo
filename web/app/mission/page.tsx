"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage } from "@/lib/LanguageContext";

const PILLARS = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    color: "from-teal-500 to-teal-600",
    title: { fr: "Bâti par des propriétaires, pour des propriétaires", en: "Built by landlords, for landlords" },
    desc: {
      fr: "Domely n'a pas été conçu en salle de conférence. Il est né d'une frustration vécue : gérer des logements avec des textos, des fichiers Excel et des rappels sur Post-it. Nous avons construit ce qu'on aurait voulu avoir.",
      en: "Domely wasn't designed in a boardroom. It was born from a lived frustration: managing units with texts, Excel files, and Post-it reminders. We built what we wished we had.",
    },
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    color: "from-emerald-500 to-teal-500",
    title: { fr: "Élever le standard de l'industrie", en: "Raising the industry standard" },
    desc: {
      fr: "Nous croyons qu'un propriétaire bien équipé est un meilleur propriétaire. Quand la gestion est simple et transparente, tout le monde en bénéficie — les propriétaires comme les locataires.",
      en: "We believe a well-equipped landlord is a better landlord. When management is simple and transparent, everyone benefits — landlords and tenants alike.",
    },
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    color: "from-blue-500 to-teal-500",
    title: { fr: "Construire pour le long terme", en: "Building for the long term" },
    desc: {
      fr: "Nous ne cherchons pas la croissance à tout prix. Nous bâtissons une entreprise durable, avec des produits qui fonctionnent vraiment — et des clients qui restent parce qu'ils en ont envie, pas parce qu'ils sont piégés.",
      en: "We don't chase growth at any cost. We build a sustainable company with products that actually work — and customers who stay because they want to, not because they're locked in.",
    },
  },
];

const VALUES = [
  {
    title: { fr: "Intégrité", en: "Integrity" },
    desc: {
      fr: "On dit ce qu'on fait. On fait ce qu'on dit. Pas de frais cachés, pas de promesses qu'on ne peut pas tenir, pas de pratiques trompeuses — jamais.",
      en: "We say what we do. We do what we say. No hidden fees, no promises we can't keep, no misleading practices — ever.",
    },
  },
  {
    title: { fr: "La simplicité comme promesse", en: "Simplicity as a promise" },
    desc: {
      fr: "On offre une plateforme puissante, sans la complexité qui vient habituellement avec. Pas de jargon, pas de courbe d'apprentissage, pas de manuel. Nos clients se concentrent sur ce qui compte vraiment — leurs immeubles, leurs locataires, leur patrimoine. Le reste, c'est notre problème.",
      en: "We offer a powerful platform, without the complexity that usually comes with it. No jargon, no learning curve, no manual. Our clients focus on what truly matters — their properties, their tenants, their wealth. The rest is our problem.",
    },
  },
  {
    title: { fr: "Excellence", en: "Excellence" },
    desc: {
      fr: "Nous refusons le compromis sur la qualité. Ce qu'on livre doit fonctionner, point. Pas presque, pas la plupart du temps — toujours.",
      en: "We refuse to compromise on quality. What we deliver must work, full stop. Not almost, not most of the time — always.",
    },
  },
  {
    title: { fr: "Impact réel", en: "Real impact" },
    desc: {
      fr: "On ne mesure pas notre succès en fonctionnalités lancées. On le mesure en heures récupérées, en revenus optimisés et en problèmes réellement résolus pour nos clients.",
      en: "We don't measure success in features shipped. We measure it in hours reclaimed, revenue optimized, and problems genuinely solved for our clients.",
    },
  },
];

export default function MissionPage() {
  const { t, lang } = useLanguage();

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
              {lang === "fr"
                ? <>Bâtir un patrimoine ne devrait pas être <span className="text-gradient">aussi compliqué.</span></>
                : <>Building wealth <span className="text-gradient">shouldn't be this hard.</span></>
              }
            </h1>
            <p className="text-[18px] max-w-2xl leading-relaxed mb-10" style={{ color: "var(--text-secondary)" }}>
              {t({
                fr: "Domely est né d'une frustration simple : gérer un portefeuille locatif demandait trop de temps, trop de paperasse et trop d'incertitude. Nous avons construit la plateforme que nous aurions voulu avoir.",
                en: "Domely was born from a simple frustration: managing a rental portfolio took too much time, too much paperwork, and too much uncertainty. We built the platform we wished we had.",
              })}
            </p>
            <Link
              href="/early-access"
              className="inline-flex items-center gap-2 px-6 py-3 text-[15px] font-semibold text-white rounded-xl transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}
            >
              {t({ fr: "S'inscrire à la liste d'attente", en: "Join the waitlist" })}
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
              {lang === "fr"
                ? <>Rejoignez les propriétaires qui gèrent <span className="text-gradient">mieux.</span></>
                : <>Join the landlords who manage <span className="text-gradient">better.</span></>
              }
            </h2>
            <p className="text-[17px] mb-8 max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>
              {t({
                fr: "Rejoignez les premiers. Gelez votre prix pour toujours.",
                en: "Join the first wave. Lock your price forever.",
              })}
            </p>
            <Link
              href="/early-access"
              className="inline-flex items-center gap-2 px-8 py-3.5 text-[16px] font-semibold text-white rounded-xl transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}
            >
              {t({ fr: "S'inscrire à la liste d'attente", en: "Join the waitlist" })}
            </Link>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
