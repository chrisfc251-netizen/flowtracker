import { Eye, EyeOff } from 'lucide-react';

function formatUSD(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
}

export function BalanceSplitCards({ totalBalance, availableBalance, totalSavings, ghostMode, onToggleGhost, accounts = [], balances = {}, savingsBreakdown = {} }) {
  return (
    <div>
      {/* Total Balance */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,.15), rgba(129,140,248,.08))',
        border: '1px solid rgba(99,102,241,.3)', borderRadius: 14,
        padding: '1rem 1.125rem', marginBottom: '0.625rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div>
          <p style={{ fontSize: '0.7rem', color: '#818cf8', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
            Total Balance
          </p>
          <p style={{ fontSize: '1.5rem', fontWeight: 800, color: totalBalance >= 0 ? '#f1f5f9' : '#f43f5e' }}>
            {formatUSD(totalBalance)}
          </p>
        </div>
        <button onClick={onToggleGhost} style={{
          background: ghostMode ? 'rgba(245,158,11,.15)' : 'rgba(129,140,248,.12)',
          border: `1px solid ${ghostMode ? 'rgba(245,158,11,.3)' : 'rgba(129,140,248,.2)'}`,
          borderRadius: 8, padding: '0.4rem 0.625rem', cursor: 'pointer',
          color: ghostMode ? '#f59e0b' : '#818cf8',
          display: 'flex', alignItems: 'center', gap: '0.3rem',
          fontSize: '0.7rem', fontWeight: 700, fontFamily: 'inherit'
        }}>
          {ghostMode ? <EyeOff size={13} /> : <Eye size={13} />}
          {ghostMode ? 'Ghost ON' : 'Ghost OFF'}
        </button>
      </div>

      {/* Available + Savings */}
      <div style={{ display: 'grid', gridTemplateColumns: ghostMode ? '1fr' : '1fr 1fr', gap: '0.625rem', marginBottom: accounts.length > 0 ? '0.625rem' : 0 }}>
        <div style={{
          background: availableBalance >= 0 ? 'rgba(34,197,94,.08)' : 'rgba(244,63,94,.08)',
          border: `1px solid ${availableBalance >= 0 ? 'rgba(34,197,94,.2)' : 'rgba(244,63,94,.2)'}`,
          borderRadius: 12, padding: '0.875rem 0.75rem'
        }}>
          <p style={{ fontSize: '0.65rem', color: availableBalance >= 0 ? '#22c55e' : '#f43f5e', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Available</p>
          <p style={{ fontSize: '1.05rem', fontWeight: 800, color: availableBalance >= 0 ? '#22c55e' : '#f43f5e' }}>{formatUSD(availableBalance)}</p>
          <p style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.2rem' }}>Free to spend</p>
        </div>

        {!ghostMode && (
          <div style={{ background: 'rgba(129,140,248,.08)', border: '1px solid rgba(129,140,248,.2)', borderRadius: 12, padding: '0.875rem 0.75rem' }}>
            <p style={{ fontSize: '0.65rem', color: '#818cf8', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Savings</p>
            <p style={{ fontSize: '1.05rem', fontWeight: 800, color: '#818cf8' }}>{formatUSD(totalSavings)}</p>
            <p style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.2rem' }}>Reserved</p>
          </div>
        )}
      </div>

      {/* Account breakdown */}
      {accounts.length > 0 && (
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '0.75rem 0.875rem' }}>
          <p style={{ fontSize: '0.65rem', color: '#475569', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.625rem' }}>
            By Account
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {accounts.map((a) => {
              const bal  = balances[a.id] || 0;
              const sav  = savingsBreakdown[a.id] || 0;
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1rem' }}>{a.icon}</span>
                    <div>
                      <p style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>{a.name}</p>
                      {!ghostMode && sav > 0 && (
                        <p style={{ fontSize: '0.7rem', color: '#818cf8' }}>🔒 {formatUSD(sav)} saved</p>
                      )}
                    </div>
                  </div>
                  <p style={{ fontWeight: 700, color: bal >= 0 ? '#f1f5f9' : '#f43f5e', fontSize: '0.9rem' }}>
                    {formatUSD(bal)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}