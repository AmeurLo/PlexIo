import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, KeyboardAvoidingView, Platform,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, theme } from '../src/components';
import { api } from '../src/services/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface VacantUnit {
  id: string;
  property_name: string;
  property_address: string;
  unit_number: string;
  rent_amount: number;
  bedrooms: number;
  days_vacant: number;
  listing_active: boolean;
}

interface Applicant {
  id: string;
  unit_id: string;
  name: string;
  email: string;
  phone: string;
  income: string;
  message: string;
  date: string;
  status: 'waiting' | 'contacted' | 'rejected';
}

const STATUS_CONFIG = {
  waiting:   { label: 'En attente',  color: theme.colors.warning, bg: theme.colors.warning + '20' },
  contacted: { label: 'Contacté',    color: theme.colors.info,    bg: theme.colors.info + '20' },
  rejected:  { label: 'Refusé',      color: theme.colors.error,   bg: theme.colors.error + '20' },
};

const EMPTY_FORM = { name: '', email: '', phone: '', income: '', message: '' };

// ─── Component ───────────────────────────────────────────────────────────────

export default function VacancyScreen() {
  const [units,        setUnits]        = useState<VacantUnit[]>([]);
  const [waitlist,     setWaitlist]     = useState<Applicant[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<VacantUnit | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [listLoading,  setListLoading]  = useState(false);

  const [showAddApplicant, setShowAddApplicant] = useState(false);
  const [saving,           setSaving]           = useState(false);
  const [newApplicant,     setNewApplicant]      = useState(EMPTY_FORM);

  useFocusEffect(useCallback(() => {
    loadUnits();
  }, []));

  const loadUnits = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await api.getVacantUnits();
      setUnits(data as VacantUnit[]);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les logements vacants.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadApplicants = async (unit: VacantUnit) => {
    setListLoading(true);
    setSelectedUnit(unit);
    try {
      const data = await api.getApplicants(unit.id);
      setWaitlist(data as Applicant[]);
    } catch {
      setWaitlist([]);
    } finally {
      setListLoading(false);
    }
  };

  const handleToggleListing = async (unitId: string) => {
    try {
      const res = await api.toggleListing(unitId);
      setUnits(us => us.map(u => u.id === unitId ? { ...u, listing_active: res.listing_active } : u));
      if (selectedUnit?.id === unitId) {
        setSelectedUnit(prev => prev ? { ...prev, listing_active: res.listing_active } : prev);
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de changer le statut de l\'annonce.');
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await api.updateApplicantStatus(id, status);
      setWaitlist(ws => ws.map(a => a.id === id ? { ...a, status: status as any } : a));
    } catch {
      Alert.alert('Erreur', 'Impossible de mettre à jour le statut.');
    }
  };

  const handleDeleteApplicant = (id: string) => {
    Alert.alert('Supprimer', 'Retirer ce candidat ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteApplicant(id);
            setWaitlist(ws => ws.filter(a => a.id !== id));
          } catch {
            Alert.alert('Erreur', 'Impossible de supprimer.');
          }
        }
      }
    ]);
  };

  const handleAddApplicant = async () => {
    if (!newApplicant.name.trim() || !newApplicant.phone.trim()) {
      Alert.alert('Erreur', 'Nom et téléphone requis.');
      return;
    }
    setSaving(true);
    try {
      const added = await api.addApplicant({
        unit_id: selectedUnit!.id,
        name:    newApplicant.name.trim(),
        email:   newApplicant.email.trim(),
        phone:   newApplicant.phone.trim(),
        income:  newApplicant.income.trim(),
        message: newApplicant.message.trim(),
      });
      setWaitlist(prev => [...prev, added as Applicant]);
      setNewApplicant(EMPTY_FORM);
      setShowAddApplicant(false);
    } catch {
      Alert.alert('Erreur', 'Impossible d\'ajouter le candidat.');
    } finally {
      setSaving(false);
    }
  };

  const unitWaitlist = selectedUnit ? waitlist.filter(a => a.unit_id === selectedUnit.id) : [];
  const totalLost    = units.reduce((s, u) => s + u.rent_amount, 0);
  const totalDays    = units.reduce((s, u) => s + u.days_vacant, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => selectedUnit ? setSelectedUnit(null) : router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>
          {selectedUnit ? `Candidatures · ${selectedUnit.unit_number}` : 'Mes annonces'}
        </Text>
        {selectedUnit && (
          <TouchableOpacity onPress={() => setShowAddApplicant(true)} style={styles.addBtn}>
            <Ionicons name="person-add-outline" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : !selectedUnit ? (
        /* ── Units list ── */
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadUnits(true)} tintColor={theme.colors.primary} />
          }
        >
          {/* Summary KPIs */}
          <View style={styles.summaryRow}>
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{units.length}</Text>
              <Text style={styles.summaryLabel}>Logements vacants</Text>
            </Card>
            <Card style={styles.summaryCard}>
              <Text style={[styles.summaryValue, { color: theme.colors.error }]}>
                {totalDays}j
              </Text>
              <Text style={styles.summaryLabel}>Jours perdus total</Text>
            </Card>
            <Card style={styles.summaryCard}>
              <Text style={[styles.summaryValue, { color: theme.colors.warning }]}>
                ${totalLost.toLocaleString()}
              </Text>
              <Text style={styles.summaryLabel}>Revenus perdus/mois</Text>
            </Card>
          </View>

          {units.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="home-outline" size={48} color={theme.colors.textTertiary} />
              <Text style={styles.emptyTitle}>Aucun logement vacant</Text>
              <Text style={styles.emptySub}>Tous vos logements sont occupés.</Text>
            </View>
          ) : (
            units.map(unit => {
              const wlCount = 0; // loaded on demand
              return (
                <TouchableOpacity key={unit.id} onPress={() => loadApplicants(unit)} activeOpacity={0.8}>
                  <Card style={styles.unitCard}>
                    <View style={styles.unitTop}>
                      <View style={styles.unitIcon}>
                        <Ionicons name="key-outline" size={22} color={theme.colors.warning} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.unitName}>{unit.unit_number}</Text>
                        <Text style={styles.unitProp}>{unit.property_name}</Text>
                      </View>
                      <View style={[
                        styles.vacantBadge,
                        { backgroundColor: unit.days_vacant > 21 ? theme.colors.error + '20' : theme.colors.warning + '20' },
                      ]}>
                        <Text style={[
                          styles.vacantDays,
                          { color: unit.days_vacant > 21 ? theme.colors.error : theme.colors.warning },
                        ]}>
                          {unit.days_vacant}j vacant
                        </Text>
                      </View>
                    </View>

                    <View style={styles.unitStats}>
                      <Text style={styles.unitRent}>${unit.rent_amount}/mois</Text>
                      {unit.bedrooms > 0 && <Text style={styles.unitDetail}>{unit.bedrooms} ch.</Text>}
                    </View>

                    <View style={styles.unitFooter}>
                      <TouchableOpacity
                        style={styles.listingToggle}
                        onPress={() => handleToggleListing(unit.id)}
                      >
                        <Ionicons
                          name={unit.listing_active ? 'radio-button-on' : 'radio-button-off'}
                          size={14}
                          color={unit.listing_active ? theme.colors.success : theme.colors.textTertiary}
                        />
                        <Text style={[styles.listingText, unit.listing_active && { color: theme.colors.success }]}>
                          {unit.listing_active ? 'Annonce active' : 'Annonce inactive'}
                        </Text>
                      </TouchableOpacity>
                      <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        /* ── Waitlist for selected unit ── */
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Card style={styles.unitSummary}>
            <Text style={styles.unitSummaryName}>{selectedUnit.unit_number} — {selectedUnit.property_name}</Text>
            <Text style={styles.unitSummaryRent}>
              ${selectedUnit.rent_amount}/mois · {selectedUnit.days_vacant} jours vacant
            </Text>
          </Card>

          {listLoading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <>
              <Text style={styles.sectionTitle}>
                {unitWaitlist.length} candidat{unitWaitlist.length !== 1 ? 's' : ''}
              </Text>
              {unitWaitlist.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Ionicons name="person-add-outline" size={40} color={theme.colors.textTertiary} />
                  <Text style={styles.emptySub}>Aucun candidat pour l'instant</Text>
                </View>
              ) : (
                unitWaitlist.map((app, i) => {
                  const sc = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.waiting;
                  return (
                    <Card key={app.id} style={styles.appCard}>
                      <View style={styles.appTop}>
                        <View style={styles.appAvatar}>
                          <Text style={styles.appInitial}>{app.name[0]?.toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.appName}>#{i + 1} {app.name}</Text>
                          <Text style={styles.appDate}>{app.date}{app.income ? ` · ${app.income}` : ''}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                          <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
                        </View>
                      </View>
                      {app.message ? <Text style={styles.appMessage}>"{app.message}"</Text> : null}
                      <View style={styles.appActions}>
                        <TouchableOpacity
                          style={styles.appBtn}
                          onPress={() => handleUpdateStatus(app.id, 'contacted')}
                        >
                          <Ionicons name="call-outline" size={14} color={theme.colors.primary} />
                          <Text style={styles.appBtnText}>{app.phone}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.appBtn, { backgroundColor: theme.colors.success + '15' }]}
                          onPress={() => handleUpdateStatus(app.id, 'contacted')}
                        >
                          <Ionicons name="checkmark-outline" size={14} color={theme.colors.success} />
                          <Text style={[styles.appBtnText, { color: theme.colors.success }]}>Contacté</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteApplicant(app.id)}
                          style={styles.rejectBtn}
                        >
                          <Ionicons name="close-outline" size={18} color={theme.colors.error} />
                        </TouchableOpacity>
                      </View>
                    </Card>
                  );
                })
              )}
            </>
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
                { key: 'name',    label: 'Nom complet *',   placeholder: 'Michael John',        kbd: 'default' },
                { key: 'phone',   label: 'Téléphone *',     placeholder: '514-555-0000',        kbd: 'phone-pad' },
                { key: 'email',   label: 'Courriel',        placeholder: 'michael@email.com',   kbd: 'email-address' },
                { key: 'income',  label: 'Revenu annuel',   placeholder: '45 000$/an',          kbd: 'default' },
                { key: 'message', label: 'Message / notes', placeholder: 'Profil, situation…',  kbd: 'default' },
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
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddApplicant} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>Ajouter à la liste</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary, marginLeft: 4 },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  loadingWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: theme.spacing.md },

  summaryRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  summaryCard: { flex: 1, alignItems: 'center', gap: 4 },
  summaryValue: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary },
  summaryLabel: { fontSize: 10, color: theme.colors.textSecondary, textAlign: 'center' },

  emptyWrap: { alignItems: 'center', paddingVertical: 50, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: theme.colors.textPrimary },
  emptySub:   { fontSize: 14, color: theme.colors.textSecondary },

  unitCard: { marginBottom: theme.spacing.sm },
  unitTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  unitIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: theme.colors.warning + '18', alignItems: 'center', justifyContent: 'center',
  },
  unitName: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  unitProp: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
  vacantBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  vacantDays:  { fontSize: 12, fontWeight: '700' },
  unitStats:   { flexDirection: 'row', gap: 12, marginBottom: 8 },
  unitRent:    { fontSize: 15, fontWeight: '700', color: theme.colors.primary },
  unitDetail:  { fontSize: 13, color: theme.colors.textSecondary },
  unitFooter:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listingToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  listingText:   { fontSize: 12, color: theme.colors.textTertiary },

  unitSummary: { marginBottom: theme.spacing.md, backgroundColor: theme.colors.primaryLight + '60' },
  unitSummaryName: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  unitSummaryRent: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 3 },
  sectionTitle:    { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: theme.spacing.sm },

  appCard:    { marginBottom: theme.spacing.sm },
  appTop:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 6 },
  appAvatar:  { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  appInitial: { fontSize: 16, fontWeight: '700', color: theme.colors.primary },
  appName:    { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary },
  appDate:    { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText:  { fontSize: 11, fontWeight: '600' },
  appMessage:  { fontSize: 13, color: theme.colors.textSecondary, fontStyle: 'italic', marginBottom: 8 },
  appActions:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  appBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.full,
  },
  appBtnText: { fontSize: 12, fontWeight: '500', color: theme.colors.primary },
  rejectBtn:  { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },

  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg, maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary },
  formGroup:  { marginBottom: theme.spacing.md },
  label:      { fontSize: 14, fontWeight: '500', color: theme.colors.textPrimary, marginBottom: 8 },
  input: {
    backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: theme.colors.textPrimary,
  },
  saveBtn: {
    backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md,
    paddingVertical: 14, alignItems: 'center', marginBottom: theme.spacing.lg,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
