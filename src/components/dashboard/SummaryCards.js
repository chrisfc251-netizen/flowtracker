import { formatUSD } from '../../lib/constants';

export function SummaryCards({ income, expense, balance }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.625rem' }}>
      <div style={{ background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)', borderRadius: 12, padding: '0.875rem 0.75rem' }}>
        <p style={{ fontSize: '0.65rem', color: '#22c55e', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '0.4rem' }}>INCOME</p>
        <p style={{ fontSize: '1rem', fontWeight: 700, color: '#22c55e' }}>{formatUSD(income)}</p>
      </div>
      <div style={{ background: 'rgba(244,63,94,.08)', border: '1px solid rgba(244,63,94,.2)', borderRadius: 12, padding: '0.875rem 0.75rem' }}>
        <p style={{ fontSize: '0.65rem', color: '#f43f5e', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '0.4rem' }}>EXPENSES</p>
        <p style={{ fontSize: '1rem', fontWeight: 700, color: '#f43f5e' }}>{formatUSD(expense)}</p>
      </div>
      <div style={{
        background: balance >= 0 ? 'rgba(129,140,248,.08)' : 'rgba(244,63,94,.08)',
        border: `1px solid ${balance >= 0 ? 'rgba(129,140,248,.2)' : 'rgba(244,63,94,.2)'}`,
        borderRadius: 12, padding: '0.875rem 0.75rem'
      }}>
        <p style={{ fontSize: '0.65rem', color: balance >= 0 ? '#818cf8' : '#f43f5e', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '0.4rem' }}>BALANCE</p>
        <p style={{ fontSize: '1rem', fontWeight: 700, color: balance >= 0 ? '#818cf8' : '#f43f5e' }}>{formatUSD(balance)}</p>
      </div>
    </div>
  );
}
