import { useState } from 'react';
import { getMonth, getYear } from 'date-fns';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { useBudgets } from '../hooks/useBudgets';
import { useTransactions } from '../hooks/useTransactions';
import { useToast } from '../components/ui/Toast';
import { useSavingsGoals } from '../hooks/useSavingsGoals';
import { useCategoryPriorities } from '../hooks/useCategoryPriorities';
import { formatUSD, getCategoryMeta, EXPENSE_CATEGORIES } from '../lib/constants';
import { computeBudgetStatus, filterByMonth } from '../lib/finance';
import { computeBalanceSplit, rebalanceBudget } from '../lib/balanceEngine';

export default function Budgets() {
  const { budgets, upsertBudget, deleteBudget } = useBudgets();
  const { transactions }                         = useTransactions();
  const { goals }                                = useSavingsGoals();
  const { priorities, getPriorityMap }           = useCategoryPriorities();
  const { push }                                 = useToast();

  const now     = new Date();
  const monthly = filterByMonth(transactions, getYear(now), getMonth(now));
  const { availableBalance } = computeBalanceSplit(transactions);
  const statusList = computeBudgetStatus(monthly, budgets);

  const existingExpenses = {};
  for (const t of monthly.filter(x => x.type === 'expense')) {
    existingExpenses[t.category] = (existingExpenses[t.category] || 0) + Number(t.amount);
  }

  const [editCat,    setEditCat]    = useState(null);
  const [limitInput, setLimitInput] = useState('');
  const [showAdd,    setShowAdd]    = useState(false);
  const [newCat,     setNewCat]     = useState('food');
  const [newLimit,   setNewLimit]   = useState('');
  const [applying,   setApplying]   = useState(false);

  const totalBudgeted = statusList.reduce((s, b) => s + b.amount_limit, 0);
  const totalSpent    = statusList.reduce((s, b) => s + b.spent, 0);
  const overCount     = statusList.filter(b => b.over).length;

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

  async function handleRebalance() {
    if (budgets.length === 0) return;
    setApplying(true);
    const limits      = {};
    const priorityMap = getPriorityMap();
    for (const b of budgets) limits[b.category] = b.amount_limit;
    const result = rebalanceBudget({ limits, actuals: existingExpenses, priorities: priorityMap });
    let appliedCount = 0;
    for (const [cat, newLim] of Object.entries(result.result)) {
      if (newLim !== limits[cat] && newLim > 0) {
        await upsertBudget(cat, newLim);
        appliedCount++;
      }
    }
    setApplying(false);
    if (appliedCount > 0) push(appliedCount + ' budget' + (appliedCount > 1 ? 's' : '') + ' adjusted');
    else push('All budgets already balanced', 'warning');
  }

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
        <h1>Plan</h1>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          background: 'var(--ink-1)', color: 'var(--bg)', border: 'none',
          borderRadius: 999, width: 36, height: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
        }}>
          <Plus size={17} strokeWidth={2.5} />
        </button>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--ink-3)', marginBottom: '1.25rem', fontFamily: 'var(--font-sans)' }}>
        {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </p>

      {statusList.length > 0 && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '1.125rem', marginBottom: '1rem',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>
                {formatUSD(totalSpent)}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)', marginTop: '0.1rem' }}>
                of {formatUSD(totalBudgeted)} budgeted
              </p>
            </div>
            {overCount > 0 && (
              <div style={{
                background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.25)',
                borderRadius: 6, padding: '0.35rem 0.625rem'
              }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-red)', fontFamily: 'var(--font-sans)' }}>
                  {overCount} over
                </p>
              </div>
            )}
          </div>
          <div style={{ background: 'var(--bg-inset)', borderRadius: 999, height: 5, overflow: 'hidden' }}>
            <div style={{
              width: (Math.min(totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0, 100)) + '%',
              height: '100%', borderRadius: 999,
              background: overCount > 0 ? 'var(--accent-red)' : (totalSpent / totalBudgeted) > 0.8 ? 'var(--accent-amber)' : 'var(--ink-2)',
              transition: 'width 0.5s ease'
            }} />
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--ink-4)', fontFamily: 'var(--font-sans)', marginTop: '0.375rem', textAlign: 'right' }}>
            {totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0}% used
          </p>
        </div>
      )}

      {budgets.length > 1 && (
        <button onClick={handleRebalance} disabled={applying} style={{
          width: '100%', background: 'transparent',
          border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)',
          padding: '0.625rem', color: 'var(--ink-2)',
          fontWeight: 600, fontSize: '0.825rem',
          cursor: applying ? 'not-allowed' : 'pointer',
          marginBottom: '1rem', fontFamily: 'var(--font-sans)',
          opacity: applying ? 0.6 : 1
        }}>
          {applying ? 'Rebalancing...' : 'Auto-rebalance by priority'}
        </button>
      )}

      {showAdd && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '1.125rem',
          marginBottom: '1rem', boxShadow: 'var(--shadow-card)'
        }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.125rem', fontWeight: 700, color: 'var(--ink-1)', marginBottom: '0.875rem' }}>Add envelope</p>
          <select value={newCat} onChange={e => setNewCat(e.target.value)} style={{ marginBottom: '0.75rem' }}>
            {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
          </select>
          <input type="number" inputMode="decimal" placeholder="Monthly limit ($)" value={newLimit}
            onChange={e => setNewLimit(e.target.value)} style={{ marginBottom: '0.75rem' }} />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-primary" onClick={() => handleUpsert(newCat, newLimit)}>Save</button>
            <button className="btn-ghost" onClick={() => { setShowAdd(false); setNewLimit(''); }}>Cancel</button>
          </div>
        </div>
      )}

      {statusList.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)' }}>Envelopes</p>
          <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)' }}>{statusList.length} active</p>
        </div>
      )}

      {statusList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '1.375rem', color: 'var(--ink-3)', marginBottom: '0.5rem' }}>No envelopes yet.</p>
          <p style={{ color: 'var(--ink-4)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)' }}>Tap + to add spending limits by category</p>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
          {statusList.map((b, i) => {
            const meta  = getCategoryMeta(b.category);
            const pct   = b.amount_limit > 0 ? Math.min(Math.round((b.spent / b.amount_limit) * 100), 100) : 0;
            const isEditing = editCat === b.category;
            return (
              <div key={b.category} style={{
                borderBottom: i < statusList.length - 1 ? '1px solid var(--border)' : 'none',
                padding: '0.875rem 1rem',
                background: b.over ? 'rgba(192,57,43,0.04)' : 'transparent'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '1.125rem', flexShrink: 0 }}>{meta.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink-1)', fontFamily: 'var(--font-sans)' }}>{meta.label}</p>
                        <p style={{ fontSize: '0.875rem', fontWeight: 700, color: b.over ? 'var(--accent-red)' : 'var(--ink-1)', fontFamily: 'var(--font-mono)', flexShrink: 0, marginLeft: '0.5rem' }}>
                          {formatUSD(b.spent)}/{formatUSD(b.amount_limit)}
                        </p>
                      </div>
                      <div style={{ background: 'var(--bg-inset)', borderRadius: 999, height: 4, overflow: 'hidden' }}>
                        <div style={{
                          width: pct + '%', height: '100%', borderRadius: 999,
                          background: b.over ? 'var(--accent-red)' : pct > 80 ? 'var(--accent-amber)' : 'var(--ink-2)',
                          transition: 'width 0.4s ease'
                        }} />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0, marginLeft: '0.625rem' }}>
                    <button className="btn-icon" style={{ width: 28, height: 28 }}
                      onClick={() => { setEditCat(isEditing ? null : b.category); setLimitInput(String(b.amount_limit)); }}>
                      <Pencil size={12} />
                    </button>
                    <button className="btn-icon" style={{ width: 28, height: 28, color: 'var(--ink-4)' }}
                      onClick={() => handleDelete(b.category)}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                {b.over && !isEditing && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--accent-red)', fontWeight: 600, fontFamily: 'var(--font-sans)', marginTop: '0.375rem' }}>
                    Over by {formatUSD(b.spent - b.amount_limit)}
                  </p>
                )}
                {isEditing && (
                  <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                    <input type="number" inputMode="decimal" value={limitInput}
                      onChange={e => setLimitInput(e.target.value)} placeholder="New limit" style={{ flex: 1 }} autoFocus />
                    <button className="btn-primary" style={{ width: 'auto', padding: '0 1rem' }}
                      onClick={() => handleUpsert(b.category, limitInput)}>Save</button>
                    <button className="btn-ghost" style={{ width: 'auto', padding: '0 0.75rem' }}
                      onClick={() => setEditCat(null)}>X</button>
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
