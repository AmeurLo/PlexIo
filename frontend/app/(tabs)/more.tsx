import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, theme } from '../../src/components';
import { api } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { Reminder, LeaseWithDetails, DashboardStats } from '../../src/types';
import { formatDate, formatCurrency } from '../../src/utils/format';

export default function MoreScreen() {
  const { user, logout } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [leases, setLeases] = useState<LeaseWithDetails[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const loadData = async () => {
    try {
      const [remindersData, leasesData, statsData] = await Promise.all([
        api.getReminders(),
        api.getLeases(),
        api.getDashboard(),
      ]);
      setReminders(remindersData);
      setLeases(leasesData.filter(l => l.days_until_expiry <= 60 && l.days_until_expiry >= 0));
      setStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
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

  const handleCompleteReminder = async (id: string) => {
    try {
      await api.completeReminder(id);
      loadData();
    } catch (error) {
      console.error('Error completing reminder:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>More</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={32} color={theme.colors.primary} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.full_name}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>
          </View>
        </Card>

        {/* Financial Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Overview</Text>
          <Card style={styles.financialCard}>
            <View style={styles.financialRow}>
              <View style={styles.financialItem}>
                <Text style={styles.financialLabel}>Monthly Expected</Text>
                <Text style={styles.financialValue}>{formatCurrency(stats?.total_rent_expected || 0)}</Text>
              </View>
              <View style={styles.financialDivider} />
              <View style={styles.financialItem}>
                <Text style={styles.financialLabel}>Collected</Text>
                <Text style={[styles.financialValue, styles.successValue]}>
                  {formatCurrency(stats?.total_rent_collected || 0)}
                </Text>
              </View>
            </View>
            <View style={styles.financialRow}>
              <View style={styles.financialItem}>
                <Text style={styles.financialLabel}>Collection Rate</Text>
                <Text style={styles.financialValue}>{stats?.collection_rate || 0}%</Text>
              </View>
              <View style={styles.financialDivider} />
              <View style={styles.financialItem}>
                <Text style={styles.financialLabel}>Occupancy</Text>
                <Text style={styles.financialValue}>{stats?.occupancy_rate || 0}%</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Expiring Leases */}
        {leases.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Expiring Leases (60 days)</Text>
            {leases.map((lease) => (
              <Card key={lease.id} style={styles.leaseCard}>
                <View style={styles.leaseHeader}>
                  <View>
                    <Text style={styles.leaseTenant}>{lease.tenant_name}</Text>
                    <Text style={styles.leaseProperty}>
                      {lease.property_name} - Unit {lease.unit_number}
                    </Text>
                  </View>
                  <View style={styles.leaseExpiry}>
                    <Text style={[
                      styles.leaseExpiryDays,
                      lease.days_until_expiry <= 30 && styles.urgentText
                    ]}>
                      {lease.days_until_expiry}
                    </Text>
                    <Text style={styles.leaseExpiryLabel}>days</Text>
                  </View>
                </View>
                <View style={styles.leaseDates}>
                  <Text style={styles.leaseDateText}>Ends: {formatDate(lease.end_date)}</Text>
                  <Text style={styles.leaseRent}>{formatCurrency(lease.rent_amount)}/mo</Text>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Reminders */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reminders</Text>
          {reminders.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
              <Text style={styles.emptyText}>No pending reminders</Text>
            </Card>
          ) : (
            reminders.map((reminder) => (
              <Card key={reminder.id} style={styles.reminderCard}>
                <TouchableOpacity
                  style={styles.reminderCheckbox}
                  onPress={() => handleCompleteReminder(reminder.id)}
                >
                  <View style={styles.checkbox}>
                    <Ionicons name="checkmark" size={14} color="transparent" />
                  </View>
                </TouchableOpacity>
                <View style={styles.reminderContent}>
                  <Text style={styles.reminderTitle}>{reminder.title}</Text>
                  {reminder.description && (
                    <Text style={styles.reminderDescription} numberOfLines={2}>
                      {reminder.description}
                    </Text>
                  )}
                  <Text style={styles.reminderDate}>{formatDate(reminder.due_date)}</Text>
                </View>
              </Card>
            ))
          )}
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <Card style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuIcon}>
                <Ionicons name="notifications-outline" size={20} color={theme.colors.textSecondary} />
              </View>
              <Text style={styles.menuText}>Notifications</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuIcon}>
                <Ionicons name="document-text-outline" size={20} color={theme.colors.textSecondary} />
              </View>
              <Text style={styles.menuText}>Export Reports</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuIcon}>
                <Ionicons name="help-circle-outline" size={20} color={theme.colors.textSecondary} />
              </View>
              <Text style={styles.menuText}>Help & Support</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          </Card>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Landlord OS v1.0.0</Text>

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
  header: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  profileCard: {
    marginBottom: theme.spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  profileEmail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  financialCard: {
    padding: theme.spacing.md,
  },
  financialRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  financialItem: {
    flex: 1,
    alignItems: 'center',
  },
  financialDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
  },
  financialLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  financialValue: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  successValue: {
    color: theme.colors.success,
  },
  leaseCard: {
    marginBottom: theme.spacing.sm,
  },
  leaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leaseTenant: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  leaseProperty: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  leaseExpiry: {
    alignItems: 'center',
    backgroundColor: theme.colors.warningLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
  },
  leaseExpiryDays: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.warning,
  },
  urgentText: {
    color: theme.colors.error,
  },
  leaseExpiryLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  leaseDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  leaseDateText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  leaseRent: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.lg,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  reminderCheckbox: {
    padding: 4,
    marginRight: theme.spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  reminderDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  reminderDate: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 4,
  },
  menuCard: {
    padding: 0,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  menuIcon: {
    width: 32,
    alignItems: 'center',
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing.sm,
  },
  menuDivider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginLeft: 56,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.error,
  },
  version: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
  bottomSpacing: {
    height: theme.spacing.xxl,
  },
});
