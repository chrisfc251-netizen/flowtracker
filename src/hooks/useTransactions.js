import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useTransactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [syncState, setSyncState]       = useState('idle'); // idle | saving | saved | error
  const syncTimer = useRef(null);

  const flashSync = useCallback((state) => {
    setSyncState(state);
    clearTimeout(syncTimer.current);
    if (state === 'saved') {
      syncTimer.current = setTimeout(() => setSyncState('idle'), 2500);
    }
  }, []);

  // Load all transactions for current user
  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (!error) setTransactions(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` },
        () => fetchAll()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, fetchAll]);

  async function addTransaction(payload) {
    flashSync('saving');
    const row = { ...payload, user_id: user.id };
    const { data, error } = await supabase.from('transactions').insert(row).select().single();
    if (error) { flashSync('error'); throw error; }
    setTransactions((prev) => [data, ...prev]);
    flashSync('saved');
    return data;
  }

  async function updateTransaction(id, payload) {
    flashSync('saving');
    const { data, error } = await supabase
      .from('transactions')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) { flashSync('error'); throw error; }
    setTransactions((prev) => prev.map((t) => (t.id === id ? data : t)));
    flashSync('saved');
    return data;
  }

  async function deleteTransaction(id) {
    flashSync('saving');
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) { flashSync('error'); throw error; }
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    flashSync('saved');
  }

  return {
    transactions,
    loading,
    syncState,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    refresh: fetchAll
  };
}
