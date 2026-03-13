import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/components';

// ─── Demo tenant credentials ─────────────────────────────────────────────────
// In production these would be validated against the backend with role=tenant
const DEMO_TENANT = {
  email: 'michael.john@email.com',
  code: '123456',         // one-time access code (or password)
  name: 'Michael John',
  unit: '101',
  property: 'Duplex St-Henri',
  rent: 1250,
  landlord: 'Michel Gagnon',
};

export default function TenantLoginScreen() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const handleLogin = () => {
    if (!email.trim()) {
      Alert.alert('Courriel requis', 'Entrez votre adresse courriel.');
      return;
    }

    // Step 1: email entered → show code field (simulating OTP send)
    if (!showCode) {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setShowCode(true);
        Alert.alert('Code envoyé', `Un code d'accès a été envoyé à ${email}.\n\n(Démo: utilisez le code 123456)`);
      }, 1200);
      return;
    }

    // Step 2: validate code
    if (!code.trim()) {
      Alert.alert('Code requis', 'Entrez le code reçu par courriel.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const normalizedEmail = email.toLowerCase().trim();
      if (normalizedEmail === DEMO_TENANT.email && code.trim() === DEMO_TENANT.code) {
        // Navigate to standalone tenant home
        router.replace('/tenant-home');
      } else {
        Alert.alert('Code invalide', 'Le code saisi est incorrect. Vérifiez votre courriel.');
      }
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kbView}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Back to landlord login */}
          <TouchableOpacity style={styles.backRow} onPress={() => router.replace('/(auth)/login')}>
            <Ionicons name="arrow-back-outline" size={18} color={theme.colors.textSecondary} />
            <Text style={styles.backText}>Connexion propriétaire</Text>
          </TouchableOpacity>

          {/* Logo / Icon */}
          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Ionicons name="home" size={40} color={theme.colors.primary} />
            </View>
            <Text style={styles.appName}>PlexIo</Text>
            <View style={styles.portalBadge}>
              <Ionicons name="person-outline" size={12} color={theme.colors.primary} />
              <Text style={styles.portalBadgeText}>Portail locataire</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>Accès locataire</Text>
          <Text style={styles.subtitle}>
            Entrez votre adresse courriel pour recevoir un code d'accès sécurisé.
          </Text>

          {/* Form */}
          <View style={styles.formCard}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Adresse courriel</Text>
              <View style={styles.inputRow}>
                <Ionicons name="mail-outline" size={18} color={theme.colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="michael@example.com"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!showCode}
                />
                {showCode && (
                  <TouchableOpacity onPress={() => setShowCode(false)}>
                    <Text style={styles.changeLink}>Changer</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {showCode && (
              <View style={[styles.fieldGroup, { marginTop: theme.spacing.md }]}>
                <Text style={styles.fieldLabel}>Code d'accès (6 chiffres)</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="keypad-outline" size={18} color={theme.colors.textTertiary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, styles.codeInput]}
                    value={code}
                    onChangeText={setCode}
                    placeholder="123456"
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                </View>
                <TouchableOpacity style={styles.resendRow} onPress={() => Alert.alert('Code renvoyé', `Un nouveau code a été envoyé à ${email}.`)}>
                  <Text style={styles.resendText}>Renvoyer le code</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.loginBtnText}>
                    {showCode ? 'Accéder à mon portail' : 'Envoyer le code'}
                  </Text>
                  <Ionicons name={showCode ? 'arrow-forward' : 'send-outline'} size={18} color="#FFF" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Demo hint */}
          <View style={styles.demoHint}>
            <Ionicons name="flask-outline" size={14} color={theme.colors.primary} />
            <Text style={styles.demoHintText}>
              Démo: utilisez <Text style={styles.demoCode}>michael.john@email.com</Text> + code <Text style={styles.demoCode}>123456</Text>
            </Text>
          </View>

          {/* Security note */}
          <View style={styles.securityNote}>
            <Ionicons name="lock-closed-outline" size={14} color={theme.colors.success} />
            <Text style={styles.securityText}>Connexion sécurisée · Aucun mot de passe requis</Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  kbView: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: theme.spacing.lg },

  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: theme.spacing.xl },
  backText: { fontSize: 14, color: theme.colors.textSecondary },

  logoWrap: { alignItems: 'center', marginBottom: theme.spacing.xl },
  logoCircle: { width: 80, height: 80, borderRadius: 24, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  appName: { fontSize: 28, fontWeight: '800', color: theme.colors.textPrimary, letterSpacing: -0.5 },
  portalBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 8 },
  portalBadgeText: { fontSize: 12, fontWeight: '600', color: theme.colors.primary },

  title: { fontSize: 26, fontWeight: '700', color: theme.colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: theme.spacing.xl },

  formCard: { backgroundColor: theme.colors.surface, borderRadius: 16, padding: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.borderLight, marginBottom: theme.spacing.md },
  fieldGroup: {},
  fieldLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.background },
  inputIcon: { paddingHorizontal: 12 },
  input: { flex: 1, height: 48, fontSize: 15, color: theme.colors.textPrimary },
  codeInput: { letterSpacing: 6, fontWeight: '700', fontSize: 18 },
  changeLink: { fontSize: 13, color: theme.colors.primary, fontWeight: '600', paddingHorizontal: 12 },

  resendRow: { alignItems: 'flex-end', marginTop: 6 },
  resendText: { fontSize: 13, color: theme.colors.primary, fontWeight: '600' },

  loginBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary, paddingVertical: 15, borderRadius: theme.borderRadius.md, marginTop: theme.spacing.lg },
  loginBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },

  demoHint: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: theme.colors.primaryLight, padding: 12, borderRadius: 10, marginBottom: theme.spacing.md },
  demoHintText: { flex: 1, fontSize: 12, color: theme.colors.textSecondary, lineHeight: 18 },
  demoCode: { fontWeight: '700', color: theme.colors.primary },

  securityNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  securityText: { fontSize: 12, color: theme.colors.textTertiary },
});
