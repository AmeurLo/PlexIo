import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, theme } from '../src/components';

type DocTemplate = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  tag?: string;
};

const TEMPLATES: DocTemplate[] = [
  { id: 'lease', title: 'Bail résidentiel', subtitle: 'Formulaire officiel TAL (Bail type F)', icon: 'document-text-outline', color: theme.colors.primary, tag: 'TAL' },
  { id: 'notice_late', title: 'Avis de retard de loyer', subtitle: 'Mise en demeure de paiement', icon: 'alert-circle-outline', color: theme.colors.error },
  { id: 'notice_renewal', title: 'Avis de renouvellement', subtitle: 'Offre de renouvellement du bail', icon: 'refresh-circle-outline', color: theme.colors.success },
  { id: 'notice_increase', title: 'Avis de modification de loyer', subtitle: 'Augmentation de loyer (TAL N-1)', icon: 'trending-up-outline', color: theme.colors.warning },
  { id: 'notice_entry', title: "Avis d'entrée du propriétaire", subtitle: 'Accès au logement (24h minimum)', icon: 'key-outline', color: '#8B5CF6' },
  { id: 'receipt', title: 'Reçu de paiement', subtitle: 'Confirmation de paiement de loyer', icon: 'receipt-outline', color: '#F59E0B' },
  { id: 'releve31', title: 'Relevé 31', subtitle: 'État de compte annuel (fins fiscales)', icon: 'calculator-outline', color: '#EC4899', tag: 'Fiscal' },
];

const MOCK_TENANTS = [
  { id: '1', name: 'Jean Tremblay', unit: '2', property: 'Duplex Rosemont', rent: 1250 },
  { id: '2', name: 'Marie Gagnon', unit: '1', property: 'Triplex Plateau', rent: 980 },
];

export default function DocumentsScreen() {
  const [selectedTemplate, setSelectedTemplate] = useState<DocTemplate | null>(null);
  const [selectedTenant, setSelectedTenant] = useState(MOCK_TENANTS[0]);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [effectiveDate, setEffectiveDate] = useState('2026-04-01');
  const [newRent, setNewRent] = useState('');

  const openTemplate = (tpl: DocTemplate) => {
    setSelectedTemplate(tpl);
    setGenerated(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    // Simulate generation delay
    await new Promise(r => setTimeout(r, 1800));
    setGenerating(false);
    setGenerated(true);
  };

  const handleSend = () => {
    Alert.alert(
      'Document envoyé',
      `Le document a été envoyé à ${selectedTenant.name} par courriel.`,
      [{ text: 'OK', onPress: () => { setSelectedTemplate(null); setGenerated(false); } }]
    );
  };

  const recentDocs = [
    { name: 'Avis de retard — Jean Tremblay', date: '5 mars 2026', icon: 'alert-circle-outline', color: theme.colors.error },
    { name: 'Renouvellement — Marie Gagnon', date: '15 jan. 2026', icon: 'refresh-circle-outline', color: theme.colors.success },
    { name: 'Relevé 31 — Jean Tremblay', date: '28 fév. 2026', icon: 'calculator-outline', color: '#EC4899' },
  ];

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
        {/* Recent */}
        {recentDocs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Récents</Text>
            {recentDocs.map((d, i) => (
              <Card key={i} style={styles.recentCard}>
                <View style={styles.recentRow}>
                  <View style={[styles.recentIcon, { backgroundColor: d.color + '20' }]}>
                    <Ionicons name={d.icon as any} size={18} color={d.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recentName}>{d.name}</Text>
                    <Text style={styles.recentDate}>{d.date}</Text>
                  </View>
                  <TouchableOpacity onPress={() => Alert.alert('PDF', 'Ouverture du document...')}>
                    <Ionicons name="download-outline" size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Templates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Générer un document</Text>
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
        </View>
      </ScrollView>

      {/* Generate modal */}
      <Modal visible={!!selectedTemplate} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedTemplate?.title}</Text>
              <TouchableOpacity onPress={() => { setSelectedTemplate(null); setGenerated(false); }}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {!generated ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Tenant selector */}
                <Text style={styles.fieldLabel}>Locataire</Text>
                <View style={styles.tenantSelector}>
                  {MOCK_TENANTS.map(t => (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.tenantOption, selectedTenant.id === t.id && styles.tenantOptionActive]}
                      onPress={() => setSelectedTenant(t)}
                    >
                      <Text style={[styles.tenantOptionName, selectedTenant.id === t.id && { color: theme.colors.primary }]}>{t.name}</Text>
                      <Text style={styles.tenantOptionUnit}>Log. {t.unit} · {t.property}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Date field */}
                <Text style={styles.fieldLabel}>Date d'effet</Text>
                <TextInput
                  style={styles.input}
                  value={effectiveDate}
                  onChangeText={setEffectiveDate}
                  placeholder="AAAA-MM-JJ"
                  placeholderTextColor={theme.colors.textTertiary}
                />

                {/* Rent field for specific docs */}
                {(selectedTemplate?.id === 'notice_increase' || selectedTemplate?.id === 'lease') && (
                  <>
                    <Text style={styles.fieldLabel}>Nouveau loyer (CAD)</Text>
                    <TextInput
                      style={styles.input}
                      value={newRent}
                      onChangeText={setNewRent}
                      placeholder={`Actuel: $${selectedTenant.rent}/mois`}
                      placeholderTextColor={theme.colors.textTertiary}
                      keyboardType="decimal-pad"
                    />
                  </>
                )}

                {/* Preview info */}
                <Card style={styles.previewInfo}>
                  <View style={styles.previewRow}>
                    <Ionicons name="information-circle-outline" size={16} color={theme.colors.textSecondary} />
                    <Text style={styles.previewInfoText}>
                      Le document sera généré en français, pré-rempli avec les informations du locataire et du logement.
                    </Text>
                  </View>
                </Card>

                <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate}>
                  {generating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="document-outline" size={18} color="#fff" />
                      <Text style={styles.generateBtnText}>Générer le document</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            ) : (
              /* Generated preview */
              <View style={styles.generatedView}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark-circle" size={48} color={theme.colors.success} />
                </View>
                <Text style={styles.successTitle}>Document prêt!</Text>
                <Text style={styles.successSub}>
                  {selectedTemplate?.title} pour {selectedTenant.name} · Logement {selectedTenant.unit}
                </Text>

                {/* Mock PDF preview card */}
                <Card style={styles.pdfPreview}>
                  <View style={styles.pdfHeader}>
                    <Ionicons name="document-text" size={20} color={theme.colors.primary} />
                    <Text style={styles.pdfTitle}>{selectedTemplate?.title}</Text>
                  </View>
                  <View style={styles.pdfDivider} />
                  <Text style={styles.pdfLine}>Locataire: <Text style={styles.pdfValue}>{selectedTenant.name}</Text></Text>
                  <Text style={styles.pdfLine}>Logement: <Text style={styles.pdfValue}>{selectedTenant.unit} — {selectedTenant.property}</Text></Text>
                  <Text style={styles.pdfLine}>Date d'effet: <Text style={styles.pdfValue}>{effectiveDate}</Text></Text>
                  <Text style={styles.pdfLine}>Loyer: <Text style={styles.pdfValue}>${newRent || selectedTenant.rent}/mois</Text></Text>
                </Card>

                <View style={styles.actionBtns}>
                  <TouchableOpacity style={styles.downloadDocBtn} onPress={() => Alert.alert('PDF', 'Document téléchargé.')}>
                    <Ionicons name="download-outline" size={18} color={theme.colors.primary} />
                    <Text style={styles.downloadDocBtnText}>Télécharger PDF</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.sendDocBtn} onPress={handleSend}>
                    <Ionicons name="mail-outline" size={18} color="#fff" />
                    <Text style={styles.sendDocBtnText}>Envoyer par courriel</Text>
                  </TouchableOpacity>
                </View>
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
  recentCard: { marginBottom: theme.spacing.sm },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recentIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  recentName: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  recentDate: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
  templateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  templateCard: { width: '47%', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.borderLight, position: 'relative' },
  templateIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.sm },
  tagBadge: { position: 'absolute', top: 10, right: 10, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  tagText: { fontSize: 10, fontWeight: '700' },
  templateTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 3 },
  templateSub: { fontSize: 11, color: theme.colors.textSecondary, lineHeight: 15 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.borderRadius.xl, borderTopRightRadius: theme.borderRadius.xl, padding: theme.spacing.lg, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  modalTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary, flex: 1, marginRight: 8 },
  fieldLabel: { fontSize: 14, fontWeight: '500', color: theme.colors.textPrimary, marginBottom: 8, marginTop: 4 },
  tenantSelector: { flexDirection: 'row', gap: 10, marginBottom: theme.spacing.md },
  tenantOption: { flex: 1, borderWidth: 1.5, borderColor: theme.colors.borderLight, borderRadius: theme.borderRadius.md, padding: 12 },
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
  successSub: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: theme.spacing.lg },
  pdfPreview: { width: '100%', marginBottom: theme.spacing.lg },
  pdfHeader: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 },
  pdfTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  pdfDivider: { height: 1, backgroundColor: theme.colors.borderLight, marginBottom: 10 },
  pdfLine: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 6 },
  pdfValue: { color: theme.colors.textPrimary, fontWeight: '600' },
  actionBtns: { flexDirection: 'row', gap: 10, width: '100%' },
  downloadDocBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 12 },
  downloadDocBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.primary },
  sendDocBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 12 },
  sendDocBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
