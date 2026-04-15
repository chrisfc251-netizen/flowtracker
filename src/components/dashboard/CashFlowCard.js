import { getUpcomingExpenses, computeSafeSpendable, getCashFlowStatus } from '../../lib/cashFlow';
import { format, parseISO } from 'date-fns';

function formatUSD(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
}

export function CashFlowCard({ availableBalance, fixedExpenses, days = 30 }) {
  const { safe, totalUpcoming } = computeSafeSpendable(availableBalance, fixedExpenses, days);
  const status   = getCashFlowStatus(safe);
  const upcoming = getUpcomingExpenses(fixedExpenses, days);

  return (
    <div style={{ background: status.bg, border: `1px solid ${status.border}`, borderRadius: 14, padding: '1rem 1.125rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <p style={{ fontSize: '0.7rem', color: status.color, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {status.icon} Safe to Spend
        </p>
        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Next {days} days</span>
      </div>

      <p style={{ fontSize: '1.5rem', fontWeight: 800, color: safe >= 0 ? status.color : '#f43f5e', marginBottom: '0.375rem' }}>
        {formatUSD(safe)}
      </p>

      <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
        {formatUSD(availableBalance)} available − {formatUSD(totalUpcoming)} in upcoming bills
      </p>

      {upcoming.length > 0 && (
        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: `1px solid ${status.border}` }}>
          <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Upcoming bills
          </p>
          {upcoming.slice(0, 3).map((e) => (
            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
              <span style={{ color: '#94a3b8' }}>{e.name}</span>
              <span style={{ color: '#f43f5e', fontWeight: 700 }}>
                {formatUSD(e.amount)} · {format(parseISO(e.next_due_date), 'MMM d')}
              </span>
            </div>
          ))}
          {upcoming.length > 3 && (
            <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.25rem' }}>+{upcoming.length - 3} more</p>
          )}
        </div>
      )}
    </div>
  );
}