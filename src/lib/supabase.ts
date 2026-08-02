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
 * El nombre completo (si se manda) llega como metadata: el trigger
 * handle_new_user() ya sabe leerlo para setear full_name/initials en profiles.
 */
export async function signUpWithPassword(
  email: string,
  password: string,
  fullName?: string,
): Promise<{ error: string | null }> {
  const name = fullName?.trim();
  const { error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: name ? { data: { full_name: name } } : undefined,
  });
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
 * Pide el mail de "olvidé mi contraseña" (10.2). El link lleva de vuelta a la
 * app por deep link (`redirectTo`), con los tokens de recuperación en el
 * fragment de la URL. DEPENDENCIA DURA: necesita un dominio propio verificado
 * en Resend para que el mail llegue a cualquier casilla (hoy el sender de
 * prueba solo entrega a la cuenta de Resend) — sin eso, el código es
 * correcto pero no se puede probar de punta a punta.
 */
export async function requestPasswordReset(
  email: string,
  redirectTo: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
  return { error: authError(error?.message) };
}

/**
 * Extrae los tokens de recuperación del deep link (vienen en el fragment,
 * `#access_token=...&refresh_token=...&type=recovery`; algunos clientes de
 * mail los mandan como query `?...`, se contempla también). null si la URL
 * no es un link de recuperación.
 */
function parseRecoveryTokens(url: string): { accessToken: string; refreshToken: string } | null {
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  const paramsString = hashIndex >= 0 ? url.slice(hashIndex + 1) : queryIndex >= 0 ? url.slice(queryIndex + 1) : '';
  if (!paramsString) return null;
  const params = new URLSearchParams(paramsString);
  if (params.get('type') !== 'recovery') return null;
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

/** Establece la sesión de recuperación a partir del deep link. true si era un
 * link de recuperación válido y quedó lista la sesión para cambiar la pass. */
export async function beginPasswordRecovery(url: string): Promise<boolean> {
  const tokens = parseRecoveryTokens(url);
  if (!tokens) return false;
  const { error } = await supabase.auth.setSession({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });
  if (error) {
    console.warn('beginPasswordRecovery error:', error.message);
    return false;
  }
  return true;
}

/** Cambia la contraseña. Requiere una sesión de recuperación activa (ver
 * beginPasswordRecovery) o una sesión normal ya logueada. */
export async function updatePassword(newPassword: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { error: authError(error?.message) };
}

/**
 * Marca el perfil propio como registrado y le pone un nombre para mostrar en
 * el ranking. Si viene `fullName` (registro nuevo, 10.3), se usa ese; si no,
 * y el perfil todavía no tiene display_name (cuenta vieja, o login sin
 * pasar nombre), se auto-completa derivándolo del mail como antes. Importante:
 * NO pisa un display_name ya bueno en cada login (antes lo recalculaba del
 * mail cada vez, así que un nombre real quedaría sobreescrito al día
 * siguiente si esto no se cuidara).
 */
export async function ensureRegisteredProfile(email: string, fullName?: string): Promise<void> {
  const uid = await ensureSession();
  if (!uid) return;

  const patch: Record<string, unknown> = { is_registered: true };
  const name = fullName?.trim();
  if (name) {
    patch.display_name = name;
    patch.full_name = name;
  } else {
    const { data: existing } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', uid)
      .maybeSingle();
    if (!existing?.display_name) {
      const local = (email.split('@')[0] || 'Donante').trim();
      patch.display_name = local.charAt(0).toUpperCase() + local.slice(1);
    }
  }

  const { error } = await supabase.from('profiles').update(patch).eq('id', uid);
  if (error) console.warn('ensureRegisteredProfile error:', error.message);
}

/**
 * Cambia el nombre para mostrar de la cuenta propia (10.4). Hasta acá
 * `display_name` solo se escribía una vez, al registrarse: las cuentas
 * anteriores a 10.3 quedaron con el nombre derivado del mail para siempre y
 * la única salida era un UPDATE a mano en la base.
 *
 * Escribe los dos lados para que no queden desincronizados: las columnas de
 * `profiles` (lo que lee toda la app: ranking, mini-perfil, aportes) y la
 * metadata de auth (`full_name`, lo que dejó el signup). El trigger de 15.2
 * fuerza `is_curator`/`points` a su valor previo, así que este update no
 * necesita policy nueva: toca solo columnas libres de la propia fila.
 */
export async function updateProfileName(fullName: string): Promise<{ error: string | null }> {
  const uid = await ensureSession();
  if (!uid) return { error: 'Necesitás iniciar sesión.' };

  const name = fullName.trim();
  if (!name) return { error: 'El nombre no puede quedar vacío.' };

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: name, full_name: name })
    .eq('id', uid);
  if (error) return { error: 'No pudimos guardar tu nombre. Probá de nuevo.' };

  // Best-effort: si falla, el nombre real (el de profiles) ya quedó bien.
  await supabase.auth.updateUser({ data: { full_name: name } });
  return { error: null };
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
    // Cache-bust: el path es fijo por índice (cover-0/cover-1), así que al
    // reemplazar una foto desde la edición de causa (Épica 1.6) el cliente
    // podría mostrar la imagen vieja cacheada sin esto (mismo fix que avatars).
    const { data } = supabase.storage.from('cause-covers').getPublicUrl(path);
    return { url: `${data.publicUrl}?t=${Date.now()}`, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error subiendo la foto';
    return { url: null, error: message };
  }
}

/**
 * Sube la foto del mensaje de cierre (bucket cause-covers, público: mismo
 * patrón que la portada). Path propio (closing.jpg) para no pisar las fotos
 * de portada de la misma causa.
 */
export async function uploadClosingPhoto(
  localUri: string,
  causeId: string,
  contentType: string,
): Promise<{ url: string | null; error: string | null }> {
  const uid = await ensureSession();
  if (!uid) return { url: null, error: 'No hay sesión' };

  try {
    const path = `${uid}/${causeId}/closing.jpg`;

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
 * Sube la foto de perfil (bucket avatars, público, mismo patrón que
 * cause-covers). Un solo archivo por usuario (path fijo): la nueva pisa la
 * vieja.
 */
export async function uploadAvatarPhoto(
  localUri: string,
  contentType: string,
): Promise<{ url: string | null; error: string | null }> {
  const uid = await ensureSession();
  if (!uid) return { url: null, error: 'No hay sesión' };

  try {
    const path = `${uid}/avatar.jpg`;

    const response = await fetch(localUri);
    const arrayBuffer = await response.arrayBuffer();

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, arrayBuffer, { contentType, upsert: true });

    if (error) return { url: null, error: error.message };
    // Cache-bust: mismo path, así que sin esto el cliente podría mostrar la
    // imagen vieja cacheada tras cambiar la foto.
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return { url: `${data.publicUrl}?t=${Date.now()}`, error: null };
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
