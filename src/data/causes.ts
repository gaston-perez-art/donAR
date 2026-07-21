/**
 * Mock data for the POC. No backend yet: this is what the Feed renders.
 * Replace with real data once the API / Supabase layer exists.
 */

export type Cause = {
  id: string;
  title: string;
  story: string;
  who: string;
  emoji: string;
  coverTint: string;
  raised: number;
  goal: number;
  daysLeft: number;
  status: 'active' | 'completed' | 'closed' | 'review';
  verified: boolean;
  /** True when the cause was created by the current user (local session). */
  mine?: boolean;
};

export const causes: Cause[] = [
  {
    id: 'mateo',
    title: 'Tratamiento para Mateo, 6 años',
    who: 'Familia Gómez · Florencio Varela',
    emoji: '💙',
    coverTint: '#CFE6FB',
    raised: 2160000,
    goal: 3000000,
    daysLeft: 8,
    status: 'active',
    verified: true,
  },
  {
    id: 'casa',
    title: 'Reconstruir la casa tras el incendio',
    who: 'Carla R. · Quilmes',
    emoji: '🏠',
    coverTint: '#D7ECFB',
    raised: 820000,
    goal: 2000000,
    daysLeft: 15,
    status: 'active',
    verified: true,
  },
  {
    id: 'silla',
    title: 'Silla de ruedas para Don Alberto',
    who: 'Centro vecinal · Berazategui',
    emoji: '♿',
    coverTint: '#C7F0DC',
    raised: 600000,
    goal: 600000,
    daysLeft: 0,
    status: 'completed',
    verified: true,
  },
];

export const activeCauses = causes.filter((c) => c.status === 'active');
export const completedCauses = causes.filter((c) => c.status === 'completed');
