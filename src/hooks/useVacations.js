// ── useVacations hook ─────────────────────────────────────────────────────
import { useCallback, useEffect, useState } from 'react';
import { differenceInDays, differenceInWeeks } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useVacations() {
  const { user } = useAuth();
  const [vacations, setVacations] = useState([]);
  const [loading, setLoading]     = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) { setVacations([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('vacations')
      .select('*')
      .eq('user_id', user.id)
      .order('trip_date', { ascending: true });
    if (!error) setVacations(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addVacation = useCallback(async (payload) => {
    if (!user) return { error: new Error('Not authenticated') };
    const { data, error } = await supabase
      .from('vacations')
      .insert([{ ...payload, user_id: user.id }])
      .select().single();
    if (error) return { error };
    setVacations((prev) => [...prev, data]);
    return { data };
  }, [user]);

  const updateVacation = useCallback(async (id, updates) => {
    const { data, error } = await supabase
      .from('vacations')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select().single();
    if (error) return { error };
    setVacations((prev) => prev.map((v) => (v.id === id ? data : v)));
    return { data };
  }, [user]);

  const deleteVacation = useCallback(async (id) => {
    const { error } = await supabase
      .from('vacations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) return { error };
    setVacations((prev) => prev.filter((v) => v.id !== id));
    return { data: true };
  }, [user]);

  return { vacations, loading, addVacation, updateVacation, deleteVacation, fetchAll };
}

// ── Vacation calculator ───────────────────────────────────────────────────
export function calcVacationPace(vacation, linkedGoal = null) {
  const total     = Number(vacation.total_budget);
  const tripDate  = new Date(vacation.trip_date);
  const today     = new Date();
  const daysLeft  = Math.max(differenceInDays(tripDate, today), 0);
  const weeksLeft = Math.max(differenceInWeeks(tripDate, today), 1);

  const saved     = linkedGoal ? Number(linkedGoal.current_amount || 0) : 0;
  const remaining = Math.max(total - saved, 0);

  const perDay    = daysLeft > 0 ? remaining / daysLeft : remaining;
  const perWeek   = remaining / weeksLeft;
  const perMonth  = remaining / Math.max(daysLeft / 30, 1);

  return { total, saved, remaining, daysLeft, weeksLeft, perDay, perWeek, perMonth };
}