import { useState } from 'react';
import { EXPENSE_CATEGORIES } from '../../lib/constants';

const FREQ_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly',  label: 'Weekly'  },
  { value: 'custom',  label: 'Custom (every N days)' },
];

const EMPTY = {
  name: '', amount: '', category: 'bills',
  frequency_type: 'monthly', frequency_value: 1,
  next_due_date: new Date().toISOString().slice(0, 10),
};

const S = {
  label: { display: 'block', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.4rem' },
  inp:   { background: '#0f172a', border: '1px solid #334155', borderRadius: 10, color: '#f1f5f9', padding: '0.75rem 1rem', fontSize: '1rem', width: '100%', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
};

export function FixedExpenseForm({ initial, onSave, onClose }) {
  const [form, setForm]   = useState(initial
    ? { ...initial, amount: String(initial.amount), frequency_value: String(initial.frequency_value) }
    : EMPTY);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); setError(''); }

  async function handleSave() {
    if (!form.name.trim())       { setError('Name is required'); return; }
    if (!form.amount || Number(form.amount) <= 0) { setError('Enter a valid amount'); return; }
    if (!form.next_due_date)     { setError('Next due date is required'); return; }
    setSaving(true);
    const payload = {
      name:            form.name.trim(),
      amount:          parseFloat(Number(form.amount).toFixed(2)),
      category:        form.category,
      frequency_type:  form.frequency_type,
      frequency_value: Number(form.frequency_value) || 1,
      next_due_date:   form.next_due_date,
    };
    await onSave(payload);
    setSaving(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1e293b', borderRadius: '20px 20px 0 0', border: '1px solid #334155', width: '100%', maxWidth: 600, padding: '1.5rem 1.25rem 2rem', maxHeight: '90dvh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ color: '#f1f5f9' }}>{initial ? 'Edit Bill' : 'New Fixed Expense'}</h2>
          <button onClick={onClose} style={{ background: '#334155', border: 'none', borderRadius: 8, color: '#94a3b8', width: 30, height: 30, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={S.label}>Name</label>
            <input type="text" placeholder="e.g. Netflix, Rent, Internet" value={form.name}
              onChange={(e) => set('name', e.target.value)} style={S.inp} />
          </div>

          <div>
            <label style={S.label}>Amount ($)</label>
            <input type="number" inputMode="decimal" placeholder="0.00" value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
              style={{ ...S.inp, fontSize: '1.375rem', fontWeight: 800, textAlign: 'center', color: '#f43f5e' }} />
          </div>

          <div>
            <label style={S.label}>Category</label>
            <select value={form.category} onChange={(e) => set('category', e.target.value)} style={S.inp}>
              {EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
            </select>
          </div>

          <div>
            <label style={S.label}>Frequency</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {FREQ_OPTIONS.map((f) => (
                <button key={f.value} onClick={() => set('frequency_type', f.value)} style={{
                  flex: 1, minWidth: 80, padding: '0.5rem', borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${form.frequency_type === f.value ? '#818cf8' : '#334155'}`,
                  background: form.frequency_type === f.value ? 'rgba(129,140,248,.15)' : 'transparent',
                  color: form.frequency_type === f.value ? '#818cf8' : '#64748b',
                  fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit'
                }}>{f.label}</button>
              ))}
            </div>
          </div>

          {form.frequency_type === 'custom' && (
            <div>
              <label style={S.label}>Every how many days?</label>
              <input type="number" inputMode="numeric" min="1" value={form.frequency_value}
                onChange={(e) => set('frequency_value', e.target.value)} style={S.inp} />
            </div>
          )}

          <div>
            <label style={S.label}>Next Due Date</label>
            <input type="date" value={form.next_due_date}
              onChange={(e) => set('next_due_date', e.target.value)} style={S.inp} />
          </div>
        </div>

        {error && <p style={{ color: '#f43f5e', fontSize: '0.8rem', fontWeight: 600, marginTop: '0.75rem', textAlign: 'center' }}>{error}</p>}

        <button onClick={handleSave} disabled={saving} style={{
          background: '#818cf8', color: '#fff', border: 'none', borderRadius: 10,
          padding: '0.875rem', fontWeight: 700, fontSize: '0.9375rem',
          cursor: saving ? 'not-allowed' : 'pointer', width: '100%',
          fontFamily: 'inherit', opacity: saving ? 0.6 : 1, marginTop: '1.25rem'
        }}>
          {saving ? 'Saving…' : initial ? 'Update Bill' : 'Add Bill'}
        </button>
      </div>
    </div>
  );
}