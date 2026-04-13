import { useState } from 'react';
import { generateSmartBudget, rebalanceBudget } from '../../lib/balanceEngine';
import { getCategoryMeta, EXPENSE_CATEGORIES } from '../../lib/constants';

function formatUSD(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
}

export function SmartBudgetPanel({ availableBalance, goals, categoryPriorities, existingExpenses, onApplyBudget }) {
  const [generated, setGenerated] = useState(null);
  const [loading, setLoading]     = useState(false);

  function generate() {
    setLoading(true);
    const result = generateSmartBudget({
      availableBalance,
      goals,
      categoryPriorities,
      existingExpenses,
    });
    setGenerated(result);
    setLoading(false);
  }

  const PRIORITY_COLORS = { high: '#22c55e', medium: '#f59e0b', low: '#64748b' };
  const priorityMap = {};
  for (const cp of categoryPriorities) priorityMap[cp.category] = cp.priority;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
          Smart Budget
        </p>
        <button onClick={generate} disabled={loading} style={{
          background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8,
          padding: '0.4rem 0.875rem', fontSize: '0.8rem', fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? 0.6 : 1
        }}>
          {loading ? 'Generating…' : generated ? 'Regenerate' : '✨ Generate'}
        </button>
      </div>

      {!generated && (
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.85rem', color: '#475569' }}>
            Generate a smart spending plan based on your available balance{goals.length > 0 ? ' and savings goals' : ''}.
          </p>
        </div>
      )}

      {generated && (
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: '1rem' }}>
          {/* Summary */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.875rem', paddingBottom: '0.75rem', borderBottom: '1px solid #334155' }}>
            <div>
              <p style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.2rem' }}>Spendable budget</p>
              <p style={{ fontWeight: 800, color: '#f1f5f9', fontSize: '1.1rem' }}>{formatUSD(generated.spendableBudget)}</p>
            </div>
            {generated.goalReserve > 0 && (
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.2rem' }}>Goal reserve</p>
                <p style={{ fontWeight: 700, color: '#818cf8', fontSize: '1rem' }}>{formatUSD(generated.goalReserve)}</p>
              </div>
            )}
          </div>

          {/* Explanation */}
          <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.875rem', lineHeight: 1.5 }}>
            💡 {generated.explanation}
          </p>

          {/* Category limits */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {EXPENSE_CATEGORIES.map((cat) => {
              const limit    = generated.limits[cat.value] || 0;
              const spent    = existingExpenses[cat.value] || 0;
              const pct      = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
              const over     = spent > limit;
              const priority = priorityMap[cat.value] || 'medium';

              return (
                <div key={cat.value}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.825rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      {cat.icon} {cat.label}
                      <span style={{ fontSize: '0.65rem', color: PRIORITY_COLORS[priority], fontWeight: 700, textTransform: 'uppercase' }}>
                        {priority}
                      </span>
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: over ? '#f43f5e' : '#94a3b8' }}>
                      {formatUSD(spent)} / {formatUSD(limit)}
                    </span>
                  </div>
                  <div style={{ background: '#0f172a', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: over ? '#f43f5e' : pct > 80 ? '#f59e0b' : '#22c55e', borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Apply button */}
          {onApplyBudget && (
            <button onClick={() => onApplyBudget(generated.limits)} style={{
              background: 'rgba(99,102,241,.15)', color: '#818cf8',
              border: '1px solid rgba(99,102,241,.3)', borderRadius: 8,
              padding: '0.625rem', fontWeight: 700, fontSize: '0.85rem',
              cursor: 'pointer', width: '100%', marginTop: '0.875rem', fontFamily: 'inherit'
            }}>
              Apply as Monthly Budgets
            </button>
          )}
        </div>
      )}
    </div>
  );
}