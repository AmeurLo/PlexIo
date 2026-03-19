import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, theme } from '../../src/components';
import { api } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { Reminder, LeaseWithDetails, DashboardStats } from '../../src/types';
import { formatDate, formatCurrency } from '../../src/utils/format';
import { useTranslation } from '../../src/i18n/useTranslation';

export default function MoreScreen() {
  const { user, logout, updateUser } = useAuthStore();
  const { t, lang, setLang } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [leases, setLeases] = useState<LeaseWithDetails[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [seeding, setSeeding] = useState(false);

  // ── Edit Profile modal ────────────────────────────────────────────────────
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const openEditProfile = () => {
    setEditName(user?.full_name ?? '');
    setEditEmail(user?.email ?? '');
    setEditProfileVisible(true);
  };

  const handleSaveProfile = async () => {
    const trimmedName = editName.trim();
    const trimmedEmail = editEmail.trim().toLowerCase();
    if (!trimmedName) {
      Alert.alert('Nom requis', 'Veuillez entrer votre nom.');
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      Alert.alert('Courriel invalide', 'Veuillez entrer un courriel valide.');
      return;
    }
    setSavingProfile(true);
    try {
      const updated = await api.updateProfile({ full_name: trimmedName, email: trimmedEmail });
      await updateUser(updated);
      setEditProfileVisible(false);
      Alert.alert('Profil mis à jour', 'Vos informations ont été enregistrées.');
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? 'Une erreur est survenue.';
      Alert.alert('Erreur', msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const loadData = async () => {
    try {
      const [remindersData, leasesData, statsData] = await Promise.all([
        api.getReminders(),
        api.getLeases(),
        api.getDashboard(),
      ]);
      setReminders(remindersData);
      setLeases(leasesData.filter((l: LeaseWithDetails) => l.days_until_expiry <= 60 && l.days_until_expiry >= 0));
      setStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleCompleteReminder = async (id: string) => {
    try {
      await api.completeReminder(id);
      loadData();
    } catch (error) {
      console.error('Error completing reminder:', error);
    }
  };

  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      const result = await api.seedDemoData();
      // Auto-set a clean demo name if the account looks like a test account
      if (user) {
        const lowerName = (user.full_name ?? '').toLowerCase().trim();
        const looksGeneric = !lowerName || lowerName.includes('test') || lowerName === 'user' || lowerName === 'admin' || lowerName.length < 3;
        if (looksGeneric) {
          await updateUser({ ...user, full_name: 'Michael Smith' });
        }
      }
      Alert.alert('Données démo', result.seeded ? 'Données de démonstration chargées avec succès!' : 'Les données existent déjà.', [{ text: 'OK', onPress: loadData }]);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les données démo. Vérifiez la connexion au serveur.');
    } finally {
      setSeeding(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('signOut') as string,
      t('signOutConfirm') as string,
      [
        { text: t('cancel') as string, style: 'cancel' },
        {
          text: t('signOut') as string,
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('more') as string}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Text style={styles.avatarInitials}>
                  {(user?.full_name ?? 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <TouchableOpacity style={styles.editProfileBtn} onPress={openEditProfile}>
                <Ionicons name="pencil-outline" size={13} color="#FFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.full_name}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>
          </View>
        </Card>

        {/* ── Edit Profile Modal ────────────────────────────────────── */}
        <Modal visible={editProfileVisible} animationType="slide" transparent presentationStyle="overFullScreen">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Modifier le profil</Text>
                <TouchableOpacity onPress={() => setEditProfileVisible(false)}>
                  <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Avatar preview */}
              <View style={styles.modalAvatar}>
                <Text style={styles.modalAvatarText}>
                  {(editName || user?.full_name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </Text>
              </View>

              {/* Name field */}
              <Text style={styles.fieldLabel}>Nom complet</Text>
              <View style={styles.inputRow}>
                <Ionicons name="person-outline" size={18} color={theme.colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Votre nom"
                  placeholderTextColor={theme.colors.textTertiary}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>

              {/* Email field */}
              <Text style={[styles.fieldLabel, { marginTop: theme.spacing.md }]}>Adresse courriel</Text>
              <View style={styles.inputRow}>
                <Ionicons name="mail-outline" size={18} color={theme.colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="votre@email.com"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Save button */}
              <TouchableOpacity
                style={[styles.saveBtn, savingProfile && { opacity: 0.6 }]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#FFF" />
                    <Text style={styles.saveBtnText}>Enregistrer</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Quick tools */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Outils</Text>
          {/* Row 1 */}
          <View style={styles.toolsGrid}>
            <TouchableOpacity style={styles.toolCard} onPress={() => router.push('/maintenance')}>
              <View style={[styles.toolIcon, { backgroundColor: '#F59E0B18' }]}>
                <Ionicons name="construct-outline" size={22} color="#F59E0B" />
              </View>
              <Text style={styles.toolLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>Entretien</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolCard} onPress={() => router.push('/documents')}>
              <View style={[styles.toolIcon, { backgroundColor: theme.colors.primary + '18' }]}>
                <Ionicons name="document-text-outline" size={22} color={theme.colors.primary} />
              </View>
              <Text style={styles.toolLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>Documents & Avis</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolCard} onPress={() => router.push('/vacancy')}>
              <View style={[styles.toolIcon, { backgroundColor: '#8B5CF618' }]}>
                <Ionicons name="megaphone-outline" size={22} color="#8B5CF6" />
              </View>
              <Text style={styles.toolLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>Mes annonces</Text>
            </TouchableOpacity>
          </View>

          {/* Row 2 */}
          <View style={[styles.toolsGrid, { marginTop: theme.spacing.sm }]}>
            <TouchableOpacity style={styles.toolCard} onPress={() => router.push('/contractors')}>
              <View style={[styles.toolIcon, { backgroundColor: '#EC489918' }]}>
                <Ionicons name="hammer-outline" size={22} color="#EC4899" />
              </View>
              <Text style={styles.toolLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>Entrepreneurs</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolCard} onPress={() => router.push('/inspections')}>
              <View style={[styles.toolIcon, { backgroundColor: '#10B98118' }]}>
                <Ionicons name="clipboard-outline" size={22} color="#10B981" />
              </View>
              <Text style={styles.toolLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>Inspections</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolCard} onPress={() => router.push('/market-rent')}>
              <View style={[styles.toolIcon, { backgroundColor: '#6366F118' }]}>
                <Ionicons name="trending-up-outline" size={22} color="#6366F1" />
              </View>
              <Text style={styles.toolLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>Intelligence marché</Text>
            </TouchableOpacity>
          </View>

          {/* Row 3 */}
          <View style={[styles.toolsGrid, { marginTop: theme.spacing.sm }]}>
            <TouchableOpacity style={styles.toolCard} onPress={() => router.push('/team')}>
              <View style={[styles.toolIcon, { backgroundColor: '#14B8A618' }]}>
                <Ionicons name="people-outline" size={22} color="#14B8A6" />
              </View>
              <Text style={styles.toolLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>Mon équipe</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolCard} onPress={() => router.push('/(auth)/tenant-login')}>
              <View style={[styles.toolIcon, { backgroundColor: '#14B8A618' }]}>
                <Ionicons name="person-circle-outline" size={22} color="#14B8A6" />
              </View>
              <Text style={styles.toolLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>Portail locataire</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolCard} onPress={() => router.push('/automations')}>
              <View style={[styles.toolIcon, { backgroundColor: '#6366F118' }]}>
                <Ionicons name="flash-outline" size={22} color="#6366F1" />
              </View>
              <Text style={styles.toolLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>Automatisations</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Finances ─────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Finances</Text>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <TouchableOpacity style={styles.finShortcutCard} onPress={() => router.push('/mortgage')}>
              <View style={styles.finShortcutLeft}>
                <View style={[styles.finShortcutIcon, { backgroundColor: '#3B82F618' }]}>
                  <Ionicons name="home-outline" size={20} color="#3B82F6" />
                </View>
                <View>
                  <Text style={styles.finShortcutTitle}>Hypothèques</Text>
                  <Text style={styles.finShortcutSub}>Gérer vos prêts immobiliers</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          </Card>
        </View>

        {/* Expiring Leases */}
        {leases.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('expiringLeases60') as string}</Text>
            {leases.map((lease) => (
              <Card key={lease.id} style={styles.leaseCard}>
                <View style={styles.leaseHeader}>
                  <View>
                    <Text style={styles.leaseTenant}>{lease.tenant_name}</Text>
                    <Text style={styles.leaseProperty}>{lease.property_name} - {t('unit') as string} {lease.unit_number}</Text>
                  </View>
                  <View style={styles.leaseExpiry}>
                    <Text style={[styles.leaseExpiryDays, lease.days_until_expiry <= 30 && styles.urgentText]}>{lease.days_until_expiry}</Text>
                    <Text style={styles.leaseExpiryLabel}>{t('days') as string}</Text>
                  </View>
                </View>
                <View style={styles.leaseDates}>
                  <Text style={styles.leaseDateText}>{t('endsLabel') as string} {formatDate(lease.end_date)}</Text>
                  <Text style={styles.leaseRent}>{formatCurrency(lease.rent_amount)}/mo</Text>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Reminders */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('reminders') as string}</Text>
          {reminders.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
              <Text style={styles.emptyText}>{t('noPendingReminders') as string}</Text>
            </Card>
          ) : (
            reminders.map((reminder) => (
              <Card key={reminder.id} style={styles.reminderCard}>
                <TouchableOpacity style={styles.reminderCheckbox} onPress={() => handleCompleteReminder(reminder.id)}>
                  <View style={styles.checkbox}>
                    <Ionicons name="checkmark" size={14} color="transparent" />
                  </View>
                </TouchableOpacity>
                <View style={styles.reminderContent}>
                  <Text style={styles.reminderTitle}>{reminder.title}</Text>
                  {reminder.description && (
                    <Text style={styles.reminderDescription} numberOfLines={2}>{reminder.description}</Text>
                  )}
                  <Text style={styles.reminderDate}>{formatDate(reminder.due_date)}</Text>
                </View>
              </Card>
            ))
          )}
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings') as string}</Text>
          <Card style={styles.menuCard}>
            {/* Language toggle */}
            <View style={styles.menuItem}>
              <View style={styles.menuIcon}>
                <Ionicons name="globe-outline" size={20} color={theme.colors.textSecondary} />
              </View>
              <Text style={styles.menuText}>{t('language') as string}</Text>
              <View style={styles.langToggle}>
                <TouchableOpacity
                  style={[styles.langBtn, lang === 'fr' && styles.langBtnActive]}
                  onPress={() => setLang('fr')}
                >
                  <Text style={[styles.langBtnText, lang === 'fr' && styles.langBtnTextActive]}>FR</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.langBtn, lang === 'en' && styles.langBtnActive]}
                  onPress={() => setLang('en')}
                >
                  <Text style={[styles.langBtnText, lang === 'en' && styles.langBtnTextActive]}>EN</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuIcon}>
                <Ionicons name="notifications-outline" size={20} color={theme.colors.textSecondary} />
              </View>
              <Text style={styles.menuText}>{t('notifications') as string}</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuIcon}>
                <Ionicons name="document-text-outline" size={20} color={theme.colors.textSecondary} />
              </View>
              <Text style={styles.menuText}>{t('exportReports') as string}</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuIcon}>
                <Ionicons name="help-circle-outline" size={20} color={theme.colors.textSecondary} />
              </View>
              <Text style={styles.menuText}>{t('helpSupport') as string}</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          </Card>
        </View>

        {/* Seed Demo Data */}
        <TouchableOpacity style={styles.seedBtn} onPress={handleSeedDemo} disabled={seeding}>
          {seeding ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Ionicons name="flask-outline" size={20} color={theme.colors.primary} />
          )}
          <Text style={styles.seedBtnText}>{seeding ? 'Chargement…' : 'Charger les données démo'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
          <Text style={styles.signOutText}>{t('signOut') as string}</Text>
        </TouchableOpacity>

        <Text style={styles.version}>{t('version') as string}</Text>
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight, backgroundColor: theme.colors.surface },
  title: { fontSize: 24, fontWeight: '700', color: theme.colors.textPrimary },
  scrollContent: { padding: theme.spacing.md },
  profileCard: { marginBottom: theme.spacing.lg },
  profileHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarWrap: { position: 'relative', marginRight: theme.spacing.md },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 22, fontWeight: '800', color: '#FFF', letterSpacing: 1 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '600', color: theme.colors.textPrimary },
  profileEmail: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 },
  section: { marginBottom: theme.spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: theme.spacing.sm },
  finShortcutCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing.md },
  finShortcutLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  finShortcutIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  finShortcutTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  finShortcutSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  leaseCard: { marginBottom: theme.spacing.sm },
  leaseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  leaseTenant: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  leaseProperty: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  leaseExpiry: { alignItems: 'center', backgroundColor: theme.colors.warningLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: theme.borderRadius.md },
  leaseExpiryDays: { fontSize: 18, fontWeight: '700', color: theme.colors.warning },
  urgentText: { color: theme.colors.error },
  leaseExpiryLabel: { fontSize: 10, color: theme.colors.textSecondary },
  leaseDates: { flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing.sm, paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.borderLight },
  leaseDateText: { fontSize: 13, color: theme.colors.textSecondary },
  leaseRent: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  emptyCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.lg },
  emptyText: { fontSize: 14, color: theme.colors.textSecondary },
  reminderCard: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: theme.spacing.sm },
  reminderCheckbox: { padding: 4, marginRight: theme.spacing.sm },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  reminderContent: { flex: 1 },
  reminderTitle: { fontSize: 14, fontWeight: '500', color: theme.colors.textPrimary },
  reminderDescription: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  reminderDate: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 4 },
  menuCard: { padding: 0, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md },
  menuIcon: { width: 32, alignItems: 'center' },
  menuText: { flex: 1, fontSize: 15, color: theme.colors.textPrimary, marginLeft: theme.spacing.sm },
  menuDivider: { height: 1, backgroundColor: theme.colors.borderLight, marginLeft: 56 },
  // Language toggle
  langToggle: { flexDirection: 'row', gap: 4 },
  langBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: theme.borderRadius.full, backgroundColor: theme.colors.borderLight },
  langBtnActive: { backgroundColor: theme.colors.primary },
  langBtnText: { fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary },
  langBtnTextActive: { color: '#FFFFFF' },
  toolsGrid: { flexDirection: 'row', gap: theme.spacing.sm },
  toolCard: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.borderLight, alignItems: 'center', gap: 8 },
  toolIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  toolLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.textPrimary, textAlign: 'center' },
  seedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.sm, gap: theme.spacing.sm, marginBottom: theme.spacing.xs },
  seedBtnText: { fontSize: 14, fontWeight: '500', color: theme.colors.primary },
  signOutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.md, gap: theme.spacing.sm },
  signOutText: { fontSize: 15, fontWeight: '600', color: theme.colors.error },
  version: { fontSize: 12, color: theme.colors.textTertiary, textAlign: 'center', marginTop: theme.spacing.md },
  bottomSpacing: { height: theme.spacing.xxl },

  // Edit Profile
  editProfileBtn: { position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: theme.colors.surface },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: theme.spacing.lg, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  modalTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
  modalAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: theme.spacing.lg },
  modalAvatarText: { fontSize: 28, fontWeight: '800', color: '#FFF', letterSpacing: 1 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.background, marginBottom: 4 },
  inputIcon: { paddingHorizontal: 12 },
  textInput: { flex: 1, height: 48, fontSize: 15, color: theme.colors.textPrimary },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary, paddingVertical: 15, borderRadius: theme.borderRadius.md, marginTop: theme.spacing.xl },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
