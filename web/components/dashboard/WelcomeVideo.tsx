"use client";
import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";

const DISMISSED_KEY = "domely_welcome_video_dismissed";

interface Props {
  /** Hide the card once the user has set up their account (has properties) */
  hidden?: boolean;
}

export default function WelcomeVideo({ hidden }: Props) {
  const { lang } = useLanguage();
  const [dismissed, setDismissed] = useState(true); // start true to avoid flash

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISSED_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  function dismiss() {
    try { localStorage.setItem(DISMISSED_KEY, "1"); } catch {}
    setDismissed(true);
  }

  if (hidden || dismissed) return null;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-teal-100 dark:border-teal-800/50 shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
      style={{ background: "linear-gradient(135deg,#f0fdfa 0%,#e8fdf8 100%)" }}>

      {/* Dismiss button */}
      <button
        onClick={dismiss}
        aria-label="Fermer"
        className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-white/80 dark:bg-gray-900/80 text-gray-400 hover:text-gray-700 hover:bg-white dark:hover:bg-gray-900 transition-all shadow-sm backdrop-blur-sm"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex flex-col lg:flex-row gap-0">
        {/* Video player */}
        <div className="lg:w-[55%] flex-shrink-0">
          <video
            src="/welcome.mp4"
            controls
            playsInline
            className="w-full h-full object-cover lg:rounded-l-2xl lg:rounded-r-none rounded-t-2xl"
            style={{ maxHeight: 280 }}
          />
        </div>

        {/* Text content */}
        <div className="flex flex-col justify-center px-6 py-6 lg:py-8 gap-3">
          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-teal-600 dark:text-teal-400">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
            {lang === "fr" ? "Bienvenue" : "Welcome"}
          </span>

          <h2 className="text-[20px] font-bold text-teal-900 dark:text-teal-100 leading-snug">
            {lang === "fr"
              ? "Découvrez Domely en 2 minutes"
              : "Discover Domely in 2 minutes"}
          </h2>

          <p className="text-[13px] text-teal-700 dark:text-teal-300 leading-relaxed">
            {lang === "fr"
              ? "Regardez cette courte vidéo pour apprendre à ajouter vos propriétés, inviter vos locataires et gérer vos baux en quelques clics."
              : "Watch this short video to learn how to add your properties, invite tenants, and manage leases in just a few clicks."}
          </p>

          <button
            onClick={dismiss}
            className="mt-1 self-start text-[12px] font-medium text-teal-500 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-200 transition-colors underline underline-offset-2"
          >
            {lang === "fr" ? "Ne plus afficher" : "Don't show again"}
          </button>
        </div>
      </div>
    </div>
  );
}
