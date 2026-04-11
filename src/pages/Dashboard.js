import { format, getMonth, getYear } from 'date-fns';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { SyncIndicator } from '../components/ui/SyncIndicator';
import { SummaryCards } from '../components/dashboard/SummaryCards';
import { CategoryBreakdown } from '../components/dashboard/CategoryBreakdown';
import { PeriodSelector, ViewTabs } from '../components/dashboard/PeriodSelector';
import { TransactionForm } from '../components/transactions/TransactionForm';
import { TransactionItem } from '../components/transactions/TransactionItem';
import { EmptyState } from '../components/ui/EmptyState';
import { useTransactions } from '../hooks/useTransactions';
import { useToast } from '../components/ui/Toast';
import {
  computeCategoryBreakdown, computeSummary,
  filterByDay, filterByMonth, filterByYear
} from '../lib/finance';

export default function Dashboard() {
  const { transactions, syncState, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { push } = useToast();

  const [view, setView]           = useState('monthly');
  const [dayVal, setDayVal]       = useState(format(new Date(), 'yyyy-MM-dd'));
  const [monthVal, setMonthVal]   = useState(format(new Date(), 'yyyy-MM'));
  const [yearVal, setYearVal]     = useState(String(getYear(new Date())));
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null);
  const [activeTab, setActiveTab] = useState('expense'); // for breakdown toggle

  // Filter
  const filtered = (() => {
    if (view === 'daily')   return filterByDay(transactions, dayVal);
    if (view === 'monthly') {
      const [y, m] = monthVal.split('-').map(Number);
      return filterByMonth(transactions, y, m - 1);
    }
    return filterByYear(transactions, Number(yearVal));
  })();

  const { income, expense, balance } = computeSummary(filtered);
  const breakdown = computeCategoryBreakdown(filtered);

  const periodValue  = view === 'daily' ? dayVal : view === 'monthly' ? monthVal : yearVal;
  const periodChange = view === 'daily' ? setDayVal : view === 'monthly' ? setMonthVal : setYearVal;

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
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem' }}>FlowTracker</h1>
          <SyncIndicator state={syncState} />
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} style={{
          background: '#818cf8', color: '#fff', border: 'none', borderRadius: 12,
          width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(129,140,248,.4)'
        }}>
          <Plus size={22} strokeWidth={2.5} />
        </button>
      </div>

      {/* View tabs */}
      <ViewTabs view={view} onChange={setView} />

      {/* Period selector */}
      <div style={{ marginTop: '0.75rem', marginBottom: '1rem' }}>
        <PeriodSelector view={view} value={periodValue} onChange={periodChange} />
      </div>

      {/* Summary */}
      <SummaryCards income={income} expense={expense} balance={balance} />

      {/* Breakdown */}
      {breakdown.length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>By Category</h3>
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              {['expense','income'].map((t) => (
                <button key={t} onClick={() => setActiveTab(t)} style={{
                  padding: '0.3rem 0.75rem', borderRadius: 6, border: 'none', fontSize: '0.75rem', fontWeight: 600,
                  background: activeTab === t ? (t==='expense' ? 'rgba(244,63,94,.15)' : 'rgba(34,197,94,.15)') : 'transparent',
                  color: activeTab === t ? (t==='expense' ? '#f43f5e' : '#22c55e') : '#64748b'
                }}>
                  {t.charAt(0).toUpperCase()+t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <CategoryBreakdown breakdown={breakdown} type={activeTab} />
        </div>
      )}

      {/* Recent transactions */}
      <div style={{ marginTop: '1rem' }}>
        <h3 style={{ marginBottom: '0.75rem', color: '#94a3b8', fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Transactions ({filtered.length})
        </h3>

        {filtered.length === 0
          ? <EmptyState icon="💸" title="No transactions" subtitle="Tap + to add your first entry for this period" />
          : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filtered.map((t) => (
                <TransactionItem key={t.id} transaction={t} onEdit={handleEdit} onDelete={handleDelete} />
              ))}
            </div>
        }
      </div>

      {/* FAB (alternate) */}
      <button onClick={() => { setEditing(null); setShowForm(true); }} style={{
        position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', right: '1.25rem',
        background: '#818cf8', color: '#fff', border: 'none', borderRadius: '50%',
        width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(129,140,248,.5)', zIndex: 200
      }}>
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {showForm && (
        <TransactionForm
          initial={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}
