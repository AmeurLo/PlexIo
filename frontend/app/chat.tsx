import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../src/components';
import { api } from '../src/services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  text: string;
  time: string;
  isMe: boolean;
  status?: 'sent' | 'delivered' | 'read';
}

const QUICK_REPLIES = [
  'Je regarde ça dès que possible.',
  'Merci de me prévenir!',
  'Je reviens vers vous sous 24h.',
  'Un technicien passera cette semaine.',
];

// ─── Maintenance AI Detection ─────────────────────────────────────────────────
const MAINTENANCE_KEYWORDS = [
  'robinet', 'fuite', 'humidité', 'dégât', 'eau chaude', 'chauffage',
  'toilette', 'plombier', 'moisissure', 'électricité', 'radiateur',
  "courant d'air", 'chauffe-eau', 'canalisation', 'infiltration',
  'tache', 'fenêtre', 'brûleur', 'serrure', 'verrou',
  'punaise', 'cafard', 'souris', 'coquerelle', 'odeur',
];

const hasMaintenance = (text: string): boolean => {
  const lower = text.toLowerCase();
  return MAINTENANCE_KEYWORDS.some(kw => lower.includes(kw));
};

const extractProblem = (text: string): string => {
  const lower = text.toLowerCase();
  if (lower.includes('robinet') || lower.includes('fuite') || lower.includes('plombier') || lower.includes('canalisation')) return 'Plomberie';
  if (lower.includes('humidité') || lower.includes('moisissure') || lower.includes('tache') || lower.includes('dégât') || lower.includes('infiltration')) return "Humidité / Dégât d'eau";
  if (lower.includes('chauffage') || lower.includes('radiateur') || lower.includes('chauffe-eau') || lower.includes('brûleur')) return 'Chauffage';
  if (lower.includes('électricité')) return 'Électricité';
  if (lower.includes('fenêtre') || lower.includes("courant d'air")) return 'Fenêtre / Isolation';
  if (lower.includes('serrure') || lower.includes('verrou')) return 'Serrurerie';
  if (lower.includes('punaise') || lower.includes('cafard') || lower.includes('souris') || lower.includes('coquerelle')) return 'Extermination';
  return 'Entretien général';
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function ChatScreen() {
  const params = useLocalSearchParams<{
    tenantId: string;
    tenantName: string;
    tenantInitials: string;
    avatarColor: string;
    propertyUnit: string;
    isOnline: string;
  }>();

  const {
    tenantId = '',
    tenantName = 'Locataire',
    tenantInitials = 'LO',
    avatarColor = theme.colors.primary,
    propertyUnit = '',
    isOnline = '0',
  } = params;

  const online = isOnline === '1';

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const listRef = useRef<FlatList>(null);

  // Format ISO date to display time string
  const formatMsgTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}`;
  };

  // Load message history from backend
  useEffect(() => {
    if (!tenantId) return;
    api.getMessages(tenantId)
      .then(data => {
        const formatted: Message[] = data.map((m: any) => ({
          id: m.id,
          text: m.content,
          time: formatMsgTime(m.created_at),
          isMe: m.sender_type === 'landlord',
          status: m.sender_type === 'landlord' ? 'delivered' : undefined,
        }));
        setMessages(formatted);
      })
      .catch(() => null);
  }, [tenantId]);

  // Poll for new messages every 15s
  useEffect(() => {
    if (!tenantId) return;
    const interval = setInterval(() => {
      api.getMessages(tenantId).then(data => {
        const formatted: Message[] = data.map((m: any) => ({
          id: m.id,
          text: m.content,
          time: formatMsgTime(m.created_at),
          isMe: m.sender_type === 'landlord',
          status: m.sender_type === 'landlord' ? 'delivered' : undefined,
        }));
        setMessages(formatted);
      }).catch(() => null);
    }, 15000);
    return () => clearInterval(interval);
  }, [tenantId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [messages]);

  const sendMessage = async (text: string = inputText) => {
    const trimmed = text.trim();
    if (!trimmed || !tenantId) return;

    const now = new Date();
    const timeStr = `${now.getHours()}h${String(now.getMinutes()).padStart(2, '0')}`;

    const newMsg: Message = {
      id: `tmp-${Date.now()}`,
      text: trimmed,
      time: timeStr,
      isMe: true,
      status: 'sent',
    };

    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    setShowQuickReplies(false);

    try {
      const saved = await api.sendMessage(tenantId, trimmed, 'landlord');
      // Replace temp message with server response
      setMessages(prev => prev.map(m =>
        m.id === newMsg.id ? { ...m, id: saved.id, status: 'delivered' } : m
      ));
    } catch {
      setMessages(prev => prev.filter(m => m.id !== newMsg.id));
      Alert.alert('Erreur', "Le message n'a pas pu être envoyé.");
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const prevMsg = messages[index - 1];
    const showAvatar = !item.isMe && (!prevMsg || prevMsg.isMe);
    const showSuggestion = !item.isMe && hasMaintenance(item.text) && !dismissedSuggestions.has(item.id);

    return (
      <View>
        <View style={[styles.msgRow, item.isMe ? styles.msgRowMe : styles.msgRowThem]}>
          {/* Tenant avatar placeholder */}
          {!item.isMe && (
            <View style={[styles.msgAvatar, showAvatar ? { backgroundColor: avatarColor } : styles.msgAvatarHidden]}>
              {showAvatar && <Text style={styles.msgAvatarText}>{tenantInitials.slice(0, 1)}</Text>}
            </View>
          )}

          <View style={styles.msgContent}>
            <View style={[styles.bubble, item.isMe ? styles.bubbleMe : styles.bubbleThem]}>
              <Text style={[styles.bubbleText, item.isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
                {item.text}
              </Text>
            </View>
            <View style={[styles.msgMeta, item.isMe ? styles.msgMetaMe : styles.msgMetaThem]}>
              <Text style={styles.msgTime}>{item.time}</Text>
              {item.isMe && item.status && (
                <Ionicons
                  name={item.status === 'read' ? 'checkmark-done' : 'checkmark'}
                  size={13}
                  color={item.status === 'read' ? theme.colors.primary : theme.colors.textTertiary}
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>
          </View>
        </View>

        {showSuggestion && (
          <View style={styles.suggestionBanner}>
            <View style={styles.suggestionHeader}>
              <View style={styles.suggestionIconWrap}>
                <Ionicons name="sparkles" size={13} color={theme.colors.primary} />
              </View>
              <Text style={styles.suggestionLabel}>Domely IA</Text>
              <Text style={styles.suggestionProblem}> · {extractProblem(item.text)} détecté</Text>
            </View>
            <Text style={styles.suggestionBody}>
              Ce message semble signaler un problème de maintenance. Voulez-vous créer un ticket?
            </Text>
            <View style={styles.suggestionActions}>
              <TouchableOpacity
                style={styles.suggestionBtnPrimary}
                onPress={() => router.push('/(tabs)/maintenance')}
              >
                <Ionicons name="construct-outline" size={13} color="#FFF" />
                <Text style={styles.suggestionBtnPrimaryText}>Ouvrir ticket</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.suggestionBtnIgnore}
                onPress={() => setDismissedSuggestions(prev => new Set([...prev, item.id]))}
              >
                <Text style={styles.suggestionBtnIgnoreText}>Ignorer</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.headerAvatarWrap}>
            <View style={[styles.headerAvatar, { backgroundColor: avatarColor }]}>
              <Text style={styles.headerAvatarText}>{tenantInitials}</Text>
            </View>
            {online && <View style={styles.headerOnlineDot} />}
          </View>
          <View>
            <Text style={styles.headerName}>{tenantName}</Text>
            <Text style={styles.headerSub}>{online ? '● En ligne' : propertyUnit}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.headerAction}
          onPress={() => Alert.alert('Appel', `Appeler ${tenantName}?`, [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Appeler', onPress: () => {} },
          ])}
        >
          <Ionicons name="call-outline" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Context banner */}
      <View style={styles.contextBanner}>
        <Ionicons name="home-outline" size={13} color={theme.colors.textTertiary} />
        <Text style={styles.contextText}>{propertyUnit}</Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Quick replies */}
      {showQuickReplies && (
        <View style={styles.quickRow}>
          {QUICK_REPLIES.map(qr => (
            <TouchableOpacity key={qr} style={styles.quickChip} onPress={() => sendMessage(qr)}>
              <Text style={styles.quickChipText}>{qr}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Input bar */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        <View style={styles.inputBar}>
          <TouchableOpacity
            style={styles.inputAction}
            onPress={() => setShowQuickReplies(v => !v)}
          >
            <Ionicons
              name={showQuickReplies ? 'chevron-down' : 'flash-outline'}
              size={22}
              color={showQuickReplies ? theme.colors.primary : theme.colors.textSecondary}
            />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Message…"
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            maxLength={500}
            returnKeyType="default"
          />

          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={() => sendMessage()}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.sm, paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 8 },
  headerAvatarWrap: { position: 'relative' },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { fontSize: 14, fontWeight: '800', color: '#FFF' },
  headerOnlineDot: { position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: 5.5, backgroundColor: theme.colors.success, borderWidth: 2, borderColor: theme.colors.surface },
  headerName: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  headerSub: { fontSize: 12, color: theme.colors.success, fontWeight: '500' },
  headerAction: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  // Context
  contextBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: theme.spacing.md, paddingVertical: 7,
    backgroundColor: theme.colors.borderLight,
  },
  contextText: { fontSize: 12, color: theme.colors.textTertiary, fontWeight: '500' },

  // Messages
  messagesList: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, gap: 4 },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4 },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowThem: { justifyContent: 'flex-start' },

  msgAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 8, marginBottom: 2 },
  msgAvatarHidden: { backgroundColor: 'transparent' },
  msgAvatarText: { fontSize: 11, fontWeight: '800', color: '#FFF' },

  msgContent: { maxWidth: '75%' },

  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleMe: { backgroundColor: theme.colors.primary, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: theme.colors.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: theme.colors.borderLight },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextMe: { color: '#FFF' },
  bubbleTextThem: { color: theme.colors.textPrimary },

  msgMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  msgMetaMe: { justifyContent: 'flex-end' },
  msgMetaThem: { justifyContent: 'flex-start' },
  msgTime: { fontSize: 11, color: theme.colors.textTertiary },

  // Quick replies
  quickRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1, borderTopColor: theme.colors.borderLight,
  },
  quickChip: {
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 999, borderWidth: 1, borderColor: theme.colors.primary + '40',
  },
  quickChipText: { fontSize: 13, color: theme.colors.primary, fontWeight: '500' },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: theme.spacing.md, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1, borderTopColor: theme.colors.borderLight,
  },
  inputAction: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  input: {
    flex: 1, minHeight: 40, maxHeight: 120,
    backgroundColor: theme.colors.background,
    borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: theme.colors.textPrimary,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  sendBtnDisabled: { backgroundColor: theme.colors.borderLight },

  // AI Maintenance suggestion banner
  suggestionBanner: {
    marginHorizontal: theme.spacing.md,
    marginBottom: 10,
    marginTop: 2,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  suggestionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  suggestionIconWrap: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: theme.colors.primary + '20',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 6,
  },
  suggestionLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
  suggestionProblem: { fontSize: 12, fontWeight: '500', color: theme.colors.primary },
  suggestionBody: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 17, marginBottom: 10 },
  suggestionActions: { flexDirection: 'row', gap: 8 },
  suggestionBtnPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 8,
  },
  suggestionBtnPrimaryText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  suggestionBtnIgnore: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1, borderColor: theme.colors.border,
  },
  suggestionBtnIgnoreText: { fontSize: 12, fontWeight: '500', color: theme.colors.textSecondary },
});
