import type { StoreApi } from 'zustand';

import { dbCompras, dbDespesas } from '../../lib/db';
import { notifySyncError, withRetry } from '../../lib/sync';
import type { Compra, Despesa } from '../../types';
import type { AppState } from '../types';

type SetFn = StoreApi<AppState>['setState'];
type GetFn = StoreApi<AppState>['getState'];

export function createComprasSlice(set: SetFn, get: GetFn) {
  return {
    addCompra: (c: Compra) => {
      const { compras, despesas, produtos } = get();
      const prevCompras = compras;
      const prevDespesas = despesas;
      const prevProdutos = produtos;
      const despesa: Despesa = {
        id: crypto.randomUUID(),
        data: c.data,
        categoria: 'Mercadoria',
        descricao: `${c.produto} — ${c.quantidadeEntrada} un. (${c.fornecedor || 'sem fornecedor'})`,
        valor: c.custoTotal,
        loja: (c.loja as Despesa['loja']) || 'Ambas',
        compraRef: c.id,
      };
      set((s) => ({ compras: [c, ...s.compras], despesas: [despesa, ...s.despesas] }));
      get().updateEstoque(c.sku, c.quantidadeEntrada);
      const uid = get().userId;
      if (uid)
        Promise.all([
          withRetry(() => dbCompras.insert(c, uid), 'compra'),
          withRetry(() => dbDespesas.insert(despesa, uid), 'despesa de compra'),
        ]).catch(() => {
          set({ compras: prevCompras, despesas: prevDespesas, produtos: prevProdutos });
          notifySyncError('Falha ao registrar compra. Revertendo — tente novamente.');
        });
    },

    updateCompra: (id: string, data: Partial<Compra>) => {
      const { compras, produtos } = get();
      const old = compras.find((c) => c.id === id);
      if (!old) return;
      const prevCompras = compras;
      const prevProdutos = produtos;
      const merged: Compra = { ...old, ...data };
      merged.custoTotal = merged.quantidadeEntrada * merged.custoUnitario;
      merged.valorParcela = merged.custoTotal / Math.max(1, merged.parcelas);
      if (merged.sku === old.sku) {
        const delta = merged.quantidadeEntrada - old.quantidadeEntrada;
        if (delta !== 0) get().updateEstoque(merged.sku, delta);
      } else {
        get().updateEstoque(old.sku, -old.quantidadeEntrada);
        get().updateEstoque(merged.sku, merged.quantidadeEntrada);
      }
      set((s) => ({ compras: s.compras.map((c) => (c.id === id ? merged : c)) }));
      const uid = get().userId;
      if (uid)
        withRetry(() => dbCompras.upsert(merged, uid), 'compra').catch(() => {
          set({ compras: prevCompras, produtos: prevProdutos });
          notifySyncError('Falha ao atualizar compra. Revertendo — tente novamente.');
        });
    },

    deleteCompra: (id: string) => {
      const { compras, despesas, produtos } = get();
      const prevCompras = compras;
      const prevDespesas = despesas;
      const prevProdutos = produtos;
      const compra = compras.find((c) => c.id === id);
      if (compra) get().updateEstoque(compra.sku, -compra.quantidadeEntrada);
      set((s) => ({
        compras: s.compras.filter((c) => c.id !== id),
        despesas: s.despesas.filter((d) => d.compraRef !== id),
      }));
      const uid = get().userId;
      if (uid)
        Promise.all([
          withRetry(() => dbCompras.delete(id, uid), 'compra'),
          withRetry(() => dbDespesas.deleteByCompraRef(id, uid), 'despesa'),
        ]).catch(() => {
          set({ compras: prevCompras, despesas: prevDespesas, produtos: prevProdutos });
          notifySyncError('Falha ao excluir compra. Revertendo — tente novamente.');
        });
    },
  };
}
