import { format, getMonth, getYear, subDays, differenceInDays, addDays } from 'date-fns';
import { Plus, Settings, MoreHorizontal } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactions } from '../hooks/useTransactions';
import { useToast } from '../components/ui/Toast';
import { useSavingsGoals } from '../hooks/useSavingsGoals';
import { useBudgets } from '../hooks/useBudgets';
import { useAccounts } from '../hooks/useAccounts';
import { useTransfers } from '../hooks/useTransfers';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { TransactionForm } from '../components/transactions/TransactionForm';
import {
  computeBudgetStatus, computeSummary, filterByDay, filterByMonth
} from '../lib/finance';
import { computeBalanceSplit } from '../lib/balanceEngine';

// ── Helpers ───────────────────────────────────────────────────────────────
const fmt = (n, ghost = false) => {
  if (ghost) return '••••';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(n || 0);
};
const fmtFull = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
const getTodayStr = () => format(new Date(), 'yyyy-MM-dd');

// ── Streak dots ───────────────────────────────────────────────────────────
function StreakDots({ count = 7, filled = 5 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} style={{
          width: 4, height: 11, borderRadius: 2,
          background: i < filled ? '#1A6B3A' : 'rgba(26,26,24,0.15)',
          display: 'inline-block'
        }} />
      ))}
    </span>
  );
}

// ── Balance Hero ──────────────────────────────────────────────────────────
function BalanceHero({ totalBalance, availableBalance, totalSavings, dailyBudget, daysLeft, onTrack, streak, ghost }) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => { setRevealed(true); }, []);

  return (
    <div style={{
      marginBottom: '1rem',
      opacity: revealed ? 1 : 0,
      transform: revealed ? 'none' : 'translateY(8px)',
      transition: 'opacity 0.4s ease, transform 0.4s ease'
    }}>
      <p style={{
        fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '0.25rem',
        fontFamily: 'var(--font-sans)'
      }}>Balance</p>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.15rem', marginBottom: '0.5rem' }}>
        <span style={{
          fontFamily: 'var(--font-serif)', fontSize: '0.9rem', fontWeight: 700,
          color: 'var(--ink-3)', lineHeight: 1
        }}>$</span>
        <span style={{
          fontFamily: 'var(--font-serif)', fontSize: '3.5rem', fontWeight: 900,
          color: 'var(--ink-1)', lineHeight: 1, letterSpacing: '-0.02em'
        }}>
          {ghost ? '••,•••' : Math.abs(totalBalance).toLocaleString('en-US')}
        </span>
      </div>

      {/* Sub-row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.875rem',
        fontSize: '0.825rem', color: 'var(--accent-green)', fontWeight: 600,
        fontFamily: 'var(--font-sans)', marginBottom: '0.625rem'
      }}>
        <span style={{ color: 'var(--accent-green)' }}>{ghost ? '••••' : fmtFull(availableBalance)} avail</span>
        <span style={{ color: 'var(--ink-3)' }}>{dailyBudget ? `$${Math.round(dailyBudget)}/day` : '—'}</span>
        {daysLeft > 0 && <span style={{ color: 'var(--ink-3)' }}>{daysLeft}d left</span>}
      </div>

      {/* On track row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: onTrack ? 'var(--accent-green)' : 'var(--accent-red)',
          display: 'inline-block'
        }} />
        <span style={{
          fontSize: '0.8rem', color: 'var(--ink-2)', fontFamily: 'var(--font-sans)'
        }}>
          {onTrack ? 'On track today' : 'Off track today'}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
          {streak}d
        </span>
        <StreakDots count={7} filled={Math.min(streak, 7)} />
      </div>
    </div>
  );
}

// ── Alert Card ────────────────────────────────────────────────────────────
function AlertCard({ status, monthSummary, goals, dailyBudget, onAction }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  // Determine state
  const overBudgets = status.filter(b => b.over);
  const topOver = overBudgets.sort((a, b) => (b.spent - b.amount_limit) - (a.spent - a.amount_limit))[0];
  const monthBalance = monthSummary.income - monthSummary.expense;
  const isNegative = monthBalance < 0;

  // Critical: over budget significantly
  if (topOver && (topOver.spent - topOver.amount_limit) > 50) {
    const overAmt = topOver.spent - topOver.amount_limit;
    const cat = topOver.category.charAt(0).toUpperCase() + topOver.category.slice(1);
    const affectedGoal = goals[0];

    return (
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderLeft: '3px solid var(--accent-red)',
        borderRadius: 'var(--radius)',
        padding: '1.125rem',
        marginBottom: '0.75rem',
        boxShadow: 'var(--shadow-card)'
      }}>
        {/* Label row */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '0.625rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-red)', display: 'inline-block' }} />
            <span style={{
              fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)'
            }}>Critical · {cat} · Over ${Math.round(overAmt)}</span>
          </div>
          <span style={{
            fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-red)',
            fontFamily: 'var(--font-mono)'
          }}>-${Math.round(overAmt)}</span>
        </div>

        {/* Headline */}
        <h2 style={{
          fontFamily: 'var(--font-serif)', fontSize: '1.875rem', fontWeight: 900,
          color: 'var(--ink-1)', lineHeight: 1.1, marginBottom: '0.875rem',
          letterSpacing: '-0.01em'
        }}>
          You're ${Math.round(overAmt)} over on {cat}.
        </h2>

        {/* KV rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '1rem' }}>
          {[
            { label: 'MONTH', value: `${monthBalance >= 0 ? '+' : ''}${fmtFull(monthBalance)}`, color: monthBalance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' },
            { label: 'DAILY', value: `$${Math.round(dailyBudget)}/day`, color: 'var(--ink-2)' },
            affectedGoal && { label: 'GOAL', value: `${affectedGoal.name} –2 wk`, color: 'var(--ink-3)' },
          ].filter(Boolean).map(row => (
            <div key={row.label} style={{ display: 'flex', gap: '1rem', alignItems: 'baseline' }}>
              <span style={{
                fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em',
                color: 'var(--ink-4)', width: 40, fontFamily: 'var(--font-sans)'
              }}>{row.label}</span>
              <span style={{
                fontSize: '0.875rem', fontWeight: 600, color: row.color || 'var(--ink-2)',
                fontFamily: 'var(--font-mono)'
              }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Primary CTA */}
        <button
          onClick={() => onAction && onAction('rebalance', topOver)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            width: '100%', background: 'var(--ink-1)', color: 'var(--bg)',
            border: 'none', borderRadius: 999, padding: '0.875rem 1.25rem',
            fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 600,
            cursor: 'pointer', marginBottom: '0.625rem',
            letterSpacing: '-0.01em'
          }}
        >
          Fix by capping {cat}
          <span style={{ opacity: 0.5, fontSize: '0.85rem' }}>↗</span>
        </button>

        {/* Secondary actions */}
        <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center' }}>
          {['Accept the overage', 'Dismiss'].map(a => (
            <button key={a} onClick={() => a === 'Dismiss' && setDismissed(true)} style={{
              background: 'none', border: 'none', fontSize: '0.825rem',
              color: 'var(--ink-3)', fontFamily: 'var(--font-sans)', cursor: 'pointer',
              textDecoration: 'underline', textDecorationColor: 'var(--border-strong)'
            }}>{a}</button>
          ))}
        </div>

        {/* Pattern note */}
        {affectedGoal && (
          <p style={{
            marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--ink-4)',
            fontFamily: 'var(--font-sans)', lineHeight: 1.5,
            borderTop: '1px solid var(--border)', paddingTop: '0.625rem'
          }}>
            <span style={{ fontWeight: 700 }}>PTN</span> You exceed {cat} mid-month. →{' '}
            <span style={{ fontWeight: 600, color: 'var(--ink-3)' }}>Fix before the weekend</span>
          </p>
        )}
      </div>
    );
  }

  // Medium: goal drifting
  const driftingGoal = goals.find(g => {
    const pct = Number(g.current_amount || 0) / Number(g.target_amount || 1);
    return pct < 0.5 && g.target_date && differenceInDays(new Date(g.target_date), new Date()) < 60;
  });

  if (driftingGoal && monthBalance > 0) {
    const weeksLate = 3; // simplified
    const surplus = monthBalance;

    return (
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderLeft: '3px solid var(--accent-amber)',
        borderRadius: 'var(--radius)',
        padding: '1.125rem',
        marginBottom: '0.75rem',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '0.625rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-amber)', display: 'inline-block' }} />
            <span style={{
              fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)'
            }}>Medium · {driftingGoal.name} · Drifting</span>
          </div>
          <span style={{
            fontSize: '0.875rem', fontWeight: 700, color: 'var(--accent-amber)',
            fontFamily: 'var(--font-mono)'
          }}>–{weeksLate} wk</span>
        </div>

        <h2 style={{
          fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 700,
          color: 'var(--ink-1)', lineHeight: 1.15, marginBottom: '0.875rem',
          fontStyle: 'italic'
        }}>
          {driftingGoal.name} is {weeksLate} weeks late.
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '1rem' }}>
          {[
            { label: 'MONTH', value: `+${fmtFull(surplus)}`, color: 'var(--accent-red)' },
            { label: 'DAILY', value: `$${Math.round(surplus / 30)}/day`, color: 'var(--ink-2)' },
            { label: 'GOAL', value: `+${weeksLate} wk delay`, color: 'var(--accent-amber)' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', gap: '1rem', alignItems: 'baseline' }}>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--ink-4)', width: 40, fontFamily: 'var(--font-sans)' }}>{row.label}</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: row.color, fontFamily: 'var(--font-mono)' }}>{row.value}</span>
            </div>
          ))}
        </div>

        <button style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          width: '100%', background: 'var(--ink-1)', color: 'var(--bg)',
          border: 'none', borderRadius: 999, padding: '0.875rem 1.25rem',
          fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 600,
          cursor: 'pointer', marginBottom: '0.625rem'
        }}>
          Offset with +${Math.round(surplus * 0.3)}/month
          <span style={{ opacity: 0.5 }}>↗</span>
        </button>

        <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center' }}>
          {['Move target to next month', 'Dismiss'].map(a => (
            <button key={a} onClick={() => a === 'Dismiss' && setDismissed(true)} style={{
              background: 'none', border: 'none', fontSize: '0.825rem',
              color: 'var(--ink-3)', fontFamily: 'var(--font-sans)', cursor: 'pointer',
              textDecoration: 'underline', textDecorationColor: 'var(--border-strong)'
            }}>{a}</button>
          ))}
        </div>

        <p style={{
          marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--ink-4)',
          fontFamily: 'var(--font-sans)', lineHeight: 1.5,
          borderTop: '1px solid var(--border)', paddingTop: '0.625rem'
        }}>
          <span style={{ fontWeight: 700 }}>PTN</span> Weekend spending drains this goal. →{' '}
          <span style={{ fontWeight: 600, color: 'var(--ink-3)' }}>Offset weekends with +${Math.round(surplus * 0.1)}/mo</span>
        </p>
      </div>
    );
  }

  // Steady / All good
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderLeft: '3px solid var(--ink-4)',
      borderRadius: 'var(--radius)',
      padding: '1.125rem',
      marginBottom: '0.75rem',
      boxShadow: 'var(--shadow-card)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ink-4)', display: 'inline-block' }} />
        <span style={{
          fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)'
        }}>Steady</span>
      </div>

      <p style={{
        fontFamily: 'var(--font-serif)', fontSize: '1.375rem', fontWeight: 400,
        color: 'var(--ink-2)', fontStyle: 'italic', lineHeight: 1.2, marginBottom: '0.75rem'
      }}>
        Everything holding.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {[
          { label: 'MONTH', value: monthBalance >= 0 ? `+${fmtFull(monthBalance)}` : fmtFull(monthBalance), color: monthBalance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' },
          { label: 'DAILY', value: `$${Math.round(dailyBudget)}/day`, color: 'var(--ink-2)' },
          goals.length > 0 && { label: 'GOALS', value: 'gaining', color: 'var(--accent-green)' },
        ].filter(Boolean).map(row => (
          <div key={row.label} style={{ display: 'flex', gap: '1rem', alignItems: 'baseline' }}>
            <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--ink-4)', width: 40, fontFamily: 'var(--font-sans)' }}>{row.label}</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: row.color, fontFamily: 'var(--font-mono)' }}>{row.value}</span>
          </div>
        ))}
      </div>

      {goals[0] && (
        <button style={{
          marginTop: '0.75rem', background: 'none', border: 'none',
          fontFamily: 'var(--font-sans)', fontSize: '0.825rem', color: 'var(--ink-3)',
          cursor: 'pointer', padding: 0, textDecoration: 'underline',
          textDecorationColor: 'var(--border-strong)'
        }}>
          Sweep $20 to {goals[0].name} →
        </button>
      )}
    </div>
  );
}

// ── Today's Transactions ──────────────────────────────────────────────────
function TodayFeed({ transactions, onEdit, onDelete }) {
  const today = filterByDay(transactions, getTodayStr());
  if (today.length === 0) return null;

  const catIcons = {
    food: '🍔', transport: '🚗', housing: '🏠', health: '❤️',
    entertainment: '🎬', shopping: '🛍️', education: '📚', bills: '⚡',
    subscriptions: '🔄', salary: '💼', freelance: '🧑‍💻', other: '💰',
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '0.5rem'
      }}>
        <span style={{
          fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink-1)',
          fontFamily: 'var(--font-sans)'
        }}>Today</span>
        <span style={{
          fontSize: '0.75rem', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)',
          fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase'
        }}>{today.length} {today.length === 1 ? 'Entry' : 'Entries'}</span>
      </div>

      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {today.map((t, i) => (
          <div
            key={t.id}
            onClick={() => onEdit(t)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              borderBottom: i < today.length - 1 ? '1px solid var(--border)' : 'none',
              cursor: 'pointer',
              transition: 'background 0.1s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-inset)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.1rem' }}>{catIcons[t.category] || '💸'}</span>
              <div>
                <p style={{
                  fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink-1)',
                  fontFamily: 'var(--font-sans)'
                }}>{t.description || t.category.charAt(0).toUpperCase() + t.category.slice(1)}</p>
                <p style={{
                  fontSize: '0.75rem', color: 'var(--ink-3)',
                  fontFamily: 'var(--font-sans)', textTransform: 'capitalize'
                }}>{t.category}</p>
              </div>
            </div>
            <span style={{
              fontSize: '0.9375rem', fontWeight: 700,
              color: t.type === 'income' ? 'var(--accent-green)' : 'var(--accent-red)',
              fontFamily: 'var(--font-mono)'
            }}>
              {t.type === 'income' ? '+' : '-'}{fmtFull(t.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Monthly Plan strip ────────────────────────────────────────────────────
function MonthStrip({ budgetStatus }) {
  if (!budgetStatus || budgetStatus.length === 0) return null;
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const spentDays = now.getDate();
  const totalSpent = budgetStatus.reduce((s, b) => s + b.spent, 0);
  const totalLimit = budgetStatus.reduce((s, b) => s + b.amount_limit, 0);
  const pct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '0.875rem 1rem',
      marginBottom: '0.75rem', boxShadow: 'var(--shadow-card)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)' }}>
          {format(now, 'MMMM').toUpperCase()} · {daysInMonth - spentDays}D LEFT
        </p>
        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: pct > 90 ? 'var(--accent-red)' : 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>
          {pct}%
        </p>
      </div>
      <p style={{ fontSize: '0.825rem', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)', marginBottom: '0.5rem' }}>
        Spent {fmtFull(totalSpent)} of {fmtFull(totalLimit)}
      </p>
      <div style={{ background: 'var(--bg-inset)', borderRadius: 999, height: 4, overflow: 'hidden' }}>
        <div style={{
          width: `${Math.min(pct, 100)}%`, height: '100%', borderRadius: 999,
          background: pct > 90 ? 'var(--accent-red)' : pct > 70 ? 'var(--accent-amber)' : 'var(--ink-2)',
          transition: 'width 0.5s ease'
        }} />
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const { transactions, syncState, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { push } = useToast();
  const { goals } = useSavingsGoals();
  const { budgets } = useBudgets();
  const { accounts, computeAccountBalances } = useAccounts();
  const { transfers } = useTransfers();
  const { prefs } = useUserPreferences();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const { totalBalance, availableBalance, totalSavings } = computeBalanceSplit(transactions);

  const now = new Date();
  const monthlyTx = filterByMonth(transactions, now.getFullYear(), now.getMonth());
  const monthSummary = computeSummary(monthlyTx);
  const budgetStatus = computeBudgetStatus(monthlyTx, budgets);

  // Daily budget
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - now.getDate();
  const dailyBudget = daysLeft > 0 ? availableBalance / daysLeft : 0;

  // Streak (simplified: consecutive days with transactions)
  const streak = Math.min(transactions.length > 0 ? 5 : 0, 7);
  const onTrack = monthSummary.income > monthSummary.expense || monthSummary.expense === 0;

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

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
        <p style={{
          fontFamily: 'var(--font-sans)', fontSize: '0.65rem', fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)'
        }}>FLOWTRACKER</p>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => navigate('/settings')}
            style={{
              background: 'none', border: '1px solid var(--border)',
              borderRadius: 999, width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--ink-3)'
            }}
          >
            <Settings size={15} />
          </button>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            style={{
              background: 'var(--ink-1)', color: 'var(--bg)', border: 'none',
              borderRadius: 999, width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '0 2px 8px rgba(26,26,24,0.2)'
            }}
          >
            <Plus size={17} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* ── Balance Hero ── */}
      <BalanceHero
        totalBalance={totalBalance}
        availableBalance={availableBalance}
        totalSavings={totalSavings}
        dailyBudget={dailyBudget}
        daysLeft={daysLeft}
        onTrack={onTrack}
        streak={streak}
        ghost={prefs.ghost_mode}
      />

      {/* ── Month strip ── */}
      <MonthStrip budgetStatus={budgetStatus} />

      {/* ── Alert card ── */}
      <AlertCard
        status={budgetStatus}
        monthSummary={monthSummary}
        goals={goals}
        dailyBudget={dailyBudget}
        onAction={(action, data) => {
          if (action === 'rebalance') navigate('/budgets');
        }}
      />

      {/* ── Today's transactions ── */}
      <TodayFeed
        transactions={transactions}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* ── Empty state ── */}
      {filterByDay(transactions, getTodayStr()).length === 0 && (
        <div style={{
          textAlign: 'center', padding: '2rem 0',
          color: 'var(--ink-4)', fontFamily: 'var(--font-sans)', fontSize: '0.875rem'
        }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '1.25rem', color: 'var(--ink-3)', marginBottom: '0.25rem' }}>
            Nothing logged today.
          </p>
          <p>Tap + to record a transaction</p>
        </div>
      )}

      {/* ── FAB ── */}
      <button
        onClick={() => { setEditing(null); setShowForm(true); }}
        style={{
          position: 'fixed',
          bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
          right: '1.25rem',
          background: 'var(--ink-1)', color: 'var(--bg)', border: 'none',
          borderRadius: '50%', width: 52, height: 52,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(26,26,24,0.25)', zIndex: 200, cursor: 'pointer'
        }}
      >
        <Plus size={22} strokeWidth={2.5} />
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
    </div>
  );
}
