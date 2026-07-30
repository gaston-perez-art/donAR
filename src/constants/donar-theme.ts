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
 * Versión abreviada, para totales grandes: montos AGREGADOS/resumen (stats
 * "Donaste"/"Recibiste" del perfil, recaudado/meta de una causa, mini-reporte
 * de cierre), nunca para el monto de UN aporte puntual, un pago en curso o
 * una instrucción de transferencia: ahí la cifra exacta es la trazabilidad
 * (o, en una transferencia, la seguridad del pago) y no debe abreviarse.
 * Umbral en $10.000.000 (30 jul, pedido de Gastón: por debajo no vale la
 * pena, la versión con puntos ya se lee bien). Formato "N Mill" (con espacio,
 * como se abrevia "millones" en criollo), no "NM": más legible que la
 * convención de redes en inglés.
 * 2.160.000 -> "$2.160.000" (sin cambios, no llega al umbral)
 * 111.000.000 -> "$111 Mill" · 12.300.000 -> "$12,3 Mill".
 */
export function formatARSCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs < 10_000_000) return formatARS(value);
  const millions = value / 1_000_000;
  const rounded = Math.round(millions * 10) / 10;
  const digits = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace('.', ',');
  return `$${digits} Mill`;
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
