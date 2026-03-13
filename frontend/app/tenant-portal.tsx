import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Card, theme } from '../src/components';
import { api } from '../src/services/api';
import { formatCurrency, formatDate } from '../src/utils/format';

type Tab = 'messages' | 'maintenance' | 'payments' | 'documents';

const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: 'messages', icon: 'chatbubble-outline', label: 'Messages' },
  { key: 'maintenance', icon: 'construct-outline', label: 'Travaux' },
  { key: 'payments', icon: 'card-outline', label: 'Paiements' },
  { key: 'documents', icon: 'folder-outline', label: 'Documents' },
];

const MOCK_MESSAGES = [
  { id: '1', from: 'landlord', text: 'Bonjour, votre bail est renouvelé jusqu\'au 30 juin 2026.', date: '2026-02-15T10:00:00', read: true },
  { id: '2', from: 'tenant', text: 'Merci! Est-ce que je peux obtenir une copie signée?', date: '2026-02-15T10:45:00', read: true },
  { id: '3', from: 'landlord', text: 'Bien sûr, je vous l\'envoie dans les documents.', date: '2026-02-15T11:00:00', read: true },
  { id: '4', from: 'tenant', text: 'Le robinet de la cuisine coule depuis hier soir.', date: '2026-03-09T08:30:00', read: false },
];

const MOCK_PAYMENTS = [
  { id: '1', month: 'Mars 2026', amount: 1250, status: 'paid', date: '2026-03-01', method: 'Virement' },
  { id: '2', month: 'Février 2026', amount: 1250, status: 'paid', date: '2026-02-01', method: 'Virement' },
  { id: '3', month: 'Janvier 2026', amount: 1250, status: 'paid', date: '2026-01-02', method: 'Carte débit' },
  { id: '4', month: 'Décembre 2025', amount: 1250, status: 'paid', date: '2025-12-01', method: 'Virement' },
];

const MOCK_DOCS = [
  { id: '1', name: 'Bail — Logement 2', type: 'lease', date: '2025-07-01', icon: 'document-text-outline', color: theme.colors.primary },
  { id: '2', name: 'Relevé 31 — 2025', type: 'releve31', date: '2026-02-28', icon: 'receipt-outline', color: '#8B5CF6' },
  { id: '3', name: 'Reçu — Janvier 2026', type: 'receipt', date: '2026-01-02', icon: 'checkmark-circle-outline', color: theme.colors.success },
  { id: '4', name: 'Reçu — Février 2026', type: 'receipt', date: '2026-02-01', icon: 'checkmark-circle-outline', color: theme.colors.success },
  { id: '5', name: 'Reçu — Mars 2026', type: 'receipt', date: '2026-03-01', icon: 'checkmark-circle-outline', color: theme.colors.success },
  { id: '6', name: 'Avis de renouvellement', type: 'notice', date: '2026-01-15', icon: 'mail-outline', color: theme.colors.warning },
];

export default function TenantPortalScreen() {
  const { tenantId, tenantName, unitNumber, rent } = useLocalSearchParams<{
    tenantId: string; tenantName: string; unitNumber: string; rent: string;
  }>();

  const [activeTab, setActiveTab] = useState<Tab>('messages');
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [newMessage, setNewMessage] = useState('');
  const [showPayModal, setShowPayModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');
  const [cardName, setCardName] = useState('');
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({ title: '', description: '', hasPhoto: false });

  const unreadCount = messages.filter(m => !m.read && m.from === 'tenant').length;

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      from: 'landlord',
      text: newMessage.trim(),
      date: new Date().toISOString(),
      read: true,
    }]);
    setNewMessage('');
  };

  const handleAddPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!result.canceled) setMaintenanceForm(f => ({ ...f, hasPhoto: true }));
  };

  const submitMaintenance = () => {
    if (!maintenanceForm.title.trim()) { Alert.alert('Erreur', 'Veuillez décrire le problème.'); return; }
    Alert.alert('Demande envoyée', 'Le propriétaire a été notifié de votre demande d\'entretien.');
    setShowMaintenanceModal(false);
    setMaintenanceForm({ title: '', description: '', hasPhoto: false });
  };

  const handlePayRent = () => {
    setPaymentSuccess(false);
    setCardNumber(''); setCardExpiry(''); setCardCVV(''); setCardName('');
    setShowPayModal(true);
  };

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const submitPayment = async () => {
    if (!cardName.trim() || cardNumber.replace(/\s/g, '').length < 16 || cardExpiry.length < 5 || cardCVV.length < 3) {
      Alert.alert('Informations manquantes', 'Veuillez remplir tous les champs de carte.');
      return;
    }
    setProcessingPayment(true);
    // Simulate Stripe processing delay
    await new Promise(r => setTimeout(r, 2200));
    setProcessingPayment(false);
    setPaymentSuccess(true);
  };

  const renderMessages = () => (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.messageList} contentContainerStyle={{ padding: theme.spacing.md, gap: 10 }}>
        {messages.map(msg => (
          <View key={msg.id} style={[styles.messageBubbleWrap, msg.from === 'landlord' ? styles.bubbleRight : styles.bubbleLeft]}>
            {msg.from === 'tenant' && (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{tenantName?.[0] ?? 'T'}</Text>
              </View>
            )}
            <View style={[styles.bubble, msg.from === 'landlord' ? styles.bubbleLandlord : styles.bubbleTenant]}>
              <Text style={[styles.bubbleText, msg.from === 'landlord' && { color: '#fff' }]}>{msg.text}</Text>
              <Text style={[styles.bubbleTime, msg.from === 'landlord' && { color: 'rgba(255,255,255,0.7)' }]}>
                {new Date(msg.date).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.messageInputRow}>
          <TextInput
            style={styles.messageInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Écrire un message..."
            placeholderTextColor={theme.colors.textTertiary}
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );

  const renderMaintenance = () => (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <TouchableOpacity style={styles.newRequestBtn} onPress={() => setShowMaintenanceModal(true)}>
        <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
        <Text style={styles.newRequestText}>Nouvelle demande d'entretien</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Demandes en cours</Text>
      <Card style={styles.maintenanceCard}>
        <View style={styles.maintenanceRow}>
          <View style={[styles.priorityDot, { backgroundColor: theme.colors.error }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.maintenanceTitle}>Robinet qui coule — cuisine</Text>
            <Text style={styles.maintenanceMeta}>Signalé le 9 mars 2026 · En attente</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: theme.colors.warning + '20' }]}>
            <Text style={[styles.statusBadgeText, { color: theme.colors.warning }]}>Ouvert</Text>
          </View>
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Historique</Text>
      <Card style={styles.maintenanceCard}>
        <View style={styles.maintenanceRow}>
          <View style={[styles.priorityDot, { backgroundColor: theme.colors.success }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.maintenanceTitle}>Remplacement serrure — porte entrée</Text>
            <Text style={styles.maintenanceMeta}>Résolu le 15 jan. 2026 · 3 jours</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: theme.colors.success + '20' }]}>
            <Text style={[styles.statusBadgeText, { color: theme.colors.success }]}>Terminé</Text>
          </View>
        </View>
      </Card>
    </ScrollView>
  );

  const renderPayments = () => (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      {/* Pay now card */}
      <Card style={styles.payNowCard}>
        <View style={styles.payNowTop}>
          <View>
            <Text style={styles.payNowLabel}>Loyer — Avril 2026</Text>
            <Text style={styles.payNowAmount}>{formatCurrency(parseFloat(rent || '0'))}</Text>
            <Text style={styles.payNowDue}>Dû le 1er avril 2026</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: theme.colors.warning + '20' }]}>
            <Text style={[styles.statusBadgeText, { color: theme.colors.warning }]}>À venir</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.payBtn} onPress={handlePayRent}>
          <Ionicons name="card-outline" size={18} color="#fff" />
          <Text style={styles.payBtnText}>Payer maintenant</Text>
        </TouchableOpacity>
      </Card>

      <Text style={styles.sectionTitle}>Historique des paiements</Text>
      {MOCK_PAYMENTS.map(p => (
        <Card key={p.id} style={styles.paymentCard}>
          <View style={styles.paymentRow}>
            <View style={[styles.paymentIcon, { backgroundColor: theme.colors.success + '20' }]}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.paymentMonth}>{p.month}</Text>
              <Text style={styles.paymentMethod}>{p.method} · {p.date}</Text>
            </View>
            <Text style={styles.paymentAmount}>{formatCurrency(p.amount)}</Text>
          </View>
        </Card>
      ))}
    </ScrollView>
  );

  const renderDocuments = () => (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
      <Card style={styles.releve31Banner}>
        <View style={styles.releve31Row}>
          <Ionicons name="star" size={18} color="#8B5CF6" />
          <View style={{ flex: 1 }}>
            <Text style={styles.releve31Title}>Relevé 31 — 2025 disponible</Text>
            <Text style={styles.releve31Sub}>Requis pour votre déclaration de revenus</Text>
          </View>
          <TouchableOpacity style={styles.downloadBtn} onPress={() => Alert.alert('Téléchargement', 'Relevé 31 téléchargé.')}>
            <Ionicons name="download-outline" size={18} color="#8B5CF6" />
          </TouchableOpacity>
        </View>
      </Card>

      {MOCK_DOCS.map(doc => (
        <TouchableOpacity key={doc.id} onPress={() => Alert.alert('Document', `Ouverture de "${doc.name}"`)}>
          <Card style={styles.docCard}>
            <View style={styles.docRow}>
              <View style={[styles.docIcon, { backgroundColor: doc.color + '20' }]}>
                <Ionicons name={doc.icon as any} size={20} color={doc.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.docName}>{doc.name}</Text>
                <Text style={styles.docDate}>{doc.date}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
            </View>
          </Card>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{tenantName}</Text>
          <Text style={styles.headerSub}>Portail locataire · Logement {unitNumber}</Text>
        </View>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons name={tab.icon as any} size={18} color={activeTab === tab.key ? theme.colors.primary : theme.colors.textTertiary} />
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'messages' && renderMessages()}
        {activeTab === 'maintenance' && renderMaintenance()}
        {activeTab === 'payments' && renderPayments()}
        {activeTab === 'documents' && renderDocuments()}
      </View>

      {/* Stripe Payment Modal */}
      <Modal visible={showPayModal} animationType="slide" transparent onRequestClose={() => !processingPayment && setShowPayModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {paymentSuccess ? (
              /* Success state */
              <View style={styles.paySuccessView}>
                <View style={styles.paySuccessIcon}>
                  <Ionicons name="checkmark-circle" size={64} color={theme.colors.success} />
                </View>
                <Text style={styles.paySuccessTitle}>Paiement réussi!</Text>
                <Text style={styles.paySuccessAmount}>{formatCurrency(parseFloat(rent || '0'))}</Text>
                <Text style={styles.paySuccessSub}>Votre paiement a été traité avec succès via Stripe. Un reçu vous sera envoyé par courriel.</Text>
                <View style={styles.stripeTag}>
                  <Text style={styles.stripeTagText}>Propulsé par</Text>
                  <Text style={styles.stripeTagBrand}>stripe</Text>
                </View>
                <TouchableOpacity style={styles.submitBtn} onPress={() => setShowPayModal(false)}>
                  <Text style={styles.submitBtnText}>Fermer</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Payer le loyer</Text>
                  <TouchableOpacity onPress={() => setShowPayModal(false)} disabled={processingPayment}>
                    <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                {/* Amount summary */}
                <View style={styles.payAmountRow}>
                  <Text style={styles.payAmountLabel}>Loyer — Avril 2026</Text>
                  <Text style={styles.payAmountValue}>{formatCurrency(parseFloat(rent || '0'))}</Text>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Stripe badge */}
                  <View style={styles.stripeBadge}>
                    <Ionicons name="lock-closed" size={12} color={theme.colors.success} />
                    <Text style={styles.stripeBadgeText}>Paiement sécurisé par </Text>
                    <Text style={styles.stripeBadgeBrand}>stripe</Text>
                  </View>

                  {/* Card visual */}
                  <View style={styles.cardPreview}>
                    <View style={styles.cardChip}>
                      <Ionicons name="hardware-chip-outline" size={22} color="#FFD700" />
                    </View>
                    <Text style={styles.cardPreviewNumber}>
                      {cardNumber || '•••• •••• •••• ••••'}
                    </Text>
                    <View style={styles.cardPreviewBottom}>
                      <Text style={styles.cardPreviewName}>{cardName || 'NOM SUR LA CARTE'}</Text>
                      <Text style={styles.cardPreviewExpiry}>{cardExpiry || 'MM/AA'}</Text>
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Nom sur la carte</Text>
                    <TextInput
                      style={styles.input}
                      value={cardName}
                      onChangeText={setCardName}
                      placeholder="Michael John"
                      placeholderTextColor={theme.colors.textTertiary}
                      autoCapitalize="words"
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Numéro de carte</Text>
                    <View style={styles.inputRow}>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={cardNumber}
                        onChangeText={v => setCardNumber(formatCardNumber(v))}
                        placeholder="1234 5678 9012 3456"
                        placeholderTextColor={theme.colors.textTertiary}
                        keyboardType="number-pad"
                        maxLength={19}
                      />
                      <View style={styles.cardBrandIcon}>
                        <Ionicons name="card-outline" size={22} color={theme.colors.primary} />
                      </View>
                    </View>
                  </View>
                  <View style={styles.cardFieldRow}>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Expiration</Text>
                      <TextInput
                        style={styles.input}
                        value={cardExpiry}
                        onChangeText={v => setCardExpiry(formatExpiry(v))}
                        placeholder="MM/AA"
                        placeholderTextColor={theme.colors.textTertiary}
                        keyboardType="number-pad"
                        maxLength={5}
                      />
                    </View>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={styles.label}>CVV</Text>
                      <TextInput
                        style={styles.input}
                        value={cardCVV}
                        onChangeText={v => setCardCVV(v.replace(/\D/g, '').slice(0, 4))}
                        placeholder="123"
                        placeholderTextColor={theme.colors.textTertiary}
                        keyboardType="number-pad"
                        secureTextEntry
                        maxLength={4}
                      />
                    </View>
                  </View>

                  <TouchableOpacity style={[styles.submitBtn, processingPayment && { opacity: 0.7 }]} onPress={submitPayment} disabled={processingPayment}>
                    {processingPayment ? (
                      <View style={styles.processingRow}>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={styles.submitBtnText}>Traitement en cours…</Text>
                      </View>
                    ) : (
                      <Text style={styles.submitBtnText}>Payer {formatCurrency(parseFloat(rent || '0'))}</Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Maintenance modal */}
      <Modal visible={showMaintenanceModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle demande</Text>
              <TouchableOpacity onPress={() => setShowMaintenanceModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Problème *</Text>
                <TextInput
                  style={styles.input}
                  value={maintenanceForm.title}
                  onChangeText={t => setMaintenanceForm(f => ({ ...f, title: t }))}
                  placeholder="Ex. : robinet qui coule"
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  value={maintenanceForm.description}
                  onChangeText={t => setMaintenanceForm(f => ({ ...f, description: t }))}
                  placeholder="Décrivez le problème en détail..."
                  placeholderTextColor={theme.colors.textTertiary}
                  multiline
                />
              </View>
              <TouchableOpacity style={styles.photoBtn} onPress={handleAddPhoto}>
                <Ionicons name={maintenanceForm.hasPhoto ? 'checkmark-circle-outline' : 'camera-outline'} size={20} color={maintenanceForm.hasPhoto ? theme.colors.success : theme.colors.primary} />
                <Text style={[styles.photoBtnText, maintenanceForm.hasPhoto && { color: theme.colors.success }]}>
                  {maintenanceForm.hasPhoto ? 'Photo ajoutée ✓' : 'Ajouter une photo'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={submitMaintenance}>
                <Text style={styles.submitBtnText}>Envoyer la demande</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: theme.spacing.md, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.textPrimary },
  headerSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
  unreadBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: theme.colors.error, alignItems: 'center', justifyContent: 'center' },
  unreadText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  tabBar: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 3 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: theme.colors.primary },
  tabLabel: { fontSize: 11, color: theme.colors.textTertiary },
  tabLabelActive: { color: theme.colors.primary, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary, marginTop: 4 },
  // Messages
  messageList: { flex: 1 },
  messageBubbleWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  bubbleLeft: { justifyContent: 'flex-start' },
  bubbleRight: { justifyContent: 'flex-end' },
  avatarCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.primary + '30', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '700', color: theme.colors.primary },
  bubble: { maxWidth: '75%', borderRadius: 16, padding: 12, gap: 4 },
  bubbleTenant: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderLight, borderBottomLeftRadius: 4 },
  bubbleLandlord: { backgroundColor: theme.colors.primary, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 14, color: theme.colors.textPrimary, lineHeight: 20 },
  bubbleTime: { fontSize: 10, color: theme.colors.textTertiary, alignSelf: 'flex-end' },
  messageInputRow: { flexDirection: 'row', gap: 10, padding: theme.spacing.md, backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.borderLight, alignItems: 'flex-end' },
  messageInput: { flex: 1, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: theme.colors.textPrimary, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  // Maintenance
  newRequestBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, borderWidth: 1.5, borderColor: theme.colors.primary + '40', borderStyle: 'dashed' },
  newRequestText: { fontSize: 15, fontWeight: '600', color: theme.colors.primary },
  maintenanceCard: { marginBottom: 0 },
  maintenanceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  priorityDot: { width: 10, height: 10, borderRadius: 5 },
  maintenanceTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  maintenanceMeta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },
  // Payments
  payNowCard: { borderWidth: 1.5, borderColor: theme.colors.primary + '40' },
  payNowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: theme.spacing.md },
  payNowLabel: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 4 },
  payNowAmount: { fontSize: 28, fontWeight: '800', color: theme.colors.textPrimary, letterSpacing: -1 },
  payNowDue: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 14 },
  payBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  paymentCard: { marginBottom: 0 },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  paymentIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  paymentMonth: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  paymentMethod: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
  paymentAmount: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  // Documents
  releve31Banner: { borderWidth: 1.5, borderColor: '#8B5CF6' + '40', backgroundColor: '#8B5CF6' + '08' },
  releve31Row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  releve31Title: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary },
  releve31Sub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  downloadBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#8B5CF6' + '20', alignItems: 'center', justifyContent: 'center' },
  docCard: { marginBottom: 0 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  docIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  docName: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  docDate: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.borderRadius.xl, borderTopRightRadius: theme.borderRadius.xl, padding: theme.spacing.lg, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  modalTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary },
  formGroup: { marginBottom: theme.spacing.md },
  label: { fontSize: 14, fontWeight: '500', color: theme.colors.textPrimary, marginBottom: 8 },
  input: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: theme.colors.textPrimary },
  photoBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, borderStyle: 'dashed', padding: theme.spacing.md, marginBottom: theme.spacing.md },
  photoBtnText: { fontSize: 14, fontWeight: '500', color: theme.colors.primary },
  submitBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 14, alignItems: 'center', marginBottom: theme.spacing.lg },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  // Stripe payment styles
  payAmountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.md, paddingHorizontal: 16, paddingVertical: 12, marginBottom: theme.spacing.md },
  payAmountLabel: { fontSize: 14, color: theme.colors.textSecondary },
  payAmountValue: { fontSize: 20, fontWeight: '800', color: theme.colors.primary },
  stripeBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: theme.spacing.md },
  stripeBadgeText: { fontSize: 11, color: theme.colors.textTertiary },
  stripeBadgeBrand: { fontSize: 13, fontWeight: '800', color: '#635BFF', letterSpacing: -0.5 },
  cardPreview: { backgroundColor: theme.colors.primary, borderRadius: 16, padding: 20, marginBottom: theme.spacing.lg, height: 140, justifyContent: 'space-between' },
  cardChip: { alignSelf: 'flex-start' },
  cardPreviewNumber: { fontSize: 17, fontWeight: '600', color: '#fff', letterSpacing: 3, textAlign: 'center' },
  cardPreviewBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  cardPreviewName: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600', letterSpacing: 1 },
  cardPreviewExpiry: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardBrandIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.background },
  cardFieldRow: { flexDirection: 'row', gap: 12 },
  processingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  paySuccessView: { alignItems: 'center', paddingVertical: theme.spacing.xl, gap: theme.spacing.sm },
  paySuccessIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: theme.colors.success + '15', alignItems: 'center', justifyContent: 'center' },
  paySuccessTitle: { fontSize: 24, fontWeight: '800', color: theme.colors.textPrimary, marginTop: theme.spacing.sm },
  paySuccessAmount: { fontSize: 32, fontWeight: '800', color: theme.colors.success },
  paySuccessSub: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', paddingHorizontal: theme.spacing.lg, lineHeight: 20 },
  stripeTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginVertical: theme.spacing.sm },
  stripeTagText: { fontSize: 12, color: theme.colors.textTertiary },
  stripeTagBrand: { fontSize: 14, fontWeight: '800', color: '#635BFF', letterSpacing: -0.5 },
});
