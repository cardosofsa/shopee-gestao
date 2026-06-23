import type { Pedido, Produto, Configuracoes } from '../../types';
import { parseShopeeNativo } from './shopee';
import { parseUpseller } from './upseller';
import { parseGenerico } from './generico';

export type ImportFormato = 'shopee_nativo' | 'upseller' | 'generico';

export interface ParsedImport {
  pedidos: Pedido[];
  formato: ImportFormato;
  isShopeeNativo: boolean;
}

export function parseImportRows(
  rows: any[],
  produtos: Produto[],
  configuracoes: Configuracoes,
): ParsedImport {
  const isUpSeller = 'Nº de Pedido da Plataforma' in rows[0] || 'Nome da Loja no UpSeller' in rows[0];
  const isShopeeNativo = !isUpSeller && ('ID do pedido' in rows[0] || 'Número de referência SKU' in rows[0]);
  const formato: ImportFormato = isUpSeller ? 'upseller' : isShopeeNativo ? 'shopee_nativo' : 'generico';
  const lojaDefault = configuracoes.lojas[0] ?? 'Ambas';
  const pedidos = isUpSeller ? parseUpseller(rows, produtos, configuracoes)
    : isShopeeNativo ? parseShopeeNativo(rows, produtos, lojaDefault)
    : parseGenerico(rows, produtos, lojaDefault);
  return { pedidos, formato, isShopeeNativo };
}
