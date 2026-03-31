import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../src/components';
import { api } from '../src/services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  time: string;
}

// ─── Suggested prompts by category ───────────────────────────────────────────

const SUGGESTED_PROMPTS: { label: string; icon: string; color: string; prompts: string[] }[] = [
  {
    label: 'Finances',
    icon: 'cash-outline',
    color: '#10B981',
    prompts: [
      'Résume ma situation financière ce mois-ci',
      'Quels loyers sont en retard?',
    ],
  },
  {
    label: 'Portefeuille',
    icon: 'business-outline',
    color: theme.colors.primary,
    prompts: [
      'Quel immeuble performe le mieux?',
      'Calcule mon rendement net annuel',
    ],
  },
  {
    label: 'Locataires',
    icon: 'people-outline',
    color: '#8B5CF6',
    prompts: [
      'Qui sont mes locataires à risque?',
      'Quels baux expirent bientôt?',
    ],
  },
  {
    label: 'Maintenance',
    icon: 'construct-outline',
    color: '#F59E0B',
    prompts: [
      'Priorise mes tickets ouverts',
      'Quel entrepreneur appeler pour de la plomberie?',
    ],
  },
];

// ─── Fallback mock responses ──────────────────────────────────────────────────

const MOCK_RESPONSES: Record<string, string> = {
  'Résume ma situation financière ce mois-ci':
    'Ce mois-ci vous avez collecté 4 650 $ sur 5 200 $ attendus (89%). Il reste 2 loyers en retard. Vos dépenses totales sont de 1 200 $, ce qui donne un flux net de +3 450 $.',
  'Quels loyers sont en retard?':
    '2 loyers en retard :\n• Michael John — Duplex St-Henri #101 — 250 $ — 5 jours\n• Émilie Tremblay — Triplex Rosemont #2 — 300 $ — 2 jours\n\nJe peux rédiger un rappel automatique si vous voulez.',
  'Quel immeuble performe le mieux?':
    'Duplex St-Henri : rendement net de 7.2%/an, taux d\'occupation 100%, 0 ticket ouvert. C\'est votre meilleur actif.\n\nTriplex Rosemont performe à 5.8% — une unité vacante depuis 12 jours impacte le rendement.',
  'Calcule mon rendement net annuel':
    'Rendement net estimé sur votre portefeuille :\n• Revenus locatifs annuels : 62 400 $\n• Dépenses totales (entretien, assurances, taxes) : 18 200 $\n• Flux net annuel : 44 200 $\n• Rendement net : ~6.4% sur valeur estimée du portefeuille.',
  'Qui sont mes locataires à risque?':
    'Locataires à surveiller :\n1. Émilie Tremblay — 2 retards en 3 mois\n2. Jean-Pierre Dubois — bail expire dans 18 jours, pas encore signé\n\nJe recommande de contacter ces locataires cette semaine.',
  'Quels baux expirent bientôt?':
    'Baux expirant dans les 60 prochains jours :\n• Sophie Bernard — Rosemont #2 — expire dans 21 jours\n• Jean-Pierre Dubois — St-Henri #103 — expire dans 18 jours\n\nVoulez-vous que je prépare les avis de renouvellement?',
  'Priorise mes tickets ouverts':
    'Ordre de priorité :\n1. [URGENT] Fuite robinet Rosemont #1 (humidité sous lavabo)\n2. [MOYEN] Courant d\'air fenêtre Rosemont #2\n3. [FAIBLE] Ampoule entrée Duplex St-Henri\n\nJe recommande d\'appeler un plombier dès aujourd\'hui pour le #1.',
  'Quel entrepreneur appeler pour de la plomberie?':
    'Dans votre liste d\'entrepreneurs, Mario Plante (Plomberie Express) est votre contact le plus utilisé pour la plomberie.\n\nIl a résolu 3 tickets similaires chez vous dans les 12 derniers mois avec une note de 5/5.',
};

function getDefaultResponse(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes('loyer') || lower.includes('rent'))
    return 'Basé sur votre portefeuille, votre taux de collecte moyen est de 91% sur les 3 derniers mois. Voulez-vous un rapport détaillé par propriété?';
  if (lower.includes('bail') || lower.includes('renouvellement'))
    return 'Je peux vous aider à préparer un document de renouvellement. Quel locataire est concerné?';
  if (lower.includes('maintenance') || lower.includes('réparation') || lower.includes('entretien'))
    return 'Pour les demandes de maintenance, je recommande de documenter avec une photo et d\'assigner à un entrepreneur de votre liste. Voulez-vous que je priorise vos tickets ouverts?';
  if (lower.includes('dépense') || lower.includes('dépenses'))
    return 'Vos dépenses ce mois-ci représentent 23% de vos revenus locatifs. Les catégories les plus élevées sont l\'entretien (42%) et les taxes (28%). Voulez-vous un détail par propriété?';
  if (lower.includes('merci'))
    return 'Avec plaisir! N\'hésitez pas si vous avez d\'autres questions sur votre portefeuille.';
  return 'Je traite votre demande... En production, Domely AI analysera l\'ensemble de votre portefeuille pour vous donner une réponse personnalisée. Je peux analyser vos finances, prioriser vos tickets, rédiger des communications et surveiller vos baux.';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AIScreen() {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Bonjour! Je suis Domely AI, votre assistant immobilier intelligent. Je connais votre portefeuille et suis là pour vous aider à prendre de meilleures décisions. Que puis-je faire pour vous?',
      time: 'Maintenant',
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const listRef = useRef<FlatList>(null);

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
      const { response } = await api.aiChat(history, 'home');
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

  const resetConversation = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        text: 'Conversation réinitialisée. Comment puis-je vous aider?',
        time: now(),
      },
    ]);
    setInput('');
  };

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

  const showSuggestions = messages.length <= 1;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <Ionicons name="sparkles" size={18} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Domely AI</Text>
            <Text style={styles.headerSub}>Votre assistant immobilier</Text>
          </View>
        </View>

        <TouchableOpacity onPress={resetConversation} style={styles.resetBtn}>
          <Ionicons name="refresh-outline" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Messages list */}
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

        {/* Suggestions (shown only on fresh conversation) */}
        {showSuggestions && (
          <View style={styles.suggestionsWrap}>
            <Text style={styles.suggestionsHeader}>Suggestions</Text>
            {SUGGESTED_PROMPTS.map(category => (
              <View key={category.label} style={styles.categoryBlock}>
                <View style={styles.categoryLabelRow}>
                  <Ionicons name={category.icon as any} size={13} color={category.color} />
                  <Text style={[styles.categoryLabel, { color: category.color }]}>{category.label}</Text>
                </View>
                <View style={styles.chipRow}>
                  {category.prompts.map(prompt => (
                    <TouchableOpacity
                      key={prompt}
                      style={[styles.suggestionChip, { borderColor: category.color + '30', backgroundColor: category.color + '10' }]}
                      onPress={() => sendMessage(prompt)}
                    >
                      <Text style={[styles.suggestionChipText, { color: category.color }]} numberOfLines={2}>
                        {prompt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Posez votre question…"
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || typing) && styles.sendBtnDisabled]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || typing}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: theme.spacing.sm, paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 4 },
  headerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  headerSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
  resetBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  messageList: { padding: 16, gap: 4, paddingBottom: 12 },

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

  typingRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 4 },
  typingBubble: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderBottomLeftRadius: 4,
    backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderLight,
  },
  typingText: { fontSize: 13, color: theme.colors.textTertiary, fontStyle: 'italic' },

  suggestionsWrap: {
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1, borderTopColor: theme.colors.borderLight,
  },
  suggestionsHeader: {
    fontSize: 11, fontWeight: '700', color: theme.colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  categoryBlock: { marginBottom: 10 },
  categoryLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  categoryLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  chipRow: { flexDirection: 'row', gap: 8 },
  suggestionChip: {
    flex: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1,
  },
  suggestionChipText: { fontSize: 12, fontWeight: '500', lineHeight: 17 },

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
    marginBottom: 1,
  },
  sendBtnDisabled: { backgroundColor: theme.colors.borderLight },
});
