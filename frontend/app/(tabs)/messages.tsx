import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/components';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Conversation {
  id: string;
  tenantName: string;
  tenantInitials: string;
  avatarColor: string;
  propertyUnit: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  lastSenderIsMe: boolean;
}

// ─── Mock conversations ───────────────────────────────────────────────────────
const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1',
    tenantName: 'Michael John',
    tenantInitials: 'MJ',
    avatarColor: '#6366F1',
    propertyUnit: 'Duplex St-Henri · 101',
    lastMessage: 'Merci pour la réponse, je vais attendre le plombier demain.',
    lastMessageTime: 'il y a 5 min',
    unreadCount: 2,
    isOnline: true,
    lastSenderIsMe: false,
  },
  {
    id: 'c2',
    tenantName: 'Sarah Tremblay',
    tenantInitials: 'ST',
    avatarColor: '#10B981',
    propertyUnit: 'Triplex Rosemont · 201',
    lastMessage: 'Parfait, je vous envoie le chèque ce soir.',
    lastMessageTime: 'hier',
    unreadCount: 0,
    isOnline: false,
    lastSenderIsMe: false,
  },
  {
    id: 'c3',
    tenantName: 'David Côté',
    tenantInitials: 'DC',
    avatarColor: '#F59E0B',
    propertyUnit: 'Triplex Rosemont · 202',
    lastMessage: 'Vous : D\'accord, je règle ça cette semaine.',
    lastMessageTime: 'lun',
    unreadCount: 0,
    isOnline: false,
    lastSenderIsMe: true,
  },
  {
    id: 'c4',
    tenantName: 'Émilie Lavoie',
    tenantInitials: 'EL',
    avatarColor: '#EC4899',
    propertyUnit: 'Duplex Verdun · 301',
    lastMessage: 'Est-ce que vous pouvez regarder la fenêtre du salon?',
    lastMessageTime: 'dim',
    unreadCount: 1,
    isOnline: true,
    lastSenderIsMe: false,
  },
  {
    id: 'c5',
    tenantName: 'Marc Beaulieu',
    tenantInitials: 'MB',
    avatarColor: '#14B8A6',
    propertyUnit: 'Duplex Verdun · 302',
    lastMessage: 'Vous : Le renouvellement est prêt pour signature.',
    lastMessageTime: '12 mars',
    unreadCount: 0,
    isOnline: false,
    lastSenderIsMe: true,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function MessagesScreen() {
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [search, setSearch] = useState('');

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const filtered = conversations.filter(c =>
    c.tenantName.toLowerCase().includes(search.toLowerCase()) ||
    c.propertyUnit.toLowerCase().includes(search.toLowerCase())
  );

  const openChat = (conv: Conversation) => {
    // Mark as read
    setConversations(prev =>
      prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c)
    );
    router.push({
      pathname: '/chat',
      params: {
        id: conv.id,
        tenantName: conv.tenantName,
        tenantInitials: conv.tenantInitials,
        avatarColor: conv.avatarColor,
        propertyUnit: conv.propertyUnit,
        isOnline: conv.isOnline ? '1' : '0',
      },
    });
  };

  const renderItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity style={styles.row} onPress={() => openChat(item)} activeOpacity={0.75}>
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        <View style={[styles.avatar, { backgroundColor: item.avatarColor }]}>
          <Text style={styles.avatarText}>{item.tenantInitials}</Text>
        </View>
        {item.isOnline && <View style={styles.onlineDot} />}
      </View>

      {/* Content */}
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={[styles.rowName, item.unreadCount > 0 && styles.rowNameUnread]}>
            {item.tenantName}
          </Text>
          <Text style={[styles.rowTime, item.unreadCount > 0 && styles.rowTimeUnread]}>
            {item.lastMessageTime}
          </Text>
        </View>
        <Text style={styles.rowUnit}>{item.propertyUnit}</Text>
        <View style={styles.rowBottom}>
          <Text
            style={[styles.rowLastMsg, item.unreadCount > 0 && styles.rowLastMsgUnread]}
            numberOfLines={1}
          >
            {item.lastMessage}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Messages</Text>
          {totalUnread > 0 && (
            <Text style={styles.subtitle}>{totalUnread} non lu{totalUnread > 1 ? 's' : ''}</Text>
          )}
        </View>
        <TouchableOpacity style={styles.newBtn}>
          <Ionicons name="create-outline" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search */}
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

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={48} color={theme.colors.textTertiary} />
            <Text style={styles.emptyText}>Aucune conversation trouvée</Text>
          </View>
        }
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : undefined}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight,
  },
  title: { fontSize: 24, fontWeight: '700', color: theme.colors.textPrimary },
  subtitle: { fontSize: 13, color: theme.colors.primary, fontWeight: '500', marginTop: 2 },
  newBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginTop: 4 },

  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md, marginVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 12, borderWidth: 1, borderColor: theme.colors.borderLight,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 42, fontSize: 14, color: theme.colors.textPrimary },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.md, paddingVertical: 14, backgroundColor: theme.colors.surface },
  separator: { height: 1, backgroundColor: theme.colors.borderLight, marginLeft: 80 },

  avatarWrap: { position: 'relative', marginRight: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 13, height: 13, borderRadius: 6.5, backgroundColor: theme.colors.success, borderWidth: 2, borderColor: theme.colors.surface },

  rowContent: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  rowName: { fontSize: 15, fontWeight: '500', color: theme.colors.textPrimary },
  rowNameUnread: { fontWeight: '700' },
  rowUnit: { fontSize: 12, color: theme.colors.textTertiary, marginBottom: 4 },
  rowTime: { fontSize: 12, color: theme.colors.textTertiary },
  rowTimeUnread: { color: theme.colors.primary, fontWeight: '600' },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLastMsg: { fontSize: 13, color: theme.colors.textSecondary, flex: 1, marginRight: 8 },
  rowLastMsgUnread: { color: theme.colors.textPrimary, fontWeight: '500' },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#FFF' },

  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, color: theme.colors.textSecondary },
});
