import { format, getMonth, getYear, addMonths, subMonths, addDays, subDays, parseISO } from 'date-fns';
import { Plus, Trash2, Minus } from 'lucide-react';
import { useState } from 'react';
import { SyncIndicator } from '../components/ui/SyncIndicator';
import { SummaryCards } from '../components/dashboard/SummaryCards';
import { CategoryBreakdown } from '../components/dashboard/CategoryBreakdown';
import { PeriodSelector, ViewTabs } from '../components/dashboard/PeriodSelector';
import { FinancialScoreCard } from '../components/dashboard/FinancialScoreCard';
import { InsightsCard } from '../components/dashboard/InsightsCard';
import { GoalSuggestions } from '../components/dashboard/GoalSuggestions';
import { TransactionForm } from '../components/transactions/TransactionForm';
import { TransactionItem } from '../components/transactions/TransactionItem';
import { EmptyState } from '../components/ui/EmptyState';
import { useTransactions } from '../hooks/useTransactions';
import { useToast } from '../components/ui/Toast';
import { useSavingsGoals } from '../hooks/useSavingsGoals';
import { useBudgets } from '../hooks/useBudgets';
import {
  computeBudgetStatus, computeCategoryBreakdown, computeSummary,
  filterByDay, filterByMonth, filterByYear
} from '../lib/finance';

// Always compute today fresh
function getNow()      { return new Date(); }
function getTodayStr() { return format(getNow(), 'yyyy-MM-dd'); }
function getMonthStr() { return format(getNow(), 'yyyy-MM'); }
function getYearStr()  { return String(getYear(getNow())); }

export default function Dashboard() {
  const { transactions, syncState, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { push } = useToast();
  const { goals, loading: goalsLoading, addGoal, addMoneyToGoal, subtractMoneyFromGoal, deleteGoal } = useSavingsGoals();
  const { budgets } = useBudgets();

  const [view, setView]           = useState('monthly');
  const [dayVal, setDayVal]       = useState(getTodayStr);
  const [monthVal, setMonthVal]   = useState(getMonthStr);
  const [yearVal, setYearVal]     = useState(getYearStr);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null);
  const [activeTab, setActiveTab] = useState('expense');

  const [showGoalForm, setShowGoalForm]         = useState(false);
  const [goalName, setGoalName]                 = useState('');
  const [goalTarget, setGoalTarget]             = useState('');
  const [goalCurrent, setGoalCurrent]           = useState('');
  const [goalDate, setGoalDate]                 = useState('');
  const [activeGoalId, setActiveGoalId]         = useState(null);
  const [goalAction, setGoalAction]             = useState('add'); // 'add' | 'subtract'
  const [goalContribution, setGoalContribution] = useState('');
  const [savingGoalId, setSavingGoalId]         = useState(null);

  // ── Period navigation ────────────────────────────────────────────────────
  function handlePeriodChange(direction) {
    if (view === 'daily') {
      const d = parseISO(dayVal);
      setDayVal(format(direction === 'next' ? addDays(d, 1) : subDays(d, 1), 'yyyy-MM-dd'));
    }
    if (view === 'monthly') {
      const d = new Date(monthVal + '-15'); // use 15th to avoid month boundary issues
      setMonthVal(format(direction === 'next' ? addMonths(d, 1) : subMonths(d, 1), 'yyyy-MM'));
    }
    if (view === 'yearly') {
      setYearVal((prev) => String(Number(prev) + (direction === 'next' ? 1 : -1)));
    }
  }

  // ── Filter transactions ──────────────────────────────────────────────────
  const filtered = (() => {
    if (view === 'daily') return filterByDay(transactions, dayVal);
    if (view === 'monthly') {
      const [y, m] = monthVal.split('-').map(Number);
      return filterByMonth(transactions, y, m - 1);
    }
    return filterByYear(transactions, Number(yearVal));
  })();

  const { income, expense, balance } = computeSummary(filtered);
  const breakdown    = computeCategoryBreakdown(filtered);
  const budgetStatus = computeBudgetStatus(
    filterByMonth(transactions, getYear(getNow()), getMonth(getNow())),
    budgets
  );

  function periodLabel() {
    if (view === 'daily')   return format(parseISO(dayVal), 'EEE, MMM d, yyyy');
    if (view === 'monthly') return format(new Date(monthVal + '-15'), 'MMMM yyyy');
    return yearVal;
  }

  // ── Transaction handlers ─────────────────────────────────────────────────
  async function handleDelete(id) {
    if (!window.confirm('Delete this transaction?')) return;
    try { await deleteTransaction(id); push('Transaction deleted', 'warning'); }
    catch (e) { push(e.message, 'error'); }
  }

  function handleEdit(t) { setEditing(t); setShowForm(true); }

  async function handleSave(payload) {
    if (editing) await updateTransaction(editing.id, payload);
    else         await addTransaction(payload);
    setEditing(null);
  }

  // ── Goal handlers ────────────────────────────────────────────────────────
  async function handleAddGoal(e) {
    e.preventDefault();
    if (!goalName.trim() || !goalTarget) {
      push('Please enter a goal name and target amount', 'error'); return;
    }
    const { error } = await addGoal({
      name: goalName.trim(), target_amount: goalTarget,
      current_amount: goalCurrent || 0, target_date: goalDate || null,
    });
    if (error) { push(error.message || 'Failed to add goal', 'error'); return; }
    push('Savings goal added ✓', 'success');
    setGoalName(''); setGoalTarget(''); setGoalCurrent(''); setGoalDate('');
    setShowGoalForm(false);
  }

  async function handleContribution(goalId) {
    if (!goalContribution || Number(goalContribution) <= 0) {
      push('Please enter a valid amount', 'error'); return;
    }
    setSavingGoalId(goalId);
    const fn = goalAction === 'add' ? addMoneyToGoal : subtractMoneyFromGoal;
    const { error } = await fn(goalId, goalContribution);
    setSavingGoalId(null);
    if (error) { push(error.message || 'Failed to update goal', 'error'); return; }
    push(goalAction === 'add' ? 'Money added ✓' : 'Amount corrected ✓', 'success');
    setGoalContribution(''); setActiveGoalId(null);
  }

  async function handleDeleteGoal(goalId, name) {
    if (!window.confirm(`Delete goal "${name}"?`)) return;
    const { error } = await deleteGoal(goalId);
    if (error) { push(error.message || 'Failed to delete goal', 'error'); return; }
    push('Goal deleted', 'warning');
  }

  return (
    <div className="page">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem' }}>FlowTracker</h1>
          <SyncIndicator state={syncState} />
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} style={{
          background: '#818cf8', color: '#fff', border: 'none', borderRadius: 12,
          width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(129,140,248,.4)', cursor: 'pointer'
        }}>
          <Plus size={22} strokeWidth={2.5} />
        </button>
      </div>

      {/* Financial Score */}
      <div style={{ marginBottom: '1rem' }}>
        <FinancialScoreCard income={income} expense={expense} balance={balance} budgetStatus={budgetStatus} />
      </div>

      {/* View tabs */}
      <ViewTabs view={view} onChange={(v) => setView(v)} />

      {/* Period selector — custom to avoid date-fns parsing bugs */}
      <div style={{ marginTop: '0.75rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <button onClick={() => handlePeriodChange('prev')} style={{
          background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
          color: '#94a3b8', width: 36, height: 36, display: 'flex', alignItems: 'center',
          justifyContent: 'center', cursor: 'pointer', flexShrink: 0
        }}>‹</button>
        <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#f1f5f9', flex: 1, textAlign: 'center' }}>
          {periodLabel()}
        </span>
        <button onClick={() => handlePeriodChange('next')} style={{
          background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
          color: '#94a3b8', width: 36, height: 36, display: 'flex', alignItems: 'center',
          justifyContent: 'center', cursor: 'pointer', flexShrink: 0
        }}>›</button>
      </div>

      {/* Summary cards */}
      <SummaryCards income={income} expense={expense} balance={balance} />

      {/* Smart Insights */}
      <div style={{ marginTop: '1rem' }}>
        <InsightsCard transactions={transactions} />
      </div>

      {/* ── Savings Goals ── */}
      <div style={{ marginTop: '1.25rem' }}>
        <h3 style={{ marginBottom: '0.75rem', color: '#94a3b8', fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Savings Goals
        </h3>

        <div style={{ marginBottom: '0.75rem' }}>
          <button onClick={() => setShowGoalForm((p) => !p)} style={{
            background: '#818cf8', color: '#fff', border: 'none', borderRadius: 8,
            padding: '0.5rem 0.85rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
          }}>
            {showGoalForm ? 'Cancel' : '+ Add Goal'}
          </button>
        </div>

        {showGoalForm && (
          <form onSubmit={handleAddGoal} className="card"
            style={{ marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input type="text"   placeholder="Goal name"                     value={goalName}    onChange={(e) => setGoalName(e.target.value)} />
            <input type="number" placeholder="Target amount ($)"             value={goalTarget}  onChange={(e) => setGoalTarget(e.target.value)} />
            <input type="number" placeholder="Already saved ($) — optional" value={goalCurrent} onChange={(e) => setGoalCurrent(e.target.value)} />
            <input type="date"                                                value={goalDate}    onChange={(e) => setGoalDate(e.target.value)} />
            <button type="submit" style={{
              background: '#22c55e', color: '#fff', border: 'none',
              borderRadius: 8, padding: '0.75rem', fontWeight: 700, cursor: 'pointer'
            }}>
              Save Goal
            </button>
          </form>
        )}

        {goalsLoading ? (
          <div className="card"><p style={{ color: '#94a3b8' }}>Loading goals...</p></div>
        ) : goals.length === 0 ? (
          <div className="card"><p style={{ color: '#94a3b8', margin: 0 }}>No savings goals yet.</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {goals.map((goal) => {
              const current    = Number(goal.current_amount || 0);
              const target     = Number(goal.target_amount  || 0);
              const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
              const completed  = percentage >= 100;
              const color      = completed ? '#22c55e' : percentage > 75 ? '#f59e0b' : '#818cf8';

              return (
                <div key={goal.id} className="card" style={{ borderColor: completed ? 'rgba(34,197,94,.3)' : undefined }}>

                  {/* Goal header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{goal.name}</strong>
                      {completed && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#22c55e', fontWeight: 700 }}>✓ Done!</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>${current.toFixed(2)} / ${target.toFixed(2)}</span>
                      <button onClick={() => handleDeleteGoal(goal.id, goal.name)} style={{
                        background: 'rgba(244,63,94,.12)', border: 'none', borderRadius: 6,
                        padding: '4px 6px', cursor: 'pointer', color: '#f43f5e',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ background: '#0f172a', borderRadius: 999, height: 10, overflow: 'hidden' }}>
                    <div style={{ width: `${percentage}%`, height: '100%', background: color, borderRadius: 999, transition: 'width .4s ease' }} />
                  </div>

                  {/* Footer */}
                  <div style={{ marginTop: '0.4rem', display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem' }}>
                    <span>{percentage.toFixed(0)}% — ${Math.max(target - current, 0).toFixed(2)} left</span>
                    <span>{goal.target_date ? 'By ' + goal.target_date : 'No date'}</span>
                  </div>

                  {/* Add / Subtract money */}
                  <div style={{ marginTop: '0.75rem' }}>
                    {activeGoalId === goal.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {/* Add / Subtract toggle */}
                        <div style={{ display: 'flex', background: '#0f172a', borderRadius: 8, padding: 3, gap: 3 }}>
                          {[
                            { val: 'add',      label: '+ Add',     color: '#22c55e' },
                            { val: 'subtract', label: '− Correct', color: '#f43f5e' },
                          ].map((opt) => (
                            <button key={opt.val} onClick={() => setGoalAction(opt.val)} style={{
                              flex: 1, padding: '0.4rem', borderRadius: 6, border: 'none', cursor: 'pointer',
                              background: goalAction === opt.val ? (opt.val === 'add' ? 'rgba(34,197,94,.2)' : 'rgba(244,63,94,.2)') : 'transparent',
                              color: goalAction === opt.val ? opt.color : '#475569',
                              fontWeight: 700, fontSize: '0.8rem', fontFamily: 'inherit'
                            }}>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        {/* Amount input */}
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input
                            type="number" inputMode="decimal"
                            placeholder={goalAction === 'add' ? 'Amount to add ($)' : 'Amount to remove ($)'}
                            value={goalContribution}
                            onChange={(e) => setGoalContribution(e.target.value)}
                            style={{ flex: 1 }}
                            autoFocus
                          />
                          <button onClick={() => handleContribution(goal.id)} disabled={savingGoalId === goal.id} style={{
                            background: goalAction === 'add' ? '#22c55e' : '#f43f5e',
                            color: '#fff', border: 'none', borderRadius: 8,
                            padding: '0.5rem 0.875rem', fontWeight: 700, cursor: 'pointer',
                            opacity: savingGoalId === goal.id ? 0.6 : 1, whiteSpace: 'nowrap'
                          }}>
                            {savingGoalId === goal.id ? '…' : goalAction === 'add' ? 'Add' : 'Remove'}
                          </button>
                          <button onClick={() => { setActiveGoalId(null); setGoalContribution(''); }} style={{
                            background: 'transparent', color: '#64748b',
                            border: '1px solid #334155', borderRadius: 8,
                            padding: '0.5rem 0.75rem', cursor: 'pointer'
                          }}>✕</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setActiveGoalId(goal.id); setGoalAction('add'); }} style={{
                        background: 'rgba(129,140,248,.15)', color: '#818cf8',
                        border: '1px solid rgba(129,140,248,.3)', borderRadius: 8,
                        padding: '0.5rem 0.875rem', fontWeight: 600, fontSize: '0.85rem',
                        cursor: 'pointer', width: '100%'
                      }}>
                        + Add / Adjust Money
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Goal Roadmap */}
      {goals.length > 0 && (
        <div style={{ marginTop: '1.25rem' }}>
          <GoalSuggestions goals={goals} />
        </div>
      )}

      {/* Category breakdown */}
      {breakdown.length > 0 && (
        <div className="card" style={{ marginTop: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>By Category</h3>
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              {['expense', 'income'].map((t) => (
                <button key={t} onClick={() => setActiveTab(t)} style={{
                  padding: '0.3rem 0.75rem', borderRadius: 6, border: 'none', fontSize: '0.75rem', fontWeight: 600,
                  background: activeTab === t ? (t === 'expense' ? 'rgba(244,63,94,.15)' : 'rgba(34,197,94,.15)') : 'transparent',
                  color:      activeTab === t ? (t === 'expense' ? '#f43f5e'             : '#22c55e')              : '#64748b',
                  cursor: 'pointer'
                }}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <CategoryBreakdown breakdown={breakdown} type={activeTab} />
        </div>
      )}

      {/* Transactions */}
      <div style={{ marginTop: '1rem' }}>
        <h3 style={{ marginBottom: '0.75rem', color: '#94a3b8', fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Transactions ({filtered.length})
        </h3>
        {filtered.length === 0 ? (
          <EmptyState icon="💸" title="No transactions" subtitle="Tap + to add your first entry for this period" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filtered.map((t) => (
              <TransactionItem key={t.id} transaction={t} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

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
        <TransactionForm initial={editing} onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }} />
      )}
    </div>
  );
}