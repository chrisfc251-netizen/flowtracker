import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useTransfers() {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading]     = useState(true);

  const fetchTransfers = useCallback(async () => {
    if (!user) { setTransfers([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('transfers')
      .select('*, from_account:accounts!transfers_from_account_id_fkey(id,name,icon,color), to_account:accounts!transfers_to_account_id_fkey(id,name,icon,color)')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(50);
    if (!error) setTransfers(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTransfers(); }, [fetchTransfers]);

  const addTransfer = useCallback(async ({ from_account_id, to_account_id, amount, date, note }) => {
    if (!user) return { error: new Error('Not authenticated') };
    if (from_account_id === to_account_id) return { error: new Error('Cannot transfer to the same account') };
    const { data, error } = await supabase
      .from('transfers')
      .insert([{ user_id: user.id, from_account_id, to_account_id, amount: Number(amount), date, note: note || '' }])
      .select('*, from_account:accounts!transfers_from_account_id_fkey(id,name,icon,color), to_account:accounts!transfers_to_account_id_fkey(id,name,icon,color)')
      .single();
    if (error) return { error };
    setTransfers((prev) => [data, ...prev]);
    return { data };
  }, [user]);

  const deleteTransfer = useCallback(async (id) => {
    const { error } = await supabase.from('transfers').delete().eq('id', id).eq('user_id', user.id);
    if (error) return { error };
    setTransfers((prev) => prev.filter((t) => t.id !== id));
    return { data: true };
  }, [user]);

  return { transfers, loading, fetchTransfers, addTransfer, deleteTransfer };
}