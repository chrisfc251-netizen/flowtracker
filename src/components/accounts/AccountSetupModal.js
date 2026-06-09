import { useState } from 'react';
import { X } from 'lucide-react';

const PRESET_ICONS  = ['💵','💳','🏦','🏧','💰','👛','📱','🌐'];
const PRESET_COLORS = ['#818cf8','#22c55e','#f43f5e','#f59e0b','#06b6d4','#a78bfa','#fb7185','#34d399'];
const ACCOUNT_TYPES = [
  { value: 'cash', label: 'Cash',        icon: '💵' },
  { value: 'card', label: 'Card',         icon: '💳' },
  { value: 'bank', label: 'Bank Account', icon: '🏦' },
];

export function AccountSetupModal({ onComplete, onClose, isFirstTime = false }) {
  const [name,   setName]   = useState('');
  const [type,   setType]   = useState('cash');
  const [color,  setColor]  = useState('#22c55e');
  const [icon,   setIcon]   = useState('💵');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  // Escape key support
  function handleKeyDown(e) {
    if (e.key === 'Escape' && !isFirstTime && onClose) onClose();
  }

  async function handleSave() {
    if (!name.trim()) { setError('Account name is required'); return; }
    setSaving(true);
    await onComplete({ name: name.trim(), type, color, icon });
    setSaving(false);
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        zIndex: 600, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
      }}
      onClick={(e) => { if (!isFirstTime && e.target === e.currentTarget && onClose) onClose(); }}
      onKeyDown={handleKeyDown}
    >
      <div style={{
        background: 'var(--bg-card)', borderRadius: '20px 20px 0 0',
        border: '1px solid var(--border)', width: '100%', maxWidth: 600,
        padding: '1.75rem 1.25rem 2rem', maxHeight: '90dvh', overflowY: 'auto',
        boxShadow: '0 -4px 32px rgba(0,0,0,0.12)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>{icon}</div>
            <h2 style={{ color: 'var(--ink-1)', fontFamily: 'var(--font-serif)', fontWeight: 700, margin: 0 }}>
              {isFirstTime ? 'Create your first account' : 'New Account'}
            </h2>
            {isFirstTime && (
              <p style={{ fontSize: '0.85rem', color: 'var(--ink-3)', lineHeight: 1.5, fontFamily: 'var(--font-sans)', marginTop: '0.375rem' }}>
                Add at least one account (cash, card, or bank) to track where your money lives.
              </p>
            )}
          </div>
          {/* X close — hidden on first-time mandatory setup */}
          {!isFirstTime && onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'var(--bg-inset)', border: '1px solid var(--border)',
                borderRadius: 8, width: 32, height: 32, cursor: 'pointer',
                color: 'var(--ink-3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginLeft: '0.75rem'
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Type selector */}
        <div style={{ marginBottom: '1.125rem' }}>
          <label style={labelStyle}>Account Type</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {ACCOUNT_TYPES.map((t) => (
              <button key={t.value} onClick={() => { setType(t.value); setIcon(t.icon); }} style={{
                flex: 1, padding: '0.625rem 0.375rem', borderRadius: 10, cursor: 'pointer',
                background: type === t.value ? 'var(--bg-inset)' : 'transparent',
                color: type === t.value ? 'var(--ink-1)' : 'var(--ink-4)',
                fontWeight: type === t.value ? 700 : 500,
                fontSize: '0.8rem', fontFamily: 'var(--font-sans)',
                border: `1px solid ${type === t.value ? 'var(--border-strong)' : 'var(--border)'}`,
                transition: 'all 0.1s'
              }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div style={{ marginBottom: '1.125rem' }}>
          <label style={labelStyle}>Account Name</label>
          <input
            type="text" placeholder='e.g. "Cash", "Visa Platinum", "Chase"'
            value={name} onChange={(e) => { setName(e.target.value); setError(''); }}
            style={inputStyle}
            autoFocus
          />
          {error && <p style={{ color: 'var(--accent-red)', fontSize: '0.75rem', marginTop: '0.25rem', fontFamily: 'var(--font-sans)' }}>{error}</p>}
        </div>

        {/* Icon picker */}
        <div style={{ marginBottom: '1.125rem' }}>
          <label style={labelStyle}>Icon</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {PRESET_ICONS.map((ic) => (
              <button key={ic} onClick={() => setIcon(ic)} style={{
                width: 44, height: 44, borderRadius: 10, cursor: 'pointer',
                background: icon === ic ? 'var(--bg-inset)' : 'transparent',
                fontSize: '1.375rem',
                border: `1px solid ${icon === ic ? 'var(--border-strong)' : 'var(--border)'}`,
                transition: 'all 0.1s'
              }}>
                {ic}
              </button>
            ))}
            <input
              type="text" maxLength={2} placeholder="✏️"
              value={PRESET_ICONS.includes(icon) ? '' : icon}
              onChange={(e) => e.target.value && setIcon(e.target.value)}
              style={{ ...inputStyle, width: 44, height: 44, textAlign: 'center', fontSize: '1.2rem', padding: 0, flexShrink: 0 }}
            />
          </div>
        </div>

        {/* Color picker */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Color</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {PRESET_COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)} style={{
                width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: c,
                boxShadow: color === c ? `0 0 0 3px var(--bg), 0 0 0 5px ${c}` : 'none',
                transition: 'box-shadow .15s'
              }} />
            ))}
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
              style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0, background: 'transparent' }} />
          </div>
        </div>

        {/* Preview */}
        <div style={{
          background: 'var(--bg-inset)', borderRadius: 12, padding: '0.875rem 1rem',
          marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem',
          border: `1px solid ${color}44`
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10,
            background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.375rem', border: `1px solid ${color}44`
          }}>
            {icon}
          </div>
          <div>
            <p style={{ fontWeight: 700, color: 'var(--ink-1)', fontSize: '0.9375rem', fontFamily: 'var(--font-sans)' }}>{name || 'Account name'}</p>
            <p style={{ fontSize: '0.78rem', color, fontWeight: 600, textTransform: 'capitalize', fontFamily: 'var(--font-sans)' }}>{type}</p>
          </div>
          <p style={{ marginLeft: 'auto', fontWeight: 800, color: 'var(--ink-2)', fontSize: '1rem', fontFamily: 'var(--font-mono)' }}>$0.00</p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {!isFirstTime && onClose && (
            <button
              onClick={onClose}
              style={{
                flex: '0 0 auto', background: 'var(--bg-inset)',
                border: '1px solid var(--border-strong)', borderRadius: 10,
                padding: '0.875rem 1.25rem', fontWeight: 600, fontSize: '0.9rem',
                cursor: 'pointer', color: 'var(--ink-2)', fontFamily: 'var(--font-sans)'
              }}
            >
              Cancel
            </button>
          )}
          <button onClick={handleSave} disabled={saving} style={{
            flex: 1, background: color, color: '#fff', border: 'none', borderRadius: 10,
            padding: '0.875rem', fontWeight: 700, fontSize: '0.9375rem',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-sans)', opacity: saving ? 0.7 : 1,
            transition: 'opacity 0.15s'
          }}>
            {saving ? 'Creating…' : isFirstTime ? 'Create Account & Continue' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '0.8rem', color: 'var(--ink-3)', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.04em', fontFamily: 'var(--font-sans)' };
const inputStyle = { background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', borderRadius: 10, color: 'var(--ink-1)', padding: '0.75rem 1rem', fontSize: '1rem', width: '100%', outline: 'none', fontFamily: 'var(--font-sans)', boxSizing: 'border-box' };