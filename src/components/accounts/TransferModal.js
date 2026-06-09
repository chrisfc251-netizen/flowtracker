import { useState } from 'react';
import { ArrowRight, X } from 'lucide-react';

function formatUSD(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
}

export function TransferModal({ accounts, balances, onSave, onClose }) {
  const [fromId, setFromId] = useState(accounts[0]?.id || '');
  const [toId,   setToId]   = useState(accounts.length > 1 ? accounts[1]?.id : accounts[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [date,   setDate]   = useState(new Date().toISOString().slice(0, 10));
  const [note,   setNote]   = useState('');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const fromAcc  = accounts.find((a) => a.id === fromId);
  const toAcc    = accounts.find((a) => a.id === toId);
  const fromBal  = balances[fromId] || 0;
  const toBal    = balances[toId]   || 0;
  const amt      = Number(amount) || 0;
  const noBalance = fromBal <= 0;
  const willOver  = noBalance || amt > fromBal;

  function handleFromChange(newFromId) {
    setFromId(newFromId);
    setError('');
    if (newFromId === toId) {
      const other = accounts.find((a) => a.id !== newFromId);
      if (other) setToId(other.id);
    }
  }

  function handleToChange(newToId) {
    setToId(newToId);
    setError('');
  }

  async function handleSave() {
    if (!amount || amt <= 0)  { setError('Enter a valid amount'); return; }
    if (fromId === toId)       { setError('Select two different accounts'); return; }
    if (willOver)              { setError(`Insufficient balance in ${fromAcc?.name} (${formatUSD(fromBal)})`); return; }
    setSaving(true);
    const { error: err } = await onSave({ from_account_id: fromId, to_account_id: toId, amount: amt, date, note });
    setSaving(false);
    if (err) { setError(err.message); return; }
    onClose();
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--bg-card)', borderRadius: '20px 20px 0 0',
        border: '1px solid var(--border)', width: '100%', maxWidth: 600,
        padding: '1.5rem 1.25rem 2rem', maxHeight: '85dvh', overflowY: 'auto',
        boxShadow: '0 -4px 32px rgba(0,0,0,0.12)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ color: 'var(--ink-1)', fontFamily: 'var(--font-serif)', fontWeight: 700 }}>Transfer Money</h2>
          <button onClick={onClose} style={{
            background: 'var(--bg-inset)', border: '1px solid var(--border)',
            borderRadius: 8, color: 'var(--ink-3)', width: 32, height: 32,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <X size={15} />
          </button>
        </div>

        {/* Visual preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
          <div style={{
            flex: 1, background: 'var(--bg-inset)', borderRadius: 10, padding: '0.75rem',
            border: `1px solid ${fromAcc?.color || 'var(--border)'}44`
          }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--ink-4)', fontWeight: 700, marginBottom: '0.25rem', fontFamily: 'var(--font-sans)' }}>FROM</p>
            <p style={{ fontSize: '1rem', fontFamily: 'var(--font-sans)' }}>{fromAcc?.icon} {fromAcc?.name || '—'}</p>
            <p style={{ fontSize: '0.8rem', color: fromBal >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 700, marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>{formatUSD(fromBal)}</p>
          </div>
          <ArrowRight size={20} color="var(--ink-4)" style={{ flexShrink: 0 }} />
          <div style={{
            flex: 1, background: 'var(--bg-inset)', borderRadius: 10, padding: '0.75rem',
            border: `1px solid ${toAcc?.color || 'var(--border)'}44`
          }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--ink-4)', fontWeight: 700, marginBottom: '0.25rem', fontFamily: 'var(--font-sans)' }}>TO</p>
            <p style={{ fontSize: '1rem', fontFamily: 'var(--font-sans)' }}>{toAcc?.icon} {toAcc?.name || '—'}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--ink-3)', fontWeight: 700, marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>{formatUSD(toBal)}</p>
          </div>
        </div>

        {/* From account */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>From Account</label>
          <select value={fromId} onChange={(e) => handleFromChange(e.target.value)} style={inputStyle}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.icon} {a.name} ({formatUSD(balances[a.id] || 0)})</option>
            ))}
          </select>
        </div>

        {/* To account */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>To Account</label>
          <select value={toId} onChange={(e) => handleToChange(e.target.value)} style={inputStyle}>
            {accounts.filter((a) => a.id !== fromId).map((a) => (
              <option key={a.id} value={a.id}>{a.icon} {a.name} ({formatUSD(balances[a.id] || 0)})</option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Amount</label>
          <input type="number" inputMode="decimal" placeholder="0.00" value={amount}
            onChange={(e) => { setAmount(e.target.value); setError(''); }}
            style={{ ...inputStyle, fontSize: '1.375rem', fontWeight: 800, textAlign: 'center', color: willOver ? 'var(--accent-red)' : 'var(--ink-1)' }} />
          {noBalance
            ? <p style={{ color: 'var(--accent-red)', fontSize: '0.75rem', marginTop: '0.25rem', fontFamily: 'var(--font-sans)' }}>⚠️ {fromAcc?.name} has no balance to transfer</p>
            : willOver && <p style={{ color: 'var(--accent-red)', fontSize: '0.75rem', marginTop: '0.25rem', fontFamily: 'var(--font-sans)' }}>⚠️ Exceeds available balance ({formatUSD(fromBal)})</p>
          }
        </div>

        {/* Date */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
        </div>

        {/* Note */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Note (optional)</label>
          <input type="text" placeholder="What is this transfer for?" value={note} onChange={(e) => setNote(e.target.value)} style={inputStyle} />
        </div>

        {error && <p style={{ color: 'var(--accent-red)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.875rem', textAlign: 'center', fontFamily: 'var(--font-sans)' }}>{error}</p>}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={onClose} style={{
            flex: '0 0 auto', background: 'var(--bg-inset)',
            border: '1px solid var(--border-strong)', borderRadius: 10,
            padding: '0.875rem 1.25rem', fontWeight: 600, fontSize: '0.9rem',
            cursor: 'pointer', color: 'var(--ink-2)', fontFamily: 'var(--font-sans)'
          }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || willOver} style={{
            flex: 1, background: saving || willOver ? 'var(--bg-inset)' : 'var(--ink-1)',
            color: saving || willOver ? 'var(--ink-4)' : 'var(--bg)',
            border: '1px solid var(--border-strong)', borderRadius: 10,
            padding: '0.875rem', fontWeight: 700, fontSize: '0.9375rem',
            cursor: saving || willOver ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-sans)', opacity: saving ? 0.6 : 1,
            transition: 'all 0.15s'
          }}>
            {saving ? 'Transferring…' : `Transfer ${amt > 0 ? formatUSD(amt) : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '0.8rem', color: 'var(--ink-3)', fontWeight: 700, marginBottom: '0.5rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em' };
const inputStyle = { background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', borderRadius: 10, color: 'var(--ink-1)', padding: '0.75rem 1rem', fontSize: '1rem', width: '100%', outline: 'none', fontFamily: 'var(--font-sans)', boxSizing: 'border-box' };