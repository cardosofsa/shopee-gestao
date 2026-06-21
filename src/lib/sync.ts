// Retry com backoff exponencial para operações Supabase.
// Tenta até MAX_ATTEMPTS vezes, dobrando o delay a cada falha.
// Erros de autenticação (401/403) não são retentados.

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 500;

function isAuthError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return msg.includes('jwt') || msg.includes('unauthorized') || msg.includes('forbidden');
  }
  return false;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  label?: string
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      if (isAuthError(err)) break;
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, BASE_DELAY_MS * 2 ** (attempt - 1)));
      }
    }
  }
  const msg = lastError instanceof Error ? lastError.message : String(lastError);
  console.error(`[sync] Falha após ${MAX_ATTEMPTS} tentativas${label ? ` (${label})` : ''}: ${msg}`);
  throw lastError;
}

// Fila de falhas de sync para notificação ao usuário.
// O store chama onSyncError; o Layout escuta e exibe o toast.

type SyncErrorListener = (message: string) => void;
let _listener: SyncErrorListener | null = null;

export function setSyncErrorListener(fn: SyncErrorListener) {
  _listener = fn;
}

export function notifySyncError(message: string) {
  if (_listener) _listener(message);
  else console.warn('[sync] Sem listener registrado:', message);
}
