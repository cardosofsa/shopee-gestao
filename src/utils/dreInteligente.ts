import type { Configuracoes, HistoricoMensal, Pedido, Produto } from '../types';
import { fmt } from './calculations';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PontoForte {
  id: string;
  texto: string;
  valor?: string;
}

export interface PontoAtencao {
  id: string;
  texto: string;
  valor?: string;
}

export type UrgenciaRec = 'alta' | 'media' | 'baixa';

export interface Recomendacao {
  id: string;
  urgencia: UrgenciaRec;
  acao: string;
  racional: string;
  impacto?: string;
}

export interface AnaliseGestorOp {
  pontosFortes: PontoForte[];
  pontosAtencao: PontoAtencao[];
  recomendacoes: Recomendacao[];
}

// Subset do retorno de computarDRE() em DRE.tsx
export interface DreSummary {
  receitaBruta: number;
  cmv: number;
  taxas: number;
  ads: number;
  das: number;
  despesasTotal: number;
  lucroOpBruto: number;
  resultado: number;
  margem: number;
  margemOp: number;
  pedidosQtd: number;
}

// ── Velocidade de venda — sempre os últimos 30 dias reais (hoje − 30) ─────────
// Ruptura é um estado atual, não histórico. Não ancoramos ao mês selecionado.

function velocidadePorSku(pedidos: Pedido[]): Map<string, number> {
  const d30Ago = new Date();
  d30Ago.setDate(d30Ago.getDate() - 30);
  const limStr = d30Ago.toISOString().slice(0, 10);

  const map = new Map<string, number>();
  for (const p of pedidos) {
    if (p.data < limStr) continue;
    if (p.status !== 'Concluído' && p.status !== 'Enviado') continue;
    map.set(p.sku, (map.get(p.sku) ?? 0) + p.unidadesEstoque);
  }
  const velDia = new Map<string, number>();
  for (const [sku, total] of map) velDia.set(sku, total / 30);
  return velDia;
}

// ── Receita por SKU (mês) ─────────────────────────────────────────────────────

function receitaPorSku(pedidos: Pedido[], mes: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of pedidos) {
    if (!p.data.startsWith(mes)) continue;
    if (p.status !== 'Concluído' && p.status !== 'Enviado') continue;
    map.set(p.sku, (map.get(p.sku) ?? 0) + p.receita);
  }
  return map;
}

// ── Margem por SKU (mês) ──────────────────────────────────────────────────────

function margemPorSku(pedidos: Pedido[], mes: string): Map<string, number> {
  const recMap: Map<string, number> = new Map();
  const lucMap: Map<string, number> = new Map();
  for (const p of pedidos) {
    if (!p.data.startsWith(mes)) continue;
    if (p.status !== 'Concluído' && p.status !== 'Enviado') continue;
    recMap.set(p.sku, (recMap.get(p.sku) ?? 0) + p.receita);
    lucMap.set(p.sku, (lucMap.get(p.sku) ?? 0) + p.lucroOperacional);
  }
  const result = new Map<string, number>();
  for (const [sku, rec] of recMap) {
    result.set(sku, rec > 0 ? ((lucMap.get(sku) ?? 0) / rec) * 100 : 0);
  }
  return result;
}

// ── Produtos parados (com estoque, sem venda nos últimos 30 dias reais) ───────

function produtosParados(pedidos: Pedido[], produtos: Produto[]): Produto[] {
  const d30Ago = new Date();
  d30Ago.setDate(d30Ago.getDate() - 30);
  const limStr = d30Ago.toISOString().slice(0, 10);

  const skusRecentes = new Set<string>();
  for (const p of pedidos) {
    if (p.data >= limStr && (p.status === 'Concluído' || p.status === 'Enviado'))
      skusRecentes.add(p.sku);
  }
  const skusComHistorico = new Set(pedidos.map((p) => p.sku));

  return produtos.filter(
    (p) =>
      p.ativo !== false &&
      p.estoqueAtual > 0 &&
      skusComHistorico.has(p.sku) &&
      !skusRecentes.has(p.sku)
  );
}

// ── Engine principal ──────────────────────────────────────────────────────────

export function generateAnaliseGestorOp(params: {
  dre: DreSummary;
  dreAnt: DreSummary;
  historico: HistoricoMensal[]; // reservado para fases futuras (tendências multi-mês)
  produtos: Produto[];
  pedidos: Pedido[];
  configuracoes: Configuracoes;
  mes: string;
}): AnaliseGestorOp {
  const { dre, dreAnt, produtos, pedidos, configuracoes, mes } = params;

  const pontosFortes: PontoForte[] = [];
  const pontosAtencao: PontoAtencao[] = [];
  const recomendacoes: Recomendacao[] = [];
  let seq = 0;
  // Inclui o mês no ID para que dismiss de um mês não afete outro mês
  const uid = (prefix: string) => `${mes}__${prefix}-${++seq}`;

  const produtosAtivos = produtos.filter((p) => p.ativo !== false);
  const velDia = velocidadePorSku(pedidos);
  const recSku = receitaPorSku(pedidos, mes);
  const margemSku = margemPorSku(pedidos, mes);

  // ACOS do mês atual (pedidos live)
  const acosAtual = dre.receitaBruta > 0 ? (dre.ads / dre.receitaBruta) * 100 : 0;
  const acosAnt = dreAnt.receitaBruta > 0 ? (dreAnt.ads / dreAnt.receitaBruta) * 100 : 0;

  // Ticket médio
  const ticket = dre.pedidosQtd > 0 ? dre.receitaBruta / dre.pedidosQtd : 0;
  const ticketAnt = dreAnt.pedidosQtd > 0 ? dreAnt.receitaBruta / dreAnt.pedidosQtd : 0;

  // Variação receita
  const dRecPct =
    dreAnt.receitaBruta > 0
      ? ((dre.receitaBruta - dreAnt.receitaBruta) / dreAnt.receitaBruta) * 100
      : 0;

  // Variação margem (pp)
  const dMargem = dre.margem - dreAnt.margem;

  // Variação resultado
  const dResulPct =
    dreAnt.resultado !== 0
      ? ((dre.resultado - dreAnt.resultado) / Math.abs(dreAnt.resultado)) * 100
      : 0;

  // ── PONTOS FORTES ───────────────────────────────────────────────────────────

  if (dreAnt.receitaBruta > 0 && dRecPct >= 5) {
    pontosFortes.push({
      id: uid('pf-rec'),
      texto: `Receita crescendo ${dRecPct.toFixed(1)}% vs mês anterior`,
      valor: `+${dRecPct.toFixed(1)}%`,
    });
  }

  if (dreAnt.margem !== 0 && dMargem >= 2) {
    pontosFortes.push({
      id: uid('pf-marg'),
      texto: `Margem melhorou ${dMargem.toFixed(1)} p.p. — de ${dreAnt.margem.toFixed(1)}% para ${dre.margem.toFixed(1)}%`,
      valor: `+${dMargem.toFixed(1)}p.p.`,
    });
  }

  if (dre.resultado > 0) {
    if (dreAnt.resultado > 0 && dResulPct >= 10) {
      pontosFortes.push({
        id: uid('pf-resul'),
        texto: `Resultado líquido positivo e crescendo ${dResulPct.toFixed(0)}% vs mês anterior`,
        valor: fmt(dre.resultado),
      });
    } else if (dreAnt.resultado <= 0) {
      pontosFortes.push({
        id: uid('pf-virou'),
        texto: `Virou para lucro: ${fmt(dre.resultado)} no período (estava negativo no mês anterior)`,
        valor: fmt(dre.resultado),
      });
    }
  }

  if (acosAtual > 0 && acosAtual <= 8) {
    pontosFortes.push({
      id: uid('pf-acos'),
      texto: `ACOS saudável: ${acosAtual.toFixed(1)}% — ads eficientes`,
      valor: `${acosAtual.toFixed(1)}%`,
    });
  }

  const despPct = dre.receitaBruta > 0 ? (dre.despesasTotal / dre.receitaBruta) * 100 : 0;
  if (dre.receitaBruta > 0 && despPct < 15 && dre.despesasTotal > 0) {
    pontosFortes.push({
      id: uid('pf-desp'),
      texto: `Despesas operacionais controladas: ${despPct.toFixed(1)}% da receita`,
      valor: `${despPct.toFixed(1)}%`,
    });
  }

  // Meta de lucro
  if (configuracoes.metaLucro && dre.resultado >= configuracoes.metaLucro) {
    const prog = (dre.resultado / configuracoes.metaLucro) * 100;
    pontosFortes.push({
      id: uid('pf-meta'),
      texto: `Meta de lucro atingida: ${fmt(dre.resultado)} (${prog.toFixed(0)}% da meta)`,
      valor: `${prog.toFixed(0)}%`,
    });
  }

  // Ticket médio subindo
  if (ticketAnt > 0 && ticket > 0) {
    const dTicket = ((ticket - ticketAnt) / ticketAnt) * 100;
    if (dTicket >= 5) {
      pontosFortes.push({
        id: uid('pf-ticket'),
        texto: `Ticket médio subiu ${dTicket.toFixed(1)}%: de ${fmt(ticketAnt)} para ${fmt(ticket)}`,
        valor: `+${dTicket.toFixed(1)}%`,
      });
    }
  }

  // ── PONTOS DE ATENÇÃO ───────────────────────────────────────────────────────

  if (dreAnt.receitaBruta > 0 && dRecPct <= -5) {
    pontosAtencao.push({
      id: uid('pa-rec'),
      texto: `Receita caiu ${Math.abs(dRecPct).toFixed(1)}% vs mês anterior: ${fmt(dre.receitaBruta)} vs ${fmt(dreAnt.receitaBruta)}`,
      valor: `${dRecPct.toFixed(1)}%`,
    });
  }

  if (dreAnt.margem !== 0 && dMargem <= -3) {
    pontosAtencao.push({
      id: uid('pa-marg'),
      texto: `Margem caiu ${Math.abs(dMargem).toFixed(1)} p.p. — de ${dreAnt.margem.toFixed(1)}% para ${dre.margem.toFixed(1)}%`,
      valor: `${dMargem.toFixed(1)}p.p.`,
    });
  }

  if (dre.resultado < 0) {
    pontosAtencao.push({
      id: uid('pa-prej'),
      texto: `Resultado negativo no período: prejuízo de ${fmt(Math.abs(dre.resultado))}`,
      valor: fmt(dre.resultado),
    });
  }

  if (acosAtual > 12) {
    pontosAtencao.push({
      id: uid('pa-acos'),
      texto: `ACOS alto: ${acosAtual.toFixed(1)}% — ads consumindo parte relevante da receita`,
      valor: `${acosAtual.toFixed(1)}%`,
    });
  }

  const cmvPct = dre.receitaBruta > 0 ? (dre.cmv / dre.receitaBruta) * 100 : 0;
  if (cmvPct > 65) {
    pontosAtencao.push({
      id: uid('pa-cmv'),
      texto: `CMV alto: ${cmvPct.toFixed(1)}% da receita — custo de produto elevado`,
      valor: `${cmvPct.toFixed(1)}%`,
    });
  }

  if (dre.receitaBruta > 0 && despPct > 20) {
    pontosAtencao.push({
      id: uid('pa-desp'),
      texto: `Despesas operacionais altas: ${despPct.toFixed(1)}% da receita`,
      valor: `${despPct.toFixed(1)}%`,
    });
  }

  if (dreAnt.resultado !== 0 && dResulPct <= -10 && dre.resultado > 0) {
    pontosAtencao.push({
      id: uid('pa-resul'),
      texto: `Resultado caiu ${Math.abs(dResulPct).toFixed(0)}% vs mês anterior`,
      valor: `${dResulPct.toFixed(0)}%`,
    });
  }

  // Meta faturamento não atingida
  if (configuracoes.metaFaturamento && dre.receitaBruta > 0) {
    const prog = (dre.receitaBruta / configuracoes.metaFaturamento) * 100;
    if (prog < 90) {
      pontosAtencao.push({
        id: uid('pa-meta'),
        texto: `Meta de faturamento não atingida: ${fmt(dre.receitaBruta)} de ${fmt(configuracoes.metaFaturamento)} (${prog.toFixed(0)}%)`,
        valor: `${prog.toFixed(0)}%`,
      });
    }
  }

  // ── RECOMENDAÇÕES ───────────────────────────────────────────────────────────

  // R1: Ruptura iminente
  interface RupturaInfo {
    nome: string;
    sku: string;
    dias: number;
    receitaSemana: number;
  }
  const rupturas: RupturaInfo[] = [];
  for (const prod of produtosAtivos) {
    const vel = velDia.get(prod.sku) ?? 0;
    if (vel > 0 && prod.estoqueAtual > 0) {
      const dias = prod.estoqueAtual / vel;
      if (dias < 7) {
        const receitaSemana = ((recSku.get(prod.sku) ?? 0) / 30) * 7;
        rupturas.push({ nome: prod.nome, sku: prod.sku, dias: Math.ceil(dias), receitaSemana });
      }
    } else if (prod.estoqueAtual === 0 && vel > 0) {
      // Já zerado
      const receitaSemana = ((recSku.get(prod.sku) ?? 0) / 30) * 7;
      rupturas.push({ nome: prod.nome, sku: prod.sku, dias: 0, receitaSemana });
    }
  }
  rupturas.sort((a, b) => a.dias - b.dias);

  if (rupturas.length > 0) {
    const top = rupturas[0];
    const vel = velDia.get(top.sku) ?? 0;
    const prod = produtosAtivos.find((p) => p.sku === top.sku);

    let acao: string;
    if (rupturas.length > 1) {
      acao = `Reponha ${rupturas.length} SKU(s) com ruptura iminente. Prioritário: "${top.nome.slice(0, 30)}" (~${top.dias} dia(s))`;
    } else if (top.dias === 0) {
      acao = `Reponha "${top.nome.slice(0, 40)}" imediatamente — estoque zerado`;
    } else {
      acao = `Reponha "${top.nome.slice(0, 40)}" esta semana — ruptura em ~${top.dias} dia(s)`;
    }

    const racional =
      top.dias === 0
        ? `Estoque zerado. Velocidade de venda: ${vel.toFixed(1)} un/dia. Receita em risco: ${fmt(top.receitaSemana)}/semana.`
        : `Estoque: ${prod?.estoqueAtual ?? 0} un. Velocidade: ${vel.toFixed(1)} un/dia. Ruptura estimada em ~${top.dias} dia(s). Receita em risco: ${fmt(top.receitaSemana)}/semana.`;

    recomendacoes.push({
      id: uid('r-ruptura'),
      urgencia: 'alta',
      acao,
      racional,
      impacto: `Preservar ~${fmt(top.receitaSemana)}/semana em vendas`,
    });
  }

  // R2: ACOS alto
  if (acosAtual > 12) {
    const economiaP2p = dre.receitaBruta * ((acosAtual - 10) / 100);
    recomendacoes.push({
      id: uid('r-acos'),
      urgencia: acosAtual > 15 || (acosAnt > 12 && acosAtual > 12) ? 'alta' : 'media',
      acao: `Revise as campanhas Shopee Ads — ACOS em ${acosAtual.toFixed(1)}%, acima do limite de 10%`,
      racional: `Ads consumiram ${fmt(dre.ads)} (${acosAtual.toFixed(1)}%) da receita este mês. Reduzir para 10% liberaria ${fmt(economiaP2p)}/mês — sem perda de receita se a segmentação for ajustada.`,
      impacto: `Potencial de +${fmt(economiaP2p)}/mês no resultado`,
    });
  }

  // R3: Reservar DAS do próximo mês
  if (dre.resultado > 0 && configuracoes.aliquotaDAS > 0) {
    const dasProx = dre.receitaBruta * (configuracoes.aliquotaDAS / 100);
    recomendacoes.push({
      id: uid('r-das'),
      urgencia: 'media',
      acao: `Reserve ${fmt(dasProx)} para o DAS do próximo mês`,
      racional: `Com receita de ${fmt(dre.receitaBruta)} e alíquota de ${configuracoes.aliquotaDAS}%, o DAS do próximo recolhimento será ~${fmt(dasProx)}. Guardar agora evita aperto de caixa no vencimento.`,
    });
  }

  // R4: Produtos parados
  const parados = produtosParados(pedidos, produtosAtivos);
  if (parados.length > 0) {
    const capitalParado = parados.reduce((s, p) => s + p.estoqueAtual * p.custoUnitario, 0);
    recomendacoes.push({
      id: uid('r-parado'),
      urgencia: 'baixa',
      acao: `Crie uma promoção para ${parados.length} produto(s) parado(s) há mais de 30 dias`,
      racional: `${parados
        .slice(0, 3)
        .map((p) => `"${p.nome.slice(0, 25)}"`)
        .join(
          ', '
        )}${parados.length > 3 ? ` e mais ${parados.length - 3}` : ''} sem venda recente, mas com estoque disponível. Capital imobilizado: ${fmt(capitalParado)}.`,
      impacto: `Liberar ${fmt(capitalParado)} em caixa para reposição de best-sellers`,
    });
  }

  // R5: Reinvestir em produto de alta margem e alto giro
  const candidatos: Array<{ sku: string; nome: string; margem: number; rec: number }> = [];
  for (const [sku, m] of margemSku) {
    const rec = recSku.get(sku) ?? 0;
    if (m > 20 && rec > 0) {
      const prod = produtosAtivos.find((p) => p.sku === sku);
      if (prod) candidatos.push({ sku, nome: prod.nome, margem: m, rec });
    }
  }
  candidatos.sort((a, b) => b.rec - a.rec);
  if (candidatos.length > 0) {
    const top = candidatos[0];
    recomendacoes.push({
      id: uid('r-invest'),
      urgencia: 'baixa',
      acao: `Aumente o estoque de "${top.nome.slice(0, 35)}" — margem de ${top.margem.toFixed(1)}% e alto giro`,
      racional: `Com ${fmt(top.rec)} em receita este mês e margem de ${top.margem.toFixed(1)}%, esse produto é o investimento de menor risco${acosAtual > 10 ? ` — retorno maior que manter ACOS em ${acosAtual.toFixed(1)}%` : ''}.`,
    });
  }

  // R6: CMV alto
  if (cmvPct > 65 && dre.receitaBruta > 500) {
    const meta = dre.receitaBruta * 0.5;
    const economia = dre.cmv - meta;
    recomendacoes.push({
      id: uid('r-cmv'),
      urgencia: 'media',
      acao: `Renegocie com fornecedores: CMV em ${cmvPct.toFixed(1)}% da receita`,
      racional: `Referência saudável para Shopee: CMV ≤ 50% da receita. Hoje ${fmt(dre.cmv)} de ${fmt(dre.receitaBruta)}. Uma redução de 5 p.p. no CMV equivaleria a +${fmt(dre.receitaBruta * 0.05)} no resultado mensal.`,
      impacto: `Reduzir CMV para 50% liberaria ~${fmt(economia)}/mês`,
    });
  }

  // Ordenar recomendações: alta → media → baixa
  const urgOrd: Record<UrgenciaRec, number> = { alta: 0, media: 1, baixa: 2 };
  recomendacoes.sort((a, b) => urgOrd[a.urgencia] - urgOrd[b.urgencia]);

  return { pontosFortes, pontosAtencao, recomendacoes };
}
