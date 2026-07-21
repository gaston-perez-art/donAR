import { Tabs } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DonarTabBar } from '@/components/donar-tab-bar';

SplashScreen.hideAsync();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Tabs
        tabBar={() => <DonarTabBar />}
        screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="ranking" />
        <Tabs.Screen name="activity" />
        <Tabs.Screen name="profile" />
        <Tabs.Screen name="create" options={{ href: null }} />
        <Tabs.Screen name="explore" options={{ href: null }} />
      </Tabs>
    </SafeAreaProvider>
  );
}
