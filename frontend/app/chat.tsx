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

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  text: string;
  time: string;
  isMe: boolean;
  status?: 'sent' | 'delivered' | 'read';
}

// ─── Mock message threads per conversation ─────────────────────────────────────
const MOCK_THREADS: Record<string, Message[]> = {
  c1: [
    { id: 'm1', text: 'Bonjour, le robinet de la salle de bain coule depuis hier soir.', time: '9h14', isMe: false },
    { id: 'm2', text: 'Bonjour Michael, merci de me prévenir. Est-ce que c\'est un filet constant ou juste en gouttes?', time: '9h22', isMe: true, status: 'read' },
    { id: 'm3', text: 'En gouttes, mais ça s\'aggrave. Il y a aussi une petite tache d\'humidité sous le lavabo.', time: '9h25', isMe: false },
    { id: 'm4', text: 'D\'accord, je contacte mon plombier maintenant. Je vous confirme l\'heure d\'ici 30 minutes.', time: '9h28', isMe: true, status: 'read' },
    { id: 'm5', text: 'Mon plombier peut passer demain matin entre 9h et 11h. Ça vous convient?', time: '9h45', isMe: true, status: 'delivered' },
    { id: 'm6', text: 'Merci pour la réponse, je vais attendre le plombier demain.', time: '9h52', isMe: false },
  ],
  c2: [
    { id: 'm1', text: 'Bonjour, j\'ai vu qu\'il me manque 50$ sur le loyer d\'avril. Désolée!', time: 'hier 14h', isMe: false },
    { id: 'm2', text: 'Pas de souci Sarah, vous pouvez faire le solde quand vous voulez ce mois-ci.', time: 'hier 14h30', isMe: true, status: 'read' },
    { id: 'm3', text: 'Parfait, je vous envoie le chèque ce soir.', time: 'hier 15h00', isMe: false },
  ],
  c3: [
    { id: 'm1', text: 'Bonjour, le bail se renouvelle en juin. Avez-vous reçu mon avis?', time: 'lun 10h', isMe: false },
    { id: 'm2', text: 'Oui David, je l\'ai bien reçu. Pas d\'augmentation prévue pour cette année.', time: 'lun 11h', isMe: true, status: 'read' },
    { id: 'm3', text: 'Super, merci! Je signe dans les prochains jours.', time: 'lun 11h15', isMe: false },
    { id: 'm4', text: 'D\'accord, je règle ça cette semaine.', time: 'lun 16h', isMe: true, status: 'read' },
  ],
  c4: [
    { id: 'm1', text: 'Bonjour, il y a un courant d\'air important qui entre par la fenêtre du salon depuis les dernières pluies.', time: 'dim 17h', isMe: false },
    { id: 'm2', text: 'Bonjour Émilie, je vais passer voir ça cette semaine. Êtes-vous disponible mercredi après-midi?', time: 'dim 18h', isMe: true, status: 'delivered' },
    { id: 'm3', text: 'Est-ce que vous pouvez regarder la fenêtre du salon?', time: 'dim 18h30', isMe: false },
  ],
  c5: [
    { id: 'm1', text: 'Marc, votre bail expire le 31 mai. Souhaitez-vous renouveler?', time: '12 mars 9h', isMe: true, status: 'read' },
    { id: 'm2', text: 'Oui absolument, je compte rester encore au moins 2 ans.', time: '12 mars 10h', isMe: false },
    { id: 'm3', text: 'Parfait! J\'ai préparé le document de renouvellement. Je vous l\'envoie pour signature ce soir.', time: '12 mars 10h15', isMe: true, status: 'read' },
    { id: 'm4', text: 'Vous : Le renouvellement est prêt pour signature.', time: '12 mars 19h', isMe: true, status: 'delivered' },
  ],
};

const QUICK_REPLIES = [
  'Je regarde ça dès que possible.',
  'Merci de me prévenir!',
  'Je reviens vers vous sous 24h.',
  'Un technicien passera cette semaine.',
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function ChatScreen() {
  const params = useLocalSearchParams<{
    id: string;
    tenantName: string;
    tenantInitials: string;
    avatarColor: string;
    propertyUnit: string;
    isOnline: string;
  }>();

  const {
    id = 'c1',
    tenantName = 'Locataire',
    tenantInitials = 'LO',
    avatarColor = theme.colors.primary,
    propertyUnit = '',
    isOnline = '0',
  } = params;

  const online = isOnline === '1';

  const [messages, setMessages] = useState<Message[]>(MOCK_THREADS[id] ?? []);
  const [inputText, setInputText] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const listRef = useRef<FlatList>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [messages]);

  const sendMessage = (text: string = inputText) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const now = new Date();
    const timeStr = `${now.getHours()}h${String(now.getMinutes()).padStart(2, '0')}`;

    const newMsg: Message = {
      id: `m${Date.now()}`,
      text: trimmed,
      time: timeStr,
      isMe: true,
      status: 'sent',
    };

    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    setShowQuickReplies(false);

    // Simulate "delivered" after 1s
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, status: 'delivered' } : m));
    }, 1000);
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const prevMsg = messages[index - 1];
    const showAvatar = !item.isMe && (!prevMsg || prevMsg.isMe);

    return (
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
});
