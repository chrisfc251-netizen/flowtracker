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
    if (!email || !password) { push('Email and password required', 'error'); return; }
    if (password.length < 6)  { push('Password must be at least 6 characters', 'error'); return; }
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
        push('Check your email to confirm, then sign in.');
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
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '1.5rem',
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.75rem' }}>
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '2.75rem',
            fontWeight: 900,
            color: 'var(--ink-1)',
            letterSpacing: '-0.02em',
            lineHeight: 1,
            marginBottom: '0.5rem',
          }}>
            FlowTracker
          </p>
          <p style={{
            color: 'var(--ink-3)',
            fontSize: '0.875rem',
            fontFamily: 'var(--font-sans)',
          }}>
            Personal finance, simplified.
          </p>
        </div>

        {/* Mode toggle */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 3,
          marginBottom: '1.5rem',
        }}>
          {['login', 'signup'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                padding: '0.6rem',
                borderRadius: 8,
                border: 'none',
                background: mode === m ? 'var(--bg-inset)' : 'transparent',
                color: mode === m ? 'var(--ink-1)' : 'var(--ink-3)',
                fontWeight: 600,
                fontSize: '0.875rem',
                fontFamily: 'var(--font-sans)',
                cursor: 'pointer',
                transition: 'all .2s',
              }}
            >
              {m === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <input
            type="password"
            placeholder="Password (min. 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={loading}
            style={{ marginTop: '0.25rem' }}
          >
            {loading ? '…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </div>

        {mode === 'signup' && (
          <p style={{
            fontSize: '0.75rem',
            color: 'var(--ink-4)',
            textAlign: 'center',
            marginTop: '1rem',
            lineHeight: 1.6,
            fontFamily: 'var(--font-sans)',
          }}>
            Your data is private and synced to your account only.
          </p>
        )}
      </div>
    </div>
  );
}
