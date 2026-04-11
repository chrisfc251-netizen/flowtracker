import { useState } from 'react';
import { getMonth, getYear } from 'date-fns';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { useBudgets } from '../hooks/useBudgets';
import { useTransactions } from '../hooks/useTransactions';
import { useToast } from '../components/ui/Toast';
import { EmptyState } from '../components/ui/EmptyState';
import { formatUSD, getCategoryMeta, EXPENSE_CATEGORIES } from '../lib/constants';
import { computeBudgetStatus, filterByMonth } from '../lib/finance';

export default function Budgets() {
  const { budgets, upsertBudget, deleteBudget } = useBudgets();
  const { transactions } = useTransactions();
  const { push } = useToast();

  const now   = new Date();
  const monthly = filterByMonth(transactions, getYear(now), getMonth(now));
  const statusList = computeBudgetStatus(monthly, budgets);

  const [editCat,    setEditCat]    = useState(null);
  const [limitInput, setLimitInput] = useState('');
  const [showAdd,    setShowAdd]    = useState(false);
  const [newCat,     setNewCat]     = useState('food');
  const [newLimit,   setNewLimit]   = useState('');

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

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h1>Budgets</h1>
        <button onClick={() => setShowAdd(true)} style={{
          background: '#818cf8', color: '#fff', border: 'none', borderRadius: 12,
          width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </div>
      <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>Monthly limits for this month</p>

      {/* Add form */}
      {showAdd && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: '0.875rem' }}>Add Budget</h3>
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

      {statusList.length === 0
        ? <EmptyState icon="🎯" title="No budgets set" subtitle="Add monthly limits per category to track your spending" />
        : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {statusList.map((b) => {
              const meta = getCategoryMeta(b.category);
              const pct  = Math.min(Math.round((b.spent / b.amount_limit) * 100), 100);
              const over = b.spent > b.amount_limit;

              return (
                <div key={b.category} className="card" style={{ borderColor: over ? 'rgba(244,63,94,.4)' : undefined }}>
                  {over && (
                    <div style={{ background: 'rgba(244,63,94,.12)', border: '1px solid rgba(244,63,94,.3)', borderRadius: 8, padding: '0.4rem 0.75rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: '#f43f5e', fontWeight: 600 }}>
                      ⚠️ Over budget by {formatUSD(b.spent - b.amount_limit)}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>{meta.icon}</span>
                      <div>
                        <p style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.9375rem' }}>{meta.label}</p>
                        <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {formatUSD(b.spent)} / {formatUSD(b.amount_limit)}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {editCat === b.category
                        ? null
                        : <>
                            <button className="btn-icon" onClick={() => { setEditCat(b.category); setLimitInput(String(b.amount_limit)); }}>
                              <Pencil size={14} />
                            </button>
                            <button className="btn-icon" onClick={() => handleDelete(b.category)} style={{ color: '#64748b' }}>
                              <Trash2 size={14} />
                            </button>
                          </>
                      }
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ background: '#0f172a', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`, height: '100%', borderRadius: 4, transition: 'width .5s',
                      background: over ? '#f43f5e' : pct > 80 ? '#f59e0b' : '#22c55e'
                    }} />
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
      }
    </div>
  );
}
