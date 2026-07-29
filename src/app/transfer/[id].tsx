import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, formatARS, Radius, Spacing } from '@/constants/donar-theme';
import { useCauses, type Payout } from '@/store/causes-store';

export default function TransferScreen() {
  const { id, amount, message, anon } = useLocalSearchParams<{
    id: string;
    amount: string;
    message?: string;
    anon?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getCause, getPayout, submitTransfer } = useCauses();

  const cause = getCause(String(id));
  const n = Number(amount) || 0;
  const [payout, setPayout] = useState<Payout>(null);
  const [loading, setLoading] = useState(true);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    getPayout(String(id)).then((p) => {
      if (alive) {
        setPayout(p);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [id, getPayout]);

  const copyAlias = async () => {
    if (!payout) return;
    await Clipboard.setStringAsync(payout.alias);
    Alert.alert('Copiado', 'El alias quedó en el portapapeles.');
  };

  const pickReceipt = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Necesitamos acceso a tus fotos',
        'Sin permiso no podemos subir el comprobante. Activalo desde Ajustes del celular > DonAR > Fotos.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (result.canceled || !result.assets[0]) return;
    setReceiptUri(result.assets[0].uri);
  };

  const confirm = async () => {
    if (submitting || !receiptUri) return;
    setSubmitting(true);
    const ok = await submitTransfer(String(id), n, message ?? '', anon === '1', receiptUri);
    setSubmitting(false);
    if (ok) {
      router.replace(`/gracias?amount=${n}&pending=1&cause=${id}`);
    } else {
      Alert.alert('No pudimos registrar tu transferencia', 'Probá de nuevo en un momento.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Transferir yo mismo</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.brand} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.h3}>
            Transferí {formatARS(n)}
            {cause ? ` a ${cause.title}` : ''}
          </Text>

          {/* Paso 1: destino */}
          <View style={styles.step}>
            <Text style={styles.stepLabel}>1. Transferí a este alias</Text>
            {payout ? (
              <Pressable style={styles.aliasBox} onPress={copyAlias}>
                <Text style={styles.alias}>{payout.alias}</Text>
                <Text style={styles.copy}>Copiar</Text>
              </Pressable>
            ) : (
              <Text style={styles.muted}>
                Esta causa todavía no cargó su alias de cobro. Probá con Mercado Pago o volvé más tarde.
              </Text>
            )}
            <Text style={styles.helper}>
              La plata va directo a la cuenta del beneficiado. DonAR no la toca.
            </Text>
          </View>

          {/* Paso 2: comprobante */}
          <View style={styles.step}>
            <Text style={styles.stepLabel}>2. Subí el comprobante</Text>
            <Pressable style={styles.upload} onPress={pickReceipt}>
              {receiptUri ? (
                <Image source={{ uri: receiptUri }} style={styles.receipt} resizeMode="cover" />
              ) : (
                <>
                  <Text style={styles.uploadIcon}>📎</Text>
                  <Text style={styles.uploadText}>Tocá para elegir la captura de la transferencia</Text>
                </>
              )}
            </Pressable>
            {receiptUri ? <Text style={styles.helperOk}>Comprobante listo. Toqué de nuevo para cambiarlo.</Text> : null}
          </View>

          <View style={styles.info}>
            <Text style={styles.infoText}>
              Tu aporte queda pendiente hasta que el beneficiado confirme que le llegó. Recién ahí suma
              a la meta y ganás tus puntos.
            </Text>
          </View>
        </ScrollView>
      )}

      <View style={[styles.cta, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
        <Pressable
          style={[styles.btn, (!receiptUri || submitting || !payout) && styles.btnDisabled]}
          disabled={!receiptUri || submitting || !payout}
          onPress={confirm}>
          <Text style={styles.btnText}>{submitting ? 'Enviando...' : 'Ya transferí, enviar comprobante'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  body: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxl },
  h3: { fontSize: 18, fontWeight: '800', color: Colors.ink, letterSpacing: -0.3, marginVertical: Spacing.md },
  muted: { color: Colors.muted, fontSize: 13.5, lineHeight: 20 },
  step: { marginTop: Spacing.lg },
  stepLabel: { fontSize: 13, fontWeight: '700', color: Colors.ink, marginBottom: Spacing.sm },
  aliasBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: Colors.brand,
    backgroundColor: Colors.skySoft,
    borderRadius: Radius.md,
    padding: 15,
  },
  alias: { fontSize: 16, fontWeight: '800', color: Colors.ink, flex: 1 },
  copy: { fontSize: 13, fontWeight: '700', color: Colors.brandDark },
  helper: { fontSize: 11.5, color: Colors.muted, marginTop: Spacing.sm, lineHeight: 16 },
  helperOk: { fontSize: 11.5, color: Colors.happy, marginTop: Spacing.sm, fontWeight: '600' },
  upload: {
    borderWidth: 1.6,
    borderColor: '#B9D3E8',
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    padding: 24,
    alignItems: 'center',
    backgroundColor: Colors.skyTint,
    overflow: 'hidden',
  },
  uploadIcon: { fontSize: 30, marginBottom: Spacing.sm },
  uploadText: { fontSize: 13, color: Colors.muted, textAlign: 'center' },
  receipt: { width: '100%', height: 180, borderRadius: Radius.sm },
  info: {
    backgroundColor: Colors.skySoft,
    borderRadius: Radius.md,
    padding: 14,
    marginTop: Spacing.xl,
  },
  infoText: { fontSize: 12.5, lineHeight: 18, color: '#2A4A5E' },
  cta: { padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.line, backgroundColor: '#fff' },
  btn: { backgroundColor: Colors.brand, borderRadius: Radius.md, padding: 17, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#AFC8DD' },
  btnText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
});
