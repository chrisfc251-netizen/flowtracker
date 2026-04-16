import { useCallback, useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { computeEffectiveBudgets } from '../lib/budgetEngine';

export function useBudgets(priorityMap = {}) {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', user.id);
    if (!error) setBudgets(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Effective budgets (derived, never stored) ─────────────────────────
  const effectiveBudgets = useMemo(
    () => computeEffectiveBudgets(budgets, priorityMap),
    [budgets, priorityMap]
  );

  // ── Upsert ────────────────────────────────────────────────────────────
  async function upsertBudget(category, amount_limit) {
    const existing = budgets.find((b) => b.category === category);
    if (existing) {
      const { data, error } = await supabase
        .from('budgets')
        .update({ amount_limit })
        .eq('id', existing.id)
        .select().single();
      if (error) throw error;
      setBudgets((prev) => prev.map((b) => (b.id === existing.id ? data : b)));
    } else {
      const { data, error } = await supabase
        .from('budgets')
        .insert({ user_id: user.id, category, amount_limit, is_active: true })
        .select().single();
      if (error) throw error;
      setBudgets((prev) => [...prev, data]);
    }
  }

  // ── Toggle active / N/A ───────────────────────────────────────────────
  const toggleActive = useCallback(async (category) => {
    const existing = budgets.find((b) => b.category === category);
    if (!existing) return;
    const newActive = existing.is_active === false ? true : false;
    const { data, error } = await supabase
      .from('budgets')
      .update({ is_active: newActive })
      .eq('id', existing.id)
      .eq('user_id', user.id)
      .select().single();
    if (error) return { error };
    setBudgets((prev) => prev.map((b) => (b.id === existing.id ? data : b)));
    return { data };
  }, [budgets, user]);

  // ── Delete ────────────────────────────────────────────────────────────
  async function deleteBudget(category) {
    const existing = budgets.find((b) => b.category === category);
    if (!existing) return;
    await supabase.from('budgets').delete().eq('id', existing.id);
    setBudgets((prev) => prev.filter((b) => b.id !== existing.id));
  }

  return {
    budgets,
    effectiveBudgets,
    loading,
    upsertBudget,
    deleteBudget,
    toggleActive,
    refresh: fetchAll,
  };
}
