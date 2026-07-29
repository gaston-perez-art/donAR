import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '@/constants/donar-theme';
import { useCauses } from '@/store/causes-store';

/**
 * Puerta de entrada. La app entera exige cuenta: para donar, crear una causa o
 * recibir, todo queda atado a un usuario que persiste. No hay sesión anónima.
 * La renderiza _layout.tsx cuando no hay sesión real (ver AppShell).
 */
export default function AuthScreen() {
  const { signIn, signUp } = useCauses();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = email.trim().includes('@') && password.length >= 6;

  const submit = async () => {
    if (submitting || !valid) return;
    setSubmitting(true);
    setError(null);
    const { error } = mode === 'login' ? await signIn(email, password) : await signUp(email, password);
    // Si sale bien, el gate de _layout desmonta esta pantalla solo. Si falla,
    // seguimos acá mostrando el error.
    if (error) {
      setError(error);
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.logoWrap}>
            <Text style={styles.logo}>
              <Text style={styles.logoDon}>Don</Text>
              <Text style={styles.logoAr}>AR</Text>
            </Text>
            <Text style={styles.tagline}>Colectas solidarias verificadas</Text>
          </View>

          <Text style={styles.h2}>{mode === 'login' ? 'Entrá a tu cuenta' : 'Creá tu cuenta'}</Text>
          <Text style={styles.sub}>
            {mode === 'login'
              ? 'Para donar, crear una causa o recibir, todo queda guardado en tu cuenta.'
              : 'Con tu cuenta no perdés tu historial ni tus causas, en este celular o en otro.'}
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Mail</Text>
            <TextInput
              style={styles.input}
              placeholder="vos@mail.com"
              placeholderTextColor={Colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="Al menos 6 caracteres"
              placeholderTextColor={Colors.muted}
              secureTextEntry
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.btn, (!valid || submitting) && styles.btnDisabled]}
            disabled={!valid || submitting}
            onPress={submit}>
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>{mode === 'login' ? 'Entrar' : 'Crear cuenta'}</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.switch}
            onPress={() => {
              setMode((m) => (m === 'login' ? 'signup' : 'login'));
              setError(null);
            }}>
            <Text style={styles.switchText}>
              {mode === 'login' ? '¿No tenés cuenta? ' : '¿Ya tenés cuenta? '}
              <Text style={styles.switchLink}>{mode === 'login' ? 'Creá una' : 'Entrá'}</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  body: { flexGrow: 1, justifyContent: 'center', padding: Spacing.xl },
  logoWrap: { alignItems: 'center', marginBottom: Spacing.xxl },
  logo: { fontSize: 40, fontWeight: '800', letterSpacing: -1.5 },
  logoDon: { color: Colors.brand },
  logoAr: { color: Colors.sky },
  tagline: { fontSize: 13, color: Colors.muted, marginTop: 4 },
  h2: { fontSize: 22, fontWeight: '800', color: Colors.ink, letterSpacing: -0.4 },
  sub: { fontSize: 13.5, color: Colors.muted, lineHeight: 20, marginTop: 6, marginBottom: Spacing.lg },
  field: { marginBottom: Spacing.md },
  label: { fontSize: 12.5, color: Colors.muted, fontWeight: '600', marginBottom: Spacing.sm },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    padding: 15,
    fontSize: 15,
    color: Colors.ink,
    backgroundColor: '#fff',
  },
  error: { color: '#C0392B', fontSize: 13, marginBottom: Spacing.md, fontWeight: '600' },
  btn: {
    backgroundColor: Colors.brand,
    borderRadius: Radius.md,
    padding: 17,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  btnDisabled: { backgroundColor: '#AFC8DD' },
  btnText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
  switch: { marginTop: Spacing.xl, alignItems: 'center' },
  switchText: { fontSize: 13.5, color: Colors.muted },
  switchLink: { color: Colors.brand, fontWeight: '700' },
});
