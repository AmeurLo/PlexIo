"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage } from "@/lib/LanguageContext";

const sections = {
  fr: {
    badge: "Légal",
    title: "Politique de confidentialité",
    updated: "Dernière mise à jour : 1er mars 2025",
    intro: "Les Solutions Privatris Inc. (« nous ») exploite la plateforme Domely. Cette politique explique quelles données nous collectons, comment nous les utilisons et quels droits vous avez en tant qu'utilisateur.",
    items: [
      {
        h: "1. Qui sommes-nous",
        p: "Les Solutions Privatris Inc. est une société constituée au Canada, exploitant la plateforme de gestion locative Domely à destination des propriétaires et investisseurs immobiliers d'Amérique du Nord. Responsable de la protection des renseignements personnels : hello@domely.ca. Pour toute question relative à vos données personnelles, cette adresse est votre point de contact principal.",
      },
      {
        h: "2. Âge minimum",
        p: "Le service Domely est réservé aux personnes âgées de 18 ans et plus. Nous ne collectons pas sciemment de données personnelles concernant des mineurs. Si nous apprenons qu'un mineur a créé un compte, nous supprimerons ses données dans les meilleurs délais.",
      },
      {
        h: "3. Données que nous collectons",
        p: "Nous collectons les informations que vous nous fournissez directement : nom, adresse courriel, mot de passe (haché et non lisible), informations sur vos propriétés et logements, données de paiement (traitées par Stripe — nous ne stockons jamais vos numéros de carte), et les messages envoyés via notre formulaire de contact. Nous collectons aussi automatiquement des données techniques : adresse IP, type de navigateur, pages visitées, durée des sessions et journaux d'erreurs.",
      },
      {
        h: "4. Comment nous utilisons vos données",
        p: "Vos données servent à fournir et améliorer la plateforme Domely, vous envoyer des notifications liées à votre compte, répondre à vos demandes de support, générer des analyses de portefeuille via notre module d'intelligence artificielle, et respecter nos obligations légales. Nous n'utilisons pas vos données à des fins publicitaires et ne les vendons jamais à des tiers.",
      },
      {
        h: "5. Traitement automatisé et intelligence artificielle",
        p: "Domely utilise un module d'IA pour analyser vos données locatives et générer des recommandations (hausses de loyer, alertes de risque, analyses de portefeuille). Ces traitements sont basés sur vos données et les lois locatives applicables. Vous pouvez à tout moment ignorer les recommandations générées. Aucune décision ayant un effet juridique sur vous n'est prise de façon entièrement automatisée sans possibilité de recours humain.",
      },
      {
        h: "6. Partage des données",
        p: "Nous partageons vos données uniquement avec des sous-traitants nécessaires au fonctionnement du service : Stripe (paiements), AWS/Vercel (hébergement), Resend (courriels transactionnels) et Anthropic (traitement IA — Anthropic ne stocke pas vos données et ne les utilise pas pour entraîner ses modèles selon nos ententes contractuelles). Chaque sous-traitant est lié par des accords de confidentialité et de traitement des données.",
      },
      {
        h: "7. Hébergement et transferts internationaux",
        p: "Vos données sont hébergées sur des serveurs situés au Canada. Dans certains cas, des sous-traitants peuvent traiter des données aux États-Unis. Ces transferts sont encadrés par des clauses contractuelles conformes aux exigences de la Loi 25 (Québec) et du PIPEDA (Canada), assurant un niveau de protection équivalent.",
      },
      {
        h: "8. Sécurité",
        p: "Nous appliquons un chiffrement AES-256 au repos et TLS 1.3 en transit. L'accès aux données de production est restreint, journalisé et soumis à authentification à deux facteurs. Nous effectuons des révisions de sécurité régulières. En cas d'incident de confidentialité présentant un risque de préjudice sérieux, nous vous notifierons et aviserons la Commission d'accès à l'information (Québec) dans les délais prévus par la loi.",
      },
      {
        h: "9. Conservation des données",
        p: "Vos données sont conservées tant que votre compte est actif. Après fermeture du compte, nous supprimons vos données personnelles dans un délai de 90 jours, sauf obligation légale de conservation plus longue (ex. : données fiscales conservées 7 ans). Les données anonymisées peuvent être conservées à des fins statistiques.",
      },
      {
        h: "10. Vos droits",
        p: "Conformément à la Loi 25 et au PIPEDA, vous avez le droit : d'accéder à vos données personnelles, de les corriger si elles sont inexactes, de les supprimer (sous réserve d'obligations légales), de vous opposer à certains traitements, d'obtenir une copie de vos données dans un format structuré et lisible par machine (portabilité), et d'être informé de toute décision automatisée vous concernant. Pour exercer ces droits, écrivez à hello@domely.ca. Nous répondons dans un délai de 30 jours.",
      },
      {
        h: "11. Témoins (cookies)",
        p: "Nous utilisons des témoins essentiels au fonctionnement du service (session, préférences de langue et de thème). Aucun témoin publicitaire ou de suivi tiers n'est utilisé. Vous pouvez désactiver les témoins dans votre navigateur ; certaines fonctionnalités du service pourraient alors être limitées.",
      },
      {
        h: "12. Modifications",
        p: "Nous pouvons mettre à jour cette politique à tout moment. En cas de changement important, nous vous en informerons par courriel au moins 14 jours avant l'entrée en vigueur des modifications, ou via une bannière dans l'application. La poursuite de l'utilisation du service après cette date vaut acceptation de la nouvelle politique.",
      },
      {
        h: "13. Contact et responsable de la protection",
        p: "Responsable de la protection des renseignements personnels : Les Solutions Privatris Inc. — hello@domely.ca. Si vous estimez que vos droits ne sont pas respectés, vous pouvez déposer une plainte auprès de la Commission d'accès à l'information du Québec (cai.gouv.qc.ca) ou du Commissariat à la protection de la vie privée du Canada (priv.gc.ca).",
      },
    ],
  },
  en: {
    badge: "Legal",
    title: "Privacy Policy",
    updated: "Last updated: March 1, 2025",
    intro: "Les Solutions Privatris Inc. (\"we\") operates the Domely platform. This policy explains what data we collect, how we use it, and what rights you have as a user.",
    items: [
      {
        h: "1. Who we are",
        p: "Les Solutions Privatris Inc. is a company incorporated in Canada, operating the Domely rental management platform for property owners and real estate investors across North America. Privacy Officer: hello@domely.ca. For any questions about your personal data, this address is your primary point of contact.",
      },
      {
        h: "2. Minimum age",
        p: "The Domely service is intended for individuals aged 18 and over. We do not knowingly collect personal data from minors. If we learn that a minor has created an account, we will delete their data as soon as possible.",
      },
      {
        h: "3. Data we collect",
        p: "We collect information you provide directly: name, email address, password (hashed and unreadable), property and unit information, payment data (processed by Stripe — we never store card numbers), and messages sent via our contact form. We also automatically collect technical data: IP address, browser type, pages visited, session duration and error logs.",
      },
      {
        h: "4. How we use your data",
        p: "Your data is used to provide and improve the Domely platform, send account-related notifications, respond to support requests, generate portfolio analysis via our AI module, and comply with legal obligations. We do not use your data for advertising purposes and never sell it to third parties.",
      },
      {
        h: "5. Automated processing and artificial intelligence",
        p: "Domely uses an AI module to analyze your rental data and generate recommendations (rent increases, risk alerts, portfolio analysis). These processes are based on your data and applicable rental laws. You can disregard any generated recommendation at any time. No decision with a legal effect on you is made entirely automatically without the possibility of human review.",
      },
      {
        h: "6. Data sharing",
        p: "We share your data only with sub processors required to operate the service: Stripe (payments), AWS/Vercel (hosting), Resend (transactional emails) and Anthropic (AI processing — Anthropic does not store your data or use it to train its models under our contractual agreements). Each sub-processor is bound by data processing and confidentiality agreements.",
      },
      {
        h: "7. Hosting and international transfers",
        p: "Your data is hosted on servers located in Canada. In some cases, sub processors may process data in the United States. These transfers are governed by contractual clauses compliant with PIPEDA and applicable provincial privacy laws, ensuring an equivalent level of protection.",
      },
      {
        h: "8. Security",
        p: "We apply AES-256 encryption at rest and TLS 1.3 in transit. Access to production data is restricted, logged and subject to two factor authentication. We conduct regular security reviews. In the event of a privacy incident presenting a risk of serious harm, we will notify you and inform the relevant privacy authority within the legally required timeframes.",
      },
      {
        h: "9. Data retention",
        p: "Your data is retained for as long as your account is active. After account closure, we delete your personal data within 90 days, unless a longer retention period is required by law (e.g., financial records retained for 7 years). Anonymized data may be retained for statistical purposes.",
      },
      {
        h: "10. Your rights",
        p: "Under PIPEDA and applicable provincial privacy laws, you have the right to: access your personal data, correct it if inaccurate, delete it (subject to legal obligations), object to certain processing, obtain a copy of your data in a structured machine-readable format (portability), and be informed of any automated decision concerning you. To exercise these rights, write to hello@domely.ca. We respond within 30 days.",
      },
      {
        h: "11. Cookies",
        p: "We use cookies essential to the operation of the service (session, language and theme preferences). No advertising or third party tracking cookies are used. You can disable cookies in your browser; some service features may then be limited.",
      },
      {
        h: "12. Changes",
        p: "We may update this policy at any time. For significant changes, we will notify you by email at least 14 days before the changes take effect, or via a banner in the app. Continued use of the service after that date constitutes acceptance of the updated policy.",
      },
      {
        h: "13. Contact and Privacy Officer",
        p: "Privacy Officer: Les Solutions Privatris Inc. — hello@domely.ca. If you believe your rights have not been respected, you may file a complaint with the Commission d'accès à l'information du Québec (cai.gouv.qc.ca) or the Office of the Privacy Commissioner of Canada (priv.gc.ca).",
      },
    ],
  },
};

export default function PrivacyPage() {
  const { lang } = useLanguage();
  const S = sections[lang];

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white dark:bg-gray-950 pt-24 pb-20">
        <div className="max-w-3xl mx-auto px-6">
          <div className="mb-10">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold bg-teal-50 text-teal-700 border border-teal-100 mb-5 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800">
              {S.badge}
            </span>
            <h1 className="text-[36px] sm:text-[44px] font-extrabold tracking-tight text-gray-900 dark:text-white mb-3">
              {S.title}
            </h1>
            <p className="text-[13px] text-gray-400 dark:text-gray-500">{S.updated}</p>
          </div>

          <p className="text-[15px] text-gray-600 dark:text-gray-300 leading-relaxed mb-10 pb-10 border-b border-gray-100 dark:border-gray-800">
            {S.intro}
          </p>

          <div className="space-y-8">
            {S.items.map((item) => (
              <div key={item.h}>
                <h2 className="text-[17px] font-bold text-gray-900 dark:text-white mb-2">
                  {item.h}
                </h2>
                <p className="text-[15px] text-gray-600 dark:text-gray-300 leading-relaxed">
                  {item.p}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
