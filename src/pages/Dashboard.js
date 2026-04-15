import { format, getMonth, getYear, subDays, differenceInDays } from 'date-fns';
import { Plus, Trash2, Info, Settings } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SyncIndicator } from '../components/ui/SyncIndicator';
import { BalanceSplitCards } from '../components/dashboard/BalanceSplitCards';
import { CategoryBreakdown } from '../components/dashboard/CategoryBreakdown';
import { PeriodSelector, ViewTabs } from '../components/dashboard/PeriodSelector';
import { FinancialScoreCard } from '../components/dashboard/FinancialScoreCard';
import { InsightsPanel } from '../components/insights/InsightsPanel';
import { GoalSuggestions } from '../components/dashboard/GoalSuggestions';
import { CashFlowCard } from '../components/dashboard/CashFlowCard';
import { CanIAffordIt } from '../components/dashboard/CanIAffordIt';
import { TransactionForm } from '../components/transactions/TransactionForm';
import { TransactionItem } from '../components/transactions/TransactionItem';
import { EmptyState } from '../components/ui/EmptyState';
import { useTransactions } from '../hooks/useTransactions';
import { useToast } from '../components/ui/Toast';
import { useSavingsGoals } from '../hooks/useSavingsGoals';
import { useBudgets } from '../hooks/useBudgets';
import { useAccounts } from '../hooks/useAccounts';
import { useTransfers } from '../hooks/useTransfers';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { useFixedExpenses } from '../hooks/useFixedExpenses';
import {
  computeBudgetStatus, computeCategoryBreakdown, computeSummary,
  filterByDay, filterByMonth, filterByYear
} from '../lib/finance';
import { computeBalanceSplit } from '../lib/balanceEngine';

function getNow()      { return new Date(); }
function getTodayStr() { return format(getNow(), 'yyyy-MM-dd'); }
function getMonthStr() { return format(getNow(), 'yyyy-MM'); }
function getYearStr()  { return String(getYear(getNow())); }

function estimatePace(goal) {
  const current   = Number(goal.current_amount || 0);
  const target    = Number(goal.target_amount  || 0);
  const remaining = target - current;
  if (remaining <= 0) return null;
  const created   = goal.created_at ? new Date(goal.created_at) : subDays(new Date(), 30);
  const daysSince = Math.max(differenceInDays(new Date(), created), 1);
  const avgPerDay = current / daysSince;
  if (avgPerDay <= 0) return { hasData: false };
  return { hasData: true, daysLeft: Math.ceil(remaining / avgPerDay), avgPerDay };
}

function ScoreExplainer({ onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1e293b', borderRadius: '20px 20px 0 0', border: '1px solid #334155', width: '100%', maxWidth: 600, padding: '1.5rem 1.25rem 2rem', maxHeight: '80dvh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ color: '#f1f5f9' }}>How is your score calculated?</h2>
          <button onClick={onClose} style={{ background: '#334155', border: 'none', borderRadius: 8, color: '#94a3b8', width: 30, height: 30, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        {[
          { icon: '💰', title: 'Savings Rate (up to +25 pts)', detail: '≥30% saved → +25 | 20–30% → +20 | 10–20% → +12 | 0–10% → +5 | negative → –15' },
          { icon: '🎯', title: 'Budget Discipline (up to +15 pts)', detail: '0 budgets exceeded → +15 | ≤25% exceeded → +5 | >25% exceeded → –10' },
          { icon: '📅', title: 'Consistency (up to +10 pts)', detail: '>6 months data → +10 | >2 months → +5' },
        ].map((item) => (
          <div key={item.title} style={{ background: '#0f172a', borderRadius: 12, padding: '0.875rem', marginBottom: '0.75rem' }}>
            <p style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: '0.375rem' }}>{item.icon} {item.title}</p>
            <p style={{ fontSize: '0.75rem', color: '#475569', fontFamily: 'monospace', background: '#1e293b', padding: '0.375rem 0.625rem', borderRadius: 6 }}>{item.detail}</p>
          </div>
        ))}
        <p style={{ fontSize: '0.825rem', color: '#818cf8' }}><strong>Base score starts at 50.</strong> Updates every time you open the dashboard.</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { transactions, syncState, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { push }                                         = useToast();
  const { goals, loading: goalsLoading, addGoal, addMoneyToGoal, subtractMoneyFromGoal, deleteGoal } = useSavingsGoals();
  const { budgets }                                      = useBudgets();
  const { accounts, computeAccountBalances }             = useAccounts();
  const { transfers }                                    = useTransfers();
  const { prefs, updatePref }                            = useUserPreferences();
  const { expenses: fixedExpenses }                      = useFixedExpenses();

  const [view, setView]           = useState('monthly');
  const [dayVal, setDayVal]       = useState(getTodayStr);
  const [monthVal, setMonthVal]   = useState(getMonthStr);
  const [yearVal, setYearVal]     = useState(getYearStr);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null);
  const [activeTab, setActiveTab] = useState('expense');
  const [showScore, setShowScore] = useState(false);
  const [showAffordIt, setShowAffordIt] = useState(false);

  const [showGoalForm, setShowGoalForm]         = useState(false);
  const [goalName, setGoalName]                 = useState('');
  const [goalTarget, setGoalTarget]             = useState('');
  const [goalCurrent, setGoalCurrent]           = useState('');
  const [goalDate, setGoalDate]                 = useState('');
  const [activeGoalId, setActiveGoalId]         = useState(null);
  const [goalAction, setGoalAction]             = useState('add');
  const [goalContribution, setGoalContribution] = useState('');
  const [savingGoalId, setSavingGoalId]         = useState(null);
  const [editGoalDate, setEditGoalDate]         = useState(null);
  const [newGoalDate, setNewGoalDate]           = useState('');

  // ── Balance ──────────────────────────────────────────────────────────
  const { totalBalance, availableBalance, totalSavings } = computeBalanceSplit(transactions);
  const { balances, savingsBreakdown } = computeAccountBalances(transactions, transfers);

  // ── Filter ───────────────────────────────────────────────────────────
  const filtered = (() => {
    if (view === 'daily') return filterByDay(transactions, dayVal);
    if (view === 'monthly') {
      const [y, m] = monthVal.split('-').map(Number);
      return filterByMonth(transactions, y, m - 1);
    }
    return filterByYear(transactions, Number(yearVal));
  })();

  const { income: pIncome, expense: pExpense, balance: pBalance } = computeSummary(filtered);
  const breakdown    = computeCategoryBreakdown(filtered);
  const budgetStatus = computeBudgetStatus(
    filterByMonth(transactions, getYear(getNow()), getMonth(getNow())),
    budgets
  );

  const periodValue  = view === 'daily' ? dayVal : view === 'monthly' ? monthVal : yearVal;
  const periodChange = view === 'daily' ? setDayVal : view === 'monthly' ? setMonthVal : setYearVal;

  // ── Handlers ─────────────────────────────────────────────────────────
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

  async function handleAddGoal(e) {
    e.preventDefault();
    if (!goalName.trim() || !goalTarget) { push('Please enter a goal name and target amount', 'error'); return; }
    const { error } = await addGoal({ name: goalName.trim(), target_amount: goalTarget, current_amount: goalCurrent || 0, target_date: goalDate || null });
    if (error) { push(error.message || 'Failed to add goal', 'error'); return; }
    push('Savings goal added ✓', 'success');
    setGoalName(''); setGoalTarget(''); setGoalCurrent(''); setGoalDate('');
    setShowGoalForm(false);
  }

  async function handleContribution(goalId) {
    if (!goalContribution || Number(goalContribution) <= 0) { push('Please enter a valid amount', 'error'); return; }
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

  async function handleUpdateGoalDate(goalId) {
    if (!newGoalDate) { push('Select a date', 'error'); return; }
    const { supabase } = await import('../lib/supabase');
    const { error } = await supabase.from('savings_goals').update({ target_date: newGoalDate }).eq('id', goalId);
    if (error) { push('Failed to update deadline', 'error'); return; }
    push('Deadline updated ✓');
    setEditGoalDate(null); setNewGoalDate('');
    window.location.reload();
  }

  return (
    <div className="page">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem' }}>FlowTracker</h1>
          <SyncIndicator state={syncState} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => navigate('/settings')} style={{
            background: '#1e293b', color: '#64748b', border: '1px solid #334155',
            borderRadius: 12, width: 44, height: 44, display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer'
          }}>
            <Settings size={18} />
          </button>
          <button onClick={() => { setEditing(null); setShowForm(true); }} style={{
            background: '#818cf8', color: '#fff', border: 'none', borderRadius: 12,
            width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(129,140,248,.4)', cursor: 'pointer'
          }}>
            <Plus size={22} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Financial Score */}
      <div style={{ position: 'relative', marginBottom: '1rem' }}>
        <FinancialScoreCard income={pIncome} expense={pExpense} balance={pBalance} budgetStatus={budgetStatus} />
        <button onClick={() => setShowScore(true)} style={{
          position: 'absolute', top: 10, right: 10,
          background: 'rgba(99,102,241,.15)', border: 'none', borderRadius: 8,
          color: '#818cf8', padding: '4px 6px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', fontWeight: 700
        }}>
          <Info size={12} /> How?
        </button>
      </div>

      {/* Balance Split */}
      <div style={{ marginBottom: '1rem' }}>
        <BalanceSplitCards
          totalBalance={totalBalance}
          availableBalance={availableBalance}
          totalSavings={totalSavings}
          ghostMode={prefs.ghost_mode}
          onToggleGhost={() => updatePref('ghost_mode', !prefs.ghost_mode)}
          accounts={accounts}
          balances={balances}
          savingsBreakdown={savingsBreakdown}
        />
      </div>

      {/* Cash Flow Card — safe spendable after upcoming bills */}
      <div style={{ marginBottom: '1rem' }}>
        <CashFlowCard
          availableBalance={availableBalance}
          fixedExpenses={fixedExpenses}
          days={30}
        />
      </div>

      {/* Can I Afford It button */}
      <button onClick={() => setShowAffordIt(true)} style={{
        background: 'rgba(129,140,248,.1)', color: '#818cf8',
        border: '1px solid rgba(129,140,248,.25)', borderRadius: 12,
        padding: '0.75rem', fontWeight: 700, fontSize: '0.875rem',
        cursor: 'pointer', width: '100%', marginBottom: '1rem',
        fontFamily: 'inherit', display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: '0.5rem'
      }}>
        🤔 Can I Afford It?
      </button>

      {/* View tabs */}
      <ViewTabs view={view} onChange={setView} />

      {/* Period selector */}
      <div style={{ marginTop: '0.75rem', marginBottom: '1rem' }}>
        <PeriodSelector view={view} value={periodValue} onChange={periodChange} />
      </div>

      {/* Insights */}
      <div style={{ marginBottom: '1rem' }}>
        <InsightsPanel transactions={filtered} goals={goals} budgets={budgetStatus} />
      </div>

      {/* ── Savings Goals ── */}
      <div style={{ marginTop: '0.25rem' }}>
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
          <form onSubmit={handleAddGoal} className="card" style={{ marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input type="text"   placeholder="Goal name"                     value={goalName}    onChange={(e) => setGoalName(e.target.value)} />
            <input type="number" placeholder="Target amount ($)"             value={goalTarget}  onChange={(e) => setGoalTarget(e.target.value)} />
            <input type="number" placeholder="Already saved ($) — optional" value={goalCurrent} onChange={(e) => setGoalCurrent(e.target.value)} />
            <input type="date"                                                value={goalDate}    onChange={(e) => setGoalDate(e.target.value)} />
            <button type="submit" style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, padding: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Save Goal</button>
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
              const pace       = estimatePace(goal);

              return (
                <div key={goal.id} className="card" style={{ borderColor: completed ? 'rgba(34,197,94,.3)' : undefined }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{goal.name}</strong>
                      {completed && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#22c55e', fontWeight: 700 }}>✓ Done!</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>${current.toFixed(2)} / ${target.toFixed(2)}</span>
                      <button onClick={() => handleDeleteGoal(goal.id, goal.name)} style={{ background: 'rgba(244,63,94,.12)', border: 'none', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: '#f43f5e', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div style={{ background: '#0f172a', borderRadius: 999, height: 10, overflow: 'hidden' }}>
                    <div style={{ width: `${percentage}%`, height: '100%', background: color, borderRadius: 999, transition: 'width .4s ease' }} />
                  </div>

                  <div style={{ marginTop: '0.4rem', display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem' }}>
                    <span>{percentage.toFixed(0)}% — ${Math.max(target - current, 0).toFixed(2)} left</span>
                    <span onClick={() => { setEditGoalDate(goal.id); setNewGoalDate(goal.target_date || ''); }}
                      style={{ cursor: 'pointer', borderBottom: '1px dashed #334155' }}>
                      {editGoalDate === goal.id ? (
                        <span style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <input type="date" value={newGoalDate} onChange={(e) => setNewGoalDate(e.target.value)}
                            style={{ fontSize: '0.75rem', padding: '2px 6px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#f1f5f9', fontFamily: 'inherit' }} />
                          <button onClick={() => handleUpdateGoalDate(goal.id)} style={{ fontSize: '0.7rem', background: '#22c55e', border: 'none', borderRadius: 5, padding: '2px 8px', color: '#fff', cursor: 'pointer' }}>✓</button>
                          <button onClick={() => setEditGoalDate(null)} style={{ fontSize: '0.7rem', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>✕</button>
                        </span>
                      ) : (
                        goal.target_date ? 'By ' + goal.target_date : 'Set deadline ✏️'
                      )}
                    </span>
                  </div>

                  {!completed && (
                    <div style={{ marginTop: '0.625rem', background: 'rgba(129,140,248,.07)', border: '1px solid rgba(129,140,248,.15)', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
                      {!pace || !pace.hasData ? (
                        <span style={{ color: '#475569' }}>Start contributing to get a pace estimate</span>
                      ) : (
                        <span style={{ color: '#818cf8' }}>
                          🕐 ${pace.avgPerDay.toFixed(2)}/day → <strong>
                            {pace.daysLeft > 365 ? `~${Math.round(pace.daysLeft/365)}yr` : pace.daysLeft > 30 ? `~${Math.round(pace.daysLeft/30)}mo` : `${pace.daysLeft}d`}
                          </strong> to reach this goal
                        </span>
                      )}
                    </div>
                  )}

                  {!completed && (
                    <div style={{ marginTop: '0.75rem' }}>
                      {activeGoalId === goal.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', background: '#0f172a', borderRadius: 8, padding: 3, gap: 3 }}>
                            {[{ val: 'add', label: '+ Add', color: '#22c55e' }, { val: 'subtract', label: '− Correct', color: '#f43f5e' }].map((opt) => (
                              <button key={opt.val} onClick={() => setGoalAction(opt.val)} style={{
                                flex: 1, padding: '0.4rem', borderRadius: 6, border: 'none', cursor: 'pointer',
                                background: goalAction === opt.val ? (opt.val === 'add' ? 'rgba(34,197,94,.2)' : 'rgba(244,63,94,.2)') : 'transparent',
                                color: goalAction === opt.val ? opt.color : '#475569',
                                fontWeight: 700, fontSize: '0.8rem', fontFamily: 'inherit'
                              }}>{opt.label}</button>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input type="number" inputMode="decimal"
                              placeholder={goalAction === 'add' ? 'Amount to add ($)' : 'Amount to remove ($)'}
                              value={goalContribution} onChange={(e) => setGoalContribution(e.target.value)}
                              style={{ flex: 1 }} autoFocus />
                            <button onClick={() => handleContribution(goal.id)} disabled={savingGoalId === goal.id} style={{
                              background: goalAction === 'add' ? '#22c55e' : '#f43f5e', color: '#fff',
                              border: 'none', borderRadius: 8, padding: '0.5rem 0.875rem',
                              fontWeight: 700, cursor: 'pointer', opacity: savingGoalId === goal.id ? 0.6 : 1
                            }}>
                              {savingGoalId === goal.id ? '…' : goalAction === 'add' ? 'Add' : 'Remove'}
                            </button>
                            <button onClick={() => { setActiveGoalId(null); setGoalContribution(''); }} style={{
                              background: 'transparent', color: '#64748b', border: '1px solid #334155', borderRadius: 8, padding: '0.5rem 0.75rem', cursor: 'pointer'
                            }}>✕</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { setActiveGoalId(goal.id); setGoalAction('add'); }} style={{
                          background: 'rgba(129,140,248,.15)', color: '#818cf8', border: '1px solid rgba(129,140,248,.3)',
                          borderRadius: 8, padding: '0.5rem 0.875rem', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', width: '100%'
                        }}>+ Add / Adjust Money</button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {goals.length > 0 && <div style={{ marginTop: '1.25rem' }}><GoalSuggestions goals={goals} /></div>}

      {/* Category breakdown */}
      {breakdown.length > 0 && (
        <div className="card" style={{ marginTop: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>By Category</h3>
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              {['expense','income'].map((t) => (
                <button key={t} onClick={() => setActiveTab(t)} style={{
                  padding: '0.3rem 0.75rem', borderRadius: 6, border: 'none', fontSize: '0.75rem', fontWeight: 600,
                  background: activeTab === t ? (t==='expense' ? 'rgba(244,63,94,.15)' : 'rgba(34,197,94,.15)') : 'transparent',
                  color: activeTab === t ? (t==='expense' ? '#f43f5e' : '#22c55e') : '#64748b', cursor: 'pointer'
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
          goals={goals}
          onClose={() => setShowAffordIt(false)}
        />
      )}

      {showScore && <ScoreExplainer onClose={() => setShowScore(false)} />}
    </div>
  );
}