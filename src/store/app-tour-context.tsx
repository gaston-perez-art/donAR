import { createContext, useCallback, useContext, useRef, type ReactNode } from 'react';
import type { View } from 'react-native';

/**
 * Registro de los elementos reales que el Tour 2 (Bloque E) tiene que
 * iluminar. El feed vive en `(tabs)/index.tsx`; los 4 targets de la tab bar
 * viven en `donar-tab-bar.tsx`, un componente persistente que no se remonta
 * al cambiar de tab. `measureInWindow` necesita el nodo nativo real, no una
 * posición calculada a mano (la tab bar es justo el ejemplo de por qué:
 * flota, tiene blur/tinte, y su alto no alcanza para deducir la posición
 * exacta de cada ícono).
 */
export type TourTargetKey = 'feed' | 'tabPlus' | 'tabRanking' | 'tabActivity' | 'tabProfile';

type Ctx = {
  setTarget: (key: TourTargetKey, node: View | null) => void;
  getTarget: (key: TourTargetKey) => View | null;
};

const AppTourContext = createContext<Ctx | null>(null);

export function AppTourProvider({ children }: { children: ReactNode }) {
  // Ref, no estado: registrar un target no debe disparar un re-render, el
  // overlay lo consulta activamente cuando necesita medir un paso.
  const targets = useRef<Partial<Record<TourTargetKey, View | null>>>({});

  const setTarget = useCallback((key: TourTargetKey, node: View | null) => {
    targets.current[key] = node;
  }, []);

  const getTarget = useCallback((key: TourTargetKey): View | null => targets.current[key] ?? null, []);

  return <AppTourContext.Provider value={{ setTarget, getTarget }}>{children}</AppTourContext.Provider>;
}

export function useAppTourTargets() {
  const ctx = useContext(AppTourContext);
  if (!ctx) throw new Error('useAppTourTargets debe usarse dentro de AppTourProvider');
  return ctx;
}
