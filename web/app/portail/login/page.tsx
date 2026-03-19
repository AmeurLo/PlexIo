"use client";
import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { tenantRequestCode, tenantVerifyCode } from "@/lib/tenantApi";

const T = {
  title:     { fr: "Espace locataire",     en: "Tenant portal" },
  sub:       { fr: "Connectez-vous à votre compte locataire", en: "Sign in to your tenant account" },
  email:     { fr: "Adresse courriel",     en: "Email address" },
  continue:  { fr: "Continuer",            en: "Continue" },
  codeSent:  { fr: "Code envoyé à",        en: "Code sent to" },
  codeHint:  { fr: "Entrez le code à 6 chiffres reçu par courriel.", en: "Enter the 6-digit code sent to your email." },
  code:      { fr: "Code de vérification", en: "Verification code" },
  verify:    { fr: "Accéder au portail",   en: "Access portal" },
  back:      { fr: "Changer d'adresse",    en: "Change email" },
  noInvite:  { fr: "Pas encore invité ?",  en: "Not invited yet?" },
  askLandlord: { fr: "Demandez à votre propriétaire de vous envoyer une invitation Domely.", en: "Ask your landlord to send you a Domely invitation." },
  landlord:  { fr: "Vous êtes propriétaire ?", en: "Are you a landlord?" },
  landlordLink: { fr: "Connexion propriétaire →", en: "Landlord sign-in →" },
};

export default function TenantLoginPage() {
  const { lang, t } = useLanguage();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true); setError("");
    try {
      await tenantRequestCode(email.trim());
      setStep("code");
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true); setError("");
    try {
      const data = await tenantVerifyCode(email.trim(), code.trim());
      localStorage.setItem("domely_tenant_token", data.access_token);
      localStorage.setItem("domely_tenant_user", JSON.stringify(data.tenant));
      window.location.href = "/portail/dashboard";
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  const inputClass = "w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[14px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors";

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <img src="/logo.svg" alt="Domely" width={32} height={32} />
          <span className="brand-name text-[20px]">Domely</span>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-8">
          <div className="mb-6">
            <h1 className="text-[22px] font-bold text-gray-900 dark:text-white">{t(T.title)}</h1>
            <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-1">{t(T.sub)}</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-[13px] text-red-600 dark:text-red-400">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
              {error}
            </div>
          )}

          {step === "email" ? (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t(T.email)}</label>
                <input
                  type="email" required autoFocus
                  value={email} onChange={e => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="locataire@courriel.com"
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl font-semibold text-[14px] transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                {t(T.continue)}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="bg-teal-50 dark:bg-teal-900/20 rounded-xl px-4 py-3 text-[13px] text-teal-700 dark:text-teal-300">
                <p className="font-medium">{t(T.codeSent)} {email}</p>
                <p className="mt-0.5 text-teal-600 dark:text-teal-400">{t(T.codeHint)}</p>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t(T.code)}</label>
                <input
                  type="text" required autoFocus
                  maxLength={6} pattern="\d{6}"
                  value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
                  className={inputClass + " text-center tracking-[0.4em] text-[20px] font-mono"}
                  placeholder="000000"
                />
              </div>
              <button
                type="submit" disabled={loading || code.length < 6}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl font-semibold text-[14px] transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                {t(T.verify)}
              </button>
              <button type="button" onClick={() => { setStep("email"); setCode(""); setError(""); }}
                className="w-full text-[13px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                ← {t(T.back)}
              </button>
            </form>
          )}
        </div>

        {/* Not invited callout */}
        <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl px-4 py-3 text-[13px] text-amber-700 dark:text-amber-400">
          <p className="font-medium">{t(T.noInvite)}</p>
          <p className="mt-0.5 text-amber-600 dark:text-amber-500">{t(T.askLandlord)}</p>
        </div>

        <p className="text-center text-[12px] text-gray-400 mt-6">
          {t(T.landlord)}{" "}
          <Link href="/login" className="text-teal-600 hover:text-teal-700 font-medium">{t(T.landlordLink)}</Link>
        </p>
      </div>
    </div>
  );
}
