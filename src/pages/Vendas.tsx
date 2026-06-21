import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  Upload, Search, Plus, Trash2, X, Download, Filter, Columns,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useStore } from '../store';
import { fmt } from '../utils/calculations';
import type { Pedido, StatusPedido } from '../types';
import { dbImportacoes, type ImportacaoLog } from '../lib/db';
import { useToast } from '../components/Toast';
import { COLS, ALL_KEYS, EMPTY_FILTERS } from './vendas/types';
import type { Filters, PagTotais } from './vendas/types';
import { FilterPanel } from './vendas/FilterPanel';
import { VendasTable } from './vendas/VendasTable';
import { parseImportRows } from '../import/parsers';

// ─── DeltaBadge ───────────────────────────────────────────────────────────────

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const up  = pct >= 0;
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ml-1.5 flex-shrink-0 ${up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
      {up ? '↑' : '↓'} {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

// ─── ConfirmDeleteModal ───────────────────────────────────────────────────────

function ConfirmDeleteModal({ count, onConfirm, onCancel }: {
  count: number; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-5 text-center">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <Trash2 size={20} className="text-red-500" />
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
            Excluir {count} pedido{count !== 1 ? 's' : ''}?
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Esta ação não pode ser desfeita.</p>
        </div>
        <div className="px-6 pb-5 flex gap-3">
          <button className="btn-secondary flex-1 justify-center" onClick={onCancel}>Cancelar</button>
          <button className="btn-danger flex-1 justify-center" onClick={onConfirm}>Excluir</button>
        </div>
      </div>
    </div>
  );
}

// ─── ImportPreviewModal ───────────────────────────────────────────────────────

function ImportPreviewModal({ novos, duplicados, lojaCustom, onLojaChange, lojaOpcoes, onConfirm, onCancel }: {
  novos: Pedido[]; duplicados: number;
  lojaCustom?: string; onLojaChange?: (l: string) => void; lojaOpcoes?: string[];
  onConfirm: () => void; onCancel: () => void;
}) {
  const preview      = novos.slice(0, 15);
  const receitaTotal = novos.reduce((s, p) => s + p.receita, 0);

  const STATUS_STYLE: Record<StatusPedido, { badge: string }> = {
    'Em processo': { badge: 'bg-amber-50  text-amber-700  border-amber-200'    },
    'Enviado':     { badge: 'bg-blue-50   text-blue-700   border-blue-200'     },
    'Concluído':   { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    'Devolvido':   { badge: 'bg-red-50    text-red-700    border-red-200'      },
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Preview de Importação</h3>
          <div className="flex flex-wrap gap-4 mt-2 items-center">
            <span className="text-sm font-medium text-emerald-600">{novos.length} novos pedidos</span>
            {duplicados > 0 && (
              <span className="text-sm text-slate-400">
                {duplicados} duplicado{duplicados !== 1 ? 's' : ''} ignorado{duplicados !== 1 ? 's' : ''}
              </span>
            )}
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Receita total: <span className="font-medium text-slate-700 dark:text-slate-200">{fmt(receitaTotal)}</span>
            </span>
            {lojaCustom !== undefined && lojaOpcoes && (
              <div className="flex items-center gap-2 ml-auto">
                <label className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">Loja dos pedidos:</label>
                <select
                  className="select text-sm py-1"
                  value={lojaCustom}
                  onChange={(e) => onLojaChange?.(e.target.value)}
                >
                  {lojaOpcoes.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
              <tr>
                {['Data', 'Nº Pedido', 'Loja', 'SKU', 'Receita', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-slate-500 dark:text-slate-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {preview.map((p, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{p.data}</td>
                  <td className="px-4 py-2 font-mono text-slate-600 dark:text-slate-300">{p.numeroPedido}</td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{lojaCustom ?? p.loja}</td>
                  <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-200">{p.sku}</td>
                  <td className="px-4 py-2 text-emerald-600 font-medium">{fmt(p.receita)}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium ${STATUS_STYLE[p.status].badge}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {novos.length > 15 && (
            <p className="text-center py-4 text-slate-400 text-xs">
              … e mais {novos.length - 15} pedidos não exibidos
            </p>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
          <button className="btn-secondary" onClick={onCancel}>Cancelar</button>
          <button className="btn-primary" onClick={onConfirm}>
            Confirmar importação ({novos.length} pedidos)
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PedidoModal ─────────────────────────────────────────────────────────────

function PedidoModal({ initialData, onSave, onClose }: {
  initialData?: Pedido; onSave: (p: Pedido) => void; onClose: () => void;
}) {
  const STATUS_OPTIONS: StatusPedido[] = ['Em processo', 'Enviado', 'Concluído', 'Devolvido'];
  const produtos = useStore((s) => s.produtos);
  const isEdit   = !!initialData;

  const [form, setForm] = useState({
    numeroPedido:     initialData?.numeroPedido     ?? '',
    data:             initialData?.data             ?? new Date().toISOString().slice(0, 10),
    status:           initialData?.status           ?? ('Em processo' as StatusPedido),
    loja:             initialData?.loja             ?? 'Cardoso e-Shop',
    sku:              initialData?.sku              ?? (produtos[0]?.sku ?? ''),
    quantidade:       initialData?.quantidade       ?? 1,
    multiplicadorKit: initialData?.multiplicadorKit ?? 1,
    receita:          initialData?.receita          ?? 0,
    desconto:         initialData?.desconto         ?? 0,
    taxaShopee:       initialData?.taxaShopee       ?? 0,
    adsMarketing:     initialData?.adsMarketing     ?? 0,
    observacoes:      initialData?.observacoes      ?? '',
  });

  const produto    = produtos.find((p) => p.sku === form.sku);
  const unidades   = form.quantidade * form.multiplicadorKit;
  const custoTotal = (produto?.custoUnitario ?? 0) * unidades;
  const lucroOp    = form.receita - form.desconto - custoTotal - form.taxaShopee - form.adsMarketing;
  const margemPct  = form.receita > 0 ? (lucroOp / form.receita) * 100 : 0;

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({
      ...p,
      [k]: e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value,
    }));

  const save = () => {
    const pedido: Pedido = {
      id:                  initialData?.id ?? crypto.randomUUID(),
      ...form,
      produto:             produto?.nome ?? initialData?.produto ?? '',
      unidadesEstoque:     unidades,
      custoTotal,
      dasImposto:          0,
      lucroOperacional:    lucroOp,
      margemSCustoProduto: custoTotal > 0 ? (lucroOp / custoTotal) * 100 : 0,
      margemSCustoTotal:   form.receita > 0 ? (lucroOp / form.receita) * 100 : 0,
    };
    onSave(pedido);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            {isEdit ? `Editar — ${initialData.numeroPedido}` : 'Novo Pedido'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Nº Pedido</label>
            <input className="input" value={form.numeroPedido} onChange={f('numeroPedido')} placeholder="260601XXXXXXXX" />
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Data</label>
            <input type="date" className="input" value={form.data} onChange={f('data')} />
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Loja</label>
            <select className="select" value={form.loja} onChange={f('loja')}>
              <option>Cardoso e-Shop</option><option>Projetando</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">SKU</label>
            <select className="select" value={form.sku} onChange={f('sku')}>
              {produtos.map((p) => (
                <option key={p.sku} value={p.sku}>{p.sku} — {p.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Status</label>
            <select className="select" value={form.status} onChange={f('status')}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Qtd. Pedido</label>
            <input type="number" min={1} className="input" value={form.quantidade} onChange={f('quantidade')} />
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Mult. Kit (unid./pedido)</label>
            <input type="number" min={1} className="input" value={form.multiplicadorKit} onChange={f('multiplicadorKit')} />
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Receita (R$)</label>
            <input type="number" step="0.01" className="input" value={form.receita} onChange={f('receita')} />
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Desconto (R$)</label>
            <input type="number" step="0.01" className="input" value={form.desconto} onChange={f('desconto')} />
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Taxa Shopee (R$)</label>
            <input type="number" step="0.01" className="input" value={form.taxaShopee} onChange={f('taxaShopee')} />
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">ADS (R$)</label>
            <input type="number" step="0.01" className="input" value={form.adsMarketing} onChange={f('adsMarketing')} />
          </div>

          <div className="col-span-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 flex flex-wrap gap-5 text-sm">
            <span className="text-slate-500 dark:text-slate-400">Unidades: <span className="font-medium text-slate-800 dark:text-slate-100">{unidades}</span></span>
            <span className="text-slate-500 dark:text-slate-400">Custo: <span className="font-medium text-slate-800 dark:text-slate-100">{fmt(custoTotal)}</span></span>
            <span className="text-slate-500 dark:text-slate-400">Lucro Op.:
              <span className={`font-medium ml-1 ${lucroOp >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(lucroOp)}</span>
            </span>
            {form.receita > 0 && (
              <span className="text-slate-500 dark:text-slate-400">Margem:
                <span className={`font-medium ml-1 ${margemPct >= 20 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {margemPct.toFixed(1)}%
                </span>
              </span>
            )}
          </div>

          <div className="col-span-2">
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Observações</label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Anotações sobre este pedido…"
              value={form.observacoes}
              onChange={f('observacoes')}
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={save}>
            {isEdit ? 'Salvar alterações' : 'Salvar Pedido'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Vendas (main) ────────────────────────────────────────────────────────────

export default function Vendas() {
  const toast               = useToast();
  const pedidosAll          = useStore((s) => s.pedidos);
  const produtos            = useStore((s) => s.produtos);
  const configuracoes       = useStore((s) => s.configuracoes);
  const userId              = useStore((s) => s.userId);
  const lojaFiltro          = useStore((s) => s.lojaFiltro);
  const pedidos             = useMemo(
    () => lojaFiltro ? pedidosAll.filter((p) => p.loja === lojaFiltro) : pedidosAll,
    [pedidosAll, lojaFiltro],
  );
  const addPedido           = useStore((s) => s.addPedido);
  const updatePedido        = useStore((s) => s.updatePedido);
  const addPedidos          = useStore((s) => s.addPedidos);
  const deletePedido        = useStore((s) => s.deletePedido);
  const deletePedidos       = useStore((s) => s.deletePedidos);
  const updatePedidosStatus = useStore((s) => s.updatePedidosStatus);

  // ── Import history ────────────────────────────────────────────────────────
  const [importHistory, setImportHistory] = useState<ImportacaoLog[]>([]);

  useEffect(() => {
    if (!userId) return;
    dbImportacoes.getAll(userId).then(setImportHistory).catch(() => {});
  }, [userId]);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [search,        setSearch]        = useState('');
  const [filters,       setFilters]       = useState<Filters>(EMPTY_FILTERS);
  const [showFilter,    setShowFilter]    = useState(false);
  const [showAdd,       setShowAdd]       = useState(false);
  const [editingPedido, setEditingPedido] = useState<Pedido | null>(null);
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set());
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [pendingImport, setPendingImport] = useState<{
    novos: Pedido[]; duplicados: number;
    formato: 'shopee_nativo' | 'upseller' | 'generico';
    lojaCustom?: string;
  } | null>(null);
  const [expandedIds,   setExpandedIds]   = useState<Set<string>>(new Set());
  const [sortCol,  setSortCol]  = useState<string | null>(null);
  const [sortDir,  setSortDir]  = useState<'asc' | 'desc'>('desc');
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showColsMenu, setShowColsMenu] = useState(false);
  const [visibleCols,  setVisibleCols]  = useState<Set<string>>(() => {
    try {
      const s = localStorage.getItem('vendas-cols');
      return s ? new Set(JSON.parse(s)) : ALL_KEYS;
    } catch { return ALL_KEYS; }
  });

  const colsRef   = useRef<HTMLDivElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close cols dropdown on outside click
  useEffect(() => {
    if (!showColsMenu) return;
    const h = (e: MouseEvent) => {
      if (colsRef.current && !colsRef.current.contains(e.target as Node)) setShowColsMenu(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showColsMenu]);

  // Reset page when filters/search change
  useEffect(() => setPage(1), [search, filters]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  const handleKeyboard = useCallback((e: KeyboardEvent) => {
    const tag     = (e.target as HTMLElement).tagName;
    const inInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);

    if (e.key === 'Escape') {
      if (pendingImport)     { setPendingImport(null);       return; }
      if (showAdd)           { setShowAdd(false);            return; }
      if (editingPedido)     { setEditingPedido(null);       return; }
      if (showConfirmDelete) { setShowConfirmDelete(false);  return; }
      if (showFilter)        { setShowFilter(false);         return; }
      if (search)            { setSearch('');                return; }
      setFilters(EMPTY_FILTERS);
      return;
    }
    if (inInput) return;
    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setShowAdd(true); }
    if (e.key === '/')                   { e.preventDefault(); searchRef.current?.focus(); }
  }, [pendingImport, showAdd, editingPedido, showConfirmDelete, showFilter, search]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [handleKeyboard]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const skusDisponiveis  = useMemo(() =>
    [...new Set(pedidos.map((p) => p.sku))].sort(), [pedidos]);

  const lojasDisponiveis = useMemo(() => {
    const set = new Set([...produtos.map((p) => p.loja), 'Cardoso e-Shop', 'Projetando']);
    return [...set].sort();
  }, [produtos]);

  const filtrados = useMemo(() => {
    const q = search.toLowerCase();
    return pedidos
      .filter((p) => {
        if (filters.dateFrom && p.data < filters.dateFrom) return false;
        if (filters.dateTo   && p.data > filters.dateTo)   return false;
        if (filters.statuses.size > 0 && !filters.statuses.has(p.status)) return false;
        if (filters.lojas.size   > 0 && !filters.lojas.has(p.loja))       return false;
        if (filters.skus.size    > 0 && !filters.skus.has(p.sku))         return false;
        if (q && !p.numeroPedido.toLowerCase().includes(q) &&
                 !p.produto.toLowerCase().includes(q) &&
                 !p.sku.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        if (!sortCol) return b.data.localeCompare(a.data);
        const va = a[sortCol as keyof Pedido], vb = b[sortCol as keyof Pedido];
        if (typeof va === 'number' && typeof vb === 'number')
          return sortDir === 'asc' ? va - vb : vb - va;
        return sortDir === 'asc'
          ? String(va).localeCompare(String(vb))
          : String(vb).localeCompare(String(va));
      });
  }, [pedidos, search, filters, sortCol, sortDir]);

  const comparativo = useMemo(() => {
    if (!filters.dateFrom || !filters.dateTo) return null;
    const d1     = new Date(filters.dateFrom + 'T00:00:00');
    const d2     = new Date(filters.dateTo   + 'T00:00:00');
    const diffMs = d2.getTime() - d1.getTime();
    const prevTo   = new Date(d1.getTime() - 86400000);
    const prevFrom = new Date(prevTo.getTime() - diffMs);
    const prevFromStr = prevFrom.toISOString().slice(0, 10);
    const prevToStr   = prevTo.toISOString().slice(0, 10);
    const prev = pedidos.filter((p) => p.data >= prevFromStr && p.data <= prevToStr);
    return {
      receita: prev.reduce((s, p) => s + p.receita, 0),
      lucro:   prev.reduce((s, p) => s + p.lucroOperacional, 0),
      pedidos: prev.length,
      label:   `${prevFromStr} → ${prevToStr}`,
    };
  }, [filters.dateFrom, filters.dateTo, pedidos]);

  const totais = useMemo(() => ({
    receita: filtrados.reduce((s, p) => s + p.receita, 0),
    lucro:   filtrados.reduce((s, p) => s + p.lucroOperacional, 0),
    count:   filtrados.length,
  }), [filtrados]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / pageSize));
  const paginados  = filtrados.slice((page - 1) * pageSize, page * pageSize);

  const pageTotais = useMemo<PagTotais>(() => ({
    receita:  paginados.reduce((s, p) => s + p.receita, 0),
    desconto: paginados.reduce((s, p) => s + p.desconto, 0),
    custo:    paginados.reduce((s, p) => s + p.custoTotal, 0),
    taxa:     paginados.reduce((s, p) => s + p.taxaShopee, 0),
    ads:      paginados.reduce((s, p) => s + p.adsMarketing, 0),
    lucro:    paginados.reduce((s, p) => s + p.lucroOperacional, 0),
  }), [paginados]);

  const filterChips = useMemo(() => {
    const chips: { label: string; onRemove: () => void }[] = [];
    if (filters.dateFrom) chips.push({ label: `De: ${filters.dateFrom}`, onRemove: () => setFilters((f) => ({ ...f, dateFrom: '' })) });
    if (filters.dateTo)   chips.push({ label: `Até: ${filters.dateTo}`,  onRemove: () => setFilters((f) => ({ ...f, dateTo: '' })) });
    [...filters.statuses].forEach((s) => chips.push({ label: s, onRemove: () => setFilters((f) => { const n = new Set(f.statuses); n.delete(s); return { ...f, statuses: n }; }) }));
    [...filters.lojas].forEach((l)    => chips.push({ label: l, onRemove: () => setFilters((f) => { const n = new Set(f.lojas);   n.delete(l); return { ...f, lojas:   n }; }) }));
    [...filters.skus].forEach((k)     => chips.push({ label: k, onRemove: () => setFilters((f) => { const n = new Set(f.skus);    n.delete(k); return { ...f, skus:    n }; }) }));
    return chips;
  }, [filters]);

  const allSelected   = paginados.length > 0 && paginados.every((p) => selectedIds.has(p.id));
  const someSelected  = paginados.some((p) => selectedIds.has(p.id));
  const selectedCount = selectedIds.size;

  const visibleColsList = COLS.filter((c) => visibleCols.has(c.key));
  const totalColsCount  = visibleColsList.length + 2;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const toggleSelectAll = () => setSelectedIds((prev) => {
    const next = new Set(prev);
    allSelected ? paginados.forEach((p) => next.delete(p.id)) : paginados.forEach((p) => next.add(p.id));
    return next;
  });

  const toggleSelect = (id: string) => setSelectedIds((prev) => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });

  const toggleExpand = (id: string) => setExpandedIds((prev) => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });

  const handleBulkDelete = () => {
    const toDelete = [...selectedIds];
    deletePedidos(toDelete);
    setSelectedIds(new Set());
    setShowConfirmDelete(false);
    toast(`${toDelete.length} pedido(s) excluído(s).`, 'success');
  };

  const handleBulkStatus = (status: StatusPedido) => {
    const ids = [...selectedIds];
    updatePedidosStatus(ids, status);
    setSelectedIds(new Set());
    toast(`${ids.length} pedido(s) marcado(s) como "${status}".`, 'success');
  };

  const handleSort = (col: string) => {
    if (sortCol === col) {
      sortDir === 'asc' ? setSortDir('desc') : setSortCol(null);
    } else {
      setSortCol(col); setSortDir('asc');
    }
  };

  const toggleCol = (key: string) => setVisibleCols((prev) => {
    if (prev.has(key) && prev.size <= 2) return prev;
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    localStorage.setItem('vendas-cols', JSON.stringify([...next]));
    return next;
  });

  // ── Import / Export ────────────────────────────────────────────────────────

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const buf  = await file.arrayBuffer();
    const wb   = XLSX.read(buf);
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (rows.length === 0) { toast('Arquivo vazio ou inválido.', 'error'); return; }

    const { pedidos: parsed, formato, isShopeeNativo } = parseImportRows(rows, produtos, configuracoes);
    const existingNums   = new Set(pedidos.map((p) => p.numeroPedido));
    const semDuplicados  = parsed.filter((p) => !existingNums.has(p.numeroPedido));
    const dupCount       = parsed.length - semDuplicados.length;

    if (semDuplicados.length > 0) {
      const lojaCustom = isShopeeNativo ? (lojasDisponiveis[0] ?? 'Cardoso e-Shop') : undefined;
      setPendingImport({ novos: semDuplicados, duplicados: dupCount, formato, lojaCustom });
    } else if (parsed.length > 0) {
      toast('Todos os pedidos já existem no sistema.', 'warning');
    } else {
      toast('Nenhum pedido válido encontrado. Verifique o arquivo.', 'error');
    }
  };

  const handleImportConfirm = () => {
    if (!pendingImport) return;
    const { novos, duplicados, formato, lojaCustom } = pendingImport;
    const final = lojaCustom
      ? novos.map((p) => ({ ...p, loja: lojaCustom }))
      : novos;
    addPedidos(final);
    toast(`${final.length} pedido(s) importado(s) com sucesso!`, 'success');
    if (duplicados > 0)
      toast(`${duplicados} duplicado(s) ignorado(s).`, 'info');
    if (userId) {
      dbImportacoes.insert({
        formato, total: novos.length + duplicados,
        novos: novos.length, duplicados,
        loja: lojaCustom,
      }, userId)
        .then(() => dbImportacoes.getAll(userId).then(setImportHistory))
        .catch(() => {});
    }
    setPendingImport(null);
  };

  const handleExport = () => {
    const data = filtrados.map((p) => ({
      Data:               p.data,
      'Nº Pedido':        p.numeroPedido,
      Status:             p.status,
      Loja:               p.loja,
      SKU:                p.sku,
      Produto:            p.produto,
      Quantidade:         p.quantidade,
      'Unid. Estoque':    p.unidadesEstoque,
      'Receita (R$)':     p.receita,
      'Desconto (R$)':    p.desconto,
      'Custo (R$)':       p.custoTotal,
      'Taxa Shopee (R$)': p.taxaShopee,
      'ADS (R$)':         p.adsMarketing,
      'Lucro Op. (R$)':   parseFloat(p.lucroOperacional.toFixed(2)),
      'Margem (%)':       parseFloat(p.margemSCustoTotal.toFixed(2)),
      Observações:        p.observacoes ?? '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vendas');
    XLSX.writeFile(wb, `vendas_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast(`${filtrados.length} pedido(s) exportado(s).`, 'success');
  };

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Vendas</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm flex flex-wrap gap-x-2 items-center">
            <span>{pedidos.length} pedidos</span>
            {importHistory.length > 0 && (
              <span className="text-[11px] text-slate-400">
                · última import: {new Date(importHistory[0].importadoEm).toLocaleDateString('pt-BR')}
                {' '}({importHistory[0].novos} novos)
              </span>
            )}
            <span className="text-[11px] text-slate-400">· N = novo · / = busca · Esc = limpar</span>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <button className="btn-secondary" onClick={handleExport}>
            <Download size={15} /> Exportar
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
          <button className="btn-secondary" onClick={() => fileRef.current?.click()}>
            <Upload size={15} /> Importar
          </button>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={15} /> Novo Pedido
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchRef}
            className="input pl-8"
            placeholder="Buscar por pedido, SKU ou produto…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button
          onClick={() => setShowFilter((v) => !v)}
          className={`btn-secondary relative ${showFilter ? 'ring-2 ring-shopee-300' : ''}`}
        >
          <Filter size={15} /> Filtros
          {filterChips.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] bg-shopee-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {filterChips.length}
            </span>
          )}
        </button>

        <div className="relative" ref={colsRef}>
          <button onClick={() => setShowColsMenu((v) => !v)} className="btn-secondary">
            <Columns size={15} /> Colunas
          </button>
          {showColsMenu && (
            <div className="absolute right-0 top-full mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 p-3 min-w-44">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Exibir colunas</p>
              <div className="space-y-1">
                {COLS.map((c) => (
                  <label key={c.key} className="flex items-center gap-2 cursor-pointer py-0.5">
                    <input type="checkbox" className="accent-shopee-500 w-3.5 h-3.5"
                      checked={visibleCols.has(c.key)} onChange={() => toggleCol(c.key)} />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{c.label}</span>
                  </label>
                ))}
              </div>
              <button
                onClick={() => { setVisibleCols(ALL_KEYS); localStorage.removeItem('vendas-cols'); }}
                className="mt-2 text-xs text-slate-400 hover:text-shopee-500 transition-colors"
              >
                Restaurar padrão
              </button>
            </div>
          )}
        </div>

        {/* Bulk actions */}
        {someSelected && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
              {selectedCount} sel.
            </span>
            <select
              className="select py-1.5 text-xs"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkStatus(e.target.value as StatusPedido);
                  (e.target as HTMLSelectElement).value = '';
                }
              }}
            >
              <option value="" disabled>Mudar status…</option>
              {(['Em processo', 'Enviado', 'Concluído', 'Devolvido'] as StatusPedido[]).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button className="btn-danger py-1.5 text-xs" onClick={() => setShowConfirmDelete(true)}>
              <Trash2 size={13} /> Excluir
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
              <X size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Filter panel */}
      <FilterPanel
        open={showFilter}
        filters={filters}
        skus={skusDisponiveis}
        onChange={setFilters}
        onClear={() => setFilters(EMPTY_FILTERS)}
      />

      {/* Active filter chips */}
      {filterChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          {filterChips.map((chip, i) => (
            <span key={i} className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 bg-shopee-50 border border-shopee-200 text-shopee-700 text-xs font-medium rounded-full">
              {chip.label}
              <button onClick={chip.onRemove} className="text-shopee-400 hover:text-shopee-700 transition-colors">
                <X size={11} />
              </button>
            </span>
          ))}
          <button onClick={() => setFilters(EMPTY_FILTERS)} className="text-xs text-slate-400 hover:text-red-500 transition-colors px-1">
            Limpar tudo
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4">
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">Pedidos filtrados</p>
          <div className="flex items-center">
            <p className="text-slate-900 dark:text-slate-100 font-bold text-xl">{totais.count}</p>
            {comparativo && <DeltaBadge current={totais.count} previous={comparativo.pedidos} />}
          </div>
          {comparativo && (
            <p className="text-slate-400 text-[10px] mt-0.5">vs. {comparativo.label}</p>
          )}
        </div>
        <div className="card p-4">
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">Receita</p>
          <div className="flex items-center">
            <p className="text-shopee-600 font-bold text-xl">{fmt(totais.receita)}</p>
            {comparativo && <DeltaBadge current={totais.receita} previous={comparativo.receita} />}
          </div>
          {comparativo && (
            <p className="text-slate-400 text-[10px] mt-0.5">ant.: {fmt(comparativo.receita)}</p>
          )}
        </div>
        <div className="card p-4">
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">Lucro Operacional</p>
          <div className="flex items-center">
            <p className={`font-bold text-xl ${totais.lucro >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(totais.lucro)}</p>
            {comparativo && <DeltaBadge current={totais.lucro} previous={comparativo.lucro} />}
          </div>
          {comparativo && (
            <p className="text-slate-400 text-[10px] mt-0.5">ant.: {fmt(comparativo.lucro)}</p>
          )}
        </div>
      </div>

      {/* Table */}
      <VendasTable
        rows={paginados}
        filteredCount={filtrados.length}
        pageTotais={pageTotais}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        sortCol={sortCol}
        sortDir={sortDir}
        onSort={handleSort}
        visibleCols={visibleCols}
        visibleColsList={visibleColsList}
        totalColsCount={totalColsCount}
        selectedIds={selectedIds}
        allSelected={allSelected}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        expandedIds={expandedIds}
        onToggleExpand={toggleExpand}
        onEdit={setEditingPedido}
        onDelete={deletePedido}
        fmt={fmt}
      />

      {/* Modals */}
      {showAdd && (
        <PedidoModal
          onSave={(p) => { addPedido(p); toast('Pedido adicionado.', 'success'); }}
          onClose={() => setShowAdd(false)}
        />
      )}
      {editingPedido && (
        <PedidoModal
          initialData={editingPedido}
          onSave={(p) => { updatePedido(p.id, p); toast('Pedido atualizado.', 'success'); }}
          onClose={() => setEditingPedido(null)}
        />
      )}
      {showConfirmDelete && (
        <ConfirmDeleteModal
          count={selectedCount}
          onConfirm={handleBulkDelete}
          onCancel={() => setShowConfirmDelete(false)}
        />
      )}
      {pendingImport && (
        <ImportPreviewModal
          novos={pendingImport.novos}
          duplicados={pendingImport.duplicados}
          lojaCustom={pendingImport.lojaCustom}
          onLojaChange={(l) => setPendingImport((p) => p ? { ...p, lojaCustom: l } : null)}
          lojaOpcoes={lojasDisponiveis}
          onConfirm={handleImportConfirm}
          onCancel={() => setPendingImport(null)}
        />
      )}
    </div>
  );
}
