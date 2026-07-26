import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { decode as decodeBase64 } from 'base64-arraybuffer';
import { File } from 'expo-file-system';

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

/**
 * Vincula un mail a la sesión anónima actual (la "asciende" a cuenta permanente
 * sin perder el historial ya generado con ese user id). Dispara un mail con un
 * código de 6 dígitos, se confirma con confirmLinkEmail.
 */
export async function linkEmail(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.updateUser({ email });
  return { error: error?.message ?? null };
}

export async function confirmLinkEmail(email: string, token: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email_change' });
  return { error: error?.message ?? null };
}

/**
 * Recupera una cuenta ya vinculada desde otro dispositivo (mail ya registrado).
 * No crea cuenta nueva si el mail no existe.
 */
export async function loginWithEmail(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  return { error: error?.message ?? null };
}

export async function confirmLogin(email: string, token: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  return { error: error?.message ?? null };
}

/** True si la sesión actual es de un curador (marcado a mano en profiles). */
export async function isCurator(): Promise<boolean> {
  const uid = await ensureSession();
  if (!uid) return false;
  const { data } = await supabase.from('profiles').select('is_curator').eq('id', uid).maybeSingle();
  return !!data?.is_curator;
}

export type EvidenceKind = 'dni-front' | 'dni-back' | 'selfie' | 'backup-doc';

/**
 * Sube un archivo de evidencia (foto o PDF) al bucket privado cause-evidence.
 * Guarda la ruta, no una URL pública: el bucket no es público, se lee con
 * URLs firmadas (ver getEvidenceUrl).
 */
export async function uploadEvidence(
  localUri: string,
  causeId: string,
  kind: EvidenceKind,
  contentType: string,
): Promise<{ path: string | null; error: string | null }> {
  const uid = await ensureSession();
  if (!uid) return { path: null, error: 'No hay sesión' };

  const ext = contentType.includes('pdf') ? 'pdf' : 'jpg';
  const path = `${uid}/${causeId}/${kind}.${ext}`;

  const base64 = await new File(localUri).base64();
  const { error } = await supabase.storage
    .from('cause-evidence')
    .upload(path, decodeBase64(base64), { contentType, upsert: true });

  if (error) return { path: null, error: error.message };
  return { path, error: null };
}

/** URL temporal (10 min) para ver un archivo de evidencia privado. */
export async function getEvidenceUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('cause-evidence').createSignedUrl(path, 600);
  if (error) return null;
  return data.signedUrl;
}
