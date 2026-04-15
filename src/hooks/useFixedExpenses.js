import { useCallback, useEffect, useState } from 'react';
import { addDays, addMonths, addWeeks, format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

// ── Next due date calculator ──────────────────────────────────────────────
export function calcNextDueDate(frequency_type, frequency_value, from = new Date()) {
  switch (frequency_type) {
    case 'monthly': return format(addMonths(from, 1), 'yyyy-MM-dd');
    case 'weekly':  return format(addWeeks(from, 1), 'yyyy-MM-dd');
    case 'custom':  return format(addDays(from, frequency_value), 'yyyy-MM-dd');
    default:        return format(addMonths(from, 1), 'yyyy-MM-dd');
  }
}

export function useFixedExpenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading]   = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) { setExpenses([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('fixed_expenses')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('next_due_date', { ascending: true });
    if (!error) setExpenses(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Create ────────────────────────────────────────────────────────────
  const addExpense = useCallback(async (payload) => {
    if (!user) return { error: new Error('Not authenticated') };
    const { data, error } = await supabase
      .from('fixed_expenses')
      .insert([{ ...payload, user_id: user.id }])
      .select().single();
    if (error) return { error };
    setExpenses((prev) => [...prev, data].sort((a, b) => new Date(a.next_due_date) - new Date(b.next_due_date)));
    return { data };
  }, [user]);

  // ── Update ────────────────────────────────────────────────────────────
  const updateExpense = useCallback(async (id, updates) => {
    const { data, error } = await supabase
      .from('fixed_expenses')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select().single();
    if (error) return { error };
    setExpenses((prev) => prev.map((e) => (e.id === id ? data : e)));
    return { data };
  }, [user]);

  // ── Delete (soft) ─────────────────────────────────────────────────────
  const deleteExpense = useCallback(async (id) => {
    const { error } = await supabase
      .from('fixed_expenses')
      .update({ is_active: false })
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) return { error };
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    return { data: true };
  }, [user]);

  // ── Mark as paid ──────────────────────────────────────────────────────
  // Creates a real transaction + advances next_due_date
  const markAsPaid = useCallback(async (expense, account_id) => {
    if (!user) return { error: new Error('Not authenticated') };

    const today       = format(new Date(), 'yyyy-MM-dd');
    const nextDueDate = calcNextDueDate(expense.frequency_type, expense.frequency_value);

    // 1. Create expense transaction
    const { error: txError } = await supabase
      .from('transactions')
      .insert([{
        user_id:     user.id,
        type:        'expense',
        amount:      expense.amount,
        category:    expense.category,
        date:        today,
        description: `${expense.name} (auto)`,
        nature:      'fixed',
        account_id,
        savings_allocation: 0,
      }]);
    if (txError) return { error: txError };

    // 2. Advance next_due_date
    const { data, error: updateError } = await supabase
      .from('fixed_expenses')
      .update({ next_due_date: nextDueDate })
      .eq('id', expense.id)
      .eq('user_id', user.id)
      .select().single();
    if (updateError) return { error: updateError };

    setExpenses((prev) => prev.map((e) => (e.id === expense.id ? data : e)));
    return { data };
  }, [user]);

  return { expenses, loading, fetchAll, addExpense, updateExpense, deleteExpense, markAsPaid };
}