import { Tabs } from 'expo-router';

import { DonarTabBar } from '@/components/donar-tab-bar';

export default function TabsLayout() {
  return (
    <Tabs tabBar={() => <DonarTabBar />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="ranking" />
      <Tabs.Screen name="activity" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}
