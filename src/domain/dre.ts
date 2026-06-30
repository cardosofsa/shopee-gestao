import type { Despesa, Pedido } from '../types';

export interface DREResult {
  mesAno: string;
  faturamentoBruto: number;
  descontos: number;
  receitaLiquida: number;
  pedidosQtd: number;
  ticketMedio: number;
  unidadesVendidas: number;
  cmv: number;
  taxasShopee: number;
  dasImposto: number;
  marketingAds: number;
  despesasOperacionais: number;
  lucroBruto: number;
  lucroOperacional: number;
  lucroLiquido: number;
  margemPercentual: number;
}

/**
 * DAS é acumulado de `pedido.dasImposto` (já deduzido por pedido), não recalculado da alíquota.
 * Hierarquia: faturamentoBruto → descontos → receitaLiquida → lucroBruto → lucroOperacional → lucroLiquido
 */
export function computeDRE(pedidos: Pedido[], despesas: Despesa[], mesAno: string): DREResult {
  const doMes = pedidos.filter(
    (p) => p.data.startsWith(mesAno) && (p.status === 'Concluído' || p.status === 'Enviado')
  );

  const faturamentoBruto = doMes.reduce((s, p) => s + p.receita, 0);
  const descontos = doMes.reduce((s, p) => s + p.desconto, 0);
  const receitaLiquida = faturamentoBruto - descontos;
  const cmv = doMes.reduce((s, p) => s + p.custoTotal, 0);
  const taxasShopee = doMes.reduce((s, p) => s + p.taxaShopee, 0);
  const marketingAds = doMes.reduce((s, p) => s + p.adsMarketing, 0);
  const dasImposto = doMes.reduce((s, p) => s + p.dasImposto, 0);
  const despesasOperacionais = despesas
    .filter((d) => d.data.startsWith(mesAno))
    .reduce((s, d) => s + d.valor, 0);

  const lucroBruto = receitaLiquida - cmv;
  const lucroOperacional = lucroBruto - taxasShopee - marketingAds;
  const lucroLiquido = lucroOperacional - dasImposto - despesasOperacionais;
  const margemPercentual = faturamentoBruto > 0 ? (lucroLiquido / faturamentoBruto) * 100 : 0;
  const pedidosQtd = doMes.length;
  const ticketMedio = pedidosQtd > 0 ? faturamentoBruto / pedidosQtd : 0;
  const unidadesVendidas = doMes.reduce((s, p) => s + p.unidadesEstoque, 0);

  return {
    mesAno,
    faturamentoBruto,
    descontos,
    receitaLiquida,
    pedidosQtd,
    ticketMedio,
    unidadesVendidas,
    cmv,
    taxasShopee,
    dasImposto,
    marketingAds,
    despesasOperacionais,
    lucroBruto,
    lucroOperacional,
    lucroLiquido,
    margemPercentual,
  };
}
