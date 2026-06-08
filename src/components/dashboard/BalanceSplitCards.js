import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { SavingsEditorModal } from './SavingsEditorModal';

function formatUSD(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
}

// ── Savings Breakdown Sheet ───────────────────────────────────────────────
// Exported so Home.js can import and use it directly from the Savings tile.
export function SavingsBreakdownSheet({
  totalSavings, accounts, savingsBreakdown,
  transactions, onClose, onRefresh,
}) {
  const [showEditor, setShowEditor] = useState(false);

  return (
    <>
      <div
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}
      >
        <div style={{
          background: '#F5F2EC',
          borderRadius: '20px 20px 0 0',
          border: '1px solid #D9D4C7', borderBottom: 'none',
          width: '100%', maxWidth: 600,
          padding: '1.375rem 1.25rem 2rem',
          maxHeight: '85dvh', overflowY: 'auto',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.12)',
        }}>
          {/* Drag handle */}
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#C8C3B8', margin: '0 auto 1.25rem' }} />

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.65rem', color: '#6B6860', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Savings Breakdown
              </p>
              <p style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1A1A18', fontFamily: 'var(--font-serif, serif)', letterSpacing: '-0.01em' }}>
                {formatUSD(totalSavings)}
              </p>
            </div>
            <button onClick={onClose} style={{
              background: '#EAE6DE', border: '1px solid #D9D4C7',
              borderRadius: '50%', width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#5C5852', fontSize: '1.1rem',
            }}>×</button>
          </div>

          {/* Account list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {accounts.map(a => {
              const sav = savingsBreakdown[a.id] || 0;
              const pct = totalSavings > 0 ? (sav / totalSavings) * 100 : 0;
              return (
                <div key={a.id} style={{
                  background: '#FFFFFF', border: '1px solid #E8E4DC',
                  borderRadius: 12, padding: '0.875rem 1rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: `${a.color}18`, border: `1px solid ${a.color}44`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.2rem', flexShrink: 0,
                    }}>
                      {a.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, color: '#1A1A18', fontSize: '0.9rem' }}>{a.name}</p>
                      <p style={{ fontSize: '0.72rem', color: a.color, fontWeight: 600, textTransform: 'capitalize' }}>{a.type}</p>
                    </div>
                    <p style={{ fontWeight: 700, color: '#1A1A18', fontSize: '0.9rem', fontFamily: 'var(--font-mono, monospace)', flexShrink: 0 }}>
                      {formatUSD(sav)}
                    </p>
                  </div>
                  {pct > 0 && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ background: '#E8E4DC', borderRadius: 999, height: 5, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: a.color || '#818cf8', borderRadius: 999 }} />
                      </div>
                      <p style={{ fontSize: '0.68rem', color: '#A09C93', textAlign: 'right', marginTop: '0.2rem' }}>
                        {Math.round(pct)}%
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Edit Savings by Account button */}
          <button
            onClick={() => setShowEditor(true)}
            style={{
              background: '#1A1A18', color: '#F5F2EC', border: 'none',
              borderRadius: 12, padding: '0.9rem', fontWeight: 700,
              fontSize: '0.9375rem', cursor: 'pointer', width: '100%',
              fontFamily: 'inherit', marginBottom: '0.75rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
            }}
          >
            Edit Savings by Account →
          </button>

          <p style={{ fontSize: '0.72rem', color: '#A09C93', textAlign: 'center' }}>
            Savings allocations do not affect income or expense reports
          </p>
        </div>
      </div>

      {/* Editor mounts on top of the breakdown sheet */}
      {showEditor && (
        <SavingsEditorModal
          accounts={accounts}
          savingsBreakdown={savingsBreakdown}
          transactions={transactions}
          onClose={() => setShowEditor(false)}
          onSaved={() => {
            setShowEditor(false);
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────
export function BalanceSplitCards({
  totalBalance, availableBalance, totalSavings,
  ghostMode, onToggleGhost,
  accounts = [], balances = {}, savingsBreakdown = {},
  transactions = [], onRefresh,
}) {
  const [showSavingsSheet, setShowSavingsSheet] = useState(false);

  return (
    <div>
      {/* Total Balance */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '1rem 1.125rem',
        marginBottom: '0.625rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: 'var(--shadow-card)',
      }}>
        <div>
          <p style={{
            fontSize: '0.65rem', color: 'var(--ink-3)', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            marginBottom: '0.3rem', fontFamily: 'var(--font-sans)',
          }}>
            Your Money
          </p>
          <p style={{
            fontSize: '1.625rem', fontWeight: 800,
            color: totalBalance >= 0 ? 'var(--ink-1)' : 'var(--accent-red)',
            fontFamily: 'var(--font-serif)', letterSpacing: '-0.01em',
          }}>
            {formatUSD(totalBalance)}
          </p>
          <p style={{ fontSize: '0.7rem', color: 'var(--ink-4)', marginTop: '0.2rem', fontFamily: 'var(--font-sans)' }}>
            Total income minus expenses (savings included)
          </p>
        </div>
        <button onClick={onToggleGhost} style={{
          background: ghostMode ? 'rgba(155,107,0,0.1)' : 'var(--bg-inset)',
          border: `1px solid ${ghostMode ? 'rgba(155,107,0,0.3)' : 'var(--border-strong)'}`,
          borderRadius: 8, padding: '0.4rem 0.625rem', cursor: 'pointer',
          color: ghostMode ? 'var(--accent-amber)' : 'var(--ink-3)',
          display: 'flex', alignItems: 'center', gap: '0.3rem',
          fontSize: '0.7rem', fontWeight: 700, fontFamily: 'var(--font-sans)',
          flexShrink: 0, marginLeft: '0.75rem',
        }}>
          {ghostMode ? <EyeOff size={13} /> : <Eye size={13} />}
          {ghostMode ? 'Show all' : 'Show all'}
        </button>
      </div>

      {/* Available + Savings */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: ghostMode ? '1fr' : '1fr 1fr',
        gap: '0.625rem',
        marginBottom: accounts.length > 0 ? '0.625rem' : 0,
      }}>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderLeft: `3px solid ${availableBalance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}`,
          borderRadius: 12, padding: '0.875rem 0.75rem',
          boxShadow: 'var(--shadow-card)',
        }}>
          <p style={{
            fontSize: '0.65rem',
            color: availableBalance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
            fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            marginBottom: '0.3rem', fontFamily: 'var(--font-sans)',
          }}>Available</p>
          <p style={{
            fontSize: '1.05rem', fontWeight: 800,
            color: availableBalance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
            fontFamily: 'var(--font-mono)',
          }}>{formatUSD(availableBalance)}</p>
          <p style={{ fontSize: '0.7rem', color: 'var(--ink-4)', marginTop: '0.2rem', fontFamily: 'var(--font-sans)' }}>
            Free to spend — savings not included
          </p>
        </div>

        {!ghostMode && (
          <button
            onClick={() => setShowSavingsSheet(true)}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderLeft: '3px solid var(--ink-3)',
              borderRadius: 12, padding: '0.875rem 0.75rem',
              boxShadow: 'var(--shadow-card)',
              cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
            }}
          >
            <p style={{
              fontSize: '0.65rem', color: 'var(--ink-3)', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              marginBottom: '0.3rem', fontFamily: 'var(--font-sans)',
            }}>Savings</p>
            <p style={{
              fontSize: '1.05rem', fontWeight: 800, color: 'var(--ink-2)',
              fontFamily: 'var(--font-mono)',
            }}>{formatUSD(totalSavings)}</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--ink-4)', marginTop: '0.2rem', fontFamily: 'var(--font-sans)' }}>
              Tap to see breakdown
            </p>
          </button>
        )}
      </div>

      {/* Account breakdown */}
      {accounts.length > 0 && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12, padding: '0.75rem 0.875rem',
          boxShadow: 'var(--shadow-card)',
        }}>
          <p style={{
            fontSize: '0.65rem', color: 'var(--ink-4)', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            marginBottom: '0.625rem', fontFamily: 'var(--font-sans)',
          }}>
            By Account
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {accounts.map((a) => {
              const bal = balances[a.id] || 0;
              const sav = savingsBreakdown[a.id] || 0;
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1rem' }}>{a.icon}</span>
                    <div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--ink-1)', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>{a.name}</p>
                      {!ghostMode && sav > 0 && (
                        <p style={{ fontSize: '0.7rem', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)' }}>🔒 {formatUSD(sav)} saved</p>
                      )}
                    </div>
                  </div>
                  <p style={{
                    fontWeight: 700,
                    color: bal >= 0 ? 'var(--ink-1)' : 'var(--accent-red)',
                    fontSize: '0.9rem', fontFamily: 'var(--font-mono)',
                  }}>
                    {formatUSD(bal)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Savings Breakdown Sheet */}
      {showSavingsSheet && (
        <SavingsBreakdownSheet
          totalSavings={totalSavings}
          accounts={accounts}
          savingsBreakdown={savingsBreakdown}
          transactions={transactions}
          onClose={() => setShowSavingsSheet(false)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}