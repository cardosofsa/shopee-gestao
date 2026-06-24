export type NotifType = 'success' | 'error' | 'warning' | 'info';

export interface AppNotification {
  id: string;
  message: string;
  type: NotifType;
  at: Date;
  read: boolean;
}

type NotifListener = (n: AppNotification) => void;

// Set of listeners so multiple NotificationCenter instances (mobile + desktop
// sidebars) all receive events independently.
const listeners = new Set<NotifListener>();

export function addNotificationListener(fn: NotifListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function pushNotification(message: string, type: NotifType = 'info') {
  const n: AppNotification = {
    id: crypto.randomUUID(),
    message,
    type,
    at: new Date(),
    read: false,
  };
  listeners.forEach((l) => l(n));
}
