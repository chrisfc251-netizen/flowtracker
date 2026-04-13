import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './components/ui/Toast';
import { BottomNav } from './components/layout/BottomNav';
import { AccountSetupModal } from './components/accounts/AccountSetupModal';
import { useAccounts } from './hooks/useAccounts';
import Dashboard    from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Accounts     from './pages/Accounts';
import Budgets      from './pages/Budgets';
import Reports      from './pages/Reports';
import Settings     from './pages/Settings';
import AuthPage     from './pages/AuthPage';
import './styles/global.css';

// ── First-time account setup guard ───────────────────────────────────────
function AccountGuard({ children }) {
  const { accounts, loading, addAccount } = useAccounts();

  if (loading) return null;

  // If user has no accounts, force them to create one
  if (accounts.length === 0) {
    async function handleFirstAccount(payload) {
      await addAccount(payload);
    }
    return <AccountSetupModal onComplete={handleFirstAccount} isFirstTime={true} />;
  }

  return children;
}

function PrivateRoutes() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💸</div>
        <p style={{ color: '#64748b', fontSize: '0.875rem', letterSpacing: '0.08em' }}>LOADING…</p>
      </div>
    </div>
  );

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <AccountGuard>
      <>
        <Routes>
          <Route path="/"             element={<Dashboard />}    />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/accounts"     element={<Accounts />}     />
          <Route path="/budgets"      element={<Budgets />}      />
          <Route path="/reports"      element={<Reports />}      />
          <Route path="/settings"     element={<Settings />}     />
          <Route path="*"             element={<Navigate to="/" replace />} />
        </Routes>
        <BottomNav />
      </>
    </AccountGuard>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/auth" element={<AuthGate />} />
            <Route path="/*"   element={<PrivateRoutes />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <AuthPage />;
}