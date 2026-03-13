import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, theme } from '../src/components';

type Trade = 'plumber' | 'electrician' | 'hvac' | 'painter' | 'carpenter' | 'locksmith' | 'cleaner' | 'general' | 'roofer' | 'exterminator';

interface Contractor {
  id: string;
  name: string;
  company: string;
  trade: Trade;
  phone: string;
  email: string;
  rating: number;
  lastUsed: string;
  notes: string;
  preferred: boolean;
}

const TRADE_CONFIG: Record<Trade, { icon: string; color: string; label: string }> = {
  plumber:      { icon: 'water-outline',         color: '#3B82F6', label: 'Plombier' },
  electrician:  { icon: 'flash-outline',          color: '#F59E0B', label: 'Électricien' },
  hvac:         { icon: 'thermometer-outline',   color: '#EF4444', label: 'Chauffage/Clim' },
  painter:      { icon: 'color-palette-outline', color: '#8B5CF6', label: 'Peintre' },
  carpenter:    { icon: 'hammer-outline',        color: '#92400E', label: 'Menuisier' },
  locksmith:    { icon: 'key-outline',           color: '#6B7280', label: 'Serrurier' },
  cleaner:      { icon: 'sparkles-outline',      color: theme.colors.success, label: 'Entretien' },
  general:      { icon: 'construct-outline',     color: theme.colors.primary, label: 'Général' },
  roofer:       { icon: 'home-outline',          color: '#D97706', label: 'Couvreur' },
  exterminator: { icon: 'bug-outline',           color: '#DC2626', label: 'Extermination' },
};

const MOCK_CONTRACTORS: Contractor[] = [
  { id: '1', name: 'Mario Plante', company: 'Plomberie Plante Inc.', trade: 'plumber', phone: '514-555-0111', email: 'mario@plomberieplante.com', rating: 5, lastUsed: '2026-02-15', notes: 'Disponible les weekends. Urgences 24/7.', preferred: true },
  { id: '2', name: 'Jean-Claude Électro', company: 'JC Électrique', trade: 'electrician', phone: '514-555-0222', email: 'jc@jcelectrique.ca', rating: 4, lastUsed: '2025-11-08', notes: 'Certifié RBQ. Bon prix.', preferred: true },
  { id: '3', name: 'Ahmed Benali', company: 'Peinture Pro MTL', trade: 'painter', phone: '514-555-0333', email: 'ahmed@peinturepro.ca', rating: 5, lastUsed: '2026-01-20', notes: 'Excellent travail, propre.', preferred: false },
  { id: '4', name: 'Sylvie Ménard', company: 'CleanMax Montréal', trade: 'cleaner', phone: '438-555-0444', email: 'sylvie@cleanmax.ca', rating: 4, lastUsed: '2026-03-01', notes: 'Nettoyage régulier parties communes.', preferred: true },
  { id: '5', name: 'Robert Couture', company: 'Serrures Express', trade: 'locksmith', phone: '514-555-0555', email: '', rating: 4, lastUsed: '2025-09-14', notes: '', preferred: false },
];

const blank = (): Omit<Contractor, 'id'> => ({
  name: '', company: '', trade: 'general', phone: '', email: '',
  rating: 5, lastUsed: '', notes: '', preferred: false,
});

export default function ContractorsScreen() {
  const [contractors, setContractors] = useState<Contractor[]>(MOCK_CONTRACTORS);
  const [filterTrade, setFilterTrade] = useState<Trade | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(blank());
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = contractors.filter(c => {
    const matchTrade = filterTrade === 'all' || c.trade === filterTrade;
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.company.toLowerCase().includes(search.toLowerCase());
    return matchTrade && matchSearch;
  });
  const preferred = filtered.filter(c => c.preferred);
  const others = filtered.filter(c => !c.preferred);

  const openAdd = () => { setForm(blank()); setEditId(null); setShowModal(true); };
  const openEdit = (c: Contractor) => { setForm({ ...c }); setEditId(c.id); setShowModal(true); };

  const save = () => {
    if (!form.name.trim() || !form.phone.trim()) {
      Alert.alert('Erreur', 'Nom et téléphone requis.'); return;
    }
    if (editId) {
      setContractors(cs => cs.map(c => c.id === editId ? { ...form, id: editId } : c));
    } else {
      setContractors(cs => [...cs, { ...form, id: Date.now().toString() }]);
    }
    setShowModal(false);
  };

  const del = (id: string) => {
    Alert.alert('Supprimer', 'Retirer ce fournisseur?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => setContractors(cs => cs.filter(c => c.id !== id)) },
    ]);
  };

  const renderCard = (c: Contractor) => {
    const cfg = TRADE_CONFIG[c.trade];
    return (
      <Card key={c.id} style={styles.contractorCard}>
        <View style={styles.cardTop}>
          <View style={[styles.tradeIcon, { backgroundColor: cfg.color + '18' }]}>
            <Ionicons name={cfg.icon as any} size={22} color={cfg.color} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.contractorName}>{c.name}</Text>
              {c.preferred && <Ionicons name="star" size={14} color="#F59E0B" />}
            </View>
            <Text style={styles.companyName}>{c.company}</Text>
            <View style={[styles.tradeBadge, { backgroundColor: cfg.color + '18' }]}>
              <Text style={[styles.tradeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={11} color="#F59E0B" />
            <Text style={styles.ratingText}>{c.rating}.0</Text>
          </View>
        </View>
        {c.notes ? <Text style={styles.notes} numberOfLines={2}>{c.notes}</Text> : null}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(`tel:${c.phone}`)}>
            <Ionicons name="call-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.actionBtnText}>{c.phone}</Text>
          </TouchableOpacity>
          {c.email ? (
            <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(`mailto:${c.email}`)}>
              <Ionicons name="mail-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.actionBtnText}>Courriel</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={() => openEdit(c)} style={styles.iconBtn}>
            <Ionicons name="pencil-outline" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => del(c.id)} style={styles.iconBtn}>
            <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Fournisseurs</Text>
        <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={theme.colors.textTertiary} />
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Rechercher..." placeholderTextColor={theme.colors.textTertiary} />
      </View>

      {/* Trade filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        <TouchableOpacity style={[styles.filterChip, filterTrade === 'all' && styles.filterChipActive]} onPress={() => setFilterTrade('all')}>
          <Text style={[styles.filterChipText, filterTrade === 'all' && styles.filterChipTextActive]}>Tous</Text>
        </TouchableOpacity>
        {(Object.keys(TRADE_CONFIG) as Trade[]).map(t => (
          <TouchableOpacity key={t} style={[styles.filterChip, filterTrade === t && styles.filterChipActive]} onPress={() => setFilterTrade(t)}>
            <Text style={[styles.filterChipText, filterTrade === t && styles.filterChipTextActive]}>{TRADE_CONFIG[t].label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {preferred.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>⭐ Préférés</Text>
            {preferred.map(renderCard)}
          </>
        )}
        {others.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Autres</Text>
            {others.map(renderCard)}
          </>
        )}
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={theme.colors.textTertiary} />
            <Text style={styles.emptyText}>Aucun fournisseur trouvé</Text>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editId ? 'Modifier' : 'Ajouter un fournisseur'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {[
                { label: 'Nom *', key: 'name', placeholder: 'Mario Plante' },
                { label: 'Entreprise', key: 'company', placeholder: 'Plomberie Plante Inc.' },
                { label: 'Téléphone *', key: 'phone', placeholder: '514-555-0000', kbd: 'phone-pad' },
                { label: 'Courriel', key: 'email', placeholder: 'mario@exemple.com', kbd: 'email-address' },
                { label: 'Notes', key: 'notes', placeholder: 'Disponible weekends, urgences...' },
              ].map(f => (
                <View key={f.key} style={styles.formGroup}>
                  <Text style={styles.label}>{f.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={(form as any)[f.key]}
                    onChangeText={v => setForm(prev => ({ ...prev, [f.key]: v }))}
                    placeholder={f.placeholder}
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType={(f.kbd as any) || 'default'}
                    autoCapitalize={f.key === 'email' ? 'none' : 'words'}
                  />
                </View>
              ))}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Spécialité</Text>
                <View style={styles.tradeGrid}>
                  {(Object.keys(TRADE_CONFIG) as Trade[]).map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.tradeChip, form.trade === t && { backgroundColor: TRADE_CONFIG[t].color, borderColor: TRADE_CONFIG[t].color }]}
                      onPress={() => setForm(prev => ({ ...prev, trade: t }))}
                    >
                      <Ionicons name={TRADE_CONFIG[t].icon as any} size={14} color={form.trade === t ? '#fff' : TRADE_CONFIG[t].color} />
                      <Text style={[styles.tradeChipText, form.trade === t && { color: '#fff' }]}>{TRADE_CONFIG[t].label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.preferredRow}>
                <Text style={styles.label}>Marquer comme préféré ⭐</Text>
                <TouchableOpacity
                  style={[styles.preferredToggle, form.preferred && styles.preferredToggleOn]}
                  onPress={() => setForm(prev => ({ ...prev, preferred: !prev.preferred }))}
                >
                  <Text style={[styles.preferredToggleText, form.preferred && { color: '#fff' }]}>
                    {form.preferred ? 'Oui' : 'Non'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={save}>
                <Text style={styles.saveBtnText}>{editId ? 'Enregistrer' : 'Ajouter'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary, marginLeft: 4 },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: theme.spacing.md, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.colors.borderLight },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: theme.colors.textPrimary },
  filterRow: { paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.sm, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: theme.borderRadius.full, backgroundColor: theme.colors.borderLight },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterChipText: { fontSize: 13, fontWeight: '500', color: theme.colors.textSecondary },
  filterChipTextActive: { color: '#fff', fontWeight: '700' },
  scrollContent: { padding: theme.spacing.md },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  contractorCard: { marginBottom: theme.spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  tradeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  contractorName: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  companyName: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 1, marginBottom: 4 },
  tradeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  tradeBadgeText: { fontSize: 11, fontWeight: '600' },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ratingText: { fontSize: 12, fontWeight: '700', color: '#92400E' },
  notes: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 8, fontStyle: 'italic' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.full },
  actionBtnText: { fontSize: 13, fontWeight: '500', color: theme.colors.primary },
  iconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, color: theme.colors.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.borderRadius.xl, borderTopRightRadius: theme.borderRadius.xl, padding: theme.spacing.lg, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  modalTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary },
  formGroup: { marginBottom: theme.spacing.md },
  label: { fontSize: 14, fontWeight: '500', color: theme.colors.textPrimary, marginBottom: 8 },
  input: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: theme.colors.textPrimary },
  tradeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tradeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: theme.borderRadius.full, backgroundColor: theme.colors.borderLight, borderWidth: 1, borderColor: 'transparent' },
  tradeChipText: { fontSize: 12, fontWeight: '500', color: theme.colors.textSecondary },
  preferredRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.lg },
  preferredToggle: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: theme.borderRadius.full, backgroundColor: theme.colors.borderLight },
  preferredToggleOn: { backgroundColor: '#F59E0B' },
  preferredToggleText: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
  saveBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 14, alignItems: 'center', marginBottom: theme.spacing.lg },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
