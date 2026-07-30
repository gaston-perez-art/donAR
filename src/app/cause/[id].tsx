import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { causeInitial, Colors, formatARS, formatARSCompact, initialsFor, Radius, Spacing } from '@/constants/donar-theme';
import { getReceiptUrl } from '@/lib/supabase';
import { hoursUntilAutoConfirm, useCauses, type CauseThank, type Contribution } from '@/store/causes-store';

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

/** 3.5: cuántos aportes confirmados se muestran de entrada antes del "ver más". */
const CONTRIBS_PAGE_SIZE = 15;

/** Días entre dos fechas ISO, mínimo 1 (para no mostrar "0 días" en un cierre same-day). */
function daysBetween(startIso: string, endIso: string | null): number {
  if (!endIso) return 0;
  const diff = new Date(endIso).getTime() - new Date(startIso).getTime();
  return Math.max(1, Math.round(diff / 86400000));
}

export default function CauseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getCause, getContributions, resubmitCause, reviewTransfer, publishClosingMessage, getThanks, thankDonor } =
    useCauses();
  const cause = getCause(String(id));
  const [contribs, setContribs] = useState<Contribution[]>([]);
  const [resubmitting, setResubmitting] = useState(false);
  const [heroWidth, setHeroWidth] = useState(0);
  const [activeImage, setActiveImage] = useState(0);
  const [reviewing, setReviewing] = useState<string | null>(null);
  // 3.5: el comprobante se carga recién al tocar la fila (antes se
  // precargaban TODOS los comprobantes pendientes en tarjetas completas,
  // inmanejable con volumen). receiptTarget = la transferencia que se está
  // mirando en el modal; receiptUrl se resuelve cuando se abre.
  const [receiptTarget, setReceiptTarget] = useState<Contribution | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [expandedContribs, setExpandedContribs] = useState(false);

  // Mensaje de cierre (Épica 4.3).
  const [closingText, setClosingText] = useState('');
  const [closingPhoto, setClosingPhoto] = useState<string | null>(null);
  const [publishingClosing, setPublishingClosing] = useState(false);

  // Agradecimiento puntual por aporte (Épica 4.3).
  const [thanks, setThanks] = useState<CauseThank[]>([]);
  const [thankTarget, setThankTarget] = useState<Contribution | null>(null);
  const [thankText, setThankText] = useState('');
  const [sendingThank, setSendingThank] = useState(false);

  useEffect(() => {
    if (id) getContributions(String(id)).then(setContribs);
  }, [id, getContributions, cause?.raised]);

  const closed = cause?.status === 'completed' || cause?.status === 'closed';

  useEffect(() => {
    if (id && closed && cause?.mine) getThanks(String(id)).then(setThanks);
  }, [id, closed, cause?.mine, getThanks]);

  const pickClosingPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Necesitamos acceso a tus fotos',
        'Sin permiso no podemos subir la foto. Activalo desde Ajustes del celular > DonAR > Fotos.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (result.canceled || !result.assets[0]) return;
    setClosingPhoto(result.assets[0].uri);
  };

  const submitClosingMessage = async () => {
    if (!cause || !closingText.trim() || publishingClosing) return;
    setPublishingClosing(true);
    const ok = await publishClosingMessage(cause.id, closingText, closingPhoto);
    setPublishingClosing(false);
    if (!ok) {
      Alert.alert('No se pudo publicar', 'Probá de nuevo en un momento.');
      return;
    }
    setClosingText('');
    setClosingPhoto(null);
  };

  const openThank = (c: Contribution) => {
    setThankText('');
    setThankTarget(c);
  };

  const submitThank = async () => {
    if (!cause || !thankTarget || !thankText.trim() || sendingThank) return;
    setSendingThank(true);
    const ok = await thankDonor(cause.id, thankTarget.id, thankText);
    setSendingThank(false);
    if (!ok) {
      Alert.alert('No se pudo enviar', 'Probá de nuevo en un momento.');
      return;
    }
    setThanks((prev) => [...prev, { contributionId: thankTarget.id, message: thankText.trim() }]);
    setThankTarget(null);
  };

  // El comprobante se resuelve (URL firmada) solo cuando se abre el modal de
  // una transferencia puntual, no para todas las pendientes de una.
  useEffect(() => {
    if (!receiptTarget?.receiptPath) {
      setReceiptUrl(null);
      return;
    }
    let alive = true;
    getReceiptUrl(receiptTarget.receiptPath).then((url) => {
      if (alive) setReceiptUrl(url);
    });
    return () => {
      alive = false;
    };
  }, [receiptTarget]);

  const reviewPending = async (contributionId: string, approve: boolean) => {
    if (reviewing) return;
    setReviewing(contributionId);
    const ok = await reviewTransfer(contributionId, approve);
    setReviewing(null);
    if (ok) {
      setReceiptTarget(null);
      if (id) getContributions(String(id)).then(setContribs);
    }
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
  const expired = closed && !done;
  // Solo el trámite en curso usa la pantalla simple de "tu causa"; cumplida o
  // cerrada por tiempo tienen su propio cierre más abajo (mini-reporte + agradecimiento).
  const pending =
    cause.mine && (cause.status === 'review' || cause.status === 'needs_info' || cause.status === 'rejected');
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
    const message = done
      ? `¡"${cause.title}" cumplió su meta en DonAR gracias a todos los que aportaron! 🎉`
      : `Ayudá a "${cause.title}" en DonAR. Cada aporte queda verificado y a la vista. 💙`;
    await Share.share({ message });
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
            <View
              style={[
                styles.tick,
                done && { backgroundColor: Colors.happy },
                expired && { backgroundColor: Colors.sad },
              ]}>
              <Text style={styles.tickText}>{expired ? '✕' : '✓'}</Text>
            </View>
            <Text style={styles.badgeText}>
              {done ? 'Meta alcanzada' : expired ? 'Causa cerrada' : 'Causa verificada por DonAR'}
            </Text>
          </View>
          {cause.imageUrls.length === 0 && <Text style={styles.heroEmoji}>{causeInitial(cause.title)}</Text>}
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
            <Text style={styles.raised}>{formatARSCompact(cause.raised)}</Text>
            <Text style={styles.goal}>
              meta {formatARSCompact(cause.goal)}
              {'\n'}
              {done ? 'cumplida' : expired ? 'cerrada sin llegar' : `${cause.daysLeft} días restantes`}
            </Text>
          </View>

          {cause.story ? <Text style={styles.story}>{cause.story}</Text> : null}

          {closed && (
            <View style={styles.miniReport}>
              <View style={styles.miniReportItem}>
                <Text style={styles.miniReportValue}>{formatARSCompact(cause.raised)}</Text>
                <Text style={styles.miniReportLabel}>se juntaron</Text>
              </View>
              <View style={styles.miniReportDivider} />
              <View style={styles.miniReportItem}>
                <Text style={styles.miniReportValue}>{cause.contributors}</Text>
                <Text style={styles.miniReportLabel}>
                  {cause.contributors === 1 ? 'persona' : 'personas'}
                </Text>
              </View>
              <View style={styles.miniReportDivider} />
              <View style={styles.miniReportItem}>
                <Text style={styles.miniReportValue}>{daysBetween(cause.createdAt, cause.closedAt)}</Text>
                <Text style={styles.miniReportLabel}>días</Text>
              </View>
            </View>
          )}

          {closed && cause.closingMessage ? (
            <View style={styles.closingCard}>
              <Text style={styles.closingLabel}>
                {done ? 'Mensaje de cierre' : 'Mensaje del beneficiado'}
              </Text>
              {cause.closingPhotoUrl ? (
                <Image source={{ uri: cause.closingPhotoUrl }} style={styles.closingPhoto} resizeMode="cover" />
              ) : null}
              <Text style={styles.closingText}>“{cause.closingMessage}”</Text>
            </View>
          ) : null}

          {closed && isOwner && !cause.closingMessage ? (
            <View style={styles.closingForm}>
              <Text style={styles.closingLabel}>Dejá un mensaje de cierre</Text>
              <Text style={styles.pendHint}>
                Contá qué lograste con lo recaudado. Le llega a todos los que aportaron.
              </Text>
              <Pressable style={styles.closingPhotoPicker} onPress={pickClosingPhoto}>
                {closingPhoto ? (
                  <Image source={{ uri: closingPhoto }} style={styles.closingPhoto} resizeMode="cover" />
                ) : (
                  <Text style={styles.closingPhotoHint}>🖼️ Agregar una foto (opcional)</Text>
                )}
              </Pressable>
              <TextInput
                style={[styles.input, styles.multiline]}
                placeholder="Gracias a todos, con lo que juntamos pudimos..."
                placeholderTextColor={Colors.muted}
                value={closingText}
                onChangeText={setClosingText}
                multiline
              />
              <Pressable
                style={[styles.btn, (!closingText.trim() || publishingClosing) && styles.btnDisabled]}
                disabled={!closingText.trim() || publishingClosing}
                onPress={submitClosingMessage}>
                <Text style={styles.btnText}>{publishingClosing ? 'Publicando...' : 'Publicar mensaje'}</Text>
              </Pressable>
            </View>
          ) : null}

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
                    Tocá una para ver el comprobante y confirmar, o resolvela directo con ✓ / ✕.
                  </Text>
                  {pending.map((c) => (
                    <Pressable key={c.id} style={styles.pendRow} onPress={() => setReceiptTarget(c)}>
                      {c.avatarUrl ? (
                        <Image source={{ uri: c.avatarUrl }} style={styles.dot} />
                      ) : (
                        <View style={styles.dot}>
                          <Text style={styles.dotText}>{initialsFor(c.name)}</Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pendRowName} numberOfLines={1}>
                          {c.name}
                        </Text>
                        <Text style={styles.pendRowSub} numberOfLines={1}>
                          Ver comprobante · se confirma sola en {hoursUntilAutoConfirm(c.createdAt)} hs
                        </Text>
                      </View>
                      <Text style={styles.pendRowAmt}>{formatARS(c.amount)}</Text>
                      <View style={styles.pendRowActions}>
                        <Pressable
                          style={[styles.pendIconBtn, styles.pendIconReject]}
                          disabled={reviewing === c.id}
                          onPress={(e) => {
                            e.stopPropagation();
                            reviewPending(c.id, false);
                          }}>
                          <Text style={styles.pendIconRejectText}>✕</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.pendIconBtn, styles.pendIconConfirm]}
                          disabled={reviewing === c.id}
                          onPress={(e) => {
                            e.stopPropagation();
                            reviewPending(c.id, true);
                          }}>
                          <Text style={styles.pendIconConfirmText}>✓</Text>
                        </Pressable>
                      </View>
                    </Pressable>
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
            // 3.5: la lista de "recibidos" no tiene techo (puede crecer a
            // miles); se muestra de a tandas en vez de montar todo junto.
            const visible = expandedContribs ? shown : shown.slice(0, CONTRIBS_PAGE_SIZE);
            const remaining = shown.length - visible.length;
            const thankedIds = new Set(thanks.map((t) => t.contributionId));
            return (
              <>
                {visible.map((c) => {
                  const alreadyThanked = thankedIds.has(c.id);
                  return (
                    <View key={c.id} style={styles.row}>
                      {c.avatarUrl ? (
                        <Image source={{ uri: c.avatarUrl }} style={styles.dot} />
                      ) : (
                        <View style={styles.dot}>
                          <Text style={styles.dotText}>{initialsFor(c.name)}</Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{c.name}</Text>
                        {c.message ? <Text style={styles.msg}>“{c.message}”</Text> : null}
                      </View>
                      <Text style={styles.amt}>+{formatARS(c.amount)}</Text>
                      {closed && isOwner && (
                        <Pressable
                          style={[styles.thankPill, alreadyThanked && styles.thankPillDone]}
                          disabled={alreadyThanked}
                          onPress={() => openThank(c)}>
                          <Text style={[styles.thankPillText, alreadyThanked && styles.thankPillTextDone]}>
                            {alreadyThanked ? 'Agradecido ✓' : 'Agradecer'}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  );
                })}
                {remaining > 0 && (
                  <Pressable style={styles.seeMoreBtn} onPress={() => setExpandedContribs(true)}>
                    <Text style={styles.seeMoreText}>Ver los {remaining} aportes restantes</Text>
                  </Pressable>
                )}
              </>
            );
          })()}
        </View>
      </ScrollView>

      <View style={[styles.cta, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
        {isOwner ? (
          <Pressable style={[styles.btn, styles.btnShare]} onPress={shareCause}>
            <Text style={styles.btnText}>{closed ? 'Compartir el logro' : 'Compartir mi causa'}</Text>
          </Pressable>
        ) : closed ? (
          <View style={styles.closedNotice}>
            <Text style={styles.closedNoticeText}>
              {done
                ? 'Esta causa ya llegó a su meta. ¡Gracias por ser parte!'
                : 'Esta causa se cerró sin llegar a la meta.'}
            </Text>
          </View>
        ) : (
          <Pressable style={styles.btn} onPress={() => router.push(`/donate/${cause.id}`)}>
            <Text style={styles.btnText}>Donar a esta causa</Text>
          </Pressable>
        )}
      </View>

      <Modal visible={!!thankTarget} transparent animationType="fade" onRequestClose={() => setThankTarget(null)}>
        <Pressable style={styles.backdrop} onPress={() => setThankTarget(null)}>
          <Pressable style={styles.thankModal} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.h2}>Agradecer a {thankTarget?.name}</Text>
            <TextInput
              style={[styles.input, styles.multiline, { marginTop: Spacing.lg }]}
              placeholder="Gracias por tu aporte, significó mucho..."
              placeholderTextColor={Colors.muted}
              value={thankText}
              onChangeText={setThankText}
              multiline
              autoFocus
            />
            <View style={styles.pendActions}>
              <Pressable style={[styles.pendBtn, styles.pendReject]} onPress={() => setThankTarget(null)}>
                <Text style={styles.pendRejectText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.pendBtn, styles.pendConfirm, (!thankText.trim() || sendingThank) && styles.btnDisabled]}
                disabled={!thankText.trim() || sendingThank}
                onPress={submitThank}>
                <Text style={styles.pendConfirmText}>{sendingThank ? 'Enviando...' : 'Enviar'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={!!receiptTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setReceiptTarget(null)}>
        <Pressable style={styles.backdrop} onPress={() => setReceiptTarget(null)}>
          <Pressable style={styles.receiptModal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.pendTop}>
              <Text style={styles.pendName} numberOfLines={1}>
                {receiptTarget?.name}
              </Text>
              <Text style={styles.pendAmt}>{receiptTarget ? formatARS(receiptTarget.amount) : ''}</Text>
            </View>
            {receiptTarget?.message ? <Text style={styles.msg}>“{receiptTarget.message}”</Text> : null}
            {receiptTarget && (
              <Text style={styles.pendCountdown}>
                Si no la revisás, se confirma sola en {hoursUntilAutoConfirm(receiptTarget.createdAt)} hs
              </Text>
            )}
            {receiptUrl ? (
              <Image source={{ uri: receiptUrl }} style={styles.pendReceipt} resizeMode="cover" />
            ) : (
              <View style={styles.pendReceiptLoading}>
                <ActivityIndicator color={Colors.brand} />
              </View>
            )}
            <View style={styles.pendActions}>
              <Pressable
                style={[styles.pendBtn, styles.pendReject]}
                disabled={!!reviewing}
                onPress={() => receiptTarget && reviewPending(receiptTarget.id, false)}>
                <Text style={styles.pendRejectText}>No me llegó</Text>
              </Pressable>
              <Pressable
                style={[styles.pendBtn, styles.pendConfirm]}
                disabled={!!reviewing}
                onPress={() => receiptTarget && reviewPending(receiptTarget.id, true)}>
                <Text style={styles.pendConfirmText}>
                  {reviewing === receiptTarget?.id ? '...' : 'Me llegó, confirmar'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  heroEmoji: {
    position: 'absolute',
    bottom: -4,
    right: 12,
    fontSize: 88,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.55)',
  },
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
  // 3.5: fila compacta (reemplaza la tarjeta completa con la imagen
  // precargada); el comprobante se ve recién al tocar, en el modal.
  pendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: '#F0D9A6',
    backgroundColor: '#FEF9EE',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  pendRowName: { fontSize: 13.5, fontWeight: '700', color: Colors.ink },
  pendRowSub: { fontSize: 11, color: Colors.muted, marginTop: 2 },
  pendRowAmt: { fontSize: 14, fontWeight: '800', color: Colors.ink },
  pendRowActions: { flexDirection: 'row', gap: 6 },
  pendIconBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  pendIconReject: { backgroundColor: '#FBE9E9' },
  pendIconRejectText: { color: '#C0392B', fontWeight: '800', fontSize: 14 },
  pendIconConfirm: { backgroundColor: Colors.happy },
  pendIconConfirmText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  seeMoreBtn: { alignItems: 'center', paddingVertical: Spacing.md },
  seeMoreText: { fontSize: 13, fontWeight: '700', color: Colors.brandDark },
  receiptModal: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
  },
  pendTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  pendName: { fontSize: 14, fontWeight: '700', color: Colors.ink, flex: 1 },
  pendAmt: { fontSize: 15, fontWeight: '800', color: Colors.ink },
  pendCountdown: { fontSize: 11, color: Colors.muted, marginTop: 4 },
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
  btnDisabled: { backgroundColor: '#AFC8DD' },
  btnShare: { backgroundColor: Colors.ink },
  btnText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
  closedNotice: {
    backgroundColor: Colors.skyTint,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  closedNoticeText: { fontSize: 13.5, color: Colors.muted, fontWeight: '600', textAlign: 'center' },

  // Mini-reporte de cierre (4.2)
  miniReport: {
    flexDirection: 'row',
    backgroundColor: Colors.skyTint,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.lg,
  },
  miniReportItem: { flex: 1, alignItems: 'center' },
  miniReportValue: { fontSize: 17, fontWeight: '800', color: Colors.ink },
  miniReportLabel: { fontSize: 11.5, color: Colors.muted, marginTop: 2 },
  miniReportDivider: { width: 1, backgroundColor: Colors.line },

  // Mensaje de cierre / agradecimiento (4.3)
  closingCard: {
    backgroundColor: '#FEF9EE',
    borderWidth: 1,
    borderColor: '#F0D9A6',
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
  },
  closingForm: { marginTop: Spacing.lg },
  closingLabel: { fontSize: 13, fontWeight: '700', color: Colors.brandDark, marginBottom: 6 },
  closingText: { fontSize: 14, color: '#5C4A1E', lineHeight: 20, fontStyle: 'italic' },
  closingPhoto: { width: '100%', height: 160, borderRadius: Radius.sm, marginBottom: Spacing.sm },
  closingPhotoPicker: {
    height: 100,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.line,
    borderStyle: 'dashed',
    backgroundColor: Colors.skyTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  closingPhotoHint: { fontSize: 12.5, color: Colors.muted },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    padding: 15,
    fontSize: 15,
    color: Colors.ink,
    backgroundColor: '#fff',
    marginBottom: Spacing.md,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },

  // Agradecer un aporte puntual
  thankPill: {
    backgroundColor: Colors.skySoft,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: Spacing.sm,
  },
  thankPillDone: { backgroundColor: '#E4F7EE' },
  thankPillText: { fontSize: 11, fontWeight: '700', color: Colors.brandDark },
  thankPillTextDone: { color: Colors.happy },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,40,60,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  thankModal: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
  },
});
