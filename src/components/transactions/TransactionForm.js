import { useEffect, useState } from 'react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, NATURE_OPTIONS } from '../../lib/constants';
import { useToast } from '../ui/Toast';

const EMPTY = {
  type: 'expense', amount: '', category: 'food',
  date: new Date().toISOString().slice(0, 10),
  description: '', nature: 'variable',
  savings_allocation: '', account_id: '', savings_account_id: ''
};

const S = {
  label: {
    display: 'block', fontSize: '0.75rem', color: 'var(--ink-3)',
    fontWeight: 700, marginBottom: '0.375rem',
    fontFamily: 'var(--font-sans)', letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  inp: {
    background: 'var(--bg)', border: '1px solid var(--border-strong)',
    borderRadius: 10, color: 'var(--ink-1)', padding: '0.75rem 1rem',
    fontSize: '1rem', width: '100%', outline: 'none',
    fontFamily: 'var(--font-sans)', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  },
};

export function TransactionForm({ initial, onSave, onClose, availableBalance, budgets = [], accounts = [] }) {
  const { push }        = useToast();
  const [form, setForm] = useState(initial
    ? { ...initial, amount: String(initial.amount), savings_allocation: String(initial.savings_allocation || ''), account_id: initial.account_id || '', savings_account_id: initial.savings_account_id || '' }
    : { ...EMPTY, account_id: accounts[0]?.id || '' });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm((f) => ({
      ...f,
      category: f.type === 'income' ? 'salary' : 'food',
      savings_allocation: f.type === 'income' ? f.savings_allocation : '',
      savings_account_id: f.type === 'income' ? f.savings_account_id : '',
    }));
  }, [form.type]);

  const cats = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: null }));
  }

  function validate() {
    const e   = {};
    const amt = Number(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) e.amount   = 'Enter a valid amount greater than 0';
    if (!form.date)                              e.date     = 'Date is required';
    if (!form.category)                          e.category = 'Category is required';
    if (!form.account_id)                        e.account  = 'Select an account';
    if (form.type === 'income' && form.savings_allocation !== '') {
      const sav = Number(form.savings_allocation);
      if (isNaN(sav) || sav < 0) e.savings_allocation = 'Savings must be 0 or more';
      if (sav > amt)              e.savings_allocation = 'Savings cannot exceed income';
      if (sav > 0 && !form.savings_account_id) e.savings_account_id = 'Select where to save this amount';
    }
    return e;
  }

  const amt        = Number(form.amount) || 0;
  const budget     = budgets.find((b) => b.category === form.category);
  const willExcBal = form.type === 'expense' && amt > availableBalance && availableBalance != null;
  const willExcBud = form.type === 'expense' && budget && amt > (budget.amount_limit - (budget.spent || 0));

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      await onSave({
        type:               form.type,
        amount:             parseFloat(Number(form.amount).toFixed(2)),
        category:           form.category,
        date:               form.date,
        description:        form.description.trim(),
        nature:             form.nature,
        account_id:         form.account_id || null,
        savings_allocation: form.type === 'income' && form.savings_allocation !== ''
                              ? parseFloat(Number(form.savings_allocation).toFixed(2)) : 0,
        savings_account_id: form.type === 'income' && form.savings_allocation !== '' && form.savings_account_id
                              ? form.savings_account_id : null,
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
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(26,26,24,0.45)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        overflowY: 'auto',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 20,
        border: '1px solid var(--border)',
        width: '100%',
        maxWidth: 600,
        margin: '1rem',
        marginBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
        padding: '1.5rem 1.25rem',
        boxShadow: 'var(--shadow-float)',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{
            fontFamily: 'var(--font-serif)', fontSize: '1.375rem',
            fontWeight: 700, color: 'var(--ink-1)', letterSpacing: '-0.01em'
          }}>
            {initial ? 'Edit Transaction' : 'New Transaction'}
          </h2>
          <button onClick={onClose} style={{
            background: 'var(--bg-inset)', border: 'none', borderRadius: 8,
            color: 'var(--ink-3)', width: 30, height: 30, cursor: 'pointer', fontSize: 16
          }}>✕</button>
        </div>

        {/* Type toggle */}
        <div style={{
          display: 'flex', background: 'var(--bg)',
          borderRadius: 10, padding: 4, marginBottom: '1.25rem',
          border: '1px solid var(--border)',
        }}>
          {['expense', 'income'].map((t) => (
            <button key={t} onClick={() => set('type', t)} style={{
              flex: 1, padding: '0.625rem', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: form.type === t
                ? (t === 'income' ? 'rgba(26,107,58,0.12)' : 'rgba(192,57,43,0.12)')
                : 'transparent',
              color: form.type === t
                ? (t === 'income' ? 'var(--accent-green)' : 'var(--accent-red)')
                : 'var(--ink-3)',
              fontWeight: 700, fontSize: '0.9375rem', fontFamily: 'var(--font-sans)',
              transition: 'all 0.15s',
            }}>
              {t === 'income' ? '↑ Income' : '↓ Expense'}
            </button>
          ))}
        </div>

        {/* Warning */}
        {(willExcBal || willExcBud) && (
          <div style={{
            background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.25)',
            borderRadius: 8, padding: '0.625rem 0.875rem', marginBottom: '1rem'
          }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--accent-red)', fontWeight: 600, margin: 0, fontFamily: 'var(--font-sans)' }}>
              {willExcBal
                ? `Exceeds your available balance (${new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(availableBalance)}).`
                : `Exceeds your ${form.category} budget by $${(amt - (budget.amount_limit - (budget.spent||0))).toFixed(2)}.`}
            </p>
          </div>
        )}

        {/* Amount */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={S.label}>Amount (USD)</label>
          <input type="number" inputMode="decimal" placeholder="0.00" value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
            style={{
              ...S.inp, fontSize: '1.75rem', fontWeight: 800, textAlign: 'center',
              fontFamily: 'var(--font-serif)',
              color: form.type === 'income' ? 'var(--accent-green)' : 'var(--accent-red)',
              borderColor: errors.amount ? 'var(--accent-red)' : 'var(--border-strong)',
            }} />
          {errors.amount && <p style={{ color: 'var(--accent-red)', fontSize: '0.75rem', marginTop: '0.25rem', fontFamily: 'var(--font-sans)' }}>{errors.amount}</p>}
        </div>

        {/* Account selector */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={S.label}>{form.type === 'income' ? 'Deposit to Account' : 'Pay from Account'}</label>
          {accounts.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--accent-amber)', fontFamily: 'var(--font-sans)' }}>No accounts yet — go to Accounts to add one.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {accounts.map((a) => (
                <button key={a.id} onClick={() => set('account_id', a.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
                  borderRadius: 10,
                  border: `1px solid ${form.account_id === a.id ? 'var(--border-strong)' : 'var(--border)'}`,
                  background: form.account_id === a.id ? 'var(--bg-inset)' : 'var(--bg)',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)',
                  transition: 'all 0.15s',
                }}>
                  <span style={{ fontSize: '1.2rem' }}>{a.icon}</span>
                  <span style={{ fontWeight: 600, color: 'var(--ink-1)', fontSize: '0.9rem', fontFamily: 'var(--font-sans)' }}>{a.name}</span>
                  {form.account_id === a.id && <span style={{ marginLeft: 'auto', color: 'var(--accent-green)', fontSize: '0.9rem', fontWeight: 700 }}>✓</span>}
                </button>
              ))}
            </div>
          )}
          {errors.account && <p style={{ color: 'var(--accent-red)', fontSize: '0.75rem', marginTop: '0.25rem', fontFamily: 'var(--font-sans)' }}>{errors.account}</p>}
        </div>

        {/* Savings allocation — income only */}
        {form.type === 'income' && (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <label style={S.label}>Allocate to Savings ($) <span style={{ color: 'var(--ink-4)', fontWeight: 400, textTransform: 'none' }}>— optional</span></label>
              <input type="number" inputMode="decimal" placeholder="0.00"
                value={form.savings_allocation} onChange={(e) => set('savings_allocation', e.target.value)}
                style={{ ...S.inp, borderColor: errors.savings_allocation ? 'var(--accent-red)' : 'var(--border-strong)' }} />
              {form.savings_allocation && !errors.savings_allocation && Number(form.amount) > 0 && (
                <p style={{ fontSize: '0.75rem', color: 'var(--ink-3)', marginTop: '0.25rem', fontFamily: 'var(--font-sans)' }}>
                  ${(Number(form.amount) - Number(form.savings_allocation || 0)).toFixed(2)} will be available to spend
                </p>
              )}
              {errors.savings_allocation && <p style={{ color: 'var(--accent-red)', fontSize: '0.75rem', marginTop: '0.25rem', fontFamily: 'var(--font-sans)' }}>{errors.savings_allocation}</p>}
            </div>

            {form.savings_allocation && Number(form.savings_allocation) > 0 && accounts.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={S.label}>Save to Account</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {accounts.map((a) => (
                    <button key={a.id} onClick={() => set('savings_account_id', a.id)} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.75rem',
                      borderRadius: 10,
                      border: `1px solid ${form.savings_account_id === a.id ? 'var(--border-strong)' : 'var(--border)'}`,
                      background: form.savings_account_id === a.id ? 'var(--bg-inset)' : 'var(--bg)',
                      cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)',
                    }}>
                      <span style={{ fontSize: '1.1rem' }}>{a.icon}</span>
                      <span style={{ fontWeight: 600, color: 'var(--ink-1)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)' }}>{a.name}</span>
                      {form.savings_account_id === a.id && <span style={{ marginLeft: 'auto', color: 'var(--ink-2)', fontWeight: 700, fontSize: '0.8rem' }}>🔒</span>}
                    </button>
                  ))}
                </div>
                {errors.savings_account_id && <p style={{ color: 'var(--accent-red)', fontSize: '0.75rem', marginTop: '0.25rem', fontFamily: 'var(--font-sans)' }}>{errors.savings_account_id}</p>}
              </div>
            )}
          </>
        )}

        {/* Date */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={S.label}>Date</label>
          <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)}
            style={{ ...S.inp, borderColor: errors.date ? 'var(--accent-red)' : 'var(--border-strong)' }} />
        </div>

        {/* Category */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={S.label}>Category</label>
          <select value={form.category} onChange={(e) => set('category', e.target.value)} style={S.inp}>
            {cats.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
          </select>
        </div>

        {/* Nature */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={S.label}>Nature</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {NATURE_OPTIONS.map((n) => (
              <button key={n.value} onClick={() => set('nature', n.value)} style={{
                flex: 1, padding: '0.625rem', borderRadius: 8,
                border: `1px solid ${form.nature === n.value ? 'var(--border-strong)' : 'var(--border)'}`,
                background: form.nature === n.value ? 'var(--bg-inset)' : 'transparent',
                color: form.nature === n.value ? 'var(--ink-1)' : 'var(--ink-3)',
                fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
              }}>{n.label}</button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={S.label}>Description (optional)</label>
          <input type="text" placeholder="Add a note…" value={form.description}
            onChange={(e) => set('description', e.target.value)} style={S.inp} />
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={saving} style={{
          background: 'var(--ink-1)', color: 'var(--bg)', border: 'none', borderRadius: 10,
          padding: '0.875rem', fontWeight: 700, fontSize: '0.9375rem',
          cursor: saving ? 'not-allowed' : 'pointer', width: '100%',
          fontFamily: 'var(--font-sans)', opacity: saving ? 0.6 : 1,
          letterSpacing: '-0.01em',
        }}>
          {saving ? 'Saving…' : initial ? 'Update Transaction' : 'Save Transaction'}
        </button>
      </div>
    </div>
  );
}
