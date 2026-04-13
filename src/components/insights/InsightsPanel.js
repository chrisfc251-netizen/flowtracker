import { useState } from 'react';
import { generateInsights, evaluateDecisions } from '../../lib/balanceEngine';
import { getCategoryMeta } from '../../lib/constants';

function formatUSD(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
}

const TYPE_STYLES = {
  reduction: { bg: 'rgba(99,102,241,.08)',  border: 'rgba(99,102,241,.2)',  color: '#818cf8',  icon: '📉' },
  warning:   { bg: 'rgba(245,158,11,.08)',  border: 'rgba(245,158,11,.2)',  color: '#f59e0b',  icon: '⚠️' },
  savings:   { bg: 'rgba(244,63,94,.08)',   border: 'rgba(244,63,94,.2)',   color: '#f43f5e',  icon: '🏦' },
  positive:  { bg: 'rgba(34,197,94,.08)',   border: 'rgba(34,197,94,.2)',   color: '#22c55e',  icon: '✅' },
  critical:  { bg: 'rgba(244,63,94,.12)',   border: 'rgba(244,63,94,.35)',  color: '#f43f5e',  icon: '🚨' },
  goal:      { bg: 'rgba(129,140,248,.08)', border: 'rgba(129,140,248,.2)', color: '#818cf8',  icon: '🎯' },
};

export function InsightsPanel({ transactions, goals, budgets }) {
  const [expanded, setExpanded] = useState(false);

  const insights  = generateInsights({ transactions, goals });
  const decisions = evaluateDecisions({ transactions, budgets });

  const visibleInsights = expanded ? insights : insights.slice(0, 2);

  if (insights.length === 0 && decisions.negatives.length === 0) {
    return (
      <div style={{ background: 'rgba(34,197,94,.07)', border: '1px solid rgba(34,197,94,.2)', borderRadius: 12, padding: '0.875rem' }}>
        <p style={{ fontSize: '0.8rem', color: '#22c55e', fontWeight: 600 }}>✅ No issues detected in this period. Keep it up!</p>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.625rem' }}>
        Financial Insights
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {visibleInsights.map((ins, i) => {
          const s = TYPE_STYLES[ins.type] || TYPE_STYLES.warning;
          return (
            <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: '0.75rem 0.875rem', display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>{s.icon}</span>
              <p style={{ fontSize: '0.82rem', color: s.color, lineHeight: 1.55, margin: 0, fontWeight: ins.type === 'critical' ? 700 : 400 }}>
                {ins.message}
              </p>
            </div>
          );
        })}

        {insights.length > 2 && (
          <button onClick={() => setExpanded((p) => !p)} style={{
            background: 'transparent', border: '1px solid #334155', borderRadius: 8,
            color: '#64748b', padding: '0.5rem', fontSize: '0.8rem', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit'
          }}>
            {expanded ? '▲ Show less' : `▼ Show ${insights.length - 2} more insights`}
          </button>
        )}

        {/* Decision summary */}
        {(decisions.positives.length > 0 || decisions.negatives.length > 0) && (
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '0.875rem' }}>
            <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.625rem' }}>
              Decision Reflection
            </p>

            {decisions.positives[0] && (
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span>👍</span>
                <p style={{ fontSize: '0.8rem', color: '#22c55e', lineHeight: 1.5 }}>
                  <strong>Best decision:</strong> You stayed ${formatUSD(decisions.positives[0].under)} under your {decisions.positives[0].category} budget (${formatUSD(decisions.positives[0].spent)} of ${formatUSD(decisions.positives[0].limit)}).
                </p>
              </div>
            )}

            {decisions.negatives[0] && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span>👎</span>
                <p style={{ fontSize: '0.8rem', color: '#f43f5e', lineHeight: 1.5 }}>
                  <strong>Area to improve:</strong> You exceeded your {decisions.negatives[0].category} budget by ${formatUSD(decisions.negatives[0].over)} (${formatUSD(decisions.negatives[0].spent)} vs ${formatUSD(decisions.negatives[0].limit)} limit).
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Pre-transaction warning ───────────────────────────────────────────────
export function SpendingWarning({ amount, category, availableBalance, budgets }) {
  if (!amount || amount <= 0) return null;

  const budget        = budgets.find((b) => b.category === category);
  const willExceedBal = amount > availableBalance;
  const willExceedBud = budget && amount > (budget.amount_limit - (budget.spent || 0));

  if (!willExceedBal && !willExceedBud) return null;

  return (
    <div style={{ background: 'rgba(244,63,94,.1)', border: '1px solid rgba(244,63,94,.3)', borderRadius: 8, padding: '0.625rem 0.875rem', marginTop: '0.5rem' }}>
      <p style={{ fontSize: '0.8rem', color: '#f43f5e', fontWeight: 600, margin: 0 }}>
        ⚠️ {willExceedBal
          ? `This expense exceeds your available balance ($${availableBalance.toFixed(2)}).`
          : `This will exceed your ${category} budget by $${(amount - (budget.amount_limit - (budget.spent || 0))).toFixed(2)}.`}
      </p>
    </div>
  );
}