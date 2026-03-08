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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button, theme, StatusBadge, EmptyState } from '../../src/components';
import { api } from '../../src/services/api';
import { TenantWithDetails, RentOverview } from '../../src/types';
import { formatCurrency, formatPhone, getRentStatusConfig, formatDate, getCurrentMonthYear, getTodayISO } from '../../src/utils/format';

export default function TenantsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tenants, setTenants] = useState<TenantWithDetails[]>([]);
  const [rentOverview, setRentOverview] = useState<RentOverview[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<TenantWithDetails | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');

  const loadData = async () => {
    try {
      const [tenantsData, rentData] = await Promise.all([
        api.getTenants(),
        api.getRentOverview(),
      ]);
      setTenants(tenantsData);
      setRentOverview(rentData);
    } catch (error) {
      console.error('Error loading tenants:', error);
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

  const getTenantRentInfo = (tenantId: string) => {
    return rentOverview.find(r => r.tenant_id === tenantId);
  };

  const handleRecordPayment = (tenant: TenantWithDetails) => {
    const rentInfo = getTenantRentInfo(tenant.id);
    if (rentInfo) {
      setSelectedTenant(tenant);
      setPaymentAmount(rentInfo.rent_amount.toString());
      setShowPaymentModal(true);
    }
  };

  const submitPayment = async () => {
    if (!selectedTenant) return;
    
    const rentInfo = getTenantRentInfo(selectedTenant.id);
    if (!rentInfo) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setProcessingPayment(true);
    try {
      await api.createRentPayment({
        lease_id: rentInfo.lease_id,
        tenant_id: selectedTenant.id,
        unit_id: selectedTenant.unit_id || '',
        amount,
        payment_date: getTodayISO(),
        payment_method: 'etransfer',
        month_year: getCurrentMonthYear(),
      });
      setShowPaymentModal(false);
      setSelectedTenant(null);
      loadData();
      Alert.alert('Success', 'Payment recorded successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to record payment');
    } finally {
      setProcessingPayment(false);
    }
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

  const paidTenants = tenants.filter(t => t.rent_status === 'paid');
  const lateTenants = tenants.filter(t => t.rent_status === 'late');
  const pendingTenants = tenants.filter(t => t.rent_status === 'pending');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Tenants</Text>
        <View style={styles.headerStats}>
          <View style={styles.headerStat}>
            <Text style={styles.headerStatValue}>{tenants.length}</Text>
            <Text style={styles.headerStatLabel}>Total</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {tenants.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No Tenants Yet"
            description="Add properties and units, then assign tenants"
          />
        ) : (
          <>
            {/* Late Section */}
            {lateTenants.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <View style={[styles.statusDot, styles.lateDot]} />
                    <Text style={styles.sectionTitle}>Late ({lateTenants.length})</Text>
                  </View>
                </View>
                {lateTenants.map((tenant) => {
                  const rentInfo = getTenantRentInfo(tenant.id);
                  const statusConfig = getRentStatusConfig('late');
                  return (
                    <Card key={tenant.id} style={styles.tenantCard}>
                      <View style={styles.tenantHeader}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>
                            {tenant.first_name[0]}{tenant.last_name[0]}
                          </Text>
                        </View>
                        <View style={styles.tenantInfo}>
                          <Text style={styles.tenantName}>
                            {tenant.first_name} {tenant.last_name}
                          </Text>
                          <Text style={styles.tenantProperty}>
                            {tenant.property_name} - Unit {tenant.unit_number}
                          </Text>
                        </View>
                        <StatusBadge
                          label={statusConfig.label}
                          color={statusConfig.color}
                          bgColor={statusConfig.bgColor}
                        />
                      </View>
                      
                      <View style={styles.tenantDetails}>
                        {tenant.phone && (
                          <TouchableOpacity style={styles.contactRow}>
                            <Ionicons name="call-outline" size={16} color={theme.colors.textSecondary} />
                            <Text style={styles.contactText}>{formatPhone(tenant.phone)}</Text>
                          </TouchableOpacity>
                        )}
                        <View style={styles.rentRow}>
                          <Text style={styles.rentLabel}>Rent Due:</Text>
                          <Text style={styles.rentValue}>{formatCurrency(rentInfo?.rent_amount || 0)}</Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.recordPaymentButton}
                        onPress={() => handleRecordPayment(tenant)}
                      >
                        <Ionicons name="card-outline" size={18} color={theme.colors.primary} />
                        <Text style={styles.recordPaymentText}>Record Payment</Text>
                      </TouchableOpacity>
                    </Card>
                  );
                })}
              </View>
            )}

            {/* Pending Section */}
            {pendingTenants.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <View style={[styles.statusDot, styles.pendingDot]} />
                    <Text style={styles.sectionTitle}>Pending ({pendingTenants.length})</Text>
                  </View>
                </View>
                {pendingTenants.map((tenant) => {
                  const rentInfo = getTenantRentInfo(tenant.id);
                  const statusConfig = getRentStatusConfig('pending');
                  return (
                    <Card key={tenant.id} style={styles.tenantCard}>
                      <View style={styles.tenantHeader}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>
                            {tenant.first_name[0]}{tenant.last_name[0]}
                          </Text>
                        </View>
                        <View style={styles.tenantInfo}>
                          <Text style={styles.tenantName}>
                            {tenant.first_name} {tenant.last_name}
                          </Text>
                          <Text style={styles.tenantProperty}>
                            {tenant.property_name} - Unit {tenant.unit_number}
                          </Text>
                        </View>
                        <StatusBadge
                          label={statusConfig.label}
                          color={statusConfig.color}
                          bgColor={statusConfig.bgColor}
                        />
                      </View>
                      
                      <View style={styles.tenantDetails}>
                        {tenant.phone && (
                          <TouchableOpacity style={styles.contactRow}>
                            <Ionicons name="call-outline" size={16} color={theme.colors.textSecondary} />
                            <Text style={styles.contactText}>{formatPhone(tenant.phone)}</Text>
                          </TouchableOpacity>
                        )}
                        <View style={styles.rentRow}>
                          <Text style={styles.rentLabel}>Rent Due:</Text>
                          <Text style={styles.rentValue}>{formatCurrency(rentInfo?.rent_amount || 0)}</Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.recordPaymentButton}
                        onPress={() => handleRecordPayment(tenant)}
                      >
                        <Ionicons name="card-outline" size={18} color={theme.colors.primary} />
                        <Text style={styles.recordPaymentText}>Record Payment</Text>
                      </TouchableOpacity>
                    </Card>
                  );
                })}
              </View>
            )}

            {/* Paid Section */}
            {paidTenants.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <View style={[styles.statusDot, styles.paidDot]} />
                    <Text style={styles.sectionTitle}>Paid ({paidTenants.length})</Text>
                  </View>
                </View>
                {paidTenants.map((tenant) => {
                  const rentInfo = getTenantRentInfo(tenant.id);
                  const statusConfig = getRentStatusConfig('paid');
                  return (
                    <Card key={tenant.id} style={styles.tenantCard}>
                      <View style={styles.tenantHeader}>
                        <View style={[styles.avatar, styles.paidAvatar]}>
                          <Text style={styles.avatarText}>
                            {tenant.first_name[0]}{tenant.last_name[0]}
                          </Text>
                        </View>
                        <View style={styles.tenantInfo}>
                          <Text style={styles.tenantName}>
                            {tenant.first_name} {tenant.last_name}
                          </Text>
                          <Text style={styles.tenantProperty}>
                            {tenant.property_name} - Unit {tenant.unit_number}
                          </Text>
                        </View>
                        <StatusBadge
                          label={statusConfig.label}
                          color={statusConfig.color}
                          bgColor={statusConfig.bgColor}
                        />
                      </View>
                      
                      <View style={styles.tenantDetails}>
                        {tenant.phone && (
                          <TouchableOpacity style={styles.contactRow}>
                            <Ionicons name="call-outline" size={16} color={theme.colors.textSecondary} />
                            <Text style={styles.contactText}>{formatPhone(tenant.phone)}</Text>
                          </TouchableOpacity>
                        )}
                        <View style={styles.rentRow}>
                          <Text style={styles.rentLabel}>Paid:</Text>
                          <Text style={[styles.rentValue, styles.paidValue]}>
                            {formatCurrency(rentInfo?.amount_paid || 0)}
                          </Text>
                        </View>
                      </View>
                    </Card>
                  );
                })}
              </View>
            )}
          </>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Payment Modal */}
      <Modal visible={showPaymentModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Payment</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedTenant && (
              <View>
                <View style={styles.paymentTenantInfo}>
                  <Text style={styles.paymentTenantName}>
                    {selectedTenant.first_name} {selectedTenant.last_name}
                  </Text>
                  <Text style={styles.paymentTenantProperty}>
                    {selectedTenant.property_name} - Unit {selectedTenant.unit_number}
                  </Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Amount (CAD)</Text>
                  <TextInput
                    style={styles.input}
                    value={paymentAmount}
                    onChangeText={setPaymentAmount}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.textTertiary}
                  />
                </View>

                <Button
                  title="Record Payment"
                  onPress={submitPayment}
                  loading={processingPayment}
                  size="large"
                  style={styles.submitButton}
                />
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  headerStats: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  headerStat: {
    alignItems: 'center',
  },
  headerStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  headerStatLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  scrollContent: {
    padding: theme.spacing.md,
    flexGrow: 1,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    marginBottom: theme.spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  lateDot: {
    backgroundColor: theme.colors.error,
  },
  pendingDot: {
    backgroundColor: theme.colors.warning,
  },
  paidDot: {
    backgroundColor: theme.colors.success,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  tenantCard: {
    marginBottom: theme.spacing.sm,
  },
  tenantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  paidAvatar: {
    backgroundColor: theme.colors.successLight,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  tenantInfo: {
    flex: 1,
  },
  tenantName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  tenantProperty: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  tenantDetails: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  contactText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
  rentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rentLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  rentValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  paidValue: {
    color: theme.colors.success,
  },
  recordPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
  },
  recordPaymentText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
    marginLeft: 8,
  },
  bottomSpacing: {
    height: theme.spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  paymentTenantInfo: {
    backgroundColor: theme.colors.primaryLight,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  paymentTenantName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  paymentTenantProperty: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  formGroup: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  submitButton: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
});
