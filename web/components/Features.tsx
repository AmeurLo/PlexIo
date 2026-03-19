"use client";

import { useLanguage } from "@/lib/LanguageContext";
import { translations as T } from "@/lib/translations";
import { Icon } from "@/lib/icons";

export default function Features() {
  const { t } = useLanguage();
  const F = T.features;

  return (
    <section id="features" className="py-24 lg:py-32" style={{ background: "var(--bg-section)" }}>
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 text-[13px] font-semibold px-4 py-2 rounded-full border border-teal-100 mb-5 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800">
            ✦ {t(F.badge)}
          </span>
          <h2 className="text-[38px] lg:text-[52px] font-bold text-gray-900 dark:text-white mb-4">
            {t(F.h2a)}
            <br />
            <span className="text-gradient">{t(F.h2b)}</span>
          </h2>
          <p className="text-[17px] max-w-xl mx-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>{t(F.sub)}</p>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {F.items.map((item, i) => (
            <div key={i} className="feature-card group bg-white dark:bg-gray-900 rounded-2xl p-8 cursor-default"
              style={{ border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-card)" }}>
              <div className={`w-12 h-12 rounded-2xl ${item.bg} dark:bg-opacity-20 flex items-center justify-center mb-6`}>
                <Icon name={item.icon as any} size={22} className="text-current opacity-80" />
              </div>
              <span className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gradient-to-r ${item.color} text-white mb-3`}>
                {t(item.tag)}
              </span>
              <h3 className="text-[18px] font-semibold text-gray-900 dark:text-white mb-2.5">{t(item.title)}</h3>
              <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{t(item.desc)}</p>
              <div className="mt-5 flex items-center gap-1.5 text-[13px] font-semibold text-teal-600 dark:text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity">
                {t({ fr: "En savoir plus", en: "Learn more" })}
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
