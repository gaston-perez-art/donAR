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
 * Devuelve el uid de la sesión actual SOLO si es una cuenta real (logueada con
 * mail + contraseña). Ya no crea sesiones anónimas: la app exige login (todo
 * queda atado a una cuenta que persiste). Si no hay sesión real, devuelve null
 * y el gate de _layout muestra la pantalla de login.
 */
export async function ensureSession(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (user && !user.is_anonymous) return user.id;
  return null;
}

/** Traduce los errores de Supabase Auth a algo legible en español. */
function authError(message?: string): string | null {
  if (!message) return null;
  const m = message.toLowerCase();
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'Ese mail ya tiene una cuenta. Iniciá sesión.';
  }
  if (m.includes('invalid login credentials')) return 'Mail o contraseña incorrectos.';
  if (m.includes('password should be at least')) return 'La contraseña necesita al menos 6 caracteres.';
  if (m.includes('unable to validate email') || m.includes('invalid format')) return 'Ese mail no parece válido.';
  if (m.includes('email not confirmed')) {
    return 'La cuenta necesita confirmar el mail. Avisá al equipo (falta apagar la confirmación).';
  }
  return message;
}

/**
 * Crea una cuenta con mail + contraseña y deja la sesión iniciada. Requiere que
 * "Confirm email" esté APAGADO en Supabase (si no, no loguea hasta confirmar,
 * y el mail de confirmación hoy no se entrega sin dominio propio en Resend).
 */
export async function signUpWithPassword(
  email: string,
  password: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signUp({ email: email.trim(), password });
  return { error: authError(error?.message) };
}

/** Inicia sesión con mail + contraseña. */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  return { error: authError(error?.message) };
}

/**
 * Marca el perfil propio como registrado y le pone un nombre para mostrar en el
 * ranking, derivado del mail (la parte antes del @, capitalizada). Se llama al
 * vincular o loguear con mail, y como self-heal para cuentas ya vinculadas.
 */
export async function ensureRegisteredProfile(email: string): Promise<void> {
  const uid = await ensureSession();
  if (!uid) return;
  const local = (email.split('@')[0] || 'Donante').trim();
  const displayName = local.charAt(0).toUpperCase() + local.slice(1);
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName, is_registered: true })
    .eq('id', uid);
  if (error) console.warn('ensureRegisteredProfile error:', error.message);
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

  try {
    const ext = contentType.includes('pdf') ? 'pdf' : 'jpg';
    const path = `${uid}/${causeId}/${kind}.${ext}`;

    const response = await fetch(localUri);
    const arrayBuffer = await response.arrayBuffer();

    const { error } = await supabase.storage
      .from('cause-evidence')
      .upload(path, arrayBuffer, { contentType, upsert: true });

    if (error) return { path: null, error: error.message };
    return { path, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error subiendo el archivo';
    return { path: null, error: message };
  }
}

/** URL temporal (10 min) para ver un archivo de evidencia privado. */
export async function getEvidenceUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('cause-evidence').createSignedUrl(path, 600);
  if (error) return null;
  return data.signedUrl;
}

/**
 * Sube una foto de portada (opcional, pública) al bucket cause-covers.
 * A diferencia de la evidencia, cualquiera la puede ver: es lo que se
 * muestra en el feed. Devuelve la URL pública lista para usar.
 */
export async function uploadCoverPhoto(
  localUri: string,
  causeId: string,
  index: number,
  contentType: string,
): Promise<{ url: string | null; error: string | null }> {
  const uid = await ensureSession();
  if (!uid) return { url: null, error: 'No hay sesión' };

  try {
    const path = `${uid}/${causeId}/cover-${index}.jpg`;

    const response = await fetch(localUri);
    const arrayBuffer = await response.arrayBuffer();

    const { error } = await supabase.storage
      .from('cause-covers')
      .upload(path, arrayBuffer, { contentType, upsert: true });

    if (error) return { url: null, error: error.message };
    const { data } = supabase.storage.from('cause-covers').getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error subiendo la foto';
    return { url: null, error: message };
  }
}

/**
 * Sube el comprobante de una transferencia al bucket privado transfer-receipts.
 * Lo lee el donante que lo subió y el dueño de la causa (para confirmar).
 * Devuelve el path (no una URL pública): se ve con URL firmada.
 */
export async function uploadReceipt(
  localUri: string,
  causeId: string,
  contentType: string,
): Promise<{ path: string | null; error: string | null }> {
  const uid = await ensureSession();
  if (!uid) return { path: null, error: 'No hay sesión' };

  try {
    const path = `${uid}/${causeId}/${Date.now()}.jpg`;
    const response = await fetch(localUri);
    const arrayBuffer = await response.arrayBuffer();

    const { error } = await supabase.storage
      .from('transfer-receipts')
      .upload(path, arrayBuffer, { contentType, upsert: true });

    if (error) return { path: null, error: error.message };
    return { path, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error subiendo el comprobante';
    return { path: null, error: message };
  }
}

/** URL temporal (10 min) para ver un comprobante de transferencia privado. */
export async function getReceiptUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('transfer-receipts').createSignedUrl(path, 600);
  if (error) return null;
  return data.signedUrl;
}
