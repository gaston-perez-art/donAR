import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CauseCard } from '@/components/cause-card';
import { EmptyState } from '@/components/empty-state';
import { FeedSkeleton } from '@/components/skeleton';
import { useTabBarScroll } from '@/components/tab-bar-scroll';
import { Colors, initialsFor, Radius, Spacing, TabBarHeight } from '@/constants/donar-theme';
import { useAppTourTargets } from '@/store/app-tour-context';
import { useCauses } from '@/store/causes-store';

const STATUS_LABEL: Record<string, string> = {
  review: 'En revisión',
  needs_info: 'Te pedimos información',
  rejected: 'Rechazada',
  closed: 'Cerrada',
};

export default function FeedScreen() {
  const router = useRouter();
  const scroll = useTabBarScroll();
  const { causes, myCauses, loading, accountEmail, displayName, avatarUrl } = useCauses();
  const { setTarget } = useAppTourTargets();

  // Regla Instagram (29 jul, pedido de Gastón): el feed principal es para
  // DESCUBRIR causas de otros, no para volver a ver la tuya propia (ya la
  // conocés, la gestionás desde "Mis causas" en Perfil). Se excluye `mine`
  // de las listas de descubrimiento; "Tus causas" arriba sigue mostrando el
  // trámite en curso (review/needs_info/rechazada), que sí importa ver acá.
  const active = causes.filter((c) => c.status === 'active' && !c.mine);
  const completed = causes.filter((c) => c.status === 'completed' && !c.mine);
  const myPending = myCauses.filter((c) => c.status !== 'active' && c.status !== 'completed');
  const myActiveCount = myCauses.filter((c) => c.status === 'active').length;
  const initials = initialsFor(displayName || accountEmail);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.appbar}>
        <Text style={styles.brand}>
          <Text style={styles.brandDon}>Don</Text>
          <Text style={styles.brandAr}>AR</Text>
        </Text>
        <Pressable style={styles.avatar} onPress={() => router.navigate('/profile')}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImg} cachePolicy="memory-disk" />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={scroll?.onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: TabBarHeight + Spacing.xl }}>
        {myPending.length > 0 && (
          <>
            <View style={styles.sec}>
              <Text style={styles.secTitle}>Tus causas</Text>
              <Text style={styles.secSub}>Así va tu trámite de verificación</Text>
            </View>
            {myPending.map((c) => (
              <Pressable
                key={c.id}
                style={styles.myCauseCard}
                onPress={() => router.push(`/cause/${c.id}`)}>
                <Text style={styles.myCauseTitle} numberOfLines={1}>
                  {c.title}
                </Text>
                <View style={[styles.myCausePill, c.status === 'rejected' && styles.myCausePillBad]}>
                  <Text
                    style={[styles.myCausePillText, c.status === 'rejected' && styles.myCausePillTextBad]}>
                    {STATUS_LABEL[c.status] ?? c.status}
                  </Text>
                </View>
              </Pressable>
            ))}
          </>
        )}

        <View ref={(node) => setTarget('feed', node)} style={styles.sec}>
          <Text style={styles.secTitle}>Causas verificadas cerca tuyo</Text>
          <Text style={styles.secSub}>Cada causa fue revisada antes de publicarse</Text>
        </View>

        {loading && <FeedSkeleton />}

        {active.map((cause) => (
          <CauseCard key={cause.id} cause={cause} onPress={() => router.push(`/cause/${cause.id}`)} />
        ))}

        {!loading && active.length === 0 && (
          myActiveCount > 0 ? (
            <EmptyState
              title="Tu causa ya está publicada"
              subtitle="Compartila para que llegue a más gente. Acá vas a ver las causas de otros a medida que se publiquen."
            />
          ) : (
            <EmptyState
              title="Todavía no hay causas"
              subtitle="Tocá el + para crear la primera y probála de punta a punta."
            />
          )
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
    overflow: 'hidden',
  },
  avatarImg: { width: 40, height: 40 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sec: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md, paddingTop: Spacing.xs },
  secTitle: { fontSize: 17, fontWeight: '700', color: Colors.ink, letterSpacing: -0.3 },
  secSub: { fontSize: 12.5, color: Colors.muted, marginTop: 2 },
  myCauseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    padding: Spacing.lg,
  },
  myCauseTitle: { fontSize: 14, fontWeight: '600', color: Colors.ink, flex: 1 },
  myCausePill: { backgroundColor: '#FDEFC7', borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  myCausePillBad: { backgroundColor: '#FBE9E9' },
  myCausePillText: { fontSize: 11, fontWeight: '700', color: '#8A6D00' },
  myCausePillTextBad: { color: '#C0392B' },
});
