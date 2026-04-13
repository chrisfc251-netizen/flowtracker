import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { EXPENSE_CATEGORIES } from '../lib/constants';

export function useCategoryPriorities() {
  const { user } = useAuth();
  const [priorities, setPriorities] = useState([]);
  const [loading, setLoading]       = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setPriorities([]); setLoading(false); return; }
    const { data } = await supabase
      .from('category_priorities')
      .select('*')
      .eq('user_id', user.id);
    setPriorities(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  // Returns priority for a category, defaulting to 'medium'
  function getPriority(category) {
    return priorities.find((p) => p.category === category)?.priority || 'medium';
  }

  // Returns a map { category: priority }
  function getPriorityMap() {
    const map = {};
    for (const cat of EXPENSE_CATEGORIES) map[cat.value] = 'medium';
    for (const p of priorities) map[p.category] = p.priority;
    return map;
  }

  const setPriority = useCallback(async (category, priority) => {
    if (!user) return;
    const existing = priorities.find((p) => p.category === category);
    let updated;
    if (existing) {
      const { data } = await supabase
        .from('category_priorities')
        .update({ priority })
        .eq('id', existing.id)
        .select().single();
      updated = data;
      setPriorities((prev) => prev.map((p) => (p.id === existing.id ? updated : p)));
    } else {
      const { data } = await supabase
        .from('category_priorities')
        .insert({ user_id: user.id, category, priority })
        .select().single();
      updated = data;
      setPriorities((prev) => [...prev, updated]);
    }
  }, [user, priorities]);

  return { priorities, loading, getPriority, getPriorityMap, setPriority, refresh: fetch };
}