import { EXPENSE_CATEGORIES } from '../../lib/constants';

const PRIORITY_OPTIONS = ['high', 'medium', 'low'];
const PRIORITY_STYLES  = {
  high:   { color: 'var(--accent-green)',  bg: 'rgba(26,107,58,0.1)',   border: 'rgba(26,107,58,0.35)',  label: 'High'   },
  medium: { color: 'var(--accent-amber)',  bg: 'rgba(155,107,0,0.1)',   border: 'rgba(155,107,0,0.35)',  label: 'Medium' },
  low:    { color: 'var(--ink-3)',         bg: 'rgba(26,26,24,0.06)',   border: 'rgba(26,26,24,0.2)',    label: 'Low'    },
};

export function CategoryPrioritySettings({ getPriority, setPriority }) {
  return (
    <div>
      <p style={{
        fontSize: '0.7rem', color: 'var(--ink-3)', fontWeight: 700,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        marginBottom: '0.5rem', fontFamily: 'var(--font-sans)'
      }}>
        Category Priorities
      </p>
      <p style={{
        fontSize: '0.8rem', color: 'var(--ink-3)', marginBottom: '1rem',
        lineHeight: 1.6, fontFamily: 'var(--font-sans)'
      }}>
        High-priority categories are protected first when rebalancing. Low-priority ones are reduced first.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {EXPENSE_CATEGORIES.map((cat) => {
          const current = getPriority(cat.value);
          const style   = PRIORITY_STYLES[current];

          return (
            <div key={cat.value} style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 10, padding: '0.625rem 0.875rem'
            }}>
              <span style={{
                fontSize: '0.875rem', color: 'var(--ink-1)',
                fontWeight: 500, fontFamily: 'var(--font-sans)',
                display: 'flex', alignItems: 'center', gap: '0.5rem'
              }}>
                {cat.icon} {cat.label}
              </span>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                {PRIORITY_OPTIONS.map((p) => {
                  const ps = PRIORITY_STYLES[p];
                  const isActive = current === p;
                  return (
                    <button key={p} onClick={() => setPriority(cat.value, p)} style={{
                      background: isActive ? ps.bg : 'transparent',
                      border: `1px solid ${isActive ? ps.border : 'var(--border-strong)'}`,
                      borderRadius: 6, padding: '0.25rem 0.5rem',
                      color: isActive ? ps.color : 'var(--ink-4)',
                      fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
                      textTransform: 'capitalize', fontFamily: 'var(--font-sans)',
                      transition: 'all 0.15s',
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

