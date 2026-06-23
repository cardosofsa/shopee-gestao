import { describe, it, expect } from 'vitest';
import { mapearStatus } from '../import/parsers/common';
import { mapearSKU, parseShopeeNativo } from '../import/parsers/shopee';
import { mapearSkuUpseller, mapearLojaUpseller, parseUpseller } from '../import/parsers/upseller';
import { parseGenerico } from '../import/parsers/generico';
import { parseImportRows } from '../import/parsers';
import type { Produto, Configuracoes } from '../types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PRODUTOS: Produto[] = [
  { sku: 'ALF-118',   nome: 'Alfazema 118ml',      categoria: 'Perfumaria', loja: 'Cardoso e-Shop', custoUnitario: 6.08,  estoqueSeguranca: 50, estoqueAtual: 266, ativo: true },
  { sku: 'ALF-500',   nome: 'Alfazema 500ml',      categoria: 'Perfumaria', loja: 'Cardoso e-Shop', custoUnitario: 4.70,  estoqueSeguranca: 10, estoqueAtual: 0,   ativo: true },
  { sku: 'FITA-BIKE', nome: 'Fita Antifuro Bike',  categoria: 'Moto/Bike',  loja: 'Ambas',          custoUnitario: 10.00, estoqueSeguranca: 10, estoqueAtual: 0,   ativo: true },
  { sku: 'FITA-MOTO', nome: 'Fita Antifuro Moto',  categoria: 'Moto/Bike',  loja: 'Ambas',          custoUnitario: 28.00, estoqueSeguranca: 15, estoqueAtual: 10,  ativo: true },
  { sku: 'FITA-PCX',  nome: 'Fita Antifuro PCX',   categoria: 'Moto/Bike',  loja: 'Ambas',          custoUnitario: 10.00, estoqueSeguranca: 10, estoqueAtual: 0,   ativo: true },
  { sku: 'BAINHAC',   nome: 'Bainha de Couro',     categoria: 'Acessórios', loja: 'Ambas',          custoUnitario: 3.00,  estoqueSeguranca: 10, estoqueAtual: 0,   ativo: true },
];

const CONF: Configuracoes = { aliquotaDAS: 6, percentualMarketing: 2, lojas: ['Cardoso e-Shop', 'Projetando'] };

// ─── mapearStatus ─────────────────────────────────────────────────────────────

describe('mapearStatus', () => {
  it('"A enviar" → "Em processo"', () => expect(mapearStatus('A enviar')).toBe('Em processo'));
  it('"para entregar" → "Em processo"', () => expect(mapearStatus('Para Entregar')).toBe('Em processo'));
  it('"pendente" → "Em processo"', () => expect(mapearStatus('Pedido pendente')).toBe('Em processo'));
  it('"enviado" → "Enviado"', () => expect(mapearStatus('enviado')).toBe('Enviado'));
  it('"Em trânsito" → "Enviado"', () => expect(mapearStatus('Em Trânsito')).toBe('Enviado'));
  it('"Devolvido" → "Devolvido"', () => expect(mapearStatus('Devolvido')).toBe('Devolvido'));
  it('"reembolso" → "Devolvido"', () => expect(mapearStatus('reembolso solicitado')).toBe('Devolvido'));
  it('"retorno" → "Devolvido"', () => expect(mapearStatus('em retorno')).toBe('Devolvido'));
  it('desconhecido → "Concluído"', () => expect(mapearStatus('Entregue')).toBe('Concluído'));
  it('vazio → "Concluído"', () => expect(mapearStatus('')).toBe('Concluído'));
});

// ─── mapearSKU (Shopee nativo) ────────────────────────────────────────────────

describe('mapearSKU', () => {
  it('FITA-BIKE-KIT3 via variant → kit 3', () => {
    expect(mapearSKU('FITA-BIKE-KIT3', '')).toEqual({ sku: 'FITA-BIKE', kit: 3 });
  });
  it('FITA-BIKE-KIT2 via variant → kit 2', () => {
    expect(mapearSKU('FITA-BIKE-KIT2', '')).toEqual({ sku: 'FITA-BIKE', kit: 2 });
  });
  it('FITA-BIKE-UN → kit 1', () => {
    expect(mapearSKU('FITA-BIKE-UN', '')).toEqual({ sku: 'FITA-BIKE', kit: 1 });
  });
  it('FITA-MOTO-UN → FITA-MOTO kit 1', () => {
    expect(mapearSKU('MOTO-UN', '')).toEqual({ sku: 'FITA-MOTO', kit: 1 });
  });
  it('PCX-UN → FITA-PCX kit 1', () => {
    expect(mapearSKU('PCX-UN', '')).toEqual({ sku: 'FITA-PCX', kit: 1 });
  });
  it('BAINHAC via variant', () => {
    expect(mapearSKU('BAINHAC-UN', '')).toEqual({ sku: 'BAINHAC', kit: 1 });
  });
  it('ALF-500 via variant', () => {
    expect(mapearSKU('ALF-500', '')).toEqual({ sku: 'ALF-500', kit: 1 });
  });
  it('ALF-118 via variant', () => {
    expect(mapearSKU('ALFAZEMA-118', '')).toEqual({ sku: 'ALF-118', kit: 1 });
  });
  it('fallback via principal com FITAANTIFURO-BIKE', () => {
    expect(mapearSKU('variante-x', 'FITAANTIFURO-BIKE')).toEqual({ sku: 'FITA-BIKE', kit: 1 });
  });
  it('fallback via principal com FITAANTIFURO-MOTO', () => {
    expect(mapearSKU('variante-x', 'FITAANTIFURO-MOTO')).toEqual({ sku: 'FITA-MOTO', kit: 1 });
  });
  it('kit extraído de variante com KIT2 no principal', () => {
    const row = mapearSKU('FITA-KIT2', 'FITAANTIFURO-BIKE');
    expect(row.sku).toBe('FITA-BIKE');
    expect(row.kit).toBe(2);
  });
});

// ─── mapearSkuUpseller ────────────────────────────────────────────────────────

describe('mapearSkuUpseller', () => {
  it('ALF-118-UN → ALF-118 kit 1', () => {
    expect(mapearSkuUpseller('ALF-118-UN')).toEqual({ sku: 'ALF-118', kit: 1 });
  });
  it('FITA-BIKE-KIT2 → FITA-BIKE kit 2', () => {
    expect(mapearSkuUpseller('FITA-BIKE-KIT2')).toEqual({ sku: 'FITA-BIKE', kit: 2 });
  });
  it('FITA-MOTO-KIT3 → FITA-MOTO kit 3', () => {
    expect(mapearSkuUpseller('FITA-MOTO-KIT3')).toEqual({ sku: 'FITA-MOTO', kit: 3 });
  });
  it('BCO-KIT2 → BAINHAC kit 2', () => {
    expect(mapearSkuUpseller('BCO-KIT2')).toEqual({ sku: 'BAINHAC', kit: 2 });
  });
  it('BAINHAC → BAINHAC kit 1', () => {
    expect(mapearSkuUpseller('BAINHAC')).toEqual({ sku: 'BAINHAC', kit: 1 });
  });
  it('"preta" → BAINHAC', () => {
    expect(mapearSkuUpseller('1UN preta')).toEqual({ sku: 'BAINHAC', kit: 1 });
  });
  it('CANMAD-BAI → CANMAD-BAINHAC', () => {
    expect(mapearSkuUpseller('CANMAD-BAI-123')).toEqual({ sku: 'CANMAD-BAINHAC', kit: 1 });
  });
  it('CANMAD → CANMAD', () => {
    expect(mapearSkuUpseller('CANMAD')).toEqual({ sku: 'CANMAD', kit: 1 });
  });
  it('TIPOC → CJ13-3', () => {
    expect(mapearSkuUpseller('TIPOC')).toEqual({ sku: 'CJ13-3', kit: 1 });
  });
  it('MICRO → CJ13-2', () => {
    expect(mapearSkuUpseller('MICRO')).toEqual({ sku: 'CJ13-2', kit: 1 });
  });
  it('1 PAR → FITA-BIKE kit 1', () => {
    expect(mapearSkuUpseller('1 PAR')).toEqual({ sku: 'FITA-BIKE', kit: 1 });
  });
  it('2 PARES → FITA-BIKE kit 2', () => {
    expect(mapearSkuUpseller('2 PARES')).toEqual({ sku: 'FITA-BIKE', kit: 2 });
  });
});

// ─── mapearLojaUpseller ───────────────────────────────────────────────────────

describe('mapearLojaUpseller', () => {
  const lojas = ['Cardoso e-Shop', 'Projetando'];
  it('contém "cardoso" → "Cardoso e-Shop"', () => {
    expect(mapearLojaUpseller('Cardoso e-Shop Oficial', lojas)).toBe('Cardoso e-Shop');
  });
  it('contém "projetando" → "Projetando"', () => {
    expect(mapearLojaUpseller('Projetando', lojas)).toBe('Projetando');
  });
  it('desconhecida → primeira loja configurada', () => {
    expect(mapearLojaUpseller('Loja Desconhecida', lojas)).toBe('Cardoso e-Shop');
  });
});

// ─── parseShopeeNativo ────────────────────────────────────────────────────────

const shopeeRows = [
  {
    'ID do pedido': '260615ABC001',
    'Status do pedido': 'A enviar',
    'Número de referência SKU': 'FITA-BIKE-UN',
    'Nº de referência do SKU principal': 'FITAANTIFURO-BIKE',
    'Nome do Produto': 'Fita Antifuro para Bicicleta',
    'Quantidade': 2,
    'Subtotal do produto': 50.00,
    'Preço acordado': 25.00,
    'Desconto do vendedor': 5.00,
    'Taxa de comissão líquida': 8.00,
    'Taxa de serviço líquida': 2.00,
    'Data de criação do pedido': '2026-06-15',
  },
  {
    'ID do pedido': '260615ABC002',
    'Status do pedido': 'Cancelado pelo comprador',  // deve ser filtrado
    'Número de referência SKU': 'ALF-118',
    'Nº de referência do SKU principal': '',
    'Nome do Produto': 'Alfazema 118ml',
    'Quantidade': 1,
    'Subtotal do produto': 25.00,
    'Preço acordado': 25.00,
    'Desconto do vendedor': 0,
    'Taxa de comissão líquida': 5.00,
    'Taxa de serviço líquida': 0,
    'Data de criação do pedido': '2026-06-15',
  },
  {
    'ID do pedido': '260615ABC003',
    'Status do pedido': 'Entregue',
    'Número de referência SKU': 'ALFAZEMA',
    'Nº de referência do SKU principal': '',
    'Nome do Produto': 'Alfazema 118ml',
    'Quantidade': 3,
    'Subtotal do produto': 0,          // usa precoAc * qtd
    'Preço acordado': 25.00,
    'Desconto do vendedor': 0,
    'Taxa de comissão líquida': 15.00,
    'Taxa de serviço líquida': 0,
    'Data de criação do pedido': '2026-06-15',
  },
];

describe('parseShopeeNativo', () => {
  const result = parseShopeeNativo(shopeeRows, PRODUTOS, 'Cardoso e-Shop');

  it('filtra pedido cancelado', () => {
    expect(result).toHaveLength(2);
  });

  it('mapeia ID do pedido → numeroPedido', () => {
    expect(result[0].numeroPedido).toBe('260615ABC001');
  });

  it('loja = lojaDefault passado por parâmetro', () => {
    result.forEach((p) => expect(p.loja).toBe('Cardoso e-Shop'));
  });

  it('status mapeado corretamente', () => {
    expect(result[0].status).toBe('Em processo');
    expect(result[1].status).toBe('Concluído');
  });

  it('SKU mapeado via mapearSKU', () => {
    expect(result[0].sku).toBe('FITA-BIKE');
  });

  it('SKU mapeado via ALFAZEMA → ALF-118', () => {
    expect(result[1].sku).toBe('ALF-118');
  });

  it('receita = subtotal quando > 0', () => {
    expect(result[0].receita).toBe(50);
  });

  it('receita = precoAc * qtd quando subtotal = 0', () => {
    expect(result[1].receita).toBe(75); // 25 * 3
  });

  it('taxa = comissão + serviço', () => {
    expect(result[0].taxaShopee).toBe(10); // 8 + 2
  });

  it('custo calculado com base no produto', () => {
    // FITA-BIKE custo 10.00, qtd 2, kit 1 → custo = 20
    expect(result[0].custoTotal).toBe(20);
  });

  it('lucro = receita - desconto - custo - taxa', () => {
    // 50 - 5 - 20 - 10 = 15
    expect(result[0].lucroOperacional).toBeCloseTo(15, 5);
  });

  it('dasImposto e adsMarketing = 0 (Shopee nativo)', () => {
    result.forEach((p) => {
      expect(p.dasImposto).toBe(0);
      expect(p.adsMarketing).toBe(0);
    });
  });

  it('multiplicadorKit = 1 para UN', () => {
    expect(result[0].multiplicadorKit).toBe(1);
  });

  it('data preservada do campo', () => {
    expect(result[0].data).toBe('2026-06-15');
  });
});

// ─── parseUpseller ────────────────────────────────────────────────────────────

const upsellerRows = [
  {
    'Nº de Pedido da Plataforma': '260615UPS001',
    'Estado do Pedido': 'Entregue',
    'SKU': 'ALF-118-UN',
    'Nome da Loja no UpSeller': 'Cardoso e-Shop Oficial',
    'Qtd. do Produto': '2',
    'Valor do Pedido': '50.00',
    'Hora do Pagamento': '2026-06-15',
  },
  {
    'Nº de Pedido da Plataforma': '260615UPS002',
    'Estado do Pedido': 'Cancelado',  // deve ser filtrado
    'SKU': 'FITA-BIKE-UN',
    'Nome da Loja no UpSeller': 'Cardoso e-Shop',
    'Qtd. do Produto': '1',
    'Valor do Pedido': '30.00',
    'Hora do Pagamento': '2026-06-15',
  },
  {
    'Nº de Pedido da Plataforma': '260615UPS003',
    'Estado do Pedido': 'Entregue',
    'SKU': 'FITA-MOTO-KIT2',
    'Nome da Loja no UpSeller': 'Projetando',
    'Qtd. do Produto': '1',
    'Valor do Pedido': '80.00',
    'Hora do Pagamento': '2026-06-15',
  },
];

describe('parseUpseller', () => {
  const result = parseUpseller(upsellerRows, PRODUTOS, CONF);

  it('filtra pedido cancelado', () => {
    expect(result).toHaveLength(2);
  });

  it('mapeia ID da plataforma → numeroPedido', () => {
    expect(result[0].numeroPedido).toBe('260615UPS001');
  });

  it('loja mapeada via mapearLojaUpseller', () => {
    expect(result[0].loja).toBe('Cardoso e-Shop');
    expect(result[1].loja).toBe('Projetando');
  });

  it('SKU mapeado via mapearSkuUpseller', () => {
    expect(result[0].sku).toBe('ALF-118');
  });

  it('kit 2 aplicado corretamente para FITA-MOTO-KIT2', () => {
    expect(result[1].multiplicadorKit).toBe(2);
    expect(result[1].unidadesEstoque).toBe(2); // qtd 1 * kit 2
  });

  it('DAS calculado com aliquotaDAS da configuração', () => {
    // receita 50, DAS 6% → 3
    expect(result[0].dasImposto).toBeCloseTo(3, 5);
  });

  it('ADS calculado com percentualMarketing', () => {
    // receita 50, ADS 2% → 1
    expect(result[0].adsMarketing).toBeCloseTo(1, 5);
  });

  it('taxaShopee = 0 (UpSeller não tem taxa de comissão)', () => {
    result.forEach((p) => expect(p.taxaShopee).toBe(0));
  });

  it('lucro = receita - custo - DAS - ADS', () => {
    // ALF-118: receita 50, custo 6.08*2=12.16, DAS=3, ADS=1 → lucro ≈ 33.84
    expect(result[0].lucroOperacional).toBeCloseTo(50 - 12.16 - 3 - 1, 2);
  });

  it('data preservada do campo', () => {
    expect(result[0].data).toBe('2026-06-15');
  });
});

// ─── parseGenerico ────────────────────────────────────────────────────────────

const genericoRows = [
  {
    'Nº Pedido':       'MANUAL001',
    'Data':            '2026-06-15',
    'Status':          'Concluído',
    'Loja':            'Cardoso e-Shop',
    'SKU':             'ALF-118',
    'Produto':         'Alfazema 118ml',
    'Qtd.':            '1',
    'Receita (R$)':    '25.00',
    'Desconto(R$)':    '2.00',
    'CustoTotal':      '6.08',
    'Taxa Shopee':     '5.00',
    'ADS':             '0.50',
  },
  {
    'numeroPedido':    'MANUAL002',
    'data':            '2026-06-14',
    'status':          'Enviado',
    'loja':            'Projetando',
    'sku':             'FITA-MOTO',
    'produto':         'Fita Antifuro Moto',
    'Receita (R$)':    '80.00',
  },
];

describe('parseGenerico', () => {
  const result = parseGenerico(genericoRows, PRODUTOS, 'Minha Loja');

  it('parseia 2 linhas', () => {
    expect(result).toHaveLength(2);
  });

  it('aceita campo "Nº Pedido" ou "numeroPedido"', () => {
    expect(result[0].numeroPedido).toBe('MANUAL001');
    expect(result[1].numeroPedido).toBe('MANUAL002');
  });

  it('status preservado', () => {
    expect(result[0].status).toBe('Concluído');
    expect(result[1].status).toBe('Enviado');
  });

  it('receita, desconto, custo, taxa e ADS lidos', () => {
    expect(result[0].receita).toBe(25);
    expect(result[0].desconto).toBe(2);
    expect(result[0].custoTotal).toBe(6.08);
    expect(result[0].taxaShopee).toBe(5);
    expect(result[0].adsMarketing).toBe(0.5);
  });

  it('lucro = receita - desconto - custo - taxa - ADS', () => {
    // 25 - 2 - 6.08 - 5 - 0.5 = 11.42
    expect(result[0].lucroOperacional).toBeCloseTo(11.42, 2);
  });
});

// ─── parseImportRows — detecção de formato ────────────────────────────────────

describe('parseImportRows — detecção de formato', () => {
  it('detecta Shopee Nativo pelo campo "ID do pedido"', () => {
    const { formato, isShopeeNativo } = parseImportRows(
      [shopeeRows[0]], PRODUTOS, CONF,
    );
    expect(formato).toBe('shopee_nativo');
    expect(isShopeeNativo).toBe(true);
  });

  it('detecta UpSeller pelo campo "Nº de Pedido da Plataforma"', () => {
    const { formato, isShopeeNativo } = parseImportRows(
      [upsellerRows[0]], PRODUTOS, CONF,
    );
    expect(formato).toBe('upseller');
    expect(isShopeeNativo).toBe(false);
  });

  it('detecta Genérico como fallback', () => {
    const { formato, isShopeeNativo } = parseImportRows(
      [genericoRows[0]], PRODUTOS, CONF,
    );
    expect(formato).toBe('generico');
    expect(isShopeeNativo).toBe(false);
  });

  it('delega corretamente ao parser Shopee', () => {
    const { pedidos } = parseImportRows([shopeeRows[0]], PRODUTOS, CONF);
    expect(pedidos[0].numeroPedido).toBe('260615ABC001');
    expect(pedidos[0].loja).toBe('Cardoso e-Shop');
  });

  it('delega corretamente ao parser UpSeller', () => {
    const { pedidos } = parseImportRows([upsellerRows[0]], PRODUTOS, CONF);
    expect(pedidos[0].numeroPedido).toBe('260615UPS001');
    expect(pedidos[0].dasImposto).toBeGreaterThan(0);
  });
});
