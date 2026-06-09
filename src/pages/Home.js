/**
 * Home.js — v4 light theme restore
 * All hardcoded dark hex values replaced with CSS custom property tokens.
 */
import { format, getMonth, getYear, subDays, differenceInDays } from 'date-fns';
import { Plus, Eye, EyeOff, ChevronRight, Zap, Target } from 'lucide-react';
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
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 20, padding: '1.375rem',
      marginBottom: '0.875rem', position: 'relative', overflow: 'hidden',
      boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.68rem', color: 'var(--ink-3)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)' }}>
          Your Money
        </span>
        <button onClick={onToggleGhost} style={{
          background: ghostMode ? 'rgba(155,107,0,0.1)' : 'var(--bg-inset)',
          border: `1px solid ${ghostMode ? 'rgba(155,107,0,0.3)' : 'var(--border-strong)'}`,
          borderRadius: 8, padding: '3px 10px',
          color: ghostMode ? 'var(--accent-amber)' : 'var(--ink-3)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
          fontSize: '0.7rem', fontWeight: 700, fontFamily: 'var(--font-sans)',
        }}>
          {ghostMode ? <EyeOff size={11} /> : <Eye size={11} />}
          {ghostMode ? 'Savings hidden' : 'Show all'}
        </button>
      </div>

      <p style={{ fontSize: '0.68rem', color: 'var(--ink-3)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.2rem', fontFamily: 'var(--font-sans)' }}>
        {ghostMode ? 'AVAILABLE TO SPEND' : 'TOTAL BALANCE'}
      </p>
      <p style={{
        fontSize: '2.625rem', fontWeight: 900, letterSpacing: '-0.025em', lineHeight: 1,
        color: balancePositive ? 'var(--ink-1)' : 'var(--accent-red)',
        marginBottom: '0.25rem', fontFamily: 'var(--font-serif)',
      }}>
        {fmt(displayedTotal)}
      </p>
      <p style={{ fontSize: '0.72rem', color: 'var(--ink-4)', marginBottom: '1rem', lineHeight: 1.4, fontFamily: 'var(--font-sans)' }}>
        {ghostMode
          ? 'Money you can spend freely — savings excluded'
          : balancePositive
            ? `Total income minus expenses${totalSavings > 0 ? ' (savings included)' : ''}`
            : "You've spent more than you've earned this period"}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
        <div style={{
          background: 'var(--bg-inset)', border: '1px solid var(--border)',
          borderLeft: `3px solid var(--accent-green)`,
          borderRadius: 12, padding: '0.875rem',
        }}>
          <p style={{ fontSize: '0.62rem', color: 'var(--accent-green)', fontWeight: 700, letterSpacing: '0.07em', marginBottom: '0.3rem', textTransform: 'uppercase', fontFamily: 'var(--font-sans)' }}>Available</p>
          <p style={{ fontSize: '1.2rem', fontWeight: 800, color: availableBalance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', marginBottom: '0.2rem', fontFamily: 'var(--font-mono)' }}>{fmt(availableBalance)}</p>
          <p style={{ fontSize: '0.65rem', color: 'var(--ink-4)', lineHeight: 1.4, fontFamily: 'var(--font-sans)' }}>Free to spend — savings not included</p>
        </div>

        {ghostMode ? (
          <div style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', borderRadius: 12, padding: '0.875rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
            <EyeOff size={16} color="var(--ink-4)" />
            <p style={{ fontSize: '0.65rem', color: 'var(--ink-4)', fontWeight: 700, fontFamily: 'var(--font-sans)' }}>Hidden</p>
          </div>
        ) : (
          <div style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', borderLeft: '3px solid var(--ink-3)', borderRadius: 12, padding: '0.875rem' }}>
            <p style={{ fontSize: '0.62rem', color: 'var(--ink-3)', fontWeight: 700, letterSpacing: '0.07em', marginBottom: '0.3rem', textTransform: 'uppercase', fontFamily: 'var(--font-sans)' }}>Savings</p>
            <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--ink-2)', marginBottom: '0.2rem', fontFamily: 'var(--font-mono)' }}>{fmt(totalSavings)}</p>
            <p style={{ fontSize: '0.65rem', color: 'var(--ink-4)', lineHeight: 1.4, fontFamily: 'var(--font-sans)' }}>Set aside — not counted as spendable</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SECTION 2: Monthly Context ────────────────────────────────────────────
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
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 16, padding: '1.125rem', marginBottom: '0.875rem',
      boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
        <p style={{ fontSize: '0.68rem', color: 'var(--ink-3)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)' }}>
          {format(now, 'MMMM')} at a glance
        </p>
        <span style={{
          fontSize: '0.68rem', fontWeight: 700, padding: '3px 9px', borderRadius: 20,
          background: onTrack ? 'rgba(34,197,94,0.1)' : 'rgba(244,63,94,0.1)',
          color: onTrack ? 'var(--accent-green)' : 'var(--accent-red)',
          border: `1px solid ${onTrack ? 'rgba(34,197,94,0.25)' : 'rgba(244,63,94,0.25)'}`,
          fontFamily: 'var(--font-sans)',
        }}>
          {onTrack ? '✓ On track' : '⚠ Spending fast'}
        </span>
      </div>

      {income > 0 && (
        <>
          <div style={{ marginBottom: '0.875rem' }}>
            <div style={{
              background: 'var(--bg-inset)', borderRadius: 12,
              padding: '0.875rem 1rem', marginBottom: '0.5rem',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              border: '1px solid var(--border)',
            }}>
              <div>
                <p style={{ fontSize: '0.68rem', color: 'var(--ink-4)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.25rem', fontFamily: 'var(--font-sans)' }}>
                  Spent this month
                </p>
                <p style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--accent-red)', letterSpacing: '-0.01em', fontFamily: 'var(--font-serif)' }}>
                  {fmt(expense)}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.68rem', color: 'var(--ink-4)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.25rem', fontFamily: 'var(--font-sans)' }}>
                  Available to spend
                </p>
                <p style={{ fontSize: '1.25rem', fontWeight: 900, color: availableBalance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', letterSpacing: '-0.01em', fontFamily: 'var(--font-serif)' }}>
                  {fmt(availableBalance)}
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.72rem', color: 'var(--ink-4)', textAlign: 'center', fontFamily: 'var(--font-sans)' }}>
              {daysLeft} days left in {format(now, 'MMMM')}
              {savingsThisMonth > 0 && (
                <span style={{ color: 'var(--ink-3)', marginLeft: '0.5rem' }}>
                  · {fmt(savingsThisMonth)} in savings this month
                </span>
              )}
            </p>
          </div>

          <div style={{ marginBottom: fixed.length > 0 ? '0.875rem' : 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--ink-4)', fontFamily: 'var(--font-sans)' }}>Spending pace</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: spentPct > expectedPct + 10 ? 'var(--accent-red)' : 'var(--ink-3)', fontFamily: 'var(--font-sans)' }}>
                {spentPct}% of income used
              </span>
            </div>
            <div style={{ background: 'var(--bg-inset)', borderRadius: 4, height: 5, position: 'relative', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div style={{
                position: 'absolute', left: `${expectedPct}%`, top: 0, bottom: 0,
                width: 2, background: 'var(--border-strong)', zIndex: 2,
              }} />
              <div style={{
                width: `${Math.min(spentPct, 100)}%`, height: '100%',
                background: spentPct > expectedPct + 10
                  ? 'linear-gradient(90deg, #f59e0b, #f43f5e)'
                  : 'linear-gradient(90deg, #22c55e, #06b6d4)',
                borderRadius: 4,
              }} />
            </div>
            <p style={{ fontSize: '0.65rem', color: 'var(--ink-4)', marginTop: '0.25rem', fontFamily: 'var(--font-sans)' }}>
              Day {dayOfMonth}/{daysInMonth} — at this pace: {fmt(projectedByMonthEnd)} total by month-end
            </p>
          </div>
        </>
      )}

      {fixed.length > 0 && (
        <>
          <p style={{ fontSize: '0.65rem', color: 'var(--ink-3)', fontWeight: 700, letterSpacing: '0.06em', marginBottom: '0.375rem', textTransform: 'uppercase', fontFamily: 'var(--font-sans)' }}>
            Fixed bills this month
          </p>
          {fixed.map(t => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.2rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)' }}>{t.description || t.category}</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-red)', fontFamily: 'var(--font-mono)' }}>-{fmt(t.amount)}</span>
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
        <p style={{ fontSize: '0.68rem', color: 'var(--ink-3)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)' }}>
          Savings Goals
        </p>
        <button onClick={onNavigate} style={{
          background: 'transparent', border: 'none', color: 'var(--accent-green)',
          fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'var(--font-sans)',
        }}>
          All goals <ChevronRight size={13} />
        </button>
      </div>

      {active.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-strong)', borderRadius: 14, padding: '1.25rem', textAlign: 'center', boxShadow: 'var(--shadow-card)' }}>
          <Target size={24} color="var(--ink-4)" style={{ marginBottom: '0.5rem' }} />
          <p style={{ color: 'var(--ink-3)', fontSize: '0.825rem', marginBottom: '0.5rem', fontFamily: 'var(--font-sans)' }}>No active goals</p>
          <button onClick={onNavigate} style={{ background: 'transparent', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '5px 14px', color: 'var(--accent-green)', fontSize: '0.775rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
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
            const color   = pct > 75 ? 'var(--accent-amber)' : 'var(--accent-green)';

            return (
              <div key={g.id} onClick={onNavigate} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 14, padding: '0.875rem',
                position: 'relative', overflow: 'hidden', cursor: 'pointer',
                boxShadow: 'var(--shadow-card)',
              }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: color, borderRadius: '14px 0 0 14px' }} />
                <div style={{ paddingLeft: '0.625rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <p style={{ fontWeight: 700, color: 'var(--ink-1)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)' }}>{g.name}</p>
                    <span style={{ fontSize: '0.8rem', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{fmt(current)} / {fmt(target)}</span>
                  </div>
                  <div style={{ background: 'var(--bg-inset)', borderRadius: 999, height: 6, overflow: 'hidden', marginBottom: '0.375rem', border: '1px solid var(--border)' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999 }} />
                  </div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--ink-4)', fontFamily: 'var(--font-sans)' }}>
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
    ? result.canAfford ? 'var(--accent-green)' : result.touchesSavings ? 'var(--accent-amber)' : 'var(--accent-red)'
    : null;

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.125rem', marginBottom: '0.875rem', boxShadow: 'var(--shadow-card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
        <Zap size={13} color="var(--accent-amber)" />
        <p style={{ fontSize: '0.68rem', color: 'var(--ink-3)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)' }}>
          Can I Afford It?
        </p>
      </div>
      <p style={{ fontSize: '0.72rem', color: 'var(--ink-4)', marginBottom: '0.75rem', fontFamily: 'var(--font-sans)' }}>
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
            style={{ flex: 1, background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', borderRadius: 10, color: 'var(--ink-1)', padding: '0.625rem 0.875rem', fontSize: '0.9rem', outline: 'none', fontFamily: 'var(--font-sans)' }}
          />
          <button onClick={check} disabled={!amount} style={{ background: amount ? 'var(--ink-1)' : 'var(--bg-inset)', color: amount ? 'var(--bg)' : 'var(--ink-4)', border: 'none', borderRadius: 10, padding: '0.625rem 1rem', fontWeight: 700, fontSize: '0.875rem', cursor: amount ? 'pointer' : 'default', fontFamily: 'var(--font-sans)' }}>
            Check
          </button>
        </div>
      ) : (
        <>
          <div style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', borderRadius: 12, padding: '0.875rem', marginBottom: '0.625rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '1rem', fontWeight: 800, color: statusColor, fontFamily: 'var(--font-sans)' }}>
                  {result.canAfford ? '✓ Yes, you can afford it' : result.touchesSavings ? '⚠ Only if you use savings' : '✕ Not enough right now'}
                </p>
                <p style={{ fontSize: '0.775rem', color: 'var(--ink-3)', marginTop: '0.2rem', fontFamily: 'var(--font-sans)' }}>
                  {result.canAfford
                    ? `${fmt(result.remaining)} still available after this purchase`
                    : result.touchesSavings
                    ? `${fmt(Math.abs(result.remaining))} short — would need to dip into savings`
                    : `You're ${fmt(Math.abs(result.remaining))} short`}
                </p>
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--ink-1)', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>{fmt(result.val)}</span>
            </div>
          </div>
          <button onClick={reset} style={{ width: '100%', background: 'transparent', border: '1px solid var(--border-strong)', borderRadius: 8, color: 'var(--ink-3)', padding: '0.5rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
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
        <p style={{ fontSize: '0.68rem', color: 'var(--ink-3)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)' }}>Recent</p>
        <button onClick={onNavigate} style={{ background: 'transparent', border: 'none', color: 'var(--accent-green)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'var(--font-sans)' }}>
          See all <ChevronRight size={13} />
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {recent.map(t => (
          <div key={t.id} onClick={() => onEdit(t)} style={{
            background: 'var(--bg-card)', borderRadius: 12, padding: '0.75rem 0.875rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer',
            border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--ink-1)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)' }}>
                {t.description || t.category}
              </p>
              <p style={{ fontSize: '0.7rem', color: 'var(--ink-4)', fontFamily: 'var(--font-sans)' }}>{t.category} · {t.date}</p>
            </div>
            <p style={{ fontWeight: 800, fontSize: '0.9rem', flexShrink: 0, color: t.type === 'income' ? 'var(--accent-green)' : 'var(--accent-red)', fontFamily: 'var(--font-mono)' }}>
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
    <div className="page" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--ink-1)', fontFamily: 'var(--font-serif)' }}>FlowTracker</h1>
          <SyncIndicator state={syncState} />
        </div>
        {/* Top-right add button — high contrast */}
        <button onClick={() => { setEditing(null); setShowForm(true); }} style={{
          background: 'var(--ink-1)', color: 'var(--bg)', border: 'none', borderRadius: 12,
          width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(26,26,24,0.25)', cursor: 'pointer',
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

      {/* FAB — high contrast, clearly visible */}
      <button onClick={() => { setEditing(null); setShowForm(true); }} style={{
        position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', right: '1.25rem',
        background: 'var(--ink-1)', color: 'var(--bg)', border: 'none', borderRadius: '50%',
        width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(26,26,24,0.35)', zIndex: 200, cursor: 'pointer',
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