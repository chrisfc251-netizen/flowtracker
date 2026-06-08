import { LogOut, User, ChevronRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { useCategoryPriorities } from '../hooks/useCategoryPriorities';
import { CategoryPrioritySettings } from '../components/budgets/CategoryPrioritySettings';

export default function Settings() {
  const { user, signOut }            = useAuth();
  const { push }                     = useToast();
  const { prefs, updatePref }        = useUserPreferences();
  const { getPriority, setPriority } = useCategoryPriorities();

  async function handleSignOut() {
    try { await signOut(); }
    catch (e) { push(e.message, 'error'); }
  }

  async function toggleGhost() {
    await updatePref('ghost_mode', !prefs.ghost_mode);
    push(prefs.ghost_mode ? 'Ghost Mode off' : 'Ghost Mode on - savings hidden', 'success');
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

  const Row = ({ label, value, action, onClick, danger }) => (
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
      <p style={{
        fontSize: '0.9rem', color: danger ? 'var(--accent-red)' : 'var(--ink-1)',
        fontFamily: 'var(--font-sans)', fontWeight: 500
      }}>{label}</p>
      {value && (
        <p style={{ fontSize: '0.875rem', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)' }}>{value}</p>
      )}
      {action}
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
        boxShadow: 'var(--shadow-card)'
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
    </div>
  );
}
