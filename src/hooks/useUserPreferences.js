import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

const DEFAULTS = { ghost_mode: false };

export function useUserPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs]     = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const fetchPrefs = useCallback(async () => {
    if (!user) { setPrefs(DEFAULTS); setLoading(false); return; }
    const { data } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();
    if (data) setPrefs(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchPrefs(); }, [fetchPrefs]);

  const updatePref = useCallback(async (key, value) => {
    if (!user) return;
    const newPrefs = { ...prefs, [key]: value };
    setPrefs(newPrefs);

    // Upsert
    const { data: existing } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existing) {
      await supabase.from('user_preferences').update({ [key]: value, updated_at: new Date().toISOString() }).eq('user_id', user.id);
    } else {
      await supabase.from('user_preferences').insert({ user_id: user.id, [key]: value });
    }
  }, [user, prefs]);

  return { prefs, loading, updatePref };
}