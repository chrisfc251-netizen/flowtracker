import { Zap } from 'lucide-react';

const FEATURE_COPY = {
  unlimited_goals:    { title: 'Unlimited Goals',      desc: 'Free plan includes 2 goals. Upgrade to track as many as you need.' },
  unlimited_accounts: { title: 'Multiple Accounts',    desc: 'Free plan includes 1 account. Upgrade to track all your accounts.' },
  unlimited_budgets:  { title: 'Unlimited Budgets',    desc: 'Free plan includes 3 categories. Upgrade for complete budget control.' },
  rebalance:          { title: 'Auto-Rebalance',        desc: 'Automatically redistribute your budget when you overspend.' },
  smart_budget:       { title: 'Smart Budget',          desc: 'Generate a budget from your balance and goals automatically.' },
  full_history:       { title: 'Full History',          desc: 'Free plan shows 3 months. Upgrade for unlimited transaction history.' },
  fixed_expenses:     { title: 'Fixed Expense Tracking', desc: 'Track recurring bills with projections and next-due dates.' },
  export:             { title: 'Data Export',           desc: 'Export your transactions as CSV for tax prep or analysis.' },
  projections:        { title: 'Spending Projections',  desc: 'See where your spending is headed before the month ends.' },
};

/**
 * <ProUpgradePrompt feature="rebalance" />
 * <ProUpgradePrompt feature="unlimited_goals" compact />
 */
export function ProUpgradePrompt({ feature, compact = false, onUpgrade }) {
  const copy = FEATURE_COPY[feature] || {
    title: 'Pro Feature',
    desc: 'Upgrade to Pro to unlock this feature.',
  };

  if (compact) {
    return (
      <div
        onClick={onUpgrade}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
          background: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 8, padding: '4px 10px',
          cursor: onUpgrade ? 'pointer' : 'default',
        }}
      >
        <Zap size={12} color="#f59e0b" />
        <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700 }}>
          Pro
        </span>
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(245,158,11,0.07)',
      border: '1px solid rgba(245,158,11,0.2)',
      borderRadius: 14, padding: '1.125rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(245,158,11,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Zap size={18} color="#f59e0b" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
            {copy.title}
          </p>
          <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5, marginBottom: '0.875rem' }}>
            {copy.desc}
          </p>
          <button
            onClick={onUpgrade}
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #f97316)',
              border: 'none', borderRadius: 8,
              color: '#fff', padding: '0.5rem 1.125rem',
              fontWeight: 700, fontSize: '0.85rem',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Upgrade to Pro — $7.99/mo
          </button>
        </div>
      </div>
    </div>
  );
}