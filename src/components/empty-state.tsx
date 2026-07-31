import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { Colors, Radius, Spacing } from '@/constants/donar-theme';

type Props = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * Estado vacío unificado: `BrandMark` + título + sub opcional + CTA
 * opcional. Layout y estilos copiados del feed (`(tabs)/index.tsx`), la
 * implementación de referencia (Épica 17, 31 jul). El `BrandMark` es un
 * momento puntual de marca, nunca se repite fila por fila.
 */
export function EmptyState({ title, subtitle, actionLabel, onAction }: Props) {
  return (
    <View style={styles.empty}>
      <View style={{ marginBottom: Spacing.md }}>
        <BrandMark size={64} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable style={styles.btn} onPress={onAction}>
          <Text style={styles.btnText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xxl },
  title: { fontSize: 16, fontWeight: '700', color: Colors.ink, textAlign: 'center' },
  subtitle: {
    fontSize: 13,
    color: Colors.muted,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 19,
    maxWidth: 280,
  },
  btn: {
    backgroundColor: Colors.brand,
    borderRadius: Radius.md,
    paddingHorizontal: 22,
    paddingVertical: 12,
    marginTop: Spacing.lg,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
