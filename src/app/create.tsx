import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, formatARS, Radius, Spacing } from '@/constants/donar-theme';
import { useCauses, type EvidenceFile } from '@/store/causes-store';

type EvidenceKey = 'dniFront' | 'dniBack' | 'selfie' | 'backupDoc';

const EVIDENCE_FIELDS: { key: EvidenceKey; label: string; hint: string }[] = [
  { key: 'dniFront', label: 'DNI (frente)', hint: 'Foto legible del frente' },
  { key: 'dniBack', label: 'DNI (dorso)', hint: 'Foto legible del dorso' },
  { key: 'selfie', label: 'Selfie con tu DNI', hint: 'Confirma que sos vos' },
  { key: 'backupDoc', label: 'Documento de respaldo', hint: 'Orden médica, presupuesto, etc.' },
];

const pad = (n: number) => String(n).padStart(2, '0');
const formatDMY = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

function parseDMY(dmy: string): Date {
  const m = dmy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : new Date();
}

export default function CreateScreen() {
  const router = useRouter();
  const { draft, setDraft } = useCauses();
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());

  const canContinue =
    draft.title.trim().length > 0 &&
    draft.goal.trim().length > 0 &&
    !!draft.dniFront &&
    !!draft.dniBack &&
    !!draft.selfie &&
    !!draft.backupDoc;

  const pickEvidence = async (key: EvidenceKey) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
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

  // Autoformato DD/MM/AAAA mientras escribe.
  const onChangeDate = (text: string) => {
    const d = text.replace(/\D/g, '').slice(0, 8);
    let out = d;
    if (d.length > 4) out = `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
    else if (d.length > 2) out = `${d.slice(0, 2)}/${d.slice(2)}`;
    setDraft({ deadline: out });
  };

  const openPicker = () => {
    setTempDate(parseDMY(draft.deadline));
    setShowPicker(true);
  };

  const confirmPicker = () => {
    setDraft({ deadline: formatDMY(tempDate) });
    setShowPicker(false);
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

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label="Monto que necesitás">
                <TextInput
                  style={styles.input}
                  placeholder="$3.000.000"
                  placeholderTextColor={Colors.muted}
                  value={draft.goal}
                  onChangeText={onChangeGoal}
                  keyboardType="number-pad"
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Cierre">
                <View style={styles.dateWrap}>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor={Colors.muted}
                    value={draft.deadline}
                    onChangeText={onChangeDate}
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                  <Pressable style={styles.calBtn} onPress={openPicker} hitSlop={8}>
                    <Text style={styles.calIcon}>📅</Text>
                  </Pressable>
                </View>
              </Field>
            </View>
          </View>

          <Field label="Evidencia para verificar tu causa">
            <View style={styles.evidenceGrid}>
              {EVIDENCE_FIELDS.map(({ key, label, hint }) => {
                const file = draft[key];
                return (
                  <Pressable key={key} style={styles.evidenceSlot} onPress={() => pickEvidence(key)}>
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

      <View style={styles.footer}>
        <Pressable
          style={[styles.btn, !canContinue && styles.btnDisabled]}
          disabled={!canContinue}
          onPress={() => router.push('/cobro')}>
          <Text style={styles.btnText}>Continuar</Text>
        </Pressable>
      </View>

      <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowPicker(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Elegí la fecha de cierre</Text>
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="spinner"
              minimumDate={new Date()}
              onChange={(_e, d) => d && setTempDate(d)}
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
  dateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    backgroundColor: '#fff',
    paddingRight: 10,
  },
  dateInput: { flex: 1, padding: 15, fontSize: 15, color: Colors.ink },
  calBtn: { paddingHorizontal: 4 },
  calIcon: { fontSize: 20 },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: Spacing.md },
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
