import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

/**
 * useAccounts
 *
 * computeAccountBalances(transactions, transfers, savingsAdjustments?)
 *
 * Accepts an optional third argument — the savings adjustments array from
 * useSavingsAdjustments. All existing callers continue working unchanged
 * because savingsAdjustments defaults to [].
 *
 * Accounting invariants enforced for every account:
 *   total     = balances[id]
 *   savings   = savingsBreakdown[id]    (clamped to [0, total])
 *   available = total - savings
 *
 * Adjustment semantics:
 *   allocate   — savingsBreakdown[from] += amount  (no balance change)
 *   release    — savingsBreakdown[from] -= amount  (no balance change)
 *   transfer   — balances[from] -= amount, savingsBreakdown[from] -= amount
 *                balances[to]   += amount, savingsBreakdown[to]   += amount
 *   correction — savingsBreakdown[from] += amount  (signed; can be negative)
 */
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

  function computeAccountBalances(transactions, transfers, savingsAdjustments = []) {
    const balances         = {};
    const savingsBreakdown = {};

    for (const a of accounts) {
      balances[a.id]         = 0;
      savingsBreakdown[a.id] = 0;
    }

    // ── Step 1: transactions ───────────────────────────────────────────────
    for (const t of transactions) {
      if (!t.account_id || !balances.hasOwnProperty(t.account_id)) continue;
      if (t.type === 'income') {
        const spendable = Number(t.amount) - Number(t.savings_allocation || 0);
        balances[t.account_id] += spendable;
      } else {
        balances[t.account_id] -= Number(t.amount);
      }
      if (t.savings_allocation && t.savings_account_id) {
        if (balances.hasOwnProperty(t.savings_account_id)) {
          balances[t.savings_account_id]        += Number(t.savings_allocation);
          savingsBreakdown[t.savings_account_id] += Number(t.savings_allocation);
        }
      }
    }

    // ── Step 2: account transfers (move money, no savings label change) ────
    for (const tr of transfers) {
      if (balances.hasOwnProperty(tr.from_account_id)) balances[tr.from_account_id] -= Number(tr.amount);
      if (balances.hasOwnProperty(tr.to_account_id))   balances[tr.to_account_id]   += Number(tr.amount);
    }

    // ── Step 3: savings adjustments ────────────────────────────────────────
    for (const adj of savingsAdjustments) {
      const amt = Number(adj.amount);
      if (!amt) continue;

      switch (adj.action_type) {
        case 'allocate':
          // Available → Savings within the same account.
          // Only the label shifts; total balance unchanged.
          if (savingsBreakdown.hasOwnProperty(adj.from_account_id)) {
            savingsBreakdown[adj.from_account_id] += amt;
          }
          break;

        case 'release':
          // Savings → Available within the same account.
          // Only the label shifts; total balance unchanged.
          if (savingsBreakdown.hasOwnProperty(adj.from_account_id)) {
            savingsBreakdown[adj.from_account_id] -= amt;
          }
          break;

        case 'transfer':
          // Move actual money from account A to account B.
          // Both the balance and the savings label move.
          if (balances.hasOwnProperty(adj.from_account_id)) {
            balances[adj.from_account_id]         -= amt;
            savingsBreakdown[adj.from_account_id] -= amt;
          }
          if (adj.to_account_id && balances.hasOwnProperty(adj.to_account_id)) {
            balances[adj.to_account_id]         += amt;
            savingsBreakdown[adj.to_account_id] += amt;
          }
          break;

        case 'correction':
          // Signed delta applied directly to the savings label.
          // amt may be negative (reducing savings).
          if (savingsBreakdown.hasOwnProperty(adj.from_account_id)) {
            savingsBreakdown[adj.from_account_id] += amt;
          }
          break;

        default:
          break;
      }
    }

    // ── Step 4: clamp — prevent impossible display values ──────────────────
    for (const id of Object.keys(savingsBreakdown)) {
      const total = balances[id] || 0;
      savingsBreakdown[id] = Math.max(0, Math.min(savingsBreakdown[id], total));
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