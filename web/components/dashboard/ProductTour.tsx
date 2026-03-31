"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { getUser } from "@/lib/auth";

// ─── Tour version key ─────────────────────────────────────────────────────────
// Bump to force re-show after a major product update
const TOUR_KEY = "domely_tour_v1";

// ─── Step definitions ─────────────────────────────────────────────────────────
interface TourStep {
  id: string;
  type: "modal" | "spotlight";
  target?: string;  // CSS selector for spotlight target
  icon?: "home" | "check" | "rocket";
  title: { fr: string; en: string };
  body:  { fr: string; en: string };
}

const STEPS: TourStep[] = [
  {
    id: "welcome",
    type: "modal",
    icon: "rocket",
    title: { fr: "Bienvenue sur Domely !", en: "Welcome to Domely!" },
    body: {
      fr: "En 90 secondes, nous allons vous montrer les 5 sections essentielles. Vous pourrez explorer à votre rythme ensuite.",
      en: "In 90 seconds, we'll show you the 5 key sections. You can explore everything at your own pace after.",
    },
  },
  {
    id: "properties",
    type: "spotlight",
    target: 'a[href="/dashboard/properties"]',
    title: { fr: "Vos propriétés", en: "Your properties" },
    body: {
      fr: "Commencez ici — ajoutez vos immeubles, créez les unités et suivez le taux d'occupation en temps réel.",
      en: "Start here — add your buildings, create units, and track occupancy rate in real time.",
    },
  },
  {
    id: "tenants",
    type: "spotlight",
    target: 'a[href="/dashboard/tenants"]',
    title: { fr: "Locataires & portail", en: "Tenants & portal" },
    body: {
      fr: "Gérez vos locataires et invitez-les au portail. Ils pourront payer leur loyer en ligne et soumettre des demandes.",
      en: "Manage your tenants and invite them to the portal. They can pay rent online and submit maintenance requests.",
    },
  },
  {
    id: "leases",
    type: "spotlight",
    target: 'a[href="/dashboard/leases"]',
    title: { fr: "Baux officiels PDF", en: "Official PDF leases" },
    body: {
      fr: "Créez un bail — Domely génère automatiquement le document officiel TAL (Québec) prêt à signer, sans Word ni PDF manuels.",
      en: "Create a lease — Domely auto-generates the official TAL (Quebec) document ready to sign. No Word or manual PDFs.",
    },
  },
  {
    id: "rent",
    type: "spotlight",
    target: 'a[href="/dashboard/rent"]',
    title: { fr: "Loyers & paiements", en: "Rent & payments" },
    body: {
      fr: "Chaque mois : payé, en attente, en retard — d'un seul regard. Activez les paiements en ligne pour encaisser automatiquement.",
      en: "Every month: paid, pending, late — at a glance. Enable online payments to collect rent automatically.",
    },
  },
  {
    id: "maintenance",
    type: "spotlight",
    target: 'a[href="/dashboard/maintenance"]',
    title: { fr: "Maintenance", en: "Maintenance" },
    body: {
      fr: "Vos locataires signalent des problèmes depuis le portail. Vous les suivez ici, assignez des entrepreneurs et gérez les coûts.",
      en: "Tenants report issues from their portal. Track them here, assign contractors, and manage costs.",
    },
  },
  {
    id: "done",
    type: "modal",
    icon: "check",
    title: { fr: "Vous êtes prêt !", en: "You're all set!" },
    body: {
      fr: "La visite est terminée. Ajoutez votre première propriété pour commencer — cela prend moins de 2 minutes.",
      en: "Tour complete. Add your first property to get started — it takes less than 2 minutes.",
    },
  },
];

const SPOTLIGHT_STEPS = STEPS.filter(s => s.type === "spotlight");
const TOTAL_SPOTS    = SPOTLIGHT_STEPS.length;

// ─── Public helper: call from Settings to restart tour ───────────────────────
export function restartTour() {
  if (typeof window !== "undefined") localStorage.removeItem(TOUR_KEY);
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ProductTour() {
  const router   = useRouter();
  const { lang } = useLanguage();

  const [step,               setStep]               = useState<number | null>(null);
  const [targetRect,         setTargetRect]         = useState<DOMRect | null>(null);
  const [firstName,          setFirstName]          = useState("");
  const [isDesktop,          setIsDesktop]          = useState(false);
  // Track whether OnboardingChecklist has been dismissed — ProductTour is
  // suppressed until then so both experiences never run simultaneously.
  const [checklistDismissed, setChecklistDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("domely_checklist_dismissed");
  });
  const animating = useRef(false);

  // ── Detect desktop (sidebar is only visible on lg+) ──────────────────────
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── React when OnboardingChecklist is dismissed in the same session ───────
  useEffect(() => {
    const handler = () => setChecklistDismissed(true);
    window.addEventListener("domely:checklistDismissed", handler);
    return () => window.removeEventListener("domely:checklistDismissed", handler);
  }, []);

  // ── Init: show tour only for new users, and only after checklist dismissed ─
  useEffect(() => {
    if (!isDesktop) return;
    if (!checklistDismissed) return; // suppress while OnboardingChecklist is active
    if (localStorage.getItem(TOUR_KEY)) return;
    const u = getUser();
    setFirstName(u?.full_name?.split(" ")[0] || "");
    setStep(0);
  }, [isDesktop, checklistDismissed]);

  // ── Find + track target element rect ──────────────────────────────────────
  useEffect(() => {
    if (step === null) return;
    const s = STEPS[step];
    if (s.type === "modal" || !s.target) { setTargetRect(null); return; }

    const find = () => {
      const el = document.querySelector<HTMLElement>(s.target!);
      if (el) setTargetRect(el.getBoundingClientRect());
    };
    find();
    const timer = setTimeout(find, 250); // retry after potential navigation
    return () => clearTimeout(timer);
  }, [step]);

  // ── Update rect on window resize ──────────────────────────────────────────
  useEffect(() => {
    if (!targetRect || step === null) return;
    const s = STEPS[step];
    if (!s?.target) return;
    const update = () => {
      const el = document.querySelector<HTMLElement>(s.target!);
      if (el) setTargetRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, [targetRect, step]);

  // ── Confetti on done step ─────────────────────────────────────────────────
  useEffect(() => {
    if (step !== null && STEPS[step]?.id === "done") spawnConfetti();
  }, [step]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const advance = useCallback(() => {
    if (animating.current) return;
    const next = (step ?? 0) + 1;
    if (next >= STEPS.length) {
      complete();
      return;
    }
    setStep(next);
  }, [step]);

  const complete = useCallback(() => {
    localStorage.setItem(TOUR_KEY, "1");
    setStep(null);
  }, []);

  const skip = useCallback(() => {
    localStorage.setItem(TOUR_KEY, "skipped");
    setStep(null);
  }, []);

  const goToProperties = useCallback(() => {
    complete();
    router.push("/dashboard/properties");
  }, [complete, router]);

  // ── Nothing to render ─────────────────────────────────────────────────────
  if (step === null || !isDesktop) return null;

  const current = STEPS[step];
  const spotIdx = SPOTLIGHT_STEPS.findIndex(s => s.id === current.id);
  const isLastSpot = spotIdx === TOTAL_SPOTS - 1;

  // ══════════════════════════════════════════════════════════════════════════
  // Welcome / Done modal
  // ══════════════════════════════════════════════════════════════════════════
  if (current.type === "modal") {
    const isDone = current.id === "done";
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={skip} />

        {/* Card */}
        <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.22)] border border-gray-100 dark:border-gray-800 w-full max-w-[420px] overflow-hidden">
          {/* Top gradient bar */}
          <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg,#1E7A6E,#3FAF86,#06b6d4)" }} />

          <div className="p-8 text-center">
            {/* Icon */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: isDone ? "linear-gradient(135deg,#1E7A6E,#3FAF86)" : "linear-gradient(135deg,#f0fdfa,#ccfbf1)" }}
            >
              {isDone ? (
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7l-3.182 3.182m0 0l-1.516 1.516m1.516-1.516L13.5 18.75m-1.5-1.5l3.182-3.182M3 3l3.621 3.621" />
                </svg>
              )}
            </div>

            <h2 className="text-[22px] font-bold text-gray-900 dark:text-white mb-3 leading-tight">
              {lang === "fr"
                ? (isDone ? current.title.fr : `${current.title.fr.replace(" !", "")}${firstName ? `, ${firstName}` : ""} !`)
                : (isDone ? current.title.en : `${current.title.en.replace("!", "")}${firstName ? `, ${firstName}` : ""}!`)
              }
            </h2>

            <p className="text-[14px] text-gray-500 dark:text-gray-400 leading-relaxed mb-7">
              {lang === "fr" ? current.body.fr : current.body.en}
            </p>

            {/* Progress dots for welcome */}
            {!isDone && (
              <div className="flex justify-center gap-1.5 mb-6">
                {SPOTLIGHT_STEPS.map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700" />
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <button
                onClick={isDone ? goToProperties : advance}
                className="w-full py-3.5 text-[15px] font-semibold text-white rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-teal-500/20"
                style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}
              >
                {isDone
                  ? (lang === "fr" ? "Ajouter ma première propriété →" : "Add my first property →")
                  : (lang === "fr" ? "Commencer la visite →" : "Start the tour →")
                }
              </button>

              <button
                onClick={isDone ? complete : skip}
                className="w-full py-2 text-[13px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {isDone
                  ? (lang === "fr" ? "Aller au tableau de bord" : "Go to dashboard")
                  : (lang === "fr" ? "Passer — j'explore seul" : "Skip — I'll explore on my own")
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Spotlight step
  // ══════════════════════════════════════════════════════════════════════════
  if (!targetRect) return null;

  const PAD = 8;
  const sx  = targetRect.left - PAD;
  const sy  = targetRect.top  - PAD;
  const sw  = targetRect.width  + PAD * 2;
  const sh  = targetRect.height + PAD * 2;
  const SR  = 10;

  // Tooltip: to the right of the sidebar
  const TW = 300;
  const TL = targetRect.right + 20;
  const TT = Math.max(8, targetRect.top + targetRect.height / 2 - 90);

  return (
    <>
      {/* ── SVG spotlight overlay ─────────────────────────────────────────── */}
      <svg
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 9998, width: "100vw", height: "100vh", overflow: "visible" }}
        aria-hidden="true"
      >
        <defs>
          <mask id="domely-tour-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect x={sx} y={sy} width={sw} height={sh} rx={SR} ry={SR} fill="black" />
          </mask>
        </defs>

        {/* Dark overlay with hole */}
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.68)" mask="url(#domely-tour-mask)" />

        {/* Teal border glow */}
        <rect x={sx - 1.5} y={sy - 1.5} width={sw + 3} height={sh + 3}
          rx={SR + 1} ry={SR + 1} fill="none" stroke="#14b8a6" strokeWidth="2" />

        {/* Animated pulse ring */}
        <rect x={sx - 5} y={sy - 5} width={sw + 10} height={sh + 10}
          rx={SR + 4} ry={SR + 4} fill="none" stroke="#14b8a6" strokeWidth="2">
          <animate attributeName="opacity"       values="0.5;0;0.5"   dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="stroke-width"  values="2;5;2"       dur="2.2s" repeatCount="indefinite" />
        </rect>
      </svg>

      {/* ── Tooltip card ──────────────────────────────────────────────────── */}
      <div
        className="fixed bg-white dark:bg-gray-900 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.22)] border border-gray-100 dark:border-gray-800"
        style={{ zIndex: 9999, left: TL, top: TT, width: TW }}
      >
        {/* Arrow pointing left (toward sidebar) */}
        <div
          className="absolute bg-white dark:bg-gray-900 border-l border-b border-gray-100 dark:border-gray-800"
          style={{ left: -6, top: "50%", transform: "translateY(-50%) rotate(45deg)", width: 12, height: 12 }}
        />

        <div className="p-5">
          {/* Progress bar + counter */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1.5 flex-1">
              {SPOTLIGHT_STEPS.map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width:      i === spotIdx ? 24 : 10,
                    background: i  < spotIdx ? "#5eead4"
                              : i === spotIdx ? "#1E7A6E"
                              : "#e5e7eb",
                  }}
                />
              ))}
            </div>
            <span className="text-[11px] font-medium text-gray-400 tabular-nums flex-shrink-0">
              {spotIdx + 1} / {TOTAL_SPOTS}
            </span>
          </div>

          <h3 className="text-[15px] font-bold text-gray-900 dark:text-white mb-1.5 leading-snug">
            {lang === "fr" ? current.title.fr : current.title.en}
          </h3>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
            {lang === "fr" ? current.body.fr : current.body.en}
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={advance}
              className="flex-1 py-2.5 text-[13px] font-semibold text-white rounded-xl transition-colors"
              style={{ background: "linear-gradient(135deg,#1E7A6E,#3FAF86)" }}
            >
              {isLastSpot
                ? (lang === "fr" ? "Terminer ✓" : "Finish ✓")
                : (lang === "fr" ? "Suivant →" : "Next →")
              }
            </button>
            <button
              onClick={skip}
              className="px-3 py-2.5 text-[12px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {lang === "fr" ? "Passer" : "Skip"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Confetti ─────────────────────────────────────────────────────────────────
function spawnConfetti() {
  if (typeof window === "undefined") return;
  const colors = ["#14b8a6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#3b82f6", "#ec4899"];
  const style  = document.createElement("style");
  style.textContent = "@keyframes dmly-cfll{0%{opacity:1;transform:translateY(0) rotate(0deg)}100%{opacity:0;transform:translateY(110vh) rotate(720deg)}}";
  document.head.appendChild(style);
  for (let i = 0; i < 72; i++) {
    const el   = document.createElement("div");
    const size = 6 + Math.random() * 9;
    el.style.cssText = [
      "position:fixed",
      `top:-20px`,
      `left:${Math.random() * 100}vw`,
      `width:${size}px`,
      `height:${size}px`,
      `background:${colors[Math.floor(Math.random() * colors.length)]}`,
      `border-radius:${Math.random() > 0.45 ? "50%" : "3px"}`,
      "pointer-events:none",
      "z-index:10000",
      `animation:dmly-cfll ${1.4 + Math.random() * 2.2}s ease-in ${Math.random() * 0.9}s forwards`,
    ].join(";");
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  }
}
