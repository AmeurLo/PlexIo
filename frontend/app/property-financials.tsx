import React, { useState, useCallback, useEffect } from 'react';
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
import { useLocalSearchParams, router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Card, Button, theme } from '../src/components';
import { api } from '../src/services/api';
import { EXPENSE_CATEGORIES } from '../src/types';
import { formatCurrency } from '../src/utils/format';
import { useTranslation } from '../src/i18n/useTranslation';

const getCategoryIcon = (cat: string): string => {
  switch (cat) {
    case 'maintenance': return 'construct-outline';
    case 'insurance': return 'shield-checkmark-outline';
    case 'property_tax': return 'document-text-outline';
    case 'utilities': return 'flash-outline';
    case 'mortgage': return 'home-outline';
    case 'cleaning': return 'sparkles-outline';
    case 'renovation': return 'hammer-outline';
    default: return 'receipt-outline';
  }
};

const getCategoryColor = (cat: string): string => {
  switch (cat) {
    case 'maintenance': return theme.colors.warning;
    case 'insurance': return theme.colors.info;
    case 'property_tax': return '#8B5CF6';
    case 'utilities': return '#F59E0B';
    case 'mortgage': return theme.colors.primary;
    case 'cleaning': return theme.colors.accent;
    case 'renovation': return '#EC4899';
    default: return theme.colors.textSecondary;
  }
};

const getCategoryLabel = (value: string) =>
  EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value;

const formatDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

const getMonthLabel = (ym: string) => {
  const [y, mo] = ym.split('-');
  return new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' });
};

const addMonths = (ym: string, delta: number): string => {
  const [y, mo] = ym.split('-').map(Number);
  const d = new Date(y, mo - 1 + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const currentYM = (): string => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
};

// ─── Branded HTML Report Generator ───────────────────────────────────────────
function generateReportHTML(opts: {
  propertyName: string;
  period: string;
  financials: any;
  generatedAt: string;
}): string {
  const { propertyName, period, financials, generatedAt } = opts;
  const netFlow = financials?.net_cash_flow ?? 0;
  const isPositive = netFlow >= 0;
  const flowColor = isPositive ? '#10B981' : '#EF4444';
  const flowBg    = isPositive ? '#F0FDF4' : '#FEF2F2';

  const expenseRows = (financials?.expenses ?? []).map((e: any) => `
    <tr>
      <td>${e.title}</td>
      <td style="color:#6B7280;">${getCategoryLabel(e.category)}</td>
      <td style="color:#9CA3AF;">${formatDate(e.expense_date)}</td>
      <td style="text-align:right;font-weight:700;">${formatCurrency(e.amount)}</td>
      <td style="color:#9CA3AF;font-style:italic;">${e.notes || '—'}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rapport Domely — ${propertyName}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;background:#F8F9FA;color:#111827}
.page{max-width:820px;margin:0 auto;background:#fff;min-height:100vh}
.header{background:linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%);color:#fff;padding:36px 40px 32px}
.logo-row{display:flex;align-items:center;gap:12px;margin-bottom:22px}
.logo{width:42px;height:42px;background:rgba(255,255,255,.18);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px}
.brand{font-size:22px;font-weight:800;letter-spacing:-.5px}
.brand-sub{font-size:11px;opacity:.65;margin-top:1px}
.rpt-title{font-size:28px;font-weight:700;margin-bottom:6px;letter-spacing:-.5px}
.rpt-meta{font-size:14px;opacity:.75}
.kpi-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;padding:28px 40px;background:#F9FAFB}
.kpi-card{background:#fff;border-radius:12px;padding:18px 20px;border:1px solid #E5E7EB}
.kpi-lbl{font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px}
.kpi-val{font-size:26px;font-weight:800;letter-spacing:-1px}
.v-blue{color:#4F46E5}.v-green{color:#10B981}.v-warn{color:#F59E0B}
.section{padding:26px 40px;border-top:1px solid #F0F0F0}
.sec-title{font-size:16px;font-weight:700;color:#111827;margin-bottom:14px}
.flow-bar{display:flex;align-items:flex-start;gap:14px;padding:16px 20px;border-radius:12px;border-left:4px solid ${flowColor};background:${flowBg}}
.flow-icon{font-size:26px;line-height:1}
.flow-title{font-size:15px;font-weight:700;color:${flowColor}}
.flow-desc{font-size:13px;color:#6B7280;margin-top:3px}
.metrics-row{display:flex;gap:0;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden}
.metric{flex:1;padding:16px;text-align:center;border-right:1px solid #E5E7EB}
.metric:last-child{border-right:none}
.metric-lbl{font-size:11px;color:#9CA3AF;margin-bottom:6px}
.metric-val{font-size:18px;font-weight:700;color:#111827}
table{width:100%;border-collapse:collapse}
th{background:#F9FAFB;padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:.6px;border-bottom:2px solid #E5E7EB}
td{padding:12px 12px;font-size:14px;color:#374151;border-bottom:1px solid #F4F4F5}
tr:last-child td{border-bottom:none}
.footer{padding:22px 40px;background:#F8F9FA;border-top:1px solid #E5E7EB;display:flex;justify-content:space-between;align-items:center}
.ft-brand{font-size:14px;font-weight:800;color:#4F46E5}
.ft-sub{font-size:11px;color:#9CA3AF;margin-top:2px}
.ft-date{font-size:11px;color:#9CA3AF;text-align:right;line-height:1.6}
.empty-msg{text-align:center;padding:28px;color:#9CA3AF;font-size:14px}
@media print{body{background:#fff}.page{max-width:100%}}
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="logo-row">
      <div class="logo">🏠</div>
      <div>
        <div class="brand">Domely</div>
        <div class="brand-sub">Gestion immobilière intelligente</div>
      </div>
    </div>
    <div class="rpt-title">Rapport financier</div>
    <div class="rpt-meta">${propertyName} &nbsp;·&nbsp; ${period}</div>
  </div>

  <!-- KPIs -->
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-lbl">Loyer attendu</div>
      <div class="kpi-val v-blue">${formatCurrency(financials?.expected_rent ?? 0)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-lbl">Loyer perçu</div>
      <div class="kpi-val v-green">${formatCurrency(financials?.collected_rent ?? 0)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-lbl">Total dépenses</div>
      <div class="kpi-val v-warn">${formatCurrency(financials?.total_expenses ?? 0)}</div>
    </div>
    <div class="kpi-card" style="border-color:${flowColor}40">
      <div class="kpi-lbl">Flux net</div>
      <div class="kpi-val" style="color:${flowColor}">${isPositive ? '' : '–'}${formatCurrency(Math.abs(netFlow))}</div>
    </div>
  </div>

  <!-- Synthèse -->
  <div class="section">
    <div class="sec-title">Synthèse</div>
    <div class="flow-bar">
      <div class="flow-icon">${isPositive ? '📈' : '📉'}</div>
      <div>
        <div class="flow-title">${isPositive ? 'Flux de trésorerie positif' : 'Flux de trésorerie négatif'}</div>
        <div class="flow-desc">Taux d'occupation : ${financials?.occupancy_rate ?? 0}% &nbsp;·&nbsp; Ratio de dépenses : ${Math.round((financials?.expense_ratio ?? 0) * 100)}% &nbsp;·&nbsp; Coûts maintenance : ${formatCurrency(financials?.maintenance_expenses ?? 0)}</div>
      </div>
    </div>
  </div>

  <!-- Dépenses -->
  <div class="section">
    <div class="sec-title">Détail des dépenses</div>
    ${(financials?.expenses?.length ?? 0) > 0 ? `
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Catégorie</th>
          <th>Date</th>
          <th style="text-align:right">Montant</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>${expenseRows}</tbody>
    </table>` : '<div class="empty-msg">Aucune dépense enregistrée pour cette période.</div>'}
  </div>

  <!-- Footer -->
  <div class="footer">
    <div>
      <div class="ft-brand">Préparé par Domely</div>
      <div class="ft-sub">domely.ca &nbsp;·&nbsp; Gestion immobilière intelligente</div>
    </div>
    <div class="ft-date">
      Généré le ${generatedAt}<br>
      <span style="color:#D1D5DB">Document confidentiel</span>
    </div>
  </div>

</div>
</body>
</html>`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PropertyFinancialsScreen() {
  const { propertyId, propertyName } = useLocalSearchParams<{ propertyId: string; propertyName: string }>();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [financials, setFinancials] = useState<any>(null);
  const [period, setPeriod] = useState<'monthly' | 'ytd'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYM());
  const [exporting, setExporting] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [scanningReceipt, setScanningReceipt] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    category: 'maintenance',
    expense_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  const loadData = useCallback(async () => {
    try {
      const data = await api.getPropertyFinancials(
        propertyId,
        period === 'monthly' ? selectedMonth : undefined,
        period
      );
      setFinancials(data);
    } catch (error) {
      console.error('Error loading financials:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [propertyId, period, selectedMonth]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Reload when period or month selection changes
  useEffect(() => {
    if (!loading) loadData();
  }, [period, selectedMonth]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const prevMonth = () => setSelectedMonth(m => addMonths(m, -1));
  const nextMonth = () => {
    const next = addMonths(selectedMonth, 1);
    if (next <= currentYM()) setSelectedMonth(next);
  };

  const handleExport = () => {
    Alert.alert(
      'Exporter le rapport',
      'Choisissez le format d\'export :',
      [
        {
          text: '📄 Rapport PDF (HTML)',
          onPress: exportPDF,
        },
        {
          text: '📊 Données CSV',
          onPress: exportCSV,
        },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  const exportPDF = async () => {
    setExporting(true);
    try {
      const now = new Date();
      const generatedAt = now.toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' });
      const periodStr = period === 'ytd'
        ? `Année ${now.getFullYear()} (année en cours)`
        : getMonthLabel(selectedMonth);

      const html = generateReportHTML({
        propertyName: propertyName as string || 'Propriété',
        period: periodStr,
        financials,
        generatedAt,
      });

      const safeName = (propertyName as string || 'propriete').replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const suffix = period === 'ytd' ? `${now.getFullYear()}-ytd` : selectedMonth;
      const filename = `domely-rapport-${safeName}-${suffix}.html`;
      const fileUri = (FileSystem.documentDirectory ?? '') + filename;

      await FileSystem.writeAsStringAsync(fileUri, html, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/html',
        dialogTitle: 'Rapport financier Domely',
        UTI: 'public.html',
      });
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le rapport PDF.');
    } finally {
      setExporting(false);
    }
  };

  const exportCSV = async () => {
    setExporting(true);
    try {
      const csv = await api.exportPropertyFinancials(
        propertyId,
        period === 'monthly' ? selectedMonth : undefined,
        period
      );
      const suffix = period === 'ytd' ? `${new Date().getFullYear()}-ytd` : selectedMonth;
      const safeName = (propertyName as string || 'property').replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const filename = `domely-${safeName}-${suffix}.csv`;
      const fileUri = (FileSystem.documentDirectory ?? '') + filename;
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Données CSV Domely' });
    } catch {
      Alert.alert(t('error') as string, 'Export CSV échoué.');
    } finally {
      setExporting(false);
    }
  };

  const openAddExpense = () => {
    setExpenseForm({ title: '', amount: '', category: 'maintenance', expense_date: new Date().toISOString().slice(0, 10), notes: '' });
    setShowExpenseModal(true);
  };

  const handleScanReceipt = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Accès à la galerie requis pour numériser un reçu.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]?.base64) return;

    setScanningReceipt(true);
    try {
      const scanned = await api.scanReceipt(`data:image/jpeg;base64,${result.assets[0].base64}`);
      setExpenseForm({
        title: scanned.title ?? '',
        amount: scanned.amount != null ? String(scanned.amount) : '',
        category: scanned.category ?? 'other',
        expense_date: scanned.date ?? new Date().toISOString().slice(0, 10),
        notes: scanned.notes ?? '',
      });
    } catch {
      Alert.alert('Erreur', 'Impossible de numériser le reçu. Veuillez réessayer.');
    } finally {
      setScanningReceipt(false);
    }
  };

  const handleSaveExpense = async () => {
    if (!expenseForm.title.trim()) { Alert.alert('Error', 'Please enter a title'); return; }
    const amount = parseFloat(expenseForm.amount);
    if (!expenseForm.amount || isNaN(amount) || amount <= 0) { Alert.alert('Error', 'Amount must be greater than 0'); return; }
    setSavingExpense(true);
    try {
      await api.createExpense({
        property_id: propertyId,
        title: expenseForm.title.trim(),
        amount,
        category: expenseForm.category,
        expense_date: expenseForm.expense_date,
        notes: expenseForm.notes.trim() || undefined,
      });
      setShowExpenseModal(false);
      loadData();
      Alert.alert('Success', 'Expense logged');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save expense');
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = (expenseId: string, title: string) => {
    Alert.alert('Delete Expense', `Delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteExpense(expenseId);
            loadData();
          } catch {
            Alert.alert('Error', 'Failed to delete expense');
          }
        },
      },
    ]);
  };

  // Build category breakdown from expenses
  const getCategoryBreakdown = () => {
    if (!financials?.expenses?.length) return [];
    const map: Record<string, number> = {};
    for (const e of financials.expenses) {
      map[e.category] = (map[e.category] ?? 0) + e.amount;
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, total]) => ({ cat, total }));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{propertyName}</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const cashFlowPositive = (financials?.net_cash_flow ?? 0) >= 0;
  const cashFlowColor = cashFlowPositive ? theme.colors.success : theme.colors.error;
  const netFlow = financials?.net_cash_flow ?? 0;
  const categoryBreakdown = getCategoryBreakdown();
  const hasExpenses = (financials?.expenses?.length ?? 0) > 0;

  const periodLabel = period === 'ytd'
    ? (t('ytdLabel') as Function)(new Date().getFullYear())
    : getMonthLabel(selectedMonth);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{propertyName}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleExport} disabled={exporting} style={styles.headerIconBtn}>
            {exporting ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Ionicons name="share-outline" size={20} color={theme.colors.primary} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={openAddExpense} style={styles.addExpenseBtn}>
            <Ionicons name="add" size={22} color={theme.colors.textInverse} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Period toggle + month nav */}
      <View style={styles.periodBar}>
        <View style={styles.periodToggle}>
          <TouchableOpacity
            style={[styles.periodBtn, period === 'monthly' && styles.periodBtnActive]}
            onPress={() => setPeriod('monthly')}
          >
            <Text style={[styles.periodBtnText, period === 'monthly' && styles.periodBtnTextActive]}>
              {t('periodMonth') as string}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodBtn, period === 'ytd' && styles.periodBtnActive]}
            onPress={() => setPeriod('ytd')}
          >
            <Text style={[styles.periodBtnText, period === 'ytd' && styles.periodBtnTextActive]}>
              {t('periodYTD') as string}
            </Text>
          </TouchableOpacity>
        </View>
        {period === 'monthly' && (
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={prevMonth} style={styles.navArrow}>
              <Ionicons name="chevron-back" size={18} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.monthNavLabel}>{periodLabel}</Text>
            <TouchableOpacity
              onPress={nextMonth}
              style={styles.navArrow}
              disabled={selectedMonth >= currentYM()}
            >
              <Ionicons name="chevron-forward" size={18} color={selectedMonth >= currentYM() ? theme.colors.textTertiary : theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
        )}
        {period === 'ytd' && (
          <Text style={styles.ytdLabel}>{periodLabel}</Text>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >

        {/* Top KPI summary */}
        <View style={styles.kpiGrid}>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Expected Rent</Text>
            <Text style={styles.kpiValue}>{formatCurrency(financials?.expected_rent ?? 0)}</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Collected</Text>
            <Text style={[styles.kpiValue, { color: theme.colors.success }]}>{formatCurrency(financials?.collected_rent ?? 0)}</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Total Expenses</Text>
            <Text style={[styles.kpiValue, { color: theme.colors.warning }]}>{formatCurrency(financials?.total_expenses ?? 0)}</Text>
          </Card>
          <Card style={StyleSheet.flatten([styles.kpiCard, { borderWidth: 1.5, borderColor: cashFlowColor + '40' }])}>
            <Text style={styles.kpiLabel}>Net Cash Flow</Text>
            <Text style={[styles.kpiValue, { color: cashFlowColor }]}>
              {cashFlowPositive ? '' : '–'}{formatCurrency(Math.abs(netFlow))}
            </Text>
          </Card>
        </View>

        {/* Secondary metrics */}
        <Card style={styles.metricsCard}>
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Occupancy</Text>
              <Text style={styles.metricValue}>{financials?.occupancy_rate ?? 0}%</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Maintenance Costs</Text>
              <Text style={styles.metricValue}>{formatCurrency(financials?.maintenance_expenses ?? 0)}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Expense Ratio</Text>
              <Text style={[styles.metricValue, { color: (financials?.expense_ratio ?? 0) > 0.7 ? theme.colors.error : theme.colors.textPrimary }]}>
                {Math.round((financials?.expense_ratio ?? 0) * 100)}%
              </Text>
            </View>
          </View>
        </Card>

        {/* Cash Flow bar */}
        <Card style={StyleSheet.flatten([styles.cashFlowCard, { borderLeftWidth: 4, borderLeftColor: cashFlowColor }])}>
          <View style={styles.cashFlowRow}>
            <Ionicons name={cashFlowPositive ? 'trending-up' : 'trending-down'} size={20} color={cashFlowColor} />
            <View style={styles.cashFlowInfo}>
              <Text style={[styles.cashFlowTitle, { color: cashFlowColor }]}>
                {cashFlowPositive ? 'Positive Cash Flow' : 'Negative Cash Flow'}
              </Text>
              <Text style={styles.cashFlowDesc}>
                {cashFlowPositive
                  ? (t('cashFlowPos') as Function)(formatCurrency(netFlow))
                  : (t('cashFlowNeg') as Function)(formatCurrency(Math.abs(netFlow)))}
              </Text>
            </View>
          </View>
        </Card>

        {/* Expense Breakdown by category */}
        {categoryBreakdown.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Expense Breakdown</Text>
            <Card>
              {categoryBreakdown.map(({ cat, total }, index) => {
                const pct = financials.total_expenses > 0 ? (total / financials.total_expenses) * 100 : 0;
                const color = getCategoryColor(cat);
                return (
                  <View key={cat}>
                    {index > 0 && <View style={styles.rowDivider} />}
                    <View style={styles.breakdownRow}>
                      <View style={[styles.categoryDot, { backgroundColor: color + '25' }]}>
                        <Ionicons name={getCategoryIcon(cat) as any} size={14} color={color} />
                      </View>
                      <View style={styles.breakdownInfo}>
                        <View style={styles.breakdownLabelRow}>
                          <Text style={styles.breakdownLabel}>{getCategoryLabel(cat)}</Text>
                          <Text style={[styles.breakdownAmount, { color }]}>{formatCurrency(total)}</Text>
                        </View>
                        <View style={styles.breakdownTrack}>
                          <View style={[styles.breakdownFill, { width: `${pct}%`, backgroundColor: color }]} />
                        </View>
                        <Text style={styles.breakdownPct}>{Math.round(pct)}% of expenses</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </Card>
          </View>
        )}

        {/* Recent Expenses */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Expenses</Text>
            <TouchableOpacity style={styles.addSmallBtn} onPress={openAddExpense}>
              <Ionicons name="add" size={16} color={theme.colors.primary} />
              <Text style={styles.addSmallText}>Add</Text>
            </TouchableOpacity>
          </View>
          {!hasExpenses ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={36} color={theme.colors.textTertiary} />
              <Text style={styles.emptyTitle}>No Expenses Yet</Text>
              <Text style={styles.emptyDesc}>Tap "Add" to log your first expense for this property.</Text>
              <TouchableOpacity style={styles.emptyAction} onPress={openAddExpense}>
                <Text style={styles.emptyActionText}>Log Expense</Text>
              </TouchableOpacity>
            </Card>
          ) : (
            financials.expenses.map((expense: any) => {
              const color = getCategoryColor(expense.category);
              return (
                <Card key={expense.id} style={styles.expenseCard}>
                  <View style={styles.expenseRow}>
                    <View style={[styles.expenseIcon, { backgroundColor: color + '20' }]}>
                      <Ionicons name={getCategoryIcon(expense.category) as any} size={18} color={color} />
                    </View>
                    <View style={styles.expenseInfo}>
                      <Text style={styles.expenseTitle} numberOfLines={1}>{expense.title}</Text>
                      <View style={styles.expenseMeta}>
                        <View style={[styles.categoryBadge, { backgroundColor: color + '15' }]}>
                          <Text style={[styles.categoryBadgeText, { color }]}>{getCategoryLabel(expense.category)}</Text>
                        </View>
                        <Text style={styles.expenseDate}>{formatDate(expense.expense_date)}</Text>
                      </View>
                      {expense.notes ? <Text style={styles.expenseNotes} numberOfLines={1}>{expense.notes}</Text> : null}
                    </View>
                    <View style={styles.expenseRight}>
                      <Text style={styles.expenseAmount}>{formatCurrency(expense.amount)}</Text>
                      <TouchableOpacity onPress={() => handleDeleteExpense(expense.id, expense.title)} style={styles.deleteBtn}>
                        <Ionicons name="trash-outline" size={14} color={theme.colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              );
            })
          )}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Add Expense Modal */}
      <Modal visible={showExpenseModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Expense</Text>
              <TouchableOpacity onPress={() => setShowExpenseModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Scan Receipt Banner */}
              <TouchableOpacity style={styles.scanReceiptBtn} onPress={handleScanReceipt} disabled={scanningReceipt}>
                {scanningReceipt ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <Ionicons name="camera-outline" size={20} color={theme.colors.primary} />
                )}
                <Text style={styles.scanReceiptText}>
                  {scanningReceipt ? 'Analyse en cours…' : 'Numériser un reçu'}
                </Text>
                {!scanningReceipt && (
                  <View style={styles.aiBadge}>
                    <Text style={styles.aiBadgeText}>IA</Text>
                  </View>
                )}
              </TouchableOpacity>
              <View style={styles.orDivider}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>ou remplir manuellement</Text>
                <View style={styles.orLine} />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Title *</Text>
                <TextInput style={styles.input} value={expenseForm.title} onChangeText={(t) => setExpenseForm({ ...expenseForm, title: t })} placeholder="e.g., Furnace repair" placeholderTextColor={theme.colors.textTertiary} />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Amount ($) *</Text>
                <TextInput style={styles.input} value={expenseForm.amount} onChangeText={(t) => setExpenseForm({ ...expenseForm, amount: t })} placeholder="0.00" placeholderTextColor={theme.colors.textTertiary} keyboardType="decimal-pad" />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Category *</Text>
                <View style={styles.categoryGrid}>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <TouchableOpacity key={cat.value} style={[styles.categoryChip, expenseForm.category === cat.value && styles.categoryChipSelected]} onPress={() => setExpenseForm({ ...expenseForm, category: cat.value })}>
                      <Text style={[styles.categoryChipText, expenseForm.category === cat.value && styles.categoryChipTextSelected]}>{cat.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Date *</Text>
                <TextInput style={styles.input} value={expenseForm.expense_date} onChangeText={(t) => setExpenseForm({ ...expenseForm, expense_date: t })} placeholder="YYYY-MM-DD" placeholderTextColor={theme.colors.textTertiary} />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Notes (optional)</Text>
                <TextInput style={[styles.input, styles.textArea]} value={expenseForm.notes} onChangeText={(t) => setExpenseForm({ ...expenseForm, notes: t })} placeholder="Add any details..." placeholderTextColor={theme.colors.textTertiary} multiline numberOfLines={3} />
              </View>
              <Button title="Save Expense" onPress={handleSaveExpense} loading={savingExpense} size="large" style={styles.submitButton} />
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: theme.spacing.md, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary, textAlign: 'center', marginHorizontal: theme.spacing.sm },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  addExpenseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  periodBar: { backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, gap: theme.spacing.sm },
  periodToggle: { flexDirection: 'row', backgroundColor: theme.colors.borderLight, borderRadius: theme.borderRadius.full, padding: 3, alignSelf: 'flex-start' },
  periodBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: theme.borderRadius.full },
  periodBtnActive: { backgroundColor: theme.colors.surface, ...theme.shadows.sm },
  periodBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  periodBtnTextActive: { color: theme.colors.primary },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navArrow: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: theme.borderRadius.full, backgroundColor: theme.colors.borderLight },
  monthNavLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary, flex: 1, textAlign: 'center' },
  ytdLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.primary },
  scrollContent: { padding: theme.spacing.md },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  kpiCard: { width: '47%', padding: theme.spacing.md },
  kpiLabel: { fontSize: 11, color: theme.colors.textSecondary, marginBottom: 6 },
  kpiValue: { fontSize: 20, fontWeight: '800', color: theme.colors.textPrimary, letterSpacing: -0.5 },
  metricsCard: { marginBottom: theme.spacing.md },
  metricsRow: { flexDirection: 'row' },
  metricItem: { flex: 1, alignItems: 'center' },
  metricDivider: { width: 1, backgroundColor: theme.colors.border },
  metricLabel: { fontSize: 11, color: theme.colors.textSecondary, marginBottom: 4 },
  metricValue: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  cashFlowCard: { marginBottom: theme.spacing.lg, borderRadius: theme.borderRadius.md },
  cashFlowRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cashFlowInfo: { flex: 1 },
  cashFlowTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  cashFlowDesc: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 },
  section: { marginBottom: theme.spacing.lg },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: theme.spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  addSmallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.full },
  addSmallText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
  rowDivider: { height: 1, backgroundColor: theme.colors.borderLight, marginVertical: 8 },
  breakdownRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  categoryDot: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  breakdownInfo: { flex: 1 },
  breakdownLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  breakdownLabel: { fontSize: 14, fontWeight: '500', color: theme.colors.textPrimary },
  breakdownAmount: { fontSize: 14, fontWeight: '700' },
  breakdownTrack: { height: 5, backgroundColor: theme.colors.borderLight, borderRadius: 3, overflow: 'hidden', marginBottom: 3 },
  breakdownFill: { height: '100%', borderRadius: 3 },
  breakdownPct: { fontSize: 11, color: theme.colors.textTertiary },
  expenseCard: { marginBottom: theme.spacing.sm },
  expenseRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  expenseIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  expenseInfo: { flex: 1 },
  expenseTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 4 },
  expenseMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  categoryBadgeText: { fontSize: 11, fontWeight: '600' },
  expenseDate: { fontSize: 12, color: theme.colors.textTertiary },
  expenseNotes: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 3, fontStyle: 'italic' },
  expenseRight: { alignItems: 'flex-end', gap: 6 },
  expenseAmount: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  deleteBtn: { padding: 4 },
  emptyCard: { alignItems: 'center', paddingVertical: theme.spacing.xl, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary },
  emptyDesc: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', paddingHorizontal: theme.spacing.lg },
  emptyAction: { marginTop: 4, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md },
  emptyActionText: { fontSize: 14, fontWeight: '600', color: theme.colors.textInverse },
  bottomSpacing: { height: theme.spacing.xxl },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.borderRadius.xl, borderTopRightRadius: theme.borderRadius.xl, padding: theme.spacing.lg, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  modalTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary },
  formGroup: { marginBottom: theme.spacing.md },
  label: { fontSize: 14, fontWeight: '500', color: theme.colors.textPrimary, marginBottom: 8 },
  input: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: theme.colors.textPrimary },
  textArea: { height: 80, textAlignVertical: 'top' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.borderRadius.full, backgroundColor: theme.colors.borderLight, borderWidth: 1, borderColor: 'transparent' },
  categoryChipSelected: { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
  categoryChipText: { fontSize: 12, fontWeight: '500', color: theme.colors.textSecondary },
  categoryChipTextSelected: { color: theme.colors.primary, fontWeight: '700' },
  submitButton: { marginTop: theme.spacing.md, marginBottom: theme.spacing.lg },
  scanReceiptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.md, paddingVertical: 14, marginBottom: theme.spacing.sm, borderWidth: 1.5, borderColor: theme.colors.primary + '40', borderStyle: 'dashed' },
  scanReceiptText: { fontSize: 15, fontWeight: '600', color: theme.colors.primary },
  aiBadge: { backgroundColor: theme.colors.primary, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  aiBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  orDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: theme.spacing.md },
  orLine: { flex: 1, height: 1, backgroundColor: theme.colors.borderLight },
  orText: { fontSize: 12, color: theme.colors.textTertiary },
});
