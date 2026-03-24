import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  RefreshControl,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, theme } from '../src/components';
import { formatCurrency, formatDate } from '../src/utils/format';
import { api } from '../src/services/api';
import { Expense, EXPENSE_CATEGORIES } from '../src/types';

// ─── Constants ─────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  maintenance: '#F59E0B',
  insurance:   '#3B82F6',
  property_tax:'#8B5CF6',
  utilities:   '#10B981',
  mortgage:    '#EC4899',
  cleaning:    '#14B8A6',
  renovation:  '#6366F1',
  other:       '#9CA3AF',
};

const CATEGORY_ICONS: Record<string, string> = {
  maintenance:  'construct-outline',
  insurance:    'shield-outline',
  property_tax: 'business-outline',
  utilities:    'flash-outline',
  mortgage:     'home-outline',
  cleaning:     'sparkles-outline',
  renovation:   'hammer-outline',
  other:        'ellipsis-horizontal-outline',
};

const PAYMENT_METHODS_FR: Record<string, string> = {
  interac: 'Virement',
  cheque:  'Chèque',
  cash:    'Espèces',
  debit:   'Carte débit',
  other:   'Autre',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getCategoryLabel(value: string): string {
  const found = EXPENSE_CATEGORIES.find(c => c.value === value);
  return found ? found.label : value;
}

function getCurrentMonthYear(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(monthYear: string): string {
  if (!monthYear) return '';
  const [year, month] = monthYear.split('-');
  const months = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];
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

// ─── Component ──────────────────────────────────────────────────────────────

export default function ExpensesScreen() {
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expenses, setExpenses]     = useState<(Expense & { property_name?: string })[]>([]);
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);

  // Filters
  const [selectedMonth, setSelectedMonth]   = useState(getCurrentMonthYear());
  const [selectedPropId, setSelectedPropId] = useState<string>('');

  // Add modal
  const [modalVisible, setModalVisible]     = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [form, setForm] = useState({
    title: '',
    amount: '',
    category: 'maintenance',
    expense_date: new Date().toISOString().split('T')[0],
    property_id: '',
    notes: '',
  });

  // Category picker modal
  const [catPickerVisible, setCatPickerVisible] = useState(false);
  // Property picker modal
  const [propPickerVisible, setPropPickerVisible] = useState(false);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadData = async () => {
    try {
      const [expData, propData] = await Promise.all([
        api.getExpenses(selectedPropId || undefined, selectedMonth || undefined),
        api.getProperties(),
      ]);
      setExpenses(expData);
      setProperties(propData.map((p: any) => ({ id: p.id, name: p.name })));
    } catch (err) {
      console.error('Error loading expenses:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, [selectedMonth, selectedPropId]));
  const onRefresh = () => { setRefreshing(true); loadData(); };

  // ── Stats ─────────────────────────────────────────────────────────────────

  const totalAmount = useMemo(
    () => expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0),
    [expenses]
  );

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => {
      map[e.category] = (map[e.category] ?? 0) + e.amount;
    });
    return map;
  }, [expenses]);

  // ── Form handlers ─────────────────────────────────────────────────────────

  const openAdd = () => {
    setForm({
      title: '',
      amount: '',
      category: 'maintenance',
      expense_date: new Date().toISOString().split('T')[0],
      property_id: properties[0]?.id ?? '',
      notes: '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { Alert.alert('Titre requis'); return; }
    if (!form.amount || isNaN(parseFloat(form.amount))) { Alert.alert('Montant invalide'); return; }
    if (!form.property_id) { Alert.alert('Sélectionnez une propriété'); return; }

    setSaving(true);
    try {
      await api.createExpense({
        title:        form.title.trim(),
        amount:       parseFloat(form.amount),
        category:     form.category,
        expense_date: form.expense_date,
        property_id:  form.property_id,
        notes:        form.notes.trim() || undefined,
      });
      setModalVisible(false);
      loadData();
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.detail ?? 'Impossible d\'ajouter la dépense.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert(
      'Supprimer la dépense',
      `Supprimer "${title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteExpense(id);
              loadData();
            } catch {
              Alert.alert('Erreur', 'Impossible de supprimer.');
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
        <Text style={styles.headerTitle}>Dépenses</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Month navigator */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => setSelectedMonth(getPrevMonth(selectedMonth))}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{formatMonthLabel(selectedMonth)}</Text>
        <TouchableOpacity onPress={() => setSelectedMonth(getNextMonth(selectedMonth))}>
          <Ionicons name="chevron-forward" size={22} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary card */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>Total dépenses</Text>
              <Text style={styles.summaryAmount}>{formatCurrency(totalAmount)}</Text>
            </View>
            <View style={[styles.summaryIcon, { backgroundColor: '#EF444418' }]}>
              <Ionicons name="trending-down-outline" size={24} color="#EF4444" />
            </View>
          </View>
          <Text style={styles.summaryCount}>{expenses.length} dépense{expenses.length !== 1 ? 's' : ''} ce mois</Text>
        </Card>

        {/* Category breakdown (if there are expenses) */}
        {expenses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Par catégorie</Text>
            <Card>
              {Object.entries(byCategory).map(([cat, total], idx) => (
                <View key={cat}>
                  {idx > 0 && <View style={styles.divider} />}
                  <View style={styles.catRow}>
                    <View style={[styles.catIcon, { backgroundColor: (CATEGORY_COLORS[cat] ?? '#9CA3AF') + '18' }]}>
                      <Ionicons
                        name={(CATEGORY_ICONS[cat] ?? 'ellipsis-horizontal-outline') as any}
                        size={16}
                        color={CATEGORY_COLORS[cat] ?? '#9CA3AF'}
                      />
                    </View>
                    <Text style={styles.catName}>{getCategoryLabel(cat)}</Text>
                    <Text style={styles.catAmount}>{formatCurrency(total)}</Text>
                  </View>
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* Property filter */}
        {properties.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, !selectedPropId && styles.filterChipActive]}
              onPress={() => setSelectedPropId('')}
            >
              <Text style={[styles.filterChipText, !selectedPropId && styles.filterChipTextActive]}>Toutes</Text>
            </TouchableOpacity>
            {properties.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[styles.filterChip, selectedPropId === p.id && styles.filterChipActive]}
                onPress={() => setSelectedPropId(p.id)}
              >
                <Text style={[styles.filterChipText, selectedPropId === p.id && styles.filterChipTextActive]}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Expenses list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transactions</Text>
          {expenses.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={32} color={theme.colors.textTertiary} />
              <Text style={styles.emptyTitle}>Aucune dépense</Text>
              <Text style={styles.emptyText}>Ajoutez vos dépenses pour suivre vos finances.</Text>
            </Card>
          ) : (
            expenses.map(expense => {
              const color = CATEGORY_COLORS[expense.category] ?? '#9CA3AF';
              const icon  = CATEGORY_ICONS[expense.category]  ?? 'ellipsis-horizontal-outline';
              return (
                <Card key={expense.id} style={styles.expenseCard}>
                  <View style={styles.expenseRow}>
                    <View style={[styles.expenseIcon, { backgroundColor: color + '18' }]}>
                      <Ionicons name={icon as any} size={20} color={color} />
                    </View>
                    <View style={styles.expenseInfo}>
                      <Text style={styles.expenseTitle}>{expense.title}</Text>
                      <Text style={styles.expenseMeta}>
                        {getCategoryLabel(expense.category)} · {formatDate(expense.expense_date)}
                      </Text>
                      {expense.property_name && (
                        <Text style={styles.expenseProp}>{expense.property_name}</Text>
                      )}
                    </View>
                    <View style={styles.expenseRight}>
                      <Text style={styles.expenseAmount}>-{formatCurrency(expense.amount)}</Text>
                      <TouchableOpacity
                        onPress={() => handleDelete(expense.id, expense.title)}
                        style={styles.deleteBtn}
                      >
                        <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  {expense.notes ? (
                    <Text style={styles.expenseNotes}>{expense.notes}</Text>
                  ) : null}
                </Card>
              );
            })
          )}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* ── Add Expense Modal ────────────────────────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" transparent presentationStyle="overFullScreen">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle dépense</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Title */}
              <Text style={styles.fieldLabel}>Titre *</Text>
              <View style={styles.inputRow}>
                <Ionicons name="create-outline" size={18} color={theme.colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={form.title}
                  onChangeText={v => setForm(f => ({ ...f, title: v }))}
                  placeholder="ex. Réparation toiture"
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </View>

              {/* Amount */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Montant ($) *</Text>
              <View style={styles.inputRow}>
                <Ionicons name="cash-outline" size={18} color={theme.colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={form.amount}
                  onChangeText={v => setForm(f => ({ ...f, amount: v }))}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Category */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Catégorie *</Text>
              <TouchableOpacity style={styles.pickerRow} onPress={() => setCatPickerVisible(true)}>
                <Ionicons name="pricetag-outline" size={18} color={theme.colors.textTertiary} style={styles.inputIcon} />
                <Text style={styles.pickerText}>{getCategoryLabel(form.category)}</Text>
                <Ionicons name="chevron-down" size={18} color={theme.colors.textTertiary} />
              </TouchableOpacity>

              {/* Property */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Propriété *</Text>
              <TouchableOpacity style={styles.pickerRow} onPress={() => setPropPickerVisible(true)}>
                <Ionicons name="home-outline" size={18} color={theme.colors.textTertiary} style={styles.inputIcon} />
                <Text style={styles.pickerText}>
                  {properties.find(p => p.id === form.property_id)?.name ?? 'Sélectionner…'}
                </Text>
                <Ionicons name="chevron-down" size={18} color={theme.colors.textTertiary} />
              </TouchableOpacity>

              {/* Date */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Date *</Text>
              <View style={styles.inputRow}>
                <Ionicons name="calendar-outline" size={18} color={theme.colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={form.expense_date}
                  onChangeText={v => setForm(f => ({ ...f, expense_date: v }))}
                  placeholder="AAAA-MM-JJ"
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </View>

              {/* Notes */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Notes</Text>
              <View style={[styles.inputRow, { minHeight: 80, alignItems: 'flex-start', paddingTop: 12 }]}>
                <Ionicons name="document-text-outline" size={18} color={theme.colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { textAlignVertical: 'top' }]}
                  value={form.notes}
                  onChangeText={v => setForm(f => ({ ...f, notes: v }))}
                  placeholder="Détails optionnels…"
                  placeholderTextColor={theme.colors.textTertiary}
                  multiline
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#FFF" />
                    <Text style={styles.saveBtnText}>Enregistrer</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={{ height: 32 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Category picker */}
      <Modal visible={catPickerVisible} animationType="slide" transparent presentationStyle="overFullScreen">
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setCatPickerVisible(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerSheetTitle}>Catégorie</Text>
            {EXPENSE_CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.value}
                style={styles.pickerOption}
                onPress={() => { setForm(f => ({ ...f, category: cat.value })); setCatPickerVisible(false); }}
              >
                <View style={[styles.catIcon, { backgroundColor: (CATEGORY_COLORS[cat.value] ?? '#9CA3AF') + '18' }]}>
                  <Ionicons
                    name={(CATEGORY_ICONS[cat.value] ?? 'ellipsis-horizontal-outline') as any}
                    size={18}
                    color={CATEGORY_COLORS[cat.value] ?? '#9CA3AF'}
                  />
                </View>
                <Text style={styles.pickerOptionText}>{cat.label}</Text>
                {form.category === cat.value && (
                  <Ionicons name="checkmark" size={18} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Property picker */}
      <Modal visible={propPickerVisible} animationType="slide" transparent presentationStyle="overFullScreen">
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setPropPickerVisible(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerSheetTitle}>Propriété</Text>
            {properties.map(prop => (
              <TouchableOpacity
                key={prop.id}
                style={styles.pickerOption}
                onPress={() => { setForm(f => ({ ...f, property_id: prop.id })); setPropPickerVisible(false); }}
              >
                <View style={[styles.catIcon, { backgroundColor: theme.colors.primary + '18' }]}>
                  <Ionicons name="home-outline" size={18} color={theme.colors.primary} />
                </View>
                <Text style={styles.pickerOptionText}>{prop.name}</Text>
                {form.property_id === prop.id && (
                  <Ionicons name="checkmark" size={18} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer:{ flex: 1, justifyContent: 'center', alignItems: 'center' },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight, backgroundColor: theme.colors.surface },
  backBtn:     { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
  addBtn:      { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },

  monthNav:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.lg, paddingVertical: 12, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  monthLabel:  { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary, minWidth: 100, textAlign: 'center' },

  scrollContent: { padding: theme.spacing.md },

  summaryCard: { marginBottom: theme.spacing.md },
  summaryRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  summaryLabel:{ fontSize: 13, color: theme.colors.textSecondary },
  summaryAmount:{ fontSize: 28, fontWeight: '800', color: '#EF4444', marginTop: 2 },
  summaryIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  summaryCount:{ fontSize: 12, color: theme.colors.textTertiary },

  section:      { marginBottom: theme.spacing.lg },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: theme.spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },

  divider: { height: 1, backgroundColor: theme.colors.borderLight, marginVertical: 4 },

  catRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  catIcon:  { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  catName:  { flex: 1, fontSize: 14, color: theme.colors.textPrimary },
  catAmount:{ fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },

  filterRow: { marginBottom: theme.spacing.md },
  filterChip:{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, marginRight: 8 },
  filterChipActive:{ backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterChipText:{ fontSize: 13, color: theme.colors.textSecondary },
  filterChipTextActive:{ color: '#FFF', fontWeight: '600' },

  emptyCard:  { alignItems: 'center', paddingVertical: theme.spacing.xl, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary },
  emptyText:  { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center' },

  expenseCard:  { marginBottom: theme.spacing.sm },
  expenseRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  expenseIcon:  { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  expenseInfo:  { flex: 1 },
  expenseTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  expenseMeta:  { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  expenseProp:  { fontSize: 12, color: theme.colors.textTertiary, marginTop: 1 },
  expenseRight: { alignItems: 'flex-end', gap: 4 },
  expenseAmount:{ fontSize: 15, fontWeight: '700', color: '#EF4444' },
  deleteBtn:    { padding: 4 },
  expenseNotes: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.borderLight },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet:   { backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: theme.spacing.lg, maxHeight: '90%' },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  modalTitle:   { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 8 },
  inputRow:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.background },
  inputIcon:  { paddingHorizontal: 12 },
  textInput:  { flex: 1, height: 48, fontSize: 15, color: theme.colors.textPrimary },

  pickerRow:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.background, height: 48, paddingRight: 12 },
  pickerText: { flex: 1, fontSize: 15, color: theme.colors.textPrimary },

  saveBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary, paddingVertical: 15, borderRadius: theme.borderRadius.md, marginTop: 24 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },

  // Picker modal
  pickerOverlay:    { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  pickerSheet:      { backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: theme.spacing.lg, paddingBottom: 40 },
  pickerSheetTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 16 },
  pickerOption:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  pickerOptionText: { flex: 1, fontSize: 15, color: theme.colors.textPrimary },

  bottomSpacing: { height: theme.spacing.xxl },
});
