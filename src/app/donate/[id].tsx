import { useFocusEffect } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import {
  Alert,
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
import { createMpCheckout } from '@/lib/mercadopago';
import { useCauses } from '@/store/causes-store';

const AMOUNTS = [2000, 5000, 10000, 20000, 50000];
const DEFAULT_AMOUNT = 5000;

/** Solo dígitos. "$12.000" -> 12000. */
function parseAmount(text: string): number {
  const digits = text.replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

export default function DonateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getCause, donate } = useCauses();
  const cause = getCause(String(id));

  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [customText, setCustomText] = useState('');
  const [customActive, setCustomActive] = useState(false);
  const [message, setMessage] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // La pantalla vive dentro de un Tabs y no se desmonta: reseteamos el estado
  // cada vez que toma foco para que se pueda volver a donar sin quedar trabado.
  useFocusEffect(
    useCallback(() => {
      setAmount(DEFAULT_AMOUNT);
      setCustomText('');
      setCustomActive(false);
      setMessage('');
      setAnonymous(false);
      setSubmitting(false);
    }, []),
  );

  const pickChip = (a: number) => {
    setAmount(a);
    setCustomActive(false);
    setCustomText('');
  };

  const onCustomChange = (text: string) => {
    const n = parseAmount(text);
    setCustomText(n ? formatARS(n).replace('$', '') : '');
    setCustomActive(true);
    setAmount(n);
  };

  const valid = amount > 0;

  // Meta como objetivo, no techo: se puede superar, pero avisamos al donante.
  const alreadyMet = !!cause && cause.raised >= cause.goal;
  const willExceed = !!cause && valid && cause.raised + amount > cause.goal;

  const doDonate = async () => {
    if (submitting || !valid || !cause) return;
    setSubmitting(true);

    // Abre el checkout de Mercado Pago (sandbox). Al volver aprobado, recién
    // ahí registramos la donación como aporte real de la causa.
    const returnUrl = Linking.createURL('mp-return');
    const { url, error } = await createMpCheckout({
      causeId: cause.id,
      title: cause.title,
      amount,
      returnUrl,
    });
    if (error || !url) {
      setSubmitting(false);
      Alert.alert('No pudimos abrir el pago', error ?? 'Probá de nuevo en un momento.');
      return;
    }

    const result = await WebBrowser.openAuthSessionAsync(url, returnUrl);

    if (result.type !== 'success' || !result.url) {
      // El usuario cerró el checkout sin terminar.
      setSubmitting(false);
      return;
    }

    const params = Linking.parse(result.url).queryParams ?? {};
    const status = (params.status ?? params.collection_status) as string | undefined;
    if (status !== 'approved') {
      setSubmitting(false);
      Alert.alert('Pago no completado', 'El pago no se aprobó. Podés intentarlo de nuevo.');
      return;
    }

    const ok = await donate(String(id), amount, message, anonymous);
    setSubmitting(false);
    if (ok) {
      router.replace(`/gracias?amount=${amount}`);
    } else {
      Alert.alert('Registramos un problema', 'El pago salió, pero no pudimos guardar tu aporte. Avisanos.');
    }
  };

  const confirm = () => {
    if (submitting || !valid) return;
    if (willExceed && cause) {
      Alert.alert(
        alreadyMet ? 'Esta causa ya alcanzó su meta' : 'Tu aporte supera la meta',
        `${
          alreadyMet
            ? `Ya reunió los ${formatARS(cause.goal)} que pedía.`
            : `Con este aporte la causa pasa su meta de ${formatARS(cause.goal)}.`
        } Tu donación suma igual y queda registrada en el recorrido de la causa. ¿Querés continuar?`,
        [
          { text: 'Cambiar monto', style: 'cancel' },
          { text: 'Donar igual', onPress: doDonate },
        ],
      );
      return;
    }
    doDonate();
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
              const sel = !customActive && a === amount;
              return (
                <Pressable
                  key={a}
                  style={[styles.chip, sel && styles.chipSel]}
                  onPress={() => pickChip(a)}>
                  <Text style={[styles.chipText, sel && styles.chipTextSel]}>{formatARS(a)}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.customWrap, customActive && styles.customWrapActive]}>
            <Text style={[styles.customPeso, customActive && styles.customPesoActive]}>$</Text>
            <TextInput
              style={styles.customInput}
              placeholder="Otro monto"
              placeholderTextColor={Colors.muted}
              keyboardType="number-pad"
              value={customText}
              onChangeText={onCustomChange}
              onFocus={() => setCustomActive(true)}
            />
          </View>

          {willExceed && cause ? (
            <View style={styles.notice}>
              <Text style={styles.noticeEmoji}>💙</Text>
              <Text style={styles.noticeText}>
                {alreadyMet
                  ? `Esta causa ya llegó a su meta de ${formatARS(cause.goal)}.`
                  : `Con este monto, la causa supera su meta de ${formatARS(cause.goal)}.`}{' '}
                Podés donar igual: tu aporte queda registrado en el recorrido.
              </Text>
            </View>
          ) : null}

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
        <Pressable
          style={[styles.btn, (submitting || !valid) && styles.btnDisabled]}
          onPress={confirm}
          disabled={submitting || !valid}>
          <Text style={styles.btnText}>
            {submitting
              ? 'Abriendo Mercado Pago...'
              : valid
                ? `Pagar ${formatARS(amount)} con Mercado Pago`
                : 'Ingresá un monto'}
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
  customWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
  },
  customWrapActive: { borderColor: Colors.brand, backgroundColor: Colors.skySoft },
  customPeso: { fontSize: 17, fontWeight: '800', color: Colors.muted, marginRight: 6 },
  customPesoActive: { color: Colors.brandDark },
  customInput: { flex: 1, paddingVertical: 15, fontSize: 16, fontWeight: '700', color: Colors.ink },
  notice: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: '#FEF6E6',
    borderRadius: Radius.md,
    padding: 13,
    marginTop: Spacing.md,
  },
  noticeEmoji: { fontSize: 15, marginTop: 1 },
  noticeText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: '#7A5B12' },
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
