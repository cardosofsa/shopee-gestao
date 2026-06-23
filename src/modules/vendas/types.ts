import type { StatusPedido } from '../../types';

export type { StatusPedido };

export const STATUS_OPTIONS: StatusPedido[] = ['Em processo', 'Enviado', 'Concluído', 'Devolvido'];

export const STATUS_STYLE: Record<StatusPedido, { badge: string; dot: string }> = {
  'Em processo': { badge: 'bg-amber-50  text-amber-700  border-amber-200',     dot: 'bg-amber-400'   },
  'Enviado':     { badge: 'bg-blue-50   text-blue-700   border-blue-200',      dot: 'bg-blue-400'    },
  'Concluído':   { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400' },
  'Devolvido':   { badge: 'bg-red-50    text-red-700    border-red-200',       dot: 'bg-red-400'     },
};

export interface ColDef { key: string; label: string; numeric?: boolean }

export const COLS: ColDef[] = [
  { key: 'data',              label: 'Data' },
  { key: 'numeroPedido',      label: 'Nº Pedido' },
  { key: 'status',            label: 'Status' },
  { key: 'loja',              label: 'Loja' },
  { key: 'sku',               label: 'SKU' },
  { key: 'produto',           label: 'Produto' },
  { key: 'unidadesEstoque',   label: 'Unid.',     numeric: true },
  { key: 'receita',           label: 'Receita',   numeric: true },
  { key: 'desconto',          label: 'Desconto',  numeric: true },
  { key: 'custoTotal',        label: 'Custo',     numeric: true },
  { key: 'taxaShopee',        label: 'Taxa',      numeric: true },
  { key: 'adsMarketing',      label: 'ADS',       numeric: true },
  { key: 'lucroOperacional',  label: 'Lucro Op.', numeric: true },
  { key: 'margemSCustoTotal', label: 'Margem',    numeric: true },
];

export const ALL_KEYS = new Set(COLS.map((c) => c.key));

export interface Filters {
  dateFrom: string;
  dateTo: string;
  statuses: Set<StatusPedido>;
  lojas: Set<string>;
  skus: Set<string>;
}

export const EMPTY_FILTERS: Filters = {
  dateFrom: '', dateTo: '', statuses: new Set(), lojas: new Set(), skus: new Set(),
};

export interface PagTotais {
  receita: number;
  desconto: number;
  custo: number;
  taxa: number;
  ads: number;
  lucro: number;
}
