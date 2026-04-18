import { useEffect, useRef } from 'react';

/**
 * Drop-in replacement for window.confirm().
 *
 * Usage:
 *   const { confirm, ConfirmModal } = useConfirm();
 *   await confirm({ title: 'Delete?', message: 'This cannot be undone.' });
 *   // resolves true / false
 *
 * Render <ConfirmModal /> once in any page that uses it.
 */

import { useState, useCallback } from 'react';

export function useConfirm() {
  const [config, setConfig] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback(({ title, message, confirmLabel = 'Delete', danger = true }) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setConfig({ title, message, confirmLabel, danger });
    });
  }, []);

  function handleConfirm() {
    resolveRef.current?.(true);
    setConfig(null);
  }

  function handleCancel() {
    resolveRef.current?.(false);
    setConfig(null);
  }

  function ConfirmModal() {
    if (!config) return null;
    return (
      <div
        onClick={handleCancel}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1.5rem',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: '#1e293b', borderRadius: 18,
            border: '1px solid #334155',
            padding: '1.5rem', width: '100%', maxWidth: 360,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
        >
          <h3 style={{ color: '#f1f5f9', marginBottom: '0.5rem', fontSize: '1.05rem' }}>
            {config.title}
          </h3>
          {config.message && (
            <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              {config.message}
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <button
              onClick={handleCancel}
              style={{
                flex: 1, background: 'transparent',
                border: '1px solid #334155', borderRadius: 10,
                color: '#64748b', padding: '0.75rem',
                fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              style={{
                flex: 1,
                background: config.danger ? 'rgba(244,63,94,0.15)' : '#818cf8',
                border: config.danger ? '1px solid rgba(244,63,94,0.35)' : 'none',
                borderRadius: 10,
                color: config.danger ? '#f43f5e' : '#fff',
                padding: '0.75rem',
                fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {config.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return { confirm, ConfirmModal };
}