import { Tabs } from 'expo-router';

import { DonarTabBar } from '@/components/donar-tab-bar';
import { TabBarScrollProvider } from '@/components/tab-bar-scroll';

export default function TabsLayout() {
  return (
    <TabBarScrollProvider>
      <Tabs tabBar={() => <DonarTabBar />} screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="ranking" />
        <Tabs.Screen name="activity" />
        <Tabs.Screen name="profile" />
        <Tabs.Screen name="explore" options={{ href: null }} />
      </Tabs>
    </TabBarScrollProvider>
  );
}
