import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, theme } from '../src/components';

type AppStatus = 'pending' | 'screening' | 'approved' | 'rejected';

type Applicant = {
  id: string;
  name: string;
  email: string;
  phone: string;
  unit: string;
  property: string;
  income: number;
  appliedDate: string;
  status: AppStatus;
  score?: number;
  creditScore?: number;
  flags?: string[];
};

const STATUS_CONFIG: Record<AppStatus, { label: string; color: string; icon: string }> = {
  pending:   { label: 'En attente', color: theme.colors.warning,  icon: 'time-outline' },
  screening: { label: 'Vérification', color: theme.colors.info,   icon: 'search-outline' },
  approved:  { label: 'Approuvé',     color: theme.colors.success, icon: 'checkmark-circle-outline' },
  rejected:  { label: 'Refusé',       color: theme.colors.error,   icon: 'close-circle-outline' },
};

const MOCK_APPLICANTS: Applicant[] = [
  {
    id: '1', name: 'Alexandre Côté', email: 'alex.cote@gmail.com', phone: '514-555-0192',
    unit: '3', property: 'Duplex Rosemont', income: 62000,
    appliedDate: '2026-03-08', status: 'approved',
    score: 88, creditScore: 742,
    flags: [],
  },
  {
    id: '2', name: 'Sophie Lavoie', email: 'sophie.l@hotmail.com', phone: '438-555-0341',
    unit: '3', property: 'Duplex Rosemont', income: 38000,
    appliedDate: '2026-03-09', status: 'screening',
    score: undefined, creditScore: undefined,
    flags: [],
  },
  {
    id: '3', name: 'Marc Bouchard', email: 'm.bouchard@outlook.com', phone: '450-555-0887',
    unit: '3', property: 'Duplex Rosemont', income: 45000,
    appliedDate: '2026-03-07', status: 'rejected',
    score: 34, creditScore: 548,
    flags: ['Dossier de crédit insuffisant', 'Ratio loyer/revenu élevé (>35%)'],
  },
];

export default function ApplicantsScreen() {
  const [applicants, setApplicants] = useState(MOCK_APPLICANTS);
  const [selectedApp, setSelectedApp] = useState<Applicant | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [running, setRunning] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', income: '' });

  const runScreening = async (id: string) => {
    setRunning(true);
    setApplicants(prev => prev.map(a => a.id === id ? { ...a, status: 'screening' } : a));
    await new Promise(r => setTimeout(r, 2500));
    // Simulate result
    const score = Math.floor(Math.random() * 40) + 55;
    const credit = Math.floor(Math.random() * 200) + 600;
    const approved = score >= 70 && credit >= 650;
    setApplicants(prev => prev.map(a => a.id === id ? {
      ...a,
      status: approved ? 'approved' : 'rejected',
      score,
      creditScore: credit,
      flags: approved ? [] : ['Vérification approfondie recommandée'],
    } : a));
    if (selectedApp?.id === id) {
      setSelectedApp(prev => prev ? {
        ...prev, status: approved ? 'approved' : 'rejected',
        score, creditScore: credit,
        flags: approved ? [] : ['Vérification approfondie recommandée'],
      } : prev);
    }
    setRunning(false);
  };

  const submitApplication = () => {
    if (!form.name || !form.email) { Alert.alert('Erreur', 'Nom et courriel requis.'); return; }
    const newApp: Applicant = {
      id: Date.now().toString(), name: form.name, email: form.email,
      phone: form.phone, unit: '3', property: 'Duplex Rosemont',
      income: parseFloat(form.income) || 0,
      appliedDate: new Date().toISOString().slice(0, 10),
      status: 'pending', flags: [],
    };
    setApplicants(prev => [newApp, ...prev]);
    setShowAddModal(false);
    setForm({ name: '', email: '', phone: '', income: '' });
    Alert.alert('Candidature reçue', 'La demande a été ajoutée. Lancez la vérification pour évaluer le candidat.');
  };

  const getScoreColor = (score?: number) => {
    if (!score) return theme.colors.textSecondary;
    if (score >= 75) return theme.colors.success;
    if (score >= 55) return theme.colors.warning;
    return theme.colors.error;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Candidatures</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        {(['pending','screening','approved','rejected'] as AppStatus[]).map(s => {
          const count = applicants.filter(a => a.status === s).length;
          const cfg = STATUS_CONFIG[s];
          return (
            <View key={s} style={styles.statItem}>
              <Text style={[styles.statCount, { color: cfg.color }]}>{count}</Text>
              <Text style={styles.statLabel}>{cfg.label}</Text>
            </View>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {applicants.map(app => {
          const cfg = STATUS_CONFIG[app.status];
          return (
            <TouchableOpacity key={app.id} onPress={() => setSelectedApp(app)}>
              <Card style={styles.appCard}>
                <View style={styles.appRow}>
                  <View style={styles.appAvatar}>
                    <Text style={styles.appAvatarText}>{app.name.split(' ').map(n => n[0]).join('')}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.appName}>{app.name}</Text>
                    <Text style={styles.appSub}>{app.property} · Log. {app.unit}</Text>
                    <Text style={styles.appDate}>Candidature: {app.appliedDate}</Text>
                  </View>
                  <View style={styles.appRight}>
                    <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20' }]}>
                      <Ionicons name={cfg.icon as any} size={13} color={cfg.color} />
                      <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                    {app.score != null && (
                      <Text style={[styles.scoreText, { color: getScoreColor(app.score) }]}>{app.score}/100</Text>
                    )}
                  </View>
                </View>
                {app.status === 'pending' && (
                  <TouchableOpacity style={styles.screenBtn} onPress={() => runScreening(app.id)}>
                    <Ionicons name="search-outline" size={15} color={theme.colors.primary} />
                    <Text style={styles.screenBtnText}>Lancer la vérification SingleKey</Text>
                  </TouchableOpacity>
                )}
              </Card>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Detail modal */}
      <Modal visible={!!selectedApp} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedApp?.name}</Text>
              <TouchableOpacity onPress={() => setSelectedApp(null)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {selectedApp && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Status */}
                <View style={[styles.detailStatus, { backgroundColor: STATUS_CONFIG[selectedApp.status].color + '15' }]}>
                  <Ionicons name={STATUS_CONFIG[selectedApp.status].icon as any} size={20} color={STATUS_CONFIG[selectedApp.status].color} />
                  <Text style={[styles.detailStatusText, { color: STATUS_CONFIG[selectedApp.status].color }]}>
                    {STATUS_CONFIG[selectedApp.status].label}
                  </Text>
                </View>

                {/* Info grid */}
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}><Text style={styles.infoLabel}>Courriel</Text><Text style={styles.infoValue}>{selectedApp.email}</Text></View>
                  <View style={styles.infoItem}><Text style={styles.infoLabel}>Téléphone</Text><Text style={styles.infoValue}>{selectedApp.phone}</Text></View>
                  <View style={styles.infoItem}><Text style={styles.infoLabel}>Revenu annuel</Text><Text style={styles.infoValue}>${selectedApp.income.toLocaleString()}</Text></View>
                  <View style={styles.infoItem}><Text style={styles.infoLabel}>Ratio loyer/revenu</Text><Text style={styles.infoValue}>{Math.round((1250 / (selectedApp.income / 12)) * 100)}%</Text></View>
                </View>

                {/* Screening results */}
                {selectedApp.status === 'screening' && running && (
                  <Card style={styles.screeningCard}>
                    <ActivityIndicator color={theme.colors.primary} />
                    <Text style={styles.screeningText}>Vérification SingleKey en cours...</Text>
                    <Text style={styles.screeningSubText}>Dossier de crédit · Antécédents · Historique locatif</Text>
                  </Card>
                )}

                {selectedApp.score != null && (
                  <>
                    <Text style={styles.resultTitle}>Résultats de la vérification</Text>
                    <View style={styles.scoreGrid}>
                      <Card style={styles.scoreCard}>
                        <Text style={styles.scoreLabel}>Score global</Text>
                        <Text style={[styles.scoreValue, { color: getScoreColor(selectedApp.score) }]}>{selectedApp.score}<Text style={styles.scoreMax}>/100</Text></Text>
                      </Card>
                      <Card style={styles.scoreCard}>
                        <Text style={styles.scoreLabel}>Cote de crédit</Text>
                        <Text style={[styles.scoreValue, { color: getScoreColor(selectedApp.creditScore) }]}>{selectedApp.creditScore}</Text>
                      </Card>
                    </View>

                    {/* Checks */}
                    {[
                      { label: 'Vérification d\'identité', ok: true },
                      { label: 'Dossier de crédit', ok: (selectedApp.creditScore ?? 0) >= 650 },
                      { label: 'Casier judiciaire', ok: selectedApp.status !== 'rejected' },
                      { label: 'Ratio loyer/revenu < 35%', ok: (1250 / (selectedApp.income / 12)) < 0.35 },
                      { label: 'Références locatives', ok: selectedApp.status === 'approved' },
                    ].map((check, i) => (
                      <View key={i} style={styles.checkRow}>
                        <Ionicons name={check.ok ? 'checkmark-circle' : 'close-circle'} size={18} color={check.ok ? theme.colors.success : theme.colors.error} />
                        <Text style={styles.checkLabel}>{check.label}</Text>
                      </View>
                    ))}

                    {selectedApp.flags && selectedApp.flags.length > 0 && (
                      <Card style={styles.flagsCard}>
                        <Text style={styles.flagsTitle}>Points d'attention</Text>
                        {selectedApp.flags.map((f, i) => (
                          <View key={i} style={styles.flagRow}>
                            <Ionicons name="warning-outline" size={14} color={theme.colors.warning} />
                            <Text style={styles.flagText}>{f}</Text>
                          </View>
                        ))}
                      </Card>
                    )}
                  </>
                )}

                {selectedApp.status === 'pending' && (
                  <TouchableOpacity style={styles.bigScreenBtn} onPress={() => runScreening(selectedApp.id)}>
                    {running ? <ActivityIndicator color="#fff" /> : (
                      <>
                        <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
                        <Text style={styles.bigScreenBtnText}>Lancer la vérification SingleKey</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {selectedApp.status === 'approved' && (
                  <TouchableOpacity style={styles.approveBtn} onPress={() => { setSelectedApp(null); router.push('/documents'); }}>
                    <Ionicons name="document-text-outline" size={18} color="#fff" />
                    <Text style={styles.approveBtnText}>Générer le bail</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Add applicant modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle candidature</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {[
                { label: 'Nom complet *', key: 'name', placeholder: 'Jean Dupont' },
                { label: 'Courriel *', key: 'email', placeholder: 'jean@exemple.com' },
                { label: 'Téléphone', key: 'phone', placeholder: '514-555-0000' },
                { label: 'Revenu annuel (CAD)', key: 'income', placeholder: '50000' },
              ].map(f => (
                <View key={f.key} style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={(form as any)[f.key]}
                    onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                    placeholder={f.placeholder}
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType={f.key === 'income' ? 'numeric' : 'default'}
                  />
                </View>
              ))}
              <TouchableOpacity style={styles.bigScreenBtn} onPress={submitApplication}>
                <Text style={styles.bigScreenBtnText}>Ajouter la candidature</Text>
              </TouchableOpacity>
            </ScrollView>
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
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  statsBar: { flexDirection: 'row', backgroundColor: theme.colors.surface, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  statItem: { flex: 1, alignItems: 'center' },
  statCount: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 2 },
  scroll: { padding: theme.spacing.md, gap: theme.spacing.sm },
  appCard: { marginBottom: 0 },
  appRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  appAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  appAvatarText: { fontSize: 15, fontWeight: '700', color: theme.colors.primary },
  appName: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  appSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  appDate: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 1 },
  appRight: { alignItems: 'flex-end', gap: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600' },
  scoreText: { fontSize: 16, fontWeight: '800' },
  screenBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.borderLight, paddingVertical: 8 },
  screenBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.borderRadius.xl, borderTopRightRadius: theme.borderRadius.xl, padding: theme.spacing.lg, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  modalTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary },
  detailStatus: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: theme.borderRadius.md, padding: 12, marginBottom: theme.spacing.md },
  detailStatusText: { fontSize: 15, fontWeight: '700' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  infoItem: { width: '47%', backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md, padding: 12 },
  infoLabel: { fontSize: 11, color: theme.colors.textSecondary, marginBottom: 4 },
  infoValue: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  screeningCard: { alignItems: 'center', gap: 8, paddingVertical: 20 },
  screeningText: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  screeningSubText: { fontSize: 12, color: theme.colors.textSecondary },
  resultTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: theme.spacing.sm, marginTop: 4 },
  scoreGrid: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  scoreCard: { flex: 1, alignItems: 'center', paddingVertical: theme.spacing.md },
  scoreLabel: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 4 },
  scoreValue: { fontSize: 32, fontWeight: '800' },
  scoreMax: { fontSize: 14, fontWeight: '400', color: theme.colors.textSecondary },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  checkLabel: { fontSize: 14, color: theme.colors.textPrimary },
  flagsCard: { marginTop: theme.spacing.md, backgroundColor: theme.colors.warning + '10', borderWidth: 1, borderColor: theme.colors.warning + '30' },
  flagsTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.warning, marginBottom: 8 },
  flagRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  flagText: { fontSize: 13, color: theme.colors.textSecondary, flex: 1 },
  bigScreenBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 14, marginTop: theme.spacing.lg, marginBottom: theme.spacing.lg },
  bigScreenBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  approveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.success, borderRadius: theme.borderRadius.md, paddingVertical: 14, marginTop: theme.spacing.md, marginBottom: theme.spacing.lg },
  approveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  formGroup: { marginBottom: theme.spacing.md },
  fieldLabel: { fontSize: 14, fontWeight: '500', color: theme.colors.textPrimary, marginBottom: 8 },
  input: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: theme.colors.textPrimary },
});
