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
import { ensureSession, supabase } from '@/lib/supabase';

/**
 * Data layer. Ahora habla con Supabase. Las pantallas no saben de dónde viene
 * la data: solo usan este store.
 */

export type CauseDraft = {
  title: string;
  story: string;
  goal: string; // texto crudo del input, ej "3.000.000"
  deadline: string;
  payoutMethod: 'mp' | 'cbu';
  alias: string;
};

const emptyDraft: CauseDraft = {
  title: '',
  story: '',
  goal: '',
  deadline: '',
  payoutMethod: 'mp',
  alias: '',
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
    who: mine ? 'Vos' : 'Persona verificada',
    emoji: row.emoji || '💙',
    coverTint: row.cover_tint || '#CFE6FB',
    raised,
    goal,
    daysLeft,
    status: row.status,
    verified: row.verified,
    mine,
  };
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
};

const CausesContext = createContext<CausesContextValue | null>(null);

export function CausesProvider({ children }: { children: ReactNode }) {
  const [causes, setCauses] = useState<Cause[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [draft, setDraftState] = useState<CauseDraft>(emptyDraft);

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

  useEffect(() => {
    (async () => {
      const uid = await ensureSession();
      setUserId(uid);
      await fetchCauses(uid);
      setLoading(false);
    })();
  }, [fetchCauses]);

  const setDraft = useCallback((patch: Partial<CauseDraft>) => {
    setDraftState((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetDraft = useCallback(() => setDraftState(emptyDraft), []);

  const refresh = useCallback(() => fetchCauses(userId), [fetchCauses, userId]);

  const publishDraft = useCallback(async (): Promise<Cause | null> => {
    const uid = userId ?? (await ensureSession());
    if (!uid) {
      console.warn('No hay sesión para crear la causa');
      return null;
    }

    // status 'active' simula la aprobación de curaduría para probar el flujo e2e.
    const { data: inserted, error } = await supabase
      .from('causes')
      .insert({
        owner_id: uid,
        title: draft.title.trim() || 'Mi causa',
        story: draft.story.trim() || null,
        goal_amount: parseAmount(draft.goal) || 100000,
        deadline: toISODate(draft.deadline),
        status: 'active',
        verified: true,
        emoji: '💙',
        cover_tint: TINTS[Math.floor(Math.random() * TINTS.length)],
      })
      .select()
      .single();

    if (error || !inserted) {
      console.warn('crear causa error:', error?.message);
      return null;
    }

    await supabase.from('cause_payouts').insert({
      cause_id: inserted.id,
      method: draft.payoutMethod,
      alias: draft.alias.trim(),
    });

    setDraftState(emptyDraft);
    await fetchCauses(uid);
    return mapRow(inserted, uid);
  }, [draft, userId, fetchCauses]);

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
    }),
    [causes, loading, draft, setDraft, resetDraft, publishDraft, refresh],
  );

  return <CausesContext.Provider value={value}>{children}</CausesContext.Provider>;
}

export function useCauses(): CausesContextValue {
  const ctx = useContext(CausesContext);
  if (!ctx) throw new Error('useCauses must be used inside CausesProvider');
  return ctx;
}
