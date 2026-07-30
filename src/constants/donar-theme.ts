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

/**
 * Versión abreviada, solo para totales grandes en tarjetas chicas (ej. los
 * stats "Donaste"/"Recibiste" del perfil, que rompían a 2 líneas con montos
 * de 8+ cifras). Abrevia recién desde el millón (mismo criterio que
 * Instagram/redes), NUNCA para montos individuales de un aporte: ahí la cifra
 * exacta es parte de la trazabilidad, el eje del producto.
 * 2160000 -> "$2,2M" · 111000000 -> "$111M" · 850000 -> "$850.000" (sin cambios).
 */
export function formatARSCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs < 1_000_000) return formatARS(value);
  const millions = value / 1_000_000;
  const rounded = Math.round(millions * 10) / 10;
  const digits = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace('.', ',');
  return `$${digits}M`;
}

/**
 * Ícono neutro de una causa sin foto de portada: primera letra del título,
 * sobre el tinte de color ya guardado en la causa (`cover_tint`). Reemplaza
 * al emoji 💙 hardcodeado (30 jul, se repetía igual en toda causa, chocaba
 * con la decisión de marca de evitar el corazón genérico). Mismo espíritu
 * que `initialsFor` para donantes, pero de una sola letra: el título de una
 * causa no tiene la estructura "nombre + apellido" de una persona.
 */
export function causeInitial(title?: string | null): string {
  const trimmed = (title ?? '').trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
}

/**
 * Iniciales para un avatar: primera letra del primer y del último token
 * ("Gastón Pérez" -> "GP", ignora nombres del medio). Si el nombre es una
 * sola palabra (cuentas viejas sin nombre/apellido separados, o el mail como
 * fallback), usa sus primeros 2 caracteres en vez de una sola letra.
 */
export function initialsFor(name?: string | null): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
