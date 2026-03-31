"use client";
import React, { useEffect, useState, Suspense } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/lib/ToastContext";
import { requireAuth, getUser, logout } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatPhone } from "@/lib/format";
import PageHeader from "@/components/dashboard/PageHeader";
import FormField, { inputClass } from "@/components/dashboard/FormField";
import SmartSelect from "@/components/dashboard/SmartSelect";
import { useSearchParams } from "next/navigation";

const T = {
  title:       { fr: "Paramètres",          en: "Settings" },
  sub:         { fr: "Votre compte",        en: "Your account" },
  profile:     { fr: "Profil",             en: "Profile" },
  firstName:   { fr: "Prénom",             en: "First name" },
  lastName:    { fr: "Nom",               en: "Last name" },
  email:       { fr: "Adresse e-mail",     en: "Email address" },
  phone:       { fr: "Téléphone",          en: "Phone" },
  language:    { fr: "Langue",             en: "Language" },
  save:        { fr: "Enregistrer",        en: "Save" },
  saving:      { fr: "Enregistrement…",    en: "Saving…" },
  saved:       { fr: "Enregistré ✓",       en: "Saved ✓" },
  security:    { fr: "Sécurité",           en: "Security" },
  currentPwd:  { fr: "Mot de passe actuel", en: "Current password" },
  newPwd:      { fr: "Nouveau mot de passe", en: "New password" },
  confirmPwd:  { fr: "Confirmer",          en: "Confirm" },
  updatePwd:   { fr: "Mettre à jour",      en: "Update" },
  logout:      { fr: "Se déconnecter",     en: "Sign out" },
  plan:        { fr: "Abonnement",         en: "Subscription" },
  planLabel:   { fr: "Plan actuel",        en: "Current plan" },
  upgrade:     { fr: "Mettre à niveau",    en: "Upgrade" },
  stripe:         { fr: "Paiements de loyer",         en: "Rent payments" },
  stripeDesc:     { fr: "Connectez votre compte Stripe pour recevoir les loyers directement de vos locataires.", en: "Connect your Stripe account to receive rent payments directly from your tenants." },
  stripeConnect:  { fr: "Connecter Stripe",            en: "Connect Stripe" },
  stripeConnecting: { fr: "Redirection…",              en: "Redirecting…" },
  stripeConnected:  { fr: "Stripe connecté — Paiements activés", en: "Stripe connected — Payments enabled" },
  stripeOnboarding: { fr: "Connexion en cours — terminez l'inscription Stripe", en: "Connection pending — complete your Stripe setup" },
  stripeDashboard:  { fr: "Voir les paiements →",      en: "View payments →" },
  stripeFee:        { fr: "Frais : 1% Domely + 2,9%+0,30$ Stripe", en: "Fees: 1% Domely + 2.9%+$0.30 Stripe" },
  // Privacy tab
  privacy:     { fr: "Confidentialité",    en: "Privacy" },
  privacyDesc: { fr: "Vos données, vos droits. Conformément à la Loi 25 (Québec) et au RGPD.", en: "Your data, your rights. In compliance with Law 25 (Quebec) and GDPR." },
  dataWeHold:  { fr: "Données que nous conservons", en: "Data we hold" },
  deleteAccount: { fr: "Supprimer mon compte",    en: "Delete my account" },
  deleteDesc:  { fr: "Cette action est irréversible. Toutes vos données (propriétés, locataires, baux, paiements, etc.) seront définitivement supprimées.", en: "This action is irreversible. All your data (properties, tenants, leases, payments, etc.) will be permanently deleted." },
  deleteConfirmLabel: { fr: "Tapez SUPPRIMER pour confirmer", en: "Type DELETE to confirm" },
  deleteBtn:   { fr: "Supprimer définitivement mon compte", en: "Permanently delete my account" },
  deleting:    { fr: "Suppression…", en: "Deleting…" },
};

type TabId = "profile" | "security" | "plan" | "payments" | "privacy";

// Inline SVG icons for settings tabs — no emoji, consistent with the rest of the design
const TAB_ICONS: Record<TabId, React.ReactNode> = {
  profile: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  ),
  security: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  ),
  plan: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  ),
  payments: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  ),
  privacy: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
};

const TABS: Array<{ id: TabId; fr: string; en: string }> = [
  { id: "profile",  fr: "Profil",          en: "Profile" },
  { id: "security", fr: "Sécurité",        en: "Security" },
  { id: "plan",     fr: "Abonnement",      en: "Subscription" },
  { id: "payments", fr: "Paiements",       en: "Payments" },
  { id: "privacy",  fr: "Confidentialité", en: "Privacy" },
];

const card = "bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-6";

function SettingsContent() {
  const { lang, setLang, t } = useLanguage();
  const { showToast } = useToast();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<TabId>("profile");

  const [storedUser, setStoredUser] = useState<import("@/lib/auth").StoredUser | null>(null);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [pwdForm, setPwdForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSaved, setPwdSaved] = useState(false);

  const [stripeStatus, setStripeStatus] = useState<{
    connected: boolean; charges_enabled: boolean; payouts_enabled: boolean; account_id: string | null;
  } | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);

  // MFA state
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaSetupData, setMfaSetupData] = useState<{ secret: string; uri: string; qr_code_b64: string } | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaStep, setMfaStep] = useState<"idle" | "setup" | "disable">("idle");
  const [mfaError, setMfaError] = useState("");
  const [mfaSuccess, setMfaSuccess] = useState("");

  // Privacy / account deletion
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText]   = useState("");
  const [deleting, setDeleting]       = useState(false);

  useEffect(() => {
    if (!requireAuth()) return;
    setStoredUser(getUser());
    api.getProfile().then((p: any) => {
      setForm({
        first_name: p.first_name ?? p.full_name?.split(" ")[0] ?? "",
        last_name:  p.last_name  ?? p.full_name?.split(" ").slice(1).join(" ") ?? "",
        email:      p.email ?? "",
        phone:      p.phone ?? "",
      });
    }).catch(e => showToast(e instanceof Error ? e.message : String(e), "error"));
    api.getStripeConnectStatus().then(s => setStripeStatus(s)).catch(() => {});
    api.getMfaStatus().then((r: any) => setMfaEnabled(r.mfa_enabled ?? false)).catch(() => {});
    const stripeParam = searchParams?.get("stripe");
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (stripeParam === "connected") {
      setActiveTab("payments");
      showToast(lang === "fr" ? "Stripe connecté avec succès !" : "Stripe connected successfully!", "success");
      timer = setTimeout(() => api.getStripeConnectStatus().then(s => setStripeStatus(s)).catch(() => {}), 1500);
    }
    return () => { if (timer !== undefined) clearTimeout(timer); };
  }, []);

  async function handleSaveProfile() {
    setSaving(true); setProfileError(""); setSaved(false);
    try {
      await api.updateProfile({ full_name: `${form.first_name} ${form.last_name}`.trim(), phone: form.phone });
      const u = getUser();
      if (u) { u.full_name = `${form.first_name} ${form.last_name}`.trim(); localStorage.setItem("domely_user", JSON.stringify(u)); }
      setSaved(true);
      showToast(t(T.saved), "success");
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) { setProfileError(e.message); }
    finally { setSaving(false); }
  }

  async function handleChangePwd() {
    if (pwdForm.new_password !== pwdForm.confirm) { setPwdError(lang === "fr" ? "Les mots de passe ne correspondent pas." : "Passwords don't match."); return; }
    if (pwdForm.new_password.length < 8) { setPwdError(lang === "fr" ? "Au moins 8 caractères." : "At least 8 characters."); return; }
    setPwdSaving(true); setPwdError(""); setPwdSaved(false);
    try {
      await api.changePassword({ current_password: pwdForm.current_password, new_password: pwdForm.new_password });
      setPwdForm({ current_password: "", new_password: "", confirm: "" });
      setPwdSaved(true);
      showToast(lang === "fr" ? "Mot de passe mis à jour !" : "Password updated!", "success");
      setTimeout(() => setPwdSaved(false), 3000);
    } catch (e: any) { setPwdError(e.message); }
    finally { setPwdSaving(false); }
  }

  async function handleDeleteAccount() {
    const confirmWord = lang === "fr" ? "SUPPRIMER" : "DELETE";
    if (deleteText !== confirmWord) return;
    setDeleting(true);
    try {
      await api.deleteMyAccount(deleteText);
      localStorage.clear();
      window.location.href = "/login";
    } catch (e: any) {
      showToast(e.message ?? (lang === "fr" ? "Erreur lors de la suppression" : "Deletion failed"), "error");
      setDeleting(false);
    }
  }

  async function handleConnectStripe() {
    setStripeLoading(true);
    try {
      const { url } = await api.startStripeOnboarding();
      window.location.href = url;
    } catch (e: any) {
      showToast(e.message ?? (lang === "fr" ? "Erreur Stripe" : "Stripe error"), "error");
      setStripeLoading(false);
    }
  }

  const f  = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));
  const pf = (k: string, v: string) => setPwdForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <PageHeader title={t(T.title)} subtitle={t(T.sub)} />

      {/* ── Tab bar ───────────────────────────────────────────────────────── */}
      <div className="flex bg-gray-100 dark:bg-gray-800/60 rounded-2xl p-1 gap-1">
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                active
                  ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {TAB_ICONS[tab.id]}
              <span className="hidden sm:inline">{lang === "fr" ? tab.fr : tab.en}</span>
            </button>
          );
        })}
      </div>

      {/* ── Profile tab ───────────────────────────────────────────────────── */}
      {activeTab === "profile" && (
        <div className={card}>
          <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-5">{t(T.profile)}</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label={t(T.firstName)}>
                <input className={inputClass} value={form.first_name} onChange={e => f("first_name", e.target.value)} />
              </FormField>
              <FormField label={t(T.lastName)}>
                <input className={inputClass} value={form.last_name} onChange={e => f("last_name", e.target.value)} />
              </FormField>
            </div>
            <FormField label={t(T.email)}>
              <input className={inputClass + " opacity-60 cursor-not-allowed"} value={form.email} readOnly />
            </FormField>
            <FormField label={t(T.phone)}>
              <input className={inputClass} type="tel" value={form.phone} onChange={e => f("phone", formatPhone(e.target.value))} placeholder="514-555-0000" />
            </FormField>
            <FormField label={t(T.language)}>
              <SmartSelect
                value={lang}
                onChange={v => setLang(v as "fr" | "en")}
                options={[
                  { value: "fr", label: "Français" },
                  { value: "en", label: "English" },
                ]}
              />
            </FormField>
            {profileError && <p className="text-[13px] text-red-500">{profileError}</p>}
            <div className="flex items-center gap-3 pt-1">
              <button onClick={handleSaveProfile} disabled={saving} className="px-5 py-2.5 text-[13px] font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl transition-colors">
                {saving ? t(T.saving) : t(T.save)}
              </button>
              {saved && <span className="text-[13px] text-teal-600 font-medium">{t(T.saved)}</span>}
            </div>

            {/* Restart product tour */}
            <div className="pt-5 mt-5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-gray-700 dark:text-gray-300">
                  {lang === "fr" ? "Visite guidée" : "Guided tour"}
                </p>
                <p className="text-[12px] text-gray-400 mt-0.5">
                  {lang === "fr" ? "Relancez la visite interactive du tableau de bord." : "Relaunch the interactive dashboard walkthrough."}
                </p>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem("domely_tour_v1");
                  window.location.href = "/dashboard";
                }}
                className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-xl transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
                {lang === "fr" ? "Relancer la visite" : "Restart tour"}
              </button>
            </div>

            {/* Data export */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
              <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {lang === "fr" ? "Exportation des données" : "Data export"}
              </p>
              <p className="text-[12px] text-gray-400 mb-3">
                {lang === "fr"
                  ? "Téléchargez toutes vos données en format JSON (Loi 25 / GDPR)."
                  : "Download all your data as JSON (Loi 25 / GDPR)."}
              </p>
              <button
                onClick={async () => {
                  const token = localStorage.getItem("domely_token");
                  const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
                  const res = await fetch(`${BASE}/account/export`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                  });
                  if (!res.ok) return;
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = Object.assign(document.createElement("a"), { href: url, download: "domely-export.json" });
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                {lang === "fr" ? "Exporter mes données" : "Export my data"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Security tab ──────────────────────────────────────────────────── */}
      {activeTab === "security" && (
        <div className={card}>
          <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-5">{t(T.security)}</h3>
          <div className="space-y-4">
            <FormField label={t(T.currentPwd)}>
              <input className={inputClass} type="password" value={pwdForm.current_password} onChange={e => pf("current_password", e.target.value)} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label={t(T.newPwd)}>
                <input className={inputClass} type="password" value={pwdForm.new_password} onChange={e => pf("new_password", e.target.value)} placeholder="≥ 8 chars" />
              </FormField>
              <FormField
                label={t(T.confirmPwd)}
                error={pwdForm.confirm && pwdForm.new_password && pwdForm.confirm !== pwdForm.new_password
                  ? (lang === "fr" ? "Ne correspond pas" : "Doesn't match") : undefined}
              >
                <input
                  className={inputClass + (pwdForm.confirm && pwdForm.new_password && pwdForm.confirm !== pwdForm.new_password ? " !border-red-300 focus:!ring-red-400" : "")}
                  type="password"
                  value={pwdForm.confirm}
                  onChange={e => pf("confirm", e.target.value)}
                />
              </FormField>
            </div>
            {pwdError && <p className="text-[13px] text-red-500">{pwdError}</p>}
            <div className="flex items-center gap-3 pt-1">
              <button onClick={handleChangePwd} disabled={pwdSaving} className="px-5 py-2.5 text-[13px] font-semibold bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 disabled:opacity-60 text-white rounded-xl transition-colors">
                {pwdSaving ? t(T.saving) : t(T.updatePwd)}
              </button>
              {pwdSaved && <span className="text-[13px] text-teal-600 font-medium">{t(T.saved)}</span>}
            </div>
          </div>

          {/* ── MFA section ── */}
          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[14px] font-semibold text-gray-900 dark:text-white">
                  {lang === "fr" ? "Authentification à deux facteurs" : "Two-factor authentication"}
                </p>
                <p className="text-[12px] text-gray-400 mt-0.5">
                  {lang === "fr" ? "Protégez votre compte avec une app d'authentification (Google Authenticator, Authy…)" : "Protect your account with an authenticator app (Google Authenticator, Authy…)"}
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0 ${
                mfaEnabled
                  ? "bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
              }`}>
                {mfaEnabled ? (lang === "fr" ? "Activé" : "Enabled") : (lang === "fr" ? "Désactivé" : "Disabled")}
              </span>
            </div>

            {mfaError && (
              <div className="mb-3 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-[12px] text-red-600 dark:text-red-400">{mfaError}</div>
            )}
            {mfaSuccess && (
              <div className="mb-3 px-3 py-2.5 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 text-[12px] text-teal-600 dark:text-teal-400">{mfaSuccess}</div>
            )}

            {/* Setup flow */}
            {mfaStep === "setup" && mfaSetupData && (
              <div className="mb-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-4">
                <p className="text-[13px] font-medium text-gray-700 dark:text-gray-300">
                  {lang === "fr" ? "1. Scannez ce QR code avec votre application d'authentification" : "1. Scan this QR code with your authenticator app"}
                </p>
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`data:image/png;base64,${mfaSetupData.qr_code_b64}`} alt="QR Code MFA" className="w-40 h-40 rounded-lg border border-gray-200 dark:border-gray-700" />
                </div>
                <p className="text-[11px] text-gray-400 break-all font-mono text-center">{mfaSetupData.secret}</p>
                <p className="text-[13px] font-medium text-gray-700 dark:text-gray-300">
                  {lang === "fr" ? "2. Entrez le code à 6 chiffres généré par l'app" : "2. Enter the 6-digit code from your app"}
                </p>
                <div className="flex gap-2">
                  <input
                    className="flex-1 px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-[14px] font-mono tracking-widest text-center focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={mfaCode}
                    onChange={e => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  />
                  <button
                    onClick={async () => {
                      setMfaError(""); setMfaLoading(true);
                      try {
                        await api.verifyMfa(mfaCode);
                        setMfaEnabled(true); setMfaStep("idle"); setMfaCode(""); setMfaSetupData(null);
                        setMfaSuccess(lang === "fr" ? "Authentification à deux facteurs activée !" : "Two-factor authentication enabled!");
                        setTimeout(() => setMfaSuccess(""), 4000);
                      } catch (e: any) { setMfaError(e.message); }
                      finally { setMfaLoading(false); }
                    }}
                    disabled={mfaCode.length !== 6 || mfaLoading}
                    className="px-4 py-2.5 text-[13px] font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl transition-colors"
                  >
                    {mfaLoading ? "…" : (lang === "fr" ? "Confirmer" : "Confirm")}
                  </button>
                  <button
                    onClick={() => { setMfaStep("idle"); setMfaSetupData(null); setMfaCode(""); setMfaError(""); }}
                    className="px-4 py-2.5 text-[13px] font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl transition-colors"
                  >
                    {lang === "fr" ? "Annuler" : "Cancel"}
                  </button>
                </div>
              </div>
            )}

            {/* Disable flow */}
            {mfaStep === "disable" && (
              <div className="mb-4 p-4 rounded-xl bg-red-50/60 dark:bg-red-900/10 border border-red-200 dark:border-red-800 space-y-3">
                <p className="text-[13px] text-red-700 dark:text-red-400">
                  {lang === "fr" ? "Entrez votre code actuel pour désactiver le 2FA" : "Enter your current code to disable 2FA"}
                </p>
                <div className="flex gap-2">
                  <input
                    className="flex-1 px-3 py-2.5 bg-white dark:bg-gray-900 border border-red-200 dark:border-red-700 rounded-xl text-[14px] font-mono tracking-widest text-center focus:ring-2 focus:ring-red-400 outline-none"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={mfaCode}
                    onChange={e => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  />
                  <button
                    onClick={async () => {
                      setMfaError(""); setMfaLoading(true);
                      try {
                        await api.disableMfa(pwdForm.current_password, mfaCode);
                        setMfaEnabled(false); setMfaStep("idle"); setMfaCode("");
                        setMfaSuccess(lang === "fr" ? "Authentification à deux facteurs désactivée." : "Two-factor authentication disabled.");
                        setTimeout(() => setMfaSuccess(""), 4000);
                      } catch (e: any) { setMfaError(e.message); }
                      finally { setMfaLoading(false); }
                    }}
                    disabled={mfaCode.length !== 6 || mfaLoading}
                    className="px-4 py-2.5 text-[13px] font-semibold bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl transition-colors"
                  >
                    {mfaLoading ? "…" : (lang === "fr" ? "Désactiver" : "Disable")}
                  </button>
                  <button
                    onClick={() => { setMfaStep("idle"); setMfaCode(""); setMfaError(""); }}
                    className="px-4 py-2.5 text-[13px] font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl transition-colors"
                  >
                    {lang === "fr" ? "Annuler" : "Cancel"}
                  </button>
                </div>
              </div>
            )}

            {mfaStep === "idle" && (
              <button
                onClick={async () => {
                  if (mfaEnabled) {
                    setMfaStep("disable"); setMfaCode(""); setMfaError("");
                  } else {
                    setMfaLoading(true); setMfaError("");
                    try {
                      const data = await api.setupMfa();
                      setMfaSetupData(data); setMfaStep("setup"); setMfaCode("");
                    } catch (e: any) { setMfaError(e.message); }
                    finally { setMfaLoading(false); }
                  }
                }}
                disabled={mfaLoading}
                className={`px-5 py-2.5 text-[13px] font-semibold rounded-xl transition-colors disabled:opacity-50 ${
                  mfaEnabled
                    ? "text-red-600 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
                    : "bg-teal-600 hover:bg-teal-700 text-white"
                }`}
              >
                {mfaLoading ? "…" : mfaEnabled
                  ? (lang === "fr" ? "Désactiver le 2FA" : "Disable 2FA")
                  : (lang === "fr" ? "Activer le 2FA" : "Enable 2FA")}
              </button>
            )}
          </div>

          {/* Sign out — at the bottom of security */}
          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
            <p className="text-[12px] text-gray-400 mb-3">{lang === "fr" ? "Session active" : "Active session"}</p>
            <button
              onClick={logout}
              className="px-5 py-2.5 text-[13px] font-semibold text-red-600 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
            >
              {t(T.logout)}
            </button>
          </div>
        </div>
      )}

      {/* ── Plan tab ──────────────────────────────────────────────────────── */}
      {activeTab === "plan" && (
        <div className={card}>
          <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-5">{t(T.plan)}</h3>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[12px] text-gray-400 mb-2">{t(T.planLabel)}</p>
              <span className="px-3 py-1.5 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 text-[14px] font-semibold rounded-full capitalize">
                {storedUser?.plan ?? "Free"}
              </span>
            </div>
            <a
              href="/#pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 text-[13px] font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-colors"
            >
              {t(T.upgrade)} →
            </a>
          </div>
        </div>
      )}

      {/* ── Payments (Stripe Connect) tab ─────────────────────────────────── */}
      {activeTab === "payments" && (
        <div className={card}>
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
            <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">{t(T.stripe)}</h3>
          </div>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-5">{t(T.stripeDesc)}</p>

          {stripeStatus === null ? (
            <div className="h-9 w-40 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ) : stripeStatus.connected && stripeStatus.charges_enabled ? (
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-[13px] font-semibold border border-emerald-100 dark:border-emerald-800">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> {t(T.stripeConnected)}
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={stripeStatus.account_id ? `https://dashboard.stripe.com/connect/accounts/${stripeStatus.account_id}` : "https://dashboard.stripe.com"}
                  target="_blank" rel="noopener noreferrer"
                  className="text-[13px] text-teal-600 dark:text-teal-400 font-medium hover:underline"
                >
                  {t(T.stripeDashboard)}
                </a>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <button onClick={handleConnectStripe} disabled={stripeLoading} className="text-[12px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50">
                  {lang === "fr" ? "Mettre à jour" : "Update settings"}
                </button>
              </div>
            </div>
          ) : stripeStatus.connected && !stripeStatus.charges_enabled ? (
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-xl text-[13px] font-semibold border border-amber-100 dark:border-amber-800">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg> {t(T.stripeOnboarding)}
              </div>
              <button onClick={handleConnectStripe} disabled={stripeLoading} className="px-5 py-2.5 text-[13px] font-semibold bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-xl transition-colors">
                {stripeLoading ? t(T.stripeConnecting) : (lang === "fr" ? "Terminer l'inscription →" : "Complete setup →")}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={handleConnectStripe}
                disabled={stripeLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold text-white rounded-xl transition-all disabled:opacity-60 hover:scale-[1.01] active:scale-[0.99]"
                style={{ background: "linear-gradient(135deg, #635BFF, #8B83FF)" }}
              >
                {stripeLoading
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>}
                {stripeLoading ? t(T.stripeConnecting) : t(T.stripeConnect)}
              </button>
              <p className="text-[11px] text-gray-400">{t(T.stripeFee)}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Privacy & GDPR tab ────────────────────────────────────────────── */}
      {activeTab === "privacy" && (
        <div className="space-y-5">

          {/* Data transparency */}
          <div className={card}>
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">{t(T.privacy)}</h3>
            </div>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-5">{t(T.privacyDesc)}</p>

            {/* What we hold */}
            <h4 className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-3">{t(T.dataWeHold)}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {([
                { d: "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25", label: lang === "fr" ? "Propriétés & unités" : "Properties & units" },
                { d: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z", label: lang === "fr" ? "Locataires & contacts" : "Tenants & contacts" },
                { d: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z", label: lang === "fr" ? "Baux & signatures" : "Leases & signatures" },
                { d: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z", label: lang === "fr" ? "Paiements & loyers" : "Payments & rent" },
                { d: "M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z", label: lang === "fr" ? "Demandes de maintenance" : "Maintenance requests" },
                { d: "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z", label: lang === "fr" ? "Dépenses" : "Expenses" },
                { d: "M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75", label: lang === "fr" ? "Messages" : "Messages" },
                { d: "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z", label: lang === "fr" ? "Candidats" : "Applicants" },
              ] as { d: string; label: string }[]).map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl text-[13px] text-gray-700 dark:text-gray-300">
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={item.d} /></svg>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            <p className="mt-4 text-[12px] text-gray-400 leading-relaxed">
              {lang === "fr"
                ? "Vos données sont hébergées de façon sécurisée et ne sont jamais vendues à des tiers. Vous pouvez demander une copie de vos données à tout moment en contactant support@domely.app."
                : "Your data is securely hosted and never sold to third parties. You can request a copy of your data at any time by contacting support@domely.app."}
            </p>
          </div>

          {/* Account deletion */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-red-100 dark:border-red-900/40 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-6">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
              <h3 className="text-[15px] font-semibold text-red-700 dark:text-red-400">{t(T.deleteAccount)}</h3>
            </div>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-5">{t(T.deleteDesc)}</p>

            {!deleteOpen ? (
              <button
                onClick={() => { setDeleteOpen(true); setDeleteText(""); }}
                className="px-5 py-2.5 text-[13px] font-semibold text-red-600 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
              >
                {t(T.deleteAccount)} →
              </button>
            ) : (
              <div className="space-y-4">
                {/* Warning banner */}
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
                  <p className="text-[13px] text-red-700 dark:text-red-400 font-semibold mb-1">
                    <span className="inline-flex items-center gap-1.5"><svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>{lang === "fr" ? "Action irréversible" : "This cannot be undone"}</span>
                  </p>
                  <p className="text-[12px] text-red-600 dark:text-red-400">
                    {lang === "fr"
                      ? "Toutes vos données seront définitivement effacées. Cette opération est conforme au droit à l'effacement (Loi 25 / RGPD)."
                      : "All your data will be permanently erased. This is compliant with the right to erasure (Law 25 / GDPR)."}
                  </p>
                </div>

                {/* Confirmation input */}
                <div>
                  <label className="block text-[12px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                    {t(T.deleteConfirmLabel)}
                    <span className="ml-1 font-mono font-bold text-red-600 dark:text-red-400">
                      {lang === "fr" ? "SUPPRIMER" : "DELETE"}
                    </span>
                  </label>
                  <input
                    className={`${inputClass} !border-red-200 dark:!border-red-800 focus:!ring-red-400`}
                    value={deleteText}
                    onChange={e => setDeleteText(e.target.value)}
                    placeholder={lang === "fr" ? "SUPPRIMER" : "DELETE"}
                    autoComplete="off"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting || deleteText !== (lang === "fr" ? "SUPPRIMER" : "DELETE")}
                    className="px-5 py-2.5 text-[13px] font-semibold bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl transition-colors"
                  >
                    {deleting
                      ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{t(T.deleting)}</span>
                      : t(T.deleteBtn)}
                  </button>
                  <button
                    onClick={() => { setDeleteOpen(false); setDeleteText(""); }}
                    className="px-4 py-2.5 text-[13px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  >
                    {lang === "fr" ? "Annuler" : "Cancel"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-6"><div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <SettingsContent />
    </Suspense>
  );
}
