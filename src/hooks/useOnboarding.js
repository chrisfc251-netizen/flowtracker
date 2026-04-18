import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth }  from './useAuth';

const EMPTY = {
  completed:    false,
  goal_skipped: false,
  goal_set:     false,
  account_set:  false,
};

export function useOnboarding() {
  const { user }            = useAuth();
  const [state, setState]   = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setState(null); setLoading(false); return; }

    const { data } = await supabase
      .from('onboarding_state')
      .select('*')
      .eq('user_id', user.id)
      .single();

    setState(data || EMPTY);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  // Upsert a partial update
  const update = useCallback(async (patch) => {
    if (!user) return;
    const next = { ...state, ...patch, updated_at: new Date().toISOString() };
    setState(next);

    await supabase
      .from('onboarding_state')
      .upsert({ user_id: user.id, ...next }, { onConflict: 'user_id' });
  }, [user, state]);

  const markCompleted = useCallback(() =>
    update({ completed: true }), [update]);

  const markGoalSet = useCallback(() =>
    update({ goal_set: true }), [update]);

  const markGoalSkipped = useCallback(() =>
    update({ goal_skipped: true }), [update]);

  const markAccountSet = useCallback(() =>
    update({ account_set: true }), [update]);

  return {
    state,
    loading,
    update,
    markCompleted,
    markGoalSet,
    markGoalSkipped,
    markAccountSet,
  };
}