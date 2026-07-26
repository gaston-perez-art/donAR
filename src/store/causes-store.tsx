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
import { ensureSession, isCurator as fetchIsCurator, supabase, uploadEvidence } from '@/lib/supabase';

/**
 * Data layer. Ahora habla con Supabase. Las pantallas no saben de dónde viene
 * la data: solo usan este store.
 */

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
    imageUrl: row.image_url ?? null,
    createdAt: row.created_at,
    raised,
    goal,
    daysLeft,
    status: row.status,
    verified: row.verified,
    reviewNote: row.review_note ?? null,
    mine,
  };
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
};

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
  getMyActivity: () => Promise<MyActivity>;
  isCurator: boolean;
  refreshIsCurator: () => Promise<void>;
  pendingCauses: Cause[];
  getReviewInfo: (causeId: string) => Promise<ReviewInfo>;
  reviewCause: (causeId: string, action: ReviewAction, note?: string) => Promise<boolean>;
  resubmitCause: (causeId: string) => Promise<boolean>;
  signOut: () => Promise<void>;
};

const CausesContext = createContext<CausesContextValue | null>(null);

export function CausesProvider({ children }: { children: ReactNode }) {
  const [causes, setCauses] = useState<Cause[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [draft, setDraftState] = useState<CauseDraft>(emptyDraft);
  const [isCurator, setIsCurator] = useState(false);

  const fetchCauses = useCallback(async (uid: string | null) => {
    const { data, error } = await supabase
      .from('causes_public')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('fetch causes error:', error.message);
      return;
    }
    setCauses((data ?? []).map((row) => mapRow(row, uid)));
  }, []);

  const refreshIsCurator = useCallback(async () => {
    setIsCurator(await fetchIsCurator());
  }, []);

  useEffect(() => {
    (async () => {
      const uid = await ensureSession();
      setUserId(uid);
      await fetchCauses(uid);
      await refreshIsCurator();
      setLoading(false);
    })();
  }, [fetchCauses, refreshIsCurator]);

  const setDraft = useCallback((patch: Partial<CauseDraft>) => {
    setDraftState((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetDraft = useCallback(() => setDraftState(emptyDraft), []);

  /** Cierra la sesión actual y arranca una anónima nueva, como recién instalada. */
  const signOut = useCallback(async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setDraftState(emptyDraft);
    const uid = await ensureSession();
    setUserId(uid);
    await fetchCauses(uid);
    await refreshIsCurator();
    setLoading(false);
  }, [fetchCauses, refreshIsCurator]);

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
      return (data ?? []).map((row: any) => ({
        id: row.id,
        name: row.anonymous ? 'Anónimo' : row.donor_id === userId ? 'Vos' : 'Alguien de la comunidad',
        amount: Number(row.amount) || 0,
        message: row.message,
        createdAt: row.created_at,
        mine: row.donor_id === userId,
      }));
    },
    [userId],
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

  const getMyActivity = useCallback(async (): Promise<MyActivity> => {
    const uid = userId ?? (await ensureSession());
    if (!uid) return emptyActivity;

    // Aportes que hice yo, con la causa embebida (título, emoji, estado).
    const { data, error } = await supabase
      .from('contributions')
      .select('id, amount, message, created_at, cause_id, causes(title, emoji, status, cover_tint)')
      .eq('donor_id', uid)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('getMyActivity error:', error.message);
      return emptyActivity;
    }

    const contributions: MyContribution[] = (data ?? []).map((row: any) => {
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
      getMyActivity,
      isCurator,
      refreshIsCurator,
      pendingCauses: causes.filter((c) => c.status === 'review' || c.status === 'needs_info'),
      getReviewInfo,
      reviewCause,
      resubmitCause,
      signOut,
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
      getMyActivity,
      isCurator,
      refreshIsCurator,
      getReviewInfo,
      reviewCause,
      resubmitCause,
      signOut,
    ],
  );

  return <CausesContext.Provider value={value}>{children}</CausesContext.Provider>;
}

export function useCauses(): CausesContextValue {
  const ctx = useContext(CausesContext);
  if (!ctx) throw new Error('useCauses must be used inside CausesProvider');
  return ctx;
}
