"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { translations as T } from "@/lib/translations";

export default function FAQ() {
  const { t } = useLanguage();
  const F = T.faq;
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 lg:py-32 bg-white dark:bg-gray-950">
      <div className="max-w-3xl mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 text-[13px] font-semibold px-4 py-2 rounded-full border border-teal-100 mb-5 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800">
            ✦ {t(F.badge)}
          </span>
          <h2 className="text-[38px] lg:text-[52px] font-bold text-gray-900 dark:text-white">
            {t(F.h2)}
          </h2>
        </div>

        {/* Accordion */}
        <div className="space-y-3">
          {F.items.map((item, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden"
              style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-section)" }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
              >
                <span className="text-[15px] font-semibold text-gray-900 dark:text-white leading-snug">
                  {t(item.q)}
                </span>
                <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${open === i ? "bg-teal-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}>
                  <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${open === i ? "rotate-45" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </span>
              </button>

              {open === i && (
                <div className="px-6 pb-5">
                  <p className="text-[14px] leading-relaxed pt-4" style={{ color: "var(--text-secondary)", borderTop: "1px solid var(--border-subtle)" }}>
                    {t(item.a)}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-10">
          <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
            {t({ fr: "Vous avez une autre question ?", en: "Still have a question?" })}{" "}
            <Link href="/contact" className="text-teal-600 dark:text-teal-400 font-semibold hover:underline">
              {t({ fr: "Écrivez-nous →", en: "Write to us →" })}
            </Link>
          </p>
        </div>

      </div>
    </section>
  );
}
