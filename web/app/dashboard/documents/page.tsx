"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/lib/ToastContext";
import { requireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { Tenant, Lease } from "@/lib/types";
import PageHeader from "@/components/dashboard/PageHeader";
import Modal from "@/components/dashboard/Modal";
import FormField, { inputClass, selectClass } from "@/components/dashboard/FormField";

// ─── i18n ─────────────────────────────────────────────────────────────────────
const T = {
  title:       { fr: "Documents & Avis",            en: "Documents & Notices" },
  sub:         { fr: "Générez des documents légaux en PDF",  en: "Generate legal documents as PDF" },
  generate:    { fr: "Générer le PDF",              en: "Generate PDF" },
  generating:  { fr: "Génération…",                en: "Generating…" },
  print:       { fr: "Imprimer / Enregistrer PDF", en: "Print / Save PDF" },
  newDoc:      { fr: "Nouveau document",            en: "New document" },
  tenant:      { fr: "Locataire",                   en: "Tenant" },
  effectDate:  { fr: "Date d'effet",                en: "Effective date" },
  newRent:     { fr: "Nouveau loyer (CAD)",         en: "New rent (CAD)" },
  currentRent: { fr: "Loyer actuel",                en: "Current rent" },
  entryReason: { fr: "Motif de l'entrée",           en: "Reason for entry" },
  entryPlaceholder: { fr: "Ex : Inspection annuelle, réparations…", en: "Ex: Annual inspection, repairs…" },
  noTenants:   { fr: "Aucun locataire. Ajoutez-en depuis Locataires.", en: "No tenants found. Add one from Tenants." },
  ready:       { fr: "PDF prêt !", en: "PDF ready!" },
  readySub:    { fr: "Cliquez sur Imprimer pour enregistrer en PDF.", en: "Click Print to save as PDF." },
};

// ─── Templates ────────────────────────────────────────────────────────────────
const TEMPLATES = [
  { id: "lease",           fr: "Bail résidentiel",             en: "Residential lease",        icon: "📄", tag: "TAL",    color: "#1E7A6E", needsRent: true },
  { id: "notice_late",     fr: "Avis de retard de loyer",      en: "Late rent notice",         icon: "⚠️", tag: null,     color: "#EF4444", needsRent: false },
  { id: "notice_renewal",  fr: "Avis de renouvellement",       en: "Lease renewal notice",     icon: "🔄", tag: null,     color: "#10B981", needsRent: true },
  { id: "notice_increase", fr: "Avis de modification de loyer",en: "Rent increase notice",     icon: "📈", tag: null,     color: "#F59E0B", needsRent: true },
  { id: "notice_entry",    fr: "Avis d'entrée du propriétaire",en: "Landlord entry notice",    icon: "🔑", tag: null,     color: "#8B5CF6", needsRent: false, needsReason: true },
  { id: "receipt",         fr: "Reçu de paiement",             en: "Payment receipt",          icon: "🧾", tag: null,     color: "#F59E0B", needsRent: false },
  { id: "releve31",        fr: "Relevé 31",                    en: "Annual rent statement",    icon: "🧮", tag: "Fiscal", color: "#EC4899", needsRent: false },
] as const;

type TemplateId = typeof TEMPLATES[number]["id"];

// ─── HTML builder (ported from mobile) ────────────────────────────────────────
const baseStyle = `
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111; font-size: 13px; padding: 40px; }
  h1   { font-size: 20px; font-weight: 800; color: #1E7A6E; margin-bottom: 4px; }
  h2   { font-size: 15px; font-weight: 700; color: #1E7A6E; margin: 20px 0 8px; }
  .meta { color: #555; font-size: 12px; margin-bottom: 24px; }
  .divider { border: none; border-top: 1.5px solid #E2E8F0; margin: 18px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #F0FAF9; text-align: left; padding: 8px 12px; font-size: 12px; color: #1E7A6E; }
  td { padding: 8px 12px; border-bottom: 1px solid #F1F5F9; font-size: 13px; }
  .row { display: flex; justify-content: space-between; margin-bottom: 6px; }
  .label { color: #555; font-size: 12px; }
  .value { font-weight: 600; font-size: 13px; }
  .tag { display: inline-block; background: #E6FAF5; color: #1E7A6E; border-radius: 4px; padding: 2px 8px; font-size: 11px; font-weight: 700; margin-bottom: 10px; }
  .sig { margin-top: 40px; }
  .sig-row { display: flex; gap: 60px; }
  .sig-block { flex: 1; }
  .sig-line { border-top: 1px solid #94A3B8; margin-top: 36px; padding-top: 4px; font-size: 11px; color: #888; }
  .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #E2E8F0; font-size: 10px; color: #94A3B8; text-align: center; }
  @media print { body { padding: 20px; } }
`;

const fmtDate = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-CA", { day: "2-digit", month: "long", year: "numeric" });
};
const fmtMoney = (n: number) => `${n.toLocaleString("fr-CA")} $`;
const hdr = (title: string, tag?: string) => `
  <h1>${title}</h1>
  ${tag ? `<span class="tag">${tag}</span>` : ""}
  <p class="meta">Généré par Domely · ${new Date().toLocaleDateString("fr-CA")}</p>
  <hr class="divider" />`;
const sigs = () => `<div class="sig"><div class="sig-row"><div class="sig-block"><div class="sig-line">Signature du propriétaire</div></div><div class="sig-block"><div class="sig-line">Signature du locataire</div></div></div></div>`;
const ftr = () => `<div class="footer">Ce document a été généré automatiquement par Domely · Les Solutions Privatris Inc.</div>`;

function buildHTML(id: TemplateId, o: { landlord: string; tenant: string; unit: string; property: string; address: string; rent: number; newRent?: number; date: string; startDate?: string; endDate?: string; entryReason?: string }): string {
  switch (id) {
    case "lease": return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${baseStyle}</style></head><body>
      ${hdr("Bail résidentiel", "TAL — Formulaire type F")}
      <h2>Parties</h2>
      <div class="row"><span class="label">Propriétaire</span><span class="value">${o.landlord}</span></div>
      <div class="row"><span class="label">Locataire</span><span class="value">${o.tenant}</span></div>
      <hr class="divider"/>
      <h2>Logement</h2>
      <div class="row"><span class="label">Adresse</span><span class="value">${o.address || o.property}</span></div>
      <div class="row"><span class="label">Logement</span><span class="value">Nº ${o.unit}</span></div>
      <hr class="divider"/>
      <h2>Conditions du bail</h2>
      <div class="row"><span class="label">Date de début</span><span class="value">${fmtDate(o.startDate || o.date)}</span></div>
      <div class="row"><span class="label">Date de fin</span><span class="value">${fmtDate(o.endDate || "")}</span></div>
      <div class="row"><span class="label">Loyer mensuel</span><span class="value">${fmtMoney(o.newRent || o.rent)}</span></div>
      <div class="row"><span class="label">Jour d'échéance</span><span class="value">1er du mois</span></div>
      <hr class="divider"/>
      <h2>Clauses générales</h2>
      <p style="font-size:12px;line-height:1.6;color:#444;">Le locataire s'engage à payer le loyer à la date convenue. Le propriétaire garantit la jouissance paisible des lieux. Toute modification doit être notifiée selon les délais prévus par la Loi sur l'habitation du Québec.</p>
      ${sigs()}${ftr()}</body></html>`;

    case "notice_late": return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${baseStyle}</style></head><body>
      ${hdr("Avis de retard de loyer — Mise en demeure")}
      <p>Le propriétaire <strong>${o.landlord}</strong> met en demeure le/la locataire <strong>${o.tenant}</strong>, occupant le logement <strong>Nº ${o.unit}</strong> de l'immeuble <em>${o.property}</em>.</p>
      <hr class="divider"/>
      <h2>Objet</h2>
      <p>Votre loyer du mois en cours d'un montant de <strong>${fmtMoney(o.rent)}</strong> n'a pas été reçu à la date d'échéance prévue. Vous êtes donc en défaut de paiement.</p>
      <h2>Demande</h2>
      <p>Nous vous demandons de procéder au paiement intégral dans les <strong>5 jours ouvrables</strong> suivant la réception du présent avis. À défaut, nous nous réservons le droit d'entreprendre les recours légaux appropriés devant le Tribunal administratif du logement.</p>
      <div class="row" style="margin-top:20px;"><span class="label">Date de l'avis</span><span class="value">${fmtDate(o.date)}</span></div>
      ${sigs()}${ftr()}</body></html>`;

    case "notice_renewal": return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${baseStyle}</style></head><body>
      ${hdr("Avis de renouvellement de bail")}
      <p>Le propriétaire <strong>${o.landlord}</strong> offre au/à la locataire <strong>${o.tenant}</strong>, occupant le logement <strong>Nº ${o.unit}</strong> de l'immeuble <em>${o.property}</em>, le renouvellement de son bail.</p>
      <hr class="divider"/>
      <table><tr><th>Condition</th><th>Valeur</th></tr>
        <tr><td>Loyer mensuel</td><td><strong>${fmtMoney(o.newRent || o.rent)}</strong></td></tr>
        <tr><td>Nouvelle date de début</td><td>${fmtDate(o.date)}</td></tr>
        <tr><td>Durée du bail</td><td>12 mois</td></tr>
      </table>
      <hr class="divider"/>
      <p>Le/la locataire dispose d'un délai de <strong>30 jours</strong> à compter de la réception du présent avis pour accepter ou refuser l'offre. En l'absence de réponse, le bail sera considéré renouvelé.</p>
      ${sigs()}${ftr()}</body></html>`;

    case "notice_increase": return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${baseStyle}</style></head><body>
      ${hdr("Avis de modification de loyer — Augmentation")}
      <p>Le propriétaire <strong>${o.landlord}</strong> avise le/la locataire <strong>${o.tenant}</strong>, occupant le logement <strong>Nº ${o.unit}</strong> de l'immeuble <em>${o.property}</em>, d'une modification au loyer.</p>
      <hr class="divider"/>
      <table><tr><th>Détail</th><th>Montant</th></tr>
        <tr><td>Loyer actuel</td><td>${fmtMoney(o.rent)} / mois</td></tr>
        <tr><td>Nouveau loyer</td><td><strong>${fmtMoney(o.newRent || o.rent)} / mois</strong></td></tr>
        <tr><td>Augmentation</td><td>${o.newRent ? fmtMoney(o.newRent - o.rent) : "—"}</td></tr>
        <tr><td>Date d'entrée en vigueur</td><td>${fmtDate(o.date)}</td></tr>
      </table>
      <hr class="divider"/>
      <p>Le/la locataire dispose d'un délai de <strong>30 jours</strong> pour refuser cette modification. Sans réponse dans ce délai, la modification sera réputée acceptée selon l'article 1945 du Code civil du Québec.</p>
      ${sigs()}${ftr()}</body></html>`;

    case "notice_entry": return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${baseStyle}</style></head><body>
      ${hdr("Avis d'entrée du propriétaire")}
      <p>Le propriétaire <strong>${o.landlord}</strong> avise le/la locataire <strong>${o.tenant}</strong>, occupant le logement <strong>Nº ${o.unit}</strong> de l'immeuble <em>${o.property}</em>, d'une visite à venir.</p>
      <hr class="divider"/>
      <div class="row"><span class="label">Date prévue</span><span class="value">${fmtDate(o.date)}</span></div>
      <div class="row"><span class="label">Motif</span><span class="value">${o.entryReason || "Inspection générale du logement"}</span></div>
      <div class="row"><span class="label">Délai de préavis</span><span class="value">24 heures minimum (art. 1931 C.c.Q.)</span></div>
      <hr class="divider"/>
      <p>Conformément à l'article 1931 du Code civil du Québec, le propriétaire doit donner un préavis d'au moins 24 heures avant d'entrer dans le logement, sauf en cas d'urgence.</p>
      ${sigs()}${ftr()}</body></html>`;

    case "receipt": return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${baseStyle}</style></head><body>
      ${hdr("Reçu de paiement de loyer")}
      <div style="background:#F0FAF9;border-radius:8px;padding:20px 24px;margin-bottom:20px;">
        <div style="font-size:28px;font-weight:800;color:#1E7A6E;">${fmtMoney(o.rent)}</div>
        <div style="color:#555;font-size:13px;margin-top:4px;">reçu de <strong>${o.tenant}</strong></div>
      </div>
      <hr class="divider"/>
      <h2>Détails du paiement</h2>
      <div class="row"><span class="label">Locataire</span><span class="value">${o.tenant}</span></div>
      <div class="row"><span class="label">Logement</span><span class="value">Nº ${o.unit} — ${o.property}</span></div>
      <div class="row"><span class="label">Date de paiement</span><span class="value">${fmtDate(o.date)}</span></div>
      <div class="row"><span class="label">Période couverte</span><span class="value">${new Date(o.date).toLocaleDateString("fr-CA", { month: "long", year: "numeric" })}</span></div>
      <div class="row"><span class="label">Mode de paiement</span><span class="value">Virement / Comptant</span></div>
      <hr class="divider"/>
      <p style="font-size:12px;color:#555;">Ce reçu confirme que le paiement de loyer a été reçu intégralement.</p>
      <div class="sig"><div class="sig-block" style="max-width:240px;"><div class="sig-line">Signature du propriétaire — ${o.landlord}</div></div></div>
      ${ftr()}</body></html>`;

    case "releve31": {
      const year = new Date(o.date).getFullYear();
      return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${baseStyle}</style></head><body>
        ${hdr(`Relevé 31 — Loyer payé — ${year}`, "Fiscal")}
        <p><strong>Note :</strong> Ce relevé est fourni à titre informatif pour faciliter la déclaration de revenus annuelle.</p>
        <hr class="divider"/>
        <h2>Renseignements sur le logement</h2>
        <div class="row"><span class="label">Adresse</span><span class="value">${o.address || o.property}</span></div>
        <div class="row"><span class="label">Logement</span><span class="value">Nº ${o.unit}</span></div>
        <div class="row"><span class="label">Propriétaire</span><span class="value">${o.landlord}</span></div>
        <hr class="divider"/>
        <h2>Renseignements sur le locataire</h2>
        <div class="row"><span class="label">Nom</span><span class="value">${o.tenant}</span></div>
        <hr class="divider"/>
        <h2>Montants</h2>
        <table><tr><th>Période</th><th>Loyer mensuel</th><th>Total annuel</th></tr>
          <tr><td>1er janvier au 31 décembre ${year}</td><td>${fmtMoney(o.rent)}</td><td><strong>${fmtMoney(o.rent * 12)}</strong></td></tr>
        </table>
        <hr class="divider"/>
        <p style="font-size:12px;color:#555;">Ce relevé peut être utilisé pour remplir la section relative au loyer payé dans la déclaration de revenus provinciale (Revenu Québec).</p>
        <div class="sig"><div class="sig-block" style="max-width:240px;"><div class="sig-line">Signature du propriétaire — ${o.landlord}</div></div></div>
        ${ftr()}</body></html>`;
    }
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();

  const [tenants, setTenants]   = useState<Tenant[]>([]);
  const [leases, setLeases]     = useState<Lease[]>([]);
  const [loading, setLoading]   = useState(true);

  const [selected, setSelected]         = useState<typeof TEMPLATES[number] | null>(null);
  const [tenantId, setTenantId]         = useState("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [newRent, setNewRent]           = useState("");
  const [entryReason, setEntryReason]   = useState("");
  const [generated, setGenerated]       = useState(false);
  const [htmlContent, setHtmlContent]   = useState("");

  useEffect(() => {
    if (!requireAuth()) return;
    Promise.all([api.getTenants(), api.getLeases()])
      .then(([ts, ls]) => { setTenants(ts); setLeases(ls as Lease[]); if (ts.length) setTenantId(ts[0].id); })
      .catch(e => showToast(e.message, "error"))
      .finally(() => setLoading(false));
  }, []);

  function openTemplate(tpl: typeof TEMPLATES[number]) {
    setSelected(tpl);
    setGenerated(false);
    setNewRent("");
    setEntryReason("");
  }

  function closeModal() {
    setSelected(null);
    setGenerated(false);
    setHtmlContent("");
  }

  function getLeaseForTenant(tid: string) {
    return leases.find(l => l.tenant_id === tid);
  }

  function handleGenerate() {
    if (!selected || !tenantId) return;
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return;
    const lease = getLeaseForTenant(tenantId);
    const landlordName = "Le propriétaire";
    const tenantName = `${(tenant as any).first_name ?? ""} ${(tenant as any).last_name ?? (tenant as any).name ?? ""}`.trim();
    const html = buildHTML(selected.id, {
      landlord: landlordName,
      tenant: tenantName,
      unit: (tenant as any).unit_number || "—",
      property: (tenant as any).property_name || "—",
      address: "",
      rent: lease ? (lease as any).rent_amount ?? (lease as any).monthly_rent ?? 0 : 0,
      newRent: newRent ? parseFloat(newRent) : undefined,
      date: effectiveDate,
      startDate: lease ? (lease as any).start_date : undefined,
      endDate: lease ? (lease as any).end_date : undefined,
      entryReason: entryReason || undefined,
    });
    setHtmlContent(html);
    setGenerated(true);
  }

  function handlePrint() {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(htmlContent);
    win.document.close();
    win.onload = () => win.print();
  }

  const cardClass = "bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)]";

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <PageHeader title={t(T.title)} subtitle={t(T.sub)} />

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {TEMPLATES.map(tpl => (
            <button key={tpl.id} onClick={() => openTemplate(tpl)}
              className={`${cardClass} p-5 text-left hover:shadow-md hover:border-teal-200 dark:hover:border-teal-800 transition-all group`}>
              <div className="flex items-start justify-between mb-3">
                <div className="text-2xl">{tpl.icon}</div>
                {tpl.tag && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: tpl.color + "18", color: tpl.color }}>
                    {tpl.tag}
                  </span>
                )}
              </div>
              <p className="text-[14px] font-semibold text-gray-900 dark:text-white leading-snug group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                {lang === "fr" ? tpl.fr : tpl.en}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Generate modal */}
      <Modal
        isOpen={!!selected}
        onClose={closeModal}
        title={selected ? (lang === "fr" ? selected.fr : selected.en) : ""}
        footer={
          !generated ? (
            <div className="flex gap-2 justify-end">
              <button onClick={closeModal} className="px-4 py-2 text-[13px] rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
                {lang === "fr" ? "Annuler" : "Cancel"}
              </button>
              <button onClick={handleGenerate} disabled={!tenantId}
                className="px-5 py-2 text-[13px] font-semibold text-white rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 transition-colors">
                {t(T.generate)}
              </button>
            </div>
          ) : (
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setGenerated(false); setHtmlContent(""); }}
                className="px-4 py-2 text-[13px] rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800">
                {t(T.newDoc)}
              </button>
              <button onClick={handlePrint}
                className="px-5 py-2 text-[13px] font-semibold text-white rounded-xl bg-teal-600 hover:bg-teal-700 transition-colors">
                🖨️ {t(T.print)}
              </button>
            </div>
          )
        }
      >
        {!generated ? (
          <div className="space-y-4">
            {/* Tenant selector */}
            <FormField label={t(T.tenant)} required>
              {tenants.length === 0 ? (
                <p className="text-[13px] text-gray-400 italic">{t(T.noTenants)}</p>
              ) : (
                <select className={selectClass} value={tenantId} onChange={e => setTenantId(e.target.value)}>
                  {tenants.map(tn => (
                    <option key={tn.id} value={tn.id}>
                      {(tn as any).first_name ?? ""} {(tn as any).last_name ?? (tn as any).name ?? ""}
                      {(tn as any).unit_number ? ` · Log. ${(tn as any).unit_number}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </FormField>

            {/* Effective date */}
            <FormField label={t(T.effectDate)} required>
              <input className={inputClass} type="date" value={effectiveDate}
                onChange={e => setEffectiveDate(e.target.value)} />
            </FormField>

            {/* New rent (for lease / renewal / increase) */}
            {selected?.needsRent && (
              <FormField label={t(T.newRent)}>
                <input className={inputClass} type="number" min="0" step="0.01" value={newRent}
                  onChange={e => setNewRent(e.target.value)}
                  placeholder={tenantId ? (() => {
                    const l = getLeaseForTenant(tenantId);
                    const amt = l ? (l as any).rent_amount ?? (l as any).monthly_rent ?? 0 : 0;
                    return `${t(T.currentRent)}: ${amt}$`;
                  })() : ""} />
              </FormField>
            )}

            {/* Entry reason */}
            {(selected as any)?.needsReason && (
              <FormField label={t(T.entryReason)}>
                <input className={inputClass} value={entryReason}
                  onChange={e => setEntryReason(e.target.value)}
                  placeholder={t(T.entryPlaceholder)} />
              </FormField>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-[17px] font-bold text-gray-900 dark:text-white mb-1">{t(T.ready)}</p>
            <p className="text-[13px] text-gray-500 dark:text-gray-400">{t(T.readySub)}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
