import { describe, expect, it } from 'vitest';

import { computeDRE } from '../domain/dre';
import type { Despesa, Pedido } from '../types';

// ─── Factory helpers ──────────────────────────────────────────────────────────

let _seq = 0;
function makePedido(overrides: Partial<Pedido> = {}): Pedido {
  _seq++;
  return {
    id: `p${_seq}`,
    numeroPedido: `ORD${_seq}`,
    data: '2026-06-15',
    status: 'Concluído',
    loja: 'Cardoso e-Shop',
    sku: 'ALF-118',
    produto: 'Alfazema 118ml',
    quantidade: 1,
    multiplicadorKit: 1,
    unidadesEstoque: 1,
    receita: 0,
    desconto: 0,
    custoTotal: 0,
    taxaShopee: 0,
    dasImposto: 0,
    adsMarketing: 0,
    lucroOperacional: 0,
    margemSCustoProduto: 0,
    margemSCustoTotal: 0,
    observacoes: '',
    ...overrides,
  };
}

function makeDespesa(overrides: Partial<Despesa> = {}): Despesa {
  _seq++;
  return {
    id: `d${_seq}`,
    data: '2026-06-10',
    categoria: 'Embalagem',
    descricao: 'Teste',
    valor: 0,
    loja: 'Cardoso e-Shop',
    ...overrides,
  };
}

// ─── Mês sem dados ────────────────────────────────────────────────────────────

describe('computeDRE — mês vazio', () => {
  const result = computeDRE([], [], '2026-06');

  it('faturamentoBruto = 0', () => expect(result.faturamentoBruto).toBe(0));
  it('pedidosQtd = 0', () => expect(result.pedidosQtd).toBe(0));
  it('ticketMedio = 0', () => expect(result.ticketMedio).toBe(0));
  it('lucroLiquido = 0', () => expect(result.lucroLiquido).toBe(0));
  it('margemPercentual = 0', () => expect(result.margemPercentual).toBe(0));
  it('mesAno preservado', () => expect(result.mesAno).toBe('2026-06'));
});

// ─── Pedido único ─────────────────────────────────────────────────────────────

describe('computeDRE — pedido único', () => {
  const p = makePedido({
    data: '2026-06-15',
    receita: 100,
    custoTotal: 20,
    taxaShopee: 10,
    adsMarketing: 2,
    dasImposto: 6,
    unidadesEstoque: 2,
  });
  const result = computeDRE([p], [], '2026-06');

  it('faturamentoBruto = receita', () => expect(result.faturamentoBruto).toBe(100));
  it('cmv = custoTotal', () => expect(result.cmv).toBe(20));
  it('taxasShopee', () => expect(result.taxasShopee).toBe(10));
  it('marketingAds', () => expect(result.marketingAds).toBe(2));
  it('dasImposto', () => expect(result.dasImposto).toBe(6));
  it('lucroBruto = 100 - 20', () => expect(result.lucroBruto).toBe(80));
  it('lucroOperacional = 80 - 10 - 2', () => expect(result.lucroOperacional).toBe(68));
  it('lucroLiquido = 68 - 6', () => expect(result.lucroLiquido).toBe(62));
  it('margemPercentual = 62%', () => expect(result.margemPercentual).toBeCloseTo(62, 5));
  it('pedidosQtd = 1', () => expect(result.pedidosQtd).toBe(1));
  it('ticketMedio = 100', () => expect(result.ticketMedio).toBe(100));
  it('unidadesVendidas = 2', () => expect(result.unidadesVendidas).toBe(2));
});

// ─── Filtro de status ─────────────────────────────────────────────────────────

describe('computeDRE — filtro de status', () => {
  const concluido = makePedido({ data: '2026-06-10', status: 'Concluído', receita: 100 });
  const enviado = makePedido({ data: '2026-06-11', status: 'Enviado', receita: 80 });
  const emProcesso = makePedido({ data: '2026-06-12', status: 'Em processo', receita: 200 });
  const devolvido = makePedido({ data: '2026-06-13', status: 'Devolvido', receita: 150 });

  const result = computeDRE([concluido, enviado, emProcesso, devolvido], [], '2026-06');

  it('conta apenas Concluído e Enviado', () => expect(result.pedidosQtd).toBe(2));
  it('faturamento = 180 (exclui Em processo e Devolvido)', () =>
    expect(result.faturamentoBruto).toBe(180));
  it('ticketMedio = 90', () => expect(result.ticketMedio).toBe(90));
});

// ─── Filtro de mês ────────────────────────────────────────────────────────────

describe('computeDRE — filtro de mês', () => {
  const junPed = makePedido({ data: '2026-06-15', receita: 100 });
  const julPed = makePedido({ data: '2026-07-01', receita: 200 });
  const maio = makePedido({ data: '2026-05-31', receita: 50 });

  const result = computeDRE([junPed, julPed, maio], [], '2026-06');

  it('só inclui pedidos de junho', () => expect(result.pedidosQtd).toBe(1));
  it('faturamento apenas do mês certo', () => expect(result.faturamentoBruto).toBe(100));
});

// ─── Despesas operacionais ────────────────────────────────────────────────────

describe('computeDRE — despesas operacionais', () => {
  const p = makePedido({ data: '2026-06-15', receita: 200, custoTotal: 40, taxaShopee: 20 });
  const d1 = makeDespesa({ data: '2026-06-05', valor: 30 });
  const d2 = makeDespesa({ data: '2026-06-20', valor: 20 });
  const d3 = makeDespesa({ data: '2026-07-01', valor: 999 }); // mês diferente — não conta

  const result = computeDRE([p], [d1, d2, d3], '2026-06');

  it('despesasOperacionais = 50 (d1 + d2)', () => expect(result.despesasOperacionais).toBe(50));

  it('lucroLiquido = 200 - 40 - 20 - 0 - 0 - 50', () =>
    // lucroBruto=160, lucroOp=140, lucroLiq=90
    expect(result.lucroLiquido).toBe(90));
});

// ─── Múltiplos pedidos — acúmulo ─────────────────────────────────────────────

describe('computeDRE — múltiplos pedidos', () => {
  const pedidos = [
    makePedido({
      data: '2026-06-01',
      receita: 50,
      custoTotal: 10,
      taxaShopee: 5,
      dasImposto: 3,
      adsMarketing: 1,
      unidadesEstoque: 1,
    }),
    makePedido({
      data: '2026-06-15',
      receita: 100,
      custoTotal: 20,
      taxaShopee: 10,
      dasImposto: 6,
      adsMarketing: 2,
      unidadesEstoque: 2,
    }),
    makePedido({
      data: '2026-06-30',
      receita: 150,
      custoTotal: 30,
      taxaShopee: 15,
      dasImposto: 9,
      adsMarketing: 3,
      unidadesEstoque: 3,
    }),
  ];
  const result = computeDRE(pedidos, [], '2026-06');

  it('faturamentoBruto = 300', () => expect(result.faturamentoBruto).toBe(300));
  it('cmv = 60', () => expect(result.cmv).toBe(60));
  it('taxasShopee = 30', () => expect(result.taxasShopee).toBe(30));
  it('marketingAds = 6', () => expect(result.marketingAds).toBe(6));
  it('dasImposto = 18', () => expect(result.dasImposto).toBe(18));
  it('lucroBruto = 240', () => expect(result.lucroBruto).toBe(240));
  it('lucroOperacional = 204', () => expect(result.lucroOperacional).toBe(204));
  it('lucroLiquido = 186', () => expect(result.lucroLiquido).toBe(186));
  it('pedidosQtd = 3', () => expect(result.pedidosQtd).toBe(3));
  it('unidadesVendidas = 6', () => expect(result.unidadesVendidas).toBe(6));
  it('ticketMedio = 100', () => expect(result.ticketMedio).toBe(100));
  it('margemPercentual = 62%', () => expect(result.margemPercentual).toBeCloseTo(62, 5));
});

// ─── margemPercentual edge case ───────────────────────────────────────────────

describe('computeDRE — margemPercentual', () => {
  it('margem com custo alto → negativo', () => {
    const p = makePedido({ data: '2026-06-10', receita: 50, custoTotal: 80 });
    const r = computeDRE([p], [], '2026-06');
    expect(r.lucroBruto).toBe(-30);
    expect(r.margemPercentual).toBeCloseTo(-60, 5);
  });

  it('faturamento zero (sem pedidos) → margem 0', () => {
    const r = computeDRE([], [], '2026-06');
    expect(r.margemPercentual).toBe(0);
  });
});

// ─── Despesas de meses diferentes ─────────────────────────────────────────────

describe('computeDRE — despesas de outros meses ignoradas', () => {
  const p = makePedido({ data: '2026-06-10', receita: 100 });
  const d = makeDespesa({ data: '2026-05-31', valor: 999 }); // maio — não deve contar

  const result = computeDRE([p], [d], '2026-06');

  it('despesasOperacionais = 0', () => expect(result.despesasOperacionais).toBe(0));
  it('lucroLiquido = 100', () => expect(result.lucroLiquido).toBe(100));
});
