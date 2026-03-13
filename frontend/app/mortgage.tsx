import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, theme } from '../src/components';
import { formatCurrency, formatDate } from '../src/utils/format';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Mortgage {
  id: string;
  propertyId: string;
  propertyName: string;
  lender: string;
  originalAmount: number;
  balance: number;
  interestRate: number;
  monthlyPayment: number;
  termYears: number;
  amortizationYears: number;
  startDate: string;
  maturityDate: string;
  nextPaymentDate: string;
  type: 'fixed' | 'variable';
}

interface Insurance {
  id: string;
  propertyId: string;
  propertyName: string;
  insurer: string;
  policyNumber: string;
  type: 'building' | 'liability' | 'comprehensive';
  annualPremium: number;
  monthlyPremium: number;
  coverageAmount: number;
  renewalDate: string;
  deductible: number;
  contactPhone: string;
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_MORTGAGES: Mortgage[] = [
  {
    id: 'm1',
    propertyId: 'p1',
    propertyName: 'Duplex St-Henri',
    lender: 'Banque Nationale',
    originalAmount: 485000,
    balance: 412340,
    interestRate: 5.24,
    monthlyPayment: 2890,
    termYears: 5,
    amortizationYears: 25,
    startDate: '2022-03-01',
    maturityDate: '2027-03-01',
    nextPaymentDate: '2025-04-01',
    type: 'fixed',
  },
  {
    id: 'm2',
    propertyId: 'p2',
    propertyName: 'Triplex Rosemont',
    lender: 'Desjardins',
    originalAmount: 720000,
    balance: 688500,
    interestRate: 4.89,
    monthlyPayment: 3960,
    termYears: 3,
    amortizationYears: 30,
    startDate: '2023-09-15',
    maturityDate: '2026-09-15',
    nextPaymentDate: '2025-04-15',
    type: 'fixed',
  },
];

const MOCK_INSURANCE: Insurance[] = [
  {
    id: 'i1',
    propertyId: 'p1',
    propertyName: 'Duplex St-Henri',
    insurer: 'Intact Assurance',
    policyNumber: 'PQ-2024-00481',
    type: 'comprehensive',
    annualPremium: 2160,
    monthlyPremium: 180,
    coverageAmount: 850000,
    renewalDate: '2025-10-01',
    deductible: 2500,
    contactPhone: '1-800-836-2240',
  },
  {
    id: 'i2',
    propertyId: 'p2',
    propertyName: 'Triplex Rosemont',
    insurer: 'Belairdirect',
    policyNumber: 'QC-2023-77320',
    type: 'building',
    annualPremium: 3480,
    monthlyPremium: 290,
    coverageAmount: 1200000,
    renewalDate: '2025-06-15',
    deductible: 5000,
    contactPhone: '1-888-270-3066',
  },
];

const INSURANCE_TYPE_LABELS: Record<Insurance['type'], string> = {
  building: 'Bâtiment',
  liability: 'Responsabilité',
  comprehensive: 'Tous risques',
};

const INSURANCE_TYPE_COLORS: Record<Insurance['type'], string> = {
  building: '#3B82F6',
  liability: '#F59E0B',
  comprehensive: '#10B981',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDaysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const today = new Date();
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getPaydownPct(mortgage: Mortgage): number {
  return Math.round(((mortgage.originalAmount - mortgage.balance) / mortgage.originalAmount) * 100);
}

// ─── Add/Edit Mortgage Modal ─────────────────────────────────────────────────

interface MortgageForm {
  propertyName: string;
  lender: string;
  balance: string;
  interestRate: string;
  monthlyPayment: string;
  maturityDate: string;
  nextPaymentDate: string;
  type: 'fixed' | 'variable';
}

interface InsuranceForm {
  propertyName: string;
  insurer: string;
  policyNumber: string;
  type: Insurance['type'];
  annualPremium: string;
  coverageAmount: string;
  renewalDate: string;
  deductible: string;
  contactPhone: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MortgageScreen() {
  const [mortgages, setMortgages] = useState<Mortgage[]>(MOCK_MORTGAGES);
  const [insurance, setInsurance] = useState<Insurance[]>(MOCK_INSURANCE);
  const [activeTab, setActiveTab] = useState<'mortgage' | 'insurance'>('mortgage');
  const [refreshing, setRefreshing] = useState(false);
  const [showMortgageModal, setShowMortgageModal] = useState(false);
  const [showInsuranceModal, setShowInsuranceModal] = useState(false);
  const [editingMortgage, setEditingMortgage] = useState<Mortgage | null>(null);
  const [editingInsurance, setEditingInsurance] = useState<Insurance | null>(null);

  const [mortgageForm, setMortgageForm] = useState<MortgageForm>({
    propertyName: '',
    lender: '',
    balance: '',
    interestRate: '',
    monthlyPayment: '',
    maturityDate: '',
    nextPaymentDate: '',
    type: 'fixed',
  });

  const [insuranceForm, setInsuranceForm] = useState<InsuranceForm>({
    propertyName: '',
    insurer: '',
    policyNumber: '',
    type: 'comprehensive',
    annualPremium: '',
    coverageAmount: '',
    renewalDate: '',
    deductible: '',
    contactPhone: '',
  });

  useFocusEffect(useCallback(() => {}, []));

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  // ── Totals
  const totalMonthlyMortgage = mortgages.reduce((s, m) => s + m.monthlyPayment, 0);
  const totalBalance = mortgages.reduce((s, m) => s + m.balance, 0);
  const totalMonthlyInsurance = insurance.reduce((s, i) => s + i.monthlyPremium, 0);
  const totalMonthlyFinancing = totalMonthlyMortgage + totalMonthlyInsurance;

  // ── Open mortgage modal
  const openAddMortgage = () => {
    setEditingMortgage(null);
    setMortgageForm({ propertyName: '', lender: '', balance: '', interestRate: '', monthlyPayment: '', maturityDate: '', nextPaymentDate: '', type: 'fixed' });
    setShowMortgageModal(true);
  };

  const openEditMortgage = (m: Mortgage) => {
    setEditingMortgage(m);
    setMortgageForm({
      propertyName: m.propertyName,
      lender: m.lender,
      balance: String(m.balance),
      interestRate: String(m.interestRate),
      monthlyPayment: String(m.monthlyPayment),
      maturityDate: m.maturityDate,
      nextPaymentDate: m.nextPaymentDate,
      type: m.type,
    });
    setShowMortgageModal(true);
  };

  const saveMortgage = () => {
    if (!mortgageForm.propertyName.trim() || !mortgageForm.lender.trim() || !mortgageForm.balance) {
      Alert.alert('Champs manquants', 'Remplissez l\'immeuble, le prêteur et le solde.');
      return;
    }
    const record: Mortgage = {
      id: editingMortgage?.id || `m${Date.now()}`,
      propertyId: editingMortgage?.propertyId || `p${Date.now()}`,
      propertyName: mortgageForm.propertyName,
      lender: mortgageForm.lender,
      originalAmount: editingMortgage?.originalAmount || parseFloat(mortgageForm.balance) || 0,
      balance: parseFloat(mortgageForm.balance) || 0,
      interestRate: parseFloat(mortgageForm.interestRate) || 0,
      monthlyPayment: parseFloat(mortgageForm.monthlyPayment) || 0,
      termYears: editingMortgage?.termYears || 5,
      amortizationYears: editingMortgage?.amortizationYears || 25,
      startDate: editingMortgage?.startDate || new Date().toISOString().split('T')[0],
      maturityDate: mortgageForm.maturityDate || '',
      nextPaymentDate: mortgageForm.nextPaymentDate || '',
      type: mortgageForm.type,
    };
    if (editingMortgage) {
      setMortgages(prev => prev.map(m => m.id === editingMortgage.id ? record : m));
    } else {
      setMortgages(prev => [...prev, record]);
    }
    setShowMortgageModal(false);
  };

  const deleteMortgage = (id: string) => {
    Alert.alert('Supprimer l\'hypothèque', 'Êtes-vous sûr ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => setMortgages(prev => prev.filter(m => m.id !== id)) },
    ]);
  };

  // ── Open insurance modal
  const openAddInsurance = () => {
    setEditingInsurance(null);
    setInsuranceForm({ propertyName: '', insurer: '', policyNumber: '', type: 'comprehensive', annualPremium: '', coverageAmount: '', renewalDate: '', deductible: '', contactPhone: '' });
    setShowInsuranceModal(true);
  };

  const openEditInsurance = (ins: Insurance) => {
    setEditingInsurance(ins);
    setInsuranceForm({
      propertyName: ins.propertyName,
      insurer: ins.insurer,
      policyNumber: ins.policyNumber,
      type: ins.type,
      annualPremium: String(ins.annualPremium),
      coverageAmount: String(ins.coverageAmount),
      renewalDate: ins.renewalDate,
      deductible: String(ins.deductible),
      contactPhone: ins.contactPhone,
    });
    setShowInsuranceModal(true);
  };

  const saveInsurance = () => {
    if (!insuranceForm.propertyName.trim() || !insuranceForm.insurer.trim()) {
      Alert.alert('Champs manquants', 'Remplissez l\'immeuble et l\'assureur.');
      return;
    }
    const annual = parseFloat(insuranceForm.annualPremium) || 0;
    const record: Insurance = {
      id: editingInsurance?.id || `i${Date.now()}`,
      propertyId: editingInsurance?.propertyId || `p${Date.now()}`,
      propertyName: insuranceForm.propertyName,
      insurer: insuranceForm.insurer,
      policyNumber: insuranceForm.policyNumber,
      type: insuranceForm.type,
      annualPremium: annual,
      monthlyPremium: Math.round(annual / 12),
      coverageAmount: parseFloat(insuranceForm.coverageAmount) || 0,
      renewalDate: insuranceForm.renewalDate || '',
      deductible: parseFloat(insuranceForm.deductible) || 0,
      contactPhone: insuranceForm.contactPhone,
    };
    if (editingInsurance) {
      setInsurance(prev => prev.map(i => i.id === editingInsurance.id ? record : i));
    } else {
      setInsurance(prev => [...prev, record]);
    }
    setShowInsuranceModal(false);
  };

  const deleteInsurance = (id: string) => {
    Alert.alert('Supprimer l\'assurance', 'Êtes-vous sûr ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => setInsurance(prev => prev.filter(i => i.id !== id)) },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Hypothèques & Assurances</Text>
          <Text style={styles.headerSub}>Financement par immeuble</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => activeTab === 'mortgage' ? openAddMortgage() : openAddInsurance()}
        >
          <Ionicons name="add" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Summary KPIs */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { borderLeftColor: theme.colors.primary }]}>
          <Text style={styles.kpiValue}>{formatCurrency(totalMonthlyFinancing)}</Text>
          <Text style={styles.kpiLabel}>Total/mois</Text>
        </View>
        <View style={[styles.kpiCard, { borderLeftColor: '#3B82F6' }]}>
          <Text style={styles.kpiValue}>{formatCurrency(totalBalance)}</Text>
          <Text style={styles.kpiLabel}>Solde hypoth.</Text>
        </View>
        <View style={[styles.kpiCard, { borderLeftColor: '#F59E0B' }]}>
          <Text style={styles.kpiValue}>{formatCurrency(totalMonthlyInsurance)}</Text>
          <Text style={styles.kpiLabel}>Assurances/mois</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'mortgage' && styles.tabActive]}
          onPress={() => setActiveTab('mortgage')}
        >
          <Ionicons name="home-outline" size={16} color={activeTab === 'mortgage' ? theme.colors.primary : theme.colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'mortgage' && styles.tabTextActive]}>
            Hypothèques ({mortgages.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'insurance' && styles.tabActive]}
          onPress={() => setActiveTab('insurance')}
        >
          <Ionicons name="shield-checkmark-outline" size={16} color={activeTab === 'insurance' ? theme.colors.primary : theme.colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'insurance' && styles.tabTextActive]}>
            Assurances ({insurance.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Mortgages Tab */}
        {activeTab === 'mortgage' && (
          <>
            {mortgages.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="home-outline" size={32} color={theme.colors.textTertiary} />
                <Text style={styles.emptyTitle}>Aucune hypothèque</Text>
                <Text style={styles.emptyText}>Ajoutez vos hypothèques pour suivre vos paiements</Text>
              </Card>
            ) : (
              mortgages.map(m => {
                const daysUntilPayment = getDaysUntil(m.nextPaymentDate);
                const paydownPct = getPaydownPct(m);
                const daysUntilMaturity = getDaysUntil(m.maturityDate);
                const renewalSoon = daysUntilMaturity < 180;

                return (
                  <Card key={m.id} style={styles.mortgageCard}>
                    {/* Property + Lender */}
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        <View style={[styles.lenderBadge, { backgroundColor: theme.colors.primaryLight }]}>
                          <Ionicons name="business-outline" size={14} color={theme.colors.primary} />
                        </View>
                        <View>
                          <Text style={styles.propertyName}>{m.propertyName}</Text>
                          <Text style={styles.lenderName}>{m.lender}</Text>
                        </View>
                      </View>
                      <View style={styles.cardActions}>
                        <TouchableOpacity onPress={() => openEditMortgage(m)} style={styles.actionBtn}>
                          <Ionicons name="create-outline" size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteMortgage(m.id)} style={styles.actionBtn}>
                          <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Rate + Type */}
                    <View style={styles.rateRow}>
                      <View style={styles.ratePill}>
                        <Text style={styles.ratePillText}>{m.interestRate}%</Text>
                        <Text style={styles.ratePillLabel}>{m.type === 'fixed' ? 'Fixe' : 'Variable'}</Text>
                      </View>
                      {renewalSoon && (
                        <View style={[styles.renewalPill, { backgroundColor: '#FFF6E6' }]}>
                          <Ionicons name="time-outline" size={12} color={theme.colors.warning} />
                          <Text style={[styles.renewalPillText, { color: theme.colors.warning }]}>
                            Renouvellement dans {Math.ceil(daysUntilMaturity / 30)} mois
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Balance + Payment */}
                    <View style={styles.mortgageStatsRow}>
                      <View style={styles.mortgageStat}>
                        <Text style={styles.mortgageStatValue}>{formatCurrency(m.balance)}</Text>
                        <Text style={styles.mortgageStatLabel}>Solde restant</Text>
                      </View>
                      <View style={styles.mortgageStat}>
                        <Text style={styles.mortgageStatValue}>{formatCurrency(m.monthlyPayment)}</Text>
                        <Text style={styles.mortgageStatLabel}>Paiement/mois</Text>
                      </View>
                      <View style={styles.mortgageStat}>
                        <Text style={styles.mortgageStatValue}>{paydownPct}%</Text>
                        <Text style={styles.mortgageStatLabel}>Remboursé</Text>
                      </View>
                    </View>

                    {/* Progress bar */}
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${paydownPct}%` }]} />
                    </View>

                    {/* Dates */}
                    <View style={styles.mortgageDates}>
                      <View style={styles.dateItem}>
                        <Ionicons name="calendar-outline" size={13} color={theme.colors.textTertiary} />
                        <Text style={styles.dateText}>
                          Prochain paiement: {formatDate(m.nextPaymentDate)}
                          {daysUntilPayment <= 7 && <Text style={{ color: theme.colors.warning }}> (dans {daysUntilPayment}j)</Text>}
                        </Text>
                      </View>
                      <View style={styles.dateItem}>
                        <Ionicons name="flag-outline" size={13} color={theme.colors.textTertiary} />
                        <Text style={styles.dateText}>Échéance: {formatDate(m.maturityDate)}</Text>
                      </View>
                    </View>
                  </Card>
                );
              })
            )}
          </>
        )}

        {/* ── Insurance Tab */}
        {activeTab === 'insurance' && (
          <>
            {insurance.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="shield-outline" size={32} color={theme.colors.textTertiary} />
                <Text style={styles.emptyTitle}>Aucune assurance</Text>
                <Text style={styles.emptyText}>Ajoutez vos polices d'assurance</Text>
              </Card>
            ) : (
              insurance.map(ins => {
                const daysUntilRenewal = getDaysUntil(ins.renewalDate);
                const renewalSoon = daysUntilRenewal < 60;
                const typeColor = INSURANCE_TYPE_COLORS[ins.type];

                return (
                  <Card key={ins.id} style={styles.insuranceCard}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        <View style={[styles.lenderBadge, { backgroundColor: typeColor + '20' }]}>
                          <Ionicons name="shield-checkmark-outline" size={14} color={typeColor} />
                        </View>
                        <View>
                          <Text style={styles.propertyName}>{ins.propertyName}</Text>
                          <Text style={styles.lenderName}>{ins.insurer}</Text>
                        </View>
                      </View>
                      <View style={styles.cardActions}>
                        <TouchableOpacity onPress={() => openEditInsurance(ins)} style={styles.actionBtn}>
                          <Ionicons name="create-outline" size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteInsurance(ins.id)} style={styles.actionBtn}>
                          <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Type + Policy */}
                    <View style={styles.rateRow}>
                      <View style={[styles.typePill, { backgroundColor: typeColor + '15' }]}>
                        <Text style={[styles.typePillText, { color: typeColor }]}>{INSURANCE_TYPE_LABELS[ins.type]}</Text>
                      </View>
                      <Text style={styles.policyNum}>Nº {ins.policyNumber}</Text>
                    </View>

                    {/* Stats */}
                    <View style={styles.mortgageStatsRow}>
                      <View style={styles.mortgageStat}>
                        <Text style={styles.mortgageStatValue}>{formatCurrency(ins.monthlyPremium)}</Text>
                        <Text style={styles.mortgageStatLabel}>Prime/mois</Text>
                      </View>
                      <View style={styles.mortgageStat}>
                        <Text style={styles.mortgageStatValue}>{formatCurrency(ins.annualPremium)}</Text>
                        <Text style={styles.mortgageStatLabel}>Prime annuelle</Text>
                      </View>
                      <View style={styles.mortgageStat}>
                        <Text style={styles.mortgageStatValue}>{formatCurrency(ins.coverageAmount)}</Text>
                        <Text style={styles.mortgageStatLabel}>Couverture</Text>
                      </View>
                    </View>

                    {/* Renewal */}
                    <View style={[styles.renewalRow, renewalSoon && { backgroundColor: '#FFF6E6', borderRadius: 8, padding: 8 }]}>
                      <Ionicons
                        name={renewalSoon ? 'warning-outline' : 'calendar-outline'}
                        size={14}
                        color={renewalSoon ? theme.colors.warning : theme.colors.textTertiary}
                      />
                      <Text style={[styles.renewalText, renewalSoon && { color: theme.colors.warning, fontWeight: '600' }]}>
                        Renouvellement: {formatDate(ins.renewalDate)}
                        {renewalSoon && ` (dans ${daysUntilRenewal}j)`}
                      </Text>
                    </View>

                    {/* Deductible + Contact */}
                    <View style={styles.insuranceFooter}>
                      <Text style={styles.deductibleText}>Franchise: {formatCurrency(ins.deductible)}</Text>
                      {ins.contactPhone ? (
                        <Text style={styles.contactText}>📞 {ins.contactPhone}</Text>
                      ) : null}
                    </View>
                  </Card>
                );
              })
            )}
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Add/Edit Mortgage Modal */}
      <Modal visible={showMortgageModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowMortgageModal(false)}>
                <Text style={styles.modalCancel}>Annuler</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{editingMortgage ? 'Modifier' : 'Ajouter'} une hypothèque</Text>
              <TouchableOpacity onPress={saveMortgage}>
                <Text style={styles.modalSave}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              {[
                { label: 'Immeuble *', key: 'propertyName', placeholder: 'Ex. Duplex St-Henri' },
                { label: 'Prêteur *', key: 'lender', placeholder: 'Ex. Banque Nationale' },
                { label: 'Solde restant ($) *', key: 'balance', placeholder: 'Ex. 412000', numeric: true },
                { label: 'Taux d\'intérêt (%)', key: 'interestRate', placeholder: 'Ex. 5.24', numeric: true },
                { label: 'Paiement mensuel ($)', key: 'monthlyPayment', placeholder: 'Ex. 2890', numeric: true },
                { label: 'Date d\'échéance (YYYY-MM-DD)', key: 'maturityDate', placeholder: 'Ex. 2027-03-01' },
                { label: 'Prochain paiement (YYYY-MM-DD)', key: 'nextPaymentDate', placeholder: 'Ex. 2025-04-01' },
              ].map(field => (
                <View key={field.key} style={styles.formGroup}>
                  <Text style={styles.formLabel}>{field.label}</Text>
                  <TextInput
                    style={styles.formInput}
                    value={(mortgageForm as any)[field.key]}
                    onChangeText={v => setMortgageForm(prev => ({ ...prev, [field.key]: v }))}
                    placeholder={field.placeholder}
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType={field.numeric ? 'decimal-pad' : 'default'}
                  />
                </View>
              ))}
              {/* Type toggle */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Type de taux</Text>
                <View style={styles.toggleRow}>
                  {(['fixed', 'variable'] as const).map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.toggleBtn, mortgageForm.type === t && styles.toggleBtnActive]}
                      onPress={() => setMortgageForm(prev => ({ ...prev, type: t }))}
                    >
                      <Text style={[styles.toggleBtnText, mortgageForm.type === t && styles.toggleBtnTextActive]}>
                        {t === 'fixed' ? 'Fixe' : 'Variable'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Add/Edit Insurance Modal */}
      <Modal visible={showInsuranceModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowInsuranceModal(false)}>
                <Text style={styles.modalCancel}>Annuler</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{editingInsurance ? 'Modifier' : 'Ajouter'} une assurance</Text>
              <TouchableOpacity onPress={saveInsurance}>
                <Text style={styles.modalSave}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              {[
                { label: 'Immeuble *', key: 'propertyName', placeholder: 'Ex. Duplex St-Henri' },
                { label: 'Assureur *', key: 'insurer', placeholder: 'Ex. Intact Assurance' },
                { label: 'Numéro de police', key: 'policyNumber', placeholder: 'Ex. PQ-2024-00481' },
                { label: 'Prime annuelle ($)', key: 'annualPremium', placeholder: 'Ex. 2160', numeric: true },
                { label: 'Montant de couverture ($)', key: 'coverageAmount', placeholder: 'Ex. 850000', numeric: true },
                { label: 'Date de renouvellement (YYYY-MM-DD)', key: 'renewalDate', placeholder: 'Ex. 2025-10-01' },
                { label: 'Franchise ($)', key: 'deductible', placeholder: 'Ex. 2500', numeric: true },
                { label: 'Téléphone de contact', key: 'contactPhone', placeholder: 'Ex. 1-800-836-2240' },
              ].map(field => (
                <View key={field.key} style={styles.formGroup}>
                  <Text style={styles.formLabel}>{field.label}</Text>
                  <TextInput
                    style={styles.formInput}
                    value={(insuranceForm as any)[field.key]}
                    onChangeText={v => setInsuranceForm(prev => ({ ...prev, [field.key]: v }))}
                    placeholder={field.placeholder}
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType={field.numeric ? 'decimal-pad' : 'default'}
                  />
                </View>
              ))}
              {/* Insurance type */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Type d'assurance</Text>
                <View style={styles.toggleRow}>
                  {(['building', 'liability', 'comprehensive'] as Insurance['type'][]).map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.toggleBtn, insuranceForm.type === t && styles.toggleBtnActive]}
                      onPress={() => setInsuranceForm(prev => ({ ...prev, type: t }))}
                    >
                      <Text style={[styles.toggleBtnText, insuranceForm.type === t && styles.toggleBtnTextActive]}>
                        {INSURANCE_TYPE_LABELS[t]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
  headerSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },

  kpiRow: { flexDirection: 'row', gap: 8, padding: theme.spacing.md, paddingBottom: 0, backgroundColor: theme.colors.surface },
  kpiCard: { flex: 1, backgroundColor: theme.colors.background, borderRadius: 10, padding: 10, borderLeftWidth: 3 },
  kpiValue: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  kpiLabel: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 2 },

  tabRow: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight, paddingHorizontal: theme.spacing.md },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: theme.colors.primary },
  tabText: { fontSize: 13, fontWeight: '500', color: theme.colors.textSecondary },
  tabTextActive: { color: theme.colors.primary, fontWeight: '600' },

  scrollContent: { padding: theme.spacing.md },

  mortgageCard: { marginBottom: theme.spacing.sm },
  insuranceCard: { marginBottom: theme.spacing.sm },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: theme.spacing.sm },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  lenderBadge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  propertyName: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  lenderName: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 6 },

  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: theme.spacing.sm },
  ratePill: { flexDirection: 'row', alignItems: 'baseline', gap: 4, backgroundColor: theme.colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  ratePillText: { fontSize: 15, fontWeight: '700', color: theme.colors.primary },
  ratePillLabel: { fontSize: 11, color: theme.colors.primary },
  renewalPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  renewalPillText: { fontSize: 11, fontWeight: '600' },

  typePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typePillText: { fontSize: 12, fontWeight: '600' },
  policyNum: { fontSize: 12, color: theme.colors.textTertiary },

  mortgageStatsRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  mortgageStat: { flex: 1, alignItems: 'center', backgroundColor: theme.colors.background, borderRadius: 8, padding: 8 },
  mortgageStatValue: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary },
  mortgageStatLabel: { fontSize: 10, color: theme.colors.textTertiary, marginTop: 2, textAlign: 'center' },

  progressBarBg: { height: 6, backgroundColor: theme.colors.borderLight, borderRadius: 3, marginBottom: theme.spacing.sm },
  progressBarFill: { height: 6, backgroundColor: theme.colors.primary, borderRadius: 3 },

  mortgageDates: { gap: 4 },
  dateItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 12, color: theme.colors.textTertiary },

  renewalRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: theme.spacing.xs },
  renewalText: { fontSize: 12, color: theme.colors.textTertiary },
  insuranceFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing.sm, paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.borderLight },
  deductibleText: { fontSize: 12, color: theme.colors.textSecondary },
  contactText: { fontSize: 12, color: theme.colors.textSecondary },

  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary },
  emptyText: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: theme.colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  modalCancel: { fontSize: 15, color: theme.colors.textSecondary },
  modalTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  modalSave: { fontSize: 15, fontWeight: '700', color: theme.colors.primary },
  modalBody: { padding: theme.spacing.md },
  formGroup: { marginBottom: theme.spacing.md },
  formLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 6 },
  formInput: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, padding: theme.spacing.sm, fontSize: 15, color: theme.colors.textPrimary, backgroundColor: theme.colors.surface },
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  toggleBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  toggleBtnTextActive: { color: '#FFF' },
});
