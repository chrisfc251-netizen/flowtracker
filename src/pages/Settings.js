import { useState } from 'react';
import { LogOut, User, ChevronRight, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { useCategoryPriorities } from '../hooks/useCategoryPriorities';
import { CategoryPrioritySettings } from '../components/budgets/CategoryPrioritySettings';
import { supabase } from '../lib/supabase';

export default function Settings() {
  const navigate                     = useNavigate();
  const { user, signOut }            = useAuth();
  const { push }                     = useToast();
  const { prefs, updatePref }        = useUserPreferences();
  const { getPriority, setPriority } = useCategoryPriorities();

  // Reset state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState('');

  async function handleSignOut() {
    try { await signOut(); }
    catch (e) { push(e.message, 'error'); }
  }

  async function toggleGhost() {
    await updatePref('ghost_mode', !prefs.ghost_mode);
    push(prefs.ghost_mode ? 'Ghost Mode off' : 'Ghost Mode on - savings hidden', 'success');
  }

  async function handleReset() {
    if (resetConfirmText !== 'RESET') {
      setResetError('Type RESET to confirm');
      return;
    }
    if (!user?.id) return;
    setResetting(true);
    setResetError('');
    try {
      // Delete all user financial data in dependency order
      const tables = [
        'transactions',
        'transfers',
        'budgets',
        'fixed_expenses',
        'savings_goals',
        'vacations',
        'savings_adjustments',
        'user_onboarding_state',
      ];
      for (const table of tables) {
        const { error } = await supabase.from(table).delete().eq('user_id', user.id);
        if (error && !error.message.includes('does not exist')) {
          console.warn(`Reset: could not clear ${table}:`, error.message);
        }
      }
      push('Financial data reset. Reload to start fresh.', 'success');
      setShowResetModal(false);
      setResetConfirmText('');
      // Brief pause then reload to trigger onboarding
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      setResetError(e.message);
    } finally {
      setResetting(false);
    }
  }

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: '1.5rem' }}>
      <p style={{
        fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--ink-3)',
        fontFamily: 'var(--font-sans)', marginBottom: '0.5rem'
      }}>{title}</p>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 'var(--radius)',
        border: '1px solid var(--border)', overflow: 'hidden',
        boxShadow: 'var(--shadow-card)'
      }}>
        {children}
      </div>
    </div>
  );

  const Row = ({ label, value, action, onClick, danger, sub }) => (
    <div
      onClick={onClick}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0.875rem 1rem',
        borderBottom: '1px solid var(--border)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.1s'
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.background = 'var(--bg-inset)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div>
        <p style={{
          fontSize: '0.9rem', color: danger ? 'var(--accent-red)' : 'var(--ink-1)',
          fontFamily: 'var(--font-sans)', fontWeight: 500
        }}>{label}</p>
        {sub && <p style={{ fontSize: '0.775rem', color: 'var(--ink-4)', fontFamily: 'var(--font-sans)', marginTop: '0.1rem' }}>{sub}</p>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {value && (
          <p style={{ fontSize: '0.875rem', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)' }}>{value}</p>
        )}
        {action}
        {onClick && <ChevronRight size={15} color="var(--ink-4)" />}
      </div>
    </div>
  );

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Settings</h1>

      {/* Account */}
      <Section title="Account">
        <div style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'var(--bg-inset)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <User size={18} color="var(--ink-3)" />
            </div>
            <div>
              <p style={{ fontWeight: 600, color: 'var(--ink-1)', fontFamily: 'var(--font-sans)', fontSize: '0.9rem' }}>
                {user?.email}
              </p>
              <p style={{ fontSize: '0.775rem', color: 'var(--ink-4)', fontFamily: 'var(--font-sans)' }}>Signed in</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            style={{
              width: '100%', background: 'transparent',
              border: '1px solid rgba(192,57,43,0.3)',
              borderRadius: 'var(--radius-sm)', padding: '0.75rem',
              color: 'var(--accent-red)', fontWeight: 600, fontSize: '0.875rem',
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(192,57,43,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </Section>

      {/* Accounts & Balances */}
      <Section title="Accounts & Balances">
        <Row
          label="Manage Accounts"
          sub="View, edit, transfer, add accounts"
          onClick={() => navigate('/accounts')}
        />
      </Section>

      {/* Preferences */}
      <Section title="Preferences">
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.875rem 1rem'
        }}>
          <div>
            <p style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--ink-1)', fontFamily: 'var(--font-sans)', marginBottom: '0.2rem' }}>
              Ghost Mode
            </p>
            <p style={{ fontSize: '0.775rem', color: 'var(--ink-4)', fontFamily: 'var(--font-sans)', maxWidth: 200 }}>
              Hide savings balance to avoid impulsive spending
            </p>
          </div>
          <button
            onClick={toggleGhost}
            style={{
              background: prefs.ghost_mode ? 'var(--ink-1)' : 'var(--bg-inset)',
              border: '1px solid var(--border-strong)',
              borderRadius: 999, padding: '0.35rem 0.875rem',
              color: prefs.ghost_mode ? 'var(--bg)' : 'var(--ink-3)',
              fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', flexShrink: 0, transition: 'all 0.15s'
            }}
          >
            {prefs.ghost_mode ? 'On' : 'Off'}
          </button>
        </div>
      </Section>

      {/* Category Priorities */}
      <Section title="Category priorities">
        <div style={{ padding: '0.875rem 1rem' }}>
          <CategoryPrioritySettings getPriority={getPriority} setPriority={setPriority} />
        </div>
      </Section>

      {/* About */}
      <Section title="About">
        {[
          ['App', 'FlowTracker'],
          ['Version', '2.0.0'],
          ['Database', 'Supabase'],
          ['Currency', 'USD ($)'],
        ].map(([k, v], i, arr) => (
          <div key={k} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0.75rem 1rem',
            borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none'
          }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)' }}>{k}</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--ink-2)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{v}</span>
          </div>
        ))}
      </Section>

      {/* Install */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '1rem',
        boxShadow: 'var(--shadow-card)', marginBottom: '1.5rem'
      }}>
        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink-1)', fontFamily: 'var(--font-sans)', marginBottom: '0.5rem' }}>
          Install as App
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--ink-2)' }}>iPhone:</strong> Share > Add to Home Screen<br />
          <strong style={{ color: 'var(--ink-2)' }}>Android:</strong> Menu > Add to Home Screen<br />
          <strong style={{ color: 'var(--ink-2)' }}>Desktop:</strong> Click install icon in address bar
        </p>
      </div>

      {/* ── Danger Zone ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{
          fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'var(--accent-red)',
          fontFamily: 'var(--font-sans)', marginBottom: '0.5rem'
        }}>Danger Zone</p>
        <div style={{
          background: 'var(--bg-card)', borderRadius: 'var(--radius)',
          border: '1px solid rgba(220,38,38,0.25)', overflow: 'hidden',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ padding: '1rem' }}>
            <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink-1)', fontFamily: 'var(--font-sans)', marginBottom: '0.25rem' }}>
              Reset All Financial Data
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)', marginBottom: '0.875rem', lineHeight: 1.5 }}>
              Deletes all transactions, transfers, budgets, bills, goals, and vacations. Your accounts will remain but show $0.00. Your login and settings are preserved.
            </p>
            <button
              onClick={() => { setShowResetModal(true); setResetConfirmText(''); setResetError(''); }}
              style={{
                background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)',
                borderRadius: 'var(--radius-sm)', padding: '0.65rem 1.125rem',
                color: 'var(--accent-red)', fontWeight: 600, fontSize: '0.875rem',
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,0.14)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(220,38,38,0.08)'}
            >
              Reset All Financial Data
            </button>
          </div>
        </div>
      </div>

      {/* ── Reset Confirmation Modal ─────────────────────────────────────── */}
      {showResetModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}
          onClick={e => e.target === e.currentTarget && setShowResetModal(false)}
        >
          <div style={{
            background: 'var(--bg-card)', border: '1px solid rgba(220,38,38,0.3)',
            borderRadius: 20, padding: '1.75rem 1.25rem', width: '100%', maxWidth: 420,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
          }}>
            {/* Close */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '2rem' }}>⚠️</div>
              <button onClick={() => setShowResetModal(false)} style={{
                background: 'var(--bg-inset)', border: '1px solid var(--border)',
                borderRadius: 8, width: 32, height: 32, cursor: 'pointer',
                color: 'var(--ink-3)', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>✕</button>
            </div>

            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink-1)', fontFamily: 'var(--font-serif)', marginBottom: '0.5rem' }}>
              Reset All Financial Data?
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--accent-red)', fontFamily: 'var(--font-sans)', marginBottom: '1rem', fontWeight: 600 }}>
              This will permanently delete your financial data. This cannot be undone.
            </p>
            <p style={{ fontSize: '0.825rem', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              The following will be deleted: transactions, transfers, budgets, fixed expenses, savings goals, and vacations. Your account records will be kept but balances will show $0.00. Your login credentials are not affected.
            </p>

            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)', fontWeight: 600, marginBottom: '0.5rem' }}>
              Type <strong style={{ color: 'var(--accent-red)' }}>RESET</strong> to confirm
            </label>
            <input
              type="text"
              placeholder="RESET"
              value={resetConfirmText}
              onChange={e => { setResetConfirmText(e.target.value); setResetError(''); }}
              style={{
                width: '100%', background: 'var(--bg-inset)',
                border: `1px solid ${resetConfirmText === 'RESET' ? 'var(--accent-red)' : 'var(--border-strong)'}`,
                borderRadius: 10, color: 'var(--ink-1)', padding: '0.75rem 1rem',
                fontSize: '1rem', outline: 'none', fontFamily: 'var(--font-mono)',
                boxSizing: 'border-box', marginBottom: '0.75rem',
                letterSpacing: '0.1em', fontWeight: 700
              }}
            />
            {resetError && <p style={{ color: 'var(--accent-red)', fontSize: '0.8rem', marginBottom: '0.75rem', fontFamily: 'var(--font-sans)' }}>{resetError}</p>}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setShowResetModal(false)}
                style={{
                  flex: 1, background: 'var(--bg-inset)',
                  border: '1px solid var(--border-strong)', borderRadius: 10,
                  padding: '0.75rem', fontWeight: 600, fontSize: '0.875rem',
                  cursor: 'pointer', color: 'var(--ink-2)', fontFamily: 'var(--font-sans)'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={resetting || resetConfirmText !== 'RESET'}
                style={{
                  flex: 1, background: resetConfirmText === 'RESET' ? 'var(--accent-red)' : 'var(--bg-inset)',
                  border: '1px solid rgba(220,38,38,0.3)', borderRadius: 10,
                  padding: '0.75rem', fontWeight: 700, fontSize: '0.875rem',
                  cursor: resetting || resetConfirmText !== 'RESET' ? 'not-allowed' : 'pointer',
                  color: resetConfirmText === 'RESET' ? '#fff' : 'var(--ink-4)',
                  fontFamily: 'var(--font-sans)',
                  opacity: resetting ? 0.6 : 1, transition: 'all 0.15s'
                }}
              >
                {resetting ? 'Resetting…' : 'Reset Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}