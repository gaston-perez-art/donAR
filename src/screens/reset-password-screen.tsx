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
 * Se muestra cuando el usuario toca el link de "olvidé mi contraseña" del
 * mail (10.2). El deep link ya dejó una sesión de recuperación activa
 * (ver _layout.tsx); acá solo falta elegir la contraseña nueva. Al terminar,
 * `passwordRecovery` pasa a false y el gate de _layout vuelve a la app normal
 * sola (la sesión ya queda logueada, no hace falta entrar de nuevo).
 */
export default function ResetPasswordScreen() {
  const { completePasswordReset } = useCauses();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mismatch = confirm.length > 0 && password !== confirm;
  const valid = password.length >= 6 && password === confirm;

  const submit = async () => {
    if (submitting || !valid) return;
    setSubmitting(true);
    setError(null);
    const { error } = await completePasswordReset(password);
    if (error) {
      setError(error);
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.logoWrap}>
            <Text style={styles.logo}>
              <Text style={styles.logoDon}>Don</Text>
              <Text style={styles.logoAr}>AR</Text>
            </Text>
          </View>

          <Text style={styles.h2}>Elegí una contraseña nueva</Text>
          <Text style={styles.sub}>Reemplaza la anterior. Usala para entrar de ahora en más.</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Contraseña nueva</Text>
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

          <View style={styles.field}>
            <Text style={styles.label}>Repetila</Text>
            <TextInput
              style={styles.input}
              placeholder="Repetí la contraseña"
              placeholderTextColor={Colors.muted}
              secureTextEntry
              autoCapitalize="none"
              value={confirm}
              onChangeText={setConfirm}
            />
          </View>

          {mismatch ? <Text style={styles.error}>Las contraseñas no coinciden.</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.btn, (!valid || submitting) && styles.btnDisabled]}
            disabled={!valid || submitting}
            onPress={submit}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Guardar contraseña</Text>}
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
});
