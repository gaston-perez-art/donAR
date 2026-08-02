import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { MIN_GOAL } from '@/constants/cause-rules';
import { Colors, formatARS, Radius, Spacing } from '@/constants/donar-theme';
import { fromISODate, formatDMY, isValidFutureDate, parseDMY, startOfToday, toISODate } from '@/lib/date-dmy';
import { useCauses, type CoverSlotInput } from '@/store/causes-store';

const GOAL_PRESETS = [100000, 500000, 1000000, 3000000];

type CoverSlotState = { existingUrl: string | null; localUri: string | null; mimeType: string | null };

export default function EditCauseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getCause, updateCause } = useCauses();
  const cause = getCause(String(id));

  const [title, setTitle] = useState(cause?.title ?? '');
  const [story, setStory] = useState(cause?.story ?? '');
  const [goal, setGoal] = useState(cause ? formatARS(cause.goal) : '');
  const [deadline, setDeadline] = useState(cause?.deadline ? fromISODate(cause.deadline) : '');
  const [slots, setSlots] = useState<CoverSlotState[]>(() => [
    { existingUrl: cause?.imageUrls[0] ?? null, localUri: null, mimeType: null },
    { existingUrl: cause?.imageUrls[1] ?? null, localUri: null, mimeType: null },
  ]);
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(() => (cause?.deadline ? parseDMY(fromISODate(cause.deadline)) : startOfToday()));
  const [minDate] = useState(() => startOfToday());
  const [saving, setSaving] = useState(false);

  if (!cause) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.back} onPress={() => router.back()}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.title}>Editar causa</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.muted}>No se encontró la causa.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const missing: string[] = [];
  if (!title.trim()) missing.push('el título');
  const goalAmount = Number(goal.replace(/\D/g, '')) || 0;
  if (!goal.trim()) missing.push('el monto');
  else if (goalAmount < MIN_GOAL) missing.push(`un monto de al menos ${formatARS(MIN_GOAL)}`);
  if (!deadline.trim() || !isValidFutureDate(deadline)) missing.push('una fecha de cierre válida');
  const canSave = missing.length === 0;

  const pickPhoto = async (index: number) => {
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
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, localUri: asset.uri, mimeType: asset.mimeType || 'image/jpeg' } : s)),
    );
  };

  const removePhoto = (index: number) => {
    setSlots((prev) => prev.map((s, i) => (i === index ? { existingUrl: null, localUri: null, mimeType: null } : s)));
  };

  const onChangeGoal = (text: string) => {
    const digits = text.replace(/\D/g, '');
    setGoal(digits ? formatARS(Number(digits)) : '');
  };

  const goalDigits = goal.replace(/\D/g, '');
  const pickGoalPreset = (amount: number) => setGoal(formatARS(amount));

  const openPicker = () => {
    setTempDate(deadline ? parseDMY(deadline) : minDate);
    setShowPicker(true);
  };

  const confirmPicker = () => {
    setDeadline(formatDMY(tempDate));
    setShowPicker(false);
  };

  const onAndroidDateChange = (event: DateTimePickerEvent, d?: Date) => {
    setShowPicker(false);
    if (event.type === 'set' && d) setDeadline(formatDMY(d));
  };

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    const coverSlots: CoverSlotInput[] = slots.map((s) => ({
      existingUrl: s.existingUrl,
      newFile: s.localUri && s.mimeType ? { uri: s.localUri, mimeType: s.mimeType } : null,
    }));
    const { error } = await updateCause(cause.id, {
      title,
      story,
      goalAmount,
      deadline: toISODate(deadline),
      coverSlots,
    });
    setSaving(false);
    if (error) {
      Alert.alert('No se pudo guardar', error);
      return;
    }
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Editar causa</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Text style={styles.intro}>
            Los cambios se ven al toque, sin volver a pasar por curaduría. Quedan en un historial público, visible
            para cualquiera que mire tu causa.
          </Text>

          <Field label="Título de tu causa">
            <TextInput
              style={styles.input}
              placeholder="Ej: Tratamiento para Mateo, 6 años"
              placeholderTextColor={Colors.muted}
              value={title}
              onChangeText={setTitle}
            />
          </Field>

          <Field label="Tu historia">
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Contá qué necesitás y por qué."
              placeholderTextColor={Colors.muted}
              value={story}
              onChangeText={setStory}
              multiline
            />
          </Field>

          <Field label="Monto que necesitás">
            <TextInput
              style={styles.input}
              placeholder="$3.000.000"
              placeholderTextColor={Colors.muted}
              value={goal}
              onChangeText={onChangeGoal}
              keyboardType="number-pad"
            />
            <View style={styles.goalChips}>
              {GOAL_PRESETS.map((amount) => {
                const sel = String(amount) === goalDigits;
                return (
                  <Pressable
                    key={amount}
                    style={[styles.goalChip, sel && styles.goalChipSel]}
                    onPress={() => pickGoalPreset(amount)}>
                    <Text style={[styles.goalChipText, sel && styles.goalChipTextSel]}>
                      {formatARS(amount)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          <Field label="Fecha de cierre">
            <Pressable style={styles.dateField} onPress={openPicker}>
              <Text style={deadline ? styles.dateText : styles.datePlaceholder}>
                {deadline || 'Tocá para elegir una fecha'}
              </Text>
              <Text style={styles.calIcon}>📅</Text>
            </Pressable>
          </Field>

          <Field label="Fotos de portada (opcional)">
            <View style={styles.evidenceGrid}>
              {slots.map((slot, i) => {
                const uri = slot.localUri || slot.existingUrl;
                return (
                  <View key={i} style={styles.coverSlot}>
                    <Pressable onPress={() => pickPhoto(i)}>
                      {uri ? (
                        <Image source={{ uri }} style={styles.evidenceThumb} resizeMode="cover" />
                      ) : (
                        <Text style={styles.uploadIcon}>🖼️</Text>
                      )}
                      <Text style={styles.evidenceLabel}>Foto {i + 1}</Text>
                      <Text style={styles.evidenceHint}>{uri ? 'Toqué para cambiar' : 'Sin foto'}</Text>
                    </Pressable>
                    {uri ? (
                      <Pressable onPress={() => removePhoto(i)}>
                        <Text style={styles.removeText}>Quitar foto</Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </Field>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
        <Pressable style={[styles.btn, (!canSave || saving) && styles.btnDisabled]} disabled={!canSave || saving} onPress={save}>
          <Text style={styles.btnText}>{saving ? 'Guardando...' : 'Guardar cambios'}</Text>
        </Pressable>
        {!canSave && <Text style={styles.missingText}>Falta: {missing.join(', ')}</Text>}
      </View>

      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker value={tempDate} mode="date" display="calendar" minimumDate={minDate} onChange={onAndroidDateChange} />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
          <Pressable style={styles.overlay} onPress={() => setShowPicker(false)}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.sheetTitle}>Elegí la fecha de cierre</Text>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="inline"
                minimumDate={minDate}
                themeVariant="light"
                onChange={(_e, d) => d && setTempDate(d)}
                style={styles.iosPicker}
              />
              <View style={styles.sheetActions}>
                <Pressable style={styles.sheetBtn} onPress={() => setShowPicker(false)}>
                  <Text style={styles.sheetCancel}>Cancelar</Text>
                </Pressable>
                <Pressable style={[styles.sheetBtn, styles.sheetPrimary]} onPress={confirmPicker}>
                  <Text style={styles.sheetDone}>Listo</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: Colors.muted, fontSize: 14 },
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
  form: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxl },
  intro: { fontSize: 12.5, color: Colors.muted, lineHeight: 17, marginBottom: Spacing.sm },
  field: { marginVertical: Spacing.md },
  label: { fontSize: 12.5, color: Colors.muted, fontWeight: '600', marginBottom: Spacing.sm },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    padding: 15,
    fontSize: 15,
    color: Colors.ink,
    backgroundColor: '#fff',
  },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    backgroundColor: '#fff',
    padding: 15,
  },
  dateText: { fontSize: 15, color: Colors.ink },
  datePlaceholder: { fontSize: 15, color: Colors.muted },
  calIcon: { fontSize: 20 },
  iosPicker: { alignSelf: 'center', marginVertical: Spacing.sm },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  goalChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.sm },
  goalChip: {
    borderWidth: 1.5,
    borderColor: Colors.line,
    borderRadius: Radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  goalChipSel: { borderColor: Colors.brand, backgroundColor: Colors.skySoft },
  goalChipText: { fontSize: 12.5, fontWeight: '700', color: Colors.ink },
  goalChipTextSel: { color: Colors.brandDark },
  evidenceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  coverSlot: {
    width: '47%',
    flexGrow: 1,
    borderWidth: 1.5,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  evidenceThumb: {
    width: '100%',
    height: 64,
    borderRadius: Radius.sm,
    marginBottom: Spacing.sm,
  },
  evidenceLabel: { fontSize: 12.5, fontWeight: '700', color: Colors.ink, textAlign: 'center' },
  evidenceHint: { fontSize: 11, color: Colors.muted, textAlign: 'center', marginTop: 2 },
  uploadIcon: { fontSize: 28, marginBottom: Spacing.sm },
  removeText: { fontSize: 11.5, color: Colors.sad, fontWeight: '700', textAlign: 'center', marginTop: Spacing.sm },
  footer: { padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.line, backgroundColor: '#fff' },
  missingText: { fontSize: 11.5, color: Colors.muted, textAlign: 'center', marginTop: Spacing.sm },
  btn: { backgroundColor: Colors.brand, borderRadius: Radius.md, padding: 17, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#AFC8DD' },
  btnText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(16,48,43,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: Spacing.lg },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.ink,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  sheetActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  sheetBtn: { flex: 1, borderRadius: Radius.md, padding: 15, alignItems: 'center' },
  sheetPrimary: { backgroundColor: Colors.brand },
  sheetCancel: { color: Colors.muted, fontWeight: '700', fontSize: 15 },
  sheetDone: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
