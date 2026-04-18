/**
 * Home.js — v3
 * Fix 2: Monthly context shows available balance (not income)
 *   Format: "Spent $323 — $401 free to spend — $970 in savings (protected)"
 */
import { format, getMonth, getYear, subDays, differenceInDays } from 'date-fns';
import { Plus, Eye, EyeOff, ChevronRight, Zap, Target, ShieldCheck } from 'lucide-react';
import { useState, useRef } from 'react';
import { useNavigate }      from 'react-router-dom';

import { useTransactions }    from '../hooks/useTransactions';
import { useSavingsGoals }    from '../hooks/useSavingsGoals';
import { useBudgets }         from '../hooks/useBudgets';
import { useAccounts }        from '../hooks/useAccounts';
import { useTransfers }       from '../hooks/useTransfers';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { useToast }           from '../components/ui/Toast';
import { useConfirm }         from '../components/ui/ConfirmModal';
import { TransactionForm }    from '../components/transactions/TransactionForm';
import { SyncIndicator }      from '../components/ui/SyncIndicator';
import { PageLoader }         from '../components/ui/EmptyState';
import { computeBalanceSplit }                from '../lib/balanceEngine';
import { computeBudgetStatus, filterByMonth } from '../lib/finance';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
}

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

function paceLabel(d) {
  if (d > 365) return `~${Math.round(d / 365)}yr`;
  if (d > 30)  return `~${Math.round(d / 30)}mo`;
  return `${d}d`;
}

// ── SECTION 1: Financial State ────────────────────────────────────────────
function FinancialState({ totalBalance, availableBalance, totalSavings, ghostMode, onToggleGhost }) {
  const displayedTotal  = ghostMode ? availableBalance : totalBalance;
  const balancePositive = displayedTotal >= 0;

  return (
    <div style={{
      background: 'linear-gradient(145deg, #1a2744 0%, #0f172a 65%)',
      border: '1px solid rgba(99,102,241,0.22)',
      borderRadius: 20, padding: '1.375rem',
      marginBottom: '0.875rem', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.68rem', color: '#475569', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Your Money
        </span>
        <button onClick={onToggleGhost} style={{
          background: ghostMode ? 'rgba(245,158,11,0.12)' : 'rgba(100,116,139,0.1)',
          border: `1px solid ${ghostMode ? 'rgba(245,158,11,0.3)' : 'rgba(100,116,139,0.18)'}`,
          borderRadius: 8, padding: '3px 10px',
          color: ghostMode ? '#f59e0b' : '#475569',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
          fontSize: '0.7rem', fontWeight: 700,
        }}>
          {ghostMode ? <EyeOff size={11} /> : <Eye size={11} />}
          {ghostMode ? 'Savings hidden' : 'Show all'}
        </button>
      </div>

      <p style={{ fontSize: '0.68rem', color: '#334155', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.2rem' }}>
        {ghostMode ? 'AVAILABLE TO SPEND' : 'TOTAL BALANCE'}
      </p>
      <p style={{
        fontSize: '2.625rem', fontWeight: 900, letterSpacing: '-0.025em', lineHeight: 1,
        color: balancePositive ? '#f1f5f9' : '#f43f5e', marginBottom: '0.25rem',
      }}>
        {fmt(displayedTotal)}
      </p>
      <p style={{ fontSize: '0.72rem', color: '#475569', marginBottom: '1rem', lineHeight: 1.4 }}>
        {ghostMode
          ? 'Money you can spend freely — savings excluded'
          : balancePositive
            ? `Total income minus expenses${totalSavings > 0 ? ' (savings included)' : ''}`
            : "You've spent more than you've earned this period"}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
        <div style={{
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)',
          borderRadius: 12, padding: '0.875rem',
        }}>
          <p style={{ fontSize: '0.62rem', color: '#22c55e', fontWeight: 700, letterSpacing: '0.07em', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Available</p>
          <p style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f1f5f9', marginBottom: '0.2rem' }}>{fmt(availableBalance)}</p>
          <p style={{ fontSize: '0.65rem', color: '#475569', lineHeight: 1.4 }}>Free to spend — savings not included</p>
        </div>

        {ghostMode ? (
          <div style={{ background: '#0d1524', border: '1px solid #131e30', borderRadius: 12, padding: '0.875rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
            <EyeOff size={16} color="#1e293b" />
            <p style={{ fontSize: '0.65rem', color: '#1e293b', fontWeight: 700 }}>Hidden</p>
          </div>
        ) : (
          <div style={{ background: 'rgba(99,102,241,0.09)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 12, padding: '0.875rem' }}>
            <p style={{ fontSize: '0.62rem', color: '#818cf8', fontWeight: 700, letterSpacing: '0.07em', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Savings</p>
            <p style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f1f5f9', marginBottom: '0.2rem' }}>{fmt(totalSavings)}</p>
            <p style={{ fontSize: '0.65rem', color: '#475569', lineHeight: 1.4 }}>Set aside — not counted as spendable</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SECTION 2: Monthly Context ────────────────────────────────────────────
// availableBalance comes from computeBalanceSplit (all-time) — same number
// shown in the hero card. This keeps both cards perfectly consistent.
function MonthlyContext({ transactions, availableBalance }) {
  const now         = new Date();
  const [y, m]      = [getYear(now), getMonth(now)];
  const monthlyTx   = filterByMonth(transactions, y, m);
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const dayOfMonth  = now.getDate();
  const daysLeft    = daysInMonth - dayOfMonth;

  const income = monthlyTx
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + Number(t.amount), 0);

  const savingsThisMonth = monthlyTx
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + Number(t.savings_allocation || 0), 0);

  const expense = monthlyTx
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + Number(t.amount), 0);

  const spentPct    = income > 0 ? Math.round((expense / income) * 100) : 0;
  const expectedPct = Math.round((dayOfMonth / daysInMonth) * 100);
  const onTrack     = spentPct <= expectedPct + 8;
  const projectedByMonthEnd = dayOfMonth > 0 ? (expense / dayOfMonth) * daysInMonth : 0;

  const fixed = monthlyTx.filter(t => t.type === 'expense' && t.nature === 'fixed').slice(0, 3);

  if (income === 0 && fixed.length === 0) return null;

  return (
    <div style={{
      background: '#1e293b', border: '1px solid #334155',
      borderRadius: 16, padding: '1.125rem', marginBottom: '0.875rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
        <p style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {format(now, 'MMMM')} at a glance
        </p>
        <span style={{
          fontSize: '0.68rem', fontWeight: 700, padding: '3px 9px', borderRadius: 20,
          background: onTrack ? 'rgba(34,197,94,0.1)' : 'rgba(244,63,94,0.1)',
          color: onTrack ? '#22c55e' : '#f43f5e',
          border: `1px solid ${onTrack ? 'rgba(34,197,94,0.25)' : 'rgba(244,63,94,0.25)'}`,
        }}>
          {onTrack ? '✓ On track' : '⚠ Spending fast'}
        </span>
      </div>

      {income > 0 && (
        <>
          {/* Two-stat row: Spent of Available */}
          <div style={{ marginBottom: '0.875rem' }}>
            {/* Main statement */}
            <div style={{
              background: '#0f172a', borderRadius: 12,
              padding: '0.875rem 1rem', marginBottom: '0.5rem',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <p style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  Spent this month
                </p>
                <p style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f43f5e', letterSpacing: '-0.01em' }}>
                  {fmt(expense)}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  Available to spend
                </p>
                <p style={{ fontSize: '1.25rem', fontWeight: 900, color: availableBalance >= 0 ? '#22c55e' : '#f43f5e', letterSpacing: '-0.01em' }}>
                  {fmt(availableBalance)}
                </p>
              </div>
            </div>

            {/* Days remaining sub-label */}
            <p style={{ fontSize: '0.72rem', color: '#334155', textAlign: 'center' }}>
              {daysLeft} days left in {format(now, 'MMMM')}
              {savingsThisMonth > 0 && (
                <span style={{ color: '#818cf8', marginLeft: '0.5rem' }}>
                  · {fmt(savingsThisMonth)} in savings this month
                </span>
              )}
            </p>
          </div>

          {/* Pace bar */}
          <div style={{ marginBottom: fixed.length > 0 ? '0.875rem' : 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
              <span style={{ fontSize: '0.7rem', color: '#475569' }}>Spending pace</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: spentPct > expectedPct + 10 ? '#f43f5e' : '#64748b' }}>
                {spentPct}% of income used
              </span>
            </div>
            <div style={{ background: '#0f172a', borderRadius: 4, height: 5, position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', left: `${expectedPct}%`, top: 0, bottom: 0,
                width: 2, background: 'rgba(100,116,139,0.4)', zIndex: 2,
              }} />
              <div style={{
                width: `${Math.min(spentPct, 100)}%`, height: '100%',
                background: spentPct > expectedPct + 10
                  ? 'linear-gradient(90deg, #f59e0b, #f43f5e)'
                  : 'linear-gradient(90deg, #22c55e, #06b6d4)',
                borderRadius: 4,
              }} />
            </div>
            <p style={{ fontSize: '0.65rem', color: '#334155', marginTop: '0.25rem' }}>
              Day {dayOfMonth}/{daysInMonth} — at this pace: {fmt(projectedByMonthEnd)} total by month-end
            </p>
          </div>
        </>
      )}

      {fixed.length > 0 && (
        <>
          <p style={{ fontSize: '0.65rem', color: '#475569', fontWeight: 700, letterSpacing: '0.06em', marginBottom: '0.375rem', textTransform: 'uppercase' }}>
            Fixed bills this month
          </p>
          {fixed.map(t => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.2rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{t.description || t.category}</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f43f5e' }}>-{fmt(t.amount)}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── SECTION 3: Goals Preview ──────────────────────────────────────────────
function GoalsPreview({ goals, loading, onNavigate }) {
  if (loading) return null;
  const active = goals
    .filter(g => Number(g.current_amount || 0) < Number(g.target_amount || 0))
    .slice(0, 2);

  return (
    <div style={{ marginBottom: '0.875rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
        <p style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Savings Goals
        </p>
        <button onClick={onNavigate} style={{
          background: 'transparent', border: 'none', color: '#818cf8',
          fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 3,
        }}>
          All goals <ChevronRight size={13} />
        </button>
      </div>

      {active.length === 0 ? (
        <div style={{ background: '#1e293b', border: '1px dashed #334155', borderRadius: 14, padding: '1.25rem', textAlign: 'center' }}>
          <Target size={24} color="#334155" style={{ marginBottom: '0.5rem' }} />
          <p style={{ color: '#475569', fontSize: '0.825rem', marginBottom: '0.5rem' }}>No active goals</p>
          <button onClick={onNavigate} style={{ background: 'transparent', border: '1px solid rgba(129,140,248,0.3)', borderRadius: 8, padding: '5px 14px', color: '#818cf8', fontSize: '0.775rem', fontWeight: 700, cursor: 'pointer' }}>
            + Create a goal
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {active.map(g => {
            const current = Number(g.current_amount || 0);
            const target  = Number(g.target_amount  || 0);
            const pct     = target > 0 ? Math.min((current / target) * 100, 100) : 0;
            const pace    = estimatePace(g);
            const color   = pct > 75 ? '#f59e0b' : '#818cf8';

            return (
              <div key={g.id} onClick={onNavigate} style={{
                background: '#1e293b', border: '1px solid #334155',
                borderRadius: 14, padding: '0.875rem',
                position: 'relative', overflow: 'hidden', cursor: 'pointer',
              }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: color, borderRadius: '14px 0 0 14px' }} />
                <div style={{ paddingLeft: '0.625rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <p style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.875rem' }}>{g.name}</p>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{fmt(current)} / {fmt(target)}</span>
                  </div>
                  <div style={{ background: '#0f172a', borderRadius: 999, height: 6, overflow: 'hidden', marginBottom: '0.375rem' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999 }} />
                  </div>
                  <p style={{ fontSize: '0.7rem', color: '#475569' }}>
                    {Math.round(pct)}%
                    {pace?.hasData
                      ? ` · ${paceLabel(pace.daysLeft)} to go at ${fmt(pace.avgPerDay)}/day`
                      : ` · ${fmt(Math.max(target - current, 0))} remaining`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── SECTION 4: Affordability Checker ─────────────────────────────────────
function AffordabilityChecker({ availableBalance, totalSavings }) {
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState(null);
  const inputRef            = useRef(null);

  function check() {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    const remaining      = availableBalance - val;
    const canAfford      = remaining >= 0;
    const touchesSavings = !canAfford && (availableBalance + totalSavings) >= val;
    setResult({ val, remaining, canAfford, touchesSavings });
  }

  function reset() { setAmount(''); setResult(null); inputRef.current?.focus(); }

  const statusColor = result
    ? result.canAfford ? '#22c55e' : result.touchesSavings ? '#f59e0b' : '#f43f5e'
    : null;

  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: '1.125rem', marginBottom: '0.875rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
        <Zap size={13} color="#f59e0b" />
        <p style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Can I Afford It?
        </p>
      </div>
      <p style={{ fontSize: '0.72rem', color: '#334155', marginBottom: '0.75rem' }}>
        Checks against your available balance of {fmt(availableBalance)}
      </p>

      {!result ? (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            ref={inputRef}
            type="number" inputMode="decimal"
            placeholder="Enter a purchase amount ($)"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && check()}
            style={{ flex: 1, background: '#0f172a', border: '1px solid #334155', borderRadius: 10, color: '#f1f5f9', padding: '0.625rem 0.875rem', fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit' }}
          />
          <button onClick={check} disabled={!amount} style={{ background: amount ? '#818cf8' : '#1e293b', color: amount ? '#fff' : '#334155', border: 'none', borderRadius: 10, padding: '0.625rem 1rem', fontWeight: 700, fontSize: '0.875rem', cursor: amount ? 'pointer' : 'default' }}>
            Check
          </button>
        </div>
      ) : (
        <>
          <div style={{ background: `${statusColor}10`, border: `1px solid ${statusColor}30`, borderRadius: 12, padding: '0.875rem', marginBottom: '0.625rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '1rem', fontWeight: 800, color: statusColor }}>
                  {result.canAfford ? '✓ Yes, you can afford it' : result.touchesSavings ? '⚠ Only if you use savings' : '✕ Not enough right now'}
                </p>
                <p style={{ fontSize: '0.775rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                  {result.canAfford
                    ? `${fmt(result.remaining)} still available after this purchase`
                    : result.touchesSavings
                    ? `${fmt(Math.abs(result.remaining))} short — would need to dip into savings`
                    : `You're ${fmt(Math.abs(result.remaining))} short`}
                </p>
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f1f5f9', flexShrink: 0 }}>{fmt(result.val)}</span>
            </div>
          </div>
          <button onClick={reset} style={{ width: '100%', background: 'transparent', border: '1px solid #334155', borderRadius: 8, color: '#64748b', padding: '0.5rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
            Check another amount
          </button>
        </>
      )}
    </div>
  );
}

// ── Recent Transactions ───────────────────────────────────────────────────
function RecentTransactions({ transactions, onEdit, onNavigate }) {
  const recent = transactions.slice(0, 5);
  if (recent.length === 0) return null;

  return (
    <div style={{ marginBottom: '0.875rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
        <p style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Recent</p>
        <button onClick={onNavigate} style={{ background: 'transparent', border: 'none', color: '#818cf8', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
          See all <ChevronRight size={13} />
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {recent.map(t => (
          <div key={t.id} onClick={() => onEdit(t)} style={{
            background: '#1e293b', borderRadius: 12, padding: '0.75rem 0.875rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.85rem', color: '#f1f5f9', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.description || t.category}
              </p>
              <p style={{ fontSize: '0.7rem', color: '#475569' }}>{t.category} · {t.date}</p>
            </div>
            <p style={{ fontWeight: 800, fontSize: '0.9rem', flexShrink: 0, color: t.type === 'income' ? '#22c55e' : '#f43f5e' }}>
              {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const { transactions, syncState, loading: txLoading, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { goals, loading: goalsLoading } = useSavingsGoals();
  const { budgets }                      = useBudgets();
  const { accounts, computeAccountBalances } = useAccounts();
  const { transfers }                    = useTransfers();
  const { prefs, updatePref }            = useUserPreferences();
  const { push }                         = useToast();
  const { confirm, ConfirmModal }        = useConfirm();

  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null);

  const { totalBalance, availableBalance, totalSavings } = computeBalanceSplit(transactions);
  const now = new Date();
  const budgetStatus = computeBudgetStatus(filterByMonth(transactions, getYear(now), getMonth(now)), budgets);

  async function handleDelete(id) {
    const ok = await confirm({ title: 'Delete transaction?', message: 'This cannot be undone.', confirmLabel: 'Delete' });
    if (!ok) return;
    try { await deleteTransaction(id); push('Deleted', 'warning'); }
    catch (e) { push(e.message, 'error'); }
  }

  async function handleSave(payload) {
    try {
      if (editing) await updateTransaction(editing.id, payload);
      else         await addTransaction(payload);
      setEditing(null); setShowForm(false);
    } catch (e) { push(e.message, 'error'); }
  }

  if (txLoading) return <PageLoader />;

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f1f5f9' }}>FlowTracker</h1>
          <SyncIndicator state={syncState} />
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} style={{
          background: '#818cf8', color: '#fff', border: 'none', borderRadius: 12,
          width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(129,140,248,0.4)', cursor: 'pointer',
        }}>
          <Plus size={22} strokeWidth={2.5} />
        </button>
      </div>

      <FinancialState
        totalBalance={totalBalance}
        availableBalance={availableBalance}
        totalSavings={totalSavings}
        ghostMode={prefs.ghost_mode}
        onToggleGhost={() => updatePref('ghost_mode', !prefs.ghost_mode)}
      />
      <MonthlyContext transactions={transactions} availableBalance={availableBalance} />
      <GoalsPreview goals={goals} loading={goalsLoading} onNavigate={() => navigate('/goals')} />
      <AffordabilityChecker availableBalance={availableBalance} totalSavings={totalSavings} />
      <RecentTransactions
        transactions={transactions}
        onEdit={t => { setEditing(t); setShowForm(true); }}
        onNavigate={() => navigate('/transactions')}
      />

      <button onClick={() => { setEditing(null); setShowForm(true); }} style={{
        position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', right: '1.25rem',
        background: '#818cf8', color: '#fff', border: 'none', borderRadius: '50%',
        width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(129,140,248,0.5)', zIndex: 200, cursor: 'pointer',
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
      <ConfirmModal />
    </div>
  );
}