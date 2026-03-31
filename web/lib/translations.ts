// ─── Domely Translations — FR / EN ───────────────────────────────────────────
// Usage: const { t, lang, setLang } = useLanguage()

export type Lang = "fr" | "en";

export const translations = {
  // ── Nav ──────────────────────────────────────────────────────────────────────
  nav: {
    features:  { fr: "Fonctionnalités", en: "Features" },
    how:       { fr: "Comment ça marche", en: "How it works" },
    pricing:   { fr: "Tarifs", en: "Pricing" },
    tenants:   { fr: "Locataires", en: "Tenants" },
    mission:   { fr: "Notre mission", en: "Our mission" },
    login:     { fr: "Connexion", en: "Sign in" },
    cta:       { fr: "S'inscrire à la liste d'attente", en: "Join the waitlist" },
  },

  // ── Hero ─────────────────────────────────────────────────────────────────────
  hero: {
    badge:    { fr: "Lancement Canada — Accès limité", en: "Canada Launch — Limited Access" },
    h1a:      { fr: "Maximisez vos revenus.", en: "Maximize your rental income." },
    h1b:      { fr: "Zéro complication.", en: "Zero hassle." },
    sub:      {
      fr: "La plupart des propriétaires gèrent encore par texto et Excel. Il y a mieux.",
      en: "Most landlords are still managing by text and spreadsheet. There's a better way.",
    },
    cta1:     { fr: "S'inscrire à la liste d'attente", en: "Join the waitlist" },
    cta2:     { fr: "Voir comment ça marche", en: "See how it works" },
    social:   { fr: " propriétaires sur la liste d'attente", en: " landlords on the waitlist" },
    badge1:   { fr: "Hausses calculées automatiquement", en: "Rent increases auto-calculated" },
    badge2:   { fr: "Automatisations sans effort", en: "Zero-effort automations" },
    badge3:   { fr: "Conseiller IA inclus", en: "AI advisor included" },
    stat1v:   { fr: "414", en: "414" },
    stat1l:   { fr: "Propriétaires sur la liste", en: "Landlords on the waitlist" },
    stat2v:   { fr: "500", en: "500" },
    stat2l:   { fr: "Objectif avant déploiement", en: "Target before launch" },
    stat3v:   { fr: "0 $", en: "$0" },
    stat3l:   { fr: "Frais cachés", en: "Hidden fees" },
    stat4v:   { fr: "< 10 min", en: "< 10 min" },
    stat4l:   { fr: "Pour tout configurer", en: "To get set up" },
  },

  // ── Features ─────────────────────────────────────────────────────────────────
  features: {
    badge:  { fr: "Fonctionnalités", en: "Features" },
    h2a:    { fr: "Votre portefeuille locatif.", en: "Your rental portfolio." },
    h2b:    { fr: "Sous contrôle, enfin.", en: "Under control, finally." },
    sub:    {
      fr: "Du premier duplex à 50+ logements. Domely évolue avec votre investissement.",
      en: "From your first duplex to 50+ units. Domely scales with your investment.",
    },
    items: [
      {
        icon: "scale",
        color: "from-teal-500 to-teal-600", bg: "bg-teal-50",
        tag:  { fr: "Délais et avis", en: "Deadlines & notices" },
        title:{ fr: "Haussez en confiance", en: "Increase with confidence" },
        desc: {
          fr: "Une hausse mal calculée peut tourner au litige coûteux. Domely calcule la hausse recommandée selon les barèmes TAL ou LTB, génère l'avis et suit chaque délai. Automatiquement, pour chaque logement.",
          en: "A miscalculated rent increase can turn into a costly dispute. Domely calculates the recommended increase using TAL or LTB guidelines, generates the notice, and tracks every deadline. Automatically, for every unit.",
        },
      },
      {
        icon: "sparkles",
        color: "from-violet-500 to-violet-600", bg: "bg-violet-50",
        tag:  { fr: "Intelligence artificielle", en: "Artificial intelligence" },
        title:{ fr: "Votre conseiller IA", en: "Your AI advisor" },
        desc: {
          fr: "Arrêtez de chercher sur Google à minuit. Posez n'importe quelle question sur un bail, une expulsion ou une hausse. Domely AI répond en secondes avec les lois exactes de votre province ou État.",
          en: "Stop Googling rental law at midnight. Ask anything about a lease, eviction, or increase. Domely AI answers in seconds with the exact laws of your province or state.",
        },
      },
      {
        icon: "zap",
        color: "from-amber-500 to-orange-500", bg: "bg-amber-50",
        tag:  { fr: "Automatisations incluses", en: "Automations included" },
        title:{ fr: "Gérez sans y penser", en: "Manage on autopilot" },
        desc: {
          fr: "Le propriétaire moyen passe 18h par mois sur l'admin. Avec Domely, c'est moins de 2h. Rappels de loyer, avis de renouvellement, suivi de maintenance. Tout part avant même que vous n'y pensiez.",
          en: "The average landlord spends 18 hours a month on admin. With Domely, it drops to under 2. Rent reminders, renewal notices, maintenance follow-ups. All sent automatically before you even think about them.",
        },
      },
      {
        icon: "dollar",
        color: "from-emerald-500 to-teal-500", bg: "bg-emerald-50",
        tag:  { fr: "ROI en temps réel", en: "Real-time ROI" },
        title:{ fr: "Finances d'investisseur", en: "Investor-grade finances" },
        desc: {
          fr: "Sachez exactement ce que vous rapporte chaque logement: après dépenses, après vacance, après tout. Repérez les biens qui plombent votre rendement et exportez tout pour votre comptable en un clic.",
          en: "Know exactly what every unit earns you: after expenses, after vacancy, after everything. Spot the properties dragging your returns and export it all for your accountant in one click.",
        },
      },
      {
        icon: "chart-bar",
        color: "from-blue-500 to-blue-600", bg: "bg-blue-50",
        tag:  { fr: "Données de marché", en: "Market intelligence" },
        title:{ fr: "Savoir quand hausser", en: "Know when to raise rent" },
        desc: {
          fr: "La plupart des propriétaires sont 200 à 400 $/mois sous le marché sans le savoir. Domely compare vos loyers aux prix réels du quartier et vous montre exactement ce que vous laissez sur la table chaque mois.",
          en: "Most landlords are $200–$400/month below market without knowing it. Domely compares your rents to real neighborhood rates and shows you exactly what you're leaving on the table every month.",
        },
      },
      {
        icon: "users",
        color: "from-pink-500 to-rose-500", bg: "bg-pink-50",
        tag:  { fr: "Portail locataire", en: "Tenant portal" },
        title:{ fr: "Des locataires satisfaits", en: "Happy tenants stay longer" },
        desc: {
          fr: "Les bons locataires restent dans des logements bien gérés. Donnez-leur un portail propre pour payer, signaler des problèmes et accéder à leurs documents. Les textos de 22h disparaissent.",
          en: "Good tenants stay in well-managed properties. Give them a clean portal to pay, report issues and access documents. The 10pm texts disappear for good.",
        },
      },
    ],
  },

  // ── AI Section ───────────────────────────────────────────────────────────────
  ai: {
    badge:  { fr: "Intelligence artificielle", en: "Artificial intelligence" },
    h2:     { fr: "Votre conseiller immobilier IA,\ndisponible 24/7.", en: "Your AI real estate advisor,\navailable 24/7." },
    sub:    {
      fr: "Domely AI analyse votre portefeuille, répond à vos questions sur la gestion locative et vous guide pas à pas, avant que les problèmes n'arrivent.",
      en: "Domely AI analyzes your portfolio, answers your rental management questions and guides you step by step, before problems arise.",
    },
    examples: [
      {
        q:  { fr: "Mon locataire ne paie plus depuis 2 mois. Quelles sont mes options ?", en: "My tenant hasn't paid in 2 months. What are my options?" },
        a:  { fr: "Selon les lois de votre région, vous pouvez entamer une procédure de résiliation de bail après un défaut de paiement. Je peux préparer le document de mise en demeure automatiquement. Voulez-vous que je génère l'avis maintenant ?", en: "Under your local rental laws, you can begin lease termination proceedings after a payment default. I can prepare the demand letter automatically. Shall I generate the notice now?" },
      },
      {
        q:  { fr: "Combien puis-je augmenter le loyer de mon unité au 234 Oakwood Ave, Toronto ?", en: "How much can I raise rent on my unit at 234 Oakwood Ave, Toronto?" },
        a:  { fr: "Pour ce logement en Ontario (loyer actuel 1 650 $), la hausse autorisée par la LTB pour 2025 est de 2,5 %. Le nouveau loyer serait de 1 691 $. L'avis doit être envoyé 90 jours avant la date de renouvellement.", en: "For this unit in Ontario (current rent $1,650), the LTB-allowed increase for 2025 is 2.5%. New rent: $1,691. Notice must be sent 90 days before the renewal date." },
      },
    ],
    cta: { fr: "S'inscrire à la liste d'attente", en: "Join the waitlist" },
  },

  // ── Comparison Table ─────────────────────────────────────────────────────────
  compare: {
    badge:  { fr: "La différence Domely", en: "The Domely difference" },
    h2:     {
      fr: "Aucun autre outil\nne s'en approche.",
      en: "No other tool\ncomes close.",
    },
    sub:    {
      fr: "On a aligné les principaux outils du marché. Domely coche chaque case, au prix le plus bas.",
      en: "We lined up the top tools on the market. Domely checks every box, at the lowest price.",
    },
    cols:   {
      feature:     { fr: "Fonctionnalité",  en: "Feature" },
      domely:      { fr: "Domely",          en: "Domely" },
      plexflow:    { fr: "PlexFlow",        en: "PlexFlow" },
      buildium:    { fr: "Buildium",        en: "Buildium" },
      building:    { fr: "Building Stack",  en: "Building Stack" },
      turbotenant: { fr: "TurboTenant",     en: "TurboTenant" },
    },
    colsSub: {
      domely:      { fr: "dès 0 $/mois",   en: "from $0/mo" },
      plexflow:    { fr: "dès 30 $/mois",  en: "from $30/mo" },
      buildium:    { fr: "dès 55 $/mois",  en: "from $55/mo" },
      building:    { fr: "0–25 $/mois",    en: "$0–25/mo" },
      turbotenant: { fr: "dès 0 $/mois",   en: "from $0/mo" },
    },
    rows: [
      { feature: { fr: "Application mobile native",        en: "Native mobile app" },              domely: true,  plexflow: false,            buildium: true,             building: true,              turbotenant: "partial" as const },
      { feature: { fr: "Calcul de hausse locative auto",   en: "Auto rent increase calculator" },   domely: true,  plexflow: false,            buildium: false,            building: false,             turbotenant: false },
      { feature: { fr: "Génération de baux automatique",   en: "Automatic lease generation" },      domely: true,  plexflow: "partial" as const, buildium: true,           building: "partial" as const, turbotenant: true },
      { feature: { fr: "Conseiller IA inclus",             en: "AI advisor included" },             domely: true,  plexflow: false,            buildium: false,            building: false,             turbotenant: false },
      { feature: { fr: "Interface bilingue FR/EN",         en: "Bilingual FR/EN interface" },       domely: true,  plexflow: "partial" as const, buildium: false,          building: "partial" as const, turbotenant: false },
      { feature: { fr: "Messagerie locataire incluse",     en: "Tenant messaging included" },       domely: true,  plexflow: false,            buildium: true,             building: true,              turbotenant: true },
      { feature: { fr: "Données de marché locatif",        en: "Rental market data" },              domely: true,  plexflow: false,            buildium: false,            building: false,             turbotenant: false },
      { feature: { fr: "Portail locataire",                en: "Tenant portal" },                   domely: true,  plexflow: true,             buildium: true,             building: true,              turbotenant: true },
      { feature: { fr: "Prix affiché en ligne",            en: "Transparent pricing online" },      domely: true,  plexflow: "partial" as const, buildium: true,           building: "partial" as const, turbotenant: true },
      { feature: { fr: "Gratuit pour 1–2 logements",      en: "Free for 1–2 units" },              domely: true,  plexflow: false,            buildium: false,            building: "partial" as const, turbotenant: "partial" as const },
      { feature: { fr: "Données hébergées en Amérique du Nord", en: "Data hosted in North America" }, domely: true, plexflow: true,            buildium: false,            building: "partial" as const, turbotenant: false },
    ] as Array<{ feature: { fr: string; en: string }; domely: boolean | "partial"; plexflow: boolean | "partial"; buildium: boolean | "partial"; building: boolean | "partial"; turbotenant: boolean | "partial" }>,
    ctaNotes: {
      plexflow:    { fr: "App mobile absente",   en: "No mobile app" },
      buildium:    { fr: "Dès 55 $/mois",        en: "From $55/month" },
      building:    { fr: "Contrat annuel",        en: "Annual contract required" },
      turbotenant: { fr: "Anglais seulement",     en: "English only" },
    },
  },

  // ── How it works ─────────────────────────────────────────────────────────────
  how: {
    badge: { fr: "Comment ça marche", en: "How it works" },
    h2:    { fr: "Opérationnel en 10 minutes.", en: "Up and running in 10 minutes." },
    sub:   {
      fr: "Pas de formation. Pas d'importation complexe. Votre gestionnaire locatif prêt dès le premier jour.",
      en: "No training. No complex imports. Your property manager ready from day one.",
    },
    steps: [
      {
        num: "01", icon: "home",
        title: { fr: "Ajoutez vos immeubles",          en: "Add your properties" },
        desc:  { fr: "Entrez l'adresse, le nombre de logements et les infos de vos locataires. Domely pré-remplit les données automatiquement.", en: "Enter the address, number of units and tenant details. Domely auto-fills the rest." },
        detail:{ fr: "Import CSV disponible",          en: "CSV import available" },
      },
      {
        num: "02", icon: "zap",
        title: { fr: "Activez les automatisations",   en: "Activate automations" },
        desc:  { fr: "Choisissez vos workflows : rappels de loyer, avis de renouvellement, alertes de maintenance, tout configuré selon vos préférences.", en: "Choose your workflows: rent reminders, renewal notices, maintenance alerts, all configured to your preferences." },
        detail:{ fr: "Workflows préconfigurés inclus",    en: "Pre-configured workflows included" },
      },
      {
        num: "03", icon: "smartphone",
        title: { fr: "Gérez depuis n'importe où",     en: "Manage from anywhere" },
        desc:  { fr: "Web et mobile synchronisés en temps réel. Vos locataires ont leur portail. Vous recevez les alertes qui comptent.", en: "Web and mobile synced in real time. Tenants have their portal. You get the alerts that matter." },
        detail:{ fr: "iOS · Android · Web",           en: "iOS · Android · Web" },
      },
      {
        num: "04", icon: "trending-up",
        title: { fr: "Optimisez votre rendement",    en: "Optimize your returns" },
        desc:  { fr: "L'IA analyse votre portefeuille et vous indique précisément où vous laissez de l'argent sur la table — et comment le récupérer.", en: "AI analyzes your portfolio and shows you precisely where you're leaving money on the table — and how to get it back." },
        detail:{ fr: "Rapports mensuels automatiques", en: "Automatic monthly reports" },
      },
    ],
  },

  // ── Testimonials ─────────────────────────────────────────────────────────────
  testimonials: {
    badge: { fr: "Témoignages", en: "Testimonials" },
    h2a:   { fr: "Ils investissent mieux.", en: "They invest better." },
    h2b:   { fr: "Ils dorment mieux.", en: "They sleep better." },
    sub:   { fr: "Pensé pour les propriétaires de 1 à 50+ logements, partout en Amérique du Nord.", en: "Built for landlords with 1 to 50+ units, across North America." },
    ratingLabel: { fr: "Note moyenne · Bêta utilisateurs", en: "Average rating · Beta users" },
    stats: [
      { label: { fr: "Essai gratuit",              en: "Free trial" },           value: "14j" },
      { label: { fr: "Frais cachés",               en: "Hidden fees" },          value: "$0" },
      { label: { fr: "Heures redonnées / mois",  en: "Hours given back / mo" },  value: "500h+" },
    ],
  },

  // ── Pricing ──────────────────────────────────────────────────────────────────
  pricing: {
    badge:    { fr: "Tarifs",    en: "Pricing" },
    h2a:      { fr: "Simple.", en: "Simple." },
    h2b:      { fr: "Transparent. Sans surprise.", en: "Transparent. No surprises." },
    toggle:   { monthly: { fr: "Mensuel", en: "Monthly" }, yearly: { fr: "Annuel", en: "Annual" } },
    popular:  { fr: "Le plus populaire", en: "Most popular" },
    free:     { fr: "Gratuit", en: "Free" },
    perMonth: { fr: "/mois", en: "/mo" },
    plans: ([
      {
        name: { fr: "Solo",   en: "Solo" },
        price: { monthly: 9, yearly: 7 },
        wasPrice: { monthly: 19, yearly: 15 },
        launchBadge: { fr: "Prix de lancement", en: "Launch price" },
        desc: { fr: "Pour démarrer avec 1 à 3 logements, sans compromis.", en: "For getting started with 1 to 3 units, no compromises." },
        cta:  { fr: "S'inscrire à la liste d'attente", en: "Join the waitlist" },
        features: [
          { fr: "1 immeuble · jusqu'à 3 logements", en: "1 property · up to 3 units" },
          { fr: "Suivi des loyers & paiements",      en: "Rent & payment tracking" },
          { fr: "Portail locataire",                 en: "Tenant portal" },
          { fr: "Maintenance & rappels",             en: "Maintenance & reminders" },
          { fr: "Génération de baux PDF",            en: "PDF lease generation" },
          { fr: "Support par courriel",              en: "Email support" },
        ],
        missing: [
          { fr: "Domely AI conseiller",  en: "Domely AI advisor" },
          { fr: "Automatisations",       en: "Automations" },
          { fr: "Export CSV/PDF",        en: "CSV/PDF export" },
        ],
      },
      {
        name: { fr: "Pro",    en: "Pro" },
        price: { monthly: 19, yearly: 15 },
        wasPrice: { monthly: 39, yearly: 31 },
        launchBadge: { fr: "Prix de lancement", en: "Launch price" },
        desc: { fr: "Pour les portefeuilles de 4 à 25 logements.", en: "For portfolios from 4 to 25 units." },
        cta:  { fr: "S'inscrire à la liste d'attente", en: "Join the waitlist" },
        badge: true,
        features: [
          { fr: "Immeubles illimités · jusqu'à 25 logements", en: "Unlimited properties · up to 25 units" },
          { fr: "Domely AI inclus",                           en: "Domely AI included" },
          { fr: "18 automatisations activées",                en: "18 automations activated" },
          { fr: "Données de marché locatif",                  en: "Rental market data" },
          { fr: "Export CSV & PDF",                           en: "CSV & PDF export" },
          { fr: "RL-31 généré automatiquement",               en: "RL-31 auto-generated" },
          { fr: "Support prioritaire",                        en: "Priority support" },
        ],
        missing: [],
      },
      {
        name: { fr: "Entreprise",   en: "Enterprise" },
        price: { monthly: 0, yearly: 0 },
        contactSales: true,
        desc: { fr: "Pour les gestionnaires de 26+ logements. Tarif sur mesure.", en: "For managers with 26+ units. Custom pricing." },
        cta:  { fr: "Contacter les ventes", en: "Contact sales" },
        features: [
          { fr: "Logements illimités",                  en: "Unlimited units" },
          { fr: "Membres d'équipe illimités",           en: "Unlimited team members" },
          { fr: "Tout le plan Pro, inclus",             en: "Everything in Pro, included" },
          { fr: "Rapports personnalisés",               en: "Custom reports" },
          { fr: "API & intégrations",                   en: "API & integrations" },
          { fr: "Gestionnaire de compte dédié",         en: "Dedicated account manager" },
          { fr: "SLA 99,9 % uptime",                    en: "99.9% uptime SLA" },
        ],
        missing: [],
      },
    ] as Array<{
      name: { fr: string; en: string };
      price: { monthly: number; yearly: number };
      wasPrice?: { monthly: number; yearly: number };
      launchBadge?: { fr: string; en: string };
      contactSales?: boolean;
      desc: { fr: string; en: string };
      cta:  { fr: string; en: string };
      badge?: boolean;
      features: { fr: string; en: string }[];
      missing?: { fr: string; en: string }[];
    }>),
    note: {
      fr: "Tous les plans incluent les mises à jour réglementaires · Aucune carte de crédit pour l'essai · Annulation en tout temps",
      en: "All plans include provincial regulation updates · No credit card for trial · Cancel anytime",
    },
  },

  // ── CTA Section ──────────────────────────────────────────────────────────────
  cta: {
    badge: { fr: "Prêt à simplifier votre gestion ?", en: "Ready to simplify your management?" },
    h2:    { fr: "Prêt à rentabiliser\nvotre parc locatif ?", en: "Ready to maximize\nyour rental returns?" },
    sub:   { fr: "14 jours gratuits. Aucune carte de crédit. Prêt à l'emploi dès le premier jour.", en: "14 days free. No credit card. Ready to use from day one." },
    cta1:  { fr: "S'inscrire à la liste d'attente", en: "Join the waitlist" },
    cta2:  { fr: "Parler à l'équipe", en: "Talk to the team" },
    trust: [
      { icon: "lock",       fr: "Données chiffrées AES-256",   en: "AES-256 encrypted data" },
      { icon: "building",   fr: "Adapté à votre province",      en: "Built for your province" },
      { icon: "smartphone", fr: "iOS · Android · Web",          en: "iOS · Android · Web" },
      { icon: "heart",      fr: "Hébergement nord-américain",   en: "North American hosting" },
    ],
  },

  // ── Login ────────────────────────────────────────────────────────────────────
  login: {
    back:        { fr: "Retour à l'accueil",         en: "Back to home" },
    signupTitle: { fr: "Créer votre compte",          en: "Create your account" },
    loginTitle:  { fr: "Bon retour !",               en: "Welcome back!" },
    signupSub:   { fr: "Gérez vos logements dès aujourd'hui.", en: "Manage your properties today." },
    loginSub:    { fr: "Connectez-vous à votre espace propriétaire.", en: "Sign in to your landlord dashboard." },
    tabLogin:    { fr: "Connexion",                  en: "Sign in" },
    tabSignup:   { fr: "Inscription",                en: "Sign up" },
    name:        { fr: "Nom complet",                en: "Full name" },
    namePh:      { fr: "Michel Gagnon",              en: "John Smith" },
    email:       { fr: "Adresse courriel",           en: "Email address" },
    emailPh:     { fr: "vous@exemple.com",           en: "you@example.com" },
    password:    { fr: "Mot de passe",               en: "Password" },
    passwordPh:  { fr: "Minimum 6 caractères",       en: "Minimum 6 characters" },
    forgot:      { fr: "Oublié ?",                   en: "Forgot?" },
    submit:      { fr: "Se connecter →",             en: "Sign in →" },
    submitSignup:{ fr: "Créer mon compte →",         en: "Create my account →" },
    loading:     { fr: "Connexion…",                 en: "Signing in…" },
    loadingSignup:{ fr: "Création du compte…",       en: "Creating account…" },
    tenantLink:  { fr: "Vous êtes locataire ?",      en: "Are you a tenant?" },
    tenantCta:   { fr: "Accéder au portail locataire →", en: "Access tenant portal →" },
    security:    { fr: "Connexion sécurisée · Données chiffrées · Hébergement nord-américain", en: "Secure login · Encrypted data · North American hosting" },
  },

  // ── Footer ───────────────────────────────────────────────────────────────────
  footer: {
    tagline:   { fr: "La plateforme de gestion locative pensée pour les propriétaires d'Amérique du Nord.", en: "The rental management platform built for North American landlords." },
    copyright: { fr: "© 2026 Domely. Tous droits réservés.", en: "© 2026 Domely. All rights reserved." },
    madeIn:    { fr: "Fait avec amour au Québec", en: "Made with love in Québec" },
    status:    { fr: "Tous les systèmes opérationnels", en: "All systems operational" },
    sections: {
      product:   { fr: "Produit",    en: "Product" },
      company:   { fr: "Compagnie",  en: "Company" },
      resources: { fr: "Ressources", en: "Resources" },
      legal:     { fr: "Légal",      en: "Legal" },
    },
    links: {
      product: [
        { fr: "Fonctionnalités",       en: "Features",         href: "/#features" },
        { fr: "Comment ça marche",     en: "How it works",     href: "/#how" },
        { fr: "Tarifs",                en: "Pricing",          href: "/#pricing" },
        { fr: "Portail locataire",     en: "Tenant portal",    href: "/portail" },
        { fr: "Se connecter",          en: "Sign in",          href: "/login" },
      ],
      company: [
        { fr: "Notre mission", en: "Our mission", href: "/mission" },
        { fr: "Blog",          en: "Blog",         href: "/blog" },
      ],
      resources: [
        { fr: "Guides & Ressources", en: "Guides & Resources", href: "/resources" },
        { fr: "Nous contacter",      en: "Contact us",         href: "/contact" },
      ],
      legal: [
        { fr: "Politique de confidentialité", en: "Privacy policy",   href: "/privacy" },
        { fr: "Conditions d'utilisation",     en: "Terms of service", href: "/terms" },
      ],
    },
  },

  // ── FAQ ──────────────────────────────────────────────────────────────────────
  faq: {
    badge: { fr: "FAQ", en: "FAQ" },
    h2:    { fr: "Questions fréquentes.", en: "Frequently asked questions." },
    items: [
      {
        q: { fr: "Domely fonctionne-t-il hors du Québec ?", en: "Does Domely work outside Quebec?" },
        a: { fr: "Oui. Domely est disponible partout au Canada et aux États-Unis. L'IA s'adapte automatiquement aux lois locatives de votre région : TAL au Québec, LTB en Ontario, règles par État aux USA.", en: "Yes. Domely works across Canada and the United States. The AI automatically adapts to your local rental laws: TAL in Quebec, LTB in Ontario, state-specific rules in the US." },
      },
      {
        q: { fr: "L'essai gratuit est-il vraiment sans carte de crédit ?", en: "Is the free trial really no credit card?" },
        a: { fr: "Oui, 14 jours gratuits, aucune carte requise. Vous pouvez annuler en tout temps sans aucune pénalité.", en: "Yes, 14 days free, no card required. Cancel anytime, no penalty whatsoever." },
      },
      {
        q: { fr: "Mes données sont-elles sécurisées ?", en: "Is my data secure?" },
        a: { fr: "Vos données sont chiffrées en transit et au repos (AES-256). Nous ne vendons ni ne partageons vos informations. L'hébergement est sur des serveurs nord-américains.", en: "Your data is encrypted in transit and at rest (AES-256). We never sell or share your information. Hosting is on North American servers." },
      },
      {
        q: { fr: "Mes locataires doivent-ils payer pour le portail ?", en: "Do my tenants have to pay for the portal?" },
        a: { fr: "Non. Le portail locataire est entièrement gratuit pour vos locataires. Ils paient leur loyer, soumettent des demandes et consultent leurs documents sans compte payant.", en: "No. The tenant portal is completely free for your tenants. They pay rent, submit requests and view documents with no paid account needed." },
      },
      {
        q: { fr: "Puis-je importer mes données existantes ?", en: "Can I import my existing data?" },
        a: { fr: "Oui. Domely supporte l'import CSV pour vos logements, locataires et historique de paiements. La configuration complète prend moins de 10 minutes.", en: "Yes. Domely supports CSV import for your properties, tenants and payment history. Full setup takes under 10 minutes." },
      },
      {
        q: { fr: "Comment l'IA connaît-elle les lois de ma région ?", en: "How does the AI know my local laws?" },
        a: { fr: "Domely AI est entraîné sur les lois locatives de chaque province canadienne et de chaque État américain. Il connaît les délais de préavis, les limites de hausse et les procédures propres à votre marché.", en: "Domely AI is trained on rental laws for every Canadian province and US state. It knows notice periods, increase limits and the procedures specific to your market." },
      },
      {
        q: { fr: "Y a-t-il une application mobile ?", en: "Is there a mobile app?" },
        a: { fr: "Oui. Domely est disponible sur iOS et Android, synchronisé en temps réel avec la version web.", en: "Yes. Domely is available on iOS and Android, synced in real time with the web version." },
      },
      {
        q: { fr: "Que se passe-t-il si je dépasse ma limite de logements ?", en: "What happens if I exceed my unit limit?" },
        a: { fr: "Domely vous avertit avant d'atteindre la limite. Passez au plan supérieur en un clic, sans perdre aucune donnée.", en: "Domely notifies you before you hit the limit. Upgrade in one click — no data is ever lost." },
      },
    ],
  },
} as const;

// ─── Helper type ──────────────────────────────────────────────────────────────
type TranslationValue = { fr: string; en: string } | readonly { fr: string; en: string }[];

export function t(val: { fr: string; en: string }, lang: Lang): string {
  return val[lang];
}
