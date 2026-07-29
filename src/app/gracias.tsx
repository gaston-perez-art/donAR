import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, formatARS, Radius, Spacing } from '@/constants/donar-theme';
import { useCauses } from '@/store/causes-store';

// Alias de cobro de donAR para el aporte voluntario.
const DONAR_ALIAS = 'gastonmartinp';

export default function GraciasScreen() {
  const { amount, pending, cause } = useLocalSearchParams<{
    amount: string;
    pending?: string;
    cause?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { recordPlatformSupport } = useCauses();
  const n = Number(amount) || 0;
  const isPending = pending === '1';
  const [supported, setSupported] = useState(false);

  const copyAlias = async () => {
    await Clipboard.setStringAsync(DONAR_ALIAS);
    Alert.alert('Copiado', 'El alias de donAR quedó en el portapapeles.');
  };

  const markSupported = async () => {
    setSupported(true);
    await recordPlatformSupport(cause);
  };

  // Salir de la pantalla terminal: cerramos todo el flujo de donación
  // (cause/donate/transfer/gracias) y aterrizamos limpio en el tab destino.
  const leaveTo = useCallback(
    (tab: '/' | '/ranking') => {
      if (router.canDismiss()) router.dismissAll();
      router.navigate(tab);
    },
    [router],
  );

  // Paridad con iOS (que ya bloquea el swipe-back vía gestureEnabled:false):
  // en Android, el botón/gesto de retroceso del sistema tampoco debe volver
  // al formulario de donación ya cerrado. Lo redirigimos a la salida limpia.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        leaveTo('/');
        return true;
      });
      return () => sub.remove();
    }, [leaveTo]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
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

        {/* Aporte voluntario a la plataforma (opcional). El 100% del aporte a la
            causa va al beneficiado; donAR no cobra comisión. */}
        <View style={styles.support}>
          <Text style={styles.supportEmoji}>💙</Text>
          <Text style={styles.supportTitle}>Bancá el proyecto (opcional)</Text>
          <Text style={styles.supportText}>
            donAR es gratis y no cobramos comisión: el 100% de tu aporte fue a la causa. Si querés que
            sigamos construyendo la mejor app solidaria, dejanos vos un aporte a voluntad.
          </Text>
          <Pressable style={styles.aliasBox} onPress={copyAlias}>
            <Text style={styles.aliasLabel}>Alias de donAR</Text>
            <Text style={styles.alias}>{DONAR_ALIAS}</Text>
            <Text style={styles.copy}>Copiar</Text>
          </Pressable>
          {supported ? (
            <Text style={styles.supportedMsg}>¡Gracias por bancarnos! 💙</Text>
          ) : (
            <Pressable onPress={markSupported}>
              <Text style={styles.supportedBtn}>Ya aporté a donAR</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
        {!isPending && (
          <Pressable onPress={() => leaveTo('/ranking')}>
            <Text style={styles.secondary}>Ver ranking de solidarios</Text>
          </Pressable>
        )}
        <Pressable style={styles.btn} onPress={() => leaveTo('/')}>
          <Text style={styles.btnText}>Seguir ayudando</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.xl },
  center: { alignItems: 'center' },
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
  h2: { fontSize: 23, fontWeight: '800', color: Colors.ink, letterSpacing: -0.4, marginBottom: Spacing.sm, textAlign: 'center' },
  sub: { fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 21, maxWidth: 290 },
  support: {
    marginTop: Spacing.xxl,
    backgroundColor: Colors.skyTint,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  supportEmoji: { fontSize: 26 },
  supportTitle: { fontSize: 15.5, fontWeight: '800', color: Colors.ink, marginTop: 6 },
  supportText: { fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 19, marginTop: 6, maxWidth: 320 },
  aliasBox: {
    alignSelf: 'stretch',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: Colors.brand,
    borderRadius: Radius.md,
    padding: 14,
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  aliasLabel: { fontSize: 11, color: Colors.muted, fontWeight: '600' },
  alias: { fontSize: 18, fontWeight: '800', color: Colors.ink, marginTop: 2 },
  copy: { fontSize: 12.5, fontWeight: '700', color: Colors.brandDark, marginTop: 4 },
  supportedBtn: { fontSize: 13, fontWeight: '700', color: Colors.brandDark, marginTop: Spacing.md, padding: Spacing.sm },
  supportedMsg: { fontSize: 13.5, fontWeight: '700', color: Colors.happy, marginTop: Spacing.md },
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
