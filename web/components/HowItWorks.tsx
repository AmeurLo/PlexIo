"use client";

import { useLanguage } from "@/lib/LanguageContext";
import { translations as T } from "@/lib/translations";
import { Icon } from "@/lib/icons";

export default function HowItWorks() {
  const { t } = useLanguage();
  const H = T.how;

  return (
    <section id="how" className="py-24 lg:py-32 bg-white dark:bg-gray-950">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 text-[13px] font-semibold px-4 py-2 rounded-full border border-teal-100 mb-5 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800">
            ✦ {t(H.badge)}
          </span>
          <h2 className="text-[38px] lg:text-[52px] font-bold text-gray-900 dark:text-white mb-4">
            <span className="text-gradient">{t(H.h2)}</span>
          </h2>
          <p className="text-[17px] max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>{t(H.sub)}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {H.steps.map((step, i) => (
            <div key={i} className="relative">
              {/* Connector arrow */}
              {i < H.steps.length - 1 && (
                <div className="hidden lg:flex absolute -right-3 top-10 z-10 items-center justify-center">
                  <svg className="w-6 h-6 text-teal-200 dark:text-teal-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}

              <div className="rounded-2xl p-8 h-full" style={{ background: "var(--bg-section)", border: "1px solid var(--border-subtle)" }}>
                {/* Step number */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-bold text-white flex-shrink-0"
                       style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}>
                    {i + 1}
                  </div>
                  <Icon name={step.icon as any} size={24} className="text-teal-500 dark:text-teal-400" />
                </div>

                <h3 className="text-[17px] font-bold text-gray-900 dark:text-white mb-2.5">{t(step.title)}</h3>
                <p className="text-[13px] leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>{t(step.desc)}</p>

                <span className="inline-block text-[12px] font-medium text-teal-600 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-100 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800">
                  {t(step.detail)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
