import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, formatARS, Radius, Spacing } from '@/constants/donar-theme';
import { useCauses, type Contribution } from '@/store/causes-store';

export default function CauseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getCause, getContributions } = useCauses();
  const cause = getCause(String(id));
  const [contribs, setContribs] = useState<Contribution[]>([]);

  useEffect(() => {
    if (id) getContributions(String(id)).then(setContribs);
  }, [id, getContributions, cause?.raised]);

  if (!cause) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.back} onPress={() => router.back()}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.title}>Causa</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.muted}>No se encontró la causa.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const pct = Math.min(100, Math.round((cause.raised / cause.goal) * 100));
  const done = cause.status === 'completed';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Detalle de la causa</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={[styles.hero, { backgroundColor: cause.coverTint }]}>
          <View style={styles.badge}>
            <View style={[styles.tick, done && { backgroundColor: Colors.happy }]}>
              <Text style={styles.tickText}>✓</Text>
            </View>
            <Text style={styles.badgeText}>{done ? 'Meta alcanzada' : 'Causa verificada por DonAR'}</Text>
          </View>
          <Text style={styles.heroEmoji}>{cause.emoji}</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.causeTitle}>{cause.title}</Text>
          <Text style={styles.who}>{cause.who}</Text>

          <View style={styles.track}>
            <View style={[styles.fill, { width: `${pct}%`, backgroundColor: done ? Colors.happy : Colors.brand }]} />
          </View>
          <View style={styles.statRow}>
            <Text style={styles.raised}>{formatARS(cause.raised)}</Text>
            <Text style={styles.goal}>
              meta {formatARS(cause.goal)}
              {'\n'}
              {done ? 'cumplida' : `${cause.daysLeft} días restantes`}
            </Text>
          </View>

          {cause.story ? <Text style={styles.story}>{cause.story}</Text> : null}

          <View style={styles.trust}>
            <View style={styles.trustB}>
              <Text style={{ color: '#fff', fontSize: 13 }}>✓</Text>
            </View>
            <Text style={styles.trustText}>
              Verificamos identidad y documentación. Cada aporte queda registrado y a la vista, acá abajo.
            </Text>
          </View>

          <Text style={styles.secTitle}>Aportes recientes</Text>
          {contribs.length === 0 ? (
            <Text style={styles.muted}>Todavía no hay aportes. Sé la primera persona en ayudar.</Text>
          ) : (
            contribs.map((c) => (
              <View key={c.id} style={styles.row}>
                <View style={styles.dot}>
                  <Text style={styles.dotText}>{c.name.slice(0, 2).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{c.name}</Text>
                  {c.message ? <Text style={styles.msg}>“{c.message}”</Text> : null}
                </View>
                <Text style={styles.amt}>+{formatARS(c.amount)}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={styles.cta}>
        <Pressable style={styles.btn} onPress={() => router.push(`/donate/${cause.id}`)}>
          <Text style={styles.btnText}>Donar a esta causa</Text>
        </Pressable>
      </View>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: Colors.muted, fontSize: 13.5, lineHeight: 20 },
  hero: { height: 200, padding: Spacing.md, justifyContent: 'flex-start' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  tick: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.verified,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  badgeText: { color: Colors.brandDark, fontSize: 11.5, fontWeight: '700' },
  heroEmoji: { position: 'absolute', bottom: 16, right: 18, fontSize: 58 },
  body: { padding: Spacing.xl },
  causeTitle: { fontSize: 20, fontWeight: '800', color: Colors.ink, letterSpacing: -0.3, lineHeight: 26 },
  who: { fontSize: 13, color: Colors.muted, marginTop: 8, marginBottom: 16 },
  track: { height: 11, borderRadius: 20, backgroundColor: '#EDF2F6', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 20 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  raised: { fontSize: 20, fontWeight: '800', color: Colors.ink },
  goal: { fontSize: 12.5, color: Colors.muted, textAlign: 'right', lineHeight: 18 },
  story: { fontSize: 14.5, lineHeight: 23, color: '#33434F', marginTop: 18 },
  trust: {
    flexDirection: 'row',
    gap: 11,
    alignItems: 'flex-start',
    backgroundColor: Colors.skySoft,
    borderRadius: Radius.md,
    padding: 14,
    marginVertical: 16,
  },
  trustB: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.verified,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: '#2A4A5E' },
  secTitle: { fontSize: 17, fontWeight: '700', color: Colors.ink, marginTop: 6, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
  },
  dot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.skySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: { color: Colors.brandDark, fontWeight: '700', fontSize: 12 },
  name: { fontSize: 14, fontWeight: '600', color: Colors.ink },
  msg: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  amt: { fontWeight: '800', fontSize: 14.5, color: Colors.brandDark },
  cta: { padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.line, backgroundColor: '#fff' },
  btn: { backgroundColor: Colors.brand, borderRadius: Radius.md, padding: 17, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
});
