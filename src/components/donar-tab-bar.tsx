import { BlurView } from 'expo-blur';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/donar-theme';

type TabItem = { label: string; icon: string; path: string };

const LEFT: TabItem[] = [
  { label: 'Inicio', icon: '🏠', path: '/' },
  { label: 'Ranking', icon: '🏆', path: '/ranking' },
];
const RIGHT: TabItem[] = [
  { label: 'Actividad', icon: '🔔', path: '/activity' },
  { label: 'Perfil', icon: '👤', path: '/profile' },
];

/**
 * Tab bar de "vidrio" (frosted glass) al estilo iOS 26 / Instagram, con un +
 * central. Flota sobre el contenido (position:absolute) para que el feed
 * scrollee por detrás y el blur tenga algo que difuminar; sin eso el efecto
 * no se ve. Las pantallas reservan TabBarHeight abajo para no quedar tapadas.
 *
 * Paridad iOS/Android: en iOS el blur es nativo; en Android hace falta
 * experimentalBlurMethod="dimezisBlurView" o el blur no renderiza (queda solo
 * el tinte). Esta es la aproximación con blur; el Liquid Glass nativo real
 * (expo-glass-effect, iOS 26, refracción + brillos) se suma cuando el
 * proyecto pase a build nativo, con este blur como fallback para Android.
 */
export function DonarTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const isActive = (path: string) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path);

  const goTo = (path: string) => router.navigate(path as never);

  const renderTab = (t: TabItem) => {
    const active = isActive(t.path);
    return (
      <Pressable key={t.path} style={styles.tab} onPress={() => goTo(t.path)}>
        <Text style={styles.icon}>{t.icon}</Text>
        <Text style={[styles.label, active && styles.labelActive]}>{t.label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <BlurView
          intensity={40}
          tint="light"
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
        {/* Tinte translúcido sobre el blur: da el color "vidrio esmerilado" y
            asegura contraste de los labels sin tapar del todo lo de atrás. */}
        <View style={styles.tint} pointerEvents="none" />

        {LEFT.map(renderTab)}

        <Pressable style={styles.plusWrap} onPress={() => goTo('/create')}>
          <View style={styles.plus}>
            <Text style={styles.plusText}>+</Text>
          </View>
        </Pressable>

        {RIGHT.map(renderTab)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.7)',
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  icon: { fontSize: 21 },
  label: { fontSize: 10.5, color: Colors.muted },
  labelActive: { color: Colors.brand, fontWeight: '600' },
  plusWrap: { flex: 1, alignItems: 'center' },
  plus: {
    width: 50,
    height: 50,
    borderRadius: 18,
    marginTop: -22,
    backgroundColor: Colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.brand,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  plusText: { color: '#fff', fontSize: 30, fontWeight: '600', marginTop: -2 },
});
