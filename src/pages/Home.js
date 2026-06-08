/**
 * Home.js — v5
 * - Full light theme migration (cream / white cards / dark ink)
 * - Savings breakdown fix: reads savingsBreakdown from computeAccountBalances
 *   (transaction-based, correct) instead of empty account_savings_allocations table
 */
import { format, getMonth, getYear, subDays, differenceInDays } from 'date-fns';
import { Plus, Eye, EyeOff, ChevronRight, Zap, Target, X } from 'lucide-react';
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

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

// ── Design tokens (light theme) ───────────────────────────────────────────
const INK1        = '#1A1A18';
const INK2        = 'rgba(26,26,24,0.55)';
const INK3        = 'rgba(26,26,24,0.38)';
const BORDER      = 'rgba(26,26,24,0.09)';
const CARD        = '#FFFFFF';
const INSET       = 'rgba(26,26,24,0.04)';
const GREEN       = '#16a34a';
const GREEN_BG    = 'rgba(22,163,74,0.07)';
const GREEN_BORDER = 'rgba(22,163,74,0.2)';
const RED         = '#dc2626';
const RED_BG      = 'rgba(220,38,38,0.07)';

// ── Savings Breakdown Sheet ───────────────────────────────────────────────
function SavingsBreakdownSheet({ accounts, savingsPerAccount, totalSavings, onClose, onNavigateAccounts }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,26,24,0.45)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: '#FEFCF8', borderRadius: '20px 20px 0 0',
        border: '1px solid rgba(26,26,24,0.1)', borderBottom: 'none',
        width: '100%', maxWidth: 600,
        padding: '1.5rem 1.25rem 2.5rem',
        boxShadow: '0 -4px 24px rgba(26,26,24,0.1)',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(26,26,24,0.12)', margin: '0 auto 1.25rem' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <p style={{ fontSize: '0.65rem', color: INK3, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Savings Breakdown
            </p>
            <p style={{ fontSize: '1.875rem', fontWeight: 800, color: INK1, letterSpacing: '-0.025em' }}>{fmt(totalSavings)}</p>
          </div>
          <button onClick={onClose} style={{
            background: INSET, border: `1px solid ${BORDER}`,
            borderRadius: 8, color: INK2, width: 30, height: 30,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={14} />
          </button>
        </div>

        {accounts.length === 0 ? (
          <p style={{ color: INK3, fontSize: '0.875rem', textAlign: 'center', padding: '1.5rem' }}>No accounts set up yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {accounts.map((a) => {
              const sav = savingsPerAccount[a.id] || 0;
              const pct = totalSavings > 0 ? (sav / totalSavings) * 100 : 0;
              return (
                <div key={a.id} style={{
                  background: CARD, borderRadius: 12, padding: '0.875rem 1rem',
                  border: `1px solid ${BORDER}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: sav > 0 ? '0.5rem' : 0 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `${a.color}15`, border: `1px solid ${a.color}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.1rem', flexShrink: 0,
                    }}>
                      {a.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, color: INK1, fontSize: '0.9rem' }}>{a.name}</p>
                      <p style={{ fontSize: '0.7rem', color: a.color, fontWeight: 600, textTransform: 'capitalize' }}>{a.type}</p>
                    </div>
                    <p style={{ fontWeight: 800, color: sav > 0 ? INK1 : INK3, fontSize: '1rem' }}>{fmt(sav)}</p>
                  </div>
                  {sav > 0 && totalSavings > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1, background: INSET, borderRadius: 999, height: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: a.color, borderRadius: 999, opacity: 0.7 }} />
                      </div>
                      <span style={{ fontSize: '0.65rem', color: INK3, fontWeight: 600, flexShrink: 0 }}>{Math.round(pct)}%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <button onClick={() => { onClose(); onNavigateAccounts(); }} style={{
          background: INK1, color: '#FEFCF8', border: 'none', borderRadius: 10,
          padding: '0.875rem', fontWeight: 700, fontSize: '0.875rem',
          cursor: 'pointer', width: '100%', fontFamily: 'inherit',
        }}>
          Edit Savings by Account →
        </button>
        <p style={{ fontSize: '0.65rem', color: INK3, textAlign: 'center', marginTop: '0.5rem' }}>
          Savings allocations do not affect income or expense reports
        </p>
      </div>
    </div>
  );
}

// ── SECTION 1: Financial State ────────────────────────────────────────────
function FinancialState({ totalBalance, availableBalance, totalSavings, ghostMode, onToggleGhost, onSavingsTap }) {
  const displayedTotal  = ghostMode ? availableBalance : totalBalance;
  const balancePositive = displayedTotal >= 0;

  return (
    <div style={{
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20,
      padding: '1.375rem', marginBottom: '0.875rem',
      boxShadow: '0 1px 4px rgba(26,26,24,0.06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.65rem', color: INK3, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Your Money
        </span>
        <button onClick={onToggleGhost} style={{
          background: ghostMode ? 'rgba(245,158,11,0.08)' : INSET,
          border: `1px solid ${ghostMode ? 'rgba(245,158,11,0.25)' : BORDER}`,
          borderRadius: 8, padding: '3px 10px',
          color: ghostMode ? '#b45309' : INK2,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
          fontSize: '0.7rem', fontWeight: 700, fontFamily: 'inherit',
        }}>
          {ghostMode ? <EyeOff size={11} /> : <Eye size={11} />}
          {ghostMode ? 'Savings hidden' : 'Show all'}
        </button>
      </div>

      <p style={{ fontSize: '0.65rem', color: INK3, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
        {ghostMode ? 'Available to spend' : 'Total balance'}
      </p>
      <p style={{
        fontSize: '2.625rem', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1,
        color: balancePositive ? INK1 : RED, marginBottom: '0.25rem',
        fontFamily: 'var(--font-serif, Georgia, serif)',
      }}>
        {fmt(displayedTotal)}
      </p>
      <p style={{ fontSize: '0.72rem', color: INK3, marginBottom: '1.125rem', lineHeight: 1.4 }}>
        {ghostMode
          ? 'Freely spendable — savings excluded'
          : balancePositive
            ? `Total income minus expenses${totalSavings > 0 ? ' (savings included)' : ''}`
            : 'Expenses exceed income this period'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
        {/* Available */}
        <div style={{
          background: GREEN_BG, border: `1px solid ${GREEN_BORDER}`,
          borderRadius: 12, padding: '0.875rem',
        }}>
          <p style={{ fontSize: '0.6rem', color: GREEN, fontWeight: 700, letterSpacing: '0.07em', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Available</p>
          <p style={{ fontSize: '1.2rem', fontWeight: 800, color: INK1, marginBottom: '0.2rem' }}>{fmt(availableBalance)}</p>
          <p style={{ fontSize: '0.63rem', color: INK3, lineHeight: 1.4 }}>Free to spend — savings not included</p>
        </div>

        {/* Savings — tappable or hidden */}
        {ghostMode ? (
          <div style={{
            background: INSET, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '0.875rem',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
          }}>
            <EyeOff size={16} color={INK3} />
            <p style={{ fontSize: '0.63rem', color: INK3, fontWeight: 700 }}>Hidden</p>
          </div>
        ) : (
          <button onClick={onSavingsTap} style={{
            background: 'rgba(26,26,24,0.03)', border: `1px solid ${BORDER}`,
            borderRadius: 12, padding: '0.875rem', textAlign: 'left',
            cursor: 'pointer', width: '100%', fontFamily: 'inherit',
          }}>
            <p style={{ fontSize: '0.6rem', color: INK2, fontWeight: 700, letterSpacing: '0.07em', marginBottom: '0.3rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              Savings <span style={{ fontSize: '0.55rem', color: INK3 }}>▾</span>
            </p>
            <p style={{ fontSize: '1.2rem', fontWeight: 800, color: INK1, marginBottom: '0.2rem' }}>{fmt(totalSavings)}</p>
            <p style={{ fontSize: '0.63rem', color: INK3, lineHeight: 1.4 }}>Tap for breakdown by account</p>
          </button>
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

  const income = monthlyTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const savingsThisMonth = monthlyTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.savings_allocation || 0), 0);
  const expense = monthlyTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  const spentPct    = income > 0 ? Math.round((expense / income) * 100) : 0;
  const expectedPct = Math.round((dayOfMonth / daysInMonth) * 100);
  const onTrack     = spentPct <= expectedPct + 8;
  const projectedByMonthEnd = dayOfMonth > 0 ? (expense / dayOfMonth) * daysInMonth : 0;
  const fixed = monthlyTx.filter(t => t.type === 'expense' && t.nature === 'fixed').slice(0, 3);

  if (income === 0 && fixed.length === 0) return null;

  return (
    <div style={{
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16,
      padding: '1.125rem', marginBottom: '0.875rem',
      boxShadow: '0 1px 3px rgba(26,26,24,0.05)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
        <p style={{ fontSize: '0.65rem', color: INK3, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase' }}>
          {format(now, 'MMMM')} at a glance
        </p>
        <span style={{
          fontSize: '0.67rem', fontWeight: 700, padding: '3px 9px', borderRadius: 20,
          background: onTrack ? GREEN_BG : RED_BG,
          color: onTrack ? GREEN : RED,
          border: `1px solid ${onTrack ? GREEN_BORDER : 'rgba(220,38,38,0.2)'}`,
        }}>
          {onTrack ? '✓ On track' : '⚠ Spending fast'}
        </span>
      </div>

      {income > 0 && (
        <>
          <div style={{ marginBottom: '0.875rem' }}>
            <div style={{
              background: INSET, borderRadius: 12, padding: '0.875rem 1rem', marginBottom: '0.5rem',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              border: `1px solid ${BORDER}`,
            }}>
              <div>
                <p style={{ fontSize: '0.65rem', color: INK3, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Spent this month</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 900, color: RED, letterSpacing: '-0.01em' }}>{fmt(expense)}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.65rem', color: INK3, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Available</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 900, color: availableBalance >= 0 ? GREEN : RED, letterSpacing: '-0.01em' }}>{fmt(availableBalance)}</p>
              </div>
            </div>
            <p style={{ fontSize: '0.7rem', color: INK3, textAlign: 'center' }}>
              {daysLeft} days left in {format(now, 'MMMM')}
              {savingsThisMonth > 0 && (
                <span style={{ color: INK2, marginLeft: '0.5rem' }}>· {fmt(savingsThisMonth)} saved</span>
              )}
            </p>
          </div>

          <div style={{ marginBottom: fixed.length > 0 ? '0.875rem' : 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
              <span style={{ fontSize: '0.7rem', color: INK3 }}>Spending pace</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: spentPct > expectedPct + 10 ? RED : INK2 }}>
                {spentPct}% of income used
              </span>
            </div>
            <div style={{ background: INSET, borderRadius: 4, height: 5, position: 'relative', overflow: 'hidden', border: `1px solid ${BORDER}` }}>
              <div style={{ position: 'absolute', left: `${expectedPct}%`, top: 0, bottom: 0, width: 2, background: 'rgba(26,26,24,0.15)', zIndex: 2 }} />
              <div style={{
                width: `${Math.min(spentPct, 100)}%`, height: '100%',
                background: spentPct > expectedPct + 10
                  ? `linear-gradient(90deg, #f59e0b, ${RED})`
                  : `linear-gradient(90deg, ${GREEN}, #0d9488)`,
                borderRadius: 4,
              }} />
            </div>
            <p style={{ fontSize: '0.65rem', color: INK3, marginTop: '0.25rem' }}>
              Day {dayOfMonth}/{daysInMonth} — projected: {fmt(projectedByMonthEnd)} by month-end
            </p>
          </div>
        </>
      )}

      {fixed.length > 0 && (
        <>
          <p style={{ fontSize: '0.63rem', color: INK3, fontWeight: 700, letterSpacing: '0.06em', marginBottom: '0.375rem', textTransform: 'uppercase' }}>Fixed bills this month</p>
          {fixed.map(t => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.2rem' }}>
              <span style={{ fontSize: '0.8rem', color: INK2 }}>{t.description || t.category}</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: RED }}>-{fmt(t.amount)}</span>
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
        <p style={{ fontSize: '0.65rem', color: INK3, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase' }}>Savings Goals</p>
        <button onClick={onNavigate} style={{
          background: 'transparent', border: 'none', color: INK2,
          fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 3,
        }}>
          All goals <ChevronRight size={13} />
        </button>
      </div>

      {active.length === 0 ? (
        <div style={{
          background: CARD, border: `1px dashed ${BORDER}`,
          borderRadius: 14, padding: '1.25rem', textAlign: 'center',
        }}>
          <Target size={24} color={INK3} style={{ marginBottom: '0.5rem' }} />
          <p style={{ color: INK3, fontSize: '0.825rem', marginBottom: '0.5rem' }}>No active goals</p>
          <button onClick={onNavigate} style={{
            background: INSET, border: `1px solid ${BORDER}`, borderRadius: 8,
            padding: '5px 14px', color: INK2, fontSize: '0.775rem', fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            + Create a goal
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {active.map(g => {
            const current     = Number(g.current_amount || 0);
            const target      = Number(g.target_amount  || 0);
            const pct         = target > 0 ? Math.min((current / target) * 100, 100) : 0;
            const pace        = estimatePace(g);
            const accentColor = pct > 75 ? '#b45309' : INK1;

            return (
              <div key={g.id} onClick={onNavigate} style={{
                background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '0.875rem',
                position: 'relative', overflow: 'hidden', cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(26,26,24,0.05)',
              }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: accentColor, borderRadius: '14px 0 0 14px', opacity: 0.4 }} />
                <div style={{ paddingLeft: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <p style={{ fontWeight: 700, color: INK1, fontSize: '0.875rem' }}>{g.name}</p>
                    <span style={{ fontSize: '0.78rem', color: INK2 }}>{fmt(current)} / {fmt(target)}</span>
                  </div>
                  <div style={{ background: INSET, borderRadius: 999, height: 5, overflow: 'hidden', marginBottom: '0.35rem' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: accentColor, borderRadius: 999, opacity: 0.6 }} />
                  </div>
                  <p style={{ fontSize: '0.7rem', color: INK3 }}>
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
    ? result.canAfford ? GREEN : result.touchesSavings ? '#b45309' : RED
    : null;

  return (
    <div style={{
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16,
      padding: '1.125rem', marginBottom: '0.875rem',
      boxShadow: '0 1px 3px rgba(26,26,24,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
        <Zap size={13} color="#b45309" />
        <p style={{ fontSize: '0.65rem', color: INK3, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase' }}>
          Can I Afford It?
        </p>
      </div>
      <p style={{ fontSize: '0.72rem', color: INK3, marginBottom: '0.75rem' }}>
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
            style={{
              flex: 1, background: INSET, border: `1px solid ${BORDER}`,
              borderRadius: 10, color: INK1, padding: '0.625rem 0.875rem',
              fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit',
            }}
          />
          <button onClick={check} disabled={!amount} style={{
            background: amount ? INK1 : INSET,
            color: amount ? '#FEFCF8' : INK3,
            border: 'none', borderRadius: 10, padding: '0.625rem 1rem',
            fontWeight: 700, fontSize: '0.875rem',
            cursor: amount ? 'pointer' : 'default', fontFamily: 'inherit',
          }}>
            Check
          </button>
        </div>
      ) : (
        <>
          <div style={{
            background: `${statusColor}0D`, border: `1px solid ${statusColor}30`,
            borderRadius: 12, padding: '0.875rem', marginBottom: '0.625rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '1rem', fontWeight: 800, color: statusColor }}>
                  {result.canAfford ? '✓ Yes, you can afford it' : result.touchesSavings ? '⚠ Only if you use savings' : '✕ Not enough right now'}
                </p>
                <p style={{ fontSize: '0.775rem', color: INK2, marginTop: '0.2rem' }}>
                  {result.canAfford
                    ? `${fmt(result.remaining)} still available after this purchase`
                    : result.touchesSavings
                    ? `${fmt(Math.abs(result.remaining))} short — would need savings`
                    : `You're ${fmt(Math.abs(result.remaining))} short`}
                </p>
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: INK1, flexShrink: 0 }}>{fmt(result.val)}</span>
            </div>
          </div>
          <button onClick={reset} style={{
            width: '100%', background: INSET, border: `1px solid ${BORDER}`,
            borderRadius: 8, color: INK2, padding: '0.5rem',
            fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>
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
        <p style={{ fontSize: '0.65rem', color: INK3, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase' }}>Recent</p>
        <button onClick={onNavigate} style={{
          background: 'transparent', border: 'none', color: INK2,
          fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 3,
        }}>
          See all <ChevronRight size={13} />
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {recent.map(t => (
          <div key={t.id} onClick={() => onEdit(t)} style={{
            background: CARD, borderRadius: 12, padding: '0.75rem 0.875rem',
            border: `1px solid ${BORDER}`,
            display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.85rem', color: INK1, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.description || t.category}
              </p>
              <p style={{ fontSize: '0.7rem', color: INK3 }}>{t.category} · {t.date}</p>
            </div>
            <p style={{ fontWeight: 800, fontSize: '0.9rem', flexShrink: 0, color: t.type === 'income' ? GREEN : RED }}>
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

  const [showForm,         setShowForm]         = useState(false);
  const [editing,          setEditing]          = useState(null);
  const [showSavingsSheet, setShowSavingsSheet] = useState(false);

  // Global totals — transaction-based (correct, unchanged)
  const { totalBalance, availableBalance, totalSavings } = computeBalanceSplit(transactions);

  // Per-account savings — SAME transaction-based system (fixes $0 breakdown bug)
  // savingsBreakdown[account_id] = savings_allocation routed to that account via savings_account_id
  const { savingsBreakdown: savingsPerAccount } = computeAccountBalances(transactions, transfers);

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
          <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: INK1 }}>FlowTracker</h1>
          <SyncIndicator state={syncState} />
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} style={{
          background: INK1, color: '#FEFCF8', border: 'none', borderRadius: 12,
          width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(26,26,24,0.2)', cursor: 'pointer',
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
        onSavingsTap={() => setShowSavingsSheet(true)}
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
        background: INK1, color: '#FEFCF8', border: 'none', borderRadius: '50%',
        width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(26,26,24,0.3)', zIndex: 200, cursor: 'pointer',
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

      {showSavingsSheet && (
        <SavingsBreakdownSheet
          accounts={accounts}
          savingsPerAccount={savingsPerAccount}
          totalSavings={totalSavings}
          onClose={() => setShowSavingsSheet(false)}
          onNavigateAccounts={() => navigate('/more/accounts')}
        />
      )}

      <ConfirmModal />
    </div>
  );
}