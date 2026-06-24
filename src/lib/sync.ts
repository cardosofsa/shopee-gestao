// Retry com backoff exponencial para operações Supabase.
// Tenta até MAX_ATTEMPTS vezes, dobrando o delay a cada falha.
// Erros de autenticação (401/403) não são retentados.

import { pushNotification } from './notifications';

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 500;

function isAuthError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return msg.includes('jwt') || msg.includes('unauthorized') || msg.includes('forbidden');
  }
  return false;
}

export async function withRetry<T>(operation: () => Promise<T>, label?: string): Promise<T> {
  _syncCount++;
  _notifySyncState('syncing');

  let lastError: unknown;
  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const result = await operation();
        _syncCount--;
        if (_syncCount === 0) {
          _notifySyncState('saved');
          setTimeout(() => {
            if (_syncCount === 0) _notifySyncState('idle');
          }, 2000);
        }
        return result;
      } catch (err) {
        lastError = err;
        if (isAuthError(err)) break;
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, BASE_DELAY_MS * 2 ** (attempt - 1)));
        }
      }
    }
  } finally {
    // Garante decremento mesmo em throw
  }

  _syncCount = Math.max(0, _syncCount - 1);
  if (_syncCount === 0) _notifySyncState('idle');

  const msg = lastError instanceof Error ? lastError.message : String(lastError);
  console.error(
    `[sync] Falha após ${MAX_ATTEMPTS} tentativas${label ? ` (${label})` : ''}: ${msg}`
  );
  throw lastError;
}

// ─── Sync error listener ──────────────────────────────────────────────────────

type SyncErrorListener = (message: string) => void;
let _errorListener: SyncErrorListener | null = null;

export function setSyncErrorListener(fn: SyncErrorListener) {
  _errorListener = fn;
}

export function notifySyncError(message: string) {
  if (_errorListener) _errorListener(message);
  else console.warn('[sync] Sem listener registrado:', message);
  pushNotification(message, 'error');
}

// ─── Limit reached listener ───────────────────────────────────────────────────

type LimitListener = (message: string, type: 'warning' | 'error', showUpgrade: boolean) => void;
let _limitListener: LimitListener | null = null;

export function setLimitListener(fn: LimitListener | null) {
  _limitListener = fn;
}

export function notifyLimitReached(message: string, type: 'warning' | 'error', showUpgrade = true) {
  if (_limitListener) _limitListener(message, type, showUpgrade);
  else console.warn('[limit]', message);
  pushNotification(message, type);
}

// ─── Sync state listener ──────────────────────────────────────────────────────

export type SyncState = 'idle' | 'syncing' | 'saved';
type SyncStateListener = (state: SyncState) => void;

let _stateListener: SyncStateListener | null = null;
let _syncCount = 0;

export function setSyncStateListener(fn: SyncStateListener | null) {
  _stateListener = fn;
}

function _notifySyncState(state: SyncState) {
  _stateListener?.(state);
}
