import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, formatARS, Radius, Spacing } from '@/constants/donar-theme';

export default function GraciasScreen() {
  const { amount, pending } = useLocalSearchParams<{ amount: string; pending?: string }>();
  const router = useRouter();
  const n = Number(amount) || 0;
  const isPending = pending === '1';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.center}>
        <View style={[styles.medal, isPending && styles.medalPending]}>
          <Text style={{ fontSize: 56 }}>{isPending ? '⏳' : '🏅'}</Text>
        </View>
        <Text style={styles.h2}>{isPending ? '¡Comprobante enviado!' : '¡Gracias por sumar!'}</Text>
        <Text style={styles.sub}>
          {isPending
            ? `Tu transferencia de ${formatARS(n)} quedó registrada. El beneficiario va a confirmar que le llegó; ahí tu aporte suma a la meta y ganás tus puntos.`
            : `Tus ${formatARS(n)} ya están registrados en la causa y son visibles en el recorrido. Fuiste parte de algo real.`}
        </Text>
      </View>

      <View style={styles.footer}>
        {!isPending && (
          <Pressable onPress={() => router.replace('/ranking')}>
            <Text style={styles.secondary}>Ver ranking de solidarios</Text>
          </Pressable>
        )}
        <Pressable style={styles.btn} onPress={() => router.replace('/')}>
          <Text style={styles.btnText}>Seguir ayudando</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  medal: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FDEFC7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  medalPending: { backgroundColor: Colors.skySoft },
  h2: { fontSize: 23, fontWeight: '800', color: Colors.ink, letterSpacing: -0.4, marginBottom: Spacing.sm },
  sub: { fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 21, maxWidth: 290 },
  footer: { padding: Spacing.lg, gap: Spacing.md, alignItems: 'center' },
  secondary: { color: Colors.brandDark, fontWeight: '700', fontSize: 14, padding: Spacing.sm },
  btn: {
    backgroundColor: Colors.brand,
    borderRadius: Radius.md,
    padding: 17,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  btnText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
});
