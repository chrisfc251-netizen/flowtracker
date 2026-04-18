/**
 * Goals.js — v3
 * Fix 1: All hooks imported from 'react' (not date-fns) — inputs now editable
 * Fix 2: Monthly context uses availableBalance, not income total
 */
import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Plane, ChevronDown, ChevronUp } from 'lucide-react';
import { subDays, differenceInDays } from 'date-fns';

import { useSavingsGoals }  from '../hooks/useSavingsGoals';
import { useSubscription }  from '../hooks/useSubscription';
import { useToast }         from '../components/ui/Toast';
import { useConfirm }       from '../components/ui/ConfirmModal';
import { EmptyState, PageLoader } from '../components/ui/EmptyState';
import { ProUpgradePrompt } from '../components/ui/ProUpgradePrompt';
import { FREE_LIMITS }      from '../hooks/useSubscription';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
}

// ── Full pace calculation ─────────────────────────────────────────────────
function computePace(goal) {
  const current   = Number(goal.current_amount || 0);
  const target    = Number(goal.target_amount  || 0);
  const remaining = target - current;
  if (remaining <= 0) return null;

  const created   = goal.created_at ? new Date(goal.created_at) : subDays(new Date(), 30);
  const daysSince = Math.max(differenceInDays(new Date(), created), 1);
  const avgPerDay = current / daysSince;

  if (avgPerDay <= 0) {
    if (goal.target_date) {
      const daysLeft = Math.max(differenceInDays(new Date(goal.target_date), new Date()), 1);
      const needed   = remaining / daysLeft;
      return {
        hasData: false, hasDeadline: true,
        neededPerDay: needed, neededPerWeek: needed * 7, neededPerMonth: needed * 30,
        daysLeft,
      };
    }
    return { hasData: false, hasDeadline: false };
  }

  const daysLeft = Math.ceil(remaining / avgPerDay);
  return {
    hasData: true,
    avgPerDay, avgPerWeek: avgPerDay * 7, avgPerMonth: avgPerDay * 30,
    daysLeft, remaining,
  };
}

function paceLabel(d) {
  if (d > 365) return `~${Math.round(d / 365)}yr`;
  if (d > 30)  return `~${Math.round(d / 30)}mo`;
  if (d > 7)   return `~${Math.round(d / 7)}wk`;
  return `${d}d`;
}

// ── Pace display block ────────────────────────────────────────────────────
function PaceBlock({ pace }) {
  if (!pace) return null;

  if (!pace.hasData && pace.hasDeadline) {
    return (
      <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: 10, padding: '0.625rem 0.875rem', marginTop: '0.625rem' }}>
        <p style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700, marginBottom: '0.375rem' }}>
          To reach your goal by deadline:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.375rem' }}>
          {[
            { label: 'Per day',   value: fmt(pace.neededPerDay) },
            { label: 'Per week',  value: fmt(pace.neededPerWeek) },
            { label: 'Per month', value: fmt(pace.neededPerMonth) },
          ].map(item => (
            <div key={item.label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 800, color: '#f59e0b' }}>{item.value}</p>
              <p style={{ fontSize: '0.62rem', color: '#475569' }}>{item.label}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '0.68rem', color: '#475569', marginTop: '0.375rem' }}>
          {paceLabel(pace.daysLeft)} until deadline — start contributing to track your pace
        </p>
      </div>
    );
  }

  if (!pace.hasData) return (
    <p style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.5rem', fontStyle: 'italic' }}>
      Add your first contribution to see pace estimates
    </p>
  );

  return (
    <div style={{ background: 'rgba(129,140,248,0.07)', border: '1px solid rgba(129,140,248,0.15)', borderRadius: 10, padding: '0.625rem 0.875rem', marginTop: '0.625rem' }}>
      <p style={{ fontSize: '0.72rem', color: '#818cf8', fontWeight: 700, marginBottom: '0.375rem' }}>
        At your current pace:
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.375rem', marginBottom: '0.375rem' }}>
        {[
          { label: 'Per day',   value: fmt(pace.avgPerDay) },
          { label: 'Per week',  value: fmt(pace.avgPerWeek) },
          { label: 'Per month', value: fmt(pace.avgPerMonth) },
        ].map(item => (
          <div key={item.label} style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 800, color: '#818cf8' }}>{item.value}</p>
            <p style={{ fontSize: '0.62rem', color: '#475569' }}>{item.label}</p>
          </div>
        ))}
      </div>
      <p style={{ fontSize: '0.68rem', color: '#475569' }}>
        🕐 Goal reached in {paceLabel(pace.daysLeft)}
      </p>
    </div>
  );
}

// ── Goal Card ─────────────────────────────────────────────────────────────
function GoalCard({ goal, onAdd, onSubtract, onDelete }) {
  // FIX 1: all hooks from 'react' — imported at top of file
  const [showInput, setShowInput] = useState(false);
  const [action,    setAction]    = useState('add');
  const [amount,    setAmount]    = useState('');
  const [saving,    setSaving]    = useState(false);
  const inputRef = useRef(null);
  useEffect(() => { if (showInput) inputRef.current?.focus(); }, [showInput]);

  const current     = Number(goal.current_amount || 0);
  const target      = Number(goal.target_amount  || 0);
  const pct         = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const done        = pct >= 100;
  const pace        = computePace(goal);
  const accentColor = done ? '#22c55e' : pct > 75 ? '#f59e0b' : '#818cf8';
  const isVacation  = goal.goal_type === 'vacation';

  async function handleAction() {
    if (!amount || Number(amount) <= 0) return;
    setSaving(true);
    if (action === 'add') await onAdd(goal.id, amount);
    else                  await onSubtract(goal.id, amount);
    setSaving(false);
    setAmount('');
    setShowInput(false);
  }

  return (
    <div style={{
      background: '#1e293b',
      border: `1px solid ${done ? 'rgba(34,197,94,0.25)' : '#334155'}`,
      borderRadius: 16, padding: '1rem',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: accentColor, borderRadius: '16px 0 0 16px' }} />
      <div style={{ paddingLeft: '0.625rem' }}>

        {/* Title row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.625rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              {isVacation && <Plane size={13} color="#06b6d4" />}
              <p style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.925rem' }}>
                {goal.name}
                {done && <span style={{ marginLeft: 6, fontSize: '0.68rem', color: '#22c55e', fontWeight: 800 }}>DONE ✓</span>}
              </p>
            </div>
            {goal.target_date && (
              <p style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.1rem' }}>By {goal.target_date}</p>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 800, color: '#f1f5f9' }}>{fmt(current)}</p>
            <p style={{ fontSize: '0.68rem', color: '#475569' }}>of {fmt(target)}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ background: '#0f172a', borderRadius: 999, height: 7, overflow: 'hidden', marginBottom: '0.375rem' }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: accentColor, transition: 'width 0.5s' }} />
        </div>

        {/* Status row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '0.72rem', color: '#475569' }}>
            {done ? '🎉 Goal reached!' : `${Math.round(pct)}% · ${fmt(Math.max(target - current, 0))} left`}
          </p>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            {!done && (
              <button onClick={() => setShowInput(p => !p)} style={{
                background: showInput ? 'rgba(129,140,248,0.2)' : 'rgba(129,140,248,0.1)',
                border: '1px solid rgba(129,140,248,0.25)',
                borderRadius: 8, padding: '3px 10px',
                color: '#818cf8', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
              }}>
                {showInput ? '✕' : '+ Add'}
              </button>
            )}
            <button onClick={() => onDelete(goal.id, goal.name)} style={{
              background: 'transparent', border: 'none', color: '#334155',
              cursor: 'pointer', padding: '3px', display: 'flex', alignItems: 'center',
            }}>
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Pace block */}
        {!done && <PaceBlock pace={pace} />}

        {/* Vacation breakdown */}
        {isVacation && goal.vacation_items && goal.vacation_items.length > 0 && (
          <VacationBreakdown items={goal.vacation_items} />
        )}

        {/* Contribution input */}
        {showInput && !done && (
          <div style={{ marginTop: '0.75rem' }}>
            <div style={{ display: 'flex', background: '#0f172a', borderRadius: 8, padding: 3, gap: 3, marginBottom: '0.5rem' }}>
              {[
                { val: 'add',      label: '+ Add',     color: '#22c55e' },
                { val: 'subtract', label: '− Correct',  color: '#f43f5e' },
              ].map(opt => (
                <button key={opt.val} onClick={() => setAction(opt.val)} style={{
                  flex: 1, padding: '0.375rem', borderRadius: 6, border: 'none',
                  cursor: 'pointer',
                  background: action === opt.val
                    ? (opt.val === 'add' ? 'rgba(34,197,94,0.18)' : 'rgba(244,63,94,0.18)')
                    : 'transparent',
                  color: action === opt.val ? opt.color : '#475569',
                  fontWeight: 700, fontSize: '0.78rem', fontFamily: 'inherit',
                }}>
                  {opt.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                ref={inputRef}
                type="number"
                inputMode="decimal"
                placeholder="Amount ($)"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAction()}
                style={{
                  flex: 1, background: '#0f172a', border: '1px solid #334155',
                  borderRadius: 8, color: '#f1f5f9', padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit',
                }}
              />
              <button
                onClick={handleAction}
                disabled={saving || !amount}
                style={{
                  background: action === 'add' ? '#22c55e' : '#f43f5e',
                  color: '#fff', border: 'none', borderRadius: 8,
                  padding: '0.5rem 0.875rem', fontWeight: 700,
                  cursor: saving || !amount ? 'default' : 'pointer',
                  opacity: saving || !amount ? 0.6 : 1,
                }}
              >
                {saving ? '…' : action === 'add' ? 'Add' : 'Remove'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Vacation breakdown (collapsible) ──────────────────────────────────────
function VacationBreakdown({ items }) {
  const [open, setOpen] = useState(false);
  const total = items.reduce((s, i) => s + Number(i.amount || 0), 0);

  return (
    <div style={{ marginTop: '0.625rem' }}>
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '0.375rem',
          color: '#06b6d4', fontSize: '0.72rem', fontWeight: 700, padding: 0,
        }}
      >
        <Plane size={11} />
        Trip breakdown · {fmt(total)}
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>
      {open && (
        <div style={{ marginTop: '0.375rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{item.label}</span>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#06b6d4' }}>{fmt(item.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Vacation Planner Form ─────────────────────────────────────────────────
const VACATION_ITEMS = [
  { key: 'flights',       label: '✈️  Flights' },
  { key: 'accommodation', label: '🏨  Accommodation' },
  { key: 'food',          label: '🍽️  Food & dining' },
  { key: 'activities',    label: '🎭  Activities' },
  { key: 'transport',     label: '🚌  Local transport' },
  { key: 'shopping',      label: '🛍️  Shopping' },
  { key: 'misc',          label: '💼  Miscellaneous' },
];

function VacationPlannerForm({ onSave, onCancel }) {
  // FIX 1: clean useState — no import confusion
  const [name,  setName]  = useState('');
  const [date,  setDate]  = useState('');
  const [items, setItems] = useState({});

  const total = Object.values(items).reduce((s, v) => s + (parseFloat(v) || 0), 0);

  function setItem(key, val) {
    setItems(prev => ({ ...prev, [key]: val }));
  }

  function handleSave() {
    if (!name.trim() || total <= 0) return;
    const vacationItems = VACATION_ITEMS
      .filter(vi => parseFloat(items[vi.key]) > 0)
      .map(vi => ({ label: vi.label, amount: parseFloat(items[vi.key]) }));
    onSave({
      name: name.trim(),
      target_amount: total,
      current_amount: 0,
      target_date: date || null,
      goal_type: 'vacation',
      vacation_items: vacationItems,
    });
  }

  const inputStyle = {
    background: '#0f172a', border: '1px solid #334155', borderRadius: 8,
    color: '#f1f5f9', padding: '0.5rem 0.75rem',
    fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit',
    width: '100%', boxSizing: 'border-box',
  };

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
        <Plane size={16} color="#06b6d4" />
        <p style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.9rem' }}>Vacation Planner</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        <input
          type="text"
          placeholder="Trip name (e.g. Japan 2025)"
          value={name}
          onChange={e => setName(e.target.value)}
          style={inputStyle}
        />
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          style={{ ...inputStyle, color: date ? '#f1f5f9' : '#475569' }}
        />

        <div style={{ background: '#0f172a', borderRadius: 10, padding: '0.75rem' }}>
          <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.625rem' }}>
            Estimated Costs
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {VACATION_ITEMS.map(vi => (
              <div key={vi.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.82rem', color: '#94a3b8', minWidth: 140 }}>{vi.label}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={items[vi.key] || ''}
                  onChange={e => setItem(vi.key, e.target.value)}
                  style={{ ...inputStyle, width: 100, textAlign: 'right' }}
                />
              </div>
            ))}
          </div>

          {total > 0 && (
            <div style={{
              marginTop: '0.75rem', paddingTop: '0.625rem',
              borderTop: '1px solid #334155',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>Total trip cost</span>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#06b6d4' }}>{fmt(total)}</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.875rem' }}>
        <button
          onClick={handleSave}
          disabled={!name.trim() || total <= 0}
          style={{
            flex: 1,
            background: !name.trim() || total <= 0 ? '#1e293b' : '#06b6d4',
            color: !name.trim() || total <= 0 ? '#334155' : '#fff',
            border: 'none', borderRadius: 8, padding: '0.65rem',
            fontWeight: 700, cursor: !name.trim() || total <= 0 ? 'default' : 'pointer',
          }}
        >
          Create Vacation Goal
        </button>
        <button onClick={onCancel} style={{
          flex: 1, background: 'transparent', border: '1px solid #334155',
          borderRadius: 8, padding: '0.65rem', color: '#64748b',
          fontWeight: 600, cursor: 'pointer',
        }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main Goals page ───────────────────────────────────────────────────────
export default function Goals() {
  const { goals, loading, addGoal, addMoneyToGoal, subtractMoneyFromGoal, deleteGoal } = useSavingsGoals();
  const { isAtLimit }         = useSubscription();
  const { push }              = useToast();
  const { confirm, ConfirmModal } = useConfirm();

  const [showForm,     setShowForm]     = useState(false);
  const [showVacation, setShowVacation] = useState(false);
  const [name,         setName]         = useState('');
  const [target,       setTarget]       = useState('');
  const [current,      setCurrent]      = useState('');
  const [date,         setDate]         = useState('');
  const [saving,       setSaving]       = useState(false);

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    background: '#0f172a', border: '1px solid #334155',
    borderRadius: 8, color: '#f1f5f9',
    padding: '0.625rem 0.875rem', fontSize: '0.9rem',
    outline: 'none', fontFamily: 'inherit',
  };

  async function handleAdd() {
    if (!name.trim() || !target) { push('Enter name and target amount', 'error'); return; }
    setSaving(true);
    const { error } = await addGoal({
      name: name.trim(), target_amount: target,
      current_amount: current || 0, target_date: date || null,
      goal_type: 'standard',
    });
    if (error) { push(error.message, 'error'); setSaving(false); return; }
    push('Goal created ✓');
    setName(''); setTarget(''); setCurrent(''); setDate('');
    setShowForm(false); setSaving(false);
  }

  async function handleAddVacation(payload) {
    setSaving(true);
    const { error } = await addGoal(payload);
    if (error) { push(error.message, 'error'); setSaving(false); return; }
    push('Vacation goal created ✓');
    setShowVacation(false); setSaving(false);
  }

  async function handleDelete(goalId, goalName) {
    const ok = await confirm({
      title: `Delete "${goalName}"?`,
      message: 'Your progress will be lost.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    const { error } = await deleteGoal(goalId);
    if (error) { push(error.message, 'error'); return; }
    push('Goal deleted', 'warning');
  }

  if (loading) return <PageLoader />;

  const activeGoals = goals.filter(g => Number(g.current_amount || 0) < Number(g.target_amount || 0));
  const doneGoals   = goals.filter(g => Number(g.current_amount || 0) >= Number(g.target_amount || 0));
  const atLimit     = isAtLimit('goals', goals.length);

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
        <h1>Goals</h1>
        {!atLimit && (
          <button
            onClick={() => { setShowForm(!showForm); setShowVacation(false); }}
            style={{
              background: '#818cf8', color: '#fff', border: 'none', borderRadius: 12,
              width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
        )}
      </div>
      <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1.25rem' }}>
        What you're saving toward
      </p>

      {atLimit && (
        <div style={{ marginBottom: '1rem' }}>
          <ProUpgradePrompt feature="unlimited_goals" />
        </div>
      )}

      {/* Goal type buttons */}
      {!atLimit && !showForm && !showVacation && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button onClick={() => setShowForm(true)} style={{
            flex: 1, background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.25)',
            borderRadius: 12, padding: '0.625rem', color: '#818cf8',
            fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
          }}>
            + Savings Goal
          </button>
          <button onClick={() => setShowVacation(true)} style={{
            flex: 1, background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)',
            borderRadius: 12, padding: '0.625rem', color: '#06b6d4',
            fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
          }}>
            <Plane size={14} /> Vacation Planner
          </button>
        </div>
      )}

      {/* Standard goal form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <p style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.9rem' }}>New Savings Goal</p>
          <input
            type="text" placeholder="Goal name"
            value={name} onChange={e => setName(e.target.value)}
            style={inputStyle}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <input
              type="number" inputMode="decimal" placeholder="Target ($)"
              value={target} onChange={e => setTarget(e.target.value)}
              style={inputStyle}
            />
            <input
              type="number" inputMode="decimal" placeholder="Saved so far ($)"
              value={current} onChange={e => setCurrent(e.target.value)}
              style={inputStyle}
            />
          </div>
          <input
            type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ ...inputStyle, color: date ? '#f1f5f9' : '#475569' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleAdd}
              disabled={saving || !name || !target}
              style={{
                flex: 1,
                background: !name || !target ? '#1e293b' : '#22c55e',
                color: !name || !target ? '#334155' : '#fff',
                border: 'none', borderRadius: 8, padding: '0.65rem',
                fontWeight: 700, cursor: !name || !target ? 'default' : 'pointer',
              }}
            >
              {saving ? '…' : 'Save Goal'}
            </button>
            <button onClick={() => setShowForm(false)} style={{
              flex: 1, background: 'transparent', border: '1px solid #334155',
              borderRadius: 8, padding: '0.65rem', color: '#64748b',
              fontWeight: 600, cursor: 'pointer',
            }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Vacation planner */}
      {showVacation && (
        <VacationPlannerForm
          onSave={handleAddVacation}
          onCancel={() => setShowVacation(false)}
        />
      )}

      {/* Goals list */}
      {goals.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="No goals yet"
          subtitle="Set a savings goal or plan a vacation to start tracking your progress."
        />
      ) : (
        <>
          {activeGoals.length > 0 && (
            <>
              <p style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.625rem' }}>
                In Progress ({activeGoals.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1rem' }}>
                {activeGoals.map(g => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    onAdd={async (id, amt) => {
                      const { error } = await addMoneyToGoal(id, amt);
                      if (error) push(error.message, 'error'); else push('Saved ✓');
                    }}
                    onSubtract={async (id, amt) => {
                      const { error } = await subtractMoneyFromGoal(id, amt);
                      if (error) push(error.message, 'error'); else push('Updated ✓');
                    }}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </>
          )}

          {doneGoals.length > 0 && (
            <>
              <p style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.625rem' }}>
                Completed ({doneGoals.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {doneGoals.map(g => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    onAdd={async () => {}}
                    onSubtract={async () => {}}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      <ConfirmModal />
    </div>
  );
}