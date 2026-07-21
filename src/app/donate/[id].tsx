import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
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

import { Colors, formatARS, Radius, Spacing } from '@/constants/donar-theme';
import { useCauses } from '@/store/causes-store';

const AMOUNTS = [2000, 5000, 10000, 20000, 50000];

export default function DonateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getCause, donate } = useCauses();
  const cause = getCause(String(id));

  const [amount, setAmount] = useState(5000);
  const [message, setMessage] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const confirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    const ok = await donate(String(id), amount, message, anonymous);
    if (ok) {
      router.replace(`/gracias?amount=${amount}`);
    } else {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Tu aporte</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Text style={styles.h3}>¿Cuánto querés aportar{cause ? ` a ${cause.title}` : ''}?</Text>

          <View style={styles.chips}>
            {AMOUNTS.map((a) => {
              const sel = a === amount;
              return (
                <Pressable
                  key={a}
                  style={[styles.chip, sel && styles.chipSel]}
                  onPress={() => setAmount(a)}>
                  <Text style={[styles.chipText, sel && styles.chipTextSel]}>{formatARS(a)}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Dejá un mensaje de aliento (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Fuerza, vas a estar bien 💙"
            placeholderTextColor={Colors.muted}
            value={message}
            onChangeText={setMessage}
          />

          <Pressable style={styles.anon} onPress={() => setAnonymous((v) => !v)}>
            <View style={[styles.checkbox, anonymous && styles.checkboxOn]}>
              {anonymous && <Text style={styles.checkboxTick}>✓</Text>}
            </View>
            <Text style={styles.anonText}>Donar como anónimo</Text>
          </Pressable>

          <View style={styles.trust}>
            <View style={styles.trustB}>
              <Text style={{ color: '#fff', fontSize: 13 }}>✓</Text>
            </View>
            <Text style={styles.trustText}>
              El 100% de tu aporte va a la causa. En el MVP DonAR no cobra comisión. Tu aporte queda
              visible en el recorrido.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.cta}>
        <Pressable style={[styles.btn, submitting && styles.btnDisabled]} onPress={confirm} disabled={submitting}>
          <Text style={styles.btnText}>
            {submitting ? 'Procesando...' : `Confirmar aporte de ${formatARS(amount)}`}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
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
  h3: { fontSize: 17, fontWeight: '700', color: Colors.ink, marginTop: Spacing.sm, marginBottom: Spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    flexBasis: '30%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.line,
    backgroundColor: '#fff',
  },
  chipSel: { borderColor: Colors.brand, backgroundColor: Colors.skySoft },
  chipText: { fontWeight: '700', fontSize: 15, color: Colors.ink },
  chipTextSel: { color: Colors.brandDark },
  label: { fontSize: 12.5, color: Colors.muted, fontWeight: '600', marginTop: Spacing.xl, marginBottom: Spacing.sm },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    padding: 15,
    fontSize: 15,
    color: Colors.ink,
    backgroundColor: '#fff',
  },
  anon: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: Spacing.lg },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: Colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: Colors.brand, borderColor: Colors.brand },
  checkboxTick: { color: '#fff', fontSize: 13, fontWeight: '800' },
  anonText: { fontSize: 14, color: Colors.ink },
  trust: {
    flexDirection: 'row',
    gap: 11,
    alignItems: 'flex-start',
    backgroundColor: Colors.skySoft,
    borderRadius: Radius.md,
    padding: 14,
    marginTop: Spacing.xl,
  },
  trustB: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.verified,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: '#2A4A5E' },
  cta: { padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.line, backgroundColor: '#fff' },
  btn: { backgroundColor: Colors.brand, borderRadius: Radius.md, padding: 17, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#AFC8DD' },
  btnText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
});
