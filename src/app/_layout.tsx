import { Tabs } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DonarTabBar } from '@/components/donar-tab-bar';
import { Colors } from '@/constants/donar-theme';
import CurarScreen from '@/screens/curar-screen';
import { CausesProvider, useCauses } from '@/store/causes-store';

SplashScreen.hideAsync();

/**
 * Decide qué ve cada identidad. Un curador entra directo al panel de
 * curaduría y no ve nada más: son dos trabajos distintos, no se mezclan en
 * la misma navegación. "Cerrar sesión" ahí adentro vuelve acá con una
 * sesión anónima nueva y muestra la app normal.
 */
function AppShell() {
  const { isCurator, loading } = useCauses();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg }}>
        <ActivityIndicator color={Colors.brand} />
      </View>
    );
  }

  if (isCurator) {
    return <CurarScreen />;
  }

  return (
    <Tabs tabBar={() => <DonarTabBar />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="ranking" />
      <Tabs.Screen name="activity" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="create" options={{ href: null }} />
      <Tabs.Screen name="cobro" options={{ href: null }} />
      <Tabs.Screen name="review" options={{ href: null }} />
      <Tabs.Screen name="cause/[id]" options={{ href: null }} />
      <Tabs.Screen name="donate/[id]" options={{ href: null }} />
      <Tabs.Screen name="transfer/[id]" options={{ href: null }} />
      <Tabs.Screen name="gracias" options={{ href: null }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
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
