import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

/**
 * useSavingsAdjustments
 *
 * Reads and writes to the savings_adjustments table.
 * Each row represents one savings reallocation event:
 *
 *   allocate   — Available → Savings within one account (no money moves between accounts)
 *   release    — Savings → Available within one account (no money moves between accounts)
 *   transfer   — Savings from account A to account B (actual money moves + savings label moves)
 *   correction — Signed delta to fix a typo; positive = add savings, negative = reduce savings
 *
 * These records are consumed by computeAccountBalances (useAccounts.js) as a third
 * argument and layered on top of the transaction-derived savings baseline.
 */
export function useSavingsAdjustments() {
  const { user } = useAuth();
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  const fetchAll = useCallback(async () => {
    if (!user) { setAdjustments([]); setLoading(false); return; }
    setLoading(true);
    const { data, err } = await supabase
      .from('savings_adjustments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (err) { setError(err); }
    else     { setAdjustments(data || []); }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── allocate: move Available → Savings (same account, no balance change) ──
  const allocateSavings = useCallback(async ({ account_id, amount, note = '' }) => {
    if (!user) return { error: new Error('Not authenticated') };
    const amt = Number(amount);
    if (!amt || amt <= 0) return { error: new Error('Amount must be greater than 0') };
    const row = {
      user_id:         user.id,
      action_type:     'allocate',
      amount:          amt,
      from_account_id: account_id,
      to_account_id:   null,
      note:            note.trim() || 'Moved to savings',
      date:            new Date().toISOString().slice(0, 10),
    };
    const { data, error } = await supabase
      .from('savings_adjustments').insert(row).select().single();
    if (error) return { error };
    setAdjustments((prev) => [data, ...prev]);
    return { data };
  }, [user]);

  // ── release: move Savings → Available (same account, no balance change) ──
  const releaseSavings = useCallback(async ({ account_id, amount, note = '' }) => {
    if (!user) return { error: new Error('Not authenticated') };
    const amt = Number(amount);
    if (!amt || amt <= 0) return { error: new Error('Amount must be greater than 0') };
    const row = {
      user_id:         user.id,
      action_type:     'release',
      amount:          amt,
      from_account_id: account_id,
      to_account_id:   null,
      note:            note.trim() || 'Released from savings',
      date:            new Date().toISOString().slice(0, 10),
    };
    const { data, error } = await supabase
      .from('savings_adjustments').insert(row).select().single();
    if (error) return { error };
    setAdjustments((prev) => [data, ...prev]);
    return { data };
  }, [user]);

  // ── transferSavings: move savings money from account A to account B ───────
  // This moves actual money AND re-labels the destination amount as savings.
  const transferSavings = useCallback(async ({ from_account_id, to_account_id, amount, note = '' }) => {
    if (!user) return { error: new Error('Not authenticated') };
    const amt = Number(amount);
    if (!amt || amt <= 0) return { error: new Error('Amount must be greater than 0') };
    if (from_account_id === to_account_id) return { error: new Error('Source and destination must be different accounts') };
    const row = {
      user_id: user.id,
      action_type:     'transfer',
      amount:          amt,
      from_account_id,
      to_account_id,
      note:            note.trim() || 'Savings transfer',
      date:            new Date().toISOString().slice(0, 10),
    };
    const { data, error } = await supabase
      .from('savings_adjustments').insert(row).select().single();
    if (error) return { error };
    setAdjustments((prev) => [data, ...prev]);
    return { data };
  }, [user]);

  // ── correctSavings: admin correction with required reason ─────────────────
  // amount may be negative to reduce savings.
  const correctSavings = useCallback(async ({ account_id, amount, note }) => {
    if (!user) return { error: new Error('Not authenticated') };
    const amt = Number(amount);
    if (amt === 0 || isNaN(amt)) return { error: new Error('Amount cannot be zero') };
    if (!note || !note.trim()) return { error: new Error('A reason is required for corrections') };
    const row = {
      user_id:         user.id,
      action_type:     'correction',
      amount:          amt,
      from_account_id: account_id,
      to_account_id:   null,
      note:            note.trim(),
      date:            new Date().toISOString().slice(0, 10),
    };
    const { data, error } = await supabase
      .from('savings_adjustments').insert(row).select().single();
    if (error) return { error };
    setAdjustments((prev) => [data, ...prev]);
    return { data };
  }, [user]);

  // ── deleteAdjustment: undo a single entry ─────────────────────────────────
  const deleteAdjustment = useCallback(async (id) => {
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase
      .from('savings_adjustments')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) return { error };
    setAdjustments((prev) => prev.filter((a) => a.id !== id));
    return { data: true };
  }, [user]);

  return {
    adjustments,
    loading,
    error,
    fetchAll,
    allocateSavings,
    releaseSavings,
    transferSavings,
    correctSavings,
    deleteAdjustment,
  };
}