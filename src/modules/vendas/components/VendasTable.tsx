import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Square,
  Trash2,
} from 'lucide-react';
import { Fragment, useEffect, useRef, useState } from 'react';

import { useStore } from '../../../store';
import type { Pedido } from '../../../types';
import type { ColDef, PagTotais, StatusPedido } from '../types';
import { STATUS_OPTIONS, STATUS_STYLE } from '../types';

// ─── SortIcon ─────────────────────────────────────────────────────────────────

function SortIcon({
  col,
  sortCol,
  sortDir,
}: {
  col: string;
  sortCol: string | null;
  sortDir: 'asc' | 'desc';
}) {
  if (sortCol !== col) return <ArrowUpDown size={11} className="ml-1 opacity-30 flex-shrink-0" />;
  return sortDir === 'asc' ? (
    <ArrowUp size={11} className="ml-1 text-core-green flex-shrink-0" />
  ) : (
    <ArrowDown size={11} className="ml-1 text-core-green flex-shrink-0" />
  );
}

// ─── getPages ─────────────────────────────────────────────────────────────────

function getPages(cur: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '…')[] = [1];
  const lo = Math.max(2, cur - 2),
    hi = Math.min(total - 1, cur + 2);
  if (lo > 2) pages.push('…');
  for (let i = lo; i <= hi; i++) pages.push(i);
  if (hi < total - 1) pages.push('…');
  pages.push(total);
  return pages;
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ pedidoId, current }: { pedidoId: string; current: StatusPedido }) {
  const updatePedidoStatus = useStore((s) => s.updatePedidoStatus);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const { badge } = STATUS_STYLE[current];
  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${badge} hover:opacity-80`}
      >
        {current}
        <ChevronDown
          size={9}
          className={`opacity-50 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 overflow-hidden min-w-[155px]">
          {STATUS_OPTIONS.map((s) => {
            const isCur = s === current;
            return (
              <button
                key={s}
                onClick={(e) => {
                  e.stopPropagation();
                  updatePedidoStatus(pedidoId, s);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 text-xs font-medium flex items-center gap-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 ${
                  isCur
                    ? 'text-core-green bg-core-green/5 dark:bg-core-green/10 dark:text-core-green'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_STYLE[s].dot}`} />
                {s}
                {isCur && <Check size={11} className="ml-auto text-core-green" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── MarginBar ────────────────────────────────────────────────────────────────

function MarginBar({ value }: { value: number }) {
  const w = Math.min(100, Math.max(0, value));
  const color = value >= 30 ? 'bg-emerald-400' : value >= 10 ? 'bg-amber-400' : 'bg-red-400';
  const text = value >= 30 ? 'text-emerald-600' : value >= 10 ? 'text-amber-600' : 'text-red-500';
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="w-14 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex-shrink-0">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${w}%` }} />
      </div>
      <span className={`text-xs font-medium whitespace-nowrap ${text}`}>{value.toFixed(1)}%</span>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface VendasTableProps {
  rows: Pedido[];
  filteredCount: number;
  pageTotais: PagTotais;
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  sortCol: string | null;
  sortDir: 'asc' | 'desc';
  onSort: (col: string) => void;
  visibleCols: Set<string>;
  visibleColsList: ColDef[];
  totalColsCount: number;
  selectedIds: Set<string>;
  allSelected: boolean;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onEdit: (p: Pedido) => void;
  onDelete: (id: string) => void;
  fmt: (n: number) => string;
}

// ─── VendasTable ─────────────────────────────────────────────────────────────

export function VendasTable({
  rows,
  filteredCount,
  pageTotais,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
  sortCol,
  sortDir,
  onSort,
  visibleCols,
  visibleColsList,
  totalColsCount,
  selectedIds,
  allSelected,
  onToggleSelect,
  onToggleSelectAll,
  expandedIds,
  onToggleExpand,
  onEdit,
  onDelete,
  fmt,
}: VendasTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 8,
    measureElement:
      typeof window !== 'undefined' && navigator.userAgent.indexOf('Firefox') === -1
        ? (el) => el?.getBoundingClientRect().height
        : undefined,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalVirtHeight = rowVirtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0 ? totalVirtHeight - virtualItems[virtualItems.length - 1].end : 0;

  return (
    <div className="card overflow-hidden">
      <div ref={parentRef} className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-400px)]">
        <table className="w-full min-w-[700px] text-sm">
          {/* thead — sticky */}
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
            <tr>
              <th className="px-3 py-3 w-8">
                <button
                  onClick={onToggleSelectAll}
                  className="text-slate-400 hover:text-core-green transition-colors"
                >
                  {allSelected ? (
                    <CheckSquare size={15} className="text-core-green" />
                  ) : (
                    <Square size={15} />
                  )}
                </button>
              </th>
              {visibleColsList.map((col) => (
                <th
                  key={col.key}
                  onClick={() => onSort(col.key)}
                  className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  <span className="inline-flex items-center">
                    {col.label}
                    <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />
                  </span>
                </th>
              ))}
              <th className="px-3 py-3 w-16" />
            </tr>
          </thead>

          {/* tbody — virtualized */}
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={totalColsCount}
                  className="text-center py-14 text-slate-400 dark:text-slate-500 text-sm"
                >
                  Nenhum pedido encontrado.
                </td>
              </tr>
            ) : (
              <>
                {paddingTop > 0 && (
                  <tr aria-hidden>
                    <td style={{ height: paddingTop }} colSpan={totalColsCount} />
                  </tr>
                )}

                {virtualItems.map((vItem) => {
                  const p = rows[vItem.index];
                  const isExpanded = expandedIds.has(p.id);
                  const custoUnit = p.unidadesEstoque > 0 ? p.custoTotal / p.unidadesEstoque : 0;
                  return (
                    <Fragment key={p.id}>
                      <tr
                        data-index={vItem.index}
                        ref={rowVirtualizer.measureElement}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('button,select,input,a')) return;
                          onToggleExpand(p.id);
                        }}
                        className={`transition-colors cursor-pointer select-none ${
                          selectedIds.has(p.id)
                            ? 'bg-core-green/5 dark:bg-core-green/10 hover:bg-core-green/5 dark:hover:bg-core-green/10'
                            : isExpanded
                              ? 'bg-slate-50/80 dark:bg-slate-700/30'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-700/20'
                        }`}
                      >
                        <td className="px-3 py-2.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleSelect(p.id);
                            }}
                            className="text-slate-300 hover:text-core-green transition-colors"
                          >
                            {selectedIds.has(p.id) ? (
                              <CheckSquare size={15} className="text-core-green" />
                            ) : (
                              <Square size={15} />
                            )}
                          </button>
                        </td>

                        {visibleCols.has('data') && (
                          <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {p.data.slice(0, 10)}
                          </td>
                        )}
                        {visibleCols.has('numeroPedido') && (
                          <td className="px-3 py-2.5 font-mono text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {p.numeroPedido}
                          </td>
                        )}
                        {visibleCols.has('status') && (
                          <td className="px-3 py-2.5">
                            <StatusBadge pedidoId={p.id} current={p.status} />
                          </td>
                        )}
                        {visibleCols.has('loja') && (
                          <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {p.loja}
                          </td>
                        )}
                        {visibleCols.has('sku') && (
                          <td className="px-3 py-2.5 font-mono text-xs font-medium text-slate-700 dark:text-slate-200">
                            {p.sku}
                          </td>
                        )}
                        {visibleCols.has('produto') && (
                          <td className="px-3 py-2.5 text-slate-800 dark:text-slate-100 whitespace-nowrap max-w-[180px] truncate">
                            {p.produto}
                          </td>
                        )}
                        {visibleCols.has('unidadesEstoque') && (
                          <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 text-center">
                            {p.unidadesEstoque}
                          </td>
                        )}
                        {visibleCols.has('receita') && (
                          <td className="px-3 py-2.5 text-slate-800 dark:text-slate-100 font-medium whitespace-nowrap">
                            {fmt(p.receita)}
                          </td>
                        )}
                        {visibleCols.has('desconto') && (
                          <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {p.desconto > 0 ? fmt(p.desconto) : '—'}
                          </td>
                        )}
                        {visibleCols.has('custoTotal') && (
                          <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {fmt(p.custoTotal)}
                          </td>
                        )}
                        {visibleCols.has('taxaShopee') && (
                          <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {fmt(p.taxaShopee)}
                          </td>
                        )}
                        {visibleCols.has('adsMarketing') && (
                          <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {fmt(p.adsMarketing)}
                          </td>
                        )}
                        {visibleCols.has('lucroOperacional') && (
                          <td
                            className={`px-3 py-2.5 font-medium whitespace-nowrap ${p.lucroOperacional >= 0 ? 'text-emerald-600' : 'text-red-500'}`}
                          >
                            {fmt(p.lucroOperacional)}
                          </td>
                        )}
                        {visibleCols.has('margemSCustoTotal') && (
                          <td className="px-3 py-2.5">
                            <MarginBar value={p.margemSCustoTotal} />
                          </td>
                        )}

                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(p);
                              }}
                              className="text-slate-300 hover:text-blue-400 transition-colors"
                              title="Editar"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(p.id);
                              }}
                              className="text-slate-300 hover:text-red-400 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-blue-50/30 dark:bg-blue-900/10 border-b border-blue-100/50 dark:border-blue-900/20">
                          <td />
                          <td colSpan={totalColsCount - 1} className="px-5 py-3">
                            <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs">
                              <div>
                                <span className="text-slate-400">Qtd. pedida: </span>
                                <span className="font-medium text-slate-700 dark:text-slate-200">
                                  {p.quantidade}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400">Mult. kit: </span>
                                <span className="font-medium text-slate-700 dark:text-slate-200">
                                  {p.multiplicadorKit}×
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400">Custo unit.: </span>
                                <span className="font-medium text-slate-700 dark:text-slate-200">
                                  {fmt(custoUnit)}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400">Margem s/ custo: </span>
                                <span
                                  className={`font-medium ${p.margemSCustoProduto >= 30 ? 'text-emerald-600' : 'text-amber-600'}`}
                                >
                                  {p.margemSCustoProduto.toFixed(1)}%
                                </span>
                              </div>
                              {p.dasImposto > 0 && (
                                <div>
                                  <span className="text-slate-400">DAS: </span>
                                  <span className="font-medium text-slate-700 dark:text-slate-200">
                                    {fmt(p.dasImposto)}
                                  </span>
                                </div>
                              )}
                              {p.observacoes && (
                                <div className="w-full mt-0.5">
                                  <span className="text-slate-400">Obs.: </span>
                                  <span className="text-slate-600 dark:text-slate-300 italic">
                                    {p.observacoes}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}

                {paddingBottom > 0 && (
                  <tr aria-hidden>
                    <td style={{ height: paddingBottom }} colSpan={totalColsCount} />
                  </tr>
                )}
              </>
            )}
          </tbody>

          {/* tfoot — page totals, sticky */}
          {rows.length > 0 && (
            <tfoot className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 sticky bottom-0">
              <tr className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                <td
                  className="px-3 py-2.5"
                  colSpan={
                    2 +
                    (visibleCols.has('data') ? 1 : 0) +
                    (visibleCols.has('numeroPedido') ? 1 : 0) +
                    (visibleCols.has('status') ? 1 : 0) +
                    (visibleCols.has('loja') ? 1 : 0) +
                    (visibleCols.has('sku') ? 1 : 0) +
                    (visibleCols.has('produto') ? 1 : 0) +
                    (visibleCols.has('unidadesEstoque') ? 1 : 0)
                  }
                >
                  Pág. {page}
                </td>
                {visibleCols.has('receita') && (
                  <td className="px-3 py-2.5 whitespace-nowrap">{fmt(pageTotais.receita)}</td>
                )}
                {visibleCols.has('desconto') && (
                  <td className="px-3 py-2.5 whitespace-nowrap">{fmt(pageTotais.desconto)}</td>
                )}
                {visibleCols.has('custoTotal') && (
                  <td className="px-3 py-2.5 whitespace-nowrap">{fmt(pageTotais.custo)}</td>
                )}
                {visibleCols.has('taxaShopee') && (
                  <td className="px-3 py-2.5 whitespace-nowrap">{fmt(pageTotais.taxa)}</td>
                )}
                {visibleCols.has('adsMarketing') && (
                  <td className="px-3 py-2.5 whitespace-nowrap">{fmt(pageTotais.ads)}</td>
                )}
                {visibleCols.has('lucroOperacional') && (
                  <td
                    className={`px-3 py-2.5 whitespace-nowrap ${pageTotais.lucro >= 0 ? 'text-emerald-600' : 'text-red-500'}`}
                  >
                    {fmt(pageTotais.lucro)}
                  </td>
                )}
                {visibleCols.has('margemSCustoTotal') && <td className="px-3 py-2.5" />}
                <td className="px-3 py-2.5" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700 flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span>Por página:</span>
          <select
            className="select w-auto py-1 text-xs"
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {filteredCount === 0
            ? 'Sem resultados'
            : `Mostrando ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filteredCount)} de ${filteredCount}`}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            {getPages(page, totalPages).map((pg, i) =>
              pg === '…' ? (
                <span key={`e${i}`} className="px-1 text-slate-400 text-xs">
                  …
                </span>
              ) : (
                <button
                  key={pg}
                  onClick={() => onPageChange(pg as number)}
                  className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-colors ${
                    page === pg
                      ? 'bg-core-green text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {pg}
                </button>
              )
            )}
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
