import type { Pedido, Produto } from '../../types';
import { mapearStatus } from './common';

export function mapearSKU(variantSku: string, principalSku: string): { sku: string; kit: number } {
  const s = variantSku.toUpperCase(),
    p = principalSku.toUpperCase();
  if (s.includes('FITA-BIKE-KIT3')) return { sku: 'FITA-BIKE', kit: 3 };
  if (s.includes('FITA-BIKE-KIT2')) return { sku: 'FITA-BIKE', kit: 2 };
  if (s.includes('FITA-BIKE') || s.includes('BIKE-UN')) return { sku: 'FITA-BIKE', kit: 1 };
  if (s.includes('FITA-MOTO') || s.includes('MOTO-UN')) return { sku: 'FITA-MOTO', kit: 1 };
  if (s.includes('FITA-PCX') || s.includes('PCX-UN')) return { sku: 'FITA-PCX', kit: 1 };
  if (s.includes('BAINHAC') || s.includes('BAINHA')) return { sku: 'BAINHAC', kit: 1 };
  if (s.includes('CANMAD')) return { sku: 'CANMAD', kit: 1 };
  if (s.includes('ALF-500')) return { sku: 'ALF-500', kit: 1 };
  if (s.includes('ALF-118') || s.includes('ALFAZEMA')) return { sku: 'ALF-118', kit: 1 };
  const kitN = s.match(/KIT(\d+)|(\d+)\s*PARES?|(\d+)\s*UN/);
  const kit = kitN ? parseInt(kitN[1] || kitN[2] || kitN[3]) : 1;
  if (p.includes('FITAANTIFURO-BIKE') || p.includes('FITAANTIFURO_BIKE'))
    return { sku: 'FITA-BIKE', kit };
  if (p.includes('FITAANTIFURO-MOTO') || p.includes('FITAANTIFURO_MOTO'))
    return { sku: 'FITA-MOTO', kit };
  if (p.includes('FITAANTIFURO-PCX') || p.includes('FITAANTIFURO_PCX'))
    return { sku: 'FITA-PCX', kit };
  if (p.includes('FITAANTIFURO') || p.includes('FITA')) return { sku: 'FITA-BIKE', kit };
  if (p.includes('ALFAZEMA')) return { sku: 'ALF-118', kit: 1 };
  if (p.includes('BAINHAC')) return { sku: 'BAINHAC', kit: 1 };
  return { sku: p || s || variantSku, kit: kit || 1 };
}

export function parseShopeeNativo(
  rows: Record<string, unknown>[],
  produtos: Produto[],
  lojaDefault: string
): Pedido[] {
  return rows
    .filter(
      (r) =>
        !!r['ID do pedido'] &&
        !String(r['Status do pedido'] || '')
          .toLowerCase()
          .includes('cancelado')
    )
    .map((r, i): Pedido => {
      const skuRaw = String(r['Número de referência SKU'] || r['SKU'] || '');
      const primRaw = String(r['Nº de referência do SKU principal'] || '');
      const nomeRaw = String(r['Nome do Produto'] || '');
      const { sku, kit } = mapearSKU(skuRaw, primRaw || nomeRaw);
      const prod = produtos.find((p) => p.sku === sku);
      const qtd = Math.max(1, parseInt(String(r['Quantidade'] || 1)) || 1);
      const unid = qtd * kit;
      const subtotal = parseFloat(String(r['Subtotal do produto'] || 0)) || 0;
      const precoAc = parseFloat(String(r['Preço acordado'] || 0)) || 0;
      const receita = subtotal > 0 ? subtotal : precoAc * qtd;
      const desconto = Math.abs(parseFloat(String(r['Desconto do vendedor'] || 0)) || 0);
      const comissao = Math.abs(parseFloat(String(r['Taxa de comissão líquida'] || 0)) || 0);
      const servico = Math.abs(parseFloat(String(r['Taxa de serviço líquida'] || 0)) || 0);
      const taxa = comissao + servico;
      const custo = (prod?.custoUnitario ?? 0) * unid;
      const lucro = receita - desconto - custo - taxa;
      const dataRaw = String(
        r['Data de criação do pedido'] || r['Hora do pagamento do pedido'] || ''
      ).slice(0, 10);
      const data = /^\d{4}-\d{2}-\d{2}$/.test(dataRaw)
        ? dataRaw
        : new Date().toISOString().slice(0, 10);
      const nomeCliente =
        String(
          r['Nome do Destinatário'] || r['Nome do usuário'] || r['Nome do Comprador'] || ''
        ).trim() || undefined;
      return {
        id: crypto.randomUUID(),
        numeroPedido: String(r['ID do pedido'] || `IMP-${i}`),
        data,
        status: mapearStatus(String(r['Status do pedido'] || '')),
        loja: lojaDefault,
        sku,
        produto: prod?.nome || nomeRaw.slice(0, 60),
        quantidade: qtd,
        multiplicadorKit: kit,
        unidadesEstoque: unid,
        receita,
        desconto,
        custoTotal: custo,
        taxaShopee: taxa,
        dasImposto: 0,
        adsMarketing: 0,
        lucroOperacional: lucro,
        margemSCustoProduto: custo > 0 ? (lucro / custo) * 100 : 0,
        margemSCustoTotal: receita > 0 ? (lucro / receita) * 100 : 0,
        observacoes: '',
        nomeCliente,
      };
    });
}
