import { Tabs } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DonarTabBar } from '@/components/donar-tab-bar';
import { CausesProvider } from '@/store/causes-store';

SplashScreen.hideAsync();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <CausesProvider>
        <StatusBar style="dark" />
        <Tabs tabBar={() => <DonarTabBar />} screenOptions={{ headerShown: false }}>
          <Tabs.Screen name="index" />
          <Tabs.Screen name="ranking" />
          <Tabs.Screen name="activity" />
          <Tabs.Screen name="profile" />
          <Tabs.Screen name="create" options={{ href: null }} />
          <Tabs.Screen name="cobro" options={{ href: null }} />
          <Tabs.Screen name="review" options={{ href: null }} />
          <Tabs.Screen name="explore" options={{ href: null }} />
        </Tabs>
      </CausesProvider>
    </SafeAreaProvider>
  );
}
