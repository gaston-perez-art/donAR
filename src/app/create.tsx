import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
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

import { Colors, formatARS, Radius, Spacing } from '@/constants/donar-theme';
import { useCauses, type EvidenceFile } from '@/store/causes-store';

type EvidenceKey = 'dniFront' | 'dniBack' | 'selfie' | 'backupDoc';
type PhotoKey = EvidenceKey | 'coverPhoto1' | 'coverPhoto2';

const EVIDENCE_FIELDS: { key: EvidenceKey; label: string; hint: string }[] = [
  { key: 'dniFront', label: 'DNI (frente)', hint: 'Foto legible del frente' },
  { key: 'dniBack', label: 'DNI (dorso)', hint: 'Foto legible del dorso' },
  { key: 'selfie', label: 'Selfie con tu DNI', hint: 'Confirma que sos vos' },
  { key: 'backupDoc', label: 'Documento de respaldo', hint: 'Orden médica, presupuesto, etc.' },
];

const COVER_FIELDS: { key: 'coverPhoto1' | 'coverPhoto2'; label: string }[] = [
  { key: 'coverPhoto1', label: 'Foto 1' },
  { key: 'coverPhoto2', label: 'Foto 2' },
];

const GOAL_PRESETS = [100000, 500000, 1000000, 3000000];

// Piso para pedir: evita causas armadas a la ligera (ej. $50). Decidido con
// Gastón el 29 jul.
const MIN_GOAL = 5000;

const pad = (n: number) => String(n).padStart(2, '0');
const formatDMY = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDMY(dmy: string): Date {
  const m = dmy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : startOfToday();
}

/** Válida de verdad (no "31/02") y no anterior a hoy. */
function isValidFutureDate(dmy: string): boolean {
  const m = dmy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return false;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const d = new Date(year, month - 1, day);
  const isRealDate = d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
  return isRealDate && d.getTime() >= startOfToday().getTime();
}

export default function CreateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { draft, setDraft } = useCauses();
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  // Fijo al montar: si fuera `new Date()` inline en el picker, se recalcula en
  // cada render y el mínimo se corre mientras el usuario gira la rueda.
  const [minDate] = useState(() => startOfToday());

  const missing: string[] = [];
  if (!draft.title.trim()) missing.push('el título');
  const goalAmount = Number(draft.goal.replace(/\D/g, '')) || 0;
  if (!draft.goal.trim()) missing.push('el monto');
  else if (goalAmount < MIN_GOAL) missing.push(`un monto de al menos ${formatARS(MIN_GOAL)}`);
  if (!draft.deadline.trim() || !isValidFutureDate(draft.deadline)) missing.push('una fecha de cierre válida');
  for (const { key, label } of EVIDENCE_FIELDS) {
    if (!draft[key]) missing.push(label);
  }
  const canContinue = missing.length === 0;

  const pickPhoto = async (key: PhotoKey) => {
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
    const file: EvidenceFile = { uri: asset.uri, mimeType: asset.mimeType || 'image/jpeg' };
    setDraft({ [key]: file } as Partial<typeof draft>);
  };

  const onChangeGoal = (text: string) => {
    const digits = text.replace(/\D/g, '');
    setDraft({ goal: digits ? formatARS(Number(digits)) : '' });
  };

  const goalDigits = draft.goal.replace(/\D/g, '');
  const pickGoalPreset = (amount: number) => setDraft({ goal: formatARS(amount) });

  const openPicker = () => {
    setTempDate(draft.deadline ? parseDMY(draft.deadline) : minDate);
    setShowPicker(true);
  };

  const confirmPicker = () => {
    setDraft({ deadline: formatDMY(tempDate) });
    setShowPicker(false);
  };

  // Android muestra su propio diálogo nativo: se setea la fecha en el onChange.
  const onAndroidDateChange = (event: DateTimePickerEvent, d?: Date) => {
    setShowPicker(false);
    if (event.type === 'set' && d) setDraft({ deadline: formatDMY(d) });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Crear una causa</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Field label="Título de tu causa">
            <TextInput
              style={styles.input}
              placeholder="Ej: Tratamiento para Mateo, 6 años"
              placeholderTextColor={Colors.muted}
              value={draft.title}
              onChangeText={(title) => setDraft({ title })}
            />
          </Field>

          <Field label="Tu historia">
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Contá qué necesitás y por qué. Cuanto más claro y honesto, más confianza genera."
              placeholderTextColor={Colors.muted}
              value={draft.story}
              onChangeText={(story) => setDraft({ story })}
              multiline
            />
          </Field>

          <Field label="Monto que necesitás">
            <TextInput
              style={styles.input}
              placeholder="$3.000.000"
              placeholderTextColor={Colors.muted}
              value={draft.goal}
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
              <Text style={draft.deadline ? styles.dateText : styles.datePlaceholder}>
                {draft.deadline || 'Tocá para elegir una fecha'}
              </Text>
              <Text style={styles.calIcon}>📅</Text>
            </Pressable>
          </Field>

          <Field label="Fotos de portada (opcional)">
            <View style={styles.evidenceGrid}>
              {COVER_FIELDS.map(({ key, label }) => {
                const file = draft[key];
                return (
                  <Pressable key={key} style={styles.coverSlot} onPress={() => pickPhoto(key)}>
                    {file ? (
                      <Image source={{ uri: file.uri }} style={styles.evidenceThumb} resizeMode="cover" />
                    ) : (
                      <Text style={styles.uploadIcon}>🖼️</Text>
                    )}
                    <Text style={styles.evidenceLabel}>{label}</Text>
                    <Text style={styles.evidenceHint}>{file ? 'Toqué para cambiar' : 'Sin foto'}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.helper}>
              Se ven en el feed. Si subís las dos, la gente puede deslizar entre ambas. Si no subís
              ninguna, mostramos un color con un ícono.
            </Text>
          </Field>

          <Field label="Evidencia para verificar tu causa">
            <View style={styles.evidenceGrid}>
              {EVIDENCE_FIELDS.map(({ key, label, hint }) => {
                const file = draft[key];
                return (
                  <Pressable key={key} style={styles.evidenceSlot} onPress={() => pickPhoto(key)}>
                    {file ? (
                      <Image source={{ uri: file.uri }} style={styles.evidenceThumb} resizeMode="cover" />
                    ) : (
                      <Text style={styles.uploadIcon}>📎</Text>
                    )}
                    <Text style={styles.evidenceLabel}>{label}</Text>
                    <Text style={styles.evidenceHint}>{file ? 'Toqué para cambiar' : hint}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.helper}>
              Necesitamos identidad verificada para publicar. Un curador revisa tu causa antes de que
              salga.
            </Text>
          </Field>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
        <Pressable
          style={[styles.btn, !canContinue && styles.btnDisabled]}
          disabled={!canContinue}
          onPress={() => router.push('/cobro')}>
          <Text style={styles.btnText}>Continuar</Text>
        </Pressable>
        {!canContinue && (
          <Text style={styles.missingText}>Falta: {missing.join(', ')}</Text>
        )}
      </View>

      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="calendar"
          minimumDate={minDate}
          onChange={onAndroidDateChange}
        />
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
  evidenceSlot: {
    width: '47%',
    flexGrow: 1,
    borderWidth: 1.6,
    borderColor: '#B9D3E8',
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    padding: 16,
    alignItems: 'center',
    backgroundColor: Colors.skyTint,
    overflow: 'hidden',
  },
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
  helper: { fontSize: 11.5, color: Colors.muted, marginTop: Spacing.sm, lineHeight: 16 },
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
