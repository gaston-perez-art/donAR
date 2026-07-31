import { useCallback, useEffect, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/donar-theme';
import { useOnboardingFlag } from '@/hooks/use-onboarding-flag';
import { useAppTourTargets, type TourTargetKey } from '@/store/app-tour-context';
import { useCauses } from '@/store/causes-store';

// Versionada (mismo criterio que el Tour 1): subir a v2 lo vuelve a mostrar
// a todos sin borrar nada a mano.
const APP_TOUR_KEY = 'donar.tour.app.v1';

type Step = { key: TourTargetKey; text: string };

// Copy y orden del plan (Bloque E), sin reescribir.
const STEPS: Step[] = [
  {
    key: 'feed',
    text: 'Acá vas a ver las causas verificadas. Cada una pasó por un curador antes de publicarse.',
  },
  { key: 'tabPlus', text: 'Si necesitás ayuda, desde acá contás tu situación y pedís.' },
  { key: 'tabRanking', text: 'Los que más sostienen causas. Doná y sumá tus primeros puntos.' },
  { key: 'tabActivity', text: 'Acá te enterás cuando alguien aporta a tu causa o cuando te agradecen.' },
  { key: 'tabProfile', text: 'Tu nombre, tu foto, y todo lo que donaste y recibiste.' },
];

type Rect = { x: number; y: number; width: number; height: number };

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const PAD = 8;
const GAP = 14;
const MAX_MEASURE_ATTEMPTS = 6;

/**
 * Tour 2 (Bloque E): coach marks que iluminan una sección real de la app a
 * la vez. Corre la primera vez que se entra al feed con sesión iniciada
 * (flag propio `donar.tour.app.v1`, separado del Tour 1) y también sirve de
 * replay desde "Cómo funciona" vía `replayTour === 'app'` en el store
 * (mismo mecanismo que el Tour 1, sin Modal: acá ya vive dentro de
 * `(tabs)/_layout.tsx`, superpuesto a la app real).
 *
 * Iluminar sin sumar dependencias: cuatro rectángulos oscuros alrededor del
 * target medido con `measureInWindow` (nunca una posición calculada a
 * mano), dejando el hueco transparente. Nada de blur (mismo motivo que el
 * Tour 1: crashea en Android fuera del build nativo).
 */
export function AppTourOverlay() {
  const { seen, loading, markSeen } = useOnboardingFlag(APP_TOUR_KEY);
  const { replayTour, setReplayTour } = useCauses();
  const { getTarget } = useAppTourTargets();

  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const shouldRun = !loading && (!seen || replayTour === 'app');

  useEffect(() => {
    if (shouldRun && !active) {
      setStep(0);
      setActive(true);
    }
  }, [shouldRun, active]);

  const finish = useCallback(() => {
    setActive(false);
    setRect(null);
    markSeen();
    setReplayTour(null);
  }, [markSeen, setReplayTour]);

  // Mide el target del paso actual. Reintenta con un delay corto: justo
  // después de loguearse, el feed puede no haber terminado de layoutear en
  // el primer intento. Si un target nunca se puede medir (ej. un `ref` que
  // no llegó a montar), saltea el paso en vez de trabar el tour entero.
  useEffect(() => {
    if (!active) return;
    let alive = true;
    let attempts = 0;

    const tryMeasure = () => {
      const node = getTarget(STEPS[step].key);
      if (!node) {
        attempts += 1;
        if (attempts < MAX_MEASURE_ATTEMPTS) {
          setTimeout(tryMeasure, 200);
        } else if (alive) {
          if (step < STEPS.length - 1) setStep((s) => s + 1);
          else finish();
        }
        return;
      }
      node.measureInWindow((x, y, width, height) => {
        if (alive) setRect({ x, y, width, height });
      });
    };

    const t = setTimeout(tryMeasure, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [active, step, getTarget, finish]);

  if (!active || !rect) return null;

  const isLast = step === STEPS.length - 1;

  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={() => {}}>
      <Spotlight rect={rect} />
      <Tooltip
        rect={rect}
        text={STEPS[step].text}
        stepLabel={`${step + 1}/${STEPS.length}`}
        isLast={isLast}
        onSkip={finish}
        onNext={() => (isLast ? finish() : setStep((s) => s + 1))}
      />
    </Pressable>
  );
}

/** Cuatro rectángulos oscuros alrededor del target, hueco transparente en
 * el medio. El `Pressable` de más arriba ya absorbe todos los toques
 * (incluidos los del hueco), así que estos rectángulos son puramente
 * visuales. */
function Spotlight({ rect }: { rect: Rect }) {
  const top = Math.max(0, rect.y - PAD);
  const bottom = Math.min(SCREEN_H, rect.y + rect.height + PAD);
  const left = Math.max(0, rect.x - PAD);
  const right = Math.min(SCREEN_W, rect.x + rect.width + PAD);

  return (
    <>
      <View style={[styles.mask, { top: 0, left: 0, width: SCREEN_W, height: top }]} />
      <View style={[styles.mask, { top: bottom, left: 0, width: SCREEN_W, height: SCREEN_H - bottom }]} />
      <View style={[styles.mask, { top, left: 0, width: left, height: bottom - top }]} />
      <View style={[styles.mask, { top, left: right, width: SCREEN_W - right, height: bottom - top }]} />
    </>
  );
}

function Tooltip({
  rect,
  text,
  stepLabel,
  isLast,
  onSkip,
  onNext,
}: {
  rect: Rect;
  text: string;
  stepLabel: string;
  isLast: boolean;
  onSkip: () => void;
  onNext: () => void;
}) {
  const holeTop = Math.max(0, rect.y - PAD);
  const holeBottom = Math.min(SCREEN_H, rect.y + rect.height + PAD);
  const spaceBelow = SCREEN_H - holeBottom;
  const spaceAbove = holeTop;
  // Se posiciona arriba o abajo del hueco según dónde haya más lugar. Usar
  // `bottom` para el caso "arriba" evita tener que conocer de antemano la
  // altura del tooltip (varía según el largo del texto de cada paso).
  const positionStyle = spaceBelow >= spaceAbove ? { top: holeBottom + GAP } : { bottom: SCREEN_H - holeTop + GAP };

  return (
    <View style={[styles.tooltip, positionStyle]}>
      <View style={styles.tooltipHead}>
        <Text style={styles.tooltipStep}>{stepLabel}</Text>
        <Pressable onPress={onSkip} hitSlop={8}>
          <Text style={styles.tooltipSkip}>Saltar</Text>
        </Pressable>
      </View>
      <Text style={styles.tooltipText}>{text}</Text>
      <Pressable style={styles.tooltipBtn} onPress={onNext}>
        <Text style={styles.tooltipBtnText}>{isLast ? 'Entendido' : 'Siguiente'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  mask: { position: 'absolute', backgroundColor: 'rgba(11,39,58,0.74)' },
  tooltip: {
    position: 'absolute',
    left: Spacing.xl,
    right: Spacing.xl,
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  tooltipHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  tooltipStep: { fontSize: 11.5, fontWeight: '700', color: Colors.muted },
  tooltipSkip: { fontSize: 13, fontWeight: '700', color: Colors.muted },
  tooltipText: { fontSize: 14.5, color: Colors.ink, lineHeight: 20.5 },
  tooltipBtn: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.brand,
    borderRadius: Radius.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  tooltipBtnText: { color: '#fff', fontWeight: '700', fontSize: 14.5 },
});
