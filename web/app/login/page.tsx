"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { translations as T } from "@/lib/translations";

const API_URL      = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const DEMO_EMAIL    = "demo@domely.app";
const DEMO_PASSWORD = "Demo1234!";

function LoginForm() {
  const params = useSearchParams();
  const { lang, setLang, t } = useLanguage();
  const L = T.login;

  const [isSignup, setIsSignup]         = useState(params.get("signup") === "true");
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [fullName, setFullName]         = useState("");
  const [loading, setLoading]           = useState(false);
  const [demoLoading, setDemoLoading]   = useState(false);
  const [error, setError]               = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
      });
      if (!res.ok) throw new Error("Compte démo indisponible, réessayez.");
      const data = await res.json();
      localStorage.setItem("domely_token", data.access_token);
      localStorage.setItem("domely_user", JSON.stringify(data.user));
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur démo.");
    } finally {
      setDemoLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = isSignup ? "/auth/register" : "/auth/login";
      const body = isSignup
        ? { email: email.toLowerCase().trim(), password, full_name: fullName.trim() }
        : { email: email.toLowerCase().trim(), password };
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || (isSignup ? "Inscription échouée." : "Identifiants incorrects."));
      }
      const data = await res.json();
      localStorage.setItem("domely_token", data.access_token);
      localStorage.setItem("domely_user", JSON.stringify(data.user));
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFB] dark:bg-gray-950 bg-dot-grid flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between p-5">
        <Link href="/" className="inline-flex items-center gap-2 text-[14px] text-gray-500 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t(L.back)}
        </Link>
        {/* Lang toggle */}
        <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-0.5 shadow-sm">
          {(["fr", "en"] as const).map((l) => (
            <button key={l} onClick={() => setLang(l)}
              className={`px-2.5 py-1 text-[12px] font-semibold rounded-md transition-all ${
                lang === l ? "bg-teal-600 text-white shadow-sm" : "text-gray-400 hover:text-gray-600"
              }`}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-5 py-8">
        <div className="w-full max-w-[420px]">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="Domely" width={40} height={40} />
              <span className="brand-name text-[20px]">Domely</span>
            </Link>
            <h1 className="text-[26px] font-bold tracking-tight text-gray-900 dark:text-white">
              {isSignup ? t(L.signupTitle) : t(L.loginTitle)}
            </h1>
            <p className="text-[14px] text-gray-400 mt-1.5">
              {isSignup ? t(L.signupSub) : t(L.loginSub)}
            </p>
          </div>

          {/* Card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-card p-7">
            {/* Tabs */}
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-7">
              {[
                { key: false, label: t(L.tabLogin) },
                { key: true,  label: t(L.tabSignup) },
              ].map(({ key, label }) => (
                <button key={String(key)} onClick={() => { setIsSignup(key); setError(""); }}
                  className={`flex-1 py-2 text-[14px] font-medium rounded-lg transition-all ${
                    isSignup === key ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400"
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignup && (
                <div>
                  <label className="block text-[13px] font-medium text-gray-600 dark:text-gray-300 mb-1.5">{t(L.name)}</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                    placeholder={t(L.namePh)} required={isSignup} autoComplete="name"
                    className="w-full px-4 py-3 text-[14px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-all placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500" />
                </div>
              )}

              <div>
                <label className="block text-[13px] font-medium text-gray-600 dark:text-gray-300 mb-1.5">{t(L.email)}</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder={t(L.emailPh)} required autoComplete="email"
                  className="w-full px-4 py-3 text-[14px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-all placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[13px] font-medium text-gray-600 dark:text-gray-300">{t(L.password)}</label>
                  {!isSignup && (
                    <Link href="/forgot-password" className="text-[12px] text-teal-600 hover:text-teal-700 transition-colors">{t(L.forgot)}</Link>
                  )}
                </div>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isSignup ? t(L.passwordPh) : "••••••••"}
                    required autoComplete={isSignup ? "new-password" : "current-password"}
                    className="w-full px-4 py-3 pr-11 text-[14px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-all placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      {showPassword
                        ? <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        : <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                      }
                    </svg>
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2.5 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
                  <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-[13px] text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3.5 text-[15px] font-semibold text-white rounded-xl transition-all shadow-teal-sm hover:shadow-teal-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 mt-2"
                style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}>
                {loading
                  ? <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {isSignup ? t(L.loadingSignup) : t(L.loading)}
                    </span>
                  : isSignup ? t(L.submitSignup) : t(L.submit)
                }
              </button>

              {!isSignup && (
                <>
                  <div className="flex items-center gap-3 my-1">
                    <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                    <span className="text-[11px] text-gray-400 font-medium">ou</span>
                    <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                  </div>
                  <button
                    type="button"
                    onClick={handleDemoLogin}
                    disabled={demoLoading}
                    className="w-full py-3 text-[14px] font-semibold rounded-xl border-2 border-teal-600 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {demoLoading
                      ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Chargement…</>
                      : <><span>🏠</span> Essayer la démo</>
                    }
                  </button>
                  <p className="text-center text-[11px] text-gray-400 mt-1">Compte de démonstration pré-rempli — aucune inscription requise</p>
                </>
              )}
            </form>
          </div>

          <div className="mt-5 text-center">
            <p className="text-[13px] text-gray-400">
              {t(L.tenantLink)}{" "}
              <Link href="/portail" className="text-teal-600 font-semibold hover:text-teal-700 transition-colors">
                {t(L.tenantCta)}
              </Link>
            </p>
          </div>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-[12px] text-gray-400">
            <svg className="w-3.5 h-3.5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            {t(L.security)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-950">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
