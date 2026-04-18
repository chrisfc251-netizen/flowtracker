/**
 * Plan.js — v3
 *
 * Fix 1: Marking N/A → budget auto-redistributes to active categories
 *        in priority order → saves immediately to Supabase
 * Fix 2: Projection numbers have clear human labels
 */
import { useState }       from 'react';
import { getMonth, getYear, format } from 'date-fns';
import { Pencil, Trash2, Plus, ChevronDown, ChevronUp, Ban } from 'lucide-react';

import { useBudgets }            from '../hooks/useBudgets';
import { useTransactions }       from '../hooks/useTransactions';
import { useSavingsGoals }       from '../hooks/useSavingsGoals';
import { useCategoryPriorities } from '../hooks/useCategoryPriorities';
import { useSubscription }       from '../hooks/useSubscription';
import { useToast }              from '../components/ui/Toast';
import { useConfirm }            from '../components/ui/ConfirmModal';
import { ProUpgradePrompt }      from '../components/ui/ProUpgradePrompt';
import { EmptyState, PageLoader, Spinner } from '../components/ui/EmptyState';
import { SmartBudgetPanel }      from '../components/budgets/SmartBudgetPanel';

import { formatUSD, getCategoryMeta, EXPENSE_CATEGORIES } from '../lib/constants';
import { computeBudgetStatus, filterByMonth }             from '../lib/finance';
import { computeBalanceSplit, rebalanceBudget }           from '../lib/balanceEngine';
import { predictMonthEnd }                                from '../lib/analytics';

// ── N/A persistence (localStorage) ───────────────────────────────────────
const NA_KEY = 'flowtracker_na_categories';
function loadNA()       { try { return JSON.parse(localStorage.getItem(NA_KEY) || '[]'); } catch { return []; } }
function saveNA(list)   { try { localStorage.setItem(NA_KEY, JSON.stringify(list)); } catch {} }

// ── Redistribute freed budget to active categories by priority ────────────
/**
 * When a category is marked N/A its budget limit is freed.
 * We distribute that freed amount to the remaining active (non-NA) categories,
 * starting with HIGH priority, then MEDIUM, then LOW — proportionally within
 * each tier based on their existing weight.
 *
 * Returns { [category]: newLimit } for ALL active categories.
 */
function redistributeNA({ budgets, naCategories, priorityMap }) {
  const activeBudgets = budgets.filter(b => !naCategories.includes(b.category));
  const naBudgets     = budgets.filter(b =>  naCategories.includes(b.category));

  if (activeBudgets.length === 0) return {};

  // Total freed budget from all N/A categories
  const freedAmount = naBudgets.reduce((s, b) => s + Number(b.amount_limit), 0);

  if (freedAmount <= 0) return {};

  // Sort active by priority (high first)
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sorted = [...activeBudgets].sort((a, b) => {
    const pa = priorityOrder[priorityMap[a.category] || 'medium'] ?? 1;
    const pb = priorityOrder[priorityMap[b.category] || 'medium'] ?? 1;
    return pa - pb;
  });

  // Total existing limits of active categories (base for proportional distribution)
  const totalActiveLimit = activeBudgets.reduce((s, b) => s + Number(b.amount_limit), 0);

  // Distribute freed amount proportionally to each active category
  // (higher limit = gets more of the freed budget)
  const result = {};
  let distributed = 0;

  sorted.forEach((b, idx) => {
    const isLast    = idx === sorted.length - 1;
    const share     = totalActiveLimit > 0
      ? (Number(b.amount_limit) / totalActiveLimit) * freedAmount
      : freedAmount / sorted.length;
    // Last category gets remainder to avoid floating point drift
    const addition  = isLast
      ? freedAmount - distributed
      : Math.round(share * 100) / 100;
    result[b.category] = Math.round((Number(b.amount_limit) + addition) * 100) / 100;
    distributed += addition;
  });

  return result;
}

export default function Plan() {
  const { budgets, loading, upsertBudget, deleteBudget } = useBudgets();
  const { transactions }         = useTransactions();
  const { goals }                = useSavingsGoals();
  const { priorities, getPriorityMap } = useCategoryPriorities();
  const { canUse }               = useSubscription();
  const { push }                 = useToast();
  const { confirm, ConfirmModal } = useConfirm();

  const now     = new Date();
  const monthly = filterByMonth(transactions, getYear(now), getMonth(now));
  const { availableBalance } = computeBalanceSplit(transactions);
  const statusList  = computeBudgetStatus(monthly, budgets);
  const prediction  = predictMonthEnd(transactions, getYear(now), getMonth(now));

  const actuals = {};
  for (const t of monthly.filter(x => x.type === 'expense'))
    actuals[t.category] = (actuals[t.category] || 0) + Number(t.amount);

  const fixedExpenses = monthly.filter(t => t.type === 'expense' && t.nature === 'fixed');

  // ── N/A state ─────────────────────────────────────────────────────────
  const [naCategories,   setNaCategories]   = useState(() => loadNA());
  const [redistributing, setRedistributing] = useState(false);

  const isNA = (cat) => naCategories.includes(cat);

  /**
   * Toggle N/A for a category.
   * If marking AS N/A → redistribute freed budget to active categories and save.
   * If removing N/A  → no automatic rebalance (user can do it manually).
   */
  async function toggleNA(cat) {
    const willBeNA = !isNA(cat);
    const next     = willBeNA
      ? [...naCategories, cat]
      : naCategories.filter(c => c !== cat);

    setNaCategories(next);
    saveNA(next);

    if (!willBeNA) {
      push(`${getCategoryMeta(cat).label} restored — run Auto-Rebalance to redistribute`, 'warning');
      return;
    }

    // Marked as N/A → redistribute now
    setRedistributing(true);
    const priorityMap  = getPriorityMap();
    const newLimits    = redistributeNA({ budgets, naCategories: next, priorityMap });

    if (Object.keys(newLimits).length === 0) {
      push(`${getCategoryMeta(cat).label} marked N/A`, 'warning');
      setRedistributing(false);
      return;
    }

    // Save each adjusted limit to Supabase
    let count = 0;
    for (const [activeCat, newLimit] of Object.entries(newLimits)) {
      const original = budgets.find(b => b.category === activeCat)?.amount_limit;
      if (newLimit !== original && newLimit > 0) {
        await upsertBudget(activeCat, newLimit);
        count++;
      }
    }

    setRedistributing(false);

    const freed = budgets.find(b => b.category === cat)?.amount_limit || 0;
    push(
      count > 0
        ? `${getCategoryMeta(cat).label} → N/A · ${formatUSD(freed)} redistributed to ${count} active categor${count > 1 ? 'ies' : 'y'} by priority ✓`
        : `${getCategoryMeta(cat).label} marked N/A`,
      count > 0 ? 'success' : 'warning'
    );
  }

  // ── Other handlers ────────────────────────────────────────────────────
  const [showAdd,    setShowAdd]    = useState(false);
  const [showNA,     setShowNA]     = useState(false);
  const [newCat,     setNewCat]     = useState('food');
  const [newLimit,   setNewLimit]   = useState('');
  const [editCat,    setEditCat]    = useState(null);
  const [limitInput, setLimitInput] = useState('');
  const [applying,   setApplying]   = useState(false);
  const [rebalLog,   setRebalLog]   = useState(null);
  const [showFixed,  setShowFixed]  = useState(true);

  async function handleUpsert(category, limit) {
    const val = parseFloat(limit);
    if (!val || val <= 0) { push('Enter a valid amount', 'error'); return; }
    await upsertBudget(category, val);
    push('Budget saved');
    setEditCat(null); setShowAdd(false); setNewLimit('');
  }

  async function handleDelete(category) {
    const ok = await confirm({
      title: 'Remove budget?',
      message: `Remove the limit for ${getCategoryMeta(category).label}?`,
      confirmLabel: 'Remove', danger: true,
    });
    if (!ok) return;
    await deleteBudget(category);
    push('Budget removed', 'warning');
  }

  async function handleRebalance() {
    if (!canUse('rebalance')) return;
    if (budgets.length === 0) return;
    setApplying(true);

    const limits      = {};
    const priorityMap = getPriorityMap();
    for (const b of budgets)
      if (!isNA(b.category)) limits[b.category] = b.amount_limit;

    const result = rebalanceBudget({ limits, actuals, priorities: priorityMap });
    let count = 0;
    for (const [cat, newLim] of Object.entries(result.result)) {
      if (newLim !== limits[cat] && newLim > 0) {
        await upsertBudget(cat, newLim);
        count++;
      }
    }

    setRebalLog({ message: result.message, changes: result.changes, count });
    setApplying(false);
    push(count > 0 ? `⚖ ${count} budget${count > 1 ? 's' : ''} adjusted` : 'Already balanced', count > 0 ? 'success' : 'warning');
  }

  async function applySmartBudget(limits) {
    for (const [cat, limit] of Object.entries(limits))
      if (limit > 0 && !isNA(cat)) await upsertBudget(cat, limit);
    push('Smart budgets applied ✓');
  }

  if (loading) return <PageLoader />;

  const unbudgetedCats = EXPENSE_CATEGORIES.filter(c => !budgets.find(b => b.category === c.value));

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
        <h1>Plan</h1>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          background: '#818cf8', color: '#fff', border: 'none', borderRadius: 12,
          width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </div>
      <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1.25rem' }}>
        {format(now, 'MMMM yyyy')} — spending plan
      </p>

      {/* FIX 2 — Projection with clear labels */}
      {prediction && (
        <div style={{
          background: prediction.onTrack ? 'rgba(34,197,94,0.07)' : 'rgba(244,63,94,0.07)',
          border: `1px solid ${prediction.onTrack ? 'rgba(34,197,94,0.2)' : 'rgba(244,63,94,0.2)'}`,
          borderRadius: 14, padding: '0.875rem 1rem', marginBottom: '1rem',
        }}>
          <p style={{ fontSize: '0.7rem', color: prediction.onTrack ? '#22c55e' : '#f43f5e', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Month-end projection
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
            {/* Projected total spending */}
            <div style={{ background: prediction.onTrack ? 'rgba(34,197,94,0.08)' : 'rgba(244,63,94,0.08)', borderRadius: 10, padding: '0.625rem' }}>
              <p style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Projected spending
              </p>
              <p style={{ fontSize: '1.05rem', fontWeight: 800, color: prediction.onTrack ? '#22c55e' : '#f43f5e' }}>
                {formatUSD(prediction.projectedExpense)}
              </p>
              <p style={{ fontSize: '0.65rem', color: '#475569', marginTop: '0.15rem' }}>
                if you keep this pace all month
              </p>
            </div>
            {/* Projected available remaining */}
            <div style={{ background: prediction.projectedBalance >= 0 ? 'rgba(129,140,248,0.08)' : 'rgba(244,63,94,0.08)', borderRadius: 10, padding: '0.625rem' }}>
              <p style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Available at month-end
              </p>
              <p style={{ fontSize: '1.05rem', fontWeight: 800, color: prediction.projectedBalance >= 0 ? '#818cf8' : '#f43f5e' }}>
                {formatUSD(prediction.projectedBalance)}
              </p>
              <p style={{ fontSize: '0.65rem', color: '#475569', marginTop: '0.15rem' }}>
                to spend freely — savings excluded
              </p>
            </div>
          </div>
          <p style={{ fontSize: '0.68rem', color: prediction.onTrack ? '#22c55e' : '#f59e0b', marginTop: '0.5rem', fontWeight: 600 }}>
            {prediction.onTrack
              ? `✓ On track — spending ${formatUSD(prediction.dailyRate)}/day`
              : `⚠ Spending ${formatUSD(prediction.dailyRate)}/day — consider slowing down`}
          </p>
        </div>
      )}

      {/* Add budget form */}
      {showAdd && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.875rem' }}>Add Budget Limit</p>
          <select value={newCat} onChange={e => setNewCat(e.target.value)} style={{ marginBottom: '0.75rem' }}>
            {EXPENSE_CATEGORIES.filter(c => !isNA(c.value)).map(c => (
              <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
            ))}
          </select>
          <input type="number" inputMode="decimal" placeholder="Monthly limit ($)"
            value={newLimit} onChange={e => setNewLimit(e.target.value)} style={{ marginBottom: '0.75rem' }} />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-primary" onClick={() => handleUpsert(newCat, newLimit)}>Save</button>
            <button className="btn-ghost" onClick={() => { setShowAdd(false); setNewLimit(''); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Redistributing indicator */}
      {redistributing && (
        <div style={{
          background: 'rgba(129,140,248,0.08)', border: '1px solid rgba(129,140,248,0.2)',
          borderRadius: 12, padding: '0.75rem 1rem', marginBottom: '0.75rem',
          display: 'flex', alignItems: 'center', gap: '0.625rem',
        }}>
          <Spinner size={14} />
          <p style={{ fontSize: '0.82rem', color: '#818cf8', fontWeight: 600 }}>
            Redistributing budget to active categories…
          </p>
        </div>
      )}

      {/* ── Budget list ── */}
      <p style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.625rem' }}>
        Monthly Budgets
        {naCategories.length > 0 && (
          <span style={{ marginLeft: '0.5rem', color: '#475569', fontWeight: 500, textTransform: 'none', fontSize: '0.65rem' }}>
            · {naCategories.length} N/A
          </span>
        )}
      </p>

      {statusList.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="No budgets yet"
          subtitle="Set spending limits per category, or mark the ones you don't use as N/A."
          action="Add your first budget"
          onAction={() => setShowAdd(true)}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1rem' }}>
          {statusList.map(b => {
            const meta = getCategoryMeta(b.category);
            const pct  = Math.min(Math.round((b.spent / b.amount_limit) * 100), 100);
            const barColor = b.over ? '#f43f5e' : pct > 80 ? '#f59e0b' : '#22c55e';
            const na   = isNA(b.category);

            return (
              <div key={b.category} className="card" style={{
                marginBottom: 0,
                borderColor: b.over && !na ? 'rgba(244,63,94,0.3)' : na ? 'rgba(51,65,85,0.4)' : undefined,
                opacity: na ? 0.55 : 1,
                transition: 'opacity 0.2s',
              }}>
                {b.over && !na && (
                  <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: 8, padding: '0.35rem 0.75rem', marginBottom: '0.75rem', fontSize: '0.78rem', color: '#f43f5e', fontWeight: 600 }}>
                    ⚠ Over by {formatUSD(b.spent - b.amount_limit)}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: na ? '0.375rem' : '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>{meta.icon}</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <p style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.9rem' }}>{meta.label}</p>
                        {na && (
                          <span style={{ fontSize: '0.6rem', color: '#475569', fontWeight: 800, background: '#0f172a', border: '1px solid #334155', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.04em' }}>
                            N/A
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {na ? 'Excluded · budget redistributed' : `${formatUSD(b.spent)} of ${formatUSD(b.amount_limit)}`}
                      </p>
                    </div>
                  </div>

                  {editCat !== b.category && (
                    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                      {/* N/A toggle */}
                      <button
                        onClick={() => !redistributing && toggleNA(b.category)}
                        title={na ? 'Remove N/A — restore to active' : 'Mark N/A — redistribute budget to active categories'}
                        disabled={redistributing}
                        style={{
                          background: na ? 'rgba(129,140,248,0.12)' : 'transparent',
                          border: `1px solid ${na ? 'rgba(129,140,248,0.3)' : '#334155'}`,
                          borderRadius: 7, padding: '3px 8px',
                          color: na ? '#818cf8' : '#475569',
                          fontSize: '0.65rem', fontWeight: 700,
                          cursor: redistributing ? 'wait' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: 3,
                        }}
                      >
                        <Ban size={11} />
                        {na ? 'Restore' : 'N/A'}
                      </button>
                      {!na && (
                        <>
                          <button className="btn-icon" onClick={() => { setEditCat(b.category); setLimitInput(String(b.amount_limit)); }}>
                            <Pencil size={13} />
                          </button>
                          <button className="btn-icon" onClick={() => handleDelete(b.category)} style={{ color: '#64748b' }}>
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {!na && (
                  <>
                    <div style={{ background: '#0f172a', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: barColor }} />
                    </div>
                    <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem', textAlign: 'right' }}>{pct}%</p>
                  </>
                )}

                {editCat === b.category && !na && (
                  <div style={{ marginTop: '0.625rem', display: 'flex', gap: '0.5rem' }}>
                    <input type="number" inputMode="decimal" value={limitInput}
                      onChange={e => setLimitInput(e.target.value)} placeholder="New limit" style={{ flex: 1 }} />
                    <button className="btn-primary" style={{ width: 'auto', padding: '0 1rem' }}
                      onClick={() => handleUpsert(b.category, limitInput)}>Save</button>
                    <button className="btn-ghost" style={{ width: 'auto', padding: '0 0.75rem' }}
                      onClick={() => setEditCat(null)}>✕</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── N/A panel for unbudgeted categories ── */}
      {unbudgetedCats.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <button onClick={() => setShowNA(p => !p)} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '0.25rem 0', marginBottom: showNA ? '0.625rem' : 0,
          }}>
            <p style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Categories without budget
            </p>
            {showNA ? <ChevronUp size={13} color="#64748b" /> : <ChevronDown size={13} color="#64748b" />}
          </button>

          {showNA && (
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: '0.875rem' }}>
              <p style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                Categories you don't use can be marked N/A. Their budget weight will be added to your active categories automatically.
              </p>
              {unbudgetedCats.map(c => (
                <div key={c.value} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #0f172a' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>{c.icon}</span>
                    <span style={{ fontSize: '0.875rem', color: isNA(c.value) ? '#475569' : '#94a3b8', fontWeight: 500 }}>{c.label}</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#334155', fontStyle: 'italic' }}>No budget set</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Fixed Expenses ── */}
      {fixedExpenses.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <button onClick={() => setShowFixed(p => !p)} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '0.25rem 0', marginBottom: '0.625rem',
          }}>
            <p style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Fixed Expenses ({fixedExpenses.length})
            </p>
            {showFixed ? <ChevronUp size={13} color="#64748b" /> : <ChevronDown size={13} color="#64748b" />}
          </button>
          {showFixed && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {fixedExpenses.map(t => (
                <div key={t.id} style={{
                  background: '#1e293b', border: '1px solid #334155',
                  borderRadius: 12, padding: '0.75rem 1rem',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: '#f1f5f9', fontWeight: 600 }}>{t.description || t.category}</p>
                    <p style={{ fontSize: '0.72rem', color: '#475569' }}>{t.date} · {t.category}</p>
                  </div>
                  <p style={{ fontWeight: 800, color: '#f43f5e', fontSize: '0.9rem' }}>-{formatUSD(t.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Smart Tools ── */}
      <p style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.625rem', marginTop: '0.5rem' }}>
        Smart Tools
      </p>

      {canUse('rebalance') ? (
        <>
          {budgets.filter(b => !isNA(b.category)).length > 0 && (
            <button onClick={handleRebalance} disabled={applying || redistributing} style={{
              background: applying ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.22)',
              borderRadius: 12, padding: '0.75rem',
              color: '#f59e0b', fontWeight: 700, fontSize: '0.85rem',
              cursor: applying || redistributing ? 'not-allowed' : 'pointer',
              width: '100%', marginBottom: '0.75rem', fontFamily: 'inherit',
              opacity: applying || redistributing ? 0.7 : 1,
            }}>
              {applying ? '⏳ Applying…' : '⚖ Auto-Rebalance Budget'}
            </button>
          )}

          {rebalLog && (
            <div style={{
              background: rebalLog.count > 0 ? 'rgba(245,158,11,0.07)' : 'rgba(34,197,94,0.07)',
              border: `1px solid ${rebalLog.count > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.2)'}`,
              borderRadius: 12, padding: '0.875rem', marginBottom: '0.75rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <p style={{ fontSize: '0.8rem', color: rebalLog.count > 0 ? '#f59e0b' : '#22c55e', fontWeight: 700 }}>
                  {rebalLog.count > 0 ? `${rebalLog.count} budget${rebalLog.count > 1 ? 's' : ''} adjusted` : '✅ Already balanced'}
                </p>
                <button onClick={() => setRebalLog(null)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>✕</button>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{rebalLog.message}</p>
            </div>
          )}

          <div className="card" style={{ marginBottom: '0.75rem' }}>
            <SmartBudgetPanel
              availableBalance={availableBalance}
              goals={goals}
              categoryPriorities={priorities}
              existingExpenses={actuals}
              onApplyBudget={applySmartBudget}
              excludedCategories={naCategories}
            />
          </div>
        </>
      ) : (
        <div style={{ marginBottom: '0.75rem' }}>
          <ProUpgradePrompt feature="rebalance" />
        </div>
      )}

      <ConfirmModal />
    </div>
  );
}