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
import { Card, theme, StatusBadge } from '../../src/components';
import { api } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { DashboardStats, RentOverview, MaintenanceRequestWithDetails, Reminder } from '../../src/types';
import { formatCurrency, formatDate, getRentStatusConfig, getPriorityConfig, getMaintenanceStatusConfig } from '../../src/utils/format';

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [rentOverview, setRentOverview] = useState<RentOverview[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRequestWithDetails[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const loadData = async () => {
    try {
      const [dashboardData, rentData, maintenanceData, remindersData] = await Promise.all([
        api.getDashboard(),
        api.getRentOverview(),
        api.getMaintenanceRequests(),
        api.getReminders(),
      ]);
      setStats(dashboardData);
      setRentOverview(rentData);
      setMaintenance(maintenanceData.filter(m => m.status === 'open' || m.status === 'in_progress').slice(0, 3));
      setReminders(remindersData.slice(0, 3));
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
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
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
  const pendingRents = rentOverview.filter(r => r.status === 'pending');

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
            <Text style={styles.userName}>{user?.full_name || 'Landlord'}</Text>
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <Ionicons name="person-circle" size={44} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Ionicons name="home" size={24} color={theme.colors.primary} />
            <Text style={styles.statValue}>{stats?.total_properties || 0}</Text>
            <Text style={styles.statLabel}>Properties</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="key" size={24} color={theme.colors.accent} />
            <Text style={styles.statValue}>{stats?.total_units || 0}</Text>
            <Text style={styles.statLabel}>Units</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
            <Text style={styles.statValue}>{stats?.occupancy_rate || 0}%</Text>
            <Text style={styles.statLabel}>Occupied</Text>
          </Card>
        </View>

        {/* Rent Collection Card */}
        <Card style={styles.rentCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Rent Collection</Text>
            <Text style={styles.currentMonth}>{stats?.current_month}</Text>
          </View>
          <View style={styles.rentStats}>
            <View style={styles.rentStatItem}>
              <Text style={styles.rentAmount}>{formatCurrency(stats?.total_rent_collected || 0)}</Text>
              <Text style={styles.rentSubtext}>Collected</Text>
            </View>
            <View style={styles.rentDivider} />
            <View style={styles.rentStatItem}>
              <Text style={styles.rentAmount}>{formatCurrency(stats?.total_rent_expected || 0)}</Text>
              <Text style={styles.rentSubtext}>Expected</Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${stats?.collection_rate || 0}%` }]} />
          </View>
          <Text style={styles.collectionRate}>{stats?.collection_rate || 0}% collected</Text>
        </Card>

        {/* Alerts Section */}
        {(lateRents.length > 0 || stats?.open_maintenance || stats?.leases_expiring_soon) && (
          <View style={styles.alertsSection}>
            <Text style={styles.sectionTitle}>Needs Attention</Text>
            <View style={styles.alertsGrid}>
              {lateRents.length > 0 && (
                <TouchableOpacity style={[styles.alertCard, styles.alertError]} onPress={() => router.push('/(tabs)/tenants')}>
                  <Ionicons name="alert-circle" size={24} color={theme.colors.error} />
                  <Text style={styles.alertCount}>{lateRents.length}</Text>
                  <Text style={styles.alertLabel}>Late Rent</Text>
                </TouchableOpacity>
              )}
              {(stats?.open_maintenance || 0) > 0 && (
                <TouchableOpacity style={[styles.alertCard, styles.alertWarning]} onPress={() => router.push('/(tabs)/maintenance')}>
                  <Ionicons name="construct" size={24} color={theme.colors.warning} />
                  <Text style={styles.alertCount}>{stats?.open_maintenance}</Text>
                  <Text style={styles.alertLabel}>Open Issues</Text>
                </TouchableOpacity>
              )}
              {(stats?.leases_expiring_soon || 0) > 0 && (
                <TouchableOpacity style={[styles.alertCard, styles.alertInfo]}>
                  <Ionicons name="document-text" size={24} color={theme.colors.info} />
                  <Text style={styles.alertCount}>{stats?.leases_expiring_soon}</Text>
                  <Text style={styles.alertLabel}>Expiring Leases</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Rent Status List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Rent Status</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/tenants')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {rentOverview.slice(0, 4).map((item) => {
            const statusConfig = getRentStatusConfig(item.status);
            return (
              <Card key={item.tenant_id} style={styles.rentItem}>
                <View style={styles.rentItemLeft}>
                  <Text style={styles.tenantName}>{item.tenant_name}</Text>
                  <Text style={styles.propertyInfo}>{item.property_name} - Unit {item.unit_number}</Text>
                </View>
                <View style={styles.rentItemRight}>
                  <Text style={styles.rentItemAmount}>{formatCurrency(item.rent_amount)}</Text>
                  <StatusBadge
                    label={statusConfig.label}
                    color={statusConfig.color}
                    bgColor={statusConfig.bgColor}
                    size="small"
                  />
                </View>
              </Card>
            );
          })}
        </View>

        {/* Maintenance Section */}
        {maintenance.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Open Maintenance</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/maintenance')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            {maintenance.map((item) => {
              const priorityConfig = getPriorityConfig(item.priority);
              const statusConfig = getMaintenanceStatusConfig(item.status);
              return (
                <Card key={item.id} style={styles.maintenanceItem}>
                  <View style={styles.maintenanceHeader}>
                    <Text style={styles.maintenanceTitle} numberOfLines={1}>{item.title}</Text>
                    <StatusBadge
                      label={priorityConfig.label}
                      color={priorityConfig.color}
                      bgColor={priorityConfig.bgColor}
                      size="small"
                    />
                  </View>
                  <Text style={styles.maintenanceLocation}>
                    {item.property_name}{item.unit_number ? ` - Unit ${item.unit_number}` : ''}
                  </Text>
                </Card>
              );
            })}
          </View>
        )}

        {/* Reminders Section */}
        {reminders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Reminders</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/more')}>
                <Text style={styles.seeAll}>See All</Text>
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

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  greeting: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  profileButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  rentCard: {
    marginBottom: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  currentMonth: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  rentStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  rentStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  rentDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
  },
  rentAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  rentSubtext: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.success,
    borderRadius: 4,
  },
  collectionRate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  alertsSection: {
    marginBottom: theme.spacing.md,
  },
  alertsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  alertCard: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  alertError: {
    backgroundColor: theme.colors.errorLight,
  },
  alertWarning: {
    backgroundColor: theme.colors.warningLight,
  },
  alertInfo: {
    backgroundColor: theme.colors.infoLight,
  },
  alertCount: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.xs,
  },
  alertLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  seeAll: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  rentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  rentItemLeft: {
    flex: 1,
  },
  tenantName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  propertyInfo: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  rentItemRight: {
    alignItems: 'flex-end',
  },
  rentItemAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  maintenanceItem: {
    marginBottom: theme.spacing.sm,
  },
  maintenanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  maintenanceTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  maintenanceLocation: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  reminderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  reminderDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  bottomSpacing: {
    height: theme.spacing.xl,
  },
});
