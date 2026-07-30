import { Image, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/donar-theme';

type Props = { size?: number };

/**
 * El símbolo real del ícono de la app (mano + corazón), en su celeste de
 * marca. Reservado para momentos puntuales de prominencia (loading inicial,
 * estados vacíos): a diferencia del ícono de una causa, este SÍ es la marca,
 * así que no debe repetirse fila por fila o se banaliza (ver
 * docs/BACKLOG.md, Épica 13.5).
 */
export function BrandMark({ size = 84 }: Props) {
  const symbolSize = Math.round(size * 0.62);
  return (
    <View style={[styles.mark, { width: size, height: size, borderRadius: Math.round(size * 0.28) }]}>
      <Image
        source={require('../../assets/images/android-icon-foreground.png')}
        style={{ width: symbolSize, height: symbolSize }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { backgroundColor: Colors.brand, alignItems: 'center', justifyContent: 'center' },
});
