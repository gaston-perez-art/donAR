import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CauseCard } from '@/components/cause-card';
import { Colors, Spacing, TabBarHeight } from '@/constants/donar-theme';
import { useCauses } from '@/store/causes-store';

export default function FeedScreen() {
  const router = useRouter();
  const { causes, loading } = useCauses();

  const active = causes.filter((c) => c.status === 'active');
  const completed = causes.filter((c) => c.status === 'completed');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.appbar}>
        <Text style={styles.brand}>
          <Text style={styles.brandDon}>Don</Text>
          <Text style={styles.brandAr}>AR</Text>
        </Text>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>GP</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: TabBarHeight + Spacing.xl }}>
        <View style={styles.sec}>
          <Text style={styles.secTitle}>Causas verificadas cerca tuyo</Text>
          <Text style={styles.secSub}>Cada causa fue revisada antes de publicarse</Text>
        </View>

        {active.map((cause) => (
          <CauseCard
            key={cause.id}
            cause={cause}
            mine={cause.mine}
            onPress={() => router.push(`/cause/${cause.id}`)}
          />
        ))}

        {!loading && active.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💙</Text>
            <Text style={styles.emptyTitle}>Todavía no hay causas</Text>
            <Text style={styles.emptySub}>Tocá el + para crear la primera y probála de punta a punta.</Text>
          </View>
        )}

        {completed.length > 0 && (
          <>
            <View style={styles.sec}>
              <Text style={styles.secTitle}>Lo lograron 🎉</Text>
              <Text style={styles.secSub}>Causas que llegaron a la meta</Text>
            </View>
            {completed.map((cause) => (
              <CauseCard
                key={cause.id}
                cause={cause}
                onPress={() => router.push(`/cause/${cause.id}`)}
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  appbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  brand: { fontSize: 24, fontWeight: '800', letterSpacing: -1 },
  brandDon: { color: Colors.brand },
  brandAr: { color: Colors.sky },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sec: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md, paddingTop: Spacing.xs },
  secTitle: { fontSize: 17, fontWeight: '700', color: Colors.ink, letterSpacing: -0.3 },
  secSub: { fontSize: 12.5, color: Colors.muted, marginTop: 2 },
  empty: { alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xxl },
  emptyEmoji: { fontSize: 44, marginBottom: Spacing.md },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.ink },
  emptySub: {
    fontSize: 13,
    color: Colors.muted,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 19,
    maxWidth: 260,
  },
});
