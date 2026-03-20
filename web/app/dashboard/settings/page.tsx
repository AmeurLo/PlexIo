"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/lib/ToastContext";
import { requireAuth, getUser, logout } from "@/lib/auth";
import { api } from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";
import FormField, { inputClass, selectClass } from "@/components/dashboard/FormField";

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
  changePwd:   { fr: "Changer le mot de passe", en: "Change password" },
  currentPwd:  { fr: "Mot de passe actuel", en: "Current password" },
  newPwd:      { fr: "Nouveau mot de passe", en: "New password" },
  confirmPwd:  { fr: "Confirmer",          en: "Confirm" },
  updatePwd:   { fr: "Mettre à jour",      en: "Update" },
  logout:      { fr: "Se déconnecter",     en: "Sign out" },
  plan:        { fr: "Abonnement",         en: "Subscription" },
  planLabel:   { fr: "Plan actuel",        en: "Current plan" },
  upgrade:     { fr: "Mettre à niveau",    en: "Upgrade" },
};

export default function SettingsPage() {
  const { lang, setLang, t } = useLanguage();
  const { showToast } = useToast();
  const [storedUser, setStoredUser] = useState<import("@/lib/auth").StoredUser | null>(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name:  "",
    email:      "",
    phone:      "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [pwdForm, setPwdForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSaved, setPwdSaved] = useState(false);

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
  }, []);

  async function handleSaveProfile() {
    setSaving(true); setProfileError(""); setSaved(false);
    try {
      await api.updateProfile({
        full_name: `${form.first_name} ${form.last_name}`.trim(),
        phone: form.phone,
      });
      // Update localStorage
      const u = getUser();
      if (u) {
        u.full_name = `${form.first_name} ${form.last_name}`.trim();
        localStorage.setItem("domely_user", JSON.stringify(u));
      }
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

  const f = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));
  const pf = (k: string, v: string) => setPwdForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <PageHeader title={t(T.title)} subtitle={t(T.sub)} />

      {/* Profile */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-6">
        <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-5">{t(T.profile)}</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t(T.firstName)}><input className={inputClass} value={form.first_name} onChange={e => f("first_name", e.target.value)} /></FormField>
            <FormField label={t(T.lastName)}><input className={inputClass} value={form.last_name} onChange={e => f("last_name", e.target.value)} /></FormField>
          </div>
          <FormField label={t(T.email)}>
            <input className={inputClass + " opacity-60 cursor-not-allowed"} value={form.email} readOnly />
          </FormField>
          <FormField label={t(T.phone)}>
            <input className={inputClass} type="tel" value={form.phone} onChange={e => f("phone", e.target.value)} placeholder="514-555-0000" />
          </FormField>
          <FormField label={t(T.language)}>
            <select className={selectClass} value={lang} onChange={e => setLang(e.target.value as "fr" | "en")}>
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </FormField>
          {profileError && <p className="text-[13px] text-red-500">{profileError}</p>}
          <div className="flex items-center gap-3">
            <button onClick={handleSaveProfile} disabled={saving} className="px-5 py-2.5 text-[13px] font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl transition-colors">
              {saving ? t(T.saving) : t(T.save)}
            </button>
            {saved && <span className="text-[13px] text-teal-600 font-medium">{t(T.saved)}</span>}
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-6">
        <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-5">{t(T.security)}</h3>
        <div className="space-y-4">
          <FormField label={t(T.currentPwd)}>
            <input className={inputClass} type="password" value={pwdForm.current_password} onChange={e => pf("current_password", e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t(T.newPwd)}>
              <input className={inputClass} type="password" value={pwdForm.new_password} onChange={e => pf("new_password", e.target.value)} placeholder="≥ 8 chars" />
            </FormField>
            <FormField label={t(T.confirmPwd)}>
              <input className={inputClass} type="password" value={pwdForm.confirm} onChange={e => pf("confirm", e.target.value)} />
            </FormField>
          </div>
          {pwdError && <p className="text-[13px] text-red-500">{pwdError}</p>}
          <div className="flex items-center gap-3">
            <button onClick={handleChangePwd} disabled={pwdSaving} className="px-5 py-2.5 text-[13px] font-semibold bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 disabled:opacity-60 text-white rounded-xl transition-colors">
              {pwdSaving ? t(T.saving) : t(T.updatePwd)}
            </button>
            {pwdSaved && <span className="text-[13px] text-teal-600 font-medium">{t(T.saved)}</span>}
          </div>
        </div>
      </div>

      {/* Plan */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-6">
        <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">{t(T.plan)}</h3>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[12px] text-gray-400 mb-1">{t(T.planLabel)}</p>
            <span className="px-3 py-1 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 text-[13px] font-semibold rounded-full capitalize">
              {storedUser?.plan ?? "Free"}
            </span>
          </div>
          <a href="/#pricing" target="_blank" rel="noopener noreferrer" className="px-4 py-2 text-[13px] font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-colors">
            {t(T.upgrade)}
          </a>
        </div>
      </div>

      {/* Sign out */}
      <div className="pb-4">
        <button
          onClick={logout}
          className="px-5 py-2.5 text-[13px] font-semibold text-red-600 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
        >
          {t(T.logout)}
        </button>
      </div>
    </div>
  );
}
