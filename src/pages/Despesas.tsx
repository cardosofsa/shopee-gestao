import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Pencil,
  Plus,
  Receipt,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useToast } from '../components/Toast';
import { EmptyState, Modal } from '../components/ui';
import { useStore } from '../store';
import type { Despesa } from '../types';
import { fmt } from '../utils/calculations';
import { C } from '../utils/chartColors';
import { exportXlsx } from '../utils/exportXlsx';

// ─── Palette ──────────────────────────────────────────────────────────────────

const CHART_COLORS = [
  C.primary,
  C.blue,
  C.amber,
  C.red,
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  C.orange,
  C.secondary,
  '#64748b',
];

const BADGE_PALETTE = [
  'bg-emerald-100 text-emerald-700',
  'bg-blue-100 text-blue-700',
  'bg-amber-100 text-amber-700',
  'bg-red-100 text-red-700',
  'bg-sky-100 text-sky-700',
  'bg-cyan-100 text-cyan-700',
  'bg-pink-100 text-pink-700',
  'bg-orange-100 text-orange-700',
  'bg-teal-100 text-teal-700',
  'bg-slate-100 text-slate-600',
];

function catColor(cat: string, all: string[]) {
  const idx = all.indexOf(cat);
  return {
    badge: BADGE_PALETTE[idx % BADGE_PALETTE.length],
    chart: CHART_COLORS[idx % CHART_COLORS.length],
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const monthLabel = (mes: string) =>
  new Date(mes + '-02').toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

const monthShort = (mes: string) =>
  new Date(mes + '-02')
    .toLocaleString('pt-BR', { month: 'short', year: '2-digit' })
    .replace('.', '');

// ─── DespesaModal ─────────────────────────────────────────────────────────────

function DespesaModal({
  title,
  initial,
  categorias,
  onSave,
  onClose,
}: {
  title: string;
  initial: Omit<Despesa, 'id'>;
  categorias: string[];
  onSave: (d: Omit<Despesa, 'id'>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<Despesa, 'id'>>(initial);
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({
      ...p,
      [k]: e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value,
    }));
  const valid = form.descricao.trim() && form.valor > 0;

  return (
    <Modal onClose={onClose} maxWidth="max-w-md">
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X size={18} />
        </button>
      </div>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Data</label>
            <input type="date" className="input" value={form.data} onChange={f('data')} />
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">
              Valor (R$) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={form.valor || ''}
              onChange={f('valor')}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Categoria</label>
          <select className="select" value={form.categoria} onChange={f('categoria')}>
            {categorias.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">
            Descrição *
          </label>
          <input
            className="input"
            placeholder="Ex: Caixas de papelão 20×20cm"
            value={form.descricao}
            onChange={f('descricao')}
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Loja</label>
          <select className="select" value={form.loja} onChange={f('loja')}>
            <option value="Ambas">Ambas</option>
            <option>Cardoso e-Shop</option>
            <option>Projetando</option>
          </select>
        </div>
      </div>
      <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
        <button className="btn-secondary" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn-primary" disabled={!valid} onClick={() => valid && onSave(form)}>
          Salvar
        </button>
      </div>
    </Modal>
  );
}

// ─── OrcamentoRow ─────────────────────────────────────────────────────────────

function OrcamentoRow({
  cat,
  gasto,
  orcamento,
  onSave,
}: {
  cat: string;
  gasto: number;
  orcamento: number;
  onSave: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(orcamento > 0 ? orcamento : ''));
  const inputRef = useRef<HTMLInputElement>(null);

  const pct = orcamento > 0 ? Math.min(100, (gasto / orcamento) * 100) : 0;
  const overBudget = orcamento > 0 && gasto > orcamento;
  const nearLimit = orcamento > 0 && pct >= 80 && !overBudget;

  const save = () => {
    const v = parseFloat(val) || 0;
    onSave(v);
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
            {cat}
          </span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {fmt(gasto)}
            </span>
            {editing ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400">/</span>
                <input
                  ref={inputRef}
                  type="number"
                  min="0"
                  step="50"
                  value={val}
                  onChange={(e) => setVal(e.target.value)}
                  onBlur={save}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') save();
                    if (e.key === 'Escape') setEditing(false);
                  }}
                  className="w-20 text-xs px-1.5 py-0.5 border border-core-green rounded focus:outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                  autoFocus
                />
                <button onClick={save} className="text-core-green">
                  <Check size={11} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditing(true);
                  setTimeout(() => inputRef.current?.select(), 10);
                }}
                className="text-xs text-slate-400 hover:text-core-green transition-colors flex items-center gap-0.5"
                title="Definir orçamento"
              >
                {orcamento > 0 ? (
                  <>
                    <span className="text-slate-300 dark:text-slate-600">/</span> {fmt(orcamento)}
                  </>
                ) : (
                  <Target size={10} />
                )}
              </button>
            )}
          </div>
        </div>
        <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              overBudget ? 'bg-red-400' : nearLimit ? 'bg-amber-400' : 'bg-core-green'
            }`}
            style={{ width: orcamento > 0 ? `${pct}%` : '0%' }}
          />
        </div>
        {overBudget && (
          <p className="text-[10px] text-red-500 mt-0.5">
            Orçamento excedido em {fmt(gasto - orcamento)}
          </p>
        )}
        {nearLimit && (
          <p className="text-[10px] text-amber-500 mt-0.5">{pct.toFixed(0)}% do orçamento usado</p>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Despesas() {
  const toast = useToast();
  const despesasAll = useStore((s) => s.despesas);
  const lojaFiltro = useStore((s) => s.lojaFiltro);
  const addDespesa = useStore((s) => s.addDespesa);
  const updateDespesa = useStore((s) => s.updateDespesa);
  const deleteDespesa = useStore((s) => s.deleteDespesa);
  const categorias = useStore((s) => s.categoriasDesp);
  const orcamentosDesp = useStore((s) => s.orcamentosDesp);
  const setOrcamentoDesp = useStore((s) => s.setOrcamentoDesp);

  const despesas = useMemo(
    () =>
      lojaFiltro
        ? despesasAll.filter((d) => d.loja === lojaFiltro || d.loja === 'Ambas')
        : despesasAll,
    [despesasAll, lojaFiltro]
  );

  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Despesa | null>(null);
  const [mesFiltro, setMesFiltro] = useState(() => new Date().toISOString().slice(0, 7));
  const [filterCat, setFilterCat] = useState<string>('Todas');

  const mesAtual = new Date().toISOString().slice(0, 7);
  const isCurrentMonth = mesFiltro === mesAtual;

  const prevMonth = () => {
    const [y, m] = mesFiltro.split('-').map(Number);
    setMesFiltro(new Date(y, m - 2, 1).toISOString().slice(0, 7));
  };
  const nextMonth = () => {
    const [y, m] = mesFiltro.split('-').map(Number);
    setMesFiltro(new Date(y, m, 1).toISOString().slice(0, 7));
  };

  const prevMes = useMemo(() => {
    const [y, m] = mesFiltro.split('-').map(Number);
    return new Date(y, m - 2, 1).toISOString().slice(0, 7);
  }, [mesFiltro]);

  const doMes = useMemo(
    () => despesas.filter((d) => d.data.startsWith(mesFiltro)),
    [despesas, mesFiltro]
  );
  const doMesAnterior = useMemo(
    () => despesas.filter((d) => d.data.startsWith(prevMes)),
    [despesas, prevMes]
  );
  const filtradas = useMemo(
    () =>
      doMes
        .filter((d) => filterCat === 'Todas' || d.categoria === filterCat)
        .sort((a, b) => b.data.localeCompare(a.data)),
    [doMes, filterCat]
  );

  const totalMes = doMes.reduce((s, d) => s + d.valor, 0);
  const totalMesAnt = doMesAnterior.reduce((s, d) => s + d.valor, 0);
  const delta = totalMes - totalMesAnt;
  const deltaPct = totalMesAnt > 0 ? (delta / totalMesAnt) * 100 : 0;
  const totalOrcamento = categorias.reduce((s, c) => s + (orcamentosDesp[c] ?? 0), 0);

  // Por categoria (mês atual)
  const porCategoria = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of doMes) map.set(d.categoria, (map.get(d.categoria) ?? 0) + d.valor);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [doMes]);

  // Tendência: últimos 6 meses
  const trendData = useMemo(() => {
    const meses: string[] = [];
    const [y0, m0] = mesFiltro.split('-').map(Number);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(y0, m0 - 1 - i, 1);
      meses.push(d.toISOString().slice(0, 7));
    }
    return meses.map((mes) => {
      const total = despesas.filter((d) => d.data.startsWith(mes)).reduce((s, d) => s + d.valor, 0);
      return { name: monthShort(mes), total };
    });
  }, [despesas, mesFiltro]);

  // Chart data: top 6 categorias
  const catChartData = useMemo(
    () =>
      porCategoria.slice(0, 8).map(([cat, val]) => ({
        name: cat.length > 12 ? cat.slice(0, 11) + '…' : cat,
        fullName: cat,
        valor: val,
        fill: catColor(cat, categorias).chart,
      })),
    [porCategoria, categorias]
  );

  // Export
  const handleExport = () => {
    exportXlsx(`despesas_${mesFiltro}.xlsx`, [
      {
        name: monthLabel(mesFiltro),
        headers: ['Data', 'Categoria', 'Descrição', 'Loja', 'Valor'],
        rows: filtradas.map((d) => [d.data, d.categoria, d.descricao, d.loja, d.valor]),
      },
    ]);
    toast(`${filtradas.length} despesas exportadas.`, 'success');
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Despesas</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm capitalize">
            {monthLabel(mesFiltro)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
            <button
              onClick={prevMonth}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 capitalize px-1 min-w-32 text-center">
              {monthLabel(mesFiltro)}
            </span>
            <button
              onClick={nextMonth}
              disabled={isCurrentMonth}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={15} />
            </button>
          </div>
          {doMes.length > 0 && (
            <button className="btn-secondary text-xs py-1.5 px-3" onClick={handleExport}>
              <Download size={13} /> Exportar
            </button>
          )}
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={15} /> Nova Despesa
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Total do Mês
          </p>
          <p className="text-2xl font-bold text-red-500">{fmt(totalMes)}</p>
          {totalMesAnt > 0 && (
            <div
              className={`flex items-center gap-1 mt-1 text-xs font-medium ${delta > 0 ? 'text-red-500' : 'text-emerald-600'}`}
            >
              {delta > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {delta > 0 ? '+' : ''}
              {deltaPct.toFixed(0)}% vs mês ant.
            </div>
          )}
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Lançamentos
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{doMes.length}</p>
          <p className="text-xs text-slate-400 mt-1">
            {porCategoria.length} categoria{porCategoria.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Maior Categoria
          </p>
          <p className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">
            {porCategoria[0]?.[0] ?? '—'}
          </p>
          <p className="text-xs text-red-400 mt-1">
            {porCategoria[0] ? fmt(porCategoria[0][1]) : '—'}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Orçamento Total
          </p>
          <p
            className={`text-2xl font-bold ${totalOrcamento > 0 && totalMes > totalOrcamento ? 'text-red-500' : 'text-slate-900 dark:text-slate-100'}`}
          >
            {totalOrcamento > 0 ? fmt(totalOrcamento) : '—'}
          </p>
          {totalOrcamento > 0 && (
            <p className="text-xs text-slate-400 mt-1">
              {((totalMes / totalOrcamento) * 100).toFixed(0)}% usado
            </p>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Gastos por categoria */}
        {catChartData.length > 0 && (
          <div className="card p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
              Gastos por Categoria
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={catChartData}
                layout="vertical"
                margin={{ top: 0, right: 60, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: C.slate }}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: C.slate }}
                  axisLine={false}
                  tickLine={false}
                  width={72}
                />
                <Tooltip
                  formatter={(v, _, p) => [
                    fmt(Number(v)),
                    (p.payload as { fullName: string }).fullName,
                  ]}
                  contentStyle={{ fontSize: 12 }}
                  cursor={{ fill: 'rgba(148,163,184,0.06)' }}
                />
                <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                  {catChartData.map((d) => (
                    <Cell key={d.name} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tendência 6 meses */}
        <div className="card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
            Tendência — Últimos 6 Meses
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradDesp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: C.slate }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: C.slate }}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip
                formatter={(v) => [fmt(Number(v)), 'Total Despesas']}
                contentStyle={{ fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="total"
                name="Total"
                stroke={C.red}
                strokeWidth={2}
                fill="url(#gradDesp)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Orçamento por categoria */}
      {categorias.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={14} className="text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Orçamento por Categoria
            </h2>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              · clique no valor para editar
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {categorias.map((cat) => {
              const gasto = doMes
                .filter((d) => d.categoria === cat)
                .reduce((s, d) => s + d.valor, 0);
              if (gasto === 0 && !orcamentosDesp[cat]) return null;
              return (
                <OrcamentoRow
                  key={cat}
                  cat={cat}
                  gasto={gasto}
                  orcamento={orcamentosDesp[cat] ?? 0}
                  onSave={(v) => setOrcamentoDesp(cat, v)}
                />
              );
            })}
          </div>
          {categorias.every((cat) => {
            const gasto = doMes.filter((d) => d.categoria === cat).reduce((s, d) => s + d.valor, 0);
            return gasto === 0 && !orcamentosDesp[cat];
          }) && (
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">
              Nenhuma despesa neste mês.
            </p>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Categoria:</span>
        {['Todas', ...categorias].map((c) => (
          <button
            key={c}
            onClick={() => setFilterCat(c)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterCat === c
                ? 'bg-core-green text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                {['Data', 'Categoria', 'Descrição', 'Loja', 'Valor', ''].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {filtradas.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={<Receipt size={20} />}
                      title="Nenhuma despesa neste período."
                      description="Compras de mercadoria aparecem aqui automaticamente."
                    />
                  </td>
                </tr>
              ) : (
                filtradas.map((d) => (
                  <tr
                    key={d.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors"
                  >
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {d.data.slice(0, 10)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${catColor(d.categoria, categorias).badge}`}
                      >
                        {d.categoria}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{d.descricao}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {d.loja}
                    </td>
                    <td className="px-4 py-3 text-red-500 font-medium whitespace-nowrap">
                      {fmt(d.valor)}
                    </td>
                    <td className="px-4 py-3">
                      {!d.compraRef ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditTarget(d)}
                            className="text-slate-300 hover:text-core-green transition-colors"
                            title="Editar"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => {
                              deleteDespesa(d.id);
                              toast('Despesa excluída.', 'info');
                            }}
                            className="text-slate-300 hover:text-red-400 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300 dark:text-slate-600 italic">
                          via Estoque
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filtradas.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 font-semibold">
                  <td
                    colSpan={4}
                    className="px-4 py-3 text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wide"
                  >
                    Total filtrado
                  </td>
                  <td className="px-4 py-3 text-red-500">
                    {fmt(filtradas.reduce((s, d) => s + d.valor, 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {showAdd && (
        <DespesaModal
          title="Nova Despesa"
          initial={{
            data: new Date().toISOString().slice(0, 10),
            categoria: categorias[0] ?? 'Outro',
            descricao: '',
            valor: 0,
            loja: 'Ambas',
          }}
          categorias={categorias}
          onSave={(d) => {
            addDespesa(d);
            toast('Despesa adicionada.', 'success');
            setShowAdd(false);
          }}
          onClose={() => setShowAdd(false)}
        />
      )}
      {editTarget && (
        <DespesaModal
          title="Editar Despesa"
          initial={{
            data: editTarget.data,
            categoria: editTarget.categoria,
            descricao: editTarget.descricao,
            valor: editTarget.valor,
            loja: editTarget.loja,
          }}
          categorias={categorias}
          onSave={(d) => {
            updateDespesa(editTarget.id, d);
            toast('Despesa atualizada.', 'success');
            setEditTarget(null);
          }}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}
