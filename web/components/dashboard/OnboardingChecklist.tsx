"use client";
import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { api } from "@/lib/api";
import { requireAuth } from "@/lib/auth";

const DISMISSED_KEY  = "domely_checklist_dismissed";
const COLLAPSED_KEY  = "domely_checklist_collapsed";
const AI_TRIED_KEY   = "domely_ai_tried";

interface Step {
  id: string;
  icon: string;
  fr: string;
  en: string;
  href: string;
  done: boolean;
}

export default function OnboardingChecklist() {
  const { lang } = useLanguage();
  const pathname = usePathname();
  const [dismissed,  setDismissed]  = useState(true);   // true until hydrated
  const [collapsed,  setCollapsed]  = useState(false);
  const [steps,      setSteps]      = useState<Step[]>([]);
  const [allDone,    setAllDone]    = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  // ── Mark AI as tried when user visits /dashboard/ai ────────────────────────
  useEffect(() => {
    if (pathname === "/dashboard/ai") {
      localStorage.setItem(AI_TRIED_KEY, "1");
    }
  }, [pathname]);

  // ── Load state from localStorage + API ─────────────────────────────────────
  const loadSteps = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISSED_KEY)) { setDismissed(true); return; }
    setDismissed(false);
    setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1");

    let props = 0, tenants = 0, payments = 0;
    try {
      if (!requireAuth()) return;
      const stats = await api.getDashboard();
      props    = stats?.total_properties    ?? 0;
      tenants  = stats?.total_tenants       ?? 0;
      payments = stats?.recent_payments?.length ?? 0;
    } catch { /* silently ignore */ }

    const aiTried = !!localStorage.getItem(AI_TRIED_KEY);

    const built: Step[] = [
      {
        id: "account",
        icon: "✅",
        fr: "Créer votre compte",
        en: "Create your account",
        href: "/dashboard",
        done: true,
      },
      {
        id: "property",
        icon: "🏠",
        fr: "Ajouter votre première propriété",
        en: "Add your first property",
        href: "/dashboard/properties",
        done: props > 0,
      },
      {
        id: "tenant",
        icon: "👤",
        fr: "Ajouter un locataire",
        en: "Add a tenant",
        href: "/dashboard/tenants",
        done: tenants > 0,
      },
      {
        id: "rent",
        icon: "💳",
        fr: "Enregistrer un paiement de loyer",
        en: "Record a rent payment",
        href: "/dashboard/rent",
        done: payments > 0,
      },
      {
        id: "ai",
        icon: "✨",
        fr: "Essayer Domely AI",
        en: "Try Domely AI",
        href: "/dashboard/ai",
        done: aiTried,
      },
    ];

    setSteps(built);
    const done = built.every(s => s.done);
    if (done && !allDone) {
      setAllDone(true);
      setCelebrating(true);
      setTimeout(() => setCelebrating(false), 3000);
    }
  }, [allDone]);

  useEffect(() => { loadSteps(); }, [pathname]); // re-check on every nav

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
    window.dispatchEvent(new CustomEvent("domely:checklistDismissed"));
  }

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
  }

  if (dismissed || steps.length === 0) return null;

  const done  = steps.filter(s => s.done).length;
  const total = steps.length;
  const pct   = Math.round((done / total) * 100);

  return (
    <div className={`fixed bottom-6 left-6 z-50 w-[300px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden transition-all duration-300 ${
      celebrating ? "ring-2 ring-teal-400 shadow-teal-100 dark:shadow-teal-900/30" : ""
    }`}>

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3.5 cursor-pointer select-none"
        style={{ background: "linear-gradient(135deg, #0f4c41, #1E7A6E)" }}
        onClick={toggleCollapse}
      >
        <div className="flex items-center gap-2.5">
          <svg className="w-5 h-5 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              {allDone
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
              }
            </svg>
          <div>
            <p className="text-[13px] font-bold text-white leading-tight">
              {lang === "fr" ? "Premiers pas" : "Getting started"}
            </p>
            <p className="text-[11px] text-teal-200">
              {done}/{total} {lang === "fr" ? "étapes complétées" : "steps completed"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Progress ring */}
          <svg width="28" height="28" className="flex-shrink-0">
            <circle cx="14" cy="14" r="11" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" />
            <circle
              cx="14" cy="14" r="11" fill="none"
              stroke="white" strokeWidth="2.5"
              strokeDasharray={`${2 * Math.PI * 11}`}
              strokeDashoffset={`${2 * Math.PI * 11 * (1 - pct / 100)}`}
              strokeLinecap="round"
              transform="rotate(-90 14 14)"
              className="transition-all duration-500"
            />
            <text x="14" y="18" textAnchor="middle" className="text-[8px]" fill="white"
              style={{ fontSize: 8, fontWeight: 700 }}>{pct}%</text>
          </svg>
          {/* Chevron */}
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.7)" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d={collapsed ? "M19 9l-7 7-7-7" : "M5 15l7-7 7 7"} />
          </svg>
        </div>
      </div>

      {/* Steps list */}
      {!collapsed && (
        <>
          <div className="divide-y divide-gray-50 dark:divide-gray-800/80">
            {steps.map((step) => (
              <Link
                key={step.id}
                href={step.href}
                className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                  step.done
                    ? "opacity-50 cursor-default"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                }`}
                onClick={e => step.done && e.preventDefault()}
              >
                <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                  step.done
                    ? "bg-teal-500 text-white"
                    : "border-2 border-gray-200 dark:border-gray-700 text-transparent"
                }`}>
                  {step.done && (
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className={`text-[13px] flex-1 leading-tight ${
                  step.done
                    ? "line-through text-gray-400 dark:text-gray-600"
                    : "text-gray-700 dark:text-gray-300 font-medium"
                }`}>
                  {lang === "fr" ? step.fr : step.en}
                </span>
                {!step.done && (
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    strokeWidth={2} className="text-gray-300 dark:text-gray-600 flex-shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </Link>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            {allDone ? (
              <p className="text-[12px] font-semibold text-teal-600 dark:text-teal-400">
                {lang === "fr" ? "Vous êtes prêt !" : "You're all set!"}
              </p>
            ) : (
              <p className="text-[11px] text-gray-400">
                {lang === "fr" ? "Cliquez une étape pour commencer" : "Click a step to get started"}
              </p>
            )}
            <button
              onClick={dismiss}
              className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors underline underline-offset-2"
            >
              {lang === "fr" ? "Ignorer" : "Dismiss"}
            </button>
          </div>
        </>
      )}

    </div>
  );
}
