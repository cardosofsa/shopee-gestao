import { useMemo } from 'react';
import { useStore } from '../store';
import { fmt, getKPIsMes } from '../utils/calculations';

export type Severidade = 'critico' | 'aviso' | 'info';
export type Categoria  = 'estoque' | 'produtos' | 'fiscal' | 'desempenho' | 'financeiro';

export interface AlertaItem {
  id: string;
  severidade: Severidade;
  categoria: Categoria;
  titulo: string;
  descricao: string;
  link?: string;
  valor?: string;
}

export function useAlertas(): AlertaItem[] {
  const pedidosAll    = useStore((s) => s.pedidos);
  const produtosAll   = useStore((s) => s.produtos);
  const historicoAll  = useStore((s) => s.historico);
  const configuracoes = useStore((s) => s.configuracoes);
  const lojaFiltro    = useStore((s) => s.lojaFiltro);
  const contasPagar   = useStore((s) => s.contasPagar);

  const pedidos = useMemo(
    () => lojaFiltro
      ? pedidosAll.filter((p) => p.loja === lojaFiltro || p.loja === 'Ambas')
      : pedidosAll,
    [pedidosAll, lojaFiltro],
  );

  return useMemo(() => {
    const alertas: AlertaItem[] = [];
    const hoje      = new Date();
    const mesMes    = hoje.toISOString().slice(0, 7);
    const diaAtual  = hoje.getDate();
    const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
    const corte30d  = new Date(hoje.getTime() - 30 * 86400000).toISOString().slice(0, 10);

    const pedidos30 = pedidos.filter(
      (p) => p.data >= corte30d && (p.status === 'Concluído' || p.status === 'Enviado'),
    );

    const unidadesPorSku = new Map<string, number>();
    const lucroPorSku    = new Map<string, number>();
    for (const p of pedidos30) {
      unidadesPorSku.set(p.sku, (unidadesPorSku.get(p.sku) ?? 0) + p.unidadesEstoque);
      lucroPorSku.set(p.sku, (lucroPorSku.get(p.sku) ?? 0) + p.lucroOperacional);
    }

    // 1. Estoque
    for (const prod of produtosAll.filter((p) => p.ativo)) {
      const vdDia   = (unidadesPorSku.get(prod.sku) ?? 0) / 30;
      const diasCob = vdDia > 0 ? prod.estoqueAtual / vdDia : Infinity;
      if (prod.estoqueAtual <= 0) {
        alertas.push({
          id: `est-zero-${prod.sku}`, severidade: 'critico', categoria: 'estoque',
          titulo: `Estoque zerado — ${prod.nome}`,
          descricao: `SKU ${prod.sku} · sem unidades disponíveis para venda`,
          link: `/estoque/${prod.sku}`, valor: '0 un.',
        });
      } else if ((prod.estoqueAtual <= prod.estoqueSeguranca && prod.estoqueSeguranca > 0) || diasCob < 5) {
        alertas.push({
          id: `est-baixo-${prod.sku}`, severidade: 'aviso', categoria: 'estoque',
          titulo: `Estoque crítico — ${prod.nome}`,
          descricao: vdDia > 0
            ? `${prod.estoqueAtual} un. · cobertura estimada de ${diasCob.toFixed(0)} dias`
            : `${prod.estoqueAtual} un. · abaixo do mínimo (${prod.estoqueSeguranca} un.)`,
          link: `/estoque/${prod.sku}`, valor: `${prod.estoqueAtual} un.`,
        });
      }
    }

    // 2. Produtos parados
    for (const prod of produtosAll.filter((p) => p.ativo && p.estoqueAtual > 0)) {
      if (!unidadesPorSku.has(prod.sku)) {
        alertas.push({
          id: `parado-${prod.sku}`, severidade: 'aviso', categoria: 'produtos',
          titulo: `Produto sem giro — ${prod.nome}`,
          descricao: `Sem vendas em 30 dias · ${prod.estoqueAtual} un. paradas`,
          link: `/estoque/${prod.sku}`, valor: `${prod.estoqueAtual} un.`,
        });
      }
    }

    // 3. Margem negativa
    for (const [sku, lucro] of lucroPorSku) {
      if (lucro < 0) {
        const nome = produtosAll.find((p) => p.sku === sku)?.nome ?? sku;
        alertas.push({
          id: `marg-neg-${sku}`, severidade: 'critico', categoria: 'produtos',
          titulo: `Produto com prejuízo — ${nome}`,
          descricao: `Lucro operacional de ${fmt(lucro)} nos últimos 30 dias`,
          link: `/estoque/${sku}`, valor: fmt(lucro),
        });
      }
    }

    // 4. DAS
    const { aliquotaDAS, tipoEmpresa } = configuracoes;
    if (aliquotaDAS > 0) {
      const diasParaDAS = 20 - diaAtual;
      const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toISOString().slice(0, 7);
      const fatMesAnt   = historicoAll.find((h) => h.mesAno === mesAnterior)?.faturamentoBruto ?? 0;
      const dasEstimado = fatMesAnt * (aliquotaDAS / 100);
      if (diasParaDAS >= 0 && diasParaDAS <= 7 && fatMesAnt > 0) {
        alertas.push({
          id: 'das-vencer', severidade: diasParaDAS <= 3 ? 'critico' : 'aviso', categoria: 'fiscal',
          titulo: `DAS vence em ${diasParaDAS} dia${diasParaDAS !== 1 ? 's' : ''}`,
          descricao: `Estimativa: ${fmt(dasEstimado)} · ${tipoEmpresa ?? 'Simples Nacional'} · ${aliquotaDAS}%`,
          valor: fmt(dasEstimado),
        });
      } else if (diasParaDAS < 0 && diaAtual <= 25 && fatMesAnt > 0) {
        alertas.push({
          id: 'das-vencido', severidade: 'critico', categoria: 'fiscal',
          titulo: 'DAS possivelmente em atraso',
          descricao: `Prazo era dia 20 · Estimativa ${fmt(dasEstimado)} · Verifique a Receita Federal`,
          valor: fmt(dasEstimado),
        });
      }
    }

    // 5. Desempenho
    const kpis = getKPIsMes(pedidos, mesMes);
    const { metaFaturamento, metaMargem } = configuracoes;
    if (kpis.pedidosMes > 10 && kpis.margem < 10) {
      alertas.push({
        id: 'margem-mes', severidade: kpis.margem < 0 ? 'critico' : 'aviso', categoria: 'desempenho',
        titulo: kpis.margem < 0 ? 'Prejuízo operacional no mês' : 'Margem abaixo de 10%',
        descricao: `Margem atual de ${kpis.margem.toFixed(1)}% · revise precificação e custos`,
        link: '/financeiro', valor: `${kpis.margem.toFixed(1)}%`,
      });
    }
    if (metaFaturamento && metaFaturamento > 0 && kpis.faturamento > 0 && diaAtual > 3) {
      const projecao = (kpis.faturamento / diaAtual) * diasNoMes;
      const pctMeta  = (kpis.faturamento / metaFaturamento) * 100;
      if (projecao < metaFaturamento && pctMeta < 80) {
        alertas.push({
          id: 'meta-fat', severidade: pctMeta < 50 ? 'critico' : 'aviso', categoria: 'desempenho',
          titulo: 'Meta de faturamento em risco',
          descricao: `Projeção: ${fmt(projecao)} · Meta: ${fmt(metaFaturamento)} · ${pctMeta.toFixed(0)}%`,
          link: '/metas', valor: `${pctMeta.toFixed(0)}%`,
        });
      }
    }
    if (metaMargem && metaMargem > 0 && kpis.pedidosMes > 5 && kpis.margem < metaMargem * 0.8) {
      alertas.push({
        id: 'meta-marg', severidade: 'aviso', categoria: 'desempenho',
        titulo: 'Meta de margem não atingida',
        descricao: `Margem ${kpis.margem.toFixed(1)}% · meta ${metaMargem.toFixed(1)}%`,
        link: '/metas', valor: `${kpis.margem.toFixed(1)}%`,
      });
    }

    // 6. Contas a Pagar
    const todayStr = hoje.toISOString().slice(0, 10);
    for (const c of contasPagar.filter((c) => c.status === 'pendente')) {
      if (lojaFiltro && c.loja !== lojaFiltro && c.loja !== 'Ambas') continue;
      const diff = Math.ceil((new Date(c.vencimento + 'T00:00:00').getTime() - new Date(todayStr + 'T00:00:00').getTime()) / 864e5);
      if (diff < 0) {
        alertas.push({
          id: `conta-venc-${c.id}`, severidade: 'critico', categoria: 'financeiro',
          titulo: `Conta vencida — ${c.descricao}`,
          descricao: `${Math.abs(diff)}d em atraso · ${c.categoria} · ${fmt(c.valor)}`,
          link: '/contas-pagar', valor: fmt(c.valor),
        });
      } else if (diff <= 3) {
        alertas.push({
          id: `conta-urg-${c.id}`, severidade: 'critico', categoria: 'financeiro',
          titulo: `Conta vence em ${diff === 0 ? 'hoje' : `${diff}d`} — ${c.descricao}`,
          descricao: `${c.categoria} · ${fmt(c.valor)}`,
          link: '/contas-pagar', valor: fmt(c.valor),
        });
      } else if (diff <= 7) {
        alertas.push({
          id: `conta-prox-${c.id}`, severidade: 'aviso', categoria: 'financeiro',
          titulo: `Conta vence em ${diff} dias — ${c.descricao}`,
          descricao: `${c.categoria} · ${fmt(c.valor)}`,
          link: '/contas-pagar', valor: fmt(c.valor),
        });
      }
    }

    const ordem: Record<Severidade, number> = { critico: 0, aviso: 1, info: 2 };
    return alertas.sort((a, b) => ordem[a.severidade] - ordem[b.severidade]);
  }, [pedidos, produtosAll, historicoAll, configuracoes, contasPagar, lojaFiltro]);
}
