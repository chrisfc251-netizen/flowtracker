/**
 * SavingsAllocationModal.js
 * Lets the user move money between available ↔ savings for a specific account.
 * Creates an account_savings_allocations record — never touches income/expense.
 */
import { useState } from 'react';
import { PiggyBank, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
}

export function SavingsAllocationModal({ account, totalBalance, savingsBalance, onSave, onClose }) {
  const availableBalance = Math.max(0, totalBalance - savingsBalance);
  const [direction, setDirection] = useState('to_savings');   // 'to_savings' | 'from_savings'
  const [amount,    setAmount]    = useState('');
  const [note,      setNote]      = useState('');
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  const amt      = Number(amount) || 0;
  const maxAmt   = direction === 'to_savings' ? availableBalance : savingsBalance;
  const willOver = amt > maxAmt || amt <= 0;

  const newSavings   = direction === 'to_savings' ? savingsBalance + amt : savingsBalance - amt;
  const newAvailable = direction === 'to_savings' ? availableBalance - amt : availableBalance + amt;

  async function handleSave() {
    if (!amount || amt <= 0) { setError('Enter a valid amount'); return; }
    if (amt > maxAmt) {
      setError(direction === 'to_savings'
        ? `Only ${fmt(availableBalance)} is available to move to savings`
        : `Only ${fmt(savingsBalance)} is currently in savings`);
      return;
    }
    setSaving(true);
    const { error: err } = await onSave({
      account_id: account.id,
      amount: amt,
      direction,
      date: new Date().toISOString().slice(0, 10),
      note,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1e293b', borderRadius: '20px 20px 0 0', border: '1px solid #334155', width: '100%', maxWidth: 600, padding: '1.5rem 1.25rem 2rem', maxHeight: '85dvh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PiggyBank size={18} color="#818cf8" />
            <h2 style={{ color: '#f1f5f9', fontSize: '1.1rem' }}>Edit Savings</h2>
          </div>
          <button onClick={onClose} style={{ background: '#334155', border: 'none', borderRadius: 8, color: '#94a3b8', width: 30, height: 30, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {/* Account overview */}
        <div style={{ background: '#0f172a', borderRadius: 12, padding: '0.875rem 1rem', marginBottom: '1.25rem', border: `1px solid ${account.color}33` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.3rem' }}>{account.icon}</span>
            <div>
              <p style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.9375rem' }}>{account.name}</p>
              <p style={{ fontSize: '0.72rem', color: account.color, fontWeight: 600, textTransform: 'capitalize' }}>{account.type}</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Total</p>
              <p style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f1f5f9' }}>{fmt(totalBalance)}</p>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid #334155', borderRight: '1px solid #334155' }}>
              <p style={{ fontSize: '0.62rem', color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Available</p>
              <p style={{ fontSize: '0.9rem', fontWeight: 800, color: '#22c55e' }}>{fmt(availableBalance)}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.62rem', color: '#818cf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Savings</p>
              <p style={{ fontSize: '0.9rem', fontWeight: 800, color: '#818cf8' }}>{fmt(savingsBalance)}</p>
            </div>
          </div>
        </div>

        {/* Direction toggle */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Move money</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button onClick={() => { setDirection('to_savings'); setError(''); }} style={{
              padding: '0.75rem', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.85rem',
              border: `1px solid ${direction === 'to_savings' ? '#818cf8' : '#334155'}`,
              background: direction === 'to_savings' ? 'rgba(129,140,248,.15)' : 'transparent',
              color: direction === 'to_savings' ? '#818cf8' : '#64748b',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            }}>
              <ArrowDownToLine size={15} /> To Savings
            </button>
            <button onClick={() => { setDirection('from_savings'); setError(''); }} style={{
              padding: '0.75rem', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.85rem',
              border: `1px solid ${direction === 'from_savings' ? '#22c55e' : '#334155'}`,
              background: direction === 'from_savings' ? 'rgba(34,197,94,.1)' : 'transparent',
              color: direction === 'from_savings' ? '#22c55e' : '#64748b',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            }}>
              <ArrowUpFromLine size={15} /> From Savings
            </button>
          </div>
          <p style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.375rem' }}>
            {direction === 'to_savings'
              ? `Max: ${fmt(availableBalance)} available`
              : `Max: ${fmt(savingsBalance)} in savings`}
          </p>
        </div>

        {/* Amount */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Amount</label>
          <input
            type="number" inputMode="decimal" placeholder="0.00" value={amount}
            onChange={(e) => { setAmount(e.target.value); setError(''); }}
            style={{ ...inputStyle, fontSize: '1.375rem', fontWeight: 800, textAlign: 'center', color: (amt > maxAmt && amt > 0) ? '#f43f5e' : '#f1f5f9' }}
          />
        </div>

        {/* Preview */}
        {amt > 0 && !willOver && (
          <div style={{ background: 'rgba(99,102,241,.06)', border: '1px solid rgba(99,102,241,.15)', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>After this allocation</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <p style={{ fontSize: '0.65rem', color: '#22c55e', fontWeight: 700, marginBottom: '0.15rem' }}>Available</p>
                <p style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f1f5f9' }}>{fmt(newAvailable)}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.65rem', color: '#818cf8', fontWeight: 700, marginBottom: '0.15rem' }}>Savings</p>
                <p style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f1f5f9' }}>{fmt(newSavings)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Note */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Note (optional)</label>
          <input type="text" placeholder="e.g. Emergency fund, vacation savings…" value={note} onChange={(e) => setNote(e.target.value)} style={inputStyle} />
        </div>

        {error && <p style={{ color: '#f43f5e', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.875rem', textAlign: 'center' }}>{error}</p>}

        <button onClick={handleSave} disabled={saving || willOver} style={{
          background: direction === 'to_savings' ? '#818cf8' : '#22c55e',
          color: '#fff', border: 'none', borderRadius: 10, padding: '0.875rem',
          fontWeight: 700, fontSize: '0.9375rem', cursor: saving || willOver ? 'not-allowed' : 'pointer',
          width: '100%', fontFamily: 'inherit', opacity: saving || willOver ? 0.5 : 1,
        }}>
          {saving ? 'Saving…' : direction === 'to_savings' ? `Move ${amt > 0 ? fmt(amt) : ''} to Savings` : `Move ${amt > 0 ? fmt(amt) : ''} to Available`}
        </button>

        <p style={{ fontSize: '0.68rem', color: '#334155', textAlign: 'center', marginTop: '0.625rem' }}>
          Internal allocation — does not affect income or expense reports.
        </p>
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.5rem' };
const inputStyle = {
  background: '#0f172a', border: '1px solid #334155', borderRadius: 10,
  color: '#f1f5f9', padding: '0.75rem 1rem', fontSize: '1rem',
  width: '100%', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
};