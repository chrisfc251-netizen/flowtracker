import { useState } from 'react';
import { getMonth, getYear } from 'date-fns';
import { Pencil, Trash2 } from 'lucide-react';
import { useBudgets } from '../hooks/useBudgets';
import { useTransactions } from '../hooks/useTransactions';
import { useToast } from '../components/ui/Toast';
import { EmptyState } from '../components/ui/EmptyState';
import { SmartBudgetPanel } from '../components/budgets/SmartBudgetPanel';
import { formatUSD, getCategoryMeta, EXPENSE_CATEGORIES } from '../lib/constants';
import { filterByMonth } from '../lib/finance';
import { buildEffectiveBudgetStatus } from '../lib/budgetEngine';
import { computeBalanceSplit, rebalanceBudget } from '../lib/balanceEngine';
import { useSavingsGoals } from '../hooks/useSavingsGoals';
import { useCategoryPriorities } from '../hooks/useCategoryPriorities';

export default function Budgets() {
  const { priorities, getPriorityMap } = useCategoryPriorities();

  // Pass priorityMap into useBudgets so effectiveBudgets is always current
  const priorityMap = getPriorityMap();
  const { budgets, effectiveBudgets, upsertBudget, deleteBudget, toggleActive } = useBudgets(priorityMap);
  const { transactions }  = useTransactions();
  const { goals }         = useSavingsGoals();
  const { push }          = useToast();

  const now     = new Date();
  const monthly = filterByMonth(transactions, getYear(now), getMonth(now));
  const { availableBalance } = computeBalanceSplit(transactions);

  // Use effective budget status for display
  const statusList = buildEffectiveBudgetStatus(monthly, effectiveBudgets);

  const existingExpenses = {};
  for (const t of monthly.filter((x) => x.type === 'expense')) {
    existingExpenses[t.category] = (existingExpenses[t.category] || 0) + Number(t.amount);
  }

  const [editCat,      setEditCat]      = useState(null);
  const [limitInput,   setLimitInput]   = useState('');
  const [showAdd,      setShowAdd]      = useState(false);
  const [newCat,       setNewCat]       = useState('food');
  const [newLimit,     setNewLimit]     = useState('');
  const [rebalanceLog, setRebalanceLog] = useState(null);
  const [applying,     setApplying]     = useState(false);

  // Count how many are N/A and total pool
  const naCount = budgets.filter((b) => b.is_active === false).length;
  const naPool  = budgets.filter((b) => b.is_active === false).reduce((s, b) => s + Number(b.amount_limit), 0);

  async function handleUpsert(category, limit) {
    const val = parseFloat(limit);
    if (!val || val <= 0) { push('Enter a valid amount', 'error'); return; }
    try {
      await upsertBudget(category, val);
      push('Budget saved');
      setEditCat(null); setShowAdd(false); setNewLimit('');
    } catch (e) { push(e.message, 'error'); }
  }

  async function handleDelete(category) {
    if (!window.confirm('Remove this budget?')) return;
    try { await deleteBudget(category); push('Budget removed', 'warning'); }
    catch (e) { push(e.message, 'error'); }
  }

  async function handleToggleActive(category) {
    const b = budgets.find((b) => b.category === category);
    if (!b) return;
    const wasActive = b.is_active !== false;
    const { error } = await toggleActive(category);
    if (error) { push(error.message, 'error'); return; }
    push(wasActive ? `${category} marked as N/A — budget redistributed` : `${category} reactivated ✓`);
  }

  async function applySmartBudget(limits) {
    for (const [cat, limit] of Object.entries(limits)) {
      if (limit > 0) await upsertBudget(cat, limit);
    }
    push('Smart budgets applied ✓');
  }

  async function handleRebalance() {
    if (budgets.length === 0) return;
    setApplying(true);
    const limits      = {};
    for (const b of budgets) limits[b.category] = b.amount_limit;
    const result = rebalanceBudget({ limits, actuals: existingExpenses, priorities: priorityMap });

    let appliedCount = 0;
    for (const [cat, newLimit] of Object.entries(result.result)) {
      if (newLimit !== limits[cat] && newLimit > 0) {
        await upsertBudget(cat, newLimit);
        appliedCount++;
      }
    }
    setRebalanceLog({ message: result.message, changes: result.changes, appliedCount });
    setApplying(false);
    push(appliedCount > 0 ? `⚖️ ${appliedCount} budget${appliedCount > 1 ? 's' : ''} adjusted ✓` : 'Already balanced', 'warning');
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h1>Budgets</h1>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          background: '#818cf8', color: '#fff', border: 'none', borderRadius: 12,
          width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
        }}>+</button>
      </div>
      <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
        Monthly limits — tracking {now.toLocaleDateString('en-US', { month: 'long' })}
      </p>

      {/* N/A redistribution banner */}
      {naCount > 0 && (
        <div style={{ background: 'rgba(129,140,248,.08)', border: '1px solid rgba(129,140,248,.25)', borderRadius: 12, padding: '0.875rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.25rem' }}>♻️</span>
          <div>
            <p style={{ fontSize: '0.82rem', color: '#818cf8', fontWeight: 700 }}>
              {naCount} inactive categor{naCount > 1 ? 'ies' : 'y'} · {formatUSD(naPool)} redistributed
            </p>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
              Budget redistributed to high-priority active categories
            </p>
          </div>
        </div>
      )}

      {/* Smart Budget */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <SmartBudgetPanel
          availableBalance={availableBalance}
          goals={goals}
          categoryPriorities={priorities}
          existingExpenses={existingExpenses}
          onApplyBudget={applySmartBudget}
        />
      </div>

      {/* Auto-Rebalance */}
      {budgets.length > 0 && (
        <button onClick={handleRebalance} disabled={applying} style={{
          background: applying ? 'rgba(245,158,11,.06)' : 'rgba(245,158,11,.12)',
          border: '1px solid rgba(245,158,11,.25)', borderRadius: 10, padding: '0.625rem',
          color: '#f59e0b', fontWeight: 700, fontSize: '0.85rem',
          cursor: applying ? 'not-allowed' : 'pointer',
          width: '100%', marginBottom: '1rem', fontFamily: 'inherit', opacity: applying ? 0.7 : 1
        }}>
          {applying ? '⏳ Applying…' : '⚖️ Auto-Rebalance Based on Priorities'}
        </button>
      )}

      {/* Rebalance log */}
      {rebalanceLog && (
        <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 12, padding: '0.875rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
            <p style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 700 }}>
              {rebalanceLog.appliedCount > 0 ? `⚖️ ${rebalanceLog.appliedCount} adjusted` : '✅ Already balanced'}
            </p>
            <button onClick={() => setRebalanceLog(null)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>✕</button>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>{rebalanceLog.message}</p>
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.875rem' }}>Add Budget</p>
          <select value={newCat} onChange={(e) => setNewCat(e.target.value)} style={{ marginBottom: '0.75rem' }}>
            {EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
          </select>
          <input type="number" inputMode="decimal" placeholder="Monthly limit ($)" value={newLimit}
            onChange={(e) => setNewLimit(e.target.value)} style={{ marginBottom: '0.75rem' }} />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-primary" onClick={() => handleUpsert(newCat, newLimit)}>Save</button>
            <button className="btn-ghost" onClick={() => { setShowAdd(false); setNewLimit(''); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* N/A categories (collapsed list) */}
      {budgets.filter((b) => b.is_active === false).length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Inactive (N/A)
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {budgets.filter((b) => b.is_active === false).map((b) => {
              const meta = getCategoryMeta(b.category);
              return (
                <div key={b.category} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0.6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>{meta.icon}</span>
                    <div>
                      <p style={{ fontSize: '0.875rem', color: '#94a3b8', fontWeight: 600 }}>{meta.label}</p>
                      <p style={{ fontSize: '0.75rem', color: '#475569' }}>{formatUSD(b.amount_limit)} — inactive</p>
                    </div>
                  </div>
                  <button onClick={() => handleToggleActive(b.category)} style={{
                    background: 'rgba(34,197,94,.1)', color: '#22c55e',
                    border: '1px solid rgba(34,197,94,.25)', borderRadius: 8,
                    padding: '0.375rem 0.75rem', fontSize: '0.78rem', fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit'
                  }}>
                    Reactivate
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active budgets */}
      {statusList.length === 0
        ? <EmptyState icon="🎯" title="No budgets set" subtitle="Add limits or use Smart Budget to auto-generate them" />
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {statusList.map((b) => {
              const meta         = getCategoryMeta(b.category);
              const pct          = Math.min(Math.round((b.spent / b.effectiveBudget) * 100), 100);
              const hasRedist    = b.redistributed && b.delta > 0;

              return (
                <div key={b.category} className="card" style={{ marginBottom: 0, borderColor: b.over ? 'rgba(244,63,94,.4)' : undefined }}>
                  {b.over && (
                    <div style={{ background: 'rgba(244,63,94,.12)', border: '1px solid rgba(244,63,94,.3)', borderRadius: 8, padding: '0.4rem 0.75rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: '#f43f5e', fontWeight: 600 }}>
                      ⚠️ Over budget by {formatUSD(b.spent - b.effectiveBudget)}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>{meta.icon}</span>
                      <div>
                        <p style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.9375rem' }}>{meta.label}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {formatUSD(b.spent)} / {formatUSD(b.effectiveBudget)}
                          </p>
                          {hasRedist && (
                            <span style={{ fontSize: '0.68rem', color: '#818cf8', fontWeight: 700, background: 'rgba(129,140,248,.12)', borderRadius: 4, padding: '1px 6px' }}>
                              +{formatUSD(b.delta)} redistributed
                            </span>
                          )}
                        </div>
                        {hasRedist && (
                          <p style={{ fontSize: '0.7rem', color: '#475569' }}>
                            Base: {formatUSD(b.amount_limit)} → Effective: {formatUSD(b.effectiveBudget)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                      {/* N/A toggle */}
                      <button onClick={() => handleToggleActive(b.category)} style={{
                        background: 'rgba(100,116,139,.1)', color: '#64748b',
                        border: '1px solid #334155', borderRadius: 6,
                        padding: '0.25rem 0.5rem', fontSize: '0.7rem', fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit'
                      }}>
                        N/A
                      </button>
                      {editCat !== b.category && (
                        <>
                          <button className="btn-icon" onClick={() => { setEditCat(b.category); setLimitInput(String(b.amount_limit)); }}>
                            <Pencil size={14} />
                          </button>
                          <button className="btn-icon" onClick={() => handleDelete(b.category)} style={{ color: '#64748b' }}>
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ background: '#0f172a', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: b.over ? '#f43f5e' : pct > 80 ? '#f59e0b' : '#22c55e' }} />
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.3rem', textAlign: 'right' }}>{pct}% used</p>

                  {editCat === b.category && (
                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                      <input type="number" inputMode="decimal" value={limitInput}
                        onChange={(e) => setLimitInput(e.target.value)} placeholder="New limit" style={{ flex: 1 }} />
                      <button className="btn-primary" style={{ width: 'auto', padding: '0 1rem' }}
                        onClick={() => handleUpsert(b.category, limitInput)}>Save</button>
                      <button className="btn-ghost" style={{ width: 'auto', padding: '0 0.875rem' }}
                        onClick={() => setEditCat(null)}>✕</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}