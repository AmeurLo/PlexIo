"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { translations as T } from "@/lib/translations";

const TESTIMONIALS = [
  {
    initials: "MG", color: "from-teal-500 to-teal-600", stars: 5,
    name: "Michel Gagnon",
    role: { fr: "Propriétaire · Montréal, QC", en: "Landlord · Montréal, QC" },
    tag:  { fr: "Automatisations", en: "Automations" },
    quote: {
      fr: "Je passais des heures par mois à courir après les loyers. Maintenant tout part automatiquement. Et l'IA m'a révélé que je louais plusieurs unités sous le prix du marché dans mon quartier.",
      en: "I used to spend hours a month chasing rent. Now everything runs automatically. And the AI showed me I was pricing several units below the going rate in my area.",
    },
  },
  {
    initials: "SM", color: "from-violet-500 to-violet-600", stars: 5,
    name: "S.M.",
    role: { fr: "Investisseuse · Toronto, ON", en: "Investor · Toronto, ON" },
    tag:  { fr: "Procédures locatives", en: "Rental procedures" },
    quote: {
      fr: "Avant j'avais toujours peur de mal calculer les hausses et d'avoir une plainte à la LTB. Domely calcule tout automatiquement et génère les avis conformes. Un stress de moins, vraiment.",
      en: "I used to worry about miscalculating rent increases and getting an LTB complaint. Domely calculates everything automatically and generates compliant notices. One less thing to stress about.",
    },
  },
  {
    initials: "JR", color: "from-blue-500 to-blue-600", stars: 5,
    name: "J.R.",
    role: { fr: "Propriétaire · Ottawa, ON", en: "Landlord · Ottawa, ON" },
    tag:  { fr: "Portail locataire", en: "Tenant portal" },
    quote: {
      fr: "Mon locataire soumet ses demandes dans le portail, je reçois une notification et je gère. Zéro texto à 22h. Pour ce que ça coûte par mois, c'est l'un des meilleurs investissements que j'aie faits.",
      en: "My tenant submits requests through the portal, I get a notification and handle it. Zero texts at 10pm. For what it costs per month, it's one of the best investments I've made.",
    },
  },
  {
    initials: "ST", color: "from-emerald-500 to-teal-500", stars: 5,
    name: "Sophie Tremblay",
    role: { fr: "Propriétaire · Québec, QC", en: "Landlord · Québec, QC" },
    tag:  { fr: "Hausses de loyer", en: "Rent increases" },
    quote: {
      fr: "En 10 minutes, j'avais calculé les hausses pour mes 6 logements, généré les avis et planifié les envois. Avant, ça me prenait une journée et j'avais toujours peur d'avoir fait une erreur.",
      en: "In 10 minutes I calculated increases for all 6 units, generated the notices and scheduled the sends. Before, it took me a full day and I always worried I'd made a mistake.",
    },
  },
  {
    initials: "DC", color: "from-indigo-500 to-blue-500", stars: 5,
    name: "D.C.",
    role: { fr: "Investisseur · Vancouver, BC", en: "Investor · Vancouver, BC" },
    tag:  { fr: "Finances & ROI", en: "Finances & ROI" },
    quote: {
      fr: "J'avais des tableurs partout et je n'arrivais jamais à savoir mon vrai rendement. Domely me donne mes flux de trésorerie nets en temps réel. J'ai identifié deux logements qui me coûtaient de l'argent sans que je le sache.",
      en: "I had spreadsheets everywhere and could never figure out my real returns. Domely gives me net cash flow in real time. I found two units that were actually losing me money without me knowing.",
    },
  },
  {
    initials: "IL", color: "from-pink-500 to-rose-500", stars: 5,
    name: "Isabelle Lavoie",
    role: { fr: "Gestionnaire · Laval, QC", en: "Manager · Laval, QC" },
    tag:  { fr: "Domely AI", en: "Domely AI" },
    quote: {
      fr: "J'ai posé une question sur un litige de dépôt de garantie en Ontario. L'IA m'a donné la marche à suivre exacte selon la LTB, avec les délais légaux. Mon avocat aurait facturé 300 $ pour ça.",
      en: "I asked about a security deposit dispute in Ontario. The AI gave me the exact LTB procedure with legal deadlines. My lawyer would have charged $300 for that.",
    },
  },
  {
    initials: "RM", color: "from-amber-500 to-orange-500", stars: 5,
    name: "Robert MacLeod",
    role: { fr: "Propriétaire · Ottawa, ON", en: "Landlord · Ottawa, ON" },
    tag:  { fr: "Maintenance", en: "Maintenance" },
    quote: {
      fr: "Mon locataire a signalé une fuite via le portail à 23h. J'ai reçu la notification le matin, dispatché mon entrepreneur en un clic et tout était réglé avant midi. Sans Domely, j'aurais eu un appel de panique.",
      en: "My tenant reported a leak through the portal at 11pm. I got the notification in the morning, dispatched my contractor in one click and it was resolved before noon. Without Domely, I'd have gotten a panic call.",
    },
  },
  {
    initials: "AB", color: "from-cyan-500 to-teal-500", stars: 5,
    name: "Alexandre Bouchard",
    role: { fr: "Investisseur · Calgary, AB", en: "Investor · Calgary, AB" },
    tag:  { fr: "Finances & ROI", en: "Finances & ROI" },
    quote: {
      fr: "J'ai 9 logements à Calgary et je n'avais aucune visibilité sur mon rendement réel après taxes et dépenses. Domely m'a montré que deux de mes triplex sous performaient. J'ai pu ajuster et récupérer plus de 8 000 $ par an.",
      en: "I have 9 units in Calgary and had zero visibility on my real return after taxes and expenses. Domely showed me two of my triplexes were underperforming. I adjusted and recovered over $8,000 a year.",
    },
  },
  {
    initials: "LP", color: "from-fuchsia-500 to-pink-500", stars: 5,
    name: "Linda Park",
    role: { fr: "Propriétaire · Edmonton, AB", en: "Landlord · Edmonton, AB" },
    tag:  { fr: "Sélection locataires", en: "Tenant screening" },
    quote: {
      fr: "J'ai eu de mauvaises expériences par le passé avec des locataires non fiables. Le processus de sélection de Domely avec vérification documentaire intégrée m'a aidée à trouver d'excellents locataires pour mes deux propriétés.",
      en: "I had bad experiences with unreliable tenants in the past. Domely's screening process with built-in document verification helped me find excellent tenants for both my properties.",
    },
  },
  {
    initials: "FC", color: "from-sky-500 to-blue-500", stars: 5,
    name: "François Côté",
    role: { fr: "Propriétaire · Gatineau, QC", en: "Landlord · Gatineau, QC" },
    tag:  { fr: "Procédures locatives", en: "Rental procedures" },
    quote: {
      fr: "Gérer des logements à la fois au Québec et en Ontario, c'est deux régimes légaux différents. Domely connaît les deux : avis TAL du bon côté, formulaires LTB de l'autre. Je n'ai plus à jongler entre les règles.",
      en: "Managing units in both Quebec and Ontario means two different legal regimes. Domely knows both: proper TAL notices on one side, LTB forms on the other. I no longer have to juggle the rules.",
    },
  },
  {
    initials: "AT", color: "from-orange-500 to-rose-500", stars: 5,
    name: "Amanda Torres",
    role: { fr: "Investisseuse · Miami, FL", en: "Investor · Miami, FL" },
    tag:  { fr: "Domely AI", en: "Domely AI" },
    quote: {
      fr: "Je pensais que Domely était pour le Canada seulement. Mais l'IA connaît aussi la législation floridienne sur les dépôts de garantie et les préavis de résiliation. C'est l'outil le plus complet que j'aie trouvé pour gérer mon parc en Floride.",
      en: "I thought Domely was Canada-only. But the AI also knows Florida law on security deposits and eviction notices. It's the most complete tool I've found for managing my Florida portfolio.",
    },
  },
];

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(n)].map((_, i) => (
        <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

function TestimonialCard({ tc, t }: { tc: typeof TESTIMONIALS[0]; t: (v: { fr: string; en: string }) => string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 flex flex-col h-full relative overflow-hidden flex-shrink-0"
         style={{ border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-card)" }}>
      {/* Decorative quote */}
      <div className="absolute top-4 right-6 text-[80px] font-serif leading-none text-teal-100 dark:text-teal-900/40 select-none pointer-events-none">&ldquo;</div>

      <div className="flex items-center justify-between mb-6 relative">
        <Stars n={tc.stars} />
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full text-white bg-gradient-to-r ${tc.color}`}>
          {t(tc.tag)}
        </span>
      </div>

      <blockquote className="text-[14px] leading-relaxed flex-1 mb-6 relative" style={{ color: "var(--text-secondary)" }}>
        &ldquo;{t(tc.quote)}&rdquo;
      </blockquote>

      <div className="flex items-center gap-3 pt-5 border-t" style={{ borderColor: "var(--border-subtle)" }}>
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${tc.color} flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0`}>
          {tc.initials}
        </div>
        <div>
          <p className="text-[13px] font-semibold text-gray-900 dark:text-white">{tc.name}</p>
          <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>{t(tc.role)}</p>
        </div>
      </div>
    </div>
  );
}

export default function Testimonials() {
  const { t } = useLanguage();
  const TS = T.testimonials;

  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // How many cards visible: 1 mobile, 3 desktop
  // Track by "page" of 3 for desktop
  const total = TESTIMONIALS.length;

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % total);
    }, 5000);
  };

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const go = (idx: number) => {
    setCurrent((idx + total) % total);
    startTimer();
  };

  // Build visible set: 3 cards starting at current
  const visibleIdx = [0, 1, 2].map((offset) => (current + offset) % total);

  return (
    <section className="py-24 lg:py-32 dark:bg-gray-950 overflow-hidden" style={{ background: "var(--bg-section)" }}>
      <div className="max-w-[1200px] mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 text-[13px] font-semibold px-4 py-2 rounded-full border border-teal-100 mb-5 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800">
            ✦ {t(TS.badge)}
          </span>
          <h2 className="text-[38px] lg:text-[52px] font-bold text-gray-900 dark:text-white mb-4">
            {t(TS.h2a)}{" "}
            <span className="text-gradient">{t(TS.h2b)}</span>
          </h2>
          <p className="text-[17px] max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>{t(TS.sub)}</p>
        </div>

        {/* Desktop: 3 cards */}
        <div className="hidden md:grid grid-cols-3 gap-6 mb-10">
          {visibleIdx.map((idx) => (
            <div key={idx} className="transition-all duration-500">
              <TestimonialCard tc={TESTIMONIALS[idx]} t={t} />
            </div>
          ))}
        </div>

        {/* Mobile: 1 card */}
        <div className="md:hidden mb-10">
          <TestimonialCard tc={TESTIMONIALS[current]} t={t} />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 mb-14">
          {/* Prev */}
          <button
            onClick={() => go(current - 1)}
            className="w-9 h-9 rounded-full flex items-center justify-center border transition-all hover:border-teal-400 hover:text-teal-600"
            style={{ border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
            aria-label="Previous">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Dots */}
          <div className="flex gap-2">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === current
                    ? "w-6 h-2 bg-teal-500"
                    : "w-2 h-2 bg-gray-300 dark:bg-gray-600 hover:bg-teal-300"
                }`}
                aria-label={`Go to ${i + 1}`}
              />
            ))}
          </div>

          {/* Next */}
          <button
            onClick={() => go(current + 1)}
            className="w-9 h-9 rounded-full flex items-center justify-center border transition-all hover:border-teal-400 hover:text-teal-600"
            style={{ border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
            aria-label="Next">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Stats row */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card p-8" style={{ border: "1px solid var(--border-subtle)" }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center">
            <div className="text-center">
              <p className="text-[48px] font-bold text-gradient">4.9</p>
              <div className="flex justify-center mt-1 mb-1"><Stars n={5} /></div>
              <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>{t(TS.ratingLabel)}</p>
            </div>
            {TS.stats.map((s) => (
              <div key={s.label.fr} className="text-center">
                <p className="text-[40px] font-bold text-gray-800 dark:text-gray-100">{s.value}</p>
                <p className="text-[13px] mt-1" style={{ color: "var(--text-secondary)" }}>{t(s.label)}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
