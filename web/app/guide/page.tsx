"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage } from "@/lib/LanguageContext";

const content = {
  fr: {
    badge: "Ressources",
    title: "Guide de gestion locative",
    subtitle: "Tout ce qu'un propriétaire nord-américain doit savoir pour bien gérer ses logements, rester conforme et maximiser ses revenus.",
    meta: "Lecture : 12 min · Mis à jour mars 2025",
    toc: "Table des matières",
    tocItems: [
      "Sélectionner les bons locataires",
      "Vos obligations légales",
      "Gérer les loyers et paiements",
      "Entretien et réparations",
      "Hausses de loyer : quand et comment",
      "Renouvellement de bail",
      "Situations difficiles",
      "Faire croître votre portefeuille",
    ],
    cta: {
      title: "Automatisez tout ce que vous venez de lire.",
      sub: "Domely gère la conformité, les hausses, les rappels et bien plus, à votre place.",
      btn: "Essayer gratuitement",
    },
    sections: [
      {
        num: "01",
        title: "Sélectionner les bons locataires",
        body: [
          "Le choix du locataire est la décision la plus importante que vous prendrez. Un mauvais locataire peut coûter des mois de loyer impayé, des dommages et des procédures judiciaires longues.",
          "Vérifiez systématiquement : la cote de crédit (minimum recommandé : 650), les références des anciens propriétaires, les revenus (ratio loyer/revenu idéal : moins de 33 %), et l'identité.",
          "En Ontario et au Québec, vous ne pouvez pas refuser un locataire pour des motifs protégés par les lois sur les droits de la personne (origine ethnique, statut familial, handicap, etc.). Documentez vos critères de sélection et appliquez-les uniformément.",
          "Conseil : demandez toujours une lettre de référence du propriétaire précédent, et appelez pour confirmer. Un courriel seul ne suffit pas.",
        ],
      },
      {
        num: "02",
        title: "Vos obligations légales",
        body: [
          "Les lois locatives varient selon la province et l'État. Voici les grands principes communs :",
          "Au Québec (TAL) : le bail doit être sur le formulaire officiel. Les hausses sont encadrées par un indice annuel. Un préavis de 3 à 6 mois est requis selon la durée du bail.",
          "En Ontario (LTB) : la Annual Rent Increase Guideline fixe le maximum autorisé chaque année (2,5 % en 2025). Un préavis de 90 jours est obligatoire. Les logements construits après 2018 sont exemptés du plafond.",
          "Aux États-Unis : les règles varient par État et même par ville. Des villes comme New York, Los Angeles ou San Francisco ont des lois de contrôle des loyers strictes. Vérifiez toujours les règles locales avant de fixer ou d'augmenter un loyer.",
          "Conservez une copie de tous les documents : baux signés, avis envoyés, reçus de paiement. En cas de litige, la documentation est votre meilleure protection.",
        ],
      },
      {
        num: "03",
        title: "Gérer les loyers et paiements",
        body: [
          "Établissez des attentes claires dès le départ : date d'échéance du loyer, mode de paiement accepté, politique en cas de retard.",
          "Offrez le paiement en ligne. Les locataires qui paient en ligne paient plus régulièrement et plus ponctuellement. C'est aussi plus facile à tracer pour vous.",
          "En cas de retard, envoyez un rappel dès le lendemain de l'échéance. Ne laissez pas les retards s'accumuler sans réponse formelle. Après 3 semaines sans paiement, entamez les démarches prévues par la loi dans votre région.",
          "Gardez un registre de tous les paiements. En cas de litige, vous devrez prouver quels loyers ont été payés ou non.",
        ],
      },
      {
        num: "04",
        title: "Entretien et réparations",
        body: [
          "En tant que propriétaire, vous avez l'obligation légale de maintenir le logement en bon état habitable. Cela inclut le chauffage, la plomberie, l'électricité et la structure du bâtiment.",
          "Répondez aux demandes d'entretien par écrit, même par message texte ou courriel. Gardez une trace de toutes les communications.",
          "Les réparations urgentes (chauffage défaillant en hiver, dégât d'eau) doivent être traitées dans les 24 à 48 heures. Les réparations non urgentes doivent avoir un délai raisonnable, généralement 30 jours.",
          "Faites des inspections annuelles documentées avec photos. C'est votre protection si un locataire cause des dommages et nie en être responsable.",
          "Planifiez les grands travaux à l'avance : toiture, fenêtres, systèmes de chauffage. Un entretien préventif coûte toujours moins cher qu'une réparation d'urgence.",
        ],
      },
      {
        num: "05",
        title: "Hausses de loyer : quand et comment",
        body: [
          "Une hausse de loyer bien calculée est l'un des leviers les plus puissants pour améliorer votre rendement. Mais mal exécutée, elle peut coûter cher.",
          "Respectez le processus légal sans exception : préavis requis, formulaire officiel si applicable, montant dans les limites autorisées. Une hausse non conforme peut être annulée par le tribunal.",
          "Comparez votre loyer actuel au marché de votre quartier. Si vos loyers sont 15 % sous le marché, une stratégie de hausse progressive sur 2 à 3 ans peut significativement améliorer votre revenu net.",
          "Communiquez la hausse de façon professionnelle. Un propriétaire qui explique clairement le contexte (coûts d'exploitation, taxes, entretien) obtient moins de résistance qu'un simple avis juridique impersonnel.",
          "Ne jamais appliquer une hausse en représailles ou comme pression pour faire partir un locataire. C'est illégal partout au Canada et aux États-Unis.",
        ],
      },
      {
        num: "06",
        title: "Renouvellement de bail",
        body: [
          "Le renouvellement est une opportunité, pas une formalité. C'est le moment d'ajuster le loyer, de mettre à jour les conditions et de confirmer la relation avec un bon locataire.",
          "Envoyez votre avis de renouvellement dans les délais légaux, même si vous n'augmentez pas le loyer. Un défaut de préavis peut compliquer une éventuelle reprise de logement.",
          "Si vous souhaitez ne pas renouveler, les motifs légaux sont limités : reprise pour usage personnel, cession à un proche, travaux majeurs. Hors de ces cas, le locataire a le droit de rester au Québec et en Ontario.",
          "Un locataire en place depuis plusieurs années avec un bon historique vaut souvent plus que de trouver quelqu'un de nouveau. L'inoccupation et la recherche d'un nouveau locataire coûtent en moyenne 1 à 2 mois de loyer.",
        ],
      },
      {
        num: "07",
        title: "Situations difficiles",
        body: [
          "Loyers impayés : entamez les démarches légales rapidement. Chaque semaine d'hésitation est une semaine de loyer perdu. Au Québec, déposez une demande au TAL. En Ontario, déposez un formulaire N4 puis un L1 à la LTB.",
          "Dommages au logement : documentez immédiatement avec photos et estimations écrites de professionnels. Le dépôt de garantie (là où il est autorisé) couvre rarement l'intégralité des dommages. Réclamez le reste par voie légale si nécessaire.",
          "Locataires perturbateurs : suivez le processus formel. Un avertissement écrit, puis une mise en demeure, puis une demande de résiliation si le comportement persiste. Ne jamais harceler un locataire ou couper les services — c'est illégal.",
          "Travaux et accès : donnez toujours un préavis écrit de 24 heures minimum avant d'entrer dans le logement, sauf urgence. Le droit au logement paisible du locataire est protégé par la loi.",
        ],
      },
      {
        num: "08",
        title: "Faire croître votre portefeuille",
        body: [
          "Avant d'acheter un deuxième immeuble, maîtrisez les finances du premier. Calculez votre taux de capitalisation, votre flux de trésorerie net et votre rendement sur fonds propres.",
          "Le refinancement stratégique permet de tirer des capitaux d'un immeuble existant pour en financer un autre, sans vendre. Discutez avec un courtier hypothécaire spécialisé en immobilier locatif.",
          "Diversifiez géographiquement si possible. Un portefeuille concentré dans une seule ville est exposé aux variations du marché local.",
          "Automatisez la gestion opérationnelle dès que possible. Plus vous consacrez de temps aux tâches administratives, moins vous en avez pour trouver et analyser de nouvelles opportunités.",
          "Tenez des livres de comptes rigoureusement. Un bon suivi financier vous permet de maximiser vos déductions fiscales, de préparer des refinancements et de vendre à meilleur prix le moment venu.",
        ],
      },
    ],
  },
  en: {
    badge: "Resources",
    title: "Rental Management Guide",
    subtitle: "Everything a North American landlord needs to know to manage properties well, stay compliant and maximize returns.",
    meta: "Reading time: 12 min · Updated March 2025",
    toc: "Table of contents",
    tocItems: [
      "Finding the right tenants",
      "Your legal obligations",
      "Managing rent and payments",
      "Maintenance and repairs",
      "Rent increases: when and how",
      "Lease renewals",
      "Difficult situations",
      "Growing your portfolio",
    ],
    cta: {
      title: "Automate everything you just read.",
      sub: "Domely handles compliance, increases, reminders and much more, on your behalf.",
      btn: "Try for free",
    },
    sections: [
      {
        num: "01",
        title: "Finding the right tenants",
        body: [
          "Choosing your tenant is the most important decision you'll make. A bad tenant can cost months of unpaid rent, property damage and lengthy legal proceedings.",
          "Always check: credit score (recommended minimum: 650), references from previous landlords, income (ideal rent-to-income ratio: under 33%), and identity.",
          "In Ontario and Quebec, you cannot refuse a tenant based on grounds protected by human rights laws (ethnic origin, family status, disability, etc.). Document your selection criteria and apply them consistently.",
          "Tip: always ask for a reference letter from the previous landlord, and call to confirm. An email alone is not enough.",
        ],
      },
      {
        num: "02",
        title: "Your legal obligations",
        body: [
          "Rental laws vary by province and state. Here are the key common principles:",
          "In Quebec (TAL): the lease must use the official form. Increases are governed by an annual index. A notice of 3 to 6 months is required depending on lease duration.",
          "In Ontario (LTB): the Annual Rent Increase Guideline sets the maximum allowed each year (2.5% in 2025). A 90-day notice is mandatory. Units built after 2018 are exempt from the cap.",
          "In the United States: rules vary by state and even by city. Cities like New York, Los Angeles and San Francisco have strict rent control laws. Always check local rules before setting or raising rent.",
          "Keep copies of all documents: signed leases, notices sent, payment receipts. In case of dispute, documentation is your best protection.",
        ],
      },
      {
        num: "03",
        title: "Managing rent and payments",
        body: [
          "Set clear expectations from day one: rent due date, accepted payment methods, late payment policy.",
          "Offer online payment. Tenants who pay online pay more regularly and on time. It's also much easier for you to track.",
          "For late payments, send a reminder the day after the due date. Don't let delays accumulate without a formal response. After 3 weeks without payment, begin the legal steps applicable in your region.",
          "Keep a record of all payments. In case of dispute, you'll need to prove which rents were paid or not.",
        ],
      },
      {
        num: "04",
        title: "Maintenance and repairs",
        body: [
          "As a landlord, you have a legal obligation to maintain the unit in a habitable condition. This includes heating, plumbing, electricity and building structure.",
          "Respond to maintenance requests in writing, even by text or email. Keep a record of all communications.",
          "Urgent repairs (failed heating in winter, water damage) must be addressed within 24 to 48 hours. Non-urgent repairs should have a reasonable timeline, generally 30 days.",
          "Conduct documented annual inspections with photos. This protects you if a tenant causes damage and denies responsibility.",
          "Plan major work in advance: roofing, windows, heating systems. Preventive maintenance always costs less than emergency repairs.",
        ],
      },
      {
        num: "05",
        title: "Rent increases: when and how",
        body: [
          "A well-calculated rent increase is one of the most powerful levers to improve your returns. But done wrong, it can be costly.",
          "Follow the legal process without exception: required notice, official form if applicable, amount within authorized limits. A non-compliant increase can be overturned by a tribunal.",
          "Compare your current rent to market rates in your neighborhood. If your rents are 15% below market, a gradual increase strategy over 2 to 3 years can significantly improve your net income.",
          "Communicate the increase professionally. A landlord who clearly explains the context (operating costs, taxes, maintenance) gets less pushback than an impersonal legal notice.",
          "Never apply an increase as retaliation or to pressure a tenant to leave. This is illegal throughout Canada and the United States.",
        ],
      },
      {
        num: "06",
        title: "Lease renewals",
        body: [
          "Renewal is an opportunity, not a formality. It's the time to adjust rent, update terms and confirm the relationship with a good tenant.",
          "Send your renewal notice within legal deadlines, even if you're not raising rent. Failure to give notice can complicate any future lease termination.",
          "If you don't wish to renew, legal grounds are limited: personal use, transfer to a family member, major renovations. Outside these cases, the tenant has the right to stay in Quebec and Ontario.",
          "A long-standing tenant with a good track record is often worth more than finding someone new. Vacancy and finding a new tenant typically costs 1 to 2 months of rent.",
        ],
      },
      {
        num: "07",
        title: "Difficult situations",
        body: [
          "Unpaid rent: begin legal proceedings quickly. Every week of hesitation is a week of lost rent. In Quebec, file with the TAL. In Ontario, file an N4 form then an L1 with the LTB.",
          "Unit damage: document immediately with photos and written estimates from professionals. The security deposit (where allowed) rarely covers all damages. Claim the rest through legal channels if necessary.",
          "Disruptive tenants: follow the formal process. A written warning, then a formal notice, then a termination request if the behavior persists. Never harass a tenant or cut services — it's illegal.",
          "Work and access: always give a written notice of at least 24 hours before entering the unit, except in emergencies. The tenant's right to peaceful enjoyment is protected by law.",
        ],
      },
      {
        num: "08",
        title: "Growing your portfolio",
        body: [
          "Before buying a second property, master the finances of your first. Calculate your capitalization rate, net cash flow and return on equity.",
          "Strategic refinancing lets you pull equity from an existing property to finance another, without selling. Talk to a mortgage broker who specializes in rental real estate.",
          "Diversify geographically where possible. A portfolio concentrated in one city is exposed to local market fluctuations.",
          "Automate operational management as soon as possible. The more time you spend on administrative tasks, the less you have to find and analyze new opportunities.",
          "Keep rigorous financial records. Good financial tracking lets you maximize tax deductions, prepare for refinancing and sell at a better price when the time comes.",
        ],
      },
    ],
  },
};

export default function GuidePage() {
  const { lang } = useLanguage();
  const C = content[lang];

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white dark:bg-gray-950 pt-24 pb-20">
        <div className="max-w-5xl mx-auto px-5">

          {/* ── Header ── */}
          <div className="max-w-2xl mb-14">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[12px] font-semibold bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border border-teal-100 dark:border-teal-800 mb-5">
              {C.badge}
            </span>
            <h1 className="text-[38px] sm:text-[48px] font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight mb-4">
              {C.title}
            </h1>
            <p className="text-[16px] text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
              {C.subtitle}
            </p>
            <p className="text-[12px] text-gray-400 dark:text-gray-500">{C.meta}</p>
          </div>

          <div className="grid lg:grid-cols-4 gap-10">

            {/* ── Table of contents (sticky) ── */}
            <aside className="hidden lg:block lg:col-span-1">
              <div className="sticky top-24 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
                  {C.toc}
                </p>
                <ul className="space-y-2">
                  {C.tocItems.map((item, i) => (
                    <li key={i}>
                      <a href={`#section-${i}`}
                        className="flex items-start gap-2 text-[13px] text-gray-500 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors leading-snug">
                        <span className="text-[11px] font-bold text-gray-300 dark:text-gray-600 mt-0.5 flex-shrink-0">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>

            {/* ── Content ── */}
            <div className="lg:col-span-3 space-y-14">
              {C.sections.map((section, i) => (
                <div key={i} id={`section-${i}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[11px] font-bold text-teal-500 dark:text-teal-400 tabular-nums">
                      {section.num}
                    </span>
                    <h2 className="text-[22px] font-bold text-gray-900 dark:text-white">
                      {section.title}
                    </h2>
                  </div>
                  <div className="space-y-4 pl-8">
                    {section.body.map((para, j) => (
                      <p key={j} className="text-[15px] text-gray-600 dark:text-gray-300 leading-relaxed">
                        {para}
                      </p>
                    ))}
                  </div>
                  {i < C.sections.length - 1 && (
                    <div className="mt-14 border-b border-gray-100 dark:border-gray-800" />
                  )}
                </div>
              ))}

              {/* ── CTA ── */}
              <div className="mt-14 p-8 rounded-2xl text-white"
                style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}>
                <p className="text-[20px] font-bold mb-2">{C.cta.title}</p>
                <p className="text-teal-100 text-[14px] mb-5">{C.cta.sub}</p>
                <Link href="/login?signup=true"
                  className="inline-flex items-center px-5 py-2.5 rounded-xl bg-white text-teal-700 font-semibold text-[14px] hover:bg-teal-50 transition-colors">
                  {C.cta.btn} →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
