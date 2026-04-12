import { detectUnusualSpending, mostExpensiveWeekday, predictMonthEnd, annualSavingsProjection } from '../../lib/analytics';
import { getMonth, getYear } from 'date-fns';

function formatUSD(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);
}

function InsightRow({ emoji, text, color = '#94a3b8', bg = '#1e293b', border = '#334155' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
      background: bg, border: `1px solid ${border}`,
      borderRadius: 10, padding: '0.75rem 0.875rem'
    }}>
      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{emoji}</span>
      <p style={{ fontSize: '0.825rem', color, lineHeight: 1.5, margin: 0 }}>{text}</p>
    </div>
  );
}

export function InsightsCard({ transactions }) {
  const now      = new Date();
  const year     = getYear(now);
  const month    = getMonth(now);

  const unusual  = detectUnusualSpending(transactions);
  const weekday  = mostExpensiveWeekday(transactions);
  const predict  = predictMonthEnd(transactions, year, month);
  const annual   = annualSavingsProjection(transactions);

  const insights = [];

  if (unusual) {
    insights.push({
      emoji: '⚠️',
      text:  `Today you've spent ${formatUSD(unusual.todayExp)}, which is ${unusual.ratio}x your daily average of ${formatUSD(unusual.avgDay)}. Unusual spending detected.`,
      bg:    'rgba(244,63,94,.08)', border: 'rgba(244,63,94,.25)', color: '#fca5a5'
    });
  }

  if (predict) {
    const { projectedBalance, projectedExpense, daysLeft, onTrack } = predict;
    insights.push({
      emoji: onTrack ? '📈' : '📉',
      text:  onTrack
        ? `At this pace you'll end the month with ${formatUSD(projectedBalance)} left. ${daysLeft} days to go.`
        : `Warning: at this pace you'll overspend by ${formatUSD(Math.abs(projectedBalance))} by end of month.`,
      bg:    onTrack ? 'rgba(34,197,94,.08)'   : 'rgba(244,63,94,.08)',
      border: onTrack ? 'rgba(34,197,94,.25)' : 'rgba(244,63,94,.25)',
      color: onTrack ? '#86efac' : '#fca5a5'
    });
  }

  if (weekday && weekday.avg > 0) {
    insights.push({
      emoji: '📅',
      text:  `${weekday.label}s are your most expensive day — you average ${formatUSD(weekday.avg)} in spending. Consider planning ahead.`,
      bg: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.25)', color: '#fcd34d'
    });
  }

  if (annual && annual.avgMonthly > 0) {
    insights.push({
      emoji: annual.projected >= 0 ? '🎯' : '💡',
      text:  annual.projected >= 0
        ? `If you keep this pace, you'll save ${formatUSD(annual.projected)} this year. ${formatUSD(annual.remaining)} more to go.`
        : `Your average monthly balance is negative. Review your expenses to start building savings.`,
      bg: 'rgba(129,140,248,.08)', border: 'rgba(129,140,248,.25)', color: '#c4b5fd'
    });
  }

  if (insights.length === 0) {
    insights.push({
      emoji: '💡',
      text: 'Add more transactions to unlock spending insights and predictions.',
      bg: '#1e293b', border: '#334155', color: '#64748b'
    });
  }

  return (
    <div>
      <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.625rem' }}>
        Smart Insights
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {insights.map((ins, i) => (
          <InsightRow key={i} {...ins} />
        ))}
      </div>
    </div>
  );
}