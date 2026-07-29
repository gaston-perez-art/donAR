import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { usePathname, useRouter } from 'expo-router';
import { ComponentProps } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/donar-theme';
import { useTabBarScroll } from '@/components/tab-bar-scroll';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
type TabItem = { icon: IoniconName; iconOutline: IoniconName; label: string; path: string };

const LEFT: TabItem[] = [
  { icon: 'home', iconOutline: 'home-outline', label: 'Inicio', path: '/' },
  { icon: 'trophy', iconOutline: 'trophy-outline', label: 'Ranking', path: '/ranking' },
];
const RIGHT: TabItem[] = [
  { icon: 'notifications', iconOutline: 'notifications-outline', label: 'Actividad', path: '/activity' },
  { icon: 'person', iconOutline: 'person-outline', label: 'Perfil', path: '/profile' },
];

/**
 * Tab bar tipo "pill" flotante de vidrio (frosted glass), al estilo iOS 26 /
 * Instagram. Cinco slots parejos: los 4 íconos + el botón de crear (+) en el
 * centro, alineado horizontal con el resto (destacado por color, ya no
 * sobresale). Flota sobre el contenido (position:absolute) para que el feed
 * scrollee por detrás; las pantallas reservan TabBarHeight abajo.
 *
 * Shrink on scroll: se achica y se corre al deslizar hacia abajo, vuelve al
 * subir. El valor lo maneja TabBarScrollProvider (ver tab-bar-scroll.tsx); acá
 * solo se consume para animar el wrap con Animated nativo.
 *
 * Paridad iOS/Android SIN crashear: en iOS, blur nativo real (BlurView). En
 * Android NO se usa BlurView: el método de blur en runtime (dimezisBlurView)
 * es experimental y crashea durante las transiciones de pantalla (se veía la
 * causa en blanco al abrirla desde el feed). Android usa un vidrio translúcido
 * sólido (tinte más opaco), estable y visualmente coherente con la pill. El
 * blur real de Android se retoma con una vía estable en el build nativo (junto
 * al Liquid Glass nativo de iOS 26, expo-glass-effect). Vidrio claro por ahora;
 * theme claro/oscuro del sistema queda en el backlog (Épica 8).
 */
export function DonarTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scroll = useTabBarScroll();

  const isActive = (path: string) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path);

  const goTo = (path: string) => router.navigate(path as never);

  const renderTab = (t: TabItem) => {
    const active = isActive(t.path);
    return (
      <Pressable
        key={t.path}
        style={styles.tab}
        onPress={() => goTo(t.path)}
        accessibilityRole="tab"
        accessibilityLabel={t.label}
        accessibilityState={{ selected: active }}>
        <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
          <Ionicons
            name={active ? t.icon : t.iconOutline}
            size={23}
            color={active ? Colors.brand : Colors.muted}
          />
        </View>
      </Pressable>
    );
  };

  // Achica (scale), corre hacia abajo (translateY) y baja un toque la opacidad
  // al scrollear. Sin canal de scroll (no debería pasar), queda en su lugar.
  const p = scroll?.progress;
  const animStyle = p
    ? {
        opacity: p.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] }),
        transform: [
          { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) },
          { scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, 0.86] }) },
        ],
      }
    : null;

  return (
    <Animated.View
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }, animStyle]}
      pointerEvents="box-none">
      <View style={styles.pill}>
        {/* Capa de vidrio: redondeada y recortada, solo el fondo. En iOS, blur
            nativo. En Android, solo el tinte sólido (sin BlurView: el blur en
            runtime crashea en las transiciones). */}
        <View style={styles.glass}>
          {Platform.OS === 'ios' && (
            <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
          )}
          <View style={[styles.tint, Platform.OS === 'android' && styles.tintAndroid]} />
        </View>

        {/* Capa de contenido: 5 slots parejos, el + inline en el centro. */}
        <View style={styles.row}>
          {LEFT.map(renderTab)}

          <Pressable
            style={styles.tab}
            onPress={() => goTo('/create')}
            accessibilityRole="button"
            accessibilityLabel="Crear causa">
            <View style={styles.plus}>
              <Ionicons name="add" size={28} color="#fff" />
            </View>
          </Pressable>

          {RIGHT.map(renderTab)}
        </View>
      </View>
    </Animated.View>
  );
}

const PILL_HEIGHT = 62;
const RADIUS = 30;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  pill: {
    alignSelf: 'stretch',
    height: PILL_HEIGHT,
    // Sombra suave para despegar la pill del feed y que "flote". El
    // borderRadius va acá TAMBIÉN (no solo en `glass`, adentro): en Android
    // el elevation dibuja la sombra en base al borde de ESTA vista, y si no
    // tiene su propio radio la sombra sale cuadrada aunque el contenido se
    // vea redondeado.
    borderRadius: RADIUS,
    shadowColor: '#0B2A3A',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  glass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RADIUS,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.58)',
  },
  // Sin blur real detrás: subimos la opacidad para que la pill se lea como
  // vidrio esmerilado sólido (estable, no crashea).
  tintAndroid: { backgroundColor: 'rgba(248,251,253,0.94)' },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconWrap: {
    width: 44,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: { backgroundColor: 'rgba(74,144,226,0.14)' },
  // Botón de crear, inline con los íconos (alineado horizontal), destacado por
  // el color de marca. Ya no sobresale por encima de la pill.
  plus: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: Colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.brand,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
