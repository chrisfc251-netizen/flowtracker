import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useSavingsGoals() {
  const { user } = useAuth();
  const [goals, setGoals]     = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchGoals = useCallback(async () => {
    if (!user) { setGoals([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) { console.error('Error fetching goals:', error); setGoals([]); }
    else        { setGoals(data || []); }
    setLoading(false);
  }, [user]);

  const addGoal = useCallback(async ({ name, target_amount, current_amount = 0, target_date = null }) => {
    if (!user) return { error: new Error('No authenticated user') };
    const { data, error } = await supabase
      .from('savings_goals')
      .insert([{ user_id: user.id, name, target_amount: Number(target_amount), current_amount: Number(current_amount), target_date: target_date || null }])
      .select().single();
    if (error) { console.error('Error adding goal:', error); return { error }; }
    setGoals((prev) => [data, ...prev]);
    return { data };
  }, [user]);

  // Add money to goal
  const addMoneyToGoal = useCallback(async (goalId, amountToAdd) => {
    const amount = Number(amountToAdd);
    if (!amount || amount <= 0) return { error: new Error('Amount must be greater than 0') };
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return { error: new Error('Goal not found') };
    const newAmount = Number(goal.current_amount || 0) + amount;
    const { data, error } = await supabase
      .from('savings_goals')
      .update({ current_amount: newAmount })
      .eq('id', goalId)
      .eq('user_id', user.id)
      .select().single();
    if (error) { console.error('Error adding money:', error); return { error }; }
    setGoals((prev) => prev.map((g) => (g.id === goalId ? data : g)));
    return { data };
  }, [goals, user]);

  // Subtract money from goal (for corrections)
  const subtractMoneyFromGoal = useCallback(async (goalId, amountToRemove) => {
    const amount = Number(amountToRemove);
    if (!amount || amount <= 0) return { error: new Error('Amount must be greater than 0') };
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return { error: new Error('Goal not found') };
    const newAmount = Math.max(Number(goal.current_amount || 0) - amount, 0); // never go below 0
    const { data, error } = await supabase
      .from('savings_goals')
      .update({ current_amount: newAmount })
      .eq('id', goalId)
      .eq('user_id', user.id)
      .select().single();
    if (error) { console.error('Error subtracting money:', error); return { error }; }
    setGoals((prev) => prev.map((g) => (g.id === goalId ? data : g)));
    return { data };
  }, [goals, user]);

  const deleteGoal = useCallback(async (goalId) => {
    if (!user) return { error: new Error('No authenticated user') };
    const { error } = await supabase
      .from('savings_goals')
      .delete()
      .eq('id', goalId)
      .eq('user_id', user.id);
    if (error) { console.error('Error deleting goal:', error); return { error }; }
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
    return { data: true };
  }, [user]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  return {
    goals,
    loading,
    refetch: fetchGoals,
    addGoal,
    addMoneyToGoal,
    subtractMoneyFromGoal,
    deleteGoal,
  };
}