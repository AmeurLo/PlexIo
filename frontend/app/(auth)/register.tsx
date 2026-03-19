import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, theme } from '../../src/components';
import { api } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { setAuth } = useAuthStore();

  const handleRegister = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Champs manquants', 'Veuillez remplir tous les champs.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Mot de passe trop court', 'Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.register(email.toLowerCase().trim(), password, fullName.trim());
      await setAuth(response.user, response.access_token);
      
      // Seed demo data for new users
      try {
        await api.seedDemoData();
      } catch (e) {
        // Demo data might already exist or other error - not critical
        console.log('Demo data seeding:', e);
      }

      // Route new users to onboarding wizard
      router.replace('/onboarding');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Inscription échouée. Veuillez réessayer.';
      Alert.alert('Inscription impossible', message);
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
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Rejoindre Domely</Text>
            <Text style={styles.subtitle}>Gérez vos logements, simplement.</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Nom complet"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Votre nom complet"
              autoCapitalize="words"
            />

            <Input
              label="Courriel"
              value={email}
              onChangeText={setEmail}
              placeholder="votre@courriel.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.passwordContainer}>
              <Input
                label="Mot de passe"
                value={password}
                onChangeText={setPassword}
                placeholder="Créez un mot de passe"
                secureTextEntry={!showPassword}
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

            <Input
              label="Confirmer le mot de passe"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Répétez votre mot de passe"
              secureTextEntry={!showPassword}
              containerStyle={styles.lastInput}
            />

            <Button
              title="Créer mon compte"
              onPress={handleRegister}
              loading={loading}
              size="large"
              style={styles.button}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Déjà un compte ?</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.link}>Se connecter</Text>
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
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  form: {
    marginBottom: theme.spacing.lg,
  },
  passwordContainer: {
    position: 'relative',
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 42,
  },
  lastInput: {
    marginBottom: theme.spacing.lg,
  },
  button: {
    marginTop: theme.spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 'auto',
    paddingBottom: theme.spacing.lg,
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
