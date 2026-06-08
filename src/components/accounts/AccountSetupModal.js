import { useState } from 'react';

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
  const [color,  setColor]  = useState('#818cf8');
  const [icon,   setIcon]   = useState('💵');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  async function handleSave() {
    if (!name.trim()) { setError('Account name is required'); return; }
    setSaving(true);
    await onComplete({ name: name.trim(), type, color, icon });
    setSaving(false);
  }

  function handleBackdrop(e) {
    if (e.target === e.currentTarget && onClose) onClose();
  }

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 600, display: 'flex',
        alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div style={{
        background: '#F5F2EC',
        borderRadius: '20px 20px 0 0',
        border: '1px solid #D9D4C7',
        borderBottom: 'none',
        width: '100%', maxWidth: 600,
        padding: '1.75rem 1.25rem 2rem',
        maxHeight: '92dvh', overflowY: 'auto',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.12)',
        position: 'relative',
      }}>

        {/* Drag handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#C8C3B8', margin: '0 auto 1.25rem' }} />

        {/* X close button */}
        {onClose && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: '1.25rem', right: '1.25rem',
              background: '#EAE6DE', border: '1px solid #D9D4C7',
              borderRadius: '50%', width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#5C5852', fontSize: '1.1rem', lineHeight: 1,
            }}
          >×</button>
        )}

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem', paddingRight: onClose ? '2rem' : 0 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{icon}</div>
          <h2 style={{
            color: '#1A1A18', marginBottom: '0.375rem',
            fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: '1.5rem',
          }}>
            {isFirstTime ? 'Create your first account' : 'New Account'}
          </h2>
          {isFirstTime && (
            <p style={{ fontSize: '0.85rem', color: '#6B6860', lineHeight: 1.5 }}>
              Add at least one account to track where your money lives.
            </p>
          )}
        </div>

        {/* Account Type */}
        <div style={{ marginBottom: '1.125rem' }}>
          <label style={labelStyle}>Account Type</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {ACCOUNT_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => { setType(t.value); setIcon(t.icon); }}
                style={{
                  flex: 1, padding: '0.625rem 0.375rem', borderRadius: 10, cursor: 'pointer',
                  background: type === t.value ? 'rgba(129,140,248,0.12)' : '#FFFFFF',
                  color: type === t.value ? '#4F46E5' : '#5C5852',
                  fontWeight: 700, fontSize: '0.8rem', fontFamily: 'inherit',
                  border: `1.5px solid ${type === t.value ? '#818cf8' : '#D9D4C7'}`,
                  transition: 'all 0.15s',
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Account Name */}
        <div style={{ marginBottom: '1.125rem' }}>
          <label style={labelStyle}>Account Name</label>
          <input
            type="text"
            placeholder='e.g. "Cash", "Visa Platinum", "Chase"'
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            style={inputStyle}
            autoFocus
          />
          {error && (
            <p style={{ color: '#DC2626', fontSize: '0.75rem', marginTop: '0.25rem' }}>{error}</p>
          )}
        </div>

        {/* Icon Picker */}
        <div style={{ marginBottom: '1.125rem' }}>
          <label style={labelStyle}>Icon</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {PRESET_ICONS.map((ic) => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                style={{
                  width: 44, height: 44, borderRadius: 10, cursor: 'pointer',
                  background: icon === ic ? 'rgba(129,140,248,0.12)' : '#FFFFFF',
                  fontSize: '1.375rem',
                  border: `1.5px solid ${icon === ic ? '#818cf8' : '#D9D4C7'}`,
                }}
              >
                {ic}
              </button>
            ))}
            {/* Custom emoji */}
            <input
              type="text"
              maxLength={2}
              placeholder="✏️"
              value={PRESET_ICONS.includes(icon) ? '' : icon}
              onChange={(e) => e.target.value && setIcon(e.target.value)}
              style={{
                ...inputStyle,
                width: 44, height: 44, textAlign: 'center',
                fontSize: '1.2rem', padding: 0, flexShrink: 0,
              }}
            />
          </div>
        </div>

        {/* Color Picker */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Color</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: c,
                  boxShadow: color === c ? `0 0 0 3px #F5F2EC, 0 0 0 5px ${c}` : 'none',
                  transition: 'box-shadow .15s',
                }}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '1px solid #D9D4C7', cursor: 'pointer',
                padding: 0, background: 'transparent',
              }}
            />
          </div>
        </div>

        {/* Live Preview */}
        <div style={{
          background: '#FFFFFF', borderRadius: 12,
          padding: '0.875rem 1rem', marginBottom: '1.25rem',
          display: 'flex', alignItems: 'center', gap: '0.875rem',
          border: `1.5px solid ${color}55`,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10,
            background: `${color}18`, border: `1px solid ${color}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.375rem', flexShrink: 0,
          }}>
            {icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, color: '#1A1A18', fontSize: '0.9375rem' }}>
              {name || 'Account name'}
            </p>
            <p style={{ fontSize: '0.78rem', color, fontWeight: 600, textTransform: 'capitalize' }}>
              {type}
            </p>
          </div>
          <p style={{ marginLeft: 'auto', fontWeight: 800, color: '#1A1A18', fontSize: '1rem', flexShrink: 0 }}>
            $0.00
          </p>
        </div>

        {/* Primary action */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: '#1A1A18', color: '#F5F2EC', border: 'none', borderRadius: 12,
            padding: '0.9rem', fontWeight: 700, fontSize: '0.9375rem',
            cursor: saving ? 'not-allowed' : 'pointer', width: '100%',
            fontFamily: 'inherit', opacity: saving ? 0.7 : 1,
            marginBottom: '0.625rem',
          }}
        >
          {saving ? 'Creating…' : isFirstTime ? 'Create Account & Continue' : 'Create Account'}
        </button>

        {/* Cancel — only shown when not first-time setup */}
        {onClose && !isFirstTime && (
          <button
            onClick={onClose}
            style={{
              background: 'transparent', color: '#6B6860',
              border: '1px solid #D9D4C7', borderRadius: 12,
              padding: '0.75rem', fontWeight: 600, fontSize: '0.875rem',
              cursor: 'pointer', width: '100%', fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block', fontSize: '0.75rem', color: '#6B6860',
  fontWeight: 700, marginBottom: '0.5rem',
  letterSpacing: '0.05em', textTransform: 'uppercase',
};

const inputStyle = {
  background: '#FFFFFF', border: '1.5px solid #D9D4C7',
  borderRadius: 10, color: '#1A1A18',
  padding: '0.75rem 1rem', fontSize: '1rem',
  width: '100%', outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box',
};