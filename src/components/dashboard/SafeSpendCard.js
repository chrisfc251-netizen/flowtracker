import { useNavigate } from 'react-router-dom';
import { computeSafeSpendable, getCashFlowStatus } from '../../lib/cashFlow';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
}

export function SafeSpendCard({ availableBalance, fixedExpenses, onAffordIt }) {
  const { safe, totalUpcoming } = computeSafeSpendable(availableBalance, fixedExpenses, 30);
  const status = getCashFlowStatus(safe);

  return (
    <div style={{
      background: status.bg, border: `1px solid ${status.border}`,
      borderRadius: 14, padding: '0.875rem 1rem',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem'
    }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '0.68rem', color: status.color, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
          {status.icon} Safe after bills
        </p>
        <p style={{ fontSize: '1.1rem', fontWeight: 800, color: safe < 0 ? '#f43f5e' : '#f1f5f9' }}>
          {fmt(safe)}
        </p>
        <p style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.15rem' }}>
          {fmt(totalUpcoming)} committed this month
        </p>
      </div>
      <button onClick={onAffordIt} style={{
        background: 'rgba(129,140,248,.15)', color: '#818cf8',
        border: '1px solid rgba(129,140,248,.3)', borderRadius: 10,
        padding: '0.5rem 0.75rem', fontWeight: 700, fontSize: '0.75rem',
        cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap'
      }}>
        🤔 Can I afford it?
      </button>
    </div>
  );
}