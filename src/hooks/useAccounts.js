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
   * Legacy mode (savingsAllocationsPerAccount = null):
   *   income account  → amount - savings_allocation
   *   savings account → savings_allocation
   *   savingsBreakdown[savings_account_id] += savings_allocation  ← correct source for breakdown
   *
   * New allocations mode (savingsAllocationsPerAccount provided):
   *   income account → full amount
   *   savingsBreakdown sourced from allocations table
   *
   * Transfers affect totals only — never income/expense reports.
   * available = total_balance - savings_balance
   */
  function computeAccountBalances(transactions, transfers, savingsAllocationsPerAccount = null) {
    const balances           = {};
    const savingsBreakdown   = {};
    const availableBreakdown = {};

    for (const a of accounts) {
      balances[a.id]           = 0;
      savingsBreakdown[a.id]   = 0;
      availableBreakdown[a.id] = 0;
    }

    for (const t of transactions) {
      if (!t.account_id || !balances.hasOwnProperty(t.account_id)) continue;

      if (t.type === 'income') {
        if (savingsAllocationsPerAccount) {
          balances[t.account_id] += Number(t.amount);
        } else {
          // Legacy: spendable portion to source account, savings to savings_account_id
          const spendable = Number(t.amount) - Number(t.savings_allocation || 0);
          balances[t.account_id] += spendable;
          if (t.savings_allocation && t.savings_account_id) {
            if (balances.hasOwnProperty(t.savings_account_id)) {
              balances[t.savings_account_id]         += Number(t.savings_allocation);
              savingsBreakdown[t.savings_account_id] += Number(t.savings_allocation);
            }
          }
        }
      } else if (t.type === 'expense') {
        balances[t.account_id] -= Number(t.amount);
      }
    }

    if (savingsAllocationsPerAccount) {
      for (const id of Object.keys(balances)) {
        savingsBreakdown[id] = savingsAllocationsPerAccount[id] || 0;
      }
    }

    // Transfers: balance impact only
    for (const tr of transfers) {
      if (balances.hasOwnProperty(tr.from_account_id)) balances[tr.from_account_id] -= Number(tr.amount);
      if (balances.hasOwnProperty(tr.to_account_id))   balances[tr.to_account_id]   += Number(tr.amount);
    }

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