import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, formatARS, Radius, Spacing } from '@/constants/donar-theme';
import { confirmLinkEmail, confirmLogin, linkEmail, loginWithEmail, supabase } from '@/lib/supabase';
import { useCauses, type MyActivity } from '@/store/causes-store';

/** Frases de altruismo. Se elige una al azar al abrir una medalla. */
const ALTRUISM_PHRASES = [
  'Nadie se hizo más pobre por dar.',
  'Lo que das no se pierde: cambia de manos y vuelve como otra cosa.',
  'Ayudar a uno no cambia el mundo, pero cambia el mundo de uno.',
  'La generosidad no se mide por lo que sobra, sino por lo que se comparte.',
  'Cada aporte tuyo es una historia que sigue.',
  'Dar es la forma más simple de estar cerca de alguien que no conocés.',
  'La solidaridad es el interés bien entendido de una comunidad.',
  'No hace falta tener mucho para dar algo. Alcanza con querer hacerlo.',
  'Un gesto pequeño, sostenido por muchos, mueve montañas.',
  'El que ayuda gana dos veces: una para el otro, otra para sí mismo.',
];

function randomPhrase(): string {
  return ALTRUISM_PHRASES[Math.floor(Math.random() * ALTRUISM_PHRASES.length)];
}

/** Niveles del donante. El umbral es la cantidad de causas distintas apoyadas. */
const LEVELS = [
  { min: 0, name: 'Solidario' },
  { min: 3, name: 'Comprometido' },
  { min: 10, name: 'Referente' },
] as const;

function levelFor(causesSupported: number) {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (causesSupported >= LEVELS[i].min) index = i;
  }
  const current = LEVELS[index];
  const next = LEVELS[index + 1];
  const floor = current.min;
  const ceil = next ? next.min : current.min;
  const pct = next ? Math.min(100, Math.round(((causesSupported - floor) / (ceil - floor)) * 100)) : 100;
  const toNext = next ? next.min - causesSupported : 0;
  return { number: index + 1, name: current.name, next: next?.name ?? null, pct, toNext };
}

type Medal = { key: string; emoji: string; label: string; earned: boolean; hint: string };

function medalsFor(a: MyActivity): Medal[] {
  return [
    {
      key: 'primer',
      emoji: '💧',
      label: 'Primer aporte',
      earned: a.donationsCount >= 1,
      hint: 'Hacé tu primera donación',
    },
    {
      key: 'tres',
      emoji: '🤝',
      label: 'Tres causas',
      earned: a.causesSupported >= 3,
      hint: `Apoyá 3 causas (llevás ${a.causesSupported})`,
    },
    {
      key: 'diez',
      emoji: '🌟',
      label: 'Diez causas',
      earned: a.causesSupported >= 10,
      hint: `Apoyá 10 causas (llevás ${a.causesSupported})`,
    },
    {
      key: 'meta',
      emoji: '🏁',
      label: 'Meta cumplida',
      earned: a.completedSupported >= 1,
      hint: 'Apoyá una causa que llegue a su meta',
    },
  ];
}

/**
 * Vincula la sesión anónima a un mail (o recupera una cuenta ya vinculada en
 * otro dispositivo), para no perder el historial al cambiar de celular.
 * Un solo input de mail: si el mail ya está registrado, cae solo al login.
 */
function AccountLink({ onLinked }: { onLinked: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [mode, setMode] = useState<'link' | 'login'>('link');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setSending(true);
    setError(null);

    const link = await linkEmail(trimmed);
    if (!link.error) {
      setMode('link');
      setStep('code');
      setSending(false);
      return;
    }

    if (link.error.toLowerCase().includes('regist') || link.error.toLowerCase().includes('already')) {
      const login = await loginWithEmail(trimmed);
      setSending(false);
      if (login.error) {
        setError('No pudimos enviar el código. Probá de nuevo.');
        return;
      }
      setMode('login');
      setStep('code');
      return;
    }

    setSending(false);
    setError(link.error);
  };

  const confirmCode = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setSending(true);
    setError(null);

    const result =
      mode === 'link' ? await confirmLinkEmail(email.trim(), trimmed) : await confirmLogin(email.trim(), trimmed);
    setSending(false);

    if (result.error) {
      setError('Código incorrecto o vencido.');
      return;
    }

    setOpen(false);
    setStep('email');
    setEmail('');
    setCode('');
    onLinked();
  };

  if (!open) {
    return (
      <Pressable style={styles.accountLinkBtn} onPress={() => setOpen(true)}>
        <Text style={styles.accountLinkBtnText}>Vincular mi mail para no perder tu historial</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.accountCard}>
      {step === 'email' ? (
        <>
          <Text style={styles.accountTitle}>Guardá tu historial</Text>
          <Text style={styles.accountHint}>
            Te mandamos un código a tu mail. Sirve para recuperar tu perfil desde otro celular.
          </Text>
          <TextInput
            style={styles.accountInput}
            placeholder="tu@mail.com"
            placeholderTextColor={Colors.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />
          {error ? <Text style={styles.accountError}>{error}</Text> : null}
          <Pressable style={styles.accountBtn} onPress={sendCode} disabled={sending}>
            <Text style={styles.accountBtnText}>{sending ? 'Enviando...' : 'Enviar código'}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.accountTitle}>Revisá tu mail</Text>
          <Text style={styles.accountHint}>Te mandamos un código a {email}.</Text>
          <TextInput
            style={styles.accountInput}
            placeholder="Código de 6 dígitos"
            placeholderTextColor={Colors.muted}
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
          />
          {error ? <Text style={styles.accountError}>{error}</Text> : null}
          <Pressable style={styles.accountBtn} onPress={confirmCode} disabled={sending}>
            <Text style={styles.accountBtnText}>{sending ? 'Confirmando...' : 'Confirmar'}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { getMyActivity, isCurator, refreshIsCurator, pendingCauses } = useCauses();
  const [activity, setActivity] = useState<MyActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [openMedal, setOpenMedal] = useState<Medal | null>(null);
  const [phrase, setPhrase] = useState('');
  const [accountEmail, setAccountEmail] = useState<string | null>(null);

  const refreshAccount = useCallback(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAccountEmail(data.user?.is_anonymous ? null : (data.user?.email ?? null));
    });
  }, []);

  const showMedal = (m: Medal) => {
    setPhrase(randomPhrase());
    setOpenMedal(m);
  };

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setLoading(true);
      getMyActivity().then((a) => {
        if (alive) {
          setActivity(a);
          setLoading(false);
        }
      });
      refreshAccount();
      refreshIsCurator();
      return () => {
        alive = false;
      };
    }, [getMyActivity, refreshAccount, refreshIsCurator]),
  );

  if (loading || !activity) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  const a = activity;
  const level = levelFor(a.causesSupported);
  const medals = medalsFor(a);
  const earnedCount = medals.filter((m) => m.earned).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Encabezado */}
        <View style={styles.head}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>VOS</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>Tu impacto</Text>
            <View style={styles.levelPill}>
              <Text style={styles.levelPillText}>
                Nivel {level.number} · {level.name}
              </Text>
            </View>
          </View>
        </View>

        {/* Cuenta: vincular mail para no perder el historial en otro celular */}
        <View style={styles.accountSection}>
          {accountEmail ? (
            <Text style={styles.accountLinked}>✓ Vinculado con {accountEmail}</Text>
          ) : (
            <AccountLink onLinked={refreshAccount} />
          )}
        </View>

        {isCurator && (
          <View style={styles.accountSection}>
            <Pressable style={styles.curatorBtn} onPress={() => router.push('/curar')}>
              <Text style={styles.curatorBtnText}>
                Panel de curador{pendingCauses.length > 0 ? ` · ${pendingCauses.length} pendientes` : ''}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Progreso de nivel */}
        <View style={styles.levelCard}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${level.pct}%` }]} />
          </View>
          <Text style={styles.levelHint}>
            {level.next
              ? `${level.toNext} ${level.toNext === 1 ? 'causa' : 'causas'} para llegar a ${level.next}`
              : 'Alcanzaste el nivel máximo. Gracias por sostener causas reales.'}
          </Text>
        </View>

        {/* Donado + recibido */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Donaste</Text>
            <Text style={styles.statValue}>{formatARS(a.donatedTotal)}</Text>
            <Text style={styles.statSub}>
              {a.donationsCount} {a.donationsCount === 1 ? 'aporte' : 'aportes'} · {a.causesSupported}{' '}
              {a.causesSupported === 1 ? 'causa' : 'causas'}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Recibiste</Text>
            <Text style={[styles.statValue, { color: Colors.happy }]}>{formatARS(a.receivedTotal)}</Text>
            <Text style={styles.statSub}>
              {a.myCausesCount} {a.myCausesCount === 1 ? 'causa creada' : 'causas creadas'}
            </Text>
          </View>
        </View>

        {/* Medallas */}
        <View style={styles.section}>
          <View style={styles.secHead}>
            <Text style={styles.secTitle}>Medallas</Text>
            <Text style={styles.secCount}>
              {earnedCount}/{medals.length}
            </Text>
          </View>
          <View style={styles.medalGrid}>
            {medals.map((m) => (
              <Pressable
                key={m.key}
                style={[styles.medal, !m.earned && styles.medalLocked]}
                onPress={() => showMedal(m)}>
                <Text style={[styles.medalEmoji, !m.earned && styles.medalEmojiLocked]}>{m.emoji}</Text>
                <Text style={[styles.medalLabel, !m.earned && styles.medalLabelLocked]}>{m.label}</Text>
                {!m.earned ? <Text style={styles.medalHint}>{m.hint}</Text> : null}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Historial de impacto */}
        <View style={styles.section}>
          <Text style={styles.secTitle}>Historial de impacto</Text>
          {a.contributions.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>💙</Text>
              <Text style={styles.emptyText}>Todavía no donaste a ninguna causa.</Text>
              <Pressable style={styles.emptyBtn} onPress={() => router.push('/')}>
                <Text style={styles.emptyBtnText}>Ver causas</Text>
              </Pressable>
            </View>
          ) : (
            a.contributions.map((c) => (
              <Pressable key={c.id} style={styles.row} onPress={() => router.push(`/cause/${c.causeId}`)}>
                <View style={[styles.rowIcon, { backgroundColor: c.causeTint }]}>
                  <Text style={{ fontSize: 18 }}>{c.causeEmoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {c.causeTitle}
                  </Text>
                  <Text style={styles.rowSub}>
                    {c.causeStatus === 'completed' ? 'Meta cumplida' : 'En curso'}
                  </Text>
                </View>
                <Text style={styles.rowAmt}>+{formatARS(c.amount)}</Text>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal de medalla */}
      <Modal visible={!!openMedal} transparent animationType="fade" onRequestClose={() => setOpenMedal(null)}>
        <Pressable style={styles.backdrop} onPress={() => setOpenMedal(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={[styles.modalHalo, openMedal && !openMedal.earned && styles.modalHaloLocked]}>
              <View style={[styles.modalDisc, openMedal && !openMedal.earned && styles.modalDiscLocked]}>
                <Text style={[styles.modalEmoji, openMedal && !openMedal.earned && styles.medalEmojiLocked]}>
                  {openMedal?.emoji}
                </Text>
              </View>
            </View>

            <Text style={styles.modalLabel}>{openMedal?.label}</Text>
            <View style={[styles.modalStatus, openMedal?.earned ? styles.modalStatusOn : styles.modalStatusOff]}>
              <Text style={[styles.modalStatusText, openMedal?.earned ? styles.modalStatusTextOn : styles.modalStatusTextOff]}>
                {openMedal?.earned ? '✓ Desbloqueada' : `🔒 ${openMedal?.hint}`}
              </Text>
            </View>

            <Text style={styles.modalPhrase}>“{phrase}”</Text>

            <Pressable style={styles.modalClose} onPress={() => setOpenMedal(null)}>
              <Text style={styles.modalCloseText}>Cerrar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.skySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Colors.brandDark, fontWeight: '800', fontSize: 15 },
  name: { fontSize: 22, fontWeight: '800', color: Colors.ink, letterSpacing: -0.3 },
  levelPill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: Colors.skySoft,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  levelPillText: { color: Colors.brandDark, fontWeight: '700', fontSize: 12.5 },
  accountSection: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  accountLinked: { fontSize: 12.5, color: Colors.happy, fontWeight: '700' },
  accountLinkBtn: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.skySoft,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  accountLinkBtnText: { color: Colors.brandDark, fontWeight: '700', fontSize: 12.5 },
  accountCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    padding: Spacing.lg,
  },
  accountTitle: { fontSize: 15, fontWeight: '700', color: Colors.ink },
  accountHint: { fontSize: 12.5, color: Colors.muted, marginTop: 4, marginBottom: Spacing.md, lineHeight: 18 },
  accountInput: {
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: Colors.ink,
    marginBottom: Spacing.sm,
  },
  accountError: { fontSize: 12, color: '#D64545', marginBottom: Spacing.sm },
  accountBtn: {
    backgroundColor: Colors.brand,
    borderRadius: Radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  accountBtnText: { color: '#fff', fontWeight: '700', fontSize: 13.5 },
  curatorBtn: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.ink,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  curatorBtnText: { color: '#fff', fontWeight: '700', fontSize: 12.5 },
  levelCard: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  track: { height: 11, borderRadius: 20, backgroundColor: '#EDF2F6', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 20, backgroundColor: Colors.brand },
  levelHint: { fontSize: 12.5, color: Colors.muted, marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.xl },
  statCard: {
    flex: 1,
    backgroundColor: Colors.skyTint,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  statLabel: { fontSize: 12.5, color: Colors.muted, fontWeight: '600' },
  statValue: { fontSize: 21, fontWeight: '800', color: Colors.ink, marginTop: 6, letterSpacing: -0.4 },
  statSub: { fontSize: 11.5, color: Colors.muted, marginTop: 4 },
  section: { paddingHorizontal: Spacing.xl, marginTop: Spacing.xl },
  secHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  secTitle: { fontSize: 17, fontWeight: '700', color: Colors.ink, marginBottom: Spacing.md },
  secCount: { fontSize: 13, fontWeight: '700', color: Colors.brandDark, marginBottom: Spacing.md },
  medalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  medal: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  medalLocked: { backgroundColor: '#FAFBFC' },
  medalEmoji: { fontSize: 30 },
  medalEmojiLocked: { opacity: 0.3 },
  medalLabel: { fontSize: 13.5, fontWeight: '700', color: Colors.ink, marginTop: 8, textAlign: 'center' },
  medalLabelLocked: { color: Colors.muted },
  medalHint: { fontSize: 11, color: Colors.muted, marginTop: 4, textAlign: 'center', lineHeight: 15 },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyEmoji: { fontSize: 34 },
  emptyText: { fontSize: 14, color: Colors.muted, marginTop: 10, marginBottom: 16 },
  emptyBtn: {
    backgroundColor: Colors.brand,
    borderRadius: Radius.md,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 14.5, fontWeight: '600', color: Colors.ink },
  rowSub: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  rowAmt: { fontSize: 14.5, fontWeight: '800', color: Colors.brandDark },

  // Modal de medalla
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,40,60,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  modalHalo: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: Colors.skySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  modalHaloLocked: { backgroundColor: '#F1F4F7' },
  modalDisc: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FDEFC7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDiscLocked: { backgroundColor: '#E7ECF0' },
  modalEmoji: { fontSize: 48 },
  modalLabel: { fontSize: 20, fontWeight: '800', color: Colors.ink, letterSpacing: -0.3, textAlign: 'center' },
  modalStatus: {
    marginTop: 10,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  modalStatusOn: { backgroundColor: '#E4F7EE' },
  modalStatusOff: { backgroundColor: '#F1F4F7' },
  modalStatusText: { fontSize: 12.5, fontWeight: '700', textAlign: 'center' },
  modalStatusTextOn: { color: Colors.happy },
  modalStatusTextOff: { color: Colors.muted },
  modalPhrase: {
    fontSize: 15.5,
    fontStyle: 'italic',
    color: '#33434F',
    textAlign: 'center',
    lineHeight: 23,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  modalClose: {
    alignSelf: 'stretch',
    backgroundColor: Colors.brand,
    borderRadius: Radius.md,
    padding: 15,
    alignItems: 'center',
  },
  modalCloseText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
