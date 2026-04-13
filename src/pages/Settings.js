import { LogOut, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { useCategoryPriorities } from '../hooks/useCategoryPriorities';
import { CategoryPrioritySettings } from '../components/budgets/CategoryPrioritySettings';

export default function Settings() {
  const { user, signOut }                        = useAuth();
  const { push }                                 = useToast();
  const { prefs, updatePref }                    = useUserPreferences();
  const { getPriority, setPriority }             = useCategoryPriorities();

  async function handleSignOut() {
    try { await signOut(); }
    catch (e) { push(e.message, 'error'); }
  }

  async function toggleGhost() {
    await updatePref('ghost_mode', !prefs.ghost_mode);
    push(prefs.ghost_mode ? 'Ghost Mode OFF — savings visible' : 'Ghost Mode ON — savings hidden 👻', 'success');
  }

  return (
    <div className="page">
      <h1 style={{ marginBottom: '1.5rem' }}>Settings</h1>

      {/* Account */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(129,140,248,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={20} color="#818cf8" />
          </div>
          <div>
            <p style={{ fontWeight: 600, color: '#f1f5f9' }}>{user?.email}</p>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Logged in</p>
          </div>
        </div>
        <button onClick={handleSignOut} style={{
          background: 'rgba(244,63,94,.12)', border: 'none', borderRadius: 10,
          color: '#f43f5e', padding: '0.75rem', fontWeight: 700, fontSize: '0.875rem',
          cursor: 'pointer', width: '100%', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
        }}>
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      {/* Ghost Mode */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <div>
            <p style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: '0.25rem' }}>👻 Ghost Mode</p>
            <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5, maxWidth: 220 }}>
              Hide your savings from the balance display. Helps avoid impulsive spending.
            </p>
          </div>
          <button onClick={toggleGhost} style={{
            background: prefs.ghost_mode ? 'rgba(245,158,11,.15)' : '#1e293b',
            border: `1px solid ${prefs.ghost_mode ? '#f59e0b' : '#334155'}`,
            borderRadius: 30, padding: '0.4rem 0.875rem',
            color: prefs.ghost_mode ? '#f59e0b' : '#64748b',
            fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit',
            flexShrink: 0
          }}>
            {prefs.ghost_mode ? 'ON' : 'OFF'}
          </button>
        </div>
        {prefs.ghost_mode && (
          <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.78rem', color: '#f59e0b' }}>
            👻 Savings are hidden to help you stay on track
          </div>
        )}
      </div>

      {/* Category Priorities */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <CategoryPrioritySettings getPriority={getPriority} setPriority={setPriority} />
      </div>

      {/* App Info */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginBottom: '0.75rem' }}>About</h3>
        {[
          ['App',      'FlowTracker'],
          ['Version',  '2.0.0'],
          ['Database', 'Supabase (cloud)'],
          ['Currency', 'USD ($)'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{k}</span>
            <span style={{ fontSize: '0.875rem', color: '#94a3b8', fontWeight: 500 }}>{v}</span>
          </div>
        ))}
      </div>

      {/* PWA install */}
      <div style={{ background: 'rgba(129,140,248,.08)', border: '1px solid rgba(129,140,248,.2)', borderRadius: 12, padding: '1rem' }}>
        <p style={{ fontSize: '0.875rem', color: '#818cf8', fontWeight: 600, marginBottom: '0.4rem' }}>📱 Install as App</p>
        <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.6 }}>
          <strong style={{ color: '#94a3b8' }}>iPhone:</strong> Tap Share → Add to Home Screen<br />
          <strong style={{ color: '#94a3b8' }}>Android:</strong> Tap menu ⋮ → Add to Home Screen<br />
          <strong style={{ color: '#94a3b8' }}>Desktop:</strong> Click install icon in browser bar
        </p>
      </div>
    </div>
  );
}