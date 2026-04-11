export function EmptyState({ icon = '📭', title, subtitle, action }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '3rem 1.5rem', gap: '0.75rem', textAlign: 'center'
    }}>
      <span style={{ fontSize: '3rem' }}>{icon}</span>
      <h3 style={{ color: '#f1f5f9', fontSize: '1rem' }}>{title}</h3>
      {subtitle && <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: 260 }}>{subtitle}</p>}
      {action && <div style={{ marginTop: '0.5rem' }}>{action}</div>}
    </div>
  );
}
