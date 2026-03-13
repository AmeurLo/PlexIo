import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, theme } from '../src/components';
import { formatCurrency } from '../src/utils/format';

// ─── Types ─────────────────────────────────────────────────────────────────

type BedType = 'studio' | '1br' | '2br' | '3br' | '4br+';

interface MarketComp {
  id: string;
  address: string;
  neighbourhood: string;
  bedrooms: BedType;
  sqft: number;
  askingRent: number;
  source: 'Kijiji' | 'Centris' | 'Zumper' | 'Facebook';
  daysListed: number;
  furnished: boolean;
  parking: boolean;
}

interface MyUnit {
  id: string;
  propertyName: string;
  unitNumber: string;
  bedrooms: BedType;
  sqft: number;
  currentRent: number;
  tenantName?: string;
  leaseEnd?: string;
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MY_UNITS: MyUnit[] = [
  {
    id: 'u1',
    propertyName: 'Duplex St-Henri',
    unitNumber: '101',
    bedrooms: '2br',
    sqft: 780,
    currentRent: 1250,
    tenantName: 'Michael John',
    leaseEnd: '2025-06-30',
  },
  {
    id: 'u2',
    propertyName: 'Duplex St-Henri',
    unitNumber: '201',
    bedrooms: '2br',
    sqft: 810,
    currentRent: 1200,
    tenantName: 'Jean-Paul Leblanc',
    leaseEnd: '2025-08-31',
  },
  {
    id: 'u3',
    propertyName: 'Triplex Rosemont',
    unitNumber: '1',
    bedrooms: '3br',
    sqft: 1050,
    currentRent: 1480,
    tenantName: 'Sophie Bernard',
    leaseEnd: '2025-05-31',
  },
  {
    id: 'u4',
    propertyName: 'Triplex Rosemont',
    unitNumber: '2',
    bedrooms: '1br',
    sqft: 560,
    currentRent: 920,
    tenantName: undefined,
    leaseEnd: undefined,
  },
];

const MARKET_COMPS: MarketComp[] = [
  // 2BR
  { id: 'c1', address: '2347 Rue Notre-Dame O', neighbourhood: 'St-Henri', bedrooms: '2br', sqft: 760, askingRent: 1500, source: 'Kijiji', daysListed: 8, furnished: false, parking: false },
  { id: 'c2', address: '3412 Rue Saint-Jacques', neighbourhood: 'St-Henri', bedrooms: '2br', sqft: 800, askingRent: 1550, source: 'Centris', daysListed: 14, furnished: false, parking: true },
  { id: 'c3', address: '1890 Ave Lafleur', neighbourhood: 'Verdun', bedrooms: '2br', sqft: 740, askingRent: 1380, source: 'Zumper', daysListed: 3, furnished: false, parking: false },
  { id: 'c4', address: '4102 Boul. Monk', neighbourhood: 'St-Henri', bedrooms: '2br', sqft: 820, askingRent: 1620, source: 'Centris', daysListed: 21, furnished: false, parking: false },
  { id: 'c5', address: '2805 Rue Centre', neighbourhood: 'Pointe-St-Charles', bedrooms: '2br', sqft: 770, askingRent: 1450, source: 'Kijiji', daysListed: 5, furnished: true, parking: false },
  // 3BR
  { id: 'c6', address: '4512 Rue Saint-Zotique', neighbourhood: 'Rosemont', bedrooms: '3br', sqft: 1020, askingRent: 1750, source: 'Centris', daysListed: 11, furnished: false, parking: true },
  { id: 'c7', address: '5023 Rue Beaubien E', neighbourhood: 'Rosemont', bedrooms: '3br', sqft: 980, askingRent: 1680, source: 'Kijiji', daysListed: 6, furnished: false, parking: false },
  { id: 'c8', address: '3890 Ave Papineau', neighbourhood: 'Plateau', bedrooms: '3br', sqft: 1100, askingRent: 1900, source: 'Facebook', daysListed: 2, furnished: false, parking: false },
  // 1BR
  { id: 'c9', address: '2201 Rue Masson', neighbourhood: 'Rosemont', bedrooms: '1br', sqft: 540, askingRent: 1050, source: 'Zumper', daysListed: 9, furnished: false, parking: false },
  { id: 'c10', address: '4670 Rue Garnier', neighbourhood: 'Plateau', bedrooms: '1br', sqft: 580, askingRent: 1120, source: 'Centris', daysListed: 17, furnished: false, parking: false },
  { id: 'c11', address: '1560 Rue Beaubien', neighbourhood: 'Rosemont', bedrooms: '1br', sqft: 500, askingRent: 980, source: 'Kijiji', daysListed: 4, furnished: false, parking: false },
];

const BED_LABELS: Record<BedType, string> = {
  studio: 'Studio',
  '1br': '1 ch.',
  '2br': '2 ch.',
  '3br': '3 ch.',
  '4br+': '4 ch.+',
};

const SOURCE_COLORS: Record<MarketComp['source'], string> = {
  Kijiji: '#4CAF50',
  Centris: '#2196F3',
  Zumper: '#9C27B0',
  Facebook: '#1877F2',
};

const BED_TYPES: BedType[] = ['studio', '1br', '2br', '3br', '4br+'];

// ─── Helper ──────────────────────────────────────────────────────────────────

function getMarketStats(comps: MarketComp[]): { avg: number; min: number; max: number; median: number } {
  if (comps.length === 0) return { avg: 0, min: 0, max: 0, median: 0 };
  const rents = comps.map(c => c.askingRent).sort((a, b) => a - b);
  const avg = Math.round(rents.reduce((s, r) => s + r, 0) / rents.length);
  const min = rents[0];
  const max = rents[rents.length - 1];
  const mid = Math.floor(rents.length / 2);
  const median = rents.length % 2 === 0 ? Math.round((rents[mid - 1] + rents[mid]) / 2) : rents[mid];
  return { avg, min, max, median };
}

function getDelta(current: number, market: number): { pct: number; dir: 'above' | 'below' | 'at' } {
  if (market === 0) return { pct: 0, dir: 'at' };
  const pct = Math.round(((current - market) / market) * 100);
  const dir = pct > 2 ? 'above' : pct < -2 ? 'below' : 'at';
  return { pct: Math.abs(pct), dir };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MarketRentScreen() {
  const [selectedBed, setSelectedBed] = useState<BedType | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    // In production: fetch real comps from API
  }, []));

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const filteredComps = selectedBed === 'all'
    ? MARKET_COMPS
    : MARKET_COMPS.filter(c => c.bedrooms === selectedBed);

  const filteredUnits = selectedBed === 'all'
    ? MY_UNITS
    : MY_UNITS.filter(u => u.bedrooms === selectedBed);

  const stats = getMarketStats(filteredComps);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Loyers du marché</Text>
          <Text style={styles.headerSub}>Quartiers · Montréal</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >

        {/* Bedroom filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
          <TouchableOpacity
            style={[styles.filterChip, selectedBed === 'all' && styles.filterChipActive]}
            onPress={() => setSelectedBed('all')}
          >
            <Text style={[styles.filterChipText, selectedBed === 'all' && styles.filterChipTextActive]}>Tous</Text>
          </TouchableOpacity>
          {BED_TYPES.map(b => (
            <TouchableOpacity
              key={b}
              style={[styles.filterChip, selectedBed === b && styles.filterChipActive]}
              onPress={() => setSelectedBed(b)}
            >
              <Text style={[styles.filterChipText, selectedBed === b && styles.filterChipTextActive]}>{BED_LABELS[b]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Market Stats Bar */}
        {filteredComps.length > 0 && (
          <Card style={styles.statsCard}>
            <Text style={styles.statsTitle}>
              {filteredComps.length} annonce{filteredComps.length > 1 ? 's' : ''} relevées
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatCurrency(stats.min)}</Text>
                <Text style={styles.statLabel}>Min</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={[styles.statItem, styles.statItemMain]}>
                <Text style={[styles.statValue, styles.statValueMain]}>{formatCurrency(stats.median)}</Text>
                <Text style={styles.statLabel}>Médiane</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatCurrency(stats.avg)}</Text>
                <Text style={styles.statLabel}>Moy.</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatCurrency(stats.max)}</Text>
                <Text style={styles.statLabel}>Max</Text>
              </View>
            </View>
          </Card>
        )}

        {/* My Units vs Market */}
        {filteredUnits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mes logements</Text>
            {filteredUnits.map(unit => {
              const compsForBed = MARKET_COMPS.filter(c => c.bedrooms === unit.bedrooms);
              const mkt = getMarketStats(compsForBed);
              const delta = getDelta(unit.currentRent, mkt.median);
              const isExpanded = expandedUnit === unit.id;

              const dirColor = delta.dir === 'above'
                ? theme.colors.success
                : delta.dir === 'below'
                ? theme.colors.warning
                : theme.colors.textSecondary;
              const dirBg = delta.dir === 'above'
                ? '#E6F9F4'
                : delta.dir === 'below'
                ? '#FFF6E6'
                : '#F0F3F7';
              const dirLabel = delta.dir === 'above'
                ? `+${delta.pct}% marché`
                : delta.dir === 'below'
                ? `-${delta.pct}% marché`
                : 'Au prix du marché';
              const dirIcon = delta.dir === 'above'
                ? 'arrow-up-outline'
                : delta.dir === 'below'
                ? 'arrow-down-outline'
                : 'remove-outline';

              return (
                <TouchableOpacity key={unit.id} onPress={() => setExpandedUnit(isExpanded ? null : unit.id)} activeOpacity={0.85}>
                  <Card style={styles.unitCard}>
                    <View style={styles.unitHeader}>
                      <View style={styles.unitInfo}>
                        <Text style={styles.unitName}>{unit.propertyName} · #{unit.unitNumber}</Text>
                        <Text style={styles.unitBed}>{BED_LABELS[unit.bedrooms]} · {unit.sqft} pi²</Text>
                      </View>
                      <View style={[styles.deltaBadge, { backgroundColor: dirBg }]}>
                        <Ionicons name={dirIcon as any} size={13} color={dirColor} />
                        <Text style={[styles.deltaText, { color: dirColor }]}>{dirLabel}</Text>
                      </View>
                    </View>

                    <View style={styles.rentComparison}>
                      <View style={styles.rentBlock}>
                        <Text style={styles.rentValue}>{formatCurrency(unit.currentRent)}</Text>
                        <Text style={styles.rentLabel}>Loyer actuel</Text>
                      </View>
                      <View style={styles.rentArrow}>
                        <Ionicons name="arrow-forward" size={16} color={theme.colors.textTertiary} />
                      </View>
                      <View style={styles.rentBlock}>
                        <Text style={[styles.rentValue, { color: dirColor }]}>{formatCurrency(mkt.median)}</Text>
                        <Text style={styles.rentLabel}>Médiane marché</Text>
                      </View>
                      {delta.dir === 'below' && (
                        <View style={styles.potentialBlock}>
                          <Text style={styles.potentialValue}>+{formatCurrency(mkt.median - unit.currentRent)}/mois</Text>
                          <Text style={styles.potentialLabel}>potentiel</Text>
                        </View>
                      )}
                    </View>

                    {unit.tenantName ? (
                      <View style={styles.tenantRow}>
                        <Ionicons name="person-outline" size={13} color={theme.colors.textTertiary} />
                        <Text style={styles.tenantText}>{unit.tenantName}</Text>
                        {unit.leaseEnd && (
                          <Text style={styles.leaseEndText}>· Bail : {unit.leaseEnd}</Text>
                        )}
                      </View>
                    ) : (
                      <View style={styles.vacantRow}>
                        <Ionicons name="home-outline" size={13} color={theme.colors.warning} />
                        <Text style={[styles.tenantText, { color: theme.colors.warning }]}>Vacant</Text>
                      </View>
                    )}

                    {isExpanded && (
                      <View style={styles.expandedSection}>
                        <View style={styles.expandedDivider} />
                        <Text style={styles.expandedTitle}>Annonces comparables ({compsForBed.length})</Text>
                        {compsForBed.slice(0, 3).map(comp => (
                          <View key={comp.id} style={styles.compRow}>
                            <View style={styles.compLeft}>
                              <Text style={styles.compAddress} numberOfLines={1}>{comp.address}</Text>
                              <Text style={styles.compNeighbourhood}>{comp.neighbourhood} · {comp.sqft} pi²{comp.parking ? ' · 🅿️' : ''}</Text>
                            </View>
                            <View style={styles.compRight}>
                              <Text style={styles.compRent}>{formatCurrency(comp.askingRent)}</Text>
                              <View style={[styles.sourceBadge, { backgroundColor: SOURCE_COLORS[comp.source] + '20' }]}>
                                <Text style={[styles.sourceText, { color: SOURCE_COLORS[comp.source] }]}>{comp.source}</Text>
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    <View style={styles.expandRow}>
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.textTertiary} />
                      <Text style={styles.expandText}>{isExpanded ? 'Réduire' : 'Voir annonces'}</Text>
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* All Market Listings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Annonces du marché</Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://www.kijiji.ca/v-appartement-condo/montreal-nord/c37l1700281')}>
              <Text style={styles.viewAllLink}>Voir plus →</Text>
            </TouchableOpacity>
          </View>

          {filteredComps.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="search-outline" size={28} color={theme.colors.textTertiary} />
              <Text style={styles.emptyText}>Aucune annonce pour ce type</Text>
            </Card>
          ) : (
            filteredComps.map(comp => (
              <Card key={comp.id} style={styles.compCard}>
                <View style={styles.compCardHeader}>
                  <View style={styles.compCardLeft}>
                    <View style={styles.compBedBadge}>
                      <Text style={styles.compBedText}>{BED_LABELS[comp.bedrooms]}</Text>
                    </View>
                    <View style={[styles.sourcePill, { backgroundColor: SOURCE_COLORS[comp.source] + '15' }]}>
                      <Text style={[styles.sourcePillText, { color: SOURCE_COLORS[comp.source] }]}>{comp.source}</Text>
                    </View>
                  </View>
                  <Text style={styles.compCardRent}>{formatCurrency(comp.askingRent)}<Text style={styles.perMonth}>/mois</Text></Text>
                </View>

                <Text style={styles.compCardAddress}>{comp.address}</Text>
                <Text style={styles.compCardNeighbourhood}>{comp.neighbourhood}</Text>

                <View style={styles.compCardFooter}>
                  <View style={styles.compFeatures}>
                    <Ionicons name="resize-outline" size={13} color={theme.colors.textTertiary} />
                    <Text style={styles.compFeatureText}>{comp.sqft} pi²</Text>
                    {comp.furnished && (
                      <>
                        <Text style={styles.compDot}>·</Text>
                        <Ionicons name="bed-outline" size={13} color={theme.colors.textTertiary} />
                        <Text style={styles.compFeatureText}>Meublé</Text>
                      </>
                    )}
                    {comp.parking && (
                      <>
                        <Text style={styles.compDot}>·</Text>
                        <Ionicons name="car-outline" size={13} color={theme.colors.textTertiary} />
                        <Text style={styles.compFeatureText}>Stationnement</Text>
                      </>
                    )}
                  </View>
                  <Text style={styles.daysListed}>{comp.daysListed}j</Text>
                </View>
              </Card>
            ))
          )}
        </View>

        {/* Disclaimer */}
        <Card style={styles.disclaimerCard}>
          <View style={styles.disclaimerHeader}>
            <Ionicons name="information-circle-outline" size={18} color={theme.colors.textSecondary} />
            <Text style={styles.disclaimerTitle}>À propos des données</Text>
          </View>
          <Text style={styles.disclaimerText}>
            Les données comparatives sont des estimations basées sur des annonces publiques (Kijiji, Centris, Zumper, Facebook Marketplace) dans les quartiers voisins. Elles sont actualisées périodiquement et ne constituent pas un avis juridique sur les hausses de loyer permises par le TAL.
          </Text>
        </Card>

        <View style={{ height: 24 }} />
      </ScrollView>
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
  scrollContent: { padding: theme.spacing.md },

  filterRow: { marginBottom: theme.spacing.md, marginHorizontal: -theme.spacing.md },
  filterContent: { paddingHorizontal: theme.spacing.md, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterChipText: { fontSize: 13, fontWeight: '500', color: theme.colors.textSecondary },
  filterChipTextActive: { color: '#FFF' },

  statsCard: { marginBottom: theme.spacing.lg, backgroundColor: theme.colors.primary },
  statsTitle: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)', marginBottom: theme.spacing.sm },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statItem: { alignItems: 'center', flex: 1 },
  statItemMain: {},
  statValue: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  statValueMain: { fontSize: 20, color: '#FFFFFF', fontWeight: '800' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.25)' },

  section: { marginBottom: theme.spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: theme.spacing.sm },
  viewAllLink: { fontSize: 13, color: theme.colors.primary, fontWeight: '600' },

  unitCard: { marginBottom: theme.spacing.sm },
  unitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: theme.spacing.sm },
  unitInfo: { flex: 1 },
  unitName: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  unitBed: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  deltaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  deltaText: { fontSize: 12, fontWeight: '600' },

  rentComparison: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  rentBlock: { alignItems: 'center' },
  rentValue: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
  rentLabel: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 2 },
  rentArrow: { flex: 1, alignItems: 'center' },
  potentialBlock: { alignItems: 'center', backgroundColor: theme.colors.warning + '15', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  potentialValue: { fontSize: 13, fontWeight: '700', color: theme.colors.warning },
  potentialLabel: { fontSize: 10, color: theme.colors.textTertiary },

  tenantRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  vacantRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tenantText: { fontSize: 12, color: theme.colors.textSecondary },
  leaseEndText: { fontSize: 12, color: theme.colors.textTertiary },

  expandedSection: { marginTop: theme.spacing.sm },
  expandedDivider: { height: 1, backgroundColor: theme.colors.borderLight, marginVertical: theme.spacing.sm },
  expandedTitle: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  compRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  compLeft: { flex: 1, marginRight: theme.spacing.sm },
  compAddress: { fontSize: 13, fontWeight: '500', color: theme.colors.textPrimary },
  compNeighbourhood: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 },
  compRight: { alignItems: 'flex-end' },
  compRent: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary },
  sourceBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 2 },
  sourceText: { fontSize: 10, fontWeight: '600' },

  expandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: theme.spacing.sm },
  expandText: { fontSize: 12, color: theme.colors.textTertiary },

  compCard: { marginBottom: theme.spacing.sm },
  compCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  compCardLeft: { flexDirection: 'row', gap: 6 },
  compBedBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: theme.colors.primaryLight },
  compBedText: { fontSize: 11, fontWeight: '700', color: theme.colors.primary },
  sourcePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  sourcePillText: { fontSize: 11, fontWeight: '600' },
  compCardRent: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
  perMonth: { fontSize: 12, fontWeight: '400', color: theme.colors.textSecondary },
  compCardAddress: { fontSize: 14, fontWeight: '500', color: theme.colors.textPrimary },
  compCardNeighbourhood: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2, marginBottom: 8 },
  compCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  compFeatures: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  compFeatureText: { fontSize: 12, color: theme.colors.textTertiary },
  compDot: { fontSize: 12, color: theme.colors.textTertiary },
  daysListed: { fontSize: 12, color: theme.colors.textTertiary },

  emptyCard: { alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.xl, gap: 8 },
  emptyText: { fontSize: 14, color: theme.colors.textSecondary },

  disclaimerCard: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: theme.colors.borderLight },
  disclaimerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  disclaimerTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  disclaimerText: { fontSize: 12, color: theme.colors.textTertiary, lineHeight: 18 },
});
