import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '@/constants/donar-theme';
import { useCauses } from '@/store/causes-store';

/**
 * "Cómo funciona donAR" (Bloque F): volver a ver los tours desde el Perfil,
 * cuantas veces se quiera, sin cerrar sesión. No borra los flags de
 * AsyncStorage de los tours (siguen en visto): el replay corre por
 * `replayTour` en el store. El Tour 1 se re-muestra como modal desde
 * `_layout.tsx`; el Tour 2 vive superpuesto a los tabs (`(tabs)/_layout.tsx`),
 * así que su fila navega al feed antes de disparar el replay, para que el
 * primer paso ("el feed") tenga sentido visual.
 */
export default function ComoFuncionaScreen() {
  const router = useRouter();
  const { setReplayTour } = useCauses();

  const openWelcomeReplay = () => {
    setReplayTour('welcome');
    router.back();
  };

  const openAppTourReplay = () => {
    setReplayTour('app');
    router.navigate('/');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Cómo funciona donAR</Text>
      </View>

      <View style={styles.list}>
        <Pressable style={styles.row} onPress={openWelcomeReplay}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Ver la presentación</Text>
            <Text style={styles.rowSub}>La propuesta de valor de donAR, en 4 pasos.</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Pressable style={[styles.row, styles.rowSpaced]} onPress={openAppTourReplay}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Ver el recorrido por la app</Text>
            <Text style={styles.rowSub}>Dónde está cada cosa: el feed, pedir ayuda, ranking, actividad y perfil.</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </View>

      {/* Links a docs/terminos-y-condiciones.md y docs/privacidad.md: quedan
          para cuando estén publicados en una URL real (Épica 15.6/15.7, hoy
          no lo están). Lugar reservado, a propósito sin fila todavía. */}
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
  list: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 15,
  },
  rowSpaced: { marginTop: Spacing.md },
  rowTitle: { fontSize: 14.5, fontWeight: '600', color: Colors.ink },
  rowSub: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  chevron: { fontSize: 22, color: Colors.muted, fontWeight: '300' },
});
