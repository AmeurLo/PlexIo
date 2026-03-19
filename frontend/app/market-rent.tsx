import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, theme } from '../src/components';
import { formatCurrency } from '../src/utils/format';
import { api } from '../src/services/api';

// ─── Types ─────────────────────────────────────────────────────────────────

type BedType = 'studio' | '1br' | '2br' | '3br' | '4br+';
type CityKey =
  // Grand Montréal
  | 'montreal' | 'laval' | 'longueuil' | 'brossard' | 'terrebonne'
  | 'repentigny' | 'saint-jerome' | 'vaudreuil' | 'blainville'
  | 'dollard-des-ormeaux' | 'mirabel' | 'mascouche' | 'lachute'
  // Montérégie
  | 'saint-jean' | 'granby' | 'saint-hyacinthe' | 'sorel-tracy'
  | 'chateauguay' | 'boucherville' | 'la-prairie' | 'saint-jean-baptiste'
  | 'salaberry-de-valleyfield' | 'sainte-julie' | 'beloeil'
  // Région Québec
  | 'quebec' | 'levis' | 'thetford-mines' | 'saint-georges' | 'sainte-marie'
  // Outaouais
  | 'gatineau' | 'aylmer'
  // Estrie
  | 'sherbrooke' | 'magog'
  // Mauricie
  | 'trois-rivieres' | 'shawinigan' | 'la-tuque'
  // Saguenay–Lac-Saint-Jean
  | 'saguenay' | 'alma' | 'roberval'
  // Centre-du-Québec / Lanaudière
  | 'drummondville' | 'victoriaville' | 'joliette'
  // Bas-Saint-Laurent / Côte-Nord
  | 'rimouski' | 'riviere-du-loup' | 'baie-comeau' | 'matane'
  // Abitibi-Témiscamingue
  | 'rouyn-noranda' | 'val-dor' | 'amos'
  // Nord / Gaspésie
  | 'sept-iles' | 'gaspe';

interface SCHLCity {
  label: string;
  vacancyRate: number;
  avgRents: Record<BedType, number>;
  trend: number; // YoY % change
}

// ─── SCHL Market Data (Rapport annuel 2024) ───────────────────────────────────

const SCHL_DATA: Record<CityKey, SCHLCity> = {
  // ── Grand Montréal ──────────────────────────────────────────────────────────
  montreal:      { label: 'Montréal',          vacancyRate: 2.2, trend: 5.8,  avgRents: { studio: 1180, '1br': 1420, '2br': 1650, '3br': 1950, '4br+': 2400 } },
  laval:         { label: 'Laval',              vacancyRate: 1.5, trend: 6.1,  avgRents: { studio: 1050, '1br': 1250, '2br': 1480, '3br': 1780, '4br+': 2100 } },
  longueuil:     { label: 'Longueuil',          vacancyRate: 1.9, trend: 4.8,  avgRents: { studio:  980, '1br': 1180, '2br': 1380, '3br': 1650, '4br+': 1950 } },
  brossard:      { label: 'Brossard',           vacancyRate: 1.6, trend: 5.3,  avgRents: { studio: 1020, '1br': 1220, '2br': 1430, '3br': 1720, '4br+': 2050 } },
  terrebonne:    { label: 'Terrebonne',         vacancyRate: 1.4, trend: 5.6,  avgRents: { studio:  960, '1br': 1150, '2br': 1360, '3br': 1640, '4br+': 1920 } },
  repentigny:    { label: 'Repentigny',         vacancyRate: 1.3, trend: 5.2,  avgRents: { studio:  940, '1br': 1120, '2br': 1330, '3br': 1600, '4br+': 1880 } },
  'saint-jerome':{ label: 'Saint-Jérôme',      vacancyRate: 1.7, trend: 4.9,  avgRents: { studio:  900, '1br': 1060, '2br': 1260, '3br': 1520, '4br+': 1780 } },
  vaudreuil:     { label: 'Vaudreuil-Dorion',  vacancyRate: 1.2, trend: 6.3,  avgRents: { studio: 1010, '1br': 1210, '2br': 1420, '3br': 1710, '4br+': 2000 } },
  blainville:    { label: 'Blainville',         vacancyRate: 1.1, trend: 6.0,  avgRents: { studio:  990, '1br': 1180, '2br': 1390, '3br': 1680, '4br+': 1980 } },
  'dollard-des-ormeaux': { label: 'DDO',        vacancyRate: 1.4, trend: 5.5,  avgRents: { studio: 1100, '1br': 1310, '2br': 1550, '3br': 1850, '4br+': 2200 } },
  mirabel:       { label: 'Mirabel',            vacancyRate: 1.0, trend: 6.8,  avgRents: { studio:  980, '1br': 1160, '2br': 1380, '3br': 1660, '4br+': 1960 } },
  mascouche:     { label: 'Mascouche',          vacancyRate: 1.2, trend: 5.8,  avgRents: { studio:  960, '1br': 1140, '2br': 1360, '3br': 1630, '4br+': 1920 } },
  lachute:       { label: 'Lachute',            vacancyRate: 2.8, trend: 3.2,  avgRents: { studio:  750, '1br':  890, '2br': 1060, '3br': 1280, '4br+': 1500 } },
  // ── Montérégie ──────────────────────────────────────────────────────────────
  'saint-jean':  { label: 'Saint-Jean-s.-R.',  vacancyRate: 2.0, trend: 4.1,  avgRents: { studio:  870, '1br': 1030, '2br': 1240, '3br': 1490, '4br+': 1740 } },
  granby:        { label: 'Granby',             vacancyRate: 2.2, trend: 3.5,  avgRents: { studio:  810, '1br':  960, '2br': 1150, '3br': 1390, '4br+': 1620 } },
  'saint-hyacinthe': { label: 'Saint-Hyacinthe', vacancyRate: 2.6, trend: 3.0, avgRents: { studio: 780, '1br':  920, '2br': 1100, '3br': 1310, '4br+': 1550 } },
  'sorel-tracy': { label: 'Sorel-Tracy',        vacancyRate: 3.4, trend: 2.6,  avgRents: { studio:  720, '1br':  850, '2br': 1010, '3br': 1220, '4br+': 1430 } },
  chateauguay:   { label: 'Châteauguay',        vacancyRate: 1.7, trend: 5.0,  avgRents: { studio: 1000, '1br': 1190, '2br': 1400, '3br': 1690, '4br+': 2000 } },
  boucherville:  { label: 'Boucherville',       vacancyRate: 1.3, trend: 5.5,  avgRents: { studio: 1040, '1br': 1230, '2br': 1460, '3br': 1750, '4br+': 2080 } },
  'la-prairie':  { label: 'La Prairie',         vacancyRate: 1.4, trend: 5.3,  avgRents: { studio: 1020, '1br': 1210, '2br': 1440, '3br': 1720, '4br+': 2050 } },
  'saint-jean-baptiste': { label: 'St-Jean-Baptiste', vacancyRate: 2.5, trend: 3.1, avgRents: { studio: 760, '1br': 900, '2br': 1070, '3br': 1290, '4br+': 1510 } },
  'salaberry-de-valleyfield': { label: 'Valleyfield', vacancyRate: 3.0, trend: 2.7, avgRents: { studio: 740, '1br': 880, '2br': 1050, '3br': 1260, '4br+': 1480 } },
  'sainte-julie': { label: 'Sainte-Julie',      vacancyRate: 1.3, trend: 5.6,  avgRents: { studio: 1040, '1br': 1240, '2br': 1460, '3br': 1750, '4br+': 2060 } },
  beloeil:       { label: 'Beloeil',            vacancyRate: 1.6, trend: 5.1,  avgRents: { studio:  980, '1br': 1170, '2br': 1390, '3br': 1670, '4br+': 1970 } },
  // ── Région Québec ───────────────────────────────────────────────────────────
  quebec:        { label: 'Québec',             vacancyRate: 1.8, trend: 4.2,  avgRents: { studio:  940, '1br': 1100, '2br': 1310, '3br': 1560, '4br+': 1900 } },
  levis:         { label: 'Lévis',              vacancyRate: 1.6, trend: 5.1,  avgRents: { studio:  970, '1br': 1140, '2br': 1330, '3br': 1590, '4br+': 1880 } },
  'thetford-mines': { label: 'Thetford Mines',  vacancyRate: 5.1, trend: 1.2,  avgRents: { studio:  600, '1br':  710, '2br':  840, '3br': 1010, '4br+': 1180 } },
  'saint-georges': { label: 'Saint-Georges',    vacancyRate: 2.8, trend: 2.8,  avgRents: { studio:  680, '1br':  810, '2br':  960, '3br': 1150, '4br+': 1360 } },
  'sainte-marie': { label: 'Sainte-Marie',      vacancyRate: 2.4, trend: 3.0,  avgRents: { studio:  700, '1br':  830, '2br':  990, '3br': 1190, '4br+': 1400 } },
  // ── Outaouais ────────────────────────────────────────────────────────────────
  gatineau:      { label: 'Gatineau',           vacancyRate: 2.8, trend: 4.5,  avgRents: { studio: 1050, '1br': 1220, '2br': 1480, '3br': 1750, '4br+': 2050 } },
  aylmer:        { label: 'Aylmer',             vacancyRate: 2.3, trend: 4.2,  avgRents: { studio: 1020, '1br': 1200, '2br': 1450, '3br': 1720, '4br+': 2020 } },
  // ── Estrie ──────────────────────────────────────────────────────────────────
  sherbrooke:    { label: 'Sherbrooke',         vacancyRate: 2.1, trend: 3.8,  avgRents: { studio:  820, '1br':  970, '2br': 1180, '3br': 1420, '4br+': 1700 } },
  magog:         { label: 'Magog',              vacancyRate: 2.5, trend: 3.2,  avgRents: { studio:  790, '1br':  940, '2br': 1120, '3br': 1350, '4br+': 1580 } },
  // ── Mauricie ─────────────────────────────────────────────────────────────────
  'trois-rivieres': { label: 'Trois-Rivières',  vacancyRate: 2.4, trend: 3.2,  avgRents: { studio:  780, '1br':  920, '2br': 1100, '3br': 1320, '4br+': 1580 } },
  shawinigan:    { label: 'Shawinigan',         vacancyRate: 3.8, trend: 2.1,  avgRents: { studio:  650, '1br':  780, '2br':  930, '3br': 1110, '4br+': 1310 } },
  'la-tuque':    { label: 'La Tuque',           vacancyRate: 5.5, trend: 0.8,  avgRents: { studio:  580, '1br':  690, '2br':  820, '3br':  990, '4br+': 1150 } },
  // ── Saguenay–Lac-Saint-Jean ──────────────────────────────────────────────────
  saguenay:      { label: 'Saguenay',           vacancyRate: 3.5, trend: 2.8,  avgRents: { studio:  700, '1br':  830, '2br':  980, '3br': 1180, '4br+': 1400 } },
  alma:          { label: 'Alma',               vacancyRate: 4.0, trend: 1.9,  avgRents: { studio:  620, '1br':  740, '2br':  880, '3br': 1050, '4br+': 1240 } },
  roberval:      { label: 'Roberval',           vacancyRate: 4.8, trend: 1.4,  avgRents: { studio:  590, '1br':  700, '2br':  830, '3br':  990, '4br+': 1160 } },
  // ── Centre-du-Québec / Lanaudière ────────────────────────────────────────────
  drummondville: { label: 'Drummondville',      vacancyRate: 2.9, trend: 2.9,  avgRents: { studio:  740, '1br':  880, '2br': 1050, '3br': 1260, '4br+': 1490 } },
  victoriaville: { label: 'Victoriaville',      vacancyRate: 3.1, trend: 2.4,  avgRents: { studio:  700, '1br':  830, '2br':  990, '3br': 1190, '4br+': 1400 } },
  joliette:      { label: 'Joliette',           vacancyRate: 2.3, trend: 3.4,  avgRents: { studio:  800, '1br':  950, '2br': 1130, '3br': 1360, '4br+': 1590 } },
  // ── Bas-Saint-Laurent ───────────────────────────────────────────────────────
  rimouski:      { label: 'Rimouski',           vacancyRate: 2.7, trend: 2.4,  avgRents: { studio:  720, '1br':  850, '2br': 1010, '3br': 1220, '4br+': 1430 } },
  'riviere-du-loup': { label: 'Rivière-du-Loup', vacancyRate: 3.3, trend: 2.0, avgRents: { studio:  680, '1br':  810, '2br':  960, '3br': 1150, '4br+': 1350 } },
  matane:        { label: 'Matane',             vacancyRate: 4.2, trend: 1.5,  avgRents: { studio:  620, '1br':  730, '2br':  870, '3br': 1040, '4br+': 1220 } },
  // ── Côte-Nord ───────────────────────────────────────────────────────────────
  'baie-comeau': { label: 'Baie-Comeau',        vacancyRate: 3.7, trend: 1.7,  avgRents: { studio:  660, '1br':  780, '2br':  930, '3br': 1110, '4br+': 1310 } },
  // ── Abitibi-Témiscamingue ────────────────────────────────────────────────────
  'rouyn-noranda':{ label: 'Rouyn-Noranda',    vacancyRate: 4.1, trend: 1.8,  avgRents: { studio:  680, '1br':  800, '2br':  950, '3br': 1140, '4br+': 1330 } },
  'val-dor':     { label: "Val-d'Or",           vacancyRate: 3.6, trend: 1.5,  avgRents: { studio:  650, '1br':  770, '2br':  920, '3br': 1100, '4br+': 1290 } },
  amos:          { label: 'Amos',               vacancyRate: 4.5, trend: 1.2,  avgRents: { studio:  620, '1br':  730, '2br':  870, '3br': 1040, '4br+': 1220 } },
  // ── Nord / Gaspésie ──────────────────────────────────────────────────────────
  'sept-iles':   { label: 'Sept-Îles',          vacancyRate: 3.2, trend: 1.9,  avgRents: { studio:  700, '1br':  820, '2br':  970, '3br': 1160, '4br+': 1350 } },
  gaspe:         { label: 'Gaspé',              vacancyRate: 4.4, trend: 1.3,  avgRents: { studio:  600, '1br':  710, '2br':  840, '3br': 1010, '4br+': 1180 } },
};

// Grouped by region
const CITIES: CityKey[] = [
  // Grand Montréal
  'montreal', 'laval', 'longueuil', 'brossard', 'terrebonne',
  'repentigny', 'saint-jerome', 'vaudreuil', 'blainville',
  'dollard-des-ormeaux', 'mirabel', 'mascouche', 'lachute',
  // Montérégie
  'saint-jean', 'granby', 'saint-hyacinthe', 'sorel-tracy',
  'chateauguay', 'boucherville', 'la-prairie', 'saint-jean-baptiste',
  'salaberry-de-valleyfield', 'sainte-julie', 'beloeil',
  // Région Québec
  'quebec', 'levis', 'thetford-mines', 'saint-georges', 'sainte-marie',
  // Outaouais
  'gatineau', 'aylmer',
  // Estrie
  'sherbrooke', 'magog',
  // Mauricie
  'trois-rivieres', 'shawinigan', 'la-tuque',
  // Saguenay–LSJ
  'saguenay', 'alma', 'roberval',
  // Centre-QC / Lanaudière
  'drummondville', 'victoriaville', 'joliette',
  // Bas-Saint-Laurent
  'rimouski', 'riviere-du-loup', 'matane',
  // Côte-Nord
  'baie-comeau', 'sept-iles',
  // Abitibi-Témiscamingue
  'rouyn-noranda', 'val-dor', 'amos',
  // Gaspésie / Nord
  'gaspe',
];

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

// Map numeric bedrooms to BedType
function toBedType(n: number): BedType {
  if (n === 0) return 'studio';
  if (n === 1) return '1br';
  if (n === 2) return '2br';
  if (n === 3) return '3br';
  return '4br+';
}

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

// Quebec "pièces" notation (½ = bathroom)
const BED_LABELS: Record<BedType, string> = {
  studio: '1½',
  '1br': '3½',
  '2br': '4½',
  '3br': '5½',
  '4br+': '6½+',
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
  const [selectedCity, setSelectedCity] = useState<CityKey>('montreal');
  const [myUnits, setMyUnits] = useState<MyUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    loadUnits();
  }, []));

  const loadUnits = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await api.getUnitsSummary();
      const mapped: MyUnit[] = (data as any[]).map(u => ({
        id: u.id,
        propertyName: u.property_name,
        unitNumber: u.unit_number || '',
        bedrooms: toBedType(u.bedrooms ?? 1),
        sqft: u.sqft || 0,
        currentRent: u.current_rent || 0,
        tenantName: u.tenant_name || undefined,
        leaseEnd: u.lease_end || undefined,
      }));
      setMyUnits(mapped);
    } catch {
      // Silently fail — screen still shows SCHL data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredComps = selectedBed === 'all'
    ? MARKET_COMPS
    : MARKET_COMPS.filter(c => c.bedrooms === selectedBed);

  const filteredUnits = selectedBed === 'all'
    ? myUnits
    : myUnits.filter(u => u.bedrooms === selectedBed);

  const stats = getMarketStats(filteredComps);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Intelligence de marché</Text>
          <Text style={styles.headerSub}>Données SCHL · {SCHL_DATA[selectedCity].label}</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadUnits(true)} tintColor={theme.colors.primary} />}
        showsVerticalScrollIndicator={false}
      >

        {/* City selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
          {CITIES.map(city => (
            <TouchableOpacity
              key={city}
              style={[styles.filterChip, selectedCity === city && styles.filterChipActive]}
              onPress={() => setSelectedCity(city)}
            >
              <Text style={[styles.filterChipText, selectedCity === city && styles.filterChipTextActive]}>
                {SCHL_DATA[city].label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* SCHL Data Card */}
        {(() => {
          const city = SCHL_DATA[selectedCity];
          const BED_TYPES_DISPLAY: BedType[] = ['studio', '1br', '2br', '3br'];
          return (
            <Card style={styles.schlCard}>
              <View style={styles.schlHeader}>
                <View style={styles.schlHeaderLeft}>
                  <Text style={styles.schlTitle}>Loyers moyens SCHL 2024</Text>
                  <Text style={styles.schlSub}>{city.label} · Rapport annuel</Text>
                </View>
                <View style={styles.schlMeta}>
                  <View style={styles.schlVacancy}>
                    <Text style={styles.schlVacancyValue}>{city.vacancyRate} %</Text>
                    <Text style={styles.schlVacancyLabel}>Inoccupation</Text>
                  </View>
                  <View style={[styles.schlTrend, { backgroundColor: city.trend > 0 ? '#E6F9F4' : '#FDE8E8' }]}>
                    <Ionicons name={city.trend >= 0 ? 'trending-up' : 'trending-down'} size={12} color={city.trend >= 0 ? theme.colors.success : theme.colors.error} />
                    <Text style={[styles.schlTrendText, { color: city.trend >= 0 ? theme.colors.success : theme.colors.error }]}>
                      +{city.trend} %/an
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.schlRentsRow}>
                {BED_TYPES_DISPLAY.map(bed => (
                  <View key={bed} style={[styles.schlRentItem, selectedBed === bed && { borderColor: theme.colors.primary, borderWidth: 1.5 }]}>
                    <Text style={styles.schlBedLabel}>{BED_LABELS[bed]}</Text>
                    <Text style={styles.schlRentValue}>{formatCurrency(city.avgRents[bed])}</Text>
                    <Text style={styles.schlRentSub}>moy./mois</Text>
                  </View>
                ))}
              </View>
            </Card>
          );
        })()}

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
        {loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : filteredUnits.length > 0 && (
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

        {/* TAL / IPC Card */}
        <Card style={styles.talInfoCard}>
          <View style={styles.talInfoHeader}>
            <Ionicons name="shield-checkmark-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.talInfoTitle}>Hausse de loyer · TAL 2025</Text>
          </View>
          <View style={styles.talInfoRow}>
            <View style={styles.talInfoItem}>
              <Text style={styles.talInfoValue}>2,8 %</Text>
              <Text style={styles.talInfoLabel}>IPC Québec{'\n'}(max. recommandé)</Text>
            </View>
            <View style={styles.talInfoDivider} />
            <View style={styles.talInfoItem}>
              <Text style={styles.talInfoValue}>3 mois</Text>
              <Text style={styles.talInfoLabel}>Avis minimum{'\n'}avant renouvellement</Text>
            </View>
            <View style={styles.talInfoDivider} />
            <View style={styles.talInfoItem}>
              <Text style={styles.talInfoValue}>90 j</Text>
              <Text style={styles.talInfoLabel}>Avis de{'\n'}non-renouvellement</Text>
            </View>
          </View>
          <Text style={styles.talInfoNote}>
            Toute hausse doit respecter les critères du TAL. Une hausse supérieure à 2,8 % (IPC 2025) doit être justifiée devant le Tribunal.
          </Text>
        </Card>

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

  // SCHL card
  schlCard: { marginBottom: theme.spacing.md, backgroundColor: theme.colors.surface },
  schlHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: theme.spacing.sm },
  schlHeaderLeft: { flex: 1 },
  schlTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary },
  schlSub: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 2 },
  schlMeta: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  schlVacancy: { alignItems: 'center' },
  schlVacancyValue: { fontSize: 15, fontWeight: '800', color: theme.colors.textPrimary },
  schlVacancyLabel: { fontSize: 9, color: theme.colors.textTertiary, textAlign: 'center' },
  schlTrend: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  schlTrendText: { fontSize: 11, fontWeight: '700' },
  schlRentsRow: { flexDirection: 'row', gap: 6 },
  schlRentItem: { flex: 1, alignItems: 'center', backgroundColor: theme.colors.background, borderRadius: 10, padding: 8, borderWidth: 1, borderColor: theme.colors.borderLight },
  schlBedLabel: { fontSize: 14, fontWeight: '800', color: theme.colors.primary, marginBottom: 3 },
  schlRentValue: { fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary },
  schlRentSub: { fontSize: 9, color: theme.colors.textTertiary, marginTop: 1 },

  // TAL info card
  talInfoCard: { marginBottom: theme.spacing.md, backgroundColor: theme.colors.primaryLight, borderWidth: 1, borderColor: theme.colors.primary + '30' },
  talInfoHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: theme.spacing.sm },
  talInfoTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
  talInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
  talInfoItem: { flex: 1, alignItems: 'center' },
  talInfoValue: { fontSize: 18, fontWeight: '800', color: theme.colors.primary },
  talInfoLabel: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 2, textAlign: 'center', lineHeight: 14 },
  talInfoDivider: { width: 1, height: 38, backgroundColor: theme.colors.primary + '30' },
  talInfoNote: { fontSize: 11, color: theme.colors.textSecondary, lineHeight: 16, fontStyle: 'italic' },
});
