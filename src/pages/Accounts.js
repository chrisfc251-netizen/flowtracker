import { useState } from 'react';
import { Pencil, Trash2, ArrowLeftRight, Plus, ChevronDown, ChevronUp, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAccounts }           from '../hooks/useAccounts';
import { useTransfers }          from '../hooks/useTransfers';
import { useTransactions }       from '../hooks/useTransactions';
import { useSavingsAdjustments } from '../hooks/useSavingsAdjustments';
import { useToast }              from '../components/ui/Toast';
import { AccountSetupModal }     from '../components/accounts/AccountSetupModal';
import { TransferModal }         from '../components/accounts/TransferModal';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
}

const PRESET_ICONS  = ['💵','💳','🏦','🏧','💰','👛','📱','🌐'];
const PRESET_COLORS = ['#818cf8','#22c55e','#f43f5e','#f59e0b','#06b6d4','#a78bfa','#fb7185','#34d399'];
const ACCOUNT_TYPES = [{ value: 'cash', label: 'Cash' }, { value: 'card', label: 'Card' }, { value: 'bank', label: 'Bank' }];

// ── Shared input styles ────────────────────────────────────────────────────
const iS = {
  background: 'var(--bg-inset)', border: '1px solid var(--border-strong)',
  borderRadius: 8, color: 'var(--ink-1)', padding: '0.6rem 0.75rem',
  fontSize: '0.875rem', width: '100%', outline: 'none',
  fontFamily: 'var(--font-sans)', boxSizing: 'border-box',
};
const lS = { display: 'block', fontSize: '0.72rem', color: 'var(--ink-3)', fontWeight: 700, marginBottom: '0.3rem', fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.05em' };

// ── Savings management panel (per account) ─────────────────────────────────
function SavingsPanel({ account, total, savings, available, accounts, adjustments, ops, onClose }) {
  const [tab,      setTab]      = useState('allocate');
  const [amount,   setAmount]   = useState('');
  const [toAccId,  setToAccId]  = useState('');
  const [note,     setNote]     = useState('');
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState('');

  const otherAccounts = accounts.filter(a => a.id !== account.id);
  const amt = Number(amount) || 0;

  function reset() { setAmount(''); setNote(''); setToAccId(''); setErr(''); }

  function validate() {
    if (tab !== 'history' && tab !== 'correction' && (!amount || amt <= 0))
      return 'Enter a valid amount greater than $0';
    if (tab === 'allocate'   && amt > available)
      return `Cannot move more than available balance (${fmt(available)})`;
    if (tab === 'release'    && amt > savings)
      return `Cannot release more than current savings (${fmt(savings)})`;
    if (tab === 'transfer') {
      if (amt > savings)   return `Cannot transfer more than savings balance (${fmt(savings)})`;
      if (!toAccId)        return 'Select a destination account';
    }
    if (tab === 'correction') {
      const corrAmt = Number(amount);
      if (isNaN(corrAmt) || corrAmt === 0) return 'Enter a non-zero amount (negative to reduce)';
      const next = savings + corrAmt;
      if (next < 0)     return 'Correction would result in negative savings';
      if (next > total) return `Correction would exceed account total (${fmt(total)})`;
      if (!note.trim()) return 'A reason is required for corrections';
    }
    return null;
  }

  async function handleSubmit() {
    const e = validate();
    if (e) { setErr(e); return; }
    setSaving(true); setErr('');
    let result;
    if (tab === 'allocate')   result = await ops.allocate({ account_id: account.id, amount: amt, note });
    if (tab === 'release')    result = await ops.release({ account_id: account.id, amount: amt, note });
    if (tab === 'transfer')   result = await ops.transfer({ from_account_id: account.id, to_account_id: toAccId, amount: amt, note });
    if (tab === 'correction') result = await ops.correct({ account_id: account.id, amount: Number(amount), note });
    setSaving(false);
    if (result?.error) { setErr(result.error.message); return; }
    reset();
  }

  const myHistory = adjustments.filter(a =>
    a.from_account_id === account.id || a.to_account_id === account.id
  );

  const tabs = [
    { id: 'allocate',   label: '→ Save' },
    { id: 'release',    label: '← Release' },
    { id: 'transfer',   label: '↔ Transfer' },
    { id: 'correction', label: '✎ Correct' },
    { id: 'history',    label: '⏱ History' },
  ];

  return (
    <div style={{ marginTop: '0.5rem', background: 'var(--bg-inset)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>

      {/* Balance summary bar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '0.625rem 0.875rem', gap: '0.25rem' }}>
        {[['Total', fmt(total), 'var(--ink-1)'], ['Available', fmt(available), 'var(--accent-green)'], ['Savings', fmt(savings), 'var(--ink-3)']].map(([lbl, val, color]) => (
          <div key={lbl}>
            <p style={{ fontSize: '0.58rem', color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'var(--font-sans)', marginBottom: '0.1rem' }}>{lbl}</p>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{val}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', overflowX: 'auto', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); reset(); }} style={{
            padding: '0.45rem 0.75rem', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
            background: tab === t.id ? 'var(--bg-inset)' : 'transparent',
            color: tab === t.id ? 'var(--ink-1)' : 'var(--ink-4)',
            fontWeight: tab === t.id ? 700 : 500, fontSize: '0.73rem',
            fontFamily: 'var(--font-sans)', flexShrink: 0,
            borderBottom: tab === t.id ? '2px solid var(--ink-1)' : '2px solid transparent',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '0.75rem' }}>

        {/* ── Allocate ──────────────────────────────────────────────────── */}
        {tab === 'allocate' && (
          <>
            <p style={{ fontSize: '0.78rem', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)', marginBottom: '0.625rem', lineHeight: 1.5 }}>
              Move money from <strong>Available → Savings</strong>. Total balance stays the same.
            </p>
            <p style={{ fontSize: '0.72rem', color: 'var(--accent-green)', fontWeight: 700, fontFamily: 'var(--font-sans)', marginBottom: '0.5rem' }}>
              Available to move: {fmt(available)}
            </p>
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={lS}>Amount ($)</label>
              <input type="number" inputMode="decimal" placeholder="0.00" value={amount}
                onChange={e => { setAmount(e.target.value); setErr(''); }}
                style={{ ...iS, borderColor: (amt > available && amount) ? 'var(--accent-red)' : 'var(--border-strong)' }} />
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={lS}>Note (optional)</label>
              <input type="text" placeholder="e.g. Emergency fund" value={note}
                onChange={e => setNote(e.target.value)} style={iS} />
            </div>
          </>
        )}

        {/* ── Release ───────────────────────────────────────────────────── */}
        {tab === 'release' && (
          <>
            <p style={{ fontSize: '0.78rem', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)', marginBottom: '0.625rem', lineHeight: 1.5 }}>
              Move money from <strong>Savings → Available</strong>. Total balance stays the same.
            </p>
            {savings <= 0 ? (
              <p style={{ fontSize: '0.825rem', color: 'var(--ink-4)', fontFamily: 'var(--font-sans)', textAlign: 'center', padding: '0.75rem 0' }}>
                No savings balance to release on this account.
              </p>
            ) : (
              <>
                <p style={{ fontSize: '0.72rem', color: 'var(--ink-3)', fontWeight: 700, fontFamily: 'var(--font-sans)', marginBottom: '0.5rem' }}>
                  Current savings: {fmt(savings)}
                </p>
                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={lS}>Amount ($)</label>
                  <input type="number" inputMode="decimal" placeholder="0.00" value={amount}
                    onChange={e => { setAmount(e.target.value); setErr(''); }}
                    style={{ ...iS, borderColor: (amt > savings && amount) ? 'var(--accent-red)' : 'var(--border-strong)' }} />
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={lS}>Note (optional)</label>
                  <input type="text" placeholder="e.g. Released for car repair" value={note}
                    onChange={e => setNote(e.target.value)} style={iS} />
                </div>
              </>
            )}
          </>
        )}

        {/* ── Transfer Savings ──────────────────────────────────────────── */}
        {tab === 'transfer' && (
          <>
            <p style={{ fontSize: '0.78rem', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)', marginBottom: '0.625rem', lineHeight: 1.5 }}>
              Move saved money to another account's savings. The money physically moves between accounts.
            </p>
            {savings <= 0 ? (
              <p style={{ fontSize: '0.825rem', color: 'var(--ink-4)', fontFamily: 'var(--font-sans)', textAlign: 'center', padding: '0.75rem 0' }}>
                No savings balance to transfer.
              </p>
            ) : otherAccounts.length === 0 ? (
              <p style={{ fontSize: '0.825rem', color: 'var(--ink-4)', fontFamily: 'var(--font-sans)' }}>
                Add another account to enable savings transfers.
              </p>
            ) : (
              <>
                <p style={{ fontSize: '0.72rem', color: 'var(--ink-3)', fontWeight: 700, fontFamily: 'var(--font-sans)', marginBottom: '0.5rem' }}>
                  Savings available: {fmt(savings)}
                </p>
                <div style={{ marginBottom: '0.625rem' }}>
                  <label style={lS}>Transfer to</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {otherAccounts.map(a => (
                      <button key={a.id} onClick={() => setToAccId(a.id)} style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.5rem 0.75rem', borderRadius: 8, cursor: 'pointer',
                        border: `1px solid ${toAccId === a.id ? 'var(--border-strong)' : 'var(--border)'}`,
                        background: toAccId === a.id ? 'var(--bg-card)' : 'transparent',
                        fontFamily: 'var(--font-sans)', textAlign: 'left',
                      }}>
                        <span style={{ fontSize: '1.1rem' }}>{a.icon}</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--ink-1)', fontWeight: 600 }}>{a.name}</span>
                        {toAccId === a.id && <span style={{ marginLeft: 'auto', color: 'var(--accent-green)', fontWeight: 700 }}>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={lS}>Amount ($)</label>
                  <input type="number" inputMode="decimal" placeholder="0.00" value={amount}
                    onChange={e => { setAmount(e.target.value); setErr(''); }}
                    style={{ ...iS, borderColor: (amt > savings && amount) ? 'var(--accent-red)' : 'var(--border-strong)' }} />
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={lS}>Note (optional)</label>
                  <input type="text" placeholder="e.g. Moving savings to checking" value={note}
                    onChange={e => setNote(e.target.value)} style={iS} />
                </div>
              </>
            )}
          </>
        )}

        {/* ── Correction ────────────────────────────────────────────────── */}
        {tab === 'correction' && (
          <>
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, padding: '0.6rem 0.75rem', marginBottom: '0.75rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--accent-amber)', fontWeight: 700, fontFamily: 'var(--font-sans)', marginBottom: '0.2rem' }}>
                ⚠ Correction tool — for data fixes only
              </p>
              <p style={{ fontSize: '0.72rem', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)', lineHeight: 1.5 }}>
                Use only to fix typos or import errors. Enter a positive number to add savings, or a negative number to reduce savings. A reason is required.
              </p>
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={lS}>Correction amount (+ to add, − to reduce)</label>
              <input type="number" inputMode="decimal" placeholder="e.g. 50 or -50" value={amount}
                onChange={e => { setAmount(e.target.value); setErr(''); }} style={iS} />
              <p style={{ fontSize: '0.68rem', color: 'var(--ink-4)', marginTop: '0.2rem', fontFamily: 'var(--font-sans)' }}>
                Current savings: {fmt(savings)} · Max allowed: {fmt(total)}
              </p>
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={lS}>Reason (required)</label>
              <input type="text" placeholder="e.g. Initial setup correction, import error" value={note}
                onChange={e => setNote(e.target.value)} style={{ ...iS, borderColor: (!note.trim() && err) ? 'var(--accent-red)' : 'var(--border-strong)' }} />
            </div>
          </>
        )}

        {/* ── History ───────────────────────────────────────────────────── */}
        {tab === 'history' && (
          <div>
            {myHistory.length === 0 ? (
              <p style={{ fontSize: '0.825rem', color: 'var(--ink-4)', textAlign: 'center', padding: '0.75rem 0', fontFamily: 'var(--font-sans)' }}>
                No savings activity recorded yet for this account.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: 240, overflowY: 'auto' }}>
                {myHistory.map(adj => {
                  const isFrom = adj.from_account_id === account.id;
                  const rawAmt = Number(adj.amount);
                  const signed =
                    adj.action_type === 'correction' ? rawAmt :
                    adj.action_type === 'release'    ? -rawAmt :
                    (adj.action_type === 'transfer' && isFrom) ? -rawAmt : rawAmt;
                  const label =
                    adj.action_type === 'allocate'   ? '→ Moved to savings' :
                    adj.action_type === 'release'    ? '← Released' :
                    adj.action_type === 'transfer'   ? (isFrom ? '↗ Transferred out' : '↙ Received savings') :
                    '✎ Correction';
                  return (
                    <div key={adj.id} style={{ background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)', padding: '0.5rem 0.625rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--ink-2)', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>{label}</p>
                        <p style={{ fontSize: '0.68rem', color: 'var(--ink-4)', fontFamily: 'var(--font-sans)' }}>
                          {adj.date}{adj.note ? ` · ${adj.note}` : ''}
                        </p>
                      </div>
                      <p style={{
                        fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.82rem', flexShrink: 0, marginLeft: '0.5rem',
                        color: signed >= 0 ? 'var(--ink-2)' : 'var(--accent-green)'
                      }}>
                        {signed >= 0 ? '+' : ''}{fmt(signed)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {err && <p style={{ color: 'var(--accent-red)', fontSize: '0.8rem', fontWeight: 600, marginTop: '0.375rem', marginBottom: '0.375rem', fontFamily: 'var(--font-sans)' }}>{err}</p>}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <button onClick={onClose} style={{
            flex: '0 0 auto', background: 'transparent', border: '1px solid var(--border-strong)',
            borderRadius: 8, padding: '0.45rem 0.875rem', fontWeight: 600, fontSize: '0.8rem',
            cursor: 'pointer', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)'
          }}>
            {tab === 'history' ? 'Close' : 'Cancel'}
          </button>
          {tab !== 'history' &&
           !(tab === 'release'  && savings <= 0) &&
           !(tab === 'transfer' && (savings <= 0 || otherAccounts.length === 0)) && (
            <button onClick={handleSubmit} disabled={saving} style={{
              flex: 1, background: saving ? 'var(--bg-inset)' : 'var(--ink-1)',
              color: saving ? 'var(--ink-4)' : 'var(--bg)', border: 'none', borderRadius: 8,
              padding: '0.45rem 0.875rem', fontWeight: 700, fontSize: '0.8rem',
              cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)',
              opacity: saving ? 0.6 : 1,
            }}>
              {saving ? 'Saving…' :
                tab === 'allocate'   ? 'Move to Savings' :
                tab === 'release'    ? 'Release from Savings' :
                tab === 'transfer'   ? 'Transfer Savings' :
                'Apply Correction'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Accounts page ─────────────────────────────────────────────────────
export default function Accounts() {
  const { accounts, loading, addAccount, updateAccount, deleteAccount, computeAccountBalances } = useAccounts();
  const { transfers, addTransfer, deleteTransfer } = useTransfers();
  const { transactions } = useTransactions();
  const { adjustments, allocateSavings, releaseSavings, transferSavings, correctSavings } = useSavingsAdjustments();
  const { push } = useToast();

  const [showAddModal,      setShowAddModal]      = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editingAccount,    setEditingAccount]    = useState(null);
  const [showHistory,       setShowHistory]       = useState(false);
  const [savingsPanelId,    setSavingsPanelId]    = useState(null);

  const [editName,  setEditName]  = useState('');
  const [editType,  setEditType]  = useState('cash');
  const [editColor, setEditColor] = useState('#818cf8');
  const [editIcon,  setEditIcon]  = useState('💵');

  // ── Single source of truth — all three inputs ──────────────────────────
  const { balances, savingsBreakdown } = computeAccountBalances(transactions, transfers, adjustments);

  function getVals(id) {
    const total     = balances[id] || 0;
    const savings   = Math.max(0, Math.min(savingsBreakdown[id] || 0, total));
    const available = total - savings;
    return { total, savings, available };
  }

  const totalBalance   = Object.values(balances).reduce((s, v) => s + v, 0);
  const totalSavings   = accounts.reduce((s, a) => s + getVals(a.id).savings, 0);
  const totalAvailable = totalBalance - totalSavings;

  // ── Savings operations with pre-validation ────────────────────────────
  const savingsOps = {
    allocate: async (params) => {
      const { available } = getVals(params.account_id);
      if (params.amount > available)
        return { error: new Error(`Cannot move more than available balance (${fmt(available)})`) };
      const r = await allocateSavings(params);
      if (!r.error) push('Moved to savings ✓');
      return r;
    },
    release: async (params) => {
      const { savings } = getVals(params.account_id);
      if (params.amount > savings)
        return { error: new Error(`Cannot release more than savings balance (${fmt(savings)})`) };
      const r = await releaseSavings(params);
      if (!r.error) push('Released from savings ✓');
      return r;
    },
    transfer: async (params) => {
      const { savings } = getVals(params.from_account_id);
      if (params.amount > savings)
        return { error: new Error(`Cannot transfer more than savings balance (${fmt(savings)})`) };
      const r = await transferSavings(params);
      if (!r.error) push('Savings transferred ✓');
      return r;
    },
    correct: async (params) => {
      const { total, savings } = getVals(params.account_id);
      const next = savings + Number(params.amount);
      if (next < 0)     return { error: new Error('Correction would result in negative savings') };
      if (next > total) return { error: new Error(`Correction would exceed account total (${fmt(total)})`) };
      const r = await correctSavings(params);
      if (!r.error) push('Correction applied ✓');
      return r;
    },
  };

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

      {/* Global summary */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1rem 1.125rem', marginBottom: '1.25rem', boxShadow: 'var(--shadow-card)' }}>
        <p style={{ fontSize: '0.68rem', color: 'var(--ink-3)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.625rem', fontFamily: 'var(--font-sans)' }}>
          All Accounts
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
          {[['Total', totalBalance, 'var(--ink-1)'], ['Savings', totalSavings, 'var(--ink-2)'], ['Available', totalAvailable, 'var(--accent-green)']].map(([lbl, val, color]) => (
            <div key={lbl}>
              <p style={{ fontSize: '0.62rem', color: 'var(--ink-4)', fontFamily: 'var(--font-sans)', marginBottom: '0.15rem' }}>{lbl}</p>
              <p style={{ fontSize: '1rem', fontWeight: 800, color, fontFamily: 'var(--font-mono)' }}>{fmt(val)}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '0.68rem', color: 'var(--ink-4)', marginTop: '0.375rem', fontFamily: 'var(--font-sans)' }}>
          {accounts.length} account{accounts.length !== 1 ? 's' : ''} · available = total − savings
        </p>
      </div>

      {/* Account list */}
      {accounts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🏦</div>
          <p style={{ fontWeight: 700, color: 'var(--ink-1)', marginBottom: '0.375rem', fontFamily: 'var(--font-sans)' }}>No accounts yet</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--ink-3)', marginBottom: '1.25rem', fontFamily: 'var(--font-sans)' }}>Add your first account to start tracking where your money lives.</p>
          <button onClick={() => setShowAddModal(true)} style={{ background: 'var(--ink-1)', color: 'var(--bg)', border: 'none', borderRadius: 10, padding: '0.75rem 1.5rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
            + Add Account
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {accounts.map((a) => {
            const { total, savings, available } = getVals(a.id);
            const isEditing  = editingAccount?.id === a.id;
            const showPanel  = savingsPanelId === a.id;

            return (
              <div key={a.id} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderLeft: `4px solid ${a.color}`, borderRadius: 14, overflow: 'hidden',
                boxShadow: 'var(--shadow-card)'
              }}>
                {/* Account row */}
                <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: `${a.color}18`, border: `1px solid ${a.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
                    {a.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontWeight: 700, color: 'var(--ink-1)', fontSize: '0.9375rem', fontFamily: 'var(--font-sans)' }}>{a.name}</p>
                        <p style={{ fontSize: '0.75rem', color: a.color, fontWeight: 600, textTransform: 'capitalize', fontFamily: 'var(--font-sans)' }}>{a.type}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 800, color: 'var(--ink-1)', fontSize: '1.0625rem', fontFamily: 'var(--font-mono)' }}>{fmt(total)}</p>
                        {savings > 0 && (
                          <p style={{ fontSize: '0.72rem', color: 'var(--ink-3)', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>🔒 {fmt(savings)} saved</p>
                        )}
                        <p style={{ fontSize: '0.72rem', color: 'var(--accent-green)', fontWeight: 700, fontFamily: 'var(--font-sans)' }}>
                          {fmt(available)} free
                        </p>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                    {/* Savings panel toggle */}
                    <button
                      onClick={() => setSavingsPanelId(showPanel ? null : a.id)}
                      title="Manage savings"
                      style={{
                        background: showPanel ? 'var(--bg-inset)' : 'transparent',
                        border: `1px solid ${showPanel ? 'var(--border-strong)' : 'var(--border)'}`,
                        borderRadius: 8, width: 32, height: 32, fontSize: '0.9rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'var(--ink-3)'
                      }}
                    >
                      🔒
                    </button>
                    <button
                      onClick={() => isEditing ? setEditingAccount(null) : startEdit(a)}
                      style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--ink-3)' }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(a.id, a.name)}
                      style={{ background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.18)', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--accent-red)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Savings panel */}
                {showPanel && (
                  <div style={{ padding: '0 0.875rem 0.875rem' }}>
                    <SavingsPanel
                      account={a}
                      total={total}
                      savings={savings}
                      available={available}
                      accounts={accounts}
                      adjustments={adjustments}
                      ops={savingsOps}
                      onClose={() => setSavingsPanelId(null)}
                    />
                  </div>
                )}

                {/* Inline edit form */}
                {isEditing && (
                  <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid var(--border)', paddingTop: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                      style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', borderRadius: 8, color: 'var(--ink-1)', padding: '0.625rem 0.875rem', fontSize: '0.9rem', width: '100%', outline: 'none', fontFamily: 'var(--font-sans)', boxSizing: 'border-box' }} />

                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      {ACCOUNT_TYPES.map(t => (
                        <button key={t.value} onClick={() => setEditType(t.value)} style={{
                          flex: 1, padding: '0.5rem', borderRadius: 8,
                          border: `1px solid ${editType === t.value ? 'var(--border-strong)' : 'var(--border)'}`,
                          background: editType === t.value ? 'var(--bg-inset)' : 'transparent',
                          color: editType === t.value ? 'var(--ink-1)' : 'var(--ink-4)',
                          fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)'
                        }}>{t.label}</button>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                      {PRESET_ICONS.map(ic => (
                        <button key={ic} onClick={() => setEditIcon(ic)} style={{
                          width: 36, height: 36, borderRadius: 8,
                          border: `1px solid ${editIcon === ic ? 'var(--border-strong)' : 'var(--border)'}`,
                          background: editIcon === ic ? 'var(--bg-inset)' : 'transparent', fontSize: '1.1rem', cursor: 'pointer'
                        }}>{ic}</button>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      {PRESET_COLORS.map(c => (
                        <button key={c} onClick={() => setEditColor(c)} style={{
                          width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer',
                          background: c, boxShadow: editColor === c ? `0 0 0 2px var(--bg), 0 0 0 4px ${c}` : 'none'
                        }} />
                      ))}
                      <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)}
                        style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} />
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={handleUpdate} style={{ flex: 1, background: 'var(--ink-1)', color: 'var(--bg)', border: 'none', borderRadius: 8, padding: '0.625rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                        Save
                      </button>
                      <button onClick={() => setEditingAccount(null)} style={{ flex: 1, background: 'transparent', color: 'var(--ink-3)', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '0.625rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
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

      {/* Transfer button */}
      {accounts.length >= 2 && (
        <button onClick={() => setShowTransferModal(true)} style={{
          background: 'var(--bg-card)', color: 'var(--ink-2)', border: '1px solid var(--border-strong)',
          borderRadius: 12, padding: '0.875rem', fontWeight: 700, fontSize: '0.9rem',
          cursor: 'pointer', width: '100%', marginBottom: '1.25rem', fontFamily: 'var(--font-sans)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          boxShadow: 'var(--shadow-card)'
        }}>
          <ArrowLeftRight size={17} /> Transfer Between Accounts
        </button>
      )}

      {/* Transfer history */}
      {transfers.length > 0 && (
        <div>
          <button onClick={() => setShowHistory(p => !p)} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '0.25rem 0', marginBottom: '0.625rem', fontFamily: 'var(--font-sans)'
          }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--ink-3)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              Transfer History ({transfers.length})
            </p>
            {showHistory ? <ChevronUp size={14} color="var(--ink-3)" /> : <ChevronDown size={14} color="var(--ink-3)" />}
          </button>
          {showHistory && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {transfers.map((tr) => (
                <div key={tr.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: 'var(--shadow-card)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.9rem' }}>{tr.from_account?.icon}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--ink-2)', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>{tr.from_account?.name}</span>
                      <ArrowLeftRight size={12} color="var(--ink-4)" />
                      <span style={{ fontSize: '0.9rem' }}>{tr.to_account?.icon}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--ink-2)', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>{tr.to_account?.name}</span>
                    </div>
                    {tr.note && <p style={{ fontSize: '0.75rem', color: 'var(--ink-4)', fontFamily: 'var(--font-sans)' }}>{tr.note}</p>}
                    <p style={{ fontSize: '0.72rem', color: 'var(--ink-4)', marginTop: '0.15rem', fontFamily: 'var(--font-sans)' }}>
                      {format(parseISO(tr.date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <p style={{ fontWeight: 800, color: 'var(--ink-1)', fontSize: '0.9375rem', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>{fmt(tr.amount)}</p>
                  <button onClick={() => handleDeleteTransfer(tr.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent-red)', padding: '0.25rem', flexShrink: 0 }}>
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
          savingsBreakdown={savingsBreakdown}
          onSave={handleTransfer}
          onClose={() => setShowTransferModal(false)}
        />
      )}
    </div>
  );
}