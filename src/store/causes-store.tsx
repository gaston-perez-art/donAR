import * as Linking from 'expo-linking';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { Cause } from '@/data/causes';
import {
  beginPasswordRecovery as beginPasswordRecoveryRequest,
  ensureRegisteredProfile,
  ensureSession,
  isCurator as fetchIsCurator,
  requestPasswordReset as requestPasswordResetEmail,
  signInWithPassword,
  signUpWithPassword,
  supabase,
  updatePassword,
  uploadAvatarPhoto,
  uploadClosingPhoto,
  uploadCoverPhoto,
  uploadEvidence,
  uploadReceipt,
} from '@/lib/supabase';

/**
 * Data layer. Ahora habla con Supabase. Las pantallas no saben de dónde viene
 * la data: solo usan este store.
 */

/** Ventana de auto-confirmación de una transferencia (Épica 3.3, decidido 29
 * jul): si el beneficiado no confirma ni rechaza, se confirma sola. Se
 * exporta para que las pantallas puedan mostrar el countdown con el mismo
 * número. */
export const AUTO_CONFIRM_HOURS = 48;

/** Horas que faltan para que una transferencia `pending` se confirme sola. 0
 * si ya se venció la ventana (se confirmará en la próxima lectura). */
export function hoursUntilAutoConfirm(createdAtIso: string): number {
  const deadline = new Date(createdAtIso).getTime() + AUTO_CONFIRM_HOURS * 3600 * 1000;
  return Math.max(0, Math.ceil((deadline - Date.now()) / 3600000));
}

export type EvidenceFile = { uri: string; mimeType: string } | null;

export type CauseDraft = {
  title: string;
  story: string;
  goal: string; // texto crudo del input, ej "3.000.000"
  deadline: string;
  payoutMethod: 'mp' | 'cbu';
  alias: string;
  dniFront: EvidenceFile;
  dniBack: EvidenceFile;
  selfie: EvidenceFile;
  backupDoc: EvidenceFile;
  /** Fotos de portada, opcionales. */
  coverPhoto1: EvidenceFile;
  coverPhoto2: EvidenceFile;
};

const emptyDraft: CauseDraft = {
  title: '',
  story: '',
  goal: '',
  deadline: '',
  payoutMethod: 'mp',
  alias: '',
  dniFront: null,
  dniBack: null,
  selfie: null,
  backupDoc: null,
  coverPhoto1: null,
  coverPhoto2: null,
};

const TINTS = ['#CFE6FB', '#D7ECFB', '#E9F5FE', '#C7F0DC'];

function parseAmount(text: string): number {
  const digits = text.replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

/** "DD/MM/AAAA" -> "AAAA-MM-DD" para Postgres. null si está incompleta. */
function toISODate(dmy: string): string | null {
  const m = dmy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function mapRow(row: any, userId: string | null): Cause {
  const goal = Number(row.goal_amount) || 0;
  const raised = Number(row.raised_amount) || 0;
  let daysLeft = 30;
  if (row.deadline) {
    const diff = Math.ceil((new Date(row.deadline).getTime() - Date.now()) / 86400000);
    daysLeft = Math.max(0, diff);
  }
  const mine = !!userId && row.owner_id === userId;
  return {
    id: row.id,
    title: row.title,
    story: row.story ?? '',
    who: mine ? 'Vos' : 'Persona verificada',
    emoji: row.emoji || '💙',
    coverTint: row.cover_tint || '#CFE6FB',
    imageUrls: row.image_urls ?? [],
    createdAt: row.created_at,
    raised,
    goal,
    daysLeft,
    status: row.status,
    verified: row.verified,
    reviewNote: row.review_note ?? null,
    mine,
    closedAt: row.closed_at ?? null,
    contributors: Number(row.contributors) || 0,
    closingMessage: row.closing_message ?? null,
    closingPhotoUrl: row.closing_photo_url ?? null,
  };
}

/**
 * Cierre de causa sin servidor (Expo Go no corre cron/Edge Functions): se
 * evalúa "en el momento" cada vez que se releen las causas del dueño, en los
 * mismos puntos donde ya se refetchea (donar, confirmar transferencia,
 * publicar, etc). Dos gatillos, evaluados sobre el total ya confirmado
 * (`raised_amount`, agregado en el server): llegó a la meta -> 'completed'
 * (cierra de verdad, no se siguen aceptando donaciones); venció el plazo sin
 * llegar -> 'closed'. Solo se persiste para causas propias (RLS de owner).
 */
async function autoCloseIfNeeded(rows: any[], uid: string | null): Promise<void> {
  if (!uid) return;
  const now = Date.now();
  const updates: PromiseLike<unknown>[] = [];
  for (const row of rows) {
    if (row.owner_id !== uid || row.status !== 'active') continue;
    const raised = Number(row.raised_amount) || 0;
    const goal = Number(row.goal_amount) || 0;
    const deadlinePassed = row.deadline
      ? new Date(`${row.deadline}T23:59:59`).getTime() < now
      : false;

    let nextStatus: 'completed' | 'closed' | null = null;
    if (raised >= goal) nextStatus = 'completed';
    else if (deadlinePassed) nextStatus = 'closed';
    if (!nextStatus) continue;

    const closedAt = new Date().toISOString();
    row.status = nextStatus;
    row.closed_at = closedAt;
    updates.push(
      supabase.from('causes').update({ status: nextStatus, closed_at: closedAt }).eq('id', row.id),
    );
  }
  if (updates.length) await Promise.all(updates);
}

/**
 * Auto-confirmación de transferencias (3.3): igual patrón que el cierre de
 * causa, sin servidor. Solo persiste si `isOwner` (RLS solo deja UPDATE al
 * dueño de la causa); si no lo es, la fila se muta igual en memoria para que
 * el que mira vea el estado correcto, pero no se escribe (el dueño la
 * persiste en su propia próxima lectura). Devuelve true si confirmó algo
 * (para saber si hay que refrescar los totales de la causa).
 */
async function autoConfirmIfNeeded(rows: any[], isOwner: boolean): Promise<boolean> {
  const now = Date.now();
  const windowMs = AUTO_CONFIRM_HOURS * 3600 * 1000;
  const updates: PromiseLike<unknown>[] = [];
  let changed = false;
  for (const row of rows) {
    if (row.status !== 'pending') continue;
    if (now - new Date(row.created_at).getTime() < windowMs) continue;
    const confirmedAt = new Date().toISOString();
    row.status = 'approved';
    row.confirmed_at = confirmedAt;
    changed = true;
    if (isOwner) {
      updates.push(
        supabase.from('contributions').update({ status: 'approved', confirmed_at: confirmedAt }).eq('id', row.id),
      );
    }
  }
  if (updates.length) await Promise.all(updates);
  return changed;
}

export type ReviewInfo = {
  dniFrontPath: string | null;
  dniBackPath: string | null;
  selfiePath: string | null;
  backupDocPath: string | null;
  payoutMethod: 'mp' | 'cbu' | null;
  payoutAlias: string | null;
};

export type ReviewAction = 'approve' | 'reject' | 'needs_info';

export type Contribution = {
  id: string;
  name: string;
  amount: number;
  message: string | null;
  createdAt: string;
  mine: boolean;
  status: string; // 'approved' (confirmado) | 'pending' (transferencia por confirmar)
  method: string; // 'mp' | 'transfer'
  receiptPath: string | null;
};

/** Dónde cobra una causa (para mostrarle el destino al donante que transfiere). */
export type Payout = { method: 'mp' | 'cbu'; alias: string } | null;

/** Un aporte que hice yo, con datos de la causa a la que fue. */
export type MyContribution = {
  id: string;
  amount: number;
  message: string | null;
  createdAt: string;
  causeId: string;
  causeTitle: string;
  causeEmoji: string;
  causeTint: string;
  causeStatus: Cause['status'];
  /** 'approved' (confirmado) | 'pending' (transferencia por confirmar) | 'rejected'. */
  status: string;
  /** Cuándo se confirmó (a mano o auto, 3.3). null si sigue pending. Sirve
   * para el kudos "recién te lo confirmaron" (3.4). */
  confirmedAt: string | null;
  /** Mensaje de cierre general que dejó el beneficiado (si ya cerró la causa). */
  causeClosingMessage: string | null;
  /** Agradecimiento puntual del beneficiado a ESTE aporte, si lo hubo. */
  thankYouMessage: string | null;
};

/** Un agradecimiento puntual del beneficiado a un aporte de su causa. */
export type CauseThank = { contributionId: string; message: string };

/** Un aporte que ME hicieron a alguna de mis causas. Solo confirmados
 * (approved): es la misma regla que ya usa el total "Recibiste" del perfil. */
export type ReceivedContribution = {
  id: string;
  amount: number;
  message: string | null;
  createdAt: string;
  donorName: string;
  causeId: string;
  causeTitle: string;
  causeEmoji: string;
  causeTint: string;
};

/** Una transferencia pendiente en alguna de mis causas: todavía no la confirmé. */
export type PendingTransfer = {
  id: string;
  amount: number;
  donorName: string;
  causeId: string;
  causeTitle: string;
  causeEmoji: string;
  causeTint: string;
  createdAt: string;
};

/** Resumen de actividad del usuario para el perfil. Todo derivado de datos reales. */
export type MyActivity = {
  donatedTotal: number; // suma de lo que doné
  donationsCount: number; // cantidad de aportes
  causesSupported: number; // causas distintas que apoyé
  completedSupported: number; // de esas, cuántas llegaron a la meta
  receivedTotal: number; // suma recaudada en mis causas
  myCausesCount: number; // causas que creé
  contributions: MyContribution[];
};

const emptyActivity: MyActivity = {
  donatedTotal: 0,
  donationsCount: 0,
  causesSupported: 0,
  completedSupported: 0,
  receivedTotal: 0,
  myCausesCount: 0,
  contributions: [],
};

/** Una fila del ranking mensual de donantes. */
export type RankingEntry = {
  donorId: string;
  name: string;
  avatarUrl: string | null;
  points: number;
  isMe: boolean;
};

/** Mini-perfil público de un donante (29 jul, "estilo Airbnb" desde el
 * ranking). `contributions` es públicamente legible (RLS "public read"): es
 * el mismo dato que ya sostiene la trazabilidad de aportes, así que no hace
 * falta una policy nueva para calcular esto de cualquier donante. */
export type DonorProfile = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  memberSince: string;
  donatedTotal: number;
  donationsCount: number;
  causesSupported: number;
  completedSupported: number;
};

/**
 * Puntos de un donante en el mes, versión núcleo de la fórmula del paper:
 * +50 por aporte, +1 cada $1.000 con tope 150 por causa, +100 por causa
 * completada. Falta (rebanada siguiente): racha semanal x1,2 y +200 identidad.
 */
function pointsForDonor(rows: { amount: number; causeId: string; completed: boolean }[]): number {
  let apoyar = 0;
  const sumByCause = new Map<string, number>();
  const completedCauses = new Set<string>();
  for (const r of rows) {
    apoyar += 50;
    sumByCause.set(r.causeId, (sumByCause.get(r.causeId) ?? 0) + r.amount);
    if (r.completed) completedCauses.add(r.causeId);
  }
  let monto = 0;
  for (const total of sumByCause.values()) {
    monto += Math.min(Math.floor(total / 1000), 150);
  }
  const completar = completedCauses.size * 100;
  return apoyar + monto + completar;
}

type CausesContextValue = {
  causes: Cause[];
  myCauses: Cause[];
  loading: boolean;
  draft: CauseDraft;
  setDraft: (patch: Partial<CauseDraft>) => void;
  resetDraft: () => void;
  publishDraft: () => Promise<Cause | null>;
  refresh: () => Promise<void>;
  getCause: (id: string) => Cause | undefined;
  getContributions: (causeId: string) => Promise<Contribution[]>;
  donate: (causeId: string, amount: number, message: string, anonymous: boolean) => Promise<boolean>;
  getPayout: (causeId: string) => Promise<Payout>;
  submitTransfer: (
    causeId: string,
    amount: number,
    message: string,
    anonymous: boolean,
    receiptUri: string,
  ) => Promise<boolean>;
  reviewTransfer: (contributionId: string, approve: boolean) => Promise<boolean>;
  publishClosingMessage: (causeId: string, message: string, photoUri?: string | null) => Promise<boolean>;
  getThanks: (causeId: string) => Promise<CauseThank[]>;
  thankDonor: (causeId: string, contributionId: string, message: string) => Promise<boolean>;
  recordPlatformSupport: (causeId?: string) => Promise<boolean>;
  getMyActivity: () => Promise<MyActivity>;
  getReceivedContributions: () => Promise<ReceivedContribution[]>;
  getPendingTransfersForMyCauses: () => Promise<PendingTransfer[]>;
  getMonthlyRanking: () => Promise<RankingEntry[]>;
  getDonorProfile: (donorId: string) => Promise<DonorProfile | null>;
  isCurator: boolean;
  refreshIsCurator: () => Promise<void>;
  viewAsDonor: boolean;
  setViewAsDonor: (v: boolean) => void;
  pendingCauses: Cause[];
  getReviewInfo: (causeId: string) => Promise<ReviewInfo>;
  reviewCause: (causeId: string, action: ReviewAction, note?: string) => Promise<boolean>;
  resubmitCause: (causeId: string) => Promise<boolean>;
  isAuthenticated: boolean;
  accountEmail: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  updateAvatar: (photoUri: string) => Promise<boolean>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  passwordRecovery: boolean;
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  beginPasswordRecovery: (url: string) => Promise<boolean>;
  completePasswordReset: (newPassword: string) => Promise<{ error: string | null }>;
};

const CausesContext = createContext<CausesContextValue | null>(null);

export function CausesProvider({ children }: { children: ReactNode }) {
  const [causes, setCauses] = useState<Cause[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [draft, setDraftState] = useState<CauseDraft>(emptyDraft);
  const [isCurator, setIsCurator] = useState(false);
  // La misma cuenta puede ser curador Y beneficiado de una causa propia (caso
  // real: Gastón). "viewAsDonor" deja ver el lado donante sin cerrar sesión.
  const [viewAsDonor, setViewAsDonor] = useState(false);
  // Sesión de recuperación activa (10.2): true entre tocar el link del mail y
  // terminar de elegir la contraseña nueva. Mientras esté true, el gate de
  // _layout muestra la pantalla de nueva contraseña ANTES que nada más
  // (incluso con sesión ya "autenticada", que es justo lo que setSession deja).
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  const fetchCauses = useCallback(async (uid: string | null) => {
    const { data, error } = await supabase
      .from('causes_public')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('fetch causes error:', error.message);
      return;
    }
    const rows = data ?? [];
    await autoCloseIfNeeded(rows, uid);
    setCauses(rows.map((row) => mapRow(row, uid)));
  }, []);

  const refreshIsCurator = useCallback(async () => {
    setIsCurator(await fetchIsCurator());
  }, []);

  // Lee la sesión actual y carga (o limpia) los datos según haya cuenta o no.
  const loadSession = useCallback(async () => {
    const uid = await ensureSession();
    setUserId(uid);
    if (uid) {
      const { data } = await supabase.auth.getUser();
      setAccountEmail(data.user?.email ?? null);
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', uid)
        .maybeSingle();
      setDisplayName(profile?.display_name ?? null);
      setAvatarUrl(profile?.avatar_url ?? null);
      await fetchCauses(uid);
      await refreshIsCurator();
    } else {
      setAccountEmail(null);
      setDisplayName(null);
      setAvatarUrl(null);
      setCauses([]);
      setIsCurator(false);
    }
  }, [fetchCauses, refreshIsCurator]);

  useEffect(() => {
    (async () => {
      await loadSession();
      setLoading(false);
    })();
  }, [loadSession]);

  // Si la cuenta pasa a ser curador dentro de la misma sesión (SQL corrido con
  // la app ya abierta), las causas de otros en revisión recién se leen con el
  // siguiente fetch: no alcanza con saber que ahora somos curador.
  useEffect(() => {
    if (isCurator && userId) fetchCauses(userId);
  }, [isCurator, userId, fetchCauses]);

  const setDraft = useCallback((patch: Partial<CauseDraft>) => {
    setDraftState((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetDraft = useCallback(() => setDraftState(emptyDraft), []);

  /** Cierra la sesión. No crea una anónima: la app vuelve a la pantalla de
   * login (todo requiere cuenta). */
  const signOut = useCallback(async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setDraftState(emptyDraft);
    setViewAsDonor(false);
    setUserId(null);
    setAccountEmail(null);
    setDisplayName(null);
    setAvatarUrl(null);
    setCauses([]);
    setIsCurator(false);
    setLoading(false);
  }, []);

  /** Sube y guarda la foto de perfil (10.3). */
  const updateAvatar = useCallback(async (photoUri: string): Promise<boolean> => {
    const uid = userId ?? (await ensureSession());
    if (!uid) return false;
    const { url, error: upErr } = await uploadAvatarPhoto(photoUri, 'image/jpeg');
    if (upErr || !url) {
      console.warn('updateAvatar upload error:', upErr);
      return false;
    }
    const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', uid);
    if (error) {
      console.warn('updateAvatar db error:', error.message);
      return false;
    }
    setAvatarUrl(url);
    return true;
  }, [userId]);

  /** Pide el mail de reset (10.2). `redirectTo` es el deep link de esta app:
   * el mismo esquema que ya usa el retorno de Mercado Pago. */
  const requestPasswordReset = useCallback(async (email: string): Promise<{ error: string | null }> => {
    const redirectTo = Linking.createURL('reset-password');
    return requestPasswordResetEmail(email, redirectTo);
  }, []);

  /** Se llama con la URL completa del deep link cuando el usuario toca el
   * link del mail. Si es un link de recuperación válido, deja lista la
   * sesión de recuperación y prende `passwordRecovery`. */
  const beginPasswordRecovery = useCallback(async (url: string): Promise<boolean> => {
    const ok = await beginPasswordRecoveryRequest(url);
    if (ok) setPasswordRecovery(true);
    return ok;
  }, []);

  const completePasswordReset = useCallback(
    async (newPassword: string): Promise<{ error: string | null }> => {
      const { error } = await updatePassword(newPassword);
      if (error) return { error };
      setPasswordRecovery(false);
      setLoading(true);
      await loadSession();
      setLoading(false);
      return { error: null };
    },
    [loadSession],
  );

  /** Registra o loguea con mail + contraseña y carga los datos de la cuenta.
   * Devuelve el error legible si falla (para mostrarlo en la pantalla). */
  const authenticate = useCallback(
    async (
      fn: (email: string, password: string, fullName?: string) => Promise<{ error: string | null }>,
      email: string,
      password: string,
      fullName?: string,
    ): Promise<{ error: string | null }> => {
      const { error } = await fn(email, password, fullName);
      if (error) return { error };
      await ensureRegisteredProfile(email, fullName);
      setLoading(true);
      await loadSession();
      setLoading(false);
      return { error: null };
    },
    [loadSession],
  );

  const signUp = useCallback(
    (email: string, password: string, fullName: string) =>
      authenticate(signUpWithPassword, email, password, fullName),
    [authenticate],
  );
  const signIn = useCallback(
    (email: string, password: string) => authenticate(signInWithPassword, email, password),
    [authenticate],
  );

  const refresh = useCallback(() => fetchCauses(userId), [fetchCauses, userId]);

  const publishDraft = useCallback(async (): Promise<Cause | null> => {
    const uid = userId ?? (await ensureSession());
    if (!uid) {
      console.warn('No hay sesión para crear la causa');
      return null;
    }

    // Nace 'en revisión': un curador la aprueba, pide info o rechaza (ver reviewCause).
    const { data: inserted, error } = await supabase
      .from('causes')
      .insert({
        owner_id: uid,
        title: draft.title.trim() || 'Mi causa',
        story: draft.story.trim() || null,
        goal_amount: parseAmount(draft.goal) || 100000,
        deadline: toISODate(draft.deadline),
        status: 'review',
        verified: false,
        emoji: '💙',
        cover_tint: TINTS[Math.floor(Math.random() * TINTS.length)],
      })
      .select()
      .single();

    if (error || !inserted) {
      console.warn('crear causa error:', error?.message);
      return null;
    }

    const { error: payoutError } = await supabase.from('cause_payouts').insert({
      cause_id: inserted.id,
      method: draft.payoutMethod,
      alias: draft.alias.trim(),
    });
    if (payoutError) console.warn('guardar cobro error:', payoutError.message);

    const files: [EvidenceFile, 'dni-front' | 'dni-back' | 'selfie' | 'backup-doc'][] = [
      [draft.dniFront, 'dni-front'],
      [draft.dniBack, 'dni-back'],
      [draft.selfie, 'selfie'],
      [draft.backupDoc, 'backup-doc'],
    ];
    const paths: Record<string, string | null> = {
      dni_front_url: null,
      dni_back_url: null,
      selfie_url: null,
      backup_doc_url: null,
    };
    const columnByKind: Record<string, string> = {
      'dni-front': 'dni_front_url',
      'dni-back': 'dni_back_url',
      selfie: 'selfie_url',
      'backup-doc': 'backup_doc_url',
    };
    // Las 4 subidas son independientes: van en paralelo para no sumar sus tiempos.
    await Promise.all(
      files.map(async ([file, kind]) => {
        if (!file) return;
        const { path, error: uploadError } = await uploadEvidence(file.uri, inserted.id, kind, file.mimeType);
        if (uploadError) {
          console.warn(`subir evidencia (${kind}) error:`, uploadError);
          return;
        }
        paths[columnByKind[kind]] = path;
      }),
    );
    const { error: evidenceError } = await supabase
      .from('cause_evidence')
      .insert({ cause_id: inserted.id, ...paths });
    if (evidenceError) console.warn('guardar evidencia error:', evidenceError.message);

    // Fotos de portada: opcionales, en paralelo, públicas (no evidencia).
    const coverFiles = [draft.coverPhoto1, draft.coverPhoto2].filter(
      (f): f is NonNullable<EvidenceFile> => !!f,
    );
    if (coverFiles.length > 0) {
      const uploaded = await Promise.all(
        coverFiles.map((file, i) => uploadCoverPhoto(file.uri, inserted.id, i, file.mimeType)),
      );
      const imageUrls = uploaded.map((r) => r.url).filter((u): u is string => !!u);
      uploaded.forEach((r) => {
        if (r.error) console.warn('subir foto de portada error:', r.error);
      });
      if (imageUrls.length > 0) {
        const { error: coverError } = await supabase
          .from('causes')
          .update({ image_urls: imageUrls })
          .eq('id', inserted.id);
        if (coverError) console.warn('guardar fotos de portada error:', coverError.message);
        else inserted.image_urls = imageUrls;
      }
    }

    setDraftState(emptyDraft);
    await fetchCauses(uid);
    return mapRow(inserted, uid);
  }, [draft, userId, fetchCauses]);

  const getCause = useCallback((id: string) => causes.find((c) => c.id === id), [causes]);

  const getContributions = useCallback(
    async (causeId: string): Promise<Contribution[]> => {
      const { data, error } = await supabase
        .from('contributions')
        .select('*')
        .eq('cause_id', causeId)
        .order('created_at', { ascending: false });
      if (error) {
        console.warn('fetch contributions error:', error.message);
        return [];
      }
      const rows = data ?? [];
      // 3.3: si alguna transferencia lleva más de 48hs sin confirmar/rechazar,
      // se confirma sola. Solo se persiste si quien mira es el dueño de la
      // causa (RLS); si confirmó algo, los totales de la causa (meta, cierre)
      // pueden haber cambiado, así que se refrescan.
      const isOwnerOfCause = causes.find((c) => c.id === causeId)?.mine ?? false;
      const changed = await autoConfirmIfNeeded(rows, isOwnerOfCause);
      if (changed && isOwnerOfCause) await fetchCauses(userId);
      return rows.map((row: any) => ({
        id: row.id,
        name: row.anonymous ? 'Anónimo' : row.donor_id === userId ? 'Vos' : 'Alguien de la comunidad',
        amount: Number(row.amount) || 0,
        message: row.message,
        createdAt: row.created_at,
        mine: row.donor_id === userId,
        status: row.status ?? 'approved',
        method: row.method ?? 'mp',
        receiptPath: row.receipt_url ?? null,
      }));
    },
    [userId, causes, fetchCauses],
  );

  const donate = useCallback(
    async (causeId: string, amount: number, message: string, anonymous: boolean): Promise<boolean> => {
      const uid = userId ?? (await ensureSession());
      if (!uid) return false;
      const { error } = await supabase.from('contributions').insert({
        cause_id: causeId,
        donor_id: uid,
        amount,
        message: message.trim() || null,
        anonymous,
        status: 'approved',
        method: 'mp',
        // MP es instantáneo: no hay una "confirmación" separada del aporte,
        // así que confirmed_at = el mismo momento (evita null y que el aviso
        // de "recién confirmado" de 3.4 confunda esto con una transferencia).
        confirmed_at: new Date().toISOString(),
      });
      if (error) {
        console.warn('donate error:', error.message);
        return false;
      }
      await fetchCauses(uid);
      return true;
    },
    [userId, fetchCauses],
  );

  const getPayout = useCallback(async (causeId: string): Promise<Payout> => {
    const { data, error } = await supabase
      .from('cause_payouts')
      .select('method, alias')
      .eq('cause_id', causeId)
      .maybeSingle();
    if (error || !data) {
      if (error) console.warn('getPayout error:', error.message);
      return null;
    }
    return { method: data.method, alias: data.alias };
  }, []);

  const submitTransfer = useCallback(
    async (
      causeId: string,
      amount: number,
      message: string,
      anonymous: boolean,
      receiptUri: string,
    ): Promise<boolean> => {
      const uid = userId ?? (await ensureSession());
      if (!uid) return false;

      const { path, error: upErr } = await uploadReceipt(receiptUri, causeId, 'image/jpeg');
      if (upErr || !path) {
        console.warn('submitTransfer upload error:', upErr);
        return false;
      }

      // Entra 'pending': no cuenta para la meta ni da puntos hasta que el
      // beneficiado confirme (Épica 3).
      const { error } = await supabase.from('contributions').insert({
        cause_id: causeId,
        donor_id: uid,
        amount,
        message: message.trim() || null,
        anonymous,
        status: 'pending',
        method: 'transfer',
        receipt_url: path,
      });
      if (error) {
        console.warn('submitTransfer insert error:', error.message);
        return false;
      }
      await fetchCauses(uid);
      return true;
    },
    [userId, fetchCauses],
  );

  const recordPlatformSupport = useCallback(
    async (causeId?: string): Promise<boolean> => {
      const uid = userId ?? (await ensureSession());
      if (!uid) return false;
      const { error } = await supabase
        .from('platform_support')
        .insert({ supporter_id: uid, cause_id: causeId ?? null });
      if (error) {
        console.warn('recordPlatformSupport error:', error.message);
        return false;
      }
      return true;
    },
    [userId],
  );

  const reviewTransfer = useCallback(
    async (contributionId: string, approve: boolean): Promise<boolean> => {
      // Solo el dueño de la causa (RLS lo valida). Aprobar -> 'approved': suma a
      // la meta y cuenta para los puntos. Rechazar -> 'rejected': no cuenta.
      const patch = approve
        ? { status: 'approved', confirmed_at: new Date().toISOString() }
        : { status: 'rejected' };
      const { error } = await supabase.from('contributions').update(patch).eq('id', contributionId);
      if (error) {
        console.warn('reviewTransfer error:', error.message);
        return false;
      }
      await fetchCauses(userId);
      return true;
    },
    [userId, fetchCauses],
  );

  /** Mensaje de cierre público (agradecimiento general) + foto opcional. Solo
   * tiene sentido una vez cerrada la causa (completed/closed); no se valida
   * acá porque la UI ya solo lo ofrece en ese estado. */
  const publishClosingMessage = useCallback(
    async (causeId: string, message: string, photoUri?: string | null): Promise<boolean> => {
      const uid = userId ?? (await ensureSession());
      if (!uid) return false;

      let photoUrl: string | null = null;
      if (photoUri) {
        const { url, error: upErr } = await uploadClosingPhoto(photoUri, causeId, 'image/jpeg');
        if (upErr) console.warn('publishClosingMessage upload error:', upErr);
        photoUrl = url;
      }

      const { error } = await supabase
        .from('causes')
        .update({ closing_message: message.trim(), closing_photo_url: photoUrl })
        .eq('id', causeId);
      if (error) {
        console.warn('publishClosingMessage error:', error.message);
        return false;
      }
      await fetchCauses(uid);
      return true;
    },
    [userId, fetchCauses],
  );

  const getThanks = useCallback(async (causeId: string): Promise<CauseThank[]> => {
    const { data, error } = await supabase
      .from('cause_thanks')
      .select('contribution_id, message')
      .eq('cause_id', causeId);
    if (error) {
      console.warn('getThanks error:', error.message);
      return [];
    }
    return (data ?? []).map((row: any) => ({ contributionId: row.contribution_id, message: row.message }));
  }, []);

  /** Agradecimiento puntual del beneficiado a un aporte específico. RLS solo
   * deja insertar al dueño de la causa. */
  const thankDonor = useCallback(
    async (causeId: string, contributionId: string, message: string): Promise<boolean> => {
      const { error } = await supabase
        .from('cause_thanks')
        .insert({ cause_id: causeId, contribution_id: contributionId, message: message.trim() });
      if (error) {
        console.warn('thankDonor error:', error.message);
        return false;
      }
      return true;
    },
    [],
  );

  const getMyActivity = useCallback(async (): Promise<MyActivity> => {
    const uid = userId ?? (await ensureSession());
    if (!uid) return emptyActivity;

    // Aportes que hice yo, con la causa embebida (título, emoji, estado, mensaje de cierre).
    const { data, error } = await supabase
      .from('contributions')
      .select(
        'id, amount, message, created_at, status, confirmed_at, cause_id, causes(title, emoji, status, cover_tint, closing_message)',
      )
      .eq('donor_id', uid)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('getMyActivity error:', error.message);
      return emptyActivity;
    }

    const rows = data ?? [];
    // 3.3: el donante no persiste (no es owner, RLS lo bloquearía), pero así
    // ve "confirmado" en vez de "pendiente" si ya pasaron las 48hs.
    await autoConfirmIfNeeded(rows, false);

    // Agradecimientos puntuales que me dejaron en mis aportes (consulta aparte:
    // cause_thanks referencia dos tablas y así se evita la ambigüedad del embed).
    const contributionIds = rows.map((row: any) => row.id);
    const thanksByContribution = new Map<string, string>();
    if (contributionIds.length > 0) {
      const { data: thanksRows, error: thanksError } = await supabase
        .from('cause_thanks')
        .select('contribution_id, message')
        .in('contribution_id', contributionIds);
      if (thanksError) console.warn('getMyActivity thanks error:', thanksError.message);
      for (const t of thanksRows ?? []) thanksByContribution.set(t.contribution_id, t.message);
    }

    const contributions: MyContribution[] = rows.map((row: any) => {
      const cause = Array.isArray(row.causes) ? row.causes[0] : row.causes;
      return {
        id: row.id,
        amount: Number(row.amount) || 0,
        message: row.message,
        createdAt: row.created_at,
        causeId: row.cause_id,
        causeTitle: cause?.title ?? 'Causa',
        causeEmoji: cause?.emoji ?? '💙',
        causeTint: cause?.cover_tint ?? '#CFE6FB',
        causeStatus: (cause?.status ?? 'active') as Cause['status'],
        status: row.status ?? 'approved',
        confirmedAt: row.confirmed_at ?? null,
        causeClosingMessage: cause?.closing_message ?? null,
        thankYouMessage: thanksByContribution.get(row.id) ?? null,
      };
    });

    const donatedTotal = contributions.reduce((sum, c) => sum + c.amount, 0);
    const supportedIds = new Set(contributions.map((c) => c.causeId));
    const completedIds = new Set(
      contributions.filter((c) => c.causeStatus === 'completed').map((c) => c.causeId),
    );

    // Causas propias y lo recaudado en ellas (ya viene en el store).
    const mine = causes.filter((c) => c.mine);
    const receivedTotal = mine.reduce((sum, c) => sum + c.raised, 0);

    return {
      donatedTotal,
      donationsCount: contributions.length,
      causesSupported: supportedIds.size,
      completedSupported: completedIds.size,
      receivedTotal,
      myCausesCount: mine.length,
      contributions,
    };
  }, [userId, causes]);

  const getReceivedContributions = useCallback(async (): Promise<ReceivedContribution[]> => {
    const uid = userId ?? (await ensureSession());
    if (!uid) return [];
    // Solo approved: misma regla que el total "Recibiste" (causes_public.raised_amount).
    const { data, error } = await supabase
      .from('contributions')
      .select('id, amount, message, created_at, anonymous, cause_id, causes!inner(title, emoji, cover_tint, owner_id)')
      .eq('causes.owner_id', uid)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('getReceivedContributions error:', error.message);
      return [];
    }
    return (data ?? []).map((row: any) => {
      const cause = Array.isArray(row.causes) ? row.causes[0] : row.causes;
      return {
        id: row.id,
        amount: Number(row.amount) || 0,
        message: row.message,
        createdAt: row.created_at,
        donorName: row.anonymous ? 'Anónimo' : 'Alguien de la comunidad',
        causeId: row.cause_id,
        causeTitle: cause?.title ?? 'Causa',
        causeEmoji: cause?.emoji ?? '💙',
        causeTint: cause?.cover_tint ?? '#CFE6FB',
      };
    });
  }, [userId]);

  const getPendingTransfersForMyCauses = useCallback(async (): Promise<PendingTransfer[]> => {
    const uid = userId ?? (await ensureSession());
    if (!uid) return [];
    const { data, error } = await supabase
      .from('contributions')
      .select('id, amount, anonymous, created_at, cause_id, causes!inner(title, emoji, cover_tint, owner_id)')
      .eq('causes.owner_id', uid)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('getPendingTransfersForMyCauses error:', error.message);
      return [];
    }
    const rows = data ?? [];
    // 3.3: acá el que mira siempre es el dueño (el query ya filtra por
    // owner_id), así que lo vencido se confirma y persiste directo.
    const changed = await autoConfirmIfNeeded(rows, true);
    if (changed) await fetchCauses(uid);
    return rows
      .filter((row: any) => row.status === 'pending')
      .map((row: any) => {
        const cause = Array.isArray(row.causes) ? row.causes[0] : row.causes;
        return {
          id: row.id,
          amount: Number(row.amount) || 0,
          donorName: row.anonymous ? 'Anónimo' : 'Alguien de la comunidad',
          causeId: row.cause_id,
          causeTitle: cause?.title ?? 'Causa',
          causeEmoji: cause?.emoji ?? '💙',
          causeTint: cause?.cover_tint ?? '#CFE6FB',
          createdAt: row.created_at,
        };
      });
  }, [userId, fetchCauses]);

  const getMonthlyRanking = useCallback(async (): Promise<RankingEntry[]> => {
    const uid = userId ?? (await ensureSession());

    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    // Aportes del mes calendario, con el estado de la causa embebido. Solo
    // approved: antes esta query no filtraba status, así que un aporte
    // pending (o hasta rejected) ya sumaba puntos. Con 3.3, approved incluye
    // tanto lo confirmado a mano como lo auto-confirmado a las 48hs.
    const { data, error } = await supabase
      .from('contributions')
      .select('donor_id, amount, cause_id, causes(status)')
      .eq('status', 'approved')
      .gte('created_at', start.toISOString());
    if (error) {
      console.warn('getMonthlyRanking error:', error.message);
      return [];
    }

    // Solo entran al ranking los donantes con identidad (mail vinculado).
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('is_registered', true);
    const nameById = new Map<string, string>(
      (profiles ?? []).map((p: any) => [p.id, p.display_name || 'Donante']),
    );
    const avatarById = new Map<string, string | null>(
      (profiles ?? []).map((p: any) => [p.id, p.avatar_url ?? null]),
    );

    // Agrupar aportes por donante (solo los registrados).
    const rowsByDonor = new Map<string, { amount: number; causeId: string; completed: boolean }[]>();
    for (const row of data ?? []) {
      const donorId = (row as any).donor_id as string | null;
      if (!donorId || !nameById.has(donorId)) continue;
      const cause = Array.isArray((row as any).causes) ? (row as any).causes[0] : (row as any).causes;
      const entry = {
        amount: Number((row as any).amount) || 0,
        causeId: (row as any).cause_id as string,
        completed: cause?.status === 'completed',
      };
      const list = rowsByDonor.get(donorId);
      if (list) list.push(entry);
      else rowsByDonor.set(donorId, [entry]);
    }

    const ranking: RankingEntry[] = [];
    for (const [donorId, rows] of rowsByDonor) {
      const points = pointsForDonor(rows);
      if (points <= 0) continue;
      ranking.push({
        donorId,
        name: nameById.get(donorId) ?? 'Donante',
        avatarUrl: avatarById.get(donorId) ?? null,
        points,
        isMe: donorId === uid,
      });
    }

    ranking.sort((a, b) => b.points - a.points);
    return ranking;
  }, [userId]);

  /** Mini-perfil público de un donante (29 jul), para el "tocá y mirá" del
   * ranking. Todo se arma de datos ya públicos: profiles ("profiles
   * readable") y contributions ("contributions public read"), la misma base
   * que sostiene la trazabilidad de aportes en el detalle de causa: los
   * montos por aporte ya son públicos ahí, así que el total donado tampoco
   * es un dato nuevo, solo agregado (decidido con Gastón, 29 jul). */
  const getDonorProfile = useCallback(async (donorId: string): Promise<DonorProfile | null> => {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('display_name, avatar_url, created_at')
      .eq('id', donorId)
      .maybeSingle();
    if (profileError || !profile) {
      if (profileError) console.warn('getDonorProfile error:', profileError.message);
      return null;
    }

    const { data: contribs, error: contribsError } = await supabase
      .from('contributions')
      .select('cause_id, amount, causes(status)')
      .eq('donor_id', donorId)
      .eq('status', 'approved');
    if (contribsError) console.warn('getDonorProfile contributions error:', contribsError.message);

    const rows = contribs ?? [];
    const causeIds = new Set<string>();
    const completedIds = new Set<string>();
    let donatedTotal = 0;
    for (const row of rows as any[]) {
      causeIds.add(row.cause_id);
      donatedTotal += Number(row.amount) || 0;
      const cause = Array.isArray(row.causes) ? row.causes[0] : row.causes;
      if (cause?.status === 'completed') completedIds.add(row.cause_id);
    }

    return {
      id: donorId,
      displayName: profile.display_name || 'Donante',
      avatarUrl: profile.avatar_url ?? null,
      donatedTotal,
      memberSince: profile.created_at,
      donationsCount: rows.length,
      causesSupported: causeIds.size,
      completedSupported: completedIds.size,
    };
  }, []);

  const getReviewInfo = useCallback(async (causeId: string): Promise<ReviewInfo> => {
    const empty: ReviewInfo = {
      dniFrontPath: null,
      dniBackPath: null,
      selfiePath: null,
      backupDocPath: null,
      payoutMethod: null,
      payoutAlias: null,
    };
    const [{ data: evidence }, { data: payout }] = await Promise.all([
      supabase.from('cause_evidence').select('*').eq('cause_id', causeId).maybeSingle(),
      supabase.from('cause_payouts').select('*').eq('cause_id', causeId).maybeSingle(),
    ]);
    return {
      dniFrontPath: evidence?.dni_front_url ?? null,
      dniBackPath: evidence?.dni_back_url ?? null,
      selfiePath: evidence?.selfie_url ?? null,
      backupDocPath: evidence?.backup_doc_url ?? null,
      payoutMethod: payout?.method ?? null,
      payoutAlias: payout?.alias ?? null,
    };
  }, []);

  const reviewCause = useCallback(
    async (causeId: string, action: ReviewAction, note?: string): Promise<boolean> => {
      const patch =
        action === 'approve'
          ? { status: 'active', verified: true, review_note: null, reviewed_at: new Date().toISOString() }
          : action === 'reject'
            ? { status: 'rejected', verified: false, review_note: note ?? null, reviewed_at: new Date().toISOString() }
            : { status: 'needs_info', review_note: note ?? null, reviewed_at: new Date().toISOString() };

      const { error } = await supabase.from('causes').update(patch).eq('id', causeId);
      if (error) {
        console.warn('reviewCause error:', error.message);
        return false;
      }
      await fetchCauses(userId);
      return true;
    },
    [fetchCauses, userId],
  );

  const resubmitCause = useCallback(
    async (causeId: string): Promise<boolean> => {
      const { error } = await supabase
        .from('causes')
        .update({ status: 'review', review_note: null })
        .eq('id', causeId);
      if (error) {
        console.warn('resubmitCause error:', error.message);
        return false;
      }
      await fetchCauses(userId);
      return true;
    },
    [fetchCauses, userId],
  );

  const value = useMemo<CausesContextValue>(
    () => ({
      causes,
      myCauses: causes.filter((c) => c.mine),
      loading,
      draft,
      setDraft,
      resetDraft,
      publishDraft,
      refresh,
      getCause,
      getContributions,
      donate,
      getPayout,
      submitTransfer,
      reviewTransfer,
      publishClosingMessage,
      getThanks,
      thankDonor,
      recordPlatformSupport,
      getMyActivity,
      getReceivedContributions,
      getPendingTransfersForMyCauses,
      getMonthlyRanking,
      getDonorProfile,
      isCurator,
      refreshIsCurator,
      viewAsDonor,
      setViewAsDonor,
      pendingCauses: causes.filter((c) => c.status === 'review' || c.status === 'needs_info'),
      getReviewInfo,
      reviewCause,
      resubmitCause,
      isAuthenticated: !!userId,
      accountEmail,
      displayName,
      avatarUrl,
      updateAvatar,
      signUp,
      signIn,
      signOut,
      passwordRecovery,
      requestPasswordReset,
      beginPasswordRecovery,
      completePasswordReset,
    }),
    [
      causes,
      loading,
      draft,
      setDraft,
      resetDraft,
      publishDraft,
      refresh,
      getCause,
      getContributions,
      donate,
      getPayout,
      submitTransfer,
      reviewTransfer,
      publishClosingMessage,
      getThanks,
      thankDonor,
      recordPlatformSupport,
      getMyActivity,
      getReceivedContributions,
      getPendingTransfersForMyCauses,
      getMonthlyRanking,
      getDonorProfile,
      isCurator,
      refreshIsCurator,
      viewAsDonor,
      getReviewInfo,
      reviewCause,
      resubmitCause,
      userId,
      accountEmail,
      displayName,
      avatarUrl,
      updateAvatar,
      signUp,
      signIn,
      signOut,
      passwordRecovery,
      requestPasswordReset,
      beginPasswordRecovery,
      completePasswordReset,
    ],
  );

  return <CausesContext.Provider value={value}>{children}</CausesContext.Provider>;
}

export function useCauses(): CausesContextValue {
  const ctx = useContext(CausesContext);
  if (!ctx) throw new Error('useCauses must be used inside CausesProvider');
  return ctx;
}
