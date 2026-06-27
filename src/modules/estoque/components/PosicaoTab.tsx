import {
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  ExternalLink,
  Package,
  Pencil,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { EmptyState } from '../../../components/ui/EmptyState';
import type { Produto, StatusEstoque } from '../../../types';
import { fmt } from '../../../utils/calculations';
import { C } from '../../../utils/chartColors';
import { PaginationBar } from './PaginationBar';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<StatusEstoque, { badge: string; dot: string }> = {
  Comprar: { badge: 'bg-red-50    text-red-700    border-red-200', dot: 'bg-red-400' },
  'Estoque Baixo': { badge: 'bg-amber-50  text-amber-700  border-amber-200', dot: 'bg-amber-400' },
  'Estoque Estável': {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-400',
  },
  'Estoque Acima': { badge: 'bg-blue-50   text-blue-700   border-blue-200', dot: 'bg-blue-400' },
};

const STATUS_ORDER: Record<StatusEstoque, number> = {
  Comprar: 0,
  'Estoque Baixo': 1,
  'Estoque Estável': 2,
  'Estoque Acima': 3,
};

const CHART_COLORS: Record<StatusEstoque, string> = {
  Comprar: '#f87171',
  'Estoque Baixo': '#fbbf24',
  'Estoque Estável': '#34d399',
  'Estoque Acima': '#60a5fa',
};

const ALL_STATUSES: StatusEstoque[] = [
  'Comprar',
  'Estoque Baixo',
  'Estoque Estável',
  'Estoque Acima',
];

// ─── Types ────────────────────────────────────────────────────────────────────

export type EstoqueItem = Produto & {
  vendaDia: number;
  diasCobertura: number;
  ptReposicao: number;
  status: StatusEstoque;
  valorEstoque: number;
  entradas: number;
  saidas: number;
};

type SortState = { col: string; dir: 'asc' | 'desc' } | null;

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: StatusEstoque }) {
  const { badge, dot } = STATUS_STYLE[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badge}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
      {status}
    </span>
  );
}

// ─── CoverageBar ─────────────────────────────────────────────────────────────

function CoverageBar({ dias }: { dias: number }) {
  if (!isFinite(dias)) return <span className="text-slate-400 text-xs font-medium">∞</span>;
  const cap = 90;
  const w = Math.min(100, (dias / cap) * 100);
  const color = dias < 7 ? 'bg-red-400' : dias < 30 ? 'bg-amber-400' : 'bg-emerald-400';
  const text = dias < 7 ? 'text-red-600' : dias < 30 ? 'text-amber-600' : 'text-emerald-600';
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="w-12 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex-shrink-0">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${w}%` }} />
      </div>
      <span className={`text-xs font-medium whitespace-nowrap ${text}`}>{dias}d</span>
    </div>
  );
}

// ─── SortIcon ─────────────────────────────────────────────────────────────────

function SortIcon({ col, sort }: { col: string; sort: SortState }) {
  if (!sort || sort.col !== col)
    return <ChevronsUpDown size={11} className="text-slate-300 flex-shrink-0" />;
  return sort.dir === 'asc' ? (
    <ChevronUp size={11} className="text-core-green flex-shrink-0" />
  ) : (
    <ChevronDown size={11} className="text-core-green flex-shrink-0" />
  );
}

// ─── ChartTooltip ─────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs">
      <p className="font-mono font-bold text-slate-800 dark:text-slate-100 mb-0.5">{d.sku}</p>
      <p className="text-slate-600 dark:text-slate-300">{fmt(d.valor)}</p>
      <p className="text-slate-400">{d.pct.toFixed(1)}% do total</p>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PosicaoTabProps {
  estoqueData: EstoqueItem[];
  totalEstoque: number;
  chartData: { sku: string; valor: number; pct: number; status: StatusEstoque }[];
  precisamComprar: EstoqueItem[];
  coberturaMedia: number | null;
  produtosCount: number;
  onEditProduto: (sku: string) => void;
  onDeleteProduto: (sku: string) => void;
  onAjuste: () => void;
}

// ─── PosicaoTab ───────────────────────────────────────────────────────────────

export function PosicaoTab({
  estoqueData,
  totalEstoque,
  chartData,
  precisamComprar,
  coberturaMedia,
  produtosCount,
  onEditProduto,
  onDeleteProduto,
  onAjuste,
}: PosicaoTabProps) {
  const [posSearch, setPosSearch] = useState('');
  const [posStatuses, setPosStatuses] = useState<Set<StatusEstoque>>(new Set());
  const [posSort, setPosSort] = useState<SortState>(null);
  const [posPage, setPosPage] = useState(1);
  const [posPageSize, setPosPageSize] = useState(20);

  useEffect(() => setPosPage(1), [posSearch, posStatuses, posSort]);

  const toggleStatus = (s: StatusEstoque) =>
    setPosStatuses((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });

  const posFiltered = useMemo(() => {
    const q = posSearch.toLowerCase();
    return estoqueData.filter((p) => {
      if (posStatuses.size > 0 && !posStatuses.has(p.status)) return false;
      if (q && !p.sku.toLowerCase().includes(q) && !p.nome.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [estoqueData, posSearch, posStatuses]);

  const posSorted = useMemo(() => {
    if (!posSort) return posFiltered;
    return [...posFiltered].sort((a, b) => {
      const { col, dir } = posSort;
      let va: any = (a as any)[col];
      let vb: any = (b as any)[col];
      if (col === 'status') {
        va = STATUS_ORDER[va as StatusEstoque];
        vb = STATUS_ORDER[vb as StatusEstoque];
      }
      if (col === 'diasCobertura') {
        va = isFinite(va) ? va : 99999;
        vb = isFinite(vb) ? vb : 99999;
      }
      const cmp = typeof va === 'string' ? va.localeCompare(vb) : (va ?? 0) - (vb ?? 0);
      return dir === 'asc' ? cmp : -cmp;
    });
  }, [posFiltered, posSort]);

  const posPaginados = posSorted.slice((posPage - 1) * posPageSize, posPage * posPageSize);

  const handlePosSort = (col: string) =>
    setPosSort((prev) =>
      prev?.col === col ? (prev.dir === 'asc' ? { col, dir: 'desc' } : null) : { col, dir: 'asc' }
    );

  const SortTh = ({
    col,
    label,
    className = '',
  }: {
    col: string;
    label: string;
    className?: string;
  }) => (
    <th
      onClick={() => handlePosSort(col)}
      className={`px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${className}`}
    >
      <span className="flex items-center gap-1">
        {label}
        <SortIcon col={col} sort={posSort} />
      </span>
    </th>
  );

  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">Valor em Estoque</p>
          <p className="text-slate-900 dark:text-slate-100 font-bold text-xl">
            {fmt(totalEstoque)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">SKUs Cadastrados</p>
          <p className="text-slate-900 dark:text-slate-100 font-bold text-xl">{produtosCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">Precisam Comprar</p>
          <p
            className={`font-bold text-xl ${precisamComprar.length > 0 ? 'text-red-500' : 'text-emerald-600'}`}
          >
            {precisamComprar.length > 0
              ? `${precisamComprar.length} SKU${precisamComprar.length > 1 ? 's' : ''}`
              : 'Nenhum'}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">Cobertura Média</p>
          <p className="text-slate-900 dark:text-slate-100 font-bold text-xl">
            {coberturaMedia !== null ? `${coberturaMedia}d` : '—'}
          </p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
            Composição do Estoque — top {chartData.length} SKUs por valor
          </p>
          <ResponsiveContainer width="100%" height={chartData.length * 32 + 8}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 56, left: 0, bottom: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis
                dataKey="sku"
                type="category"
                width={96}
                tick={{ fontSize: 11, fontFamily: 'monospace', fill: C.slate }}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
              <Bar
                dataKey="valor"
                radius={[0, 4, 4, 0]}
                label={{
                  content: (props: {
                    x?: number | string;
                    y?: number | string;
                    width?: number | string;
                    height?: number | string;
                    index?: number;
                  }) => {
                    const x = Number(props.x ?? 0);
                    const y = Number(props.y ?? 0);
                    const width = Number(props.width ?? 0);
                    const height = Number(props.height ?? 0);
                    const index = props.index ?? 0;
                    const pct = chartData[index]?.pct;
                    if (pct === undefined) return null;
                    return (
                      <text
                        x={x + width + 4}
                        y={y + height / 2}
                        fontSize={11}
                        fill={C.slate}
                        dominantBaseline="middle"
                      >
                        {pct.toFixed(0)}%
                      </text>
                    );
                  },
                }}
              >
                {chartData.map((d, i) => (
                  <Cell key={i} fill={CHART_COLORS[d.status as StatusEstoque]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      {/* Empty state — sem produtos cadastrados */}
      {estoqueData.length === 0 && (
        <EmptyState
          icon={<Package size={22} />}
          title="Nenhum produto cadastrado"
          description="Adicione seus produtos com SKU, custo e estoque de segurança para monitorar reposição e cobertura."
        />
      )}

      {estoqueData.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-48">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                className="input pl-8"
                placeholder="Buscar SKU ou produto…"
                value={posSearch}
                onChange={(e) => setPosSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {ALL_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleStatus(s)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    posStatuses.has(s)
                      ? STATUS_STYLE[s].badge
                      : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_STYLE[s].dot}`}
                  />
                  {s}
                  {posStatuses.has(s) && <X size={10} />}
                </button>
              ))}
              {posStatuses.size > 0 && (
                <button
                  onClick={() => setPosStatuses(new Set())}
                  className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                  <X size={11} /> Limpar
                </button>
              )}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-520px)]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                  <tr>
                    <SortTh col="sku" label="SKU" />
                    <SortTh col="nome" label="Produto" />
                    <SortTh col="entradas" label="Entradas" />
                    <SortTh col="saidas" label="Saídas" />
                    <SortTh col="estoqueAtual" label="Atual" />
                    <SortTh col="custoUnitario" label="Custo Unit." />
                    <SortTh col="valorEstoque" label="Valor Est." />
                    <SortTh col="vendaDia" label="Venda/Dia" />
                    <SortTh col="diasCobertura" label="Cobertura" />
                    <SortTh col="ptReposicao" label="Pt. Reposição" />
                    <SortTh col="status" label="Status" />
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {posPaginados.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="text-center py-12 text-slate-400 text-sm">
                        Nenhum SKU encontrado.
                      </td>
                    </tr>
                  ) : (
                    posPaginados.map((p) => (
                      <tr
                        key={p.sku}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors"
                      >
                        <td className="px-3 py-3">
                          <Link
                            to={`/estoque/${p.sku}`}
                            className="font-mono text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-core-green transition-colors"
                          >
                            {p.sku}
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-slate-800 dark:text-slate-200 font-medium whitespace-nowrap">
                          {p.nome}
                        </td>
                        <td className="px-3 py-3 text-emerald-600 font-medium">{p.entradas}</td>
                        <td className="px-3 py-3 text-red-500">{p.saidas}</td>
                        <td className="px-3 py-3 font-bold text-slate-900 dark:text-slate-100">
                          {p.estoqueAtual}
                        </td>
                        <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                          {fmt(p.custoUnitario)}
                        </td>
                        <td className="px-3 py-3 text-slate-700 dark:text-slate-200 font-medium">
                          {fmt(p.valorEstoque)}
                        </td>
                        <td className="px-3 py-3 text-slate-500 dark:text-slate-400">
                          {p.vendaDia > 0 ? p.vendaDia.toFixed(2) : '—'}
                        </td>
                        <td className="px-3 py-3">
                          <CoverageBar dias={p.diasCobertura} />
                        </td>
                        <td className="px-3 py-3 text-slate-500 dark:text-slate-400">
                          {p.ptReposicao > 0 ? p.ptReposicao : '—'}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/estoque/${p.sku}`}
                              className="text-slate-300 hover:text-core-green transition-colors"
                              title="Ver detalhes"
                            >
                              <ExternalLink size={13} />
                            </Link>
                            <button
                              onClick={() => onEditProduto(p.sku)}
                              className="text-slate-300 hover:text-core-green transition-colors"
                              title="Editar produto"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => onAjuste()}
                              className="text-slate-300 hover:text-core-green transition-colors"
                              title="Ajustar estoque"
                            >
                              <Package size={13} />
                            </button>
                            <button
                              onClick={() => onDeleteProduto(p.sku)}
                              className="text-slate-300 hover:text-red-400 transition-colors"
                              title="Excluir produto"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <PaginationBar
              page={posPage}
              total={posFiltered.length}
              pageSize={posPageSize}
              onPage={setPosPage}
              onPageSize={setPosPageSize}
            />
          </div>
        </div>
      )}
    </>
  );
}
