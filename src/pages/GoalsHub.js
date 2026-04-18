import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { differenceInDays, format, parseISO } from 'date-fns';
import { useSavingsGoals } from '../hooks/useSavingsGoals';
import { useVacations, calcVacationPace } from '../hooks/useVacations';
import { useToast } from '../components/ui/Toast';
import { EmptyState } from '../components/ui/EmptyState';

function fmt(n) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0); }

function estimatePace(goal) {
  const current   = Number(goal.current_amount || 0);
  const target    = Number(goal.target_amount  || 0);
  const remaining = target - current;
  if (remaining <= 0) return null;
  const created   = goal.created_at ? new Date(goal.created_at) : new Date();
  const daysSince = Math.max(differenceInDays(new Date(), created), 1);
  const avgPerDay = current / daysSince;
  if (avgPerDay <= 0) return { hasData: false };
  const daysLeft = Math.ceil(remaining / avgPerDay);
  return { hasData: true, daysLeft, avgPerDay, label: daysLeft > 365 ? `~${Math.round(daysLeft/365)}yr` : daysLeft > 30 ? `~${Math.round(daysLeft/30)}mo` : `${daysLeft}d` };
}

// ── Savings Goals sub-tab ─────────────────────────────────────────────────
function SavingsTab() {
  const { goals, loading, addGoal, addMoneyToGoal, subtractMoneyFromGoal, deleteGoal } = useSavingsGoals();
  const { push } = useToast();

  const [showForm,         setShowForm]         = useState(false);
  const [goalName,         setGoalName]         = useState('');
  const [goalTarget,       setGoalTarget]       = useState('');
  const [goalCurrent,      setGoalCurrent]      = useState('');
  const [goalDate,         setGoalDate]         = useState('');
  const [activeGoalId,     setActiveGoalId]     = useState(null);
  const [goalAction,       setGoalAction]       = useState('add');
  const [contribution,     setContribution]     = useState('');
  const [savingId,         setSavingId]         = useState(null);
  const [editDeadlineId,   setEditDeadlineId]   = useState(null);
  const [newDeadline,      setNewDeadline]      = useState('');

  async function handleAdd(e) {
    e.preventDefault();
    if (!goalName.trim() || !goalTarget) return;
    const { error } = await addGoal({ name: goalName.trim(), target_amount: goalTarget, current_amount: goalCurrent || 0, target_date: goalDate || null });
    if (error) { push(error.message, 'error'); return; }
    push('Goal added ✓');
    setGoalName(''); setGoalTarget(''); setGoalCurrent(''); setGoalDate('');
    setShowForm(false);
  }

  async function handleContribution(goalId) {
    if (!contribution || Number(contribution) <= 0) return;
    setSavingId(goalId);
    const fn = goalAction === 'add' ? addMoneyToGoal : subtractMoneyFromGoal;
    const { error } = await fn(goalId, contribution);
    setSavingId(null);
    if (error) { push(error.message, 'error'); return; }
    push(goalAction === 'add' ? 'Added ✓' : 'Corrected ✓');
    setContribution(''); setActiveGoalId(null);
  }

  async function handleUpdateDeadline(goalId) {
    if (!newDeadline) return;
    const { supabase } = await import('../lib/supabase');
    await supabase.from('savings_goals').update({ target_date: newDeadline }).eq('id', goalId);
    push('Deadline updated ✓');
    setEditDeadlineId(null); setNewDeadline('');
    window.location.reload();
  }

  if (loading) return <p style={{ color: '#475569', padding: '2rem', textAlign: 'center' }}>Loading…</p>;

  return (
    <div>
      {showForm && (
        <form onSubmit={handleAdd} className="card" style={{ marginBottom: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <input type="text"   placeholder="Goal name"           value={goalName}   onChange={(e) => setGoalName(e.target.value)} />
          <input type="number" placeholder="Target ($)"          value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} />
          <input type="number" placeholder="Already saved ($)"   value={goalCurrent} onChange={(e) => setGoalCurrent(e.target.value)} />
          <input type="date"                                      value={goalDate}   onChange={(e) => setGoalDate(e.target.value)} />
          <button type="submit" style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, padding: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Save Goal</button>
        </form>
      )}

      {goals.length === 0 ? (
        <EmptyState icon="🎯" title="No goals yet" subtitle="Start saving toward something meaningful" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {goals.map((goal) => {
            const current    = Number(goal.current_amount || 0);
            const target     = Number(goal.target_amount  || 0);
            const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
            const completed  = percentage >= 100;
            const color      = completed ? '#22c55e' : percentage > 75 ? '#f59e0b' : '#818cf8';
            const pace       = estimatePace(goal);

            return (
              <div key={goal.id} className="card" style={{ borderColor: completed ? 'rgba(34,197,94,.3)' : undefined }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{goal.name}</strong>
                    {completed && <span style={{ marginLeft: '0.5rem', fontSize: '0.72rem', color: '#22c55e', fontWeight: 700 }}>✓ Done!</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: '#cbd5e1', fontSize: '0.82rem' }}>{fmt(current)} / {fmt(target)}</span>
                    <button onClick={async () => { if (!window.confirm(`Delete "${goal.name}"?`)) return; await deleteGoal(goal.id); push('Deleted', 'warning'); }} style={{ background: 'rgba(244,63,94,.1)', border: 'none', borderRadius: 6, padding: '3px 6px', cursor: 'pointer', color: '#f43f5e', display: 'flex' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div style={{ background: '#0f172a', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                  <div style={{ width: `${percentage}%`, height: '100%', background: color, borderRadius: 999, transition: 'width .4s' }} />
                </div>

                <div style={{ marginTop: '0.375rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b' }}>
                  <span>{percentage.toFixed(0)}% · {fmt(Math.max(target - current, 0))} left</span>
                  <span onClick={() => { setEditDeadlineId(goal.id); setNewDeadline(goal.target_date || ''); }} style={{ cursor: 'pointer', borderBottom: '1px dashed #334155' }}>
                    {editDeadlineId === goal.id ? (
                      <span style={{ display: 'flex', gap: '0.375rem' }} onClick={(e) => e.stopPropagation()}>
                        <input type="date" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} style={{ fontSize: '0.72rem', padding: '1px 5px', background: '#0f172a', border: '1px solid #334155', borderRadius: 5, color: '#f1f5f9', fontFamily: 'inherit' }} />
                        <button onClick={() => handleUpdateDeadline(goal.id)} style={{ fontSize: '0.68rem', background: '#22c55e', border: 'none', borderRadius: 4, padding: '1px 7px', color: '#fff', cursor: 'pointer' }}>✓</button>
                        <button onClick={() => setEditDeadlineId(null)} style={{ fontSize: '0.68rem', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>✕</button>
                      </span>
                    ) : goal.target_date ? 'By ' + goal.target_date : 'Set deadline ✏️'}
                  </span>
                </div>

                {!completed && pace && (
                  <div style={{ marginTop: '0.5rem', background: 'rgba(129,140,248,.07)', border: '1px solid rgba(129,140,248,.12)', borderRadius: 8, padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}>
                    {!pace.hasData ? <span style={{ color: '#475569' }}>Add money to get pace estimate</span>
                      : <span style={{ color: '#818cf8' }}>🕐 ${pace.avgPerDay.toFixed(2)}/day → <strong>{pace.label}</strong> to goal</span>}
                  </div>
                )}

                {!completed && (
                  <div style={{ marginTop: '0.625rem' }}>
                    {activeGoalId === goal.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <div style={{ display: 'flex', background: '#0f172a', borderRadius: 8, padding: 3, gap: 3 }}>
                          {[{ val: 'add', label: '+ Add', color: '#22c55e' }, { val: 'subtract', label: '− Correct', color: '#f43f5e' }].map((opt) => (
                            <button key={opt.val} onClick={() => setGoalAction(opt.val)} style={{ flex: 1, padding: '0.35rem', borderRadius: 6, border: 'none', cursor: 'pointer', background: goalAction === opt.val ? (opt.val === 'add' ? 'rgba(34,197,94,.2)' : 'rgba(244,63,94,.2)') : 'transparent', color: goalAction === opt.val ? opt.color : '#475569', fontWeight: 700, fontSize: '0.78rem', fontFamily: 'inherit' }}>{opt.label}</button>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input type="number" inputMode="decimal" placeholder="Amount" value={contribution} onChange={(e) => setContribution(e.target.value)} style={{ flex: 1 }} autoFocus />
                          <button onClick={() => handleContribution(goal.id)} disabled={savingId === goal.id} style={{ background: goalAction === 'add' ? '#22c55e' : '#f43f5e', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 0.875rem', fontWeight: 700, cursor: 'pointer', opacity: savingId === goal.id ? 0.6 : 1 }}>
                            {savingId === goal.id ? '…' : goalAction === 'add' ? 'Add' : 'Remove'}
                          </button>
                          <button onClick={() => { setActiveGoalId(null); setContribution(''); }} style={{ background: 'transparent', color: '#64748b', border: '1px solid #334155', borderRadius: 8, padding: '0.5rem 0.75rem', cursor: 'pointer' }}>✕</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setActiveGoalId(goal.id); setGoalAction('add'); }} style={{ background: 'rgba(129,140,248,.12)', color: '#818cf8', border: '1px solid rgba(129,140,248,.25)', borderRadius: 8, padding: '0.5rem', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', width: '100%' }}>+ Add / Adjust Money</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Vacations sub-tab ─────────────────────────────────────────────────────
function VacationsTab() {
  const { vacations, loading, addVacation, updateVacation, deleteVacation } = useVacations();
  const { goals } = useSavingsGoals();
  const { push }  = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm]         = useState({ destination: '', trip_date: '', total_budget: '', flight_budget: '', hotel_budget: '', misc_budget: '', linked_goal_id: '' });

  function setF(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSave() {
    if (!form.destination || !form.trip_date || !form.total_budget) return;
    const payload = { destination: form.destination.trim(), trip_date: form.trip_date, total_budget: parseFloat(form.total_budget), flight_budget: parseFloat(form.flight_budget || 0), hotel_budget: parseFloat(form.hotel_budget || 0), misc_budget: parseFloat(form.misc_budget || 0), linked_goal_id: form.linked_goal_id || null };
    if (editItem) { await updateVacation(editItem.id, payload); push('Trip updated ✓'); setEditItem(null); }
    else          { await addVacation(payload); push('Trip planned ✓ ✈️'); setShowForm(false); }
    setForm({ destination: '', trip_date: '', total_budget: '', flight_budget: '', hotel_budget: '', misc_budget: '', linked_goal_id: '' });
  }

  const S = { inp: { background: '#0f172a', border: '1px solid #334155', borderRadius: 10, color: '#f1f5f9', padding: '0.625rem 0.875rem', fontSize: '0.9rem', width: '100%', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' } };

  return (
    <div>
      {(showForm || editItem) && (
        <div className="card" style={{ marginBottom: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input type="text"   placeholder="Destination (e.g. Tokyo)"  value={form.destination}   onChange={(e) => setF('destination', e.target.value)}   style={S.inp} />
          <input type="date"                                            value={form.trip_date}     onChange={(e) => setF('trip_date', e.target.value)}     style={S.inp} />
          <input type="number" placeholder="Total budget ($)"          value={form.total_budget}  onChange={(e) => setF('total_budget', e.target.value)}  style={{ ...S.inp, fontSize: '1.25rem', fontWeight: 800, color: '#818cf8' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
            {[['flight_budget','✈️'],['hotel_budget','🏨'],['misc_budget','🎒']].map(([k,ic]) => (
              <input key={k} type="number" placeholder={`${ic} $0`} value={form[k]} onChange={(e) => setF(k, e.target.value)} style={{ ...S.inp, fontSize: '0.85rem', padding: '0.5rem' }} />
            ))}
          </div>
          <select value={form.linked_goal_id} onChange={(e) => setF('linked_goal_id', e.target.value)} style={S.inp}>
            <option value="">— No linked goal —</option>
            {goals.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handleSave} style={{ flex: 1, background: '#818cf8', color: '#fff', border: 'none', borderRadius: 10, padding: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
              {editItem ? 'Update Trip' : 'Create Trip'}
            </button>
            <button onClick={() => { setShowForm(false); setEditItem(null); }} style={{ flex: 1, background: 'transparent', color: '#64748b', border: '1px solid #334155', borderRadius: 10, padding: '0.75rem', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {vacations.length === 0 ? (
        <EmptyState icon="✈️" title="No trips planned" subtitle="Add a destination and start saving toward it" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {vacations.map((v) => {
            const linkedGoal = goals.find((g) => g.id === v.linked_goal_id);
            const pace       = calcVacationPace(v, linkedGoal);
            const pct        = pace.total > 0 ? Math.min((pace.saved / pace.total) * 100, 100) : 0;
            const color      = pct >= 100 ? '#22c55e' : pct > 60 ? '#818cf8' : '#f59e0b';
            return (
              <div key={v.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.625rem' }}>
                  <div>
                    <p style={{ fontWeight: 800, color: '#f1f5f9', fontSize: '0.975rem' }}>✈️ {v.destination}</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                      {format(parseISO(v.trip_date), 'MMMM d, yyyy')} · {pace.daysLeft} days away
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.375rem' }}>
                    <button onClick={() => { setEditItem(v); setForm({ destination: v.destination, trip_date: v.trip_date, total_budget: String(v.total_budget), flight_budget: String(v.flight_budget || ''), hotel_budget: String(v.hotel_budget || ''), misc_budget: String(v.misc_budget || ''), linked_goal_id: v.linked_goal_id || '' }); }} style={{ background: 'rgba(129,140,248,.08)', color: '#818cf8', border: 'none', borderRadius: 8, padding: '5px 8px', cursor: 'pointer' }}>✏️</button>
                    <button onClick={async () => { if (!window.confirm(`Delete trip to "${v.destination}"?`)) return; await deleteVacation(v.id); push('Removed', 'warning'); }} style={{ background: 'rgba(244,63,94,.06)', color: '#f43f5e', border: 'none', borderRadius: 8, padding: '5px 8px', cursor: 'pointer' }}><Trash2 size={13} /></button>
                  </div>
                </div>
                <div style={{ background: '#0f172a', borderRadius: 999, height: 7, overflow: 'hidden', marginBottom: '0.375rem' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width .4s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', marginBottom: '0.75rem' }}>
                  <span>{fmt(pace.saved)} saved of {fmt(pace.total)}</span>
                  <span style={{ color }}>{pct.toFixed(0)}%</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.375rem' }}>
                  {[['Per Day', pace.perDay], ['Per Week', pace.perWeek], ['Per Month', pace.perMonth]].map(([l, v2]) => (
                    <div key={l} style={{ background: '#0f172a', borderRadius: 8, padding: '0.4rem', textAlign: 'center' }}>
                      <p style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.15rem' }}>{l}</p>
                      <p style={{ fontWeight: 700, color: '#818cf8', fontSize: '0.82rem' }}>{fmt(v2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main GoalsHub page ────────────────────────────────────────────────────
const TABS = ['Savings', 'Vacations'];

export default function GoalsHub() {
  const [active, setActive] = useState('Savings');
  const [showAddGoal,     setShowAddGoal]     = useState(false);
  const [showAddVacation, setShowAddVacation] = useState(false);

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1>Goals</h1>
        <button onClick={() => active === 'Savings' ? setShowAddGoal((p) => !p) : setShowAddVacation((p) => !p)} style={{
          background: '#818cf8', color: '#fff', border: 'none', borderRadius: 12,
          width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
        }}>
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </div>

      <div style={{ display: 'flex', background: '#1e293b', borderRadius: 10, padding: 3, marginBottom: '1.25rem' }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setActive(t)} style={{
            flex: 1, padding: '0.55rem', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: active === t ? '#334155' : 'transparent',
            color: active === t ? '#f1f5f9' : '#64748b',
            fontWeight: 600, fontSize: '0.82rem', fontFamily: 'inherit'
          }}>{t === 'Savings' ? '🎯 Savings' : '✈️ Vacations'}</button>
        ))}
      </div>

      {active === 'Savings'   && <SavingsTab   externalShowForm={showAddGoal}     onFormClose={() => setShowAddGoal(false)} />}
      {active === 'Vacations' && <VacationsTab externalShowForm={showAddVacation} onFormClose={() => setShowAddVacation(false)} />}
    </div>
  );
}