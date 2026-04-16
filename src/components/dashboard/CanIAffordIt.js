import { useState } from 'react';
import { simulatePurchase } from '../../lib/cashFlow';
import { EXPENSE_CATEGORIES } from '../../lib/constants';

function formatUSD(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
}

const VERDICT_STYLES = {
  YES:     { color: '#22c55e', bg: 'rgba(34,197,94,.12)',  border: 'rgba(34,197,94,.3)',  label: '✅ Yes, you can afford it'    },
  CAUTION: { color: '#f59e0b', bg: 'rgba(245,158,11,.12)', border: 'rgba(245,158,11,.3)', label: '⚠️ Proceed with caution'      },
  NO:      { color: '#f43f5e', bg: 'rgba(244,63,94,.12)',  border: 'rgba(244,63,94,.3)',  label: '❌ Not recommended right now' },
};

export function CanIAffordIt({ availableBalance, fixedExpenses, budgets, effectiveBudgets, goals, onClose }) {
  const [amount,   setAmount]   = useState('');
  const [category, setCategory] = useState('food');
  const [result,   setResult]   = useState(null);

  // Build effective budget lookup for the simulator
  // effectiveBudgets takes priority over raw budgets
  const budgetsForSim = (effectiveBudgets && effectiveBudgets.length > 0 ? effectiveBudgets : budgets)
    .map((b) => ({
      ...b,
      // simulator uses amount_limit — remap effectiveBudget to it
      amount_limit: b.effectiveBudget != null ? b.effectiveBudget : b.amount_limit,
    }));

  function simulate() {
    if (!amount || Number(amount) <= 0) return;
    const res = simulatePurchase({
      purchaseAmount: Number(amount),
      category,
      currentBalance: availableBalance,
      fixedExpenses,
      budgets: budgetsForSim,
      goals,
      dailySpendRate: availableBalance / 30,
    });
    setResult(res);
  }

  const S = {
    inp:   { background: '#0f172a', border: '1px solid #334155', borderRadius: 10, color: '#f1f5f9', padding: '0.75rem 1rem', fontSize: '1rem', width: '100%', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
    label: { display: 'block', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.4rem' },
  };

  // Show effective budget hint for selected category
  const selEffective = budgetsForSim.find((b) => b.category === category);
  const selOriginal  = budgets.find((b) => b.category === category);
  const hasRedist    = selEffective && selOriginal && selEffective.amount_limit !== selOriginal.amount_limit;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1e293b', borderRadius: '20px 20px 0 0', border: '1px solid #334155', width: '100%', maxWidth: 600, padding: '1.5rem 1.25rem 2rem', maxHeight: '90dvh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ color: '#f1f5f9' }}>Can I Afford It?</h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>Simulate a purchase without spending</p>
          </div>
          <button onClick={onClose} style={{ background: '#334155', border: 'none', borderRadius: 8, color: '#94a3b8', width: 30, height: 30, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={S.label}>How much does it cost?</label>
            <input type="number" inputMode="decimal" placeholder="0.00" value={amount}
              onChange={(e) => { setAmount(e.target.value); setResult(null); }}
              style={{ ...S.inp, fontSize: '1.5rem', fontWeight: 800, textAlign: 'center' }} />
          </div>

          <div>
            <label style={S.label}>Category</label>
            <select value={category} onChange={(e) => { setCategory(e.target.value); setResult(null); }} style={S.inp}>
              {EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
            </select>
            {/* Show effective budget hint */}
            {selEffective && (
              <div style={{ marginTop: '0.375rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: '#64748b' }}>Budget available:</span>
                <span style={{ color: hasRedist ? '#818cf8' : '#94a3b8', fontWeight: 700 }}>
                  {formatUSD(selEffective.amount_limit)}
                  {hasRedist && <span style={{ color: '#818cf8', marginLeft: '0.25rem' }}>
                    (base {formatUSD(selOriginal.amount_limit)} + redistribution)
                  </span>}
                </span>
              </div>
            )}
          </div>
        </div>

        <button onClick={simulate} disabled={!amount || Number(amount) <= 0} style={{
          background: '#818cf8', color: '#fff', border: 'none', borderRadius: 10,
          padding: '0.875rem', fontWeight: 700, fontSize: '0.9375rem',
          cursor: !amount ? 'not-allowed' : 'pointer', width: '100%',
          fontFamily: 'inherit', opacity: !amount ? 0.5 : 1, marginBottom: '1.25rem'
        }}>
          Analyze
        </button>

        {result && (() => {
          const vs = VERDICT_STYLES[result.verdict];
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ background: vs.bg, border: `1px solid ${vs.border}`, borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
                <p style={{ fontSize: '1.1rem', fontWeight: 800, color: vs.color, marginBottom: '0.375rem' }}>{vs.label}</p>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>{result.reason}</p>
              </div>

              <div style={{ background: '#0f172a', borderRadius: 12, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { label: 'Purchase amount',         value: formatUSD(result.amount),        color: '#f43f5e' },
                  { label: 'Safe available balance',   value: formatUSD(result.safe),          color: '#f1f5f9' },
                  { label: 'After purchase',           value: formatUSD(result.afterPurchase), color: result.afterPurchase < 0 ? '#f43f5e' : '#22c55e' },
                  { label: 'Upcoming bills (30 days)', value: formatUSD(result.totalUpcoming), color: '#f59e0b' },
                  result.budgetLeft !== null && {
                    label: `${category} effective budget left`,
                    value: formatUSD(result.budgetLeft),
                    color: result.exceedsBudget ? '#f43f5e' : '#22c55e'
                  },
                ].filter(Boolean).map((row) => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: '#64748b' }}>{row.label}</span>
                    <span style={{ fontWeight: 700, color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {result.verdict === 'NO' && result.waitDays && (
                <div style={{ background: 'rgba(129,140,248,.08)', border: '1px solid rgba(129,140,248,.2)', borderRadius: 10, padding: '0.875rem' }}>
                  <p style={{ fontSize: '0.85rem', color: '#818cf8', fontWeight: 600 }}>
                    💡 If you wait ~{result.waitDays} days, you may be able to afford this comfortably.
                  </p>
                </div>
              )}

              {result.goalImpacts.length > 0 && (
                <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 10, padding: '0.875rem' }}>
                  <p style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 700, marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Goal Impact</p>
                  {result.goalImpacts.map((g) => (
                    <p key={g.name} style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                      🎯 <strong style={{ color: '#f1f5f9' }}>{g.name}</strong> delayed ~{g.delayDays}d
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}