import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
import { Animated, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

/**
 * Canal compartido para el "shrink on scroll" de la tab bar (estilo iOS 26 /
 * Instagram): al deslizar hacia abajo la pill se achica y se corre, al subir
 * o al llegar arriba vuelve. La barra vive en (tabs)/_layout y los scrolls en
 * cada pantalla, así que necesitan un valor común: este contexto expone un
 * `Animated.Value` (0 = expandida, 1 = achicada) y el handler de scroll.
 *
 * Usa el Animated nativo de RN (no reanimated) a propósito: no depende del
 * plugin de babel de worklets (que no está configurado en este proyecto) y con
 * useNativeDriver la animación corre igual en el hilo nativo. La detección de
 * dirección corre en JS pero solo dispara la animación, no la maneja frame a
 * frame, así que se mantiene fluida.
 */
type Ctx = {
  progress: Animated.Value;
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

const TabBarScrollContext = createContext<Ctx | null>(null);

// Umbrales: cuánto hay que deslizar para disparar, y a partir de qué offset
// consideramos que ya no estás "arriba de todo".
const DELTA = 6;
const TOP = 8;

export function TabBarScrollProvider({ children }: { children: ReactNode }) {
  const progress = useRef(new Animated.Value(0)).current;
  const lastY = useRef(0);
  const shrunk = useRef(false);

  const value = useMemo<Ctx>(() => {
    const setShrunk = (want: boolean) => {
      if (want === shrunk.current) return;
      shrunk.current = want;
      Animated.timing(progress, {
        toValue: want ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    };

    return {
      progress,
      onScroll: (e) => {
        const y = e.nativeEvent.contentOffset.y;
        const dy = y - lastY.current;
        lastY.current = y;
        if (y <= TOP) setShrunk(false);
        else if (dy > DELTA) setShrunk(true);
        else if (dy < -DELTA) setShrunk(false);
      },
    };
  }, [progress]);

  return <TabBarScrollContext.Provider value={value}>{children}</TabBarScrollContext.Provider>;
}

export function useTabBarScroll() {
  return useContext(TabBarScrollContext);
}
