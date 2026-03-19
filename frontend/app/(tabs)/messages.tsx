import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme, DomelyAI } from '../../src/components';
import { api } from '../../src/services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Conversation {
  tenant_id: string;
  tenant_name: string;
  tenant_initials: string;
  property_unit: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

function formatRelativeTime(isoStr: string): string {
  if (!isoStr) return '';
  const now  = new Date();
  const then = new Date(isoStr);
  const diff = (now.getTime() - then.getTime()) / 1000;
  if (diff < 60)    return "à l'instant";
  if (diff < 3600)  return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  const days = Math.floor(diff / 86400);
  if (days === 1)   return 'hier';
  if (days < 7)     return `il y a ${days} j`;
  return then.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
}

const AVATAR_COLORS = ['#6366F1','#10B981','#F59E0B','#EC4899','#14B8A6','#8B5CF6','#EF4444','#3B82F6'];
function getAvatarColor(tenantId: string) {
  const idx = tenantId.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return AVATAR_COLORS[idx % AVATAR_COLORS.length];
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function MessagesScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [search, setSearch]               = useState('');

  const loadConversations = async () => {
    try {
      const data = await api.getConversations();
      setConversations(data);
    } catch (e) {
      console.warn('Failed to load conversations', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadConversations(); }, []));

  const onRefresh = () => { setRefreshing(true); loadConversations(); };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  const filtered = conversations.filter(c =>
    c.tenant_name.toLowerCase().includes(search.toLowerCase()) ||
    c.property_unit.toLowerCase().includes(search.toLowerCase())
  );

  const openChat = (conv: Conversation) => {
    if (conv.unread_count > 0) api.markMessagesRead(conv.tenant_id).catch(() => null);
    setConversations(prev =>
      prev.map(c => c.tenant_id === conv.tenant_id ? { ...c, unread_count: 0 } : c)
    );
    router.push({
      pathname: '/chat',
      params: {
        tenantId:      conv.tenant_id,
        tenantName:    conv.tenant_name,
        tenantInitials:conv.tenant_initials,
        avatarColor:   getAvatarColor(conv.tenant_id),
        propertyUnit:  conv.property_unit,
        isOnline:      '0',
      },
    });
  };

  const renderItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity style={styles.row} onPress={() => openChat(item)} activeOpacity={0.75}>
      <View style={styles.avatarWrap}>
        <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.tenant_id) }]}>
          <Text style={styles.avatarText}>{item.tenant_initials}</Text>
        </View>
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={[styles.rowName, item.unread_count > 0 && styles.rowNameUnread]}>
            {item.tenant_name}
          </Text>
          <Text style={[styles.rowTime, item.unread_count > 0 && styles.rowTimeUnread]}>
            {formatRelativeTime(item.last_message_time)}
          </Text>
        </View>
        <Text style={styles.rowUnit}>{item.property_unit}</Text>
        <View style={styles.rowBottom}>
          <Text style={[styles.rowLastMsg, item.unread_count > 0 && styles.rowLastMsgUnread]} numberOfLines={1}>
            {item.last_message || 'Aucun message'}
          </Text>
          {item.unread_count > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unread_count}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Messages</Text>
          {totalUnread > 0 && (
            <Text style={styles.subtitle}>{totalUnread} non lu{totalUnread > 1 ? 's' : ''}</Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <DomelyAI context="messages" />
        </View>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color={theme.colors.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher un locataire…"
          placeholderTextColor={theme.colors.textTertiary}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.tenant_id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={48} color={theme.colors.textTertiary} />
            <Text style={styles.emptyText}>
              {search ? 'Aucune conversation trouvée' : "Aucune conversation pour l'instant"}
            </Text>
          </View>
        }
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : undefined}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: theme.colors.background },
  loadingWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight,
  },
  title:        { fontSize: 24, fontWeight: '700', color: theme.colors.textPrimary },
  subtitle:     { fontSize: 13, color: theme.colors.primary, fontWeight: '500', marginTop: 2 },
  headerRight:  { flexDirection: 'row', alignItems: 'center', gap: 8 },

  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md, marginVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 12, borderWidth: 1, borderColor: theme.colors.borderLight,
  },
  searchIcon:  { marginRight: 8 },
  searchInput: { flex: 1, height: 42, fontSize: 14, color: theme.colors.textPrimary },

  row:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.md, paddingVertical: 14, backgroundColor: theme.colors.surface },
  separator: { height: 1, backgroundColor: theme.colors.borderLight, marginLeft: 80 },

  avatarWrap: { marginRight: 14 },
  avatar:     { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },

  rowContent:       { flex: 1 },
  rowTop:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  rowName:          { fontSize: 15, fontWeight: '500', color: theme.colors.textPrimary },
  rowNameUnread:    { fontWeight: '700' },
  rowUnit:          { fontSize: 12, color: theme.colors.textTertiary, marginBottom: 4 },
  rowTime:          { fontSize: 12, color: theme.colors.textTertiary },
  rowTimeUnread:    { color: theme.colors.primary, fontWeight: '600' },
  rowBottom:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLastMsg:       { fontSize: 13, color: theme.colors.textSecondary, flex: 1, marginRight: 8 },
  rowLastMsgUnread: { color: theme.colors.textPrimary, fontWeight: '500' },
  badge:            { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText:        { fontSize: 11, fontWeight: '800', color: '#FFF' },

  emptyContainer: { flex: 1 },
  empty:          { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyText:      { fontSize: 15, color: theme.colors.textSecondary, textAlign: 'center' },
});
