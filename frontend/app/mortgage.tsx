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

// ─── Types ─────────────────────────────────────────────────────────────────

type MortgageType = 'fixed' | 'variable';
type InsuranceType = 'building' | 'liability' | 'comprehensive';

interface Mortgage {
  id: string;
  property_name: string;
  lender: string;
  original_amount: number;
  balance: number;
  interest_rate: number;
  monthly_payment: number;
  term_years: number;
  amortization_years: number;
  start_date: string;
  maturity_date: string;
  next_payment_date: string;
  type: MortgageType;
}

interface Insurance {
  id: string;
  property_name: string;
  insurer: string;
  policy_number: string;
  type: InsuranceType;
  annual_premium: number;
  coverage_amount: number;
  renewal_date: string;
  deductible: number;
  contact_phone: string;
}

const INSURANCE_TYPE_LABELS: Record<InsuranceType, string> = {
  building: 'Bâtiment',
  liability: 'Responsabilité',
  comprehensive: 'Tous risques',
};

const INSURANCE_TYPE_COLORS: Record<InsuranceType, string> = {
  building: '#3B82F6',
  liability: '#F59E0B',
  comprehensive: '#10B981',
};

// ─── Form types ──────────────────────────────────────────────────────────────

interface MortgageForm {
  property_name: string;
  lender: string;
  balance: string;
  interest_rate: string;
  monthly_payment: string;
  maturity_date: string;
  next_payment_date: string;
  type: MortgageType;
}

interface InsuranceForm {
  property_name: string;
  insurer: string;
  policy_number: string;
  type: InsuranceType;
  annual_premium: string;
  coverage_amount: string;
  renewal_date: string;
  deductible: string;
  contact_phone: string;
}

const BLANK_MORTGAGE_FORM: MortgageForm = {
  property_name: '', lender: '', balance: '', interest_rate: '',
  monthly_payment: '', maturity_date: '', next_payment_date: '', type: 'fixed',
};

const BLANK_INSURANCE_FORM: InsuranceForm = {
  property_name: '', insurer: '', policy_number: '', type: 'comprehensive',
  annual_premium: '', coverage_amount: '', renewal_date: '', deductible: '', contact_phone: '',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDaysUntil(dateStr: string): number {
  if (!dateStr) return 999;
  const target = new Date(dateStr);
  const today = new Date();
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getPaydownPct(m: Mortgage): number {
  if (!m.original_amount) return 0;
  return Math.round(((m.original_amount - m.balance) / m.original_amount) * 100);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MortgageScreen() {
  const [mortgages, setMortgages] = useState<Mortgage[]>([]);
  const [insurance, setInsurance] = useState<Insurance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'mortgage' | 'insurance' | 'calculator'>('mortgage');
  const [showMortgageModal, setShowMortgageModal] = useState(false);
  const [showInsuranceModal, setShowInsuranceModal] = useState(false);
  const [editingMortgage, setEditingMortgage] = useState<Mortgage | null>(null);
  const [editingInsurance, setEditingInsurance] = useState<Insurance | null>(null);
  const [mortgageForm, setMortgageForm] = useState<MortgageForm>(BLANK_MORTGAGE_FORM);
  const [insuranceForm, setInsuranceForm] = useState<InsuranceForm>(BLANK_INSURANCE_FORM);

  // ── Calculator state
  const [calcPrice, setCalcPrice] = useState('500000');
  const [calcDown, setCalcDown] = useState('20');
  const [calcRate, setCalcRate] = useState('5.50');
  const [calcAmort, setCalcAmort] = useState('25');
  const [calcIncome, setCalcIncome] = useState('3000');

  useFocusEffect(useCallback(() => {
    loadAll();
  }, []));

  const loadAll = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [mortData, insData] = await Promise.all([
        api.getMortgages(),
        api.getInsurance(),
      ]);
      setMortgages(mortData as Mortgage[]);
      setInsurance(insData as Insurance[]);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les données.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ── Calculator
  const calcResults = useMemo(() => {
    const price = parseFloat(calcPrice.replace(/\s/g, '')) || 0;
    const downPct = parseFloat(calcDown) || 0;
    const annualRate = parseFloat(calcRate) || 0;
    const amortYears = parseInt(calcAmort) || 25;
    const monthlyIncome = parseFloat(calcIncome) || 0;
    if (price === 0) return null;

    const downAmount = price * (downPct / 100);
    const loanBeforeCMHC = price - downAmount;
    let cmhcRate = 0;
    if (downPct >= 5 && downPct < 10) cmhcRate = 0.04;
    else if (downPct >= 10 && downPct < 15) cmhcRate = 0.031;
    else if (downPct >= 15 && downPct < 20) cmhcRate = 0.028;
    const cmhcPremium = cmhcRate > 0 ? loanBeforeCMHC * cmhcRate : 0;
    const totalLoan = loanBeforeCMHC + cmhcPremium;
    const r = annualRate / 100 / 12;
    const n = amortYears * 12;
    const monthlyPayment = r === 0 ? totalLoan / n : totalLoan * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const rStress = (annualRate + 2) / 100 / 12;
    const stressPayment = rStress === 0 ? totalLoan / n : totalLoan * (rStress * Math.pow(1 + rStress, n)) / (Math.pow(1 + rStress, n) - 1);
    const annualIncome = monthlyIncome * 12;
    const noi = annualIncome - monthlyPayment * 12;
    const capRate = price > 0 ? (noi / price) * 100 : 0;
    const monthlyCashFlow = monthlyIncome - monthlyPayment;
    const grm = annualIncome > 0 ? price / annualIncome : 0;

    return {
      downAmount, loanBeforeCMHC, cmhcPremium, cmhcRate, totalLoan,
      monthlyPayment, stressPayment, capRate, monthlyCashFlow, grm,
      downPct, needsCMHC: downPct >= 5 && downPct < 20, eligible: downPct >= 5,
    };
  }, [calcPrice, calcDown, calcRate, calcAmort, calcIncome]);

  // ── Totals
  const totalMonthlyMortgage = mortgages.reduce((s, m) => s + m.monthly_payment, 0);
  const totalBalance = mortgages.reduce((s, m) => s + m.balance, 0);
  const totalMonthlyInsurance = insurance.reduce((s, i) => s + Math.round(i.annual_premium / 12), 0);
  const totalMonthlyFinancing = totalMonthlyMortgage + totalMonthlyInsurance;

  // ── Mortgage CRUD
  const openAddMortgage = () => {
    setEditingMortgage(null);
    setMortgageForm(BLANK_MORTGAGE_FORM);
    setShowMortgageModal(true);
  };

  const openEditMortgage = (m: Mortgage) => {
    setEditingMortgage(m);
    setMortgageForm({
      property_name: m.property_name,
      lender: m.lender,
      balance: String(m.balance),
      interest_rate: String(m.interest_rate),
      monthly_payment: String(m.monthly_payment),
      maturity_date: m.maturity_date || '',
      next_payment_date: m.next_payment_date || '',
      type: m.type,
    });
    setShowMortgageModal(true);
  };

  const saveMortgage = async () => {
    if (!mortgageForm.property_name.trim() || !mortgageForm.lender.trim() || !mortgageForm.balance) {
      Alert.alert('Champs manquants', 'Remplissez l\'immeuble, le prêteur et le solde.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        property_name: mortgageForm.property_name,
        lender: mortgageForm.lender,
        original_amount: editingMortgage?.original_amount || parseFloat(mortgageForm.balance) || 0,
        balance: parseFloat(mortgageForm.balance) || 0,
        interest_rate: parseFloat(mortgageForm.interest_rate) || 0,
        monthly_payment: parseFloat(mortgageForm.monthly_payment) || 0,
        maturity_date: mortgageForm.maturity_date || null,
        next_payment_date: mortgageForm.next_payment_date || null,
        type: mortgageForm.type,
      };
      if (editingMortgage) {
        await api.updateMortgage(editingMortgage.id, payload);
        setMortgages(prev => prev.map(m => m.id === editingMortgage.id ? { ...m, ...payload } : m));
      } else {
        const created = await api.createMortgage(payload);
        setMortgages(prev => [...prev, created as Mortgage]);
      }
      setShowMortgageModal(false);
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder l\'hypothèque.');
    } finally {
      setSaving(false);
    }
  };

  const deleteMortgage = (id: string) => {
    Alert.alert('Supprimer l\'hypothèque', 'Êtes-vous sûr ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try {
          await api.deleteMortgage(id);
          setMortgages(prev => prev.filter(m => m.id !== id));
        } catch {
          Alert.alert('Erreur', 'Impossible de supprimer.');
        }
      }},
    ]);
  };

  // ── Insurance CRUD
  const openAddInsurance = () => {
    setEditingInsurance(null);
    setInsuranceForm(BLANK_INSURANCE_FORM);
    setShowInsuranceModal(true);
  };

  const openEditInsurance = (ins: Insurance) => {
    setEditingInsurance(ins);
    setInsuranceForm({
      property_name: ins.property_name,
      insurer: ins.insurer,
      policy_number: ins.policy_number,
      type: ins.type,
      annual_premium: String(ins.annual_premium),
      coverage_amount: String(ins.coverage_amount),
      renewal_date: ins.renewal_date || '',
      deductible: String(ins.deductible),
      contact_phone: ins.contact_phone,
    });
    setShowInsuranceModal(true);
  };

  const saveInsurance = async () => {
    if (!insuranceForm.property_name.trim() || !insuranceForm.insurer.trim()) {
      Alert.alert('Champs manquants', 'Remplissez l\'immeuble et l\'assureur.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        property_name: insuranceForm.property_name,
        insurer: insuranceForm.insurer,
        policy_number: insuranceForm.policy_number,
        type: insuranceForm.type,
        annual_premium: parseFloat(insuranceForm.annual_premium) || 0,
        coverage_amount: parseFloat(insuranceForm.coverage_amount) || 0,
        renewal_date: insuranceForm.renewal_date || null,
        deductible: parseFloat(insuranceForm.deductible) || 0,
        contact_phone: insuranceForm.contact_phone,
      };
      if (editingInsurance) {
        await api.updateInsurance(editingInsurance.id, payload);
        setInsurance(prev => prev.map(i => i.id === editingInsurance.id ? { ...i, ...payload } : i));
      } else {
        const created = await api.createInsurance(payload);
        setInsurance(prev => [...prev, created as Insurance]);
      }
      setShowInsuranceModal(false);
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder l\'assurance.');
    } finally {
      setSaving(false);
    }
  };

  const deleteInsurance = (id: string) => {
    Alert.alert('Supprimer l\'assurance', 'Êtes-vous sûr ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try {
          await api.deleteInsurance(id);
          setInsurance(prev => prev.filter(i => i.id !== id));
        } catch {
          Alert.alert('Erreur', 'Impossible de supprimer.');
        }
      }},
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Hypothèques & Assurances</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
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
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Hypothèques & Assurances</Text>
          <Text style={styles.headerSub}>Financement par immeuble</Text>
        </View>
        {activeTab !== 'calculator' ? (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => activeTab === 'mortgage' ? openAddMortgage() : openAddInsurance()}
          >
            <Ionicons name="add" size={22} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
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
        {([
          { key: 'mortgage', icon: 'home-outline', label: `Hypothèques (${mortgages.length})` },
          { key: 'insurance', icon: 'shield-checkmark-outline', label: `Assurances (${insurance.length})` },
          { key: 'calculator', icon: 'calculator-outline', label: 'Simulateur' },
        ] as const).map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons name={tab.icon} size={16} color={activeTab === tab.key ? theme.colors.primary : theme.colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor={theme.colors.primary} />}
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
                const daysUntilPayment = getDaysUntil(m.next_payment_date);
                const paydownPct = getPaydownPct(m);
                const daysUntilMaturity = getDaysUntil(m.maturity_date);
                const renewalSoon = daysUntilMaturity < 180;
                return (
                  <Card key={m.id} style={styles.mortgageCard}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        <View style={[styles.lenderBadge, { backgroundColor: theme.colors.primaryLight }]}>
                          <Ionicons name="business-outline" size={14} color={theme.colors.primary} />
                        </View>
                        <View>
                          <Text style={styles.propertyName}>{m.property_name}</Text>
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

                    <View style={styles.rateRow}>
                      <View style={styles.ratePill}>
                        <Text style={styles.ratePillText}>{m.interest_rate}%</Text>
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

                    <View style={styles.mortgageStatsRow}>
                      <View style={styles.mortgageStat}>
                        <Text style={styles.mortgageStatValue}>{formatCurrency(m.balance)}</Text>
                        <Text style={styles.mortgageStatLabel}>Solde restant</Text>
                      </View>
                      <View style={styles.mortgageStat}>
                        <Text style={styles.mortgageStatValue}>{formatCurrency(m.monthly_payment)}</Text>
                        <Text style={styles.mortgageStatLabel}>Paiement/mois</Text>
                      </View>
                      <View style={styles.mortgageStat}>
                        <Text style={styles.mortgageStatValue}>{paydownPct}%</Text>
                        <Text style={styles.mortgageStatLabel}>Remboursé</Text>
                      </View>
                    </View>

                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${paydownPct}%` as any }]} />
                    </View>

                    <View style={styles.mortgageDates}>
                      <View style={styles.dateItem}>
                        <Ionicons name="calendar-outline" size={13} color={theme.colors.textTertiary} />
                        <Text style={styles.dateText}>
                          Prochain paiement: {formatDate(m.next_payment_date)}
                          {daysUntilPayment <= 7 && <Text style={{ color: theme.colors.warning }}> (dans {daysUntilPayment}j)</Text>}
                        </Text>
                      </View>
                      <View style={styles.dateItem}>
                        <Ionicons name="flag-outline" size={13} color={theme.colors.textTertiary} />
                        <Text style={styles.dateText}>Échéance: {formatDate(m.maturity_date)}</Text>
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
                const daysUntilRenewal = getDaysUntil(ins.renewal_date);
                const renewalSoon = daysUntilRenewal < 60;
                const typeColor = INSURANCE_TYPE_COLORS[ins.type];
                const monthlyPremium = Math.round(ins.annual_premium / 12);
                return (
                  <Card key={ins.id} style={styles.insuranceCard}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        <View style={[styles.lenderBadge, { backgroundColor: typeColor + '20' }]}>
                          <Ionicons name="shield-checkmark-outline" size={14} color={typeColor} />
                        </View>
                        <View>
                          <Text style={styles.propertyName}>{ins.property_name}</Text>
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

                    <View style={styles.rateRow}>
                      <View style={[styles.typePill, { backgroundColor: typeColor + '15' }]}>
                        <Text style={[styles.typePillText, { color: typeColor }]}>{INSURANCE_TYPE_LABELS[ins.type]}</Text>
                      </View>
                      {ins.policy_number ? <Text style={styles.policyNum}>Nº {ins.policy_number}</Text> : null}
                    </View>

                    <View style={styles.mortgageStatsRow}>
                      <View style={styles.mortgageStat}>
                        <Text style={styles.mortgageStatValue}>{formatCurrency(monthlyPremium)}</Text>
                        <Text style={styles.mortgageStatLabel}>Prime/mois</Text>
                      </View>
                      <View style={styles.mortgageStat}>
                        <Text style={styles.mortgageStatValue}>{formatCurrency(ins.annual_premium)}</Text>
                        <Text style={styles.mortgageStatLabel}>Prime annuelle</Text>
                      </View>
                      <View style={styles.mortgageStat}>
                        <Text style={styles.mortgageStatValue}>{formatCurrency(ins.coverage_amount)}</Text>
                        <Text style={styles.mortgageStatLabel}>Couverture</Text>
                      </View>
                    </View>

                    <View style={[styles.renewalRow, renewalSoon && { backgroundColor: '#FFF6E6', borderRadius: 8, padding: 8 }]}>
                      <Ionicons
                        name={renewalSoon ? 'warning-outline' : 'calendar-outline'}
                        size={14}
                        color={renewalSoon ? theme.colors.warning : theme.colors.textTertiary}
                      />
                      <Text style={[styles.renewalText, renewalSoon && { color: theme.colors.warning, fontWeight: '600' }]}>
                        Renouvellement: {formatDate(ins.renewal_date)}
                        {renewalSoon && ` (dans ${daysUntilRenewal}j)`}
                      </Text>
                    </View>

                    <View style={styles.insuranceFooter}>
                      <Text style={styles.deductibleText}>Franchise: {formatCurrency(ins.deductible)}</Text>
                      {ins.contact_phone ? <Text style={styles.contactText}>📞 {ins.contact_phone}</Text> : null}
                    </View>
                  </Card>
                );
              })
            )}
          </>
        )}

        {/* ── Calculator Tab */}
        {activeTab === 'calculator' && (
          <>
            <Card style={styles.calcCard}>
              <View style={styles.calcCardHeader}>
                <Ionicons name="calculator-outline" size={18} color={theme.colors.primary} />
                <Text style={styles.calcCardTitle}>Simulateur d'acquisition</Text>
              </View>

              <View style={styles.calcField}>
                <Text style={styles.calcLabel}>Prix d'achat ($)</Text>
                <TextInput style={styles.calcInput} value={calcPrice} onChangeText={setCalcPrice} keyboardType="decimal-pad" placeholder="500 000" placeholderTextColor={theme.colors.textTertiary} />
              </View>

              <View style={styles.calcField}>
                <View style={styles.calcLabelRow}>
                  <Text style={styles.calcLabel}>Mise de fonds (%)</Text>
                  {calcResults && <Text style={styles.calcLabelRight}>{formatCurrency(Math.round(calcResults.downAmount))}</Text>}
                </View>
                <TextInput style={styles.calcInput} value={calcDown} onChangeText={setCalcDown} keyboardType="decimal-pad" placeholder="20" placeholderTextColor={theme.colors.textTertiary} />
                {calcResults?.needsCMHC && (
                  <Text style={styles.cmhcNote}>⚠️ Assurance CMHC requise ({(calcResults.cmhcRate * 100).toFixed(2)} % du prêt)</Text>
                )}
                {calcResults && calcResults.downPct < 5 && calcResults.downPct > 0 && (
                  <Text style={[styles.cmhcNote, { color: theme.colors.error }]}>❌ Mise de fonds minimum 5 % requise</Text>
                )}
              </View>

              <View style={styles.calcField}>
                <Text style={styles.calcLabel}>Taux d'intérêt annuel (%)</Text>
                <TextInput style={styles.calcInput} value={calcRate} onChangeText={setCalcRate} keyboardType="decimal-pad" placeholder="5.50" placeholderTextColor={theme.colors.textTertiary} />
              </View>

              <View style={styles.calcField}>
                <Text style={styles.calcLabel}>Amortissement</Text>
                <View style={styles.amortRow}>
                  {(['20', '25', '30'] as const).map(y => (
                    <TouchableOpacity key={y} style={[styles.amortBtn, calcAmort === y && styles.amortBtnActive]} onPress={() => setCalcAmort(y)}>
                      <Text style={[styles.amortBtnText, calcAmort === y && styles.amortBtnTextActive]}>{y} ans</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </Card>

            {calcResults && (
              <Card style={styles.calcCard}>
                <View style={styles.calcCardHeader}>
                  <Ionicons name="trending-up-outline" size={18} color={theme.colors.success} />
                  <Text style={styles.calcCardTitle}>Résultats du financement</Text>
                </View>
                <View style={styles.calcResultRow}>
                  <Text style={styles.calcResultLabel}>Montant emprunté</Text>
                  <Text style={styles.calcResultValue}>{formatCurrency(Math.round(calcResults.loanBeforeCMHC))}</Text>
                </View>
                {calcResults.cmhcPremium > 0 && (
                  <View style={styles.calcResultRow}>
                    <Text style={styles.calcResultLabel}>+ Assurance CMHC</Text>
                    <Text style={[styles.calcResultValue, { color: theme.colors.warning }]}>{formatCurrency(Math.round(calcResults.cmhcPremium))}</Text>
                  </View>
                )}
                <View style={[styles.calcResultRow, { borderBottomWidth: 0, marginVertical: 4 }]}>
                  <Text style={styles.calcResultLabelMain}>Paiement mensuel</Text>
                  <Text style={styles.calcResultValueMain}>{formatCurrency(Math.round(calcResults.monthlyPayment))}</Text>
                </View>
                <View style={styles.calcStressBox}>
                  <View style={styles.calcStressLeft}>
                    <Text style={styles.calcStressTitle}>Test de résistance (+2 %)</Text>
                    <Text style={styles.calcStressSubtitle}>Taux qualificatif : {(parseFloat(calcRate) + 2).toFixed(2)} %</Text>
                  </View>
                  <Text style={styles.calcStressValue}>{formatCurrency(Math.round(calcResults.stressPayment))}/mois</Text>
                </View>
              </Card>
            )}

            {calcResults && (
              <Card style={styles.calcCard}>
                <View style={styles.calcCardHeader}>
                  <Ionicons name="stats-chart-outline" size={18} color={theme.colors.accent} />
                  <Text style={styles.calcCardTitle}>Analyse d'investissement</Text>
                </View>
                <View style={styles.calcField}>
                  <Text style={styles.calcLabel}>Revenus locatifs mensuels ($)</Text>
                  <TextInput style={styles.calcInput} value={calcIncome} onChangeText={setCalcIncome} keyboardType="decimal-pad" placeholder="3 000" placeholderTextColor={theme.colors.textTertiary} />
                </View>
                <View style={styles.calcInvGrid}>
                  <View style={[styles.calcInvItem, { borderColor: calcResults.monthlyCashFlow >= 0 ? theme.colors.success : theme.colors.error }]}>
                    <Ionicons name={calcResults.monthlyCashFlow >= 0 ? 'trending-up' : 'trending-down'} size={20} color={calcResults.monthlyCashFlow >= 0 ? theme.colors.success : theme.colors.error} />
                    <Text style={[styles.calcInvValue, { color: calcResults.monthlyCashFlow >= 0 ? theme.colors.success : theme.colors.error }]}>
                      {calcResults.monthlyCashFlow >= 0 ? '+' : ''}{formatCurrency(Math.round(calcResults.monthlyCashFlow))}
                    </Text>
                    <Text style={styles.calcInvLabel}>Flux mensuel</Text>
                  </View>
                  <View style={[styles.calcInvItem, { borderColor: theme.colors.primary }]}>
                    <Ionicons name="pie-chart-outline" size={20} color={theme.colors.primary} />
                    <Text style={[styles.calcInvValue, { color: theme.colors.primary }]}>{calcResults.capRate.toFixed(1)} %</Text>
                    <Text style={styles.calcInvLabel}>Taux plafond</Text>
                  </View>
                  <View style={[styles.calcInvItem, { borderColor: theme.colors.accent }]}>
                    <Ionicons name="swap-horizontal-outline" size={20} color={theme.colors.accent} />
                    <Text style={[styles.calcInvValue, { color: theme.colors.accent }]}>{calcResults.grm > 0 ? calcResults.grm.toFixed(1) + 'x' : '—'}</Text>
                    <Text style={styles.calcInvLabel}>Multiplic. (GRM)</Text>
                  </View>
                </View>
                <Text style={styles.calcDisclaimer}>
                  * Analyse simplifiée basée sur le paiement hypothécaire uniquement. Ajoutez taxes, assurances et entretien pour un flux net réel.
                </Text>
              </Card>
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
              <TouchableOpacity onPress={saveMortgage} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Text style={styles.modalSave}>Enregistrer</Text>}
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              {[
                { label: 'Immeuble *', key: 'property_name', placeholder: 'Ex. Duplex St-Henri' },
                { label: 'Prêteur *', key: 'lender', placeholder: 'Ex. Banque Nationale' },
                { label: 'Solde restant ($) *', key: 'balance', placeholder: 'Ex. 412000', numeric: true },
                { label: 'Taux d\'intérêt (%)', key: 'interest_rate', placeholder: 'Ex. 5.24', numeric: true },
                { label: 'Paiement mensuel ($)', key: 'monthly_payment', placeholder: 'Ex. 2890', numeric: true },
                { label: 'Date d\'échéance (YYYY-MM-DD)', key: 'maturity_date', placeholder: 'Ex. 2027-03-01' },
                { label: 'Prochain paiement (YYYY-MM-DD)', key: 'next_payment_date', placeholder: 'Ex. 2025-04-01' },
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
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Type de taux</Text>
                <View style={styles.toggleRow}>
                  {(['fixed', 'variable'] as const).map(t => (
                    <TouchableOpacity key={t} style={[styles.toggleBtn, mortgageForm.type === t && styles.toggleBtnActive]} onPress={() => setMortgageForm(prev => ({ ...prev, type: t }))}>
                      <Text style={[styles.toggleBtnText, mortgageForm.type === t && styles.toggleBtnTextActive]}>{t === 'fixed' ? 'Fixe' : 'Variable'}</Text>
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
              <TouchableOpacity onPress={saveInsurance} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Text style={styles.modalSave}>Enregistrer</Text>}
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              {[
                { label: 'Immeuble *', key: 'property_name', placeholder: 'Ex. Duplex St-Henri' },
                { label: 'Assureur *', key: 'insurer', placeholder: 'Ex. Intact Assurance' },
                { label: 'Numéro de police', key: 'policy_number', placeholder: 'Ex. PQ-2024-00481' },
                { label: 'Prime annuelle ($)', key: 'annual_premium', placeholder: 'Ex. 2160', numeric: true },
                { label: 'Montant de couverture ($)', key: 'coverage_amount', placeholder: 'Ex. 850000', numeric: true },
                { label: 'Date de renouvellement (YYYY-MM-DD)', key: 'renewal_date', placeholder: 'Ex. 2025-10-01' },
                { label: 'Franchise ($)', key: 'deductible', placeholder: 'Ex. 2500', numeric: true },
                { label: 'Téléphone de contact', key: 'contact_phone', placeholder: 'Ex. 1-800-836-2240' },
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
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Type d'assurance</Text>
                <View style={styles.toggleRow}>
                  {(['building', 'liability', 'comprehensive'] as InsuranceType[]).map(t => (
                    <TouchableOpacity key={t} style={[styles.toggleBtn, insuranceForm.type === t && styles.toggleBtnActive]} onPress={() => setInsuranceForm(prev => ({ ...prev, type: t }))}>
                      <Text style={[styles.toggleBtnText, insuranceForm.type === t && styles.toggleBtnTextActive]}>{INSURANCE_TYPE_LABELS[t]}</Text>
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
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
  headerSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },

  kpiRow: { flexDirection: 'row', gap: 8, padding: theme.spacing.md, paddingBottom: 0, backgroundColor: theme.colors.surface },
  kpiCard: { flex: 1, backgroundColor: theme.colors.background, borderRadius: 10, padding: 10, borderLeftWidth: 3 },
  kpiValue: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary },
  kpiLabel: { fontSize: 10, color: theme.colors.textTertiary, marginTop: 2 },

  tabRow: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight, paddingBottom: 0 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: theme.colors.primary },
  tabText: { fontSize: 11, color: theme.colors.textSecondary },
  tabTextActive: { color: theme.colors.primary, fontWeight: '600' },

  scrollContent: { padding: theme.spacing.md },
  mortgageCard: { marginBottom: theme.spacing.sm },
  insuranceCard: { marginBottom: theme.spacing.sm },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  lenderBadge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  propertyName: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  lenderName: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
  cardActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: theme.spacing.sm },
  ratePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primaryLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  ratePillText: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
  ratePillLabel: { fontSize: 11, color: theme.colors.primary },
  renewalPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  renewalPillText: { fontSize: 11, fontWeight: '600' },
  typePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  typePillText: { fontSize: 12, fontWeight: '700' },
  policyNum: { fontSize: 12, color: theme.colors.textTertiary },

  mortgageStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm },
  mortgageStat: { alignItems: 'center', flex: 1 },
  mortgageStatValue: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary },
  mortgageStatLabel: { fontSize: 10, color: theme.colors.textTertiary, marginTop: 2 },

  progressBarBg: { height: 6, backgroundColor: theme.colors.borderLight, borderRadius: 3, marginBottom: theme.spacing.sm, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 3 },

  mortgageDates: { gap: 4 },
  dateItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dateText: { fontSize: 12, color: theme.colors.textTertiary },

  renewalRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: theme.spacing.xs },
  renewalText: { fontSize: 12, color: theme.colors.textTertiary },
  insuranceFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing.xs },
  deductibleText: { fontSize: 12, color: theme.colors.textSecondary },
  contactText: { fontSize: 12, color: theme.colors.textSecondary },

  emptyCard: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary },
  emptyText: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center' },

  // Calculator
  calcCard: { marginBottom: theme.spacing.md },
  calcCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: theme.spacing.md },
  calcCardTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  calcField: { marginBottom: theme.spacing.sm },
  calcLabel: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500', marginBottom: 6 },
  calcLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  calcLabelRight: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
  calcInput: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, padding: theme.spacing.sm, fontSize: 15, color: theme.colors.textPrimary, backgroundColor: theme.colors.surface },
  cmhcNote: { fontSize: 11, color: theme.colors.warning, marginTop: 4 },
  amortRow: { flexDirection: 'row', gap: 8 },
  amortBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  amortBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  amortBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
  amortBtnTextActive: { color: '#FFF' },

  calcResultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  calcResultLabel: { fontSize: 13, color: theme.colors.textSecondary },
  calcResultValue: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  calcResultLabelMain: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  calcResultValueMain: { fontSize: 20, fontWeight: '800', color: theme.colors.primary },
  calcStressBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF6E6', borderRadius: 10, padding: 12, marginTop: theme.spacing.sm },
  calcStressLeft: { flex: 1 },
  calcStressTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.warning },
  calcStressSubtitle: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  calcStressValue: { fontSize: 15, fontWeight: '700', color: theme.colors.warning },

  calcInvGrid: { flexDirection: 'row', gap: 8, marginBottom: theme.spacing.sm },
  calcInvItem: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1.5, backgroundColor: theme.colors.surface },
  calcInvValue: { fontSize: 15, fontWeight: '800', marginVertical: 4 },
  calcInvLabel: { fontSize: 10, color: theme.colors.textTertiary, textAlign: 'center' },
  calcDisclaimer: { fontSize: 11, color: theme.colors.textTertiary, lineHeight: 16, fontStyle: 'italic' },

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
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  toggleBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  toggleBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
  toggleBtnTextActive: { color: '#FFF' },
});
