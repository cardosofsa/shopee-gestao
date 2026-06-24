import type { Pedido, Produto, RankingProduto, StatusEstoque } from '../types';

export const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export const fmtPct = (v: number) => `${v.toFixed(1)}%`;

export const fmtNum = (v: number) => new Intl.NumberFormat('pt-BR').format(v);

export function calcularLucroOperacional(
  receita: number,
  desconto: number,
  custoTotal: number,
  taxaShopee: number,
  das: number,
  ads: number
): number {
  return receita - desconto - custoTotal - taxaShopee - das - ads;
}

export function calcularTaxaShopee(receita: number, percentual = 0.2): number {
  return receita * percentual;
}

export function calcularAds(receita: number, percentual = 0.02): number {
  return receita * percentual;
}

// For pricing calculator
export function calcularPrecoIdeal(params: {
  custo: number;
  margemDesejada: number; // decimal, e.g. 0.30
  comissaoShopee: number; // decimal
  taxaFixa: number;
  percentualAds: number; // decimal
  aliquotaDAS: number; // decimal
}): { precoVenda: number; lucroLiquido: number; margemReal: number } {
  const { custo, margemDesejada, comissaoShopee, taxaFixa, percentualAds, aliquotaDAS } = params;
  // preço = custo / (1 - comissão - ads - das - margemDesejada)
  const denominador = 1 - comissaoShopee - percentualAds - aliquotaDAS - margemDesejada;
  if (denominador <= 0) return { precoVenda: 0, lucroLiquido: 0, margemReal: 0 };
  const precoVenda = (custo + taxaFixa) / denominador;
  const taxaShopee = precoVenda * comissaoShopee + taxaFixa;
  const ads = precoVenda * percentualAds;
  const das = precoVenda * aliquotaDAS;
  const lucroLiquido = precoVenda - custo - taxaShopee - ads - das;
  const margemReal = lucroLiquido / precoVenda;
  return { precoVenda, lucroLiquido, margemReal };
}

export function getRankingProdutos(pedidos: Pedido[]): RankingProduto[] {
  const concluidos = pedidos.filter((p) => p.status === 'Concluído' || p.status === 'Enviado');
  const map = new Map<string, RankingProduto>();

  const totalReceita = concluidos.reduce((s, p) => s + p.receita, 0);

  for (const pedido of concluidos) {
    const key = pedido.sku;
    const existing = map.get(key);
    if (existing) {
      existing.pedidos += 1;
      existing.unidades += pedido.unidadesEstoque;
      existing.receita += pedido.receita;
      existing.taxaShopee += pedido.taxaShopee;
      existing.lucroOperacional += pedido.lucroOperacional;
    } else {
      map.set(key, {
        sku: pedido.sku,
        produto: pedido.produto,
        loja: pedido.loja,
        pedidos: 1,
        unidades: pedido.unidadesEstoque,
        receita: pedido.receita,
        ticketMedio: 0,
        taxaShopee: pedido.taxaShopee,
        lucroOperacional: pedido.lucroOperacional,
        margem: 0,
        percentReceita: 0,
        curvaABC: '—',
      });
    }
  }

  const ranking = Array.from(map.values()).map((r) => ({
    ...r,
    ticketMedio: r.receita / r.pedidos,
    margem: r.receita > 0 ? (r.lucroOperacional / r.receita) * 100 : 0,
    percentReceita: totalReceita > 0 ? (r.receita / totalReceita) * 100 : 0,
  }));

  ranking.sort((a, b) => b.receita - a.receita);

  // ABC curve: produto que INICIA dentro da faixa 0-80% é A,
  // independente de ultrapassar o limite ao ser adicionado.
  let acum = 0;
  for (const r of ranking) {
    const prevAcum = acum;
    acum += r.percentReceita;
    r.curvaABC = prevAcum < 80 ? 'A' : prevAcum < 95 ? 'B' : 'C';
  }

  return ranking;
}

export function getStatusEstoque(
  estoqueAtual: number,
  vendaDia: number,
  estoqueSeguranca: number
): StatusEstoque {
  if (estoqueAtual === 0) return 'Comprar';
  const diasCobertura = vendaDia > 0 ? estoqueAtual / vendaDia : Infinity;
  if (diasCobertura < 7) return 'Comprar';
  if (estoqueAtual <= estoqueSeguranca || diasCobertura < 30) return 'Estoque Baixo';
  if (isFinite(diasCobertura) && diasCobertura > 90 && estoqueAtual > estoqueSeguranca * 3)
    return 'Estoque Acima';
  return 'Estoque Estável';
}

export function getKPIsMes(pedidos: Pedido[], mes?: string) {
  const agora = mes || new Date().toISOString().slice(0, 7);
  const doMes = pedidos.filter(
    (p) => p.data.startsWith(agora) && (p.status === 'Concluído' || p.status === 'Enviado')
  );
  const faturamento = doMes.reduce((s, p) => s + p.receita, 0);
  const pedidosMes = doMes.length;
  const lucroOp = doMes.reduce((s, p) => s + p.lucroOperacional, 0);
  const ticket = pedidosMes > 0 ? faturamento / pedidosMes : 0;
  const das = doMes.reduce((s, p) => s + p.dasImposto, 0);
  const custoTotal = doMes.reduce((s, p) => s + p.custoTotal, 0);
  const adsTotal = doMes.reduce((s, p) => s + p.adsMarketing, 0);
  const margem = faturamento > 0 ? (lucroOp / faturamento) * 100 : 0;
  const roi = custoTotal > 0 ? (lucroOp / custoTotal) * 100 : 0;
  const roas = adsTotal > 0 ? faturamento / adsTotal : 0;
  return {
    faturamento,
    pedidosMes,
    lucroOp,
    ticket,
    lucroLiquido: lucroOp - das,
    margem,
    custoTotal,
    adsTotal,
    roi,
    roas,
  };
}

export function getMesAnterior(mes: string): string {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getCapitalEstoque(produtos: Produto[]): number {
  return produtos
    .filter((p) => p.ativo ?? true)
    .reduce((s, p) => s + p.estoqueAtual * p.custoUnitario, 0);
}

export function getProjecaoMensal(faturamento: number, mes: string): number | null {
  const hoje = new Date();
  if (mes !== hoje.toISOString().slice(0, 7)) return null;
  const diaAtual = hoje.getDate();
  if (diaAtual < 1) return null;
  const [y, m] = mes.split('-').map(Number);
  const diasNoMes = new Date(y, m, 0).getDate();
  return (faturamento / diaAtual) * diasNoMes;
}

export function agruparPorDia(pedidos: Pedido[], mes: string) {
  const map = new Map<string, { receita: number; lucro: number; pedidos: number }>();
  for (const p of pedidos) {
    if (!p.data.startsWith(mes)) continue;
    if (p.status !== 'Concluído' && p.status !== 'Enviado') continue;
    const dia = p.data.slice(8, 10);
    const prev = map.get(dia) || { receita: 0, lucro: 0, pedidos: 0 };
    map.set(dia, {
      receita: prev.receita + p.receita,
      lucro: prev.lucro + p.lucroOperacional,
      pedidos: prev.pedidos + 1,
    });
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dia, d]) => ({ name: `${dia}/${mes.slice(5, 7)}`, ...d }));
}
