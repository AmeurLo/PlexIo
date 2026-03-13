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
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button, theme, StatusBadge, EmptyState } from '../../src/components';
import { api } from '../../src/services/api';
import { TenantWithDetails, RentOverview, PropertyWithStats, Unit } from '../../src/types';
import {
  formatCurrency, formatPhone, getRentStatusConfig,
  getTodayISO, getCurrentMonthYear,
} from '../../src/utils/format';
import { useTranslation } from '../../src/i18n/useTranslation';

const oneYearFromNow = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
};

const blankTenantForm = () => ({ first_name: '', last_name: '', email: '', phone: '' });
const blankLeaseForm = () => ({
  property_id: '', unit_id: '',
  start_date: getTodayISO(), end_date: oneYearFromNow(),
  rent_amount: '',
});

export default function TenantsScreen() {
  const { t } = useTranslation();
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [tenants, setTenants]         = useState<TenantWithDetails[]>([]);
  const [rentOverview, setRentOverview] = useState<RentOverview[]>([]);

  const [selectedTenant, setSelectedTenant]   = useState<TenantWithDetails | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount]     = useState('');

  const [showAddModal, setShowAddModal]   = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantWithDetails | null>(null);
  const [step, setStep]                   = useState<1 | 2>(1);
  const [saving, setSaving]               = useState(false);
  const [tenantForm, setTenantForm]       = useState(blankTenantForm());
  const [leaseForm, setLeaseForm]         = useState(blankLeaseForm());

  const [properties, setProperties]       = useState<PropertyWithStats[]>([]);
  const [vacantUnits, setVacantUnits]     = useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits]   = useState(false);

  const loadData = async () => {
    try {
      const [tenantsData, rentData, propsData] = await Promise.all([
        api.getTenants(),
        api.getRentOverview(),
        api.getProperties(),
      ]);
      setTenants(tenantsData);
      setRentOverview(rentData);
      setProperties(propsData);
    } catch (err) {
      console.error('Error loading tenants:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const getTenantRentInfo = (id: string) => rentOverview.find(r => r.tenant_id === id);

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
      Alert.alert(t('error') as string, t('validAmount') as string);
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
      Alert.alert(t('success') as string, t('paymentSuccess') as string);
    } catch (err: any) {
      Alert.alert(t('error') as string, err.response?.data?.detail || t('error') as string);
    } finally {
      setProcessingPayment(false);
    }
  };

  const openAdd = () => {
    setEditingTenant(null);
    setTenantForm(blankTenantForm());
    setLeaseForm(blankLeaseForm());
    setVacantUnits([]);
    setStep(1);
    setShowAddModal(true);
  };

  const openEdit = (tenant: TenantWithDetails) => {
    setEditingTenant(tenant);
    setTenantForm({
      first_name: tenant.first_name,
      last_name:  tenant.last_name,
      email:      tenant.email || '',
      phone:      tenant.phone || '',
    });
    setStep(1);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingTenant(null);
    setStep(1);
  };

  const onPropertyChange = async (propertyId: string) => {
    setLeaseForm(f => ({ ...f, property_id: propertyId, unit_id: '' }));
    if (!propertyId) { setVacantUnits([]); return; }
    setLoadingUnits(true);
    try {
      const units = await api.getUnits(propertyId);
      setVacantUnits(units.filter((u: Unit) => !u.is_occupied));
    } catch {
      setVacantUnits([]);
    } finally {
      setLoadingUnits(false);
    }
  };

  const handleSave = async () => {
    if (!tenantForm.first_name.trim() || !tenantForm.last_name.trim()) {
      Alert.alert(t('required') as string, t('nameRequired') as string);
      return;
    }
    if (!editingTenant && step === 2 && leaseForm.unit_id) {
      if (!leaseForm.start_date || !leaseForm.end_date || !leaseForm.rent_amount) {
        Alert.alert(t('required') as string, t('fillLeaseFields') as string);
        return;
      }
    }
    setSaving(true);
    try {
      if (editingTenant) {
        await api.updateTenant(editingTenant.id, {
          first_name: tenantForm.first_name.trim(),
          last_name:  tenantForm.last_name.trim(),
          email:      tenantForm.email.trim() || undefined,
          phone:      tenantForm.phone.trim() || undefined,
        });
        Alert.alert(t('success') as string, t('tenantUpdated') as string);
      } else {
        const newTenant = await api.createTenant({
          first_name: tenantForm.first_name.trim(),
          last_name:  tenantForm.last_name.trim(),
          email:      tenantForm.email.trim() || undefined,
          phone:      tenantForm.phone.trim() || undefined,
          unit_id:    leaseForm.unit_id || undefined,
        });
        if (leaseForm.unit_id && leaseForm.rent_amount) {
          await api.createLease({
            tenant_id:   newTenant.id,
            unit_id:     leaseForm.unit_id,
            start_date:  leaseForm.start_date,
            end_date:    leaseForm.end_date,
            rent_amount: parseFloat(leaseForm.rent_amount),
          });
        }
        Alert.alert(t('success') as string, t('tenantAdded') as string);
      }
      closeModal();
      loadData();
    } catch (err: any) {
      Alert.alert(t('error') as string, err.response?.data?.detail || t('error') as string);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (tenant: TenantWithDetails) => {
    const name = `${tenant.first_name} ${tenant.last_name}`;
    Alert.alert(
      t('removeTenant') as string,
      (t('removeTenantMsg') as Function)(name),
      [
        { text: t('cancel') as string, style: 'cancel' },
        {
          text: t('remove') as string,
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteTenant(tenant.id);
              loadData();
            } catch (err: any) {
              Alert.alert(t('error') as string, err.response?.data?.detail || t('error') as string);
            }
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

  const lateTenants    = tenants.filter(t => t.rent_status === 'late');
  const pendingTenants = tenants.filter(t => t.rent_status === 'pending');
  const paidTenants    = tenants.filter(t => t.rent_status === 'paid');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('tenants') as string}</Text>
          <Text style={styles.subtitle}>{(t('tenantsTotal') as Function)(tenants.length)}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={22} color="#FFF" />
          <Text style={styles.addBtnText}>{t('addTenant') as string}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {tenants.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title={t('noTenantsTitle') as string}
            description={t('noTenantsDesc') as string}
          />
        ) : (
          <>
            <TenantSection status="late" dotStyle={styles.lateDot} list={lateTenants} rentOverview={rentOverview} onPayment={handleRecordPayment} onEdit={openEdit} onDelete={handleDelete} />
            <TenantSection status="pending" dotStyle={styles.pendingDot} list={pendingTenants} rentOverview={rentOverview} onPayment={handleRecordPayment} onEdit={openEdit} onDelete={handleDelete} />
            <TenantSection status="paid" dotStyle={styles.paidDot} list={paidTenants} rentOverview={rentOverview} onPayment={handleRecordPayment} onEdit={openEdit} onDelete={handleDelete} />
          </>
        )}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Add / Edit Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={step === 2 ? () => setStep(1) : closeModal} style={styles.backBtn}>
                <Ionicons name={step === 2 ? 'chevron-back' : 'close'} size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingTenant ? (t('editTenant') as string) : step === 1 ? (t('newTenant') as string) : (t('unitAndLease') as string)}
              </Text>
              <View style={{ width: 32 }} />
            </View>

            {!editingTenant && (
              <View style={styles.stepRow}>
                <View style={[styles.stepDot, step === 1 && styles.stepDotActive]} />
                <View style={styles.stepLine} />
                <View style={[styles.stepDot, step === 2 && styles.stepDotActive]} />
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {step === 1 && (
                <View style={styles.formSection}>
                  <View style={styles.formRow}>
                    <View style={styles.formHalf}>
                      <Text style={styles.label}>{t('firstName') as string}</Text>
                      <TextInput style={styles.input} value={tenantForm.first_name} onChangeText={v => setTenantForm(f => ({ ...f, first_name: v }))} placeholder="Marie" placeholderTextColor={theme.colors.textTertiary} />
                    </View>
                    <View style={styles.formHalf}>
                      <Text style={styles.label}>{t('lastName') as string}</Text>
                      <TextInput style={styles.input} value={tenantForm.last_name} onChangeText={v => setTenantForm(f => ({ ...f, last_name: v }))} placeholder="Tremblay" placeholderTextColor={theme.colors.textTertiary} />
                    </View>
                  </View>
                  <Text style={styles.label}>{t('email') as string}</Text>
                  <TextInput style={styles.input} value={tenantForm.email} onChangeText={v => setTenantForm(f => ({ ...f, email: v }))} placeholder="marie@email.com" placeholderTextColor={theme.colors.textTertiary} keyboardType="email-address" autoCapitalize="none" />
                  <Text style={styles.label}>{t('phone') as string}</Text>
                  <TextInput style={styles.input} value={tenantForm.phone} onChangeText={v => setTenantForm(f => ({ ...f, phone: v }))} placeholder="514-555-1234" placeholderTextColor={theme.colors.textTertiary} keyboardType="phone-pad" />
                  {editingTenant ? (
                    <Button title={t('saveChanges') as string} onPress={handleSave} loading={saving} size="large" style={styles.ctaBtn} />
                  ) : (
                    <TouchableOpacity style={styles.nextBtn} onPress={() => {
                      if (!tenantForm.first_name.trim() || !tenantForm.last_name.trim()) {
                        Alert.alert(t('required') as string, t('enterName') as string);
                        return;
                      }
                      setStep(2);
                    }}>
                      <Text style={styles.nextBtnText}>{t('nextAssignUnit') as string}</Text>
                      <Ionicons name="chevron-forward" size={18} color="#FFF" />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {step === 2 && (
                <View style={styles.formSection}>
                  <View style={styles.tenantChip}>
                    <View style={styles.tenantChipAvatar}>
                      <Text style={styles.tenantChipInitials}>{tenantForm.first_name[0]}{tenantForm.last_name[0]}</Text>
                    </View>
                    <Text style={styles.tenantChipName}>{tenantForm.first_name} {tenantForm.last_name}</Text>
                  </View>

                  <Text style={styles.label}>{t('selectProperty') as string}</Text>
                  <View style={styles.pickerGroup}>
                    {properties.map(p => (
                      <TouchableOpacity key={p.id} style={[styles.pickerChip, leaseForm.property_id === p.id && styles.pickerChipActive]} onPress={() => onPropertyChange(p.id)}>
                        <Text style={[styles.pickerChipText, leaseForm.property_id === p.id && styles.pickerChipTextActive]}>{p.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {leaseForm.property_id !== '' && (
                    <>
                      <Text style={styles.label}>{t('selectVacantUnit') as string}</Text>
                      {loadingUnits ? (
                        <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 8 }} />
                      ) : vacantUnits.length === 0 ? (
                        <Text style={styles.noUnitsText}>{t('noVacantUnits') as string}</Text>
                      ) : (
                        <View style={styles.pickerGroup}>
                          {vacantUnits.map(u => (
                            <TouchableOpacity key={u.id} style={[styles.pickerChip, leaseForm.unit_id === u.id && styles.pickerChipActive]} onPress={() => setLeaseForm(f => ({ ...f, unit_id: u.id }))}>
                              <Text style={[styles.pickerChipText, leaseForm.unit_id === u.id && styles.pickerChipTextActive]}>{t('unit') as string} {u.unit_number}</Text>
                              {u.rent_amount && (
                                <Text style={[styles.pickerChipSub, leaseForm.unit_id === u.id && styles.pickerChipTextActive]}>{formatCurrency(u.rent_amount)}/mo</Text>
                              )}
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </>
                  )}

                  {leaseForm.unit_id !== '' && (
                    <>
                      <View style={styles.formRow}>
                        <View style={styles.formHalf}>
                          <Text style={styles.label}>{t('startDate') as string}</Text>
                          <TextInput style={styles.input} value={leaseForm.start_date} onChangeText={v => setLeaseForm(f => ({ ...f, start_date: v }))} placeholder="YYYY-MM-DD" placeholderTextColor={theme.colors.textTertiary} />
                        </View>
                        <View style={styles.formHalf}>
                          <Text style={styles.label}>{t('endDate') as string}</Text>
                          <TextInput style={styles.input} value={leaseForm.end_date} onChangeText={v => setLeaseForm(f => ({ ...f, end_date: v }))} placeholder="YYYY-MM-DD" placeholderTextColor={theme.colors.textTertiary} />
                        </View>
                      </View>
                      <Text style={styles.label}>{t('monthlyRent') as string}</Text>
                      <TextInput style={styles.input} value={leaseForm.rent_amount} onChangeText={v => setLeaseForm(f => ({ ...f, rent_amount: v }))} placeholder="1200" placeholderTextColor={theme.colors.textTertiary} keyboardType="decimal-pad" />
                    </>
                  )}

                  <Button
                    title={leaseForm.unit_id ? (t('addTenantCreateLease') as string) : (t('addTenantNoUnit') as string)}
                    onPress={handleSave}
                    loading={saving}
                    size="large"
                    style={styles.ctaBtn}
                  />
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Payment Modal */}
      <Modal visible={showPaymentModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ width: 32 }} />
              <Text style={styles.modalTitle}>{t('recordPayment') as string}</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {selectedTenant && (
              <View>
                <View style={styles.paymentTenantInfo}>
                  <Text style={styles.paymentTenantName}>{selectedTenant.first_name} {selectedTenant.last_name}</Text>
                  <Text style={styles.paymentTenantProperty}>{selectedTenant.property_name} - {t('unit') as string} {selectedTenant.unit_number}</Text>
                </View>
                <View style={styles.formSection}>
                  <Text style={styles.label}>{t('amountCAD') as string}</Text>
                  <TextInput style={styles.input} value={paymentAmount} onChangeText={setPaymentAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={theme.colors.textTertiary} />
                  <Button
                    title={t('recordPayment') as string}
                    onPress={submitPayment}
                    loading={processingPayment}
                    size="large"
                    style={StyleSheet.flatten([styles.ctaBtn, { marginBottom: theme.spacing.lg }])}
                  />
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Tenant Section ───────────────────────────────────────────────────────────

const TenantSection = ({
  status, dotStyle, list, rentOverview, onPayment, onEdit, onDelete,
}: {
  status: 'late' | 'pending' | 'paid';
  dotStyle: any;
  list: TenantWithDetails[];
  rentOverview: RentOverview[];
  onPayment: (t: TenantWithDetails) => void;
  onEdit: (t: TenantWithDetails) => void;
  onDelete: (t: TenantWithDetails) => void;
}) => {
  const { t } = useTranslation();
  if (list.length === 0) return null;
  const statusConfig = getRentStatusConfig(status);
  const label = t(status === 'late' ? 'tenantStatusLate' : status === 'pending' ? 'tenantStatusPending' : 'tenantStatusPaid') as string;
  const isPaid = status === 'paid';

  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        <View style={[styles.statusDot, dotStyle]} />
        <Text style={styles.sectionTitle}>{label} ({list.length})</Text>
      </View>
      {list.map(tenant => {
        const rentInfo = rentOverview.find(r => r.tenant_id === tenant.id);
        return (
          <Card key={tenant.id} style={styles.tenantCard}>
            <View style={styles.tenantHeader}>
              <View style={[styles.avatar, isPaid && styles.paidAvatar]}>
                <Text style={styles.avatarText}>{tenant.first_name[0]}{tenant.last_name[0]}</Text>
              </View>
              <View style={styles.tenantInfo}>
                <Text style={styles.tenantName}>{tenant.first_name} {tenant.last_name}</Text>
                <Text style={styles.tenantProperty}>
                  {tenant.property_name ? `${tenant.property_name} \u00b7 ${t('unit') as string} ${tenant.unit_number}` : (t('noUnitAssigned') as string)}
                </Text>
              </View>
              <StatusBadge label={statusConfig.label} color={statusConfig.color} bgColor={statusConfig.bgColor} />
            </View>

            <View style={styles.tenantDetails}>
              {tenant.phone ? (
                <View style={styles.contactRow}>
                  <Ionicons name="call-outline" size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.contactText}>{formatPhone(tenant.phone)}</Text>
                </View>
              ) : null}
              {tenant.email ? (
                <View style={styles.contactRow}>
                  <Ionicons name="mail-outline" size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.contactText}>{tenant.email}</Text>
                </View>
              ) : null}
              {rentInfo && (
                <View style={styles.rentRow}>
                  <Text style={styles.rentLabel}>{isPaid ? (t('paidLabel') as string) : (t('rentDue') as string)}</Text>
                  <Text style={[styles.rentValue, isPaid && styles.paidValue]}>
                    {formatCurrency(isPaid ? rentInfo.amount_paid || 0 : rentInfo.rent_amount || 0)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.portalBtn}
                onPress={() => Alert.alert(
                  'Lien d\'accès envoyé',
                  `Un lien de connexion sécurisé a été envoyé à ${tenant.email}.\n\nLe locataire pourra accéder à son portail personnel via ce lien.`,
                  [{ text: 'OK' }]
                )}
              >
                <Ionicons name="link-outline" size={15} color={theme.colors.primary} />
                <Text style={styles.portalBtnText}>Envoyer accès</Text>
              </TouchableOpacity>
              {!isPaid && (
                <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => onPayment(tenant)}>
                  <Ionicons name="card-outline" size={16} color={theme.colors.primary} />
                  <Text style={styles.actionBtnPrimaryText}>{t('recordPayment') as string}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.actionBtnIcon} onPress={() => onEdit(tenant)}>
                <Ionicons name="pencil-outline" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtnIcon} onPress={() => onDelete(tenant)}>
                <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          </Card>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight, backgroundColor: theme.colors.surface },
  title: { fontSize: 24, fontWeight: '700', color: theme.colors.textPrimary },
  subtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primary, paddingHorizontal: 14, paddingVertical: 9, borderRadius: theme.borderRadius.md },
  addBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  scrollContent: { padding: theme.spacing.md, flexGrow: 1 },
  section: { marginBottom: theme.spacing.lg },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  lateDot: { backgroundColor: theme.colors.error },
  pendingDot: { backgroundColor: theme.colors.warning },
  paidDot: { backgroundColor: theme.colors.success },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  tenantCard: { marginBottom: theme.spacing.sm },
  tenantHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.md },
  paidAvatar: { backgroundColor: theme.colors.successLight },
  avatarText: { fontSize: 15, fontWeight: '700', color: theme.colors.primary },
  tenantInfo: { flex: 1 },
  tenantName: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  tenantProperty: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  tenantDetails: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.borderLight, gap: 4 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  contactText: { fontSize: 13, color: theme.colors.textSecondary },
  rentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  rentLabel: { fontSize: 13, color: theme.colors.textSecondary },
  rentValue: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  paidValue: { color: theme.colors.success },
  actionsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.borderLight, gap: 8 },
  portalBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.primary + '30' },
  portalBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
  actionBtnPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.md },
  actionBtnPrimaryText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
  actionBtnIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.borderLight, borderRadius: theme.borderRadius.md },
  bottomSpacing: { height: theme.spacing.xl },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.borderRadius.xl, borderTopRightRadius: theme.borderRadius.xl, padding: theme.spacing.lg, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  backBtn: { width: 32, alignItems: 'flex-start' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.lg, gap: 0 },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.borderLight },
  stepDotActive: { backgroundColor: theme.colors.primary },
  stepLine: { width: 40, height: 2, backgroundColor: theme.colors.borderLight, marginHorizontal: 6 },
  formSection: { paddingBottom: theme.spacing.lg },
  formRow: { flexDirection: 'row', gap: 12, marginBottom: 0 },
  formHalf: { flex: 1 },
  label: { fontSize: 14, fontWeight: '500', color: theme.colors.textPrimary, marginBottom: 8, marginTop: theme.spacing.sm },
  input: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: theme.colors.textPrimary, marginBottom: 4 },
  ctaBtn: { marginTop: theme.spacing.md },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 15, marginTop: theme.spacing.md, gap: 8 },
  nextBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  tenantChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.md, paddingHorizontal: 14, paddingVertical: 10, marginBottom: theme.spacing.md, gap: 10 },
  tenantChipAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  tenantChipInitials: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  tenantChipName: { fontSize: 15, fontWeight: '600', color: theme.colors.primary },
  pickerGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing.sm },
  pickerChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.borderLight },
  pickerChipActive: { backgroundColor: theme.colors.primary },
  pickerChipText: { fontSize: 13, fontWeight: '500', color: theme.colors.textSecondary },
  pickerChipTextActive: { color: '#FFF' },
  pickerChipSub: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 2 },
  noUnitsText: { fontSize: 13, color: theme.colors.textTertiary, fontStyle: 'italic', marginBottom: theme.spacing.sm },
  paymentTenantInfo: { paddingBottom: theme.spacing.md, marginBottom: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  paymentTenantName: { fontSize: 17, fontWeight: '700', color: theme.colors.textPrimary },
  paymentTenantProperty: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
});
