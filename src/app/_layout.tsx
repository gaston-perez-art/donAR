import * as Linking from 'expo-linking';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/donar-theme';
import AuthScreen from '@/screens/auth-screen';
import CurarScreen from '@/screens/curar-screen';
import ResetPasswordScreen from '@/screens/reset-password-screen';
import { CausesProvider, useCauses } from '@/store/causes-store';

SplashScreen.hideAsync();

/**
 * Decide qué ve cada identidad. Un curador entra directo al panel de
 * curaduría por default: son dos trabajos distintos, no se mezclan en la
 * misma navegación. "Cerrar sesión" ahí adentro vuelve acá con una sesión
 * anónima nueva y muestra la app normal.
 *
 * Caso real (Gastón, 29 jul): la MISMA cuenta puede ser curador y además
 * dueño/beneficiado de una causa propia. "Ver como donante" (dentro de
 * CurarScreen) prende `viewAsDonor` y muestra la app normal sin cerrar
 * sesión; "Volver al panel de curador" (en Perfil) lo apaga.
 *
 * Los tabs viven en (tabs)/_layout.tsx. Acá arriba hay un Stack real (no
 * Tabs con href:null) para que create/cobro/review/cause/donate/transfer/
 * gracias se empujen como pantallas nativas: gesto de swipe para volver en
 * iOS y botón/gesto de retroceso del sistema en Android, las dos plataformas
 * por igual (antes ninguna de las dos tenía navegación nativa acá).
 */
function AppShell() {
  const { isCurator, loading, viewAsDonor, isAuthenticated, passwordRecovery, beginPasswordRecovery } = useCauses();

  // Deep link de "olvidé mi contraseña" (10.2): el mail manda a esta app con
  // los tokens de recuperación en la URL. beginPasswordRecovery valida que
  // sea justo ese tipo de link (no hace nada con cualquier otra URL, como el
  // retorno de Mercado Pago). Cubre tanto la app ya abierta (evento 'url')
  // como recién abierta desde el link (getInitialURL).
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) beginPasswordRecovery(url);
    });
    const sub = Linking.addEventListener('url', ({ url }) => beginPasswordRecovery(url));
    return () => sub.remove();
  }, [beginPasswordRecovery]);

  if (loading) {
    // Mismo azul y mismo asset (símbolo + wordmark) que el splash nativo del
    // arranque (app.json): continúa la pantalla en vez de cortar a blanco,
    // pedido de Gastón ("para eso la hicimos"). SplashScreen.hideAsync() ya
    // se disparó, así que sin esto había un salto azul -> blanco.
    return (
      <View style={styles.loadingScreen}>
        <Image source={require('../../assets/images/splash-icon.png')} style={styles.loadingSplash} />
        <ActivityIndicator color="#fff" style={styles.loadingSpinner} />
      </View>
    );
  }

  // Sesión de recuperación activa: va ANTES que el chequeo de autenticación
  // (setSession con los tokens del link ya deja `isAuthenticated` en true,
  // pero no hay que soltar a la persona en la app sin que elija la pass nueva).
  if (passwordRecovery) {
    return <ResetPasswordScreen />;
  }

  // Sin cuenta, nada de app: la identidad es obligatoria (todo se ata a un
  // usuario que persiste). Ver auth-screen.tsx.
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  if (isCurator && !viewAsDonor) {
    return <CurarScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="create" />
      <Stack.Screen name="cobro" />
      <Stack.Screen name="review" />
      <Stack.Screen name="cause/[id]" />
      <Stack.Screen name="donate/[id]" />
      <Stack.Screen name="transfer/[id]" />
      <Stack.Screen name="donated" />
      <Stack.Screen name="received" />
      {/* Pantalla de éxito: terminal. Sin swipe-back a la donación ya cerrada
          (como cualquier confirmación de iOS). Se sale por sus botones. */}
      <Stack.Screen name="gracias" options={{ gestureEnabled: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <CausesProvider>
        <StatusBar style="dark" />
        <AppShell />
      </CausesProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.brand },
  loadingSplash: { width: 220, height: 220, resizeMode: 'contain' },
  loadingSpinner: { marginTop: Spacing.lg },
});
