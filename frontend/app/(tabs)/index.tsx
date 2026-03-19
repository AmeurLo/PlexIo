import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, theme, DomelyAI } from '../../src/components';
import { api } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { DashboardStats, RentOverview, Reminder, PropertyWithStats } from '../../src/types';
import { formatCurrency, formatDate } from '../../src/utils/format';
import { useTranslation } from '../../src/i18n/useTranslation';

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [rentOverview, setRentOverview] = useState<RentOverview[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [properties, setProperties] = useState<PropertyWithStats[]>([]);

  const loadData = async () => {
    try {
      const [dashboardData, rentData, remindersData, propertiesData] = await Promise.all([
        api.getDashboard(),
        api.getRentOverview(),
        api.getReminders(),
        api.getProperties(),
      ]);
      setStats(dashboardData);
      setRentOverview(rentData);
      setReminders(remindersData.slice(0, 3));
      setProperties(propertiesData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('goodMorning') as string;
    if (hour < 17) return t('goodAfternoon') as string;
    return t('goodEvening') as string;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const lateRents = rentOverview.filter(r => r.status === 'late');
  const totalAlerts = lateRents.length + (stats?.open_maintenance || 0) + (stats?.leases_expiring_soon || 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{user?.full_name || (t('landlord') as string)}</Text>
          </View>
          <View style={styles.headerActions}>
            <DomelyAI context="home" />
            <TouchableOpacity style={styles.bellBtn} onPress={() => router.push('/notifications')}>
              <Ionicons name="notifications-outline" size={22} color={theme.colors.textPrimary} />
              {totalAlerts > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{totalAlerts > 9 ? '9+' : totalAlerts}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileButton}>
              <Ionicons name="person-circle" size={44} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Ionicons name="home" size={24} color={theme.colors.primary} />
            <Text style={styles.statValue}>{stats?.total_properties || 0}</Text>
            <Text style={styles.statLabel}>{t('properties') as string}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="key" size={24} color={theme.colors.accent} />
            <Text style={styles.statValue}>{stats?.total_units || 0}</Text>
            <Text style={styles.statLabel}>{t('units') as string}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
            <Text style={styles.statValue}>{stats?.occupancy_rate || 0}%</Text>
            <Text style={styles.statLabel}>{t('occupied') as string}</Text>
          </Card>
        </View>

        {/* Rent Collection Card */}
        <Card style={styles.rentCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{t('rentCollection') as string}</Text>
            <Text style={styles.currentMonth}>{stats?.current_month}</Text>
          </View>
          <View style={styles.rentStats}>
            <View style={styles.rentStatItem}>
              <Text style={styles.rentAmount}>{formatCurrency(stats?.total_rent_collected || 0)}</Text>
              <Text style={styles.rentSubtext}>{t('collected') as string}</Text>
            </View>
            <View style={styles.rentDivider} />
            <View style={styles.rentStatItem}>
              <Text style={styles.rentAmount}>{formatCurrency(stats?.total_rent_expected || 0)}</Text>
              <Text style={styles.rentSubtext}>{t('expected') as string}</Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${stats?.collection_rate || 0}%` }]} />
          </View>
          <Text style={styles.collectionRate}>
            {(t('collectedRate') as Function)(stats?.collection_rate || 0)}
          </Text>
        </Card>

        {/* Financial Performance Card */}
        {properties.length > 0 && (() => {
          const totalExpenses = properties.reduce((s, p) => s + (p.total_expenses ?? 0), 0);
          const totalNetFlow = properties.reduce((s, p) => s + (p.net_cash_flow ?? 0), 0);
          const netPositive = totalNetFlow >= 0;
          const netColor = netPositive ? theme.colors.success : theme.colors.error;
          return (
            <Card style={styles.perfCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{t('performance') as string}</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/properties')}>
                  <Text style={styles.seeAll}>{t('details') as string}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.perfRow}>
                <View style={styles.perfItem}>
                  <Ionicons name="receipt-outline" size={18} color={theme.colors.warning} />
                  <Text style={styles.perfValue}>{formatCurrency(totalExpenses)}</Text>
                  <Text style={styles.perfLabel}>{t('expenses') as string}</Text>
                </View>
                <View style={styles.perfDivider} />
                <View style={styles.perfItem}>
                  <Ionicons name={netPositive ? 'trending-up' : 'trending-down'} size={18} color={netColor} />
                  <Text style={[styles.perfValue, { color: netColor }]}>
                    {netPositive ? '' : '\u2013'}{formatCurrency(Math.abs(totalNetFlow))}
                  </Text>
                  <Text style={styles.perfLabel}>{t('netCashFlow') as string}</Text>
                </View>
              </View>
            </Card>
          );
        })()}

        {/* Alerts Section */}
        {(lateRents.length > 0 || stats?.open_maintenance || stats?.leases_expiring_soon) && (
          <View style={styles.alertsSection}>
            <Text style={styles.sectionTitle}>{t('needsAttention') as string}</Text>
            <View style={styles.alertsGrid}>
              {lateRents.length > 0 && (
                <TouchableOpacity style={[styles.alertCard, styles.alertError]} onPress={() => router.push('/(tabs)/tenants')}>
                  <Ionicons name="alert-circle" size={24} color={theme.colors.error} />
                  <Text style={styles.alertCount}>{lateRents.length}</Text>
                  <Text style={styles.alertLabel}>{t('lateRent') as string}</Text>
                </TouchableOpacity>
              )}
              {(stats?.open_maintenance || 0) > 0 && (
                <TouchableOpacity style={[styles.alertCard, styles.alertWarning]} onPress={() => router.push('/(tabs)/maintenance')}>
                  <Ionicons name="construct" size={24} color={theme.colors.warning} />
                  <Text style={styles.alertCount}>{stats?.open_maintenance}</Text>
                  <Text style={styles.alertLabel}>{t('openIssues') as string}</Text>
                </TouchableOpacity>
              )}
              {(stats?.leases_expiring_soon || 0) > 0 && (
                <TouchableOpacity style={[styles.alertCard, styles.alertInfo]} onPress={() => router.push('/(tabs)/more')}>
                  <Ionicons name="document-text" size={24} color={theme.colors.info} />
                  <Text style={styles.alertCount}>{stats?.leases_expiring_soon}</Text>
                  <Text style={styles.alertLabel}>{t('expiringLeases') as string}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Reminders Section */}
        {reminders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('reminders') as string}</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/more')}>
                <Text style={styles.seeAll}>{t('seeAll') as string}</Text>
              </TouchableOpacity>
            </View>
            {reminders.map((item) => (
              <Card key={item.id} style={styles.reminderItem}>
                <View style={styles.reminderIcon}>
                  <Ionicons name="notifications" size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.reminderContent}>
                  <Text style={styles.reminderTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.reminderDate}>{formatDate(item.due_date)}</Text>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* TAL Compliance */}
        <Card style={styles.talCard}>
          <View style={styles.talHeader}>
            <Ionicons name="shield-checkmark-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.talTitle}>Conformité TAL · 2025</Text>
          </View>
          <View style={styles.talRow}>
            <View style={styles.talItem}>
              <Text style={styles.talValue}>2,8 %</Text>
              <Text style={styles.talLabel}>IPC Québec{'\n'}(max. hausse)</Text>
            </View>
            <View style={styles.talDivider} />
            <View style={styles.talItem}>
              <Text style={styles.talValue}>90 j</Text>
              <Text style={styles.talLabel}>Avis{'\n'}non-renouvellement</Text>
            </View>
            <View style={styles.talDivider} />
            <View style={styles.talItem}>
              <Text style={styles.talValue}>3 mois</Text>
              <Text style={styles.talLabel}>Avis de{'\n'}hausse de loyer</Text>
            </View>
          </View>
          <Text style={styles.talNote}>
            Hausse max. recommandée 2025 : 2,8 % (IPC Québec). Toute hausse doit être notifiée au moins 3 mois avant le renouvellement du bail.
          </Text>
        </Card>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: theme.spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  greeting: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 4 },
  userName: { fontSize: 24, fontWeight: '700', color: theme.colors.textPrimary },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bellBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  bellBadge: { position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8, backgroundColor: theme.colors.error, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: theme.colors.background },
  bellBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  profileButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  statsGrid: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: theme.spacing.md },
  statValue: { fontSize: 24, fontWeight: '700', color: theme.colors.textPrimary, marginTop: theme.spacing.sm },
  statLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  rentCard: { marginBottom: theme.spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  cardTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.textPrimary },
  currentMonth: { fontSize: 14, color: theme.colors.textSecondary },
  rentStats: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  rentStatItem: { flex: 1, alignItems: 'center' },
  rentDivider: { width: 1, height: 40, backgroundColor: theme.colors.border },
  rentAmount: { fontSize: 22, fontWeight: '700', color: theme.colors.textPrimary },
  rentSubtext: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  progressBar: { height: 8, backgroundColor: theme.colors.borderLight, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: theme.colors.success, borderRadius: 4 },
  collectionRate: { fontSize: 12, color: theme.colors.textSecondary, marginTop: theme.spacing.sm, textAlign: 'center' },
  perfCard: { marginBottom: theme.spacing.md },
  perfRow: { flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.sm },
  perfItem: { flex: 1, alignItems: 'center', gap: 4 },
  perfDivider: { width: 1, height: 40, backgroundColor: theme.colors.border },
  perfValue: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary },
  perfLabel: { fontSize: 11, color: theme.colors.textSecondary },
  alertsSection: { marginBottom: theme.spacing.md },
  alertsGrid: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  alertCard: { flex: 1, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, alignItems: 'center' },
  alertError: { backgroundColor: theme.colors.errorLight },
  alertWarning: { backgroundColor: theme.colors.warningLight },
  alertInfo: { backgroundColor: theme.colors.infoLight },
  alertCount: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary, marginTop: theme.spacing.xs },
  alertLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  section: { marginBottom: theme.spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.textPrimary },
  seeAll: { fontSize: 14, color: theme.colors.primary, fontWeight: '500' },
  reminderItem: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
  reminderIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.md },
  reminderContent: { flex: 1 },
  reminderTitle: { fontSize: 14, fontWeight: '500', color: theme.colors.textPrimary },
  reminderDate: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  bottomSpacing: { height: theme.spacing.xl },

  talCard: { marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.primaryLight },
  talHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: theme.spacing.sm },
  talTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  talRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
  talItem: { flex: 1, alignItems: 'center' },
  talValue: { fontSize: 20, fontWeight: '800', color: theme.colors.primary },
  talLabel: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 2, textAlign: 'center', lineHeight: 14 },
  talDivider: { width: 1, height: 40, backgroundColor: theme.colors.border },
  talNote: { fontSize: 11, color: theme.colors.textSecondary, lineHeight: 16, fontStyle: 'italic' },
});
