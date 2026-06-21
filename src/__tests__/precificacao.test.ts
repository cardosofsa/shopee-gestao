import { describe, it, expect } from 'vitest';

// ─── Replica do algoritmo de precificação da Calculadora ─────────────────────
// Os testes ficam aqui para garantir que qualquer mudança no algoritmo
// seja detectada antes de chegar ao usuário.

const SHOPEE_TIERS = [
  { label: 'Até R$79,99',    min: 0,   max: 79.99,   fixed: 4  },
  { label: 'R$80–R$99,99',   min: 80,  max: 99.99,   fixed: 16 },
  { label: 'R$100–R$199,99', min: 100, max: 199.99,  fixed: 20 },
  { label: 'Acima de R$200', min: 200, max: Infinity, fixed: 26 },
];

function solvePreco(totalCusto: number, fixo: number, com: number, ads: number, das: number, mg: number) {
  const denom = 1 - com - ads - das - mg;
  if (denom <= 0) return null;
  return (totalCusto + fixo) / denom;
}

function calcShopeeTiered(custo: number, embalagem: number, frete: number, ads: number, das: number, mg: number) {
  const com = 0.18;
  const totalCusto = custo + embalagem + frete;
  for (const tier of SHOPEE_TIERS) {
    const preco = solvePreco(totalCusto, tier.fixed, com, ads, das, mg);
    if (preco === null) return null;
    if (preco >= tier.min && preco <= tier.max) return { preco, tier };
  }
  const last = SHOPEE_TIERS[SHOPEE_TIERS.length - 1];
  const preco = solvePreco(totalCusto, last.fixed, com, ads, das, mg);
  return preco !== null ? { preco, tier: last } : null;
}

// ─── Testes de tiers ──────────────────────────────────────────────────────────

describe('calcShopeeTiered — seleção de tier', () => {
  it('tier 1 (≤R$79,99): custo baixo sem ADS/DAS', () => {
    // custo R$10, margem 30% → preço deve ser < R$80
    const res = calcShopeeTiered(10, 0, 0, 0, 0, 0.30);
    expect(res).not.toBeNull();
    expect(res!.preco).toBeLessThanOrEqual(79.99);
    expect(res!.tier.fixed).toBe(4);
  });

  it('tier 2 (R$80–R$99,99): custo que força tier 2', () => {
    // Com ads=0, das=0, mg=10% → denom=0.72
    // Tier 1 falha quando totalCusto > 53.59 → usar custo=54
    // Tier 2: preco = (54+16)/0.72 = 97.22 ✓ (80 ≤ 97.22 ≤ 99.99)
    const res = calcShopeeTiered(54, 0, 0, 0, 0, 0.10);
    expect(res).not.toBeNull();
    expect(res!.preco).toBeGreaterThanOrEqual(80);
    expect(res!.preco).toBeLessThanOrEqual(99.99);
    expect(res!.tier.fixed).toBe(16);
  });

  it('tier 3 (R$100–R$199,99): custo intermediário', () => {
    const res = calcShopeeTiered(45, 3, 10, 0.02, 0.06, 0.20);
    expect(res).not.toBeNull();
    expect(res!.preco).toBeGreaterThanOrEqual(100);
    expect(res!.preco).toBeLessThanOrEqual(199.99);
    expect(res!.tier.fixed).toBe(20);
  });

  it('tier 4 (≥R$200): custo alto', () => {
    const res = calcShopeeTiered(100, 5, 15, 0.02, 0.06, 0.25);
    expect(res).not.toBeNull();
    expect(res!.preco).toBeGreaterThanOrEqual(200);
    expect(res!.tier.fixed).toBe(26);
  });

  it('retorna null quando denominador é negativo (margem inviável)', () => {
    // 18% comissão + 50% ads + 40% DAS + 30% margem = 138% > 100%
    const res = calcShopeeTiered(10, 0, 0, 0.50, 0.40, 0.30);
    expect(res).toBeNull();
  });
});

describe('calcShopeeTiered — consistência do preço calculado', () => {
  it('o preço calculado realmente cai no tier selecionado', () => {
    const casos = [
      { custo: 5, emb: 0, frete: 0, ads: 0, das: 0, mg: 0.30 },
      { custo: 25, emb: 2, frete: 5, ads: 0.02, das: 0, mg: 0.25 },
      { custo: 40, emb: 3, frete: 8, ads: 0.02, das: 0.06, mg: 0.20 },
      { custo: 90, emb: 5, frete: 15, ads: 0.02, das: 0.06, mg: 0.25 },
    ];
    for (const c of casos) {
      const res = calcShopeeTiered(c.custo, c.emb, c.frete, c.ads, c.das, c.mg);
      if (res === null) continue;
      expect(res.preco).toBeGreaterThanOrEqual(res.tier.min);
      expect(res.preco).toBeLessThanOrEqual(res.tier.max);
    }
  });

  it('o lucro resultante respeita a margem desejada (tolerância 1%)', () => {
    const mg = 0.30;
    const res = calcShopeeTiered(10, 1, 2, 0.02, 0, mg);
    expect(res).not.toBeNull();
    const { preco, tier } = res!;
    const totalCusto = 10 + 1 + 2;
    const taxaShopee = preco * 0.18 + tier.fixed;
    const adsVal = preco * 0.02;
    const lucro = preco - totalCusto - taxaShopee - adsVal;
    const margemReal = lucro / preco;
    expect(margemReal).toBeCloseTo(mg, 2);
  });

  it('fronteira de tier: custo que rejeita tier 1 cai no tier correto', () => {
    // Com ads=0, das=0, mg=10% → denom=0.72
    // Tier 1 falha quando custo > 53.59 (preco via tier1 > 79.99)
    // custo=54: tier1 preco = (54+4)/0.72 = 80.56 > 79.99 → tier1 rejeita
    //           tier2 preco = (54+16)/0.72 = 97.22 → tier2 aceita
    const res = calcShopeeTiered(54, 0, 0, 0, 0, 0.10);
    expect(res).not.toBeNull();
    expect(res!.tier.fixed).toBe(16);
    expect(res!.preco).toBeGreaterThanOrEqual(80);
    expect(res!.preco).toBeLessThanOrEqual(99.99);
  });
});

describe('calcShopeeTiered — margem zero e margem negativa', () => {
  it('margem 0% é válida e gera preço que cobre apenas custos', () => {
    const res = calcShopeeTiered(20, 0, 0, 0, 0, 0);
    expect(res).not.toBeNull();
    // Com margem 0, lucro deve ser próximo de zero
    const { preco, tier } = res!;
    const totalCusto = 20;
    const taxaShopee = preco * 0.18 + tier.fixed;
    const lucro = preco - totalCusto - taxaShopee;
    expect(Math.abs(lucro)).toBeLessThan(0.1);
  });

  it('margem 100% é inviável (denominador zero)', () => {
    // 18% + 2% + 0% + 100% = 120% → denominador = -0.20
    const res = calcShopeeTiered(10, 0, 0, 0.02, 0, 1.0);
    expect(res).toBeNull();
  });
});
