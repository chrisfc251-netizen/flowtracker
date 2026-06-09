/**
 * useAccounts.js
 *
 * computeAccountBalances now accepts a third argument: adjustments[]
 * from useSavingsAdjustments. Adjustments affect savingsBreakdown
 * (and in the case of 'transfer', also actual balances between accounts).
 *
 * Accounting rules enforced in the return of every call:
 *   total   = balances[id]         (computed from transactions + transfers + transfer-type adjustments)
 *   savings = savingsBreakdown[id] (computed from income allocations + savings adjustments)
 *   available = total - savings    (derived, never stored separately)
 *
 *   savings >= 0 (clamped)
 *   savings <= total (clamped)
 *   available = total - savings (always)
 */
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
   * computeAccountBalances(transactions, transfers, adjustments?)
   *
   * Single source of truth for all balance/savings calculations in the app.
   * adjustments is optional — pass [] or omit if not using savings adjustments.
   *
   * Returns:
   *   balances        — { [accountId]: number }  total balance (available + savings)
   *   savingsBreakdown— { [accountId]: number }  savings portion of total
   *
   * These two objects are always consistent:
   *   available[id] = balances[id] - savingsBreakdown[id]  (derived by callers)
   *   savingsBreakdown[id] is clamped to [0, balances[id]]
   */
  function computeAccountBalances(transactions, transfers, adjustments = []) {
    const balances        = {};
    const savingsBreakdown = {};

    for (const a of accounts) {
      balances[a.id]         = 0;
      savingsBreakdown[a.id] = 0;
    }

    // ── Step 1: Apply transactions ─────────────────────────────────────────
    for (const t of transactions) {
      if (!t.account_id || !balances.hasOwnProperty(t.account_id)) continue;
      if (t.type === 'income') {
        const spendable = Number(t.amount) - Number(t.savings_allocation || 0);
        balances[t.account_id] += spendable;
      } else {
        balances[t.account_id] -= Number(t.amount);
      }
      // Savings allocation routes to savings_account_id
      if (t.savings_allocation && t.savings_account_id) {
        if (balances.hasOwnProperty(t.savings_account_id)) {
          balances[t.savings_account_id]        += Number(t.savings_allocation);
          savingsBreakdown[t.savings_account_id] += Number(t.savings_allocation);
        }
      }
    }

    // ── Step 2: Apply account transfers ───────────────────────────────────
    for (const tr of transfers) {
      if (balances.hasOwnProperty(tr.from_account_id)) balances[tr.from_account_id] -= Number(tr.amount);
      if (balances.hasOwnProperty(tr.to_account_id))   balances[tr.to_account_id]   += Number(tr.amount);
    }

    // ── Step 3: Apply savings adjustments ─────────────────────────────────
    for (const adj of adjustments) {
      const amt = Number(adj.amount);
      if (!amt) continue;

      switch (adj.action_type) {
        case 'allocate':
          // Available → Savings within the same account.
          // No change to total balance; only shifts the savings label.
          if (savingsBreakdown.hasOwnProperty(adj.from_account_id)) {
            savingsBreakdown[adj.from_account_id] += amt;
          }
          break;

        case 'release':
          // Savings → Available within the same account.
          // No change to total balance; only un-labels savings.
          if (savingsBreakdown.hasOwnProperty(adj.from_account_id)) {
            savingsBreakdown[adj.from_account_id] -= amt;
          }
          break;

        case 'transfer':
          // Move actual money from Account A to Account B, where the
          // source money came from savings and the destination is also labelled savings.
          // Total system money stays the same.
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
          // Signed delta applied directly to savings label (no balance change).
          // amt may be negative here.
          if (savingsBreakdown.hasOwnProperty(adj.from_account_id)) {
            savingsBreakdown[adj.from_account_id] += amt;
          }
          break;

        default:
          break;
      }
    }

    // ── Step 4: Clamp to prevent impossible display states ────────────────
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