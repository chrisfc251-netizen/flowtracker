import { useState } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Plus, Pencil, Trash2, CheckCircle } from 'lucide-react';
import { useFixedExpenses } from '../hooks/useFixedExpenses';
import { useAccounts } from '../hooks/useAccounts';
import { useToast } from '../components/ui/Toast';
import { FixedExpenseForm } from '../components/bills/FixedExpenseForm';
import { getCategoryMeta } from '../lib/constants';

function formatUSD(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
}

function DueBadge({ dateStr }) {
  const days = differenceInDays(parseISO(dateStr), new Date());
  let color = '#22c55e', bg = 'rgba(34,197,94,.1)', label = `In ${days}d`;
  if (days < 0)  { color = '#64748b'; bg = 'rgba(100,116,139,.1)'; label = 'Overdue'; }
  if (days === 0){ color = '#f43f5e'; bg = 'rgba(244,63,94,.1)';   label = 'Today'; }
  if (days <= 3) { color = '#f43f5e'; bg = 'rgba(244,63,94,.1)';   label = `In ${days}d`; }
  if (days <= 7) { color = '#f59e0b'; bg = 'rgba(245,158,11,.1)';  label = `In ${days}d`; }
  return (
    <span style={{ background: bg, color, borderRadius: 6, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700 }}>
      {label}
    </span>
  );
}

// ── Mark as Paid modal ────────────────────────────────────────────────────
function MarkPaidModal({ expense, accounts, onConfirm, onClose }) {
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [saving, setSaving]       = useState(false);

  async function handleConfirm() {
    if (!accountId) return;
    setSaving(true);
    await onConfirm(expense, accountId);
    setSaving(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 510, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1e293b', borderRadius: 16, border: '1px solid #334155', width: '100%', maxWidth: 380, padding: '1.5rem' }}>
        <h3 style={{ color: '#f1f5f9', marginBottom: '0.5rem' }}>Mark as Paid</h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
          This will create a <strong style={{ color: '#f43f5e' }}>{formatUSD(expense.amount)}</strong> expense transaction and advance the next due date.
        </p>

        <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.5rem' }}>Pay from account:</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '1.25rem' }}>
          {accounts.map((a) => (
            <button key={a.id} onClick={() => setAccountId(a.id)} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
              borderRadius: 10, border: `1px solid ${accountId === a.id ? a.color : '#334155'}`,
              background: accountId === a.id ? `${a.color}15` : '#0f172a',
              cursor: 'pointer', fontFamily: 'inherit'
            }}>
              <span style={{ fontSize: '1.1rem' }}>{a.icon}</span>
              <span style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.9rem' }}>{a.name}</span>
              {accountId === a.id && <span style={{ marginLeft: 'auto', color: a.color, fontSize: '0.8rem', fontWeight: 700 }}>✓</span>}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleConfirm} disabled={saving || !accountId} style={{
            flex: 1, background: '#22c55e', color: '#fff', border: 'none', borderRadius: 10,
            padding: '0.75rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', opacity: saving ? 0.6 : 1
          }}>
            {saving ? 'Processing…' : 'Confirm Payment'}
          </button>
          <button onClick={onClose} style={{
            flex: 1, background: 'transparent', color: '#64748b', border: '1px solid #334155',
            borderRadius: 10, padding: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
          }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Bills page ───────────────────────────────────────────────────────
export default function Bills() {
  const { expenses, loading, addExpense, updateExpense, deleteExpense, markAsPaid } = useFixedExpenses();
  const { accounts } = useAccounts();
  const { push }     = useToast();

  const [showForm,    setShowForm]    = useState(false);
  const [editItem,    setEditItem]    = useState(null);
  const [payingItem,  setPayingItem]  = useState(null);

  const totalMonthly = expenses.reduce((s, e) => {
    if (e.frequency_type === 'monthly') return s + Number(e.amount);
    if (e.frequency_type === 'weekly')  return s + Number(e.amount) * 4.33;
    return s + (Number(e.amount) * 30) / (e.frequency_value || 30);
  }, 0);

  async function handleSave(payload) {
    if (editItem) {
      const { error } = await updateExpense(editItem.id, payload);
      if (error) { push(error.message, 'error'); return; }
      push('Bill updated ✓');
      setEditItem(null);
    } else {
      const { error } = await addExpense(payload);
      if (error) { push(error.message, 'error'); return; }
      push('Bill added ✓');
      setShowForm(false);
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete "${name}"?`)) return;
    const { error } = await deleteExpense(id);
    if (error) { push(error.message, 'error'); return; }
    push('Bill removed', 'warning');
  }

  async function handleMarkPaid(expense, accountId) {
    const { error } = await markAsPaid(expense, accountId);
    if (error) { push(error.message, 'error'); return; }
    push(`${expense.name} marked as paid ✓`);
    setPayingItem(null);
  }

  if (loading) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <p style={{ color: '#475569' }}>Loading bills…</p>
    </div>
  );

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h1>Bills</h1>
        <button onClick={() => setShowForm(true)} style={{
          background: '#818cf8', color: '#fff', border: 'none', borderRadius: 12,
          width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
        }}>
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </div>
      <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
        Fixed recurring expenses — does not affect balance until paid
      </p>

      {/* Monthly total */}
      <div style={{ background: 'rgba(244,63,94,.08)', border: '1px solid rgba(244,63,94,.2)', borderRadius: 14, padding: '1rem 1.125rem', marginBottom: '1.25rem' }}>
        <p style={{ fontSize: '0.7rem', color: '#f43f5e', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
          Monthly Committed
        </p>
        <p style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f1f5f9' }}>{formatUSD(totalMonthly)}</p>
        <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.25rem' }}>{expenses.length} active bill{expenses.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Bills list */}
      {expenses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📋</div>
          <p style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: '0.375rem' }}>No bills yet</p>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.25rem' }}>Add your recurring expenses to track what's coming.</p>
          <button onClick={() => setShowForm(true)} style={{ background: '#818cf8', color: '#fff', border: 'none', borderRadius: 10, padding: '0.75rem 1.5rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            + Add Bill
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {expenses.map((e) => {
            const meta = getCategoryMeta(e.category);
            const freqLabel = e.frequency_type === 'monthly' ? 'Monthly'
              : e.frequency_type === 'weekly' ? 'Weekly'
              : `Every ${e.frequency_value} days`;

            return (
              <div key={e.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(244,63,94,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>
                    {meta.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.9375rem' }}>{e.name}</p>
                        <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{freqLabel} · {meta.label}</p>
                      </div>
                      <p style={{ fontWeight: 800, color: '#f43f5e', fontSize: '1.0625rem', flexShrink: 0 }}>{formatUSD(e.amount)}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <DueBadge dateStr={e.next_due_date} />
                      <span style={{ fontSize: '0.72rem', color: '#475569' }}>
                        {format(parseISO(e.next_due_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.875rem', paddingTop: '0.875rem', borderTop: '1px solid #334155' }}>
                  <button onClick={() => setPayingItem(e)} style={{
                    flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                    background: 'rgba(34,197,94,.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,.25)',
                    borderRadius: 8, padding: '0.5rem', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit'
                  }}>
                    <CheckCircle size={14} /> Mark as Paid
                  </button>
                  <button onClick={() => setEditItem(e)} style={{
                    flex: 1, background: 'rgba(129,140,248,.1)', color: '#818cf8', border: '1px solid rgba(129,140,248,.2)',
                    borderRadius: 8, padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(e.id, e.name)} style={{
                    flex: 1, background: 'rgba(244,63,94,.08)', color: '#f43f5e', border: '1px solid rgba(244,63,94,.15)',
                    borderRadius: 8, padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {(showForm || editItem) && (
        <FixedExpenseForm
          initial={editItem}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditItem(null); }}
        />
      )}
      {payingItem && (
        <MarkPaidModal
          expense={payingItem}
          accounts={accounts}
          onConfirm={handleMarkPaid}
          onClose={() => setPayingItem(null)}
        />
      )}
    </div>
  );
}