import { formatUSD, getCategoryMeta } from '../../lib/constants';

export function CategoryBreakdown({ breakdown, type = 'expense' }) {
  const filtered = breakdown.filter((b) => (type === 'expense' ? b.expense > 0 : b.income > 0));
  if (!filtered.length) return null;

  const max = Math.max(...filtered.map((b) => type === 'expense' ? b.expense : b.income), 1);

  return (
    <div>
      {filtered
        .sort((a, b) => (type === 'expense' ? b.expense - a.expense : b.income - a.income))
        .map((b) => {
          const meta  = getCategoryMeta(b.category);
          const value = type === 'expense' ? b.expense : b.income;
          const pct   = Math.round((value / max) * 100);
          const color = type === 'expense' ? '#f43f5e' : '#22c55e';

          return (
            <div key={b.category} style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span>{meta.icon}</span> {meta.label}
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color }}>{formatUSD(value)}</span>
              </div>
              <div style={{ background: '#0f172a', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          );
        })}
    </div>
  );
}
