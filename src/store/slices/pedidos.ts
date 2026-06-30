import type { StoreApi } from 'zustand';

import { dbPedidos, dbProdutos } from '../../lib/db';
import { queryClient } from '../../lib/queryClient';
import { notifyLimitReached, notifySyncError, withRetry } from '../../lib/sync';
import type { Pedido } from '../../types';
import type { AppState } from '../types';

type SetFn = StoreApi<AppState>['setState'];
type GetFn = StoreApi<AppState>['getState'];

const qKey = (uid: string | null) => ['pedidos', uid] as const;

export function createPedidosSlice(set: SetFn, get: GetFn) {
  return {
    addPedido: (p: Pedido) => {
      const sub = get().subscription;
      if (sub?.plan.limitePedidosMes) {
        const mes = new Date().toISOString().slice(0, 7);
        const count = get().pedidos.filter((x) => x.data.startsWith(mes)).length;
        const limit = sub.plan.limitePedidosMes;
        if (count >= limit) {
          notifyLimitReached(
            `Limite de ${limit} pedidos/mês atingido. Faça upgrade para continuar.`,
            'error',
            true
          );
          return;
        }
        if (count >= Math.floor(limit * 0.8)) {
          notifyLimitReached(
            `${count} de ${limit} pedidos usados este mês (${Math.round((count / limit) * 100)}%). Considere fazer upgrade.`,
            'warning',
            true
          );
        }
      }
      const prev = get().pedidos;
      set((s) => ({ pedidos: [p, ...s.pedidos] }));
      const uid = get().userId;
      if (uid)
        withRetry(() => dbPedidos.upsert(p, uid), 'pedido')
          .then(() => queryClient.invalidateQueries({ queryKey: qKey(uid) }))
          .catch(() => {
            set({ pedidos: prev });
            notifySyncError('Falha ao salvar pedido. Revertendo — tente novamente.');
          });
    },

    addPedidos: (ps: Pedido[]) => {
      const prev = get().pedidos;
      set((s) => ({ pedidos: [...ps, ...s.pedidos] }));
      const uid = get().userId;
      if (uid)
        withRetry(() => dbPedidos.upsertMany(ps, uid), 'pedidos')
          .then(() => queryClient.invalidateQueries({ queryKey: qKey(uid) }))
          .catch(() => {
            set({ pedidos: prev });
            notifySyncError('Falha ao importar pedidos. Revertendo — tente novamente.');
          });
    },

    updatePedido: (id: string, updated: Pedido) => {
      const { pedidos, produtos } = get();
      const old = pedidos.find((p) => p.id === id);
      if (!old) return;
      const prevPedidos = pedidos;
      const prevProdutos = produtos;
      if (old.status !== updated.status && updated.loja !== 'Projetando') {
        const prev = old.status;
        const next = updated.status;
        const u = updated.unidadesEstoque;
        if ((next === 'Enviado' || next === 'Concluído') && prev === 'Em processo')
          get().updateEstoque(updated.sku, -u);
        if (next === 'Devolvido' && (prev === 'Enviado' || prev === 'Concluído'))
          get().updateEstoque(updated.sku, u);
      }
      set((s) => ({ pedidos: s.pedidos.map((p) => (p.id === id ? updated : p)) }));
      const uid = get().userId;
      if (uid)
        withRetry(() => dbPedidos.upsert(updated, uid), 'pedido')
          .then(() => queryClient.invalidateQueries({ queryKey: qKey(uid) }))
          .catch(() => {
            set({ pedidos: prevPedidos, produtos: prevProdutos });
            notifySyncError('Falha ao salvar pedido. Revertendo — tente novamente.');
          });
    },

    updatePedidoStatus: (id: string, status: Pedido['status']) => {
      const { pedidos, produtos } = get();
      const pedido = pedidos.find((p) => p.id === id);
      if (!pedido) return;
      const prevPedidos = pedidos;
      const prevProdutos = produtos;
      const prevStatus = pedido.status;
      const unidades = pedido.unidadesEstoque;
      if (pedido.loja !== 'Projetando') {
        if ((status === 'Enviado' || status === 'Concluído') && prevStatus === 'Em processo')
          get().updateEstoque(pedido.sku, -unidades);
        if (status === 'Devolvido' && (prevStatus === 'Enviado' || prevStatus === 'Concluído'))
          get().updateEstoque(pedido.sku, unidades);
      }
      set((s) => ({ pedidos: s.pedidos.map((p) => (p.id === id ? { ...p, status } : p)) }));
      const uid = get().userId;
      if (uid)
        withRetry(() => dbPedidos.updateStatus(id, status, uid), 'status do pedido')
          .then(() => queryClient.invalidateQueries({ queryKey: qKey(uid) }))
          .catch(() => {
            set({ pedidos: prevPedidos, produtos: prevProdutos });
            notifySyncError('Falha ao atualizar status. Revertendo — tente novamente.');
          });
    },

    updatePedidosStatus: (ids: string[], status: Pedido['status']) => {
      const { pedidos, produtos } = get();
      const prevPedidos = pedidos;
      const prevProdutos = produtos;
      const idsSet = new Set(ids);
      const stockDeltas = new Map<string, number>();
      ids.forEach((id) => {
        const p = pedidos.find((x) => x.id === id);
        if (!p || p.status === status || p.loja === 'Projetando') return;
        const delta = stockDeltas.get(p.sku) ?? 0;
        if ((status === 'Enviado' || status === 'Concluído') && p.status === 'Em processo')
          stockDeltas.set(p.sku, delta - p.unidadesEstoque);
        if (status === 'Devolvido' && (p.status === 'Enviado' || p.status === 'Concluído'))
          stockDeltas.set(p.sku, delta + p.unidadesEstoque);
      });
      set((s) => ({
        pedidos: s.pedidos.map((p) => (idsSet.has(p.id) ? { ...p, status } : p)),
        produtos: s.produtos.map((p) => {
          const d = stockDeltas.get(p.sku);
          return d !== undefined ? { ...p, estoqueAtual: Math.max(0, p.estoqueAtual + d) } : p;
        }),
      }));
      const uid = get().userId;
      if (uid) {
        Promise.all([
          ...ids.map((id) => withRetry(() => dbPedidos.updateStatus(id, status, uid), 'status')),
          ...Array.from(stockDeltas.entries()).map(([sku]) => {
            const prod = get().produtos.find((p) => p.sku === sku);
            return prod
              ? withRetry(() => dbProdutos.updateEstoque(sku, prod.estoqueAtual, uid), 'estoque')
              : Promise.resolve();
          }),
        ])
          .then(() => queryClient.invalidateQueries({ queryKey: qKey(uid) }))
          .catch(() => {
            set({ pedidos: prevPedidos, produtos: prevProdutos });
            notifySyncError('Falha ao atualizar status em lote. Revertendo — tente novamente.');
          });
      }
    },

    deletePedido: (id: string) => {
      const prev = get().pedidos;
      set((s) => ({ pedidos: s.pedidos.filter((p) => p.id !== id) }));
      const uid = get().userId;
      if (uid)
        withRetry(() => dbPedidos.delete(id, uid), 'pedido')
          .then(() => queryClient.invalidateQueries({ queryKey: qKey(uid) }))
          .catch(() => {
            set({ pedidos: prev });
            notifySyncError('Falha ao excluir pedido. Revertendo — tente novamente.');
          });
    },

    deletePedidos: (ids: string[]) => {
      const prev = get().pedidos;
      const idsSet = new Set(ids);
      set((s) => ({ pedidos: s.pedidos.filter((p) => !idsSet.has(p.id)) }));
      const uid = get().userId;
      if (uid)
        Promise.all(ids.map((id) => withRetry(() => dbPedidos.delete(id, uid), 'pedido')))
          .then(() => queryClient.invalidateQueries({ queryKey: qKey(uid) }))
          .catch(() => {
            set({ pedidos: prev });
            notifySyncError('Falha ao excluir pedidos. Revertendo — tente novamente.');
          });
    },
  };
}
