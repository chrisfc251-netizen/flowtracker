import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { useVacations, calcVacationPace } from '../hooks/useVacations';
import { useSavingsGoals } from '../hooks/useSavingsGoals';
import { useToast } from '../components/ui/Toast';

function formatUSD(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
}

const EMPTY = { destination: '', trip_date: '', total_budget: '', flight_budget: '', hotel_budget: '', misc_budget: '', linked_goal_id: '' };

function VacationForm({ initial, goals, onSave, onClose }) {
  const [form, setForm]   = useState(initial || EMPTY);
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSave() {
    if (!form.destination.trim() || !form.trip_date || !form.total_budget) return;
    setSaving(true);
    await onSave({
      destination:    form.destination.trim(),
      trip_date:      form.trip_date,
      total_budget:   parseFloat(form.total_budget),
      flight_budget:  parseFloat(form.flight_budget || 0),
      hotel_budget:   parseFloat(form.hotel_budget  || 0),
      misc_budget:    parseFloat(form.misc_budget   || 0),
      linked_goal_id: form.linked_goal_id || null,
    });
    setSaving(false);
  }

  const S = {
    inp:   { background: '#0f172a', border: '1px solid #334155', borderRadius: 10, color: '#f1f5f9', padding: '0.75rem 1rem', fontSize: '1rem', width: '100%', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
    label: { display: 'block', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.4rem' },
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1e293b', borderRadius: '20px 20px 0 0', border: '1px solid #334155', width: '100%', maxWidth: 600, padding: '1.5rem 1.25rem 2rem', maxHeight: '90dvh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ color: '#f1f5f9' }}>{initial ? 'Edit Trip' : 'Plan a Trip ✈️'}</h2>
          <button onClick={onClose} style={{ background: '#334155', border: 'none', borderRadius: 8, color: '#94a3b8', width: 30, height: 30, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div><label style={S.label}>Destination</label>
            <input type="text" placeholder="e.g. Paris, Tokyo, Miami" value={form.destination} onChange={(e) => set('destination', e.target.value)} style={S.inp} /></div>

          <div><label style={S.label}>Trip Date</label>
            <input type="date" value={form.trip_date} onChange={(e) => set('trip_date', e.target.value)} style={S.inp} /></div>

          <div><label style={S.label}>Total Budget ($)</label>
            <input type="number" inputMode="decimal" placeholder="0.00" value={form.total_budget} onChange={(e) => set('total_budget', e.target.value)}
              style={{ ...S.inp, fontSize: '1.375rem', fontWeight: 800, textAlign: 'center', color: '#818cf8' }} /></div>

          <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Budget Breakdown (optional)</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
            {[['flight_budget','✈️ Flight'], ['hotel_budget','🏨 Hotel'], ['misc_budget','🎒 Misc']].map(([k, label]) => (
              <div key={k}>
                <label style={{ ...S.label, fontSize: '0.7rem' }}>{label}</label>
                <input type="number" inputMode="decimal" placeholder="0" value={form[k]} onChange={(e) => set(k, e.target.value)}
                  style={{ ...S.inp, fontSize: '0.9rem', padding: '0.625rem 0.75rem' }} />
              </div>
            ))}
          </div>

          <div><label style={S.label}>Link to Savings Goal (optional)</label>
            <select value={form.linked_goal_id} onChange={(e) => set('linked_goal_id', e.target.value)} style={S.inp}>
              <option value="">— No linked goal —</option>
              {goals.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving || !form.destination || !form.trip_date || !form.total_budget} style={{
          background: '#818cf8', color: '#fff', border: 'none', borderRadius: 10,
          padding: '0.875rem', fontWeight: 700, fontSize: '0.9375rem',
          cursor: saving ? 'not-allowed' : 'pointer', width: '100%',
          fontFamily: 'inherit', opacity: saving ? 0.6 : 1, marginTop: '1.25rem'
        }}>
          {saving ? 'Saving…' : initial ? 'Update Trip' : 'Create Trip'}
        </button>
      </div>
    </div>
  );
}

export default function VacationPlanner() {
  const { vacations, loading, addVacation, updateVacation, deleteVacation } = useVacations();
  const { goals }  = useSavingsGoals();
  const { push }   = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  async function handleSave(payload) {
    if (editItem) {
      const { error } = await updateVacation(editItem.id, payload);
      if (error) { push(error.message, 'error'); return; }
      push('Trip updated ✓'); setEditItem(null);
    } else {
      const { error } = await addVacation(payload);
      if (error) { push(error.message, 'error'); return; }
      push('Trip planned ✓ ✈️'); setShowForm(false);
    }
  }

  async function handleDelete(id, dest) {
    if (!window.confirm(`Delete trip to "${dest}"?`)) return;
    const { error } = await deleteVacation(id);
    if (error) { push(error.message, 'error'); return; }
    push('Trip removed', 'warning');
  }

  if (loading) return <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}><p style={{ color: '#475569' }}>Loading…</p></div>;

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h1>Vacation Planner ✈️</h1>
        <button onClick={() => setShowForm(true)} style={{ background: '#818cf8', color: '#fff', border: 'none', borderRadius: 12, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </div>
      <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>Plan trips and track how much you need to save</p>

      {vacations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✈️</div>
          <p style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: '0.375rem' }}>No trips planned yet</p>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.25rem' }}>Add a destination and the app will tell you how much to save per week.</p>
          <button onClick={() => setShowForm(true)} style={{ background: '#818cf8', color: '#fff', border: 'none', borderRadius: 10, padding: '0.75rem 1.5rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Plan a Trip
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {vacations.map((v) => {
            const linkedGoal = goals.find((g) => g.id === v.linked_goal_id);
            const pace       = calcVacationPace(v, linkedGoal);
            const pct        = pace.total > 0 ? Math.min((pace.saved / pace.total) * 100, 100) : 0;
            const color      = pct >= 100 ? '#22c55e' : pct > 60 ? '#818cf8' : '#f59e0b';

            return (
              <div key={v.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <p style={{ fontWeight: 800, color: '#f1f5f9', fontSize: '1rem' }}>✈️ {v.destination}</p>
                    <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                      {format(parseISO(v.trip_date), 'MMMM d, yyyy')} · {pace.daysLeft} days away
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.375rem' }}>
                    <button onClick={() => setEditItem(v)} style={{ background: 'rgba(129,140,248,.1)', color: '#818cf8', border: 'none', borderRadius: 8, padding: '6px 8px', cursor: 'pointer' }}>
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(v.id, v.destination)} style={{ background: 'rgba(244,63,94,.08)', color: '#f43f5e', border: 'none', borderRadius: 8, padding: '6px 8px', cursor: 'pointer' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ background: '#0f172a', borderRadius: 999, height: 8, overflow: 'hidden', marginBottom: '0.5rem' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width .4s' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.875rem' }}>
                  <span>{formatUSD(pace.saved)} saved of {formatUSD(pace.total)}</span>
                  <span style={{ color }}>{pct.toFixed(0)}%</span>
                </div>

                {/* Savings rate needed */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  {[
                    { label: 'Per Day',   value: formatUSD(pace.perDay)   },
                    { label: 'Per Week',  value: formatUSD(pace.perWeek)  },
                    { label: 'Per Month', value: formatUSD(pace.perMonth) },
                  ].map((item) => (
                    <div key={item.label} style={{ background: '#0f172a', borderRadius: 8, padding: '0.5rem', textAlign: 'center' }}>
                      <p style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</p>
                      <p style={{ fontWeight: 700, color: '#818cf8', fontSize: '0.875rem' }}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Budget breakdown */}
                {(v.flight_budget > 0 || v.hotel_budget > 0 || v.misc_budget > 0) && (
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #334155', display: 'flex', gap: '0.5rem' }}>
                    {v.flight_budget > 0 && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>✈️ {formatUSD(v.flight_budget)}</span>}
                    {v.hotel_budget  > 0 && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>🏨 {formatUSD(v.hotel_budget)}</span>}
                    {v.misc_budget   > 0 && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>🎒 {formatUSD(v.misc_budget)}</span>}
                  </div>
                )}

                {linkedGoal && (
                  <p style={{ fontSize: '0.75rem', color: '#818cf8', marginTop: '0.5rem', fontWeight: 600 }}>
                    🔗 Linked to: {linkedGoal.name}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {(showForm || editItem) && (
        <VacationForm
          initial={editItem}
          goals={goals}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditItem(null); }}
        />
      )}
    </div>
  );
}