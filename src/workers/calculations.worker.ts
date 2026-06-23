/**
 * Web Worker para cálculos pesados.
 * Ativado pelo useHeavyCalc quando pedidos.length >= 5000.
 *
 * Protocolo de mensagens:
 *   Main → Worker: { type, id, payload }
 *   Worker → Main: { id, result } | { id, error }
 *
 * Cada chamada é identificada por um UUID (`id`) para correlacionar resposta.
 */
import { generateInsights } from '../utils/insights';
import { getRankingProdutos } from '../utils/calculations';
import { computeDRE } from '../domain/dre';
import type { InsightInput } from '../utils/insights';
import type { Pedido, Despesa } from '../types';

type WorkerMsg =
  | { type: 'GENERATE_INSIGHTS'; id: string; payload: InsightInput }
  | { type: 'COMPUTE_RANKING';   id: string; payload: Pedido[] }
  | { type: 'COMPUTE_DRE';       id: string; payload: { pedidos: Pedido[]; despesas: Despesa[]; mesAno: string } };

interface WorkerCtx {
  onmessage: ((e: MessageEvent<WorkerMsg>) => void) | null;
  postMessage(data: unknown): void;
}
const wSelf = self as unknown as WorkerCtx;

wSelf.onmessage = (e: MessageEvent<WorkerMsg>) => {
  const { type, id, payload } = e.data;
  try {
    let result: unknown;
    if (type === 'GENERATE_INSIGHTS') {
      result = generateInsights(payload);
    } else if (type === 'COMPUTE_RANKING') {
      result = getRankingProdutos(payload);
    } else if (type === 'COMPUTE_DRE') {
      result = computeDRE(payload.pedidos, payload.despesas, payload.mesAno);
    }
    wSelf.postMessage({ id, result });
  } catch (err) {
    wSelf.postMessage({ id, error: err instanceof Error ? err.message : String(err) });
  }
};
