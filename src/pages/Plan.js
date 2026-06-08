/**
 * Plan.js — v3
 *
 * Fix 1: Marking N/A → budget auto-redistributes to active categories
 *        in priority order → saves immediately to Supabase
 * Fix 2: Projection numbers have clear human labels
 * Fix 3: Full light theme — no dark remnants
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
function loadNA()     { try { return JSON.parse(localStorage.getItem(NA_KEY) || '[]'); } catch { return []; } }
function saveNA(list) { try { localStorage.setItem(NA_KEY, JSON.stringify(list)); } catch {} }

function redistributeNA({ budgets, naCategories, priorityMap }) {
  const activeBudgets = budgets.filter(b => !naCategories.includes(b.category));
  const naBudgets     = budgets.filter(b =>  naCategories.includes(b.category));
  if (activeBudgets.length === 0) return {};
  const freedAmount = naBudgets.reduce((s, b) => s + Number(b.amount_limit), 0);
  if (freedAmount <= 0) return {};
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sorted = [...activeBudgets].sort((a, b) => {
    const pa = priorityOrder[priorityMap[a.category] || 'medium'] ?? 1;
    const pb = priorityOrder[priorityMap[b.category] || 'medium'] ?? 1;
    return pa - pb;
  });
  const totalActiveLimit = activeBudgets.reduce((s, b) => s + Number(b.amount_limit), 0);
  const result = {};
  let distributed = 0;
  sorted.forEach((b, idx) => {
    const isLast   = idx === sorted.length - 1;
    const share    = totalActiveLimit > 0 ? (Number(b.amount_limit) / totalActiveLimit) * freedAmount : freedAmount / sorted.length;
    const addition = isLast ? freedAmount - distributed : Math.round(share * 100) / 100;
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

  const [naCategories,   setNaCategories]   = useState(() => loadNA());
  const [redistributing, setRedistributing] = useState(false);
  const isNA = (cat) => naCategories.includes(cat);

  async function toggleNA(cat) {
    const willBeNA = !isNA(cat);
    const next     = willBeNA ? [...naCategories, cat] : naCategories.filter(c => c !== cat);
    setNaCategories(next);
    saveNA(next);
    if (!willBeNA) {
      push(`${getCategoryMeta(cat).label} restored — run Auto-Rebalance to redistribute`, 'warning');
      return;
    }
    setRedistributing(true);
    const priorityMap = getPriorityMap();
    const newLimits   = redistributeNA({ budgets, naCategories: next, priorityMap });
    if (Object.keys(newLimits).length === 0) {
      push(`${getCategoryMeta(cat).label} marked N/A`, 'warning');
      setRedistributing(false);
      return;
    }
    let count = 0;
    for (const [activeCat, newLimit] of Object.entries(newLimits)) {
      const original = budgets.find(b => b.category === activeCat)?.amount_limit;
      if (newLimit !== original && newLimit > 0) { await upsertBudget(activeCat, newLimit); count++; }
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

  const [showAdd,    setShowAdd]    = useState(false);
  const [showNA,     setShowNA]     = useState(false);
  const [showFixed,  setShowFixed]  = useState(false);
  const [newCat,     setNewCat]     = useState('food');
  const [newLimit,   setNewLimit]   = useState('');
  const [editCat,    setEditCat]    = useState(null);
  const [limitInput, setLimitInput] = useState('');
  const [applying,   setApplying]   = useState(false);
  const [rebalLog,   setRebalLog]   = useState(null);

  const unbudgetedCats = EXPENSE_CATEGORIES.filter(c => !budgets.find(b => b.category === c.value));

  async function handleUpsert(category, limit) {
    const val = parseFloat(limit);
    if (!val || val <= 0) { push('Enter a valid amount', 'error'); return; }
    try { await upsertBudget(category, val); push('Budget saved'); setEditCat(null); setShowAdd(false); setNewLimit(''); }
    catch (e) { push(e.message, 'error'); }
  }

  async function handleDelete(category) {
    const ok = await confirm({ title: 'Remove budget?', message: `Remove the ${getCategoryMeta(category).label} envelope?`, confirmLabel: 'Remove' });
    if (!ok) return;
    try { await deleteBudget(category); push('Budget removed', 'warning'); }
    catch (e) { push(e.message, 'error'); }
  }

  async function handleRebalance() {
    if (budgets.length === 0) return;
    setApplying(true);
    const limits      = {};
    const priorityMap = getPriorityMap();
    for (const b of budgets) limits[b.category] = b.amount_limit;
    const result = rebalanceBudget({ limits, actuals, priorities: priorityMap });
    let count = 0;
    for (const [cat, newLim] of Object.entries(result.result)) {
      if (newLim !== limits[cat] && newLim > 0) { await upsertBudget(cat, newLim); count++; }
    }
    setApplying(false);
    setRebalLog({ count, message: result.explanation || (count > 0 ? `${count} budget${count > 1 ? 's' : ''} adjusted by priority` : 'All budgets already balanced') });
  }

  async function applySmartBudget(limits) {
    for (const [cat, lim] of Object.entries(limits)) {
      if (lim > 0) await upsertBudget(cat, lim);
    }
    push('Smart budgets applied ✓');
  }

  if (loading) return <PageLoader />;

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
      <p style={{ fontSize: '0.82rem', color: 'rgba(26,26,24,0.45)', marginBottom: '1.25rem' }}>
        {format(now, 'MMMM yyyy')} — spending plan
      </p>

      {/* Projection */}
      {prediction && (
        <div style={{
          background: prediction.onTrack ? 'rgba(34,197,94,0.07)' : 'rgba(244,63,94,0.07)',
          border: `1px solid ${prediction.onTrack ? 'rgba(34,197,94,0.2)' : 'rgba(244,63,94,0.2)'}`,
          borderRadius: 14, padding: '0.875rem 1rem', marginBottom: '1rem',
        }}>
          <p style={{ fontSize: '0.7rem', color: prediction.onTrack ? '#16a34a' : '#dc2626', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Month-end projection
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
            <div style={{ background: prediction.onTrack ? 'rgba(34,197,94,0.08)' : 'rgba(244,63,94,0.08)', borderRadius: 10, padding: '0.625rem' }}>
              <p style={{ fontSize: '0.62rem', color: 'rgba(26,26,24,0.45)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Projected spending
              </p>
              <p style={{ fontSize: '1.05rem', fontWeight: 800, color: prediction.onTrack ? '#16a34a' : '#dc2626' }}>
                {formatUSD(prediction.projectedExpense)}
              </p>
              <p style={{ fontSize: '0.65rem', color: 'rgba(26,26,24,0.45)', marginTop: '0.15rem' }}>
                if you keep this pace all month
              </p>
            </div>
            <div style={{ background: prediction.projectedBalance >= 0 ? 'rgba(129,140,248,0.08)' : 'rgba(244,63,94,0.08)', borderRadius: 10, padding: '0.625rem' }}>
              <p style={{ fontSize: '0.62rem', color: 'rgba(26,26,24,0.45)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Available at month-end
              </p>
              <p style={{ fontSize: '1.05rem', fontWeight: 800, color: prediction.projectedBalance >= 0 ? '#818cf8' : '#dc2626' }}>
                {formatUSD(prediction.projectedBalance)}
              </p>
              <p style={{ fontSize: '0.65rem', color: 'rgba(26,26,24,0.45)', marginTop: '0.15rem' }}>
                to spend freely — savings excluded
              </p>
            </div>
          </div>
          <p style={{ fontSize: '0.68rem', color: prediction.onTrack ? '#16a34a' : '#f59e0b', marginTop: '0.5rem', fontWeight: 600 }}>
            {prediction.onTrack
              ? `✓ On track — spending ${formatUSD(prediction.dailyRate)}/day`
              : `⚠ Spending ${formatUSD(prediction.dailyRate)}/day — consider slowing down`}
          </p>
        </div>
      )}

      {/* Add budget form */}
      {showAdd && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.875rem', color: '#1A1A18' }}>Add Budget Limit</p>
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

      {/* Budget list label */}
      <p style={{ fontSize: '0.68rem', color: 'rgba(26,26,24,0.4)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.625rem' }}>
        Monthly Budgets
        {naCategories.length > 0 && (
          <span style={{ marginLeft: '0.5rem', color: 'rgba(26,26,24,0.35)', fontWeight: 500, textTransform: 'none', fontSize: '0.65rem' }}>
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
            const barColor = b.over ? '#dc2626' : pct > 80 ? '#f59e0b' : '#16a34a';
            const na   = isNA(b.category);

            return (
              <div key={b.category} className="card" style={{
                marginBottom: 0,
                borderColor: b.over && !na ? 'rgba(220,38,38,0.3)' : na ? 'rgba(26,26,24,0.15)' : undefined,
                opacity: na ? 0.55 : 1,
                transition: 'opacity 0.2s',
              }}>
                {b.over && !na && (
                  <div style={{
                    background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)',
                    borderRadius: 8, padding: '0.35rem 0.75rem', marginBottom: '0.75rem',
                    fontSize: '0.78rem', color: '#dc2626', fontWeight: 600,
                  }}>
                    ⚠ Over by {formatUSD(b.spent - b.amount_limit)}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: na ? '0.375rem' : '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>{meta.icon}</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        {/* ← FIXED: was #f1f5f9 (white), now dark ink */}
                        <p style={{ fontWeight: 600, color: '#1A1A18', fontSize: '0.9rem' }}>{meta.label}</p>
                        {na && (
                          <span style={{
                            fontSize: '0.6rem', color: 'rgba(26,26,24,0.55)', fontWeight: 700,
                            background: 'rgba(26,26,24,0.06)', border: '1px solid rgba(26,26,24,0.12)',
                            borderRadius: 4, padding: '1px 5px', letterSpacing: '0.04em',
                          }}>
                            N/A
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.72rem', color: 'rgba(26,26,24,0.45)' }}>
                        {na ? 'Excluded · budget redistributed' : `${formatUSD(b.spent)} of ${formatUSD(b.amount_limit)}`}
                      </p>
                    </div>
                  </div>

                  {editCat !== b.category && (
                    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                      <button
                        onClick={() => !redistributing && toggleNA(b.category)}
                        title={na ? 'Remove N/A — restore to active' : 'Mark N/A — redistribute budget'}
                        disabled={redistributing}
                        style={{
                          background: na ? 'rgba(129,140,248,0.12)' : 'transparent',
                          border: `1px solid ${na ? 'rgba(129,140,248,0.3)' : 'rgba(26,26,24,0.15)'}`,
                          borderRadius: 7, padding: '3px 8px',
                          color: na ? '#818cf8' : 'rgba(26,26,24,0.45)',
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
                          <button className="btn-icon" onClick={() => handleDelete(b.category)} style={{ color: 'rgba(26,26,24,0.4)' }}>
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {!na && (
                  <>
                    {/* ← FIXED: was #0f172a (dark), now light track */}
                    <div style={{ background: 'rgba(26,26,24,0.06)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: barColor }} />
                    </div>
                    <p style={{ fontSize: '0.72rem', color: 'rgba(26,26,24,0.38)', marginTop: '0.25rem', textAlign: 'right' }}>{pct}%</p>
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

      {/* Unbudgeted categories */}
      {unbudgetedCats.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <button onClick={() => setShowNA(p => !p)} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '0.25rem 0', marginBottom: showNA ? '0.625rem' : 0,
          }}>
            <p style={{ fontSize: '0.68rem', color: 'rgba(26,26,24,0.4)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Categories without budget
            </p>
            {showNA ? <ChevronUp size={13} color="rgba(26,26,24,0.4)" /> : <ChevronDown size={13} color="rgba(26,26,24,0.4)" />}
          </button>

          {showNA && (
            /* ← FIXED: was #1e293b dark panel */
            <div style={{ background: '#FFFFFF', border: '1px solid rgba(26,26,24,0.09)', borderRadius: 14, padding: '0.875rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'rgba(26,26,24,0.5)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                Categories you don't use can be marked N/A. Their budget weight will be redistributed to active categories automatically.
              </p>
              {unbudgetedCats.map(c => (
                <div key={c.value} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.5rem 0', borderBottom: '1px solid rgba(26,26,24,0.07)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>{c.icon}</span>
                    <span style={{ fontSize: '0.875rem', color: '#1A1A18', fontWeight: 500 }}>{c.label}</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(26,26,24,0.35)', fontStyle: 'italic' }}>No budget set</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Fixed Expenses */}
      {fixedExpenses.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <button onClick={() => setShowFixed(p => !p)} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '0.25rem 0', marginBottom: '0.625rem',
          }}>
            <p style={{ fontSize: '0.68rem', color: 'rgba(26,26,24,0.4)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Fixed Expenses ({fixedExpenses.length})
            </p>
            {showFixed ? <ChevronUp size={13} color="rgba(26,26,24,0.4)" /> : <ChevronDown size={13} color="rgba(26,26,24,0.4)" />}
          </button>
          {showFixed && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {fixedExpenses.map(t => (
                /* ← FIXED: was #1e293b dark card */
                <div key={t.id} style={{
                  background: '#FFFFFF', border: '1px solid rgba(26,26,24,0.09)',
                  borderRadius: 12, padding: '0.75rem 1rem',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: '#1A1A18', fontWeight: 600 }}>{t.description || t.category}</p>
                    <p style={{ fontSize: '0.72rem', color: 'rgba(26,26,24,0.45)' }}>{t.date} · {t.category}</p>
                  </div>
                  <p style={{ fontWeight: 800, color: '#dc2626', fontSize: '0.9rem' }}>-{formatUSD(t.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Smart Tools */}
      <p style={{ fontSize: '0.68rem', color: 'rgba(26,26,24,0.4)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.625rem', marginTop: '0.5rem' }}>
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
                <p style={{ fontSize: '0.8rem', color: rebalLog.count > 0 ? '#f59e0b' : '#16a34a', fontWeight: 700 }}>
                  {rebalLog.count > 0 ? `${rebalLog.count} budget${rebalLog.count > 1 ? 's' : ''} adjusted` : '✅ Already balanced'}
                </p>
                <button onClick={() => setRebalLog(null)} style={{ background: 'transparent', border: 'none', color: 'rgba(26,26,24,0.4)', cursor: 'pointer' }}>✕</button>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'rgba(26,26,24,0.55)' }}>{rebalLog.message}</p>
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