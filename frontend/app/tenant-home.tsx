/**
 * tenant-home.tsx
 * Standalone tenant-facing portal — accessed after tenant-login OTP flow.
 * Role: tenant (read-only for unit data; can submit maintenance; view payments/docs)
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, theme } from '../src/components';
import { formatCurrency, formatDate } from '../src/utils/format';

// ─── Demo tenant session ──────────────────────────────────────────────────────
const SESSION = {
  name: 'Michael John',
  unit: '101',
  property: 'Duplex St-Henri',
  address: '2347 Rue Notre-Dame O, Montréal, QC H3J 1N6',
  rent: 1250,
  landlord: 'Michael Smith',
  landlordPhone: '(514) 555-0192',
  landlordEmail: 'michael.smith@domely.ca',
  leaseStart: '2023-09-01',
  leaseEnd: '2025-08-31',
  nextPaymentDate: '2025-04-01',
};

// Initials helper
const initials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

type TabId = 'home' | 'payments' | 'maintenance' | 'docs';

interface Ticket {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'open' | 'in_progress' | 'completed';
  date: string;
}

interface Payment {
  id: string;
  period: string;
  amount: number;
  status: 'paid' | 'pending';
  paidDate?: string;
}

const PAYMENTS: Payment[] = [
  { id: '1', period: 'Avril 2025',    amount: 1250, status: 'pending' },
  { id: '2', period: 'Mars 2025',     amount: 1250, status: 'paid',   paidDate: '2025-03-01' },
  { id: '3', period: 'Février 2025',  amount: 1250, status: 'paid',   paidDate: '2025-02-01' },
  { id: '4', period: 'Janvier 2025',  amount: 1250, status: 'paid',   paidDate: '2025-01-02' },
];

const DOCS = [
  { id: 'd1', name: 'Bail 2023-2025',          type: 'Bail',    date: '2023-09-01', icon: 'document-text-outline', color: theme.colors.primary },
  { id: 'd2', name: 'Relevé 31 — 2024',         type: 'Fiscal',  date: '2025-02-28', icon: 'receipt-outline',        color: '#8B5CF6' },
  { id: 'd3', name: 'Avis de renouvellement',   type: 'Avis',    date: '2025-03-01', icon: 'mail-outline',           color: theme.colors.warning },
  { id: 'd4', name: 'Reçu — Mars 2025',         type: 'Reçu',    date: '2025-03-01', icon: 'checkmark-circle-outline',color: theme.colors.success },
];

const INIT_TICKETS: Ticket[] = [
  { id: 't1', title: 'Robinet qui coule',     description: 'Robinet de la salle de bain', category: 'Plomberie',   status: 'in_progress', date: '2025-02-28' },
  { id: 't2', title: 'Ampoule brûlée couloir', description: 'Couloir principal',           category: 'Électricité', status: 'completed',   date: '2025-01-15' },
];

const CATEGORIES = ['Plomberie', 'Électricité', 'Chauffage', 'Fenêtres/Portes', 'Électroménagers', 'Autre'];

const STATUS_CFG = {
  paid:        { label: 'Payé',       color: theme.colors.success, bg: '#E6F9F4' },
  pending:     { label: 'À venir',    color: theme.colors.warning, bg: '#FFF6E6' },
  open:        { label: 'Ouvert',     color: theme.colors.error,   bg: '#FDE8E8' },
  in_progress: { label: 'En cours',   color: theme.colors.warning, bg: '#FFF6E6' },
  completed:   { label: 'Terminé',    color: theme.colors.success, bg: '#E6F9F4' },
};

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

export default function TenantHomeScreen() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [tickets, setTickets] = useState<Ticket[]>(INIT_TICKETS);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'Plomberie' });

  const daysPayment = daysUntil(SESSION.nextPaymentDate);
  const daysLease   = daysUntil(SESSION.leaseEnd);

  const submitRequest = () => {
    if (!form.title.trim() || !form.description.trim()) {
      Alert.alert('Champs requis', 'Complétez le titre et la description.');
      return;
    }
    setTickets(prev => [{
      id: `t${Date.now()}`,
      title: form.title, description: form.description, category: form.category,
      status: 'open', date: new Date().toISOString().split('T')[0],
    }, ...prev]);
    setForm({ title: '', description: '', category: 'Plomberie' });
    setShowModal(false);
    Alert.alert('Envoyé ✓', 'Votre propriétaire a été notifié.');
  };

  const logout = () => {
    Alert.alert('Déconnexion', 'Quitter le portail ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: () => router.replace('/(auth)/tenant-login') },
    ]);
  };

  // ── Tabs ─────────────────────────────────────────────────────────────────────

  const HomeContent = () => (
    <>
      {/* Greeting */}
      <View style={s.greetCard}>
        <View style={{ flex: 1 }}>
          <Text style={s.greetHello}>Bonjour, {SESSION.name.split(' ')[0]} 👋</Text>
          <Text style={s.greetUnit}>{SESSION.property} · Logement {SESSION.unit}</Text>
          <Text style={s.greetAddr}>{SESSION.address}</Text>
        </View>
        <View style={s.greetAvatar}>
          <Text style={s.greetAvatarText}>{initials(SESSION.name)}</Text>
        </View>
      </View>

      {/* KPIs */}
      <View style={s.kpiRow}>
        {[
          { icon: 'cash-outline', value: formatCurrency(SESSION.rent), label: 'Loyer/mois', warn: false },
          { icon: daysPayment<=5 ? 'warning-outline' : 'calendar-outline', value: `${daysPayment}j`, label: 'Prochain loyer', warn: daysPayment<=5 },
          { icon: 'document-text-outline', value: `${daysLease}j`, label: 'Fin du bail', warn: daysLease<90 },
        ].map((k, i) => (
          <Card key={i} style={s.kpiCard}>
            <Ionicons name={k.icon as any} size={20} color={k.warn ? theme.colors.warning : theme.colors.primary} />
            <Text style={[s.kpiValue, k.warn && { color: theme.colors.warning }]}>{k.value}</Text>
            <Text style={s.kpiLabel}>{k.label}</Text>
          </Card>
        ))}
      </View>

      {/* Bail */}
      <Card style={s.leaseCard}>
        <View style={s.leaseHeader}>
          <Ionicons name="document-text" size={16} color={theme.colors.primary} />
          <Text style={s.leaseTitle}>Mon bail</Text>
        </View>
        <View style={s.leaseRow}>
          <View style={s.leaseField}>
            <Text style={s.leaseFieldL}>Début</Text>
            <Text style={s.leaseFieldV}>{formatDate(SESSION.leaseStart)}</Text>
          </View>
          <Ionicons name="arrow-forward" size={14} color={theme.colors.textTertiary} />
          <View style={s.leaseField}>
            <Text style={s.leaseFieldL}>Fin</Text>
            <Text style={s.leaseFieldV}>{formatDate(SESSION.leaseEnd)}</Text>
          </View>
        </View>
      </Card>

      {/* Landlord */}
      <Card>
        <Text style={s.contactTitle}>Mon propriétaire</Text>
        <View style={s.landlordRow}>
          <View style={s.landlordAvatar}>
            <Text style={s.landlordAvatarText}>{initials(SESSION.landlord)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.landlordName}>{SESSION.landlord}</Text>
            <Text style={s.landlordEmail}>{SESSION.landlordEmail}</Text>
          </View>
        </View>
        <View style={s.contactBtns}>
          <TouchableOpacity
            style={[s.contactBtn, s.contactBtnPrimary]}
            onPress={() => router.push({
              pathname: '/chat',
              params: {
                id: 'c1',
                tenantName: SESSION.name,
                tenantInitials: initials(SESSION.name),
                avatarColor: '#6366F1',
                propertyUnit: `${SESSION.property} · ${SESSION.unit}`,
                isOnline: '1',
              },
            })}
          >
            <Ionicons name="chatbubble-outline" size={16} color="#FFF" />
            <Text style={[s.contactBtnText, { color: '#FFF' }]}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.contactBtn, s.contactBtnGray]} onPress={() => Linking.openURL(`tel:${SESSION.landlordPhone}`)}>
            <Ionicons name="call-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={[s.contactBtnText, { color: theme.colors.textSecondary }]}>Appeler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.contactBtn, s.contactBtnGray]} onPress={() => Linking.openURL(`mailto:${SESSION.landlordEmail}`)}>
            <Ionicons name="mail-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={[s.contactBtnText, { color: theme.colors.textSecondary }]}>Courriel</Text>
          </TouchableOpacity>
        </View>
      </Card>
    </>
  );

  const PaymentsContent = () => (
    <>
      {/* Next payment */}
      {(() => {
        const next = PAYMENTS.find(p => p.status === 'pending');
        return next ? (
          <View style={s.nextPayCard}>
            <View>
              <Text style={s.nextPayLabel}>Prochain paiement</Text>
              <Text style={s.nextPayAmt}>{formatCurrency(next.amount)}</Text>
              <Text style={s.nextPayDate}>Dû le {formatDate(SESSION.nextPaymentDate)}</Text>
            </View>
            <Ionicons name="calendar-outline" size={36} color="rgba(255,255,255,0.5)" />
          </View>
        ) : null;
      })()}

      <Text style={s.sectionTitle}>Historique</Text>
      {PAYMENTS.map(p => {
        const cfg = STATUS_CFG[p.status];
        return (
          <Card key={p.id} style={s.payRow}>
            <View style={[s.payIcon, { backgroundColor: cfg.bg }]}>
              <Ionicons name={p.status==='paid' ? 'checkmark-circle' : 'time-outline'} size={18} color={cfg.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.payPeriod}>{p.period}</Text>
              {p.paidDate && <Text style={s.payDate}>Payé le {formatDate(p.paidDate)}</Text>}
            </View>
            <View>
              <Text style={s.payAmt}>{formatCurrency(p.amount)}</Text>
              <View style={[s.statusPill, { backgroundColor: cfg.bg, alignSelf: 'flex-end' }]}>
                <Text style={[s.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
            </View>
          </Card>
        );
      })}
    </>
  );

  const MaintenanceContent = () => (
    <>
      <TouchableOpacity style={s.newRequestBtn} onPress={() => setShowModal(true)}>
        <Ionicons name="add-circle-outline" size={20} color="#FFF" />
        <Text style={s.newRequestText}>Nouvelle demande</Text>
      </TouchableOpacity>

      <Text style={s.sectionTitle}>Mes demandes</Text>
      {tickets.length === 0 ? (
        <Card style={s.emptyCard}>
          <Ionicons name="construct-outline" size={28} color={theme.colors.textTertiary} />
          <Text style={s.emptyText}>Aucune demande</Text>
        </Card>
      ) : tickets.map(t => {
        const cfg = STATUS_CFG[t.status];
        return (
          <Card key={t.id} style={s.ticketCard}>
            <View style={s.ticketTop}>
              <View style={[s.statusPill, { backgroundColor: cfg.bg }]}>
                <Text style={[s.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
              <Text style={s.ticketDate}>{formatDate(t.date)}</Text>
            </View>
            <Text style={s.ticketTitle}>{t.title}</Text>
            <Text style={s.ticketDesc} numberOfLines={2}>{t.description}</Text>
            <Text style={s.ticketCat}>{t.category}</Text>
          </Card>
        );
      })}
    </>
  );

  const DocsContent = () => (
    <>
      <Text style={s.sectionTitle}>Mes documents</Text>
      {DOCS.map(doc => (
        <TouchableOpacity key={doc.id} onPress={() => Alert.alert('Document', `Ouverture de "${doc.name}"`)}>
          <Card style={s.docCard}>
            <View style={[s.docIcon, { backgroundColor: doc.color + '20' }]}>
              <Ionicons name={doc.icon as any} size={20} color={doc.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.docName}>{doc.name}</Text>
              <Text style={s.docMeta}>{doc.type} · {formatDate(doc.date)}</Text>
            </View>
            <Ionicons name="download-outline" size={18} color={theme.colors.primary} />
          </Card>
        </TouchableOpacity>
      ))}
    </>
  );

  const TABS: { id: TabId; icon: string; label: string }[] = [
    { id: 'home',        icon: 'home-outline',           label: 'Accueil' },
    { id: 'payments',    icon: 'cash-outline',            label: 'Loyers' },
    { id: 'maintenance', icon: 'construct-outline',       label: 'Entretien' },
    { id: 'docs',        icon: 'document-text-outline',   label: 'Documents' },
  ];

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Top bar */}
      <View style={s.topBar}>
        <View style={s.topLeft}>
          <View style={s.topLogo}><Ionicons name="home" size={15} color={theme.colors.primary} /></View>
          <View>
            <Text style={s.topTitle}>Mon portail</Text>
            <Text style={s.topSub}>PlexIo Locataire</Text>
          </View>
        </View>
        <TouchableOpacity onPress={logout} style={s.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Scrollable content */}
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {activeTab === 'home'        && <HomeContent />}
        {activeTab === 'payments'    && <PaymentsContent />}
        {activeTab === 'maintenance' && <MaintenanceContent />}
        {activeTab === 'docs'        && <DocsContent />}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Bottom tab bar */}
      <View style={s.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity key={tab.id} style={s.tabItem} onPress={() => setActiveTab(tab.id)}>
            <Ionicons
              name={(activeTab === tab.id ? tab.icon.replace('-outline','') : tab.icon) as any}
              size={22}
              color={activeTab === tab.id ? theme.colors.primary : theme.colors.textTertiary}
            />
            <Text style={[s.tabLabel, activeTab === tab.id && s.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Maintenance Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SafeAreaView style={s.modal}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setShowModal(false)}><Text style={s.modalCancel}>Annuler</Text></TouchableOpacity>
              <Text style={s.modalTitle}>Nouvelle demande</Text>
              <TouchableOpacity onPress={submitRequest}><Text style={s.modalSave}>Envoyer</Text></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.modalBody}>
              <View style={s.formGroup}>
                <Text style={s.formLabel}>Titre *</Text>
                <TextInput style={s.formInput} value={form.title} onChangeText={v=>setForm(p=>({...p,title:v}))} placeholder="Ex. Robinet qui coule" placeholderTextColor={theme.colors.textTertiary} />
              </View>
              <View style={s.formGroup}>
                <Text style={s.formLabel}>Description *</Text>
                <TextInput style={[s.formInput, s.textArea]} value={form.description} onChangeText={v=>setForm(p=>({...p,description:v}))} placeholder="Décrivez le problème…" placeholderTextColor={theme.colors.textTertiary} multiline numberOfLines={4} textAlignVertical="top" />
              </View>
              <View style={s.formGroup}>
                <Text style={s.formLabel}>Catégorie</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={s.catRow}>
                    {CATEGORIES.map(cat => (
                      <TouchableOpacity
                        key={cat}
                        style={[s.catChip, form.category===cat && s.catChipActive]}
                        onPress={() => setForm(p=>({...p,category:cat}))}
                      >
                        <Text style={[s.catChipText, form.category===cat && s.catChipTextActive]}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.md, paddingVertical: 10, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topLogo: { width: 30, height: 30, borderRadius: 8, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  topSub: { fontSize: 11, color: theme.colors.textTertiary },
  logoutBtn: { padding: 4 },

  scroll: { padding: theme.spacing.md },

  greetCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.primary, borderRadius: 16, padding: theme.spacing.lg, marginBottom: theme.spacing.md },
  greetHello: { fontSize: 20, fontWeight: '700', color: '#FFF', marginBottom: 4 },
  greetUnit: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  greetAddr: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  greetAvatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  greetAvatarText: { fontSize: 17, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },

  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: theme.spacing.md },
  kpiCard: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 4 },
  kpiValue: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  kpiLabel: { fontSize: 10, color: theme.colors.textSecondary, textAlign: 'center' },

  leaseCard: { marginBottom: theme.spacing.md },
  leaseHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  leaseTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary },
  leaseRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  leaseField: { flex: 1, alignItems: 'center', backgroundColor: theme.colors.background, padding: 10, borderRadius: 10 },
  leaseFieldL: { fontSize: 11, color: theme.colors.textTertiary, marginBottom: 4 },
  leaseFieldV: { fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary },

  contactTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 10 },
  landlordRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  landlordAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  landlordAvatarText: { fontSize: 13, fontWeight: '800', color: theme.colors.primary },
  landlordName: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  landlordEmail: { fontSize: 12, color: theme.colors.textSecondary },
  contactBtns: { flexDirection: 'row', gap: 8 },
  contactBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: theme.colors.primaryLight },
  contactBtnPrimary: { backgroundColor: theme.colors.primary },
  contactBtnGray: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border },
  contactBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },

  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: theme.spacing.sm },

  nextPayCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.primary, borderRadius: 16, padding: theme.spacing.lg, marginBottom: theme.spacing.md },
  nextPayLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 4 },
  nextPayAmt: { fontSize: 28, fontWeight: '800', color: '#FFF', marginBottom: 4 },
  nextPayDate: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },

  payRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  payIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  payPeriod: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  payDate: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 },
  payAmt: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary, textAlign: 'right' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginTop: 2 },
  statusPillText: { fontSize: 11, fontWeight: '600' },

  newRequestBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary, paddingVertical: 14, borderRadius: 12, marginBottom: theme.spacing.md },
  newRequestText: { fontSize: 15, fontWeight: '700', color: '#FFF' },

  ticketCard: { marginBottom: 8 },
  ticketTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  ticketTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 4 },
  ticketDesc: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 4 },
  ticketCat: { fontSize: 11, color: theme.colors.textTertiary },
  ticketDate: { fontSize: 11, color: theme.colors.textTertiary },

  docCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  docIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  docName: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  docMeta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },

  emptyCard: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 14, color: theme.colors.textSecondary },

  tabBar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: theme.colors.borderLight, backgroundColor: theme.colors.surface, paddingBottom: 4 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 8, gap: 3 },
  tabLabel: { fontSize: 10, color: theme.colors.textTertiary, fontWeight: '500' },
  tabLabelActive: { color: theme.colors.primary, fontWeight: '700' },

  modal: { flex: 1, backgroundColor: theme.colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  modalCancel: { fontSize: 15, color: theme.colors.textSecondary },
  modalTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  modalSave: { fontSize: 15, fontWeight: '700', color: theme.colors.primary },
  modalBody: { padding: theme.spacing.md },
  formGroup: { marginBottom: theme.spacing.md },
  formLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 6 },
  formInput: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, padding: theme.spacing.sm, fontSize: 15, color: theme.colors.textPrimary, backgroundColor: theme.colors.surface },
  textArea: { height: 100 },
  catRow: { flexDirection: 'row', gap: 8, paddingRight: theme.spacing.md },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  catChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  catChipText: { fontSize: 13, fontWeight: '500', color: theme.colors.textSecondary },
  catChipTextActive: { color: '#FFF' },
});
