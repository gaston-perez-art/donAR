import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '@/constants/donar-theme';
import { useCauses } from '@/store/causes-store';

export default function CobroScreen() {
  const router = useRouter();
  const { draft, setDraft } = useCauses();

  const Option = ({
    value,
    icon,
    title,
    subtitle,
  }: {
    value: 'mp' | 'cbu';
    icon: string;
    title: string;
    subtitle: string;
  }) => {
    const selected = draft.payoutMethod === value;
    return (
      <Pressable
        style={[styles.opt, selected && styles.optSel]}
        onPress={() => setDraft({ payoutMethod: value })}>
        <View style={styles.optIcon}>
          <Text style={{ fontSize: 20 }}>{icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.optTitle}>{title}</Text>
          <Text style={styles.optSub}>{subtitle}</Text>
        </View>
        <View style={[styles.radio, selected && styles.radioSel]} />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>¿Dónde recibís el dinero?</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          Cada aporte se acredita acá directo, sin pasar por DonAR. Es obligatorio para publicar tu
          causa.
        </Text>

        <Option
          value="mp"
          icon="💙"
          title="Vincular Mercado Pago"
          subtitle="Recomendado. La plata entra al instante"
        />
        <Option value="cbu" icon="🏦" title="Cargar CBU o alias" subtitle="Tu cuenta bancaria" />

        <View style={styles.field}>
          <Text style={styles.label}>Alias o CBU</Text>
          <TextInput
            style={styles.input}
            placeholder="mateo.gomez.mp"
            placeholderTextColor={Colors.muted}
            autoCapitalize="none"
            value={draft.alias}
            onChangeText={(alias) => setDraft({ alias })}
          />
        </View>

        <View style={styles.trust}>
          <View style={styles.trustB}>
            <Text style={{ color: '#fff', fontSize: 13 }}>✓</Text>
          </View>
          <Text style={styles.trustText}>
            Verificamos que la cuenta esté a nombre de quien creó la causa. Esto protege a quien
            dona.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.btn, draft.alias.trim().length === 0 && styles.btnDisabled]}
          disabled={draft.alias.trim().length === 0}
          onPress={() => router.push('/review')}>
          <Text style={styles.btnText}>Enviar a verificación</Text>
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
  body: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxl },
  intro: { fontSize: 13.5, color: Colors.muted, lineHeight: 20, marginVertical: Spacing.md },
  opt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    padding: 15,
    marginBottom: Spacing.md,
    backgroundColor: '#fff',
  },
  optSel: { borderColor: Colors.brand, backgroundColor: Colors.skySoft },
  optIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.skyTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optTitle: { fontSize: 14.5, fontWeight: '700', color: Colors.ink },
  optSub: { fontSize: 11.5, color: Colors.muted, marginTop: 2 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.line,
  },
  radioSel: { borderColor: Colors.brand, backgroundColor: Colors.brand },
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
  trust: {
    flexDirection: 'row',
    gap: 11,
    alignItems: 'flex-start',
    backgroundColor: Colors.skySoft,
    borderRadius: Radius.md,
    padding: 14,
    marginTop: Spacing.sm,
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
  footer: { padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.line, backgroundColor: '#fff' },
  btn: { backgroundColor: Colors.brand, borderRadius: Radius.md, padding: 17, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#AFC8DD' },
  btnText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
});
