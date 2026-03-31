"use client";
import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { useLanguage } from "@/lib/LanguageContext";

const UNIT_OPTIONS = [
  { value: "1-2",  fr: "1–2 logements",   en: "1–2 units" },
  { value: "3-10", fr: "3–10 logements",  en: "3–10 units" },
  { value: "11-50",fr: "11–50 logements", en: "11–50 units" },
  { value: "50+",  fr: "50+ logements",   en: "50+ units" },
];

const PAIN_OPTIONS = [
  { value: "chasing_rent",  fr: "J'ai toujours un locataire en retard — et c'est moi qui dois relancer à chaque fois",         en: "I always have a late tenant — and I'm always the one who has to follow up" },
  { value: "texts_chaos",   fr: "Tout est dans mon cahier et mes textos. Je perds le fil dès que je dois retrouver une information précise",        en: "Everything is in my notebook and texts. I lose track as soon as I need to find something specific" },
  { value: "rent_increase", fr: "J'ai raté ma hausse de loyer l'an passé — j'ai perdu des centaines de dollars sans m'en rendre compte",   en: "I missed my rent increase last year and lost hundreds without realizing it" },
  { value: "below_market",  fr: "Je sais pas si je charge le bon prix — j'ai peur de demander trop ou pas assez", en: "I don't know if I'm charging the right price — afraid of asking too much or too little" },
  { value: "scattered",     fr: "Au moment des impôts, je cherche mes reçus partout. C'est le chaos chaque année", en: "At tax time, I'm hunting for receipts everywhere. It's chaos every year" },
  { value: "other",         fr: "Autre chose", en: "Something else" },
];

const PERKS = [
  { fr: "Prix de lancement garanti à vie pour les 500 premiers", en: "Lifetime launch pricing for first 500 members" },
  { fr: "Accès prioritaire avant l'ouverture publique",          en: "Priority access before public launch" },
  { fr: "Appel de bienvenue avec l'équipe fondatrice",           en: "Welcome call with the founding team" },
];

export default function EarlyAccessPage() {
  const { lang } = useLanguage();
  const fr = lang === "fr";

  const [form, setForm] = useState({ first_name: "", email: "", unit_count: "", pain_point: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const getUtm = () => {
    if (typeof window === "undefined") return {};
    const p = new URLSearchParams(window.location.search);
    return { source: p.get("utm_source") || "", medium: p.get("utm_medium") || "", campaign: p.get("utm_campaign") || "" };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.unit_count || !form.pain_point) {
      setError(fr ? "Veuillez remplir tous les champs requis." : "Please fill in all required fields.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
      const res = await fetch(`${BASE}/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ...getUtm() }),
      });
      if (!res.ok) throw new Error();
      setSuccess(true);
    } catch {
      setError(fr ? "Une erreur est survenue. Réessayez." : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto px-6 py-24 w-full">
        <div className="grid lg:grid-cols-2 gap-14 items-start">

          {/* Left — copy */}
          <div className="lg:sticky lg:top-28">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 text-teal-700 dark:text-teal-300 text-[13px] font-semibold px-4 py-2 rounded-full border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/30 mb-7">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              {fr ? "Lancement Canada — Accès limité" : "Canada Launch — Limited Access"}
            </div>

            <h1 className="text-[42px] font-extrabold leading-[1.1] text-gray-900 dark:text-white mb-4">
              {fr ? "Rejoignez les " : "Join "}
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}>
                414 propriétaires
              </span>
              {fr ? " sur la liste." : " on the list."}
            </h1>

            <p className="text-[17px] text-gray-500 dark:text-gray-400 leading-relaxed mb-10">
              {fr
                ? "À 500 inscrits, on ouvre les portes. Inscrivez-vous maintenant et obtenez un accès prioritaire au prix de lancement garanti à vie."
                : "At 500 signups, we open the doors. Sign up now and get priority access with a lifetime launch price guarantee."}
            </p>

            {/* Progress bar */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">414 / 500</span>
                <span className="text-[13px] text-teal-600 dark:text-teal-400 font-medium">{fr ? "86 places restantes" : "86 spots left"}</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all"
                  style={{ width: "82.8%", background: "linear-gradient(90deg, #1E7A6E, #3FAF86)" }}
                />
              </div>
            </div>

            {/* Perks */}
            <ul className="space-y-3">
              {PERKS.map((p, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}>
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span className="text-[14px] text-gray-700 dark:text-gray-300">{fr ? p.fr : p.en}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right — form */}
          <div>
            {success ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-8 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}>
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h2 className="text-[22px] font-bold text-gray-900 dark:text-white mb-2">
                  {fr ? "Vous êtes sur la liste !" : "You're on the list!"}
                </h2>
                <p className="text-[15px] text-gray-500 dark:text-gray-400 mb-6">
                  {fr
                    ? "On vous contacte en premier dès le lancement. Partagez avec un ami propriétaire pour monter dans la file."
                    : "We'll reach out first when we launch. Share with a landlord friend to move up the queue."}
                </p>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: "Domely", text: fr ? "J'ai rejoint la liste d'attente Domely — gestion locative pour propriétaires canadiens" : "I joined the Domely waitlist", url: "https://www.domely.ca/early-access" });
                    } else {
                      navigator.clipboard.writeText("https://www.domely.ca/early-access");
                    }
                  }}
                  className="inline-flex items-center gap-2 px-5 py-3 text-[14px] font-semibold text-white rounded-xl transition-all hover:scale-[1.02]"
                  style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  {fr ? "Partager avec un ami" : "Share with a friend"}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-8 space-y-5">
                <div>
                  <h2 className="text-[20px] font-bold text-gray-900 dark:text-white mb-1">
                    {fr ? "Réservez votre place" : "Reserve your spot"}
                  </h2>
                  <p className="text-[13px] text-gray-400 dark:text-gray-500">
                    {fr ? "2 minutes · Aucune carte de crédit requise" : "2 minutes · No credit card required"}
                  </p>
                </div>

                {/* First name */}
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {fr ? "Prénom" : "First name"} <span className="text-gray-400 dark:text-gray-500">{fr ? "(optionnel)" : "(optional)"}</span>
                  </label>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={e => set("first_name", e.target.value)}
                    placeholder={fr ? "Alex" : "Alex"}
                    className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {fr ? "Courriel" : "Email"} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => set("email", e.target.value)}
                    required
                    placeholder={fr ? "vous@example.com" : "you@example.com"}
                    className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Unit count */}
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {fr ? "Combien de logements gérez-vous ?" : "How many units do you manage?"} <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {UNIT_OPTIONS.map(o => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => set("unit_count", o.value)}
                        className={`px-4 py-3 rounded-xl text-[13px] font-medium border transition-all text-left ${
                          form.unit_count === o.value
                            ? "border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
                            : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                      >
                        {fr ? o.fr : o.en}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pain point */}
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {fr ? "Votre plus grand défi en ce moment ?" : "Your biggest challenge right now?"} <span className="text-red-400">*</span>
                  </label>
                  <div className="space-y-2">
                    {PAIN_OPTIONS.map(o => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => set("pain_point", o.value)}
                        className={`w-full px-4 py-3 rounded-xl text-[13px] font-medium border transition-all text-left ${
                          form.pain_point === o.value
                            ? "border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
                            : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                      >
                        {fr ? o.fr : o.en}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <p className="text-[13px] text-red-500 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 text-[15px] font-semibold text-white rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}
                >
                  {loading
                    ? (fr ? "Inscription…" : "Signing up…")
                    : (fr ? "Rejoindre la liste d'attente et geler mon prix pour toujours" : "Join the waitlist and lock my price forever")}
                </button>

                <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">
                  {fr
                    ? "Aucun spam. Aucune carte de crédit. Vous pouvez vous désinscrire à tout moment."
                    : "No spam. No credit card. Unsubscribe anytime."}
                </p>
              </form>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-100 dark:border-gray-800 py-6 text-center">
        <p className="text-[12px] text-gray-400 dark:text-gray-600">© 2026 Domely · <Link href="/privacy" className="hover:underline">Confidentialité</Link> · <Link href="/terms" className="hover:underline">CGU</Link></p>
      </footer>
    </div>
  );
}
