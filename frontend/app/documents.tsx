import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Card, theme } from '../src/components';
import { api } from '../src/services/api';
import { useAuthStore } from '../src/store/authStore';
import { TenantWithDetails, LeaseWithDetails } from '../src/types';

type DocTemplate = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  tag?: string;
};

const TEMPLATES: DocTemplate[] = [
  { id: 'lease',           title: 'Bail résidentiel',               subtitle: 'Formulaire officiel TAL (Bail type F)',    icon: 'document-text-outline',   color: theme.colors.primary,  tag: 'TAL'   },
  { id: 'notice_late',     title: 'Avis de retard de loyer',         subtitle: 'Mise en demeure de paiement',             icon: 'alert-circle-outline',    color: theme.colors.error               },
  { id: 'notice_renewal',  title: 'Avis de renouvellement',          subtitle: 'Offre de renouvellement du bail',         icon: 'refresh-circle-outline',  color: theme.colors.success             },
  { id: 'notice_increase', title: 'Avis de modification de loyer',   subtitle: 'Augmentation de loyer (TAL N-1)',         icon: 'trending-up-outline',     color: theme.colors.warning             },
  { id: 'notice_entry',    title: "Avis d'entrée du propriétaire",   subtitle: 'Accès au logement (24h minimum)',         icon: 'key-outline',             color: '#8B5CF6'                        },
  { id: 'receipt',         title: 'Reçu de paiement',                subtitle: 'Confirmation de paiement de loyer',      icon: 'receipt-outline',         color: '#F59E0B'                        },
  { id: 'releve31',        title: 'Relevé 31',                       subtitle: 'État de compte annuel (fins fiscales)',   icon: 'calculator-outline',      color: '#EC4899', tag: 'Fiscal'        },
];

const fmtDate = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-CA', { day: '2-digit', month: 'long', year: 'numeric' });
};

const fmtMoney = (n: number) => `${n.toLocaleString('fr-CA')} $`;

// ─── HTML Templates ───────────────────────────────────────────────────────────

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
`;

const header = (title: string, tag?: string) => `
  <h1>${title}</h1>
  ${tag ? `<span class="tag">${tag}</span>` : ''}
  <p class="meta">Généré par Domely · ${new Date().toLocaleDateString('fr-CA')}</p>
  <hr class="divider" />
`;

const signatures = () => `
  <div class="sig">
    <div class="sig-row">
      <div class="sig-block"><div class="sig-line">Signature du propriétaire</div></div>
      <div class="sig-block"><div class="sig-line">Signature du locataire</div></div>
    </div>
  </div>
`;

const footer = () => `<div class="footer">Ce document a été généré automatiquement par Domely · Les Solutions Privatris Inc.</div>`;

function buildHTML(templateId: string, opts: {
  landlordName: string;
  tenantName: string;
  unitNumber: string;
  propertyName: string;
  propertyAddress: string;
  rent: number;
  newRent?: number;
  effectiveDate: string;
  startDate?: string;
  endDate?: string;
  entryDate?: string;
  entryReason?: string;
}): string {
  const { landlordName, tenantName, unitNumber, propertyName, propertyAddress, rent, newRent, effectiveDate, startDate, endDate, entryDate, entryReason } = opts;

  switch (templateId) {
    case 'lease':
      return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${baseStyle}</style></head><body>
        ${header('Bail résidentiel', 'TAL — Formulaire type F')}
        <h2>Parties</h2>
        <div class="row"><span class="label">Propriétaire</span><span class="value">${landlordName}</span></div>
        <div class="row"><span class="label">Locataire</span><span class="value">${tenantName}</span></div>
        <hr class="divider"/>
        <h2>Logement</h2>
        <div class="row"><span class="label">Adresse</span><span class="value">${propertyAddress}</span></div>
        <div class="row"><span class="label">Immeuble</span><span class="value">${propertyName}</span></div>
        <div class="row"><span class="label">Logement</span><span class="value">Nº ${unitNumber}</span></div>
        <hr class="divider"/>
        <h2>Conditions du bail</h2>
        <div class="row"><span class="label">Date de début</span><span class="value">${fmtDate(startDate || effectiveDate)}</span></div>
        <div class="row"><span class="label">Date de fin</span><span class="value">${fmtDate(endDate || '')}</span></div>
        <div class="row"><span class="label">Loyer mensuel</span><span class="value">${fmtMoney(newRent || rent)}</span></div>
        <div class="row"><span class="label">Jour d'échéance</span><span class="value">1er du mois</span></div>
        <hr class="divider"/>
        <h2>Clauses générales</h2>
        <p style="font-size:12px;line-height:1.6;color:#444;">Le locataire s'engage à payer le loyer à la date convenue. Le propriétaire garantit la jouissance paisible des lieux. Toute modification doit être notifiée selon les délais prévus par la Loi sur l'habitation du Québec.</p>
        ${signatures()}
        ${footer()}
      </body></html>`;

    case 'notice_late':
      return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${baseStyle}</style></head><body>
        ${header('Avis de retard de loyer — Mise en demeure')}
        <p>Le propriétaire <strong>${landlordName}</strong> met en demeure le/la locataire <strong>${tenantName}</strong>, occupant le logement <strong>Nº ${unitNumber}</strong> de l'immeuble <em>${propertyName}</em>, situé au ${propertyAddress}.</p>
        <hr class="divider"/>
        <h2>Objet</h2>
        <p>Votre loyer du mois en cours d'un montant de <strong>${fmtMoney(rent)}</strong> n'a pas été reçu à la date d'échéance prévue. Vous êtes donc en défaut de paiement.</p>
        <h2>Demande</h2>
        <p>Nous vous demandons de procéder au paiement intégral du montant dû dans les <strong>5 jours ouvrables</strong> suivant la réception du présent avis. À défaut, nous nous réservons le droit d'entreprendre les recours légaux appropriés, notamment une demande de résiliation de bail devant le Tribunal administratif du logement.</p>
        <div class="row" style="margin-top:20px;"><span class="label">Date de l'avis</span><span class="value">${fmtDate(effectiveDate)}</span></div>
        ${signatures()}
        ${footer()}
      </body></html>`;

    case 'notice_renewal':
      return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${baseStyle}</style></head><body>
        ${header("Avis de renouvellement de bail")}
        <p>Le propriétaire <strong>${landlordName}</strong> offre au/à la locataire <strong>${tenantName}</strong>, occupant le logement <strong>Nº ${unitNumber}</strong> de l'immeuble <em>${propertyName}</em>, le renouvellement de son bail aux conditions suivantes :</p>
        <hr class="divider"/>
        <table>
          <tr><th>Condition</th><th>Valeur</th></tr>
          <tr><td>Loyer mensuel</td><td><strong>${fmtMoney(newRent || rent)}</strong></td></tr>
          <tr><td>Nouvelle date de début</td><td>${fmtDate(effectiveDate)}</td></tr>
          <tr><td>Durée du bail</td><td>12 mois</td></tr>
        </table>
        <hr class="divider"/>
        <p>Le/la locataire dispose d'un délai de <strong>30 jours</strong> à compter de la réception du présent avis pour accepter ou refuser l'offre de renouvellement. En l'absence de réponse dans ce délai, le bail sera considéré renouvelé aux conditions mentionnées.</p>
        ${signatures()}
        ${footer()}
      </body></html>`;

    case 'notice_increase':
      return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${baseStyle}</style></head><body>
        ${header("Avis de modification de loyer — Augmentation")}
        <p>Le propriétaire <strong>${landlordName}</strong> avise le/la locataire <strong>${tenantName}</strong>, occupant le logement <strong>Nº ${unitNumber}</strong> de l'immeuble <em>${propertyName}</em>, d'une modification au loyer.</p>
        <hr class="divider"/>
        <table>
          <tr><th>Détail</th><th>Montant</th></tr>
          <tr><td>Loyer actuel</td><td>${fmtMoney(rent)} / mois</td></tr>
          <tr><td>Nouveau loyer</td><td><strong>${fmtMoney(newRent || rent)} / mois</strong></td></tr>
          <tr><td>Augmentation</td><td>${newRent ? fmtMoney(newRent - rent) : '—'}</td></tr>
          <tr><td>Date d'entrée en vigueur</td><td>${fmtDate(effectiveDate)}</td></tr>
        </table>
        <hr class="divider"/>
        <p>Le/la locataire dispose d'un délai de <strong>30 jours</strong> pour refuser cette modification et aviser le propriétaire. Sans réponse dans ce délai, la modification sera réputée acceptée selon l'article 1945 du Code civil du Québec.</p>
        ${signatures()}
        ${footer()}
      </body></html>`;

    case 'notice_entry':
      return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${baseStyle}</style></head><body>
        ${header("Avis d'entrée du propriétaire")}
        <p>Le propriétaire <strong>${landlordName}</strong> avise le/la locataire <strong>${tenantName}</strong>, occupant le logement <strong>Nº ${unitNumber}</strong> de l'immeuble <em>${propertyName}</em>, d'une visite à venir.</p>
        <hr class="divider"/>
        <div class="row"><span class="label">Date prévue</span><span class="value">${fmtDate(entryDate || effectiveDate)}</span></div>
        <div class="row"><span class="label">Motif</span><span class="value">${entryReason || 'Inspection générale du logement'}</span></div>
        <div class="row"><span class="label">Délai de préavis</span><span class="value">24 heures minimum (art. 1931 C.c.Q.)</span></div>
        <hr class="divider"/>
        <p>Conformément à l'article 1931 du Code civil du Québec, le propriétaire doit donner un préavis d'au moins 24 heures avant d'entrer dans le logement, sauf en cas d'urgence.</p>
        ${signatures()}
        ${footer()}
      </body></html>`;

    case 'receipt':
      return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${baseStyle}</style></head><body>
        ${header("Reçu de paiement de loyer")}
        <div style="background:#F0FAF9;border-radius:8px;padding:20px 24px;margin-bottom:20px;">
          <div style="font-size:28px;font-weight:800;color:#1E7A6E;">${fmtMoney(rent)}</div>
          <div style="color:#555;font-size:13px;margin-top:4px;">reçu de <strong>${tenantName}</strong></div>
        </div>
        <hr class="divider"/>
        <h2>Détails du paiement</h2>
        <div class="row"><span class="label">Locataire</span><span class="value">${tenantName}</span></div>
        <div class="row"><span class="label">Logement</span><span class="value">Nº ${unitNumber} — ${propertyName}</span></div>
        <div class="row"><span class="label">Date de paiement</span><span class="value">${fmtDate(effectiveDate)}</span></div>
        <div class="row"><span class="label">Période couverte</span><span class="value">${new Date(effectiveDate).toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' })}</span></div>
        <div class="row"><span class="label">Mode de paiement</span><span class="value">Virement / Comptant</span></div>
        <hr class="divider"/>
        <p style="font-size:12px;color:#555;">Ce reçu confirme que le paiement de loyer a été reçu intégralement. Il ne constitue pas une quittance de toute autre somme due.</p>
        <div class="sig"><div class="sig-block" style="max-width:240px;"><div class="sig-line">Signature du propriétaire — ${landlordName}</div></div></div>
        ${footer()}
      </body></html>`;

    case 'releve31':
      const year = new Date(effectiveDate).getFullYear();
      const annualRent = rent * 12;
      return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${baseStyle}</style></head><body>
        ${header(`Relevé 31 — Loyer payé — ${year}`, 'Fiscal')}
        <p><strong>Note :</strong> Ce relevé est fourni à titre informatif pour faciliter la déclaration de revenus annuelle. Il n'est pas un document officiel émis par Revenu Québec.</p>
        <hr class="divider"/>
        <h2>Renseignements sur le logement</h2>
        <div class="row"><span class="label">Adresse</span><span class="value">${propertyAddress}</span></div>
        <div class="row"><span class="label">Logement</span><span class="value">Nº ${unitNumber}</span></div>
        <div class="row"><span class="label">Propriétaire</span><span class="value">${landlordName}</span></div>
        <hr class="divider"/>
        <h2>Renseignements sur le locataire</h2>
        <div class="row"><span class="label">Nom</span><span class="value">${tenantName}</span></div>
        <hr class="divider"/>
        <h2>Montants</h2>
        <table>
          <tr><th>Période</th><th>Loyer mensuel</th><th>Total annuel</th></tr>
          <tr><td>1er janvier au 31 décembre ${year}</td><td>${fmtMoney(rent)}</td><td><strong>${fmtMoney(annualRent)}</strong></td></tr>
        </table>
        <hr class="divider"/>
        <p style="font-size:12px;color:#555;">Ce relevé peut être utilisé pour remplir la section relative au loyer payé dans la déclaration de revenus provinciale (Revenu Québec). Conservez ce document avec vos pièces fiscales.</p>
        <div class="sig"><div class="sig-block" style="max-width:240px;"><div class="sig-line">Signature du propriétaire — ${landlordName}</div></div></div>
        ${footer()}
      </body></html>`;

    default:
      return `<!DOCTYPE html><html><body><p>Document non disponible.</p></body></html>`;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DocumentsScreen() {
  const { user } = useAuthStore();
  const landlordName = user?.full_name || 'Le propriétaire';

  const [tenants, setTenants] = useState<TenantWithDetails[]>([]);
  const [leases, setLeases]   = useState<LeaseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedTemplate, setSelectedTemplate] = useState<DocTemplate | null>(null);
  const [selectedTenant,   setSelectedTenant]   = useState<TenantWithDetails | null>(null);
  const [generating,       setGenerating]       = useState(false);
  const [generated,        setGenerated]        = useState(false);
  const [sharing,          setSharing]          = useState(false);

  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [newRent,       setNewRent]       = useState('');
  const [entryReason,   setEntryReason]   = useState('');

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      try {
        const [t, l] = await Promise.all([api.getTenants(), api.getLeases(false)]);
        if (!active) return;
        setTenants(t);
        setLeases(l);
        if (t.length > 0) setSelectedTenant(t[0]);
      } catch {
        // silently fail — user sees empty list
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []));

  const openTemplate = (tpl: DocTemplate) => {
    setSelectedTemplate(tpl);
    setGenerated(false);
    setNewRent('');
    setEntryReason('');
  };

  const getLeaseForTenant = (tenantId: string) =>
    leases.find(l => l.tenant_id === tenantId);

  const handleGenerate = async () => {
    if (!selectedTenant || !selectedTemplate) return;
    setGenerating(true);
    try {
      const lease = getLeaseForTenant(selectedTenant.id);
      const html = buildHTML(selectedTemplate.id, {
        landlordName,
        tenantName: `${selectedTenant.first_name} ${selectedTenant.last_name}`,
        unitNumber:  selectedTenant.unit_number || '—',
        propertyName: selectedTenant.property_name || '—',
        propertyAddress: lease ? '' : '',
        rent: lease?.rent_amount || 0,
        newRent: newRent ? parseFloat(newRent) : undefined,
        effectiveDate,
        startDate: lease?.start_date,
        endDate:   lease?.end_date,
        entryDate: effectiveDate,
        entryReason: entryReason || undefined,
      });
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      setGenerated(true);
      // Keep uri for sharing
      (handleGenerate as any)._lastUri = uri;
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de générer le PDF. Vérifiez que expo-print est installé.');
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = async () => {
    const uri: string | undefined = (handleGenerate as any)._lastUri;
    if (!uri) {
      Alert.alert('Info', 'Veuillez d\'abord générer le document.');
      return;
    }
    setSharing(true);
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Partage non disponible', 'Le partage de fichiers n\'est pas disponible sur cet appareil.');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: selectedTemplate?.title || 'Document',
        UTI: 'com.adobe.pdf',
      });
    } catch {
      Alert.alert('Erreur', 'Impossible de partager le fichier.');
    } finally {
      setSharing(false);
    }
  };

  const handleClose = () => {
    setSelectedTemplate(null);
    setGenerated(false);
    (handleGenerate as any)._lastUri = undefined;
  };

  const needsNewRent = selectedTemplate?.id === 'notice_increase' || selectedTemplate?.id === 'notice_renewal' || selectedTemplate?.id === 'lease';
  const needsEntryReason = selectedTemplate?.id === 'notice_entry';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Documents & Avis</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Templates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Générer un document</Text>
          {loading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 20 }} />
          ) : (
            <View style={styles.templateGrid}>
              {TEMPLATES.map(tpl => (
                <TouchableOpacity key={tpl.id} style={styles.templateCard} onPress={() => openTemplate(tpl)}>
                  <View style={[styles.templateIcon, { backgroundColor: tpl.color + '18' }]}>
                    <Ionicons name={tpl.icon as any} size={24} color={tpl.color} />
                  </View>
                  {tpl.tag && (
                    <View style={[styles.tagBadge, { backgroundColor: tpl.color + '20' }]}>
                      <Text style={[styles.tagText, { color: tpl.color }]}>{tpl.tag}</Text>
                    </View>
                  )}
                  <Text style={styles.templateTitle}>{tpl.title}</Text>
                  <Text style={styles.templateSub}>{tpl.subtitle}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Generate modal */}
      <Modal visible={!!selectedTemplate} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedTemplate?.title}</Text>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {!generated ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Tenant selector */}
                <Text style={styles.fieldLabel}>Locataire</Text>
                {tenants.length === 0 ? (
                  <Text style={styles.emptyNote}>Aucun locataire trouvé. Ajoutez-en un depuis l'onglet Locataires.</Text>
                ) : (
                  <FlatList
                    data={tenants}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={t => t.id}
                    style={{ marginBottom: theme.spacing.md }}
                    renderItem={({ item: t }) => (
                      <TouchableOpacity
                        style={[styles.tenantOption, selectedTenant?.id === t.id && styles.tenantOptionActive]}
                        onPress={() => setSelectedTenant(t)}
                      >
                        <Text style={[styles.tenantOptionName, selectedTenant?.id === t.id && { color: theme.colors.primary }]}>
                          {t.first_name} {t.last_name}
                        </Text>
                        <Text style={styles.tenantOptionUnit}>
                          {t.unit_number ? `Log. ${t.unit_number}` : ''}{t.property_name ? ` · ${t.property_name}` : ''}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                )}

                {/* Date field */}
                <Text style={styles.fieldLabel}>Date d'effet</Text>
                <TextInput
                  style={styles.input}
                  value={effectiveDate}
                  onChangeText={setEffectiveDate}
                  placeholder="AAAA-MM-JJ"
                  placeholderTextColor={theme.colors.textTertiary}
                />

                {/* New rent */}
                {needsNewRent && (
                  <>
                    <Text style={styles.fieldLabel}>
                      {selectedTemplate?.id === 'lease' ? 'Loyer mensuel (CAD)' : 'Nouveau loyer (CAD)'}
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={newRent}
                      onChangeText={setNewRent}
                      placeholder={selectedTenant ? `Actuel: $${getLeaseForTenant(selectedTenant.id)?.rent_amount || '—'}/mois` : 'Montant'}
                      placeholderTextColor={theme.colors.textTertiary}
                      keyboardType="decimal-pad"
                    />
                  </>
                )}

                {/* Entry reason */}
                {needsEntryReason && (
                  <>
                    <Text style={styles.fieldLabel}>Motif de l'entrée</Text>
                    <TextInput
                      style={styles.input}
                      value={entryReason}
                      onChangeText={setEntryReason}
                      placeholder="Ex: Inspection annuelle, réparations..."
                      placeholderTextColor={theme.colors.textTertiary}
                    />
                  </>
                )}

                {/* Info */}
                <Card style={styles.previewInfo}>
                  <View style={styles.previewRow}>
                    <Ionicons name="information-circle-outline" size={16} color={theme.colors.textSecondary} />
                    <Text style={styles.previewInfoText}>
                      Le document sera généré en PDF, pré-rempli avec les informations du locataire et du logement.
                    </Text>
                  </View>
                </Card>

                <TouchableOpacity
                  style={[styles.generateBtn, (!selectedTenant || generating) && { opacity: 0.6 }]}
                  onPress={handleGenerate}
                  disabled={!selectedTenant || generating}
                >
                  {generating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="document-outline" size={18} color="#fff" />
                      <Text style={styles.generateBtnText}>Générer le PDF</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            ) : (
              /* Generated: share options */
              <View style={styles.generatedView}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark-circle" size={52} color={theme.colors.success} />
                </View>
                <Text style={styles.successTitle}>PDF prêt !</Text>
                <Text style={styles.successSub}>
                  {selectedTemplate?.title}{'\n'}
                  {selectedTenant?.first_name} {selectedTenant?.last_name}{selectedTenant?.unit_number ? ` · Log. ${selectedTenant.unit_number}` : ''}
                </Text>

                <Card style={styles.pdfPreview}>
                  <View style={styles.pdfHeader}>
                    <Ionicons name="document-text" size={20} color={theme.colors.primary} />
                    <Text style={styles.pdfTitle}>{selectedTemplate?.title}</Text>
                  </View>
                  <View style={styles.pdfDivider} />
                  <Text style={styles.pdfLine}>Locataire: <Text style={styles.pdfValue}>{selectedTenant?.first_name} {selectedTenant?.last_name}</Text></Text>
                  {selectedTenant?.unit_number && <Text style={styles.pdfLine}>Logement: <Text style={styles.pdfValue}>Nº {selectedTenant.unit_number} — {selectedTenant.property_name}</Text></Text>}
                  <Text style={styles.pdfLine}>Date d'effet: <Text style={styles.pdfValue}>{effectiveDate}</Text></Text>
                  {newRent ? <Text style={styles.pdfLine}>Loyer: <Text style={styles.pdfValue}>{fmtMoney(parseFloat(newRent))}/mois</Text></Text> : null}
                </Card>

                <View style={styles.actionBtns}>
                  <TouchableOpacity style={styles.downloadDocBtn} onPress={handleShare} disabled={sharing}>
                    {sharing ? <ActivityIndicator color={theme.colors.primary} size="small" /> : (
                      <>
                        <Ionicons name="share-outline" size={18} color={theme.colors.primary} />
                        <Text style={styles.downloadDocBtnText}>Partager / Enregistrer</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={handleClose} style={styles.newDocBtn}>
                  <Text style={styles.newDocBtnText}>Nouveau document</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: theme.spacing.md, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
  scroll: { padding: theme.spacing.md },
  section: { marginBottom: theme.spacing.lg },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: theme.spacing.sm },
  emptyNote: { fontSize: 13, color: theme.colors.textSecondary, fontStyle: 'italic', marginBottom: theme.spacing.md },
  templateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  templateCard: { width: '47%', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.borderLight, position: 'relative' },
  templateIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.sm },
  tagBadge: { position: 'absolute', top: 10, right: 10, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  tagText: { fontSize: 10, fontWeight: '700' },
  templateTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 3 },
  templateSub: { fontSize: 11, color: theme.colors.textSecondary, lineHeight: 15 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.borderRadius.xl, borderTopRightRadius: theme.borderRadius.xl, padding: theme.spacing.lg, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  modalTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary, flex: 1, marginRight: 8 },
  fieldLabel: { fontSize: 14, fontWeight: '500', color: theme.colors.textPrimary, marginBottom: 8, marginTop: 4 },
  tenantOption: { borderWidth: 1.5, borderColor: theme.colors.borderLight, borderRadius: theme.borderRadius.md, padding: 12, marginRight: 10, minWidth: 140 },
  tenantOptionActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  tenantOptionName: { fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary },
  tenantOptionUnit: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  input: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: theme.colors.textPrimary, marginBottom: theme.spacing.md },
  previewInfo: { marginBottom: theme.spacing.md },
  previewRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  previewInfoText: { flex: 1, fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 14, marginBottom: theme.spacing.lg },
  generateBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  // Generated state
  generatedView: { alignItems: 'center', paddingBottom: theme.spacing.xl },
  successIcon: { marginBottom: 8 },
  successTitle: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary, marginBottom: 4 },
  successSub: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: theme.spacing.lg, lineHeight: 20 },
  pdfPreview: { width: '100%', marginBottom: theme.spacing.lg },
  pdfHeader: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 },
  pdfTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  pdfDivider: { height: 1, backgroundColor: theme.colors.borderLight, marginBottom: 10 },
  pdfLine: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 6 },
  pdfValue: { color: theme.colors.textPrimary, fontWeight: '600' },
  actionBtns: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 12 },
  downloadDocBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 13 },
  downloadDocBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.primary },
  newDocBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  newDocBtnText: { fontSize: 14, color: theme.colors.textSecondary, textDecorationLine: 'underline' },
});
