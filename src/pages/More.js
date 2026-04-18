import { useNavigate } from 'react-router-dom';
import { BarChart2, Wallet, Settings, ChevronRight, LogOut, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { useToast } from '../components/ui/Toast';

export default function More() {
  const navigate            = useNavigate();
  const { user, signOut }   = useAuth();
  const { prefs, updatePref } = useUserPreferences();
  const { push }            = useToast();

  async function handleSignOut() {
    try { await signOut(); } catch (e) { push(e.message, 'error'); }
  }

  async function toggleGhost() {
    await updatePref('ghost_mode', !prefs.ghost_mode);
    push(prefs.ghost_mode ? 'Ghost Mode OFF' : 'Ghost Mode ON 👻');
  }

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: '1.25rem' }}>
      <p style={{ fontSize: '0.68rem', color: '#475569', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.5rem', paddingLeft: '0.25rem' }}>{title}</p>
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );

  const Row = ({ icon: Icon, label, sub, onClick, right, color = '#94a3b8', noBorder = false }) => (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1rem',
      background: 'transparent', border: 'none', borderBottom: noBorder ? 'none' : '1px solid #334155',
      width: '100%', cursor: onClick ? 'pointer' : 'default', textAlign: 'left', fontFamily: 'inherit'
    }}>
      {Icon && (
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(129,140,248,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={17} color="#818cf8" />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.9rem', fontWeight: 600, color: color }}>{label}</p>
        {sub && <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.1rem' }}>{sub}</p>}
      </div>
      {right || (onClick && <ChevronRight size={16} color="#334155" />)}
    </button>
  );

  return (
    <div className="page">
      <h1 style={{ marginBottom: '1.5rem' }}>More</h1>

      {/* User */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(129,140,248,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <User size={20} color="#818cf8" />
        </div>
        <div>
          <p style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.9rem' }}>{user?.email}</p>
          <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Signed in</p>
        </div>
      </div>

      <Section title="Finance">
        <Row icon={BarChart2} label="Reports"  sub="Monthly, yearly, goals"   onClick={() => navigate('/reports')}  />
        <Row icon={Wallet}    label="Accounts" sub="Manage accounts & transfers" onClick={() => navigate('/accounts')} noBorder />
      </Section>

      <Section title="Quick Actions">
        <Row label="🤔 Can I Afford It?" sub="Simulate a purchase" onClick={() => navigate('/?affordit=1')} />
        <Row label="👻 Ghost Mode" sub={prefs.ghost_mode ? 'ON — savings hidden' : 'OFF — all visible'}
          onClick={toggleGhost}
          noBorder
          right={
            <div style={{
              background: prefs.ghost_mode ? 'rgba(245,158,11,.15)' : '#0f172a',
              border: `1px solid ${prefs.ghost_mode ? '#f59e0b' : '#334155'}`,
              borderRadius: 20, padding: '0.25rem 0.75rem',
              color: prefs.ghost_mode ? '#f59e0b' : '#475569',
              fontSize: '0.72rem', fontWeight: 700
            }}>
              {prefs.ghost_mode ? 'ON' : 'OFF'}
            </div>
          }
        />
      </Section>

      <Section title="App">
        <Row icon={Settings} label="Settings" sub="Priorities, preferences" onClick={() => navigate('/settings')} noBorder />
      </Section>

      <div style={{ background: 'rgba(244,63,94,.06)', border: '1px solid rgba(244,63,94,.15)', borderRadius: 14, overflow: 'hidden' }}>
        <button onClick={handleSignOut} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          padding: '0.875rem', background: 'transparent', border: 'none',
          width: '100%', cursor: 'pointer', fontFamily: 'inherit',
          color: '#f43f5e', fontWeight: 700, fontSize: '0.875rem'
        }}>
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      <p style={{ fontSize: '0.72rem', color: '#334155', textAlign: 'center', marginTop: '1.5rem' }}>
        FlowTracker v2.0 · Supabase cloud
      </p>
    </div>
  );
}