/**
 * Niveles y medallas del donante. Extraído de profile.tsx para poder
 * calcularlos también para OTRO donante (mini-perfil del ranking, 29 jul):
 * la fórmula es la misma, solo cambia de quién son los datos.
 */

/** Lo mínimo que hace falta para calcular nivel y medallas de un donante. */
export type DonorStats = {
  donationsCount: number;
  causesSupported: number;
  completedSupported: number;
};

/** Niveles del donante. El umbral es la cantidad de causas distintas apoyadas. */
export const LEVELS = [
  { min: 0, name: 'Solidario' },
  { min: 3, name: 'Comprometido' },
  { min: 10, name: 'Referente' },
] as const;

export function levelFor(causesSupported: number) {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (causesSupported >= LEVELS[i].min) index = i;
  }
  const current = LEVELS[index];
  const next = LEVELS[index + 1];
  const floor = current.min;
  const ceil = next ? next.min : current.min;
  const pct = next ? Math.min(100, Math.round(((causesSupported - floor) / (ceil - floor)) * 100)) : 100;
  const toNext = next ? next.min - causesSupported : 0;
  return { number: index + 1, name: current.name, next: next?.name ?? null, pct, toNext };
}

export type Medal = { key: string; emoji: string; label: string; earned: boolean; hint: string };

export function medalsFor(a: DonorStats): Medal[] {
  return [
    {
      key: 'primer',
      emoji: '💧',
      label: 'Primer aporte',
      earned: a.donationsCount >= 1,
      hint: 'Hacé tu primera donación',
    },
    {
      key: 'tres',
      emoji: '🤝',
      label: 'Tres causas',
      earned: a.causesSupported >= 3,
      hint: `Apoyá 3 causas (llevás ${a.causesSupported})`,
    },
    {
      key: 'diez',
      emoji: '🌟',
      label: 'Diez causas',
      earned: a.causesSupported >= 10,
      hint: `Apoyá 10 causas (llevás ${a.causesSupported})`,
    },
    {
      key: 'meta',
      emoji: '🏁',
      label: 'Meta cumplida',
      earned: a.completedSupported >= 1,
      hint: 'Apoyá una causa que llegue a su meta',
    },
  ];
}
