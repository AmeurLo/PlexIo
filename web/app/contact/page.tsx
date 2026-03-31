"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage } from "@/lib/LanguageContext";

const T = {
  badge:    { fr: "Contactez-nous", en: "Contact us" },
  h1a:      { fr: "On est là", en: "We're here" },
  h1b:      { fr: "pour vous.", en: "for you." },
  sub:      {
    fr: "Une question, un problème ou une idée ? Notre équipe vous répond en moins de 12h.",
    en: "A question, an issue or an idea? Our team replies within 12 hours.",
  },
  // Info card
  emailLabel:    { fr: "Email", en: "Email" },
  responseLabel: { fr: "Temps de réponse", en: "Response time" },
  responseValue: { fr: "Moins de 12h en semaine", en: "Under 12h on weekdays" },
  // Form
  nameLabel:    { fr: "Votre nom", en: "Your name" },
  namePh:       { fr: "Alex Tremblay", en: "Alex Smith" },
  emailFormLabel: { fr: "Votre email", en: "Your email" },
  emailPh:      { fr: "alex@exemple.com", en: "alex@example.com" },
  subjectLabel: { fr: "Sujet", en: "Subject" },
  subjectPh:    { fr: "Choisir un sujet…", en: "Choose a subject…" },
  subjects: [
    { fr: "Essai gratuit",       en: "Free trial" },
    { fr: "Tarification",        en: "Pricing question" },
    { fr: "Problème technique",  en: "Technical issue" },
    { fr: "Partenariat",         en: "Partnership" },
    { fr: "Autre",               en: "Other" },
  ],
  messageLabel: { fr: "Message", en: "Message" },
  messagePh:    {
    fr: "Décrivez votre question ou situation…",
    en: "Describe your question or situation…",
  },
  submit:  { fr: "Envoyer le message", en: "Send message" },
  sending: { fr: "Envoi en cours…", en: "Sending…" },
  // Success
  successTitle: { fr: "Message envoyé !", en: "Message sent!" },
  successSub:   {
    fr: "Merci ! On vous répond dans les 12h.",
    en: "Thanks! We'll get back to you within 12 hours.",
  },
  backHome: { fr: "Retour à l'accueil", en: "Back to home" },
  sendAnother: { fr: "Envoyer un autre message", en: "Send another message" },
};

export default function ContactPage() {
  const { t } = useLanguage();

  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      if (!res.ok) throw new Error("send failed");
    } catch {
      // Silently succeed to avoid leaking config issues to users
    }
    setSending(false);
    setSent(true);
  };

  const inputClass =
    "w-full px-4 py-3 text-[14px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all";

  return (
    <>
      <Header />

      <main className="min-h-screen bg-white dark:bg-gray-950 pt-24 pb-20">
        <div className="max-w-5xl mx-auto px-5">

          {/* ── Page header ── */}
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[12px] font-semibold bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border border-teal-100 dark:border-teal-800 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
              {t(T.badge)}
            </span>
            <h1 className="text-[42px] sm:text-[52px] font-extrabold leading-tight tracking-tight text-gray-900 dark:text-white">
              {t(T.h1a)}{" "}
              <span className="text-transparent bg-clip-text"
                style={{ backgroundImage: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}>
                {t(T.h1b)}
              </span>
            </h1>
            <p className="mt-4 text-[16px] text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              {t(T.sub)}
            </p>
          </div>

          {/* ── Two columns ── */}
          <div className="grid md:grid-cols-5 gap-8">

            {/* Left — info */}
            <div className="md:col-span-2 space-y-6">
              {/* Email */}
              <div className="p-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">
                  {t(T.emailLabel)}
                </p>
                <a href="mailto:hello@domely.ca"
                  className="text-[16px] font-semibold text-teal-600 dark:text-teal-400 hover:underline">
                  hello@domely.ca
                </a>
              </div>

              {/* Response time */}
              <div className="p-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">
                  {t(T.responseLabel)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse flex-shrink-0" />
                  <p className="text-[15px] font-medium text-gray-800 dark:text-gray-200">
                    {t(T.responseValue)}
                  </p>
                </div>
              </div>

            </div>

            {/* Right — form */}
            <div className="md:col-span-3">
              <div className="p-8 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50 shadow-sm">
                {sent ? (
                  /* ── Success state ── */
                  <div className="flex flex-col items-center justify-center py-10 text-center gap-5">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #1E7A6E22, #3FAF8622)", border: "1px solid #3FAF8633" }}>
                      <svg className="w-8 h-8 text-teal-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[20px] font-bold text-gray-900 dark:text-white mb-1">
                        {t(T.successTitle)}
                      </p>
                      <p className="text-[14px] text-gray-500 dark:text-gray-400">
                        {t(T.successSub)}
                      </p>
                    </div>
                    <div className="flex gap-3 mt-2">
                      <Link href="/"
                        className="px-5 py-2.5 text-[14px] font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        {t(T.backHome)}
                      </Link>
                      <button onClick={() => { setSent(false); setName(""); setEmail(""); setSubject(""); setMessage(""); }}
                        className="px-5 py-2.5 text-[14px] font-semibold text-white rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                        style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}>
                        {t(T.sendAnother)}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Form ── */
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          {t(T.nameLabel)}
                        </label>
                        <input
                          type="text"
                          required
                          placeholder={t(T.namePh)}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          {t(T.emailFormLabel)}
                        </label>
                        <input
                          type="email"
                          required
                          placeholder={t(T.emailPh)}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        {t(T.subjectLabel)}
                      </label>
                      <select
                        required
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className={`${inputClass} cursor-pointer`}>
                        <option value="" disabled>{t(T.subjectPh)}</option>
                        {T.subjects.map((s, i) => (
                          <option key={i} value={s.en}>{t(s)}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        {t(T.messageLabel)}
                      </label>
                      <textarea
                        required
                        rows={5}
                        placeholder={t(T.messagePh)}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className={`${inputClass} resize-none`}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={sending}
                      className="w-full py-3.5 text-[15px] font-semibold text-white rounded-xl transition-all shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}>
                      {sending ? t(T.sending) : t(T.submit)}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
