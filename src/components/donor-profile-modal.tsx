import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, formatARS, initialsFor, Radius, Spacing } from '@/constants/donar-theme';
import { levelFor, medalsFor } from '@/lib/gamification';
import { useCauses, type DonorProfile } from '@/store/causes-store';

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function memberSinceLabel(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

type Props = {
  /** null = modal cerrado. Cambiar a un id abre el modal y dispara la carga. */
  donorId: string | null;
  fallbackName?: string;
  fallbackAvatarUrl?: string | null;
  isMe?: boolean;
  onClose: () => void;
  /** Puntos del mes: solo tiene sentido con contexto de ranking. Si no se
   * pasa, el primer stat muestra "aportes hechos" en vez de "puntos este mes". */
  monthlyPoints?: number;
  /** Acción extra opcional dentro del modal (ej. "Agradecer" desde Aportes recibidos). */
  action?: { label: string; doneLabel?: string; done?: boolean; onPress: () => void };
};

/**
 * Mini-perfil "estilo Airbnb" de un donante: nivel, medallas, causas
 * apoyadas, monto donado. Extraído de `ranking.tsx` (30 jul) para
 * reusarlo también en "Aportes recibidos" (`cause/[id].tsx`), a pedido
 * de Gastón: quería la misma vista al tocar a quien le donó, no solo en
 * el ranking.
 */
export function DonorProfileModal({
  donorId,
  fallbackName,
  fallbackAvatarUrl,
  isMe,
  onClose,
  monthlyPoints,
  action,
}: Props) {
  const { getDonorProfile } = useCauses();
  const [profile, setProfile] = useState<DonorProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!donorId) return;
    let alive = true;
    setProfile(null);
    setLoading(true);
    getDonorProfile(donorId).then((p) => {
      if (alive) {
        setProfile(p);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [donorId, getDonorProfile]);

  const avatarUrl = profile?.avatarUrl ?? fallbackAvatarUrl;
  const name = profile?.displayName ?? fallbackName;

  return (
    <Modal visible={!!donorId} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.donorCard} onPress={(e) => e.stopPropagation()}>
          {loading ? (
            <View style={styles.donorLoading}>
              <ActivityIndicator color={Colors.brand} />
            </View>
          ) : (
            <>
              <View style={styles.donorAvatarWrap}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.donorAvatarImg} />
                ) : (
                  <Text style={styles.donorAvatarText}>{initialsFor(name)}</Text>
                )}
              </View>
              <Text style={styles.donorName}>
                {name}
                {isMe ? ' (vos)' : ''}
              </Text>
              {profile && (
                <>
                  <View style={styles.donorLevelPill}>
                    <Text style={styles.donorLevelPillText}>
                      Nivel {levelFor(profile.causesSupported).number} · {levelFor(profile.causesSupported).name}
                    </Text>
                  </View>
                  <Text style={styles.donorSince}>Se sumó en {memberSinceLabel(profile.memberSince)}</Text>

                  <View style={styles.donorDonatedWrap}>
                    <Text style={styles.donorDonatedValue}>{formatARS(profile.donatedTotal)}</Text>
                    <Text style={styles.donorDonatedLabel}>donados en total</Text>
                  </View>

                  <View style={styles.donorStatsRow}>
                    <View style={styles.donorStatItem}>
                      <Text style={styles.donorStatValue}>{monthlyPoints ?? profile.donationsCount}</Text>
                      <Text style={styles.donorStatLabel}>
                        {monthlyPoints !== undefined ? 'puntos' : profile.donationsCount === 1 ? 'aporte' : 'aportes'}
                      </Text>
                      <Text style={styles.donorStatLabel}>{monthlyPoints !== undefined ? 'este mes' : 'hechos'}</Text>
                    </View>
                    <View style={styles.donorStatDivider} />
                    <View style={styles.donorStatItem}>
                      <Text style={styles.donorStatValue}>{profile.causesSupported}</Text>
                      <Text style={styles.donorStatLabel}>{profile.causesSupported === 1 ? 'causa' : 'causas'}</Text>
                      <Text style={styles.donorStatLabel}>{profile.causesSupported === 1 ? 'apoyada' : 'apoyadas'}</Text>
                    </View>
                    <View style={styles.donorStatDivider} />
                    <View style={styles.donorStatItem}>
                      <Text style={styles.donorStatValue}>{profile.completedSupported}</Text>
                      <Text style={styles.donorStatLabel}>{profile.completedSupported === 1 ? 'meta' : 'metas'}</Text>
                      <Text style={styles.donorStatLabel}>{profile.completedSupported === 1 ? 'cumplida' : 'cumplidas'}</Text>
                    </View>
                  </View>

                  <View style={styles.donorMedalRow}>
                    {medalsFor(profile).map((m) => (
                      <View key={m.key} style={[styles.donorMedal, !m.earned && styles.donorMedalLocked]}>
                        <Text style={[styles.donorMedalEmoji, !m.earned && styles.donorMedalEmojiLocked]}>
                          {m.emoji}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {action && (
                    <Pressable
                      style={[styles.donorActionBtn, action.done && styles.donorActionBtnDone]}
                      disabled={action.done}
                      onPress={action.onPress}>
                      <Text style={[styles.donorActionText, action.done && styles.donorActionTextDone]}>
                        {action.done ? (action.doneLabel ?? action.label) : action.label}
                      </Text>
                    </Pressable>
                  )}
                </>
              )}

              <Pressable style={styles.donorClose} onPress={onClose}>
                <Text style={styles.donorCloseText}>Cerrar</Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  donorDonatedWrap: { alignItems: 'center', marginTop: Spacing.lg },
  donorDonatedValue: { fontSize: 26, fontWeight: '800', color: Colors.brandDark, letterSpacing: -0.5 },
  donorDonatedLabel: { fontSize: 12, color: Colors.muted, marginTop: 2 },
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
  donorActionBtn: {
    alignSelf: 'stretch',
    backgroundColor: Colors.skySoft,
    borderRadius: Radius.md,
    padding: 13,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  donorActionBtnDone: { backgroundColor: Colors.skyTint },
  donorActionText: { color: Colors.brandDark, fontWeight: '700', fontSize: 14 },
  donorActionTextDone: { color: Colors.muted },
  donorClose: {
    alignSelf: 'stretch',
    backgroundColor: Colors.brand,
    borderRadius: Radius.md,
    padding: 15,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  donorCloseText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
