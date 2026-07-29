import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/donar-theme';
import CurarScreen from '@/screens/curar-screen';
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
  const { isCurator, loading, viewAsDonor } = useCauses();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg }}>
        <ActivityIndicator color={Colors.brand} />
      </View>
    );
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
