import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, theme } from '../src/components';
import { api } from '../src/services/api';

// ─── Types ─────────────────────────────────────────────────────────────────

type Role = 'co_owner' | 'manager' | 'read_only';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'active' | 'pending' | 'declined';
  added_date: string;
  last_active?: string;
  properties: string[];
  can_view_finances: boolean;
  can_edit_tenants: boolean;
  can_manage_maintenance: boolean;
}

// ─── Configs ─────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<Role, { label: string; color: string; bg: string; icon: string; description: string }> = {
  co_owner: {
    label: 'Co-propriétaire',
    color: theme.colors.primary,
    bg: theme.colors.primaryLight,
    icon: 'star-outline',
    description: 'Accès complet — finances, locataires, entretien',
  },
  manager: {
    label: 'Gestionnaire',
    color: '#8B5CF6',
    bg: '#8B5CF615',
    icon: 'briefcase-outline',
    description: 'Gère locataires et entretien (sans finances)',
  },
  read_only: {
    label: 'Lecture seule',
    color: '#6B7D93',
    bg: '#F0F3F7',
    icon: 'eye-outline',
    description: 'Consulte uniquement sans modifier',
  },
};

const STATUS_CONFIG: Record<TeamMember['status'], { label: string; color: string; bg: string }> = {
  active:   { label: 'Actif',      color: theme.colors.success, bg: '#E6F9F4' },
  pending:  { label: 'En attente', color: theme.colors.warning, bg: '#FFF6E6' },
  declined: { label: 'Refusé',     color: theme.colors.error,   bg: '#FDE8E8' },
};

interface InviteForm {
  name: string;
  email: string;
  role: Role;
  properties: string[];
  can_view_finances: boolean;
  can_edit_tenants: boolean;
  can_manage_maintenance: boolean;
}

const BLANK_FORM: InviteForm = {
  name: '',
  email: '',
  role: 'manager',
  properties: [],
  can_view_finances: false,
  can_edit_tenants: true,
  can_manage_maintenance: true,
};

// ─── Permission Row ───────────────────────────────────────────────────────────

function PermissionRow({ icon, label, value, onChange }: { icon: string; label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.permRow}>
      <View style={styles.permLeft}>
        <Ionicons name={icon as any} size={16} color={value ? theme.colors.primary : theme.colors.textTertiary} />
        <Text style={styles.permLabel}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: theme.colors.borderLight, true: theme.colors.primary + '60' }}
        thumbColor={value ? theme.colors.primary : '#FFF'}
        ios_backgroundColor={theme.colors.borderLight}
      />
    </View>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TeamScreen() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [propertyNames, setPropertyNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [inviteForm, setInviteForm] = useState<InviteForm>(BLANK_FORM);

  useFocusEffect(useCallback(() => {
    loadAll();
  }, []));

  const loadAll = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [teamData, propsData] = await Promise.all([
        api.getTeam(),
        api.getProperties(),
      ]);
      setTeam(teamData as TeamMember[]);
      setPropertyNames((propsData as any[]).map((p: any) => p.name));
    } catch {
      Alert.alert('Erreur', 'Impossible de charger l\'équipe.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateFormRole = (role: Role) => {
    setInviteForm(prev => ({
      ...prev,
      role,
      can_view_finances: role === 'co_owner',
      can_edit_tenants: role !== 'read_only',
      can_manage_maintenance: role !== 'read_only',
    }));
  };

  const toggleProperty = (prop: string) => {
    setInviteForm(prev => ({
      ...prev,
      properties: prev.properties.includes(prop)
        ? prev.properties.filter(p => p !== prop)
        : [...prev.properties, prop],
    }));
  };

  const sendInvite = async () => {
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
      Alert.alert('Champs requis', 'Le prénom/nom et l\'email sont obligatoires.');
      return;
    }
    if (!inviteForm.email.includes('@')) {
      Alert.alert('Email invalide', 'Entrez une adresse email valide.');
      return;
    }
    if (inviteForm.properties.length === 0) {
      Alert.alert('Immeubles requis', 'Sélectionnez au moins un immeuble.');
      return;
    }

    setSaving(true);
    try {
      const created = await api.addTeamMember({
        name: inviteForm.name,
        email: inviteForm.email,
        role: inviteForm.role,
        properties: inviteForm.properties,
        can_view_finances: inviteForm.can_view_finances,
        can_edit_tenants: inviteForm.can_edit_tenants,
        can_manage_maintenance: inviteForm.can_manage_maintenance,
      });
      setTeam(prev => [...prev, created as TeamMember]);
      setShowInviteModal(false);
      Alert.alert('Invitation envoyée', `${inviteForm.name} recevra un courriel pour rejoindre Domely.`);
    } catch {
      Alert.alert('Erreur', 'Impossible d\'envoyer l\'invitation.');
    } finally {
      setSaving(false);
    }
  };

  const removeMember = (member: TeamMember) => {
    Alert.alert(
      'Retirer le membre',
      `Retirer ${member.name} de votre équipe ? Ils perdront tout accès.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteTeamMember(member.id);
              setTeam(prev => prev.filter(m => m.id !== member.id));
              setShowDetailModal(false);
            } catch {
              Alert.alert('Erreur', 'Impossible de retirer ce membre.');
            }
          },
        },
      ]
    );
  };

  const resendInvite = (member: TeamMember) => {
    Alert.alert('Invitation renvoyée', `L'invitation a été renvoyée à ${member.email}.`);
  };

  const activeMembers = team.filter(m => m.status === 'active');
  const pendingMembers = team.filter(m => m.status === 'pending');

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Mon équipe</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Mon équipe</Text>
          <Text style={styles.headerSub}>{team.length} membre{team.length > 1 ? 's' : ''} · {pendingMembers.length} en attente</Text>
        </View>
        <TouchableOpacity style={styles.inviteBtn} onPress={() => {
          setInviteForm(BLANK_FORM);
          setShowInviteModal(true);
        }}>
          <Ionicons name="person-add-outline" size={18} color="#FFF" />
          <Text style={styles.inviteBtnText}>Inviter</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor={theme.colors.primary} />}
      >

        {/* Role Info Cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleCardsRow} contentContainerStyle={styles.roleCardsContent}>
          {(Object.keys(ROLE_CONFIG) as Role[]).map(role => {
            const cfg = ROLE_CONFIG[role];
            return (
              <View key={role} style={[styles.roleCard, { borderTopColor: cfg.color }]}>
                <View style={[styles.roleIconWrap, { backgroundColor: cfg.bg }]}>
                  <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
                </View>
                <Text style={[styles.roleCardTitle, { color: cfg.color }]}>{cfg.label}</Text>
                <Text style={styles.roleCardDesc}>{cfg.description}</Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Active Members */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Membres actifs ({activeMembers.length})</Text>
          {activeMembers.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>Aucun membre actif</Text>
            </Card>
          ) : (
            activeMembers.map(member => (
              <TouchableOpacity
                key={member.id}
                onPress={() => { setSelectedMember(member); setShowDetailModal(true); }}
                activeOpacity={0.85}
              >
                <Card style={styles.memberCard}>
                  <View style={styles.memberHeader}>
                    <View style={[styles.avatar, { backgroundColor: ROLE_CONFIG[member.role].bg }]}>
                      <Text style={[styles.avatarText, { color: ROLE_CONFIG[member.role].color }]}>
                        {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      <Text style={styles.memberEmail}>{member.email}</Text>
                    </View>
                    <View style={[styles.roleBadge, { backgroundColor: ROLE_CONFIG[member.role].bg }]}>
                      <Text style={[styles.roleBadgeText, { color: ROLE_CONFIG[member.role].color }]}>
                        {ROLE_CONFIG[member.role].label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.memberMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="business-outline" size={12} color={theme.colors.textTertiary} />
                      <Text style={styles.metaText}>{member.properties.join(', ')}</Text>
                    </View>
                    {member.last_active && (
                      <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={12} color={theme.colors.textTertiary} />
                        <Text style={styles.metaText}>Actif: {member.last_active}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.permPillRow}>
                    {member.can_view_finances && <View style={[styles.permPill, { backgroundColor: '#E6F9F4' }]}><Text style={[styles.permPillText, { color: theme.colors.success }]}>Finances</Text></View>}
                    {member.can_edit_tenants && <View style={[styles.permPill, { backgroundColor: theme.colors.primaryLight }]}><Text style={[styles.permPillText, { color: theme.colors.primary }]}>Locataires</Text></View>}
                    {member.can_manage_maintenance && <View style={[styles.permPill, { backgroundColor: '#FFF6E6' }]}><Text style={[styles.permPillText, { color: theme.colors.warning }]}>Entretien</Text></View>}
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Pending Invites */}
        {pendingMembers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Invitations en attente ({pendingMembers.length})</Text>
            {pendingMembers.map(member => (
              <Card key={member.id} style={styles.pendingCard}>
                <View style={styles.pendingHeader}>
                  <View style={styles.pendingLeft}>
                    <View style={[styles.avatar, { backgroundColor: '#FFF6E6' }]}>
                      <Ionicons name="mail-outline" size={18} color={theme.colors.warning} />
                    </View>
                    <View>
                      <Text style={styles.memberName}>{member.name}</Text>
                      <Text style={styles.memberEmail}>{member.email}</Text>
                      <View style={[styles.roleBadge, { backgroundColor: ROLE_CONFIG[member.role].bg, alignSelf: 'flex-start', marginTop: 4 }]}>
                        <Text style={[styles.roleBadgeText, { color: ROLE_CONFIG[member.role].color }]}>
                          {ROLE_CONFIG[member.role].label}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG.pending.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: STATUS_CONFIG.pending.color }]}>
                      {STATUS_CONFIG.pending.label}
                    </Text>
                  </View>
                </View>
                <View style={styles.pendingActions}>
                  <TouchableOpacity style={styles.resendBtn} onPress={() => resendInvite(member)}>
                    <Ionicons name="send-outline" size={14} color={theme.colors.primary} />
                    <Text style={styles.resendBtnText}>Renvoyer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => removeMember(member)}>
                    <Ionicons name="close-outline" size={14} color={theme.colors.error} />
                    <Text style={styles.cancelBtnText}>Annuler</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Info box */}
        <Card style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.infoTitle}>Accès locataire</Text>
          </View>
          <Text style={styles.infoText}>
            Les locataires ont leur propre portail séparé accessible via un lien unique envoyé par courriel. Ils ne font pas partie de votre équipe de gestion.
          </Text>
        </Card>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Invite Modal */}
      <Modal visible={showInviteModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <Text style={styles.modalCancel}>Annuler</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Inviter un membre</Text>
              <TouchableOpacity onPress={sendInvite} disabled={saving}>
                {saving
                  ? <ActivityIndicator size="small" color={theme.colors.primary} />
                  : <Text style={styles.modalSave}>Envoyer</Text>
                }
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Prénom et nom *</Text>
                <TextInput
                  style={styles.formInput}
                  value={inviteForm.name}
                  onChangeText={v => setInviteForm(prev => ({ ...prev, name: v }))}
                  placeholder="Ex. Sophie Martin"
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Adresse courriel *</Text>
                <TextInput
                  style={styles.formInput}
                  value={inviteForm.email}
                  onChangeText={v => setInviteForm(prev => ({ ...prev, email: v }))}
                  placeholder="Ex. sophie@example.com"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Role */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Rôle *</Text>
                <View style={styles.roleSelectGrid}>
                  {(Object.keys(ROLE_CONFIG) as Role[]).map(role => {
                    const cfg = ROLE_CONFIG[role];
                    const isSelected = inviteForm.role === role;
                    return (
                      <TouchableOpacity
                        key={role}
                        style={[styles.roleSelectCard, isSelected && { borderColor: cfg.color, backgroundColor: cfg.bg }]}
                        onPress={() => updateFormRole(role)}
                      >
                        <Ionicons name={cfg.icon as any} size={18} color={isSelected ? cfg.color : theme.colors.textTertiary} />
                        <Text style={[styles.roleSelectLabel, isSelected && { color: cfg.color }]}>{cfg.label}</Text>
                        <Text style={styles.roleSelectDesc} numberOfLines={2}>{cfg.description}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Properties */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Immeubles accessibles *</Text>
                {propertyNames.length === 0 ? (
                  <Text style={styles.emptyText}>Aucun immeuble disponible</Text>
                ) : (
                  <View style={styles.propChips}>
                    {propertyNames.map(prop => {
                      const isSelected = inviteForm.properties.includes(prop);
                      return (
                        <TouchableOpacity
                          key={prop}
                          style={[styles.propChip, isSelected && styles.propChipActive]}
                          onPress={() => toggleProperty(prop)}
                        >
                          <Ionicons name={isSelected ? 'checkmark-circle' : 'ellipse-outline'} size={15} color={isSelected ? '#FFF' : theme.colors.textSecondary} />
                          <Text style={[styles.propChipText, isSelected && styles.propChipTextActive]}>{prop}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Permissions */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Permissions</Text>
                <Card style={styles.permsCard}>
                  <PermissionRow
                    icon="bar-chart-outline"
                    label="Voir les finances"
                    value={inviteForm.can_view_finances}
                    onChange={v => setInviteForm(prev => ({ ...prev, can_view_finances: v }))}
                  />
                  <View style={styles.permDivider} />
                  <PermissionRow
                    icon="people-outline"
                    label="Gérer les locataires"
                    value={inviteForm.can_edit_tenants}
                    onChange={v => setInviteForm(prev => ({ ...prev, can_edit_tenants: v }))}
                  />
                  <View style={styles.permDivider} />
                  <PermissionRow
                    icon="construct-outline"
                    label="Gérer l'entretien"
                    value={inviteForm.can_manage_maintenance}
                    onChange={v => setInviteForm(prev => ({ ...prev, can_manage_maintenance: v }))}
                  />
                </Card>
              </View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Member Detail Modal */}
      {selectedMember && (
        <Modal visible={showDetailModal} animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Text style={styles.modalCancel}>Fermer</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Détails du membre</Text>
              <TouchableOpacity onPress={() => removeMember(selectedMember)}>
                <Text style={[styles.modalSave, { color: theme.colors.error }]}>Retirer</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <View style={styles.detailProfile}>
                <View style={[styles.detailAvatar, { backgroundColor: ROLE_CONFIG[selectedMember.role].bg }]}>
                  <Text style={[styles.detailAvatarText, { color: ROLE_CONFIG[selectedMember.role].color }]}>
                    {selectedMember.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.detailName}>{selectedMember.name}</Text>
                <Text style={styles.detailEmail}>{selectedMember.email}</Text>
                <View style={[styles.roleBadge, { backgroundColor: ROLE_CONFIG[selectedMember.role].bg, alignSelf: 'center', marginTop: 8 }]}>
                  <Text style={[styles.roleBadgeText, { color: ROLE_CONFIG[selectedMember.role].color }]}>
                    {ROLE_CONFIG[selectedMember.role].label}
                  </Text>
                </View>
              </View>

              <Card style={styles.detailStatsCard}>
                <View style={styles.detailStat}>
                  <Text style={styles.detailStatLabel}>Statut</Text>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG[selectedMember.status].bg }]}>
                    <Text style={[styles.statusBadgeText, { color: STATUS_CONFIG[selectedMember.status].color }]}>
                      {STATUS_CONFIG[selectedMember.status].label}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailStat}>
                  <Text style={styles.detailStatLabel}>Ajouté le</Text>
                  <Text style={styles.detailStatValue}>{selectedMember.added_date}</Text>
                </View>
                {selectedMember.last_active && (
                  <View style={styles.detailStat}>
                    <Text style={styles.detailStatLabel}>Dernière activité</Text>
                    <Text style={styles.detailStatValue}>{selectedMember.last_active}</Text>
                  </View>
                )}
              </Card>

              <Card style={{ marginBottom: theme.spacing.md }}>
                <Text style={styles.detailSectionTitle}>Immeubles accessibles</Text>
                {selectedMember.properties.map(prop => (
                  <View key={prop} style={styles.detailPropRow}>
                    <Ionicons name="business-outline" size={14} color={theme.colors.primary} />
                    <Text style={styles.detailPropText}>{prop}</Text>
                  </View>
                ))}
              </Card>

              <Card>
                <Text style={styles.detailSectionTitle}>Permissions</Text>
                {[
                  { icon: 'bar-chart-outline', label: 'Voir les finances', value: selectedMember.can_view_finances },
                  { icon: 'people-outline', label: 'Gérer les locataires', value: selectedMember.can_edit_tenants },
                  { icon: 'construct-outline', label: 'Gérer l\'entretien', value: selectedMember.can_manage_maintenance },
                ].map(perm => (
                  <View key={perm.label} style={styles.detailPermRow}>
                    <Ionicons name={perm.icon as any} size={15} color={perm.value ? theme.colors.success : theme.colors.textTertiary} />
                    <Text style={[styles.detailPermLabel, !perm.value && { color: theme.colors.textTertiary }]}>{perm.label}</Text>
                    <Ionicons
                      name={perm.value ? 'checkmark-circle' : 'close-circle'}
                      size={18}
                      color={perm.value ? theme.colors.success : theme.colors.textTertiary}
                    />
                  </View>
                ))}
              </Card>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
  headerSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primary, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  inviteBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  roleCardsRow: { marginBottom: theme.spacing.md, marginHorizontal: -theme.spacing.md },
  roleCardsContent: { paddingHorizontal: theme.spacing.md, gap: 10 },
  roleCard: { width: 160, backgroundColor: theme.colors.surface, borderRadius: 12, padding: 14, borderTopWidth: 3, borderWidth: 1, borderColor: theme.colors.borderLight },
  roleIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  roleCardTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  roleCardDesc: { fontSize: 11, color: theme.colors.textSecondary, lineHeight: 16 },

  scrollContent: { padding: theme.spacing.md },
  section: { marginBottom: theme.spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: theme.spacing.sm },

  memberCard: { marginBottom: theme.spacing.sm },
  memberHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: theme.spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  memberEmail: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  roleBadgeText: { fontSize: 11, fontWeight: '700' },

  memberMeta: { gap: 4, marginBottom: theme.spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: theme.colors.textTertiary },

  permPillRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  permPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  permPillText: { fontSize: 11, fontWeight: '600' },

  pendingCard: { marginBottom: theme.spacing.sm },
  pendingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: theme.spacing.sm },
  pendingLeft: { flexDirection: 'row', gap: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  pendingActions: { flexDirection: 'row', gap: 8 },
  resendBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  resendBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
  cancelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.error + '40', backgroundColor: '#FDE8E8' },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.error },

  infoCard: { backgroundColor: theme.colors.primaryLight, marginBottom: theme.spacing.md },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  infoTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.primary },
  infoText: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 18 },

  emptyCard: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { fontSize: 14, color: theme.colors.textSecondary },

  modalContainer: { flex: 1, backgroundColor: theme.colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  modalCancel: { fontSize: 15, color: theme.colors.textSecondary },
  modalTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  modalSave: { fontSize: 15, fontWeight: '700', color: theme.colors.primary },
  modalBody: { padding: theme.spacing.md },
  formGroup: { marginBottom: theme.spacing.md },
  formLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 6 },
  formInput: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, padding: theme.spacing.sm, fontSize: 15, color: theme.colors.textPrimary, backgroundColor: theme.colors.surface },

  roleSelectGrid: { gap: 8 },
  roleSelectCard: { padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  roleSelectLabel: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary, marginTop: 6, marginBottom: 2 },
  roleSelectDesc: { fontSize: 12, color: theme.colors.textSecondary },

  propChips: { gap: 8 },
  propChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  propChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  propChipText: { fontSize: 14, fontWeight: '500', color: theme.colors.textSecondary },
  propChipTextActive: { color: '#FFF' },

  permsCard: { padding: 0, overflow: 'hidden' },
  permRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.md, paddingVertical: 12 },
  permLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  permLabel: { fontSize: 14, color: theme.colors.textPrimary },
  permDivider: { height: 1, backgroundColor: theme.colors.borderLight, marginHorizontal: theme.spacing.md },

  detailProfile: { alignItems: 'center', marginBottom: theme.spacing.lg },
  detailAvatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  detailAvatarText: { fontSize: 26, fontWeight: '700' },
  detailName: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary },
  detailEmail: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 },
  detailStatsCard: { marginBottom: theme.spacing.md },
  detailStat: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  detailStatLabel: { fontSize: 13, color: theme.colors.textSecondary },
  detailStatValue: { fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary },
  detailSectionTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  detailPropRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  detailPropText: { fontSize: 14, color: theme.colors.textPrimary },
  detailPermRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  detailPermLabel: { flex: 1, fontSize: 14, color: theme.colors.textPrimary },
});
