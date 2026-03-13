import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, theme } from '../src/components';

interface VacantUnit {
  id: string;
  property: string;
  unit: string;
  rent: number;
  bedrooms: number;
  available: string;
  daysVacant: number;
  listingActive: boolean;
}

interface Applicant {
  id: string;
  unitId: string;
  name: string;
  email: string;
  phone: string;
  income: string;
  message: string;
  date: string;
  status: 'waiting' | 'contacted' | 'rejected';
}

const MOCK_UNITS: VacantUnit[] = [
  { id: '1', property: '123 av. Rosemont', unit: 'Logement 3', rent: 1150, bedrooms: 2, available: '2026-04-01', daysVacant: 12, listingActive: true },
  { id: '2', property: '456 rue Beaubien', unit: 'Logement 1', rent: 950, bedrooms: 1, available: '2026-03-15', daysVacant: 28, listingActive: false },
];

const MOCK_WAITLIST: Applicant[] = [
  { id: '1', unitId: '1', name: 'Kevin Moreau', email: 'kevin@gmail.com', phone: '514-555-7001', income: '52 000$/an', message: 'Couple sans animaux, revenus stables.', date: '2026-03-08', status: 'contacted' },
  { id: '2', unitId: '1', name: 'Isabelle Côté', email: 'isabelle.c@outlook.com', phone: '438-555-7002', income: '48 000$/an', message: 'Non-fumeur, références disponibles.', date: '2026-03-10', status: 'waiting' },
  { id: '3', unitId: '1', name: 'Tariq Al-Hassan', email: 'tariq@email.com', phone: '514-555-7003', income: '61 000$/an', message: 'Ingénieur, bail de 2 ans préféré.', date: '2026-03-11', status: 'waiting' },
  { id: '4', unitId: '2', name: 'Nathalie Gagnon', email: 'ngagnon@hotmail.com', phone: '514-555-7004', income: '38 000$/an', message: 'Étudiante en maîtrise — calme et sérieuse.', date: '2026-03-05', status: 'waiting' },
];

const STATUS_CONFIG = {
  waiting:   { label: 'En attente',  color: theme.colors.warning, bg: theme.colors.warning + '20' },
  contacted: { label: 'Contacté',    color: theme.colors.info,    bg: theme.colors.info + '20' },
  rejected:  { label: 'Refusé',      color: theme.colors.error,   bg: theme.colors.error + '20' },
};

export default function VacancyScreen() {
  const [units, setUnits] = useState<VacantUnit[]>(MOCK_UNITS);
  const [waitlist, setWaitlist] = useState<Applicant[]>(MOCK_WAITLIST);
  const [selectedUnit, setSelectedUnit] = useState<VacantUnit | null>(null);
  const [showAddApplicant, setShowAddApplicant] = useState(false);
  const [newApplicant, setNewApplicant] = useState({ name: '', email: '', phone: '', income: '', message: '' });

  const unitWaitlist = selectedUnit ? waitlist.filter(a => a.unitId === selectedUnit.id) : [];

  const toggleListing = (id: string) => setUnits(us => us.map(u => u.id === id ? { ...u, listingActive: !u.listingActive } : u));

  const updateStatus = (id: string, status: Applicant['status']) => setWaitlist(ws => ws.map(a => a.id === id ? { ...a, status } : a));

  const addApplicant = () => {
    if (!newApplicant.name.trim() || !newApplicant.phone.trim()) { Alert.alert('Erreur', 'Nom et téléphone requis.'); return; }
    setWaitlist(prev => [...prev, {
      id: Date.now().toString(),
      unitId: selectedUnit!.id,
      name: newApplicant.name, email: newApplicant.email,
      phone: newApplicant.phone, income: newApplicant.income,
      message: newApplicant.message, date: new Date().toISOString().slice(0, 10),
      status: 'waiting',
    }]);
    setNewApplicant({ name: '', email: '', phone: '', income: '', message: '' });
    setShowAddApplicant(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => selectedUnit ? setSelectedUnit(null) : router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{selectedUnit ? `Liste d'attente` : 'Logements vacants'}</Text>
        {selectedUnit && (
          <TouchableOpacity onPress={() => setShowAddApplicant(true)} style={styles.addBtn}>
            <Ionicons name="person-add-outline" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {!selectedUnit ? (
        /* Units list */
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Summary */}
          <View style={styles.summaryRow}>
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{units.length}</Text>
              <Text style={styles.summaryLabel}>Logements vacants</Text>
            </Card>
            <Card style={styles.summaryCard}>
              <Text style={[styles.summaryValue, { color: theme.colors.error }]}>
                {units.reduce((s, u) => s + u.daysVacant, 0)}j
              </Text>
              <Text style={styles.summaryLabel}>Jours perdus total</Text>
            </Card>
            <Card style={styles.summaryCard}>
              <Text style={[styles.summaryValue, { color: theme.colors.warning }]}>
                ${units.reduce((s, u) => s + u.rent, 0).toLocaleString()}
              </Text>
              <Text style={styles.summaryLabel}>Revenus perdus/mois</Text>
            </Card>
          </View>

          {units.map(unit => {
            const wl = waitlist.filter(a => a.unitId === unit.id).length;
            return (
              <TouchableOpacity key={unit.id} onPress={() => setSelectedUnit(unit)} activeOpacity={0.8}>
                <Card style={styles.unitCard}>
                  <View style={styles.unitTop}>
                    <View style={styles.unitIcon}>
                      <Ionicons name="key-outline" size={22} color={theme.colors.warning} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.unitName}>{unit.unit}</Text>
                      <Text style={styles.unitProp}>{unit.property}</Text>
                    </View>
                    <View style={[styles.vacantBadge, { backgroundColor: unit.daysVacant > 21 ? theme.colors.error + '20' : theme.colors.warning + '20' }]}>
                      <Text style={[styles.vacantDays, { color: unit.daysVacant > 21 ? theme.colors.error : theme.colors.warning }]}>
                        {unit.daysVacant}j vacant
                      </Text>
                    </View>
                  </View>
                  <View style={styles.unitStats}>
                    <Text style={styles.unitRent}>${unit.rent}/mois</Text>
                    <Text style={styles.unitDetail}>{unit.bedrooms} ch.</Text>
                    <Text style={styles.unitDetail}>Dispo {unit.available}</Text>
                  </View>
                  <View style={styles.unitFooter}>
                    <TouchableOpacity
                      style={[styles.listingToggle, unit.listingActive && styles.listingActive]}
                      onPress={() => toggleListing(unit.id)}
                    >
                      <Ionicons name={unit.listingActive ? 'radio-button-on' : 'radio-button-off'} size={14} color={unit.listingActive ? theme.colors.success : theme.colors.textTertiary} />
                      <Text style={[styles.listingText, unit.listingActive && { color: theme.colors.success }]}>
                        {unit.listingActive ? 'Annonce active' : 'Annonce inactive'}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.wlCount}>
                      <Ionicons name="people-outline" size={14} color={theme.colors.primary} />
                      <Text style={styles.wlCountText}>{wl} candidats</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        /* Waitlist for selected unit */
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Card style={styles.unitSummary}>
            <Text style={styles.unitSummaryName}>{selectedUnit.unit} — {selectedUnit.property}</Text>
            <Text style={styles.unitSummaryRent}>${selectedUnit.rent}/mois · {selectedUnit.bedrooms} ch. · Dispo {selectedUnit.available}</Text>
          </Card>
          <Text style={styles.sectionTitle}>{unitWaitlist.length} candidat{unitWaitlist.length !== 1 ? 's' : ''}</Text>
          {unitWaitlist.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="person-add-outline" size={40} color={theme.colors.textTertiary} />
              <Text style={styles.emptyText}>Aucun candidat pour l'instant</Text>
            </View>
          ) : (
            unitWaitlist.map((app, i) => {
              const sc = STATUS_CONFIG[app.status];
              return (
                <Card key={app.id} style={styles.appCard}>
                  <View style={styles.appTop}>
                    <View style={styles.appAvatar}>
                      <Text style={styles.appInitial}>{app.name[0]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.appName}>#{i + 1} {app.name}</Text>
                      <Text style={styles.appDate}>{app.date} · {app.income}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                      <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
                    </View>
                  </View>
                  {app.message ? <Text style={styles.appMessage}>"{app.message}"</Text> : null}
                  <View style={styles.appActions}>
                    <TouchableOpacity style={styles.appBtn} onPress={() => updateStatus(app.id, 'contacted')}>
                      <Ionicons name="call-outline" size={14} color={theme.colors.primary} />
                      <Text style={styles.appBtnText}>{app.phone}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.appBtn, { backgroundColor: theme.colors.success + '15' }]} onPress={() => router.push('/applicants')}>
                      <Ionicons name="shield-checkmark-outline" size={14} color={theme.colors.success} />
                      <Text style={[styles.appBtnText, { color: theme.colors.success }]}>Vérifier</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => updateStatus(app.id, 'rejected')} style={styles.rejectBtn}>
                      <Ionicons name="close-outline" size={18} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                </Card>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Add applicant modal */}
      <Modal visible={showAddApplicant} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter un candidat</Text>
              <TouchableOpacity onPress={() => setShowAddApplicant(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {[
                { key: 'name', label: 'Nom complet *', placeholder: 'Michael John', kbd: 'default' },
                { key: 'phone', label: 'Téléphone *', placeholder: '514-555-0000', kbd: 'phone-pad' },
                { key: 'email', label: 'Courriel', placeholder: 'michael@email.com', kbd: 'email-address' },
                { key: 'income', label: 'Revenu annuel', placeholder: '45 000$/an', kbd: 'default' },
                { key: 'message', label: 'Message / notes', placeholder: 'Profil, situation, questions...', kbd: 'default' },
              ].map(f => (
                <View key={f.key} style={styles.formGroup}>
                  <Text style={styles.label}>{f.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={(newApplicant as any)[f.key]}
                    onChangeText={v => setNewApplicant(p => ({ ...p, [f.key]: v }))}
                    placeholder={f.placeholder}
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType={f.kbd as any}
                    autoCapitalize={f.key === 'email' ? 'none' : 'words'}
                  />
                </View>
              ))}
              <TouchableOpacity style={styles.saveBtn} onPress={addApplicant}>
                <Text style={styles.saveBtnText}>Ajouter à la liste</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary, marginLeft: 4 },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: theme.spacing.md },
  summaryRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  summaryCard: { flex: 1, alignItems: 'center', gap: 4 },
  summaryValue: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary },
  summaryLabel: { fontSize: 10, color: theme.colors.textSecondary, textAlign: 'center' },
  unitCard: { marginBottom: theme.spacing.sm },
  unitTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  unitIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: theme.colors.warning + '18', alignItems: 'center', justifyContent: 'center' },
  unitName: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  unitProp: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
  vacantBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  vacantDays: { fontSize: 12, fontWeight: '700' },
  unitStats: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  unitRent: { fontSize: 15, fontWeight: '700', color: theme.colors.primary },
  unitDetail: { fontSize: 13, color: theme.colors.textSecondary },
  unitFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listingToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  listingActive: {},
  listingText: { fontSize: 12, color: theme.colors.textTertiary },
  wlCount: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  wlCountText: { fontSize: 12, color: theme.colors.primary, fontWeight: '500' },
  unitSummary: { marginBottom: theme.spacing.md, backgroundColor: theme.colors.primaryLight + '60' },
  unitSummaryName: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  unitSummaryRent: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 3 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: theme.spacing.sm },
  appCard: { marginBottom: theme.spacing.sm },
  appTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 6 },
  appAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  appInitial: { fontSize: 16, fontWeight: '700', color: theme.colors.primary },
  appName: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary },
  appDate: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600' },
  appMessage: { fontSize: 13, color: theme.colors.textSecondary, fontStyle: 'italic', marginBottom: 8 },
  appActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  appBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.full },
  appBtnText: { fontSize: 12, fontWeight: '500', color: theme.colors.primary },
  rejectBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14, color: theme.colors.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.borderRadius.xl, borderTopRightRadius: theme.borderRadius.xl, padding: theme.spacing.lg, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  modalTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary },
  formGroup: { marginBottom: theme.spacing.md },
  label: { fontSize: 14, fontWeight: '500', color: theme.colors.textPrimary, marginBottom: 8 },
  input: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: theme.colors.textPrimary },
  saveBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 14, alignItems: 'center', marginBottom: theme.spacing.lg },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
