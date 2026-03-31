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
import { Icon } from "@/lib/icons";

// ─── i18n ─────────────────────────────────────────────────────────────────────
const T = {
  title:      { fr: "Documents & Avis",              en: "Documents & Notices" },
  sub:        { fr: "Générez des documents légaux en PDF", en: "Generate legal documents as PDF" },
  generate:   { fr: "Générer",                       en: "Generate" },
  generating: { fr: "Génération…",                   en: "Generating…" },
  print:      { fr: "Imprimer / Enregistrer PDF",    en: "Print / Save PDF" },
  newDoc:     { fr: "Nouveau document",              en: "New document" },
  tenant:     { fr: "Locataire",                     en: "Tenant" },
  effectDate: { fr: "Date d'effet",                  en: "Effective date" },
  newRent:    { fr: "Nouveau loyer (CAD)",            en: "New rent (CAD)" },
  currentRent:{ fr: "Loyer actuel",                  en: "Current rent" },
  entryReason:{ fr: "Motif de l'entrée",             en: "Reason for entry" },
  entryPlaceholder:{ fr: "Ex : Inspection annuelle, réparations…", en: "Ex: Annual inspection, repairs…" },
  noTenants:  { fr: "Aucun locataire. Ajoutez-en depuis Locataires.", en: "No tenants found. Add one from Tenants." },
  ready:      { fr: "PDF prêt !", en: "PDF ready!" },
  readySub:   { fr: "Cliquez sur Imprimer pour enregistrer en PDF.", en: "Click Print to save as PDF." },
  // guide
  howTitle:   { fr: "Comment ça marche ?",    en: "How does it work?" },
  howStep1:   { fr: "Choisissez le type de document dans la liste ci-dessous.", en: "Choose a document type from the list below." },
  howStep2:   { fr: "Sélectionnez le locataire — les infos du bail sont pré-remplies.", en: "Select the tenant — lease info is pre-filled." },
  howStep3:   { fr: "Cliquez sur Générer puis Imprimer pour sauvegarder en PDF.", en: "Click Generate then Print to save as PDF." },
  howNote:    { fr: "Les documents sont générés en français, conformes aux lois québécoises.", en: "Documents are generated in French, compliant with Quebec law." },
};

// ─── Template definitions with descriptions ───────────────────────────────────
const TEMPLATES = [
  {
    id: "lease",
    category: "bail",
    fr: "Bail résidentiel",
    en: "Residential lease",
    icon: "document" as const,
    tag: "TAL",
    tagColor: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
    descFr: "Contrat de location standard conforme au formulaire du Tribunal administratif du logement. Pré-rempli avec les informations du locataire, du logement et des conditions du bail.",
    descEn: "Standard lease agreement compliant with the Tribunal administratif du logement (TAL) form. Pre-filled with tenant, unit, and lease details.",
    whenFr: "À utiliser : à la signature d'un nouveau bail.",
    whenEn: "When: signing a new lease agreement.",
    needsRent: true, needsReason: false,
  },
  {
    id: "notice_late",
    category: "loyers",
    fr: "Avis de retard de loyer",
    en: "Late rent notice",
    icon: "warning" as const,
    tag: null,
    tagColor: "",
    descFr: "Mise en demeure formelle envoyée au locataire qui n'a pas payé son loyer à la date d'échéance. Demande le paiement sous 5 jours ouvrables.",
    descEn: "Formal written notice to a tenant who has not paid rent by the due date. Requests payment within 5 business days.",
    whenFr: "À utiliser : dès qu'un loyer est en retard.",
    whenEn: "When: rent is overdue.",
    needsRent: false, needsReason: false,
  },
  {
    id: "notice_renewal",
    category: "loyers",
    fr: "Avis de renouvellement de bail",
    en: "Lease renewal notice",
    icon: "calendar" as const,
    tag: null,
    tagColor: "",
    descFr: "Avis officiel proposant le renouvellement du bail pour une nouvelle période de 12 mois, avec le nouveau montant de loyer. Le locataire a 30 jours pour répondre.",
    descEn: "Official notice proposing lease renewal for a new 12-month term with the updated rent amount. Tenant has 30 days to respond.",
    whenFr: "À utiliser : 3 à 6 mois avant l'expiration du bail.",
    whenEn: "When: 3–6 months before the lease expires.",
    needsRent: true, needsReason: false,
  },
  {
    id: "notice_increase",
    category: "loyers",
    fr: "Avis de modification de loyer",
    en: "Rent increase notice",
    icon: "dollar" as const,
    tag: null,
    tagColor: "",
    descFr: "Avis d'augmentation de loyer conforme à l'article 1945 du Code civil du Québec. Indique le loyer actuel, le nouveau montant et la date d'entrée en vigueur.",
    descEn: "Rent increase notice compliant with article 1945 of the Quebec Civil Code. Shows current rent, new amount, and effective date.",
    whenFr: "À utiliser : pour toute modification du montant du loyer.",
    whenEn: "When: modifying the rent amount.",
    needsRent: true, needsReason: false,
  },
  {
    id: "notice_entry",
    category: "acces",
    fr: "Avis d'entrée du propriétaire",
    en: "Landlord entry notice",
    icon: "home" as const,
    tag: null,
    tagColor: "",
    descFr: "Préavis obligatoire de 24 heures avant d'entrer dans le logement, conformément à l'article 1931 du Code civil du Québec. Inclut la date et le motif de la visite.",
    descEn: "Mandatory 24-hour advance notice before entering the rental unit, per article 1931 of the Quebec Civil Code. Includes date and reason for entry.",
    whenFr: "À utiliser : avant toute inspection ou intervention dans le logement.",
    whenEn: "When: before any inspection or work inside the unit.",
    needsRent: false, needsReason: true,
  },
  {
    id: "receipt",
    category: "comptable",
    fr: "Reçu de paiement",
    en: "Payment receipt",
    icon: "check" as const,
    tag: null,
    tagColor: "",
    descFr: "Reçu officiel confirmant la réception du paiement de loyer pour un mois donné. Inclut le montant, la date, le mode de paiement et la signature du propriétaire.",
    descEn: "Official receipt confirming rent payment for a given month. Includes amount, date, payment method, and landlord signature.",
    whenFr: "À utiliser : à chaque paiement de loyer, sur demande du locataire.",
    whenEn: "When: on each rent payment, upon tenant request.",
    needsRent: false, needsReason: false,
  },
  {
    id: "releve31",
    category: "comptable",
    fr: "Relevé 31 — Loyer annuel",
    en: "Annual rent statement",
    icon: "shield" as const,
    tag: "Fiscal",
    tagColor: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
    descFr: "Document fiscal récapitulatif du loyer total payé pendant l'année. Le locataire en a besoin pour sa déclaration de revenus auprès de Revenu Québec.",
    descEn: "Annual tax summary of total rent paid during the year. Required by tenants for their Quebec income tax return (Revenu Québec).",
    whenFr: "À utiliser : en début d'année (janvier–mars) pour la période fiscale précédente.",
    whenEn: "When: early in the year (Jan–Mar) for the previous tax year.",
    needsRent: false, needsReason: false,
  },
] as const;

type TemplateId = typeof TEMPLATES[number]["id"];

const CATEGORIES = [
  { key: "bail",     fr: "Bail",            en: "Lease",          icon: "document" as const },
  { key: "loyers",   fr: "Avis de loyer",   en: "Rent notices",   icon: "dollar" as const },
  { key: "acces",    fr: "Accès au logement", en: "Unit access",  icon: "home" as const },
  { key: "comptable",fr: "Comptabilité",    en: "Accounting",     icon: "check" as const },
];

// ─── HTML builder ─────────────────────────────────────────────────────────────
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
const fmtDate = (iso: string) => { if (!iso) return ""; return new Date(iso).toLocaleDateString("fr-CA", { day: "2-digit", month: "long", year: "numeric" }); };
const fmtMoney = (n: number) => `${n.toLocaleString("fr-CA")} $`;
const hdr = (title: string, tag?: string) => `<h1>${title}</h1>${tag ? `<span class="tag">${tag}</span>` : ""}<p class="meta">Généré par Domely · ${new Date().toLocaleDateString("fr-CA")}</p><hr class="divider" />`;
const sigs = () => `<div class="sig"><div class="sig-row"><div class="sig-block"><div class="sig-line">Signature du propriétaire</div></div><div class="sig-block"><div class="sig-line">Signature du locataire</div></div></div></div>`;
const ftr = () => `<div class="footer">Ce document a été généré automatiquement par Domely · Les Solutions Privatris Inc.</div>`;

function buildHTML(id: TemplateId, o: { landlord: string; tenant: string; unit: string; property: string; address: string; rent: number; newRent?: number; date: string; startDate?: string; endDate?: string; entryReason?: string }): string {
  switch (id) {
    case "lease": return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${baseStyle}</style></head><body>${hdr("Bail résidentiel", "TAL — Formulaire type F")}<h2>Parties</h2><div class="row"><span class="label">Propriétaire</span><span class="value">${o.landlord}</span></div><div class="row"><span class="label">Locataire</span><span class="value">${o.tenant}</span></div><hr class="divider"/><h2>Logement</h2><div class="row"><span class="label">Adresse</span><span class="value">${o.address || o.property}</span></div><div class="row"><span class="label">Logement</span><span class="value">Nº ${o.unit}</span></div><hr class="divider"/><h2>Conditions du bail</h2><div class="row"><span class="label">Date de début</span><span class="value">${fmtDate(o.startDate || o.date)}</span></div><div class="row"><span class="label">Date de fin</span><span class="value">${fmtDate(o.endDate || "")}</span></div><div class="row"><span class="label">Loyer mensuel</span><span class="value">${fmtMoney(o.newRent || o.rent)}</span></div><div class="row"><span class="label">Jour d'échéance</span><span class="value">1er du mois</span></div><hr class="divider"/><h2>Clauses générales</h2><p style="font-size:12px;line-height:1.6;color:#444;">Le locataire s'engage à payer le loyer à la date convenue. Le propriétaire garantit la jouissance paisible des lieux. Toute modification doit être notifiée selon les délais prévus par la Loi sur l'habitation du Québec.</p>${sigs()}${ftr()}</body></html>`;
    case "notice_late": return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${baseStyle}</style></head><body>${hdr("Avis de retard de loyer — Mise en demeure")}<p>Le propriétaire <strong>${o.landlord}</strong> met en demeure le/la locataire <strong>${o.tenant}</strong>, occupant le logement <strong>Nº ${o.unit}</strong> de l'immeuble <em>${o.property}</em>.</p><hr class="divider"/><h2>Objet</h2><p>Votre loyer du mois en cours d'un montant de <strong>${fmtMoney(o.rent)}</strong> n'a pas été reçu à la date d'échéance prévue. Vous êtes donc en défaut de paiement.</p><h2>Demande</h2><p>Nous vous demandons de procéder au paiement intégral dans les <strong>5 jours ouvrables</strong> suivant la réception du présent avis. À défaut, nous nous réservons le droit d'entreprendre les recours légaux appropriés devant le Tribunal administratif du logement.</p><div class="row" style="margin-top:20px;"><span class="label">Date de l'avis</span><span class="value">${fmtDate(o.date)}</span></div>${sigs()}${ftr()}</body></html>`;
    case "notice_renewal": return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${baseStyle}</style></head><body>${hdr("Avis de renouvellement de bail")}<p>Le propriétaire <strong>${o.landlord}</strong> offre au/à la locataire <strong>${o.tenant}</strong>, occupant le logement <strong>Nº ${o.unit}</strong> de l'immeuble <em>${o.property}</em>, le renouvellement de son bail.</p><hr class="divider"/><table><tr><th>Condition</th><th>Valeur</th></tr><tr><td>Loyer mensuel</td><td><strong>${fmtMoney(o.newRent || o.rent)}</strong></td></tr><tr><td>Nouvelle date de début</td><td>${fmtDate(o.date)}</td></tr><tr><td>Durée du bail</td><td>12 mois</td></tr></table><hr class="divider"/><p>Le/la locataire dispose d'un délai de <strong>30 jours</strong> à compter de la réception du présent avis pour accepter ou refuser l'offre. En l'absence de réponse, le bail sera considéré renouvelé.</p>${sigs()}${ftr()}</body></html>`;
    case "notice_increase": return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${baseStyle}</style></head><body>${hdr("Avis de modification de loyer — Augmentation")}<p>Le propriétaire <strong>${o.landlord}</strong> avise le/la locataire <strong>${o.tenant}</strong>, occupant le logement <strong>Nº ${o.unit}</strong> de l'immeuble <em>${o.property}</em>, d'une modification au loyer.</p><hr class="divider"/><table><tr><th>Détail</th><th>Montant</th></tr><tr><td>Loyer actuel</td><td>${fmtMoney(o.rent)} / mois</td></tr><tr><td>Nouveau loyer</td><td><strong>${fmtMoney(o.newRent || o.rent)} / mois</strong></td></tr><tr><td>Augmentation</td><td>${o.newRent ? fmtMoney(o.newRent - o.rent) : "—"}</td></tr><tr><td>Date d'entrée en vigueur</td><td>${fmtDate(o.date)}</td></tr></table><hr class="divider"/><p>Le/la locataire dispose d'un délai de <strong>30 jours</strong> pour refuser cette modification. Sans réponse dans ce délai, la modification sera réputée acceptée selon l'article 1945 du Code civil du Québec.</p>${sigs()}${ftr()}</body></html>`;
    case "notice_entry": return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${baseStyle}</style></head><body>${hdr("Avis d'entrée du propriétaire")}<p>Le propriétaire <strong>${o.landlord}</strong> avise le/la locataire <strong>${o.tenant}</strong>, occupant le logement <strong>Nº ${o.unit}</strong> de l'immeuble <em>${o.property}</em>, d'une visite à venir.</p><hr class="divider"/><div class="row"><span class="label">Date prévue</span><span class="value">${fmtDate(o.date)}</span></div><div class="row"><span class="label">Motif</span><span class="value">${o.entryReason || "Inspection générale du logement"}</span></div><div class="row"><span class="label">Délai de préavis</span><span class="value">24 heures minimum (art. 1931 C.c.Q.)</span></div><hr class="divider"/><p>Conformément à l'article 1931 du Code civil du Québec, le propriétaire doit donner un préavis d'au moins 24 heures avant d'entrer dans le logement, sauf en cas d'urgence.</p>${sigs()}${ftr()}</body></html>`;
    case "receipt": return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${baseStyle}</style></head><body>${hdr("Reçu de paiement de loyer")}<div style="background:#F0FAF9;border-radius:8px;padding:20px 24px;margin-bottom:20px;"><div style="font-size:28px;font-weight:800;color:#1E7A6E;">${fmtMoney(o.rent)}</div><div style="color:#555;font-size:13px;margin-top:4px;">reçu de <strong>${o.tenant}</strong></div></div><hr class="divider"/><h2>Détails du paiement</h2><div class="row"><span class="label">Locataire</span><span class="value">${o.tenant}</span></div><div class="row"><span class="label">Logement</span><span class="value">Nº ${o.unit} — ${o.property}</span></div><div class="row"><span class="label">Date de paiement</span><span class="value">${fmtDate(o.date)}</span></div><div class="row"><span class="label">Période couverte</span><span class="value">${new Date(o.date).toLocaleDateString("fr-CA", { month: "long", year: "numeric" })}</span></div><div class="row"><span class="label">Mode de paiement</span><span class="value">Virement / Comptant</span></div><hr class="divider"/><p style="font-size:12px;color:#555;">Ce reçu confirme que le paiement de loyer a été reçu intégralement.</p><div class="sig"><div class="sig-block" style="max-width:240px;"><div class="sig-line">Signature du propriétaire — ${o.landlord}</div></div></div>${ftr()}</body></html>`;
    case "releve31": {
      const year = new Date(o.date).getFullYear();
      return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${baseStyle}</style></head><body>${hdr(`Relevé 31 — Loyer payé — ${year}`, "Fiscal")}<p><strong>Note :</strong> Ce relevé est fourni à titre informatif pour faciliter la déclaration de revenus annuelle.</p><hr class="divider"/><h2>Renseignements sur le logement</h2><div class="row"><span class="label">Adresse</span><span class="value">${o.address || o.property}</span></div><div class="row"><span class="label">Logement</span><span class="value">Nº ${o.unit}</span></div><div class="row"><span class="label">Propriétaire</span><span class="value">${o.landlord}</span></div><hr class="divider"/><h2>Renseignements sur le locataire</h2><div class="row"><span class="label">Nom</span><span class="value">${o.tenant}</span></div><hr class="divider"/><h2>Montants</h2><table><tr><th>Période</th><th>Loyer mensuel</th><th>Total annuel</th></tr><tr><td>1er janvier au 31 décembre ${year}</td><td>${fmtMoney(o.rent)}</td><td><strong>${fmtMoney(o.rent * 12)}</strong></td></tr></table><hr class="divider"/><p style="font-size:12px;color:#555;">Ce relevé peut être utilisé pour remplir la section relative au loyer payé dans la déclaration de revenus provinciale (Revenu Québec).</p><div class="sig"><div class="sig-block" style="max-width:240px;"><div class="sig-line">Signature du propriétaire — ${o.landlord}</div></div></div>${ftr()}</body></html>`;
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
  const [guideOpen, setGuideOpen] = useState(true);

  const [selected, setSelected]           = useState<typeof TEMPLATES[number] | null>(null);
  const [tenantId, setTenantId]           = useState("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [newRent, setNewRent]             = useState("");
  const [entryReason, setEntryReason]     = useState("");
  const [generated, setGenerated]         = useState(false);
  const [htmlContent, setHtmlContent]     = useState("");

  useEffect(() => {
    if (!requireAuth()) return;
    Promise.all([api.getTenants(), api.getLeases()])
      .then(([ts, ls]) => { setTenants(ts); setLeases(ls as Lease[]); if (ts.length) setTenantId(ts[0].id); })
      .catch(e => showToast(e.message, "error"))
      .finally(() => setLoading(false));
  }, []);

  function openTemplate(tpl: typeof TEMPLATES[number]) {
    setSelected(tpl); setGenerated(false); setNewRent(""); setEntryReason("");
  }
  function closeModal() { setSelected(null); setGenerated(false); setHtmlContent(""); }
  function getLeaseForTenant(tid: string) { return leases.find(l => l.tenant_id === tid); }

  function handleGenerate() {
    if (!selected || !tenantId) return;
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return;
    const lease = getLeaseForTenant(tenantId);
    const tenantName = `${(tenant as any).first_name ?? ""} ${(tenant as any).last_name ?? (tenant as any).name ?? ""}`.trim();
    const html = buildHTML(selected.id, {
      landlord: "Le propriétaire",
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

  const card = "bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)]";

  return (
    <div className="p-6 space-y-6">
      <PageHeader title={t(T.title)} subtitle={t(T.sub)} />

      {/* ── Guide banner ──────────────────────────────────────────────────── */}
      {guideOpen && (
        <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="text-teal-600 dark:text-teal-400"><Icon name="sparkles" size={18} /></span>
              <h3 className="text-[14px] font-semibold text-teal-800 dark:text-teal-300">{t(T.howTitle)}</h3>
            </div>
            <button onClick={() => setGuideOpen(false)} className="text-teal-400 hover:text-teal-600 dark:hover:text-teal-300 flex-shrink-0 mt-0.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <ol className="space-y-2 mb-3">
            {[t(T.howStep1), t(T.howStep2), t(T.howStep3)].map((step, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[13px] text-teal-700 dark:text-teal-300">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-600 dark:bg-teal-500 text-white text-[11px] font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <p className="text-[12px] text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
            <Icon name="shield" size={13} />
            {t(T.howNote)}
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {CATEGORIES.map(cat => {
            const items = TEMPLATES.filter(tpl => tpl.category === cat.key);
            return (
              <div key={cat.key} className={card + " overflow-hidden"}>
                {/* Category header */}
                <div className="px-5 py-3.5 border-b border-gray-50 dark:border-gray-800 flex items-center gap-2">
                  <span className="text-gray-400 dark:text-gray-500">
                    <Icon name={cat.icon} size={15} />
                  </span>
                  <h3 className="text-[12px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {lang === "fr" ? cat.fr : cat.en}
                  </h3>
                </div>

                {/* Document rows */}
                <div className="divide-y divide-gray-50 dark:divide-gray-800/80">
                  {items.map(tpl => (
                    <div key={tpl.id} className="px-5 py-4 flex items-start gap-4 hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors group">
                      {/* Icon */}
                      <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl group-hover:bg-teal-50 dark:group-hover:bg-teal-900/30 transition-colors">
                        <span className="text-gray-500 dark:text-gray-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                          <Icon name={tpl.icon} size={17} />
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[14px] font-semibold text-gray-900 dark:text-white">
                            {lang === "fr" ? tpl.fr : tpl.en}
                          </span>
                          {tpl.tag && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tpl.tagColor}`}>
                              {tpl.tag}
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed mb-1">
                          {lang === "fr" ? tpl.descFr : tpl.descEn}
                        </p>
                        <p className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">
                          {lang === "fr" ? tpl.whenFr : tpl.whenEn}
                        </p>
                      </div>

                      {/* Action */}
                      <button
                        onClick={() => openTemplate(tpl)}
                        className="flex-shrink-0 px-4 py-2 text-[13px] font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5"
                      >
                        {t(T.generate)}
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Generate modal ────────────────────────────────────────────────── */}
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
              <button
                onClick={handleGenerate}
                disabled={!tenantId}
                className="px-5 py-2 text-[13px] font-semibold text-white rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {t(T.generate)}
              </button>
            </div>
          ) : (
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setGenerated(false); setHtmlContent(""); }}
                className="px-4 py-2 text-[13px] rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {t(T.newDoc)}
              </button>
              <button
                onClick={handlePrint}
                className="px-5 py-2 text-[13px] font-semibold text-white rounded-xl bg-teal-600 hover:bg-teal-700 transition-colors flex items-center gap-2"
              >
                <Icon name="document" size={15} />
                {t(T.print)}
              </button>
            </div>
          )
        }
      >
        {/* Description recap inside modal */}
        {selected && !generated && (
          <div className="mb-5 p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-800">
            <p className="text-[12px] text-gray-600 dark:text-gray-400 leading-relaxed">
              {lang === "fr" ? selected.descFr : selected.descEn}
            </p>
            <p className="text-[11px] text-teal-600 dark:text-teal-400 font-medium mt-1.5">
              {lang === "fr" ? selected.whenFr : selected.whenEn}
            </p>
          </div>
        )}

        {!generated ? (
          <div className="space-y-4">
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

            <FormField label={t(T.effectDate)} required>
              <input className={inputClass} type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} />
            </FormField>

            {selected?.needsRent && (
              <FormField label={t(T.newRent)}>
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="0.01"
                  value={newRent}
                  onChange={e => setNewRent(e.target.value)}
                  placeholder={tenantId ? (() => {
                    const l = getLeaseForTenant(tenantId);
                    const amt = l ? (l as any).rent_amount ?? (l as any).monthly_rent ?? 0 : 0;
                    return `${t(T.currentRent)}: ${amt}$`;
                  })() : ""}
                />
              </FormField>
            )}

            {(selected as any)?.needsReason && (
              <FormField label={t(T.entryReason)}>
                <input className={inputClass} value={entryReason} onChange={e => setEntryReason(e.target.value)} placeholder={t(T.entryPlaceholder)} />
              </FormField>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-14 h-14 bg-teal-50 dark:bg-teal-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Icon name="check" size={28} />
            </div>
            <p className="text-[17px] font-bold text-gray-900 dark:text-white mb-1">{t(T.ready)}</p>
            <p className="text-[13px] text-gray-500 dark:text-gray-400">{t(T.readySub)}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
