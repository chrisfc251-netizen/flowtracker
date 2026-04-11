import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, addMonths, addYears, format, parseISO, subDays, subMonths, subYears } from 'date-fns';

export function PeriodSelector({ view, value, onChange }) {
  function prev() {
    if (view === 'daily')   onChange(format(subDays(parseISO(value), 1), 'yyyy-MM-dd'));
    if (view === 'monthly') onChange(format(subMonths(new Date(value + '-01'), 1), 'yyyy-MM'));
    if (view === 'yearly')  onChange(String(Number(value) - 1));
  }
  function next() {
    if (view === 'daily')   onChange(format(addDays(parseISO(value), 1), 'yyyy-MM-dd'));
    if (view === 'monthly') onChange(format(addMonths(new Date(value + '-01'), 1), 'yyyy-MM'));
    if (view === 'yearly')  onChange(String(Number(value) + 1));
  }

  function label() {
    if (view === 'daily')   return format(parseISO(value), 'EEE, MMM d, yyyy');
    if (view === 'monthly') return format(new Date(value + '-01'), 'MMMM yyyy');
    if (view === 'yearly')  return value;
    return value;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
      <button className="btn-icon" onClick={prev} style={{ background: '#1e293b', border: '1px solid #334155' }}>
        <ChevronLeft size={18} />
      </button>
      <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#f1f5f9', flex: 1, textAlign: 'center' }}>
        {label()}
      </span>
      <button className="btn-icon" onClick={next} style={{ background: '#1e293b', border: '1px solid #334155' }}>
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

export function ViewTabs({ view, onChange }) {
  return (
    <div style={{ display: 'flex', background: '#1e293b', borderRadius: 10, padding: 3, gap: 2 }}>
      {['daily', 'monthly', 'yearly'].map((v) => (
        <button key={v} onClick={() => onChange(v)} style={{
          flex: 1, padding: '0.5rem 0', borderRadius: 8, border: 'none',
          background: view === v ? '#334155' : 'transparent',
          color: view === v ? '#f1f5f9' : '#64748b',
          fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.05em',
          textTransform: 'uppercase', transition: 'all .2s'
        }}>
          {v === 'daily' ? 'Day' : v === 'monthly' ? 'Month' : 'Year'}
        </button>
      ))}
    </div>
  );
}
