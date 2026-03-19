import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../src/components';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOTAL_STEPS = 4;

// ─── Types ────────────────────────────────────────────────────────────────────

type PortfolioSize = '1' | '2-5' | '6-15' | '16+';
type GoalKey =
  | 'rents'
  | 'leases'
  | 'maintenance'
  | 'market'
  | 'documents'
  | 'tenants'
  | 'finances'
  | 'automations';

// ─── Data ─────────────────────────────────────────────────────────────────────

const PORTFOLIO_OPTIONS: { value: PortfolioSize; label: string; sub: string; icon: string }[] = [
  { value: '1',    label: '1 logement',       sub: 'Propriétaire occupant ou 1 bien', icon: 'home-outline' },
  { value: '2-5',  label: '2 – 5 logements',  sub: 'Petit portefeuille',              icon: 'business-outline' },
  { value: '6-15', label: '6 – 15 logements', sub: 'Portefeuille intermédiaire',      icon: 'grid-outline' },
  { value: '16+',  label: '16 logements +',   sub: 'Grand portefeuille',              icon: 'layers-outline' },
];

const GOAL_OPTIONS: { key: GoalKey; label: string; sub: string; icon: string; color: string }[] = [
  { key: 'rents',        label: 'Suivi des loyers',        sub: 'Rappels, paiements, retards',         icon: 'cash-outline',          color: '#10B981' },
  { key: 'leases',       label: 'Gestion des baux',        sub: 'Renouvellements, fin de baux',        icon: 'document-text-outline', color: '#6366F1' },
  { key: 'maintenance',  label: 'Entretien & réparations', sub: 'Demandes, suivi, entrepreneurs',      icon: 'construct-outline',     color: '#F59E0B' },
  { key: 'market',       label: 'Analyse de marché',       sub: 'Loyers SCHL, comparatifs',            icon: 'stats-chart-outline',   color: '#3B82F6' },
  { key: 'documents',    label: 'Documents & stockage',    sub: 'Baux, photos, rapports',              icon: 'folder-outline',        color: '#8B5CF6' },
  { key: 'tenants',      label: 'Portail locataire',       sub: 'Communication, demandes',             icon: 'people-outline',        color: '#EC4899' },
  { key: 'finances',     label: 'Finances & rapports',     sub: 'Revenus, dépenses, CSV',              icon: 'bar-chart-outline',     color: '#14B8A6' },
  { key: 'automations',  label: 'Automatisations',         sub: 'Rappels et workflows auto',           icon: 'flash-outline',         color: '#F97316' },
];

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepDots({ current }: { current: number }) {
  return (
    <View style={dots.row}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[dots.dot, i === current && dots.dotActive, i < current && dots.dotDone]}
        />
      ))}
    </View>
  );
}

const dots = StyleSheet.create({
  row:       { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.borderLight },
  dotActive: { width: 24, backgroundColor: theme.colors.primary },
  dotDone:   { backgroundColor: theme.colors.primary + '80' },
});

// ─── Step 0: Welcome ─────────────────────────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <View style={step.container}>
      {/* Logo */}
      <Image
        source={require('../assets/images/logo.png')}
        style={step.logo}
        resizeMode="contain"
      />

      <Text style={step.title}>Bienvenue sur{'\n'}Domely</Text>
      <Text style={step.subtitle}>
        La plateforme de gestion locative conçue pour les propriétaires québécois.
        Gérez vos logements, vos baux et vos finances — en toute conformité TAL.
      </Text>

      {/* Features preview */}
      <View style={step.featureList}>
        {[
          { icon: 'shield-checkmark-outline', color: '#10B981', text: 'Conforme TAL · IPC 2025' },
          { icon: 'flash-outline',            color: '#6366F1', text: 'Automatisations intelligentes' },
          { icon: 'stats-chart-outline',      color: '#3B82F6', text: 'Données SCHL en temps réel' },
          { icon: 'people-outline',           color: '#EC4899', text: 'Portail locataire inclus' },
        ].map((f, i) => (
          <View key={i} style={step.featureRow}>
            <View style={[step.featureIcon, { backgroundColor: f.color + '18' }]}>
              <Ionicons name={f.icon as any} size={18} color={f.color} />
            </View>
            <Text style={step.featureText}>{f.text}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={step.primaryBtn} onPress={onNext}>
        <Text style={step.primaryBtnText}>Commencer</Text>
        <Ionicons name="arrow-forward" size={20} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Step 1: Portfolio size ───────────────────────────────────────────────────

function StepPortfolio({
  selected,
  onSelect,
  onNext,
  onBack,
}: {
  selected: PortfolioSize | null;
  onSelect: (v: PortfolioSize) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <View style={step.container}>
      <Text style={step.stepLabel}>Étape 1 sur 3</Text>
      <Text style={step.title}>Votre portefeuille</Text>
      <Text style={step.subtitle}>Combien de logements gérez-vous ?</Text>

      <View style={step.optionGrid}>
        {PORTFOLIO_OPTIONS.map(opt => {
          const active = selected === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[step.optionCard, active && step.optionCardActive]}
              onPress={() => onSelect(opt.value)}
            >
              <View style={[step.optionIcon, active && step.optionIconActive]}>
                <Ionicons
                  name={opt.icon as any}
                  size={24}
                  color={active ? '#FFF' : theme.colors.textSecondary}
                />
              </View>
              <Text style={[step.optionLabel, active && step.optionLabelActive]}>{opt.label}</Text>
              <Text style={step.optionSub}>{opt.sub}</Text>
              {active && (
                <View style={step.optionCheck}>
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={step.navRow}>
        <TouchableOpacity style={step.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[step.primaryBtn, { flex: 1 }, !selected && step.primaryBtnDisabled]}
          onPress={selected ? onNext : undefined}
        >
          <Text style={step.primaryBtnText}>Continuer</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Step 2: Goals ────────────────────────────────────────────────────────────

function StepGoals({
  selected,
  onToggle,
  onNext,
  onBack,
}: {
  selected: GoalKey[];
  onToggle: (k: GoalKey) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <View style={step.container}>
      <Text style={step.stepLabel}>Étape 2 sur 3</Text>
      <Text style={step.title}>Vos priorités</Text>
      <Text style={step.subtitle}>Quelles fonctions vous intéressent le plus ? (choisissez-en plusieurs)</Text>

      <ScrollView
        style={{ flex: 1, marginBottom: 16 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 10 }}
      >
        {GOAL_OPTIONS.map(g => {
          const active = selected.includes(g.key);
          return (
            <TouchableOpacity
              key={g.key}
              style={[step.goalRow, active && { borderColor: g.color, borderWidth: 1.5 }]}
              onPress={() => onToggle(g.key)}
            >
              <View style={[step.goalIcon, { backgroundColor: g.color + '18' }]}>
                <Ionicons name={g.icon as any} size={20} color={g.color} />
              </View>
              <View style={step.goalText}>
                <Text style={step.goalLabel}>{g.label}</Text>
                <Text style={step.goalSub}>{g.sub}</Text>
              </View>
              <View style={[step.goalCheckbox, active && { backgroundColor: g.color, borderColor: g.color }]}>
                {active && <Ionicons name="checkmark" size={14} color="#FFF" />}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={step.navRow}>
        <TouchableOpacity style={step.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[step.primaryBtn, { flex: 1 }]}
          onPress={onNext}
        >
          <Text style={step.primaryBtnText}>
            {selected.length === 0 ? 'Passer cette étape' : 'Continuer'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Step 3: Done ─────────────────────────────────────────────────────────────

function StepDone({
  portfolioSize,
  goals,
  onFinish,
}: {
  portfolioSize: PortfolioSize | null;
  goals: GoalKey[];
  onFinish: () => void;
}) {
  const sizeLabel = PORTFOLIO_OPTIONS.find(o => o.value === portfolioSize)?.label ?? '';
  const topGoals = goals.slice(0, 3).map(k => GOAL_OPTIONS.find(g => g.key === k)!).filter(Boolean);

  return (
    <View style={step.container}>
      {/* Success graphic */}
      <View style={step.successCircle}>
        <Ionicons name="checkmark" size={48} color="#FFF" />
      </View>

      <Text style={[step.title, { marginTop: 24 }]}>Tout est prêt !</Text>
      <Text style={step.subtitle}>
        Votre profil est configuré. Commencez à explorer le tableau de bord.
      </Text>

      {/* Summary card */}
      <View style={step.summaryCard}>
        <Text style={step.summaryTitle}>Votre configuration</Text>

        {portfolioSize && (
          <View style={step.summaryRow}>
            <Ionicons name="home-outline" size={16} color={theme.colors.primary} />
            <Text style={step.summaryText}>{sizeLabel}</Text>
          </View>
        )}

        {topGoals.length > 0 && (
          <View style={step.summaryGoals}>
            {topGoals.map(g => (
              <View key={g.key} style={[step.summaryGoalChip, { backgroundColor: g.color + '18' }]}>
                <Ionicons name={g.icon as any} size={12} color={g.color} />
                <Text style={[step.summaryGoalText, { color: g.color }]}>{g.label}</Text>
              </View>
            ))}
            {goals.length > 3 && (
              <View style={step.summaryGoalChip}>
                <Text style={[step.summaryGoalText, { color: theme.colors.textSecondary }]}>+{goals.length - 3}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Quick tips */}
      <View style={step.tipsCard}>
        <Text style={step.tipsTitle}>Pour démarrer rapidement :</Text>
        {[
          { icon: 'add-circle-outline',    color: '#6366F1', text: 'Ajoutez votre premier immeuble' },
          { icon: 'people-outline',        color: '#10B981', text: 'Importez vos locataires' },
          { icon: 'document-text-outline', color: '#F59E0B', text: 'Créez ou attachez un bail' },
        ].map((tip, i) => (
          <View key={i} style={step.tipRow}>
            <View style={[step.tipNum, { backgroundColor: tip.color + '18' }]}>
              <Ionicons name={tip.icon as any} size={16} color={tip.color} />
            </View>
            <Text style={step.tipText}>{tip.text}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={[step.primaryBtn, { marginTop: 8 }]} onPress={onFinish}>
        <Text style={step.primaryBtnText}>Accéder au tableau de bord</Text>
        <Ionicons name="arrow-forward" size={20} color="#FFF" />
      </TouchableOpacity>

      <TouchableOpacity style={step.skipBtn} onPress={onFinish}>
        <Text style={step.skipText}>Explorer d'abord les données de démo</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const [portfolioSize, setPortfolioSize] = useState<PortfolioSize | null>(null);
  const [goals, setGoals] = useState<GoalKey[]>(['rents', 'leases']);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateTransition = (direction: 'forward' | 'back', callback: () => void) => {
    const toValue = direction === 'forward' ? -30 : 30;
    Animated.sequence([
      Animated.timing(slideAnim, { toValue, duration: 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
    setTimeout(callback, 120);
  };

  const goNext = () => {
    if (currentStep < TOTAL_STEPS - 1) {
      animateTransition('forward', () => setCurrentStep(s => s + 1));
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      animateTransition('back', () => setCurrentStep(s => s - 1));
    }
  };

  const toggleGoal = (key: GoalKey) => {
    setGoals(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleFinish = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <StepDots current={currentStep} />
        {currentStep > 0 && currentStep < TOTAL_STEPS - 1 && (
          <TouchableOpacity
            style={styles.skipHeaderBtn}
            onPress={() => setCurrentStep(TOTAL_STEPS - 1)}
          >
            <Text style={styles.skipHeaderText}>Ignorer</Text>
          </TouchableOpacity>
        )}
        {currentStep === 0 && <View style={{ width: 52 }} />}
        {currentStep === TOTAL_STEPS - 1 && <View style={{ width: 52 }} />}
      </View>

      {/* Slide container */}
      <Animated.View style={[styles.slideContainer, { transform: [{ translateX: slideAnim }] }]}>
        {currentStep === 0 && <StepWelcome onNext={goNext} />}
        {currentStep === 1 && (
          <StepPortfolio
            selected={portfolioSize}
            onSelect={setPortfolioSize}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {currentStep === 2 && (
          <StepGoals
            selected={goals}
            onToggle={toggleGoal}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {currentStep === 3 && (
          <StepDone
            portfolioSize={portfolioSize}
            goals={goals}
            onFinish={handleFinish}
          />
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

// ─── Shared Step Styles ───────────────────────────────────────────────────────

const step = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
  },

  // Welcome
  logo: {
    width: 88,
    height: 88,
    marginBottom: 28,
  },

  featureList: {
    gap: 10,
    marginBottom: 32,
    width: '100%',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 15,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },

  // Typography
  stepLabel: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: 28,
  },

  // Portfolio grid
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  optionCard: {
    width: (SCREEN_WIDTH - 48 - 12) / 2,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.borderLight,
    position: 'relative',
  },
  optionCardActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  optionIconActive: {
    backgroundColor: theme.colors.primary,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  optionLabelActive: {
    color: theme.colors.primary,
  },
  optionSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    lineHeight: 15,
  },
  optionCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Goals
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    gap: 12,
  },
  goalIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalText: { flex: 1 },
  goalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 1,
  },
  goalSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  goalCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Done / success
  successCircle: {
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.lg,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  summaryGoals: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  summaryGoalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryLight,
  },
  summaryGoalText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  tipsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: 12,
    gap: 10,
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tipNum: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },

  // Navigation
  navRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  backBtn: {
    width: 48,
    height: 52,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingVertical: 15,
    borderRadius: 14,
    ...theme.shadows.sm,
  },
  primaryBtnDisabled: {
    backgroundColor: theme.colors.borderLight,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textDecorationLine: 'underline',
  },
});

// ─── Screen-level Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  skipHeaderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  skipHeaderText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  slideContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
});
