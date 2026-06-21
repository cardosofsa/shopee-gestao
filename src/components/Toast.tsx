import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  action?: ToastAction;
}

interface ToastOptions {
  action?: ToastAction;
  duration?: number;
}

type ToastFn = (message: string, type?: ToastType, opts?: ToastOptions) => void;

const ToastCtx = createContext<ToastFn>(() => {});
export const useToast = () => useContext(ToastCtx);

const CONFIG: Record<ToastType, { icon: React.ElementType; card: string; icon_: string }> = {
  success: { icon: CheckCircle2, card: 'bg-white border-emerald-200 shadow-emerald-100/60',  icon_: 'text-emerald-500' },
  error:   { icon: XCircle,      card: 'bg-white border-red-200    shadow-red-100/60',    icon_: 'text-red-500'     },
  warning: { icon: AlertCircle,  card: 'bg-white border-amber-200  shadow-amber-100/60',  icon_: 'text-amber-500'   },
  info:    { icon: Info,         card: 'bg-white border-slate-200  shadow-slate-100/60',  icon_: 'text-slate-400'   },
};

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const { icon: Icon, card, icon_ } = CONFIG[item.type];
  return (
    <div className={`animate-toast-in flex items-start gap-3 pl-4 pr-3 py-3.5 rounded-2xl border shadow-xl max-w-sm w-full pointer-events-auto ${card}`}>
      <Icon size={16} className={`flex-shrink-0 mt-0.5 ${icon_}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 leading-relaxed">{item.message}</p>
        {item.action && (
          <button
            onClick={() => { item.action!.onClick(); onDismiss(item.id); }}
            className="mt-1.5 text-xs font-semibold text-shopee-500 hover:text-shopee-600 transition-colors"
          >
            {item.action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => onDismiss(item.id)}
        className="flex-shrink-0 text-slate-300 hover:text-slate-500 transition-colors mt-0.5"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback<ToastFn>((message, type = 'info', opts) => {
    const id = crypto.randomUUID();
    const duration = opts?.duration ?? 4500;
    setToasts((t) => [...t, { id, message, type, action: opts?.action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duration);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="fixed bottom-5 right-5 z-[999] flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
