import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth }       from './hooks/useAuth';
import { ToastProvider }               from './components/ui/Toast';
import { BottomNav }                   from './components/layout/BottomNav';
import { useOnboarding }               from './hooks/useOnboarding';
import { useAccounts }                 from './hooks/useAccounts';
import { AccountSetupModal }           from './components/accounts/AccountSetupModal';
import { OnboardingFlow }              from './components/onboarding/OnboardingFlow';

// Pages
import Home         from './pages/Home';
import Transactions from './pages/Transactions';
import Plan         from './pages/Plan';
import Goals        from './pages/Goals';
import Reports      from './pages/Reports';
import Settings     from './pages/Settings';
import AuthPage     from './pages/AuthPage';

import './styles/global.css';

// ── Onboarding guard ─────────────────────────────────────────────────────
function OnboardingGuard({ children }) {
  const { state, loading, markCompleted } = useOnboarding();
  const { accounts, loading: accLoading } = useAccounts();

  if (loading || accLoading) return null;

  // First-time account setup (legacy fallback if onboarding skipped somehow)
  if (state?.completed && accounts.length === 0) {
    return (
      <AccountSetupModal
        onComplete={markCompleted}
        isFirstTime={true}
      />
    );
  }

  // Show onboarding if not completed
  if (!state?.completed) {
    return <OnboardingFlow onComplete={markCompleted} />;
  }

  return children;
}

// ── Authenticated shell ───────────────────────────────────────────────────
function AppShell() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#0f172a',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💸</div>
        <p style={{ color: '#64748b', fontSize: '0.875rem', letterSpacing: '0.08em' }}>LOADING…</p>
      </div>
    </div>
  );

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <OnboardingGuard>
      <>
        <Routes>
          <Route path="/"             element={<Home />}         />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/plan"         element={<Plan />}         />
          <Route path="/goals"        element={<Goals />}        />
          <Route path="/reports"      element={<Reports />}      />
          <Route path="/settings"     element={<Settings />}     />
          <Route path="*"             element={<Navigate to="/" replace />} />
        </Routes>
        <BottomNav />
      </>
    </OnboardingGuard>
  );
}

// ── Auth gate ─────────────────────────────────────────────────────────────
function AuthGate() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <AuthPage />;
}

// ── Root ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/auth" element={<AuthGate />} />
            <Route path="/*"   element={<AppShell />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}