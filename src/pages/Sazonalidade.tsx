import { Award, CalendarRange, TrendingUp, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useStore } from '../store';
import { fmt } from '../utils/calculations';
import { C } from '../utils/chartColors';

// ─── Constants ────────────────────────────────────────────────────────────────

const DIAS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES_PT = [
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

// Heatmap color scale (gray → green-900)
function heatColor(intensity: number): string {
  if (intensity <= 0) return 'bg-slate-100 dark:bg-slate-800';
  if (intensity < 0.15) return 'bg-emerald-100 dark:bg-emerald-900/40';
  if (intensity < 0.35) return 'bg-emerald-200 dark:bg-emerald-800/60';
  if (intensity < 0.55) return 'bg-emerald-300 dark:bg-emerald-700/70';
  if (intensity < 0.75) return 'bg-emerald-500 dark:bg-emerald-600';
  return 'bg-emerald-700 dark:bg-emerald-500';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function parseDate(iso: string) {
  return new Date(iso + 'T12:00:00');
}

// ─── Heatmap ─────────────────────────────────────────────────────────────────

function HeatmapCell({
  val,
  max,
  date,
  orders,
}: {
  val: number;
  max: number;
  date: string;
  orders: number;
}) {
  const [tip, setTip] = useState(false);
  const intensity = max > 0 ? val / max : 0;
  const d = parseDate(date);
  const label = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });

  return (
    <div className="relative" onMouseEnter={() => setTip(true)} onMouseLeave={() => setTip(false)}>
      <div
        className={`w-[13px] h-[13px] rounded-[2px] cursor-pointer transition-opacity hover:opacity-75 ${heatColor(intensity)}`}
      />
      {tip && val > 0 && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 pointer-events-none
          bg-slate-800 text-white text-[10px] font-medium px-2 py-1.5 rounded-lg whitespace-nowrap shadow-xl"
        >
          <p>{label}</p>
          <p className="text-core-green">{fmt(val)}</p>
          <p className="text-slate-400">
            {orders} pedido{orders !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  sub,
  icon: Icon,
  color = 'text-core-green',
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <Icon size={13} className={color} />
      </div>
      <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const SEMANAS = 26; // ~6 months back

export function SazonalidadeContent({ embedded = false }: { embedded?: boolean }) {
  const pedidosAll = useStore((s) => s.pedidos);
  const lojaFiltro = useStore((s) => s.lojaFiltro);

  const [metric, setMetric] = useState<'receita' | 'pedidos'>('receita');

  const pedidos = useMemo(
    () =>
      (lojaFiltro ? pedidosAll.filter((p) => p.loja === lojaFiltro) : pedidosAll).filter(
        (p) => p.status === 'Concluído' || p.status === 'Enviado'
      ),
    [pedidosAll, lojaFiltro]
  );

  // ── Heatmap: últimas SEMANAS semanas ─────────────────────────────────────
  const { heatWeeks, heatMax } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // align to last Sunday
    const startSun = addDays(today, -(today.getDay() + 7 * SEMANAS));

    const dailyMap = new Map<string, { receita: number; pedidos: number }>();
    pedidos.forEach((p) => {
      const cur = dailyMap.get(p.data) ?? { receita: 0, pedidos: 0 };
      dailyMap.set(p.data, { receita: cur.receita + p.receita, pedidos: cur.pedidos + 1 });
    });

    let heatMax = 0;
    const weeks: { iso: string; receita: number; orders: number }[][] = [];
    for (let w = 0; w < SEMANAS; w++) {
      const week: { iso: string; receita: number; orders: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const day = addDays(startSun, w * 7 + d);
        const iso = toISO(day);
        const data = dailyMap.get(iso) ?? { receita: 0, pedidos: 0 };
        const val = metric === 'receita' ? data.receita : data.pedidos;
        if (val > heatMax) heatMax = val;
        week.push({ iso, receita: val, orders: data.pedidos });
      }
      weeks.push(week);
    }
    return { heatWeeks: weeks, heatMax };
  }, [pedidos, metric]);

  // Month labels for heatmap x-axis
  const heatMonthLabels = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startSun = addDays(today, -(today.getDay() + 7 * SEMANAS));
    const labels: { week: number; label: string }[] = [];
    let lastMonth = -1;
    for (let w = 0; w < SEMANAS; w++) {
      const d = addDays(startSun, w * 7 + 3); // mid-week
      const m = d.getMonth();
      if (m !== lastMonth) {
        labels.push({ week: w, label: MESES_PT[m] });
        lastMonth = m;
      }
    }
    return labels;
  }, []);

  // ── Dia da semana ─────────────────────────────────────────────────────────
  const diasData = useMemo(() => {
    const sums = new Array(7).fill(0);
    const counts = new Array(7).fill(0);
    pedidos.forEach((p) => {
      const dow = parseDate(p.data).getDay();
      sums[dow] += p.receita;
      counts[dow] += 1;
    });
    const maxAvg = Math.max(...sums.map((s, i) => (counts[i] > 0 ? s / counts[i] : 0)));
    return DIAS_PT.map((label, i) => ({
      label,
      media: counts[i] > 0 ? sums[i] / counts[i] : 0,
      total: sums[i],
      pedidos: counts[i],
      fill: counts[i] > 0 ? sums[i] / counts[i] / maxAvg : 0,
    }));
  }, [pedidos]);

  const melhorDia = useMemo(
    () => diasData.reduce((b, d) => (d.media > b.media ? d : b), diasData[0]),
    [diasData]
  );
  const piorDia = useMemo(
    () =>
      diasData
        .filter((d) => d.pedidos > 0)
        .reduce((b, d) => (d.media < b.media ? d : b), diasData[0]),
    [diasData]
  );

  // ── Mês do ano ────────────────────────────────────────────────────────────
  const mesesData = useMemo(() => {
    const sums = new Array(12).fill(0);
    const counts = new Array(12).fill(0);
    const yearsSet = new Set<number>();
    pedidos.forEach((p) => {
      const d = parseDate(p.data);
      const m = d.getMonth();
      const y = d.getFullYear();
      sums[m] += p.receita;
      counts[m] += 1;
      yearsSet.add(y);
    });
    const nYears = Math.max(1, yearsSet.size);
    return MESES_PT.map((label, i) => ({
      label,
      media: counts[i] > 0 ? sums[i] / nYears : 0,
      total: sums[i],
      pedidos: counts[i],
    }));
  }, [pedidos]);

  const melhorMes = useMemo(
    () => mesesData.reduce((b, m) => (m.media > b.media ? m : b), mesesData[0]),
    [mesesData]
  );

  // ── Fim de semana vs semana ───────────────────────────────────────────────
  const fdsVsWeek = useMemo(() => {
    let fdsRec = 0,
      fdsN = 0,
      weekRec = 0,
      weekN = 0;
    pedidos.forEach((p) => {
      const dow = parseDate(p.data).getDay();
      if (dow === 0 || dow === 6) {
        fdsRec += p.receita;
        fdsN++;
      } else {
        weekRec += p.receita;
        weekN++;
      }
    });
    const fdsAvg = fdsN > 0 ? fdsRec / fdsN : 0;
    const weekAvg = weekN > 0 ? weekRec / weekN : 0;
    return { fdsAvg, weekAvg, fdsTotal: fdsRec, weekTotal: weekRec, fdsN, weekN };
  }, [pedidos]);

  // ── Radar data ───────────────────────────────────────────────────────────
  const radarData = diasData.map((d) => ({ subject: d.label, value: Math.round(d.media) }));

  // ── Top produto por mês ───────────────────────────────────────────────────
  const topPorMes = useMemo(() => {
    const map: Record<number, Record<string, number>> = {};
    pedidos.forEach((p) => {
      const m = parseDate(p.data).getMonth();
      if (!map[m]) map[m] = {};
      map[m][p.produto] = (map[m][p.produto] ?? 0) + p.receita;
    });
    return MESES_PT.map((label, i) => {
      const entries = Object.entries(map[i] ?? {}).sort((a, b) => b[1] - a[1]);
      return { label, produto: entries[0]?.[0] ?? '—', receita: entries[0]?.[1] ?? 0 };
    }).filter((m) => m.receita > 0);
  }, [pedidos]);

  if (pedidos.length === 0) {
    return (
      <div className="p-6">
        <div className="card p-14 text-center">
          <CalendarRange size={36} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">
            Nenhum dado disponível
          </h3>
          <p className="text-slate-400 dark:text-slate-500 text-sm">
            Importe pedidos para ver a análise de sazonalidade.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      {!embedded && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-core-green/10 flex items-center justify-center">
              <CalendarRange size={18} className="text-core-green" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Sazonalidade</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Padrões de vendas por dia, semana e mês
              </p>
            </div>
          </div>
          {/* Métrica toggle */}
          <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
            {(['receita', 'pedidos'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors capitalize ${
                  metric === m
                    ? 'bg-core-green text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {m === 'receita' ? 'Receita' : 'Pedidos'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Stat
          label="Melhor dia"
          value={melhorDia.label}
          sub={`média ${fmt(melhorDia.media)}`}
          icon={Award}
        />
        <Stat
          label="Melhor mês"
          value={melhorMes.label}
          sub={`média ${fmt(melhorMes.media)}/ano`}
          icon={TrendingUp}
        />
        <Stat
          label="Fim de semana"
          value={fmt(fdsVsWeek.fdsAvg)}
          sub={`vs ${fmt(fdsVsWeek.weekAvg)} em dias úteis`}
          icon={Zap}
          color={fdsVsWeek.fdsAvg >= fdsVsWeek.weekAvg ? 'text-core-green' : 'text-amber-500'}
        />
        <Stat
          label="Dia mais fraco"
          value={piorDia?.label ?? '—'}
          sub={piorDia ? `média ${fmt(piorDia.media)}` : ''}
          icon={TrendingUp}
          color="text-slate-400"
        />
      </div>

      {/* Heatmap */}
      <div className="card p-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Heatmap — {metric === 'receita' ? 'Receita' : 'Pedidos'} por dia (últimas {SEMANAS}{' '}
          semanas)
        </p>

        {/* Month axis */}
        <div className="relative" style={{ paddingLeft: '28px' }}>
          <div className="flex gap-[3px] mb-1 text-[9px] text-slate-400 dark:text-slate-500">
            {heatMonthLabels.map(({ week, label }) => (
              <div key={week} style={{ position: 'absolute', left: `${28 + week * 16}px` }}>
                {label}
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-[3px]">
            {/* Day labels */}
            <div className="flex flex-col gap-[3px] mr-1">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                <div
                  key={i}
                  className="w-[13px] h-[13px] text-[8px] text-slate-400 flex items-center justify-center"
                >
                  {i % 2 === 1 ? d : ''}
                </div>
              ))}
            </div>
            {/* Grid */}
            {heatWeeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day) => (
                  <HeatmapCell
                    key={day.iso}
                    val={day.receita}
                    max={heatMax}
                    date={day.iso}
                    orders={day.orders}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 mt-3 text-[9px] text-slate-400">
          <span>Menos</span>
          {[0, 0.1, 0.3, 0.55, 0.8].map((i) => (
            <div key={i} className={`w-[13px] h-[13px] rounded-[2px] ${heatColor(i)}`} />
          ))}
          <span>Mais</span>
        </div>
      </div>

      {/* Dia da semana + Radar */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
            Receita Média por Dia da Semana
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={diasData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: C.slate }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: C.slate }}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(1)}k`}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <Tooltip
                formatter={(v: any) => [fmt(Number(v)), 'Média diária']}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="media" radius={[4, 4, 0, 0]}>
                {diasData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.label === melhorDia.label ? C.primary : C.slate}
                    opacity={d.pedidos === 0 ? 0.2 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
            Distribuição Semanal — Radar
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(148,163,184,0.2)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: C.slate }} />
              <PolarRadiusAxis tick={false} axisLine={false} />
              <Radar
                dataKey="value"
                stroke={C.primary}
                fill={C.primary}
                fillOpacity={0.18}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sazonalidade mensal */}
      <div className="card p-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
          Sazonalidade Mensal — Média de Receita por Mês do Ano
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={mesesData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: C.slate }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: C.slate }}
              tickFormatter={(v) => `R$${(v / 1000).toFixed(1)}k`}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Tooltip
              formatter={(v: any) => [fmt(Number(v)), 'Média anual']}
              contentStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="media" radius={[4, 4, 0, 0]}>
              {mesesData.map((m, i) => (
                <Cell
                  key={i}
                  fill={
                    m.label === melhorMes.label
                      ? C.primary
                      : m.media > melhorMes.media * 0.7
                        ? '#34d399'
                        : C.slate
                  }
                  opacity={m.pedidos === 0 ? 0.15 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top produto por mês */}
      {topPorMes.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Produto Líder por Mês
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800">
                  {['Mês', 'Produto mais vendido', 'Receita total'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {topPorMes.map((m) => (
                  <tr
                    key={m.label}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors"
                  >
                    <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200 w-20">
                      {m.label}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 truncate max-w-xs">
                      {m.produto}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-core-green font-medium">
                      {fmt(m.receita)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Insight cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="card p-4 border-l-4 border-l-core-green">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
            Melhor dia da semana
          </p>
          <p className="text-2xl font-bold text-core-green">{melhorDia.label}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Média de {fmt(melhorDia.media)} · {melhorDia.pedidos} pedido
            {melhorDia.pedidos !== 1 ? 's' : ''} total
          </p>
        </div>
        <div className="card p-4 border-l-4 border-l-amber-400">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
            Melhor mês histórico
          </p>
          <p className="text-2xl font-bold text-amber-500">{melhorMes.label}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Média de {fmt(melhorMes.media)} por ano · {melhorMes.pedidos} pedido
            {melhorMes.pedidos !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="card p-4 border-l-4 border-l-slate-300">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
            Fim de semana vs Semana
          </p>
          <p
            className={`text-2xl font-bold ${fdsVsWeek.fdsAvg >= fdsVsWeek.weekAvg ? 'text-core-green' : 'text-slate-500'}`}
          >
            {fdsVsWeek.fdsAvg >= fdsVsWeek.weekAvg ? 'FDS mais forte' : 'Dias úteis mais fortes'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            FDS: {fmt(fdsVsWeek.fdsAvg)}/dia · Semana: {fmt(fdsVsWeek.weekAvg)}/dia
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Sazonalidade() {
  return <SazonalidadeContent />;
}
