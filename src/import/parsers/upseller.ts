import type { Pedido, Produto, Configuracoes } from '../../types';
import { mapearStatus } from './common';

export function mapearSkuUpseller(skuRaw: string): { sku: string; kit: number } {
  const s = skuRaw.trim();
  const kitMatch = s.match(/^(ALF-118|ALF-500|FITA-BIKE|FITA-MOTO|FITA-PCX)-KIT(\d+)$/i);
  if (kitMatch) return { sku: kitMatch[1].toUpperCase(), kit: parseInt(kitMatch[2]) };
  const unMatch = s.match(/^(ALF-118|ALF-500|FITA-BIKE|FITA-MOTO|FITA-PCX)-UN$/i);
  if (unMatch) return { sku: unMatch[1].toUpperCase(), kit: 1 };
  const bcoKit = s.match(/^BCO-KIT(\d+)$/i);
  if (bcoKit) return { sku: 'BAINHAC', kit: parseInt(bcoKit[1]) };
  if (/^(BAINHAC|BCO-|BCOP|1UN\s*(PRETA|CAFE|PRETO))/i.test(s)) return { sku: 'BAINHAC', kit: 1 };
  if (/preta|cafe/i.test(s) && !/CANMAD/i.test(s)) return { sku: 'BAINHAC', kit: 1 };
  if (/^CANMAD-BAI/i.test(s)) return { sku: 'CANMAD-BAINHAC', kit: 1 };
  if (/^CANMAD/i.test(s))     return { sku: 'CANMAD', kit: 1 };
  if (/TIPOC|CJ13-3/i.test(s)) return { sku: 'CJ13-3', kit: 1 };
  if (/MICRO|CJ13-2|CABO\s*IOS/i.test(s)) return { sku: 'CJ13-2', kit: 1 };
  if (/BASE-L14|L14-4/i.test(s)) return { sku: 'L14-4', kit: 1 };
  if (/^1\s*PAR$/i.test(s))   return { sku: 'FITA-BIKE', kit: 1 };
  if (/^2\s*PARES$/i.test(s)) return { sku: 'FITA-BIKE', kit: 2 };
  if (/118ml.*500ml|500ml.*118ml/i.test(s)) return { sku: 'ALF-118', kit: 1 };
  return { sku: s, kit: 1 };
}

export function mapearLojaUpseller(loja: string): string {
  const l = loja.toLowerCase();
  if (l.includes('cardoso'))    return 'Cardoso e-Shop';
  if (l.includes('projetando')) return 'Projetando';
  return loja;
}

export function parseUpseller(rows: any[], produtos: Produto[], configuracoes: Configuracoes): Pedido[] {
  return rows
    .filter((r) => !!r['Nº de Pedido da Plataforma'] && !String(r['Estado do Pedido'] || '').toLowerCase().includes('cancelado'))
    .map((r, i): Pedido => {
      const { sku, kit } = mapearSkuUpseller(String(r['SKU'] || ''));
      const prod    = produtos.find((p) => p.sku === sku);
      const qtd     = Math.max(1, parseInt(String(r['Qtd. do Produto'] || 1)) || 1);
      const unid    = qtd * kit;
      const receita = parseFloat(String(r['Valor do Pedido'] || 0)) || 0;
      const custo   = (prod?.custoUnitario ?? 0) * unid;
      const das     = receita * (configuracoes.aliquotaDAS / 100);
      const ads     = receita * (configuracoes.percentualMarketing / 100);
      const lucro   = receita - custo - das - ads;
      const dataRaw = String(r['Hora do Pagamento'] || '').slice(0, 10);
      const data    = /^\d{4}-\d{2}-\d{2}$/.test(dataRaw) ? dataRaw : new Date().toISOString().slice(0, 10);
      return {
        id: crypto.randomUUID(),
        numeroPedido: String(r['Nº de Pedido da Plataforma'] || `IMP-${i}`), data,
        status: mapearStatus(String(r['Estado do Pedido'] || '')),
        loja: mapearLojaUpseller(String(r['Nome da Loja no UpSeller'] || '')),
        sku, produto: prod?.nome || String(r['SKU'] || '').slice(0, 60),
        quantidade: qtd, multiplicadorKit: kit, unidadesEstoque: unid,
        receita, desconto: 0, custoTotal: custo, taxaShopee: 0, dasImposto: das, adsMarketing: ads,
        lucroOperacional: lucro,
        margemSCustoProduto: custo > 0 ? (lucro / custo) * 100 : 0,
        margemSCustoTotal:   receita > 0 ? (lucro / receita) * 100 : 0,
        observacoes: '',
      };
    });
}
