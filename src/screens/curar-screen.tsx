import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, formatARS, Radius, Spacing } from '@/constants/donar-theme';
import type { Cause } from '@/data/causes';
import { getEvidenceUrl } from '@/lib/supabase';
import { useCauses, type ReviewInfo } from '@/store/causes-store';

const STATUS_LABEL: Record<string, string> = {
  review: 'En revisión',
  needs_info: 'Reenviada (pidieron info antes)',
};

const EVIDENCE_LABELS: { key: keyof ReviewInfo; label: string }[] = [
  { key: 'dniFrontPath', label: 'DNI frente' },
  { key: 'dniBackPath', label: 'DNI dorso' },
  { key: 'selfiePath', label: 'Selfie con DNI' },
  { key: 'backupDocPath', label: 'Documento de respaldo' },
];

/**
 * Toda la app para un curador: sin tabs, sin feed, sin perfil de donante.
 * La renderiza directo _layout.tsx cuando isCurator es true, no es una ruta.
 * "Cerrar sesión" es la única salida, vuelve a una sesión anónima nueva.
 */
export default function CurarScreen() {
  const insets = useSafeAreaInsets();
  const { pendingCauses, refresh, getReviewInfo, reviewCause, signOut } = useCauses();
  const [selected, setSelected] = useState<Cause | null>(null);
  const [info, setInfo] = useState<ReviewInfo | null>(null);
  const [urls, setUrls] = useState<Record<string, string | null>>({});
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [noteMode, setNoteMode] = useState<'reject' | 'needs_info' | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const open = async (cause: Cause) => {
    setSelected(cause);
    setLoadingInfo(true);
    setNoteMode(null);
    setNote('');
    const reviewInfo = await getReviewInfo(cause.id);
    setInfo(reviewInfo);
    const entries = await Promise.all(
      EVIDENCE_LABELS.map(async ({ key }) => {
        const path = reviewInfo[key] as string | null;
        if (!path) return [key, null] as const;
        return [key, await getEvidenceUrl(path)] as const;
      }),
    );
    setUrls(Object.fromEntries(entries));
    setLoadingInfo(false);
  };

  const close = () => {
    setSelected(null);
    setInfo(null);
    setUrls({});
    setNoteMode(null);
    setNote('');
  };

  const act = async (action: 'approve' | 'reject' | 'needs_info') => {
    if (!selected) return;
    if ((action === 'reject' || action === 'needs_info') && noteMode !== action) {
      setNoteMode(action);
      return;
    }
    setSubmitting(true);
    const ok = await reviewCause(selected.id, action, note.trim() || undefined);
    setSubmitting(false);
    if (ok) close();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Causas pendientes</Text>
          <Text style={styles.subtitle}>Panel de curador</Text>
        </View>
        <Pressable style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Cerrar sesión</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand} />
        }>
        {pendingCauses.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.muted}>No hay causas esperando revisión.</Text>
          </View>
        ) : (
          pendingCauses.map((c) => (
            <Pressable key={c.id} style={styles.card} onPress={() => open(c)}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {c.title}
                </Text>
                <View style={[styles.pill, c.status === 'needs_info' && styles.pillInfo]}>
                  <Text style={styles.pillText}>{STATUS_LABEL[c.status] ?? c.status}</Text>
                </View>
              </View>
              <Text style={styles.cardGoal}>Meta {formatARS(c.goal)}</Text>
              <Text style={styles.cardStory} numberOfLines={2}>
                {c.story}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>

      <Modal visible={!!selected} animationType="slide" onRequestClose={close}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + Spacing.md }]}>
            <Pressable style={styles.back} onPress={close}>
              <Text style={styles.backText}>‹</Text>
            </Pressable>
            <Text style={styles.title} numberOfLines={1}>
              {selected?.title}
            </Text>
          </View>

          {loadingInfo ? (
            <View style={styles.center}>
              <ActivityIndicator color={Colors.brand} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.detailBody}>
              <Text style={styles.secTitle}>Historia</Text>
              <Text style={styles.story}>{selected?.story}</Text>

              <Text style={styles.secTitle}>Meta</Text>
              <Text style={styles.story}>{selected ? formatARS(selected.goal) : ''}</Text>

              <Text style={styles.secTitle}>Destino del dinero</Text>
              <Text style={styles.story}>
                {info?.payoutMethod === 'mp' ? 'Mercado Pago' : info?.payoutMethod === 'cbu' ? 'CBU / alias' : '-'}
                {info?.payoutAlias ? ` · ${info.payoutAlias}` : ''}
              </Text>

              <Text style={styles.secTitle}>Evidencia</Text>
              <View style={styles.evidenceGrid}>
                {EVIDENCE_LABELS.map(({ key, label }) => (
                  <View key={key} style={styles.evidenceSlot}>
                    {urls[key] ? (
                      <Image source={{ uri: urls[key]! }} style={styles.evidenceImg} resizeMode="cover" />
                    ) : (
                      <Text style={styles.muted}>Falta</Text>
                    )}
                    <Text style={styles.evidenceLabel}>{label}</Text>
                  </View>
                ))}
              </View>

              {noteMode && (
                <View style={styles.noteBox}>
                  <Text style={styles.secTitle}>
                    {noteMode === 'reject' ? 'Motivo del rechazo' : 'Qué le falta enviar'}
                  </Text>
                  <TextInput
                    style={styles.noteInput}
                    placeholder="Escribí el motivo, se lo mostramos a quien pidió"
                    placeholderTextColor={Colors.muted}
                    value={note}
                    onChangeText={setNote}
                    multiline
                  />
                </View>
              )}
            </ScrollView>
          )}

          <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
            <Pressable
              style={[styles.actBtn, styles.actReject]}
              disabled={submitting}
              onPress={() => act('reject')}>
              <Text style={styles.actRejectText}>
                {noteMode === 'reject' ? 'Confirmar rechazo' : 'Rechazar'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.actBtn, styles.actInfo]}
              disabled={submitting}
              onPress={() => act('needs_info')}>
              <Text style={styles.actInfoText}>
                {noteMode === 'needs_info' ? 'Confirmar pedido' : 'Pedir info'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.actBtn, styles.actApprove]}
              disabled={submitting}
              onPress={() => act('approve')}>
              <Text style={styles.actApproveText}>Aprobar</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  muted: { color: Colors.muted, fontSize: 13.5, lineHeight: 20, textAlign: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  signOutBtn: {
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  signOutText: { fontSize: 12, fontWeight: '700', color: Colors.muted },
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
  title: { fontSize: 16, fontWeight: '700', color: Colors.ink, flexShrink: 1 },
  subtitle: { fontSize: 11.5, color: Colors.muted, marginTop: 1 },
  list: { padding: Spacing.lg, gap: Spacing.md },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.ink, flex: 1 },
  pill: { backgroundColor: Colors.skySoft, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillInfo: { backgroundColor: '#FDEFC7' },
  pillText: { fontSize: 11, fontWeight: '700', color: Colors.brandDark },
  cardGoal: { fontSize: 12.5, color: Colors.muted, marginTop: 6 },
  cardStory: { fontSize: 12.5, color: Colors.muted, marginTop: 4, lineHeight: 17 },
  detailBody: { padding: Spacing.xl, paddingBottom: Spacing.xxl },
  secTitle: { fontSize: 13, fontWeight: '700', color: Colors.ink, marginTop: Spacing.lg, marginBottom: 6 },
  story: { fontSize: 14, color: '#33434F', lineHeight: 20 },
  evidenceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  evidenceSlot: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  evidenceImg: { width: '100%', height: 90, borderRadius: Radius.sm, marginBottom: 6 },
  evidenceLabel: { fontSize: 11.5, color: Colors.muted, textAlign: 'center' },
  noteBox: { marginTop: Spacing.md },
  noteInput: {
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.sm,
    padding: 12,
    fontSize: 13.5,
    color: Colors.ink,
    minHeight: 70,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
    backgroundColor: '#fff',
  },
  actBtn: { flex: 1, borderRadius: Radius.sm, paddingVertical: 13, alignItems: 'center' },
  actReject: { backgroundColor: '#FBE9E9' },
  actRejectText: { color: '#C0392B', fontWeight: '700', fontSize: 12.5 },
  actInfo: { backgroundColor: '#FDEFC7' },
  actInfoText: { color: '#8A6D00', fontWeight: '700', fontSize: 12.5 },
  actApprove: { backgroundColor: Colors.brand },
  actApproveText: { color: '#fff', fontWeight: '700', fontSize: 12.5 },
});
