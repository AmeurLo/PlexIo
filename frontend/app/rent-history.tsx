import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, theme } from '../src/components';
import { formatCurrency, formatDate } from '../src/utils/format';
import { api } from '../src/services/api';
import { RentPayment } from '../src/types';

// ─── Types ──────────────────────────────────────────────────────────────────

interface RentOverviewItem {
  tenant_id: string;
  tenant_name: string;
  unit_number: string;
  property_name: string;
  rent_amount: number;
  payment_due_day: number;
  status: 'paid' | 'late' | 'pending';
  payment_date?: string;
  amount_paid?: number;
  lease_id: string;
}

interface PaymentWithTenant extends RentPayment {
  tenant_name?: string;
  unit_number?: string;
  property_name?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  interac: 'Virement',
  cheque:  'Chèque',
  cash:    'Espèces',
  debit:   'Carte débit',
  other:   'Autre',
  stripe:  'Stripe',
};

const PAYMENT_METHOD_ICONS: Record<string, string> = {
  interac: 'swap-horizontal-outline',
  cheque:  'document-outline',
  cash:    'cash-outline',
  debit:   'card-outline',
  stripe:  'logo-usd',
  other:   'ellipsis-horizontal-outline',
};

const STATUS_CONFIG = {
  paid:    { label: 'Payé',    color: '#10B981', bg: '#10B98118', icon: 'checkmark-circle' },
  late:    { label: 'En retard', color: '#EF4444', bg: '#EF444418', icon: 'alert-circle' },
  pending: { label: 'À venir',  color: '#F59E0B', bg: '#F59E0B18', icon: 'time' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCurrentMonthYear(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(monthYear: string): string {
  if (!monthYear) return '';
  const [year, month] = monthYear.split('-');
  const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  return `${months[parseInt(month) - 1]} ${year}`;
}

function getPrevMonth(monthYear: string): string {
  const [y, m] = monthYear.split('-').map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}

function getNextMonth(monthYear: string): string {
  const [y, m] = monthYear.split('-').map(Number);
  if (m === 12) return `${y + 1}-01`;
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

function isCurrentMonth(monthYear: string): boolean {
  return monthYear === getCurrentMonthYear();
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function RentHistoryScreen() {
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthYear());
  const [overview, setOverview]         = useState<RentOverviewItem[]>([]);
  const [payments, setPayments]         = useState<PaymentWithTenant[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending' | 'late'>('all');

  // ── Load ─────────────────────────────────────────────────────────────────

  const loadData = async () => {
    try {
      const [paymentsData, overviewData] = await Promise.all([
        api.getRentPayments(selectedMonth),
        api.getRentOverview(),
      ]);
      setPayments(paymentsData);
      setOverview(overviewData);
    } catch (err) {
      console.error('Error loading rent history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, [selectedMonth]));
  const onRefresh = () => { setRefreshing(true); loadData(); };

  // ── Stats ────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const totalExpected = overview.reduce((s, o) => s + o.rent_amount, 0);
    const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
    const paidCount   = isCurrentMonth(selectedMonth) ? overview.filter(o => o.status === 'paid').length   : payments.length;
    const lateCount   = overview.filter(o => o.status === 'late').length;
    const pendingCount = overview.filter(o => o.status === 'pending').length;
    const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

    return { totalExpected, totalCollected, paidCount, lateCount, pendingCount, collectionRate };
  }, [overview, payments, selectedMonth]);

  // ── Filtered payments ────────────────────────────────────────────────────

  const filteredPayments = useMemo(() => {
    if (filterStatus === 'all') return payments;
    return payments.filter(p => p.status === filterStatus);
  }, [payments, filterStatus]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleDeletePayment = (payment: PaymentWithTenant) => {
    Alert.alert(
      'Supprimer le paiement',
      `Supprimer ce paiement de ${formatCurrency(payment.amount)} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteRentPayment(payment.id);
              loadData();
            } catch {
              Alert.alert('Erreur', 'Impossible de supprimer ce paiement.');
            }
          },
        },
      ]
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────

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
        <Text style={styles.headerTitle}>Historique des loyers</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Month navigator */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => setSelectedMonth(getPrevMonth(selectedMonth))} style={styles.monthNavBtn}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.monthLabelWrap}>
          <Text style={styles.monthLabel}>{formatMonthLabel(selectedMonth)}</Text>
          {isCurrentMonth(selectedMonth) && (
            <View style={styles.currentMonthBadge}>
              <Text style={styles.currentMonthText}>Ce mois</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => setSelectedMonth(getNextMonth(selectedMonth))} style={styles.monthNavBtn}>
          <Ionicons name="chevron-forward" size={22} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary cards */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={styles.statAmount}>{formatCurrency(stats.totalCollected)}</Text>
            <Text style={styles.statLabel}>Collecté</Text>
            <View style={styles.statBar}>
              <View style={[styles.statBarFill, { width: `${Math.min(stats.collectionRate, 100)}%` as any }]} />
            </View>
            <Text style={styles.statRate}>{stats.collectionRate}%</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statAmount, { color: theme.colors.textSecondary }]}>{formatCurrency(stats.totalExpected)}</Text>
            <Text style={styles.statLabel}>Attendu</Text>
            <View style={styles.statsRow}>
              <View style={styles.miniStat}>
                <Text style={[styles.miniStatVal, { color: '#10B981' }]}>{stats.paidCount}</Text>
                <Text style={styles.miniStatLabel}>Payés</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={[styles.miniStatVal, { color: '#EF4444' }]}>{stats.lateCount}</Text>
                <Text style={styles.miniStatLabel}>Retard</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={[styles.miniStatVal, { color: '#F59E0B' }]}>{stats.pendingCount}</Text>
                <Text style={styles.miniStatLabel}>À venir</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Current month overview (when viewing current month) */}
        {isCurrentMonth(selectedMonth) && overview.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Statut locataires</Text>
            {overview.map(item => {
              const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
              return (
                <Card key={item.tenant_id} style={styles.overviewCard}>
                  <View style={styles.overviewRow}>
                    <View style={styles.overviewAvatar}>
                      <Text style={styles.overviewAvatarText}>
                        {(item.tenant_name ?? 'T').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.overviewInfo}>
                      <Text style={styles.overviewTenant}>{item.tenant_name}</Text>
                      <Text style={styles.overviewUnit}>{item.property_name} · App {item.unit_number}</Text>
                    </View>
                    <View style={styles.overviewRight}>
                      <Text style={styles.overviewRent}>{formatCurrency(item.rent_amount)}</Text>
                      <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                        <Ionicons name={cfg.icon as any} size={11} color={cfg.color} />
                        <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                    </View>
                  </View>
                  {item.payment_date && (
                    <Text style={styles.paymentDateText}>
                      Payé le {formatDate(item.payment_date)}
                      {item.amount_paid && item.amount_paid !== item.rent_amount
                        ? ` — ${formatCurrency(item.amount_paid)}`
                        : ''}
                    </Text>
                  )}
                </Card>
              );
            })}
          </View>
        )}

        {/* Payment transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transactions</Text>
            {/* Filter chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(['all', 'paid', 'late', 'pending'] as const).map(tab => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.filterChip, filterStatus === tab && styles.filterChipActive]}
                  onPress={() => setFilterStatus(tab)}
                >
                  <Text style={[styles.filterChipText, filterStatus === tab && styles.filterChipTextActive]}>
                    {tab === 'all' ? 'Tous' : STATUS_CONFIG[tab].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {filteredPayments.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={32} color={theme.colors.textTertiary} />
              <Text style={styles.emptyTitle}>Aucun paiement</Text>
              <Text style={styles.emptyText}>
                {filterStatus === 'all'
                  ? 'Aucun paiement enregistré pour ce mois.'
                  : `Aucun paiement avec le statut "${STATUS_CONFIG[filterStatus].label}".`}
              </Text>
            </Card>
          ) : (
            filteredPayments.map(payment => {
              const method = payment.payment_method ?? 'other';
              const methodLabel = PAYMENT_METHOD_LABELS[method] ?? method;
              const methodIcon  = PAYMENT_METHOD_ICONS[method]  ?? 'cash-outline';
              const pStatus = (payment.status ?? 'paid') as keyof typeof STATUS_CONFIG;
              const statusCfg = STATUS_CONFIG[pStatus] ?? STATUS_CONFIG.paid;

              return (
                <Card key={payment.id} style={styles.paymentCard}>
                  <View style={styles.paymentRow}>
                    <View style={[styles.methodIcon, { backgroundColor: '#10B98118' }]}>
                      <Ionicons name={methodIcon as any} size={18} color="#10B981" />
                    </View>
                    <View style={styles.paymentInfo}>
                      <Text style={styles.paymentTenant}>
                        {payment.tenant_name ?? `Locataire #${payment.tenant_id?.slice(0, 6)}`}
                      </Text>
                      <Text style={styles.paymentMeta}>
                        {methodLabel} · {formatDate(payment.payment_date)}
                      </Text>
                      {payment.unit_number && (
                        <Text style={styles.paymentUnit}>
                          {payment.property_name ?? ''} App {payment.unit_number}
                        </Text>
                      )}
                    </View>
                    <View style={styles.paymentRight}>
                      <Text style={styles.paymentAmount}>{formatCurrency(payment.amount)}</Text>
                      <View style={[styles.statusPill, { backgroundColor: statusCfg.bg }]}>
                        <Text style={[styles.statusPillText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                      </View>
                    </View>
                  </View>
                  {payment.notes ? (
                    <Text style={styles.paymentNotes}>{payment.notes}</Text>
                  ) : null}
                  <TouchableOpacity
                    style={styles.deletePaymentBtn}
                    onPress={() => handleDeletePayment(payment)}
                  >
                    <Ionicons name="trash-outline" size={14} color={theme.colors.textTertiary} />
                  </TouchableOpacity>
                </Card>
              );
            })
          )}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer:{ flex: 1, justifyContent: 'center', alignItems: 'center' },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight, backgroundColor: theme.colors.surface },
  backBtn:     { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.textPrimary },

  monthNav:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.md, paddingVertical: 12, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  monthNavBtn:    { padding: 4 },
  monthLabelWrap: { alignItems: 'center', gap: 4 },
  monthLabel:     { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary },
  currentMonthBadge: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 12, backgroundColor: theme.colors.primary + '18' },
  currentMonthText:  { fontSize: 11, fontWeight: '600', color: theme.colors.primary },

  scrollContent: { padding: theme.spacing.md },

  statsGrid: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  statCard:  { flex: 1, paddingVertical: 14 },
  statAmount:{ fontSize: 20, fontWeight: '800', color: theme.colors.primary, marginBottom: 4 },
  statLabel: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 8 },
  statBar:   { height: 4, backgroundColor: theme.colors.borderLight, borderRadius: 2, marginBottom: 4, overflow: 'hidden' },
  statBarFill:{ height: '100%', backgroundColor: theme.colors.primary, borderRadius: 2 },
  statRate:  { fontSize: 11, color: theme.colors.textTertiary },
  statsRow:  { flexDirection: 'row', justifyContent: 'space-around', marginTop: 4 },
  miniStat:  { alignItems: 'center' },
  miniStatVal:{ fontSize: 16, fontWeight: '700' },
  miniStatLabel:{ fontSize: 10, color: theme.colors.textTertiary },

  section:      { marginBottom: theme.spacing.lg },
  sectionHeader:{ marginBottom: theme.spacing.sm },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },

  overviewCard: { marginBottom: theme.spacing.sm },
  overviewRow:  { flexDirection: 'row', alignItems: 'center' },
  overviewAvatar:    { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  overviewAvatarText:{ fontSize: 13, fontWeight: '700', color: '#FFF' },
  overviewInfo: { flex: 1 },
  overviewTenant:{ fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  overviewUnit:  { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
  overviewRight: { alignItems: 'flex-end', gap: 4 },
  overviewRent:  { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary },
  statusPill:    { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusPillText:{ fontSize: 11, fontWeight: '600' },
  paymentDateText:{ fontSize: 12, color: theme.colors.textTertiary, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.borderLight },

  filterChip:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: theme.colors.borderLight, marginRight: 6 },
  filterChipActive:   { backgroundColor: theme.colors.primary },
  filterChipText:     { fontSize: 12, color: theme.colors.textSecondary },
  filterChipTextActive:{ color: '#FFF', fontWeight: '600' },

  emptyCard:  { alignItems: 'center', paddingVertical: theme.spacing.xl, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary },
  emptyText:  { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center' },

  paymentCard:     { marginBottom: theme.spacing.sm, position: 'relative' },
  paymentRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  methodIcon:      { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  paymentInfo:     { flex: 1 },
  paymentTenant:   { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  paymentMeta:     { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  paymentUnit:     { fontSize: 11, color: theme.colors.textTertiary, marginTop: 1 },
  paymentRight:    { alignItems: 'flex-end', gap: 4 },
  paymentAmount:   { fontSize: 15, fontWeight: '700', color: '#10B981' },
  paymentNotes:    { fontSize: 12, color: theme.colors.textSecondary, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.borderLight },
  deletePaymentBtn:{ position: 'absolute', top: 8, right: 8, padding: 4 },

  bottomSpacing: { height: theme.spacing.xxl },
});
