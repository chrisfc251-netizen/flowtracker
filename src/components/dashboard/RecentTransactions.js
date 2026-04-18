import { useNavigate } from 'react-router-dom';
import { getCategoryMeta } from '../../lib/constants';
import { format, parseISO, isToday, isYesterday } from 'date-fns';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
}

function dateLabel(dateStr) {
  const d = parseISO(dateStr);
  if (isToday(d))     return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
}

export function RecentTransactions({ transactions }) {
  const navigate = useNavigate();
  const recent   = transactions.slice(0, 3);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
          Recent
        </p>
        <button onClick={() => navigate('/transactions')} style={{
          background: 'transparent', border: 'none', color: '#818cf8',
          fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
        }}>
          See all →
        </button>
      </div>

      {recent.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: '#475569', textAlign: 'center', padding: '1rem 0' }}>
          No transactions yet
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {recent.map((t) => {
            const meta = getCategoryMeta(t.category);
            return (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.625rem 0.875rem',
                background: '#1e293b', borderRadius: 12, border: '1px solid #334155'
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: t.type === 'income' ? 'rgba(34,197,94,.12)' : 'rgba(244,63,94,.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1rem', flexShrink: 0
                }}>
                  {meta.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.description || meta.label}
                  </p>
                  <p style={{ fontSize: '0.72rem', color: '#475569' }}>{dateLabel(t.date)}</p>
                </div>
                <p style={{ fontWeight: 700, fontSize: '0.9rem', color: t.type === 'income' ? '#22c55e' : '#f1f5f9', flexShrink: 0 }}>
                  {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}