import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import clsx from 'clsx';

const ToastContext = createContext(null);

const TONES = {
  success: { icon: CheckCircle2, color: 'text-emerald-500' },
  error: { icon: XCircle, color: 'text-rose-500' },
  info: { icon: Info, color: 'text-indigo-500' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback((toast) => {
    const id = ++nextId.current;
    setToasts((list) => [...list.slice(-3), { id, tone: 'success', ...toast }]);
    setTimeout(() => dismiss(id), toast.duration ?? 4000);
  }, [dismiss]);

  const api = useMemo(() => ({
    success: (title, description) => push({ title, description, tone: 'success' }),
    error: (title, description) => push({ title, description, tone: 'error', duration: 6000 }),
    info: (title, description, action) => push({ title, description, tone: 'info', action }),
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-start">
        {toasts.map((t) => {
          const { icon: Icon, color } = TONES[t.tone];
          return (
            <div
              key={t.id}
              role="status"
              className="animate-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-lg shadow-black/5"
            >
              <Icon className={clsx('mt-0.5 size-4.5 shrink-0', color)} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{t.title}</p>
                {t.description && <p className="mt-0.5 text-muted">{t.description}</p>}
                {t.action && (
                  <button
                    className="mt-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                    onClick={() => { t.action.onClick(); dismiss(t.id); }}
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
              <button onClick={() => dismiss(t.id)} className="text-subtle hover:text-fg" aria-label="Dismiss">
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
