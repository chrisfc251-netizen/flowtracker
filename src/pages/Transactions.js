import { useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { TransactionForm } from '../components/transactions/TransactionForm';
import { useTransactions } from '../hooks/useTransactions';
import { useToast } from '../components/ui/Toast';
import { useBudgets } from '../hooks/useBudgets';
import { useAccounts } from '../hooks/useAccounts';
import { filterBySearch } from '../lib/finance';
import { computeBalanceSplit } from '../lib/balanceEngine';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../lib/constants';

const ALL_CATS = [{ value: '', label: 'All Categories', icon: '🗂️' }, ...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

const fmtFull = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);

const catIcons = {
  food: '🍔', transport: '🚗', housing: '🏠', health: '❤️',
  entertainment: '🎬', shopping: '🛍️', education: '📚', bills: '⚡',
  subscriptions: '🔄', salary: '💼', freelance: '🧑‍💻', gifts: '🎁',
  investments: '📈', other: '💰',
};

// ── Group transactions by date ────────────────────────────────────────────
function groupByDate(list) {
  const groups = {};
  for (const t of list) {
    const d = t.date;
    if (!groups[d]) groups[d] = [];
    groups[d].push(t);
  }
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
}

function formatDateLabel(dateStr) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  return format(parseISO(dateStr), 'EEEE, MMM d');
}

export default function Transactions() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { budgets }      = useBudgets();
  const { accounts }     = useAccounts();
  const { push }         = useToast();

  const [showForm,   setShowForm]   = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [query,      setQuery]      = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [catFilter,  setCatFilter]  = useState('');

  const { availableBalance } = computeBalanceSplit(transactions);

  let list = transactions;
  if (query)      list = filterBySearch(list, query);
  if (typeFilter) list = list.filter(t => t.type === typeFilter);
  if (catFilter)  list = list.filter(t => t.category === catFilter);

  const grouped = groupByDate(list);
  const hasFilters = query || typeFilter || catFilter;

  async function handleDelete(id) {
    if (!window.confirm('Delete this transaction?')) return;
    try { await deleteTransaction(id); push('Deleted', 'warning'); }
    catch (e) { push(e.message, 'error'); }
  }

  async function handleSave(payload) {
    if (editing) await updateTransaction(editing.id, payload);
    else         await addTransaction(payload);
    setEditing(null);
  }

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h1>Transactions</h1>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          style={{
            background: 'var(--ink-1)', color: 'var(--bg)', border: 'none',
            borderRadius: 999, width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
          }}
        >
          <Plus size={17} strokeWidth={2.5} />
        </button>
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
        <Search size={14} style={{
          position: 'absolute', left: '0.875rem', top: '50%',
          transform: 'translateY(-50%)', color: 'var(--ink-4)'
        }} />
        <input
          type="text"
          placeholder="Search transactions…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ paddingLeft: '2.5rem', paddingRight: query ? '2.5rem' : '1rem' }}
        />
        {query && (
          <button onClick={() => setQuery('')} style={{
            position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)',
            display: 'flex', alignItems: 'center'
          }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div style={{
        display: 'flex', gap: '0.375rem', marginBottom: '1.25rem',
        overflowX: 'auto', paddingBottom: '0.25rem'
      }}>
        {[
          { val: '', label: 'All' },
          { val: 'income', label: 'Income' },
          { val: 'expense', label: 'Expenses' },
        ].map(f => (
          <button key={f.val} onClick={() => setTypeFilter(f.val)} style={{
            padding: '0.35rem 0.875rem', borderRadius: 999, border: 'none',
            fontWeight: 600, fontSize: '0.775rem', whiteSpace: 'nowrap',
            flexShrink: 0, cursor: 'pointer', fontFamily: 'var(--font-sans)',
            background: typeFilter === f.val ? 'var(--ink-1)' : 'var(--bg-card)',
            color: typeFilter === f.val ? 'var(--bg)' : 'var(--ink-3)',
            border: typeFilter === f.val ? 'none' : '1px solid var(--border)',
            transition: 'all 0.15s'
          }}>
            {f.label}
          </button>
        ))}
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          style={{
            flexShrink: 0, padding: '0.35rem 2rem 0.35rem 0.75rem',
            borderRadius: 999, fontSize: '0.775rem', fontWeight: 600,
            background: catFilter ? 'var(--ink-1)' : 'var(--bg-card)',
            color: catFilter ? 'var(--bg)' : 'var(--ink-3)',
            border: catFilter ? 'none' : '1px solid var(--border)',
            minWidth: 130, width: 'auto', cursor: 'pointer',
          }}
        >
          {ALL_CATS.map(c => (
            <option key={c.value} value={c.value} style={{ background: 'var(--bg-card)', color: 'var(--ink-1)' }}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Count */}
      <p style={{
        fontSize: '0.775rem', color: 'var(--ink-4)',
        fontFamily: 'var(--font-sans)', marginBottom: '0.875rem'
      }}>
        {list.length} transaction{list.length !== 1 ? 's' : ''}
        {hasFilters && <span> · <button onClick={() => { setQuery(''); setTypeFilter(''); setCatFilter(''); }}
          style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '0.775rem', fontFamily: 'var(--font-sans)' }}>Clear filters</button></span>}
      </p>

      {/* Empty state */}
      {list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <p style={{
            fontFamily: 'var(--font-serif)', fontStyle: 'italic',
            fontSize: '1.5rem', color: 'var(--ink-3)', marginBottom: '0.5rem'
          }}>Nothing found.</p>
          <p style={{ color: 'var(--ink-4)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)' }}>
            {query ? 'Try a different search' : 'Add your first transaction above'}
          </p>
        </div>
      ) : (
        /* Grouped list */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {grouped.map(([date, txList]) => (
            <div key={date}>
              {/* Date label */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '0.5rem'
              }}>
                <p style={{
                  fontSize: '0.775rem', fontWeight: 600, color: 'var(--ink-2)',
                  fontFamily: 'var(--font-sans)'
                }}>{formatDateLabel(date)}</p>
                <p style={{
                  fontSize: '0.75rem', color: 'var(--ink-4)',
                  fontFamily: 'var(--font-mono)'
                }}>
                  {fmtFull(txList.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0) * -1 +
                    txList.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0))}
                </p>
              </div>

              {/* TX cards */}
              <div style={{
                background: 'var(--bg-card)', borderRadius: 'var(--radius)',
                border: '1px solid var(--border)', overflow: 'hidden',
                boxShadow: 'var(--shadow-card)'
              }}>
                {txList.map((t, i) => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      borderBottom: i < txList.length - 1 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer', transition: 'background 0.1s'
                    }}
                    onClick={() => { setEditing(t); setShowForm(true); }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-inset)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{catIcons[t.category] || '💸'}</span>
                      <div style={{ minWidth: 0 }}>
                        <p style={{
                          fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink-1)',
                          fontFamily: 'var(--font-sans)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>
                          {t.description || t.category.charAt(0).toUpperCase() + t.category.slice(1)}
                        </p>
                        <p style={{
                          fontSize: '0.75rem', color: 'var(--ink-3)',
                          fontFamily: 'var(--font-sans)', textTransform: 'capitalize'
                        }}>
                          {t.category}{t.nature ? ` · ${t.nature}` : ''}
                        </p>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '0.75rem' }}>
                      <p style={{
                        fontSize: '0.9375rem', fontWeight: 700,
                        color: t.type === 'income' ? 'var(--accent-green)' : 'var(--accent-red)',
                        fontFamily: 'var(--font-mono)'
                      }}>
                        {t.type === 'income' ? '+' : '-'}{fmtFull(t.amount)}
                      </p>
                      {t.account_id && (
                        <p style={{ fontSize: '0.7rem', color: 'var(--ink-4)', fontFamily: 'var(--font-sans)' }}>
                          account
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <TransactionForm
          initial={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
          availableBalance={availableBalance}
          budgets={budgets}
          accounts={accounts}
        />
      )}
    </div>
  );
}
