import { describe, expect, it } from 'vitest';

import type { Pedido } from '../types';
import {
  agruparPorDia,
  calcularAds,
  calcularLucroOperacional,
  calcularPrecoIdeal,
  calcularTaxaShopee,
  getKPIsMes,
  getRankingProdutos,
  getStatusEstoque,
} from '../utils/calculations';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePedido(overrides: Partial<Pedido> = {}): Pedido {
  return {
    id: crypto.randomUUID(),
    numeroPedido: '123',
    data: '2025-06-15',
    status: 'Concluído',
    loja: 'Cardoso e-Shop',
    sku: 'ALF-118',
    produto: 'Alfazema 118ml',
    quantidade: 1,
    multiplicadorKit: 1,
    unidadesEstoque: 1,
    receita: 100,
    desconto: 0,
    custoTotal: 20,
    taxaShopee: 18,
    dasImposto: 0,
    adsMarketing: 2,
    lucroOperacional: 60,
    margemSCustoProduto: 60,
    margemSCustoTotal: 60,
    ...overrides,
  };
}

// ─── calcularLucroOperacional ─────────────────────────────────────────────────

describe('calcularLucroOperacional', () => {
  it('computa lucro básico corretamente', () => {
    const lucro = calcularLucroOperacional(100, 0, 20, 18, 0, 2);
    expect(lucro).toBe(60);
  });

  it('desconta desconto do preço antes de calcular', () => {
    const lucro = calcularLucroOperacional(100, 10, 20, 18, 0, 2);
    expect(lucro).toBe(50);
  });

  it('desconta DAS do lucro', () => {
    const lucro = calcularLucroOperacional(100, 0, 20, 18, 5, 2);
    expect(lucro).toBe(55);
  });

  it('retorna negativo quando custos superam receita', () => {
    const lucro = calcularLucroOperacional(50, 0, 60, 18, 0, 2);
    expect(lucro).toBeLessThan(0);
  });

  it('retorna zero quando receita cobre exatamente todos os custos', () => {
    const lucro = calcularLucroOperacional(100, 0, 50, 30, 10, 10);
    expect(lucro).toBe(0);
  });
});

// ─── calcularTaxaShopee ───────────────────────────────────────────────────────

describe('calcularTaxaShopee', () => {
  it('usa percentual padrão de 20%', () => {
    expect(calcularTaxaShopee(100)).toBe(20);
  });

  it('usa percentual customizado', () => {
    expect(calcularTaxaShopee(200, 0.18)).toBe(36);
  });

  it('retorna 0 para receita 0', () => {
    expect(calcularTaxaShopee(0)).toBe(0);
  });
});

// ─── calcularAds ─────────────────────────────────────────────────────────────

describe('calcularAds', () => {
  it('usa percentual padrão de 2%', () => {
    expect(calcularAds(100)).toBe(2);
  });

  it('usa percentual customizado', () => {
    expect(calcularAds(500, 0.05)).toBe(25);
  });
});

// ─── calcularPrecoIdeal ───────────────────────────────────────────────────────

describe('calcularPrecoIdeal', () => {
  it('calcula preço quando denominador é positivo', () => {
    const result = calcularPrecoIdeal({
      custo: 20,
      margemDesejada: 0.3,
      comissaoShopee: 0.18,
      taxaFixa: 4,
      percentualAds: 0.02,
      aliquotaDAS: 0,
    });
    expect(result.precoVenda).toBeGreaterThan(20);
    expect(result.margemReal).toBeCloseTo(0.3, 1);
  });

  it('retorna zeros quando denominador é zero ou negativo (inviável)', () => {
    const result = calcularPrecoIdeal({
      custo: 20,
      margemDesejada: 0.6,
      comissaoShopee: 0.2,
      taxaFixa: 0,
      percentualAds: 0.1,
      aliquotaDAS: 0.15,
    });
    expect(result.precoVenda).toBe(0);
    expect(result.lucroLiquido).toBe(0);
    expect(result.margemReal).toBe(0);
  });

  it('margem real é lucro dividido pelo preço de venda', () => {
    const result = calcularPrecoIdeal({
      custo: 10,
      margemDesejada: 0.2,
      comissaoShopee: 0.18,
      taxaFixa: 0,
      percentualAds: 0.02,
      aliquotaDAS: 0,
    });
    const margem = result.lucroLiquido / result.precoVenda;
    expect(margem).toBeCloseTo(result.margemReal, 5);
  });

  it('taxa fixa é adicionada ao custo base no denominador', () => {
    const semTaxa = calcularPrecoIdeal({
      custo: 20,
      margemDesejada: 0.3,
      comissaoShopee: 0.18,
      taxaFixa: 0,
      percentualAds: 0.02,
      aliquotaDAS: 0,
    });
    const comTaxa = calcularPrecoIdeal({
      custo: 20,
      margemDesejada: 0.3,
      comissaoShopee: 0.18,
      taxaFixa: 10,
      percentualAds: 0.02,
      aliquotaDAS: 0,
    });
    expect(comTaxa.precoVenda).toBeGreaterThan(semTaxa.precoVenda);
  });
});

// ─── getStatusEstoque ─────────────────────────────────────────────────────────

describe('getStatusEstoque', () => {
  it('retorna Comprar quando estoque é zero', () => {
    expect(getStatusEstoque(0, 5, 10)).toBe('Comprar');
  });

  it('retorna Comprar quando cobertura é menos de 7 dias', () => {
    // estoque 10, venda 2/dia → 5 dias de cobertura
    expect(getStatusEstoque(10, 2, 5)).toBe('Comprar');
  });

  it('retorna Estoque Baixo quando abaixo do estoque de segurança', () => {
    // estoque 5, venda 0.1/dia (cobertura 50 dias), mas segurança é 10
    expect(getStatusEstoque(5, 0.1, 10)).toBe('Estoque Baixo');
  });

  it('retorna Estoque Baixo quando cobertura < 30 dias', () => {
    // estoque 20, venda 1/dia → 20 dias de cobertura, segurança 5
    expect(getStatusEstoque(20, 1, 5)).toBe('Estoque Baixo');
  });

  it('retorna Estoque Estável para cobertura adequada', () => {
    // estoque 100, venda 1/dia → 100 dias, mas segurança é 50 (< 3×)
    expect(getStatusEstoque(100, 1, 50)).toBe('Estoque Estável');
  });

  it('retorna Estoque Acima quando muito acima do necessário', () => {
    // estoque 400, venda 1/dia → 400 dias, segurança 10 (< estoque/3)
    expect(getStatusEstoque(400, 1, 10)).toBe('Estoque Acima');
  });

  it('retorna Estoque Estável quando não há vendas (sem histórico)', () => {
    // venda 0/dia → cobertura infinita, mas não excede 90 dias (é Infinity)
    expect(getStatusEstoque(50, 0, 10)).toBe('Estoque Estável');
  });
});

// ─── getKPIsMes ───────────────────────────────────────────────────────────────

describe('getKPIsMes', () => {
  const pedidos: Pedido[] = [
    makePedido({
      data: '2025-06-10',
      status: 'Concluído',
      receita: 100,
      lucroOperacional: 30,
      dasImposto: 5,
    }),
    makePedido({
      data: '2025-06-20',
      status: 'Enviado',
      receita: 200,
      lucroOperacional: 60,
      dasImposto: 10,
    }),
    makePedido({
      data: '2025-06-15',
      status: 'Devolvido',
      receita: 150,
      lucroOperacional: -20,
      dasImposto: 0,
    }),
    makePedido({
      data: '2025-07-01',
      status: 'Concluído',
      receita: 500,
      lucroOperacional: 150,
      dasImposto: 20,
    }),
  ];

  it('soma apenas Concluído e Enviado do mês', () => {
    const kpis = getKPIsMes(pedidos, '2025-06');
    expect(kpis.faturamento).toBe(300);
    expect(kpis.pedidosMes).toBe(2);
  });

  it('calcula ticket médio corretamente', () => {
    const kpis = getKPIsMes(pedidos, '2025-06');
    expect(kpis.ticket).toBe(150);
  });

  it('lucroLiquido é lucroOp sem despesas externas (DAS já em pedido.lucroOperacional)', () => {
    const kpis = getKPIsMes(pedidos, '2025-06');
    expect(kpis.lucroOp).toBe(90);
    expect(kpis.lucroLiquido).toBe(90); // sem despesasExternas passadas
    // com despesas externas o lucroLiquido deduz corretamente
    const kpisComDesp = getKPIsMes(pedidos, '2025-06', 15);
    expect(kpisComDesp.lucroLiquido).toBe(75); // 90 - 15
  });

  it('não inclui pedidos de outros meses', () => {
    const kpis = getKPIsMes(pedidos, '2025-06');
    expect(kpis.faturamento).not.toContain(500);
  });

  it('retorna zeros para mês sem pedidos', () => {
    const kpis = getKPIsMes(pedidos, '2024-01');
    expect(kpis.faturamento).toBe(0);
    expect(kpis.pedidosMes).toBe(0);
    expect(kpis.ticket).toBe(0);
  });
});

// ─── getRankingProdutos ───────────────────────────────────────────────────────

describe('getRankingProdutos', () => {
  const pedidos: Pedido[] = [
    makePedido({
      sku: 'A',
      produto: 'Produto A',
      receita: 600,
      lucroOperacional: 180,
      unidadesEstoque: 6,
      status: 'Concluído',
    }),
    makePedido({
      sku: 'A',
      produto: 'Produto A',
      receita: 400,
      lucroOperacional: 120,
      unidadesEstoque: 4,
      status: 'Concluído',
    }),
    makePedido({
      sku: 'B',
      produto: 'Produto B',
      receita: 200,
      lucroOperacional: 50,
      unidadesEstoque: 2,
      status: 'Enviado',
    }),
    makePedido({
      sku: 'C',
      produto: 'Produto C',
      receita: 100,
      lucroOperacional: 20,
      unidadesEstoque: 1,
      status: 'Devolvido',
    }),
  ];

  it('ignora pedidos com status Devolvido', () => {
    const ranking = getRankingProdutos(pedidos);
    expect(ranking.find((r) => r.sku === 'C')).toBeUndefined();
  });

  it('consolida múltiplos pedidos do mesmo SKU', () => {
    const ranking = getRankingProdutos(pedidos);
    const a = ranking.find((r) => r.sku === 'A')!;
    expect(a.pedidos).toBe(2);
    expect(a.receita).toBe(1000);
    expect(a.unidades).toBe(10);
  });

  it('ordena por receita decrescente', () => {
    const ranking = getRankingProdutos(pedidos);
    expect(ranking[0].sku).toBe('A');
    expect(ranking[1].sku).toBe('B');
  });

  it('calcula ticket médio como receita/pedidos', () => {
    const ranking = getRankingProdutos(pedidos);
    const a = ranking.find((r) => r.sku === 'A')!;
    expect(a.ticketMedio).toBe(500);
  });

  it('classifica curva ABC: produto que inicia dentro de 0-80% é A', () => {
    // A tem 83% da receita (acum antes = 0% < 80%) → A
    // B tem 17% (acum antes = 83% >= 80% e < 95%) → B
    const ranking = getRankingProdutos(pedidos);
    expect(ranking.find((r) => r.sku === 'A')?.curvaABC).toBe('A');
    expect(ranking.find((r) => r.sku === 'B')?.curvaABC).toBe('B');
  });

  it('retorna lista vazia quando não há pedidos válidos', () => {
    const ranking = getRankingProdutos([
      makePedido({ status: 'Em processo' }),
      makePedido({ status: 'Devolvido' }),
    ]);
    expect(ranking).toHaveLength(0);
  });
});

// ─── agruparPorDia ────────────────────────────────────────────────────────────

describe('agruparPorDia', () => {
  const pedidos: Pedido[] = [
    makePedido({ data: '2025-06-01', status: 'Concluído', receita: 100, lucroOperacional: 30 }),
    makePedido({ data: '2025-06-01', status: 'Enviado', receita: 50, lucroOperacional: 15 }),
    makePedido({ data: '2025-06-15', status: 'Concluído', receita: 200, lucroOperacional: 60 }),
    makePedido({ data: '2025-07-01', status: 'Concluído', receita: 999, lucroOperacional: 300 }),
    makePedido({ data: '2025-06-10', status: 'Devolvido', receita: 150, lucroOperacional: -20 }),
  ];

  it('filtra apenas o mês correto', () => {
    const data = agruparPorDia(pedidos, '2025-06');
    expect(data.find((d) => d.name.includes('01/07'))).toBeUndefined();
  });

  it('ignora pedidos devolvidos/em processo', () => {
    const data = agruparPorDia(pedidos, '2025-06');
    expect(data.find((d) => d.name === '10/06')).toBeUndefined();
  });

  it('consolida múltiplos pedidos no mesmo dia', () => {
    const data = agruparPorDia(pedidos, '2025-06');
    const dia1 = data.find((d) => d.name === '01/06')!;
    expect(dia1.receita).toBe(150);
    expect(dia1.lucro).toBe(45);
    expect(dia1.pedidos).toBe(2);
  });

  it('ordena os dias cronologicamente', () => {
    const data = agruparPorDia(pedidos, '2025-06');
    const indices = data.map((d) => parseInt(d.name));
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThan(indices[i - 1]);
    }
  });
});
