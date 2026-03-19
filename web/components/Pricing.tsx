"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { translations as T } from "@/lib/translations";

const CHECK = () => (
  <svg className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const CROSS = () => (
  <svg className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const PLAN_KEYS = ["starter", "pro", "team"] as const;

export default function Pricing() {
  const { t } = useLanguage();
  const router = useRouter();
  const P = T.pricing;
  const [yearly, setYearly]       = useState(false);
  const [loading, setLoading]     = useState<string | null>(null);

  const handleCheckout = async (planKey: string) => {
    setLoading(planKey);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planKey,
          billing: yearly ? "yearly" : "monthly",
          email: (() => { try { const u = localStorage.getItem("domely_user"); return u ? JSON.parse(u).email : undefined; } catch { return undefined; } })(),
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Stripe not configured yet — fallback to signup
      router.push("/login?signup=true");
    } finally {
      setLoading(null);
    }
  };

  return (
    <section id="pricing" className="py-24 lg:py-32 bg-white dark:bg-gray-950">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 text-[13px] font-semibold px-4 py-2 rounded-full border border-teal-100 mb-5 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800">
            ✦ {t(P.badge)}
          </span>
          <h2 className="text-[38px] lg:text-[52px] font-bold text-gray-900 dark:text-white mb-5">
            {t(P.h2a)}{" "}
            <span className="text-gradient">{t(P.h2b)}</span>
          </h2>

          {/* Toggle */}
          <div className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1.5">
            <button onClick={() => setYearly(false)}
              className={`px-5 py-2 text-[14px] font-medium rounded-lg transition-all ${!yearly ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400"}`}>
              {t(P.toggle.monthly)}
            </button>
            <button onClick={() => setYearly(true)}
              className={`px-5 py-2 text-[14px] font-medium rounded-lg transition-all flex items-center gap-2 ${yearly ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400"}`}>
              {t(P.toggle.yearly)}
              <span className="text-[11px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">-20%</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {P.plans.map((plan, i) => {
            const planKey       = PLAN_KEYS[i];
            const isHighlighted = !!plan.badge;
            const isFree        = plan.price.monthly === 0;
            const isEnterprise  = i === 2;
            const isLoadingThis = loading === planKey;

            return (
              <div key={i}
                className={`relative rounded-2xl p-7 border-2 flex flex-col transition-shadow ${
                  isHighlighted
                    ? "border-teal-400 shadow-teal-lg scale-[1.05]"
                    : "shadow-card hover:shadow-card-hover"
                } bg-white dark:bg-gray-900`}
                style={!isHighlighted ? { borderColor: "var(--border-subtle)" } : undefined}>

                {isHighlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="text-[12px] font-bold text-white px-4 py-1.5 rounded-full shadow-teal-sm"
                          style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}>
                      {t(P.popular)}
                    </span>
                  </div>
                )}

                  <div className="mb-7">
                  <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-widest mb-2">{t(plan.name)}</p>
                    <div className="flex items-end gap-1.5 mb-2">
                    {isFree ? (
                      <span className="text-[44px] font-bold tracking-tight text-gray-900 dark:text-white">{t(P.free)}</span>
                    ) : (
                      <>
                        <span className="text-[44px] font-bold tracking-tight text-gray-900 dark:text-white">
                          {yearly ? plan.price.yearly : plan.price.monthly}$
                        </span>
                        <span className="text-gray-400 text-[14px] mb-3">{t(P.perMonth)}</span>
                      </>
                    )}
                  </div>
                  <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>{t(plan.desc)}</p>
                </div>

                {/* CTA Button */}
                {isFree ? (
                  <Link href="/login?signup=true"
                    className="block text-center py-3 px-5 rounded-xl text-[14px] font-semibold transition-all mb-7 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30">
                    {t(plan.cta)}
                  </Link>
                ) : isEnterprise ? (
                  <Link href="/contact"
                    className="block text-center py-3 px-5 rounded-xl text-[14px] font-semibold transition-all mb-7 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30">
                    {t(plan.cta)}
                  </Link>
                ) : (
                  <button
                    onClick={() => handleCheckout(planKey)}
                    disabled={isLoadingThis}
                    className="block w-full text-center py-3 px-5 rounded-xl text-[14px] font-semibold transition-all mb-7 text-white disabled:opacity-70 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
                    style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}>
                    {isLoadingThis
                      ? (t({ fr: "Chargement…", en: "Loading…" }))
                      : t(plan.cta)}
                  </button>
                )}

                <ul className="space-y-3 flex-1">
                  {plan.features.map((f, fi) => (
                    <li key={fi} className="flex items-start gap-2.5 text-[13px] text-gray-600 dark:text-gray-300">
                      <CHECK />{t(f)}
                    </li>
                  ))}
                  {plan.missing?.map((f, fi) => (
                    <li key={fi} className="flex items-start gap-2.5 text-[13px] text-gray-300 line-through">
                      <CROSS />{t(f)}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="text-center text-[13px] mt-8" style={{ color: "var(--text-secondary)" }}>{t(P.note)}</p>
      </div>
    </section>
  );
}
