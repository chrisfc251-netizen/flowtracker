import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

function formatUSD(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
}

export function TransferModal({ accounts, balances, onSave, onClose }) {
  // Default: first account as From, second as To
  const [fromId, setFromId] = useState(accounts[0]?.id || '');
  const [toId,   setToId]   = useState(accounts.length > 1 ? accounts[1]?.id : accounts[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [date,   setDate]   = useState(new Date().toISOString().slice(0, 10));
  const [note,   setNote]   = useState('');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  // Always derive account objects from current state — never cache them
  const fromAcc  = accounts.find((a) => a.id === fromId);
  const toAcc    = accounts.find((a) => a.id === toId);
  const fromBal  = balances[fromId] || 0;
  const toBal    = balances[toId]   || 0;
  const amt      = Number(amount) || 0;
  const willOver = amt > fromBal;

  function handleFromChange(newFromId) {
    setFromId(newFromId);
    setError('');
    // If To is now the same as From, pick a different account
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1e293b', borderRadius: '20px 20px 0 0', border: '1px solid #334155', width: '100%', maxWidth: 600, padding: '1.5rem 1.25rem 2rem', maxHeight: '85dvh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ color: '#f1f5f9' }}>Transfer Money</h2>
          <button onClick={onClose} style={{ background: '#334155', border: 'none', borderRadius: 8, color: '#94a3b8', width: 30, height: 30, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {/* Visual preview — derived directly from fromAcc / toAcc */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
          <div style={{ flex: 1, background: '#0f172a', borderRadius: 10, padding: '0.75rem', border: `1px solid ${fromAcc?.color || '#334155'}44` }}>
            <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, marginBottom: '0.25rem' }}>FROM</p>
            <p style={{ fontSize: '1.1rem' }}>{fromAcc?.icon} {fromAcc?.name || '—'}</p>
            <p style={{ fontSize: '0.8rem', color: fromBal >= 0 ? '#22c55e' : '#f43f5e', fontWeight: 700, marginTop: '0.2rem' }}>{formatUSD(fromBal)}</p>
          </div>
          <ArrowRight size={20} color="#64748b" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, background: '#0f172a', borderRadius: 10, padding: '0.75rem', border: `1px solid ${toAcc?.color || '#334155'}44` }}>
            <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, marginBottom: '0.25rem' }}>TO</p>
            <p style={{ fontSize: '1.1rem' }}>{toAcc?.icon} {toAcc?.name || '—'}</p>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, marginTop: '0.2rem' }}>{formatUSD(toBal)}</p>
          </div>
        </div>

        {/* From account selector */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>From Account</label>
          <select value={fromId} onChange={(e) => handleFromChange(e.target.value)} style={inputStyle}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.icon} {a.name} ({formatUSD(balances[a.id] || 0)})</option>
            ))}
          </select>
        </div>

        {/* To account selector — excludes fromId */}
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
            style={{ ...inputStyle, fontSize: '1.375rem', fontWeight: 800, textAlign: 'center', color: willOver ? '#f43f5e' : '#f1f5f9' }} />
          {willOver && <p style={{ color: '#f43f5e', fontSize: '0.75rem', marginTop: '0.25rem' }}>⚠️ Exceeds available balance ({formatUSD(fromBal)})</p>}
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

        {error && <p style={{ color: '#f43f5e', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.875rem', textAlign: 'center' }}>{error}</p>}

        <button onClick={handleSave} disabled={saving || willOver} style={{
          background: '#818cf8', color: '#fff', border: 'none', borderRadius: 10,
          padding: '0.875rem', fontWeight: 700, fontSize: '0.9375rem',
          cursor: saving || willOver ? 'not-allowed' : 'pointer',
          width: '100%', fontFamily: 'inherit', opacity: saving || willOver ? 0.6 : 1
        }}>
          {saving ? 'Transferring…' : `Transfer ${amt > 0 ? formatUSD(amt) : ''}`}
        </button>
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.5rem' };
const inputStyle = { background: '#0f172a', border: '1px solid #334155', borderRadius: 10, color: '#f1f5f9', padding: '0.75rem 1rem', fontSize: '1rem', width: '100%', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };