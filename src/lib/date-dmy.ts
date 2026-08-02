/** Utilidades de fecha en formato "DD/MM/AAAA" (el que usa el date picker de
 * crear/editar causa), compartidas entre create.tsx y edit-cause/[id].tsx. */

const pad = (n: number) => String(n).padStart(2, '0');

export function formatDMY(d: Date): string {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function parseDMY(dmy: string): Date {
  const m = dmy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : startOfToday();
}

/** Válida de verdad (no "31/02") y no anterior a hoy. */
export function isValidFutureDate(dmy: string): boolean {
  const m = dmy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return false;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const d = new Date(year, month - 1, day);
  const isRealDate = d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
  return isRealDate && d.getTime() >= startOfToday().getTime();
}

/** "DD/MM/AAAA" -> "AAAA-MM-DD" para Postgres. null si está incompleta. */
export function toISODate(dmy: string): string | null {
  const m = dmy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** "AAAA-MM-DD" (lo que devuelve Postgres) -> "DD/MM/AAAA" (lo que muestra el picker). */
export function fromISODate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}
