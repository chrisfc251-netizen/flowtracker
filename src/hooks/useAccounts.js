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

  // Compute balance for each account from transactions + transfers
  function computeAccountBalances(transactions, transfers) {
    const balances = {};
    const savingsBreakdown = {};

    for (const a of accounts) {
      balances[a.id] = 0;
      savingsBreakdown[a.id] = 0;
    }

    for (const t of transactions) {
      if (!t.account_id || !balances.hasOwnProperty(t.account_id)) continue;
      if (t.type === 'income') {
        const spendable = Number(t.amount) - Number(t.savings_allocation || 0);
        balances[t.account_id] += spendable;
      } else {
        balances[t.account_id] -= Number(t.amount);
      }
      // Savings go to savings_account_id
      if (t.savings_allocation && t.savings_account_id) {
        if (balances.hasOwnProperty(t.savings_account_id)) {
          balances[t.savings_account_id]       += Number(t.savings_allocation);
          savingsBreakdown[t.savings_account_id] += Number(t.savings_allocation);
        }
      }
    }

    for (const tr of transfers) {
      if (balances.hasOwnProperty(tr.from_account_id)) balances[tr.from_account_id] -= Number(tr.amount);
      if (balances.hasOwnProperty(tr.to_account_id))   balances[tr.to_account_id]   += Number(tr.amount);
    }

    return { balances, savingsBreakdown };
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