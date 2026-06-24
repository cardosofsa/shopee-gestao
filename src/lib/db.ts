import type {
  Campanha,
  Compra,
  Configuracoes,
  ContaPagar,
  Despesa,
  Fornecedor,
  HistoricoMensal,
  MetaProduto,
  Organization,
  OrgInvite,
  OrgMember,
  OrgRole,
  Pedido,
  Plan,
  Produto,
  Subscription,
  Tarefa,
} from '../types';
import { supabase } from './supabase';

// ── DB row types (mirrors Supabase schema — snake_case) ───────
interface DbProduto {
  sku: string;
  user_id: string;
  nome: string;
  categoria: string;
  loja: string;
  custo_unitario: number;
  estoque_seguranca: number;
  estoque_atual: number;
  ativo: boolean;
}
interface DbPedido {
  id: string;
  user_id: string;
  numero_pedido: string;
  data: string;
  status: string;
  loja: string;
  sku: string;
  produto: string;
  quantidade: number;
  multiplicador_kit: number;
  unidades_estoque: number;
  receita: number;
  desconto: number;
  custo_total: number;
  taxa_shopee: number;
  das_imposto: number;
  ads_marketing: number;
  lucro_operacional: number;
  margem_s_custo_produto: number;
  margem_s_custo_total: number;
  nome_cliente?: string | null;
  observacoes?: string | null;
}
interface DbCompra {
  id: string;
  user_id: string;
  sku: string;
  produto: string;
  data: string;
  quantidade_entrada: number;
  custo_unitario: number;
  custo_total: number;
  fornecedor: string;
  nf_ref: string;
  pagamento: string;
  parcelas: number;
  valor_parcela: number;
  loja: string;
  observacoes: string;
}
interface DbDespesa {
  id: string;
  user_id: string;
  data: string;
  categoria: string;
  descricao: string;
  valor: number;
  loja: string;
  compra_ref?: string | null;
}
interface DbTarefa {
  id: string;
  user_id: string;
  titulo: string;
  descricao: string;
  coluna: string;
  posicao: number;
  data_vencimento?: string | null;
  prioridade: string;
  created_at: string;
  criado_em?: string;
}
interface DbHistorico {
  mes_ano: string;
  user_id: string;
  faturamento_bruto: number;
  pedidos_qtd: number;
  ticket_medio: number;
  unidades_vendidas: number;
  cmv: number;
  taxas_shopee: number;
  das_imposto: number;
  marketing_ads: number;
  despesas_operacionais: number;
  lucro_bruto: number;
  lucro_operacional: number;
  lucro_liquido: number;
  margem_percentual: number;
}
interface DbConfiguracoes {
  user_id: string;
  aliquota_das: number;
  percentual_marketing: number;
  meta_faturamento?: number | null;
  meta_margem?: number | null;
  meta_pedidos?: number | null;
  meta_lucro?: number | null;
  nome_empresa?: string | null;
  tipo_empresa?: string | null;
  cnpj?: string | null;
  lojas?: string[] | null;
}
interface DbContaPagar {
  id: string;
  user_id: string;
  descricao: string;
  categoria: string;
  valor: number;
  vencimento: string;
  status: string;
  pago_em?: string | null;
  recorrente: boolean;
  loja: string;
  observacoes?: string | null;
}
interface DbFornecedor {
  id: string;
  user_id: string;
  nome: string;
  telefone?: string | null;
  email?: string | null;
  cnpj?: string | null;
  lead_time_dias: number;
  termos_pagamento?: string | null;
  observacoes?: string | null;
}
interface DbCampanha {
  id: string;
  user_id: string;
  nome: string;
  inicio: string;
  fim: string;
  desconto: number;
  skus: string[];
  cor: string;
  observacoes?: string | null;
}
interface DbMetaProduto {
  user_id: string;
  sku: string;
  mes_ano: string;
  meta_unidades?: number | null;
  meta_receita?: number | null;
}
interface DbPlan {
  id: string;
  nome: string;
  limite_pedidos_mes: number | null;
  limite_skus: number | null;
  limite_usuarios: number;
  features: Record<string, boolean>;
}
interface DbMember {
  org_id: string;
  user_id: string;
  email?: string | null;
  role: string;
  joined_at: string;
}

// ── Mappers ──────────────────────────────────────────────────

const fromProduto = (r: DbProduto): Produto => ({
  sku: r.sku,
  nome: r.nome,
  categoria: r.categoria,
  loja: r.loja,
  custoUnitario: Number(r.custo_unitario),
  estoqueSeguranca: r.estoque_seguranca,
  estoqueAtual: r.estoque_atual,
  ativo: r.ativo,
});
const toProduto = (p: Produto, userId: string) => ({
  sku: p.sku,
  user_id: userId,
  nome: p.nome,
  categoria: p.categoria,
  loja: p.loja,
  custo_unitario: p.custoUnitario,
  estoque_seguranca: p.estoqueSeguranca,
  estoque_atual: p.estoqueAtual,
  ativo: p.ativo,
});

const fromPedido = (r: DbPedido): Pedido => ({
  id: r.id,
  numeroPedido: r.numero_pedido,
  data: r.data,
  status: r.status as Pedido['status'],
  loja: r.loja,
  sku: r.sku,
  produto: r.produto,
  quantidade: r.quantidade,
  multiplicadorKit: r.multiplicador_kit,
  unidadesEstoque: r.unidades_estoque,
  receita: Number(r.receita),
  desconto: Number(r.desconto),
  custoTotal: Number(r.custo_total),
  taxaShopee: Number(r.taxa_shopee),
  dasImposto: Number(r.das_imposto),
  adsMarketing: Number(r.ads_marketing),
  lucroOperacional: Number(r.lucro_operacional),
  margemSCustoProduto: Number(r.margem_s_custo_produto),
  margemSCustoTotal: Number(r.margem_s_custo_total),
});
const toPedido = (p: Pedido, userId: string) => ({
  id: p.id,
  user_id: userId,
  numero_pedido: p.numeroPedido,
  data: p.data,
  status: p.status,
  loja: p.loja,
  sku: p.sku,
  produto: p.produto,
  quantidade: p.quantidade,
  multiplicador_kit: p.multiplicadorKit,
  unidades_estoque: p.unidadesEstoque,
  receita: p.receita,
  desconto: p.desconto,
  custo_total: p.custoTotal,
  taxa_shopee: p.taxaShopee,
  das_imposto: p.dasImposto,
  ads_marketing: p.adsMarketing,
  lucro_operacional: p.lucroOperacional,
  margem_s_custo_produto: p.margemSCustoProduto,
  margem_s_custo_total: p.margemSCustoTotal,
});

const fromCompra = (r: DbCompra): Compra => ({
  id: r.id,
  sku: r.sku,
  produto: r.produto,
  data: r.data,
  quantidadeEntrada: r.quantidade_entrada,
  custoUnitario: Number(r.custo_unitario),
  custoTotal: Number(r.custo_total),
  fornecedor: r.fornecedor,
  nfRef: r.nf_ref,
  pagamento: r.pagamento,
  parcelas: r.parcelas,
  valorParcela: Number(r.valor_parcela),
  loja: r.loja,
  observacoes: r.observacoes,
});
const toCompra = (c: Compra, userId: string) => ({
  id: c.id,
  user_id: userId,
  sku: c.sku,
  produto: c.produto,
  data: c.data,
  quantidade_entrada: c.quantidadeEntrada,
  custo_unitario: c.custoUnitario,
  custo_total: c.custoTotal,
  fornecedor: c.fornecedor,
  nf_ref: c.nfRef,
  pagamento: c.pagamento,
  parcelas: c.parcelas,
  valor_parcela: c.valorParcela,
  loja: c.loja,
  observacoes: c.observacoes,
});

const fromDespesa = (r: DbDespesa): Despesa => ({
  id: r.id,
  data: r.data,
  categoria: r.categoria,
  descricao: r.descricao,
  valor: Number(r.valor),
  loja: r.loja,
  compraRef: r.compra_ref ?? undefined,
});
const toDespesa = (d: Despesa, userId: string) => ({
  id: d.id,
  user_id: userId,
  data: d.data,
  categoria: d.categoria,
  descricao: d.descricao,
  valor: d.valor,
  loja: d.loja,
  compra_ref: d.compraRef ?? null,
});

// Após migration_v2: coluna renomeada de criado_em → created_at
const fromTarefa = (r: DbTarefa): Tarefa => ({
  id: r.id,
  titulo: r.titulo,
  descricao: r.descricao,
  coluna: r.coluna as Tarefa['coluna'],
  posicao: r.posicao,
  dataVencimento: r.data_vencimento ?? undefined,
  prioridade: r.prioridade as Tarefa['prioridade'],
  criadoEm: r.created_at ?? r.criado_em ?? '',
});
const toTarefa = (t: Tarefa, userId: string) => ({
  id: t.id,
  user_id: userId,
  titulo: t.titulo,
  descricao: t.descricao,
  coluna: t.coluna,
  posicao: t.posicao,
  data_vencimento: t.dataVencimento ?? null,
  prioridade: t.prioridade,
  created_at: t.criadoEm,
});

const fromHistorico = (r: DbHistorico): HistoricoMensal => ({
  mesAno: r.mes_ano,
  faturamentoBruto: Number(r.faturamento_bruto),
  pedidosQtd: r.pedidos_qtd,
  ticketMedio: Number(r.ticket_medio),
  unidadesVendidas: r.unidades_vendidas,
  cmv: Number(r.cmv),
  taxasShopee: Number(r.taxas_shopee),
  dasImposto: Number(r.das_imposto),
  marketingAds: Number(r.marketing_ads),
  despesasOperacionais: Number(r.despesas_operacionais),
  lucroBruto: Number(r.lucro_bruto),
  lucroOperacional: Number(r.lucro_operacional),
  lucroLiquido: Number(r.lucro_liquido),
  margemPercentual: Number(r.margem_percentual),
});
const toHistorico = (h: HistoricoMensal, userId: string) => ({
  mes_ano: h.mesAno,
  user_id: userId,
  faturamento_bruto: h.faturamentoBruto,
  pedidos_qtd: h.pedidosQtd,
  ticket_medio: h.ticketMedio,
  unidades_vendidas: h.unidadesVendidas,
  cmv: h.cmv,
  taxas_shopee: h.taxasShopee,
  das_imposto: h.dasImposto,
  marketing_ads: h.marketingAds,
  despesas_operacionais: h.despesasOperacionais,
  lucro_bruto: h.lucroBruto,
  lucro_operacional: h.lucroOperacional,
  lucro_liquido: h.lucroLiquido,
  margem_percentual: h.margemPercentual,
});

// DB armazena como decimal (0.02 = 2%); store usa percentagem (2 = 2%)
const fromConfiguracoes = (r: DbConfiguracoes): Configuracoes => ({
  aliquotaDAS: Number(r.aliquota_das) * 100,
  percentualMarketing: Number(r.percentual_marketing) * 100,
  metaFaturamento: r.meta_faturamento !== null ? Number(r.meta_faturamento) : undefined,
  metaMargem: r.meta_margem !== null ? Number(r.meta_margem) : undefined,
  metaPedidos: r.meta_pedidos ?? undefined,
  metaLucro: r.meta_lucro !== null ? Number(r.meta_lucro) : undefined,
  nomeEmpresa: r.nome_empresa ?? undefined,
  tipoEmpresa: (r.tipo_empresa ?? undefined) as Configuracoes['tipoEmpresa'],
  cnpj: r.cnpj ?? undefined,
  lojas: r.lojas ?? ['Minha Loja'],
});
const toConfiguracoes = (c: Configuracoes, userId: string) => ({
  user_id: userId,
  aliquota_das: c.aliquotaDAS / 100,
  percentual_marketing: c.percentualMarketing / 100,
  meta_faturamento: c.metaFaturamento ?? null,
  meta_margem: c.metaMargem ?? null,
  meta_pedidos: c.metaPedidos ?? null,
  meta_lucro: c.metaLucro ?? null,
  nome_empresa: c.nomeEmpresa ?? null,
  tipo_empresa: c.tipoEmpresa ?? null,
  cnpj: c.cnpj ?? null,
  lojas: c.lojas,
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
    await supabase
      .from('produtos')
      .update({ estoque_atual: estoqueAtual })
      .eq('sku', sku)
      .eq('user_id', uid);
  },
  delete: async (sku: string, uid: string) => {
    await supabase.from('produtos').delete().eq('sku', sku).eq('user_id', uid);
  },
  deleteAll: async (uid: string) => {
    await supabase.from('produtos').delete().eq('user_id', uid);
  },
};

// ── Pedidos ──────────────────────────────────────────────────

export const dbPedidos = {
  getAll: async (uid: string) => {
    const { data } = await supabase
      .from('pedidos')
      .select('*')
      .eq('user_id', uid)
      .order('data', { ascending: false });
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
  deleteAll: async (uid: string) => {
    await supabase.from('pedidos').delete().eq('user_id', uid);
  },
};

// ── Compras ──────────────────────────────────────────────────

export const dbCompras = {
  getAll: async (uid: string) => {
    const { data } = await supabase
      .from('compras')
      .select('*')
      .eq('user_id', uid)
      .order('data', { ascending: false });
    return (data ?? []).map(fromCompra);
  },
  insert: async (c: Compra, uid: string) => {
    await supabase.from('compras').insert(toCompra(c, uid));
  },
  upsert: async (c: Compra, uid: string) => {
    await supabase.from('compras').upsert(toCompra(c, uid));
  },
  delete: async (id: string, uid: string) => {
    await supabase.from('compras').delete().eq('id', id).eq('user_id', uid);
  },
  deleteAll: async (uid: string) => {
    await supabase.from('compras').delete().eq('user_id', uid);
  },
};

// ── Despesas ─────────────────────────────────────────────────

export const dbDespesas = {
  getAll: async (uid: string) => {
    const { data } = await supabase
      .from('despesas')
      .select('*')
      .eq('user_id', uid)
      .order('data', { ascending: false });
    return (data ?? []).map(fromDespesa);
  },
  insert: async (d: Despesa, uid: string) => {
    await supabase.from('despesas').insert(toDespesa(d, uid));
  },
  upsert: async (d: Despesa, uid: string) => {
    await supabase.from('despesas').upsert(toDespesa(d, uid));
  },
  deleteByCompraRef: async (compraRef: string, uid: string) => {
    await supabase.from('despesas').delete().eq('compra_ref', compraRef).eq('user_id', uid);
  },
  delete: async (id: string, uid: string) => {
    await supabase.from('despesas').delete().eq('id', id).eq('user_id', uid);
  },
  deleteAll: async (uid: string) => {
    await supabase.from('despesas').delete().eq('user_id', uid);
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
    if (data.titulo !== undefined) row.titulo = data.titulo;
    if (data.descricao !== undefined) row.descricao = data.descricao;
    if (data.coluna !== undefined) row.coluna = data.coluna;
    if (data.posicao !== undefined) row.posicao = data.posicao;
    if (data.prioridade !== undefined) row.prioridade = data.prioridade;
    if (data.dataVencimento !== undefined) row.data_vencimento = data.dataVencimento;
    await supabase.from('tarefas').update(row).eq('id', id).eq('user_id', uid);
  },
  delete: async (id: string, uid: string) => {
    await supabase.from('tarefas').delete().eq('id', id).eq('user_id', uid);
  },
  deleteAll: async (uid: string) => {
    await supabase.from('tarefas').delete().eq('user_id', uid);
  },
};

// ── Histórico ────────────────────────────────────────────────

export const dbHistorico = {
  getAll: async (uid: string) => {
    const { data } = await supabase
      .from('historico_mensal')
      .select('*')
      .eq('user_id', uid)
      .order('mes_ano', { ascending: false });
    return (data ?? []).map(fromHistorico);
  },
  upsert: async (h: HistoricoMensal, uid: string) => {
    await supabase.from('historico_mensal').upsert(toHistorico(h, uid));
  },
  delete: async (mesAno: string, uid: string) => {
    await supabase.from('historico_mensal').delete().eq('mes_ano', mesAno).eq('user_id', uid);
  },
  deleteAll: async (uid: string) => {
    await supabase.from('historico_mensal').delete().eq('user_id', uid);
  },
};

// ── Log de Importações ───────────────────────────────────────

export interface ImportacaoLog {
  id: string;
  importadoEm: string;
  formato: 'shopee_nativo' | 'upseller' | 'generico';
  total: number;
  novos: number;
  duplicados: number;
  loja?: string;
}

export const dbImportacoes = {
  getAll: async (uid: string): Promise<ImportacaoLog[]> => {
    const { data } = await supabase
      .from('importacoes_log')
      .select('*')
      .eq('user_id', uid)
      .order('importado_em', { ascending: false })
      .limit(50);
    return (data ?? []).map((r) => ({
      id: r.id,
      importadoEm: r.importado_em,
      formato: r.formato,
      total: r.total,
      novos: r.novos,
      duplicados: r.duplicados,
      loja: r.loja ?? undefined,
    }));
  },
  insert: async (log: Omit<ImportacaoLog, 'id' | 'importadoEm'>, uid: string) => {
    await supabase.from('importacoes_log').insert({
      user_id: uid,
      formato: log.formato,
      total: log.total,
      novos: log.novos,
      duplicados: log.duplicados,
      loja: log.loja ?? null,
    });
  },
  deleteAll: async (uid: string) => {
    await supabase.from('importacoes_log').delete().eq('user_id', uid);
  },
};

// ── Ajustes de Estoque ───────────────────────────────────────

export const dbAjustes = {
  getAll: async (uid: string) => {
    const { data } = await supabase
      .from('ajustes_estoque')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });
    return data ?? [];
  },
  insert: async (
    a: { id: string; sku: string; delta: number; motivo: string; criadoEm: string },
    uid: string
  ) => {
    await supabase.from('ajustes_estoque').insert({
      id: a.id,
      user_id: uid,
      sku: a.sku,
      data: a.criadoEm.slice(0, 10),
      delta: a.delta,
      motivo: a.motivo,
    });
  },
  deleteAll: async (uid: string) => {
    await supabase.from('ajustes_estoque').delete().eq('user_id', uid);
  },
};

// ── Configurações ────────────────────────────────────────────

export const dbConfiguracoes = {
  get: async (uid: string): Promise<Configuracoes | null> => {
    const { data } = await supabase
      .from('configuracoes')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle();
    return data ? fromConfiguracoes(data) : null;
  },
  upsert: async (c: Configuracoes, uid: string) => {
    await supabase.from('configuracoes').upsert(toConfiguracoes(c, uid));
  },
};

// ── Subscriptions / Planos ───────────────────────────────────

const fromPlan = (r: DbPlan): Plan => ({
  id: r.id,
  nome: r.nome,
  limitePedidosMes: r.limite_pedidos_mes ?? null,
  limiteSKUs: r.limite_skus ?? null,
  limiteUsuarios: r.limite_usuarios,
  features: (r.features ?? {}) as unknown as Plan['features'],
});

const FREE_PLAN: Plan = {
  id: 'free',
  nome: 'Free',
  limitePedidosMes: 100,
  limiteSKUs: 20,
  limiteUsuarios: 1,
  features: {
    dre: false,
    importAuto: false,
    exportXlsx: false,
    kanban: true,
    calculadora: true,
    relatoriosPdf: false,
    api: false,
    multiLoja: false,
  },
};

export const dbSubscriptions = {
  get: async (uid: string): Promise<Subscription | null> => {
    const { data } = await supabase
      .from('subscriptions')
      .select('*, plan:plans(*)')
      .eq('user_id', uid)
      .maybeSingle();
    if (!data) return null;
    return {
      userId: data.user_id,
      planId: data.plan_id,
      plan: fromPlan(data.plan),
      status: data.status,
      pedidosMesAtual: data.pedidos_mes_atual,
      periodoInicio: data.periodo_inicio ?? null,
      periodoFim: data.periodo_fim ?? null,
    };
  },

  getOrDefault: async (uid: string): Promise<Subscription> => {
    const sub = await dbSubscriptions.get(uid);
    if (sub) return sub;
    return {
      userId: uid,
      planId: 'free',
      plan: FREE_PLAN,
      status: 'active',
      pedidosMesAtual: 0,
      periodoInicio: null,
      periodoFim: null,
    };
  },
};

// ── CoWork: Organizations ─────────────────────────────────────

export const dbOrganizations = {
  getOwned: async (uid: string): Promise<Organization | null> => {
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner', uid)
      .maybeSingle();
    if (!data) return null;
    return { id: data.id, nome: data.nome, owner: data.owner, createdAt: data.created_at };
  },
  getMembership: async (uid: string): Promise<Organization | null> => {
    const { data } = await supabase
      .from('org_members')
      .select('org_id, organizations(id, nome, owner, created_at)')
      .eq('user_id', uid)
      .maybeSingle();
    if (!data?.organizations) return null;
    const o = data.organizations as unknown as {
      id: string;
      nome: string;
      owner: string;
      created_at: string;
    };
    return { id: o.id, nome: o.nome, owner: o.owner, createdAt: o.created_at };
  },
  create: async (nome: string, uid: string): Promise<Organization> => {
    const { data, error } = await supabase
      .from('organizations')
      .insert({ nome, owner: uid })
      .select()
      .single();
    if (error) throw error;
    return { id: data.id, nome: data.nome, owner: data.owner, createdAt: data.created_at };
  },
  update: async (id: string, nome: string): Promise<void> => {
    await supabase.from('organizations').update({ nome }).eq('id', id);
  },
  delete: async (id: string): Promise<void> => {
    await supabase.from('organizations').delete().eq('id', id);
  },
};

// ── CoWork: Members ───────────────────────────────────────────

const fromMember = (r: DbMember): OrgMember => ({
  orgId: r.org_id,
  userId: r.user_id,
  email: r.email ?? r.user_id,
  role: r.role as OrgRole,
  joinedAt: r.joined_at,
});

export const dbOrgMembers = {
  getByOrg: async (orgId: string): Promise<OrgMember[]> => {
    const { data } = await supabase
      .from('org_members')
      .select('*, u:user_id(email:raw_user_meta_data->>email)')
      .eq('org_id', orgId)
      .order('joined_at');
    return (data ?? []).map((r) => ({
      ...fromMember(r),
      email: (r.u as { email?: string } | null)?.email ?? r.user_id,
    }));
  },
  updateRole: async (orgId: string, userId: string, role: OrgRole): Promise<void> => {
    await supabase.from('org_members').update({ role }).eq('org_id', orgId).eq('user_id', userId);
  },
  remove: async (orgId: string, userId: string): Promise<void> => {
    await supabase.from('org_members').delete().eq('org_id', orgId).eq('user_id', userId);
  },
};

// ── CoWork: Invites ───────────────────────────────────────────

export const dbOrgInvites = {
  getByOrg: async (orgId: string): Promise<OrgInvite[]> => {
    const { data } = await supabase
      .from('org_invites')
      .select('*')
      .eq('org_id', orgId)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    return (data ?? []).map((r) => ({
      id: r.id,
      orgId: r.org_id,
      email: r.email,
      role: r.role as OrgRole,
      token: r.token,
      expiresAt: r.expires_at,
      createdAt: r.created_at,
    }));
  },
  create: async (orgId: string, email: string, role: OrgRole): Promise<OrgInvite> => {
    const { data, error } = await supabase
      .from('org_invites')
      .insert({ org_id: orgId, email, role })
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      orgId: data.org_id,
      email: data.email,
      role: data.role,
      token: data.token,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
    };
  },
  revoke: async (id: string): Promise<void> => {
    await supabase.from('org_invites').delete().eq('id', id);
  },
  accept: async (token: string, userId: string): Promise<void> => {
    const { data, error } = await supabase
      .from('org_invites')
      .select('*')
      .eq('token', token)
      .is('used_at', null)
      .maybeSingle();
    if (error || !data) throw new Error('Convite inválido ou expirado.');
    await Promise.all([
      supabase
        .from('org_members')
        .insert({ org_id: data.org_id, user_id: userId, role: data.role }),
      supabase.from('org_invites').update({ used_at: new Date().toISOString() }).eq('id', data.id),
    ]);
  },
};

// ── Contas a Pagar ───────────────────────────────────────────

const fromContaPagar = (r: DbContaPagar): ContaPagar => ({
  id: r.id,
  descricao: r.descricao,
  categoria: r.categoria,
  valor: Number(r.valor),
  vencimento: r.vencimento,
  status: r.status as ContaPagar['status'],
  pagoEm: r.pago_em ?? undefined,
  recorrente: r.recorrente,
  loja: r.loja,
  observacoes: r.observacoes ?? undefined,
});
const toContaPagar = (c: ContaPagar, uid: string) => ({
  id: c.id,
  user_id: uid,
  descricao: c.descricao,
  categoria: c.categoria,
  valor: c.valor,
  vencimento: c.vencimento,
  status: c.status,
  pago_em: c.pagoEm ?? null,
  recorrente: c.recorrente,
  loja: c.loja,
  observacoes: c.observacoes ?? null,
});

export const dbContasPagar = {
  getAll: async (uid: string): Promise<ContaPagar[]> => {
    const { data } = await supabase
      .from('contas_pagar')
      .select('*')
      .eq('user_id', uid)
      .order('vencimento');
    return (data ?? []).map(fromContaPagar);
  },
  upsert: async (c: ContaPagar, uid: string) => {
    await supabase.from('contas_pagar').upsert(toContaPagar(c, uid));
  },
  delete: async (id: string, uid: string) => {
    await supabase.from('contas_pagar').delete().eq('id', id).eq('user_id', uid);
  },
  deleteAll: async (uid: string) => {
    await supabase.from('contas_pagar').delete().eq('user_id', uid);
  },
};

// ── Fornecedores ─────────────────────────────────────────────

const fromFornecedor = (r: DbFornecedor): Fornecedor => ({
  id: r.id,
  nome: r.nome,
  telefone: r.telefone ?? undefined,
  email: r.email ?? undefined,
  cnpj: r.cnpj ?? undefined,
  leadTimeDias: r.lead_time_dias,
  termosPagamento: r.termos_pagamento ?? undefined,
  observacoes: r.observacoes ?? undefined,
});
const toFornecedor = (f: Fornecedor, uid: string) => ({
  id: f.id,
  user_id: uid,
  nome: f.nome,
  telefone: f.telefone ?? null,
  email: f.email ?? null,
  cnpj: f.cnpj ?? null,
  lead_time_dias: f.leadTimeDias,
  termos_pagamento: f.termosPagamento ?? null,
  observacoes: f.observacoes ?? null,
});

export const dbFornecedores = {
  getAll: async (uid: string): Promise<Fornecedor[]> => {
    const { data } = await supabase
      .from('fornecedores')
      .select('*')
      .eq('user_id', uid)
      .order('nome');
    return (data ?? []).map(fromFornecedor);
  },
  upsert: async (f: Fornecedor, uid: string) => {
    await supabase.from('fornecedores').upsert(toFornecedor(f, uid));
  },
  delete: async (id: string, uid: string) => {
    await supabase.from('fornecedores').delete().eq('id', id).eq('user_id', uid);
  },
  deleteAll: async (uid: string) => {
    await supabase.from('fornecedores').delete().eq('user_id', uid);
  },
};

// ── Campanhas ────────────────────────────────────────────────

const fromCampanha = (r: DbCampanha): Campanha => ({
  id: r.id,
  nome: r.nome,
  inicio: r.inicio,
  fim: r.fim,
  desconto: Number(r.desconto),
  skus: r.skus ?? [],
  cor: r.cor,
  observacoes: r.observacoes ?? undefined,
});
const toCampanha = (c: Campanha, uid: string) => ({
  id: c.id,
  user_id: uid,
  nome: c.nome,
  inicio: c.inicio,
  fim: c.fim,
  desconto: c.desconto,
  skus: c.skus,
  cor: c.cor,
  observacoes: c.observacoes ?? null,
});

export const dbCampanhas = {
  getAll: async (uid: string): Promise<Campanha[]> => {
    const { data } = await supabase
      .from('campanhas')
      .select('*')
      .eq('user_id', uid)
      .order('inicio', { ascending: false });
    return (data ?? []).map(fromCampanha);
  },
  upsert: async (c: Campanha, uid: string) => {
    await supabase.from('campanhas').upsert(toCampanha(c, uid));
  },
  delete: async (id: string, uid: string) => {
    await supabase.from('campanhas').delete().eq('id', id).eq('user_id', uid);
  },
  deleteAll: async (uid: string) => {
    await supabase.from('campanhas').delete().eq('user_id', uid);
  },
};

// ── Metas por Produto ────────────────────────────────────────

const fromMetaProduto = (r: DbMetaProduto): MetaProduto => ({
  sku: r.sku,
  mesAno: r.mes_ano,
  metaUnidades: r.meta_unidades ?? undefined,
  metaReceita: r.meta_receita !== null ? Number(r.meta_receita) : undefined,
});

export const dbMetasProduto = {
  getAll: async (uid: string): Promise<MetaProduto[]> => {
    const { data } = await supabase.from('metas_produto').select('*').eq('user_id', uid);
    return (data ?? []).map(fromMetaProduto);
  },
  upsert: async (m: MetaProduto, uid: string) => {
    await supabase.from('metas_produto').upsert({
      user_id: uid,
      sku: m.sku,
      mes_ano: m.mesAno,
      meta_unidades: m.metaUnidades ?? null,
      meta_receita: m.metaReceita ?? null,
    });
  },
  delete: async (sku: string, mesAno: string, uid: string) => {
    await supabase
      .from('metas_produto')
      .delete()
      .eq('user_id', uid)
      .eq('sku', sku)
      .eq('mes_ano', mesAno);
  },
  deleteAll: async (uid: string) => {
    await supabase.from('metas_produto').delete().eq('user_id', uid);
  },
};

// ── Carregar todos os dados do usuário ───────────────────────

export async function loadUserData(uid: string) {
  const [
    produtos,
    pedidos,
    compras,
    despesas,
    tarefas,
    historico,
    configuracoes,
    contasPagar,
    fornecedores,
    campanhas,
    metasProduto,
  ] = await Promise.all([
    dbProdutos.getAll(uid),
    dbPedidos.getAll(uid),
    dbCompras.getAll(uid),
    dbDespesas.getAll(uid),
    dbTarefas.getAll(uid),
    dbHistorico.getAll(uid),
    dbConfiguracoes.get(uid),
    dbContasPagar.getAll(uid),
    dbFornecedores.getAll(uid),
    dbCampanhas.getAll(uid),
    dbMetasProduto.getAll(uid),
  ]);
  return {
    produtos,
    pedidos,
    compras,
    despesas,
    tarefas,
    historico,
    configuracoes,
    contasPagar,
    fornecedores,
    campanhas,
    metasProduto,
  };
}

// ── Gravar seed inicial quando usuário é novo ────────────────

export async function seedUserData(
  uid: string,
  seed: {
    produtos: Produto[];
    compras: Compra[];
    tarefas: Tarefa[];
    configuracoes: Configuracoes;
  }
) {
  await Promise.all([
    dbProdutos.upsertAll(seed.produtos, uid),
    ...seed.compras.map((c) => dbCompras.insert(c, uid)),
    ...seed.tarefas.map((t) => dbTarefas.insert(t, uid)),
    dbConfiguracoes.upsert(seed.configuracoes, uid),
  ]);
}
