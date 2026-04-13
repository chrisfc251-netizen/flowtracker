import { EXPENSE_CATEGORIES } from '../../lib/constants';

const PRIORITY_OPTIONS = ['high', 'medium', 'low'];
const PRIORITY_STYLES  = {
  high:   { color: '#22c55e', bg: 'rgba(34,197,94,.12)',   label: 'High — Never reduce'   },
  medium: { color: '#f59e0b', bg: 'rgba(245,158,11,.12)',  label: 'Medium — Reduce if needed' },
  low:    { color: '#64748b', bg: 'rgba(100,116,139,.12)', label: 'Low — Reduce first'    },
};

export function CategoryPrioritySettings({ getPriority, setPriority }) {
  return (
    <div>
      <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
        Category Priorities
      </p>
      <p style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '1rem', lineHeight: 1.5 }}>
        Set how important each spending category is. The smart budget will protect high-priority categories and reduce low-priority ones first.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {EXPENSE_CATEGORIES.map((cat) => {
          const current = getPriority(cat.value);
          const style   = PRIORITY_STYLES[current];

          return (
            <div key={cat.value} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1e293b', borderRadius: 10, padding: '0.75rem 0.875rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {cat.icon} {cat.label}
              </span>
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                {PRIORITY_OPTIONS.map((p) => {
                  const ps = PRIORITY_STYLES[p];
                  return (
                    <button key={p} onClick={() => setPriority(cat.value, p)} style={{
                      background: current === p ? ps.bg : 'transparent',
                      border: `1px solid ${current === p ? ps.color : '#334155'}`,
                      borderRadius: 6, padding: '0.3rem 0.5rem',
                      color: current === p ? ps.color : '#475569',
                      fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
                      textTransform: 'capitalize', fontFamily: 'inherit'
                    }}>
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}