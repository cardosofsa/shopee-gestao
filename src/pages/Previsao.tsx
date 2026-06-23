import { useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Minus, Info,
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts';
import { useStore } from '../store';
import { fmt, fmtPct } from '../utils/calculations';
import { C } from '../utils/chartColors';
import { EmptyState } from '../components/ui';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mesLabel(mesAno: string): string {
  const [y, m] = mesAno.split('-');
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${nomes[parseInt(m) - 1]}/${y.slice(2)}`;
}

function addMonths(base: string, n: number): string {
  const [y, m] = base.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function subMonths(base: string, n: number): string {
  return addMonths(base, -n);
}

function currentMes(): string {
  return new Date().toISOString().slice(0, 7);
}

// ─── Linear regression ────────────────────────────────────────────────────────

function linearRegression(ys: number[]): { slope: number; intercept: number; stdDev: number } {
  const n = ys.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0, stdDev: 0 };
  const xs = ys.map((_, i) => i);
  const xMean = xs.reduce((s, x) => s + x, 0) / n;
  const yMean = ys.reduce((s, y) => s + y, 0) / n;
  const num   = xs.reduce((s, x, i) => s + (x - xMean) * (ys[i] - yMean), 0);
  const den   = xs.reduce((s, x)    => s + (x - xMean) ** 2, 0);
  const slope = den !== 0 ? num / den : 0;
  const intercept = yMean - slope * xMean;
  const residuals = ys.map((y, i) => y - (slope * i + intercept));
  const variance  = residuals.reduce((s, r) => s + r * r, 0) / n;
  const stdDev    = Math.sqrt(variance);
  return { slope, intercept, stdDev };
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 px-3 py-2.5 text-xs space-y-1.5 min-w-[180px]">
      <p className="font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700 pb-1.5 mb-1">{label}</p>
      {payload.map((p: any) => p.value != null && (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="text-slate-500 dark:text-slate-400">{p.name}:</span>
          </div>
          <span className="font-medium text-slate-700 dark:text-slate-200 tabular-nums">{fmt(Number(p.value))}</span>
        </div>
      ))}
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KCard({
  label, value, sub, trend,
}: {
  label: string; value: string; sub?: string;
  trend?: 'up' | 'down' | 'flat';
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const tColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-slate-400';
  return (
    <div className="card p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      <div className="flex items-end gap-2">
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
        {trend && <TrendIcon size={16} className={`${tColor} mb-1`} />}
      </div>
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Scenario badge ───────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${color}`}>{label}</span>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const JANELA_OPTS = [6, 12, 18, 24];
const HORIZON_OPTS = [1, 2, 3];

export default function Previsao() {
  const pedidosAll = useStore((s) => s.pedidos);
  const historico  = useStore((s) => s.historico);
  const cfg        = useStore((s) => s.configuracoes);

  const [janela,  setJanela]  = useState(12);
  const [horizon, setHorizon] = useState(3);

  const mes = currentMes();

  // ── Montar série histórica (historico > pedidos para meses fechados) ────────

  const serie = useMemo(() => {
    const histMap: Record<string, number> = {};
    historico.forEach((h) => { histMap[h.mesAno] = h.faturamentoBruto; });

    const pedMap: Record<string, number> = {};
    pedidosAll.forEach((p) => {
      if (p.status !== 'Concluído' && p.status !== 'Enviado') return;
      const m = p.data.slice(0, 7);
      pedMap[m] = (pedMap[m] ?? 0) + p.receita;
    });

    const result: { mes: string; receita: number }[] = [];
    for (let i = janela - 1; i >= 0; i--) {
      const m = subMonths(mes, i);
      const v = histMap[m] ?? pedMap[m] ?? 0;
      result.push({ mes: m, receita: v });
    }
    return result;
  }, [pedidosAll, historico, janela, mes]);

  // ── Regressão linear ─────────────────────────────────────────────────────────

  const { slope, intercept, stdDev } = useMemo(
    () => linearRegression(serie.map((s) => s.receita)),
    [serie],
  );

  const CONFIDENCE = 1.5;

  // ── Projeção ─────────────────────────────────────────────────────────────────

  const projecao = useMemo(() => {
    const futuro = [];
    for (let h = 1; h <= horizon; h++) {
      const x     = serie.length - 1 + h;
      const base  = Math.max(0, slope * x + intercept);
      const otim  = Math.max(0, base + CONFIDENCE * stdDev);
      const pess  = Math.max(0, base - CONFIDENCE * stdDev);
      futuro.push({ mes: addMonths(mes, h), base, otim, pess });
    }
    return futuro;
  }, [serie, slope, intercept, stdDev, horizon, mes]);

  // ── Chart data (historico + forecast) ─────────────────────────────────────

  const chartData = useMemo(() => {
    const hist = serie.map((s, i) => {
      const fitted = Math.max(0, slope * i + intercept);
      return {
        name:    mesLabel(s.mes),
        Realizado: s.receita || undefined,
        Tendência: fitted,
        isForecast: false,
      };
    });
    const fut = projecao.map((p) => ({
      name:     mesLabel(p.mes),
      Base:     p.base,
      Otimista: p.otim,
      Pessimista: p.pess,
      isForecast: true,
    }));
    return [...hist, ...fut];
  }, [serie, projecao, slope, intercept]);

  // ── KPIs ─────────────────────────────────────────────────────────────────────

  const last3  = serie.slice(-3).map((s) => s.receita);
  const prev3  = serie.slice(-6, -3).map((s) => s.receita);
  const avgL3  = last3.length  ? last3.reduce((s, v) => s + v, 0) / last3.length  : 0;
  const avgP3  = prev3.length  ? prev3.reduce((s, v) => s + v, 0) / prev3.length  : 0;
  const growth = avgP3 > 0 ? (avgL3 - avgP3) / avgP3 : 0;

  const proximoMes = projecao[0];

  // Margem histórica média
  const margemMedia = useMemo(() => {
    const meses = historico.slice(-6);
    if (meses.length === 0) return null;
    const avg = meses.reduce((s, h) => s + h.margemPercentual, 0) / meses.length;
    return avg;
  }, [historico]);

  const lucroBase = proximoMes ? proximoMes.base * (margemMedia ?? 0) / 100 : 0;

  // Meta de faturamento
  const meta = cfg.metaFaturamento;
  const mesesAteMeta = useMemo(() => {
    if (!meta || slope <= 0) return null;
    // find x where slope*x + intercept >= meta
    const x = (meta - intercept) / slope;
    const mesesFaltam = Math.ceil(x - (serie.length - 1));
    return mesesFaltam > 0 ? mesesFaltam : 0;
  }, [meta, slope, intercept, serie.length]);

  const trendDir: 'up' | 'down' | 'flat' =
    slope > 500 ? 'up' : slope < -500 ? 'down' : 'flat';

  // ─────────────────────────────────────────────────────────────────────────────

  const hasData = serie.some((s) => s.receita > 0);

  return (
    <div className="flex-1 p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-core-green/10 flex items-center justify-center">
          <TrendingUp size={18} className="text-core-green" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Previsão de Faturamento</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Regressão linear sobre histórico real · projeção com banda de confiança
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Histórico:</span>
          {JANELA_OPTS.map((j) => (
            <button
              key={j}
              onClick={() => setJanela(j)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                janela === j
                  ? 'bg-core-green text-white'
                  : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-core-green/50'
              }`}
            >
              {j}m
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Projeção:</span>
          {HORIZON_OPTS.map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                horizon === h
                  ? 'bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900'
                  : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'
              }`}
            >
              {h}m
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
          <Info size={12} />
          Dados do histórico fechado + pedidos importados
        </div>
      </div>

      {!hasData ? (
        <EmptyState
          icon={<TrendingUp size={20} />}
          title="Dados insuficientes"
          description="Importe pedidos ou feche meses no Financeiro para gerar previsões."
          className="card"
        />
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KCard
              label="Próximo mês (base)"
              value={fmt(proximoMes?.base ?? 0)}
              sub={proximoMes ? mesLabel(proximoMes.mes) : '—'}
              trend={trendDir}
            />
            <KCard
              label="Cenário otimista"
              value={fmt(proximoMes?.otim ?? 0)}
              sub={`+${fmtPct((CONFIDENCE * stdDev) / Math.max(1, proximoMes?.base ?? 1) * 100)} vs base`}
              trend="up"
            />
            <KCard
              label="Cenário pessimista"
              value={fmt(proximoMes?.pess ?? 0)}
              sub={`−${fmtPct((CONFIDENCE * stdDev) / Math.max(1, proximoMes?.base ?? 1) * 100)} vs base`}
              trend="down"
            />
            <KCard
              label="Crescimento trim."
              value={`${growth >= 0 ? '+' : ''}${(growth * 100).toFixed(1)}%`}
              sub="méd. últimos 3 vs anteriores 3"
              trend={growth > 0.02 ? 'up' : growth < -0.02 ? 'down' : 'flat'}
            />
          </div>

          {/* Main chart */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Histórico + Projeção
              </h2>
              <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500">
                <Badge label="Realizado" color="bg-core-green/15 text-core-green" />
                <Badge label="Tendência" color="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400" />
                <Badge label="Projetado" color="bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#18B37A" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#18B37A" stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="gForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#a78bfa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.slate }} />
                <YAxis tick={{ fontSize: 11, fill: C.slate }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />

                {/* Realizado */}
                <Area
                  type="monotone"
                  dataKey="Realizado"
                  stroke={C.primary}
                  fill="url(#gReal)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: C.primary }}
                  connectNulls
                />
                {/* Tendência */}
                <Line
                  type="monotone"
                  dataKey="Tendência"
                  stroke={C.slate}
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                  dot={false}
                />
                {/* Projeção base */}
                <Area
                  type="monotone"
                  dataKey="Base"
                  stroke="#7c3aed"
                  fill="url(#gForecast)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#7c3aed' }}
                />
                {/* Otimista */}
                <Line
                  type="monotone"
                  dataKey="Otimista"
                  stroke={C.secondary}
                  strokeWidth={1}
                  strokeDasharray="4 2"
                  dot={false}
                />
                {/* Pessimista */}
                <Line
                  type="monotone"
                  dataKey="Pessimista"
                  stroke="#f87171"
                  strokeWidth={1}
                  strokeDasharray="4 2"
                  dot={false}
                />

                {/* Meta */}
                {meta && meta > 0 && (
                  <ReferenceLine
                    y={meta}
                    stroke={C.amber}
                    strokeDasharray="6 3"
                    label={{ value: `Meta ${fmt(meta)}`, fill: C.amber, fontSize: 10, position: 'insideTopRight' }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Forecast table + growth insight */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Tabela de previsão */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Detalhe da Projeção</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 dark:text-slate-500 uppercase tracking-wide border-b border-slate-100 dark:border-slate-800">
                      <th className="text-left pb-2 font-medium">Mês</th>
                      <th className="text-right pb-2 font-medium">Pessimista</th>
                      <th className="text-right pb-2 font-medium">Base</th>
                      <th className="text-right pb-2 font-medium">Otimista</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {projecao.map((p) => (
                      <tr key={p.mes}>
                        <td className="py-2.5 font-medium text-slate-700 dark:text-slate-200">{mesLabel(p.mes)}</td>
                        <td className="py-2.5 text-right text-red-500 tabular-nums">{fmt(p.pess)}</td>
                        <td className="py-2.5 text-right font-semibold text-slate-800 dark:text-slate-100 tabular-nums">{fmt(p.base)}</td>
                        <td className="py-2.5 text-right text-green-600 tabular-nums">{fmt(p.otim)}</td>
                      </tr>
                    ))}
                    {margemMedia != null && projecao.length > 0 && (
                      <tr className="border-t-2 border-slate-200 dark:border-slate-700">
                        <td className="py-2.5 text-slate-500 dark:text-slate-400">Lucro est. ({fmtPct(margemMedia)})</td>
                        <td className="py-2.5 text-right text-red-400 tabular-nums">{fmt(projecao[0].pess * margemMedia / 100)}</td>
                        <td className="py-2.5 text-right font-semibold text-slate-600 dark:text-slate-300 tabular-nums">{fmt(lucroBase)}</td>
                        <td className="py-2.5 text-right text-green-500 tabular-nums">{fmt(projecao[0].otim * margemMedia / 100)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Insights */}
            <div className="card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Interpretação</h2>

              <div className={`flex items-start gap-3 p-3 rounded-xl text-sm ${
                trendDir === 'up'   ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
                trendDir === 'down' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
                'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
              }`}>
                {trendDir === 'up'   ? <TrendingUp  size={16} className="text-green-600 mt-0.5 shrink-0" /> :
                 trendDir === 'down' ? <TrendingDown size={16} className="text-red-500 mt-0.5 shrink-0" /> :
                 <Minus size={16} className="text-slate-400 mt-0.5 shrink-0" />}
                <div>
                  <p className={`font-medium ${
                    trendDir === 'up' ? 'text-green-800 dark:text-green-300' :
                    trendDir === 'down' ? 'text-red-700 dark:text-red-300' : 'text-slate-600 dark:text-slate-300'
                  }`}>
                    {trendDir === 'up'   ? 'Tendência de crescimento'  :
                     trendDir === 'down' ? 'Tendência de queda'        : 'Tendência estável'}
                  </p>
                  <p className="text-xs mt-0.5 opacity-80">
                    {slope >= 0
                      ? `+${fmt(slope)} por mês em média`
                      : `${fmt(slope)} por mês em média`}
                  </p>
                </div>
              </div>

              {meta && meta > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Meta de faturamento: {fmt(meta)}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                    {mesesAteMeta === 0
                      ? 'Já atingida no ritmo atual!'
                      : mesesAteMeta != null
                        ? `Projeção: atingir em ~${mesesAteMeta} mês${mesesAteMeta !== 1 ? 'es' : ''} com a tendência atual.`
                        : 'Tendência atual não atinge a meta — reveja estratégia de crescimento.'}
                  </p>
                </div>
              )}

              <div className="space-y-3 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span>Inclinação da tendência</span>
                  <span className={`font-medium tabular-nums ${slope >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {slope >= 0 ? '+' : ''}{fmt(slope)}/mês
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span>Desvio padrão histórico</span>
                  <span className="font-medium tabular-nums">{fmt(stdDev)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Crescimento trimestral</span>
                  <span className={`font-medium ${growth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {growth >= 0 ? '+' : ''}{(growth * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
                Baseado em regressão linear mínimos quadrados. Banda de {CONFIDENCE}σ (~87% de confiança).
                Resultados futuros dependem de fatores externos não modelados.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
