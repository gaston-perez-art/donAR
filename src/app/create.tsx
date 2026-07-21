import { useRouter } from 'expo-router';
import {
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

export default function CreateScreen() {
  const router = useRouter();
  const { draft, setDraft } = useCauses();

  const canContinue = draft.title.trim().length > 0 && draft.goal.trim().length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Crear una causa</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Field label="Título de tu causa">
            <TextInput
              style={styles.input}
              placeholder="Ej: Tratamiento para Mateo, 6 años"
              placeholderTextColor={Colors.muted}
              value={draft.title}
              onChangeText={(title) => setDraft({ title })}
            />
          </Field>

          <Field label="Tu historia">
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Contá qué necesitás y por qué. Cuanto más claro y honesto, más confianza genera."
              placeholderTextColor={Colors.muted}
              value={draft.story}
              onChangeText={(story) => setDraft({ story })}
              multiline
            />
          </Field>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label="Monto que necesitás">
                <TextInput
                  style={styles.input}
                  placeholder="$3.000.000"
                  placeholderTextColor={Colors.muted}
                  value={draft.goal}
                  onChangeText={(goal) => setDraft({ goal })}
                  keyboardType="numeric"
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Cierre">
                <TextInput
                  style={styles.input}
                  placeholder="31/08/2026"
                  placeholderTextColor={Colors.muted}
                  value={draft.deadline}
                  onChangeText={(deadline) => setDraft({ deadline })}
                />
              </Field>
            </View>
          </View>

          <Field label="Evidencia que respalda tu causa">
            <View style={styles.upload}>
              <Text style={styles.uploadIcon}>📎</Text>
              <Text style={styles.uploadText}>Subí presupuesto, diagnóstico o documentación</Text>
            </View>
            <Text style={styles.helper}>
              Necesitás identidad verificada para publicar. Un curador revisa tu causa antes de que
              salga.
            </Text>
          </Field>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.btn, !canContinue && styles.btnDisabled]}
          disabled={!canContinue}
          onPress={() => router.push('/cobro')}>
          <Text style={styles.btnText}>Continuar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 22, color: Colors.ink },
  title: { fontSize: 16, fontWeight: '700', color: Colors.ink },
  form: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxl },
  field: { marginVertical: Spacing.md },
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
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: Spacing.md },
  upload: {
    borderWidth: 1.6,
    borderColor: '#B9D3E8',
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    padding: 24,
    alignItems: 'center',
    backgroundColor: Colors.skyTint,
  },
  uploadIcon: { fontSize: 28, marginBottom: Spacing.sm },
  uploadText: { fontSize: 13, color: Colors.muted, textAlign: 'center' },
  helper: { fontSize: 11.5, color: Colors.muted, marginTop: Spacing.sm, lineHeight: 16 },
  footer: { padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.line, backgroundColor: '#fff' },
  btn: {
    backgroundColor: Colors.brand,
    borderRadius: Radius.md,
    padding: 17,
    alignItems: 'center',
  },
  btnDisabled: { backgroundColor: '#AFC8DD' },
  btnText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
});
