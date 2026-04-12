import { computeFinancialScore, scoreLabel } from '../../lib/analytics';

export function FinancialScoreCard({ income, expense, balance, budgetStatus }) {
  const score = computeFinancialScore({
    income, expense, balance, budgetStatus,
    savingsRate: income > 0 ? balance / income : 0,
    streak: 0
  });
  const { label, color } = scoreLabel(score);

  const circumference = 2 * Math.PI * 36;
  const offset        = circumference * (1 - score / 100);

  return (
    <div style={{
      background: '#1e293b', border: '1px solid #334155', borderRadius: 14,
      padding: '1.125rem', display: 'flex', alignItems: 'center', gap: '1.25rem'
    }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <svg width={88} height={88} viewBox="0 0 88 88">
          <circle cx={44} cy={44} r={36} fill="none" stroke="#0f172a" strokeWidth={8} />
          <circle
            cx={44} cy={44} r={36} fill="none"
            stroke={color} strokeWidth={8}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 44 44)"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
          <span style={{ fontWeight: 800, fontSize: '1.25rem', color, lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 600 }}>/ 100</span>
        </div>
      </div>

      <div>
        <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
          Financial Score
        </p>
        <p style={{ fontWeight: 800, fontSize: '1.1rem', color, marginBottom: '0.375rem' }}>{label}</p>
        <p style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5 }}>
          {score >= 85 && 'Outstanding habits. Keep it up!'}
          {score >= 70 && score < 85 && 'Solid control over your finances.'}
          {score >= 50 && score < 70 && 'Room to improve your savings rate.'}
          {score < 50  && 'Focus on reducing expenses this month.'}
        </p>
      </div>
    </div>
  );
}