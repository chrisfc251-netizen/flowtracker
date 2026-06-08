import { useState } from 'react';
import { LogOut, User, Plus, ArrowLeftRight, Pencil, Trash2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth }              from '../hooks/useAuth';
import { useToast }             from '../components/ui/Toast';
import { useUserPreferences }   from '../hooks/useUserPreferences';
import { useCategoryPriorities } from '../hooks/useCategoryPriorities';
import { useAccounts }          from '../hooks/useAccounts';
import { useTransactions }      from '../hooks/useTransactions';
import { useTransfers }         from '../hooks/useTransfers';
import { useSavingsAdjustments } from '../hooks/useSavingsAdjustments';
import { CategoryPrioritySettings } from '../components/budgets/CategoryPrioritySettings';
import { AccountSetupModal }    from '../components/accounts/AccountSetupModal';
import { TransferModal }        from '../components/accounts/TransferModal';

function fmtUSD(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2,
  }).format(n || 0);
}

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut }            = useAuth();
  const { push }                     = useToast();
  const { prefs, updatePref }        = useUserPreferences();
  const { getPriority, setPriority } = useCategoryPriorities();

  // ── Accounts data ────────────────────────────────────────────────────────
  const { accounts, loading: acctLoading, addAccount, updateAccount, deleteAccount,
          computeAccountBalances } = useAccounts();
  const { transactions }           = useTransactions();
  const { transfers, addTransfer } = useTransfers();
  const { adjustments: savingsAdj } = useSavingsAdjustments();
  const { balances, savingsBreakdown } =
    computeAccountBalances(transactions, transfers, savingsAdj);

  // ── Modal state ──────────────────────────────────────────────────────────
  const [showAddModal,      setShowAddModal]      = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // ── Handlers ─────────────────────────────────────────────────────────────
  async function handleSignOut() {
    try { await signOut(); }
    catch (e) { push(e.message, 'error'); }
  }

  async function toggleGhost() {
    await updatePref('ghost_mode', !prefs.ghost_mode);
    push(prefs.ghost_mode ? 'Ghost Mode off' : 'Ghost Mode on — savings hidden', 'success');
  }

  async function handleAddAccount(payload) {
    const { error } = await addAccount(payload);
    if (error) { push(error.message, 'error'); return; }
    push('Account created ✓');
    setShowAddModal(false);
  }

  async function handleTransfer(payload) {
    const { error } = await addTransfer(payload);
    if (error) return { error };
    push('Transfer complete ✓');
    return {};
  }

  async function handleDeleteAccount(id, name) {
    if (!window.confirm(`Archive account "${name}"? History is preserved.`)) return;
    const { error } = await deleteAccount(id);
    if (error) { push(error.message, 'error'); return; }
    push('Account archived', 'warning');
  }

  // ── Shared layout primitives ─────────────────────────────────────────────
  const Section = ({ title, children }) => (
    <div style={{ marginBottom: '1.5rem' }}>
      <p style={{
        fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--ink-3)',
        fontFamily: 'var(--font-sans)', marginBottom: '0.5rem',
      }}>{title}</p>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 'var(--radius)',
        border: '1px solid var(--border)', overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
      }}>
        {children}
      </div>
    </div>
  );

  const totalBalance = Object.values(balances).reduce((s, v) => s + v, 0);
  const totalSavings = Object.values(savingsBreakdown).reduce((s, v) => s + v, 0);

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Settings</h1>

      {/* ── Account (user profile) ── */}
      <Section title="Account">
        <div style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'var(--bg-inset)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <User size={18} color="var(--ink-3)" />
            </div>
            <div>
              <p style={{ fontWeight: 600, color: 'var(--ink-1)', fontFamily: 'var(--font-sans)', fontSize: '0.9rem' }}>
                {user?.email}
              </p>
              <p style={{ fontSize: '0.775rem', color: 'var(--ink-4)', fontFamily: 'var(--font-sans)' }}>Signed in</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            style={{
              width: '100%', background: 'transparent',
              border: '1px solid rgba(192,57,43,0.3)',
              borderRadius: 'var(--radius-sm)', padding: '0.75rem',
              color: 'var(--accent-red)', fontWeight: 600, fontSize: '0.875rem',
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(192,57,43,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </Section>

      {/* ── Accounts & Balances ── */}
      <Section title="Accounts & Balances">
        {/* Totals row */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.875rem 1rem',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-inset)',
        }}>
          <div>
            <p style={{ fontSize: '0.68rem', color: 'var(--ink-3)', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              fontFamily: 'var(--font-sans)', marginBottom: '0.2rem' }}>
              Total Balance
            </p>
            <p style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--ink-1)',
              fontFamily: 'var(--font-mono)' }}>
              {fmtUSD(totalBalance)}
            </p>
          </div>
          {totalSavings > 0 && (
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.68rem', color: 'var(--ink-3)', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                fontFamily: 'var(--font-sans)', marginBottom: '0.2rem' }}>
                Total Saved
              </p>
              <p style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--ink-2)',
                fontFamily: 'var(--font-mono)' }}>
                {fmtUSD(totalSavings)}
              </p>
            </div>
          )}
        </div>

        {/* Account rows */}
        {acctLoading ? (
          <div style={{ padding: '1.25rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--ink-4)', fontFamily: 'var(--font-sans)' }}>
              Loading accounts…
            </p>
          </div>
        ) : accounts.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)',
              marginBottom: '0.875rem' }}>
              No accounts yet. Add one to start tracking.
            </p>
            <button onClick={() => setShowAddModal(true)} style={{
              background: 'var(--ink-1)', color: 'var(--bg)',
              border: 'none', borderRadius: 999,
              padding: '0.625rem 1.25rem',
              fontWeight: 600, fontSize: '0.875rem',
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
            }}>
              <Plus size={15} strokeWidth={2.5} /> Add Account
            </button>
          </div>
        ) : (
          <>
            {accounts.map((a, i) => {
              const bal = balances[a.id]         || 0;
              const sav = savingsBreakdown[a.id] || 0;
              const isLast = i === accounts.length - 1;
              return (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.875rem 1rem',
                  borderBottom: isLast ? 'none' : '1px solid var(--border)',
                }}>
                  {/* Icon */}
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: `${a.color}18`,
                    border: `1px solid ${a.color}35`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.15rem',
                  }}>
                    {a.icon}
                  </div>

                  {/* Name + type */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink-1)',
                      fontFamily: 'var(--font-sans)', marginBottom: '0.1rem',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.name}
                    </p>
                    <p style={{ fontSize: '0.72rem', color: a.color, fontWeight: 600,
                      textTransform: 'capitalize', fontFamily: 'var(--font-sans)' }}>
                      {a.type}
                    </p>
                  </div>

                  {/* Balances */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: '0.9375rem', fontWeight: 700,
                      color: bal >= 0 ? 'var(--ink-1)' : 'var(--accent-red)',
                      fontFamily: 'var(--font-mono)' }}>
                      {fmtUSD(bal)}
                    </p>
                    {sav > 0 && (
                      <p style={{ fontSize: '0.7rem', color: 'var(--ink-3)',
                        fontFamily: 'var(--font-sans)', marginTop: '0.1rem' }}>
                        🔒 {fmtUSD(sav)} saved
                      </p>
                    )}
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleDeleteAccount(a.id, a.name)}
                    style={{
                      background: 'none', border: 'none',
                      color: 'var(--ink-4)', cursor: 'pointer',
                      padding: '0.25rem', flexShrink: 0,
                      display: 'flex', alignItems: 'center',
                      borderRadius: 6, transition: 'color 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-red)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-4)'}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}

            {/* Action buttons */}
            <div style={{
              display: 'flex', gap: '0.5rem',
              padding: '0.75rem 1rem',
              borderTop: '1px solid var(--border)',
            }}>
              <button onClick={() => setShowAddModal(true)} style={{
                flex: 1, background: 'var(--ink-1)', color: 'var(--bg)',
                border: 'none', borderRadius: 999,
                padding: '0.625rem', fontWeight: 600, fontSize: '0.82rem',
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
              }}>
                <Plus size={14} strokeWidth={2.5} /> Add Account
              </button>

              {accounts.length >= 2 && (
                <button onClick={() => setShowTransferModal(true)} style={{
                  flex: 1, background: 'var(--bg-inset)',
                  color: 'var(--ink-2)', border: '1px solid var(--border)',
                  borderRadius: 999, padding: '0.625rem',
                  fontWeight: 600, fontSize: '0.82rem',
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                }}>
                  <ArrowLeftRight size={14} /> Transfer
                </button>
              )}

              <button onClick={() => navigate('/accounts')} style={{
                background: 'var(--bg-inset)', color: 'var(--ink-3)',
                border: '1px solid var(--border)', borderRadius: 999,
                padding: '0.625rem 0.875rem',
                fontWeight: 600, fontSize: '0.82rem',
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
                display: 'flex', alignItems: 'center', gap: '0.25rem',
                whiteSpace: 'nowrap',
              }}>
                Manage <ChevronRight size={13} />
              </button>
            </div>
          </>
        )}
      </Section>

      {/* ── Preferences ── */}
      <Section title="Preferences">
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.875rem 1rem',
        }}>
          <div>
            <p style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--ink-1)',
              fontFamily: 'var(--font-sans)', marginBottom: '0.2rem' }}>
              Ghost Mode
            </p>
            <p style={{ fontSize: '0.775rem', color: 'var(--ink-4)',
              fontFamily: 'var(--font-sans)', maxWidth: 200 }}>
              Hide savings balance to avoid impulsive spending
            </p>
          </div>
          <button
            onClick={toggleGhost}
            style={{
              background: prefs.ghost_mode ? 'var(--ink-1)' : 'var(--bg-inset)',
              border: '1px solid var(--border-strong)',
              borderRadius: 999, padding: '0.35rem 0.875rem',
              color: prefs.ghost_mode ? 'var(--bg)' : 'var(--ink-3)',
              fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', flexShrink: 0, transition: 'all 0.15s',
            }}
          >
            {prefs.ghost_mode ? 'On' : 'Off'}
          </button>
        </div>
      </Section>

      {/* ── Category Priorities ── */}
      <Section title="Category priorities">
        <div style={{ padding: '0.875rem 1rem' }}>
          <CategoryPrioritySettings getPriority={getPriority} setPriority={setPriority} />
        </div>
      </Section>

      {/* ── About ── */}
      <Section title="About">
        {[
          ['App',      'FlowTracker'],
          ['Version',  '2.0.0'],
          ['Database', 'Supabase'],
          ['Currency', 'USD ($)'],
        ].map(([k, v], i, arr) => (
          <div key={k} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0.75rem 1rem',
            borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--ink-3)',
              fontFamily: 'var(--font-sans)' }}>{k}</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--ink-2)',
              fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{v}</span>
          </div>
        ))}
      </Section>

      {/* ── Install ── */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '1rem',
        boxShadow: 'var(--shadow-card)',
      }}>
        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink-1)',
          fontFamily: 'var(--font-sans)', marginBottom: '0.5rem' }}>
          Install as App
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--ink-3)',
          fontFamily: 'var(--font-sans)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--ink-2)' }}>iPhone:</strong> Share &gt; Add to Home Screen<br />
          <strong style={{ color: 'var(--ink-2)' }}>Android:</strong> Menu &gt; Add to Home Screen<br />
          <strong style={{ color: 'var(--ink-2)' }}>Desktop:</strong> Click install icon in address bar
        </p>
      </div>

      {/* ── Modals ── */}
      {showAddModal && (
        <AccountSetupModal
          onComplete={handleAddAccount}
          onClose={() => setShowAddModal(false)}
        />
      )}
      {showTransferModal && (
        <TransferModal
          accounts={accounts}
          balances={balances}
          onSave={handleTransfer}
          onClose={() => setShowTransferModal(false)}
        />
      )}
    </div>
  );
}