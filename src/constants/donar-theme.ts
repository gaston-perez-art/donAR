/**
 * DonAR design tokens.
 * Celeste / azul palette (Airbnb-style: rounded, airy). Mirrors the HTML prototype.
 */

export const Colors = {
  brand: '#1E88E5',
  brandDark: '#1565C0',
  sky: '#5AB9F2',
  skySoft: '#E9F5FE',
  skyTint: '#F2F9FE',
  verified: '#1E9BF0',
  ink: '#1B2733',
  muted: '#71808C',
  line: '#EEF2F6',
  bg: '#FFFFFF',
  card: '#FFFFFF',
  gold: '#F4B740',
  happy: '#17B26A',
  sad: '#8A96A3',
} as const;

export const Radius = {
  sm: 12,
  md: 16,
  lg: 18,
  xl: 22,
  pill: 30,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 32,
} as const;

export const TabBarHeight = 78;

/** Formats a number as Argentine pesos: 2160000 -> "$2.160.000". */
export function formatARS(value: number): string {
  const digits = Math.round(value).toString();
  const withDots = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$${withDots}`;
}
