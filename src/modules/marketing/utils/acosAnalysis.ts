import type { Configuracoes, HistoricoMensal, Pedido } from '../../../types';

export type AcosRating = 'excelente' | 'bom' | 'atencao' | 'critico';

export const ACOS_THRESHOLDS = {
  excelente: 8,
  bom: 10,
  critico: 12,
  referencia: 10,
} as const;

export interface MesAcos {
  mesAno: string;
  label: string;
  acos: number;
  ads: number;
  receita: number;
  pedidos: number;
}

export interface AcosAnalise {
  acosAtual: number;
  rating: AcosRating;
  benchmarkInterno: number;
  hasHistorico: boolean;
  deltaVsBenchmark: number;
  adsTotal: number;
  receitaTotal: number;
  pedidosQtd: number;
  custoPorPedido: number;
  custoPorCem: number;
  investimentoMaximo: number;
  saldoDisponivel: number;
  custoExtraVsBenchmark: number;
  serie12m: MesAcos[];
  isMesAtivo: boolean;
  margemAtualPct: number | null;
}

const MES_LABEL = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

function toLabel(mesAno: string): string {
  const m = parseInt(mesAno.split('-')[1] ?? '1', 10);
  return MES_LABEL[m - 1] ?? mesAno;
}

export function getAcosRating(acos: number): AcosRating {
  if (acos <= ACOS_THRESHOLDS.excelente) return 'excelente';
  if (acos <= ACOS_THRESHOLDS.bom) return 'bom';
  if (acos <= ACOS_THRESHOLDS.critico) return 'atencao';
  return 'critico';
}

export function computeAcosAnalise(params: {
  pedidos: Pedido[];
  historico: HistoricoMensal[];
  configuracoes: Configuracoes;
  mes: string;
}): AcosAnalise {
  const { pedidos, historico, configuracoes, mes } = params;

  const hoje = new Date();
  const mesAtivo = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  const isMesAtivo = mes === mesAtivo;

  let acosAtual: number;
  let adsTotal: number;
  let receitaTotal: number;
  let pedidosQtd: number;
  let margemAtualPct: number | null = null;

  const histMes = historico.find((h) => h.mesAno === mes);

  if (histMes) {
    receitaTotal = histMes.faturamentoBruto;
    adsTotal = histMes.marketingAds;
    pedidosQtd = histMes.pedidosQtd;
    acosAtual = receitaTotal > 0 ? (adsTotal / receitaTotal) * 100 : 0;
    margemAtualPct = histMes.margemPercentual;
  } else {
    const pedMes = pedidos.filter((p) => p.data.startsWith(mes));
    receitaTotal = pedMes.reduce((s, p) => s + p.receita, 0);
    pedidosQtd = pedMes.length;
    acosAtual = configuracoes.percentualMarketing;
    adsTotal = (receitaTotal * configuracoes.percentualMarketing) / 100;
  }

  const sorted = [...historico].sort((a, b) => a.mesAno.localeCompare(b.mesAno)).slice(-12);

  const serie12m: MesAcos[] = sorted.map((h) => ({
    mesAno: h.mesAno,
    label: toLabel(h.mesAno),
    acos: h.faturamentoBruto > 0 ? (h.marketingAds / h.faturamentoBruto) * 100 : 0,
    ads: h.marketingAds,
    receita: h.faturamentoBruto,
    pedidos: h.pedidosQtd,
  }));

  const mesesRef = serie12m.filter((m) => m.receita > 0 && m.mesAno !== mes);
  const hasHistorico = mesesRef.length >= 2;
  const benchmarkInterno = hasHistorico
    ? mesesRef.reduce((s, m) => s + m.acos, 0) / mesesRef.length
    : 0;

  const investimentoMaximo = (receitaTotal * ACOS_THRESHOLDS.referencia) / 100;
  const saldoDisponivel = investimentoMaximo - adsTotal;

  return {
    acosAtual,
    rating: getAcosRating(acosAtual),
    benchmarkInterno,
    hasHistorico,
    deltaVsBenchmark: hasHistorico ? acosAtual - benchmarkInterno : 0,
    adsTotal,
    receitaTotal,
    pedidosQtd,
    custoPorPedido: pedidosQtd > 0 ? adsTotal / pedidosQtd : 0,
    custoPorCem: acosAtual,
    investimentoMaximo,
    saldoDisponivel,
    custoExtraVsBenchmark: hasHistorico ? ((acosAtual - benchmarkInterno) / 100) * receitaTotal : 0,
    serie12m,
    isMesAtivo,
    margemAtualPct,
  };
}

export interface ProjecaoAcos {
  deltaPct: number;
  novaReceita: number;
  deltaReceita: number;
  novoAds: number;
}

// ROAS constante: receita e ads escalam proporcionalmente ao aumento de investimento
export function computeProjecao(analise: AcosAnalise, deltaPct: number): ProjecaoAcos {
  const { receitaTotal, adsTotal } = analise;
  const novaReceita = receitaTotal * (1 + deltaPct / 100);
  const novoAds = adsTotal * (1 + deltaPct / 100);
  return { deltaPct, novaReceita, deltaReceita: novaReceita - receitaTotal, novoAds };
}
