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
import { Card, Button, theme, EmptyState, AddressAutocomplete, AddressSuggestion, DomelyAI } from '../../src/components';
import { api } from '../../src/services/api';
import { PropertyWithStats, Unit, EXPENSE_CATEGORIES, HealthScoreResponse } from '../../src/types';
import { formatCurrency, getPropertyTypeLabel } from '../../src/utils/format';
import { useTranslation } from '../../src/i18n/useTranslation';

// ── Health score helpers (mirrors insights.tsx) ───────────────────────────────
const getScoreColor = (score: number) => {
  if (score >= 70) return theme.colors.success;
  if (score >= 40) return theme.colors.warning;
  return theme.colors.error;
};
const getScoreBg = (score: number) => {
  if (score >= 70) return theme.colors.successLight;
  if (score >= 40) return theme.colors.warningLight;
  return theme.colors.errorLight;
};
const getScoreLabel = (status: string) => {
  if (status === 'healthy')  return '● Sain';
  if (status === 'moderate') return '● Modéré';
  return '● À risque';
};

export default function PropertiesScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [properties, setProperties] = useState<PropertyWithStats[]>([]);
  const [healthData, setHealthData] = useState<HealthScoreResponse | null>(null);
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);
  const [units, setUnits] = useState<Record<string, Unit[]>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingProperty, setAddingProperty] = useState(false);

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expensePropertyId, setExpensePropertyId] = useState('');
  const [savingExpense, setSavingExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    category: 'maintenance',
    expense_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    province: 'QC',
    postal_code: '',
    property_type: 'duplex',
    condo_fees: '',
  });

  const loadData = async () => {
    try {
      const [data, health] = await Promise.all([
        api.getProperties(),
        api.getHealthScores().catch(() => null),
      ]);
      setProperties(data);
      setHealthData(health);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadUnits = async (propertyId: string) => {
    try {
      const propertyUnits = await api.getUnits(propertyId);
      setUnits((prev) => ({ ...prev, [propertyId]: propertyUnits }));
    } catch (error) {
      console.error('Error loading units:', error);
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

  const toggleExpand = (propertyId: string) => {
    if (expandedProperty === propertyId) {
      setExpandedProperty(null);
    } else {
      setExpandedProperty(propertyId);
      if (!units[propertyId]) loadUnits(propertyId);
    }
  };

  const handleAddProperty = async () => {
    if (!formData.name || !formData.address || !formData.city || !formData.postal_code) {
      Alert.alert(t('error') as string, t('fillRequired') as string);
      return;
    }
    setAddingProperty(true);
    try {
      await api.createProperty(formData);
      setShowAddModal(false);
      setFormData({ name: '', address: '', city: '', province: 'QC', postal_code: '', property_type: 'duplex', condo_fees: '' });
      loadData();
      Alert.alert(t('success') as string, t('propertyAdded') as string);
    } catch (error: any) {
      Alert.alert(t('error') as string, error.response?.data?.detail || t('fillRequired') as string);
    } finally {
      setAddingProperty(false);
    }
  };

  const openAddExpense = (propertyId: string) => {
    setExpensePropertyId(propertyId);
    setExpenseForm({ title: '', amount: '', category: 'maintenance', expense_date: new Date().toISOString().slice(0, 10), notes: '' });
    setShowExpenseModal(true);
  };

  const handleSaveExpense = async () => {
    if (!expenseForm.title.trim()) {
      Alert.alert(t('error') as string, t('expenseTitleError') as string);
      return;
    }
    const amount = parseFloat(expenseForm.amount);
    if (!expenseForm.amount || isNaN(amount) || amount <= 0) {
      Alert.alert(t('error') as string, t('expenseAmountError') as string);
      return;
    }
    setSavingExpense(true);
    try {
      await api.createExpense({
        property_id: expensePropertyId,
        title: expenseForm.title.trim(),
        amount,
        category: expenseForm.category,
        expense_date: expenseForm.expense_date,
        notes: expenseForm.notes.trim() || undefined,
      });
      setShowExpenseModal(false);
      loadData();
      Alert.alert(t('success') as string, t('expenseLogged') as string);
    } catch (error: any) {
      Alert.alert(t('error') as string, error.response?.data?.detail || t('fillRequired') as string);
    } finally {
      setSavingExpense(false);
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('tabPortfolio') as string}</Text>
        <View style={styles.headerRight}>
          <DomelyAI context="portfolio" />
          <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add" size={24} color={theme.colors.textInverse} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Portfolio Health Banner ─────────────────────────────────── */}
        {healthData && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/insights' as any)}
            style={[styles.healthBanner, { backgroundColor: getScoreBg(healthData.portfolio_average) }]}
          >
            {/* Score ring */}
            <View style={[styles.healthRing, { borderColor: getScoreColor(healthData.portfolio_average) }]}>
              <Text style={[styles.healthRingScore, { color: getScoreColor(healthData.portfolio_average) }]}>
                {healthData.portfolio_average}
              </Text>
            </View>
            {/* Info */}
            <View style={{ flex: 1 }}>
              <Text style={styles.healthTitle}>Santé du portefeuille</Text>
              <Text style={[styles.healthStatus, { color: getScoreColor(healthData.portfolio_average) }]}>
                {getScoreLabel(healthData.portfolio_status)}
              </Text>
              {/* Progress bar */}
              <View style={styles.healthTrack}>
                <View style={[styles.healthFill, { width: `${healthData.portfolio_average}%`, backgroundColor: getScoreColor(healthData.portfolio_average) }]} />
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={getScoreColor(healthData.portfolio_average)} />
          </TouchableOpacity>
        )}

        {properties.length === 0 ? (
          <EmptyState
            icon="home-outline"
            title={t('noPropertiesTitle') as string}
            description={t('noPropertiesDesc') as string}
            actionLabel={t('addProperty') as string}
            onAction={() => setShowAddModal(true)}
          />
        ) : (
          properties.map((property) => {
            const isExpanded = expandedProperty === property.id;
            const cashFlowPositive = (property.net_cash_flow ?? 0) >= 0;
            const cashFlowColor = cashFlowPositive ? theme.colors.success : theme.colors.error;
            const cashFlowBg = cashFlowPositive ? theme.colors.successLight : theme.colors.errorLight;
            const netFlow = property.net_cash_flow ?? 0;

            return (
              <View key={property.id}>
                <Card style={styles.propertyCard} onPress={() => toggleExpand(property.id)}>
                  <View style={styles.propertyHeader}>
                    <View style={styles.propertyIcon}>
                      <Ionicons name="home" size={24} color={theme.colors.primary} />
                    </View>
                    <View style={styles.propertyInfo}>
                      <Text style={styles.propertyName}>{property.name}</Text>
                      <Text style={styles.propertyAddress}>{property.address}, {property.city}</Text>
                      <View style={styles.propertyMeta}>
                        <View style={styles.metaTag}>
                          <Text style={styles.metaText}>{getPropertyTypeLabel(property.property_type)}</Text>
                        </View>
                        <View style={styles.metaTag}>
                          <Text style={styles.metaText}>{property.total_units} {t('units') as string}</Text>
                        </View>
                      </View>
                    </View>
                    {(() => {
                      const ph = healthData?.properties.find(h => h.property_id === property.id);
                      return ph ? (
                        <View style={[styles.scoreTag, { backgroundColor: getScoreBg(ph.score) }]}>
                          <Text style={[styles.scoreTagText, { color: getScoreColor(ph.score) }]}>{ph.score}</Text>
                        </View>
                      ) : null;
                    })()}
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={24} color={theme.colors.textSecondary} />
                  </View>

                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{property.occupied_units}/{property.total_units}</Text>
                      <Text style={styles.statLabel}>{t('occupied_units') as string}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{formatCurrency(property.rent_collected)}</Text>
                      <Text style={styles.statLabel}>{t('collected') as string}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{formatCurrency(property.total_expenses ?? 0)}</Text>
                      <Text style={styles.statLabel}>{t('expenses') as string}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: cashFlowColor }]}>
                        {cashFlowPositive ? '' : '\u2013'}{formatCurrency(Math.abs(netFlow))}
                      </Text>
                      <Text style={styles.statLabel}>{t('netFlow') as string}</Text>
                    </View>
                  </View>

                  <View style={[styles.statusPill, { backgroundColor: cashFlowBg }]}>
                    <Ionicons name={cashFlowPositive ? 'trending-up' : 'trending-down'} size={13} color={cashFlowColor} />
                    <Text style={[styles.statusPillText, { color: cashFlowColor }]}>
                      {cashFlowPositive ? (t('positiveCashFlow') as string) : (t('negativeCashFlow') as string)}
                    </Text>
                    {property.open_maintenance > 0 && (
                      <Text style={[styles.statusPillText, { color: theme.colors.warning }]}>
                        {' \u00b7 '}{property.open_maintenance} {property.open_maintenance > 1 ? (t('openIssues_pl') as string) : (t('openIssue') as string)}
                      </Text>
                    )}
                  </View>
                </Card>

                {isExpanded && (
                  <View style={styles.expandedContainer}>
                    <Card style={styles.snapshotCard}>
                      <Text style={styles.snapshotTitle}>{t('financialSnapshot') as string}</Text>
                      <View style={styles.snapshotGrid}>
                        <View style={styles.snapshotItem}>
                          <Text style={styles.snapshotLabel}>{t('expectedRent') as string}</Text>
                          <Text style={styles.snapshotValue}>{formatCurrency(property.rent_expected)}</Text>
                        </View>
                        <View style={styles.snapshotItem}>
                          <Text style={styles.snapshotLabel}>{t('collected') as string}</Text>
                          <Text style={[styles.snapshotValue, { color: theme.colors.success }]}>{formatCurrency(property.rent_collected)}</Text>
                        </View>
                        <View style={styles.snapshotItem}>
                          <Text style={styles.snapshotLabel}>{t('expenses') as string}</Text>
                          <Text style={[styles.snapshotValue, { color: theme.colors.warning }]}>{formatCurrency(property.total_expenses ?? 0)}</Text>
                        </View>
                        <View style={styles.snapshotItem}>
                          <Text style={styles.snapshotLabel}>{t('netCashFlow') as string}</Text>
                          <Text style={[styles.snapshotValue, { color: cashFlowColor }]}>
                            {cashFlowPositive ? '' : '\u2013'}{formatCurrency(Math.abs(netFlow))}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => router.push({ pathname: '/property-financials', params: { propertyId: property.id, propertyName: property.name } })}
                        >
                          <Ionicons name="bar-chart-outline" size={16} color={theme.colors.primary} />
                          <Text style={styles.actionBtnText}>{t('viewFinancials') as string}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnAccent]} onPress={() => openAddExpense(property.id)}>
                          <Ionicons name="add-circle-outline" size={16} color={theme.colors.accent} />
                          <Text style={[styles.actionBtnText, { color: theme.colors.accent }]}>{t('addExpense') as string}</Text>
                        </TouchableOpacity>
                      </View>
                    </Card>

                    {units[property.id]?.map((unit) => (
                      <Card key={unit.id} style={styles.unitCard}>
                        <View style={styles.unitHeader}>
                          <View style={styles.unitInfo}>
                            <Text style={styles.unitNumber}>{t('unit') as string} {unit.unit_number}</Text>
                            <Text style={styles.unitDetails}>
                              {unit.bedrooms} {t('bed') as string} \u00b7 {unit.bathrooms} {t('bath') as string}{unit.square_feet ? ` \u00b7 ${unit.square_feet} ${t('sqft') as string}` : ''}
                            </Text>
                          </View>
                          <View style={styles.unitRight}>
                            <Text style={styles.unitRent}>{formatCurrency(unit.rent_amount)}/mo</Text>
                            <View style={[styles.occupancyBadge, unit.is_occupied ? styles.occupiedBadge : styles.vacantBadge]}>
                              <Text style={[styles.occupancyText, unit.is_occupied ? styles.occupiedText : styles.vacantText]}>
                                {unit.is_occupied ? (t('occupied') as string) : (t('vacant') as string)}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <TouchableOpacity style={styles.timelineButton} onPress={() => router.push({ pathname: '/unit-timeline', params: { unitId: unit.id } })}>
                          <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
                          <Text style={styles.timelineButtonText}>{t('viewTimeline') as string}</Text>
                          <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
                        </TouchableOpacity>
                      </Card>
                    )) || (
                      <View style={styles.loadingUnits}>
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Add Property Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('addProperty') as string}</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('propertyName') as string}</Text>
                <TextInput style={styles.input} value={formData.name} onChangeText={(v) => setFormData({ ...formData, name: v })} placeholder={t('propertyNamePlaceholder') as string} placeholderTextColor={theme.colors.textTertiary} />
              </View>

              {/* Address autocomplete — auto-fills city, province, postal code */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('address') as string}</Text>
                <AddressAutocomplete
                  value={formData.address}
                  onChangeText={(v) => setFormData({ ...formData, address: v })}
                  onSelect={(s: AddressSuggestion) => {
                    setFormData((prev) => ({
                      ...prev,
                      address: s.address,
                      city: s.city || prev.city,
                      province: s.province || prev.province,
                      postal_code: s.postalCode || prev.postal_code,
                    }));
                  }}
                  placeholder={t('addressPlaceholder') as string}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 2 }]}>
                  <Text style={styles.label}>{t('city') as string}</Text>
                  <TextInput style={styles.input} value={formData.city} onChangeText={(v) => setFormData({ ...formData, city: v })} placeholder={t('cityPlaceholder') as string} placeholderTextColor={theme.colors.textTertiary} />
                </View>
                <View style={[styles.formGroup, { flex: 1, marginLeft: 12 }]}>
                  <Text style={styles.label}>{t('province') as string}</Text>
                  <TextInput style={styles.input} value={formData.province} onChangeText={(v) => setFormData({ ...formData, province: v })} placeholder="QC" placeholderTextColor={theme.colors.textTertiary} autoCapitalize="characters" />
                </View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('postalCode') as string}</Text>
                <TextInput style={styles.input} value={formData.postal_code} onChangeText={(v) => setFormData({ ...formData, postal_code: v })} placeholder="H2G 1S6" placeholderTextColor={theme.colors.textTertiary} autoCapitalize="characters" />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('propertyType') as string}</Text>
                <View style={styles.typeOptions}>
                  {['duplex', 'triplex', 'fourplex', 'sixplex', 'condo', 'single_family'].map((type) => (
                    <TouchableOpacity key={type} style={[styles.typeOption, formData.property_type === type && styles.typeOptionSelected]} onPress={() => setFormData({ ...formData, property_type: type })}>
                      <Text style={[styles.typeOptionText, formData.property_type === type && styles.typeOptionTextSelected]}>{getPropertyTypeLabel(type)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {formData.property_type === 'condo' && (
                <View style={styles.formGroup}>
                  <View style={styles.condoFeesHeader}>
                    <Ionicons name="business-outline" size={16} color="#8B5CF6" />
                    <Text style={[styles.label, { color: '#8B5CF6', marginBottom: 0 }]}>Frais de condo ($/mois)</Text>
                  </View>
                  <TextInput
                    style={[styles.input, { borderColor: '#8B5CF6' + '60' }]}
                    value={formData.condo_fees}
                    onChangeText={v => setFormData({ ...formData, condo_fees: v })}
                    placeholder="Ex. 285.00"
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.condoFeesHint}>Ces frais seront suivis séparément de vos dépenses courantes.</Text>
                </View>
              )}
              <Button title={t('addProperty') as string} onPress={handleAddProperty} loading={addingProperty} size="large" style={styles.submitButton} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Expense Modal */}
      <Modal visible={showExpenseModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('logExpense') as string}</Text>
              <TouchableOpacity onPress={() => setShowExpenseModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('expenseTitle') as string}</Text>
                <TextInput style={styles.input} value={expenseForm.title} onChangeText={(v) => setExpenseForm({ ...expenseForm, title: v })} placeholder={t('expenseTitlePlaceholder') as string} placeholderTextColor={theme.colors.textTertiary} />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('expenseAmount') as string}</Text>
                <TextInput style={styles.input} value={expenseForm.amount} onChangeText={(v) => setExpenseForm({ ...expenseForm, amount: v })} placeholder="0.00" placeholderTextColor={theme.colors.textTertiary} keyboardType="decimal-pad" />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('expenseCategory') as string}</Text>
                <View style={styles.categoryGrid}>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <TouchableOpacity key={cat.value} style={[styles.categoryChip, expenseForm.category === cat.value && styles.categoryChipSelected]} onPress={() => setExpenseForm({ ...expenseForm, category: cat.value })}>
                      <Text style={[styles.categoryChipText, expenseForm.category === cat.value && styles.categoryChipTextSelected]}>{cat.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('expenseDate') as string}</Text>
                <TextInput style={styles.input} value={expenseForm.expense_date} onChangeText={(v) => setExpenseForm({ ...expenseForm, expense_date: v })} placeholder="YYYY-MM-DD" placeholderTextColor={theme.colors.textTertiary} />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('expenseNotes') as string}</Text>
                <TextInput style={[styles.input, styles.textArea]} value={expenseForm.notes} onChangeText={(v) => setExpenseForm({ ...expenseForm, notes: v })} placeholder={t('addNotes') as string} placeholderTextColor={theme.colors.textTertiary} multiline numberOfLines={3} />
              </View>
              <Button title={t('saveExpense') as string} onPress={handleSaveExpense} loading={savingExpense} size="large" style={styles.submitButton} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight, backgroundColor: theme.colors.surface },
  title: { fontSize: 24, fontWeight: '700', color: theme.colors.textPrimary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: theme.spacing.md, flexGrow: 1 },
  propertyCard: { marginBottom: theme.spacing.sm },
  propertyHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  propertyIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.md },
  propertyInfo: { flex: 1 },
  propertyName: { fontSize: 17, fontWeight: '600', color: theme.colors.textPrimary },
  propertyAddress: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  propertyMeta: { flexDirection: 'row', gap: 8, marginTop: 8 },
  metaTag: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: theme.colors.borderLight, borderRadius: 6 },
  metaText: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '500' },
  statsRow: { flexDirection: 'row', marginTop: theme.spacing.md, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.borderLight },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: theme.colors.border },
  statValue: { fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary },
  statLabel: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.sm, paddingHorizontal: 10, paddingVertical: 6, borderRadius: theme.borderRadius.full, alignSelf: 'flex-start', gap: 5 },
  statusPillText: { fontSize: 12, fontWeight: '500' },
  expandedContainer: { marginLeft: theme.spacing.md, marginBottom: theme.spacing.sm },
  snapshotCard: { marginBottom: theme.spacing.sm, backgroundColor: theme.colors.surfaceWarm },
  snapshotTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: theme.spacing.md },
  snapshotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  snapshotItem: { width: '47%' },
  snapshotLabel: { fontSize: 11, color: theme.colors.textSecondary, marginBottom: 3 },
  snapshotValue: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  actionRow: { flexDirection: 'row', gap: theme.spacing.sm },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.sm, gap: 6 },
  actionBtnAccent: { backgroundColor: theme.colors.accentLight },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
  unitCard: { marginBottom: theme.spacing.xs, padding: theme.spacing.sm },
  unitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  unitInfo: { flex: 1 },
  unitNumber: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  unitDetails: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  unitRight: { alignItems: 'flex-end' },
  unitRent: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  occupancyBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginTop: 4 },
  occupiedBadge: { backgroundColor: theme.colors.successLight },
  vacantBadge: { backgroundColor: theme.colors.errorLight },
  occupancyText: { fontSize: 10, fontWeight: '600' },
  occupiedText: { color: theme.colors.success },
  vacantText: { color: theme.colors.error },
  loadingUnits: { padding: theme.spacing.md, alignItems: 'center' },
  timelineButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: theme.spacing.sm, paddingVertical: 8, backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.sm, gap: 6 },
  timelineButtonText: { fontSize: 12, fontWeight: '600', color: theme.colors.primary },
  bottomSpacing: { height: theme.spacing.xl },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.borderRadius.xl, borderTopRightRadius: theme.borderRadius.xl, padding: theme.spacing.lg, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  modalTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary },
  formGroup: { marginBottom: theme.spacing.md },
  formRow: { flexDirection: 'row' },
  label: { fontSize: 14, fontWeight: '500', color: theme.colors.textPrimary, marginBottom: 8 },
  input: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: theme.colors.textPrimary },
  textArea: { height: 80, textAlignVertical: 'top' },
  typeOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeOption: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.borderLight },
  typeOptionSelected: { backgroundColor: theme.colors.primary },
  typeOptionText: { fontSize: 13, fontWeight: '500', color: theme.colors.textSecondary },
  typeOptionTextSelected: { color: theme.colors.textInverse },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.borderRadius.full, backgroundColor: theme.colors.borderLight, borderWidth: 1, borderColor: 'transparent' },
  categoryChipSelected: { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
  categoryChipText: { fontSize: 12, fontWeight: '500', color: theme.colors.textSecondary },
  categoryChipTextSelected: { color: theme.colors.primary, fontWeight: '700' },
  submitButton: { marginTop: theme.spacing.md, marginBottom: theme.spacing.lg },
  condoFeesHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  condoFeesHint: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 4 },

  // Health banner
  healthBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, marginBottom: theme.spacing.md },
  healthRing: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  healthRingScore: { fontSize: 16, fontWeight: '800' },
  healthTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary },
  healthStatus: { fontSize: 12, fontWeight: '600', marginTop: 1 },
  healthTrack: { height: 4, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  healthFill: { height: '100%', borderRadius: 2 },

  // Per-property score badge
  scoreTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 6 },
  scoreTagText: { fontSize: 12, fontWeight: '800' },
});
