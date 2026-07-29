import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTabBarScroll } from '@/components/tab-bar-scroll';
import { Colors, formatARS, Radius, Spacing, TabBarHeight } from '@/constants/donar-theme';
import {
  useCauses,
  type MyContribution,
  type PendingTransfer,
  type ReceivedContribution,
} from '@/store/causes-store';

/** Cuánto hace: "hoy", "ayer", "hace N días". Simple, sin librería de fechas. */
function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  return `hace ${days} días`;
}

type Data = {
  pending: PendingTransfer[];
  received: ReceivedContribution[];
  donated: MyContribution[];
};

export default function ActivityScreen() {
  const router = useRouter();
  const scroll = useTabBarScroll();
  const { getPendingTransfersForMyCauses, getReceivedContributions, getMyActivity } = useCauses();
  const [data, setData] = useState<Data | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      Promise.all([getPendingTransfersForMyCauses(), getReceivedContributions(), getMyActivity()]).then(
        ([pending, received, activity]) => {
          if (alive) setData({ pending, received, donated: activity.contributions });
        },
      );
      return () => {
        alive = false;
      };
    }, [getPendingTransfersForMyCauses, getReceivedContributions, getMyActivity]),
  );

  if (!data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.head}>
          <Text style={styles.title}>Actividad</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  // Causas que apoyé y que ya cerraron con un agradecimiento (puntual o general).
  // Es el aviso in-app del cierre (Épica 4.3): push real queda para el dev build.
  const thanked = data.donated.filter((d) => d.thankYouMessage || d.causeClosingMessage);

  const nothing = data.pending.length === 0 && data.received.length === 0 && data.donated.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Text style={styles.title}>Actividad</Text>
        <Text style={styles.sub}>Novedades de tus causas y tus aportes</Text>
      </View>

      {nothing ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🔔</Text>
          <Text style={styles.emptyText}>Todavía no hay novedades. Doná o creá una causa para arrancar.</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={scroll?.onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: TabBarHeight + Spacing.xl }}>
          {data.pending.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.secTitle}>Para revisar</Text>
              {data.pending.map((p) => (
                <Pressable
                  key={p.id}
                  style={[styles.row, styles.rowAlert]}
                  onPress={() => router.push(`/cause/${p.causeId}`)}>
                  <View style={[styles.rowIcon, { backgroundColor: p.causeTint }]}>
                    <Text style={{ fontSize: 18 }}>{p.causeEmoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {p.donorName} te transfirió a &quot;{p.causeTitle}&quot;
                    </Text>
                    <Text style={styles.rowSub}>Tocá para revisar el comprobante · {timeAgo(p.createdAt)}</Text>
                  </View>
                  <Text style={styles.rowAmt}>{formatARS(p.amount)}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {data.received.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.secTitle}>Te llegaron</Text>
              {data.received.map((r) => (
                <Pressable key={r.id} style={styles.row} onPress={() => router.push(`/cause/${r.causeId}`)}>
                  <View style={[styles.rowIcon, { backgroundColor: r.causeTint }]}>
                    <Text style={{ fontSize: 18 }}>{r.causeEmoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {r.donorName} donó a &quot;{r.causeTitle}&quot;
                    </Text>
                    <Text style={styles.rowSub}>{timeAgo(r.createdAt)}</Text>
                  </View>
                  <Text style={[styles.rowAmt, { color: Colors.happy }]}>+{formatARS(r.amount)}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {thanked.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.secTitle}>Te agradecieron</Text>
              {thanked.map((d) => (
                <Pressable
                  key={`thanks-${d.id}`}
                  style={[styles.row, styles.rowHappy]}
                  onPress={() => router.push(`/cause/${d.causeId}`)}>
                  <View style={[styles.rowIcon, { backgroundColor: d.causeTint }]}>
                    <Text style={{ fontSize: 18 }}>{d.causeEmoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      Cerraron &quot;{d.causeTitle}&quot; y te dejaron un mensaje
                    </Text>
                    <Text style={styles.rowSub} numberOfLines={2}>
                      “{d.thankYouMessage ?? d.causeClosingMessage}”
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {data.donated.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.secTitle}>Tus aportes</Text>
              {data.donated.map((d) => (
                <Pressable key={d.id} style={styles.row} onPress={() => router.push(`/cause/${d.causeId}`)}>
                  <View style={[styles.rowIcon, { backgroundColor: d.causeTint }]}>
                    <Text style={{ fontSize: 18 }}>{d.causeEmoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      Donaste a &quot;{d.causeTitle}&quot;
                    </Text>
                    <Text style={styles.rowSub}>{timeAgo(d.createdAt)}</Text>
                  </View>
                  <Text style={styles.rowAmt}>{formatARS(d.amount)}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  head: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm, paddingBottom: Spacing.lg },
  title: { fontSize: 22, fontWeight: '800', color: Colors.ink, letterSpacing: -0.4 },
  sub: { fontSize: 12.5, color: Colors.muted, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  emptyEmoji: { fontSize: 34, marginBottom: Spacing.sm },
  emptyText: { fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 20 },
  section: { marginBottom: Spacing.lg },
  secTitle: { fontSize: 15, fontWeight: '700', color: Colors.ink, marginBottom: Spacing.sm },
  row: {
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
  rowAlert: { borderColor: '#F0D9A6', backgroundColor: '#FEF9EE' },
  rowHappy: { borderColor: '#BEE8D3', backgroundColor: '#F0FBF5' },
  rowIcon: { width: 40, height: 40, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 13.5, fontWeight: '600', color: Colors.ink },
  rowSub: { fontSize: 11.5, color: Colors.muted, marginTop: 2 },
  rowAmt: { fontSize: 14, fontWeight: '800', color: Colors.brandDark },
});
