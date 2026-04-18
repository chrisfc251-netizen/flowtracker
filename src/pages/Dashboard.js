import { format, getMonth, getYear } from 'date-fns';
import { Plus, Settings } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeroBalance } from '../components/dashboard/HeroBalance';
import { UrgencyAlerts } from '../components/dashboard/UrgencyAlerts';
import { SafeSpendCard } from '../components/dashboard/SafeSpendCard';
import { RecentTransactions } from '../components/dashboard/RecentTransactions';
import { CanIAffordIt } from '../components/dashboard/CanIAffordIt';
import { SyncIndicator } from '../components/ui/SyncIndicator';
import { TransactionForm } from '../components/transactions/TransactionForm';
import { useTransactions } from '../hooks/useTransactions';
import { useToast } from '../components/ui/Toast';
import { useBudgets } from '../hooks/useBudgets';
import { useAccounts } from '../hooks/useAccounts';
import { useTransfers } from '../hooks/useTransfers';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { useFixedExpenses } from '../hooks/useFixedExpenses';
import { useSavingsGoals } from '../hooks/useSavingsGoals';
import { useCategoryPriorities } from '../hooks/useCategoryPriorities';
import { computeBudgetStatus, filterByMonth } from '../lib/finance';
import { computeBalanceSplit } from '../lib/balanceEngine';
import { buildEffectiveBudgetStatus } from '../lib/budgetEngine';

export default function Dashboard() {
  const navigate = useNavigate();
  const { transactions, syncState, addTransaction, updateTransaction } = useTransactions();
  const { push }                             = useToast();
  const { getPriorityMap }                   = useCategoryPriorities();
  const { budgets, effectiveBudgets }        = useBudgets(getPriorityMap());
  const { accounts, computeAccountBalances } = useAccounts();
  const { transfers }                        = useTransfers();
  const { prefs, updatePref }                = useUserPreferences();
  const { expenses: fixedExpenses }          = useFixedExpenses();
  const { goals }                            = useSavingsGoals();

  const [showForm,      setShowForm]      = useState(false);
  const [editing,       setEditing]       = useState(null);
  const [showAffordIt,  setShowAffordIt]  = useState(false);

  // Balance
  const { totalBalance, availableBalance, totalSavings } = computeBalanceSplit(transactions);

  // Budget status with effective budgets
  const monthly      = filterByMonth(transactions, getYear(new Date()), getMonth(new Date()));
  const budgetStatus = buildEffectiveBudgetStatus(monthly, effectiveBudgets.length ? effectiveBudgets : budgets.map((b) => ({ ...b, effectiveBudget: b.amount_limit })));

  async function handleSave(payload) {
    if (editing) await updateTransaction(editing.id, payload);
    else         await addTransaction(payload);
    setEditing(null);
  }

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', letterSpacing: '-0.01em' }}>FlowTracker</h1>
          <SyncIndicator state={syncState} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => navigate('/more')} style={{
            background: '#1e293b', color: '#64748b', border: '1px solid #334155',
            borderRadius: 12, width: 42, height: 42, display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer'
          }}>
            <Settings size={17} />
          </button>
          <button onClick={() => { setEditing(null); setShowForm(true); }} style={{
            background: '#818cf8', color: '#fff', border: 'none', borderRadius: 12,
            width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(129,140,248,.4)', cursor: 'pointer'
          }}>
            <Plus size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Hero Balance */}
      <div style={{ marginBottom: '0.75rem' }}>
        <HeroBalance
          totalBalance={totalBalance}
          availableBalance={availableBalance}
          totalSavings={totalSavings}
          ghostMode={prefs.ghost_mode}
          onToggleGhost={() => updatePref('ghost_mode', !prefs.ghost_mode)}
        />
      </div>

      {/* Urgency Alerts */}
      <div style={{ marginBottom: '0.75rem' }}>
        <UrgencyAlerts fixedExpenses={fixedExpenses} budgetStatus={budgetStatus} />
      </div>

      {/* Safe Spend Card */}
      <div style={{ marginBottom: '1rem' }}>
        <SafeSpendCard
          availableBalance={availableBalance}
          fixedExpenses={fixedExpenses}
          onAffordIt={() => setShowAffordIt(true)}
        />
      </div>

      {/* Recent Transactions */}
      <RecentTransactions transactions={transactions} />

      {/* FAB */}
      <button onClick={() => { setEditing(null); setShowForm(true); }} style={{
        position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', right: '1.25rem',
        background: '#818cf8', color: '#fff', border: 'none', borderRadius: '50%',
        width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(129,140,248,.5)', zIndex: 200, cursor: 'pointer'
      }}>
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {showForm && (
        <TransactionForm
          initial={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
          availableBalance={availableBalance}
          budgets={budgetStatus}
          accounts={accounts}
        />
      )}

      {showAffordIt && (
        <CanIAffordIt
          availableBalance={availableBalance}
          fixedExpenses={fixedExpenses}
          budgets={budgetStatus}
          effectiveBudgets={effectiveBudgets}
          goals={goals}
          onClose={() => setShowAffordIt(false)}
        />
      )}
    </div>
  );
}
