import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

/**
 * useSavingsAdjustments
 * Manages savings-reallocation records in the `savings_adjustments` table.
 * Each record moves a dollar amount between two savings accounts without
 * touching the underlying income transactions.
 */
export function useSavingsAdjustments() {
  const { user } = useAuth();
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setAdjustments([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('savings_adjustments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error) setAdjustments(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const addAdjustment = useCallback(async ({ from_account_id, to_account_id, amount, note }) => {
    if (!user) return { error: new Error('Not authenticated') };
    const { data, error } = await supabase
      .from('savings_adjustments')
      .insert([{
        user_id: user.id,
        from_account_id: from_account_id || null,
        to_account_id:   to_account_id   || null,
        amount:          parseFloat(amount),
        note:            note || null,
      }])
      .select()
      .single();
    if (error) return { error };
    setAdjustments(prev => [data, ...prev]);
    return { data };
  }, [user]);

  return { adjustments, loading, addAdjustment, reload: load };
}