import { CalendarSearch, Download, GitCompare, TrendingDown, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { EmptyState } from '../components/ui';
import { useStore } from '../store';
import { fmt, fmtPct, getRankingProdutos } from '../utils/calculations';
import { C } from '../utils/chartColors';
import { exportXlsx, xlsxNum } from '../utils/exportXlsx';
import { ComparativoContent } from './Comparativo';
import { CurvaABCContent } from './CurvaABC';
import { SazonalidadeContent } from './Sazonalidade';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().slice(0, 10);
}
function startOfMonth() {
  return new Date().toISOString().slice(0, 7) + '-01';
}

function diffDays(from: string, to: string) {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 864e5);
}

function shiftPeriod(from: string, to: string): { from: string; to: string } {
  const d = diffDays(from, to) + 1;
  const f = new Date(from);
  f.setDate(f.getDate() - d);
  const t = new Date(to);
  t.setDate(t.getDate() - d);
  return { from: f.toISOString().slice(0, 10), to: t.toISOString().slice(0, 10) };
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 px-3 py-2.5 text-xs space-y-1">
      <p className="font-semibold text-slate-600 dark:text-slate-300">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-slate-500 dark:text-slate-400">{p.name}:</span>
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {fmt(Number(p.value))}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Metrics computation ──────────────────────────────────────────────────────

function computeMetrics(
  pedidosAll: ReturnType<typeof useStore.getState>['pedidos'],
  despesasAll: ReturnType<typeof useStore.getState>['despesas'],
  from: string,
  to: string
) {
  const ps = pedidosAll.filter(
    (p) => p.data >= from && p.data <= to && (p.status === 'Concluído' || p.status === 'Enviado')
  );
  const devolvidos = pedidosAll.filter(
    (p) => p.data >= from && p.data <= to && p.status === 'Devolvido'
  );
  const ds = despesasAll.filter((d) => d.data >= from && d.data <= to);

  const receita = ps.reduce((s, p) => s + p.receita, 0);
  const cmv = ps.reduce((s, p) => s + p.custoTotal, 0);
  const lucroOp = ps.reduce((s, p) => s + p.lucroOperacional, 0);
  const taxas = ps.reduce((s, p) => s + (p.taxaShopee ?? 0), 0);
  const despesas = ds.reduce((s, d) => s + d.valor, 0);
  const lucroLiq = lucroOp - despesas;
  const margem = receita > 0 ? (lucroOp / receita) * 100 : 0;
  const margemLiq = receita > 0 ? (lucroLiq / receita) * 100 : 0;
  const pedidosCount = ps.length;
  const ticket = pedidosCount > 0 ? receita / pedidosCount : 0;
  const unidades = ps.reduce((s, p) => s + p.unidadesEstoque, 0);
  const devCount = devolvidos.length;
  const taxaDev = pedidosCount + devCount > 0 ? (devCount / (pedidosCount + devCount)) * 100 : 0;

  return {
    receita,
    cmv,
    lucroOp,
    taxas,
    despesas,
    lucroLiq,
    margem,
    margemLiq,
    pedidosCount,
    ticket,
    unidades,
    devCount,
    taxaDev,
    ps,
  };
}

function dailyData(ps: ReturnType<typeof computeMetrics>['ps'], from: string, to: string) {
  const map: Record<string, { receita: number; lucro: number }> = {};
  ps.forEach((p) => {
    if (!map[p.data]) map[p.data] = { receita: 0, lucro: 0 };
    map[p.data].receita += p.receita;
    map[p.data].lucro += p.lucroOperacional;
  });
  const result = [];
  const cur = new Date(from);
  const end = new Date(to);
  while (cur <= end) {
    const d = cur.toISOString().slice(0, 10);
    result.push({ name: fmtDate(d), Receita: map[d]?.receita ?? 0, Lucro: map[d]?.lucro ?? 0 });
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KPI({
  label,
  a,
  b,
  fmt: f = fmt,
  positive = true,
}: {
  label: string;
  a: number;
  b?: number;
  fmt?: (v: number) => string;
  positive?: boolean;
}) {
  const delta = b != null && b !== 0 ? ((a - b) / Math.abs(b)) * 100 : null;
  const up = delta != null && delta > 0;
  const good = positive ? up : !up;
  return (
    <div className="card p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
        {label}
      </p>
      <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{f(a)}</p>
      {delta != null && (
        <div
          className={`flex items-center gap-1 mt-1 text-[11px] font-medium ${good ? 'text-green-600' : 'text-red-500'}`}
        >
          {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {delta > 0 ? '+' : ''}
          {delta.toFixed(1)}% vs anterior
        </div>
      )}
    </div>
  );
}

// ─── DRE Line ─────────────────────────────────────────────────────────────────

function DRELine({
  label,
  a,
  b,
  negative,
  indent,
}: {
  label: string;
  a: number;
  b?: number;
  negative?: boolean;
  indent?: boolean;
}) {
  const delta = b != null && b !== 0 ? ((a - b) / Math.abs(b)) * 100 : null;
  const up = delta != null && delta > 0;
  return (
    <div
      className={`flex items-center justify-between py-2 text-sm ${
        indent
          ? 'pl-4 text-slate-500 dark:text-slate-400'
          : 'font-medium text-slate-700 dark:text-slate-200'
      } border-b border-slate-50 dark:border-slate-800`}
    >
      <span>{label}</span>
      <div className="flex items-center gap-3">
        {b != null && (
          <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums w-24 text-right">
            {fmt(b)}
          </span>
        )}
        <span className={`tabular-nums w-24 text-right ${negative && a > 0 ? 'text-red-500' : ''}`}>
          {fmt(a)}
        </span>
        {delta != null && (
          <span
            className={`text-[10px] w-16 text-right font-medium ${up ? 'text-green-600' : 'text-red-500'}`}
          >
            {delta > 0 ? '+' : ''}
            {delta.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: 'Este mês', from: () => startOfMonth(), to: () => today() },
  {
    label: 'Últimos 7d',
    from: () => {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      return d.toISOString().slice(0, 10);
    },
    to: () => today(),
  },
  {
    label: 'Últimos 30d',
    from: () => {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      return d.toISOString().slice(0, 10);
    },
    to: () => today(),
  },
  {
    label: 'Últimos 90d',
    from: () => {
      const d = new Date();
      d.setDate(d.getDate() - 89);
      return d.toISOString().slice(0, 10);
    },
    to: () => today(),
  },
];

type AnaliseTab = 'analise' | 'abc' | 'comparativo' | 'sazonalidade';

const TAB_CLS = (active: boolean) =>
  `px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
    active
      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
  }`;

export default function Analise() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<AnaliseTab>(() => {
    const t = searchParams.get('tab');
    if (t === 'abc' || t === 'comparativo' || t === 'sazonalidade') return t;
    return 'analise';
  });

  const pedidosAll = useStore((s) => s.pedidos);
  const despesasAll = useStore((s) => s.despesas);

  const [dateFrom, setDateFrom] = useState(startOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [compare, setCompare] = useState(false);
  const [dateFrom2, setDateFrom2] = useState('');
  const [dateTo2, setDateTo2] = useState('');

  const handlePreset = (p: (typeof PRESETS)[number]) => {
    setDateFrom(p.from());
    setDateTo(p.to());
  };

  const enableCompare = () => {
    const prev = shiftPeriod(dateFrom, dateTo);
    setDateFrom2(prev.from);
    setDateTo2(prev.to);
    setCompare(true);
  };

  const dias = diffDays(dateFrom, dateTo) + 1;

  const mA = useMemo(
    () => computeMetrics(pedidosAll, despesasAll, dateFrom, dateTo),
    [pedidosAll, despesasAll, dateFrom, dateTo]
  );

  const mB = useMemo(
    () =>
      compare && dateFrom2 && dateTo2
        ? computeMetrics(pedidosAll, despesasAll, dateFrom2, dateTo2)
        : null,
    [pedidosAll, despesasAll, compare, dateFrom2, dateTo2]
  );

  const chartA = useMemo(() => dailyData(mA.ps, dateFrom, dateTo), [mA.ps, dateFrom, dateTo]);

  const ranking = useMemo(() => getRankingProdutos(mA.ps).slice(0, 8), [mA.ps]);

  const handleExport = async () => {
    const headers = [
      'Data',
      'Nº Pedido',
      'Status',
      'Loja',
      'SKU',
      'Produto',
      'Qtd',
      'Receita',
      'CMV',
      'Lucro Op.',
    ];
    const rows = mA.ps.map((p) => [
      p.data,
      p.numeroPedido,
      p.status,
      p.loja,
      p.sku,
      p.produto,
      xlsxNum(p.quantidade),
      xlsxNum(p.receita),
      xlsxNum(p.custoTotal),
      xlsxNum(p.lucroOperacional),
    ]);
    exportXlsx(`analise-${dateFrom}-${dateTo}`, [{ name: 'Análise', headers, rows }]);
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Tab nav */}
      <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 rounded-lg p-1">
        <button className={TAB_CLS(tab === 'analise')} onClick={() => setTab('analise')}>
          Análise de Período
        </button>
        <button className={TAB_CLS(tab === 'abc')} onClick={() => setTab('abc')}>
          Curva ABC
        </button>
        <button className={TAB_CLS(tab === 'comparativo')} onClick={() => setTab('comparativo')}>
          Comparativo
        </button>
        <button className={TAB_CLS(tab === 'sazonalidade')} onClick={() => setTab('sazonalidade')}>
          Sazonalidade
        </button>
      </div>

      {tab === 'abc' && <CurvaABCContent embedded />}
      {tab === 'comparativo' && <ComparativoContent embedded />}
      {tab === 'sazonalidade' && <SazonalidadeContent embedded />}

      {tab === 'analise' && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-core-green/10 flex items-center justify-center">
                <CalendarSearch size={18} className="text-core-green" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                  Análise por Período
                </h1>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  P&L completo para qualquer intervalo de datas
                </p>
              </div>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-core-green hover:border-core-green/50 rounded-lg transition-colors"
            >
              <Download size={13} /> Exportar XLSX
            </button>
          </div>

          {/* Period selectors */}
          <div className="card p-4 space-y-4">
            {/* Presets */}
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => handlePreset(p)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-core-green/50 hover:text-core-green transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Period A */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-core-green shrink-0" />
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Período A
                </label>
              </div>
              <input
                type="date"
                value={dateFrom}
                max={dateTo}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input text-xs py-1.5"
              />
              <span className="text-xs text-slate-400">até</span>
              <input
                type="date"
                value={dateTo}
                min={dateFrom}
                max={today()}
                onChange={(e) => setDateTo(e.target.value)}
                className="input text-xs py-1.5"
              />
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {dias} dia{dias !== 1 ? 's' : ''}
              </span>

              {!compare && (
                <button
                  onClick={enableCompare}
                  className="ml-auto flex items-center gap-1.5 text-xs text-slate-400 hover:text-core-green transition-colors"
                >
                  <GitCompare size={13} /> Comparar períodos
                </button>
              )}
            </div>

            {/* Period B */}
            {compare && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-400 shrink-0" />
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Período B
                  </label>
                </div>
                <input
                  type="date"
                  value={dateFrom2}
                  max={dateTo2}
                  onChange={(e) => setDateFrom2(e.target.value)}
                  className="input text-xs py-1.5"
                />
                <span className="text-xs text-slate-400">até</span>
                <input
                  type="date"
                  value={dateTo2}
                  min={dateFrom2}
                  onChange={(e) => setDateTo2(e.target.value)}
                  className="input text-xs py-1.5"
                />
                <button
                  onClick={() => setCompare(false)}
                  className="ml-auto text-xs text-slate-400 hover:text-red-500 transition-colors"
                >
                  Remover
                </button>
              </div>
            )}
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
            <KPI label="Receita" a={mA.receita} b={mB?.receita} />
            <KPI label="Pedidos" a={mA.pedidosCount} b={mB?.pedidosCount} fmt={(v) => String(v)} />
            <KPI label="Unidades" a={mA.unidades} b={mB?.unidades} fmt={(v) => String(v)} />
            <KPI label="Ticket Médio" a={mA.ticket} b={mB?.ticket} />
            <KPI label="Lucro Op." a={mA.lucroOp} b={mB?.lucroOp} />
            <KPI label="Margem" a={mA.margem} b={mB?.margem} fmt={(v) => `${v.toFixed(1)}%`} />
            <KPI
              label="Devoluções"
              a={mA.devCount}
              b={mB?.devCount}
              fmt={(v) => String(v)}
              positive={false}
            />
          </div>

          {/* Charts + DRE */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Area chart */}
            <div className="card p-5 xl:col-span-2">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">
                Receita e Lucro Diários
                <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-500">
                  {fmtDate(dateFrom)} → {fmtDate(dateTo)}
                </span>
              </h2>
              {chartA.length === 0 || chartA.every((d) => d.Receita === 0) ? (
                <div className="h-48 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
                  Nenhum pedido no período.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartA} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#18B37A" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#18B37A" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gL" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: C.slate }}
                      interval={Math.max(0, Math.floor(chartA.length / 8) - 1)}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: C.slate }}
                      tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area
                      type="monotone"
                      dataKey="Receita"
                      stroke={C.primary}
                      fill="url(#gR)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="Lucro"
                      stroke={C.secondary}
                      fill="url(#gL)"
                      strokeWidth={1.5}
                      dot={false}
                      strokeDasharray="4 2"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* DRE compacto */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
                Demonstrativo
                {mB && (
                  <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-500">
                    A / B
                  </span>
                )}
              </h2>
              <div className="space-y-0">
                <DRELine label="(+) Receita Bruta" a={mA.receita} b={mB?.receita} />
                <DRELine label="(−) CMV" a={mA.cmv} b={mB?.cmv} negative indent />
                <DRELine label="(−) Taxas Shopee" a={mA.taxas} b={mB?.taxas} negative indent />
                <DRELine label="(=) Lucro Operacional" a={mA.lucroOp} b={mB?.lucroOp} />
                <DRELine
                  label="(−) Despesas Op."
                  a={mA.despesas}
                  b={mB?.despesas}
                  negative
                  indent
                />
                <DRELine label="(=) Lucro Líquido" a={mA.lucroLiq} b={mB?.lucroLiq} />
                <div className="flex items-center justify-between pt-3 text-xs text-slate-500 dark:text-slate-400">
                  <span>Margem Op.</span>
                  <div className="flex items-center gap-2">
                    {mB && <span className="w-16 text-right">{fmtPct(mB.margem)}</span>}
                    <span
                      className={`w-16 text-right font-semibold ${mA.margem >= 20 ? 'text-green-600' : mA.margem >= 10 ? 'text-amber-600' : 'text-red-500'}`}
                    >
                      {fmtPct(mA.margem)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Comparison bar chart */}
          {mB && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">
                Comparativo A vs B
              </h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={[
                    { name: 'Receita', A: mA.receita, B: mB.receita },
                    { name: 'Lucro Op', A: mA.lucroOp, B: mB.lucroOp },
                    { name: 'Despesas', A: mA.despesas, B: mB.despesas },
                    { name: 'CMV', A: mA.cmv, B: mB.cmv },
                  ]}
                  margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.slate }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: C.slate }}
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    dataKey="A"
                    name={`A: ${fmtDate(dateFrom)}→${fmtDate(dateTo)}`}
                    fill={C.primary}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="B"
                    name={`B: ${fmtDate(dateFrom2)}→${fmtDate(dateTo2)}`}
                    fill={C.slate}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top products */}
          {ranking.length > 0 && (
            <div className="card">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Top Produtos no Período
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                      {[
                        'SKU',
                        'Produto',
                        'Pedidos',
                        'Unid.',
                        'Receita',
                        'Lucro Op.',
                        'Margem',
                        'Curva',
                      ].map((h) => (
                        <th key={h} className="text-left px-4 py-3 font-medium whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {ranking.map((r) => (
                      <tr
                        key={r.sku}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-core-green">{r.sku}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-200 max-w-[200px] truncate">
                          {r.produto}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-center">
                          {r.pedidos}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-center">
                          {r.unidades}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100 tabular-nums">
                          {fmt(r.receita)}
                        </td>
                        <td className="px-4 py-3 text-green-600 dark:text-green-400 tabular-nums">
                          {fmt(r.lucroOperacional)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              r.margem >= 20
                                ? 'text-green-600 font-semibold'
                                : r.margem >= 10
                                  ? 'text-amber-600'
                                  : 'text-red-500'
                            }
                          >
                            {r.margem.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.curvaABC === 'A'
                                ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                                : r.curvaABC === 'B'
                                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {r.curvaABC}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty state */}
          {mA.pedidosCount === 0 && (
            <EmptyState
              icon={<CalendarSearch size={20} />}
              title="Nenhum pedido no período selecionado"
              description="Ajuste as datas ou importe mais pedidos."
            />
          )}
        </>
      )}
    </div>
  );
}
