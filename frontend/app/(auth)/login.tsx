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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, theme } from '../../src/components';
import { api } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { useTranslation } from '../../src/i18n/useTranslation';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { setAuth } = useAuthStore();
  const { t } = useTranslation();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('error') as string, t('loginError') as string);
      return;
    }

    setLoading(true);
    try {
      const response = await api.login(email.toLowerCase().trim(), password);
      await setAuth(response.user, response.access_token);
      router.replace('/(tabs)');
    } catch (error: any) {
      const message = error.response?.data?.detail || (t('loginFailedMsg') as string);
      Alert.alert(t('loginFailed') as string, message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            {/* Clean logo mark */}
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />

            {/* Gradient "Plexio" wordmark */}
            <View style={styles.wordmarkRow}>
              {'Plexio'.split('').map((char, i) => {
                const t_val = i / 5;
                const r = Math.round(26 + t_val * (58 - 26));
                const g = Math.round(59 + t_val * (142 - 59));
                const b = Math.round(107 + t_val * (124 - 107));
                return (
                  <Text key={i} style={[styles.wordmarkChar, { color: `rgb(${r},${g},${b})` }]}>
                    {char}
                  </Text>
                );
              })}
            </View>

            <Text style={styles.title}>{t('welcomeBack') as string}</Text>
            <Text style={styles.subtitle}>{t('loginSubtitle') as string}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label={t('email') as string}
              value={email}
              onChangeText={setEmail}
              placeholder={t('emailPlaceholder') as string}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.passwordContainer}>
              <Input
                label={t('password') as string}
                value={password}
                onChangeText={setPassword}
                placeholder={t('passwordPlaceholder') as string}
                secureTextEntry={!showPassword}
                containerStyle={styles.passwordInput}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={22}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Gradient Sign In button */}
            <LinearGradient
              colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <TouchableOpacity
                style={styles.gradientButtonInner}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.gradientButtonText}>
                  {loading ? (t('signingIn') as string) : (t('signIn') as string)}
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('noAccount') as string}</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.link}>{t('createAccount') as string}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  logoImage: {
    width: 140,
    height: 140,
    marginBottom: 4,
  },
  wordmarkRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  wordmarkChar: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  form: {
    marginBottom: theme.spacing.xl,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    marginBottom: theme.spacing.lg,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 42,
  },
  gradientButton: {
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
    ...theme.shadows.md,
  },
  gradientButtonInner: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
  },
  link: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
