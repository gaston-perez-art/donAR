import { useRef, useState } from 'react';
import {
  Dimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '@/constants/donar-theme';

type Slide = { title: string; subtitle: string };

/** Copy del pitch de Gastón, ya cerrado. El slide 3 es el que diferencia a
 * donAR de cualquier otra plataforma: no acortar ni mover de lugar. */
const SLIDES: Slide[] = [
  {
    title: 'Ayudar sin intermediarios',
    subtitle:
      'donAR conecta a quien quiere ayudar con quien lo necesita. Sin fundaciones en el medio, sin comisiones que se coman una parte.',
  },
  {
    title: 'Contá lo que necesitás',
    subtitle:
      'Publicás tu necesidad con tu historia, cuánto necesitás y para qué. No hace falta ser una ONG ni tener una institución atrás.',
  },
  {
    title: 'Un curador la revisa antes de que salga',
    subtitle:
      'Ninguna causa se publica sola. Una persona verifica la documentación y la historia, para que del otro lado sepan que lo que leen es real.',
  },
  {
    title: 'Ves a dónde fue cada peso',
    subtitle:
      'Donás directo a la persona y cada aporte confirmado queda a la vista con su comprobante. La confianza es el producto.',
  },
];

const SCREEN_WIDTH = Dimensions.get('window').width;

type Props = {
  /** Marca el tour como visto y cierra, tanto desde "Saltar" como desde el
   * final. Mismo prop en el Tour 2 para servir al replay desde "Cómo
   * funciona" (Bloque F), no solo al primer ingreso. */
  onClose: () => void;
};

/**
 * Tour 1: presentación de la propuesta de valor, antes del registro. La
 * renderiza `_layout.tsx` cuando todavía no se vio (AsyncStorage, ver
 * `use-onboarding-flag.ts`). Imágenes: placeholder del tamaño final hasta
 * que Gastón traiga las capturas reales de la app (Épica 13.2/16).
 */
export default function WelcomeTourScreen({ onClose }: Props) {
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const isLast = index === SLIDES.length - 1;

  // Trampa conocida del repo (27 jul, carrusel de fotos del feed): un
  // Pressable ancestro le compite el gesto al scroll horizontal. "Saltar" es
  // hermano del ScrollView, no lo envuelve.
  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH));
  };

  const goNext = () => {
    if (isLast) {
      onClose();
      return;
    }
    scrollRef.current?.scrollTo({ x: SCREEN_WIDTH * (index + 1), animated: true });
  };

  return (
    <View style={styles.safe}>
      <SafeAreaView style={styles.safeInner} edges={['top', 'bottom']}>
        <Pressable style={styles.skip} onPress={onClose} hitSlop={10}>
          <Text style={styles.skipText}>Saltar</Text>
        </Pressable>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}>
          {SLIDES.map((slide, i) => (
            <View key={i} style={[styles.slide, { width: SCREEN_WIDTH }]}>
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>Imagen de la app</Text>
              </View>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.subtitle}>{slide.subtitle}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        <Pressable style={styles.nextBtn} onPress={goNext}>
          <Text style={styles.nextBtnText}>{isLast ? 'Empezar' : 'Siguiente'}</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  safeInner: { flex: 1 },
  skip: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.lg,
    zIndex: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  skipText: { color: Colors.muted, fontWeight: '700', fontSize: 14 },
  slide: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl + Spacing.lg,
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 0.82,
    maxHeight: 360,
    borderRadius: Radius.xl,
    backgroundColor: Colors.skyTint,
    borderWidth: 1,
    borderColor: Colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxl,
  },
  imagePlaceholderText: { color: Colors.muted, fontSize: 13, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '800', color: Colors.ink, textAlign: 'center', letterSpacing: -0.3 },
  subtitle: {
    fontSize: 14.5,
    color: Colors.muted,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 21,
    maxWidth: 320,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 7, marginTop: Spacing.lg },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.line },
  dotActive: { backgroundColor: Colors.brand, width: 20 },
  nextBtn: {
    backgroundColor: Colors.brand,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 15.5 },
});
