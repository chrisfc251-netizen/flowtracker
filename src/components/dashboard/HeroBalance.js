import { Eye, EyeOff } from 'lucide-react';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
}

export function HeroBalance({ totalBalance, availableBalance, totalSavings, ghostMode, onToggleGhost }) {
  const isNegative = availableBalance < 0;
  const isLow      = availableBalance >= 0 && availableBalance < 200;
  const statusColor  = isNegative ? '#f43f5e' : isLow ? '#f59e0b' : '#22c55e';
  const statusLabel  = isNegative ? 'Negative' : isLow ? 'Low' : 'Healthy';
  const statusIcon   = isNegative ? '🚨' : isLow ? '⚠️' : '✅';

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      border: '1px solid #334155', borderRadius: 20,
      padding: '1.5rem 1.25rem 1.25rem',
    }}>
      {/* Label */}
      <p style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
        Available to Spend
      </p>

      {/* Hero number */}
      <p style={{ fontSize: '2.5rem', fontWeight: 900, color: isNegative ? '#f43f5e' : '#f1f5f9', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '0.625rem' }}>
        {fmt(availableBalance)}
      </p>

      {/* Status bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <div style={{ flex: 1, height: 4, background: '#334155', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2, background: statusColor,
            width: totalBalance > 0 ? `${Math.min((availableBalance / totalBalance) * 100, 100)}%` : '0%',
            transition: 'width .5s ease'
          }} />
        </div>
        <span style={{ fontSize: '0.72rem', color: statusColor, fontWeight: 700 }}>
          {statusIcon} {statusLabel}
        </span>
      </div>

      {/* Secondary row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1.25rem' }}>
          <div>
            <p style={{ fontSize: '0.65rem', color: '#475569', marginBottom: '0.15rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total</p>
            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#94a3b8' }}>{fmt(totalBalance)}</p>
          </div>
          {!ghostMode && (
            <div>
              <p style={{ fontSize: '0.65rem', color: '#475569', marginBottom: '0.15rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Savings</p>
              <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#818cf8' }}>{fmt(totalSavings)}</p>
            </div>
          )}
        </div>

        {/* Ghost mode toggle */}
        <button onClick={onToggleGhost} style={{
          background: ghostMode ? 'rgba(245,158,11,.15)' : 'rgba(100,116,139,.1)',
          border: `1px solid ${ghostMode ? 'rgba(245,158,11,.3)' : '#334155'}`,
          borderRadius: 20, padding: '0.3rem 0.75rem', cursor: 'pointer',
          color: ghostMode ? '#f59e0b' : '#64748b',
          display: 'flex', alignItems: 'center', gap: '0.3rem',
          fontSize: '0.7rem', fontWeight: 700, fontFamily: 'inherit'
        }}>
          {ghostMode ? <EyeOff size={12} /> : <Eye size={12} />}
          {ghostMode ? 'Ghost ON' : 'Ghost'}
        </button>
      </div>
    </div>
  );
}