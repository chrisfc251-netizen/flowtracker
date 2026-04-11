import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div style={{
        position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.5rem',
        alignItems: 'center', pointerEvents: 'none', width: '100%', maxWidth: 360
      }}>
        {toasts.map((t) => (
          <div key={t.id} style={{
            background: t.type === 'error' ? '#f43f5e' : t.type === 'warning' ? '#f59e0b' : '#22c55e',
            color: '#fff', borderRadius: 30, padding: '0.6rem 1.25rem',
            fontWeight: 600, fontSize: '0.875rem', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            animation: 'fadeSlideIn 0.25s ease', letterSpacing: '0.01em'
          }}>
            {t.message}
          </div>
        ))}
      </div>
      <style>{`@keyframes fadeSlideIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
