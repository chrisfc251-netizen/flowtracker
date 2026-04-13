import { useState } from 'react';

const PRESET_ICONS  = ['💵','💳','🏦','🏧','💰','👛','📱','🌐'];
const PRESET_COLORS = ['#818cf8','#22c55e','#f43f5e','#f59e0b','#06b6d4','#a78bfa','#fb7185','#34d399'];
const ACCOUNT_TYPES = [
  { value: 'cash', label: 'Cash',        icon: '💵' },
  { value: 'card', label: 'Card',         icon: '💳' },
  { value: 'bank', label: 'Bank Account', icon: '🏦' },
];

export function AccountSetupModal({ onComplete, isFirstTime = false }) {
  const [name,  setName]  = useState('');
  const [type,  setType]  = useState('cash');
  const [color, setColor] = useState('#818cf8');
  const [icon,  setIcon]  = useState('💵');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  async function handleSave() {
    if (!name.trim()) { setError('Account name is required'); return; }
    setSaving(true);
    await onComplete({ name: name.trim(), type, color, icon });
    setSaving(false);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)',
      zIndex: 600, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
    }}>
      <div style={{
        background: '#1e293b', borderRadius: '20px 20px 0 0',
        border: '1px solid #334155', width: '100%', maxWidth: 600,
        padding: '1.75rem 1.25rem 2rem', maxHeight: '90dvh', overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{icon}</div>
          <h2 style={{ color: '#f1f5f9', marginBottom: '0.375rem' }}>
            {isFirstTime ? 'Create your first account' : 'New Account'}
          </h2>
          {isFirstTime && (
            <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
              Add at least one account (cash, card, or bank) to track where your money lives.
            </p>
          )}
        </div>

        {/* Type selector */}
        <div style={{ marginBottom: '1.125rem' }}>
          <label style={labelStyle}>Account Type</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {ACCOUNT_TYPES.map((t) => (
              <button key={t.value} onClick={() => { setType(t.value); setIcon(t.icon); }} style={{
                flex: 1, padding: '0.625rem 0.375rem', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: type === t.value ? 'rgba(129,140,248,.2)' : '#0f172a',
                color: type === t.value ? '#818cf8' : '#64748b',
                fontWeight: 700, fontSize: '0.8rem', fontFamily: 'inherit',
                border: `1px solid ${type === t.value ? '#818cf8' : '#334155'}`
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
          {error && <p style={{ color: '#f43f5e', fontSize: '0.75rem', marginTop: '0.25rem' }}>{error}</p>}
        </div>

        {/* Icon picker */}
        <div style={{ marginBottom: '1.125rem' }}>
          <label style={labelStyle}>Icon</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {PRESET_ICONS.map((ic) => (
              <button key={ic} onClick={() => setIcon(ic)} style={{
                width: 44, height: 44, borderRadius: 10, border: 'none', cursor: 'pointer',
                background: icon === ic ? 'rgba(129,140,248,.2)' : '#0f172a',
                fontSize: '1.375rem', border: `1px solid ${icon === ic ? '#818cf8' : '#334155'}`
              }}>
                {ic}
              </button>
            ))}
            {/* Custom emoji input */}
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
                boxShadow: color === c ? `0 0 0 3px #1e293b, 0 0 0 5px ${c}` : 'none',
                transition: 'box-shadow .15s'
              }} />
            ))}
            {/* Custom color */}
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
              style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0, background: 'transparent' }} />
          </div>
        </div>

        {/* Preview */}
        <div style={{
          background: '#0f172a', borderRadius: 12, padding: '0.875rem 1rem',
          marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem',
          border: `1px solid ${color}44`
        }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.375rem', border: `1px solid ${color}44` }}>
            {icon}
          </div>
          <div>
            <p style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.9375rem' }}>{name || 'Account name'}</p>
            <p style={{ fontSize: '0.78rem', color, fontWeight: 600, textTransform: 'capitalize' }}>{type}</p>
          </div>
          <p style={{ marginLeft: 'auto', fontWeight: 800, color: '#f1f5f9', fontSize: '1rem' }}>$0.00</p>
        </div>

        <button onClick={handleSave} disabled={saving} style={{
          background: color, color: '#fff', border: 'none', borderRadius: 10,
          padding: '0.875rem', fontWeight: 700, fontSize: '0.9375rem',
          cursor: saving ? 'not-allowed' : 'pointer', width: '100%',
          fontFamily: 'inherit', opacity: saving ? 0.7 : 1
        }}>
          {saving ? 'Creating…' : isFirstTime ? 'Create Account & Continue' : 'Create Account'}
        </button>
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.04em' };
const inputStyle = { background: '#0f172a', border: '1px solid #334155', borderRadius: 10, color: '#f1f5f9', padding: '0.75rem 1rem', fontSize: '1rem', width: '100%', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };