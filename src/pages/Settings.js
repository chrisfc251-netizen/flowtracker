import { useState } from 'react';
import { useNavigate }         from 'react-router-dom';
import { LogOut, User, Plus, ChevronRight, ArrowLeftRight, Pencil, Trash2 } from 'lucide-react';

import { useAuth }                from '../hooks/useAuth';
import { useAccounts }            from '../hooks/useAccounts';
import { useTransfers }           from '../hooks/useTransfers';
import { useTransactions }        from '../hooks/useTransactions';
import { useUserPreferences }     from '../hooks/useUserPreferences';
import { useCategoryPriorities }  from '../hooks/useCategoryPriorities';
import { useSubscription }        from '../hooks/useSubscription';
import { useToast }               from '../components/ui/Toast';
import { useConfirm }             from '../components/ui/ConfirmModal';
import { ProUpgradePrompt }       from '../components/ui/ProUpgradePrompt';
import { CategoryPrioritySettings } from '../components/budgets/CategoryPrioritySettings';
import { AccountSetupModal }      from '../components/accounts/AccountSetupModal';
import { TransferModal }          from '../components/accounts/TransferModal';
import { FREE_LIMITS }            from '../hooks/useSubscription';
import { AdminPanel }             from '../components/admin/AdminPanel';

import { useTransfers as useTransfersHook } from '../hooks/useTransfers';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
}

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut }                = useAuth();
  const { push }                         = useToast();
  const { prefs, updatePref }            = useUserPreferences();
  const { getPriority, setPriority }     = useCategoryPriorities();
  const { plan, isPro, isAdmin, isAtLimit } = useSubscription();
  const { confirm, ConfirmModal }        = useConfirm();
  const { accounts, loading: accLoad, addAccount, updateAccount, deleteAccount, computeAccountBalances } = useAccounts();
  const { transfers, addTransfer }       = useTransfersHook();
  const { transactions }                 = useTransactions();

  const [showAddAcc,    setShowAddAcc]    = useState(false);
  const [showTransfer,  setShowTransfer]  = useState(false);

  const { balances } = computeAccountBalances(transactions, transfers);
  const atAccLimit   = isAtLimit('accounts', accounts.length);

  async function handleSignOut() {
    const ok = await confirm({ title: 'Sign out?', message: '', confirmLabel: 'Sign out', danger: false });
    if (!ok) return;
    try { await signOut(); } catch (e) { push(e.message, 'error'); }
  }

  async function handleDeleteAccount(id, name) {
    const ok = await confirm({ title: `Archive "${name}"?`, message: 'Transaction history is preserved.', confirmLabel: 'Archive' });
    if (!ok) return;
    const { error } = await deleteAccount(id);
    if (error) push(error.message, 'error');
    else push('Account archived', 'warning');
  }

  async function handleTransfer(payload) {
    const { error } = await addTransfer(payload);
    if (error) return { error };
    push('Transfer complete ✓');
    return {};
  }

  async function toggleGhost() {
    await updatePref('ghost_mode', !prefs.ghost_mode);
    push(prefs.ghost_mode ? 'Savings now visible' : 'Ghost Mode on — savings hidden 👻');
  }

  return (
    <div className="page">
      <h1 style={{ marginBottom: '1.5rem' }}>Settings</h1>

      {/* ── Account ── */}
      <p style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.625rem' }}>Account</p>
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1rem' }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(129,140,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={19} color="#818cf8" />
          </div>
          <div>
            <p style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.9rem' }}>{user?.email}</p>
            <p style={{ fontSize: '0.75rem', color: isPro ? '#f59e0b' : '#64748b', fontWeight: 600 }}>
              {isPro ? '⚡ Pro plan' : 'Free plan'}
            </p>
          </div>
        </div>
        {!isPro && (
          <div style={{ marginBottom: '0.875rem' }}>
            <ProUpgradePrompt feature="unlimited_goals" compact />
          </div>
        )}
        <button onClick={handleSignOut} style={{
          background: 'rgba(244,63,94,0.1)', border: 'none', borderRadius: 10,
          color: '#f43f5e', padding: '0.75rem', fontWeight: 700, fontSize: '0.875rem',
          cursor: 'pointer', width: '100%', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
        }}>
          <LogOut size={15} /> Sign Out
        </button>
      </div>

      {/* ── Accounts ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
        <p style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Accounts
        </p>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {accounts.length >= 2 && (
            <button onClick={() => setShowTransfer(true)} style={{
              background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.25)',
              borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#818cf8', cursor: 'pointer',
            }}>
              <ArrowLeftRight size={14} />
            </button>
          )}
          {!atAccLimit ? (
            <button onClick={() => setShowAddAcc(true)} style={{
              background: '#818cf8', color: '#fff', border: 'none',
              borderRadius: 8, width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}>
              <Plus size={15} strokeWidth={2.5} />
            </button>
          ) : (
            <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 600 }}>
              {accounts.length}/{FREE_LIMITS.accounts}
            </span>
          )}
        </div>
      </div>

      {atAccLimit && (
        <div style={{ marginBottom: '0.75rem' }}>
          <ProUpgradePrompt feature="unlimited_accounts" />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {accounts.map(a => (
          <div key={a.id} style={{
            background: '#1e293b', border: `1px solid ${a.color}22`,
            borderRadius: 12, padding: '0.875rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: `${a.color}18`, border: `1px solid ${a.color}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0,
            }}>
              {a.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.875rem' }}>{a.name}</p>
              <p style={{ fontSize: '0.7rem', color: a.color, fontWeight: 600, textTransform: 'capitalize' }}>{a.type}</p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontWeight: 800, color: '#f1f5f9', fontSize: '0.9rem' }}>{fmt(balances[a.id] || 0)}</p>
            </div>
            <button onClick={() => handleDeleteAccount(a.id, a.name)} style={{
              background: 'transparent', border: 'none', color: '#334155', cursor: 'pointer',
              padding: '4px', display: 'flex', alignItems: 'center',
            }}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* ── Preferences ── */}
      <p style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.625rem' }}>
        Preferences
      </p>
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontWeight: 600, color: '#f1f5f9', marginBottom: '0.2rem', fontSize: '0.9rem' }}>👻 Ghost Mode</p>
            <p style={{ fontSize: '0.78rem', color: '#64748b', maxWidth: 220, lineHeight: 1.5 }}>
              Hide savings balance to avoid impulsive spending.
            </p>
          </div>
          <button onClick={toggleGhost} style={{
            background: prefs.ghost_mode ? 'rgba(245,158,11,0.12)' : '#1e293b',
            border: `1px solid ${prefs.ghost_mode ? '#f59e0b' : '#334155'}`,
            borderRadius: 30, padding: '0.375rem 0.875rem',
            color: prefs.ghost_mode ? '#f59e0b' : '#64748b',
            fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', flexShrink: 0,
          }}>
            {prefs.ghost_mode ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* ── Category Priorities ── */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <CategoryPrioritySettings getPriority={getPriority} setPriority={setPriority} />
      </div>

      {/* ── Reports deep link ── */}
      <p style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.625rem' }}>
        Reports & History
      </p>
      <button onClick={() => navigate('/reports')} style={{
        background: '#1e293b', border: '1px solid #334155', borderRadius: 12,
        padding: '0.875rem 1rem', width: '100%',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        cursor: 'pointer', fontFamily: 'inherit', marginBottom: '1.25rem',
      }}>
        <span style={{ fontSize: '0.875rem', color: '#94a3b8', fontWeight: 600 }}>View monthly & yearly reports</span>
        <ChevronRight size={16} color="#475569" />
      </button>

      {/* ── App Info ── */}
      <p style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.625rem' }}>
        About
      </p>
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        {[
          ['App', 'FlowTracker'],
          ['Version', '3.0.0'],
          ['Plan', plan === 'admin' ? 'Admin 🛡️' : plan === 'beta' ? 'Beta 🧪' : plan === 'pro' ? 'Pro ⚡' : 'Free'],
          ['Database', 'Supabase'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{k}</span>
            <span style={{ fontSize: '0.875rem', color: '#94a3b8', fontWeight: 500 }}>{v}</span>
          </div>
        ))}
      </div>

      {/* ── Admin Panel (admin only) ── */}
      {isAdmin && (
        <>
          <p style={{ fontSize: '0.68rem', color: '#ef4444', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.625rem', marginTop: '0.5rem' }}>
            🛡️ Admin
          </p>
          <div className="card" style={{ marginBottom: '1.25rem', borderColor: 'rgba(239,68,68,0.2)' }}>
            <AdminPanel />
          </div>
        </>
      )}

      {/* ── PWA ── */}
      <div style={{ background: 'rgba(129,140,248,0.07)', border: '1px solid rgba(129,140,248,0.18)', borderRadius: 12, padding: '1rem' }}>
        <p style={{ fontSize: '0.875rem', color: '#818cf8', fontWeight: 600, marginBottom: '0.375rem' }}>📱 Install as App</p>
        <p style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.65 }}>
          <strong style={{ color: '#94a3b8' }}>iPhone:</strong> Share → Add to Home Screen<br />
          <strong style={{ color: '#94a3b8' }}>Android:</strong> Menu ⋮ → Add to Home Screen<br />
          <strong style={{ color: '#94a3b8' }}>Desktop:</strong> Install icon in browser bar
        </p>
      </div>

      {showAddAcc && (
        <AccountSetupModal
          onComplete={async (payload) => {
            const { error } = await addAccount(payload);
            if (error) push(error.message, 'error');
            else { push('Account added ✓'); setShowAddAcc(false); }
          }}
          onClose={() => setShowAddAcc(false)}
        />
      )}
      {showTransfer && (
        <TransferModal
          accounts={accounts}
          balances={balances}
          onSave={handleTransfer}
          onClose={() => setShowTransfer(false)}
        />
      )}

      <ConfirmModal />
    </div>
  );
}