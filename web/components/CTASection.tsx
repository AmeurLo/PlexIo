"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { translations as T } from "@/lib/translations";
import { Icon } from "@/lib/icons";

export default function CTASection() {
  const { t } = useLanguage();
  const C = T.cta;

  return (
    <section className="py-24 lg:py-32 relative overflow-hidden">
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #0E3840 0%, #144F54 40%, #1E7A6E 75%, #2E9B7A 100%)" }} />
      <div className="absolute inset-0 opacity-10"
           style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)", backgroundSize: "28px 28px" }} />
      <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full pointer-events-none"
           style={{ background: "radial-gradient(circle, rgba(63,175,134,0.25) 0%, transparent 70%)" }} />
      <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full pointer-events-none"
           style={{ background: "radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)" }} />

      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 text-white/80 text-[13px] font-semibold px-4 py-2 rounded-full border border-white/20 mb-8">
          <span className="w-2 h-2 rounded-full bg-teal-300 animate-pulse" />
          {t(C.badge)}
        </div>

        <h2 className="text-[42px] lg:text-[60px] font-bold text-white mb-6 leading-[1.08] whitespace-pre-line">
          {t(C.h2)}
        </h2>

        <p className="text-[17px] text-white/70 leading-relaxed mb-10 max-w-xl mx-auto">{t(C.sub)}</p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link href="/login?signup=true"
            className="inline-flex items-center justify-center gap-2 px-7 py-4 text-[15px] font-semibold text-teal-700 bg-white rounded-xl hover:bg-teal-50 transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98]">
            {t(C.cta1)}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <Link href="/contact"
            className="inline-flex items-center justify-center gap-2 px-7 py-4 text-[15px] font-medium text-white border border-white/30 rounded-xl hover:bg-white/10 transition-all">
            {t(C.cta2)}
          </Link>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          {C.trust.map((item) => (
            <div key={item.fr} className="flex items-center gap-2 text-[13px] text-white/60">
              <Icon name={item.icon as any} size={14} className="text-white/60" />
              {t(item)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
