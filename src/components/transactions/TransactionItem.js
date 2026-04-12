import { useRef, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { formatUSD, getCategoryMeta } from '../../lib/constants';

const SWIPE_THRESHOLD = 60; // px needed to trigger action

export function TransactionItem({ transaction: t, onEdit, onDelete }) {
  const meta     = getCategoryMeta(t.category);
  const isIncome = t.type === 'income';

  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const [swipeDx, setSwipeDx]     = useState(0);
  const [swiping, setSwiping]     = useState(false);
  const [triggered, setTriggered] = useState(null); // 'edit' | 'delete' | null

  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setSwiping(false);
    setSwipeDx(0);
    setTriggered(null);
  }

  function onTouchMove(e) {
    if (touchStartX.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    // Ignore if mostly vertical scroll
    if (Math.abs(dy) > Math.abs(dx)) return;

    setSwiping(true);
    // Clamp between -120 and 120
    const clamped = Math.max(-120, Math.min(120, dx));
    setSwipeDx(clamped);

    if (clamped > SWIPE_THRESHOLD)      setTriggered('edit');
    else if (clamped < -SWIPE_THRESHOLD) setTriggered('delete');
    else setTriggered(null);
  }

  function onTouchEnd() {
    if (triggered === 'edit')   { onEdit(t); }
    if (triggered === 'delete') { onDelete(t.id); }
    // Animate back
    setSwipeDx(0);
    setSwiping(false);
    setTriggered(null);
    touchStartX.current = null;
  }

  // Background hint color based on swipe direction
  const bgHint = triggered === 'edit'
    ? 'rgba(129,140,248,.25)'
    : triggered === 'delete'
    ? 'rgba(244,63,94,.25)'
    : isIncome ? 'rgba(34,197,94,.05)' : 'rgba(244,63,94,.05)';

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 12 }}>

      {/* Swipe hint backgrounds */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 1rem', pointerEvents: 'none',
        opacity: swiping ? 1 : 0, transition: 'opacity .1s'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#818cf8' }}>
          <Pencil size={16} />
          <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Edit</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#f43f5e' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Delete</span>
          <Trash2 size={16} />
        </div>
      </div>

      {/* Main card */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.875rem',
          background: bgHint,
          border: `1px solid ${isIncome ? 'rgba(34,197,94,.2)' : 'rgba(244,63,94,.15)'}`,
          borderRadius: 12, padding: '0.875rem 1rem',
          transform: `translateX(${swipeDx}px)`,
          transition: swiping ? 'none' : 'transform .25s ease, background .15s',
          userSelect: 'none', touchAction: 'pan-y',
          willChange: 'transform'
        }}
      >
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

        {/* Desktop action buttons (hidden on mobile swipe) */}
        <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
          <button className="btn-icon" onClick={() => onEdit(t)} title="Edit">
            <Pencil size={15} />
          </button>
          <button className="btn-icon" onClick={() => onDelete(t.id)} title="Delete"
            style={{ color: '#64748b' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#f43f5e'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}>
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
