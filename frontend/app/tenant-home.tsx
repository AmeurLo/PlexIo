/**
 * tenant-home.tsx
 * Standalone tenant-facing portal — accessed after tenant-login OTP flow.
 * Role: tenant (read-only for unit data; can submit maintenance; view payments/docs/messages)
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, theme } from '../src/components';
import { formatCurrency, formatDate } from '../src/utils/format';
import { tenantApi } from '../src/services/api';

// Initials helper
const initials = (name: string) =>
  (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

// ─── Types ────────────────────────────────────────────────────────────────────
type TabId = 'home' | 'payments' | 'maintenance' | 'messages';

interface ChatMsg {
  id: string;
  from: 'tenant' | 'landlord';
  text: string;
  time: string;
}

const CATEGORIES = ['Plomberie', 'Électricité', 'Chauffage', 'Fenêtres/Portes', 'Électroménagers', 'Autre'];
const CAT_MAP: Record<string, string> = { 'Plomberie': 'maintenance', 'Électricité': 'maintenance', 'Chauffage': 'maintenance', 'Fenêtres/Portes': 'maintenance', 'Électroménagers': 'maintenance', 'Autre': 'general' };

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  paid:        { label: 'Payé',     color: theme.colors.success, bg: '#E6F9F4' },
  pending:     { label: 'À venir',  color: theme.colors.warning, bg: '#FFF6E6' },
  open:        { label: 'Ouvert',   color: theme.colors.error,   bg: '#FDE8E8' },
  in_progress: { label: 'En cours', color: theme.colors.warning, bg: '#FFF6E6' },
  completed:   { label: 'Terminé',  color: theme.colors.success, bg: '#E6F9F4' },
};

const fmtTime = (iso: string) => {
  try {
    const d = new Date(iso);
    return `${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}`;
  } catch { return ''; }
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function TenantHomeScreen() {
  const [profile,    setProfile]    = useState<any>(null);
  const [token,      setToken]      = useState<string | null>(null);
  const [loadingInit, setLoadingInit] = useState(true);

  const [activeTab,  setActiveTab]  = useState<TabId>('home');

  // Payments
  const [payments, setPayments] = useState<any[]>([]);

  // Maintenance
  const [tickets,   setTickets]   = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState({ title: '', description: '', category: 'Plomberie', saving: false });

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput,    setChatInput]    = useState('');
  const [sendingMsg,   setSendingMsg]   = useState(false);
  const chatListRef = useRef<FlatList>(null);

  // ── Init: load token + profile from storage ─────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const t = await AsyncStorage.getItem('tenant_token');
        const p = await AsyncStorage.getItem('tenant_profile');
        if (!t || !p) {
          router.replace('/(auth)/tenant-login');
          return;
        }
        setToken(t);
        setProfile(JSON.parse(p));
      } catch {
        router.replace('/(auth)/tenant-login');
      } finally {
        setLoadingInit(false);
      }
    })();
  }, []);

  // ── Load tab data when token is ready + tab changes ─────────────────────────
  useEffect(() => {
    if (!token) return;
    if (activeTab === 'payments')    loadPayments();
    if (activeTab === 'maintenance') loadMaintenance();
    if (activeTab === 'messages')    loadMessages();
  }, [token, activeTab]);

  // ── Poll messages every 15s when on messages tab ────────────────────────────
  useEffect(() => {
    if (activeTab !== 'messages' || !token) return;
    const interval = setInterval(loadMessages, 15_000);
    return () => clearInterval(interval);
  }, [activeTab, token]);

  const loadPayments = async () => {
    if (!token) return;
    try { setPayments(await tenantApi.getPayments(token)); } catch {}
  };

  const loadMaintenance = async () => {
    if (!token) return;
    try { setTickets(await tenantApi.getMaintenance(token)); } catch {}
  };

  const loadMessages = useCallback(async () => {
    if (!token) return;
    try {
      const msgs = await tenantApi.getMessages(token);
      setChatMessages(msgs.map((m: any) => ({
        id: m.id,
        from: m.sender_type === 'tenant' ? 'tenant' : 'landlord',
        text: m.content,
        time: fmtTime(m.created_at),
      })));
    } catch {}
  }, [token]);

  // ── Send chat message ────────────────────────────────────────────────────────
  const sendChatMsg = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || !token || sendingMsg) return;
    const tempId = `temp-${Date.now()}`;
    const now = new Date();
    const tempMsg: ChatMsg = { id: tempId, from: 'tenant', text: trimmed, time: `${now.getHours()}h${String(now.getMinutes()).padStart(2, '0')}` };
    setChatMessages(prev => [...prev, tempMsg]);
    setChatInput('');
    setSendingMsg(true);
    setTimeout(() => chatListRef.current?.scrollToEnd({ animated: true }), 80);
    try {
      const saved = await tenantApi.sendMessage(token, trimmed);
      setChatMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: saved.id, time: fmtTime(saved.created_at) } : m));
    } catch {
      setChatMessages(prev => prev.filter(m => m.id !== tempId));
      Alert.alert('Erreur', 'Message non envoyé. Réessayez.');
    } finally {
      setSendingMsg(false);
    }
  };

  // ── Submit maintenance ───────────────────────────────────────────────────────
  const submitRequest = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      Alert.alert('Champs requis', 'Complétez le titre et la description.');
      return;
    }
    if (!token) return;
    setForm(f => ({ ...f, saving: true }));
    try {
      await tenantApi.submitMaintenance(token, {
        title: form.title.trim(),
        description: form.description.trim(),
        category: CAT_MAP[form.category] || 'general',
        urgency: 'normal',
      });
      setForm({ title: '', description: '', category: 'Plomberie', saving: false });
      setShowModal(false);
      loadMaintenance();
      Alert.alert('Envoyé ✓', 'Votre propriétaire a été notifié.');
    } catch {
      Alert.alert('Erreur', 'Impossible d\'envoyer la demande.');
      setForm(f => ({ ...f, saving: false }));
    }
  };

  const logout = async () => {
    Alert.alert('Déconnexion', 'Quitter le portail ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion',
        style: 'destructive',
        onPress: async () => {
          await tenantApi.logout();
          await AsyncStorage.removeItem('tenant_profile');
          router.replace('/(auth)/tenant-login');
        },
      },
    ]);
  };

  if (loadingInit || !profile) {
    return (
      <SafeAreaView style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  const daysUntil = (iso: string) => iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000) : null;
  const daysPayment = profile.lease_end ? daysUntil(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`) : null;
  const daysLease   = profile.lease_end ? daysUntil(profile.lease_end) : null;

  // ── Tab content ──────────────────────────────────────────────────────────────

  const HomeContent = () => (
    <>
      <View style={s.greetCard}>
        <View style={{ flex: 1 }}>
          <Text style={s.greetHello}>Bonjour, {(profile.name || '').split(' ')[0]} 👋</Text>
          <Text style={s.greetUnit}>{profile.property_name} · Logement {profile.unit_number}</Text>
          {profile.property_address ? <Text style={s.greetAddr}>{profile.property_address}</Text> : null}
        </View>
        <View style={s.greetAvatar}>
          <Text style={s.greetAvatarText}>{initials(profile.name)}</Text>
        </View>
      </View>

      <View style={s.kpiRow}>
        {[
          { icon: 'cash-outline', value: profile.rent ? formatCurrency(profile.rent) : '—', label: 'Loyer/mois', warn: false },
          { icon: 'document-text-outline', value: daysLease != null ? `${daysLease}j` : '—', label: 'Fin du bail', warn: daysLease != null && daysLease < 90 },
        ].map((k, i) => (
          <Card key={i} style={s.kpiCard}>
            <Ionicons name={k.icon as any} size={20} color={k.warn ? theme.colors.warning : theme.colors.primary} />
            <Text style={[s.kpiValue, k.warn && { color: theme.colors.warning }]}>{k.value}</Text>
            <Text style={s.kpiLabel}>{k.label}</Text>
          </Card>
        ))}
      </View>

      {(profile.lease_start || profile.lease_end) && (
        <Card style={s.leaseCard}>
          <View style={s.leaseHeader}>
            <Ionicons name="document-text" size={16} color={theme.colors.primary} />
            <Text style={s.leaseTitle}>Mon bail</Text>
          </View>
          <View style={s.leaseRow}>
            {profile.lease_start && (
              <View style={s.leaseField}>
                <Text style={s.leaseFieldL}>Début</Text>
                <Text style={s.leaseFieldV}>{formatDate(profile.lease_start)}</Text>
              </View>
            )}
            <Ionicons name="arrow-forward" size={14} color={theme.colors.textTertiary} />
            {profile.lease_end && (
              <View style={s.leaseField}>
                <Text style={s.leaseFieldL}>Fin</Text>
                <Text style={s.leaseFieldV}>{formatDate(profile.lease_end)}</Text>
              </View>
            )}
          </View>
        </Card>
      )}

      {(profile.landlord_name || profile.landlord_email) && (
        <Card>
          <Text style={s.contactTitle}>Mon propriétaire</Text>
          <View style={s.landlordRow}>
            <View style={s.landlordAvatar}>
              <Text style={s.landlordAvatarText}>{initials(profile.landlord_name || '?')}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.landlordName}>{profile.landlord_name}</Text>
              {profile.landlord_email && <Text style={s.landlordEmail}>{profile.landlord_email}</Text>}
            </View>
          </View>
          <View style={s.contactBtns}>
            <TouchableOpacity style={[s.contactBtn, s.contactBtnPrimary]} onPress={() => setActiveTab('messages')}>
              <Ionicons name="chatbubble-outline" size={16} color="#FFF" />
              <Text style={[s.contactBtnText, { color: '#FFF' }]}>Message</Text>
            </TouchableOpacity>
            {profile.landlord_email && (
              <TouchableOpacity style={[s.contactBtn, s.contactBtnGray]} onPress={() => Linking.openURL(`mailto:${profile.landlord_email}`)}>
                <Ionicons name="mail-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={[s.contactBtnText, { color: theme.colors.textSecondary }]}>Courriel</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>
      )}
    </>
  );

  const PaymentsContent = () => (
    <>
      {profile.rent && (
        <View style={s.nextPayCard}>
          <View>
            <Text style={s.nextPayLabel}>Loyer mensuel</Text>
            <Text style={s.nextPayAmt}>{formatCurrency(profile.rent)}</Text>
          </View>
          <Ionicons name="calendar-outline" size={36} color="rgba(255,255,255,0.5)" />
        </View>
      )}
      <Text style={s.sectionTitle}>Historique</Text>
      {payments.length === 0 ? (
        <Card style={s.emptyCard}>
          <Ionicons name="receipt-outline" size={28} color={theme.colors.textTertiary} />
          <Text style={s.emptyText}>Aucun paiement enregistré</Text>
        </Card>
      ) : payments.map((p: any) => {
        const status = p.status === 'paid' ? 'paid' : 'pending';
        const cfg = STATUS_CFG[status];
        return (
          <Card key={p.id} style={s.payRow}>
            <View style={[s.payIcon, { backgroundColor: cfg.bg }]}>
              <Ionicons name={status === 'paid' ? 'checkmark-circle' : 'time-outline'} size={18} color={cfg.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.payPeriod}>{p.month_year}</Text>
              {p.payment_date && <Text style={s.payDate}>Payé le {formatDate(p.payment_date)}</Text>}
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
      ) : tickets.map((t: any) => {
        const cfg = STATUS_CFG[t.status] || STATUS_CFG.open;
        return (
          <Card key={t.id} style={s.ticketCard}>
            <View style={s.ticketTop}>
              <View style={[s.statusPill, { backgroundColor: cfg.bg }]}>
                <Text style={[s.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
              <Text style={s.ticketDate}>{formatDate(t.created_at?.slice(0, 10) || t.date)}</Text>
            </View>
            <Text style={s.ticketTitle}>{t.title}</Text>
            {t.description ? <Text style={s.ticketDesc} numberOfLines={2}>{t.description}</Text> : null}
            <Text style={s.ticketCat}>{t.category}</Text>
          </Card>
        );
      })}
    </>
  );

  const MessagesContent = () => (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.chatHeader}>
        <View style={s.chatHeaderAvatar}>
          <Text style={s.chatHeaderAvatarText}>{initials(profile.landlord_name || '?')}</Text>
        </View>
        <View>
          <Text style={s.chatHeaderName}>{profile.landlord_name || 'Propriétaire'}</Text>
          <Text style={s.chatHeaderSub}>{profile.property_name}</Text>
        </View>
      </View>

      <FlatList
        ref={chatListRef}
        data={chatMessages}
        keyExtractor={m => m.id}
        contentContainerStyle={s.chatList}
        showsVerticalScrollIndicator={false}
        onLayout={() => chatListRef.current?.scrollToEnd({ animated: false })}
        onContentSizeChange={() => chatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Ionicons name="chatbubble-outline" size={36} color={theme.colors.textTertiary} />
            <Text style={{ fontSize: 14, color: theme.colors.textSecondary, marginTop: 8 }}>Aucun message</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isTenant = item.from === 'tenant';
          return (
            <View style={[s.chatRow, isTenant ? s.chatRowRight : s.chatRowLeft]}>
              {!isTenant && (
                <View style={s.chatLandlordAvatar}>
                  <Text style={s.chatLandlordAvatarText}>{initials(profile.landlord_name || '?')}</Text>
                </View>
              )}
              <View style={[s.chatBubble, isTenant ? s.chatBubbleTenant : s.chatBubbleLandlord]}>
                <Text style={[s.chatBubbleText, isTenant && { color: '#fff' }]}>{item.text}</Text>
                <Text style={[s.chatBubbleTime, isTenant && { color: 'rgba(255,255,255,0.65)' }]}>{item.time}</Text>
              </View>
            </View>
          );
        }}
      />

      <View style={s.chatInputRow}>
        <TextInput
          style={s.chatInput}
          value={chatInput}
          onChangeText={setChatInput}
          placeholder="Écrire un message…"
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          maxLength={400}
        />
        <TouchableOpacity
          style={[s.chatSendBtn, (!chatInput.trim() || sendingMsg) && s.chatSendBtnDisabled]}
          onPress={sendChatMsg}
          disabled={!chatInput.trim() || sendingMsg}
        >
          {sendingMsg ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={16} color="#fff" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  const TABS: { id: TabId; icon: string; label: string }[] = [
    { id: 'home',        icon: 'home-outline',         label: 'Accueil'   },
    { id: 'payments',    icon: 'cash-outline',          label: 'Loyers'    },
    { id: 'maintenance', icon: 'construct-outline',     label: 'Entretien' },
    { id: 'messages',    icon: 'chatbubble-outline',    label: 'Messages'  },
  ];

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.topBar}>
        <View style={s.topLeft}>
          <View style={s.topLogo}><Ionicons name="home" size={15} color={theme.colors.primary} /></View>
          <View>
            <Text style={s.topTitle}>Mon portail</Text>
            <Text style={s.topSub}>Domely Locataire</Text>
          </View>
        </View>
        <TouchableOpacity onPress={logout} style={s.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {activeTab !== 'messages' ? (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {activeTab === 'home'        && <HomeContent />}
          {activeTab === 'payments'    && <PaymentsContent />}
          {activeTab === 'maintenance' && <MaintenanceContent />}
          <View style={{ height: 24 }} />
        </ScrollView>
      ) : (
        <MessagesContent />
      )}

      <View style={s.tabBar}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity key={tab.id} style={s.tabItem} onPress={() => setActiveTab(tab.id)}>
              <Ionicons
                name={(isActive ? tab.icon.replace('-outline', '') : tab.icon) as any}
                size={22}
                color={isActive ? theme.colors.primary : theme.colors.textTertiary}
              />
              <Text style={[s.tabLabel, isActive && s.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Maintenance Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SafeAreaView style={s.modal}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setShowModal(false)}><Text style={s.modalCancel}>Annuler</Text></TouchableOpacity>
              <Text style={s.modalTitle}>Nouvelle demande</Text>
              <TouchableOpacity onPress={submitRequest} disabled={form.saving}>
                {form.saving ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Text style={s.modalSave}>Envoyer</Text>}
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.modalBody}>
              <View style={s.formGroup}>
                <Text style={s.formLabel}>Titre *</Text>
                <TextInput style={s.formInput} value={form.title} onChangeText={v => setForm(p => ({ ...p, title: v }))} placeholder="Ex. Robinet qui coule" placeholderTextColor={theme.colors.textTertiary} />
              </View>
              <View style={s.formGroup}>
                <Text style={s.formLabel}>Description *</Text>
                <TextInput style={[s.formInput, s.textArea]} value={form.description} onChangeText={v => setForm(p => ({ ...p, description: v }))} placeholder="Décrivez le problème…" placeholderTextColor={theme.colors.textTertiary} multiline numberOfLines={4} textAlignVertical="top" />
              </View>
              <View style={s.formGroup}>
                <Text style={s.formLabel}>Catégorie</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={s.catRow}>
                    {CATEGORIES.map(cat => (
                      <TouchableOpacity key={cat} style={[s.catChip, form.category === cat && s.catChipActive]} onPress={() => setForm(p => ({ ...p, category: cat }))}>
                        <Text style={[s.catChipText, form.category === cat && s.catChipTextActive]}>{cat}</Text>
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

// ─── Styles ───────────────────────────────────────────────────────────────────
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
  contactBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  contactBtnPrimary: { backgroundColor: theme.colors.primary },
  contactBtnGray: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border },
  contactBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: theme.spacing.sm },
  nextPayCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.primary, borderRadius: 16, padding: theme.spacing.lg, marginBottom: theme.spacing.md },
  nextPayLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 4 },
  nextPayAmt: { fontSize: 28, fontWeight: '800', color: '#FFF', marginBottom: 4 },
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
  chatHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: theme.spacing.md, paddingVertical: 10, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  chatHeaderAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  chatHeaderAvatarText: { fontSize: 12, fontWeight: '800', color: theme.colors.primary },
  chatHeaderName: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary },
  chatHeaderSub: { fontSize: 11, color: theme.colors.textSecondary },
  chatList: { padding: 16, paddingBottom: 8 },
  chatRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  chatRowLeft: { justifyContent: 'flex-start' },
  chatRowRight: { justifyContent: 'flex-end' },
  chatLandlordAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  chatLandlordAvatarText: { fontSize: 10, fontWeight: '800', color: theme.colors.primary },
  chatBubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  chatBubbleLandlord: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderLight, borderBottomLeftRadius: 4 },
  chatBubbleTenant: { backgroundColor: theme.colors.primary, borderBottomRightRadius: 4 },
  chatBubbleText: { fontSize: 14, lineHeight: 20, color: theme.colors.textPrimary },
  chatBubbleTime: { fontSize: 10, color: theme.colors.textTertiary, marginTop: 4, textAlign: 'right' },
  chatInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 14, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 28 : 14, backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.borderLight },
  chatInput: { flex: 1, minHeight: 40, maxHeight: 100, backgroundColor: theme.colors.background, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: theme.colors.textPrimary },
  chatSendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  chatSendBtnDisabled: { backgroundColor: theme.colors.borderLight },
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
