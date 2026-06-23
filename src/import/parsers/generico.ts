import type { Pedido, Produto } from '../../types';

export function parseGenerico(rows: any[], produtos: Produto[], lojaDefault: string): Pedido[] {
  return rows
    .filter((r) => !!(r['Nº Pedido'] || r['numeroPedido']))
    .map((r, i): Pedido => {
      const sku      = String(r['SKU'] || r['sku'] || '');
      const prod     = produtos.find((p) => p.sku === sku);
      const receita  = parseFloat(String(r['Receita (R$)'] || r['receita'] || 0)) || 0;
      const desconto = parseFloat(String(r['Desconto(R$)'] || r['desconto'] || 0)) || 0;
      const custo    = parseFloat(String(r['CustoTotal'] || r['custo_total'] || prod?.custoUnitario || 0)) || 0;
      const taxa     = parseFloat(String(r['Taxa Shopee'] || r['taxa_shopee'] || 0)) || 0;
      const ads      = parseFloat(String(r['ADS'] || r['ads'] || 0)) || 0;
      const lucro    = receita - desconto - custo - taxa - ads;
      return {
        id: crypto.randomUUID(),
        numeroPedido: String(r['Nº Pedido'] || r['numeroPedido'] || `IMP-${i}`),
        data: String(r['Data'] || r['data'] || new Date().toISOString().slice(0, 10)),
        status: (r['Status'] || r['status'] || 'Concluído') as Pedido['status'],
        loja: String(r['Loja'] || r['loja'] || lojaDefault),
        sku, produto: String(r['Produto'] || r['produto'] || prod?.nome || ''),
        quantidade: parseInt(String(r['Qtd.'] || r['quantidade'] || 1)) || 1,
        multiplicadorKit: parseInt(String(r['Mult. Kit'] || r['multiplicador_kit'] || 1)) || 1,
        unidadesEstoque: parseInt(String(r['Unid. Estoque'] || r['unidades_estoque'] || 1)) || 1,
        receita, desconto, custoTotal: custo, taxaShopee: taxa, dasImposto: 0, adsMarketing: ads,
        lucroOperacional: lucro,
        margemSCustoProduto: custo > 0 ? (lucro / custo) * 100 : 0,
        margemSCustoTotal:   custo > 0 ? (lucro / custo) * 100 : 0,
        observacoes: '',
      };
    });
}
