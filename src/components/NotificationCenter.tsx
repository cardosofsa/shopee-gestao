import { AlertCircle, Bell, CheckCircle2, Info, Trash2, X, XCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  addNotificationListener,
  type AppNotification,
  type NotifType,
} from '../lib/notifications';

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_META: Record<NotifType, { icon: React.ElementType; cls: string; dot: string }> = {
  success: { icon: CheckCircle2, cls: 'text-emerald-500', dot: 'bg-emerald-500' },
  error: { icon: XCircle, cls: 'text-red-500', dot: 'bg-red-500' },
  warning: { icon: AlertCircle, cls: 'text-amber-500', dot: 'bg-amber-500' },
  info: { icon: Info, cls: 'text-slate-400', dot: 'bg-slate-400' },
};

function relativeTime(date: Date): string {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

// ─── Notification item ────────────────────────────────────────────────────────

function NotifItem({
  notif,
  onRemove,
}: {
  notif: AppNotification;
  onRemove: (id: string) => void;
}) {
  const { icon: Icon, cls, dot } = TYPE_META[notif.type];
  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/40 group transition-colors">
      <div className="relative flex-shrink-0 mt-0.5">
        <Icon size={15} className={cls} />
        {!notif.read && (
          <span
            className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${dot} ring-2 ring-white dark:ring-slate-800`}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
          {notif.message}
        </p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
          {relativeTime(notif.at)}
        </p>
      </div>
      <button
        onClick={() => onRemove(notif.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-slate-300 hover:text-slate-500 dark:hover:text-slate-300 mt-0.5"
      >
        <X size={12} />
      </button>
    </div>
  );
}

// ─── Bell button ──────────────────────────────────────────────────────────────

export function NotificationCenter() {
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Subscribe to push events — returns cleanup automatically
  useEffect(() => {
    return addNotificationListener((n) => {
      setNotifs((prev) => [n, ...prev].slice(0, 50));
    });
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const unread = notifs.filter((n) => !n.read).length;

  const toggle = useCallback(() => {
    setOpen((v) => !v);
    // Mark all read when opening
    if (!open) {
      setNotifs((ns) => ns.map((n) => ({ ...n, read: true })));
    }
  }, [open]);

  const remove = useCallback((id: string) => {
    setNotifs((ns) => ns.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifs([]);
    setOpen(false);
  }, []);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={toggle}
        title="Notificações"
        className="relative w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/[0.08] transition-all duration-150"
      >
        <Bell size={13} />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-[500]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Bell size={13} className="text-slate-400" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Notificações
              </span>
              {notifs.length > 0 && (
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  {notifs.length}
                </span>
              )}
            </div>
            {notifs.length > 0 && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={11} /> Limpar
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400 dark:text-slate-500">
                <Bell size={20} className="opacity-30" />
                <p className="text-xs">Nenhuma notificação</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {notifs.map((n) => (
                  <NotifItem key={n.id} notif={n} onRemove={remove} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
