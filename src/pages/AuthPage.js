import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const { push } = useToast();
  const [mode,     setMode]     = useState('login');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit() {
    if (!email || !password) { push('Email and password are required', 'error'); return; }
    if (password.length < 6) { push('Password must be at least 6 characters', 'error'); return; }
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
        push('Account created! Check your email to confirm, then sign in.');
        setMode('login');
      }
    } catch (e) {
      push(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0f172a', padding: '1.5rem'
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>💸</div>
          <h1 style={{ fontSize: '1.75rem', color: '#f1f5f9' }}>FlowTracker</h1>
          <p style={{ color: '#64748b', marginTop: '0.25rem', fontSize: '0.9rem' }}>Personal Finance, Simplified</p>
        </div>

        {/* Toggle */}
        <div style={{ display: 'flex', background: '#1e293b', borderRadius: 10, padding: 3, marginBottom: '1.5rem' }}>
          {['login','signup'].map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '0.6rem', borderRadius: 8, border: 'none',
              background: mode === m ? '#334155' : 'transparent',
              color: mode === m ? '#f1f5f9' : '#64748b',
              fontWeight: 600, fontSize: '0.9rem', transition: 'all .2s'
            }}>
              {m === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <input type="email" placeholder="Email address" value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
          <input type="password" placeholder="Password (min. 6 chars)" value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
          <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{ marginTop: '0.25rem' }}>
            {loading ? '…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </div>

        {mode === 'signup' && (
          <p style={{ fontSize: '0.75rem', color: '#475569', textAlign: 'center', marginTop: '1rem', lineHeight: 1.5 }}>
            Your data is private and synced to your account only.
          </p>
        )}
      </div>
    </div>
  );
}
