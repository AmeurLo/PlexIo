"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { translations as T } from "@/lib/translations";

export default function Footer() {
  const { t, lang } = useLanguage();
  const F = T.footer;

  return (
    <footer className="bg-gray-950 text-gray-400">
      <div className="max-w-[1200px] mx-auto px-6 pt-16 pb-8">
        <div className="grid md:grid-cols-6 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="Domely" width={32} height={32} className="flex-shrink-0" />
              <span className="brand-name-light text-[17px]">Domely</span>
            </div>
            <p className="text-[14px] text-gray-500 leading-relaxed mb-5 max-w-xs">{t(F.tagline)}</p>
            <div className="flex gap-3">
              {[
                { label: "LinkedIn", icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg> },
                { label: "X", icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg> },
              ].map((s) => (
                <Link key={s.label} href="#" aria-label={s.label}
                  className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                  {s.icon}
                </Link>
              ))}
            </div>
          </div>

          {/* Links */}
          {(["product", "company", "resources", "legal"] as const).map((section) => (
            <div key={section}>
              <h4 className="text-[12px] font-semibold text-gray-300 uppercase tracking-widest mb-4">
                {t(F.sections[section])}
              </h4>
              <ul className="space-y-3">
                {F.links[section].map((link) => (
                  <li key={link.fr}>
                    <Link href={link.href} className="text-[14px] text-gray-500 hover:text-teal-400 transition-colors">
                      {t(link)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[13px] text-gray-600">© {new Date().getFullYear()} Domely. {lang === "fr" ? "Tous droits réservés." : "All rights reserved."}</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            <span className="text-[12px] text-gray-500">{t(F.status)}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
