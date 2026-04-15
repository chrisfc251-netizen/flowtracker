import { useState, useMemo } from 'react';
import { Plus, Search, ArrowUpDown } from 'lucide-react';
import { TransactionItem } from '../components/transactions/TransactionItem';
import { TransactionForm } from '../components/transactions/TransactionForm';
import { EmptyState } from '../components/ui/EmptyState';
import { useTransactions } from '../hooks/useTransactions';
import { useToast } from '../components/ui/Toast';
import { useBudgets } from '../hooks/useBudgets';
import { useAccounts } from '../hooks/useAccounts';
import { filterBySearch } from '../lib/finance';
import { computeBalanceSplit } from '../lib/balanceEngine';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../lib/constants';

const ALL_CATS = [{ value: '', label: 'All Categories', icon: '🗂️' }, ...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

const SORT_OPTIONS = [
  { value: 'newest',   label: 'Newest first'  },
  { value: 'oldest',   label: 'Oldest first'  },
  { value: 'highest',  label: 'Highest amount' },
  { value: 'lowest',   label: 'Lowest amount'  },
];

function sortTransactions(list, sortBy) {
  const copy = [...list];
  switch (sortBy) {
    case 'oldest':  return copy.sort((a, b) => new Date(a.date) - new Date(b.date));
    case 'highest': return copy.sort((a, b) => Number(b.amount) - Number(a.amount));
    case 'lowest':  return copy.sort((a, b) => Number(a.amount) - Number(b.amount));
    default:        return copy.sort((a, b) => new Date(b.date) - new Date(a.date)); // newest
  }
}

export default function Transactions() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { budgets }  = useBudgets();
  const { accounts } = useAccounts();
  const { push }     = useToast();

  const [showForm,   setShowForm]   = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [query,      setQuery]      = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [catFilter,  setCatFilter]  = useState('');
  const [sortBy,     setSortBy]     = useState('newest');
  const [showSort,   setShowSort]   = useState(false);

  const { availableBalance } = computeBalanceSplit(transactions);

  const list = useMemo(() => {
    let result = transactions;
    if (query)      result = filterBySearch(result, query);
    if (typeFilter) result = result.filter((t) => t.type === typeFilter);
    if (catFilter)  result = result.filter((t) => t.category === catFilter);
    return sortTransactions(result, sortBy);
  }, [transactions, query, typeFilter, catFilter, sortBy]);

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

  const currentSort = SORT_OPTIONS.find((s) => s.value === sortBy);

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h1>Transactions</h1>
        <button onClick={() => { setEditing(null); setShowForm(true); }} style={{
          background: '#818cf8', color: '#fff', border: 'none', borderRadius: 12,
          width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
        }}>
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
        <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
        <input type="text" placeholder="Search by description or category…"
          value={query} onChange={(e) => setQuery(e.target.value)}
          style={{ paddingLeft: '2.5rem' }} />
      </div>

      {/* Filters + Sort */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.25rem', alignItems: 'center' }}>
        {['', 'income', 'expense'].map((t) => (
          <button key={t} onClick={() => setTypeFilter(t)} style={{
            padding: '0.4rem 0.875rem', borderRadius: 20, border: 'none', fontWeight: 600,
            fontSize: '0.8rem', whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
            background: typeFilter === t
              ? (t === 'income' ? 'rgba(34,197,94,.2)' : t === 'expense' ? 'rgba(244,63,94,.2)' : '#334155')
              : '#1e293b',
            color: typeFilter === t
              ? (t === 'income' ? '#22c55e' : t === 'expense' ? '#f43f5e' : '#f1f5f9')
              : '#64748b'
          }}>
            {t === '' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}

        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} style={{
          flexShrink: 0, padding: '0.4rem 2rem 0.4rem 0.75rem', borderRadius: 20,
          fontSize: '0.8rem', fontWeight: 600, background: catFilter ? '#334155' : '#1e293b',
          color: catFilter ? '#f1f5f9' : '#64748b', border: 'none', minWidth: 140
        }}>
          {ALL_CATS.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
        </select>

        {/* Sort dropdown */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button onClick={() => setShowSort((p) => !p)} style={{
            padding: '0.4rem 0.875rem', borderRadius: 20, border: 'none', fontWeight: 600,
            fontSize: '0.8rem', whiteSpace: 'nowrap', cursor: 'pointer',
            background: sortBy !== 'newest' ? '#334155' : '#1e293b',
            color: sortBy !== 'newest' ? '#f1f5f9' : '#64748b',
            display: 'flex', alignItems: 'center', gap: '0.375rem'
          }}>
            <ArrowUpDown size={12} /> {currentSort?.label}
          </button>
          {showSort && (
            <div style={{
              position: 'absolute', top: '110%', right: 0, background: '#1e293b',
              border: '1px solid #334155', borderRadius: 10, overflow: 'hidden',
              zIndex: 100, minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,.4)'
            }}>
              {SORT_OPTIONS.map((opt) => (
                <button key={opt.value} onClick={() => { setSortBy(opt.value); setShowSort(false); }} style={{
                  display: 'block', width: '100%', padding: '0.625rem 1rem',
                  background: sortBy === opt.value ? 'rgba(129,140,248,.15)' : 'transparent',
                  color: sortBy === opt.value ? '#818cf8' : '#cbd5e1',
                  border: 'none', textAlign: 'left', fontSize: '0.85rem',
                  fontWeight: sortBy === opt.value ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit'
                }}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <p style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '0.75rem' }}>
        {list.length} transaction{list.length !== 1 ? 's' : ''}
      </p>

      {list.length === 0
        ? <EmptyState icon="🔍" title="No results" subtitle={query ? 'Try a different search term' : 'Add your first transaction'} />
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {list.map((t) => (
              <TransactionItem key={t.id} transaction={t}
                onEdit={(t) => { setEditing(t); setShowForm(true); }}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

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
