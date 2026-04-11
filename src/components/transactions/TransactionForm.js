import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, NATURE_OPTIONS } from '../../lib/constants';
import { useToast } from '../ui/Toast';

const EMPTY = {
  type: 'expense', amount: '', category: 'food',
  date: new Date().toISOString().slice(0, 10),
  description: '', nature: 'variable'
};

export function TransactionForm({ initial, onSave, onClose }) {
  const { push } = useToast();
  const [form, setForm]     = useState(initial ? { ...initial, amount: String(initial.amount) } : EMPTY);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // reset category when type changes
    setForm((f) => ({
      ...f,
      category: f.type === 'income' ? 'salary' : 'food'
    }));
    // eslint-disable-next-line
  }, [form.type]);

  const cats = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: null }));
  }

  function validate() {
    const e = {};
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0)
      e.amount = 'Enter a valid amount greater than 0';
    if (!form.date) e.date = 'Date is required';
    if (!form.category) e.category = 'Category is required';
    if (!form.type) e.type = 'Type is required';
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      await onSave({
        type: form.type,
        amount: parseFloat(Number(form.amount).toFixed(2)),
        category: form.category,
        date: form.date,
        description: form.description.trim(),
        nature: form.nature
      });
      push(initial ? 'Transaction updated' : 'Transaction saved');
      onClose();
    } catch (err) {
      push('Failed to save: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#1e293b', borderRadius: '20px 20px 0 0',
        border: '1px solid #334155', borderBottom: 'none',
        width: '100%', maxWidth: 600, padding: '1.5rem 1.25rem',
        paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
        maxHeight: '92dvh', overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ color: '#f1f5f9' }}>{initial ? 'Edit Transaction' : 'New Transaction'}</h2>
          <button onClick={onClose} className="btn-icon"><X size={20} /></button>
        </div>

        {/* Type toggle */}
        <div style={{ display: 'flex', background: '#0f172a', borderRadius: 10, padding: 4, marginBottom: '1.25rem' }}>
          {['expense','income'].map((t) => (
            <button key={t} onClick={() => set('type', t)} style={{
              flex: 1, padding: '0.625rem', borderRadius: 8, fontWeight: 600,
              fontSize: '0.9375rem', border: 'none', transition: 'all .2s',
              background: form.type === t
                ? (t === 'income' ? 'rgba(34,197,94,.2)' : 'rgba(244,63,94,.2)')
                : 'transparent',
              color: form.type === t
                ? (t === 'income' ? '#22c55e' : '#f43f5e')
                : '#64748b'
            }}>
              {t === 'income' ? '⬆ Income' : '⬇ Expense'}
            </button>
          ))}
        </div>

        {/* Amount */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 500 }}>Amount (USD)</label>
          <input
            type="number" inputMode="decimal" placeholder="0.00" value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
            style={{ fontSize: '1.375rem', fontWeight: 700, textAlign: 'center',
              color: form.type === 'income' ? '#22c55e' : '#f43f5e',
              borderColor: errors.amount ? '#f43f5e' : undefined }}
          />
          {errors.amount && <p style={{ color: '#f43f5e', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.amount}</p>}
        </div>

        {/* Date */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 500 }}>Date</label>
          <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)}
            style={{ borderColor: errors.date ? '#f43f5e' : undefined }} />
          {errors.date && <p style={{ color: '#f43f5e', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.date}</p>}
        </div>

        {/* Category */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 500 }}>Category</label>
          <select value={form.category} onChange={(e) => set('category', e.target.value)}>
            {cats.map((c) => (
              <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
            ))}
          </select>
        </div>

        {/* Nature */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 500 }}>Nature</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {NATURE_OPTIONS.map((n) => (
              <button key={n.value} onClick={() => set('nature', n.value)} style={{
                flex: 1, padding: '0.625rem', borderRadius: 8, fontWeight: 600,
                fontSize: '0.875rem', border: '1px solid',
                borderColor: form.nature === n.value ? '#818cf8' : '#334155',
                background: form.nature === n.value ? 'rgba(129,140,248,.15)' : 'transparent',
                color: form.nature === n.value ? '#818cf8' : '#64748b'
              }}>
                {n.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 500 }}>Description (optional)</label>
          <input type="text" placeholder="Add a note…" value={form.description}
            onChange={(e) => set('description', e.target.value)} />
        </div>

        <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving…' : (initial ? 'Update Transaction' : 'Save Transaction')}
        </button>
      </div>
    </div>
  );
}
