import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, theme } from '../src/components';
import { formatCurrency, formatDate } from '../src/utils/format';
import { api } from '../src/services/api';
import { LeaseWithDetails } from '../src/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getLeaseStatus(lease: LeaseWithDetails): 'active' | 'expiring' | 'expired' | 'future' {
  const today = new Date();
  const start = new Date(lease.start_date);
  const end   = new Date(lease.end_date);

  if (end < today) return 'expired';
  if (start > today) return 'future';
  if (lease.days_until_expiry <= 60) return 'expiring';
  return 'active';
}

const STATUS_CONFIG = {
  active:   { label: 'Actif',        color: '#10B981', bg: '#10B98118' },
  expiring: { label: 'Expire bientôt', color: '#F59E0B', bg: '#F59E0B18' },
  expired:  { label: 'Expiré',       color: '#EF4444', bg: '#EF444418' },
  future:   { label: 'À venir',      color: '#6366F1', bg: '#6366F118' },
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function LeasesScreen() {
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [leases, setLeases]             = useState<LeaseWithDetails[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expiring' | 'expired'>('all');

  // Detail modal
  const [selectedLease, setSelectedLease] = useState<LeaseWithDetails | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  // Notes edit
  const [editNotes, setEditNotes]   = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────

  const loadData = async () => {
    try {
      const data = await api.getLeases();
      setLeases(data);
    } catch (err) {
      console.error('Error loading leases:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));
  const onRefresh = () => { setRefreshing(true); loadData(); };

  // ── Filtered ──────────────────────────────────────────────────────────────

  const filtered = leases.filter(l => {
    if (filterStatus === 'all') return true;
    return getLeaseStatus(l) === filterStatus;
  });

  const counts = {
    all:      leases.length,
    active:   leases.filter(l => getLeaseStatus(l) === 'active').length,
    expiring: leases.filter(l => getLeaseStatus(l) === 'expiring').length,
    expired:  leases.filter(l => getLeaseStatus(l) === 'expired').length,
  };

  // ── Detail handlers ───────────────────────────────────────────────────────

  const openDetail = (lease: LeaseWithDetails) => {
    setSelectedLease(lease);
    setEditNotes(lease.notes ?? '');
    setDetailVisible(true);
  };

  const handleSaveNotes = async () => {
    if (!selectedLease) return;
    setSavingNotes(true);
    try {
      await api.updateLease(selectedLease.id, { notes: editNotes });
      // Update local state
      setLeases(prev => prev.map(l => l.id === selectedLease.id ? { ...l, notes: editNotes } : l));
      setSelectedLease(prev => prev ? { ...prev, notes: editNotes } : null);
      Alert.alert('Notes enregistrées');
    } catch {
      Alert.alert('Erreur', 'Impossible d\'enregistrer les notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDeleteLease = (lease: LeaseWithDetails) => {
    Alert.alert(
      'Résilier le bail',
      `Supprimer le bail de ${lease.tenant_name} ?\nCette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteLease(lease.id);
              setDetailVisible(false);
              loadData();
            } catch {
              Alert.alert('Erreur', 'Impossible de supprimer ce bail.');
            }
          },
        },
      ]
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Baux</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterBarContent}>
        {(['all', 'active', 'expiring', 'expired'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterTab, filterStatus === tab && styles.filterTabActive]}
            onPress={() => setFilterStatus(tab)}
          >
            <Text style={[styles.filterTabText, filterStatus === tab && styles.filterTabTextActive]}>
              {tab === 'all' ? 'Tous' : STATUS_CONFIG[tab].label}
              {counts[tab] > 0 ? ` (${counts[tab]})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{counts.active}</Text>
            <Text style={styles.statLabel}>Actifs</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{counts.expiring}</Text>
            <Text style={styles.statLabel}>Expirent bientôt</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{counts.expired}</Text>
            <Text style={styles.statLabel}>Expirés</Text>
          </Card>
        </View>

        {/* Leases list */}
        {filtered.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={32} color={theme.colors.textTertiary} />
            <Text style={styles.emptyTitle}>Aucun bail</Text>
            <Text style={styles.emptyText}>
              {filterStatus === 'all'
                ? 'Créez des baux depuis la gestion des locataires.'
                : `Aucun bail ${STATUS_CONFIG[filterStatus as keyof typeof STATUS_CONFIG]?.label.toLowerCase()}.`}
            </Text>
          </Card>
        ) : (
          filtered.map(lease => {
            const status = getLeaseStatus(lease);
            const cfg    = STATUS_CONFIG[status];
            return (
              <TouchableOpacity key={lease.id} onPress={() => openDetail(lease)}>
                <Card style={styles.leaseCard}>
                  {/* Top row */}
                  <View style={styles.leaseTop}>
                    <View style={styles.tenantAvatarWrap}>
                      <View style={styles.tenantAvatar}>
                        <Text style={styles.tenantAvatarText}>
                          {(lease.tenant_name ?? 'T').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.leaseInfo}>
                      <Text style={styles.tenantName}>{lease.tenant_name}</Text>
                      <Text style={styles.unitInfo}>
                        {lease.property_name} · App {lease.unit_number}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                      <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>

                  {/* Middle row */}
                  <View style={styles.leaseDates}>
                    <View style={styles.dateItem}>
                      <Ionicons name="calendar-outline" size={13} color={theme.colors.textTertiary} />
                      <Text style={styles.dateText}>{formatDate(lease.start_date)}</Text>
                      <Text style={styles.dateSep}>→</Text>
                      <Text style={styles.dateText}>{formatDate(lease.end_date)}</Text>
                    </View>
                    {status === 'expiring' && (
                      <Text style={styles.expiryWarning}>
                        {lease.days_until_expiry}j restants
                      </Text>
                    )}
                  </View>

                  {/* Bottom row */}
                  <View style={styles.leaseBottom}>
                    <Text style={styles.rentAmount}>{formatCurrency(lease.rent_amount)}<Text style={styles.rentPer}>/mois</Text></Text>
                    {lease.security_deposit ? (
                      <Text style={styles.depositText}>Dépôt: {formatCurrency(lease.security_deposit)}</Text>
                    ) : null}
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* ── Detail Modal ────────────────────────────────────────────────── */}
      <Modal visible={detailVisible} animationType="slide" transparent presentationStyle="overFullScreen">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          {selectedLease && (() => {
            const status = getLeaseStatus(selectedLease);
            const cfg    = STATUS_CONFIG[status];
            return (
              <View style={styles.modalSheet}>
                {/* Header */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Détail du bail</Text>
                  <TouchableOpacity onPress={() => setDetailVisible(false)}>
                    <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Status banner */}
                  <View style={[styles.statusBanner, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.statusBannerText, { color: cfg.color }]}>{cfg.label}</Text>
                    {status === 'expiring' && (
                      <Text style={[styles.statusBannerSub, { color: cfg.color }]}>
                        Expire dans {selectedLease.days_until_expiry} jours
                      </Text>
                    )}
                  </View>

                  {/* Info grid */}
                  <Card style={styles.infoCard}>
                    <DetailRow icon="person-outline" label="Locataire" value={selectedLease.tenant_name ?? '-'} />
                    <DetailRow icon="home-outline"   label="Propriété" value={selectedLease.property_name ?? '-'} />
                    <DetailRow icon="business-outline" label="Unité"   value={`App ${selectedLease.unit_number}`} />
                    <DetailRow icon="calendar-outline" label="Début"   value={formatDate(selectedLease.start_date)} />
                    <DetailRow icon="calendar-outline" label="Fin"     value={formatDate(selectedLease.end_date)} last />
                  </Card>

                  <Card style={styles.infoCard}>
                    <DetailRow icon="cash-outline"    label="Loyer mensuel" value={formatCurrency(selectedLease.rent_amount)} />
                    {selectedLease.security_deposit ? (
                      <DetailRow icon="shield-outline" label="Dépôt de garantie" value={formatCurrency(selectedLease.security_deposit)} />
                    ) : null}
                    <DetailRow icon="today-outline"   label="Dû le" value={`${selectedLease.payment_due_day || 1}er du mois`} last />
                  </Card>

                  {/* Notes */}
                  <View style={styles.notesSection}>
                    <Text style={styles.fieldLabel}>Notes</Text>
                    <View style={[styles.inputRow, { minHeight: 80, alignItems: 'flex-start', paddingTop: 12 }]}>
                      <TextInput
                        style={[styles.notesInput, { textAlignVertical: 'top' }]}
                        value={editNotes}
                        onChangeText={setEditNotes}
                        placeholder="Ajouter des notes sur ce bail…"
                        placeholderTextColor={theme.colors.textTertiary}
                        multiline
                      />
                    </View>
                    <TouchableOpacity
                      style={[styles.saveNotesBtn, savingNotes && { opacity: 0.6 }]}
                      onPress={handleSaveNotes}
                      disabled={savingNotes}
                    >
                      {savingNotes ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                      ) : (
                        <Text style={styles.saveNotesBtnText}>Enregistrer les notes</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Delete */}
                  <TouchableOpacity style={styles.deleteLeaseBtn} onPress={() => handleDeleteLease(selectedLease)}>
                    <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                    <Text style={styles.deleteLeaseBtnText}>Résilier le bail</Text>
                  </TouchableOpacity>

                  <View style={{ height: 32 }} />
                </ScrollView>
              </View>
            );
          })()}
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function DetailRow({ icon, label, value, last }: { icon: string; label: string; value: string; last?: boolean }) {
  return (
    <>
      <View style={detailRowStyles.row}>
        <Ionicons name={icon as any} size={16} color={theme.colors.textTertiary} style={detailRowStyles.icon} />
        <Text style={detailRowStyles.label}>{label}</Text>
        <Text style={detailRowStyles.value}>{value}</Text>
      </View>
      {!last && <View style={detailRowStyles.divider} />}
    </>
  );
}

const detailRowStyles = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  icon:    { marginRight: 10, width: 20, textAlign: 'center' },
  label:   { flex: 1, fontSize: 14, color: theme.colors.textSecondary },
  value:   { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary, maxWidth: '55%', textAlign: 'right' },
  divider: { height: 1, backgroundColor: theme.colors.borderLight },
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer:{ flex: 1, justifyContent: 'center', alignItems: 'center' },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight, backgroundColor: theme.colors.surface },
  backBtn:     { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },

  filterBar:        { backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  filterBarContent: { paddingHorizontal: theme.spacing.md, paddingVertical: 10, gap: 8 },
  filterTab:        { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: theme.colors.borderLight },
  filterTabActive:  { backgroundColor: theme.colors.primary },
  filterTabText:    { fontSize: 13, fontWeight: '500', color: theme.colors.textSecondary },
  filterTabTextActive:{ color: '#FFF', fontWeight: '600' },

  scrollContent: { padding: theme.spacing.md },

  statsRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statValue:{ fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary },
  statLabel:{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 2, textAlign: 'center' },

  emptyCard:  { alignItems: 'center', paddingVertical: theme.spacing.xl, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary },
  emptyText:  { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center' },

  leaseCard: { marginBottom: theme.spacing.sm },
  leaseTop:  { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  tenantAvatarWrap: { marginRight: 12 },
  tenantAvatar:     { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  tenantAvatarText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  leaseInfo:  { flex: 1 },
  tenantName: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  unitInfo:   { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  statusBadge:{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600' },

  leaseDates: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  dateItem:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText:   { fontSize: 12, color: theme.colors.textSecondary },
  dateSep:    { fontSize: 12, color: theme.colors.textTertiary, marginHorizontal: 2 },
  expiryWarning: { fontSize: 12, fontWeight: '600', color: '#F59E0B' },

  leaseBottom:{ flexDirection: 'row', alignItems: 'center' },
  rentAmount: { flex: 1, fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  rentPer:    { fontSize: 12, fontWeight: '400', color: theme.colors.textSecondary },
  depositText:{ fontSize: 12, color: theme.colors.textSecondary, marginRight: 8 },

  // Modal
  modalOverlay:{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet:  { backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: theme.spacing.lg, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  modalTitle:  { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },

  statusBanner:    { borderRadius: theme.borderRadius.md, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, alignItems: 'center' },
  statusBannerText:{ fontSize: 15, fontWeight: '700' },
  statusBannerSub: { fontSize: 12, marginTop: 2 },

  infoCard: { marginBottom: 12 },

  notesSection: { marginBottom: 16 },
  fieldLabel:   { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 8 },
  inputRow:     { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.background, paddingHorizontal: 12 },
  notesInput:   { flex: 1, fontSize: 15, color: theme.colors.textPrimary, minHeight: 80 },

  saveNotesBtn:     { marginTop: 8, paddingVertical: 10, alignItems: 'center', borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.primaryLight },
  saveNotesBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.primary },

  deleteLeaseBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.error + '40', marginBottom: 8 },
  deleteLeaseBtnText: { fontSize: 15, fontWeight: '600', color: theme.colors.error },

  bottomSpacing: { height: theme.spacing.xxl },
});
