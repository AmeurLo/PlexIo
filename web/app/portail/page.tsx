"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { Icon } from "@/lib/icons";

const T = {
  back:      { fr: "Retour",                           en: "Back" },
  badge:     { fr: "Espace locataire",                  en: "Tenant portal" },
  title:     { fr: "Votre portail\nlocataire.",          en: "Your tenant\nportal." },
  sub:       { fr: "Votre propriétaire utilise Domely. Accédez à votre espace — payez votre loyer, soumettez des demandes, consultez vos documents.", en: "Your landlord uses Domely. Access your space — pay rent, submit requests, view your documents." },
  features: [
    { icon: "credit-card" as const, fr: "Paiement du loyer en ligne",    en: "Pay rent online" },
    { icon: "wrench" as const,      fr: "Demandes de maintenance",       en: "Maintenance requests" },
    { icon: "document" as const,    fr: "Vos baux et documents",          en: "Your leases & documents" },
    { icon: "chat" as const,        fr: "Messagerie avec votre proprio", en: "Message your landlord" },
  ],
  appTitle:  { fr: "Accédez à votre espace",            en: "Access your space" },
  appSub:    { fr: "Disponible sur le web et sur votre téléphone. Gratuit, sans abonnement.", en: "Available on web and on your phone. Free, no subscription." },
  accessWeb: { fr: "Accéder au portail web",            en: "Access web portal" },
  appStore:  { fr: "Télécharger sur l'App Store",       en: "Download on the App Store" },
  googlePlay:{ fr: "Disponible sur Google Play",        en: "Get it on Google Play" },
  orWeb:     { fr: "ou accédez directement depuis votre navigateur",      en: "or access directly from your browser" },
  inviteTitle: { fr: "Vous n'avez pas encore été invité ?", en: "Haven't been invited yet?" },
  inviteSub:   { fr: "Demandez à votre propriétaire de vous envoyer une invitation Domely.", en: "Ask your landlord to send you a Domely invitation." },
  landlordCta: { fr: "Vous êtes propriétaire ?",       en: "Are you a landlord?" },
  landlordLink:{ fr: "Créer un compte",                en: "Create an account" },
};

function PortailContent() {
  const { lang, setLang, t } = useLanguage();

  return (
    <div className="min-h-screen bg-[#F8FAFB] dark:bg-gray-950" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(30,122,110,0.06) 1px, transparent 0)", backgroundSize: "28px 28px" }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-5 max-w-5xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-[14px] text-gray-500 hover:text-teal-600 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t(T.back)}
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-0.5 shadow-sm">
            {(["fr", "en"] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={`px-2.5 py-1 text-[12px] font-semibold rounded-md transition-all ${lang === l ? "bg-teal-600 text-white shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <Link href="/login"
            className="hidden sm:block px-4 py-2 text-[13px] font-semibold text-white rounded-lg shadow-sm transition-all hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}>
            {t(T.landlordLink)}
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 pb-20">

        {/* Hero */}
        <div className="text-center pt-10 pb-14">
          <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 text-[13px] font-semibold px-4 py-2 rounded-full border border-teal-100 mb-6 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            {t(T.badge)}
          </div>

          {/* Logo */}
          <div className="flex justify-center mb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Domely" width={48} height={48} />
          </div>

          <h1 className="text-[42px] lg:text-[56px] font-bold tracking-tighter text-gray-900 dark:text-white leading-[1.1] mb-5 whitespace-pre-line">
            {t(T.title)}
          </h1>
          <p className="text-[17px] text-gray-500 dark:text-gray-400 max-w-lg mx-auto leading-relaxed">
            {t(T.sub)}
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {T.features.map((f) => (
            <div key={f.fr} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] text-center">
              <div className="flex justify-center mb-3 text-teal-600 dark:text-teal-400">
                <Icon name={f.icon} size={22} />
              </div>
              <p className="text-[13px] font-medium text-gray-700 dark:text-gray-300">{t(f)}</p>
            </div>
          ))}
        </div>

        {/* App download card */}
        <div className="rounded-2xl overflow-hidden mb-8"
             style={{ background: "linear-gradient(135deg, #144F54 0%, #1E7A6E 60%, #3FAF86 100%)" }}>
          <div className="px-8 py-10 md:flex items-center justify-between gap-8">
            <div className="mb-6 md:mb-0">
              <h2 className="text-[26px] font-bold text-white tracking-tight mb-2">
                {t(T.appTitle)}
              </h2>
              <p className="text-[15px] text-teal-100 max-w-sm leading-relaxed">
                {t(T.appSub)}
              </p>
            </div>

            <div className="flex flex-col gap-3 flex-shrink-0">
              {/* App Store button */}
              <a href="https://apps.apple.com/app/domely/id6746778641" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 bg-black text-white px-5 py-3 rounded-xl hover:bg-gray-900 transition-colors w-full sm:w-auto">
                {/* Apple logo */}
                <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11"/>
                </svg>
                <div className="text-left">
                  <div className="text-[10px] text-gray-300 leading-none mb-0.5">{t(T.appStore)}</div>
                  <div className="text-[16px] font-semibold leading-tight">App Store</div>
                </div>
              </a>

              {/* Google Play button */}
              <a href="https://play.google.com/store/apps/details?id=com.domely.app" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 bg-black text-white px-5 py-3 rounded-xl hover:bg-gray-900 transition-colors w-full sm:w-auto">
                {/* Play Store logo */}
                <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.18 23.76c.28.16.6.2.9.1L15 12 8.1.14a1.07 1.07 0 00-.92.1L3.18 2.24a2.14 2.14 0 00-1.07 1.85v17.82c0 .76.4 1.45 1.07 1.85zM16.5 10.59L5.72 1.02l9.3 9.28 1.48.29zM5.72 22.98l10.78-9.57-1.48.29-9.3 9.28zM20.82 10.15l-2.73-1.56-1.84 1.83 1.84 1.83 2.75-1.57c.79-.45.79-1.53-.02-2.1v.57"/>
                </svg>
                <div className="text-left">
                  <div className="text-[10px] text-gray-300 leading-none mb-0.5">{t(T.googlePlay)}</div>
                  <div className="text-[16px] font-semibold leading-tight">Google Play</div>
                </div>
              </a>

              {/* Divider + web link */}
              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1 h-px bg-white/20" />
                <span className="text-[11px] text-white/50 whitespace-nowrap">{t(T.orWeb)}</span>
                <div className="flex-1 h-px bg-white/20" />
              </div>
              <Link href="/portail/login"
                className="flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white px-5 py-3 rounded-xl transition-colors font-semibold text-[14px] border border-white/20">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                </svg>
                {t(T.accessWeb)}
              </Link>
            </div>
          </div>
        </div>

        {/* Invite info card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-7 flex items-start gap-5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-gray-800 dark:text-gray-100 mb-1">{t(T.inviteTitle)}</h3>
            <p className="text-[14px] text-gray-500 dark:text-gray-400">{t(T.inviteSub)}</p>
          </div>
        </div>

        {/* Landlord CTA */}
        <div className="text-center mt-10">
          <p className="text-[14px] text-gray-400 dark:text-gray-500">
            {t(T.landlordCta)}{" "}
            <Link href="/login?signup=true" className="text-teal-600 font-semibold hover:text-teal-700 transition-colors">
              {t(T.landlordLink)} →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PortailPage() {
  return <PortailContent />;
}
