import { useEffect } from 'react';

import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import type { Pedido, Produto, Tarefa } from '../types';

type DbRow = Record<string, unknown>;

// Mirror the private mappers in db.ts — kept local to avoid coupling
const s = (v: unknown) => v as string;
const n = (v: unknown) => Number(v);
const b = (v: unknown) => Boolean(v);

const rowToPedido = (r: DbRow): Pedido => ({
  id: s(r.id),
  numeroPedido: s(r.numero_pedido),
  data: s(r.data),
  status: r.status as Pedido['status'],
  loja: s(r.loja),
  sku: s(r.sku),
  produto: s(r.produto),
  quantidade: n(r.quantidade),
  multiplicadorKit: n(r.multiplicador_kit),
  unidadesEstoque: n(r.unidades_estoque),
  receita: n(r.receita),
  desconto: n(r.desconto),
  custoTotal: n(r.custo_total),
  taxaShopee: n(r.taxa_shopee),
  dasImposto: n(r.das_imposto),
  adsMarketing: n(r.ads_marketing),
  lucroOperacional: n(r.lucro_operacional),
  margemSCustoProduto: n(r.margem_s_custo_produto),
  margemSCustoTotal: n(r.margem_s_custo_total),
});

const rowToProduto = (r: DbRow): Produto => ({
  sku: s(r.sku),
  nome: s(r.nome),
  categoria: s(r.categoria),
  loja: s(r.loja),
  custoUnitario: n(r.custo_unitario),
  estoqueSeguranca: n(r.estoque_seguranca),
  estoqueAtual: n(r.estoque_atual),
  ativo: b(r.ativo),
});

const rowToTarefa = (r: DbRow): Tarefa => ({
  id: s(r.id),
  titulo: s(r.titulo),
  descricao: s(r.descricao ?? ''),
  coluna: r.coluna as Tarefa['coluna'],
  posicao: n(r.posicao),
  dataVencimento: r.data_vencimento != null ? s(r.data_vencimento) : undefined,
  prioridade: r.prioridade as Tarefa['prioridade'],
  criadoEm: s(r.created_at ?? r.criado_em ?? ''),
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
            const id: string | undefined = (or as DbRow)?.id as string | undefined;
            if (id) useStore.setState((s) => ({ pedidos: s.pedidos.filter((x) => x.id !== id) }));
          }
        }
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
            const sku: string | undefined = (or as DbRow)?.sku as string | undefined;
            if (sku)
              useStore.setState((s) => ({ produtos: s.produtos.filter((x) => x.sku !== sku) }));
          }
        }
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
            const id: string | undefined = (or as DbRow)?.id as string | undefined;
            if (id) useStore.setState((s) => ({ tarefas: s.tarefas.filter((x) => x.id !== id) }));
          }
        }
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
