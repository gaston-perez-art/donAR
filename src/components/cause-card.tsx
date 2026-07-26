import { useState } from 'react';
import {
  Image,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Colors, formatARS, Radius, Spacing } from '@/constants/donar-theme';
import type { Cause } from '@/data/causes';

type Props = {
  cause: Cause;
  onPress?: () => void;
  mine?: boolean;
};

const COVER_HEIGHT = 180;

/** Airbnb-style cause card: cover image area, title, progress bar and amounts. */
export function CauseCard({ cause, onPress, mine }: Props) {
  const pct = Math.min(100, Math.round((cause.raised / cause.goal) * 100));
  const done = cause.status === 'completed';
  const images = cause.imageUrls;
  const [coverWidth, setCoverWidth] = useState(0);
  const [activeImage, setActiveImage] = useState(0);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!coverWidth) return;
    setActiveImage(Math.round(e.nativeEvent.contentOffset.x / coverWidth));
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}>
      <View
        style={[styles.cover, { backgroundColor: cause.coverTint }]}
        onLayout={(e) => setCoverWidth(e.nativeEvent.layout.width)}>
        {images.length > 0 && coverWidth > 0 && (
          <ScrollView
            horizontal
            pagingEnabled
            scrollEnabled={images.length > 1}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScrollEnd}
            style={StyleSheet.absoluteFill}>
            {images.map((uri, i) => (
              <Image
                key={i}
                source={{ uri }}
                style={{ width: coverWidth, height: COVER_HEIGHT }}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        )}
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <View style={[styles.tick, done && styles.tickHappy]}>
              <Text style={styles.tickText}>✓</Text>
            </View>
            <Text style={[styles.badgeText, done && styles.badgeTextHappy]}>
              {done ? 'Meta alcanzada' : 'Causa verificada'}
            </Text>
          </View>
          {mine && (
            <View style={styles.minePill}>
              <Text style={styles.mineText}>Tu causa</Text>
            </View>
          )}
        </View>
        {images.length === 0 && <Text style={styles.emoji}>{cause.emoji}</Text>}
        {images.length > 1 && (
          <View style={styles.dots}>
            {images.map((_, i) => (
              <View key={i} style={[styles.dot, i === activeImage && styles.dotActive]} />
            ))}
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>{cause.title}</Text>
        <Text style={styles.who}>{cause.who}</Text>

        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              { width: `${pct}%`, backgroundColor: done ? Colors.happy : Colors.brand },
            ]}
          />
        </View>

        <View style={styles.amounts}>
          <Text style={styles.raised}>
            {formatARS(cause.raised)}{' '}
            <Text style={styles.goal}>de {formatARS(cause.goal)}</Text>
          </Text>
          <Text style={[styles.days, done && styles.daysHappy]}>
            {done ? 'Cumplida ✓' : `${cause.daysLeft} días restantes`}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  pressed: { opacity: 0.85 },
  cover: {
    height: COVER_HEIGHT,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  minePill: {
    backgroundColor: Colors.brand,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  mineText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  tick: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.verified,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickHappy: { backgroundColor: Colors.happy },
  tickText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  badgeText: { color: Colors.brandDark, fontSize: 11.5, fontWeight: '700' },
  badgeTextHappy: { color: '#0F7A49' },
  emoji: { position: 'absolute', bottom: 10, right: 14, fontSize: 44 },
  dots: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.55)' },
  dotActive: { backgroundColor: '#fff' },
  body: { paddingTop: Spacing.md, paddingHorizontal: Spacing.xs },
  title: { fontSize: 16, fontWeight: '700', color: Colors.ink, letterSpacing: -0.2 },
  who: { fontSize: 13, color: Colors.muted, marginTop: 3, marginBottom: Spacing.md },
  track: { height: 8, borderRadius: 20, backgroundColor: '#EDF2F6', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 20 },
  amounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 10,
  },
  raised: { fontSize: 15, fontWeight: '800', color: Colors.ink },
  goal: { fontSize: 11.5, fontWeight: '500', color: Colors.muted },
  days: { fontSize: 12, color: Colors.muted },
  daysHappy: { color: Colors.happy, fontWeight: '700' },
});
