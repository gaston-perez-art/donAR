import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/donar-theme';

type TabItem = { label: string; icon: string; path: string };

const LEFT: TabItem[] = [
  { label: 'Inicio', icon: '🏠', path: '/' },
  { label: 'Ranking', icon: '🏆', path: '/ranking' },
];
const RIGHT: TabItem[] = [
  { label: 'Actividad', icon: '🔔', path: '/activity' },
  { label: 'Perfil', icon: '👤', path: '/profile' },
];

/** Custom 5-slot tab bar with a centered + button, matching the prototype. */
const HIDDEN_ON = ['/create', '/cobro', '/review', '/cause', '/donate', '/gracias'];

export function DonarTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Full-screen flows (create, cobro, review) hide the tab bar.
  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  const isActive = (path: string) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path);

  const goTo = (path: string) => router.navigate(path as never);

  const renderTab = (t: TabItem) => {
    const active = isActive(t.path);
    return (
      <Pressable key={t.path} style={styles.tab} onPress={() => goTo(t.path)}>
        <Text style={styles.icon}>{t.icon}</Text>
        <Text style={[styles.label, active && styles.labelActive]}>{t.label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {LEFT.map(renderTab)}

      <Pressable style={styles.plusWrap} onPress={() => goTo('/create')}>
        <View style={styles.plus}>
          <Text style={styles.plusText}>+</Text>
        </View>
      </Pressable>

      {RIGHT.map(renderTab)}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderTopWidth: 1,
    borderTopColor: Colors.line,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  icon: { fontSize: 21 },
  label: { fontSize: 10.5, color: Colors.muted },
  labelActive: { color: Colors.brand, fontWeight: '600' },
  plusWrap: { flex: 1, alignItems: 'center' },
  plus: {
    width: 50,
    height: 50,
    borderRadius: 18,
    marginTop: -22,
    backgroundColor: Colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.brand,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  plusText: { color: '#fff', fontSize: 30, fontWeight: '600', marginTop: -2 },
});
