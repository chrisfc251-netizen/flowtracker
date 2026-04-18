import { useState } from 'react';
import { getMonth, getYear } from 'date-fns';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { differenceInDays, parseISO, format } from 'date-fns';

// Hooks
import { useBudgets } from '../hooks/useBudgets';
import { useTransactions } from '../hooks/useTransactions';
import { useFixedExpenses } from '../hooks/useFixedExpenses';
import { useSavingsGoals } from '../hooks/useSavingsGoals';
import { useCategoryPriorities } from '../hooks/useCategoryPriorities';
import { useAccounts } from '../hooks/useAccounts';
import { useToast } from '../components/ui/Toast';

// Components
import { SmartBudgetPanel } from '../components/budgets/SmartBudgetPanel';
import { FixedExpenseForm } from '../components/bills/FixedExpenseForm';
import { EmptyState } from '../components/ui/EmptyState';

// Lib
import { formatUSD, getCategoryMeta, EXPENSE_CATEGORIES } from '../lib/constants';
import { filterByMonth } from '../lib/finance';
import { computeBalanceSplit, rebalanceBudget } from '../lib/balanceEngine';
import { buildEffectiveBudgetStatus } from '../lib/budgetEngine';
import { generateInsights, evaluateDecisions } from '../lib/balanceEngine';

function fmt(n) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0); }

// ── Budgets sub-tab ───────────────────────────────────────────────────────
function BudgetsTab() {
  const { priorities, getPriorityMap } = useCategoryPriorities();
  const priorityMap = getPriorityMap();
  const { budgets, effectiveBudgets, upsertBudget, deleteBudget, toggleActive } = useBudgets(priorityMap);
  const { transactions } = useTransactions();
  const { goals }        = useSavingsGoals();
  const { push }         = useToast();

  const now     = new Date();
  const monthly = filterByMonth(transactions, getYear(now), getMonth(now));
  const { availableBalance } = computeBalanceSplit(transactions);

  const statusList = buildEffectiveBudgetStatus(monthly, effectiveBudgets.length ? effectiveBudgets : budgets.map((b) => ({ ...b, effectiveBudget: b.amount_limit })));

  const existingExpenses = {};
  for (const t of monthly.filter((x) => x.type === 'expense')) {
    existingExpenses[t.category] = (existingExpenses[t.category] || 0) + Number(t.amount);
  }

  const naCount = budgets.filter((b) => b.is_active === false).length;
  const naPool  = budgets.filter((b) => b.is_active === false).reduce((s, b) => s + Number(b.amount_limit), 0);

  const [editCat,    setEditCat]    = useState(null);
  const [limitInput, setLimitInput] = useState('');
  const [showAdd,    setShowAdd]    = useState(false);
  const [newCat,     setNewCat]     = useState('food');
  const [newLimit,   setNewLimit]   = useState('');
  const [applying,   setApplying]   = useState(false);

  async function handleUpsert(cat, lim) {
    const val = parseFloat(lim);
    if (!val || val <= 0) { push('Enter a valid amount', 'error'); return; }
    await upsertBudget(cat, val);
    push('Budget saved');
    setEditCat(null); setShowAdd(false); setNewLimit('');
  }

  async function handleDelete(cat) {
    if (!window.confirm('Remove this budget?')) return;
    await deleteBudget(cat);
    push('Removed', 'warning');
  }

  async function handleToggle(cat) {
    const b = budgets.find((b) => b.category === cat);
    const wasActive = b?.is_active !== false;
    await toggleActive(cat);
    push(wasActive ? `${cat} marked N/A — budget redistributed` : `${cat} reactivated ✓`);
  }

  async function handleRebalance() {
    setApplying(true);
    const limits = {};
    for (const b of budgets) limits[b.category] = b.amount_limit;
    const result = rebalanceBudget({ limits, actuals: existingExpenses, priorities: priorityMap });
    let count = 0;
    for (const [cat, newLim] of Object.entries(result.result)) {
      if (newLim !== limits[cat] && newLim > 0) { await upsertBudget(cat, newLim); count++; }
    }
    setApplying(false);
    push(count > 0 ? `⚖️ ${count} budget${count > 1 ? 's' : ''} adjusted ✓` : 'Already balanced', count > 0 ? 'success' : 'warning');
  }

  return (
    <div>
      {naCount > 0 && (
        <div style={{ background: 'rgba(129,140,248,.08)', border: '1px solid rgba(129,140,248,.2)', borderRadius: 12, padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span>♻️</span>
          <p style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: 600 }}>
            {naCount} inactive · {fmt(naPool)} redistributed to high-priority categories
          </p>
        </div>
      )}

      <div className="card" style={{ marginBottom: '0.875rem' }}>
        <SmartBudgetPanel availableBalance={availableBalance} goals={goals} categoryPriorities={priorities} existingExpenses={existingExpenses}
          onApplyBudget={async (limits) => { for (const [c, l] of Object.entries(limits)) if (l > 0) await upsertBudget(c, l); push('Smart budgets applied ✓'); }} />
      </div>

      <button onClick={handleRebalance} disabled={applying} style={{
        background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 10,
        padding: '0.625rem', color: '#f59e0b', fontWeight: 700, fontSize: '0.82rem',
        cursor: 'pointer', width: '100%', marginBottom: '0.875rem', fontFamily: 'inherit', opacity: applying ? 0.6 : 1
      }}>
        {applying ? '⏳ Applying…' : '⚖️ Auto-Rebalance Based on Priorities'}
      </button>

      {showAdd && (
        <div className="card" style={{ marginBottom: '0.875rem' }}>
          <select value={newCat} onChange={(e) => setNewCat(e.target.value)} style={{ marginBottom: '0.625rem' }}>
            {EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
          </select>
          <input type="number" inputMode="decimal" placeholder="Monthly limit ($)" value={newLimit} onChange={(e) => setNewLimit(e.target.value)} style={{ marginBottom: '0.625rem' }} />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-primary" onClick={() => handleUpsert(newCat, newLimit)}>Save</button>
            <button className="btn-ghost" onClick={() => { setShowAdd(false); setNewLimit(''); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Inactive */}
      {budgets.filter((b) => b.is_active === false).length > 0 && (
        <div style={{ marginBottom: '0.875rem' }}>
          <p style={{ fontSize: '0.68rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.375rem' }}>Inactive (N/A)</p>
          {budgets.filter((b) => b.is_active === false).map((b) => {
            const meta = getCategoryMeta(b.category);
            return (
              <div key={b.category} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '0.625rem 0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem', opacity: 0.6 }}>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{meta.icon} {meta.label} · {fmt(b.amount_limit)}</span>
                <button onClick={() => handleToggle(b.category)} style={{ background: 'rgba(34,197,94,.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,.2)', borderRadius: 6, padding: '0.25rem 0.625rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Reactivate</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Active budgets */}
      {statusList.length === 0
        ? <EmptyState icon="🎯" title="No budgets" subtitle="Add limits or use Smart Budget" />
        : statusList.map((b) => {
          const meta = getCategoryMeta(b.category);
          const pct  = Math.min(Math.round((b.spent / b.effectiveBudget) * 100), 100);
          return (
            <div key={b.category} className="card" style={{ marginBottom: '0.625rem', borderColor: b.over ? 'rgba(244,63,94,.35)' : undefined }}>
              {b.over && <div style={{ background: 'rgba(244,63,94,.1)', border: '1px solid rgba(244,63,94,.25)', borderRadius: 8, padding: '0.375rem 0.75rem', marginBottom: '0.625rem', fontSize: '0.78rem', color: '#f43f5e', fontWeight: 600 }}>⚠️ Over by {fmt(b.spent - b.effectiveBudget)}</div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>{meta.icon}</span>
                  <div>
                    <p style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.9rem' }}>{meta.label}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{fmt(b.spent)} / {fmt(b.effectiveBudget)}</p>
                      {b.redistributed && b.delta > 0 && <span style={{ fontSize: '0.65rem', color: '#818cf8', fontWeight: 700, background: 'rgba(129,140,248,.1)', borderRadius: 4, padding: '1px 5px' }}>+{fmt(b.delta)}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                  <button onClick={() => handleToggle(b.category)} style={{ background: 'rgba(100,116,139,.08)', color: '#64748b', border: '1px solid #334155', borderRadius: 6, padding: '0.2rem 0.5rem', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>N/A</button>
                  {editCat !== b.category && <>
                    <button className="btn-icon" onClick={() => { setEditCat(b.category); setLimitInput(String(b.amount_limit)); }}><Pencil size={13} /></button>
                    <button className="btn-icon" onClick={() => handleDelete(b.category)} style={{ color: '#64748b' }}><Trash2 size={13} /></button>
                  </>}
                </div>
              </div>
              <div style={{ background: '#0f172a', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: b.over ? '#f43f5e' : pct > 80 ? '#f59e0b' : '#22c55e' }} />
              </div>
              <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem', textAlign: 'right' }}>{pct}% used</p>
              {editCat === b.category && (
                <div style={{ marginTop: '0.625rem', display: 'flex', gap: '0.5rem' }}>
                  <input type="number" value={limitInput} onChange={(e) => setLimitInput(e.target.value)} placeholder="New limit" style={{ flex: 1 }} />
                  <button className="btn-primary" style={{ width: 'auto', padding: '0 0.875rem' }} onClick={() => handleUpsert(b.category, limitInput)}>Save</button>
                  <button className="btn-ghost" style={{ width: 'auto', padding: '0 0.75rem' }} onClick={() => setEditCat(null)}>✕</button>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}

// ── Bills sub-tab ─────────────────────────────────────────────────────────
function BillsTab({ showForm, setShowForm }) {
  const { expenses, addExpense, updateExpense, deleteExpense, markAsPaid } = useFixedExpenses();
  const { accounts } = useAccounts();
  const { push }     = useToast();

  const [editItem,   setEditItem]   = useState(null);
  const [payingItem, setPayingItem] = useState(null);
  const [payAcctId,  setPayAcctId]  = useState('');

  const totalMonthly = expenses.reduce((s, e) => {
    if (e.frequency_type === 'monthly') return s + Number(e.amount);
    if (e.frequency_type === 'weekly')  return s + Number(e.amount) * 4.33;
    return s + (Number(e.amount) * 30) / (e.frequency_value || 30);
  }, 0);

  const dueSoon = expenses.filter((e) => {
    const d = differenceInDays(parseISO(e.next_due_date), new Date());
    return d >= 0 && d <= 7;
  });
  const upcoming = expenses.filter((e) => {
    const d = differenceInDays(parseISO(e.next_due_date), new Date());
    return d > 7;
  });

  async function handleSave(payload) {
    if (editItem) { await updateExpense(editItem.id, payload); push('Updated ✓'); setEditItem(null); }
    else          { await addExpense(payload); push('Bill added ✓'); setShowForm(false); }
  }

  async function handlePay() {
    if (!payAcctId || !payingItem) return;
    const { error } = await markAsPaid(payingItem, payAcctId);
    if (error) { push(error.message, 'error'); return; }
    push(`${payingItem.name} paid ✓`);
    setPayingItem(null); setPayAcctId('');
  }

  function BillRow({ e }) {
    const days  = differenceInDays(parseISO(e.next_due_date), new Date());
    const color = days === 0 ? '#f43f5e' : days <= 3 ? '#f43f5e' : days <= 7 ? '#f59e0b' : '#64748b';
    const label = days === 0 ? 'Today' : days < 0 ? 'Overdue' : `In ${days}d`;
    const meta  = getCategoryMeta(e.category);
    return (
      <div style={{ background: '#1e293b', border: `1px solid ${days <= 3 ? 'rgba(244,63,94,.25)' : '#334155'}`, borderRadius: 12, padding: '0.875rem', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(244,63,94,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>{meta.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.9rem' }}>{e.name}</p>
              <p style={{ fontWeight: 800, color: '#f43f5e', fontSize: '0.9rem' }}>{fmt(e.amount)}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.7rem', color, fontWeight: 700, background: `${color}18`, borderRadius: 5, padding: '1px 6px' }}>{label}</span>
              <span style={{ fontSize: '0.7rem', color: '#475569' }}>{format(parseISO(e.next_due_date), 'MMM d, yyyy')}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.625rem', paddingTop: '0.625rem', borderTop: '1px solid #334155' }}>
          <button onClick={() => { setPayingItem(e); setPayAcctId(accounts[0]?.id || ''); }} style={{ flex: 2, background: 'rgba(34,197,94,.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,.2)', borderRadius: 8, padding: '0.4rem', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}>✓ Mark Paid</button>
          <button onClick={() => setEditItem(e)} style={{ flex: 1, background: 'rgba(129,140,248,.08)', color: '#818cf8', border: '1px solid rgba(129,140,248,.15)', borderRadius: 8, padding: '0.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pencil size={13} /></button>
          <button onClick={async () => { if (!window.confirm(`Delete "${e.name}"?`)) return; await deleteExpense(e.id); push('Removed', 'warning'); }} style={{ flex: 1, background: 'rgba(244,63,94,.06)', color: '#f43f5e', border: '1px solid rgba(244,63,94,.12)', borderRadius: 8, padding: '0.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={13} /></button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ background: 'rgba(244,63,94,.07)', border: '1px solid rgba(244,63,94,.15)', borderRadius: 12, padding: '0.875rem 1rem', marginBottom: '1rem' }}>
        <p style={{ fontSize: '0.68rem', color: '#f43f5e', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Monthly Committed</p>
        <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9' }}>{fmt(totalMonthly)}</p>
        <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.1rem' }}>{expenses.length} active bill{expenses.length !== 1 ? 's' : ''}</p>
      </div>

      {dueSoon.length > 0 && (
        <div style={{ marginBottom: '0.875rem' }}>
          <p style={{ fontSize: '0.68rem', color: '#f43f5e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.375rem' }}>Due Soon</p>
          {dueSoon.map((e) => <BillRow key={e.id} e={e} />)}
        </div>
      )}

      {upcoming.length > 0 && (
        <div style={{ marginBottom: '0.875rem' }}>
          <p style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.375rem' }}>Upcoming</p>
          {upcoming.map((e) => <BillRow key={e.id} e={e} />)}
        </div>
      )}

      {expenses.length === 0 && <EmptyState icon="📋" title="No bills yet" subtitle="Add your recurring expenses" />}

      {/* Pay modal */}
      {payingItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 510, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }} onClick={(e) => e.target === e.currentTarget && setPayingItem(null)}>
          <div style={{ background: '#1e293b', borderRadius: 16, border: '1px solid #334155', width: '100%', maxWidth: 360, padding: '1.5rem' }}>
            <h3 style={{ color: '#f1f5f9', marginBottom: '0.5rem' }}>Mark as Paid</h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1rem' }}>Creates a <strong style={{ color: '#f43f5e' }}>{fmt(payingItem.amount)}</strong> expense and advances the due date.</p>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.5rem' }}>Pay from:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '1rem' }}>
              {accounts.map((a) => (
                <button key={a.id} onClick={() => setPayAcctId(a.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem', borderRadius: 10, border: `1px solid ${payAcctId === a.id ? a.color : '#334155'}`, background: payAcctId === a.id ? `${a.color}15` : '#0f172a', cursor: 'pointer', fontFamily: 'inherit' }}>
                  <span>{a.icon}</span><span style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.875rem' }}>{a.name}</span>
                  {payAcctId === a.id && <span style={{ marginLeft: 'auto', color: a.color, fontWeight: 700, fontSize: '0.8rem' }}>✓</span>}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handlePay} disabled={!payAcctId} style={{ flex: 1, background: '#22c55e', color: '#fff', border: 'none', borderRadius: 10, padding: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: !payAcctId ? 0.5 : 1 }}>Confirm</button>
              <button onClick={() => setPayingItem(null)} style={{ flex: 1, background: 'transparent', color: '#64748b', border: '1px solid #334155', borderRadius: 10, padding: '0.75rem', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {(showForm || editItem) && <FixedExpenseForm initial={editItem} onSave={handleSave} onClose={() => { setShowForm(false); setEditItem(null); }} />}
    </div>
  );
}

// ── Insights sub-tab ──────────────────────────────────────────────────────
function InsightsTab() {
  const { transactions } = useTransactions();
  const { goals }        = useSavingsGoals();
  const { getPriorityMap } = useCategoryPriorities();
  const { budgets, effectiveBudgets } = useBudgets(getPriorityMap());

  const monthly = filterByMonth(transactions, getYear(new Date()), getMonth(new Date()));
  const budgetStatus = buildEffectiveBudgetStatus(monthly, effectiveBudgets.length ? effectiveBudgets : budgets.map((b) => ({ ...b, effectiveBudget: b.amount_limit })));

  const insights  = generateInsights({ transactions: monthly, goals });
  const decisions = evaluateDecisions({ transactions: monthly, budgets: budgetStatus });

  const TYPE_STYLES = {
    reduction: { bg: 'rgba(99,102,241,.08)',  border: 'rgba(99,102,241,.2)',  color: '#818cf8', icon: '📉' },
    warning:   { bg: 'rgba(245,158,11,.08)',  border: 'rgba(245,158,11,.2)',  color: '#f59e0b', icon: '⚠️' },
    savings:   { bg: 'rgba(244,63,94,.08)',   border: 'rgba(244,63,94,.2)',   color: '#f43f5e', icon: '🏦' },
    positive:  { bg: 'rgba(34,197,94,.08)',   border: 'rgba(34,197,94,.2)',   color: '#22c55e', icon: '✅' },
    critical:  { bg: 'rgba(244,63,94,.12)',   border: 'rgba(244,63,94,.35)',  color: '#f43f5e', icon: '🚨' },
    goal:      { bg: 'rgba(129,140,248,.08)', border: 'rgba(129,140,248,.2)', color: '#818cf8', icon: '🎯' },
  };

  if (insights.length === 0 && decisions.negatives.length === 0) {
    return <EmptyState icon="✅" title="All clear" subtitle="No issues detected this month. Keep it up!" />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      {insights.map((ins, i) => {
        const s = TYPE_STYLES[ins.type] || TYPE_STYLES.warning;
        return (
          <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: '0.875rem', display: 'flex', gap: '0.625rem' }}>
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>{s.icon}</span>
            <p style={{ fontSize: '0.82rem', color: s.color, lineHeight: 1.55, margin: 0 }}>{ins.message}</p>
          </div>
        );
      })}

      {(decisions.positives[0] || decisions.negatives[0]) && (
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '0.875rem' }}>
          <p style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.625rem' }}>Decision Reflection</p>
          {decisions.positives[0] && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span>👍</span>
              <p style={{ fontSize: '0.8rem', color: '#22c55e', lineHeight: 1.5 }}>
                <strong>Best:</strong> {fmt(decisions.positives[0].under)} under budget in {decisions.positives[0].category}
              </p>
            </div>
          )}
          {decisions.negatives[0] && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span>👎</span>
              <p style={{ fontSize: '0.8rem', color: '#f43f5e', lineHeight: 1.5 }}>
                <strong>Improve:</strong> {fmt(decisions.negatives[0].over)} over budget in {decisions.negatives[0].category}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Planning page ────────────────────────────────────────────────────
const TABS = ['Budgets', 'Bills', 'Insights'];

export default function Planning() {
  const [active, setActive] = useState('Budgets');
  const { expenses } = useFixedExpenses();

  // badge counts
  const urgentBills = expenses.filter((e) => {
    const d = differenceInDays(parseISO(e.next_due_date), new Date());
    return d >= 0 && d <= 3;
  }).length;

  function addButton() {
    if (active === 'Budgets') return true;
    if (active === 'Bills')   return true;
    return false;
  }

  const [showBillForm, setShowBillForm] = useState(false);
  const [showBudgetAdd, setShowBudgetAdd] = useState(false);

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1>Planning</h1>
        {active === 'Bills' && (
          <button onClick={() => setShowBillForm((p) => !p)} style={{ background: showBillForm ? '#334155' : '#818cf8', color: '#fff', border: 'none', borderRadius: 12, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Plus size={20} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', background: '#1e293b', borderRadius: 10, padding: 3, marginBottom: '1.25rem' }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setActive(t)} style={{
            flex: 1, padding: '0.55rem', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: active === t ? '#334155' : 'transparent',
            color: active === t ? '#f1f5f9' : '#64748b',
            fontWeight: 600, fontSize: '0.82rem', fontFamily: 'inherit',
            position: 'relative', transition: 'all .15s'
          }}>
            {t}
            {t === 'Bills' && urgentBills > 0 && (
              <span style={{ position: 'absolute', top: 4, right: 6, background: '#f43f5e', color: '#fff', borderRadius: '50%', width: 14, height: 14, fontSize: '0.55rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {urgentBills}
              </span>
            )}
          </button>
        ))}
      </div>

      {active === 'Budgets'  && <BudgetsTab />}
      {active === 'Bills'    && <BillsTab   showForm={showBillForm} setShowForm={setShowBillForm} />}
      {active === 'Insights' && <InsightsTab />}
    </div>
  );
}