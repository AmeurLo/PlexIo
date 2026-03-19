"use client";

import { useState } from "react";
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
  appSub:    { fr: "Votre portail locataire est disponible directement dans votre navigateur. Gratuit, sans abonnement.", en: "Your tenant portal is available right in your browser. Free, no subscription." },
  accessWeb: { fr: "Accéder au portail web",            en: "Access web portal" },
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

            <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
              <Link href="/portail/login"
                className="flex items-center gap-3 bg-white text-gray-900 px-6 py-3.5 rounded-xl hover:bg-gray-50 transition-colors font-semibold text-[15px]">
                <svg className="w-5 h-5 text-teal-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
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
