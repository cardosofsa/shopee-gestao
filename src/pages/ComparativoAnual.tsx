import {
  Award,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Minus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useStore } from '../store';
import { fmt, getKPIsMes } from '../utils/calculations';
import { C } from '../utils/chartColors';

// ─── Types ────────────────────────────────────────────────────────────────────

type Metric = 'receita' | 'pedidos' | 'lucro' | 'margem';

const METRIC_CFG: Record<
  Metric,
  {
    label: string;
    fmt: (v: number) => string;
    fromKPI: (k: ReturnType<typeof getKPIsMes>) => number;
  }
> = {
  receita: { label: 'Receita', fmt: (v) => fmt(v), fromKPI: (k) => k.faturamento },
  pedidos: { label: 'Pedidos', fmt: (v) => String(Math.round(v)), fromKPI: (k) => k.pedidosMes },
  lucro: { label: 'Lucro Op.', fmt: (v) => fmt(v), fromKPI: (k) => k.lucroOp },
  margem: { label: 'Margem %', fmt: (v) => `${v.toFixed(1)}%`, fromKPI: (k) => k.margem },
};

const MESES_LABEL = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

const YEAR_COLORS = [C.primary, '#6366f1', C.amber, C.red];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function growthPct(a: number, b: number) {
  if (b === 0) return null;
  return ((a - b) / b) * 100;
}

function GrowthBadge({ pct }: { pct: number | null }) {
  if (pct === null)
    return <span className="text-[10px] text-slate-300 dark:text-slate-600">—</span>;
  const Icon = pct > 0 ? TrendingUp : pct < 0 ? TrendingDown : Minus;
  const cls = pct > 0 ? 'text-emerald-600' : pct < 0 ? 'text-red-500' : 'text-slate-400';
  return (
    <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${cls}`}>
      <Icon size={9} />
      {pct > 0 ? '+' : ''}
      {pct.toFixed(1)}%
    </span>
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label, metric }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-lg text-xs">
      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 py-0.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-500 dark:text-slate-400">{p.name}:</span>
          <span className="font-bold text-slate-700 dark:text-slate-200">
            {METRIC_CFG[metric as Metric].fmt(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ComparativoAnual() {
  const pedidosAll = useStore((s) => s.pedidos);
  const historico = useStore((s) => s.historico);

  const currentYear = new Date().getFullYear();

  // Available years from pedidos + historico
  const availableYears = useMemo(() => {
    const ys = new Set<number>();
    pedidosAll.forEach((p) => ys.add(parseInt(p.data.slice(0, 4))));
    historico.forEach((h) => ys.add(parseInt(h.mesAno.slice(0, 4))));
    ys.add(currentYear);
    return Array.from(ys).sort((a, b) => b - a);
  }, [pedidosAll, historico, currentYear]);

  const [metric, setMetric] = useState<Metric>('receita');
  const [baseYear, setBaseYear] = useState(currentYear);
  const [cmpYears, setCmpYears] = useState<number[]>(() => {
    const prev = currentYear - 1;
    return availableYears.includes(prev) ? [prev] : [];
  });

  const displayYears = [baseYear, ...cmpYears].slice(0, 4);

  const toggleCmpYear = (y: number) => {
    setCmpYears((prev) =>
      prev.includes(y) ? prev.filter((x) => x !== y) : [...prev, y].slice(0, 3)
    );
  };

  // ── Monthly data per year ─────────────────────────────────────────────────

  const yearData = useMemo(() => {
    const cfg = METRIC_CFG[metric];
    const result: Record<number, number[]> = {};

    displayYears.forEach((yr) => {
      result[yr] = Array.from({ length: 12 }, (_, mi) => {
        const mk = monthKey(yr, mi);
        // prefer historico for past months
        const hist = historico.find((h) => h.mesAno === mk);
        if (hist) {
          if (metric === 'receita') return hist.faturamentoBruto;
          if (metric === 'pedidos') return hist.pedidosQtd;
          if (metric === 'lucro') return hist.lucroOperacional;
          if (metric === 'margem') return hist.margemPercentual;
        }
        const kpi = getKPIsMes(pedidosAll, mk);
        return cfg.fromKPI(kpi);
      });
    });
    return result;
  }, [pedidosAll, historico, displayYears, metric]);

  // ── Chart data (month rows) ───────────────────────────────────────────────

  const chartData = useMemo(() => {
    return Array.from({ length: 12 }, (_, mi) => {
      const row: Record<string, string | number> = { mes: MESES_LABEL[mi] };
      displayYears.forEach((yr) => {
        row[String(yr)] = yearData[yr]?.[mi] ?? 0;
      });
      return row;
    });
  }, [yearData, displayYears]);

  // ── Running totals ────────────────────────────────────────────────────────

  const runningData = useMemo(() => {
    const cumulative: Record<number, number[]> = {};
    displayYears.forEach((yr) => {
      let acc = 0;
      cumulative[yr] = (yearData[yr] ?? []).map((v) => {
        acc += v;
        return acc;
      });
    });

    return Array.from({ length: 12 }, (_, mi) => {
      const row: Record<string, string | number> = { mes: MESES_LABEL[mi] };
      displayYears.forEach((yr) => {
        row[String(yr)] = cumulative[yr]?.[mi] ?? 0;
      });
      return row;
    });
  }, [yearData, displayYears]);

  // ── Annual totals + growth ────────────────────────────────────────────────

  const annualTotals = useMemo(() => {
    return displayYears.map((yr) => ({
      year: yr,
      total: (yearData[yr] ?? []).reduce((s, v) => s + v, 0),
      monthly: yearData[yr] ?? [],
    }));
  }, [yearData, displayYears]);

  // Growth vs base year
  const baseTotal = annualTotals[0]?.total ?? 0;

  // ── Monthly growth table (base vs first compare year) ─────────────────────

  const compareYear = cmpYears[0];
  const growthRows = useMemo(() => {
    if (!compareYear) return [];
    return Array.from({ length: 12 }, (_, mi) => {
      const curr = yearData[baseYear]?.[mi] ?? 0;
      const prev = yearData[compareYear]?.[mi] ?? 0;
      return { mes: MESES_LABEL[mi], curr, prev, growth: growthPct(curr, prev) };
    });
  }, [yearData, baseYear, compareYear]);

  // ── Best month per year ───────────────────────────────────────────────────

  const bestMonths = useMemo(() => {
    return displayYears.map((yr) => {
      const monthly = yearData[yr] ?? [];
      const best = monthly.reduce((b, v, i) => (v > monthly[b] ? i : b), 0);
      return { year: yr, month: MESES_LABEL[best], value: monthly[best] ?? 0 };
    });
  }, [yearData, displayYears]);

  const cfg = METRIC_CFG[metric];

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-core-green/10 flex items-center justify-center">
            <CalendarRange size={18} className="text-core-green" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Comparativo Ano a Ano
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Evolução histórica mês a mês entre anos
            </p>
          </div>
        </div>
        <Link to="/previsao" className="text-xs text-core-green hover:underline">
          Ver Previsão de Vendas →
        </Link>
      </div>

      {/* Controls */}
      <div className="flex items-start gap-4 flex-wrap">
        {/* Metric tabs */}
        <div className="flex items-center gap-1 card px-1 py-1">
          {(Object.entries(METRIC_CFG) as [Metric, (typeof METRIC_CFG)[Metric]][]).map(([k, c]) => (
            <button
              key={k}
              onClick={() => setMetric(k)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                metric === k
                  ? 'bg-core-green text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Year selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 card px-2 py-1">
            <button
              onClick={() => setBaseYear((y) => y - 1)}
              disabled={!availableYears.includes(baseYear - 1)}
              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-sm font-bold text-core-green px-1 min-w-12 text-center">
              {baseYear}
            </span>
            <button
              onClick={() => setBaseYear((y) => y + 1)}
              disabled={baseYear >= currentYear}
              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
          <span className="text-xs text-slate-400">vs</span>
          <div className="flex items-center gap-1 flex-wrap">
            {availableYears
              .filter((y) => y !== baseYear)
              .map((y) => (
                <button
                  key={y}
                  onClick={() => toggleCmpYear(y)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                    cmpYears.includes(y)
                      ? 'text-white border-transparent'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-core-green/50'
                  }`}
                  style={
                    cmpYears.includes(y)
                      ? { background: YEAR_COLORS[(cmpYears.indexOf(y) + 1) % YEAR_COLORS.length] }
                      : {}
                  }
                >
                  {y}
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Annual totals cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {annualTotals.map((a, i) => {
          return (
            <div
              key={a.year}
              className="card p-4"
              style={{ borderLeftColor: YEAR_COLORS[i % YEAR_COLORS.length], borderLeftWidth: 3 }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                {a.year} {i === 0 ? '(base)' : ''}
              </p>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                {cfg.fmt(a.total)}
              </p>
              {i > 0 && (
                <div className="mt-1">
                  <GrowthBadge pct={growthPct(baseTotal, a.total)} />
                  <span className="text-[10px] text-slate-400 ml-1">vs {baseYear}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Overlay line chart */}
      <div className="card p-4">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
          {cfg.label} por mês — comparação anual
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
            <XAxis dataKey="mes" tick={{ fontSize: 10, fill: C.slate }} />
            <YAxis
              tick={{ fontSize: 9, fill: C.slate }}
              width={metric === 'pedidos' || metric === 'margem' ? 32 : 56}
              tickFormatter={
                metric === 'pedidos'
                  ? (v) => String(v)
                  : metric === 'margem'
                    ? (v) => `${v.toFixed(0)}%`
                    : (v) => `${(v / 1000).toFixed(0)}k`
              }
            />
            <Tooltip content={<CustomTooltip metric={metric} />} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            {displayYears.map((yr, i) => (
              <Line
                key={yr}
                type="monotone"
                dataKey={String(yr)}
                stroke={YEAR_COLORS[i % YEAR_COLORS.length]}
                strokeWidth={i === 0 ? 2.5 : 1.5}
                strokeDasharray={i === 0 ? undefined : i === 1 ? undefined : '6 3'}
                dot={{ r: 3, fill: YEAR_COLORS[i % YEAR_COLORS.length] }}
                activeDot={{ r: 5 }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Running total */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {cfg.label} acumulado no ano
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">Total somado mês a mês</p>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={runningData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
            <XAxis dataKey="mes" tick={{ fontSize: 10, fill: C.slate }} />
            <YAxis
              tick={{ fontSize: 9, fill: C.slate }}
              width={metric === 'pedidos' || metric === 'margem' ? 32 : 56}
              tickFormatter={
                metric === 'pedidos'
                  ? (v) => String(v)
                  : metric === 'margem'
                    ? (v) => `${v.toFixed(0)}%`
                    : (v) => `${(v / 1000).toFixed(0)}k`
              }
            />
            <Tooltip content={<CustomTooltip metric={metric} />} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            {displayYears.map((yr, i) => (
              <Area
                key={yr}
                type="monotone"
                dataKey={String(yr)}
                stroke={YEAR_COLORS[i % YEAR_COLORS.length]}
                fill={YEAR_COLORS[i % YEAR_COLORS.length]}
                fillOpacity={i === 0 ? 0.15 : 0.06}
                strokeWidth={i === 0 ? 2 : 1.5}
                strokeDasharray={i > 1 ? '5 3' : undefined}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly growth table */}
      {compareYear && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Crescimento mês a mês — {baseYear} vs {compareYear}
            </p>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-emerald-600">
                <TrendingUp size={10} /> crescimento
              </span>
              <span className="flex items-center gap-1 text-red-500">
                <TrendingDown size={10} /> queda
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left px-4 py-2 font-semibold text-slate-500 dark:text-slate-400">
                    Mês
                  </th>
                  <th className="text-right px-4 py-2 font-semibold text-slate-500 dark:text-slate-400">
                    {baseYear}
                  </th>
                  <th className="text-right px-4 py-2 font-semibold text-slate-500 dark:text-slate-400">
                    {compareYear}
                  </th>
                  <th className="text-right px-4 py-2 font-semibold text-slate-500 dark:text-slate-400">
                    Δ%
                  </th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {growthRows.map((r) => {
                  const up = r.growth != null ? r.growth > 0 : null;
                  const barW = r.growth != null ? Math.min(100, Math.abs(r.growth)) : 0;
                  return (
                    <tr
                      key={r.mes}
                      className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-200">
                        {r.mes}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                        {cfg.fmt(r.curr)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400">
                        {cfg.fmt(r.prev)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <GrowthBadge pct={r.growth} />
                      </td>
                      <td className="px-4 py-2 w-24">
                        {r.growth != null && (
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${up ? 'bg-emerald-500' : 'bg-red-400'}`}
                              style={{ width: `${barW}%` }}
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-slate-50 dark:bg-slate-800/50 font-semibold">
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-200">Total anual</td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">
                    {cfg.fmt(annualTotals[0]?.total ?? 0)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400">
                    {cfg.fmt(annualTotals.find((a) => a.year === compareYear)?.total ?? 0)}
                  </td>
                  <td className="px-4 py-2 text-right" colSpan={2}>
                    <GrowthBadge
                      pct={growthPct(
                        annualTotals[0]?.total ?? 0,
                        annualTotals.find((a) => a.year === compareYear)?.total ?? 0
                      )}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Best months per year */}
      <div className="card p-4">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
          <Award size={14} className="text-amber-500" />
          Mês pico por ano
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {bestMonths.map((b, i) => (
            <div
              key={b.year}
              className="rounded-xl p-3 text-center"
              style={{
                background: `${YEAR_COLORS[i % YEAR_COLORS.length]}15`,
                border: `1px solid ${YEAR_COLORS[i % YEAR_COLORS.length]}30`,
              }}
            >
              <p
                className="text-xs font-semibold"
                style={{ color: YEAR_COLORS[i % YEAR_COLORS.length] }}
              >
                {b.year}
              </p>
              <p className="text-base font-bold text-slate-800 dark:text-slate-100 mt-1">
                {b.month}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 tabular-nums">{cfg.fmt(b.value)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
