import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useSavingsAllocations() {
  const { user } = useAuth();
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAllocations = useCallback(async () => {
    if (!user) { setAllocations([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('account_savings_allocations')
      .select('*, account:accounts!account_savings_allocations_account_id_fkey(id,name,icon,color)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error) setAllocations(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAllocations(); }, [fetchAllocations]);

  // Returns { [account_id]: net_savings_balance }
  function computeSavingsPerAccount(accountIds) {
    const result = {};
    for (const id of accountIds) result[id] = 0;
    for (const a of allocations) {
      if (!result.hasOwnProperty(a.account_id)) continue;
      if (a.direction === 'to_savings')   result[a.account_id] += Number(a.amount);
      if (a.direction === 'from_savings') result[a.account_id] -= Number(a.amount);
    }
    // Clamp to 0 (can't have negative savings)
    for (const id of accountIds) result[id] = Math.max(0, result[id]);
    return result;
  }

  const addAllocation = useCallback(async ({ account_id, amount, direction, date, note }) => {
    if (!user) return { error: new Error('Not authenticated') };
    const { data, error } = await supabase
      .from('account_savings_allocations')
      .insert([{
        user_id: user.id,
        account_id,
        amount: Number(amount),
        direction,
        date: date || new Date().toISOString().slice(0, 10),
        note: note || '',
      }])
      .select('*, account:accounts!account_savings_allocations_account_id_fkey(id,name,icon,color)')
      .single();
    if (error) return { error };
    setAllocations((prev) => [data, ...prev]);
    return { data };
  }, [user]);

  const deleteAllocation = useCallback(async (id) => {
    const { error } = await supabase
      .from('account_savings_allocations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) return { error };
    setAllocations((prev) => prev.filter((a) => a.id !== id));
    return { data: true };
  }, [user]);

  return {
    allocations,
    loading,
    fetchAllocations,
    computeSavingsPerAccount,
    addAllocation,
    deleteAllocation,
  };
}