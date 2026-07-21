import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { causes as seedCauses, type Cause } from '@/data/causes';

/**
 * Local data layer for the POC. Everything goes through this store, so swapping
 * the in-memory state for Supabase later means changing only this file.
 */

export type CauseDraft = {
  title: string;
  story: string;
  goal: string; // raw text from the input, e.g. "3.000.000"
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

type CausesContextValue = {
  causes: Cause[];
  myCauses: Cause[];
  draft: CauseDraft;
  setDraft: (patch: Partial<CauseDraft>) => void;
  resetDraft: () => void;
  publishDraft: () => Cause;
};

const CausesContext = createContext<CausesContextValue | null>(null);

export function CausesProvider({ children }: { children: ReactNode }) {
  const [causes, setCauses] = useState<Cause[]>(seedCauses);
  const [draft, setDraftState] = useState<CauseDraft>(emptyDraft);

  const setDraft = useCallback((patch: Partial<CauseDraft>) => {
    setDraftState((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetDraft = useCallback(() => setDraftState(emptyDraft), []);

  const publishDraft = useCallback((): Cause => {
    const newCause: Cause = {
      id: `cause_${Date.now()}`,
      title: draft.title.trim() || 'Mi causa',
      who: 'Vos',
      emoji: '💙',
      coverTint: TINTS[Math.floor(Math.random() * TINTS.length)],
      raised: 0,
      goal: parseAmount(draft.goal) || 100000,
      daysLeft: 30,
      status: 'active',
      verified: true,
      mine: true,
    };
    setCauses((prev) => [newCause, ...prev]);
    setDraftState(emptyDraft);
    return newCause;
  }, [draft]);

  const value = useMemo<CausesContextValue>(
    () => ({
      causes,
      myCauses: causes.filter((c) => c.mine),
      draft,
      setDraft,
      resetDraft,
      publishDraft,
    }),
    [causes, draft, setDraft, resetDraft, publishDraft],
  );

  return <CausesContext.Provider value={value}>{children}</CausesContext.Provider>;
}

export function useCauses(): CausesContextValue {
  const ctx = useContext(CausesContext);
  if (!ctx) throw new Error('useCauses must be used inside CausesProvider');
  return ctx;
}
