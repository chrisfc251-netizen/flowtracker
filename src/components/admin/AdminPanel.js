/**
 * AdminPanel.js
 * Visible only to users with plan='admin'.
 * Shows all registered users + their current plan.
 * Admin can promote to 'beta', 'pro', or demote to 'free'.
 */
import { useEffect, useState, useCallback } from 'react';
import { Shield, RefreshCw, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast }  from '../ui/Toast';

const PLAN_COLORS = {
  admin: { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   color: '#ef4444',  label: 'Admin' },
  pro:   { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)',  color: '#f59e0b',  label: 'Pro' },
  beta:  { bg: 'rgba(6,182,212,0.12)',   border: 'rgba(6,182,212,0.3)',   color: '#06b6d4',  label: 'Beta' },
  free:  { bg: 'rgba(100,116,139,0.1)',  border: 'rgba(100,116,139,0.2)', color: '#64748b',  label: 'Free' },
};

function PlanBadge({ plan }) {
  const style = PLAN_COLORS[plan] || PLAN_COLORS.free;
  return (
    <span style={{
      fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px',
      borderRadius: 6, letterSpacing: '0.05em',
      background: style.bg, border: `1px solid ${style.border}`, color: style.color,
    }}>
      {style.label}
    </span>
  );
}

export function AdminPanel() {
  const { push }           = useToast();
  const [users, setUsers]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null); // user_id being updated
  const [openMenu, setOpenMenu] = useState(null);  // user_id with open dropdown

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admin_users_view')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      push('Failed to load users', 'error');
      console.error(error);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  }, [push]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function setPlan(userId, newPlan) {
    setUpdating(userId);
    setOpenMenu(null);

    // Check if row exists
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .single();

    let error;
    if (existing) {
      const result = await supabase
        .from('subscriptions')
        .update({ plan: newPlan, status: 'active', updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      error = result.error;
    } else {
      const result = await supabase
        .from('subscriptions')
        .insert({ user_id: userId, plan: newPlan, status: 'active' });
      error = result.error;
    }

    if (error) {
      push(`Failed to update plan: ${error.message}`, 'error');
    } else {
      push(`Plan updated to ${newPlan} ✓`);
      // Update local state immediately
      setUsers(prev => prev.map(u =>
        u.user_id === userId ? { ...u, plan: newPlan } : u
      ));
    }
    setUpdating(null);
  }

  const planOptions = ['beta', 'pro', 'free'];

  // Format date nicely
  function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Shorten email for display
  function shortEmail(email) {
    if (!email) return '—';
    if (email.length <= 28) return email;
    const [local, domain] = email.split('@');
    return `${local.slice(0, 10)}…@${domain}`;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={15} color="#ef4444" />
          <p style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.9rem' }}>Admin Panel</p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          style={{
            background: 'transparent', border: '1px solid #334155',
            borderRadius: 8, padding: '4px 10px',
            color: '#64748b', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: '0.72rem', fontWeight: 600,
          }}
        >
          <RefreshCw size={11} style={{ animation: loading ? 'auth-spin 0.7s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.375rem', marginBottom: '0.875rem' }}>
        {Object.entries(PLAN_COLORS).map(([planKey, style]) => {
          const count = users.filter(u => (u.plan || 'free') === planKey).length;
          return (
            <div key={planKey} style={{
              background: style.bg, border: `1px solid ${style.border}`,
              borderRadius: 10, padding: '0.5rem',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: '1.1rem', fontWeight: 800, color: style.color }}>{count}</p>
              <p style={{ fontSize: '0.6rem', color: style.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{style.label}</p>
            </div>
          );
        })}
      </div>

      {/* User list */}
      {loading ? (
        <p style={{ fontSize: '0.82rem', color: '#475569', textAlign: 'center', padding: '1rem' }}>Loading users…</p>
      ) : users.length === 0 ? (
        <p style={{ fontSize: '0.82rem', color: '#475569', textAlign: 'center', padding: '1rem' }}>No users found</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {users.map(user => {
            const currentPlan = user.plan || 'free';
            const isUpdating  = updating === user.user_id;
            const menuOpen    = openMenu === user.user_id;

            return (
              <div
                key={user.user_id}
                style={{
                  background: '#0f172a', border: '1px solid #1e293b',
                  borderRadius: 12, padding: '0.75rem',
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  position: 'relative',
                }}
              >
                {/* User info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.82rem', color: '#f1f5f9', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {shortEmail(user.email)}
                  </p>
                  <p style={{ fontSize: '0.65rem', color: '#334155', marginTop: '0.15rem' }}>
                    Joined {fmtDate(user.created_at)}
                    {user.last_sign_in_at && ` · Last seen ${fmtDate(user.last_sign_in_at)}`}
                  </p>
                </div>

                {/* Plan badge */}
                <PlanBadge plan={currentPlan} />

                {/* Plan changer — skip for admin rows */}
                {currentPlan !== 'admin' && (
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setOpenMenu(menuOpen ? null : user.user_id)}
                      disabled={isUpdating}
                      style={{
                        background: '#1e293b', border: '1px solid #334155',
                        borderRadius: 8, padding: '4px 8px',
                        color: '#64748b', cursor: isUpdating ? 'wait' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: 3,
                        fontSize: '0.7rem', fontWeight: 600,
                        opacity: isUpdating ? 0.6 : 1,
                      }}
                    >
                      {isUpdating ? '…' : 'Change'}
                      {!isUpdating && <ChevronDown size={10} />}
                    </button>

                    {/* Dropdown */}
                    {menuOpen && (
                      <div style={{
                        position: 'absolute', right: 0, top: '100%', marginTop: 4,
                        background: '#1e293b', border: '1px solid #334155',
                        borderRadius: 10, overflow: 'hidden',
                        zIndex: 50, minWidth: 100,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                      }}>
                        {planOptions.map(option => {
                          const style = PLAN_COLORS[option];
                          const isCurrent = option === currentPlan;
                          return (
                            <button
                              key={option}
                              onClick={() => !isCurrent && setPlan(user.user_id, option)}
                              style={{
                                width: '100%', background: isCurrent ? '#0f172a' : 'transparent',
                                border: 'none', padding: '0.5rem 0.75rem',
                                color: isCurrent ? style.color : '#94a3b8',
                                fontSize: '0.78rem', fontWeight: isCurrent ? 800 : 500,
                                cursor: isCurrent ? 'default' : 'pointer',
                                textAlign: 'left', fontFamily: 'inherit',
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                              }}
                            >
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: style.color, flexShrink: 0 }} />
                              {style.label}
                              {isCurrent && <span style={{ fontSize: '0.6rem', color: '#334155' }}>current</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Close dropdown on outside click */}
      {openMenu && (
        <div
          onClick={() => setOpenMenu(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 40 }}
        />
      )}
    </div>
  );
}