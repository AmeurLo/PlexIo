import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, theme } from '../../src/components';
import { api } from '../../src/services/api';
import { HealthScoreResponse, PropertyHealthScore } from '../../src/types';
import { getPropertyTypeLabel } from '../../src/utils/format';
import { useTranslation } from '../../src/i18n/useTranslation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const getScoreColor = (score: number) => {
  if (score >= 70) return theme.colors.success;
  if (score >= 40) return theme.colors.warning;
  return theme.colors.error;
};

const getScoreBgColor = (score: number) => {
  if (score >= 70) return theme.colors.successLight;
  if (score >= 40) return theme.colors.warningLight;
  return theme.colors.errorLight;
};

const getStatusIcon = (status: string): string => {
  switch (status) {
    case 'healthy': return 'shield-checkmark';
    case 'moderate': return 'warning';
    case 'at_risk': return 'alert-circle';
    default: return 'help-circle';
  }
};

const ScoreRing = ({ score, size = 80 }: { score: number; size?: number }) => {
  const color = getScoreColor(score);
  const bgColor = getScoreBgColor(score);
  const ringSize = size;
  const innerSize = ringSize - 10;
  return (
    <View style={[ringStyles.container, { width: ringSize, height: ringSize, borderRadius: ringSize / 2, borderColor: color, backgroundColor: bgColor }]}>
      <View style={[ringStyles.inner, { width: innerSize, height: innerSize, borderRadius: innerSize / 2 }]}>
        <Text style={[ringStyles.score, { color, fontSize: size > 60 ? 24 : 18 }]}>{score}</Text>
      </View>
    </View>
  );
};

const ringStyles = StyleSheet.create({
  container: { borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  inner: { backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  score: { fontWeight: '800' },
});

const BreakdownBar = ({ label, value, maxValue, color }: { label: string; value: number; maxValue: number; color: string }) => {
  const percentage = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0;
  return (
    <View style={barStyles.container}>
      <View style={barStyles.labelRow}>
        <Text style={barStyles.label}>{label}</Text>
        <Text style={[barStyles.value, { color }]}>{Math.round(value)}/{maxValue}</Text>
      </View>
      <View style={barStyles.track}>
        <View style={[barStyles.fill, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
};

const barStyles = StyleSheet.create({
  container: { marginBottom: 12 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500' },
  value: { fontSize: 13, fontWeight: '700' },
  track: { height: 6, backgroundColor: theme.colors.borderLight, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});

export default function HealthScoreScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<HealthScoreResponse | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const result = await api.getHealthScores();
      setData(result);
    } catch (error) {
      console.error('Error loading health scores:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));
  const onRefresh = () => { setRefreshing(true); loadData(); };
  const toggleExpand = (id: string) => { setExpandedId(expandedId === id ? null : id); };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'healthy': return t('statusHealthy') as string;
      case 'moderate': return t('statusModerate') as string;
      case 'at_risk': return t('statusAtRisk') as string;
      default: return status;
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

  if (!data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="analytics-outline" size={48} color={theme.colors.textTertiary} />
          <Text style={styles.emptyText}>{t('unableToLoad') as string}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('healthScore') as string}</Text>
          <Text style={styles.subtitle}>{t('healthSubtitle') as string}</Text>
        </View>
        <View style={[styles.headerBadge, { backgroundColor: getScoreBgColor(data.portfolio_average) }]}>
          <Ionicons name={getStatusIcon(data.portfolio_status) as any} size={22} color={getScoreColor(data.portfolio_average)} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.portfolioCard}>
          <View style={styles.portfolioContent}>
            <ScoreRing score={data.portfolio_average} size={90} />
            <View style={styles.portfolioInfo}>
              <Text style={styles.portfolioLabel}>{t('portfolioAverage') as string}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getScoreBgColor(data.portfolio_average) }]}>
                <Ionicons name={getStatusIcon(data.portfolio_status) as any} size={14} color={getScoreColor(data.portfolio_average)} />
                <Text style={[styles.statusText, { color: getScoreColor(data.portfolio_average) }]}>
                  {getStatusLabel(data.portfolio_status)}
                </Text>
              </View>
              <Text style={styles.portfolioDesc}>
                {(t('basedOn') as Function)(data.properties.length)}
              </Text>
            </View>
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.success }]} />
              <Text style={styles.legendText}>{t('legend70') as string}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.warning }]} />
              <Text style={styles.legendText}>{t('legend40') as string}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.error }]} />
              <Text style={styles.legendText}>{t('legend0') as string}</Text>
            </View>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>{t('propertiesSection') as string}</Text>

        {data.properties.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="home-outline" size={40} color={theme.colors.textTertiary} />
            <Text style={styles.emptyCardTitle}>{t('noPropertiesHealthTitle') as string}</Text>
            <Text style={styles.emptyCardText}>{t('noPropertiesHealthDesc') as string}</Text>
          </Card>
        ) : (
          data.properties.map((property) => (
            <PropertyHealthCard
              key={property.property_id}
              property={property}
              expanded={expandedId === property.property_id}
              onToggle={() => toggleExpand(property.property_id)}
              getStatusLabel={getStatusLabel}
            />
          ))
        )}

        <Card style={styles.explainerCard}>
          <View style={styles.explainerHeader}>
            <Ionicons name="information-circle" size={20} color={theme.colors.info} />
            <Text style={styles.explainerTitle}>{t('howScoresWork') as string}</Text>
          </View>
          <View style={styles.explainerGrid}>
            {[
              { label: t('explainerRent') as string, pts: '25' },
              { label: t('explainerOccupancy') as string, pts: '20' },
              { label: t('explainerMaintenance') as string, pts: '15' },
              { label: t('explainerLease') as string, pts: '20' },
            ].map((item) => (
              <View key={item.label} style={styles.explainerItem}>
                <Text style={styles.explainerLabel}>{item.label}</Text>
                <Text style={styles.explainerValue}>{item.pts} pts</Text>
              </View>
            ))}
            <View style={styles.explainerItem}>
              <Text style={styles.explainerLabel}>{t('explainerFinancial') as string}</Text>
              <Text style={[styles.explainerValue, { color: theme.colors.primary }]}>20 pts</Text>
            </View>
          </View>
        </Card>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const PropertyHealthCard = ({
  property, expanded, onToggle, getStatusLabel,
}: {
  property: PropertyHealthScore;
  expanded: boolean;
  onToggle: () => void;
  getStatusLabel: (s: string) => string;
}) => {
  const { t } = useTranslation();
  const color = getScoreColor(property.score);
  const bgColor = getScoreBgColor(property.score);

  const renderTip = () => {
    const { breakdown } = property;
    const areas = [
      { value: breakdown.rent_collection / 25, type: 'rent' },
      { value: breakdown.occupancy / 20, type: 'occupancy' },
      { value: breakdown.maintenance / 15, type: 'maintenance' },
      { value: breakdown.lease_stability / 20, type: 'lease' },
      { value: (breakdown.financial_performance ?? 0) / 20, type: 'finance' },
    ];
    const weakest = areas.reduce((min, a) => (a.value < min.value ? a : min), areas[0]);
    if (weakest.value >= 0.7) return null;

    let tipText = '';
    let tipIcon = 'bulb-outline';
    switch (weakest.type) {
      case 'rent':       tipText = t('tipRent') as string;        tipIcon = 'cash-outline'; break;
      case 'occupancy':  tipText = t('tipOccupancy') as string;   tipIcon = 'people-outline'; break;
      case 'maintenance':tipText = t('tipMaintenance') as string; tipIcon = 'construct-outline'; break;
      case 'lease':      tipText = t('tipLease') as string;       tipIcon = 'document-text-outline'; break;
      case 'finance':    tipText = t('tipFinance') as string;     tipIcon = 'trending-down-outline'; break;
    }

    return (
      <View style={styles.tipContainer}>
        <Ionicons name={tipIcon as any} size={16} color={theme.colors.info} />
        <Text style={styles.tipText}>
          <Text style={styles.tipBold}>{t('tip') as string} </Text>{tipText}
        </Text>
      </View>
    );
  };

  return (
    <Card style={styles.propertyCard}>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.7} style={styles.propertyTouchable}>
        <View style={styles.propertyMainRow}>
          <ScoreRing score={property.score} size={56} />
          <View style={styles.propertyInfo}>
            <Text style={styles.propertyName}>{property.property_name}</Text>
            <View style={styles.propertyMeta}>
              <View style={styles.metaTag}>
                <Text style={styles.metaText}>{getPropertyTypeLabel(property.property_type)}</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: bgColor }]}>
                <Text style={[styles.statusPillText, { color }]}>{getStatusLabel(property.status)}</Text>
              </View>
            </View>
          </View>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.textTertiary} />
        </View>

        <View style={styles.quickStats}>
          <View style={styles.quickStatItem}>
            <Ionicons name="people-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.quickStatText}>
              {(t('unitsLabel') as Function)(property.occupied_units, property.total_units)}
            </Text>
          </View>
          <View style={styles.quickStatItem}>
            <Ionicons name="cash-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.quickStatText}>
              {(t('collectedPct') as Function)(property.collection_rate)}
            </Text>
          </View>
          {property.open_issues > 0 && (
            <View style={styles.quickStatItem}>
              <Ionicons name="construct-outline" size={14} color={theme.colors.warning} />
              <Text style={[styles.quickStatText, { color: theme.colors.warning }]}>
                {(t('issueCount') as Function)(property.open_issues)}
              </Text>
            </View>
          )}
          {property.days_to_nearest_expiry !== null && property.days_to_nearest_expiry <= 60 && (
            <View style={styles.quickStatItem}>
              <Ionicons
                name="time-outline"
                size={14}
                color={property.days_to_nearest_expiry <= 30 ? theme.colors.error : theme.colors.warning}
              />
              <Text style={[styles.quickStatText, { color: property.days_to_nearest_expiry <= 30 ? theme.colors.error : theme.colors.warning }]}>
                {property.days_to_nearest_expiry <= 0
                  ? (t('leaseExpired') as string)
                  : (t('daysLease') as Function)(property.days_to_nearest_expiry)}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.breakdownContainer}>
          <View style={styles.breakdownDivider} />
          <Text style={styles.breakdownTitle}>{t('scoreBreakdown') as string}</Text>
          <BreakdownBar label={t('breakdownRent') as string} value={property.breakdown.rent_collection} maxValue={25} color={property.breakdown.rent_collection >= 17.5 ? theme.colors.success : property.breakdown.rent_collection >= 10 ? theme.colors.warning : theme.colors.error} />
          <BreakdownBar label={t('breakdownOccupancy') as string} value={property.breakdown.occupancy} maxValue={20} color={property.breakdown.occupancy >= 14 ? theme.colors.success : property.breakdown.occupancy >= 8 ? theme.colors.warning : theme.colors.error} />
          <BreakdownBar label={t('breakdownMaintenance') as string} value={property.breakdown.maintenance} maxValue={15} color={property.breakdown.maintenance >= 10.5 ? theme.colors.success : property.breakdown.maintenance >= 6 ? theme.colors.warning : theme.colors.error} />
          <BreakdownBar label={t('breakdownLease') as string} value={property.breakdown.lease_stability} maxValue={20} color={property.breakdown.lease_stability >= 14 ? theme.colors.success : property.breakdown.lease_stability >= 8 ? theme.colors.warning : theme.colors.error} />
          <BreakdownBar label={t('breakdownFinancial') as string} value={property.breakdown.financial_performance ?? 0} maxValue={20} color={(property.breakdown.financial_performance ?? 0) >= 14 ? theme.colors.success : (property.breakdown.financial_performance ?? 0) >= 8 ? theme.colors.warning : theme.colors.error} />
          {renderTip()}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 15, color: theme.colors.textSecondary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.md, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  title: { fontSize: 24, fontWeight: '700', color: theme.colors.textPrimary },
  subtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  headerBadge: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: theme.spacing.md },
  portfolioCard: { marginBottom: theme.spacing.lg },
  portfolioContent: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  portfolioInfo: { flex: 1 },
  portfolioLabel: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 6 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 5, marginBottom: 6 },
  statusText: { fontSize: 13, fontWeight: '600' },
  portfolioDesc: { fontSize: 12, color: theme.colors.textTertiary },
  legend: { flexDirection: 'row', justifyContent: 'center', marginTop: theme.spacing.md, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.borderLight, gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: theme.colors.textSecondary },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: theme.spacing.sm },
  emptyCard: { alignItems: 'center', paddingVertical: theme.spacing.xl, gap: 8 },
  emptyCardTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary },
  emptyCardText: { fontSize: 13, color: theme.colors.textSecondary },
  propertyCard: { marginBottom: theme.spacing.sm, padding: 0 },
  propertyTouchable: { padding: theme.spacing.md },
  propertyMainRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  propertyInfo: { flex: 1 },
  propertyName: { fontSize: 17, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 6 },
  propertyMeta: { flexDirection: 'row', gap: 8 },
  metaTag: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: theme.colors.borderLight, borderRadius: 6 },
  metaText: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '500' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  statusPillText: { fontSize: 11, fontWeight: '600' },
  quickStats: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 12 },
  quickStatItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  quickStatText: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '500' },
  breakdownContainer: { paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.md },
  breakdownDivider: { height: 1, backgroundColor: theme.colors.borderLight, marginBottom: theme.spacing.md },
  breakdownTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 12 },
  tipContainer: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: theme.colors.infoLight, borderRadius: theme.borderRadius.sm, padding: 10, gap: 8, marginTop: 4 },
  tipText: { flex: 1, fontSize: 12, color: theme.colors.textSecondary, lineHeight: 18 },
  tipBold: { fontWeight: '700', color: theme.colors.textPrimary },
  explainerCard: { marginTop: theme.spacing.md },
  explainerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  explainerTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  explainerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  explainerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: (SCREEN_WIDTH - theme.spacing.md * 2 - theme.spacing.md * 2 - 8) / 2, backgroundColor: theme.colors.borderLight, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  explainerLabel: { fontSize: 12, color: theme.colors.textSecondary },
  explainerValue: { fontSize: 12, fontWeight: '700', color: theme.colors.textPrimary },
  bottomSpacing: { height: theme.spacing.xxl },
});
