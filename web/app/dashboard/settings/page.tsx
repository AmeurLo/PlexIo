"use client";
import { useEffect, useState, Suspense } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/lib/ToastContext";
import { requireAuth, getUser, logout } from "@/lib/auth";
import { api } from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import FormField, { inputClass } from "@/components/dashboard/FormField";
import SmartSelect from "@/components/dashboard/SmartSelect";
import { useSearchParams } from "next/navigation";

function formatPhone(val: string): string {
  const d = val.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

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
};

type TabId = "profile" | "security" | "plan" | "payments";

const TABS: Array<{ id: TabId; icon: string; fr: string; en: string }> = [
  { id: "profile",  icon: "👤", fr: "Profil",       en: "Profile" },
  { id: "security", icon: "🔒", fr: "Sécurité",     en: "Security" },
  { id: "plan",     icon: "⭐", fr: "Abonnement",   en: "Subscription" },
  { id: "payments", icon: "💳", fr: "Paiements",    en: "Payments" },
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
              <span className="text-base leading-none">{tab.icon}</span>
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
            <span className="text-xl">💳</span>
            <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">{t(T.stripe)}</h3>
          </div>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-5">{t(T.stripeDesc)}</p>

          {stripeStatus === null ? (
            <div className="h-9 w-40 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ) : stripeStatus.connected && stripeStatus.charges_enabled ? (
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-[13px] font-semibold border border-emerald-100 dark:border-emerald-800">
                <span>✅</span> {t(T.stripeConnected)}
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
                <span>⚠️</span> {t(T.stripeOnboarding)}
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
                  : <span>⚡</span>}
                {stripeLoading ? t(T.stripeConnecting) : t(T.stripeConnect)}
              </button>
              <p className="text-[11px] text-gray-400">{t(T.stripeFee)}</p>
            </div>
          )}
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
