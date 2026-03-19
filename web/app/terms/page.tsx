"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage } from "@/lib/LanguageContext";

const sections = {
  fr: {
    badge: "Légal",
    title: "Conditions d'utilisation",
    updated: "Dernière mise à jour : 1er mars 2025",
    intro: "En accédant à Domely ou en utilisant nos services, vous acceptez les présentes conditions. Lisez-les attentivement avant de créer un compte.",
    items: [
      {
        h: "1. Acceptation des conditions",
        p: "Les présentes conditions constituent un accord juridiquement contraignant entre vous et Les Solutions Privatris Inc. Si vous utilisez Domely au nom d'une entreprise, vous déclarez avoir l'autorité nécessaire pour engager cette entité. Si vous n'acceptez pas ces conditions, n'utilisez pas le service.",
      },
      {
        h: "2. Description du service",
        p: "Domely est une plateforme SaaS de gestion locative qui inclut le suivi des loyers, les automatisations, un conseiller IA, des données de marché et un portail locataire. Nous nous réservons le droit de modifier, suspendre ou interrompre tout ou partie du service, avec un préavis raisonnable sauf urgence.",
      },
      {
        h: "3. Création de compte",
        p: "Vous devez fournir des informations exactes lors de l'inscription. Vous êtes responsable de la confidentialité de vos identifiants et de toute activité effectuée depuis votre compte. Signalez immédiatement tout accès non autorisé à hello@domely.app.",
      },
      {
        h: "4. Utilisation acceptable",
        p: "Vous acceptez de ne pas utiliser Domely à des fins illégales, de ne pas tenter d'accéder à des données d'autres utilisateurs, de ne pas soumettre de contenus faux, trompeurs ou abusifs, et de ne pas perturber le fonctionnement du service. Toute violation peut entraîner la suspension immédiate du compte.",
      },
      {
        h: "5. Abonnement et facturation",
        p: "Les plans payants sont facturés mensuellement ou annuellement selon votre choix. Les paiements sont traités par Stripe. En cas de non-paiement, l'accès aux fonctionnalités payantes peut être suspendu après un délai de grâce de 7 jours. Vous pouvez annuler votre abonnement à tout moment depuis votre tableau de bord, avec effet à la fin de la période en cours.",
      },
      {
        h: "6. Essai gratuit",
        p: "L'essai gratuit de 14 jours ne requiert aucune carte de crédit. À la fin de l'essai, votre compte passe automatiquement au plan gratuit. Aucun frais n'est prélevé sans votre consentement explicite.",
      },
      {
        h: "7. Données et confidentialité",
        p: "Votre utilisation du service est aussi régie par notre Politique de confidentialité. Vous restez propriétaire de vos données. Vous nous accordez une licence limitée pour traiter ces données afin de fournir le service. Nous ne vendons pas vos données.",
      },
      {
        h: "8. Propriété intellectuelle",
        p: "Domely, son logo, son interface et l'ensemble du contenu produit par notre équipe sont la propriété exclusive de Les Solutions Privatris Inc. Vous ne pouvez pas copier, modifier, distribuer ou revendre le service sans autorisation écrite. Les contenus que vous soumettez restent votre propriété.",
      },
      {
        h: "9. Limitation de responsabilité",
        p: "Domely est fourni « tel quel ». Dans les limites permises par la loi, Les Solutions Privatris Inc. ne saurait être tenu responsable des pertes indirectes, accessoires ou consécutives résultant de l'utilisation ou de l'impossibilité d'utiliser le service. Notre responsabilité totale ne peut dépasser le montant payé au cours des 12 derniers mois.",
      },
      {
        h: "10. Conseiller IA : avis important",
        p: "Le conseiller IA de Domely fournit des informations générales à titre indicatif uniquement. Ces informations ne constituent pas un avis juridique et ne remplacent en aucun cas la consultation d'un professionnel qualifié (avocat, notaire ou tribunal compétent). L'IA peut contenir des erreurs, des inexactitudes ou des informations non à jour. Les Solutions Privatris Inc. ne peut être tenu responsable des décisions prises sur la base des réponses générées par l'IA. Pour toute situation à enjeu légal ou financier important, consultez toujours un professionnel.",
      },
      {
        h: "11. Résiliation",
        p: "Vous pouvez fermer votre compte à tout moment. Domely peut suspendre ou fermer un compte en cas de violation de ces conditions, avec préavis sauf urgence. À la résiliation, vos données sont supprimées selon notre Politique de confidentialité.",
      },
      {
        h: "12. Droit applicable",
        p: "Ces conditions sont régies par les lois de la province de Québec et les lois fédérales du Canada applicables. Tout litige sera soumis aux tribunaux compétents de Montréal, Québec.",
      },
      {
        h: "13. Contact",
        p: "Pour toute question relative à ces conditions : hello@domely.app — Les Solutions Privatris Inc., Canada.",
      },
    ],
  },
  en: {
    badge: "Legal",
    title: "Terms of Service",
    updated: "Last updated: March 1, 2025",
    intro: "By accessing Domely or using our services, you agree to these terms. Please read them carefully before creating an account.",
    items: [
      {
        h: "1. Acceptance of terms",
        p: "These terms constitute a legally binding agreement between you and Les Solutions Privatris Inc. If you use Domely on behalf of a business, you represent that you have the authority to bind that entity. If you do not accept these terms, do not use the service.",
      },
      {
        h: "2. Description of service",
        p: "Domely is a SaaS rental management platform that includes rent tracking, automations, an AI advisor, market data and a tenant portal. We reserve the right to modify, suspend or discontinue all or part of the service, with reasonable notice except in emergencies.",
      },
      {
        h: "3. Account creation",
        p: "You must provide accurate information when registering. You are responsible for the confidentiality of your credentials and all activity on your account. Report any unauthorized access immediately to hello@domely.app.",
      },
      {
        h: "4. Acceptable use",
        p: "You agree not to use Domely for illegal purposes, not to attempt to access other users' data, not to submit false, misleading or abusive content, and not to disrupt the operation of the service. Any violation may result in immediate account suspension.",
      },
      {
        h: "5. Subscription and billing",
        p: "Paid plans are billed monthly or annually based on your selection. Payments are processed by Stripe. In case of nonpayment, access to paid features may be suspended after a 7-day grace period. You can cancel your subscription at any time from your dashboard, effective at the end of the current billing period.",
      },
      {
        h: "6. Free trial",
        p: "The 14-day free trial requires no credit card. At the end of the trial, your account automatically moves to the free plan. No charges are made without your explicit consent.",
      },
      {
        h: "7. Data and privacy",
        p: "Your use of the service is also governed by our Privacy Policy. You retain ownership of your data. You grant us a limited license to process that data in order to provide the service. We do not sell your data.",
      },
      {
        h: "8. Intellectual property",
        p: "Domely, its logo, interface and all content produced by our team are the exclusive property of Les Solutions Privatris Inc. You may not copy, modify, distribute or resell the service without written permission. Content you submit remains your property.",
      },
      {
        h: "9. Limitation of liability",
        p: "Domely is provided \"as is\". To the extent permitted by law, Les Solutions Privatris Inc. shall not be liable for indirect, incidental or consequential losses resulting from the use or inability to use the service. Our total liability may not exceed the amount paid in the prior 12 months.",
      },
      {
        h: "10. AI Advisor: important notice",
        p: "Domely's AI advisor provides general information for guidance purposes only. This information does not constitute legal advice and does not replace consultation with a qualified professional (lawyer, notary, or housing tribunal). The AI may contain errors, inaccuracies, or outdated information. Les Solutions Privatris Inc. shall not be liable for any decisions made based on AI-generated responses. For any situation involving significant legal or financial consequences, always consult a qualified professional.",
      },
      {
        h: "11. Termination",
        p: "You may close your account at any time. Domely may suspend or close an account for violations of these terms, with notice except in emergencies. Upon termination, your data is deleted in accordance with our Privacy Policy.",
      },
      {
        h: "12. Governing law",
        p: "These terms are governed by the laws of the Province of Quebec and applicable federal laws of Canada. Any dispute will be submitted to the competent courts of Montreal, Quebec.",
      },
      {
        h: "13. Contact",
        p: "For any questions about these terms: hello@domely.app — Les Solutions Privatris Inc., Canada.",
      },
    ],
  },
};

export default function TermsPage() {
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
