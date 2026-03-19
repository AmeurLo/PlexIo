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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../src/components';
import { tenantApi } from '../../src/services/api';

export default function TenantLoginScreen() {
  const [email,    setEmail]    = useState('');
  const [code,     setCode]     = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [devCode,  setDevCode]  = useState<string | null>(null);

  const handleRequestCode = async () => {
    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      Alert.alert('Courriel requis', 'Entrez une adresse courriel valide.');
      return;
    }
    setLoading(true);
    try {
      const res = await tenantApi.requestCode(normalizedEmail);
      setShowCode(true);
      if (res.dev_code) {
        setDevCode(res.dev_code);
        Alert.alert('🔧 Mode développement', `Code d'accès : ${res.dev_code}\n\n(Configurez RESEND_API_KEY pour envoyer par courriel.)`);
      } else {
        Alert.alert('Code envoyé', `Vérifiez votre boîte de réception à ${normalizedEmail}.`);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Impossible d\'envoyer le code. Réessayez.';
      // Tenant not found → show generic message to avoid enumeration
      Alert.alert('Code envoyé', `Si ${normalizedEmail} est enregistré, un code a été envoyé.`);
      setShowCode(true);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const normalizedEmail = email.toLowerCase().trim();
    const trimmedCode = code.trim();
    if (!trimmedCode || trimmedCode.length < 4) {
      Alert.alert('Code requis', 'Entrez le code reçu par courriel (6 chiffres).');
      return;
    }
    setLoading(true);
    try {
      const { access_token, profile } = await tenantApi.verifyCode(normalizedEmail, trimmedCode);
      await AsyncStorage.setItem('tenant_profile', JSON.stringify(profile));
      router.replace('/tenant-home');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Code invalide ou expiré.';
      Alert.alert('Code invalide', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!showCode) handleRequestCode();
    else handleVerifyCode();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kbView}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <TouchableOpacity style={styles.backRow} onPress={() => router.replace('/(auth)/login')}>
            <Ionicons name="arrow-back-outline" size={18} color={theme.colors.textSecondary} />
            <Text style={styles.backText}>Connexion propriétaire</Text>
          </TouchableOpacity>

          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Ionicons name="home" size={40} color={theme.colors.primary} />
            </View>
            <Text style={styles.appName}>Domely</Text>
            <View style={styles.portalBadge}>
              <Ionicons name="person-outline" size={12} color={theme.colors.primary} />
              <Text style={styles.portalBadgeText}>Portail locataire</Text>
            </View>
          </View>

          <Text style={styles.title}>Accès locataire</Text>
          <Text style={styles.subtitle}>
            Entrez votre adresse courriel pour recevoir un code d'accès sécurisé.
          </Text>

          <View style={styles.formCard}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Adresse courriel</Text>
              <View style={styles.inputRow}>
                <Ionicons name="mail-outline" size={18} color={theme.colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="locataire@exemple.com"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!showCode}
                  returnKeyType="next"
                  onSubmitEditing={!showCode ? handleRequestCode : undefined}
                />
                {showCode && (
                  <TouchableOpacity onPress={() => { setShowCode(false); setCode(''); setDevCode(null); }}>
                    <Text style={styles.changeLink}>Changer</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {showCode && (
              <View style={[styles.fieldGroup, { marginTop: theme.spacing.md }]}>
                <Text style={styles.fieldLabel}>Code d'accès (6 chiffres)</Text>
                {devCode && (
                  <View style={styles.devNote}>
                    <Ionicons name="flask-outline" size={13} color={theme.colors.primary} />
                    <Text style={styles.devNoteText}>Dev — code : <Text style={{ fontWeight: '800' }}>{devCode}</Text></Text>
                  </View>
                )}
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
                    onSubmitEditing={handleVerifyCode}
                    returnKeyType="go"
                  />
                </View>
                <TouchableOpacity style={styles.resendRow} onPress={() => { setShowCode(false); setCode(''); setDevCode(null); }}>
                  <Text style={styles.resendText}>Renvoyer le code</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.loginBtn} onPress={handleSubmit} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#FFF" />
                : <>
                    <Text style={styles.loginBtnText}>{showCode ? 'Accéder à mon portail' : 'Envoyer le code'}</Text>
                    <Ionicons name={showCode ? 'arrow-forward' : 'send-outline'} size={18} color="#FFF" />
                  </>
              }
            </TouchableOpacity>
          </View>

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
  devNote: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.primaryLight, padding: 8, borderRadius: 8, marginBottom: 8 },
  devNoteText: { fontSize: 12, color: theme.colors.textSecondary },
  resendRow: { alignItems: 'flex-end', marginTop: 6 },
  resendText: { fontSize: 13, color: theme.colors.primary, fontWeight: '600' },
  loginBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary, paddingVertical: 15, borderRadius: theme.borderRadius.md, marginTop: theme.spacing.lg },
  loginBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  securityNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  securityText: { fontSize: 12, color: theme.colors.textTertiary },
});
