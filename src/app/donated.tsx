import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { causeInitial, Colors, formatARS, Radius, Spacing } from '@/constants/donar-theme';
import { hoursUntilAutoConfirm, useCauses, type MyContribution } from '@/store/causes-store';

/** 3.4: "recién te lo confirmaron" vs. un aporte viejo ya aprobado. Ver la
 * misma lógica en activity.tsx. */
function isRecentlyConfirmed(c: MyContribution): boolean {
  if (c.status !== 'approved' || !c.confirmedAt) return false;
  const waited = new Date(c.confirmedAt).getTime() - new Date(c.createdAt).getTime();
  const sinceConfirmed = Date.now() - new Date(c.confirmedAt).getTime();
  return waited > 3600_000 && sinceConfirmed < 3 * 86400000;
}

export default function DonatedScreen() {
  const router = useRouter();
  const { getMyActivity } = useCauses();
  const [contributions, setContributions] = useState<MyContribution[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getMyActivity().then((a) => {
        if (alive) setContributions(a.contributions);
      });
      return () => {
        alive = false;
      };
    }, [getMyActivity]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Lo que donaste</Text>
      </View>

      {!contributions ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.brand} />
        </View>
      ) : contributions.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            title="Todavía no donaste a ninguna causa."
            actionLabel="Ver causas"
            onAction={() => router.navigate('/')}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {contributions.map((c) => {
            const justConfirmed = isRecentlyConfirmed(c);
            const statusLabel =
              c.status === 'pending'
                ? `Por confirmar · se confirma sola en ${hoursUntilAutoConfirm(c.createdAt)} hs`
                : justConfirmed
                  ? '✓ Te lo confirmaron'
                  : c.causeStatus === 'completed'
                    ? 'Meta cumplida 🎉'
                    : c.causeStatus === 'closed'
                      ? 'Se cerró sin llegar'
                      : 'En curso';
            const thanks = c.thankYouMessage ?? c.causeClosingMessage;
            return (
              <Pressable
                key={c.id}
                style={[styles.row, justConfirmed && styles.rowHappy]}
                onPress={() => router.push(`/cause/${c.causeId}`)}>
                <View style={[styles.rowIcon, { backgroundColor: c.causeTint }]}>
                  <Text style={styles.rowIconInitial}>{causeInitial(c.causeTitle)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {c.causeTitle}
                  </Text>
                  <Text style={[styles.rowSub, justConfirmed && styles.rowSubHappy]}>{statusLabel}</Text>
                  {thanks ? (
                    <Text style={styles.rowThanks} numberOfLines={2}>
                      “{thanks}”
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.rowAmt}>+{formatARS(c.amount)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 22, color: Colors.ink },
  title: { fontSize: 16, fontWeight: '700', color: Colors.ink },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  list: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
  },
  rowIcon: { width: 42, height: 42, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  rowIconInitial: { color: Colors.brandDark, fontWeight: '700', fontSize: 15 },
  rowHappy: { backgroundColor: '#F0FBF5' },
  rowTitle: { fontSize: 14.5, fontWeight: '600', color: Colors.ink },
  rowSub: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  rowSubHappy: { color: Colors.happy, fontWeight: '700' },
  rowThanks: { fontSize: 12, color: Colors.brandDark, fontStyle: 'italic', marginTop: 3, lineHeight: 16 },
  rowAmt: { fontSize: 14.5, fontWeight: '800', color: Colors.brandDark },
});
