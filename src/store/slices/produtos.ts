import type { StoreApi } from 'zustand';

import { dbAjustes, dbCompras, dbPedidos, dbProdutos } from '../../lib/db';
import { queryClient } from '../../lib/queryClient';
import { notifyLimitReached, notifySyncError, syncFail, withRetry } from '../../lib/sync';

const qKey = (uid: string | null) => ['pedidos', uid] as const;
import type { AjusteEstoque, Produto } from '../../types';
import type { AppState } from '../types';

type SetFn = StoreApi<AppState>['setState'];
type GetFn = StoreApi<AppState>['getState'];

export function createProdutosSlice(set: SetFn, get: GetFn) {
  return {
    addProduto: (p: Produto) => {
      const sub = get().subscription;
      if (sub?.plan.limiteSKUs) {
        const count = get().produtos.length;
        const limit = sub.plan.limiteSKUs;
        if (count >= limit) {
          notifyLimitReached(
            `Limite de ${limit} SKUs atingido. Faça upgrade para adicionar mais produtos.`,
            'error',
            true
          );
          return;
        }
        if (count >= Math.floor(limit * 0.8)) {
          notifyLimitReached(
            `${count} de ${limit} SKUs cadastrados (${Math.round((count / limit) * 100)}%). Considere fazer upgrade.`,
            'warning',
            true
          );
        }
      }
      set((s) => ({ produtos: [...s.produtos, p] }));
      const uid = get().userId;
      if (uid) withRetry(() => dbProdutos.upsert(p, uid), 'produto').catch(syncFail('produto'));
    },

    updateProduto: (sku: string, data: Partial<Produto>) => {
      set((s) => {
        const novoProdutos = s.produtos.map((p) => (p.sku === sku ? { ...p, ...data } : p));
        if (!('custoUnitario' in data)) return { produtos: novoProdutos };
        const novoCusto = data.custoUnitario as number;
        const novosPedidos = s.pedidos.map((p) => {
          if (p.sku !== sku) return p;
          const custoTotal = novoCusto * p.unidadesEstoque;
          const lucroOperacional =
            p.receita - p.desconto - custoTotal - p.taxaShopee - p.dasImposto - p.adsMarketing;
          return {
            ...p,
            custoTotal,
            lucroOperacional,
            margemSCustoProduto: custoTotal > 0 ? (lucroOperacional / custoTotal) * 100 : 0,
            margemSCustoTotal: p.receita > 0 ? (lucroOperacional / p.receita) * 100 : 0,
          };
        });
        return { produtos: novoProdutos, pedidos: novosPedidos };
      });
      const uid = get().userId;
      const updated = get().produtos.find((p) => p.sku === sku);
      if (uid && updated) {
        withRetry(() => dbProdutos.upsert(updated, uid), 'produto').catch(syncFail('produto'));
        if ('custoUnitario' in data) {
          const pedidosAtualizados = get().pedidos.filter((p) => p.sku === sku);
          if (pedidosAtualizados.length > 0)
            withRetry(() => dbPedidos.upsertMany(pedidosAtualizados, uid), 'pedidos')
              .then(() => queryClient.invalidateQueries({ queryKey: qKey(uid) }))
              .catch(syncFail('pedidos'));
        }
      }
    },

    // Cascade delete: removes linked pedidos and compras atomically
    deleteProduto: (sku: string) => {
      const { pedidos, compras } = get();
      const pedidosIds = pedidos.filter((p) => p.sku === sku).map((p) => p.id);
      const comprasIds = compras.filter((c) => c.sku === sku).map((c) => c.id);
      set((s) => ({
        produtos: s.produtos.filter((p) => p.sku !== sku),
        pedidos: s.pedidos.filter((p) => p.sku !== sku),
        compras: s.compras.filter((c) => c.sku !== sku),
      }));
      const uid = get().userId;
      if (uid) {
        const ops: Promise<void>[] = [
          withRetry(() => dbProdutos.delete(sku, uid), 'produto'),
          ...pedidosIds.map((id) => withRetry(() => dbPedidos.delete(id, uid), 'pedido')),
          ...comprasIds.map((id) => withRetry(() => dbCompras.delete(id, uid), 'compra')),
        ];
        Promise.all(ops)
          .then(() => queryClient.invalidateQueries({ queryKey: qKey(uid) }))
          .catch(syncFail('produto'));
      }
    },

    updateEstoque: (sku: string, delta: number) => {
      const cur = get().produtos.find((p) => p.sku === sku);
      const newVal = Math.max(0, (cur?.estoqueAtual ?? 0) + delta);
      set((s) => ({
        produtos: s.produtos.map((p) => (p.sku === sku ? { ...p, estoqueAtual: newVal } : p)),
      }));
      const uid = get().userId;
      if (uid)
        withRetry(() => dbProdutos.updateEstoque(sku, newVal, uid), 'estoque').catch(
          syncFail('estoque')
        );
    },

    addAjuste: (a: AjusteEstoque) => {
      const prevAjustes = get().ajustes;
      const prevProdutos = get().produtos;
      const delta = a.tipo === 'entrada' ? a.quantidade : -a.quantidade;
      set((s) => ({ ajustes: [a, ...s.ajustes] }));
      get().updateEstoque(a.sku, delta);
      const uid = get().userId;
      if (uid)
        withRetry(
          () =>
            dbAjustes.insert(
              { id: a.id, sku: a.sku, delta, motivo: a.motivo, criadoEm: a.criadoEm },
              uid
            ),
          'ajuste de estoque'
        ).catch(() => {
          set({ ajustes: prevAjustes, produtos: prevProdutos });
          notifySyncError('Falha ao registrar ajuste. Revertendo — tente novamente.');
        });
    },
  };
}
