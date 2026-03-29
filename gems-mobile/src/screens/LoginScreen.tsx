import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { spacing, borderRadius, typography } from '../constants/theme';
import { extractDomainFromEmail } from '../constants/companyThemes';
import { RootStackParamList } from '../types/navigation';
import { LoginResponse } from '../types/api';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Login'> };

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { theme, setThemeByDomain } = useTheme();
  const { login } = useAuth();
  const colors = theme.colors;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const data = await api.post<LoginResponse>('/auth/login', { email, password });
      const domain = extractDomainFromEmail(email);
      await Promise.all([
        login(data.token, data.user),
        setThemeByDomain(domain),
      ]);
      navigation.reset({ index: 0, routes: [{ name: 'OrderList' }] });
    } catch (err) {
      Alert.alert('Login failed', err instanceof Error ? err.message : 'Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo / Brand area */}
        <View style={styles.brandArea}>
          {theme.logo ? (
            <Image source={theme.logo} style={styles.logo} resizeMode="contain" />
          ) : null}
          <Text style={[styles.appName, { color: colors.textInverse }]}>{theme.appName}</Text>
          <Text style={[styles.tagline, { color: colors.secondary }]}>
            Warehouse Management
          </Text>
        </View>

        {/* Form card */}
        <View style={[styles.card, { backgroundColor: colors.background }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Sign in</Text>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.backgroundDark }]}
              value={email}
              onChangeText={setEmail}
              placeholder="you@company.com"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.backgroundDark }]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              autoComplete="password"
            />
          </View>

          <Button
            title={loading ? 'Signing in…' : 'Sign in'}
            onPress={handleLogin}
            variant="primary"
            size="large"
            fullWidth
            loading={loading}
            style={styles.submitButton}
          />
        </View>

        <Text style={[styles.footer, { color: colors.textInverse }]}>
          Powered by GEMS
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  brandArea: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logo: {
    width: 72,
    height: 72,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  appName: {
    ...typography.h2,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tagline: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    } as object),
  },
  title: {
    ...typography.h3,
    fontWeight: '700',
    marginBottom: spacing.xl,
  },
  fieldGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.bodySmall,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    ...typography.body,
  },
  submitButton: {
    marginTop: spacing.md,
  },
  footer: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xl,
    opacity: 0.6,
  },
});
