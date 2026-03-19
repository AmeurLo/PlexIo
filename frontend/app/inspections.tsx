import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, KeyboardAvoidingView, Platform,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Card, theme } from '../src/components';
import { api } from '../src/services/api';

type InspectionType = 'move_in' | 'move_out' | 'routine';
type ItemStatus = 'good' | 'fair' | 'poor' | 'na';

interface CheckItem {
  id: string;
  label: string;
  status: ItemStatus;
  notes: string;
  photo_count: number;
}

interface Inspection {
  id: string;
  type: InspectionType;
  unit: string;
  tenant: string;
  date: string;
  status: 'draft' | 'completed' | 'signed';
  items_done: number;
  total_items: number;
}

const TYPE_CONFIG: Record<InspectionType, { label: string; color: string; icon: string }> = {
  move_in:  { label: 'Entrée',     color: theme.colors.success, icon: 'enter-outline' },
  move_out: { label: 'Sortie',     color: theme.colors.error,   icon: 'exit-outline' },
  routine:  { label: 'Périodique', color: theme.colors.info,    icon: 'clipboard-outline' },
};

const STATUS_CONFIG: Record<ItemStatus, { label: string; color: string }> = {
  good: { label: 'Bon état',      color: theme.colors.success },
  fair: { label: 'Usure normale', color: theme.colors.warning },
  poor: { label: 'Endommagé',     color: theme.colors.error },
  na:   { label: 'N/A',           color: theme.colors.textTertiary },
};

const DEFAULT_ITEMS: Omit<CheckItem, 'id'>[] = [
  { label: 'Planchers',                  status: 'good', notes: '', photo_count: 0 },
  { label: 'Murs et plafonds',           status: 'good', notes: '', photo_count: 0 },
  { label: 'Portes et serrures',         status: 'good', notes: '', photo_count: 0 },
  { label: 'Fenêtres',                   status: 'good', notes: '', photo_count: 0 },
  { label: 'Cuisine — armoires',         status: 'good', notes: '', photo_count: 0 },
  { label: 'Cuisine — électroménagers',  status: 'good', notes: '', photo_count: 0 },
  { label: 'Salle de bain',             status: 'good', notes: '', photo_count: 0 },
  { label: 'Plomberie',                  status: 'good', notes: '', photo_count: 0 },
  { label: 'Électricité / prises',       status: 'good', notes: '', photo_count: 0 },
  { label: 'Chauffage',                  status: 'good', notes: '', photo_count: 0 },
  { label: 'Propreté générale',          status: 'good', notes: '', photo_count: 0 },
  { label: 'Balcon / extérieur',         status: 'na',   notes: '', photo_count: 0 },
];

export default function InspectionsScreen() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [inspType, setInspType] = useState<InspectionType>('move_in');
  const [inspUnit, setInspUnit] = useState('');
  const [inspTenant, setInspTenant] = useState('');
  const [items, setItems] = useState<CheckItem[]>([]);

  useFocusEffect(useCallback(() => {
    loadInspections();
  }, []));

  const loadInspections = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await api.getInspections();
      setInspections(data as Inspection[]);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les inspections.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const startNew = () => {
    setInspUnit(''); setInspTenant(''); setInspType('move_in');
    setShowNew(true);
  };

  const openInspection = () => {
    setItems(DEFAULT_ITEMS.map((item, i) => ({ ...item, id: String(i) })));
    setShowNew(false);
    setShowDetail(true);
  };

  const updateItem = (id: string, field: keyof CheckItem, value: any) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const addPhoto = async (id: string) => {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) {
      updateItem(id, 'photo_count', (items.find(i => i.id === id)?.photo_count ?? 0) + 1);
    }
  };

  const deleteInspection = (insp: Inspection) => {
    Alert.alert('Supprimer', `Supprimer l'inspection du ${insp.date} ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try {
          await api.deleteInspection(insp.id);
          setInspections(prev => prev.filter(i => i.id !== insp.id));
        } catch {
          Alert.alert('Erreur', 'Impossible de supprimer.');
        }
      }},
    ]);
  };

  const finalize = async () => {
    setSaving(true);
    try {
      const itemsDone = items.filter(i => i.status !== 'na').length;
      const created = await api.createInspection({
        type: inspType,
        unit: inspUnit || 'Logement sélectionné',
        tenant: inspTenant || 'Locataire',
        date: new Date().toISOString().slice(0, 10),
        status: 'completed',
        items: items,
        items_done: itemsDone,
        total_items: items.length,
      });
      setInspections(prev => [created as Inspection, ...prev]);
      setShowDetail(false);
      Alert.alert('Inspection complétée', 'Le rapport a été sauvegardé.');
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder l\'inspection.');
    } finally {
      setSaving(false);
    }
  };

  const goodCount = items.filter(i => i.status === 'good').length;
  const poorCount = items.filter(i => i.status === 'poor').length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Inspections</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Inspections</Text>
        <TouchableOpacity onPress={startNew} style={styles.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadInspections(true)} tintColor={theme.colors.primary} />}
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          {(['move_in', 'move_out', 'routine'] as InspectionType[]).map(t => {
            const cfg = TYPE_CONFIG[t];
            const count = inspections.filter(i => i.type === t).length;
            return (
              <Card key={t} style={styles.statCard}>
                <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
                <Text style={[styles.statValue, { color: cfg.color }]}>{count}</Text>
                <Text style={styles.statLabel}>{cfg.label}</Text>
              </Card>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Historique</Text>

        {inspections.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="clipboard-outline" size={32} color={theme.colors.textTertiary} />
            <Text style={styles.emptyText}>Aucune inspection — appuyez sur + pour commencer</Text>
          </Card>
        ) : (
          inspections.map(insp => {
            const cfg = TYPE_CONFIG[insp.type];
            return (
              <TouchableOpacity key={insp.id} activeOpacity={0.8} onLongPress={() => deleteInspection(insp)}>
                <Card style={styles.inspCard}>
                  <View style={styles.inspTop}>
                    <View style={[styles.typeIcon, { backgroundColor: cfg.color + '18' }]}>
                      <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inspUnit}>{insp.unit}</Text>
                      <Text style={styles.inspTenant}>{insp.tenant} · {insp.date}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: insp.status === 'signed' ? theme.colors.success + '20' : theme.colors.info + '20' }]}>
                      <Text style={[styles.statusText, { color: insp.status === 'signed' ? theme.colors.success : theme.colors.info }]}>
                        {insp.status === 'signed' ? 'Signé' : 'Complété'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.inspBottom}>
                    <View style={[styles.typePill, { backgroundColor: cfg.color + '18' }]}>
                      <Text style={[styles.typePillText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                    <Text style={styles.itemsCount}>{insp.items_done}/{insp.total_items} éléments ✓</Text>
                    <TouchableOpacity style={styles.pdfBtn} onPress={() => Alert.alert('PDF', 'Fonction bientôt disponible.')}>
                      <Ionicons name="document-outline" size={14} color={theme.colors.primary} />
                      <Text style={styles.pdfBtnText}>PDF</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* New Inspection Setup Modal */}
      <Modal visible={showNew} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle inspection</Text>
              <TouchableOpacity onPress={() => setShowNew(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Type</Text>
              <View style={styles.typeRow}>
                {(['move_in', 'move_out', 'routine'] as InspectionType[]).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, inspType === t && { backgroundColor: TYPE_CONFIG[t].color, borderColor: TYPE_CONFIG[t].color }]}
                    onPress={() => setInspType(t)}
                  >
                    <Ionicons name={TYPE_CONFIG[t].icon as any} size={16} color={inspType === t ? '#fff' : TYPE_CONFIG[t].color} />
                    <Text style={[styles.typeBtnText, inspType === t && { color: '#fff' }]}>{TYPE_CONFIG[t].label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Logement</Text>
              <TextInput style={styles.input} value={inspUnit} onChangeText={setInspUnit} placeholder="Ex. Logement 2 — 123 Rosemont" placeholderTextColor={theme.colors.textTertiary} />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Locataire</Text>
              <TextInput style={styles.input} value={inspTenant} onChangeText={setInspTenant} placeholder="Nom du locataire" placeholderTextColor={theme.colors.textTertiary} />
            </View>
            <TouchableOpacity style={styles.startBtn} onPress={openInspection}>
              <Text style={styles.startBtnText}>Commencer l'inspection →</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Checklist Modal */}
      <Modal visible={showDetail} animationType="slide">
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowDetail(false)} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>Grille d'inspection</Text>
            <View style={styles.progressPill}>
              <Text style={styles.progressText}>{goodCount}✓ {poorCount > 0 ? `${poorCount}⚠` : ''}</Text>
            </View>
          </View>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {items.map((item, idx) => (
              <Card key={item.id} style={styles.checkCard}>
                <Text style={styles.checkLabel}>{idx + 1}. {item.label}</Text>
                <View style={styles.statusRow}>
                  {(['good', 'fair', 'poor', 'na'] as ItemStatus[]).map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.statusBtn, item.status === s && { backgroundColor: STATUS_CONFIG[s].color, borderColor: STATUS_CONFIG[s].color }]}
                      onPress={() => updateItem(item.id, 'status', s)}
                    >
                      <Text style={[styles.statusBtnText, item.status === s && { color: '#fff' }]}>{STATUS_CONFIG[s].label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.noteRow}>
                  <TextInput
                    style={styles.noteInput}
                    value={item.notes}
                    onChangeText={v => updateItem(item.id, 'notes', v)}
                    placeholder="Notes..."
                    placeholderTextColor={theme.colors.textTertiary}
                  />
                  <TouchableOpacity style={styles.cameraBtn} onPress={() => addPhoto(item.id)}>
                    <Ionicons name={item.photo_count > 0 ? 'images' : 'camera-outline'} size={18} color={item.photo_count > 0 ? theme.colors.success : theme.colors.primary} />
                    {item.photo_count > 0 && <Text style={styles.photoCount}>{item.photo_count}</Text>}
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
            <TouchableOpacity style={[styles.startBtn, { marginTop: 8 }]} onPress={finalize} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.startBtnText}>Finaliser et sauvegarder</Text>
              }
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary, marginLeft: 4 },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  progressPill: { backgroundColor: theme.colors.primaryLight, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  progressText: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
  scrollContent: { padding: theme.spacing.md },
  statsRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  statCard: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary, textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: theme.spacing.sm },
  emptyCard: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  emptyText: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center' },
  inspCard: { marginBottom: theme.spacing.sm },
  inspTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  typeIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  inspUnit: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  inspTenant: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '600' },
  inspBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typePillText: { fontSize: 11, fontWeight: '600' },
  itemsCount: { flex: 1, fontSize: 12, color: theme.colors.textSecondary },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: theme.colors.primaryLight, borderRadius: 8 },
  pdfBtnText: { fontSize: 12, fontWeight: '600', color: theme.colors.primary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.borderRadius.xl, borderTopRightRadius: theme.borderRadius.xl, padding: theme.spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  modalTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary },
  formGroup: { marginBottom: theme.spacing.md },
  label: { fontSize: 14, fontWeight: '500', color: theme.colors.textPrimary, marginBottom: 8 },
  input: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: theme.colors.textPrimary },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: theme.borderRadius.md, borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: theme.colors.background },
  typeBtnText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  startBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 14, alignItems: 'center', marginBottom: theme.spacing.md },
  startBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  checkCard: { marginBottom: theme.spacing.sm },
  checkLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 8 },
  statusRow: { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  statusBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: theme.borderRadius.full, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background },
  statusBtnText: { fontSize: 11, fontWeight: '500', color: theme.colors.textSecondary },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noteInput: { flex: 1, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.borderLight, borderRadius: theme.borderRadius.md, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: theme.colors.textPrimary },
  cameraBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  photoCount: { position: 'absolute', top: 2, right: 2, fontSize: 9, fontWeight: '800', color: theme.colors.success, backgroundColor: '#fff', borderRadius: 6, paddingHorizontal: 2 },
});
