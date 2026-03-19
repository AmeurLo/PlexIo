import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, theme } from '../src/components';
import { api } from '../src/services/api';

// ─── Types ───────────────────────────────────────────────────────────────────

type NotifType = 'rent' | 'maintenance' | 'lease' | 'payment' | 'system' | 'condo';

interface Notif {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  read: boolean;
  action_route?: string;
}

const TYPE_CONFIG: Record<NotifType, { icon: string; color: string; bg: string }> = {
  rent:        { icon: 'cash-outline',                color: theme.colors.error,   bg: theme.colors.error + '15' },
  maintenance: { icon: 'construct-outline',           color: theme.colors.warning, bg: theme.colors.warning + '15' },
  lease:       { icon: 'document-text-outline',       color: theme.colors.info,    bg: theme.colors.info + '15' },
  payment:     { icon: 'card-outline',                color: theme.colors.success, bg: theme.colors.success + '15' },
  system:      { icon: 'information-circle-outline',  color: theme.colors.primary, bg: theme.colors.primaryLight },
  condo:       { icon: 'business-outline',            color: '#8B5CF6',            bg: '#8B5CF615' },
};

const PREF_LABELS: { key: string; label: string; sub: string }[] = [
  { key: 'rent',        label: 'Loyers en retard',       sub: 'Alertes dès qu\'un loyer est en retard' },
  { key: 'maintenance', label: 'Entretien',              sub: 'Nouvelles demandes de vos locataires' },
  { key: 'lease',       label: 'Baux & renouvellements', sub: 'Rappels avant expiration du bail' },
  { key: 'payment',     label: 'Paiements reçus',        sub: 'Confirmation de chaque paiement' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [prefs,         setPrefs]         = useState<Record<string, boolean>>({
    rent: true, maintenance: true, lease: true, payment: true,
  });
  const [activeTab,  setActiveTab]  = useState<'all' | 'unread' | 'settings'>('all');
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const prefSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unreadCount = notifications.filter(n => !n.read).length;
  const shown = activeTab === 'unread' ? notifications.filter(n => !n.read) : notifications;

  useFocusEffect(useCallback(() => {
    loadAll();
  }, []));

  const loadAll = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [notifs, savedPrefs] = await Promise.all([
        api.getNotifications(),
        api.getNotificationPrefs(),
      ]);
      setNotifications(notifs as Notif[]);
      setPrefs(savedPrefs);
    } catch {
      // silently use empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markRead = async (id: string) => {
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
    try { await api.markNotificationRead(id); } catch { /* silent */ }
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    setNotifications(ns => ns.map(n => ({ ...n, read: true })));
    try { await api.markAllNotificationsRead(unreadIds); } catch { /* silent */ }
  };

  const handleTap = (notif: Notif) => {
    markRead(notif.id);
    if (notif.action_route) router.push(notif.action_route as any);
  };

  const togglePref = (key: string, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    if (prefSaveTimer.current) clearTimeout(prefSaveTimer.current);
    prefSaveTimer.current = setTimeout(async () => {
      try { await api.saveNotificationPrefs(next); } catch { /* silent */ }
    }, 600);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Tout lire</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(['all', 'unread', 'settings'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'all'
                ? 'Toutes'
                : tab === 'unread'
                  ? `Non lues${unreadCount > 0 ? ` (${unreadCount})` : ''}`
                  : 'Préférences'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadAll(true)}
              tintColor={theme.colors.primary}
            />
          }
        >
          {activeTab === 'settings' ? (
            /* ── Preferences ── */
            <View>
              <Text style={styles.sectionLabel}>Canaux de notification</Text>
              <Card style={styles.prefsCard}>
                {PREF_LABELS.map((p, i) => (
                  <View key={p.key}>
                    {i > 0 && <View style={styles.prefDivider} />}
                    <View style={styles.prefRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.prefLabel}>{p.label}</Text>
                        <Text style={styles.prefSub}>{p.sub}</Text>
                      </View>
                      <Switch
                        value={prefs[p.key] ?? true}
                        onValueChange={v => togglePref(p.key, v)}
                        trackColor={{ true: theme.colors.primary, false: theme.colors.borderLight }}
                        thumbColor="#fff"
                      />
                    </View>
                  </View>
                ))}
              </Card>

              <Text style={styles.sectionLabel}>Rappels automatiques</Text>
              <Card style={styles.reminderCard}>
                <View style={styles.reminderRow}>
                  <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.prefLabel}>Loyers en retard</Text>
                    <Text style={styles.prefSub}>Rappel au locataire après 3 jours de retard</Text>
                  </View>
                  <View style={styles.reminderBadge}><Text style={styles.reminderBadgeText}>Auto</Text></View>
                </View>
                <View style={styles.prefDivider} />
                <View style={styles.reminderRow}>
                  <Ionicons name="mail-outline" size={20} color={theme.colors.primary} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.prefLabel}>Avis de renouvellement</Text>
                    <Text style={styles.prefSub}>Rappel 60 jours avant expiration du bail</Text>
                  </View>
                  <View style={styles.reminderBadge}><Text style={styles.reminderBadgeText}>Auto</Text></View>
                </View>
              </Card>
            </View>
          ) : shown.length === 0 ? (
            /* ── Empty state ── */
            <View style={styles.emptyView}>
              <Ionicons name="notifications-off-outline" size={48} color={theme.colors.textTertiary} />
              <Text style={styles.emptyTitle}>Aucune notification</Text>
              <Text style={styles.emptySub}>Vous êtes à jour — revenez plus tard.</Text>
            </View>
          ) : (
            /* ── Notification list ── */
            shown.map(notif => {
              const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.system;
              return (
                <TouchableOpacity key={notif.id} onPress={() => handleTap(notif)} activeOpacity={0.75}>
                  <View style={[styles.notifCard, !notif.read && styles.notifUnread]}>
                    {!notif.read && <View style={styles.unreadDot} />}
                    <View style={[styles.notifIcon, { backgroundColor: cfg.bg }]}>
                      <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
                    </View>
                    <View style={styles.notifBody}>
                      <View style={styles.notifTopRow}>
                        <Text style={[styles.notifTitle, !notif.read && { fontWeight: '700' }]} numberOfLines={1}>
                          {notif.title}
                        </Text>
                        <Text style={styles.notifTime}>{notif.time}</Text>
                      </View>
                      <Text style={styles.notifText} numberOfLines={2}>{notif.body}</Text>
                      {notif.action_route && (
                        <Text style={styles.notifAction}>Voir →</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary, marginLeft: 4 },
  markAllBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.full,
  },
  markAllText: { fontSize: 12, fontWeight: '600', color: theme.colors.primary },

  tabBar: {
    flexDirection: 'row', backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: theme.colors.primary },
  tabText: { fontSize: 13, color: theme.colors.textTertiary },
  tabTextActive: { color: theme.colors.primary, fontWeight: '600' },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: theme.spacing.md },

  notifCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md, marginBottom: theme.spacing.sm,
    borderWidth: 1, borderColor: theme.colors.borderLight,
    position: 'relative', overflow: 'hidden',
  },
  notifUnread: { borderColor: theme.colors.primary + '30', backgroundColor: theme.colors.primaryLight + '40' },
  unreadDot: {
    position: 'absolute', top: 14, left: 6,
    width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.primary,
  },
  notifIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0,
  },
  notifBody: { flex: 1 },
  notifTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 },
  notifTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary, flex: 1, marginRight: 8 },
  notifTime: { fontSize: 11, color: theme.colors.textTertiary, flexShrink: 0 },
  notifText: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 },
  notifAction: { fontSize: 12, color: theme.colors.primary, fontWeight: '600', marginTop: 4 },

  emptyView: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: theme.colors.textPrimary },
  emptySub: { fontSize: 14, color: theme.colors.textSecondary },

  sectionLabel: {
    fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 8, marginTop: 4,
  },
  prefsCard: { padding: 0, overflow: 'hidden', marginBottom: theme.spacing.lg },
  prefRow: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, gap: 12 },
  prefDivider: { height: 1, backgroundColor: theme.colors.borderLight, marginLeft: theme.spacing.md },
  prefLabel: { fontSize: 14, fontWeight: '500', color: theme.colors.textPrimary },
  prefSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },

  reminderCard: { padding: 0, overflow: 'hidden', marginBottom: theme.spacing.lg },
  reminderRow: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md },
  reminderBadge: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: theme.colors.success + '20', borderRadius: 6 },
  reminderBadgeText: { fontSize: 11, fontWeight: '700', color: theme.colors.success },
});
