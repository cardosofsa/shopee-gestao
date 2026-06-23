/**
 * Fase 8 — Web Worker para cálculos pesados.
 *
 * Threshold: 5 000 pedidos.
 *   < 5 000 → executa na thread principal (síncrono, sem overhead de serialização)
 *   ≥ 5 000 → delega ao worker (não trava a UI)
 *
 * Uso:
 *   const { computeInsights, computeRanking, computeDRE } = useHeavyCalc()
 *
 *   const insights = await computeInsights({ pedidos, historico, produtos, configuracoes, mesAtual })
 */
import { useCallback, useRef } from 'react';
import { generateInsights } from '../utils/insights';
import { getRankingProdutos } from '../utils/calculations';
import { computeDRE as computeDREFn } from '../domain/dre';
import type { InsightInput, Insight } from '../utils/insights';
import type { RankingProduto } from '../types';
import type { DREResult } from '../domain/dre';
import type { Pedido, Despesa } from '../types';

const WORKER_THRESHOLD = 5_000;

// ── Worker singleton ──────────────────────────────────────────────────────────

type WorkerReply = { id: string; result?: unknown; error?: string };

function getWorker(): Worker {
  // Um único worker por contexto de janela, reutilizado entre chamadas.
  const key = '__shopee_calc_worker__';
  const w   = window as unknown as Record<string, unknown>;
  if (!w[key]) {
    w[key] = new Worker(
      new URL('../workers/calculations.worker.ts', import.meta.url),
      { type: 'module' },
    );
  }
  return w[key] as Worker;
}

function callWorker<T>(type: string, payload: unknown): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id     = crypto.randomUUID();
    const worker = getWorker();

    const handler = (e: MessageEvent<WorkerReply>) => {
      if (e.data.id !== id) return;
      worker.removeEventListener('message', handler);
      if (e.data.error) reject(new Error(e.data.error));
      else              resolve(e.data.result as T);
    };

    worker.addEventListener('message', handler);
    worker.postMessage({ type, id, payload });
  });
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useHeavyCalc() {
  // Ref garante que as funções não re-criam em cada render
  const thresholdRef = useRef(WORKER_THRESHOLD);

  const computeInsights = useCallback(
    (input: InsightInput): Promise<Insight[]> => {
      if (input.pedidos.length < thresholdRef.current) {
        return Promise.resolve(generateInsights(input));
      }
      return callWorker<Insight[]>('GENERATE_INSIGHTS', input);
    },
    [],
  );

  const computeRanking = useCallback(
    (pedidos: Pedido[]): Promise<RankingProduto[]> => {
      if (pedidos.length < thresholdRef.current) {
        return Promise.resolve(getRankingProdutos(pedidos));
      }
      return callWorker<RankingProduto[]>('COMPUTE_RANKING', pedidos);
    },
    [],
  );

  const computeDRE = useCallback(
    (pedidos: Pedido[], despesas: Despesa[], mesAno: string): Promise<DREResult> => {
      if (pedidos.length < thresholdRef.current) {
        return Promise.resolve(computeDREFn(pedidos, despesas, mesAno));
      }
      return callWorker<DREResult>('COMPUTE_DRE', { pedidos, despesas, mesAno });
    },
    [],
  );

  return { computeInsights, computeRanking, computeDRE };
}
