import { supabase } from './supabase';
import type { Produto, Pedido, Compra, Despesa, Tarefa, HistoricoMensal, Configuracoes } from '../types';

// ── Mappers ──────────────────────────────────────────────────

const fromProduto = (r: any): Produto => ({
  sku: r.sku, nome: r.nome, categoria: r.categoria, loja: r.loja,
  custoUnitario: Number(r.custo_unitario), estoqueSeguranca: r.estoque_seguranca,
  estoqueAtual: r.estoque_atual, ativo: r.ativo,
});
const toProduto = (p: Produto, userId: string) => ({
  sku: p.sku, user_id: userId, nome: p.nome, categoria: p.categoria, loja: p.loja,
  custo_unitario: p.custoUnitario, estoque_seguranca: p.estoqueSeguranca,
  estoque_atual: p.estoqueAtual, ativo: p.ativo,
});

const fromPedido = (r: any): Pedido => ({
  id: r.id, numeroPedido: r.numero_pedido, data: r.data, status: r.status,
  loja: r.loja, sku: r.sku, produto: r.produto, quantidade: r.quantidade,
  multiplicadorKit: r.multiplicador_kit, unidadesEstoque: r.unidades_estoque,
  receita: Number(r.receita), desconto: Number(r.desconto), custoTotal: Number(r.custo_total),
  taxaShopee: Number(r.taxa_shopee), dasImposto: Number(r.das_imposto),
  adsMarketing: Number(r.ads_marketing), lucroOperacional: Number(r.lucro_operacional),
  margemSCustoProduto: Number(r.margem_s_custo_produto), margemSCustoTotal: Number(r.margem_s_custo_total),
});
const toPedido = (p: Pedido, userId: string) => ({
  id: p.id, user_id: userId, numero_pedido: p.numeroPedido, data: p.data,
  status: p.status, loja: p.loja, sku: p.sku, produto: p.produto,
  quantidade: p.quantidade, multiplicador_kit: p.multiplicadorKit,
  unidades_estoque: p.unidadesEstoque, receita: p.receita, desconto: p.desconto,
  custo_total: p.custoTotal, taxa_shopee: p.taxaShopee, das_imposto: p.dasImposto,
  ads_marketing: p.adsMarketing, lucro_operacional: p.lucroOperacional,
  margem_s_custo_produto: p.margemSCustoProduto, margem_s_custo_total: p.margemSCustoTotal,
});

const fromCompra = (r: any): Compra => ({
  id: r.id, sku: r.sku, produto: r.produto, data: r.data,
  quantidadeEntrada: r.quantidade_entrada, custoUnitario: Number(r.custo_unitario),
  custoTotal: Number(r.custo_total), fornecedor: r.fornecedor, nfRef: r.nf_ref,
  pagamento: r.pagamento, parcelas: r.parcelas, valorParcela: Number(r.valor_parcela),
  loja: r.loja, observacoes: r.observacoes,
});
const toCompra = (c: Compra, userId: string) => ({
  id: c.id, user_id: userId, sku: c.sku, produto: c.produto, data: c.data,
  quantidade_entrada: c.quantidadeEntrada, custo_unitario: c.custoUnitario,
  custo_total: c.custoTotal, fornecedor: c.fornecedor, nf_ref: c.nfRef,
  pagamento: c.pagamento, parcelas: c.parcelas, valor_parcela: c.valorParcela,
  loja: c.loja, observacoes: c.observacoes,
});

const fromDespesa = (r: any): Despesa => ({
  id: r.id, data: r.data, categoria: r.categoria, descricao: r.descricao,
  valor: Number(r.valor), loja: r.loja, compraRef: r.compra_ref ?? undefined,
});
const toDespesa = (d: Despesa, userId: string) => ({
  id: d.id, user_id: userId, data: d.data, categoria: d.categoria,
  descricao: d.descricao, valor: d.valor, loja: d.loja, compra_ref: d.compraRef ?? null,
});

// Após migration_v2: coluna renomeada de criado_em → created_at
const fromTarefa = (r: any): Tarefa => ({
  id: r.id, titulo: r.titulo, descricao: r.descricao, coluna: r.coluna,
  posicao: r.posicao, dataVencimento: r.data_vencimento ?? undefined,
  prioridade: r.prioridade, criadoEm: r.created_at ?? r.criado_em,
});
const toTarefa = (t: Tarefa, userId: string) => ({
  id: t.id, user_id: userId, titulo: t.titulo, descricao: t.descricao,
  coluna: t.coluna, posicao: t.posicao, data_vencimento: t.dataVencimento ?? null,
  prioridade: t.prioridade, created_at: t.criadoEm,
});

const fromHistorico = (r: any): HistoricoMensal => ({
  mesAno: r.mes_ano, faturamentoBruto: Number(r.faturamento_bruto),
  pedidosQtd: r.pedidos_qtd, ticketMedio: Number(r.ticket_medio),
  unidadesVendidas: r.unidades_vendidas, cmv: Number(r.cmv),
  taxasShopee: Number(r.taxas_shopee), dasImposto: Number(r.das_imposto),
  marketingAds: Number(r.marketing_ads), despesasOperacionais: Number(r.despesas_operacionais),
  lucroBruto: Number(r.lucro_bruto), lucroOperacional: Number(r.lucro_operacional),
  lucroLiquido: Number(r.lucro_liquido), margemPercentual: Number(r.margem_percentual),
});
const toHistorico = (h: HistoricoMensal, userId: string) => ({
  mes_ano: h.mesAno, user_id: userId, faturamento_bruto: h.faturamentoBruto,
  pedidos_qtd: h.pedidosQtd, ticket_medio: h.ticketMedio, unidades_vendidas: h.unidadesVendidas,
  cmv: h.cmv, taxas_shopee: h.taxasShopee, das_imposto: h.dasImposto,
  marketing_ads: h.marketingAds, despesas_operacionais: h.despesasOperacionais,
  lucro_bruto: h.lucroBruto, lucro_operacional: h.lucroOperacional,
  lucro_liquido: h.lucroLiquido, margem_percentual: h.margemPercentual,
});

// DB armazena como decimal (0.02 = 2%); store usa percentagem (2 = 2%)
const fromConfiguracoes = (r: any): Configuracoes => ({
  aliquotaDAS: Number(r.aliquota_das) * 100,
  percentualMarketing: Number(r.percentual_marketing) * 100,
});
const toConfiguracoes = (c: Configuracoes, userId: string) => ({
  user_id: userId,
  aliquota_das: c.aliquotaDAS / 100,
  percentual_marketing: c.percentualMarketing / 100,
});

// ── Produtos ─────────────────────────────────────────────────

export const dbProdutos = {
  getAll: async (uid: string) => {
    const { data } = await supabase.from('produtos').select('*').eq('user_id', uid);
    return (data ?? []).map(fromProduto);
  },
  upsertAll: async (ps: Produto[], uid: string) => {
    await supabase.from('produtos').upsert(ps.map((p) => toProduto(p, uid)));
  },
  upsert: async (p: Produto, uid: string) => {
    await supabase.from('produtos').upsert(toProduto(p, uid));
  },
  updateEstoque: async (sku: string, estoqueAtual: number, uid: string) => {
    await supabase.from('produtos').update({ estoque_atual: estoqueAtual }).eq('sku', sku).eq('user_id', uid);
  },
  delete: async (sku: string, uid: string) => {
    await supabase.from('produtos').delete().eq('sku', sku).eq('user_id', uid);
  },
};

// ── Pedidos ──────────────────────────────────────────────────

export const dbPedidos = {
  getAll: async (uid: string) => {
    const { data } = await supabase.from('pedidos').select('*').eq('user_id', uid).order('data', { ascending: false });
    return (data ?? []).map(fromPedido);
  },
  upsert: async (p: Pedido, uid: string) => {
    await supabase.from('pedidos').upsert(toPedido(p, uid));
  },
  upsertMany: async (ps: Pedido[], uid: string) => {
    if (ps.length === 0) return;
    const rows = ps.map((p) => toPedido(p, uid));
    for (let i = 0; i < rows.length; i += 500) {
      await supabase.from('pedidos').upsert(rows.slice(i, i + 500));
    }
  },
  updateStatus: async (id: string, status: string, uid: string) => {
    await supabase.from('pedidos').update({ status }).eq('id', id).eq('user_id', uid);
  },
  delete: async (id: string, uid: string) => {
    await supabase.from('pedidos').delete().eq('id', id).eq('user_id', uid);
  },
};

// ── Compras ──────────────────────────────────────────────────

export const dbCompras = {
  getAll: async (uid: string) => {
    const { data } = await supabase.from('compras').select('*').eq('user_id', uid).order('data', { ascending: false });
    return (data ?? []).map(fromCompra);
  },
  insert: async (c: Compra, uid: string) => {
    await supabase.from('compras').insert(toCompra(c, uid));
  },
  delete: async (id: string, uid: string) => {
    await supabase.from('compras').delete().eq('id', id).eq('user_id', uid);
  },
};

// ── Despesas ─────────────────────────────────────────────────

export const dbDespesas = {
  getAll: async (uid: string) => {
    const { data } = await supabase.from('despesas').select('*').eq('user_id', uid).order('data', { ascending: false });
    return (data ?? []).map(fromDespesa);
  },
  insert: async (d: Despesa, uid: string) => {
    await supabase.from('despesas').insert(toDespesa(d, uid));
  },
  deleteByCompraRef: async (compraRef: string, uid: string) => {
    await supabase.from('despesas').delete().eq('compra_ref', compraRef).eq('user_id', uid);
  },
  delete: async (id: string, uid: string) => {
    await supabase.from('despesas').delete().eq('id', id).eq('user_id', uid);
  },
};

// ── Tarefas ──────────────────────────────────────────────────

export const dbTarefas = {
  getAll: async (uid: string) => {
    const { data } = await supabase.from('tarefas').select('*').eq('user_id', uid);
    return (data ?? []).map(fromTarefa);
  },
  insert: async (t: Tarefa, uid: string) => {
    await supabase.from('tarefas').insert(toTarefa(t, uid));
  },
  update: async (id: string, data: Partial<Tarefa>, uid: string) => {
    const row: Record<string, unknown> = {};
    if (data.titulo !== undefined)         row.titulo          = data.titulo;
    if (data.descricao !== undefined)      row.descricao       = data.descricao;
    if (data.coluna !== undefined)         row.coluna          = data.coluna;
    if (data.posicao !== undefined)        row.posicao         = data.posicao;
    if (data.prioridade !== undefined)     row.prioridade      = data.prioridade;
    if (data.dataVencimento !== undefined) row.data_vencimento = data.dataVencimento;
    await supabase.from('tarefas').update(row).eq('id', id).eq('user_id', uid);
  },
  delete: async (id: string, uid: string) => {
    await supabase.from('tarefas').delete().eq('id', id).eq('user_id', uid);
  },
};

// ── Histórico ────────────────────────────────────────────────

export const dbHistorico = {
  getAll: async (uid: string) => {
    const { data } = await supabase
      .from('historico_mensal').select('*').eq('user_id', uid).order('mes_ano', { ascending: false });
    return (data ?? []).map(fromHistorico);
  },
  upsert: async (h: HistoricoMensal, uid: string) => {
    await supabase.from('historico_mensal').upsert(toHistorico(h, uid));
  },
};

// ── Configurações ────────────────────────────────────────────

export const dbConfiguracoes = {
  get: async (uid: string): Promise<Configuracoes | null> => {
    const { data } = await supabase
      .from('configuracoes').select('*').eq('user_id', uid).maybeSingle();
    return data ? fromConfiguracoes(data) : null;
  },
  upsert: async (c: Configuracoes, uid: string) => {
    await supabase.from('configuracoes').upsert(toConfiguracoes(c, uid));
  },
};

// ── Carregar todos os dados do usuário ───────────────────────

export async function loadUserData(uid: string) {
  const [produtos, pedidos, compras, despesas, tarefas, historico, configuracoes] = await Promise.all([
    dbProdutos.getAll(uid),
    dbPedidos.getAll(uid),
    dbCompras.getAll(uid),
    dbDespesas.getAll(uid),
    dbTarefas.getAll(uid),
    dbHistorico.getAll(uid),
    dbConfiguracoes.get(uid),
  ]);
  return { produtos, pedidos, compras, despesas, tarefas, historico, configuracoes };
}

// ── Gravar seed inicial quando usuário é novo ────────────────

export async function seedUserData(uid: string, seed: {
  produtos: Produto[]; compras: Compra[];
  tarefas: Tarefa[]; configuracoes: Configuracoes;
}) {
  await Promise.all([
    dbProdutos.upsertAll(seed.produtos, uid),
    ...seed.compras.map((c) => dbCompras.insert(c, uid)),
    ...seed.tarefas.map((t) => dbTarefas.insert(t, uid)),
    dbConfiguracoes.upsert(seed.configuracoes, uid),
  ]);
}
