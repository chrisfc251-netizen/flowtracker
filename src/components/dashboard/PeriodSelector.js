import { useState, useRef, useEffect } from 'react';
import { addDays, addMonths, addYears, format, parseISO, subDays, subMonths, subYears, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isSameMonth, isToday } from 'date-fns';

// ── Quick date buttons ────────────────────────────────────────────────────
function QuickButtons({ view, onChange, onViewChange }) {
  const now = new Date();
  const buttons = view === 'daily' ? [
    { label: 'Today',     action: () => onChange(format(now, 'yyyy-MM-dd')) },
    { label: 'Yesterday', action: () => onChange(format(subDays(now, 1), 'yyyy-MM-dd')) },
    { label: '7d ago',    action: () => onChange(format(subDays(now, 7), 'yyyy-MM-dd')) },
  ] : view === 'monthly' ? [
    { label: 'This month', action: () => onChange(format(now, 'yyyy-MM')) },
    { label: 'Last month', action: () => onChange(format(subMonths(now, 1), 'yyyy-MM')) },
    { label: '3m ago',     action: () => onChange(format(subMonths(now, 3), 'yyyy-MM')) },
  ] : [
    { label: 'This year', action: () => onChange(String(now.getFullYear())) },
    { label: 'Last year', action: () => onChange(String(now.getFullYear() - 1)) },
    { label: '2y ago',    action: () => onChange(String(now.getFullYear() - 2)) },
  ];

  return (
    <div style={{ display: 'flex', gap: '0.375rem', overflowX: 'auto', paddingBottom: 2 }}>
      {buttons.map((b) => (
        <button key={b.label} onClick={b.action} style={{
          background: '#1e293b', border: '1px solid #334155', borderRadius: 20,
          color: '#94a3b8', padding: '0.3rem 0.75rem', fontSize: '0.75rem',
          fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
          fontFamily: 'inherit', flexShrink: 0
        }}>
          {b.label}
        </button>
      ))}
    </div>
  );
}

// ── Mini calendar picker ──────────────────────────────────────────────────
function CalendarPicker({ value, view, onChange, onClose }) {
  const now = new Date();
  const [calMonth, setCalMonth] = useState(() => {
    if (view === 'daily')   return parseISO(value + '-01') || now;
    if (view === 'monthly') return new Date(value + '-01');
    return now;
  });

  if (view === 'yearly') {
    const curYear = now.getFullYear();
    const years = Array.from({ length: 10 }, (_, i) => curYear - 4 + i);
    return (
      <div style={calStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {years.map((y) => (
            <button key={y} onClick={() => { onChange(String(y)); onClose(); }} style={{
              ...yearBtnStyle,
              background: String(y) === value ? '#6366f1' : '#0f172a',
              color: String(y) === value ? '#fff' : '#94a3b8',
            }}>{y}</button>
          ))}
        </div>
      </div>
    );
  }

  if (view === 'monthly') {
    const year = calMonth.getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => ({ i, label: format(new Date(year, i, 1), 'MMM') }));
    return (
      <div style={calStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <button onClick={() => setCalMonth(new Date(year - 1, 0, 1))} style={navBtnStyle}>‹</button>
          <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.9rem' }}>{year}</span>
          <button onClick={() => setCalMonth(new Date(year + 1, 0, 1))} style={navBtnStyle}>›</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {months.map(({ i, label }) => {
            const key = `${year}-${String(i + 1).padStart(2, '0')}`;
            const sel = key === value;
            return (
              <button key={i} onClick={() => { onChange(key); onClose(); }} style={{
                ...yearBtnStyle,
                background: sel ? '#6366f1' : '#0f172a',
                color: sel ? '#fff' : '#94a3b8',
              }}>{label}</button>
            );
          })}
        </div>
      </div>
    );
  }

  // Daily calendar
  const days = eachDayOfInterval({ start: startOfMonth(calMonth), end: endOfMonth(calMonth) });
  const startPad = getDay(startOfMonth(calMonth));
  const selected = parseISO(value);

  return (
    <div style={calStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <button onClick={() => setCalMonth(subMonths(calMonth, 1))} style={navBtnStyle}>‹</button>
        <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.875rem' }}>
          {format(calMonth, 'MMMM yyyy')}
        </span>
        <button onClick={() => setCalMonth(addMonths(calMonth, 1))} style={navBtnStyle}>›</button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <span key={i} style={{ textAlign: 'center', fontSize: '0.65rem', color: '#475569', fontWeight: 700 }}>{d}</span>
        ))}
      </div>

      {/* Days grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {Array.from({ length: startPad }).map((_, i) => <span key={'p' + i} />)}
        {days.map((day) => {
          const isSel  = isSameDay(day, selected);
          const isNow  = isToday(day);
          return (
            <button key={day.toISOString()} onClick={() => { onChange(format(day, 'yyyy-MM-dd')); onClose(); }} style={{
              background: isSel ? '#6366f1' : isNow ? 'rgba(99,102,241,.15)' : 'transparent',
              border: isNow && !isSel ? '1px solid rgba(99,102,241,.4)' : '1px solid transparent',
              borderRadius: 6, color: isSel ? '#fff' : isNow ? '#818cf8' : '#94a3b8',
              fontSize: '0.75rem', fontWeight: isSel || isNow ? 700 : 400,
              padding: '0.3rem 0', cursor: 'pointer', textAlign: 'center',
              fontFamily: 'inherit'
            }}>
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const calStyle = {
  position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
  background: '#1e293b', border: '1px solid #334155', borderRadius: 14,
  padding: '1rem', zIndex: 300, width: 260, boxShadow: '0 8px 32px rgba(0,0,0,.5)'
};
const navBtnStyle = {
  background: '#0f172a', border: '1px solid #334155', borderRadius: 8,
  color: '#94a3b8', width: 28, height: 28, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
  fontFamily: 'inherit'
};
const yearBtnStyle = {
  border: 'none', borderRadius: 8, padding: '0.5rem 0.25rem',
  fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
  fontFamily: 'inherit', textAlign: 'center'
};

// ── Main PeriodSelector ───────────────────────────────────────────────────
export function PeriodSelector({ view, value, onChange }) {
  const [showCal, setShowCal] = useState(false);
  const ref     = useRef(null);
  const touchX  = useRef(null);

  // Close calendar on outside click
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setShowCal(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function prev() {
    if (view === 'daily')   onChange(format(subDays(parseISO(value), 1), 'yyyy-MM-dd'));
    if (view === 'monthly') onChange(format(subMonths(new Date(value + '-15'), 1), 'yyyy-MM'));
    if (view === 'yearly')  onChange(String(Number(value) - 1));
  }
  function next() {
    if (view === 'daily')   onChange(format(addDays(parseISO(value), 1), 'yyyy-MM-dd'));
    if (view === 'monthly') onChange(format(addMonths(new Date(value + '-15'), 1), 'yyyy-MM'));
    if (view === 'yearly')  onChange(String(Number(value) + 1));
  }

  function label() {
    if (view === 'daily')   return format(parseISO(value), 'EEE, MMM d yyyy');
    if (view === 'monthly') return format(new Date(value + '-15'), 'MMMM yyyy');
    return value;
  }

  // Touch swipe on the selector bar
  function onTouchStart(e) { touchX.current = e.touches[0].clientX; }
  function onTouchEnd(e) {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); }
    touchX.current = null;
  }

  return (
    <div>
      {/* Quick buttons */}
      <div style={{ marginBottom: '0.5rem' }}>
        <QuickButtons view={view} onChange={onChange} onViewChange={() => {}} />
      </div>

      {/* Main selector bar */}
      <div ref={ref} style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

          <button onClick={prev} style={{
            background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
            color: '#94a3b8', width: 36, height: 36, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontFamily: 'inherit', flexShrink: 0
          }}>‹</button>

          {/* Tap to open calendar */}
          <button onClick={() => setShowCal((p) => !p)} style={{
            flex: 1, background: showCal ? 'rgba(99,102,241,.12)' : '#1e293b',
            border: `1px solid ${showCal ? '#6366f1' : '#334155'}`,
            borderRadius: 10, padding: '0.6rem 0.75rem', cursor: 'pointer',
            color: '#f1f5f9', fontWeight: 700, fontSize: '0.9rem',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '0.4rem', transition: 'all .15s'
          }}>
            <span style={{ fontSize: '0.85rem' }}>📅</span>
            {label()}
          </button>

          <button onClick={next} style={{
            background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
            color: '#94a3b8', width: 36, height: 36, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontFamily: 'inherit', flexShrink: 0
          }}>›</button>
        </div>

        {showCal && (
          <CalendarPicker
            value={value} view={view}
            onChange={onChange}
            onClose={() => setShowCal(false)}
          />
        )}
      </div>
    </div>
  );
}

// ── View tabs (unchanged) ─────────────────────────────────────────────────
export function ViewTabs({ view, onChange }) {
  return (
    <div style={{ display: 'flex', background: '#1e293b', borderRadius: 10, padding: 3, gap: 2 }}>
      {['daily', 'monthly', 'yearly'].map((v) => (
        <button key={v} onClick={() => onChange(v)} style={{
          flex: 1, padding: '0.5rem 0', borderRadius: 8, border: 'none',
          background: view === v ? '#334155' : 'transparent',
          color: view === v ? '#f1f5f9' : '#64748b',
          fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.05em',
          textTransform: 'uppercase', transition: 'all .2s', cursor: 'pointer',
          fontFamily: 'inherit'
        }}>
          {v === 'daily' ? 'Day' : v === 'monthly' ? 'Month' : 'Year'}
        </button>
      ))}
    </div>
  );
}
