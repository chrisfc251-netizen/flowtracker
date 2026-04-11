import { Pencil, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { formatUSD, getCategoryMeta } from '../../lib/constants';

export function TransactionItem({ transaction: t, onEdit, onDelete }) {
  const meta = getCategoryMeta(t.category);
  const isIncome = t.type === 'income';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.875rem',
      background: '#1e293b', borderRadius: 12,
      border: `1px solid ${isIncome ? 'rgba(34,197,94,.2)' : 'rgba(244,63,94,.15)'}`,
      padding: '0.875rem 1rem'
    }}>
      {/* Icon */}
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isIncome ? 'rgba(34,197,94,.12)' : 'rgba(244,63,94,.12)',
        fontSize: '1.2rem'
      }}>
        {meta.icon}
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#f1f5f9' }}>{meta.label}</span>
          <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: isIncome ? '#22c55e' : '#f43f5e' }}>
            {isIncome ? '+' : '-'}{formatUSD(t.amount)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
            {t.description || <span style={{ color: '#334155' }}>No description</span>}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#475569', flexShrink: 0 }}>
            {format(parseISO(t.date), 'MMM d')}
            {t.nature === 'fixed' && <span style={{ marginLeft: 4, color: '#818cf8', fontWeight: 600 }}>·F</span>}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
        <button className="btn-icon" onClick={() => onEdit(t)} title="Edit">
          <Pencil size={15} />
        </button>
        <button className="btn-icon" onClick={() => onDelete(t.id)} title="Delete"
          style={{ color: '#64748b' }} onMouseEnter={(e) => e.currentTarget.style.color='#f43f5e'}
          onMouseLeave={(e) => e.currentTarget.style.color='#64748b'}>
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
