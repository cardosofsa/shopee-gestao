/**
 * Fase 8 — React Query para pedidos.
 *
 * Arquitetura híbrida:
 *  - useQuery  → fonte de verdade para leitura; sincroniza Zustand para compatibilidade.
 *  - Mutations → padrão otimista nativo do React Query (rollback automático no onError).
 *    · addPedidoRQ / deletePedidoRQ / updateStatusRQ: operações simples com RQ puro.
 *    · importPedidosRQ: bulk insert — exemplo completo do padrão para validação.
 *    · Para mutations que alteram estoque (updatePedido, updatePedidosStatus), ainda
 *      delegamos ao store (lógica de negócio em um único lugar) + invalidamos o cache.
 *
 * Progressão: páginas migradas para este hook deixam de depender de useStore(s=>s.pedidos).
 * Páginas legadas continuam funcionando via Zustand (sincronizado pelo useEffect abaixo).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { dbPedidos } from '../lib/db';
import { queryClient } from '../lib/queryClient';
import { useStore } from '../store';
import type { Pedido } from '../types';

// ── Query key factory ─────────────────────────────────────────────────────────

export const pedidosKey = (uid: string | null) => ['pedidos', uid] as const;

// ── Invalidação externa (usada pelos mutations do store) ──────────────────────

export function invalidatePedidos(uid: string | null) {
  queryClient.invalidateQueries({ queryKey: pedidosKey(uid) });
}

// ── usePedidos ────────────────────────────────────────────────────────────────

/**
 * Hook principal de leitura.
 * Busca do Supabase com stale-while-revalidate e sincroniza Zustand no sucesso,
 * garantindo que páginas que ainda usam useStore((s) => s.pedidos) recebam dados frescos.
 */
export function usePedidos() {
  const uid = useStore((s) => s.userId);
  const lojaFiltro = useStore((s) => s.lojaFiltro);

  const query = useQuery({
    queryKey: pedidosKey(uid),
    queryFn: () => dbPedidos.getAll(uid!),
    enabled: !!uid,
  });

  // Sincroniza Zustand quando RQ traz dados frescos (janela reaberta, foco, etc.)
  useEffect(() => {
    if (query.data) {
      useStore.setState({ pedidos: query.data });
    }
  }, [query.data]);

  const data =
    lojaFiltro && query.data ? query.data.filter((p) => p.loja === lojaFiltro) : (query.data ?? []);

  return { ...query, data };
}

// ── useAddPedido ──────────────────────────────────────────────────────────────

/** Adiciona um pedido com atualização otimista no cache RQ + rollback no erro. */
export function useAddPedido() {
  const qc = useQueryClient();
  const uid = useStore((s) => s.userId);

  return useMutation<Pedido, Error, Pedido>({
    mutationFn: async (pedido) => {
      if (!uid) throw new Error('Não autenticado');
      await dbPedidos.upsert(pedido, uid);
      return pedido;
    },
    onMutate: async (pedido) => {
      await qc.cancelQueries({ queryKey: pedidosKey(uid) });
      const prev = qc.getQueryData<Pedido[]>(pedidosKey(uid));
      qc.setQueryData<Pedido[]>(pedidosKey(uid), (old) => [pedido, ...(old ?? [])]);
      useStore.setState((s) => ({ pedidos: [pedido, ...s.pedidos] }));
      return { prev };
    },
    onError: (_err, _pedido, ctx) => {
      const c = ctx as { prev?: Pedido[] };
      if (c?.prev !== undefined) {
        qc.setQueryData(pedidosKey(uid), c.prev);
        useStore.setState({ pedidos: c.prev });
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: pedidosKey(uid) }),
  });
}

// ── useImportPedidos ──────────────────────────────────────────────────────────

/**
 * Bulk insert — padrão completo para validação.
 * onMutate: snapshot + otimismo
 * onError:  rollback RQ + Zustand
 * onSettled: refetch do servidor
 */
export function useImportPedidos() {
  const qc = useQueryClient();
  const uid = useStore((s) => s.userId);

  return useMutation<Pedido[], Error, Pedido[]>({
    mutationFn: async (pedidos) => {
      if (!uid) throw new Error('Não autenticado');
      await dbPedidos.upsertMany(pedidos, uid);
      return pedidos;
    },
    onMutate: async (newPedidos) => {
      await qc.cancelQueries({ queryKey: pedidosKey(uid) });
      const prev = qc.getQueryData<Pedido[]>(pedidosKey(uid));
      qc.setQueryData<Pedido[]>(pedidosKey(uid), (old) => [...newPedidos, ...(old ?? [])]);
      useStore.setState((s) => ({ pedidos: [...newPedidos, ...s.pedidos] }));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      const c = ctx as { prev?: Pedido[] };
      if (c?.prev !== undefined) {
        qc.setQueryData(pedidosKey(uid), c.prev);
        useStore.setState({ pedidos: c.prev });
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: pedidosKey(uid) }),
  });
}

// ── useDeletePedido ───────────────────────────────────────────────────────────

export function useDeletePedido() {
  const qc = useQueryClient();
  const uid = useStore((s) => s.userId);

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      if (!uid) throw new Error('Não autenticado');
      await dbPedidos.delete(id, uid);
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: pedidosKey(uid) });
      const prev = qc.getQueryData<Pedido[]>(pedidosKey(uid));
      qc.setQueryData<Pedido[]>(pedidosKey(uid), (old) => (old ?? []).filter((p) => p.id !== id));
      useStore.setState((s) => ({ pedidos: s.pedidos.filter((p) => p.id !== id) }));
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      const c = ctx as { prev?: Pedido[] };
      if (c?.prev !== undefined) {
        qc.setQueryData(pedidosKey(uid), c.prev);
        useStore.setState({ pedidos: c.prev });
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: pedidosKey(uid) }),
  });
}

// ── useUpdatePedidoStatus ─────────────────────────────────────────────────────

/**
 * Atualiza status com lógica de estoque delegada ao store
 * (alteração de estoque é business logic que não duplicamos no RQ).
 * O cache é invalidado após a ação do store, que já tem seu próprio rollback.
 */
export function useUpdatePedidoStatus() {
  const qc = useQueryClient();
  const uid = useStore((s) => s.userId);
  const updatePedidoStatus = useStore((s) => s.updatePedidoStatus);

  return useMutation<void, Error, { id: string; status: Pedido['status'] }>({
    mutationFn: ({ id, status }) => {
      updatePedidoStatus(id, status);
      return Promise.resolve();
    },
    onSettled: () => qc.invalidateQueries({ queryKey: pedidosKey(uid) }),
  });
}

// ── useDeletePedidos (bulk) ───────────────────────────────────────────────────

export function useDeletePedidos() {
  const qc = useQueryClient();
  const uid = useStore((s) => s.userId);
  const deletePedidos = useStore((s) => s.deletePedidos);

  return useMutation<void, Error, string[]>({
    mutationFn: (ids) => {
      deletePedidos(ids);
      return Promise.resolve();
    },
    onSettled: () => qc.invalidateQueries({ queryKey: pedidosKey(uid) }),
  });
}
