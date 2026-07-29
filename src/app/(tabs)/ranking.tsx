import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTabBarScroll } from '@/components/tab-bar-scroll';
import { Colors, Radius, Spacing, TabBarHeight } from '@/constants/donar-theme';
import { levelFor, medalsFor } from '@/lib/gamification';
import { supabase } from '@/lib/supabase';
import { useCauses, type DonorProfile, type RankingEntry } from '@/store/causes-store';

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function currentMonthLabel(): string {
  const now = new Date();
  return `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
}

/** "Se sumó en marzo 2026", para el mini-perfil. */
function memberSinceLabel(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function RankingScreen() {
  const router = useRouter();
  const scroll = useTabBarScroll();
  const { getMonthlyRanking, getDonorProfile } = useCauses();
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [registered, setRegistered] = useState<boolean | null>(null);

  // Mini-perfil (29 jul, "estilo Airbnb" al tocar a alguien del ranking).
  const [selectedEntry, setSelectedEntry] = useState<RankingEntry | null>(null);
  const [donorProfile, setDonorProfile] = useState<DonorProfile | null>(null);
  const [loadingDonor, setLoadingDonor] = useState(false);

  const openDonor = (entry: RankingEntry) => {
    setSelectedEntry(entry);
    setDonorProfile(null);
    setLoadingDonor(true);
    getDonorProfile(entry.donorId).then((p) => {
      setDonorProfile(p);
      setLoadingDonor(false);
    });
  };

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
          onScroll={scroll?.onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: TabBarHeight + Spacing.xl }}>
          {registered === false && (
            <Pressable style={styles.joinCard} onPress={() => router.navigate('/profile')}>
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
                <Pressable
                  key={entry.donorId}
                  style={[styles.row, entry.isMe && styles.rowMe]}
                  onPress={() => openDonor(entry)}>
                  <View style={styles.posWrap}>
                    {position <= 3 ? (
                      <Text style={styles.medal}>{MEDALS[position - 1]}</Text>
                    ) : (
                      <Text style={styles.pos}>{position}</Text>
                    )}
                  </View>
                  <View style={styles.avatar}>
                    {entry.avatarUrl ? (
                      <Image source={{ uri: entry.avatarUrl }} style={styles.avatarImg} />
                    ) : (
                      <Text style={styles.avatarText}>{entry.name.slice(0, 2).toUpperCase()}</Text>
                    )}
                  </View>
                  <Text style={[styles.name, entry.isMe && styles.nameMe]} numberOfLines={1}>
                    {entry.name}
                    {entry.isMe ? ' (vos)' : ''}
                  </Text>
                  <Text style={styles.points}>{entry.points} pts</Text>
                </Pressable>
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

      <Modal
        visible={!!selectedEntry}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedEntry(null)}>
        <Pressable style={styles.backdrop} onPress={() => setSelectedEntry(null)}>
          <Pressable style={styles.donorCard} onPress={(e) => e.stopPropagation()}>
            {loadingDonor ? (
              <View style={styles.donorLoading}>
                <ActivityIndicator color={Colors.brand} />
              </View>
            ) : (
              <>
                <View style={styles.donorAvatarWrap}>
                  {(donorProfile?.avatarUrl ?? selectedEntry?.avatarUrl) ? (
                    <Image
                      source={{ uri: (donorProfile?.avatarUrl ?? selectedEntry?.avatarUrl)! }}
                      style={styles.donorAvatarImg}
                    />
                  ) : (
                    <Text style={styles.donorAvatarText}>
                      {(selectedEntry?.name ?? '?').slice(0, 2).toUpperCase()}
                    </Text>
                  )}
                </View>
                <Text style={styles.donorName}>
                  {selectedEntry?.name}
                  {selectedEntry?.isMe ? ' (vos)' : ''}
                </Text>
                {donorProfile && (
                  <>
                    <View style={styles.donorLevelPill}>
                      <Text style={styles.donorLevelPillText}>
                        Nivel {levelFor(donorProfile.causesSupported).number} ·{' '}
                        {levelFor(donorProfile.causesSupported).name}
                      </Text>
                    </View>
                    <Text style={styles.donorSince}>Se sumó en {memberSinceLabel(donorProfile.memberSince)}</Text>

                    <View style={styles.donorStatsRow}>
                      <View style={styles.donorStatItem}>
                        <Text style={styles.donorStatValue}>{selectedEntry?.points}</Text>
                        <Text style={styles.donorStatLabel}>puntos este mes</Text>
                      </View>
                      <View style={styles.donorStatDivider} />
                      <View style={styles.donorStatItem}>
                        <Text style={styles.donorStatValue}>{donorProfile.causesSupported}</Text>
                        <Text style={styles.donorStatLabel}>
                          {donorProfile.causesSupported === 1 ? 'causa apoyada' : 'causas apoyadas'}
                        </Text>
                      </View>
                      <View style={styles.donorStatDivider} />
                      <View style={styles.donorStatItem}>
                        <Text style={styles.donorStatValue}>{donorProfile.completedSupported}</Text>
                        <Text style={styles.donorStatLabel}>
                          {donorProfile.completedSupported === 1 ? 'meta cumplida' : 'metas cumplidas'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.donorMedalRow}>
                      {medalsFor(donorProfile).map((m) => (
                        <View key={m.key} style={[styles.donorMedal, !m.earned && styles.donorMedalLocked]}>
                          <Text style={[styles.donorMedalEmoji, !m.earned && styles.donorMedalEmojiLocked]}>
                            {m.emoji}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}

                <Pressable style={styles.donorClose} onPress={() => setSelectedEntry(null)}>
                  <Text style={styles.donorCloseText}>Cerrar</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
    overflow: 'hidden',
  },
  avatarImg: { width: 40, height: 40 },
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

  // Mini-perfil (modal "estilo Airbnb" al tocar a alguien del ranking)
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,40,60,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  donorCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  donorLoading: { height: 220, alignItems: 'center', justifyContent: 'center' },
  donorAvatarWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.skySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  donorAvatarImg: { width: 84, height: 84 },
  donorAvatarText: { color: Colors.brandDark, fontWeight: '800', fontSize: 26 },
  donorName: { fontSize: 19, fontWeight: '800', color: Colors.ink, letterSpacing: -0.3, textAlign: 'center' },
  donorLevelPill: {
    marginTop: 10,
    backgroundColor: Colors.skySoft,
    borderRadius: Radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 6,
  },
  donorLevelPillText: { color: Colors.brandDark, fontWeight: '700', fontSize: 12.5 },
  donorSince: { fontSize: 12, color: Colors.muted, marginTop: 8 },
  donorStatsRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    backgroundColor: Colors.skyTint,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.xl,
  },
  donorStatItem: { flex: 1, alignItems: 'center' },
  donorStatValue: { fontSize: 17, fontWeight: '800', color: Colors.ink },
  donorStatLabel: { fontSize: 10.5, color: Colors.muted, marginTop: 2, textAlign: 'center' },
  donorStatDivider: { width: 1, backgroundColor: Colors.line },
  donorMedalRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xl },
  donorMedal: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FDEFC7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donorMedalLocked: { backgroundColor: '#F1F4F7' },
  donorMedalEmoji: { fontSize: 20 },
  donorMedalEmojiLocked: { opacity: 0.3 },
  donorClose: {
    alignSelf: 'stretch',
    backgroundColor: Colors.brand,
    borderRadius: Radius.md,
    padding: 15,
    alignItems: 'center',
    marginTop: Spacing.xxl,
  },
  donorCloseText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
