import { useState } from 'react';
import { useAuth }        from '../../hooks/useAuth';
import { useOnboarding }  from '../../hooks/useOnboarding';
import { useSavingsGoals } from '../../hooks/useSavingsGoals';
import { useAccounts }    from '../../hooks/useAccounts';
import { useToast }       from '../ui/Toast';

const ACCOUNT_TYPES = [
  { value: 'cash', label: 'Cash / Wallet',   icon: '💵' },
  { value: 'card', label: 'Card / Debit',    icon: '💳' },
  { value: 'bank', label: 'Bank Account',    icon: '🏦' },
];

const GOAL_PRESETS = [
  { label: 'Emergency fund',   icon: '🛡️' },
  { label: 'Travel / vacation', icon: '✈️' },
  { label: 'Big purchase',     icon: '🛍️' },
  { label: 'Pay off debt',     icon: '📉' },
];

const ACCENT = '#818cf8';

function Step({ children, style = {} }) {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#0f172a', padding: '2rem 1.5rem',
      ...style,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {children}
      </div>
    </div>
  );
}

function PrimaryBtn({ onClick, disabled, loading, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width: '100%', background: disabled ? '#1e293b' : ACCENT,
        color: disabled ? '#334155' : '#fff',
        border: 'none', borderRadius: 12,
        padding: '0.9rem', fontWeight: 700, fontSize: '0.975rem',
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: 'inherit', transition: 'background 0.2s',
        marginTop: '1rem',
      }}
    >
      {loading ? '…' : children}
    </button>
  );
}

function GhostBtn({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', background: 'transparent',
        color: '#475569', border: 'none',
        padding: '0.75rem', fontWeight: 600,
        fontSize: '0.875rem', cursor: 'pointer',
        fontFamily: 'inherit', marginTop: '0.375rem',
      }}
    >
      {children}
    </button>
  );
}

function Dots({ total, current }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: '2.5rem' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? 20 : 6, height: 6,
          borderRadius: 3,
          background: i === current ? ACCENT : '#1e293b',
          transition: 'all 0.25s',
        }} />
      ))}
    </div>
  );
}

// ── Screen 1: Welcome ─────────────────────────────────────────────────────
function Welcome({ onNext }) {
  return (
    <Step>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>💸</div>
        <h1 style={{ fontSize: '1.875rem', color: '#f1f5f9', fontWeight: 900, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
          Your money,<br />with a plan.
        </h1>
        <p style={{ color: '#64748b', lineHeight: 1.7, fontSize: '0.95rem' }}>
          FlowTracker shows you not just<br />
          what you have — but exactly<br />
          what you can spend today.
        </p>
      </div>
      <PrimaryBtn onClick={onNext}>Get started →</PrimaryBtn>
      <p style={{ textAlign: 'center', color: '#334155', fontSize: '0.75rem', marginTop: '1rem' }}>
        Your data is private and never sold.
      </p>
    </Step>
  );
}

// ── Screen 2: Auth ────────────────────────────────────────────────────────
function AuthStep({ onNext }) {
  const { signIn, signUp } = useAuth();
  const { push }           = useToast();
  const [mode,     setMode]     = useState('signup');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    background: '#1e293b', border: '1px solid #334155',
    borderRadius: 10, color: '#f1f5f9',
    padding: '0.75rem 0.875rem', fontSize: '0.95rem',
    outline: 'none', fontFamily: 'inherit',
  };

  async function handle() {
    if (!email || password.length < 6) {
      push('Enter a valid email and password (min 6 chars)', 'error'); return;
    }
    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUp(email, password);
        push('Account created! Check your email, then sign in.');
        setMode('login');
      } else {
        await signIn(email, password);
        onNext();
      }
    } catch (e) { push(e.message, 'error'); }
    finally { setLoading(false); }
  }

  return (
    <Step>
      <Dots total={5} current={0} />
      <h2 style={{ color: '#f1f5f9', fontWeight: 800, marginBottom: '0.5rem', fontSize: '1.375rem' }}>
        {mode === 'signup' ? 'Create your account' : 'Welcome back'}
      </h2>
      <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        {mode === 'signup' ? 'Free forever, no credit card needed.' : 'Sign in to continue.'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <input type="email" placeholder="Email address" value={email}
          onChange={e => setEmail(e.target.value)} style={inputStyle} />
        <input type="password" placeholder="Password (min 6 chars)" value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handle()}
          style={inputStyle} />
      </div>

      <PrimaryBtn onClick={handle} loading={loading}>
        {mode === 'signup' ? 'Create account →' : 'Sign in →'}
      </PrimaryBtn>

      <button onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
        style={{
          width: '100%', background: 'transparent', border: 'none',
          color: '#475569', fontSize: '0.825rem', padding: '0.625rem',
          cursor: 'pointer', fontFamily: 'inherit', marginTop: '0.25rem',
        }}>
        {mode === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
      </button>
    </Step>
  );
}

// ── Screen 3: Goal-first question ─────────────────────────────────────────
function GoalQuestion({ onNext, onSkip }) {
  const [selected, setSelected] = useState(null);

  return (
    <Step>
      <Dots total={5} current={1} />
      <h2 style={{ color: '#f1f5f9', fontWeight: 800, marginBottom: '0.5rem', fontSize: '1.375rem' }}>
        What are you saving for?
      </h2>
      <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
        We'll build your plan around your goal.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '0.5rem' }}>
        {GOAL_PRESETS.map(({ label, icon }) => (
          <button
            key={label}
            onClick={() => setSelected(label)}
            style={{
              background: selected === label ? 'rgba(129,140,248,0.15)' : '#1e293b',
              border: `1px solid ${selected === label ? 'rgba(129,140,248,0.4)' : '#334155'}`,
              borderRadius: 12, padding: '0.875rem 1rem',
              color: selected === label ? '#818cf8' : '#94a3b8',
              fontWeight: 600, fontSize: '0.925rem',
              cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              fontFamily: 'inherit', transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>{icon}</span>
            {label}
          </button>
        ))}
      </div>

      <PrimaryBtn onClick={() => onNext(selected)} disabled={!selected}>
        Continue →
      </PrimaryBtn>
      <GhostBtn onClick={onSkip}>I'll skip this for now</GhostBtn>
    </Step>
  );
}

// ── Screen 4: Goal creation ───────────────────────────────────────────────
function GoalCreation({ defaultName, onNext }) {
  const { addGoal }  = useSavingsGoals();
  const { markGoalSet } = useOnboarding();
  const { push }     = useToast();
  const [name,    setName]    = useState(defaultName || '');
  const [target,  setTarget]  = useState('');
  const [date,    setDate]    = useState('');
  const [loading, setLoading] = useState(false);

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    background: '#1e293b', border: '1px solid #334155',
    borderRadius: 10, color: '#f1f5f9',
    padding: '0.75rem 0.875rem', fontSize: '0.95rem',
    outline: 'none', fontFamily: 'inherit',
  };

  async function handle() {
    if (!name.trim() || !target) { push('Enter a name and target amount', 'error'); return; }
    setLoading(true);
    const { error } = await addGoal({
      name: name.trim(),
      target_amount: Number(target),
      current_amount: 0,
      target_date: date || null,
    });
    if (error) { push(error.message, 'error'); setLoading(false); return; }
    await markGoalSet();
    setLoading(false);
    onNext();
  }

  return (
    <Step>
      <Dots total={5} current={2} />
      <h2 style={{ color: '#f1f5f9', fontWeight: 800, marginBottom: '0.5rem', fontSize: '1.375rem' }}>
        Set your first goal
      </h2>
      <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        You can always adjust this later.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <input type="text" placeholder="Goal name" value={name}
          onChange={e => setName(e.target.value)} style={inputStyle} />
        <input type="number" inputMode="decimal" placeholder="Target amount ($)"
          value={target} onChange={e => setTarget(e.target.value)} style={inputStyle} />
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ ...inputStyle, color: date ? '#f1f5f9' : '#475569' }} />
        <p style={{ fontSize: '0.75rem', color: '#334155' }}>Target date is optional</p>
      </div>

      <PrimaryBtn onClick={handle} loading={loading} disabled={!name || !target}>
        Save goal →
      </PrimaryBtn>
    </Step>
  );
}

// ── Screen 5: First account ───────────────────────────────────────────────
function FirstAccount({ onNext }) {
  const { addAccount }      = useAccounts();
  const { markAccountSet }  = useOnboarding();
  const { push }            = useToast();
  const [type,     setType]     = useState('bank');
  const [name,     setName]     = useState('');
  const [balance,  setBalance]  = useState('');
  const [loading,  setLoading]  = useState(false);

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    background: '#1e293b', border: '1px solid #334155',
    borderRadius: 10, color: '#f1f5f9',
    padding: '0.75rem 0.875rem', fontSize: '0.95rem',
    outline: 'none', fontFamily: 'inherit',
  };

  async function handle() {
    if (!name.trim() || balance === '') { push('Enter account name and balance', 'error'); return; }
    setLoading(true);
    const { error } = await addAccount({
      name: name.trim(), type,
      color: '#818cf8', icon: ACCOUNT_TYPES.find(t => t.value === type)?.icon || '🏦',
    });
    if (error) { push(error.message, 'error'); setLoading(false); return; }
    await markAccountSet();
    setLoading(false);
    onNext(Number(balance));
  }

  return (
    <Step>
      <Dots total={5} current={3} />
      <h2 style={{ color: '#f1f5f9', fontWeight: 800, marginBottom: '0.5rem', fontSize: '1.375rem' }}>
        Where does your money live?
      </h2>
      <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        Add your main account to get started.
      </p>

      {/* Account type selector */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {ACCOUNT_TYPES.map(t => (
          <button
            key={t.value}
            onClick={() => setType(t.value)}
            style={{
              flex: 1, padding: '0.75rem 0.25rem',
              borderRadius: 10,
              background: type === t.value ? 'rgba(129,140,248,0.15)' : '#1e293b',
              border: `1px solid ${type === t.value ? 'rgba(129,140,248,0.4)' : '#334155'}`,
              color: type === t.value ? '#818cf8' : '#64748b',
              fontSize: '0.75rem', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 4,
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>{t.icon}</span>
            {t.label.split(' ')[0]}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <input type="text" placeholder="Account name (e.g. Chase Checking)"
          value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
        <input type="number" inputMode="decimal" placeholder="Current balance ($)"
          value={balance} onChange={e => setBalance(e.target.value)} style={inputStyle} />
      </div>

      <PrimaryBtn onClick={handle} loading={loading} disabled={!name || balance === ''}>
        Set up account →
      </PrimaryBtn>
    </Step>
  );
}

// ── Screen 6: Aha moment ──────────────────────────────────────────────────
function AhaMoment({ balance, onFinish }) {
  return (
    <Step>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1.25rem' }}>🎉</div>
        <h2 style={{ color: '#f1f5f9', fontWeight: 900, fontSize: '1.5rem', marginBottom: '0.5rem' }}>
          You're all set!
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          Here's your financial picture right now.
        </p>

        {/* Mini preview card */}
        <div style={{
          background: 'linear-gradient(145deg, #1a2744, #0f172a)',
          border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: 18, padding: '1.5rem',
          marginBottom: '2rem',
        }}>
          <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
            AVAILABLE TO SPEND
          </p>
          <p style={{ fontSize: '2.25rem', fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
            ${(balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.5rem' }}>
            Add your first transaction to start tracking.
          </p>
        </div>

        <PrimaryBtn onClick={onFinish}>Go to dashboard →</PrimaryBtn>
      </div>
    </Step>
  );
}

// ── Orchestrator ──────────────────────────────────────────────────────────
export function OnboardingFlow({ onComplete }) {
  const { markGoalSkipped, markCompleted } = useOnboarding();
  const [step, setStep]         = useState(0);
  const [goalName, setGoalName] = useState('');
  const [balance, setBalance]   = useState(0);

  async function finish() {
    await markCompleted();
    onComplete?.();
  }

  switch (step) {
    case 0: return <Welcome onNext={() => setStep(1)} />;
    case 1: return <AuthStep onNext={() => setStep(2)} />;
    case 2: return (
      <GoalQuestion
        onNext={(name) => { setGoalName(name); setStep(3); }}
        onSkip={async () => { await markGoalSkipped(); setStep(4); }}
      />
    );
    case 3: return <GoalCreation defaultName={goalName} onNext={() => setStep(4)} />;
    case 4: return <FirstAccount onNext={(bal) => { setBalance(bal); setStep(5); }} />;
    case 5: return <AhaMoment balance={balance} onFinish={finish} />;
    default: return null;
  }
}