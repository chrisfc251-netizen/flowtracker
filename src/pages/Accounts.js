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

  // Edit form state
  const [editName,  setEditName]  = useState('');
  const [editType,  setEditType]  = useState('cash');
  const [editColor, setEditColor] = useState('#818cf8');
  const [editIcon,  setEditIcon]  = useState('💵');

  const { balances, savingsBreakdown } = computeAccountBalances(transactions, transfers);
  const totalBalance = Object.values(balances).reduce((s, v) => s + v, 0);

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
    if (!window.confirm(`Archive account "${name}"? Its transaction history will be preserved.`)) return;
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
      <p style={{ color: '#475569' }}>Loading accounts…</p>
    </div>
  );

  return (
    <div className="page">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h1>Accounts</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {accounts.length >= 2 && (
            <button onClick={() => setShowTransferModal(true)} style={{
              background: 'rgba(129,140,248,.15)', color: '#818cf8', border: '1px solid rgba(129,140,248,.3)',
              borderRadius: 10, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
            }}>
              <ArrowLeftRight size={18} />
            </button>
          )}
          <button onClick={() => setShowAddModal(true)} style={{
            background: '#818cf8', color: '#fff', border: 'none', borderRadius: 12,
            width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
          }}>
            <Plus size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Total across accounts */}
      <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,.15), rgba(129,140,248,.08))', border: '1px solid rgba(99,102,241,.3)', borderRadius: 14, padding: '1rem 1.125rem', marginBottom: '1.25rem' }}>
        <p style={{ fontSize: '0.7rem', color: '#818cf8', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Total Across All Accounts</p>
        <p style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f1f5f9' }}>{formatUSD(totalBalance)}</p>
        <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.25rem' }}>{accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Account list */}
      {accounts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🏦</div>
          <p style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: '0.375rem' }}>No accounts yet</p>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.25rem' }}>Add your first account to start tracking where your money lives.</p>
          <button onClick={() => setShowAddModal(true)} style={{ background: '#818cf8', color: '#fff', border: 'none', borderRadius: 10, padding: '0.75rem 1.5rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            + Add Account
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {accounts.map((a) => {
            const bal     = balances[a.id] || 0;
            const savBal  = savingsBreakdown[a.id] || 0;
            const isEditing = editingAccount?.id === a.id;

            return (
              <div key={a.id} style={{ background: '#1e293b', border: `1px solid ${a.color}33`, borderRadius: 14, overflow: 'hidden' }}>

                {/* Account row */}
                <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: `${a.color}22`, border: `1px solid ${a.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
                    {a.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.9375rem' }}>{a.name}</p>
                        <p style={{ fontSize: '0.75rem', color: a.color, fontWeight: 600, textTransform: 'capitalize' }}>{a.type}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 800, color: bal >= 0 ? '#f1f5f9' : '#f43f5e', fontSize: '1.0625rem' }}>{formatUSD(bal)}</p>
                        {savBal > 0 && (
                          <p style={{ fontSize: '0.72rem', color: '#818cf8', fontWeight: 600 }}>🔒 {formatUSD(savBal)} saved</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                    <button className="btn-icon" onClick={() => isEditing ? setEditingAccount(null) : startEdit(a)}>
                      <Pencil size={14} />
                    </button>
                    <button className="btn-icon" onClick={() => handleDelete(a.id, a.name)} style={{ color: '#64748b' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Inline edit form */}
                {isEditing && (
                  <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid #334155', paddingTop: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                      style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', padding: '0.625rem 0.875rem', fontSize: '0.9rem', width: '100%', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />

                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      {ACCOUNT_TYPES.map((t) => (
                        <button key={t.value} onClick={() => setEditType(t.value)} style={{
                          flex: 1, padding: '0.5rem', borderRadius: 8, border: `1px solid ${editType === t.value ? '#818cf8' : '#334155'}`,
                          background: editType === t.value ? 'rgba(129,140,248,.15)' : 'transparent',
                          color: editType === t.value ? '#818cf8' : '#64748b',
                          fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
                        }}>{t.label}</button>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                      {PRESET_ICONS.map((ic) => (
                        <button key={ic} onClick={() => setEditIcon(ic)} style={{
                          width: 36, height: 36, borderRadius: 8, border: `1px solid ${editIcon === ic ? '#818cf8' : '#334155'}`,
                          background: editIcon === ic ? 'rgba(129,140,248,.15)' : '#0f172a', fontSize: '1.1rem', cursor: 'pointer'
                        }}>{ic}</button>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      {PRESET_COLORS.map((c) => (
                        <button key={c} onClick={() => setEditColor(c)} style={{
                          width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer',
                          background: c, boxShadow: editColor === c ? `0 0 0 2px #1e293b, 0 0 0 4px ${c}` : 'none'
                        }} />
                      ))}
                      <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)}
                        style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} />
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={handleUpdate} style={{ flex: 1, background: '#818cf8', color: '#fff', border: 'none', borderRadius: 8, padding: '0.625rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Save
                      </button>
                      <button onClick={() => setEditingAccount(null)} style={{ flex: 1, background: 'transparent', color: '#64748b', border: '1px solid #334155', borderRadius: 8, padding: '0.625rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
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
          background: 'rgba(129,140,248,.1)', color: '#818cf8', border: '1px solid rgba(129,140,248,.25)',
          borderRadius: 12, padding: '0.875rem', fontWeight: 700, fontSize: '0.9rem',
          cursor: 'pointer', width: '100%', marginBottom: '1.25rem', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
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
            width: '100%', padding: '0.25rem 0', marginBottom: '0.625rem', fontFamily: 'inherit'
          }}>
            <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              Transfer History ({transfers.length})
            </p>
            {showHistory ? <ChevronUp size={14} color="#64748b" /> : <ChevronDown size={14} color="#64748b" />}
          </button>

          {showHistory && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {transfers.map((tr) => (
                <div key={tr.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.9rem' }}>{tr.from_account?.icon}</span>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>{tr.from_account?.name}</span>
                      <ArrowLeftRight size={12} color="#475569" />
                      <span style={{ fontSize: '0.9rem' }}>{tr.to_account?.icon}</span>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>{tr.to_account?.name}</span>
                    </div>
                    {tr.note && <p style={{ fontSize: '0.75rem', color: '#475569' }}>{tr.note}</p>}
                    <p style={{ fontSize: '0.72rem', color: '#334155', marginTop: '0.15rem' }}>
                      {format(parseISO(tr.date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <p style={{ fontWeight: 800, color: '#818cf8', fontSize: '0.9375rem', flexShrink: 0 }}>{formatUSD(tr.amount)}</p>
                  <button className="btn-icon" onClick={() => handleDeleteTransfer(tr.id)} style={{ color: '#334155', flexShrink: 0 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AccountSetupModal onComplete={handleAdd} onClose={() => setShowAddModal(false)} />
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