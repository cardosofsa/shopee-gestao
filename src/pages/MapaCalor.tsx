import {
  Activity,
  Award,
  BarChart2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useStore } from '../store';
import { fmt } from '../utils/calculations';
import { C } from '../utils/chartColors';

// ─── Types / constants ────────────────────────────────────────────────────────

type Metric = 'receita' | 'pedidos' | 'lucro';

const METRIC_CFG: Record<Metric, { label: string; fmt: (v: number) => string }> = {
  receita: { label: 'Receita', fmt: (v) => fmt(v) },
  pedidos: { label: 'Pedidos', fmt: (v) => String(v) },
  lucro: { label: 'Lucro Op.', fmt: (v) => fmt(v) },
};

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Color ramp — slate → core-green
const RAMP = [
  '#f1f5f9',
  '#bbf7d0',
  '#86efac',
  '#4ade80',
  '#22c55e',
  '#16a34a',
  '#15803d',
  '#166534',
];

function rampColor(v: number, max: number): string {
  if (max === 0 || v === 0) return RAMP[0];
  const idx = Math.ceil((v / max) * (RAMP.length - 1));
  return RAMP[Math.max(0, Math.min(RAMP.length - 1, idx))];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoToDate(iso: string) {
  return new Date(iso + 'T12:00:00');
}

function dateToIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfYear(year: number) {
  return new Date(year, 0, 1);
}
function endOfYear(year: number) {
  return new Date(year, 11, 31);
}

/** Build array of all dates in the year, padded to start on Sunday */
function buildCalendar(year: number): (string | null)[] {
  const first = startOfYear(year);
  const last = endOfYear(year);
  const cells: (string | null)[] = [];
  // leading nulls to align first day of year
  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  const d = new Date(first);
  while (d <= last) {
    cells.push(dateToIso(d));
    d.setDate(d.getDate() + 1);
  }
  // trailing nulls to fill last week
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** Group cells into columns (weeks) */
function toWeeks(cells: (string | null)[]): (string | null)[][] {
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

/** Returns which week-column index each month label should sit above */
function monthPositions(
  _year: number,
  weeks: (string | null)[][]
): { label: string; col: number }[] {
  const seen = new Set<number>();
  const result: { label: string; col: number }[] = [];
  weeks.forEach((week, col) => {
    week.forEach((day) => {
      if (!day) return;
      const m = isoToDate(day).getMonth();
      if (!seen.has(m)) {
        seen.add(m);
        result.push({ label: MESES[m], col });
      }
    });
  });
  return result;
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function HeatTooltip({ day, value, metric }: { day: string; value: number; metric: Metric }) {
  const d = isoToDate(day);
  return (
    <div className="bg-slate-800 text-white text-[11px] rounded-lg px-3 py-2 shadow-xl pointer-events-none">
      <p className="font-semibold mb-0.5">
        {DIAS_SEMANA[d.getDay()]}, {d.getDate()} {MESES[d.getMonth()]} {d.getFullYear()}
      </p>
      <p className="text-slate-300">
        {METRIC_CFG[metric].label}:{' '}
        <span className="text-white font-bold">{METRIC_CFG[metric].fmt(value)}</span>
      </p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MapaCalor() {
  const pedidosAll = useStore((s) => s.pedidos);

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [metric, setMetric] = useState<Metric>('receita');
  const [hovered, setHovered] = useState<{
    day: string;
    value: number;
    x: number;
    y: number;
  } | null>(null);

  // ── Aggregate per day ─────────────────────────────────────────────────────

  const dayMap = useMemo<Map<string, { receita: number; pedidos: number; lucro: number }>>(() => {
    const m = new Map();
    pedidosAll
      .filter(
        (p) =>
          (p.status === 'Concluído' || p.status === 'Enviado') && p.data.startsWith(String(year))
      )
      .forEach((p) => {
        const prev = m.get(p.data) ?? { receita: 0, pedidos: 0, lucro: 0 };
        m.set(p.data, {
          receita: prev.receita + p.receita,
          pedidos: prev.pedidos + 1,
          lucro: prev.lucro + p.lucroOperacional,
        });
      });
    return m;
  }, [pedidosAll, year]);

  const getValue = (day: string): number => {
    const d = dayMap.get(day);
    if (!d) return 0;
    return d[metric];
  };

  const maxVal = useMemo(
    () => Math.max(0, ...Array.from(dayMap.values()).map((d) => d[metric])),
    [dayMap, metric]
  );

  // ── Calendar structure ────────────────────────────────────────────────────

  const cells = useMemo(() => buildCalendar(year), [year]);
  const weeks = useMemo(() => toWeeks(cells), [cells]);
  const monthPos = useMemo(() => monthPositions(year, weeks), [year, weeks]);

  // ── Monthly totals for bar chart ──────────────────────────────────────────

  const monthlyData = useMemo(() => {
    return MESES.map((label, mi) => {
      let total = 0;
      dayMap.forEach((v, day) => {
        if (isoToDate(day).getMonth() === mi) total += v[metric];
      });
      return { label, total };
    });
  }, [dayMap, metric]);

  // ── Day-of-week distribution ──────────────────────────────────────────────

  const dowData = useMemo(() => {
    const sums = Array(7).fill(0);
    const counts = Array(7).fill(0);
    dayMap.forEach((v, day) => {
      const dow = isoToDate(day).getDay();
      sums[dow] += v[metric];
      counts[dow] += 1;
    });
    return DIAS_SEMANA.map((label, i) => ({
      label,
      total: sums[i],
      media: counts[i] > 0 ? sums[i] / counts[i] : 0,
    }));
  }, [dayMap, metric]);

  const bestDow = dowData.reduce((b, d) => (d.media > b.media ? d : b), dowData[0]);

  // ── Top days ──────────────────────────────────────────────────────────────

  const topDays = useMemo(() => {
    return Array.from(dayMap.entries())
      .sort((a, b) => b[1][metric] - a[1][metric])
      .slice(0, 5)
      .map(([day, v]) => ({ day, value: v[metric] }));
  }, [dayMap, metric]);

  // ── Totals ────────────────────────────────────────────────────────────────

  const totalAno = useMemo(() => {
    let s = 0;
    dayMap.forEach((v) => {
      s += v[metric];
    });
    return s;
  }, [dayMap, metric]);

  const diasComVenda = dayMap.size;
  const mediaAtivos = diasComVenda > 0 ? totalAno / diasComVenda : 0;

  // ── Cell size (responsive) ────────────────────────────────────────────────
  const CELL = 12;
  const GAP = 2;

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
            <Activity size={18} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Mapa de Calor de Vendas
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Padrões diários de venda ao longo do ano
            </p>
          </div>
        </div>
        <Link to="/sazonalidade" className="text-xs text-core-green hover:underline">
          Ver sazonalidade mensal →
        </Link>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Year nav */}
        <div className="flex items-center gap-1 card px-2 py-1">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 px-1">
            {year}
          </span>
          <button
            onClick={() => setYear((y) => y + 1)}
            disabled={year >= currentYear}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors disabled:opacity-30"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Metric tabs */}
        <div className="flex items-center gap-1 card px-1 py-1">
          {(Object.entries(METRIC_CFG) as [Metric, (typeof METRIC_CFG)[Metric]][]).map(
            ([k, cfg]) => (
              <button
                key={k}
                onClick={() => setMetric(k)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  metric === k
                    ? 'bg-core-green text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {cfg.label}
              </button>
            )
          )}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
            Total {year}
          </p>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
            {METRIC_CFG[metric].fmt(totalAno)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
            Dias com venda
          </p>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
            {diasComVenda}
            <span className="text-sm font-normal text-slate-400 ml-1">dias</span>
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
            Média por dia ativo
          </p>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
            {METRIC_CFG[metric].fmt(mediaAtivos)}
          </p>
        </div>
      </div>

      {/* Heatmap */}
      <div className="card p-4 overflow-x-auto">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
          {year} — cada quadrado = 1 dia
        </p>

        <div className="relative">
          {/* Month labels */}
          <div className="flex ml-7 mb-1" style={{ gap: GAP }}>
            {monthPos.map(({ label, col }) => (
              <div
                key={label}
                className="text-[9px] text-slate-400 absolute"
                style={{ left: 28 + col * (CELL + GAP) }}
              >
                {label}
              </div>
            ))}
          </div>

          <div className="flex mt-3" style={{ gap: GAP }}>
            {/* Day-of-week labels */}
            <div className="flex flex-col mr-0.5" style={{ gap: GAP }}>
              {DIAS_SEMANA.map((d, i) => (
                <div
                  key={d}
                  className="text-[9px] text-slate-400 flex items-center justify-end pr-1"
                  style={{ height: CELL, fontSize: 9, opacity: i % 2 === 0 ? 1 : 0 }}
                >
                  {i % 2 === 0 ? d.slice(0, 3) : ''}
                </div>
              ))}
            </div>

            {/* Weeks */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                {week.map((day, di) => {
                  const val = day ? getValue(day) : 0;
                  const color =
                    day && val > 0 ? rampColor(val, maxVal) : day ? '#e2e8f0' : 'transparent';

                  return (
                    <div
                      key={di}
                      style={{
                        width: CELL,
                        height: CELL,
                        borderRadius: 2,
                        background: color,
                        cursor: day && val > 0 ? 'pointer' : 'default',
                      }}
                      onMouseEnter={(e) => {
                        if (!day || val === 0) return;
                        setHovered({ day, value: val, x: e.clientX, y: e.clientY });
                      }}
                      onMouseLeave={() => setHovered(null)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 mt-4">
          <span className="text-[10px] text-slate-400">Menos</span>
          {RAMP.map((c) => (
            <div key={c} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
          ))}
          <span className="text-[10px] text-slate-400">Mais</span>
        </div>
      </div>

      {/* Tooltip overlay */}
      {hovered && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: hovered.x + 12, top: hovered.y - 40 }}
        >
          <HeatTooltip day={hovered.day} value={hovered.value} metric={metric} />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Monthly totals */}
        <div className="card p-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Por mês</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: C.slate }} />
              <YAxis
                tick={{ fontSize: 9, fill: C.slate }}
                width={metric === 'pedidos' ? 28 : 50}
                tickFormatter={
                  metric === 'pedidos' ? (v) => String(v) : (v) => `${(v / 1000).toFixed(0)}k`
                }
              />
              <Tooltip
                contentStyle={{
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '11px',
                }}
                formatter={(v: unknown) => [
                  METRIC_CFG[metric].fmt(v as number),
                  METRIC_CFG[metric].label,
                ]}
              />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {monthlyData.map((m, i) => (
                  <Cell
                    key={i}
                    fill={
                      m.total === Math.max(...monthlyData.map((x) => x.total))
                        ? C.primary
                        : '#cbd5e1'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Day-of-week distribution */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Por dia da semana
            </p>
            <div className="flex items-center gap-1.5 text-xs text-core-green font-medium bg-core-green/10 px-2.5 py-1 rounded-full">
              <Award size={11} />
              {bestDow.label}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dowData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.slate }} />
              <YAxis
                tick={{ fontSize: 9, fill: C.slate }}
                width={metric === 'pedidos' ? 28 : 50}
                tickFormatter={
                  metric === 'pedidos' ? (v) => String(v) : (v) => `${(v / 1000).toFixed(0)}k`
                }
              />
              <Tooltip
                contentStyle={{
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '11px',
                }}
                formatter={(v: unknown) => [
                  METRIC_CFG[metric].fmt(v as number),
                  `Média por ${METRIC_CFG[metric].label.toLowerCase()}`,
                ]}
                labelFormatter={(l) => `${l}s`}
              />
              <Bar dataKey="media" radius={[4, 4, 0, 0]}>
                {dowData.map((d, i) => (
                  <Cell key={i} fill={d.label === bestDow.label ? C.primary : '#cbd5e1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top days + insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top 5 days */}
        <div className="card p-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
            <Award size={14} className="text-amber-500" />
            Melhores dias de {year}
          </p>
          {topDays.length > 0 ? (
            <div className="space-y-2">
              {topDays.map(({ day, value }, i) => {
                const d = isoToDate(day);
                const pct = maxVal > 0 ? (value / maxVal) * 100 : 0;
                return (
                  <div key={day} className="flex items-center gap-3">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                        i === 0
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                          {DIAS_SEMANA[d.getDay()]}, {d.getDate()} {MESES[d.getMonth()]}
                        </span>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                          {METRIC_CFG[metric].fmt(value)}
                        </span>
                      </div>
                      <div className="h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-core-green rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500 py-4 text-center">
              Sem dados de vendas em {year}
            </p>
          )}
        </div>

        {/* Insights */}
        <div className="card p-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
            <TrendingUp size={14} className="text-core-green" />
            Insights
          </p>
          <div className="space-y-3">
            {bestDow.media > 0 && (
              <div className="flex gap-3 p-3 rounded-xl bg-core-green/5 border border-core-green/10">
                <Calendar size={14} className="text-core-green mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {bestDow.label}s são seu melhor dia
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Média de {METRIC_CFG[metric].fmt(bestDow.media)} por{' '}
                    {bestDow.label.toLowerCase()}. Programe campanhas relâmpago neste dia.
                  </p>
                </div>
              </div>
            )}

            {(() => {
              const bestMonth = monthlyData.reduce(
                (b, m) => (m.total > b.total ? m : b),
                monthlyData[0]
              );
              const worstMonth = monthlyData
                .filter((m) => m.total > 0)
                .reduce(
                  (b, m) => (m.total < b.total ? m : b),
                  monthlyData.find((m) => m.total > 0) ?? monthlyData[0]
                );
              if (bestMonth.total === 0) return null;
              return (
                <div className="flex gap-3 p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-100 dark:border-cyan-900/30">
                  <BarChart2 size={14} className="text-cyan-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {bestMonth.label} foi o mês pico
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {METRIC_CFG[metric].fmt(bestMonth.total)} —{' '}
                      {worstMonth && worstMonth.total > 0 && worstMonth.label !== bestMonth.label
                        ? `${worstMonth.label} foi o mais fraco com ${METRIC_CFG[metric].fmt(worstMonth.total)}`
                        : 'planeje reposição antes desse período'}
                      .
                    </p>
                  </div>
                </div>
              );
            })()}

            {diasComVenda > 0 && diasComVenda < 180 && (
              <div className="flex gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                <Activity size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Consistência a melhorar
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Vendas em {diasComVenda} dos{' '}
                    {year === currentYear
                      ? Math.ceil((Date.now() - new Date(year, 0, 1).getTime()) / 86_400_000)
                      : 365}{' '}
                    dias. Ative ADS em dias sem venda para regularizar o fluxo.
                  </p>
                </div>
              </div>
            )}

            {diasComVenda === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">
                Sem dados de vendas em {year}. Importe pedidos para ver os insights.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
