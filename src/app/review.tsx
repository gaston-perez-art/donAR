import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, formatARS, Radius, Spacing } from '@/constants/donar-theme';
import { useCauses } from '@/store/causes-store';

/** Frases para el modal de "enviada a revisión". Una al azar, como en Perfil. */
const SENT_PHRASES = [
  'Contar tu historia ya es un paso grande. Gracias por la confianza.',
  'Cada causa que se revisa a conciencia protege a quien dona y a quien pide.',
  'Ya diste el primer paso. Ahora un curador se encarga del resto.',
  'La verificación existe para que confíen en vos. Vale la pena la espera.',
];

function randomPhrase(): string {
  return SENT_PHRASES[Math.floor(Math.random() * SENT_PHRASES.length)];
}

export default function ReviewScreen() {
  const router = useRouter();
  const { draft, publishDraft } = useCauses();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState<{ causeId: string; phrase: string } | null>(null);

  // La pantalla vive en un Tab y no se desmonta: si no se resetea acá, un
  // segundo intento arranca con submitting=true y el botón queda tildado.
  useFocusEffect(
    useCallback(() => {
      setSubmitting(false);
    }, []),
  );

  const goalNumber = parseInt(draft.goal.replace(/\D/g, ''), 10) || 0;

  // El submitting guard evita que un doble tap cree dos causas.
  const publish = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const created = await publishDraft();
      if (created) {
        setSent({ causeId: created.id, phrase: randomPhrase() });
        return;
      }
      Alert.alert(
        'No pudimos enviar tu causa',
        'Revisá tu conexión e intentá de nuevo. Si el problema sigue, avisanos.',
      );
    } catch (err) {
      console.warn('publish error:', err);
      Alert.alert(
        'No pudimos enviar tu causa',
        'Revisá tu conexión e intentá de nuevo. Si el problema sigue, avisanos.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Revisión</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.clock}>
          <Text style={{ fontSize: 46 }}>⏳</Text>
        </View>
        <Text style={styles.h2}>Tu causa está en revisión</Text>
        <Text style={styles.sub}>
          Un curador de DonAR verifica tu historia, tu documentación y tu cuenta de cobro. Te
          avisamos cuando esté publicada, normalmente en menos de 24 hs hábiles.
        </Text>

        <View style={styles.summary}>
          <Row k="Título" v={draft.title || 'Mi causa'} />
          <Row k="Meta" v={goalNumber ? formatARS(goalNumber) : 'a definir'} />
          <Row k="Cobro" v={draft.payoutMethod === 'mp' ? 'Mercado Pago' : 'CBU / alias'} />
          <Row k="Cuenta" v={draft.alias || '-'} last />
        </View>

        <View style={styles.steps}>
          <Step n="✓" done label="Causa enviada" hint="Recibimos tu historia y tu evidencia" />
          <Step n="2" now label="En verificación" hint="Revisamos identidad, documentación y cobro" />
          <Step n="3" label="Publicada" hint="Tu causa sale al feed y empieza a recibir aportes" />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.btn, submitting && styles.btnDisabled]}
          onPress={publish}
          disabled={submitting}>
          {submitting ? (
            <View style={styles.btnRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.btnText}>Subiendo evidencia...</Text>
            </View>
          ) : (
            <Text style={styles.btnText}>Enviar a revisión</Text>
          )}
        </Pressable>
        <Text style={styles.footnote}>
          {submitting
            ? 'Puede tardar unos segundos, son 4 archivos.'
            : 'Un curador revisa tu identidad, tu documentación y tu cuenta de cobro antes de publicarla.'}
        </Text>
      </View>

      <Modal visible={!!sent} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.backdrop}>
          <View style={styles.sentCard}>
            <Text style={{ fontSize: 48 }}>🎉</Text>
            <Text style={styles.sentTitle}>¡Listo, la enviamos a revisión!</Text>
            <Text style={styles.sentPhrase}>“{sent?.phrase}”</Text>
            <View style={styles.sentInfo}>
              <Text style={styles.sentInfoText}>
                Un curador la revisa en menos de 24 hs hábiles. Vas a ver el estado (en revisión,
                publicada, o si te pedimos algo más) en el feed, en "Tus causas".
              </Text>
            </View>
            <Pressable
              style={styles.sentBtn}
              onPress={() => {
                const causeId = sent?.causeId;
                setSent(null);
                if (causeId) router.replace(`/cause/${causeId}`);
              }}>
              <Text style={styles.sentBtnText}>Ver el estado de mi causa</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Row({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <View style={[styles.sr, !last && styles.srBorder]}>
      <Text style={styles.srK}>{k}</Text>
      <Text style={styles.srV} numberOfLines={1}>
        {v}
      </Text>
    </View>
  );
}

function Step({
  n,
  label,
  hint,
  done,
  now,
}: {
  n: string;
  label: string;
  hint: string;
  done?: boolean;
  now?: boolean;
}) {
  return (
    <View style={styles.step}>
      <View style={[styles.n, done && styles.nDone, now && styles.nNow]}>
        <Text style={[styles.nText, (done || now) && { color: '#fff' }]}>{n}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepLabel}>{label}</Text>
        <Text style={styles.stepHint}>{hint}</Text>
      </View>
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
  body: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxl, alignItems: 'center' },
  clock: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: Colors.skySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  h2: { fontSize: 20, fontWeight: '800', color: Colors.ink, letterSpacing: -0.4 },
  sub: {
    fontSize: 14,
    color: Colors.muted,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: Spacing.sm,
    maxWidth: 300,
  },
  summary: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
  sr: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 13, gap: Spacing.lg },
  srBorder: { borderBottomWidth: 1, borderBottomColor: Colors.line },
  srK: { fontSize: 13, color: Colors.muted },
  srV: { fontSize: 13.5, fontWeight: '700', color: Colors.ink, flexShrink: 1 },
  steps: { alignSelf: 'stretch', marginTop: Spacing.xl },
  step: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center', paddingVertical: 11 },
  n: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E6EEF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nDone: { backgroundColor: Colors.brand },
  nNow: { backgroundColor: Colors.gold },
  nText: { fontSize: 12, fontWeight: '700', color: Colors.muted },
  stepLabel: { fontSize: 14, color: Colors.ink, fontWeight: '600' },
  stepHint: { fontSize: 11.5, color: Colors.muted, marginTop: 1 },
  footer: { padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.line, backgroundColor: '#fff' },
  btn: { backgroundColor: Colors.brand, borderRadius: Radius.md, padding: 17, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#AFC8DD' },
  btnText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  footnote: { fontSize: 11, color: Colors.muted, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 15 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,40,60,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  sentCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  sentTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: -0.3,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  sentPhrase: {
    fontSize: 14.5,
    fontStyle: 'italic',
    color: '#33434F',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: Spacing.lg,
  },
  sentInfo: {
    alignSelf: 'stretch',
    backgroundColor: Colors.skyTint,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginTop: Spacing.xl,
  },
  sentInfoText: { fontSize: 12.5, lineHeight: 18, color: '#2A4A5E', textAlign: 'center' },
  sentBtn: {
    alignSelf: 'stretch',
    backgroundColor: Colors.brand,
    borderRadius: Radius.md,
    padding: 15,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  sentBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
