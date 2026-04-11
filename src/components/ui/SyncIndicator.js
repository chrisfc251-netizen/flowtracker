export function SyncIndicator({ state }) {
  const configs = {
    saving: { color: '#f59e0b', label: 'Saving…',  dot: true },
    saved:  { color: '#22c55e', label: 'Saved ✓',  dot: false },
    error:  { color: '#f43f5e', label: 'Error',     dot: false },
    idle:   { color: '#64748b', label: 'Synced',    dot: false }
  };
  const c = configs[state] || configs.idle;

  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: c.color, letterSpacing: '0.05em' }}>
      {c.dot
        ? <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, animation: 'pulse 1s infinite' }} />
        : <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color }} />
      }
      {c.label}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>
    </span>
  );
}
