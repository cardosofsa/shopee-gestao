import {
  Award,
  ChevronDown,
  FlaskConical,
  Info,
  Minus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { EmptyState } from '../components/ui';
import { useStore } from '../store';
import { fmt, fmtPct } from '../utils/calculations';
import { C } from '../utils/chartColors';

// ─── Shopee tiers (same as Calculadora) ──────────────────────────────────────

const TIERS = [
  { min: 0, max: 79.99, fixed: 4 },
  { min: 80, max: 99.99, fixed: 16 },
  { min: 100, max: 199.99, fixed: 20 },
  { min: 200, max: Infinity, fixed: 26 },
];

function tierFixed(preco: number) {
  return (TIERS.find((t) => preco >= t.min && preco <= t.max) ?? TIERS[TIERS.length - 1]).fixed;
}

function computeResult(s: ScenarioDef) {
  const ads = s.ads / 100;
  const das = s.das / 100;
  const com = s.comissao / 100;
  const fixo = s.taxaFixa;
  const custo = s.custo + s.embalagem + s.frete;
  const taxa = s.preco * com + fixo;
  const adsV = s.preco * ads;
  const dasV = s.preco * das;
  const lucro = s.preco - custo - taxa - adsV - dasV;
  const margem = s.preco > 0 ? (lucro / s.preco) * 100 : 0;
  const lucroMensal = lucro * s.volumeMes;
  const breakeven = lucro > 0 ? Math.ceil(custo / lucro) : null;
  const roi = custo > 0 ? (lucro / custo) * 100 : 0;
  return { lucro, margem, lucroMensal, breakeven, roi, taxa, adsV, dasV, custo };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScenarioDef {
  label: string;
  custo: number;
  embalagem: number;
  frete: number;
  comissao: number;
  taxaFixa: number;
  ads: number;
  das: number;
  preco: number;
  volumeMes: number;
}

const SCENARIO_COLORS = [C.primary, '#6366f1', C.amber];
const SCENARIO_LABELS = ['Cenário A', 'Cenário B', 'Cenário C'];

function defaultScenario(idx: number): ScenarioDef {
  return {
    label: SCENARIO_LABELS[idx],
    custo: 0,
    embalagem: 0,
    frete: 0,
    comissao: 18,
    taxaFixa: 0,
    ads: 5,
    das: 6,
    preco: 0,
    volumeMes: 30,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NumField({
  label,
  value,
  onChange,
  prefix,
  step = 0.5,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  step?: number;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </label>
        {hint && <span className="text-[10px] text-slate-400 dark:text-slate-500">{hint}</span>}
      </div>
      <div className="relative">
        {prefix && (
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            {prefix}
          </span>
        )}
        <input
          type="number"
          min={0}
          step={step}
          value={value || ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={`w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 pr-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-core-green/50 focus:border-core-green ${prefix ? 'pl-7' : 'pl-2.5'}`}
        />
      </div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  highlight = false,
  negative = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800 last:border-0">
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <span
        className={`text-xs font-semibold tabular-nums ${highlight ? (negative ? 'text-red-500' : 'text-core-green') : 'text-slate-700 dark:text-slate-200'}`}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Tooltip personalizado ────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-lg text-xs">
      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-2">
        {fmt(parseFloat(label))}
      </p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-500 dark:text-slate-400">{p.name}:</span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {p.value.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Simulador() {
  const produtos = useStore((s) => s.produtos);
  const configs = useStore((s) => s.configuracoes);

  const [scenarios, setScenarios] = useState<ScenarioDef[]>([
    defaultScenario(0),
    defaultScenario(1),
    defaultScenario(2),
  ]);
  const [selectedSku, setSelectedSku] = useState('');
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const applyProduto = (sku: string) => {
    setSelectedSku(sku);
    const p = produtos.find((x) => x.sku === sku);
    if (!p) return;
    setScenarios((prev) =>
      prev.map((s) => ({
        ...s,
        custo: p.custoUnitario,
        das: configs?.aliquotaDAS ?? 6,
        ads: configs?.percentualMarketing ?? 5,
      }))
    );
  };

  const updateScenario = (idx: number, patch: Partial<ScenarioDef>) =>
    setScenarios((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

  const results = useMemo(() => scenarios.map(computeResult), [scenarios]);

  // ── Best scenario ─────────────────────────────────────────────────────────

  const bestIdx = useMemo(() => {
    let best = -1,
      bestMargem = -Infinity;
    results.forEach((r, i) => {
      if (r.margem > bestMargem) {
        bestMargem = r.margem;
        best = i;
      }
    });
    return bestMargem > 0 ? best : -1;
  }, [results]);

  // ── Sensitivity chart data ────────────────────────────────────────────────

  const sensData = useMemo(() => {
    const basePrecos = scenarios.map((s) => s.preco).filter((p) => p > 0);
    if (basePrecos.length === 0) return [];
    const minP = Math.max(1, Math.min(...basePrecos) * 0.7);
    const maxP = Math.max(...basePrecos) * 1.5;
    const steps = 40;
    const step = (maxP - minP) / steps;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const preco = minP + i * step;
      const point: Record<string, number> = { preco };
      scenarios.forEach((s) => {
        const ads = s.ads / 100;
        const das = s.das / 100;
        const com = s.comissao / 100;
        const fixo = s.taxaFixa || tierFixed(preco);
        const custo = s.custo + s.embalagem + s.frete;
        const lucro = preco - custo - (preco * com + fixo) - preco * ads - preco * das;
        point[s.label] = preco > 0 ? (lucro / preco) * 100 : 0;
      });
      return point;
    });
  }, [scenarios]);

  const hasAnyPrice = scenarios.some((s) => s.preco > 0);

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
            <FlaskConical size={18} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Simulador de Cenários
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Compare até 3 estratégias de preço lado a lado
            </p>
          </div>
        </div>
        <Link
          to="/calculadora"
          className="text-xs text-core-green hover:underline flex items-center gap-1"
        >
          Calculadora avançada →
        </Link>
      </div>

      {/* Product picker */}
      <div className="card p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Partir de um produto:
          </label>
          <select
            value={selectedSku}
            onChange={(e) => applyProduto(e.target.value)}
            className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-core-green/50"
          >
            <option value="">Selecionar SKU (preenche custo automaticamente)</option>
            {produtos
              .filter((p) => p.ativo !== false)
              .map((p) => (
                <option key={p.sku} value={p.sku}>
                  {p.sku} — {p.nome}
                </option>
              ))}
          </select>
          {selectedSku && (
            <button
              onClick={() => {
                setSelectedSku('');
                setScenarios([0, 1, 2].map(defaultScenario));
              }}
              className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors"
            >
              <RefreshCw size={12} /> Limpar
            </button>
          )}
          <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 ml-auto">
            <Info size={11} />
            Ajuste os preços individualmente em cada cenário
          </div>
        </div>
      </div>

      {/* Scenarios grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scenarios.map((s, idx) => {
          const r = results[idx];
          const isBest = idx === bestIdx;
          const isOpen = openIdx === idx;

          return (
            <div
              key={idx}
              className={`card overflow-hidden transition-all ${isBest ? 'ring-2 ring-core-green shadow-md' : ''}`}
            >
              {/* Scenario header */}
              <div
                className="px-4 py-3 flex items-center justify-between cursor-pointer select-none"
                style={{
                  borderBottom: isOpen ? '1px solid' : 'none',
                  borderColor: 'rgb(241 245 249)',
                }}
                onClick={() => setOpenIdx(isOpen ? null : idx)}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: SCENARIO_COLORS[idx] }}
                  />
                  <input
                    type="text"
                    value={s.label}
                    onChange={(e) => updateScenario(idx, { label: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm font-semibold text-slate-700 dark:text-slate-200 bg-transparent outline-none border-0 w-28"
                  />
                  {isBest && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-core-green bg-core-green/10 px-2 py-0.5 rounded-full">
                      <Award size={9} /> Melhor
                    </span>
                  )}
                </div>
                <ChevronDown
                  size={14}
                  className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </div>

              {/* Inputs (collapsible) */}
              {isOpen && (
                <div className="px-4 py-3 space-y-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                  <div className="grid grid-cols-2 gap-3">
                    <NumField
                      label="Custo produto"
                      value={s.custo}
                      onChange={(v) => updateScenario(idx, { custo: v })}
                      prefix="R$"
                    />
                    <NumField
                      label="Embalagem"
                      value={s.embalagem}
                      onChange={(v) => updateScenario(idx, { embalagem: v })}
                      prefix="R$"
                    />
                    <NumField
                      label="Frete saída"
                      value={s.frete}
                      onChange={(v) => updateScenario(idx, { frete: v })}
                      prefix="R$"
                    />
                    <NumField
                      label="Preço de venda"
                      value={s.preco}
                      onChange={(v) => updateScenario(idx, { preco: v })}
                      prefix="R$"
                      step={1}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <NumField
                      label="Comissão Shopee"
                      value={s.comissao}
                      onChange={(v) => updateScenario(idx, { comissao: v })}
                      hint="%"
                      step={0.1}
                    />
                    <NumField
                      label="Taxa fixa"
                      value={s.taxaFixa}
                      onChange={(v) => updateScenario(idx, { taxaFixa: v })}
                      prefix="R$"
                      step={1}
                      hint="0 = auto"
                    />
                    <NumField
                      label="ADS/Marketing"
                      value={s.ads}
                      onChange={(v) => updateScenario(idx, { ads: v })}
                      hint="%"
                      step={0.5}
                    />
                    <NumField
                      label="DAS/Imposto"
                      value={s.das}
                      onChange={(v) => updateScenario(idx, { das: v })}
                      hint="%"
                      step={0.1}
                    />
                  </div>
                  <NumField
                    label="Volume esperado / mês"
                    value={s.volumeMes}
                    onChange={(v) => updateScenario(idx, { volumeMes: Math.round(v) })}
                    hint="un."
                    step={1}
                  />
                </div>
              )}

              {/* Results */}
              <div className="px-4 py-3 space-y-0.5">
                <MetricRow label="Preço de venda" value={s.preco > 0 ? fmt(s.preco) : '—'} />
                <MetricRow label="Custo total" value={r.custo > 0 ? fmt(r.custo) : '—'} />
                <MetricRow label="Taxa Shopee" value={r.taxa > 0 ? fmt(r.taxa) : '—'} negative />
                <MetricRow label="ADS" value={r.adsV > 0 ? fmt(r.adsV) : '—'} negative />
                <MetricRow label="Imposto" value={r.dasV > 0 ? fmt(r.dasV) : '—'} negative />

                <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-700 space-y-0.5">
                  <MetricRow
                    label="Lucro unitário"
                    value={s.preco > 0 ? fmt(r.lucro) : '—'}
                    highlight
                    negative={r.lucro < 0}
                  />
                  <MetricRow
                    label="Margem"
                    value={s.preco > 0 ? fmtPct(r.margem / 100) : '—'}
                    highlight
                    negative={r.margem < 0}
                  />
                  <MetricRow
                    label="ROI"
                    value={r.custo > 0 ? `${r.roi.toFixed(0)}%` : '—'}
                    highlight={r.roi > 0}
                    negative={r.roi < 0}
                  />
                  <MetricRow
                    label={`Lucro/mês (${s.volumeMes} un.)`}
                    value={s.preco > 0 ? fmt(r.lucroMensal) : '—'}
                    highlight
                    negative={r.lucroMensal < 0}
                  />
                  <MetricRow
                    label="Break-even"
                    value={
                      r.breakeven != null ? `${r.breakeven} un.` : r.lucro <= 0 ? 'Inviável' : '—'
                    }
                    negative={r.breakeven == null && r.lucro <= 0}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison summary bar */}
      {hasAnyPrice && (
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
            Comparativo rápido
          </p>
          <div className="grid grid-cols-3 gap-4">
            {scenarios.map((s, idx) => {
              const r = results[idx];
              const isBest = idx === bestIdx;
              const TrendIcon = r.margem > 15 ? TrendingUp : r.margem > 0 ? Minus : TrendingDown;
              const trendColor =
                r.margem > 15 ? 'text-green-500' : r.margem > 0 ? 'text-amber-500' : 'text-red-500';

              return (
                <div
                  key={idx}
                  className={`text-center py-2 rounded-xl ${isBest ? 'bg-core-green/10' : 'bg-slate-50 dark:bg-slate-800'}`}
                >
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: SCENARIO_COLORS[idx] }}
                    />
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      {s.label}
                    </span>
                  </div>
                  <div
                    className={`text-xl font-bold ${isBest ? 'text-core-green' : 'text-slate-700 dark:text-slate-200'}`}
                  >
                    {s.preco > 0 ? fmtPct(r.margem / 100) : '—'}
                  </div>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <TrendIcon size={11} className={trendColor} />
                    <span className="text-[10px] text-slate-400">
                      {s.preco > 0 ? fmt(r.lucroMensal) + '/mês' : 'sem preço'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sensitivity chart */}
      {hasAnyPrice && sensData.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Sensibilidade de Margem × Preço
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Como a margem evolui conforme o preço muda (mantendo custos fixos)
              </p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={sensData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
              <XAxis
                dataKey="preco"
                tickFormatter={(v) => `R$${Math.round(v)}`}
                tick={{ fontSize: 10, fill: C.slate }}
              />
              <YAxis
                tickFormatter={(v) => `${v.toFixed(0)}%`}
                tick={{ fontSize: 10, fill: C.slate }}
                width={38}
              />
              <ReferenceLine y={0} stroke={C.red} strokeDasharray="4 2" strokeWidth={1} />
              <ReferenceLine
                y={15}
                stroke={C.primary}
                strokeDasharray="4 2"
                strokeWidth={1}
                label={{ value: '15%', position: 'insideLeft', fontSize: 9, fill: C.primary }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              {scenarios.map((s, idx) => (
                <Line
                  key={idx}
                  type="monotone"
                  dataKey={s.label}
                  stroke={SCENARIO_COLORS[idx]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
              {/* Reference dots for selected prices */}
              {scenarios.map((s, idx) =>
                s.preco > 0 ? (
                  <ReferenceLine
                    key={`price-${idx}`}
                    x={
                      sensData.reduce((best, d) =>
                        Math.abs(d.preco - s.preco) < Math.abs(best.preco - s.preco) ? d : best
                      ).preco
                    }
                    stroke={SCENARIO_COLORS[idx]}
                    strokeDasharray="3 3"
                    strokeWidth={1.5}
                    strokeOpacity={0.6}
                  />
                ) : null
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Empty state */}
      {!hasAnyPrice && (
        <EmptyState
          icon={<FlaskConical size={20} />}
          title="Preencha o preço de venda em pelo menos um cenário"
          description="Clique em um cenário para expandir os campos de entrada."
        />
      )}
    </div>
  );
}
