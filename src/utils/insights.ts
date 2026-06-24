import type { Configuracoes, HistoricoMensal, Pedido, Produto } from '../types';
import { fmt, getCapitalEstoque, getRankingProdutos } from './calculations';

export type InsightTipo = 'positivo' | 'atencao' | 'critico';
export type InsightCategoria =
  | 'receita'
  | 'margem'
  | 'estoque'
  | 'ads'
  | 'produtos'
  | 'metas'
  | 'giro';

export interface Insight {
  id: string;
  tipo: InsightTipo;
  categoria: InsightCategoria;
  titulo: string;
  descricao: string;
  valor?: string;
  diagnostico?: string;
}

export interface InsightInput {
  pedidos: Pedido[];
  historico: HistoricoMensal[];
  produtos: Produto[];
  configuracoes: Configuracoes;
  mesAtual: string; // 'YYYY-MM'
}

function signPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

const TIPO_PRIORITY: Record<InsightTipo, number> = {
  critico: 0,
  atencao: 1,
  positivo: 2,
};

export function generateInsights({
  pedidos,
  historico,
  produtos,
  configuracoes,
  mesAtual,
}: InsightInput): Insight[] {
  const insights: Insight[] = [];
  let seq = 0;
  const id = (prefix: string) => `${prefix}-${++seq}`;

  // ── Histórico ordenado: mais recente primeiro ─────────────────────────────
  const hist = [...historico].sort((a, b) => b.mesAno.localeCompare(a.mesAno));
  const h0 = hist[0]; // último mês fechado
  const h1 = hist[1]; // penúltimo
  const h2 = hist[2]; // antepenúltimo

  // ── Corte de 30 dias ──────────────────────────────────────────────────────
  const today = new Date();
  const d30Ago = new Date(today);
  d30Ago.setDate(d30Ago.getDate() - 30);
  const d30Str = d30Ago.toISOString().slice(0, 10);

  const ativos = (p: Pedido) => p.status === 'Concluído' || p.status === 'Enviado';
  const pedidosAtivos = pedidos.filter(ativos);
  const pedidosMes = pedidosAtivos.filter((p) => p.data.startsWith(mesAtual));
  const pedidosUlt30 = pedidosAtivos.filter((p) => p.data >= d30Str);
  const produtosAtivos = produtos.filter((p) => p.ativo !== false);

  // ═══════════════════════════════════════════════════════════════════════════
  // RECEITA
  // ═══════════════════════════════════════════════════════════════════════════

  if (h0 && h1 && h1.faturamentoBruto > 0) {
    const delta = ((h0.faturamentoBruto - h1.faturamentoBruto) / h1.faturamentoBruto) * 100;
    const mesNome = new Date(h0.mesAno + '-02').toLocaleString('pt-BR', { month: 'long' });
    if (delta >= 5) {
      insights.push({
        id: id('r-up'),
        tipo: 'positivo',
        categoria: 'receita',
        titulo: 'Receita crescendo',
        descricao: `Faturamento de ${mesNome}: ${fmt(h0.faturamentoBruto)}, crescimento de ${delta.toFixed(1)}% em relação ao mês anterior.`,
        valor: signPct(delta),
      });
    } else if (delta <= -5) {
      insights.push({
        id: id('r-down'),
        tipo: 'critico',
        categoria: 'receita',
        titulo: 'Receita caindo',
        descricao: `Faturamento caiu ${Math.abs(delta).toFixed(1)}% em ${mesNome}: ${fmt(h0.faturamentoBruto)} vs ${fmt(h1.faturamentoBruto)} no mês anterior.`,
        valor: signPct(delta),
      });
    }
  }

  // Crescimento sustentado em 3 meses consecutivos
  if (
    h0 &&
    h1 &&
    h2 &&
    h0.faturamentoBruto > h1.faturamentoBruto &&
    h1.faturamentoBruto > h2.faturamentoBruto
  ) {
    insights.push({
      id: id('r-trend'),
      tipo: 'positivo',
      categoria: 'receita',
      titulo: 'Crescimento contínuo por 3 meses',
      descricao: `Receita crescendo consecutivamente: ${fmt(h2.faturamentoBruto)} → ${fmt(h1.faturamentoBruto)} → ${fmt(h0.faturamentoBruto)}. Tendência sólida.`,
      valor: '3 meses ↑',
    });
  }

  // Ticket médio
  if (h0 && h1 && h1.ticketMedio > 0) {
    const dTicket = ((h0.ticketMedio - h1.ticketMedio) / h1.ticketMedio) * 100;
    if (dTicket >= 5) {
      insights.push({
        id: id('t-up'),
        tipo: 'positivo',
        categoria: 'receita',
        titulo: 'Ticket médio crescendo',
        descricao: `Ticket médio subiu ${dTicket.toFixed(1)}%: de ${fmt(h1.ticketMedio)} para ${fmt(h0.ticketMedio)} — clientes comprando itens de maior valor.`,
        valor: signPct(dTicket),
      });
    } else if (dTicket <= -5) {
      insights.push({
        id: id('t-down'),
        tipo: 'atencao',
        categoria: 'receita',
        titulo: 'Ticket médio caindo',
        descricao: `Ticket médio recuou ${Math.abs(dTicket).toFixed(1)}%: de ${fmt(h1.ticketMedio)} para ${fmt(h0.ticketMedio)}.`,
        valor: signPct(dTicket),
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MARGEM
  // ═══════════════════════════════════════════════════════════════════════════

  if (h0 && h1) {
    const dMargem = h0.margemPercentual - h1.margemPercentual;
    const mesNome = new Date(h0.mesAno + '-02').toLocaleString('pt-BR', { month: 'long' });

    if (dMargem <= -3) {
      // Diagnóstico: ACOS subiu?
      const acosH0 = h0.faturamentoBruto > 0 ? (h0.marketingAds / h0.faturamentoBruto) * 100 : 0;
      const acosH1 = h1.faturamentoBruto > 0 ? (h1.marketingAds / h1.faturamentoBruto) * 100 : 0;
      const acosSubiu = acosH0 - acosH1 > 2;

      insights.push({
        id: id('m-down'),
        tipo: Math.abs(dMargem) >= 5 ? 'critico' : 'atencao',
        categoria: 'margem',
        titulo: 'Margem caindo',
        descricao: `Margem recuou ${Math.abs(dMargem).toFixed(1)}p.p. em ${mesNome}: ${h0.margemPercentual.toFixed(1)}% vs ${h1.margemPercentual.toFixed(1)}% no mês anterior.`,
        valor: `${dMargem.toFixed(1)}p.p.`,
        diagnostico: acosSubiu
          ? `ACOS subiu ${(acosH0 - acosH1).toFixed(1)}p.p. neste período — o aumento de gastos com Ads é o principal suspeito.`
          : undefined,
      });
    } else if (dMargem >= 2) {
      insights.push({
        id: id('m-up'),
        tipo: 'positivo',
        categoria: 'margem',
        titulo: 'Margem melhorando',
        descricao: `Margem subiu ${dMargem.toFixed(1)}p.p. em ${mesNome}: ${h0.margemPercentual.toFixed(1)}%.`,
        valor: signPct(dMargem),
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADS / ACOS
  // ═══════════════════════════════════════════════════════════════════════════

  if (h0 && h1) {
    const acosH0 = h0.faturamentoBruto > 0 ? (h0.marketingAds / h0.faturamentoBruto) * 100 : 0;
    const acosH1 = h1.faturamentoBruto > 0 ? (h1.marketingAds / h1.faturamentoBruto) * 100 : 0;

    if (acosH0 > 12 && acosH1 > 12) {
      insights.push({
        id: id('ads-2m'),
        tipo: 'critico',
        categoria: 'ads',
        titulo: 'ACOS alto — 2 meses consecutivos',
        descricao: `Ads consumiram ${acosH0.toFixed(1)}% da receita em ${new Date(h0.mesAno + '-02').toLocaleString('pt-BR', { month: 'long' })} e ${acosH1.toFixed(1)}% em ${new Date(h1.mesAno + '-02').toLocaleString('pt-BR', { month: 'long' })}. Referência saudável: ≤10%.`,
        valor: `${acosH0.toFixed(1)}%`,
        diagnostico:
          'Revise a segmentação das campanhas Shopee Ads e pause anúncios com retorno negativo.',
      });
    } else if (acosH0 > 12) {
      insights.push({
        id: id('ads-1m'),
        tipo: 'atencao',
        categoria: 'ads',
        titulo: 'ACOS alto no último mês fechado',
        descricao: `Ads representaram ${acosH0.toFixed(1)}% do faturamento em ${new Date(h0.mesAno + '-02').toLocaleString('pt-BR', { month: 'long' })}. Ideal: ≤10%.`,
        valor: `${acosH0.toFixed(1)}%`,
      });
    }
  }

  // ACOS do mês atual (tempo real, pedidos)
  if (!insights.some((i) => i.categoria === 'ads')) {
    const recMes = pedidosMes.reduce((s, p) => s + p.receita, 0);
    const adsMes = pedidosMes.reduce((s, p) => s + p.adsMarketing, 0);
    const acosMes = recMes > 500 ? (adsMes / recMes) * 100 : 0;
    if (acosMes > 12) {
      insights.push({
        id: id('ads-live'),
        tipo: 'atencao',
        categoria: 'ads',
        titulo: 'ACOS alto — mês atual',
        descricao: `Ads representam ${acosMes.toFixed(1)}% da receita no mês corrente: ${fmt(adsMes)} em ads para ${fmt(recMes)} de receita.`,
        valor: `${acosMes.toFixed(1)}%`,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTOQUE
  // ═══════════════════════════════════════════════════════════════════════════

  // Velocidade de venda (últimos 30 dias) por SKU
  const velocityMap = new Map<string, number>();
  for (const p of pedidosUlt30) {
    velocityMap.set(p.sku, (velocityMap.get(p.sku) ?? 0) + p.unidadesEstoque);
  }

  // Ruptura prevista em < 7 dias
  const rupturas: Array<{ nome: string; dias: number }> = [];
  for (const prod of produtosAtivos) {
    const v30 = velocityMap.get(prod.sku) ?? 0;
    const vDia = v30 / 30;
    if (vDia > 0) {
      const dias = prod.estoqueAtual / vDia;
      if (dias > 0 && dias < 7) rupturas.push({ nome: prod.nome, dias: Math.ceil(dias) });
    }
  }
  if (rupturas.length > 0) {
    rupturas.sort((a, b) => a.dias - b.dias);
    const top = rupturas[0];
    insights.push({
      id: id('e-ruptura'),
      tipo: 'critico',
      categoria: 'estoque',
      titulo: `Ruptura em menos de 7 dias`,
      descricao:
        rupturas.length === 1
          ? `"${top.nome}" estará zerado em ~${top.dias} dia(s) no ritmo atual de vendas.`
          : `${rupturas.length} produto(s) em risco. Mais urgente: "${top.nome.slice(0, 30)}" (~${top.dias} dia(s)).`,
      valor: `${rupturas.length} SKU${rupturas.length > 1 ? 's' : ''}`,
      diagnostico:
        'Emita pedido de compra urgente ou registre uma entrada manual em Estoque → Ajustes.',
    });
  }

  // Produtos zerados
  const zerados = produtosAtivos.filter((p) => p.estoqueAtual === 0 && p.estoqueSeguranca > 0);
  if (zerados.length > 0) {
    insights.push({
      id: id('e-zero'),
      tipo: 'critico',
      categoria: 'estoque',
      titulo: `${zerados.length} produto${zerados.length > 1 ? 's' : ''} sem estoque`,
      descricao: `${zerados
        .slice(0, 3)
        .map((p) => `"${p.nome.slice(0, 22)}"`)
        .join(
          ', '
        )}${zerados.length > 3 ? ` e mais ${zerados.length - 3}` : ''} com estoque zerado.`,
      valor: `${zerados.length} zerado${zerados.length > 1 ? 's' : ''}`,
    });
  }

  // Abaixo do mínimo (mas não zerado)
  const abaixoMin = produtosAtivos.filter(
    (p) => p.estoqueSeguranca > 0 && p.estoqueAtual > 0 && p.estoqueAtual < p.estoqueSeguranca
  );
  if (abaixoMin.length > 0) {
    insights.push({
      id: id('e-baixo'),
      tipo: 'atencao',
      categoria: 'estoque',
      titulo: `${abaixoMin.length} produto${abaixoMin.length > 1 ? 's' : ''} abaixo do mínimo`,
      descricao: `${abaixoMin
        .slice(0, 3)
        .map((p) => `"${p.nome.slice(0, 22)}"`)
        .join(
          ', '
        )}${abaixoMin.length > 3 ? ` e mais ${abaixoMin.length - 3}` : ''} abaixo do ponto de segurança.`,
      valor: `${abaixoMin.length} SKU${abaixoMin.length > 1 ? 's' : ''}`,
    });
  }

  // Estoque 100% saudável
  const comSeguranca = produtosAtivos.filter((p) => p.estoqueSeguranca > 0);
  if (comSeguranca.length > 0 && abaixoMin.length === 0 && zerados.length === 0) {
    insights.push({
      id: id('e-ok'),
      tipo: 'positivo',
      categoria: 'estoque',
      titulo: 'Estoque saudável',
      descricao: `Todos os ${comSeguranca.length} produtos monitorados estão acima do ponto de segurança.`,
      valor: '100% OK',
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRODUTOS
  // ═══════════════════════════════════════════════════════════════════════════

  // Produtos parados (estoque > 0, com histórico de vendas, sem venda nos últimos 30 dias)
  const skusRecentes = new Set(pedidosUlt30.map((p) => p.sku));
  const skusComVenda = new Set(pedidosAtivos.map((p) => p.sku));
  const parados = produtosAtivos.filter(
    (p) => p.estoqueAtual > 0 && skusComVenda.has(p.sku) && !skusRecentes.has(p.sku)
  );
  if (parados.length > 0) {
    insights.push({
      id: id('p-parado'),
      tipo: 'atencao',
      categoria: 'produtos',
      titulo: `${parados.length} produto${parados.length > 1 ? 's' : ''} parado${parados.length > 1 ? 's' : ''}`,
      descricao: `${parados
        .slice(0, 3)
        .map((p) => `"${p.nome.slice(0, 22)}"`)
        .join(
          ', '
        )}${parados.length > 3 ? ` e mais ${parados.length - 3}` : ''} sem venda nos últimos 30 dias, mas com estoque disponível.`,
      valor: `${parados.length} SKU${parados.length > 1 ? 's' : ''}`,
    });
  }

  // Concentração de receita (1 SKU > 40%)
  const rankingUlt30 = getRankingProdutos(pedidosUlt30);
  if (rankingUlt30.length > 0 && rankingUlt30[0].percentReceita > 40) {
    insights.push({
      id: id('p-concentrado'),
      tipo: 'atencao',
      categoria: 'produtos',
      titulo: 'Concentração de receita',
      descricao: `"${rankingUlt30[0].produto.slice(0, 35)}" responde por ${rankingUlt30[0].percentReceita.toFixed(1)}% da receita dos últimos 30 dias — risco de dependência de um único SKU.`,
      valor: `${rankingUlt30[0].percentReceita.toFixed(1)}%`,
    });
  }

  // Diversificação saudável (nenhum SKU > 25% e 5+ SKUs ativos)
  if (rankingUlt30.length >= 5 && rankingUlt30[0].percentReceita < 25) {
    insights.push({
      id: id('p-diversificado'),
      tipo: 'positivo',
      categoria: 'produtos',
      titulo: 'Receita bem distribuída',
      descricao: `Nenhum SKU representa mais de ${rankingUlt30[0].percentReceita.toFixed(1)}% da receita — portfólio equilibrado e resiliente a rupturas pontuais.`,
      valor: `Top: ${rankingUlt30[0].percentReceita.toFixed(1)}%`,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // METAS
  // ═══════════════════════════════════════════════════════════════════════════

  if (configuracoes.metaFaturamento && h0) {
    const prog = (h0.faturamentoBruto / configuracoes.metaFaturamento) * 100;
    const mesNome = new Date(h0.mesAno + '-02').toLocaleString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });
    if (prog >= 100) {
      insights.push({
        id: id('g-ok'),
        tipo: 'positivo',
        categoria: 'metas',
        titulo: 'Meta de faturamento atingida',
        descricao: `Em ${mesNome}: ${fmt(h0.faturamentoBruto)} — ${prog.toFixed(0)}% da meta de ${fmt(configuracoes.metaFaturamento)}.`,
        valor: `${prog.toFixed(0)}%`,
      });
    } else if (prog < 90) {
      insights.push({
        id: id('g-miss'),
        tipo: prog < 75 ? 'critico' : 'atencao',
        categoria: 'metas',
        titulo: 'Meta de faturamento não atingida',
        descricao: `Em ${mesNome}: ${fmt(h0.faturamentoBruto)} de ${fmt(configuracoes.metaFaturamento)} (${prog.toFixed(0)}% da meta).`,
        valor: `${prog.toFixed(0)}%`,
      });
    }
  }

  if (configuracoes.metaMargem && h0 && h0.margemPercentual < configuracoes.metaMargem * 0.9) {
    insights.push({
      id: id('g-margem'),
      tipo: 'atencao',
      categoria: 'metas',
      titulo: 'Margem abaixo da meta',
      descricao: `Margem de ${h0.margemPercentual.toFixed(1)}% em ${new Date(h0.mesAno + '-02').toLocaleString('pt-BR', { month: 'long' })} — meta definida: ${configuracoes.metaMargem.toFixed(1)}%.`,
      valor: `${h0.margemPercentual.toFixed(1)}% vs ${configuracoes.metaMargem}%`,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CAPITAL DE GIRO
  // ═══════════════════════════════════════════════════════════════════════════

  const capitalEstoque = getCapitalEstoque(produtosAtivos);
  const lucroMensal = h0?.lucroLiquido ?? 0;
  if (lucroMensal > 0 && capitalEstoque > lucroMensal * 4) {
    const meses = (capitalEstoque / lucroMensal).toFixed(1);
    insights.push({
      id: id('w-capital'),
      tipo: 'atencao',
      categoria: 'giro',
      titulo: 'Capital alto imobilizado em estoque',
      descricao: `${fmt(capitalEstoque)} em estoque — equivalente a ${meses} meses de lucro líquido. Considere reduzir o estoque de itens de giro lento.`,
      valor: `${meses}× lucro`,
    });
  }

  // ── Ordenar: critico → atencao → positivo ────────────────────────────────
  return insights.sort((a, b) => TIPO_PRIORITY[a.tipo] - TIPO_PRIORITY[b.tipo]);
}

// Retorna apenas os N mais prioritários para o banner do Dashboard
export function getTopInsights(insights: Insight[], n = 3): Insight[] {
  return insights.slice(0, n);
}
