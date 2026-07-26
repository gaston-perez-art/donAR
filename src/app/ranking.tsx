import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing, TabBarHeight } from '@/constants/donar-theme';
import { supabase } from '@/lib/supabase';
import { useCauses, type RankingEntry } from '@/store/causes-store';

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function currentMonthLabel(): string {
  const now = new Date();
  return `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function RankingScreen() {
  const router = useRouter();
  const { getMonthlyRanking } = useCauses();
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [registered, setRegistered] = useState<boolean | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setLoading(true);
      supabase.auth.getUser().then(({ data }) => {
        if (alive) setRegistered(!data.user?.is_anonymous);
      });
      getMonthlyRanking().then((r) => {
        if (alive) {
          setRanking(r);
          setLoading(false);
        }
      });
      return () => {
        alive = false;
      };
    }, [getMonthlyRanking]),
  );

  const myEntry = ranking.find((e) => e.isMe);
  const myPosition = myEntry ? ranking.indexOf(myEntry) + 1 : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Text style={styles.title}>Ranking mensual</Text>
        <Text style={styles.sub}>Las personas más solidarias de {currentMonthLabel()}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.brand} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: TabBarHeight + Spacing.xl }}>
          {registered === false && (
            <Pressable style={styles.joinCard} onPress={() => router.push('/profile')}>
              <Text style={styles.joinEmoji}>🏆</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.joinTitle}>Sumá tu mail para entrar al ranking</Text>
                <Text style={styles.joinSub}>
                  Vinculá tu mail desde Perfil y tus aportes empiezan a sumar puntos con tu nombre.
                </Text>
              </View>
              <Text style={styles.joinChevron}>›</Text>
            </Pressable>
          )}

          {ranking.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🏅</Text>
              <Text style={styles.emptyTitle}>Todavía no hay puntajes este mes</Text>
              <Text style={styles.emptySub}>
                Sé la primera persona en aparecer: doná a una causa y sumá tus primeros puntos.
              </Text>
            </View>
          ) : (
            ranking.map((entry, i) => {
              const position = i + 1;
              return (
                <View key={entry.donorId} style={[styles.row, entry.isMe && styles.rowMe]}>
                  <View style={styles.posWrap}>
                    {position <= 3 ? (
                      <Text style={styles.medal}>{MEDALS[position - 1]}</Text>
                    ) : (
                      <Text style={styles.pos}>{position}</Text>
                    )}
                  </View>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{entry.name.slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.name, entry.isMe && styles.nameMe]} numberOfLines={1}>
                    {entry.name}
                    {entry.isMe ? ' (vos)' : ''}
                  </Text>
                  <Text style={styles.points}>{entry.points} pts</Text>
                </View>
              );
            })
          )}

          {registered && myPosition === null && ranking.length > 0 && (
            <Text style={styles.footNote}>
              Todavía no sumaste puntos este mes. Doná a una causa para entrar al ranking.
            </Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  head: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.lg },
  title: { fontSize: 24, fontWeight: '800', color: Colors.ink, letterSpacing: -0.5 },
  sub: { fontSize: 13, color: Colors.muted, marginTop: 3 },
  joinCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.skyTint,
    borderRadius: Radius.md,
    padding: Spacing.lg,
  },
  joinEmoji: { fontSize: 26 },
  joinTitle: { fontSize: 14, fontWeight: '700', color: Colors.ink },
  joinSub: { fontSize: 12, color: Colors.muted, marginTop: 3, lineHeight: 17 },
  joinChevron: { fontSize: 26, color: Colors.brand, fontWeight: '300' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderRadius: Radius.md,
  },
  rowMe: { backgroundColor: Colors.skySoft },
  posWrap: { width: 30, alignItems: 'center' },
  pos: { fontSize: 15, fontWeight: '800', color: Colors.muted },
  medal: { fontSize: 22 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.skySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Colors.brandDark, fontWeight: '800', fontSize: 13 },
  name: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.ink },
  nameMe: { color: Colors.brandDark, fontWeight: '800' },
  points: { fontSize: 14.5, fontWeight: '800', color: Colors.brandDark },
  footNote: {
    fontSize: 12.5,
    color: Colors.muted,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    lineHeight: 18,
  },
  empty: { alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xxl },
  emptyEmoji: { fontSize: 44, marginBottom: Spacing.md },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.ink, textAlign: 'center' },
  emptySub: {
    fontSize: 13,
    color: Colors.muted,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 19,
    maxWidth: 280,
  },
});
