import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Project URL y publishable key. La key publishable es pública: es seguro
// tenerla en el cliente. NUNCA poner acá la service/secret key.
const SUPABASE_URL = 'https://fyaxvofpqqlvtudmnmxi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_BJTikY4NV5sb4DRDBCxVdg_16pVBYtS';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Garantiza que haya una sesión. Por ahora anónima; más adelante se "asciende"
 * a una cuenta con Google o email sin perder el usuario.
 */
export async function ensureSession(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  if (data.session?.user) return data.session.user.id;

  const { data: anon, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn('Supabase anon sign-in failed:', error.message);
    return null;
  }
  return anon.user?.id ?? null;
}
