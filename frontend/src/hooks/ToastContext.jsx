import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertIcon, CheckIcon } from '../components/common/Icons';

const ToastContext = (typeof globalThis !== 'undefined' && globalThis.__TOAST_CTX__) || createContext(null);
if (typeof globalThis !== 'undefined') {
  globalThis.__TOAST_CTX__ = ToastContext;
}

const fallbackToast = {
  success: (m) => console.log('[Toast:success]', m),
  error: (m) => console.error('[Toast:error]', m),
  info: (m) => console.info('[Toast:info]', m),
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((message, type = 'success') => {
    const id = nextId.current++;
    setToasts((list) => [...list, { id, message, type }]);
    setTimeout(() => dismiss(id), 3800);
  }, [dismiss]);

  const toast = {
    success: (m) => push(m, 'success'),
    error: (m) => push(m, 'error'),
    info: (m) => push(m, 'info'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`} onClick={() => dismiss(t.id)}>
            <span className="toast-icon">
              {t.type === 'success' ? <CheckIcon width={16} height={16} /> : <AlertIcon width={16} height={16} />}
            </span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  return ctx || fallbackToast;
}

// Pulls the most useful message out of an axios error for display in a toast.
export function errorMessage(err, fallback = 'Something went wrong') {
  return err?.response?.data?.message || err?.message || fallback;
}
