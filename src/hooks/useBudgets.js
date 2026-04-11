import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useBudgets() {
  const { user } = useAuth();
  const [budgets, setBudgets]   = useState([]);
  const [loading, setLoading]   = useState(true);

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

  async function upsertBudget(category, amount_limit) {
    const existing = budgets.find((b) => b.category === category);
    if (existing) {
      const { data, error } = await supabase
        .from('budgets')
        .update({ amount_limit })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      setBudgets((prev) => prev.map((b) => (b.id === existing.id ? data : b)));
    } else {
      const { data, error } = await supabase
        .from('budgets')
        .insert({ user_id: user.id, category, amount_limit })
        .select()
        .single();
      if (error) throw error;
      setBudgets((prev) => [...prev, data]);
    }
  }

  async function deleteBudget(category) {
    const existing = budgets.find((b) => b.category === category);
    if (!existing) return;
    await supabase.from('budgets').delete().eq('id', existing.id);
    setBudgets((prev) => prev.filter((b) => b.id !== existing.id));
  }

  return { budgets, loading, upsertBudget, deleteBudget, refresh: fetchAll };
}
