import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { isDemoCurator, resetDemo, setDemoCurator } from '@/lib/supabase-demo';

/**
 * Barra de la demo pública: ver la app como donante o como curador, y volver
 * a los datos de ejemplo. Solo se monta con EXPO_PUBLIC_DEMO=1. En pantallas
 * anchas va afuera del marco del celular; en el celular, flotando abajo.
 */
export default function DemoBar() {
  const { width } = useWindowDimensions();
  const curator = isDemoCurator();
  const wide = width >= 760;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, wide ? styles.wide : styles.narrow]}>
      <View style={styles.bar}>
        <Text style={styles.label}>Demo</Text>
        <Pressable style={[styles.btn, !curator && styles.on]} onPress={() => curator && setDemoCurator(false)}>
          <Text style={[styles.txt, !curator && styles.txtOn]}>Donante</Text>
        </Pressable>
        <Pressable style={[styles.btn, curator && styles.on]} onPress={() => !curator && setDemoCurator(true)}>
          <Text style={[styles.txt, curator && styles.txtOn]}>Curador</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={resetDemo} accessibilityLabel="Volver a los datos de ejemplo">
          <Text style={styles.txt}>↺</Text>
        </Pressable>
      </View>
      {wide && (
        <Text style={styles.hint}>
          Datos de ejemplo guardados en tu navegador.{'\n'}Podés crear causas, donar y confirmar aportes.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', zIndex: 1000, alignItems: 'flex-end' },
  wide: { top: 16, right: 16 },
  narrow: { bottom: 104, alignSelf: 'center', left: 0, right: 0, alignItems: 'center' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 2, padding: 4, borderRadius: 999, backgroundColor: 'rgba(20,24,30,0.9)' },
  label: { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '600', paddingHorizontal: 8 },
  btn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  on: { backgroundColor: '#fff' },
  txt: { color: '#fff', fontSize: 12, fontWeight: '600' },
  txtOn: { color: '#111' },
  hint: { marginTop: 8, fontSize: 12, color: '#52606D', textAlign: 'right', lineHeight: 17 },
});
