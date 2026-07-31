import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/donar-theme';

type Props = {
  width: number | `${number}%`;
  height: number;
  radius?: number;
};

/**
 * Bloque gris con pulso suave, para siluetas de carga (Épica 8.6). Usa el
 * `Animated` nativo de RN, NO `react-native-reanimated`: el proyecto lo
 * descartó a propósito porque no hay `babel.config.js` que confirme el
 * plugin de worklets (mismo precedente que `tab-bar-scroll.tsx`).
 */
export function Skeleton({ width, height, radius = Radius.sm }: Props) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[styles.block, { width, height, borderRadius: radius, opacity }]} />;
}

/** Silueta de `CauseCard`: portada, título, barra de progreso, montos. */
function CauseCardSkeleton() {
  return (
    <View style={cardStyles.card}>
      <Skeleton width="100%" height={180} radius={Radius.lg} />
      <View style={cardStyles.body}>
        <Skeleton width="72%" height={16} radius={4} />
        <View style={{ height: Spacing.sm }} />
        <Skeleton width="45%" height={12} radius={4} />
        <View style={{ height: Spacing.md }} />
        <Skeleton width="100%" height={8} radius={20} />
        <View style={cardStyles.amounts}>
          <Skeleton width={92} height={14} radius={4} />
          <Skeleton width={70} height={12} radius={4} />
        </View>
      </View>
    </View>
  );
}

/** Feed: 2 tarjetas fantasma, es la pantalla más vista. */
export function FeedSkeleton() {
  return (
    <View>
      <CauseCardSkeleton />
      <CauseCardSkeleton />
    </View>
  );
}

/** Perfil: avatar redondo + línea de nombre + pill de nivel + 2 stat cards. */
export function ProfileSkeleton() {
  return (
    <View style={profileStyles.wrap}>
      <View style={profileStyles.head}>
        <Skeleton width={58} height={58} radius={29} />
        <View style={{ flex: 1 }}>
          <Skeleton width="55%" height={20} radius={4} />
          <View style={{ height: Spacing.sm }} />
          <Skeleton width={110} height={22} radius={Radius.pill} />
        </View>
      </View>
      <View style={profileStyles.statsRow}>
        <View style={{ flex: 1 }}>
          <Skeleton width="100%" height={86} radius={Radius.md} />
        </View>
        <View style={{ flex: 1 }}>
          <Skeleton width="100%" height={86} radius={Radius.md} />
        </View>
      </View>
    </View>
  );
}

function RankingRowSkeleton() {
  return (
    <View style={rowStyles.rankingRow}>
      <Skeleton width={40} height={40} radius={20} />
      <View style={{ flex: 1 }}>
        <Skeleton width="55%" height={14} radius={4} />
        <View style={{ height: Spacing.xs }} />
        <Skeleton width="30%" height={11} radius={4} />
      </View>
    </View>
  );
}

/** Ranking: 5 filas con círculo y dos líneas. */
export function RankingSkeleton() {
  return (
    <View>
      {[0, 1, 2, 3, 4].map((i) => (
        <RankingRowSkeleton key={i} />
      ))}
    </View>
  );
}

function ActivityRowSkeleton() {
  return (
    <View style={rowStyles.activityRow}>
      <Skeleton width={40} height={40} radius={Radius.sm} />
      <View style={{ flex: 1 }}>
        <Skeleton width="70%" height={13.5} radius={4} />
        <View style={{ height: Spacing.xs }} />
        <Skeleton width="40%" height={11.5} radius={4} />
      </View>
    </View>
  );
}

/** Actividad: 4 filas con círculo y dos líneas. */
export function ActivitySkeleton() {
  return (
    <View>
      {[0, 1, 2, 3].map((i) => (
        <ActivityRowSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: Colors.line },
});

const cardStyles = StyleSheet.create({
  card: { marginHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  body: { paddingTop: Spacing.md, paddingHorizontal: Spacing.xs },
  amounts: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
});

const profileStyles = StyleSheet.create({
  wrap: { paddingTop: Spacing.md },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  statsRow: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.xl },
});

const rowStyles = StyleSheet.create({
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.line,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
});
