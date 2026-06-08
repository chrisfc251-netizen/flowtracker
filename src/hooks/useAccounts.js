import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading]   = useState(true);

  const fetchAccounts = useCallback(async () => {
    if (!user) { setAccounts([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    if (!error) setAccounts(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const addAccount = useCallback(async ({ name, type, color, icon }) => {
    if (!user) return { error: new Error('Not authenticated') };
    const { data, error } = await supabase
      .from('accounts')
      .insert([{ user_id: user.id, name, type, color, icon }])
      .select().single();
    if (error) return { error };
    setAccounts((prev) => [...prev, data]);
    return { data };
  }, [user]);

  const updateAccount = useCallback(async (id, updates) => {
    const { data, error } = await supabase
      .from('accounts')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select().single();
    if (error) return { error };
    setAccounts((prev) => prev.map((a) => (a.id === id ? data : a)));
    return { data };
  }, [user]);

  const deleteAccount = useCallback(async (id) => {
    const { error } = await supabase
      .from('accounts')
      .update({ is_active: false })
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) return { error };
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    return { data: true };
  }, [user]);

  /**
   * Compute per-account balances.
   *
   * account_total_balance    = starting_balance + income - expenses + transfers_in - transfers_out
   * account_savings_balance  = sum of savings allocations (to_savings - from_savings) clamped ≥ 0
   * account_available_balance = account_total_balance - account_savings_balance
   *
   * savingsAllocationsPerAccount: { [account_id]: number } — pass from useSavingsAllocations.computeSavingsPerAccount()
   * Falls back to legacy transaction-based savings if allocations not provided.
   */
  function computeAccountBalances(transactions, transfers, savingsAllocationsPerAccount = null) {
    const balances          = {};
    const savingsBreakdown  = {};
    const availableBreakdown = {};

    for (const a of accounts) {
      balances[a.id]           = 0;
      savingsBreakdown[a.id]   = 0;
      availableBreakdown[a.id] = 0;
    }

    // Income / expense transactions
    for (const t of transactions) {
      if (!t.account_id || !balances.hasOwnProperty(t.account_id)) continue;
      if (t.type === 'income') {
        balances[t.account_id] += Number(t.amount);
      } else if (t.type === 'expense') {
        balances[t.account_id] -= Number(t.amount);
      }
      // Legacy transaction-level savings (ignored when allocations table is used)
      if (!savingsAllocationsPerAccount && t.savings_allocation && t.savings_account_id) {
        if (balances.hasOwnProperty(t.savings_account_id)) {
          savingsBreakdown[t.savings_account_id] += Number(t.savings_allocation);
        }
      }
    }

    // Transfers affect total balance only (never income/expense)
    for (const tr of transfers) {
      if (balances.hasOwnProperty(tr.from_account_id)) balances[tr.from_account_id] -= Number(tr.amount);
      if (balances.hasOwnProperty(tr.to_account_id))   balances[tr.to_account_id]   += Number(tr.amount);
    }

    // Apply savings allocations
    if (savingsAllocationsPerAccount) {
      for (const id of Object.keys(balances)) {
        savingsBreakdown[id] = savingsAllocationsPerAccount[id] || 0;
      }
    }

    // Compute available = total - savings (clamped so available >= 0 if total >= 0)
    for (const id of Object.keys(balances)) {
      availableBreakdown[id] = Math.max(0, balances[id] - savingsBreakdown[id]);
    }

    return { balances, savingsBreakdown, availableBreakdown };
  }

  return {
    accounts,
    loading,
    fetchAccounts,
    addAccount,
    updateAccount,
    deleteAccount,
    computeAccountBalances,
  };
}