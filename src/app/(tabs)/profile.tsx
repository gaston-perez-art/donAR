import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { useTabBarScroll } from '@/components/tab-bar-scroll';
import { causeInitial, Colors, formatARSCompact, initialsFor, Radius, Spacing } from '@/constants/donar-theme';
import { levelFor, medalsFor, type Medal } from '@/lib/gamification';
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

/** Etiqueta de estado para la lista "Mis causas". */
const MY_CAUSE_STATUS: Record<string, string> = {
  review: 'En revisión',
  needs_info: 'Te pedimos info',
  rejected: 'Rechazada',
  active: 'Publicada',
  completed: 'Cumplida',
  closed: 'Cerrada',
};

export default function ProfileScreen() {
  const router = useRouter();
  const scroll = useTabBarScroll();
  const {
    getMyActivity,
    refreshIsCurator,
    signOut,
    myCauses,
    isCurator,
    setViewAsDonor,
    accountEmail,
    displayName,
    avatarUrl,
    updateAvatar,
    updateDisplayName,
  } = useCauses();
  const [activity, setActivity] = useState<MyActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [openMedal, setOpenMedal] = useState<Medal | null>(null);
  const [phrase, setPhrase] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Edición del nombre (10.4).
  const [editingName, setEditingName] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // Mismos dos campos que el registro (decisión del 29 jul: uno solo no
  // garantiza poder sacar dos iniciales). Para precargarlos hay que deshacer
  // el join: primer token = nombre, el resto = apellido. Las cuentas viejas
  // tienen una sola palabra (derivada del mail), así que ahí el apellido
  // arranca vacío y el usuario lo completa: es justamente el caso que 10.4
  // viene a resolver.
  const openNameEditor = () => {
    const parts = (displayName ?? '').trim().split(/\s+/).filter(Boolean);
    setFirstName(parts[0] ?? '');
    setLastName(parts.slice(1).join(' '));
    setNameError(null);
    setEditingName(true);
  };

  const canSaveName = firstName.trim().length >= 1 && lastName.trim().length >= 1;

  const saveName = async () => {
    if (!canSaveName || savingName) return;
    setSavingName(true);
    setNameError(null);
    const { error } = await updateDisplayName(`${firstName.trim()} ${lastName.trim()}`);
    setSavingName(false);
    if (error) {
      setNameError(error);
      return;
    }
    setEditingName(false);
  };

  const showMedal = (m: Medal) => {
    setPhrase(randomPhrase());
    setOpenMedal(m);
  };

  const pickAvatar = async () => {
    if (uploadingAvatar) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Necesitamos acceso a tus fotos',
        'Sin permiso no podemos subir la foto. Activalo desde Ajustes del celular > donAR > Fotos.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;
    setUploadingAvatar(true);
    const ok = await updateAvatar(result.assets[0].uri);
    setUploadingAvatar(false);
    if (!ok) Alert.alert('No se pudo subir la foto', 'Probá de nuevo en un momento.');
  };

  // Solo se muestra el spinner de pantalla completa la PRIMERA vez. Antes
  // `setLoading(true)` se disparaba en cada re-foco (volver de donar, de
  // Actividad, etc.), así que la pantalla entera se vaciaba a un spinner por
  // un instante cada vez que se entraba a Perfil, aunque los datos ya
  // estuvieran cargados (reportado por Gastón como "se recarga sola, es
  // raro"). Con `hasLoadedOnce` como ref (no dispara re-render ni entra en
  // el array de deps de useCallback), los re-focos refrescan en silencio.
  const hasLoadedOnce = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      if (!hasLoadedOnce.current) setLoading(true);
      getMyActivity().then((a) => {
        if (alive) {
          setActivity(a);
          setLoading(false);
          hasLoadedOnce.current = true;
        }
      });
      refreshIsCurator();
      return () => {
        alive = false;
      };
    }, [getMyActivity, refreshIsCurator]),
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={scroll?.onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Encabezado */}
        <View style={styles.head}>
          <Pressable style={styles.avatar} onPress={pickAvatar} disabled={uploadingAvatar}>
            {uploadingAvatar ? (
              <ActivityIndicator color="#fff" />
            ) : avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarText}>{initialsFor(displayName || accountEmail)}</Text>
            )}
            <View style={styles.avatarEditBadge}>
              <Text style={styles.avatarEditBadgeText}>✎</Text>
            </View>
          </Pressable>
          <View style={{ flex: 1 }}>
            {/* El nombre real, tapeable para corregirlo (10.4). Antes acá
                decía "Tu impacto": la pantalla nunca mostraba tu nombre, así
                que un display_name malo (el derivado del mail en las cuentas
                viejas) era invisible desde la app y solo se veía en el
                ranking, donde ya lo ven los demás. */}
            <Pressable style={styles.nameRow} onPress={openNameEditor} hitSlop={8}>
              <Text style={styles.name} numberOfLines={1}>
                {displayName || 'Poné tu nombre'}
              </Text>
              <Text style={styles.nameEdit}>✎</Text>
            </Pressable>
            <View style={styles.levelPill}>
              <Text style={styles.levelPillText}>
                Nivel {level.number} · {level.name}
              </Text>
            </View>
          </View>
        </View>

        {/* Cuenta: el mail siempre está (login obligatorio). "Cerrar sesión"
            vive al final de la pantalla (ver más abajo), como en el patrón
            de apps grandes (Instagram/Uber/Airbnb: cuenta arriba, salir de
            la cuenta es la última acción). Acá arriba solo lo que hace falta
            ver de entrada. */}
        {isCurator && (
          <View style={styles.accountSection}>
            <View style={styles.accountLinkedRow}>
              <Text style={styles.accountLinked} numberOfLines={1}>
                {accountEmail ?? 'Tu cuenta'}
              </Text>
              <Pressable onPress={() => setViewAsDonor(false)}>
                <Text style={styles.signOutLink}>Volver a curar</Text>
              </Pressable>
            </View>
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

        {/* Donado + recibido, tapeables: llevan al historial completo */}
        <View style={styles.statsRow}>
          <Pressable style={({ pressed }) => [styles.statCard, pressed && styles.statCardPressed]} onPress={() => router.push('/donated')}>
            <Text style={styles.statLabel}>Donaste</Text>
            <Text style={styles.statValue}>{formatARSCompact(a.donatedTotal)}</Text>
            <Text style={styles.statSub}>
              {a.donationsCount} {a.donationsCount === 1 ? 'aporte' : 'aportes'} · {a.causesSupported}{' '}
              {a.causesSupported === 1 ? 'causa' : 'causas'}
            </Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.statCard, pressed && styles.statCardPressed]} onPress={() => router.push('/received')}>
            <Text style={styles.statLabel}>Recibiste</Text>
            <Text style={[styles.statValue, { color: Colors.happy }]}>{formatARSCompact(a.receivedTotal)}</Text>
            <Text style={styles.statSub}>
              {a.myCausesCount} {a.myCausesCount === 1 ? 'causa creada' : 'causas creadas'}
            </Text>
          </Pressable>
        </View>

        {/* Mis causas. Antes la sección entera se escondía con
            `myCauses.length > 0 &&`, así que una cuenta nueva no veía ninguna
            señal de que podía crear una causa (Épica 17, 31 jul). */}
        <View style={styles.section}>
          <Text style={styles.secTitle}>Mis causas</Text>
          {myCauses.length === 0 ? (
            <EmptyState
              title="Todavía no creaste ninguna causa"
              subtitle="Si necesitás ayuda, contá tu situación. Un curador la revisa antes de que se publique."
              actionLabel="Crear una causa"
              onAction={() => router.push('/create')}
            />
          ) : (
            myCauses.map((c) => {
              const label = MY_CAUSE_STATUS[c.status] ?? c.status;
              const bad = c.status === 'rejected';
              const active = c.status === 'active' || c.status === 'completed';
              const isClosed = c.status === 'closed';
              return (
                <Pressable key={c.id} style={styles.row} onPress={() => router.push(`/cause/${c.id}`)}>
                  <View style={[styles.rowIcon, { backgroundColor: c.coverTint }]}>
                    <Text style={styles.rowIconInitial}>{causeInitial(c.title)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {c.title}
                    </Text>
                    <Text style={styles.rowSub}>
                      {active ? `${formatARSCompact(c.raised)} de ${formatARSCompact(c.goal)}` : label}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.myCausePill,
                      bad && styles.myCausePillBad,
                      active && styles.myCausePillOk,
                      isClosed && styles.myCausePillClosed,
                    ]}>
                    <Text
                      style={[
                        styles.myCausePillText,
                        bad && styles.myCausePillTextBad,
                        active && styles.myCausePillTextOk,
                        isClosed && styles.myCausePillTextClosed,
                      ]}>
                      {label}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}
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

        {/* Cuenta / salir: al final, patrón de apps grandes (Instagram,
            Uber, Airbnb) donde "cerrar sesión" es la última acción de la
            pantalla de cuenta, no algo que compite arriba con el resto. */}
        <View style={styles.signOutSection}>
          <Text style={styles.signOutEmail} numberOfLines={1}>
            {accountEmail}
          </Text>
          <Pressable style={styles.signOutBtn} onPress={signOut}>
            <Text style={styles.signOutBtnText}>Cerrar sesión</Text>
          </Pressable>
        </View>

      </ScrollView>

      {/* Editar nombre (10.4) */}
      <Modal visible={editingName} transparent animationType="fade" onRequestClose={() => setEditingName(false)}>
        <Pressable style={styles.backdrop} onPress={() => setEditingName(false)}>
          <Pressable style={styles.nameCard} onPress={() => {}}>
            <Text style={styles.nameCardTitle}>Tu nombre</Text>
            <Text style={styles.nameCardHint}>
              Es el que ven los demás en el ranking y en cada aporte que hacés.
            </Text>

            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Gastón"
              placeholderTextColor={Colors.muted}
              autoCapitalize="words"
              returnKeyType="next"
            />

            <Text style={styles.label}>Apellido</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Pérez"
              placeholderTextColor={Colors.muted}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={saveName}
            />

            {nameError ? <Text style={styles.nameCardError}>{nameError}</Text> : null}

            <Pressable
              style={[styles.modalClose, styles.nameSaveBtn, !canSaveName && styles.modalCloseOff]}
              onPress={saveName}
              disabled={!canSaveName || savingName}>
              {savingName ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalCloseText}>Guardar</Text>
              )}
            </Pressable>
            <Pressable onPress={() => setEditingName(false)}>
              <Text style={styles.nameCardCancel}>Cancelar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

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
    position: 'relative',
  },
  avatarImg: { width: 58, height: 58, borderRadius: 29 },
  avatarText: { color: Colors.brandDark, fontWeight: '800', fontSize: 15 },
  avatarEditBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.brand,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadgeText: { color: '#fff', fontSize: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 22, fontWeight: '800', color: Colors.ink, letterSpacing: -0.3, flexShrink: 1 },
  nameEdit: { fontSize: 13, color: Colors.muted },
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
  accountLinkedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  accountLinked: { fontSize: 12.5, color: Colors.happy, fontWeight: '700', flexShrink: 1 },
  signOutLink: { fontSize: 12, color: Colors.muted, fontWeight: '700', textDecorationLine: 'underline' },
  signOutSection: { paddingHorizontal: Spacing.xl, marginTop: Spacing.xxl, alignItems: 'center' },
  signOutEmail: { fontSize: 12, color: Colors.muted, marginBottom: Spacing.md },
  signOutBtn: {
    alignSelf: 'stretch',
    borderWidth: 1.5,
    borderColor: '#F3D5D5',
    backgroundColor: '#FFF7F7',
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
  },
  signOutBtnText: { color: '#C0392B', fontWeight: '700', fontSize: 14.5 },
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
  statCardPressed: { opacity: 0.8 },
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
  rowIconInitial: { color: Colors.brandDark, fontWeight: '700', fontSize: 15 },
  rowTitle: { fontSize: 14.5, fontWeight: '600', color: Colors.ink },
  rowSub: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  myCausePill: { backgroundColor: '#FDEFC7', borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  myCausePillBad: { backgroundColor: '#FBE9E9' },
  myCausePillOk: { backgroundColor: '#E4F7EE' },
  myCausePillClosed: { backgroundColor: '#EDF0F3' },
  myCausePillText: { fontSize: 11, fontWeight: '700', color: '#8A6D00' },
  myCausePillTextBad: { color: '#C0392B' },
  myCausePillTextOk: { color: Colors.happy },
  myCausePillTextClosed: { color: Colors.sad },

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
  modalCloseOff: { opacity: 0.45 },

  // Editar nombre (10.4)
  nameCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
  },
  nameCardTitle: { fontSize: 20, fontWeight: '800', color: Colors.ink, letterSpacing: -0.3 },
  nameCardHint: { fontSize: 13, color: Colors.muted, marginTop: 6, lineHeight: 18 },
  label: { fontSize: 12.5, color: Colors.muted, fontWeight: '700', marginTop: Spacing.lg, marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.ink,
    backgroundColor: '#fff',
  },
  nameCardError: { fontSize: 12.5, color: '#C0392B', marginTop: Spacing.md },
  nameSaveBtn: { marginTop: Spacing.xl },
  nameCardCancel: {
    fontSize: 13.5,
    color: Colors.muted,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
