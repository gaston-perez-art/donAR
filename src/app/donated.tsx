import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, formatARS, Radius, Spacing } from '@/constants/donar-theme';
import { hoursUntilAutoConfirm, useCauses, type MyContribution } from '@/store/causes-store';

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
          <Text style={styles.emptyEmoji}>💙</Text>
          <Text style={styles.emptyText}>Todavía no donaste a ninguna causa.</Text>
          <Pressable style={styles.emptyBtn} onPress={() => router.navigate('/')}>
            <Text style={styles.emptyBtnText}>Ver causas</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {contributions.map((c) => {
            const statusLabel =
              c.status === 'pending'
                ? `Por confirmar · se confirma sola en ${hoursUntilAutoConfirm(c.createdAt)} hs`
                : c.causeStatus === 'completed'
                  ? 'Meta cumplida 🎉'
                  : c.causeStatus === 'closed'
                    ? 'Se cerró sin llegar'
                    : 'En curso';
            const thanks = c.thankYouMessage ?? c.causeClosingMessage;
            return (
              <Pressable key={c.id} style={styles.row} onPress={() => router.push(`/cause/${c.causeId}`)}>
                <View style={[styles.rowIcon, { backgroundColor: c.causeTint }]}>
                  <Text style={{ fontSize: 18 }}>{c.causeEmoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {c.causeTitle}
                  </Text>
                  <Text style={styles.rowSub}>{statusLabel}</Text>
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
  emptyEmoji: { fontSize: 34 },
  emptyText: { fontSize: 14, color: Colors.muted, marginTop: 10, marginBottom: 16, textAlign: 'center' },
  emptyBtn: { backgroundColor: Colors.brand, borderRadius: Radius.md, paddingHorizontal: 22, paddingVertical: 12 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
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
  rowTitle: { fontSize: 14.5, fontWeight: '600', color: Colors.ink },
  rowSub: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  rowThanks: { fontSize: 12, color: Colors.brandDark, fontStyle: 'italic', marginTop: 3, lineHeight: 16 },
  rowAmt: { fontSize: 14.5, fontWeight: '800', color: Colors.brandDark },
});
