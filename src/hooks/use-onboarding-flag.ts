import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/**
 * Flag de onboarding persistido en AsyncStorage, con clave versionada (ej.
 * "donar.tour.welcome.v1"): si el tour se rediseña, subir la versión lo
 * vuelve a mostrar a todos sin borrar nada a mano. AsyncStorage y no una
 * columna en `profiles` porque el Tour 1 corre ANTES de que exista cuenta
 * (ver `docs/PLAN-SONNET-2.md`, Bloque D).
 */
export function useOnboardingFlag(key: string) {
  const [seen, setSeen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(key).then((value) => {
      if (alive) {
        setSeen(value === '1');
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [key]);

  const markSeen = useCallback(() => {
    setSeen(true);
    AsyncStorage.setItem(key, '1');
  }, [key]);

  return { seen, loading, markSeen };
}
