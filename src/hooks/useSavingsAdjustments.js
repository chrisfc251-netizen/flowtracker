/**
 * useSavingsAdjustments.js
 *
 * Hook for reading and writing to the savings_adjustments table.
 *
 * Each row represents one savings reallocation event:
 *
 *   action_type = 'allocate'   — moved money from Available → Savings (same account)
 *   action_type = 'release'    — moved money from Savings → Available (same account)
 *   action_type = 'transfer'   — moved savings balance from account A to account B
 *   action_type = 'correction' — admin correction (signed delta, for typo fixes)
 *
 * amount is always positive. Direction is encoded in action_type.
 * For 'correction', a negative amount = reducing savings.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useSavingsAdjustments() {
  const { user } = useAuth();
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading]         = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) { setAdjustments([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('savings_adjustments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error) setAdjustments(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Allocate: move from Available → Savings (same account) ──────────────
  const allocateToSavings = useCallback(async ({ account_id, amount, note = '' }) => {
    if (!user) return { error: new Error('Not authenticated') };
    const amt = Number(amount);
    if (!amt || amt <= 0) return { error: new Error('Amount must be greater than 0') };
    const row = {
      user_id:         user.id,
      action_type:     'allocate',
      amount:          amt,
      from_account_id: account_id,
      to_account_id:   null,
      note:            note || 'Moved to savings',
      date:            new Date().toISOString().slice(0, 10),
    };
    const { data, error } = await supabase.from('savings_adjustments').insert(row).select().single();
    if (error) return { error };
    setAdjustments((prev) => [data, ...prev]);
    return { data };
  }, [user]);

  // ── Release: move from Savings → Available (same account) ───────────────
  const releaseFromSavings = useCallback(async ({ account_id, amount, note = '' }) => {
    if (!user) return { error: new Error('Not authenticated') };
    const amt = Number(amount);
    if (!amt || amt <= 0) return { error: new Error('Amount must be greater than 0') };
    const row = {
      user_id:         user.id,
      action_type:     'release',
      amount:          amt,
      from_account_id: account_id,
      to_account_id:   null,
      note:            note || 'Released from savings',
      date:            new Date().toISOString().slice(0, 10),
    };
    const { data, error } = await supabase.from('savings_adjustments').insert(row).select().single();
    if (error) return { error };
    setAdjustments((prev) => [data, ...prev]);
    return { data };
  }, [user]);

  // ── Transfer savings: move from Account A savings → Account B savings ────
  // This moves actual money between accounts AND re-labels the destination as savings.
  const transferSavings = useCallback(async ({ from_account_id, to_account_id, amount, note = '' }) => {
    if (!user) return { error: new Error('Not authenticated') };
    const amt = Number(amount);
    if (!amt || amt <= 0) return { error: new Error('Amount must be greater than 0') };
    if (from_account_id === to_account_id) return { error: new Error('Select two different accounts') };
    const row = {
      user_id:         user.id,
      action_type:     'transfer',
      amount:          amt,
      from_account_id,
      to_account_id,
      note:            note || 'Savings transfer',
      date:            new Date().toISOString().slice(0, 10),
    };
    const { data, error } = await supabase.from('savings_adjustments').insert(row).select().single();
    if (error) return { error };
    setAdjustments((prev) => [data, ...prev]);
    return { data };
  }, [user]);

  // ── Correction: admin-style signed delta (positive or negative) ──────────
  const correctSavings = useCallback(async ({ account_id, amount, note }) => {
    if (!user) return { error: new Error('Not authenticated') };
    const amt = Number(amount);
    if (amt === 0 || isNaN(amt)) return { error: new Error('Amount cannot be zero') };
    if (!note?.trim()) return { error: new Error('Reason is required for corrections') };
    const row = {
      user_id:         user.id,
      action_type:     'correction',
      amount:          amt,           // may be negative
      from_account_id: account_id,
      to_account_id:   null,
      note:            note.trim(),
      date:            new Date().toISOString().slice(0, 10),
    };
    const { data, error } = await supabase.from('savings_adjustments').insert(row).select().single();
    if (error) return { error };
    setAdjustments((prev) => [data, ...prev]);
    return { data };
  }, [user]);

  // ── Delete a single adjustment (undo) ────────────────────────────────────
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
    fetchAll,
    allocateToSavings,
    releaseFromSavings,
    transferSavings,
    correctSavings,
    deleteAdjustment,
  };
}