import { useState } from 'react';
import { useAuth }  from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';

// ─────────────────────────────────────────────────────────────────────────
// AuthPage — redesigned to match FlowTracker v3 aesthetic
//
// Screens:
//   'login'  — sign in with email/password
//   'signup' — create account (only shown if open registration is on)
//   'reset'  — forgot password (sends reset email via Supabase)
// ─────────────────────────────────────────────────────────────────────────

const ACCENT       = '#818cf8';
const ACCENT_GLOW  = 'rgba(129,140,248,0.35)';
const CARD_BG      = '#1e293b';
const BORDER       = '#334155';
const TEXT_PRIMARY = '#f1f5f9';
const TEXT_MUTED   = '#64748b';
const TEXT_DIM     = '#475569';
const PAGE_BG      = '#0f172a';

// ── Shared input style ────────────────────────────────────────────────────
function inputStyle(focused = false) {
  return {
    width: '100%',
    boxSizing: 'border-box',
    background: focused ? '#243044' : '#172032',
    border: `1px solid ${focused ? ACCENT : BORDER}`,
    borderRadius: 12,
    color: TEXT_PRIMARY,
    padding: '0.875rem 1rem',
    fontSize: '0.95rem',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s, background 0.15s',
  };
}

// ── Controlled input with focus state ────────────────────────────────────
function Field({ type, placeholder, value, onChange, onKeyDown, autoFocus }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      autoFocus={autoFocus}
      style={inputStyle(focused)}
    />
  );
}

// ── Primary button ────────────────────────────────────────────────────────
function PrimaryBtn({ onClick, disabled, loading, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width: '100%',
        background: disabled || loading
          ? 'rgba(129,140,248,0.25)'
          : `linear-gradient(135deg, #818cf8, #6366f1)`,
        color: disabled || loading ? 'rgba(241,245,249,0.4)' : '#fff',
        border: 'none',
        borderRadius: 12,
        padding: '0.9rem',
        fontWeight: 700,
        fontSize: '0.975rem',
        cursor: disabled || loading ? 'default' : 'pointer',
        fontFamily: 'inherit',
        letterSpacing: '0.02em',
        boxShadow: disabled || loading ? 'none' : `0 4px 18px ${ACCENT_GLOW}`,
        transition: 'all 0.2s',
      }}
    >
      {loading ? (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            style={{ animation: 'auth-spin 0.7s linear infinite' }}>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          {typeof loading === 'string' ? loading : '…'}
        </span>
      ) : children}
    </button>
  );
}

// ── Text link button ──────────────────────────────────────────────────────
function LinkBtn({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 'none',
        color: ACCENT,
        fontSize: '0.85rem',
        fontWeight: 600,
        cursor: 'pointer',
        padding: '0.25rem',
        fontFamily: 'inherit',
        textDecoration: 'none',
        letterSpacing: '0.01em',
      }}
    >
      {children}
    </button>
  );
}

// ── Mode tab switcher ─────────────────────────────────────────────────────
function ModeTabs({ mode, onChange }) {
  return (
    <div style={{
      display: 'flex',
      background: '#131e30',
      borderRadius: 12,
      padding: 4,
      marginBottom: '1.75rem',
      border: `1px solid ${BORDER}`,
    }}>
      {[
        { value: 'login',  label: 'Sign In' },
        { value: 'signup', label: 'Create Account' },
      ].map(tab => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          style={{
            flex: 1,
            padding: '0.6rem',
            borderRadius: 9,
            border: 'none',
            background: mode === tab.value ? CARD_BG : 'transparent',
            color: mode === tab.value ? TEXT_PRIMARY : TEXT_MUTED,
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.18s',
            boxShadow: mode === tab.value ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────
function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.25rem 0' }}>
      <div style={{ flex: 1, height: 1, background: BORDER }} />
      <span style={{ fontSize: '0.72rem', color: TEXT_MUTED, fontWeight: 600 }}>OR</span>
      <div style={{ flex: 1, height: 1, background: BORDER }} />
    </div>
  );
}

// ── Trust badges ──────────────────────────────────────────────────────────
function TrustRow() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '1.25rem',
      marginTop: '1.5rem',
    }}>
      {[
        { icon: '🔒', label: 'Encrypted' },
        { icon: '🚫', label: 'No ads' },
        { icon: '👁️', label: 'Private' },
      ].map(item => (
        <div key={item.label} style={{
          display: 'flex', alignItems: 'center', gap: '0.3rem',
        }}>
          <span style={{ fontSize: '0.8rem' }}>{item.icon}</span>
          <span style={{ fontSize: '0.7rem', color: TEXT_MUTED, fontWeight: 600 }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────

export default function AuthPage() {
  const { signIn, signUp }     = useAuth();
  const { push }               = useToast();

  const [mode,     setMode]     = useState('login');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [sent,     setSent]     = useState(false); // password reset confirmation

  const canSubmit = email.trim().length > 0 && password.length >= 6;

  async function handleSubmit() {
    if (!canSubmit) {
      push('Enter a valid email and password (min 6 chars)', 'error');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
        // Navigation handled by App.js AuthGate
      } else {
        await signUp(email.trim(), password);
        push('Account created! Check your email to confirm, then sign in.');
        setMode('login');
        setPassword('');
      }
    } catch (e) {
      // Provide friendly error messages
      const msg = e.message || '';
      if (msg.includes('Invalid login')) {
        push('Incorrect email or password.', 'error');
      } else if (msg.includes('Email not confirmed')) {
        push('Please confirm your email before signing in.', 'error');
      } else if (msg.includes('already registered')) {
        push('An account with this email already exists. Try signing in.', 'error');
        setMode('login');
      } else if (msg.includes('Signups not allowed')) {
        push('New sign-ups are currently by invitation only.', 'error');
      } else {
        push(msg || 'Something went wrong. Try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    if (!email.trim()) { push('Enter your email address first.', 'error'); return; }
    setLoading(true);
    try {
      const { supabase } = await import('../lib/supabase');
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      setSent(true);
      push('Password reset email sent. Check your inbox.');
    } catch (e) {
      push(e.message || 'Failed to send reset email.', 'error');
    } finally {
      setLoading(false);
    }
  }

  // ── Forgot password screen ──────────────────────────────────────────────
  if (mode === 'reset') {
    return (
      <PageShell>
        <style>{KEYFRAMES}</style>
        <Logo />
        <div className="auth-card">
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ color: TEXT_PRIMARY, fontWeight: 800, fontSize: '1.25rem', marginBottom: '0.375rem' }}>
              Reset your password
            </h2>
            <p style={{ color: TEXT_MUTED, fontSize: '0.85rem', lineHeight: 1.6 }}>
              Enter your email and we'll send you a link to reset your password.
            </p>
          </div>

          {sent ? (
            <div style={{
              background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
              borderRadius: 12, padding: '1rem', textAlign: 'center', marginBottom: '1.25rem',
            }}>
              <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📬</p>
              <p style={{ fontWeight: 700, color: '#22c55e', marginBottom: '0.25rem' }}>Email sent!</p>
              <p style={{ fontSize: '0.8rem', color: TEXT_MUTED }}>Check your inbox for the reset link.</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '0.875rem' }}>
                <Field type="email" placeholder="Email address"
                  value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleReset()}
                  autoFocus />
              </div>
              <PrimaryBtn onClick={handleReset} loading={loading && 'Sending…'}>
                Send reset link
              </PrimaryBtn>
            </>
          )}

          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <LinkBtn onClick={() => { setMode('login'); setSent(false); }}>
              ← Back to sign in
            </LinkBtn>
          </div>
        </div>
        <TrustRow />
      </PageShell>
    );
  }

  // ── Login / Signup screen ───────────────────────────────────────────────
  return (
    <PageShell>
      <style>{KEYFRAMES}</style>
      <Logo />

      <div className="auth-card">
        <ModeTabs mode={mode} onChange={(m) => { setMode(m); setPassword(''); }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.125rem' }}>
          <Field
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
          <Field
            type="password"
            placeholder={mode === 'login' ? 'Password' : 'Password (min 6 characters)'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        {/* Forgot password — only on login */}
        {mode === 'login' && (
          <div style={{ textAlign: 'right', marginBottom: '1rem', marginTop: '-0.5rem' }}>
            <LinkBtn onClick={() => setMode('reset')}>
              Forgot password?
            </LinkBtn>
          </div>
        )}

        <PrimaryBtn
          onClick={handleSubmit}
          disabled={!canSubmit}
          loading={loading && (mode === 'login' ? 'Signing in…' : 'Creating account…')}
        >
          {mode === 'login' ? 'Sign In →' : 'Create Account →'}
        </PrimaryBtn>

        {/* Privacy note on signup */}
        {mode === 'signup' && (
          <p style={{
            fontSize: '0.75rem', color: TEXT_MUTED,
            textAlign: 'center', marginTop: '0.875rem', lineHeight: 1.6,
          }}>
            By creating an account you agree to our{' '}
            <span style={{ color: ACCENT, cursor: 'pointer' }}>Terms</span>
            {' '}and{' '}
            <span style={{ color: ACCENT, cursor: 'pointer' }}>Privacy Policy</span>.
            Your financial data is private and never sold.
          </p>
        )}
      </div>

      <TrustRow />

      {/* Inline styles for card */}
      <style>{CARD_STYLES}</style>
    </PageShell>
  );
}

// ── Page wrapper ──────────────────────────────────────────────────────────
function PageShell({ children }) {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: PAGE_BG,
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow orb */}
      <div style={{
        position: 'fixed',
        top: '-20vh', left: '50%',
        transform: 'translateX(-50%)',
        width: '60vw', height: '60vw',
        maxWidth: 480, maxHeight: 480,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 65%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />
      <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}

// ── Logo block ────────────────────────────────────────────────────────────
function Logo() {
  return (
    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
      <div style={{
        width: 64, height: 64,
        borderRadius: 18,
        background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(129,140,248,0.1))',
        border: '1px solid rgba(129,140,248,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '2rem', margin: '0 auto 1rem',
        boxShadow: '0 8px 32px rgba(99,102,241,0.15)',
      }}>
        💸
      </div>
      <h1 style={{
        fontSize: '1.625rem', fontWeight: 900,
        color: TEXT_PRIMARY, letterSpacing: '-0.02em',
        marginBottom: '0.3rem',
      }}>
        FlowTracker
      </h1>
      <p style={{ color: TEXT_MUTED, fontSize: '0.875rem' }}>
        Your money, with a plan.
      </p>
    </div>
  );
}

// ── CSS-in-JS ─────────────────────────────────────────────────────────────
const KEYFRAMES = `
  @keyframes auth-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes auth-fadein {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

const CARD_STYLES = `
  .auth-card {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 20px;
    padding: 1.625rem;
    animation: auth-fadein 0.25s ease forwards;
    box-shadow: 0 20px 60px rgba(0,0,0,0.25);
  }
`;