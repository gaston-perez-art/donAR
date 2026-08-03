import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { savePushToken } from '@/lib/supabase';

/**
 * Registra el push token del dispositivo apenas hay sesión (Épica 9.2:
 * avisar al beneficiado cuando le llega una transferencia pendiente, "el
 * momento cúspide", pedido de Gastón el 2 ago). Silencioso en cualquier
 * escenario donde el push real todavía no puede andar: sin EAS projectId
 * configurado (falta correr `eas init`, paso manual de Gastón), en
 * simulador/emulador (no dan token real), o si el usuario no dio permiso.
 * No rompe nada de la app si cualquiera de estas cosas falta.
 */
export function useRegisterPushToken(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      if (!Device.isDevice) return;

      const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
      if (!projectId) return;

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
        });
      }

      const existing = await Notifications.getPermissionsAsync();
      let status = existing.status;
      if (status !== 'granted') {
        const requested = await Notifications.requestPermissionsAsync();
        status = requested.status;
      }
      if (status !== 'granted' || cancelled) return;

      const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
      if (!cancelled && token) await savePushToken(token, Platform.OS);
    })().catch((err) => console.warn('useRegisterPushToken error:', err));

    return () => {
      cancelled = true;
    };
  }, [enabled]);
}
