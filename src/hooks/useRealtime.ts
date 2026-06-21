import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import type { Pedido, Produto, Tarefa } from '../types';

// Mirror the private mappers in db.ts — kept local to avoid coupling
const rowToPedido = (r: any): Pedido => ({
  id: r.id, numeroPedido: r.numero_pedido, data: r.data, status: r.status,
  loja: r.loja, sku: r.sku, produto: r.produto, quantidade: r.quantidade,
  multiplicadorKit: r.multiplicador_kit, unidadesEstoque: r.unidades_estoque,
  receita: Number(r.receita), desconto: Number(r.desconto), custoTotal: Number(r.custo_total),
  taxaShopee: Number(r.taxa_shopee), dasImposto: Number(r.das_imposto),
  adsMarketing: Number(r.ads_marketing), lucroOperacional: Number(r.lucro_operacional),
  margemSCustoProduto: Number(r.margem_s_custo_produto),
  margemSCustoTotal: Number(r.margem_s_custo_total),
});

const rowToProduto = (r: any): Produto => ({
  sku: r.sku, nome: r.nome, categoria: r.categoria, loja: r.loja,
  custoUnitario: Number(r.custo_unitario), estoqueSeguranca: r.estoque_seguranca,
  estoqueAtual: r.estoque_atual, ativo: r.ativo,
});

const rowToTarefa = (r: any): Tarefa => ({
  id: r.id, titulo: r.titulo, descricao: r.descricao, coluna: r.coluna,
  posicao: r.posicao, dataVencimento: r.data_vencimento ?? undefined,
  prioridade: r.prioridade, criadoEm: r.created_at ?? r.criado_em,
});

export function useRealtime(userId: string | null) {
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`realtime-${userId}`)

      // ── Pedidos ─────────────────────────────────────────────
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos', filter: `user_id=eq.${userId}` },
        (payload) => {
          const { eventType, new: nr, old: or } = payload;
          if (eventType === 'INSERT') {
            const p = rowToPedido(nr);
            useStore.setState((s) => {
              if (s.pedidos.some((x) => x.id === p.id)) return {};
              return { pedidos: [p, ...s.pedidos] };
            });
          } else if (eventType === 'UPDATE') {
            const p = rowToPedido(nr);
            useStore.setState((s) => ({
              pedidos: s.pedidos.map((x) => (x.id === p.id ? p : x)),
            }));
          } else if (eventType === 'DELETE') {
            const id: string | undefined = (or as any)?.id;
            if (id) useStore.setState((s) => ({ pedidos: s.pedidos.filter((x) => x.id !== id) }));
          }
        },
      )

      // ── Produtos ─────────────────────────────────────────────
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'produtos', filter: `user_id=eq.${userId}` },
        (payload) => {
          const { eventType, new: nr, old: or } = payload;
          if (eventType === 'INSERT' || eventType === 'UPDATE') {
            const p = rowToProduto(nr);
            useStore.setState((s) => {
              const idx = s.produtos.findIndex((x) => x.sku === p.sku);
              if (idx === -1) return { produtos: [...s.produtos, p] };
              const next = [...s.produtos];
              next[idx] = p;
              return { produtos: next };
            });
          } else if (eventType === 'DELETE') {
            const sku: string | undefined = (or as any)?.sku;
            if (sku) useStore.setState((s) => ({ produtos: s.produtos.filter((x) => x.sku !== sku) }));
          }
        },
      )

      // ── Tarefas ──────────────────────────────────────────────
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tarefas', filter: `user_id=eq.${userId}` },
        (payload) => {
          const { eventType, new: nr, old: or } = payload;
          if (eventType === 'INSERT') {
            const t = rowToTarefa(nr);
            useStore.setState((s) => {
              if (s.tarefas.some((x) => x.id === t.id)) return {};
              return { tarefas: [...s.tarefas, t] };
            });
          } else if (eventType === 'UPDATE') {
            const t = rowToTarefa(nr);
            useStore.setState((s) => ({
              tarefas: s.tarefas.map((x) => (x.id === t.id ? t : x)),
            }));
          } else if (eventType === 'DELETE') {
            const id: string | undefined = (or as any)?.id;
            if (id) useStore.setState((s) => ({ tarefas: s.tarefas.filter((x) => x.id !== id) }));
          }
        },
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
