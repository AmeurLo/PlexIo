import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  TextInput, FlatList, KeyboardAvoidingView, Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from './index';
import { api } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  time: string;
}

// ─── Contextual suggestions per screen ────────────────────────────────────────
export type AIContext = 'home' | 'portfolio' | 'tenants' | 'maintenance' | 'messages' | 'more';

const CONTEXT_PROMPTS: Record<AIContext, string[]> = {
  home: [
    'Résume ma situation financière ce mois-ci',
    'Quels loyers sont en retard?',
    'Y a-t-il des actions urgentes à faire?',
  ],
  portfolio: [
    'Quel immeuble performe le mieux?',
    'Calcule mon rendement net annuel',
    'Où puis-je optimiser mes dépenses?',
  ],
  tenants: [
    'Qui sont mes locataires à risque?',
    'Quels baux expirent bientôt?',
    'Génère un rappel de loyer pour les retardataires',
  ],
  maintenance: [
    'Priorise mes tickets ouverts',
    'Rédige un avis d\'intervention pour un locataire',
    'Quel entrepreneur appeler pour de la plomberie?',
  ],
  messages: [
    'Rédige une réponse professionnelle',
    'Comment gérer cette demande de réparation?',
    'Génère un avis de renouvellement',
  ],
  more: [
    'Quels outils devrais-je utiliser en priorité?',
    'Rappelle-moi mes tâches urgentes',
    'Comment optimiser la gestion de mon équipe?',
  ],
};

// ─── Mock AI responses ────────────────────────────────────────────────────────
const MOCK_RESPONSES: Record<string, string> = {
  'Résume ma situation financière ce mois-ci':
    'Ce mois-ci vous avez collecté 4 650 $ sur 5 200 $ attendus (89%). Il reste 2 loyers en retard : Michael John (250 $) et Émilie Tremblay (300 $). Vos dépenses totales sont de 1 200 $, ce qui donne un flux net de +3 450 $.',
  'Quels loyers sont en retard?':
    '2 loyers en retard :\n• Michael John — Duplex St-Henri #101 — 250 $ — 5 jours\n• Émilie Tremblay — Triplex Rosemont #2 — 300 $ — 2 jours\n\nJe peux rédiger un rappel automatique pour les deux si vous voulez.',
  'Y a-t-il des actions urgentes à faire?':
    '3 actions prioritaires :\n1. Fuite plomberie — Rosemont #1 (ouvert depuis 3 jours)\n2. Bail de Sophie Bernard expire dans 21 jours\n3. Loyer d\'Émilie en retard de 300 $\n\nVoulez-vous que je prépare les communications?',
  'Quel immeuble performe le mieux?':
    'Duplex St-Henri : rendement net de 7.2%/an, taux d\'occupation 100%, 0 ticket de maintenance ouvert. C\'est votre meilleur actif.\n\nTriplex Rosemont performe à 5.8% — une unité vacante depuis 12 jours impacte le rendement.',
  'Priorise mes tickets ouverts':
    'Ordre de priorité :\n1. [URGENT] Fuite robinet Rosemont #1 (humidité sous lavabo)\n2. [MOYEN] Courant d\'air fenêtre Rosemont #2\n3. [FAIBLE] Ampoule entrée Duplex St-Henri\n\nJe recommande d\'appeler Mario Plante (plombier, favori) pour le #1 dès aujourd\'hui.',
};

function getDefaultResponse(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes('loyer') || lower.includes('rent'))
    return 'Je vois votre question sur les loyers. Basé sur votre portefeuille actuel, votre taux de collecte moyen est de 91% sur les 3 derniers mois. Voulez-vous un rapport détaillé?';
  if (lower.includes('bail') || lower.includes('renouvellement'))
    return 'Je peux vous aider à préparer un document de renouvellement. Quel locataire est concerné?';
  if (lower.includes('maintenance') || lower.includes('réparation') || lower.includes('entretien'))
    return 'Pour les demandes de maintenance, je recommande de documenter avec une photo et d\'assigner à un entrepreneur de votre liste. Voulez-vous que je priorise vos tickets ouverts?';
  if (lower.includes('merci'))
    return 'Avec plaisir! N\'hésitez pas si vous avez d\'autres questions sur votre portefeuille.';
  return 'Je traite votre demande... En production, Domely AI analysera l\'ensemble de votre portefeuille pour vous donner une réponse personnalisée. Pour l\'instant, voici ce que je peux faire : analyser vos finances, prioriser vos tickets, rédiger des communications et surveiller vos baux.';
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  context?: AIContext;
}

export default function DomelyAI({ context = 'home' }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Bonjour! Je suis Domely AI. Je connais votre portefeuille et je suis là pour vous aider. Que puis-je faire pour vous?',
      time: 'Maintenant',
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const listRef = useRef<FlatList>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation on the button
  React.useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const now = () => {
    const d = new Date();
    return `${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: AIMessage = { id: `u${Date.now()}`, role: 'user', text: trimmed, time: now() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setTyping(true);

    try {
      const history = updatedMessages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.text }));
      const { response } = await api.aiChat(history, context);
      const botMsg: AIMessage = { id: `a${Date.now()}`, role: 'assistant', text: response, time: now() };
      setMessages(prev => [...prev, botMsg]);
    } catch {
      const fallback = MOCK_RESPONSES[trimmed] ?? getDefaultResponse(trimmed);
      const botMsg: AIMessage = { id: `a${Date.now()}`, role: 'assistant', text: fallback, time: now() };
      setMessages(prev => [...prev, botMsg]);
    } finally {
      setTyping(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  };

  const suggestions = CONTEXT_PROMPTS[context] ?? CONTEXT_PROMPTS.home;

  const renderMessage = ({ item }: { item: AIMessage }) => (
    <View style={[styles.msgRow, item.role === 'user' ? styles.msgRowUser : styles.msgRowBot]}>
      {item.role === 'assistant' && (
        <View style={styles.botAvatar}>
          <Ionicons name="sparkles" size={14} color="#fff" />
        </View>
      )}
      <View style={[styles.bubble, item.role === 'user' ? styles.bubbleUser : styles.bubbleBot]}>
        <Text style={[styles.bubbleText, item.role === 'user' && styles.bubbleTextUser]}>
          {item.text}
        </Text>
        <Text style={[styles.bubbleTime, item.role === 'user' && { color: 'rgba(255,255,255,0.6)' }]}>
          {item.time}
        </Text>
      </View>
    </View>
  );

  return (
    <>
      {/* Floating AI Button */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity style={styles.fab} onPress={() => setOpen(true)} activeOpacity={0.85}>
          <Ionicons name="sparkles" size={17} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {/* Chat Modal */}
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerAvatar}>
                <Ionicons name="sparkles" size={18} color="#fff" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Domely AI</Text>
                <Text style={styles.headerSub}>Votre assistant immobilier</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={m => m.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListFooterComponent={
              typing ? (
                <View style={styles.typingRow}>
                  <View style={styles.botAvatar}>
                    <Ionicons name="sparkles" size={14} color="#fff" />
                  </View>
                  <View style={styles.typingBubble}>
                    <Text style={styles.typingText}>Domely AI réfléchit…</Text>
                  </View>
                </View>
              ) : null
            }
          />

          {/* Suggestions */}
          {messages.length <= 1 && (
            <View style={styles.suggestionsWrap}>
              <Text style={styles.suggestionsLabel}>Suggestions</Text>
              <View style={styles.suggestions}>
                {suggestions.map(s => (
                  <TouchableOpacity key={s} style={styles.suggestionChip} onPress={() => sendMessage(s)}>
                    <Text style={styles.suggestionText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Input */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Posez votre question…"
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              maxLength={400}
              onSubmitEditing={() => sendMessage(input)}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
              onPress={() => sendMessage(input)}
              disabled={!input.trim() || typing}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  fab: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
    backgroundColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.textPrimary },
  headerSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  messageList: { padding: 16, gap: 12 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4 },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowBot: { justifyContent: 'flex-start' },
  botAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleBot: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.borderLight,
    borderBottomLeftRadius: 4,
  },
  bubbleUser: { backgroundColor: theme.colors.primary, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 22, color: theme.colors.textPrimary },
  bubbleTextUser: { color: '#fff' },
  bubbleTime: { fontSize: 10, color: theme.colors.textTertiary, marginTop: 4, textAlign: 'right' },

  typingRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 4, paddingHorizontal: 16 },
  typingBubble: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderBottomLeftRadius: 4,
    backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderLight,
  },
  typingText: { fontSize: 13, color: theme.colors.textTertiary, fontStyle: 'italic' },

  suggestionsWrap: {
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4,
    backgroundColor: theme.colors.background,
  },
  suggestionsLabel: { fontSize: 11, fontWeight: '600', color: theme.colors.textTertiary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestionChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1, borderColor: theme.colors.primary + '30',
  },
  suggestionText: { fontSize: 13, color: theme.colors.primary, fontWeight: '500' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 16, paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1, borderTopColor: theme.colors.borderLight,
  },
  input: {
    flex: 1, minHeight: 42, maxHeight: 120,
    backgroundColor: theme.colors.background,
    borderRadius: 21, borderWidth: 1, borderColor: theme.colors.border,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: theme.colors.textPrimary,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: theme.colors.borderLight },
});
