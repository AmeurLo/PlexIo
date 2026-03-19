"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";

const COOKIE_KEY = "domely_cookie_prefs";

type Prefs = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
};

const DEFAULT_PREFS: Prefs = { essential: true, analytics: false, marketing: false };

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange?.(!checked)}
      disabled={disabled}
      className="relative rounded-full transition-all duration-200 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed"
      style={{ width: 40, height: 22, background: checked ? "#3FAF86" : "#D1D5DB" }}
    >
      <span
        className="absolute top-[3px] left-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200"
        style={{ transform: checked ? "translateX(18px)" : "translateX(0)" }}
      />
    </button>
  );
}

export default function CookieConsent() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  useEffect(() => {
    try {
      if (!localStorage.getItem(COOKIE_KEY)) setVisible(true);
    } catch { /* ignore */ }
  }, []);

  const save = (p: Prefs) => {
    try { localStorage.setItem(COOKIE_KEY, JSON.stringify(p)); } catch { /* ignore */ }
    setVisible(false);
  };

  const acceptAll  = () => save({ essential: true, analytics: true, marketing: true });
  const declineAll = () => save({ essential: true, analytics: false, marketing: false });
  const savePrefs  = () => save(prefs);

  if (!visible) return null;

  const CATEGORIES = [
    {
      key: "essential" as const,
      required: true,
      title: { fr: "Essentiels", en: "Essential" },
      desc: {
        fr: "Nécessaires au fonctionnement du site : authentification, sécurité, préférences. Toujours actifs.",
        en: "Required for the site to work: authentication, security, preferences. Always on.",
      },
    },
    {
      key: "analytics" as const,
      required: false,
      title: { fr: "Analytiques", en: "Analytics" },
      desc: {
        fr: "Nous aident à comprendre comment vous utilisez Domely pour améliorer l'expérience.",
        en: "Help us understand how you use Domely so we can improve it.",
      },
    },
    {
      key: "marketing" as const,
      required: false,
      title: { fr: "Marketing", en: "Marketing" },
      desc: {
        fr: "Utilisés pour vous présenter des publicités pertinentes sur d'autres plateformes.",
        en: "Used to show you relevant ads on other platforms.",
      },
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] px-4 pb-4 flex justify-center pointer-events-none">
      <div
        className="w-full pointer-events-auto rounded-2xl overflow-hidden"
        style={{
          maxWidth: expanded ? 520 : 660,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          boxShadow: "0 8px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05)",
          transition: "max-width 0.25s ease",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Domely" width={24} height={24} className="flex-shrink-0" />
          <span className="brand-name text-[15px]" style={{ color: "#1c1c1c" }}>Domely</span>
          <div className="w-px h-4 bg-gray-200 mx-1" />
          <p className="text-[13px] font-semibold text-gray-700">
            {t({ fr: "Gestion des cookies", en: "Cookie preferences" })}
          </p>
          {expanded && (
            <button
              onClick={() => setExpanded(false)}
              className="ml-auto p-1 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="px-6 py-4">
          {/* Compact description */}
          {!expanded && (
            <p className="text-[13px] leading-relaxed text-gray-500 mb-4">
              {t({
                fr: "Nous utilisons des cookies pour faire fonctionner Domely, analyser notre trafic et personnaliser votre expérience. Consultez notre ",
                en: "We use cookies to run Domely, analyze traffic, and personalize your experience. See our ",
              })}
              <a href="/privacy" className="text-teal-600 hover:underline font-medium">
                {t({ fr: "politique de confidentialité", en: "privacy policy" })}
              </a>
              {t({ fr: ".", en: "." })}
            </p>
          )}

          {/* Expanded: categories */}
          {expanded && (
            <div className="flex flex-col gap-2.5 mb-4">
              <p className="text-[12px] text-gray-400 mb-1">
                {t({
                  fr: "Choisissez les catégories que vous souhaitez activer.",
                  en: "Choose which categories you want to enable.",
                })}
              </p>
              {CATEGORIES.map((cat) => (
                <div
                  key={cat.key}
                  className="flex items-start gap-4 rounded-xl p-4 bg-gray-50 border border-gray-100"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-semibold text-gray-800">{t(cat.title)}</span>
                      {cat.required && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-teal-700 bg-teal-50 border border-teal-100">
                          {t({ fr: "Requis", en: "Required" })}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] leading-relaxed text-gray-500">{t(cat.desc)}</p>
                  </div>
                  <Toggle
                    checked={cat.required ? true : prefs[cat.key as "analytics" | "marketing"]}
                    onChange={cat.required ? undefined : (v) => setPrefs((p) => ({ ...p, [cat.key]: v }))}
                    disabled={cat.required}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Buttons */}
          <div className={`flex gap-2 ${expanded ? "flex-col sm:flex-row-reverse" : "flex-wrap sm:flex-nowrap items-center"}`}>
            <button
              onClick={acceptAll}
              className="px-5 py-2.5 text-[13px] font-semibold text-white rounded-xl flex-shrink-0 transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}
            >
              {t({ fr: "Tout accepter", en: "Accept all" })}
            </button>

            {expanded && (
              <button
                onClick={savePrefs}
                className="px-5 py-2.5 text-[13px] font-semibold text-gray-700 rounded-xl border border-gray-200 bg-white flex-shrink-0 transition-all hover:bg-gray-50 active:scale-[0.98]"
              >
                {t({ fr: "Enregistrer mes choix", en: "Save my choices" })}
              </button>
            )}

            <button
              onClick={declineAll}
              className="px-5 py-2.5 text-[13px] font-medium text-gray-400 rounded-xl flex-shrink-0 transition-all hover:bg-gray-100 hover:text-gray-600"
            >
              {t({ fr: "Tout refuser", en: "Decline all" })}
            </button>

            {!expanded && (
              <button
                onClick={() => setExpanded(true)}
                className="px-5 py-2.5 text-[13px] font-medium text-gray-400 rounded-xl flex-shrink-0 transition-all hover:bg-gray-100 hover:text-gray-600"
              >
                {t({ fr: "Gérer mes préférences", en: "Manage preferences" })}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
