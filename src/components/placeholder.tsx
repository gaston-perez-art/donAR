import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/donar-theme';

type Props = { emoji: string; title: string; subtitle: string };

/** Temporary screen for tabs not yet built as vertical slices. */
export function Placeholder({ emoji, title, subtitle }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.center}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>{subtitle}</Text>
        <View style={styles.pill}>
          <Text style={styles.pillText}>Próximamente</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  emoji: { fontSize: 56, marginBottom: Spacing.lg },
  title: { fontSize: 20, fontWeight: '800', color: Colors.ink, letterSpacing: -0.4 },
  sub: {
    fontSize: 14,
    color: Colors.muted,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 20,
    maxWidth: 260,
  },
  pill: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.skySoft,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pillText: { color: Colors.brandDark, fontWeight: '700', fontSize: 12 },
});
