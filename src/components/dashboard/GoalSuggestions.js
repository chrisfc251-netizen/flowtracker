import { goalWeeklySuggestion } from '../../lib/analytics';

function formatUSD(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
}

export function GoalSuggestions({ goals }) {
  const active = goals.filter((g) => {
    const pct = Number(g.current_amount || 0) / Number(g.target_amount || 1);
    return pct < 1 && g.target_date;
  });

  if (active.length === 0) return null;

  return (
    <div>
      <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.625rem' }}>
        Goal Roadmap
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {active.map((goal) => {
          const sug = goalWeeklySuggestion(goal);
          if (!sug) return null;
          const remaining = Number(goal.target_amount) - Number(goal.current_amount || 0);
          const pct = Math.round((Number(goal.current_amount || 0) / Number(goal.target_amount)) * 100);

          return (
            <div key={goal.id} style={{
              background: 'rgba(129,140,248,.08)', border: '1px solid rgba(129,140,248,.2)',
              borderRadius: 12, padding: '0.875rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <p style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.9rem' }}>{goal.name}</p>
                <span style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 700 }}>{pct}%</span>
              </div>

              <div style={{ background: '#0f172a', borderRadius: 999, height: 6, marginBottom: '0.625rem', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: '#818cf8', borderRadius: 999, transition: 'width .5s' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <div>
                  <p style={{ color: '#64748b', marginBottom: '0.1rem' }}>Still needed</p>
                  <p style={{ color: '#f1f5f9', fontWeight: 700 }}>{formatUSD(remaining)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: '#64748b', marginBottom: '0.1rem' }}>Save per week</p>
                  <p style={{ color: '#818cf8', fontWeight: 800, fontSize: '0.95rem' }}>{formatUSD(sug.weekly)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: '#64748b', marginBottom: '0.1rem' }}>Weeks left</p>
                  <p style={{ color: '#f1f5f9', fontWeight: 700 }}>{sug.weeks}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}