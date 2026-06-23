import { useMemo, useState } from 'react';
import {
  TrendingUp, TrendingDown, Minus, BarChart3, Download,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts';
import { useStore } from '../store';
import { fmt, fmtPct, getKPIsMes } from '../utils/calculations';
import { exportXlsx, xlsxNum } from '../utils/exportXlsx';
import { C } from '../utils/chartColors';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mesLabel(mesAno: string) {
  return new Date(mesAno + '-02').toLocaleString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
}

function delta(atual: number, ant: number) {
  if (ant === 0) return null;
  return ((atual - ant) / Math.abs(ant)) * 100;
}

function DeltaChip({ pct, invert = false }: { pct: number | null; invert?: boolean }) {
  if (pct === null) return <span className="text-slate-300 dark:text-slate-600 text-[10px]">—</span>;
  const pos = invert ? pct < 0 : pct > 0;
  const Icon = Math.abs(pct) < 1 ? Minus : pos ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${
      Math.abs(pct) < 1 ? 'text-slate-400' : pos ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
    }`}>
      <Icon size={9} />
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

// ─── Linha de métrica ─────────────────────────────────────────────────────────

type MetricaDef = {
  key: string;
  label: string;
  format: (v: number) => string;
  invert?: boolean;      // custo → maior = pior
  highlight?: boolean;   // linha em negrito
  separator?: boolean;   // linha divisória acima
};

const METRICAS: MetricaDef[] = [
  { key: 'faturamento',  label: 'Faturamento',         format: fmt,    highlight: true, separator: false },
  { key: 'pedidosMes',   label: 'Pedidos',             format: (v) => String(Math.round(v)) },
  { key: 'ticket',       label: 'Ticket Médio',        format: fmt },
  { key: 'custoTotal',   label: 'CMV',                 format: fmt,    invert: true, separator: true },
  { key: 'adsTotal',     label: 'Marketing/Ads',       format: fmt,    invert: true },
  { key: 'lucroOp',      label: 'Lucro Op. Bruto',     format: fmt,    highlight: true, separator: true },
  { key: 'margem',       label: 'Margem Op. (%)',      format: (v) => `${v.toFixed(1)}%`, highlight: true },
  { key: 'roi',          label: 'ROI',                 format: (v) => `${v.toFixed(1)}%` },
  { key: 'roas',         label: 'ROAS',                format: (v) => `${v.toFixed(2)}x` },
  { key: 'lucroLiquido', label: 'Lucro Líquido',       format: fmt,    highlight: true, separator: true },
];

// ─── Tooltip do gráfico ───────────────────────────────────────────────────────

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 px-3 py-2 text-xs">
      <p className="font-semibold text-slate-600 dark:text-slate-300 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Comparativo() {
  const pedidosAll = useStore((s) => s.pedidos);
  const lojaFiltro = useStore((s) => s.lojaFiltro);

  const pedidos = useMemo(
    () => lojaFiltro
      ? pedidosAll.filter((p) => p.loja === lojaFiltro || p.loja === 'Ambas')
      : pedidosAll,
    [pedidosAll, lojaFiltro],
  );

  // Todos os meses com pedidos
  const meses = useMemo(() => {
    const set = new Set<string>();
    for (const p of pedidos) set.add(p.data.slice(0, 7));
    return [...set].sort(); // crescente para o gráfico
  }, [pedidos]);

  // KPIs por mês
  type KPIRow = ReturnType<typeof getKPIsMes>;
  const kpisPorMes = useMemo((): Record<string, KPIRow> => {
    const out: Record<string, KPIRow> = {};
    for (const m of meses) out[m] = getKPIsMes(pedidos, m);
    return out;
  }, [pedidos, meses]);

  // Meses visíveis (checkbox) — padrão: últimos 6
  const [visiveis, setVisiveis] = useState<Set<string>>(() => {
    const ultimos6 = meses.slice(-6);
    return new Set(ultimos6);
  });

  const mesesVisiveis = meses.filter((m) => visiveis.has(m));

  // Chart data — todos os meses (para o gráfico de área)
  const chartData = useMemo(() =>
    meses.map((m) => ({
      name: mesLabel(m),
      Faturamento: kpisPorMes[m]?.faturamento ?? 0,
      'Lucro Op.':  kpisPorMes[m]?.lucroOp     ?? 0,
    })),
    [meses, kpisPorMes],
  );

  // Melhores / piores
  const melhorFat  = useMemo(() => meses.reduce((best, m) =>
    (kpisPorMes[m]?.faturamento ?? 0) > (kpisPorMes[best]?.faturamento ?? 0) ? m : best, meses[0] ?? ''), [meses, kpisPorMes]);
  const melhorLucro = useMemo(() => meses.reduce((best, m) =>
    (kpisPorMes[m]?.lucroOp ?? 0) > (kpisPorMes[best]?.lucroOp ?? 0) ? m : best, meses[0] ?? ''), [meses, kpisPorMes]);
  const melhorMargem = useMemo(() => meses.reduce((best, m) =>
    (kpisPorMes[m]?.margem ?? 0) > (kpisPorMes[best]?.margem ?? 0) ? m : best, meses[0] ?? ''), [meses, kpisPorMes]);

  const handleExport = () => {
    exportXlsx(`comparativo_${new Date().toISOString().slice(0, 10)}`, [{
      name: 'Comparativo Mensal',
      headers: ['Métrica', ...meses.map(mesLabel)],
      rows: METRICAS.map((m) => [
        m.label,
        ...meses.map((mes) => {
          const v = (kpisPorMes[mes] as any)?.[m.key] ?? 0;
          return xlsxNum(v);
        }),
      ]),
    }]);
  };

  if (meses.length === 0) {
    return (
      <div className="p-6">
        <div className="card p-14 text-center">
          <BarChart3 size={36} className="text-slate-200 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">Nenhum dado disponível</h3>
          <p className="text-slate-400 dark:text-slate-500 text-sm">Importe pedidos para ver o comparativo mensal.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 mb-0.5">
            <BarChart3 size={18} className="text-slate-400" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Comparativo Mensal</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm pl-7">
            {meses.length} meses · selecione quais exibir na tabela
          </p>
        </div>
        <button onClick={handleExport} className="btn-secondary">
          <Download size={15} /> Exportar todos
        </button>
      </div>

      {/* Recordes */}
      {meses.length >= 2 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Maior faturamento', mes: melhorFat,    val: fmt(kpisPorMes[melhorFat]?.faturamento ?? 0)  },
            { label: 'Maior lucro op.',   mes: melhorLucro,  val: fmt(kpisPorMes[melhorLucro]?.lucroOp ?? 0)   },
            { label: 'Maior margem op.',  mes: melhorMargem, val: fmtPct(kpisPorMes[melhorMargem]?.margem ?? 0) },
          ].map(({ label, mes, val }) => (
            <div key={label} className="card p-4 border-t-[3px] border-t-core-green">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1 leading-none">{val}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 capitalize">
                {new Date(mes + '-02').toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Gráfico de área */}
      {chartData.length > 1 && (
        <div className="card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
            Evolução — Faturamento e Lucro Operacional
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gFat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#18B37A" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#18B37A" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gLuc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.slate }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: C.slate }} axisLine={false} tickLine={false} width={48} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="Faturamento" stroke={C.primary} strokeWidth={2} fill="url(#gFat)" dot={false} />
              <Area type="monotone" dataKey="Lucro Op."  stroke="#34d399" strokeWidth={2} fill="url(#gLuc)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Seletor de meses */}
      {meses.length > 6 && (
        <div className="flex flex-wrap gap-2 items-center">
          <p className="text-[11px] text-slate-400 font-medium mr-1">Exibir:</p>
          {meses.map((m) => (
            <button
              key={m}
              onClick={() => setVisiveis((prev) => {
                const next = new Set(prev);
                if (next.has(m)) { if (next.size > 1) next.delete(m); }
                else next.add(m);
                return next;
              })}
              className={`text-[11px] px-2.5 py-1 rounded-full font-semibold transition-all ${
                visiveis.has(m)
                  ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {mesLabel(m)}
            </button>
          ))}
          <button
            onClick={() => setVisiveis(new Set(meses))}
            className="text-[11px] text-core-green font-semibold hover:underline ml-1"
          >
            Todos
          </button>
        </div>
      )}

      {/* Tabela comparativa */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 w-40 sticky left-0 bg-slate-50 dark:bg-slate-800">
                  Métrica
                </th>
                {mesesVisiveis.map((m) => {
                  const isRecent = m === meses[meses.length - 1];
                  return (
                    <th key={m} className={`px-4 py-3 text-right text-[11px] font-bold min-w-[130px] ${
                      isRecent ? 'text-core-green' : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="capitalize">
                          {new Date(m + '-02').toLocaleString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '')}
                        </span>
                        {isRecent && (
                          <span className="text-[8px] font-bold tracking-widest text-core-green opacity-70">
                            ATUAL
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {METRICAS.map((metrica) => (
                <tr
                  key={metrica.key}
                  className={`hover:bg-slate-50/50 dark:hover:bg-slate-700/10 transition-colors ${
                    metrica.separator ? 'border-t-2 border-slate-100 dark:border-slate-700' : ''
                  }`}
                >
                  <td className={`px-4 py-2.5 sticky left-0 bg-white dark:bg-slate-800 ${
                    metrica.highlight
                      ? 'text-[12px] font-bold text-slate-700 dark:text-slate-200'
                      : 'text-xs text-slate-500 dark:text-slate-400'
                  }`}>
                    {metrica.label}
                  </td>
                  {mesesVisiveis.map((m, i) => {
                    const kpis    = kpisPorMes[m];
                    const val     = (kpis as any)?.[metrica.key] ?? 0;
                    const antMes  = mesesVisiveis[i - 1];
                    const valAnt  = antMes ? ((kpisPorMes[antMes] as any)?.[metrica.key] ?? 0) : null;
                    const dlt     = valAnt !== null ? delta(val, valAnt) : null;
                    const isMelhor = metrica.key === 'faturamento' && m === melhorFat
                      || metrica.key === 'lucroOp' && m === melhorLucro
                      || metrica.key === 'margem' && m === melhorMargem;

                    return (
                      <td key={m} className={`px-4 py-2.5 text-right ${
                        metrica.highlight ? 'font-bold' : 'font-medium'
                      }`}>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className={`text-[13px] font-mono ${
                            isMelhor
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : metrica.highlight
                                ? val < 0 ? 'text-red-500' : 'text-slate-800 dark:text-slate-100'
                                : 'text-slate-600 dark:text-slate-300'
                          }`}>
                            {metrica.format(val)}
                          </span>
                          {dlt !== null && (
                            <DeltaChip pct={dlt} invert={metrica.invert} />
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-slate-50 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            % na coluna Δ = variação vs mês anterior · destaques em verde = melhor mês histórico
          </p>
        </div>
      </div>

    </div>
  );
}
