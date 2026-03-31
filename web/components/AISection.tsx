"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { translations as T } from "@/lib/translations";
import { Icon } from "@/lib/icons";

export default function AISection() {
  const { t } = useLanguage();
  const A = T.ai;
  const [activeEx, setActiveEx] = useState(0);

  return (
    <section id="ai" className="py-24 lg:py-32 bg-white dark:bg-gray-950 overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* ── Left: Chat demo ── */}
          <div className="order-2 lg:order-1">
            <div className="bg-gray-950 dark:bg-gray-900 rounded-2xl overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.18)] dark:ring-1 dark:ring-gray-700/60">
              {/* Chat header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                     style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}>
                  <Icon name="sparkles" size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white">Domely AI</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                    <p className="text-[11px] text-gray-400">
                      {t({ fr: "En ligne · Répond en moins de 2 s", en: "Online · Replies in under 2s" })}
                    </p>
                  </div>
                </div>
                {/* Example selector */}
                <div className="ml-auto flex gap-1.5">
                  {A.examples.map((_, i) => (
                    <button key={i} onClick={() => setActiveEx(i)}
                      className={`w-2 h-2 rounded-full transition-all ${activeEx === i ? "bg-teal-400 w-5" : "bg-gray-700"}`} />
                  ))}
                </div>
              </div>

              {/* Messages */}
              <div className="p-5 space-y-4 min-h-[280px]">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] bg-gray-800 rounded-2xl rounded-tr-sm px-4 py-3">
                    <p className="text-[13px] text-gray-200 leading-relaxed">
                      {t(A.examples[activeEx].q)}
                    </p>
                  </div>
                </div>

                {/* AI response */}
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                       style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}>
                    <span className="text-white text-[11px]">D</span>
                  </div>
                  <div className="flex-1 bg-gray-900 rounded-2xl rounded-tl-sm px-4 py-3 border border-gray-800">
                    <p className="text-[13px] text-gray-300 leading-relaxed">
                      {t(A.examples[activeEx].a)}
                    </p>
                    {/* Action chips */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {[
                        { fr: "Générer l'avis", en: "Generate notice" },
                        { fr: "Voir le formulaire", en: "View form" },
                      ].map((chip, i) => (
                        <span key={i}
                          className="text-[11px] font-semibold px-3 py-1.5 rounded-full border cursor-pointer transition-all hover:border-teal-400"
                          style={{ borderColor: "#2a5a54", color: "#3FAF86" }}>
                          {t(chip)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Input bar */}
              <div className="px-5 pb-5">
                <div className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
                  <p className="flex-1 text-[13px] text-gray-500">
                    {t({ fr: "Posez une question sur vos logements…", en: "Ask anything about your properties…" })}
                  </p>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                       style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}>
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: Copy ── */}
          <div className="order-1 lg:order-2">
            <span className="inline-flex items-center gap-2 bg-violet-50 text-violet-700 text-[13px] font-semibold px-4 py-2 rounded-full border border-violet-100 mb-7 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800">
              {t(A.badge)}
            </span>

            <h2 className="text-[38px] lg:text-[52px] font-bold text-gray-900 dark:text-white mb-5 whitespace-pre-line leading-tight">
              {t(A.h2)}
            </h2>

            <p className="text-[16px] leading-relaxed mb-8" style={{ color: "var(--text-secondary)" }}>
              {t(A.sub)}
            </p>

            {/* Capabilities */}
            <div className="space-y-3 mb-9">
              {[
                { icon: "scale" as const, fr: "Calcule la hausse légale maximale pour chaque logement", en: "Calculates the max legal rent increase for every unit" },
                { icon: "document" as const, fr: "Vous accompagne dans chaque situation locative, de A à Z", en: "Guides you through every landlord situation, from A to Z" },
                { icon: "chart-bar" as const, fr: "Identifie les logements sous-valorisés de votre portefeuille", en: "Identifies underpriced units in your portfolio" },
                { icon: "bell" as const, fr: "Prédit les risques avant qu'ils ne deviennent des problèmes", en: "Predicts risks before they become problems" },
              ].map((cap) => (
                <div key={cap.fr} className="flex items-start gap-3">
                  <Icon name={cap.icon} size={18} className="mt-0.5 flex-shrink-0 text-teal-500 dark:text-teal-400" />
                  <p className="text-[14px] text-gray-600 dark:text-gray-300 leading-relaxed">{t(cap)}</p>
                </div>
              ))}
            </div>

            <Link href="/early-access"
              className="inline-flex items-center gap-2 px-6 py-3.5 text-[15px] font-semibold text-white rounded-xl transition-all shadow-teal-sm hover:shadow-teal-md hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}>
              {t(A.cta)}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
