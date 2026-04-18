import { useCallback } from 'react';
import { useAuth } from './useAuth';

// ── Free tier limits (preserved for future use) ───────────────────────────
export const FREE_LIMITS = {
  goals:    2,
  accounts: 1,
  budgets:  3,
};

// ── BETA MODE — all features open for everyone ────────────────────────────
// To re-enable plan gating later, replace this file with the full version
// from flowtracker-admin/hooks/useSubscription.js
//
// When you're ready to monetize:
//   1. Restore the full useSubscription.js with Supabase plan fetching
//   2. Run the SQL migrations (00, 01, 02) if not already done
//   3. Set your own user to plan='admin' in Supabase

export function useSubscription() {
  const { user } = useAuth();

  // Everyone gets full access during beta
  const isPro   = true;
  const isAdmin = false; // keep admin panel hidden from everyone for now
  const isBeta  = true;
  const plan    = 'beta';
  const loading = false;

  const canUse      = useCallback(() => true,  []);
  const isAtLimit   = useCallback(() => false, []);

  return { plan, isPro, isAdmin, isBeta, loading, canUse, isAtLimit };
}