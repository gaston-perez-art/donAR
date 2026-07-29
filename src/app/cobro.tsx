import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '@/constants/donar-theme';
import { useCauses } from '@/store/causes-store';

/** CBU son 22 dígitos exactos. Cualquier otra cosa se trata como alias. */
function isCBU(text: string): boolean {
  return /^\d{22}$/.test(text.replace(/\s/g, ''));
}

export default function CobroScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { draft, setDraft } = useCauses();

  const onChangeAlias = (alias: string) => {
    setDraft({ alias, payoutMethod: isCBU(alias) ? 'cbu' : 'mp' });
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

        <View style={styles.field}>
          <Text style={styles.label}>Alias o CBU</Text>
          <TextInput
            style={styles.input}
            placeholder="mateo.gomez.mp o tu CBU de 22 dígitos"
            placeholderTextColor={Colors.muted}
            autoCapitalize="none"
            value={draft.alias}
            onChangeText={onChangeAlias}
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

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
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
