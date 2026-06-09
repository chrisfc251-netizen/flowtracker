import { useState } from 'react';
import { Pencil, Trash2, ArrowLeftRight, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAccounts } from '../hooks/useAccounts';
import { useTransfers } from '../hooks/useTransfers';
import { useTransactions } from '../hooks/useTransactions';
import { useToast } from '../components/ui/Toast';
import { AccountSetupModal } from '../components/accounts/AccountSetupModal';
import { TransferModal } from '../components/accounts/TransferModal';

function formatUSD(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
}

const PRESET_ICONS  = ['💵','💳','🏦','🏧','💰','👛','📱','🌐'];
const PRESET_COLORS = ['#818cf8','#22c55e','#f43f5e','#f59e0b','#06b6d4','#a78bfa','#fb7185','#34d399'];
const ACCOUNT_TYPES = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank', label: 'Bank' },
];

export default function Accounts() {
  const { accounts, loading, addAccount, updateAccount, deleteAccount, computeAccountBalances } = useAccounts();
  const { transfers, addTransfer, deleteTransfer } = useTransfers();
  const { transactions } = useTransactions();
  const { push } = useToast();

  const [showAddModal,      setShowAddModal]      = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editingAccount,    setEditingAccount]    = useState(null);
  const [showHistory,       setShowHistory]       = useState(false);

  const [editName,  setEditName]  = useState('');
  const [editType,  setEditType]  = useState('cash');
  const [editColor, setEditColor] = useState('#818cf8');
  const [editIcon,  setEditIcon]  = useState('💵');

  const { balances, savingsBreakdown } = computeAccountBalances(transactions, transfers);

  // Per-account derived values following the accounting rules:
  // total = balances[id] (already = spendable + savings routed here)
  // savings = savingsBreakdown[id]
  // available = total - savings
  // Clamp to prevent display of impossible states
  function getAccountValues(id) {
    const total    = balances[id] || 0;
    const savings  = Math.max(0, Math.min(savingsBreakdown[id] || 0, total));
    const available = total - savings;
    return { total, savings, available };
  }

  const totalBalance = Object.values(balances).reduce((s, v) => s + v, 0);
  const totalSavings = Object.values(savingsBreakdown).reduce((s, v) => s + v, 0);
  const totalAvailable = totalBalance - totalSavings;

  async function handleAdd(payload) {
    const { error } = await addAccount(payload);
    if (error) { push(error.message, 'error'); return; }
    push('Account created ✓');
    setShowAddModal(false);
  }

  async function handleUpdate() {
    if (!editName.trim()) { push('Name is required', 'error'); return; }
    const { error } = await updateAccount(editingAccount.id, { name: editName, type: editType, color: editColor, icon: editIcon });
    if (error) { push(error.message, 'error'); return; }
    push('Account updated ✓');
    setEditingAccount(null);
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Archive account "${name}"?\nIts transaction history will be preserved.`)) return;
    const { error } = await deleteAccount(id);
    if (error) { push(error.message, 'error'); return; }
    push('Account archived', 'warning');
  }

  async function handleTransfer(payload) {
    const { error } = await addTransfer(payload);
    if (error) return { error };
    push('Transfer complete ✓');
    return {};
  }

  async function handleDeleteTransfer(id) {
    if (!window.confirm('Delete this transfer? Balances will be recalculated.')) return;
    const { error } = await deleteTransfer(id);
    if (error) { push(error.message, 'error'); return; }
    push('Transfer deleted', 'warning');
  }

  function startEdit(a) {
    setEditingAccount(a);
    setEditName(a.name); setEditType(a.type); setEditColor(a.color); setEditIcon(a.icon);
  }

  if (loading) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <p style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-sans)' }}>Loading accounts…</p>
    </div>
  );

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h1>Accounts</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {accounts.length >= 2 && (
            <button onClick={() => setShowTransferModal(true)} style={{
              background: 'var(--bg-inset)', color: 'var(--ink-2)', border: '1px solid var(--border-strong)',
              borderRadius: 10, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
            }}>
              <ArrowLeftRight size={18} />
            </button>
          )}
          <button onClick={() => setShowAddModal(true)} style={{
            background: 'var(--ink-1)', color: 'var(--bg)', border: 'none', borderRadius: 12,
            width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(26,26,24,0.2)'
          }}>
            <Plus size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Global totals summary */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '1rem 1.125rem', marginBottom: '1.25rem',
        boxShadow: 'var(--shadow-card)'
      }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--ink-3)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.625rem', fontFamily: 'var(--font-sans)' }}>
          Total Across All Accounts
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
          <div>
            <p style={{ fontSize: '0.65rem', color: 'var(--ink-4)', fontFamily: 'var(--font-sans)', marginBottom: '0.2rem' }}>Total</p>
            <p style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--ink-1)', fontFamily: 'var(--font-mono)' }}>{formatUSD(totalBalance)}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.65rem', color: 'var(--ink-4)', fontFamily: 'var(--font-sans)', marginBottom: '0.2rem' }}>Savings</p>
            <p style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>{formatUSD(totalSavings)}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.65rem', color: 'var(--ink-4)', fontFamily: 'var(--font-sans)', marginBottom: '0.2rem' }}>Available</p>
            <p style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-green)', fontFamily: 'var(--font-mono)' }}>{formatUSD(totalAvailable)}</p>
          </div>
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--ink-4)', marginTop: '0.5rem', fontFamily: 'var(--font-sans)' }}>
          {accounts.length} account{accounts.length !== 1 ? 's' : ''} · available = total − savings
        </p>
      </div>

      {/* Account list */}
      {accounts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🏦</div>
          <p style={{ fontWeight: 700, color: 'var(--ink-1)', marginBottom: '0.375rem', fontFamily: 'var(--font-sans)' }}>No accounts yet</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--ink-3)', marginBottom: '1.25rem', fontFamily: 'var(--font-sans)' }}>Add your first account to start tracking where your money lives.</p>
          <button onClick={() => setShowAddModal(true)} style={{
            background: 'var(--ink-1)', color: 'var(--bg)', border: 'none',
            borderRadius: 10, padding: '0.75rem 1.5rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)'
          }}>
            + Add Account
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {accounts.map((a) => {
            const { total, savings, available } = getAccountValues(a.id);
            const isEditing = editingAccount?.id === a.id;

            return (
              <div key={a.id} style={{
                background: 'var(--bg-card)',
                border: `1px solid var(--border)`,
                borderLeft: `4px solid ${a.color}`,
                borderRadius: 14, overflow: 'hidden',
                boxShadow: 'var(--shadow-card)'
              }}>
                {/* Account row */}
                <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: 12,
                    background: `${a.color}18`, border: `1px solid ${a.color}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.4rem', flexShrink: 0
                  }}>
                    {a.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontWeight: 700, color: 'var(--ink-1)', fontSize: '0.9375rem', fontFamily: 'var(--font-sans)' }}>{a.name}</p>
                        <p style={{ fontSize: '0.75rem', color: a.color, fontWeight: 600, textTransform: 'capitalize', fontFamily: 'var(--font-sans)' }}>{a.type}</p>
                      </div>
                      {/* Balance summary — 3-line right column */}
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 800, color: 'var(--ink-1)', fontSize: '1.0625rem', fontFamily: 'var(--font-mono)' }}>{formatUSD(total)}</p>
                        {savings > 0 && (
                          <p style={{ fontSize: '0.72rem', color: 'var(--ink-3)', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
                            🔒 {formatUSD(savings)} saved
                          </p>
                        )}
                        <p style={{ fontSize: '0.72rem', color: 'var(--accent-green)', fontWeight: 700, fontFamily: 'var(--font-sans)' }}>
                          {formatUSD(available)} free
                        </p>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                    <button
                      onClick={() => isEditing ? setEditingAccount(null) : startEdit(a)}
                      style={{
                        background: 'var(--bg-inset)', border: '1px solid var(--border)',
                        borderRadius: 8, width: 32, height: 32,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'var(--ink-3)'
                      }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(a.id, a.name)}
                      style={{
                        background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.18)',
                        borderRadius: 8, width: 32, height: 32,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'var(--accent-red)'
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Edit form */}
                {isEditing && (
                  <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.875rem', paddingTop: '0.875rem' }}>
                    {/* Type */}
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      {ACCOUNT_TYPES.map((t) => (
                        <button key={t.value} onClick={() => setEditType(t.value)} style={{
                          flex: 1, padding: '0.5rem 0.25rem', borderRadius: 8, cursor: 'pointer',
                          background: editType === t.value ? 'var(--bg-inset)' : 'transparent',
                          color: editType === t.value ? 'var(--ink-1)' : 'var(--ink-4)',
                          fontWeight: editType === t.value ? 700 : 500,
                          fontSize: '0.8rem', fontFamily: 'var(--font-sans)',
                          border: `1px solid ${editType === t.value ? 'var(--border-strong)' : 'var(--border)'}`,
                        }}>
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {/* Name */}
                    <input
                      type="text" value={editName} onChange={e => setEditName(e.target.value)}
                      placeholder="Account name"
                      style={{
                        background: 'var(--bg-inset)', border: '1px solid var(--border-strong)',
                        borderRadius: 8, color: 'var(--ink-1)', padding: '0.625rem 0.75rem',
                        fontSize: '0.9rem', outline: 'none', fontFamily: 'var(--font-sans)', width: '100%', boxSizing: 'border-box'
                      }}
                    />

                    {/* Icons */}
                    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                      {PRESET_ICONS.map((ic) => (
                        <button key={ic} onClick={() => setEditIcon(ic)} style={{
                          width: 36, height: 36, borderRadius: 8,
                          border: `1px solid ${editIcon === ic ? 'var(--border-strong)' : 'var(--border)'}`,
                          background: editIcon === ic ? 'var(--bg-inset)' : 'transparent',
                          fontSize: '1.1rem', cursor: 'pointer'
                        }}>{ic}</button>
                      ))}
                    </div>

                    {/* Colors */}
                    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      {PRESET_COLORS.map((c) => (
                        <button key={c} onClick={() => setEditColor(c)} style={{
                          width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer',
                          background: c, boxShadow: editColor === c ? `0 0 0 2px var(--bg), 0 0 0 4px ${c}` : 'none'
                        }} />
                      ))}
                      <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)}
                        style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} />
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={handleUpdate} style={{
                        flex: 1, background: 'var(--ink-1)', color: 'var(--bg)',
                        border: 'none', borderRadius: 8, padding: '0.625rem',
                        fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)'
                      }}>
                        Save
                      </button>
                      <button onClick={() => setEditingAccount(null)} style={{
                        flex: 1, background: 'transparent', color: 'var(--ink-3)',
                        border: '1px solid var(--border-strong)', borderRadius: 8,
                        padding: '0.625rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)'
                      }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Transfer button (bottom) */}
      {accounts.length >= 2 && (
        <button onClick={() => setShowTransferModal(true)} style={{
          background: 'var(--bg-card)', color: 'var(--ink-2)',
          border: '1px solid var(--border-strong)',
          borderRadius: 12, padding: '0.875rem', fontWeight: 700, fontSize: '0.9rem',
          cursor: 'pointer', width: '100%', marginBottom: '1.25rem', fontFamily: 'var(--font-sans)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          boxShadow: 'var(--shadow-card)'
        }}>
          <ArrowLeftRight size={17} /> Transfer Between Accounts
        </button>
      )}

      {/* Transfer history — collapsible */}
      {transfers.length > 0 && (
        <div>
          <button onClick={() => setShowHistory((p) => !p)} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '0.25rem 0', marginBottom: '0.625rem', fontFamily: 'var(--font-sans)'
          }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--ink-3)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)' }}>
              Transfer History ({transfers.length})
            </p>
            {showHistory ? <ChevronUp size={15} color="var(--ink-3)" /> : <ChevronDown size={15} color="var(--ink-3)" />}
          </button>
          {showHistory && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {transfers.slice().reverse().map((tr) => {
                const fromAcc = accounts.find(a => a.id === tr.from_account_id);
                const toAcc   = accounts.find(a => a.id === tr.to_account_id);
                return (
                  <div key={tr.id} style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: '0.75rem 0.875rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    boxShadow: 'var(--shadow-card)'
                  }}>
                    <div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--ink-1)', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
                        {fromAcc?.icon} {fromAcc?.name} → {toAcc?.icon} {toAcc?.name}
                      </p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--ink-4)', fontFamily: 'var(--font-sans)' }}>
                        {tr.date}{tr.note ? ` · ${tr.note}` : ''}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <p style={{ fontWeight: 700, color: 'var(--ink-1)', fontFamily: 'var(--font-mono)' }}>{formatUSD(tr.amount)}</p>
                      <button onClick={() => handleDeleteTransfer(tr.id)} style={{
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: 'var(--accent-red)', padding: '0.25rem'
                      }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AccountSetupModal
          onComplete={handleAdd}
          onClose={() => setShowAddModal(false)}
          isFirstTime={false}
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