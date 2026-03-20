"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage } from "@/lib/LanguageContext";

export default function BlogPage() {
  const { lang } = useLanguage();

  return (
    <>
      <Header />
      <main className="bg-white dark:bg-gray-950 min-h-screen">
        <section className="pt-32 pb-24 flex flex-col items-center justify-center text-center px-6">
          <span className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 text-[13px] font-semibold px-4 py-2 rounded-full border border-teal-100 mb-8 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800">
            ✦ Blog
          </span>
          <h1 className="text-[42px] lg:text-[58px] font-bold text-gray-900 dark:text-white leading-[1.05] tracking-tight mb-5">
            {lang === "fr" ? (
              <>Bientôt disponible.</>
            ) : (
              <>Coming soon.</>
            )}
          </h1>
          <p className="text-[17px] max-w-md mx-auto mb-10" style={{ color: "var(--text-secondary)" }}>
            {lang === "fr"
              ? "Nos articles, conseils et analyses arrivent. En attendant, consultez nos guides pratiques."
              : "Our articles, tips, and insights are on the way. In the meantime, check out our practical guides."}
          </p>
          <Link
            href="/resources"
            className="inline-flex items-center gap-2 px-7 py-3 text-[15px] font-semibold text-white rounded-xl transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}>
            {lang === "fr" ? "Voir les guides & ressources →" : "Browse guides & resources →"}
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
