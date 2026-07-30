import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { Colors, formatARS, initialsFor, Radius, Spacing } from '@/constants/donar-theme';
import { useCauses, type ReceivedContribution } from '@/store/causes-store';

export default function ReceivedScreen() {
  const router = useRouter();
  const { getReceivedContributions } = useCauses();
  const [contributions, setContributions] = useState<ReceivedContribution[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getReceivedContributions().then((c) => {
        if (alive) setContributions(c);
      });
      return () => {
        alive = false;
      };
    }, [getReceivedContributions]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Lo que recibiste</Text>
      </View>

      {!contributions ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.brand} />
        </View>
      ) : contributions.length === 0 ? (
        <View style={styles.center}>
          <BrandMark size={64} />
          <Text style={styles.emptyText}>
            Todavía no recibiste aportes confirmados. Cuando alguien te done y lo confirmes, va a
            aparecer acá.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {contributions.map((c) => (
            <Pressable key={c.id} style={styles.row} onPress={() => router.push(`/cause/${c.causeId}`)}>
              {c.avatarUrl ? (
                <Image source={{ uri: c.avatarUrl }} style={styles.rowIcon} />
              ) : (
                <View style={[styles.rowIcon, { backgroundColor: Colors.skySoft }]}>
                  <Text style={styles.rowIconInitial}>{initialsFor(c.donorName)}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {c.causeTitle}
                </Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {c.donorName}
                  {c.message ? ` · "${c.message}"` : ''}
                </Text>
              </View>
              <Text style={styles.rowAmt}>+{formatARS(c.amount)}</Text>
            </Pressable>
          ))}
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
  emptyText: { fontSize: 14, color: Colors.muted, marginTop: 10, textAlign: 'center', lineHeight: 20 },
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
  rowTitle: { fontSize: 14.5, fontWeight: '600', color: Colors.ink },
  rowSub: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  rowAmt: { fontSize: 14.5, fontWeight: '800', color: Colors.happy },
});
