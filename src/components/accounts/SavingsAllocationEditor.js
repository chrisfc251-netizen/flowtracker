import { useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';

function fmt(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2,
  }).format(n || 0);
}

/**
 * SavingsAllocationEditor
 * Bottom-sheet modal that lets the user move savings between accounts.
 * Total savings is invariant — moving $X from account A to account B
 * leaves the global savings pool unchanged.
 *
 * Props:
 *   accounts          []  — all user accounts
 *   savingsBreakdown  {}  — { [accountId]: number } from computeAccountBalances
 *   onSave            async fn({ from_account_id, to_account_id, amount, note }) → { error? }
 *   onClose           fn()
 */
export function SavingsAllocationEditor({ accounts, savingsBreakdown, onSave, onClose }) {
  const [fromId,  setFromId]  = useState('');
  const [toId,    setToId]    = useState('');
  const [amount,  setAmount]  = useState('');
  const [note,    setNote]    = useState('');
  const [saving,  setSaving]  = useState(false);
  const [errMsg,  setErrMsg]  = useState('');

  const totalSavings  = Object.values(savingsBreakdown).reduce((s, v) => s + v, 0);
  const fromAccounts  = accounts.filter(a => (savingsBreakdown[a.id] || 0) > 0);
  const toAccounts    = accounts.filter(a => a.id !== fromId);
  const fromSavings   = fromId ? (savingsBreakdown[fromId] || 0) : 0;
  const parsedAmount  = parseFloat(amount) || 0;

  function validate() {
    if (!fromId) return 'Select a source account';
    if (!toId)   return 'Select a destination account';
    if (fromId === toId) return 'Source and destination must be different';
    if (!amount || parsedAmount <= 0) return 'Enter a valid amount greater than 0';
    if (parsedAmount > fromSavings)
      return `Cannot move more than ${fmt(fromSavings)} — that's all that account has saved`;
    return null;
  }

  async function handleSave() {
    const err = validate();
    if (err) { setErrMsg(err); return; }
    setSaving(true);
    setErrMsg('');
    const result = await onSave({
      from_account_id: fromId,
      to_account_id:   toId,
      amount:          parsedAmount,
      note:            note.trim() || null,
    });
    setSaving(false);
    if (result?.error) { setErrMsg(result.error.message || 'Save failed'); return; }
    onClose();
  }

  // ── Shared input/select style ────────────────────────────────────────
  const inp = {
    background: 'var(--bg-inset)', border: '1px solid var(--border)',
    borderRadius: 10, color: 'var(--ink-1)', padding: '0.75rem 1rem',
    fontSize: '0.9375rem', outline: 'none', fontFamily: 'var(--font-sans)',
    width: '100%', boxSizing: 'border-box', minHeight: 48,
  };

  const label = {
    display: 'block', fontSize: '0.72rem', color: 'var(--ink-3)',
    fontWeight: 700, marginBottom: '0.375rem',
    fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase',
  };

  const previewValid = fromId && toId && parsedAmount > 0 && !validate();

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        background: 'rgba(26,26,24,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--bg)',
        borderRadius: '20px 20px 0 0',
        border: '1px solid var(--border)', borderBottom: 'none',
        width: '100%', maxWidth: 600,
        padding: '1.5rem 1.25rem',
        paddingBottom: 'calc(1.75rem + env(safe-area-inset-bottom, 0px))',
        maxHeight: '92dvh', overflowY: 'auto',
      }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
          <p style={{
            fontSize: '0.63rem', color: 'var(--ink-4)', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)',
          }}>
            Savings · Reallocation
          </p>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-inset)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--ink-3)', width: 30, height: 30,
              cursor: 'pointer', fontSize: 15, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        </div>
        <h2 style={{
          fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 900,
          color: 'var(--ink-1)', letterSpacing: '-0.01em', marginBottom: '0.25rem',
        }}>
          Edit Savings by Account
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--ink-3)', marginBottom: '1.375rem', fontFamily: 'var(--font-sans)', lineHeight: 1.5 }}>
          Move savings between accounts. Your total savings of{' '}
          <strong style={{ color: 'var(--ink-2)' }}>{fmt(totalSavings)}</strong>{' '}
          will not change.
        </p>

        {/* ── Current savings breakdown ── */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '0.875rem', marginBottom: '1.375rem',
        }}>
          <p style={{
            fontSize: '0.63rem', color: 'var(--ink-4)', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            marginBottom: '0.625rem', fontFamily: 'var(--font-sans)',
          }}>Current Breakdown</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {accounts.map(a => {
              const sav = savingsBreakdown[a.id] || 0;
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1rem' }}>{a.icon}</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--ink-2)', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
                      {a.name}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '0.875rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                    color: sav > 0 ? 'var(--ink-1)' : 'var(--ink-4)',
                  }}>
                    {fmt(sav)}
                  </span>
                </div>
              );
            })}
            <div style={{
              borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.125rem',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--ink-3)', fontWeight: 700, fontFamily: 'var(--font-sans)' }}>
                Total Savings
              </span>
              <span style={{ fontSize: '0.875rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--ink-1)' }}>
                {fmt(totalSavings)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Transfer form ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* From */}
          <div>
            <label style={label}>Move savings from</label>
            <select value={fromId} onChange={e => { setFromId(e.target.value); setErrMsg(''); }} style={inp}>
              <option value="">Select source account…</option>
              {fromAccounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.icon} {a.name} — {fmt(savingsBreakdown[a.id] || 0)} saved
                </option>
              ))}
            </select>
            {fromAccounts.length === 0 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--ink-3)', marginTop: '0.375rem', fontFamily: 'var(--font-sans)' }}>
                No accounts with savings yet. Add income with a savings allocation first.
              </p>
            )}
          </div>

          {/* Arrow divider */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              border: '1px solid var(--border)', borderRadius: '50%',
              width: 36, height: 36, display: 'flex', alignItems: 'center',
              justifyContent: 'center', background: 'var(--bg-inset)',
            }}>
              <ArrowLeftRight size={14} color="var(--ink-3)" />
            </div>
          </div>

          {/* To */}
          <div>
            <label style={label}>Into account</label>
            <select value={toId} onChange={e => { setToId(e.target.value); setErrMsg(''); }} style={inp}>
              <option value="">Select destination account…</option>
              {toAccounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.icon} {a.name} — {fmt(savingsBreakdown[a.id] || 0)} currently saved
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label style={label}>Amount to transfer</label>
            <input
              type="number" inputMode="decimal" placeholder="0.00"
              value={amount}
              onChange={e => { setAmount(e.target.value); setErrMsg(''); }}
              style={{
                ...inp,
                fontSize: '1.5rem', fontWeight: 800,
                fontFamily: 'var(--font-mono)', textAlign: 'center',
              }}
            />
            {fromId && fromSavings > 0 && (
              <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {[
                  { label: '25%',  val: (fromSavings * 0.25).toFixed(2) },
                  { label: '50%',  val: (fromSavings * 0.5).toFixed(2)  },
                  { label: 'All',  val: fromSavings.toFixed(2)           },
                ].map(opt => (
                  <button key={opt.label} onClick={() => setAmount(opt.val)} style={{
                    fontSize: '0.72rem', fontWeight: 700, color: 'var(--ink-3)',
                    background: 'var(--bg-inset)', border: '1px solid var(--border)',
                    borderRadius: 6, padding: '0.25rem 0.625rem',
                    cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  }}>
                    {opt.label} · {fmt(parseFloat(opt.val))}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <label style={label}>Note (optional)</label>
            <input
              type="text" placeholder="Reason for transfer…"
              value={note} onChange={e => setNote(e.target.value)}
              style={inp}
            />
          </div>

          {/* Live preview */}
          {previewValid && (
            <div style={{
              background: 'rgba(26,106,58,0.06)', border: '1px solid rgba(26,106,58,0.18)',
              borderRadius: 12, padding: '0.875rem',
            }}>
              <p style={{
                fontSize: '0.72rem', color: 'var(--accent-green)', fontWeight: 700,
                marginBottom: '0.5rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em', textTransform: 'uppercase',
              }}>After transfer</p>
              {[
                { acct: accounts.find(a => a.id === fromId), delta: -parsedAmount, tag: 'From' },
                { acct: accounts.find(a => a.id === toId),   delta: +parsedAmount, tag: 'To'   },
              ].filter(r => r.acct).map(row => (
                <div key={row.acct.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: '0.25rem',
                }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--ink-2)', fontFamily: 'var(--font-sans)' }}>
                    {row.acct.icon} {row.acct.name}
                  </span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--ink-1)' }}>
                      {fmt((savingsBreakdown[row.acct.id] || 0) + row.delta)}
                    </span>
                    <span style={{
                      fontSize: '0.7rem', fontFamily: 'var(--font-mono)',
                      color: row.delta > 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                      marginLeft: '0.375rem',
                    }}>
                      {row.delta > 0 ? '+' : ''}{fmt(row.delta)}
                    </span>
                  </div>
                </div>
              ))}
              <div style={{
                borderTop: '1px solid rgba(26,106,58,0.15)', paddingTop: '0.375rem', marginTop: '0.375rem',
                display: 'flex', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)' }}>
                  Total (unchanged)
                </span>
                <span style={{ fontSize: '0.875rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--ink-1)' }}>
                  {fmt(totalSavings)}
                </span>
              </div>
            </div>
          )}

          {/* Error */}
          {errMsg && (
            <p style={{
              fontSize: '0.82rem', color: 'var(--accent-red)',
              fontWeight: 600, fontFamily: 'var(--font-sans)',
              background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)',
              borderRadius: 8, padding: '0.625rem 0.875rem',
            }}>
              ⚠ {errMsg}
            </p>
          )}

          {/* CTA */}
          <button
            onClick={handleSave}
            disabled={saving || fromAccounts.length === 0}
            style={{
              width: '100%', background: 'var(--ink-1)', color: 'var(--bg)',
              border: 'none', borderRadius: 999, padding: '0.9375rem',
              fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 600,
              cursor: saving || fromAccounts.length === 0 ? 'not-allowed' : 'pointer',
              opacity: saving || fromAccounts.length === 0 ? 0.5 : 1,
              letterSpacing: '-0.01em',
            }}
          >
            {saving ? 'Saving…' : 'Transfer Savings'}
          </button>
        </div>
      </div>
    </div>
  );
}