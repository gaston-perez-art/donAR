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
  const { signIn, signUp, requestPasswordReset } = useCauses();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  // Nombre y apellido por separado (29 jul, pedido de Gastón): un solo campo
  // de texto libre no garantiza poder sacar las DOS iniciales reales (p.ej.
  // alguien que solo pone su nombre). Con dos campos obligatorios, siempre
  // hay nombre + apellido para "GP" en vez de una sola letra.
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const valid =
    mode === 'forgot'
      ? email.trim().includes('@')
      : email.trim().includes('@') &&
        password.length >= 6 &&
        (mode === 'login' || (firstName.trim().length >= 1 && lastName.trim().length >= 1));

  const goToMode = (m: 'login' | 'signup' | 'forgot') => {
    setMode(m);
    setError(null);
    setResetSent(false);
  };

  const submit = async () => {
    if (submitting || !valid) return;
    setSubmitting(true);
    setError(null);

    if (mode === 'forgot') {
      const { error } = await requestPasswordReset(email);
      setSubmitting(false);
      if (error) setError(error);
      else setResetSent(true);
      return;
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const { error } =
      mode === 'login' ? await signIn(email, password) : await signUp(email, password, fullName);
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

          <Text style={styles.h2}>
            {mode === 'login' ? 'Entrá a tu cuenta' : mode === 'signup' ? 'Creá tu cuenta' : 'Recuperar contraseña'}
          </Text>
          <Text style={styles.sub}>
            {mode === 'login'
              ? 'Para donar, crear una causa o recibir, todo queda guardado en tu cuenta.'
              : mode === 'signup'
                ? 'Con tu cuenta no perdés tu historial ni tus causas, en este celular o en otro.'
                : 'Te mandamos un mail con un link para elegir una contraseña nueva.'}
          </Text>

          {mode === 'forgot' ? (
            resetSent ? (
              <Text style={styles.success}>
                Si esa cuenta existe, te va a llegar un mail con el link. Revisá tu bandeja (y spam).
              </Text>
            ) : (
              <>
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
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Pressable
                  style={[styles.btn, (!valid || submitting) && styles.btnDisabled]}
                  disabled={!valid || submitting}
                  onPress={submit}>
                  {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Enviar instrucciones</Text>}
                </Pressable>
              </>
            )
          ) : (
            <>
              {mode === 'signup' && (
                <View style={styles.nameRow}>
                  <View style={[styles.field, styles.nameField]}>
                    <Text style={styles.label}>Nombre</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Gastón"
                      placeholderTextColor={Colors.muted}
                      autoCapitalize="words"
                      value={firstName}
                      onChangeText={setFirstName}
                    />
                  </View>
                  <View style={[styles.field, styles.nameField]}>
                    <Text style={styles.label}>Apellido</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Pérez"
                      placeholderTextColor={Colors.muted}
                      autoCapitalize="words"
                      value={lastName}
                      onChangeText={setLastName}
                    />
                  </View>
                </View>
              )}

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

              {mode === 'login' && (
                <Pressable onPress={() => goToMode('forgot')} style={styles.forgotLink}>
                  <Text style={styles.switchLink}>¿Olvidaste tu contraseña?</Text>
                </Pressable>
              )}

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
            </>
          )}

          <Pressable
            style={styles.switch}
            onPress={() => goToMode(mode === 'signup' ? 'login' : mode === 'forgot' ? 'login' : 'signup')}>
            <Text style={styles.switchText}>
              {mode === 'forgot'
                ? ''
                : mode === 'login'
                  ? '¿No tenés cuenta? '
                  : '¿Ya tenés cuenta? '}
              <Text style={styles.switchLink}>
                {mode === 'forgot' ? 'Volver a entrar' : mode === 'login' ? 'Creá una' : 'Entrá'}
              </Text>
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
  nameRow: { flexDirection: 'row', gap: Spacing.md },
  nameField: { flex: 1 },
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
  success: {
    color: Colors.happy,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    backgroundColor: '#E4F7EE',
    borderRadius: Radius.md,
    padding: Spacing.lg,
  },
  forgotLink: { alignSelf: 'flex-end', marginBottom: Spacing.md },
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
