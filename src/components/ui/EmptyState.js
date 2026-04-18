// ── EmptyState ────────────────────────────────────────────────────────────
export function EmptyState({ icon = '📭', title, subtitle, action, onAction }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '2.5rem 1.5rem',
      background: '#1e293b',
      border: '1px dashed #334155',
      borderRadius: 16,
    }}>
      <div style={{ fontSize: '2.25rem', marginBottom: '0.75rem' }}>{icon}</div>
      <p style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: '0.35rem', fontSize: '0.95rem' }}>
        {title}
      </p>
      {subtitle && (
        <p style={{ fontSize: '0.825rem', color: '#475569', lineHeight: 1.6, marginBottom: action ? '1.125rem' : 0 }}>
          {subtitle}
        </p>
      )}
      {action && (
        <button
          onClick={onAction}
          style={{
            background: '#818cf8', color: '#fff',
            border: 'none', borderRadius: 10,
            padding: '0.625rem 1.25rem',
            fontWeight: 700, fontSize: '0.875rem',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {action}
        </button>
      )}
    </div>
  );
}

// ── Skeleton loader ────────────────────────────────────────────────────────
export function SkeletonCard({ height = 80, style = {} }) {
  return (
    <div style={{
      height, borderRadius: 14,
      background: 'linear-gradient(90deg, #1e293b 25%, #253347 50%, #1e293b 75%)',
      backgroundSize: '200% 100%',
      animation: 'skeleton-shimmer 1.5s infinite',
      ...style,
    }} />
  );
}

// ── Inline spinner ────────────────────────────────────────────────────────
export function Spinner({ size = 20, color = '#818cf8' }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth="2.5"
      strokeLinecap="round"
      style={{ animation: 'spin 0.75s linear infinite' }}
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

// ── PageLoader (full-screen) ──────────────────────────────────────────────
export function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh',
    }}>
      <Spinner size={28} />
    </div>
  );
}