import { createElement } from 'react';

/**
 * Selector de fecha para la versión web: el DateTimePicker nativo no existe
 * en el navegador. Usa el <input type="date"> del navegador dentro de la misma
 * hoja que iOS, así el flujo (elegir, "Listo", "Cancelar") es idéntico.
 */
type Props = { value: Date; minimumDate?: Date; onChange: (d: Date) => void };

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function WebDateInput({ value, minimumDate, onChange }: Props) {
  return createElement('input', {
    type: 'date',
    value: toISO(value),
    min: minimumDate ? toISO(minimumDate) : undefined,
    onChange: (e: { target: { value: string } }) => {
      const [y, m, d] = e.target.value.split('-').map(Number);
      if (y && m && d) onChange(new Date(y, m - 1, d));
    },
    style: {
      width: '100%', fontSize: 18, padding: 14, margin: '12px 0', borderRadius: 12,
      border: '1px solid #D9E2EC', fontFamily: 'inherit', color: '#1F2933', background: '#fff',
    },
  });
}
