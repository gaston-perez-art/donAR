/**
 * Siembra UNA causa "de otra persona" en Supabase, para poder donar en la app
 * sin que ese aporte cuente como "recibido" en tu propio perfil.
 *
 * Cómo funciona: crea una sesión anónima nueva (un "dueño" distinto de tu
 * sesión en el celu) y publica la causa a nombre de esa sesión, igual que
 * hace la app al crear una causa. No usa ninguna clave privada.
 *
 * Requiere: haber corrido antes en el SQL Editor de Supabase las migraciones
 * al final de supabase/schema.sql (columna image_urls, etc).
 *
 * Uso: node scripts/seed-demo-cause.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fyaxvofpqqlvtudmnmxi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_BJTikY4NV5sb4DRDBCxVdg_16pVBYtS';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data: auth, error: authError } = await supabase.auth.signInAnonymously();
  if (authError || !auth.user) {
    throw new Error(`No se pudo crear la sesión del "dueño" mock: ${authError?.message}`);
  }
  console.log('Sesión mock creada:', auth.user.id);

  const { data: cause, error: causeError } = await supabase
    .from('causes')
    .insert({
      owner_id: auth.user.id,
      title: 'Materiales para el comedor Los Pinos',
      story:
        'El comedor Los Pinos da de comer a 60 chicos por semana en San Martín. Se les rompió la heladera grande y necesitan reponerla antes de que se pudra la mercadería que reciben donada.',
      goal_amount: 450000,
      deadline: null,
      status: 'active',
      verified: true,
      emoji: '🍲',
      cover_tint: '#FBE9CF',
      image_urls: ['https://picsum.photos/seed/donar-comedor-los-pinos/800/600'],
    })
    .select()
    .single();

  if (causeError || !cause) {
    throw new Error(`No se pudo crear la causa: ${causeError?.message}`);
  }
  console.log('Causa creada:', cause.id, '-', cause.title);

  const { error: payoutError } = await supabase.from('cause_payouts').insert({
    cause_id: cause.id,
    method: 'cbu',
    alias: 'comedor.lospinos.mp',
  });
  if (payoutError) {
    throw new Error(`No se pudo crear el payout: ${payoutError.message}`);
  }

  console.log('Listo. Refrescá el feed en la app: ya no todas las causas son tuyas.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
