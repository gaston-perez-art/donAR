import { Tabs } from 'expo-router';

import { AppTourOverlay } from '@/components/app-tour-overlay';
import { DonarTabBar } from '@/components/donar-tab-bar';
import { TabBarScrollProvider } from '@/components/tab-bar-scroll';
import { AppTourProvider } from '@/store/app-tour-context';

export default function TabsLayout() {
  return (
    <TabBarScrollProvider>
      <AppTourProvider>
        <Tabs tabBar={() => <DonarTabBar />} screenOptions={{ headerShown: false }}>
          <Tabs.Screen name="index" />
          <Tabs.Screen name="ranking" />
          <Tabs.Screen name="activity" />
          <Tabs.Screen name="profile" />
          <Tabs.Screen name="explore" options={{ href: null }} />
        </Tabs>
        {/* Tour 2 (Bloque E): coach marks sobre la app real. Vive acá, no en
            _layout.tsx raíz, porque necesita a los tabs y a la tab bar ya
            montados para poder medir sus elementos reales. */}
        <AppTourOverlay />
      </AppTourProvider>
    </TabBarScrollProvider>
  );
}
