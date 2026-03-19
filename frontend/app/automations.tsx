import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, theme } from '../src/components';
import { api } from '../src/services/api';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Automation {
  id: string;
  category: string;
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  hasDelay?: boolean;
  delayLabel?: string;
  delayMin?: number;
  delayMax?: number;
}

// ─── Automation Definitions ─────────────────────────────────────────────────

const AUTOMATIONS: Automation[] = [
  // ── Loyers & Paiements
  {
    id: 'rent_reminder',
    category: 'Loyers & Paiements',
    title: 'Rappel de loyer',
    description: "Envoyer un rappel au locataire avant la date d'échéance mensuelle",
    icon: 'notifications-outline',
    iconColor: '#3B82F6',
    hasDelay: true,
    delayLabel: 'jours avant la date',
    delayMin: 1, delayMax: 14,
  },
  {
    id: 'late_alert',
    category: 'Loyers & Paiements',
    title: 'Alerte retard de paiement',
    description: "Vous notifier et relancer le locataire en retard de paiement",
    icon: 'warning-outline',
    iconColor: '#F59E0B',
    hasDelay: true,
    delayLabel: 'jours après la date limite',
    delayMin: 1, delayMax: 30,
  },
  {
    id: 'payment_receipt',
    category: 'Loyers & Paiements',
    title: 'Reçu automatique',
    description: "Envoyer un reçu de paiement au locataire dès la confirmation",
    icon: 'receipt-outline',
    iconColor: '#10B981',
  },
  {
    id: 'e_transfer_reminder',
    category: 'Loyers & Paiements',
    title: 'Instructions de virement',
    description: "Rappeler les instructions Interac e-Transfer à chaque début de mois",
    icon: 'send-outline',
    iconColor: '#6366F1',
  },

  // ── Baux & Renouvellements
  {
    id: 'lease_renewal',
    category: 'Baux & Renouvellements',
    title: 'Avis de renouvellement',
    description: "Vous rappeler de préparer le renouvellement avant l'échéance du bail",
    icon: 'document-text-outline',
    iconColor: '#8B5CF6',
    hasDelay: true,
    delayLabel: 'jours avant la fin du bail',
    delayMin: 30, delayMax: 180,
  },
  {
    id: 'rent_increase',
    category: 'Baux & Renouvellements',
    title: 'Génération avis de hausse (TAL)',
    description: "Préparer automatiquement l'avis de hausse conforme au formulaire TAL",
    icon: 'trending-up-outline',
    iconColor: '#EC4899',
    hasDelay: true,
    delayLabel: "jours avant la date limite d'envoi",
    delayMin: 30, delayMax: 120,
  },
  {
    id: 'non_renewal',
    category: 'Baux & Renouvellements',
    title: 'Délai non-renouvellement (90j)',
    description: "Vous alerter du délai légal obligatoire de 90 jours pour un avis de non-renouvellement",
    icon: 'time-outline',
    iconColor: '#EF4444',
    hasDelay: true,
    delayLabel: "jours avant l'échéance",
    delayMin: 90, delayMax: 120,
  },
  {
    id: 'lease_signature',
    category: 'Baux & Renouvellements',
    title: 'Rappel signature de bail',
    description: "Relancer le locataire si un bail n'a pas été signé dans les délais",
    icon: 'create-outline',
    iconColor: '#F97316',
    hasDelay: true,
    delayLabel: 'jours sans signature',
    delayMin: 1, delayMax: 14,
  },

  // ── Entretien
  {
    id: 'maintenance_assign',
    category: 'Entretien',
    title: 'Assignation automatique',
    description: "Attribuer les nouveaux tickets à votre équipe selon la catégorie du problème",
    icon: 'construct-outline',
    iconColor: '#F97316',
  },
  {
    id: 'maintenance_followup',
    category: 'Entretien',
    title: "Suivi d'inactivité",
    description: "Relancer votre équipe si un ticket reste sans mise à jour",
    icon: 'alert-circle-outline',
    iconColor: '#EF4444',
    hasDelay: true,
    delayLabel: 'jours sans activité',
    delayMin: 1, delayMax: 30,
  },
  {
    id: 'maintenance_tenant',
    category: 'Entretien',
    title: 'Mise à jour locataire',
    description: "Tenir le locataire informé de l'avancement de son ticket d'entretien",
    icon: 'chatbubble-ellipses-outline',
    iconColor: '#3B82F6',
  },
  {
    id: 'maintenance_complete',
    category: 'Entretien',
    title: 'Confirmation de fermeture',
    description: "Demander la confirmation du locataire avant de clore un ticket",
    icon: 'checkmark-circle-outline',
    iconColor: '#10B981',
  },

  // ── Finances
  {
    id: 'mortgage_renewal',
    category: 'Finances',
    title: 'Renouvellement hypothèque',
    description: "Vous alerter avant l'échéance de vos prêts hypothécaires pour négocier à temps",
    icon: 'home-outline',
    iconColor: '#3B82F6',
    hasDelay: true,
    delayLabel: "jours avant l'échéance",
    delayMin: 60, delayMax: 365,
  },
  {
    id: 'insurance_renewal',
    category: 'Finances',
    title: 'Renouvellement assurance',
    description: "Rappel avant l'expiration de vos polices d'assurance",
    icon: 'shield-checkmark-outline',
    iconColor: '#10B981',
    hasDelay: true,
    delayLabel: "jours avant l'échéance",
    delayMin: 14, delayMax: 90,
  },
  {
    id: 'monthly_report',
    category: 'Finances',
    title: 'Rapport mensuel',
    description: "Recevoir un résumé financier chaque début de mois (loyers, retards, entretien)",
    icon: 'bar-chart-outline',
    iconColor: '#8B5CF6',
  },

  // ── Portail locataire
  {
    id: 'portal_welcome',
    category: 'Portail locataire',
    title: 'Accueil nouveau locataire',
    description: "Envoyer automatiquement les identifiants du portail dès la signature du bail",
    icon: 'person-add-outline',
    iconColor: '#8B5CF6',
  },
  {
    id: 'portal_document',
    category: 'Portail locataire',
    title: 'Notification de document',
    description: "Alerter le locataire lorsqu'un nouveau document est disponible sur son portail",
    icon: 'cloud-upload-outline',
    iconColor: '#6366F1',
  },
  {
    id: 'portal_maintenance_reply',
    category: 'Portail locataire',
    title: 'Réponse aux demandes',
    description: "Envoyer un accusé de réception lorsqu'un locataire soumet une demande d'entretien",
    icon: 'chatbubble-outline',
    iconColor: '#14B8A6',
  },
];

const DEFAULT_ENABLED: Record<string, boolean> = {
  rent_reminder: true,
  late_alert: true,
  payment_receipt: true,
  e_transfer_reminder: false,
  lease_renewal: true,
  rent_increase: false,
  non_renewal: true,
  lease_signature: true,
  maintenance_assign: false,
  maintenance_followup: true,
  maintenance_tenant: true,
  maintenance_complete: true,
  mortgage_renewal: true,
  insurance_renewal: true,
  monthly_report: false,
  portal_welcome: true,
  portal_document: true,
  portal_maintenance_reply: true,
};

const DEFAULT_DELAYS: Record<string, number> = {
  rent_reminder: 3,
  late_alert: 1,
  lease_renewal: 90,
  rent_increase: 90,
  non_renewal: 90,
  lease_signature: 5,
  maintenance_followup: 7,
  mortgage_renewal: 180,
  insurance_renewal: 30,
};

const CATEGORIES = [
  'Loyers & Paiements',
  'Baux & Renouvellements',
  'Entretien',
  'Finances',
  'Portail locataire',
];

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  'Loyers & Paiements':      { icon: 'cash-outline',          color: '#3B82F6' },
  'Baux & Renouvellements':  { icon: 'document-text-outline', color: '#8B5CF6' },
  'Entretien':               { icon: 'construct-outline',     color: '#F97316' },
  'Finances':                { icon: 'bar-chart-outline',     color: '#10B981' },
  'Portail locataire':       { icon: 'globe-outline',         color: '#14B8A6' },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function AutomationsScreen() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(DEFAULT_ENABLED);
  const [delays,  setDelays]  = useState<Record<string, number>>(DEFAULT_DELAYS);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalEnabled = Object.values(enabled).filter(Boolean).length;
  const totalAll = AUTOMATIONS.length;

  useFocusEffect(useCallback(() => {
    loadSettings();
  }, []));

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api.getAutomations();
      if (data.length > 0) {
        const nextEnabled = { ...DEFAULT_ENABLED };
        const nextDelays  = { ...DEFAULT_DELAYS };
        for (const s of data) {
          nextEnabled[s.automation_id] = s.is_enabled;
          if (s.delay_days != null) nextDelays[s.automation_id] = s.delay_days;
        }
        setEnabled(nextEnabled);
        setDelays(nextDelays);
      }
    } catch {
      // use defaults on error — no-op
    } finally {
      setLoading(false);
    }
  };

  const scheduleSave = (
    nextEnabled: Record<string, boolean>,
    nextDelays: Record<string, number>,
  ) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        const settings = AUTOMATIONS.map(a => ({
          automation_id: a.id,
          is_enabled: nextEnabled[a.id] ?? false,
          delay_days: nextDelays[a.id] ?? null,
        }));
        await api.saveAutomations(settings);
      } catch {
        // silently ignore — local state is authoritative until next load
      } finally {
        setSaving(false);
      }
    }, 600);
  };

  const toggleEnabled = (id: string, value: boolean) => {
    const next = { ...enabled, [id]: value };
    setEnabled(next);
    scheduleSave(next, delays);
  };

  const toggleAll = () => {
    const allOn = totalEnabled === totalAll;
    const next: Record<string, boolean> = {};
    AUTOMATIONS.forEach(a => { next[a.id] = !allOn; });
    setEnabled(next);
    scheduleSave(next, delays);
  };

  const adjustDelay = (id: string, delta: number, min = 1, max = 365) => {
    const next = {
      ...delays,
      [id]: Math.min(max, Math.max(min, (delays[id] ?? 1) + delta)),
    };
    setDelays(next);
    scheduleSave(enabled, next);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Automatisations</Text>
          <Text style={styles.headerSub}>Rappels et actions automatiques</Text>
        </View>
        <View style={[styles.backBtn, styles.savingIndicator]}>
          {saving && <ActivityIndicator size="small" color={theme.colors.primary} />}
        </View>
      </View>

      {/* Summary bar */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryPill}>
          <View style={[styles.dot, { backgroundColor: totalEnabled > 0 ? theme.colors.success : theme.colors.textTertiary }]} />
          <Text style={styles.summaryText}>{totalEnabled} / {totalAll} actives</Text>
        </View>
        <TouchableOpacity style={styles.toggleAllBtn} onPress={toggleAll}>
          <Text style={styles.toggleAllText}>
            {totalEnabled === totalAll ? 'Tout désactiver' : 'Tout activer'}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {CATEGORIES.map(category => {
            const items = AUTOMATIONS.filter(a => a.category === category);
            const activeCount = items.filter(a => enabled[a.id]).length;
            const meta = CATEGORY_META[category];

            return (
              <View key={category} style={styles.section}>
                {/* Category header */}
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderLeft}>
                    <View style={[styles.catDot, { backgroundColor: meta.color + '20' }]}>
                      <Ionicons name={meta.icon as any} size={14} color={meta.color} />
                    </View>
                    <Text style={styles.sectionTitle}>{category}</Text>
                  </View>
                  <View style={[styles.countBadge, { backgroundColor: activeCount > 0 ? theme.colors.primaryLight : theme.colors.background }]}>
                    <Text style={[styles.countText, { color: activeCount > 0 ? theme.colors.primary : theme.colors.textTertiary }]}>
                      {activeCount}/{items.length}
                    </Text>
                  </View>
                </View>

                {/* Items card */}
                <Card style={styles.itemsCard}>
                  {items.map((auto, idx) => {
                    const isOn  = enabled[auto.id] ?? false;
                    const delay = delays[auto.id] ?? 1;

                    return (
                      <View key={auto.id}>
                        <View style={[styles.autoRow, !isOn && styles.autoRowDisabled]}>
                          {/* Icon */}
                          <View style={[styles.autoIcon, { backgroundColor: auto.iconColor + '15' }]}>
                            <Ionicons name={auto.icon as any} size={20} color={isOn ? auto.iconColor : theme.colors.textTertiary} />
                          </View>

                          {/* Text + delay config */}
                          <View style={styles.autoBody}>
                            <Text style={[styles.autoTitle, !isOn && styles.autoTitleOff]}>
                              {auto.title}
                            </Text>
                            <Text style={styles.autoDesc} numberOfLines={2}>
                              {auto.description}
                            </Text>

                            {auto.hasDelay && isOn && (
                              <View style={styles.delayRow}>
                                <TouchableOpacity
                                  style={styles.delayBtn}
                                  onPress={() => adjustDelay(auto.id, -1, auto.delayMin, auto.delayMax)}
                                >
                                  <Ionicons name="remove" size={13} color={theme.colors.primary} />
                                </TouchableOpacity>
                                <Text style={styles.delayVal}>{delay} j</Text>
                                <TouchableOpacity
                                  style={styles.delayBtn}
                                  onPress={() => adjustDelay(auto.id, 1, auto.delayMin, auto.delayMax)}
                                >
                                  <Ionicons name="add" size={13} color={theme.colors.primary} />
                                </TouchableOpacity>
                                <Text style={styles.delayLabel} numberOfLines={1}>
                                  {auto.delayLabel}
                                </Text>
                              </View>
                            )}
                          </View>

                          {/* Toggle */}
                          <Switch
                            value={isOn}
                            onValueChange={v => toggleEnabled(auto.id, v)}
                            trackColor={{
                              false: theme.colors.borderLight,
                              true: auto.iconColor + '55',
                            }}
                            thumbColor={isOn ? auto.iconColor : '#E5E7EB'}
                            ios_backgroundColor={theme.colors.borderLight}
                          />
                        </View>

                        {idx < items.length - 1 && (
                          <View style={styles.separator} />
                        )}
                      </View>
                    );
                  })}
                </Card>
              </View>
            );
          })}

          {/* Info note */}
          <Card style={styles.noteCard}>
            <View style={styles.noteHeader}>
              <Ionicons name="information-circle-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.noteTitle}>Comment ça fonctionne</Text>
            </View>
            <Text style={styles.noteText}>
              Les automatisations déclenchent des courriels ou des notifications push selon vos données (baux, paiements, tickets). Les délais sont configurables par action.{'\n\n'}
              Les actions TAL (avis de hausse, non-renouvellement) génèrent un document à valider avant envoi — elles ne s'envoient jamais sans votre approbation.
            </Text>
          </Card>

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  savingIndicator: { opacity: 1 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
  headerSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },

  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: theme.spacing.md, paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight,
  },
  summaryPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  summaryText: { fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary },
  toggleAllBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 999, backgroundColor: theme.colors.primaryLight,
  },
  toggleAllText: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  scrollContent: { padding: theme.spacing.md },

  section: { marginBottom: theme.spacing.lg },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catDot: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary },
  countBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  countText: { fontSize: 12, fontWeight: '700' },

  itemsCard: { padding: 0, overflow: 'hidden' },

  autoRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: theme.spacing.md, paddingVertical: 14, gap: 12,
  },
  autoRowDisabled: { opacity: 0.55 },
  autoIcon: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  autoBody: { flex: 1 },
  autoTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 3 },
  autoTitleOff: { color: theme.colors.textSecondary },
  autoDesc: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 17 },

  delayRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    marginTop: 8, alignSelf: 'flex-start',
    backgroundColor: theme.colors.background,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5,
    borderWidth: 1, borderColor: theme.colors.borderLight,
  },
  delayBtn: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1, borderColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  delayVal: {
    fontSize: 13, fontWeight: '800', color: theme.colors.primary,
    minWidth: 30, textAlign: 'center',
  },
  delayLabel: { fontSize: 11, color: theme.colors.textTertiary, flex: 1 },

  separator: { height: 1, backgroundColor: theme.colors.borderLight, marginLeft: 66 },

  noteCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1, borderColor: theme.colors.borderLight,
    marginBottom: theme.spacing.sm,
  },
  noteHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  noteTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  noteText: { fontSize: 12, color: theme.colors.textTertiary, lineHeight: 18 },
});
