import { differenceInDays, parseISO, format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
}

export function UrgencyAlerts({ fixedExpenses = [], budgetStatus = [] }) {
  const navigate = useNavigate();

  // Bills due in next 3 days
  const urgentBills = fixedExpenses
    .filter((e) => {
      const days = differenceInDays(parseISO(e.next_due_date), new Date());
      return days >= 0 && days <= 3;
    })
    .slice(0, 2);

  // Budgets over limit
  const overBudgets = budgetStatus.filter((b) => b.over).slice(0, 2);

  if (urgentBills.length === 0 && overBudgets.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {urgentBills.map((bill) => {
        const days = differenceInDays(parseISO(bill.next_due_date), new Date());
        const label = days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `Due in ${days}d`;
        return (
          <div key={bill.id} onClick={() => navigate('/planning')} style={{
            background: 'rgba(244,63,94,.08)', border: '1px solid rgba(244,63,94,.2)',
            borderRadius: 12, padding: '0.75rem 1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <span style={{ fontSize: '1rem' }}>⚡</span>
              <div>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>{bill.name}</p>
                <p style={{ fontSize: '0.72rem', color: '#f43f5e', fontWeight: 600 }}>{label}</p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f43f5e' }}>{fmt(bill.amount)}</p>
              <p style={{ fontSize: '0.68rem', color: '#64748b' }}>Tap to pay →</p>
            </div>
          </div>
        );
      })}

      {overBudgets.map((b) => (
        <div key={b.category} onClick={() => navigate('/planning')} style={{
          background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)',
          borderRadius: 12, padding: '0.75rem 1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span style={{ fontSize: '1rem' }}>⚠️</span>
            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9', textTransform: 'capitalize' }}>{b.category} over budget</p>
              <p style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 600 }}>
                +{fmt(b.spent - (b.effectiveBudget || b.amount_limit))} over limit
              </p>
            </div>
          </div>
          <p style={{ fontSize: '0.68rem', color: '#64748b' }}>Tap to view →</p>
        </div>
      ))}
    </div>
  );
}