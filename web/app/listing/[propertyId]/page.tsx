"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ListingData {
  id: string;
  name: string;
  address: string;
  city?: string;
  province?: string;
  postal_code?: string;
  description?: string;
  photos?: string[];
  rent_amount?: number;
  available_date?: string;
  bedrooms?: number;
  bathrooms?: number;
  property_type?: string;
  amenities?: string[];
  landlord_name?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatRent(amount: number) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return dateStr;
  }
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: "Appartement",
  house: "Maison",
  duplex: "Duplex",
  triplex: "Triplex",
  fourplex: "Quadruplex",
  condo: "Condo",
  basement: "Sous-sol",
  studio: "Studio",
  loft: "Loft",
  commercial: "Commercial",
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PublicListingPage() {
  const params = useParams();
  const propertyId = params?.propertyId as string;

  const [listing, setListing] = useState<ListingData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Inquiry form state
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [formErrors, setFormErrors] = useState<{ name?: string; email?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!propertyId) return;
    setPageLoading(true);
    api
      .getPublicListing(propertyId)
      .then((data: ListingData) => setListing(data))
      .catch(() => setNotFound(true))
      .finally(() => setPageLoading(false));
  }, [propertyId]);

  function validate() {
    const errors: { name?: string; email?: string } = {};
    if (!form.name.trim()) errors.name = "Le nom est requis.";
    if (!form.email.trim()) {
      errors.email = "L'adresse courriel est requise.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = "Courriel invalide.";
    }
    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setSubmitting(true);
    setSubmitError("");
    try {
      await api.submitListingInquiry(propertyId, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        message: form.message.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  }

  const fv = (k: keyof typeof form, v: string) => {
    setForm(prev => ({ ...prev, [k]: v }));
    if (k in formErrors) setFormErrors(prev => ({ ...prev, [k]: undefined }));
  };

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ─── Not found ──────────────────────────────────────────────────────────────
  if (notFound || !listing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-100 px-6 py-4">
          <span className="text-[18px] font-bold text-teal-600 tracking-tight">Domely</span>
        </header>
        <div className="flex flex-col items-center justify-center py-32 gap-4 text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h1 className="text-[22px] font-bold text-gray-800">Annonce non disponible</h1>
          <p className="text-[14px] text-gray-500 max-w-sm">
            Cette annonce n'existe pas ou a été retirée par le propriétaire.
          </p>
        </div>
      </div>
    );
  }

  const addressFull = [listing.address, listing.city, listing.province, listing.postal_code]
    .filter(Boolean)
    .join(", ");

  // ─── Page ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <span className="text-[18px] font-bold text-teal-600 tracking-tight">Domely</span>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          {/* Photo */}
          <div className="h-56 sm:h-72 bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center relative overflow-hidden">
            {listing.photos && listing.photos.length > 0 ? (
              <img src={listing.photos[0]} alt={listing.name} className="w-full h-full object-cover" />
            ) : (
              <svg className="w-24 h-24 text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            )}
          </div>

          {/* Title block */}
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h1 className="text-[22px] font-bold text-gray-900 leading-tight">{listing.name}</h1>
                <p className="text-[14px] text-gray-500 mt-0.5">{addressFull}</p>
              </div>
              {listing.rent_amount != null && listing.rent_amount > 0 && (
                <div className="flex-shrink-0 text-right">
                  <span className="text-[26px] font-extrabold text-teal-600">{formatRent(listing.rent_amount)}</span>
                  <span className="text-[13px] text-gray-400 block">/mois</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {listing.bedrooms != null && (
            <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col items-center gap-1 shadow-sm">
              <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 18h18M3 6h18" />
              </svg>
              <span className="text-[20px] font-bold text-gray-800">{listing.bedrooms}</span>
              <span className="text-[11px] text-gray-500 text-center">{listing.bedrooms === 1 ? "Chambre" : "Chambres"}</span>
            </div>
          )}
          {listing.bathrooms != null && (
            <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col items-center gap-1 shadow-sm">
              <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 6H6a2 2 0 00-2 2v9a1 1 0 001 1h14a1 1 0 001-1V8a2 2 0 00-2-2h-2M8 6V4a2 2 0 114 0v2M8 6h8" />
              </svg>
              <span className="text-[20px] font-bold text-gray-800">{listing.bathrooms}</span>
              <span className="text-[11px] text-gray-500 text-center">{listing.bathrooms === 1 ? "Salle de bain" : "Salles de bain"}</span>
            </div>
          )}
          {listing.property_type && (
            <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col items-center gap-1 shadow-sm">
              <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-[13px] font-bold text-gray-800 text-center leading-tight">
                {PROPERTY_TYPE_LABELS[listing.property_type] ?? listing.property_type}
              </span>
              <span className="text-[11px] text-gray-500">Type</span>
            </div>
          )}
          {listing.available_date && (
            <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col items-center gap-1 shadow-sm">
              <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-[12px] font-bold text-gray-800 text-center leading-tight">
                {formatDate(listing.available_date)}
              </span>
              <span className="text-[11px] text-gray-500">Disponible dès</span>
            </div>
          )}
        </div>

        {/* Description */}
        {listing.description && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-[15px] font-bold text-gray-800 mb-3">Description</h2>
            <p className="text-[14px] text-gray-600 leading-relaxed whitespace-pre-line">{listing.description}</p>
          </div>
        )}

        {/* Amenities */}
        {listing.amenities && listing.amenities.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-[15px] font-bold text-gray-800 mb-3">Commodités incluses</h2>
            <div className="flex flex-wrap gap-2">
              {listing.amenities.map((a, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium bg-teal-50 text-teal-700 border border-teal-100"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0" />
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Contact form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-[15px] font-bold text-gray-800 mb-1">Contacter le propriétaire</h2>
          {listing.landlord_name && (
            <p className="text-[13px] text-gray-500 mb-4">Annonce publiée par <span className="font-medium text-gray-700">{listing.landlord_name}</span></p>
          )}

          {submitted ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center">
                <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-[16px] font-semibold text-teal-700">Votre demande a été envoyée !</p>
              <p className="text-[13px] text-gray-500">Le propriétaire communiquera avec vous sous peu.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {submitError && (
                <p className="text-[13px] text-red-500 bg-red-50 rounded-xl px-4 py-2">{submitError}</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold text-gray-600 mb-1">
                    Nom complet <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => fv("name", e.target.value)}
                    placeholder="Marie Tremblay"
                    className={`w-full rounded-xl border px-3 py-2 text-[13px] outline-none transition-colors
                      ${formErrors.name
                        ? "border-red-400 bg-red-50 focus:border-red-500"
                        : "border-gray-200 bg-gray-50 focus:border-teal-400 focus:bg-white"
                      }`}
                  />
                  {formErrors.name && <p className="text-[11px] text-red-500 mt-1">{formErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-gray-600 mb-1">
                    Courriel <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => fv("email", e.target.value)}
                    placeholder="marie@exemple.ca"
                    className={`w-full rounded-xl border px-3 py-2 text-[13px] outline-none transition-colors
                      ${formErrors.email
                        ? "border-red-400 bg-red-50 focus:border-red-500"
                        : "border-gray-200 bg-gray-50 focus:border-teal-400 focus:bg-white"
                      }`}
                  />
                  {formErrors.email && <p className="text-[11px] text-red-500 mt-1">{formErrors.email}</p>}
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-gray-600 mb-1">
                  Téléphone <span className="text-[11px] font-normal text-gray-400">(optionnel)</span>
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => fv("phone", e.target.value)}
                  placeholder="514 000-0000"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:border-teal-400 focus:bg-white px-3 py-2 text-[13px] outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-gray-600 mb-1">
                  Message <span className="text-[11px] font-normal text-gray-400">(optionnel)</span>
                </label>
                <textarea
                  value={form.message}
                  onChange={e => fv("message", e.target.value)}
                  rows={4}
                  placeholder="Bonjour, je suis intéressé(e) par ce logement…"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:border-teal-400 focus:bg-white px-3 py-2 text-[13px] outline-none transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl text-[14px] font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white transition-colors flex items-center justify-center gap-2"
              >
                {submitting && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {submitting ? "Envoi en cours…" : "Envoyer ma demande"}
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-[12px] text-gray-400">
        <span>Propulsé par </span>
        <span className="font-bold text-teal-600">Domely</span>
        <span> · Gestion locative intelligente</span>
      </footer>
    </div>
  );
}
