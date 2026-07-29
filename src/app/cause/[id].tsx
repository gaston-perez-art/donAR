import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, formatARS, Radius, Spacing } from '@/constants/donar-theme';
import { getReceiptUrl } from '@/lib/supabase';
import { useCauses, type Contribution } from '@/store/causes-store';

const STATUS_COPY: Record<string, { title: string; sub: string }> = {
  review: {
    title: 'Tu causa está en revisión',
    sub: 'Un curador está verificando tu identidad, tu documentación y tu cuenta de cobro.',
  },
  needs_info: {
    title: 'Te pedimos más información',
    sub: 'Contactanos por el medio que usaste para crear la causa y reenviá lo que falta.',
  },
  rejected: {
    title: 'Tu causa fue rechazada',
    sub: '',
  },
};

export default function CauseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getCause, getContributions, resubmitCause, reviewTransfer } = useCauses();
  const cause = getCause(String(id));
  const [contribs, setContribs] = useState<Contribution[]>([]);
  const [resubmitting, setResubmitting] = useState(false);
  const [heroWidth, setHeroWidth] = useState(0);
  const [activeImage, setActiveImage] = useState(0);
  const [receiptUrls, setReceiptUrls] = useState<Record<string, string | null>>({});
  const [reviewing, setReviewing] = useState<string | null>(null);

  useEffect(() => {
    if (id) getContributions(String(id)).then(setContribs);
  }, [id, getContributions, cause?.raised]);

  // El dueño ve el comprobante de cada transferencia pendiente (URL firmada).
  useEffect(() => {
    const pend = contribs.filter((c) => c.status === 'pending' && c.receiptPath);
    if (!cause?.mine || pend.length === 0) return;
    let alive = true;
    Promise.all(pend.map(async (c) => [c.id, await getReceiptUrl(c.receiptPath!)] as const)).then(
      (entries) => {
        if (alive) setReceiptUrls((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
      },
    );
    return () => {
      alive = false;
    };
  }, [contribs, cause?.mine]);

  const reviewPending = async (contributionId: string, approve: boolean) => {
    if (reviewing) return;
    setReviewing(contributionId);
    const ok = await reviewTransfer(contributionId, approve);
    setReviewing(null);
    if (ok && id) getContributions(String(id)).then(setContribs);
  };

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
  const pending = cause.mine && cause.status !== 'active' && cause.status !== 'completed';
  // Acá abajo (pasado el early return de pending) `mine` = causa propia ya
  // publicada: se muestra el panel del creador, no la vista de donante.
  const isOwner = !!cause.mine;

  const resubmit = async () => {
    if (resubmitting) return;
    setResubmitting(true);
    await resubmitCause(cause.id);
    setResubmitting(false);
  };

  const shareCause = async () => {
    if (!cause) return;
    await Share.share({
      message: `Ayudá a "${cause.title}" en DonAR. Cada aporte queda verificado y a la vista. 💙`,
    });
  };

  if (pending) {
    const copy = STATUS_COPY[cause.status] ?? STATUS_COPY.review;
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.back} onPress={() => router.back()}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.title}>Tu causa</Text>
        </View>
        <ScrollView contentContainerStyle={styles.pendingBody}>
          <Text style={{ fontSize: 44 }}>{cause.status === 'rejected' ? '✕' : '⏳'}</Text>
          <Text style={styles.h2}>{copy.title}</Text>
          {copy.sub ? <Text style={styles.pendingSub}>{copy.sub}</Text> : null}
          {cause.reviewNote ? (
            <View style={styles.noteCard}>
              <Text style={styles.noteLabel}>Mensaje del curador</Text>
              <Text style={styles.noteText}>{cause.reviewNote}</Text>
            </View>
          ) : null}
        </ScrollView>
        {cause.status === 'needs_info' && (
          <View style={[styles.cta, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
            <Pressable style={styles.btn} onPress={resubmit} disabled={resubmitting}>
              <Text style={styles.btnText}>{resubmitting ? 'Enviando...' : 'Reenviar a revisión'}</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>{isOwner ? 'Tu causa' : 'Detalle de la causa'}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        <View
          style={[styles.hero, { backgroundColor: cause.coverTint }]}
          onLayout={(e) => setHeroWidth(e.nativeEvent.layout.width)}>
          {cause.imageUrls.length > 0 && heroWidth > 0 && (
            <ScrollView
              horizontal
              pagingEnabled
              scrollEnabled={cause.imageUrls.length > 1}
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                if (!heroWidth) return;
                setActiveImage(Math.round(e.nativeEvent.contentOffset.x / heroWidth));
              }}
              style={StyleSheet.absoluteFill}>
              {cause.imageUrls.map((uri, i) => (
                <Image key={i} source={{ uri }} style={{ width: heroWidth, height: 200 }} resizeMode="cover" />
              ))}
            </ScrollView>
          )}
          <View style={styles.badge}>
            <View style={[styles.tick, done && { backgroundColor: Colors.happy }]}>
              <Text style={styles.tickText}>✓</Text>
            </View>
            <Text style={styles.badgeText}>{done ? 'Meta alcanzada' : 'Causa verificada por DonAR'}</Text>
          </View>
          {cause.imageUrls.length === 0 && <Text style={styles.heroEmoji}>{cause.emoji}</Text>}
          {cause.imageUrls.length > 1 && (
            <View style={styles.heroDots}>
              {cause.imageUrls.map((_, i) => (
                <View key={i} style={[styles.heroDot, i === activeImage && styles.heroDotActive]} />
              ))}
            </View>
          )}
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
              {isOwner
                ? 'Compartí tu causa para que llegue a más gente. Cada aporte que recibas aparece acá abajo.'
                : 'Verificamos identidad y documentación. Cada aporte queda registrado y a la vista, acá abajo.'}
            </Text>
          </View>

          {isOwner &&
            (() => {
              const pending = contribs.filter((c) => c.status === 'pending');
              if (pending.length === 0) return null;
              return (
                <View style={styles.pendBlock}>
                  <Text style={styles.secTitle}>Transferencias por confirmar</Text>
                  <Text style={styles.pendHint}>
                    Confirmá solo las que realmente te llegaron. Al confirmar, el aporte suma a tu meta.
                  </Text>
                  {pending.map((c) => (
                    <View key={c.id} style={styles.pendCard}>
                      <View style={styles.pendTop}>
                        <Text style={styles.pendName} numberOfLines={1}>
                          {c.name}
                        </Text>
                        <Text style={styles.pendAmt}>{formatARS(c.amount)}</Text>
                      </View>
                      {c.message ? <Text style={styles.msg}>“{c.message}”</Text> : null}
                      {receiptUrls[c.id] ? (
                        <Image source={{ uri: receiptUrls[c.id]! }} style={styles.pendReceipt} resizeMode="cover" />
                      ) : (
                        <View style={styles.pendReceiptLoading}>
                          <ActivityIndicator color={Colors.brand} />
                        </View>
                      )}
                      <View style={styles.pendActions}>
                        <Pressable
                          style={[styles.pendBtn, styles.pendReject]}
                          disabled={reviewing === c.id}
                          onPress={() => reviewPending(c.id, false)}>
                          <Text style={styles.pendRejectText}>No me llegó</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.pendBtn, styles.pendConfirm]}
                          disabled={reviewing === c.id}
                          onPress={() => reviewPending(c.id, true)}>
                          <Text style={styles.pendConfirmText}>
                            {reviewing === c.id ? '...' : 'Me llegó, confirmar'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              );
            })()}

          <Text style={styles.secTitle}>{isOwner ? 'Aportes recibidos' : 'Aportes recientes'}</Text>
          {(() => {
            // Solo aportes confirmados (los pending viven en el bloque de arriba).
            const shown = contribs.filter((c) => c.status === 'approved');
            if (shown.length === 0) {
              return (
                <Text style={styles.muted}>
                  {isOwner
                    ? 'Todavía no recibiste aportes confirmados. Compartí tu causa para que empiecen a llegar.'
                    : 'Todavía no hay aportes. Sé la primera persona en ayudar.'}
                </Text>
              );
            }
            return shown.map((c) => (
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
            ));
          })()}
        </View>
      </ScrollView>

      <View style={[styles.cta, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
        {isOwner ? (
          <Pressable style={[styles.btn, styles.btnShare]} onPress={shareCause}>
            <Text style={styles.btnText}>Compartir mi causa</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.btn} onPress={() => router.push(`/donate/${cause.id}`)}>
            <Text style={styles.btnText}>Donar a esta causa</Text>
          </Pressable>
        )}
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
  pendingBody: { alignItems: 'center', padding: Spacing.xl, paddingTop: Spacing.xxl },
  h2: { fontSize: 20, fontWeight: '800', color: Colors.ink, letterSpacing: -0.4, marginTop: Spacing.lg, textAlign: 'center' },
  pendingSub: {
    fontSize: 14,
    color: Colors.muted,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: Spacing.sm,
    maxWidth: 300,
  },
  noteCard: {
    alignSelf: 'stretch',
    backgroundColor: Colors.skyTint,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginTop: Spacing.xl,
  },
  noteLabel: { fontSize: 11.5, fontWeight: '700', color: Colors.brandDark, marginBottom: 4 },
  noteText: { fontSize: 13.5, color: '#2A4A5E', lineHeight: 19 },
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
  heroDots: {
    position: 'absolute',
    bottom: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  heroDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: 'rgba(255,255,255,0.55)' },
  heroDotActive: { backgroundColor: '#fff' },
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
  pendBlock: { marginBottom: Spacing.lg },
  pendHint: { fontSize: 12, color: Colors.muted, marginBottom: Spacing.md, lineHeight: 17 },
  pendCard: {
    borderWidth: 1,
    borderColor: '#F0D9A6',
    backgroundColor: '#FEF9EE',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  pendTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  pendName: { fontSize: 14, fontWeight: '700', color: Colors.ink, flex: 1 },
  pendAmt: { fontSize: 15, fontWeight: '800', color: Colors.ink },
  pendReceipt: { width: '100%', height: 200, borderRadius: Radius.sm, marginTop: Spacing.sm },
  pendReceiptLoading: {
    width: '100%',
    height: 200,
    borderRadius: Radius.sm,
    marginTop: Spacing.sm,
    backgroundColor: Colors.skyTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  pendBtn: { flex: 1, borderRadius: Radius.sm, paddingVertical: 13, alignItems: 'center' },
  pendReject: { backgroundColor: '#FBE9E9' },
  pendRejectText: { color: '#C0392B', fontWeight: '700', fontSize: 13 },
  pendConfirm: { backgroundColor: Colors.happy },
  pendConfirmText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  cta: { padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.line, backgroundColor: '#fff' },
  btn: { backgroundColor: Colors.brand, borderRadius: Radius.md, padding: 17, alignItems: 'center' },
  btnShare: { backgroundColor: Colors.ink },
  btnText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
});
