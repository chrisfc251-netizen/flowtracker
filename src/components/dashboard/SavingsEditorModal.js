import { useState } from 'react';
import { supabase } from '../../lib/supabase';

function fmt(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2,
  }).format(n || 0);
}

export function SavingsEditorModal({ accounts, savingsBreakdown, transactions, onClose, onSaved }) {
  const [fromId,  setFromId]  = useState('');
  const [toId,    setToId]    = useState('');
  const [amount,  setAmount]  = useState('');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  const accountsWithSavings = accounts.filter(a => (savingsBreakdown[a.id] || 0) > 0);

  function validate() {
    const amt = parseFloat(amount);
    if (!fromId)           return 'Select a source account.';
    if (!toId)             return 'Select a destination account.';
    if (fromId === toId)   return 'Source and destination must be different.';
    if (!amt || amt <= 0)  return 'Enter an amount greater than $0.';
    const available = savingsBreakdown[fromId] || 0;
    if (amt > available)   return `Source only has ${fmt(available)} in savings.`;
    return null;
  }

  async function handleMove() {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    setError('');
    setSuccess('');

    const moveAmt = parseFloat(amount);
    let remaining = moveAmt;

    // Fetch income transactions whose savings are attributed to fromId, oldest first
    const { data: txs, error: fetchErr } = await supabase
      .from('transactions')
      .select('id, savings_allocation, savings_account_id')
      .eq('type', 'income')
      .eq('savings_account_id', fromId)
      .gt('savings_allocation', 0)
      .order('date', { ascending: true });

    if (fetchErr) {
      setError(fetchErr.message);
      setSaving(false);
      return;
    }

    if (!txs || txs.length === 0) {
      setError('No eligible savings transactions found in source account.');
      setSaving(false);
      return;
    }

    // Reassign transaction savings_account_id records until we've covered moveAmt
    const updates = [];
    for (const tx of txs) {
      if (remaining <= 0) break;
      const txSav = Number(tx.savings_allocation);
      if (txSav <= 0) continue;
      updates.push({ id: tx.id, savings_account_id: toId });
      remaining -= txSav;
    }

    for (const u of updates) {
      const { error: updErr } = await supabase
        .from('transactions')
        .update({ savings_account_id: u.savings_account_id })
        .eq('id', u.id);
      if (updErr) {
        setError(updErr.message);
        setSaving(false);
        return;
      }
    }

    const fromName = accounts.find(a => a.id === fromId)?.name ?? fromId;
    const toName   = accounts.find(a => a.id === toId)?.name   ?? toId;
    setSuccess(`Moved ${fmt(moveAmt)} savings from ${fromName} to ${toName}.`);
    setAmount('');
    setFromId('');
    setToId('');
    setSaving(false);
    if (onSaved) onSaved();
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 700, display: 'flex',
        alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div style={{
        background: '#F5F2EC',
        borderRadius: '20px 20px 0 0',
        border: '1px solid #D9D4C7', borderBottom: 'none',
        width: '100%', maxWidth: 600,
        padding: '1.5rem 1.25rem 2rem',
        maxHeight: '85dvh', overflowY: 'auto',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.14)',
        position: 'relative',
      }}>

        {/* Drag handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#C8C3B8', margin: '0 auto 1.25rem' }} />

        {/* X button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '1.25rem', right: '1.25rem',
            background: '#EAE6DE', border: '1px solid #D9D4C7',
            borderRadius: '50%', width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#5C5852', fontSize: '1.1rem', lineHeight: 1,
          }}
        >×</button>

        {/* Header */}
        <div style={{ marginBottom: '1.25rem', paddingRight: '2rem' }}>
          <p style={{ fontSize: '0.65rem', color: '#6B6860', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Move Savings
          </p>
          <h2 style={{ color: '#1A1A18', fontSize: '1.25rem', fontFamily: 'var(--font-serif, Georgia, serif)', margin: 0 }}>
            Edit Savings by Account
          </h2>
        </div>

        {/* Info banner */}
        <div style={{
          background: 'rgba(129,140,248,0.08)', border: '1px solid rgba(129,140,248,0.2)',
          borderRadius: 10, padding: '0.75rem 0.875rem', marginBottom: '1.25rem',
        }}>
          <p style={{ fontSize: '0.8rem', color: '#4F46E5', lineHeight: 1.5, margin: 0 }}>
            Moving savings between accounts keeps your total savings unchanged. This does not create income or expense transactions.
          </p>
        </div>

        {/* Current savings per account */}
        <p style={{ fontSize: '0.7rem', color: '#6B6860', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.625rem' }}>
          Current Savings
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '1.375rem' }}>
          {accounts.map(a => {
            const sav = savingsBreakdown[a.id] || 0;
            return (
              <div key={a.id} style={{
                background: '#FFFFFF', border: '1px solid #E8E4DC',
                borderRadius: 10, padding: '0.75rem 1rem',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: `${a.color}18`, border: `1px solid ${a.color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.1rem', flexShrink: 0,
                }}>
                  {a.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, color: '#1A1A18', fontSize: '0.875rem', margin: 0 }}>{a.name}</p>
                  <p style={{ fontSize: '0.72rem', color: a.color, fontWeight: 600, textTransform: 'capitalize', margin: 0 }}>{a.type}</p>
                </div>
                <p style={{
                  fontWeight: 700,
                  color: sav > 0 ? '#1A1A18' : '#A09C93',
                  fontSize: '0.9rem',
                  fontFamily: 'var(--font-mono, monospace)',
                  flexShrink: 0,
                }}>
                  {fmt(sav)}
                </p>
              </div>
            );
          })}
        </div>

        {/* Move form */}
        <p style={{ fontSize: '0.7rem', color: '#6B6860', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.625rem' }}>
          Move Savings
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
          {/* From */}
          <div>
            <label style={labelStyle}>From Account</label>
            <select
              value={fromId}
              onChange={e => { setFromId(e.target.value); setError(''); setSuccess(''); }}
              style={selectStyle}
            >
              <option value="">— Select source —</option>
              {accountsWithSavings.map(a => (
                <option key={a.id} value={a.id}>
                  {a.icon} {a.name} ({fmt(savingsBreakdown[a.id] || 0)} available)
                </option>
              ))}
            </select>
            {accountsWithSavings.length === 0 && (
              <p style={{ fontSize: '0.75rem', color: '#A09C93', marginTop: '0.375rem' }}>
                No accounts have savings to move.
              </p>
            )}
          </div>

          {/* To */}
          <div>
            <label style={labelStyle}>To Account</label>
            <select
              value={toId}
              onChange={e => { setToId(e.target.value); setError(''); setSuccess(''); }}
              style={selectStyle}
            >
              <option value="">— Select destination —</option>
              {accounts.filter(a => a.id !== fromId).map(a => (
                <option key={a.id} value={a.id}>
                  {a.icon} {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label style={labelStyle}>Amount</label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={e => { setAmount(e.target.value); setError(''); setSuccess(''); }}
              onKeyDown={e => e.key === 'Enter' && handleMove()}
              style={inputStyle}
            />
            {fromId && (
              <p style={{ fontSize: '0.72rem', color: '#6B6860', marginTop: '0.25rem' }}>
                Available to move: {fmt(savingsBreakdown[fromId] || 0)}
              </p>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)',
            borderRadius: 8, padding: '0.625rem 0.875rem', marginBottom: '0.875rem',
          }}>
            <p style={{ fontSize: '0.8rem', color: '#DC2626', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Success */}
        {success && (
          <div style={{
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
            borderRadius: 8, padding: '0.625rem 0.875rem', marginBottom: '0.875rem',
          }}>
            <p style={{ fontSize: '0.8rem', color: '#16A34A', margin: 0 }}>✓ {success}</p>
          </div>
        )}

        {/* Move button */}
        <button
          onClick={handleMove}
          disabled={saving || accountsWithSavings.length === 0}
          style={{
            background: '#1A1A18', color: '#F5F2EC', border: 'none', borderRadius: 12,
            padding: '0.9rem', fontWeight: 700, fontSize: '0.9375rem',
            cursor: (saving || accountsWithSavings.length === 0) ? 'not-allowed' : 'pointer',
            width: '100%', fontFamily: 'inherit',
            opacity: (saving || accountsWithSavings.length === 0) ? 0.5 : 1,
            marginBottom: '0.625rem',
          }}
        >
          {saving ? 'Moving…' : 'Move Savings'}
        </button>

        {/* Cancel */}
        <button
          onClick={onClose}
          style={{
            background: 'transparent', color: '#6B6860',
            border: '1px solid #D9D4C7', borderRadius: 12,
            padding: '0.75rem', fontWeight: 600, fontSize: '0.875rem',
            cursor: 'pointer', width: '100%', fontFamily: 'inherit',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default SavingsEditorModal;

const labelStyle = {
  display: 'block', fontSize: '0.72rem', color: '#6B6860',
  fontWeight: 700, marginBottom: '0.375rem',
  letterSpacing: '0.04em', textTransform: 'uppercase',
};

const inputStyle = {
  background: '#FFFFFF', border: '1.5px solid #D9D4C7',
  borderRadius: 10, color: '#1A1A18',
  padding: '0.75rem 1rem', fontSize: '1rem',
  width: '100%', outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const selectStyle = {
  ...inputStyle,
  appearance: 'none',
  cursor: 'pointer',
};