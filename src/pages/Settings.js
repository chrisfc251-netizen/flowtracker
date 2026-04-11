import { LogOut, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';

export default function Settings() {
  const { user, signOut } = useAuth();
  const { push } = useToast();

  async function handleSignOut() {
    try { await signOut(); }
    catch (e) { push(e.message, 'error'); }
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
        <button className="btn-danger" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.75rem' }}
          onClick={handleSignOut}>
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      {/* App info */}
      <div className="card">
        <h3 style={{ marginBottom: '0.75rem' }}>About</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[
            ['App', 'FlowTracker'],
            ['Version', '1.0.0'],
            ['Database', 'Supabase (cloud)'],
            ['Currency', 'USD ($)'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{k}</span>
              <span style={{ fontSize: '0.875rem', color: '#94a3b8', fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* PWA install tip */}
      <div style={{ marginTop: '1.25rem', background: 'rgba(129,140,248,.08)', border: '1px solid rgba(129,140,248,.2)', borderRadius: 12, padding: '1rem' }}>
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
