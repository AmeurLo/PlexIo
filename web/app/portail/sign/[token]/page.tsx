"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import SignaturePad from "@/components/dashboard/SignaturePad";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface LeaseInfo {
  lease_id: string;
  tenant_id: string;
  property: string;
  unit: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  expires_at: string;
}

function fmtDate(d: string) {
  if (!d || d === "—") return d;
  try { return new Date(d).toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" }); }
  catch { return d; }
}

function fmtAmount(n: number) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n);
}

type Step = "review" | "sign" | "done" | "error";

export default function TenantSignPage() {
  const { token } = useParams<{ token: string }>();

  const [info, setInfo]         = useState<LeaseInfo | null>(null);
  const [step, setStep]         = useState<Step>("review");
  const [sigName, setSigName]   = useState("");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => {
    fetch(`${API.replace("/api", "")}/api/sign/${token}`)
      .then(r => {
        if (!r.ok) throw new Error("Lien invalide ou expiré");
        return r.json();
      })
      .then(setInfo)
      .catch(e => { setError(e.message); setStep("error"); });
  }, [token]);

  const handleSign = async (dataUrl: string) => {
    if (!sigName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API.replace("/api", "")}/api/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature_data: dataUrl, signer_name: sigName.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as any).detail || "Erreur lors de la signature");
      }
      setStep("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
      setStep("error");
    } finally {
      setSaving(false);
    }
  };

  // ── Loading ──
  if (!info && step === "review") return (
    <div className="min-h-screen bg-[#F8FAFB] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ── Error ──
  if (step === "error") return (
    <div className="min-h-screen bg-[#F8FAFB] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Lien invalide</h1>
        <p className="text-[14px] text-gray-500">{error || "Ce lien de signature est invalide ou a expiré."}</p>
        <p className="text-[12px] text-gray-400 mt-4">Contactez votre propriétaire pour recevoir un nouveau lien.</p>
      </div>
    </div>
  );

  // ── Done ──
  if (step === "done") return (
    <div className="min-h-screen bg-[#F8FAFB] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Bail signé !</h1>
        <p className="text-[14px] text-gray-500 mb-1">
          Votre signature électronique a été enregistrée avec succès.
        </p>
        <p className="text-[13px] text-gray-400">
          Votre propriétaire a été notifié. Le PDF final du bail avec la page de certification vous sera envoyé par courriel.
        </p>
        <p className="text-[11px] text-gray-300 mt-6">
          Signature valide selon la Loi concernant le cadre juridique des technologies de l&apos;information (LCCJTI, L.R.Q., c. C-1.1)
        </p>
      </div>
    </div>
  );

  // ── Review step ──
  if (step === "review" && info) return (
    <div className="min-h-screen bg-[#F8FAFB]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 py-4 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-teal-600 rounded-lg" />
          <span className="font-bold text-[16px] text-gray-900">Domely</span>
        </div>
        <span className="text-[13px] text-gray-400 ml-2">Signature de bail</span>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8 space-y-5">
        {/* Intro */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h1 className="text-[20px] font-bold text-gray-900 mb-2">Votre bail est prêt à signer</h1>
          <p className="text-[14px] text-gray-500">
            Veuillez vérifier les informations ci-dessous avant d&apos;apposer votre signature électronique.
          </p>
        </div>

        {/* Lease details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-[14px] font-semibold text-gray-700 uppercase tracking-wide">Détails du bail</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              ["Logement", info.property],
              ["Unité", info.unit || "—"],
              ["Date de début", fmtDate(info.start_date)],
              ["Date de fin", info.end_date ? fmtDate(info.end_date) : "Indéterminée"],
              ["Loyer mensuel", fmtAmount(info.rent_amount)],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-[14px] font-medium text-gray-800">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Legal notice */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-[12px] text-blue-700 leading-relaxed">
            <strong>Signature électronique légalement valide au Québec</strong> — En cliquant sur &quot;Signer le bail&quot;, vous consentez à la signature électronique de ce contrat conformément à la <em>Loi concernant le cadre juridique des technologies de l&apos;information</em> (LCCJTI, L.R.Q., c. C-1.1). Votre adresse IP, la date et l&apos;heure seront enregistrées à titre de preuve.
          </p>
        </div>

        <button
          onClick={() => setStep("sign")}
          className="w-full py-3.5 text-[15px] font-semibold text-white rounded-xl transition-all"
          style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}
        >
          Continuer vers la signature →
        </button>
      </div>
    </div>
  );

  // ── Sign step ──
  if (step === "sign" && info) return (
    <div className="min-h-screen bg-[#F8FAFB]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 py-4 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-teal-600 rounded-lg" />
          <span className="font-bold text-[16px] text-gray-900">Domely</span>
        </div>
        <button onClick={() => setStep("review")} className="ml-auto text-[13px] text-gray-400 hover:text-gray-600">← Retour</button>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8 space-y-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h1 className="text-[20px] font-bold text-gray-900 mb-5">Signez ci-dessous</h1>

          <div className="mb-4">
            <label className="block text-[13px] font-medium text-gray-600 mb-1.5">Votre nom complet</label>
            <input
              type="text"
              value={sigName}
              onChange={e => setSigName(e.target.value)}
              placeholder="Prénom Nom"
              className="w-full px-4 py-3 text-[14px] bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-all"
            />
          </div>

          <label className="block text-[13px] font-medium text-gray-600 mb-1.5">Signature</label>
          <div className={`transition-opacity ${!sigName.trim() ? "opacity-40 pointer-events-none" : ""}`}>
            <SignaturePad onSave={handleSign} />
          </div>
          {saving && (
            <div className="flex items-center justify-center gap-2 mt-3 text-[13px] text-teal-600">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Enregistrement…
            </div>
          )}
          {!sigName.trim() && (
            <p className="text-[12px] text-amber-600 mt-2">Entrez votre nom complet pour activer la signature.</p>
          )}
        </div>

        <p className="text-[11px] text-gray-400 text-center">
          En signant, vous confirmez avoir lu et accepté les termes du bail.<br />
          Signature valide — LCCJTI (L.R.Q., c. C-1.1) · Domely
        </p>
      </div>
    </div>
  );

  return null;
}
