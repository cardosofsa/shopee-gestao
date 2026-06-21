import type { Pedido, Despesa, Produto } from '../types';
import type { DREResult } from '../domain/dre';
import { getRankingProdutos } from './calculations';

function moeda(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function pct(v: number) {
  return `${v.toFixed(1)}%`;
}

export async function exportarRelatorioMensal(
  mesAno: string,
  pedidos: Pedido[],
  despesas: Despesa[],
  produtos: Produto[],
  dre: DREResult,
  mesLabel: string,
): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const f = dre.faturamentoBruto;

  // ── Sheet 1: DRE ──────────────────────────────────────────────
  const dreRows = [
    ['DRE — ' + mesLabel, '', ''],
    ['', '', ''],
    ['RECEITAS', '', ''],
    ['Faturamento Bruto', moeda(f), ''],
    ['', '', ''],
    ['CUSTOS & DESPESAS', '', ''],
    ['CMV (Custo Mercadoria Vendida)', moeda(dre.cmv),                  pct(f > 0 ? (dre.cmv                  / f) * 100 : 0)],
    ['Taxas Shopee',                  moeda(dre.taxasShopee),           pct(f > 0 ? (dre.taxasShopee           / f) * 100 : 0)],
    ['Marketing / Ads',               moeda(dre.marketingAds),          pct(f > 0 ? (dre.marketingAds          / f) * 100 : 0)],
    ['DAS / Imposto',                 moeda(dre.dasImposto),            pct(f > 0 ? (dre.dasImposto            / f) * 100 : 0)],
    ['Despesas Operacionais',         moeda(dre.despesasOperacionais),  pct(f > 0 ? (dre.despesasOperacionais  / f) * 100 : 0)],
    ['', '', ''],
    ['RESULTADOS', '', ''],
    ['Lucro Bruto',       moeda(dre.lucroBruto),       pct(f > 0 ? (dre.lucroBruto       / f) * 100 : 0)],
    ['Lucro Operacional', moeda(dre.lucroOperacional),  pct(f > 0 ? (dre.lucroOperacional  / f) * 100 : 0)],
    ['Lucro Líquido',     moeda(dre.lucroLiquido),     pct(dre.margemPercentual)],
    ['', '', ''],
    ['INDICADORES', '', ''],
    ['Pedidos (concluídos + enviados)', dre.pedidosQtd, ''],
    ['Ticket Médio', moeda(dre.ticketMedio), ''],
  ];
  const wsDRE = XLSX.utils.aoa_to_sheet(dreRows);
  wsDRE['!cols'] = [{ wch: 34 }, { wch: 16 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, wsDRE, 'DRE');

  // ── Sheet 2: Ranking de Produtos ──────────────────────────────
  const doMes = pedidos.filter(
    (p) => p.data.startsWith(mesAno) && (p.status === 'Concluído' || p.status === 'Enviado')
  );
  const ranking = getRankingProdutos(doMes);

  const rankingHeader = ['#', 'SKU', 'Produto', 'Pedidos', 'Unidades', 'Receita', 'Ticket Médio', 'Lucro Op.', 'Margem %', '% Receita', 'Curva ABC'];
  const rankingRows = ranking.map((r, i) => [
    i + 1, r.sku, r.produto, r.pedidos, r.unidades,
    moeda(r.receita), moeda(r.ticketMedio), moeda(r.lucroOperacional),
    pct(r.margem), pct(r.percentReceita), r.curvaABC,
  ]);
  const wsRanking = XLSX.utils.aoa_to_sheet([rankingHeader, ...rankingRows]);
  wsRanking['!cols'] = [{ wch: 4 }, { wch: 14 }, { wch: 26 }, { wch: 9 }, { wch: 9 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, wsRanking, 'Ranking de Produtos');

  // ── Sheet 3: Pedidos do Mês ───────────────────────────────────
  const pedidosHeader = ['Data', 'Nº Pedido', 'Status', 'Loja', 'SKU', 'Produto', 'Unidades', 'Receita', 'Desconto', 'Custo', 'Taxa Shopee', 'Ads', 'Lucro Op.', 'Margem %'];
  const pedidosRows = pedidos
    .filter((p) => p.data.startsWith(mesAno))
    .sort((a, b) => b.data.localeCompare(a.data))
    .map((p) => [
      p.data.slice(0, 10), p.numeroPedido, p.status, p.loja, p.sku, p.produto,
      p.unidadesEstoque, moeda(p.receita), moeda(p.desconto),
      moeda(p.custoTotal), moeda(p.taxaShopee), moeda(p.adsMarketing),
      moeda(p.lucroOperacional), pct(p.margemSCustoTotal),
    ]);
  const wsPedidos = XLSX.utils.aoa_to_sheet([pedidosHeader, ...pedidosRows]);
  wsPedidos['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 26 }, { wch: 9 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, wsPedidos, 'Pedidos');

  // ── Sheet 4: Despesas do Mês ──────────────────────────────────
  const despesasHeader = ['Data', 'Categoria', 'Descrição', 'Loja', 'Valor'];
  const despesasMes = despesas
    .filter((d) => d.data.startsWith(mesAno))
    .sort((a, b) => b.data.localeCompare(a.data));
  const despesasRows = despesasMes.map((d) => [
    d.data.slice(0, 10), d.categoria, d.descricao, d.loja, moeda(d.valor),
  ]);
  const totalDespesas = despesasMes.reduce((s, d) => s + d.valor, 0);
  const wsDespesas = XLSX.utils.aoa_to_sheet([
    despesasHeader,
    ...despesasRows,
    [],
    ['', '', '', 'TOTAL', moeda(totalDespesas)],
  ]);
  wsDespesas['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 36 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsDespesas, 'Despesas');

  // ── Sheet 5: Posição de Estoque ───────────────────────────────
  const limite30d = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const estoqueHeader = ['SKU', 'Produto', 'Categoria', 'Loja', 'Estoque Atual', 'Estoque Segurança', 'Custo Unit.', 'Valor Total', 'Venda/Dia (30d)'];
  const estoqueRows = produtos.map((p) => {
    const vendas30d = pedidos
      .filter((o) => o.sku === p.sku && (o.status === 'Concluído' || o.status === 'Enviado') && o.data >= limite30d)
      .reduce((s, o) => s + o.unidadesEstoque, 0);
    const vendaDia = vendas30d / 30;
    return [
      p.sku, p.nome, p.categoria, p.loja,
      p.estoqueAtual, p.estoqueSeguranca,
      moeda(p.custoUnitario), moeda(p.estoqueAtual * p.custoUnitario),
      vendaDia.toFixed(2),
    ];
  });
  const wsEstoque = XLSX.utils.aoa_to_sheet([estoqueHeader, ...estoqueRows]);
  wsEstoque['!cols'] = [{ wch: 12 }, { wch: 26 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsEstoque, 'Estoque');

  // ── Download ──────────────────────────────────────────────────
  const nomeArquivo = `Relatorio_${mesAno.replace('-', '_')}.xlsx`;
  XLSX.writeFile(wb, nomeArquivo);
}
