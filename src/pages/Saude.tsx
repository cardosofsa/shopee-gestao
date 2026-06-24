import {
  AlertTriangle,
  ArrowRight,
  BarChart2,
  CheckCircle2,
  HeartPulse,
  Layers,
  Package,
  Percent,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useStore } from '../store';
import {
  fmtPct,
  getKPIsMes,
  getMesAnterior,
  getRankingProdutos,
  getStatusEstoque,
} from '../utils/calculations';
import { C } from '../utils/chartColors';

// ─── Score engine ─────────────────────────────────────────────────────────────

type Dimension = {
  key: string;
  label: string;
  icon: React.ElementType;
  score: number; // 0-100
  maxPts: number;
  weight: number; // fraction summing to 1
  valor: string;
  meta: string;
  status: 'ok' | 'warn' | 'bad';
  melhorias: string[];
};

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function scoreColor(s: number) {
  if (s >= 75) return C.primary;
  if (s >= 50) return C.amber;
  return C.red;
}

function scoreBg(s: number) {
  if (s >= 75) return 'bg-core-green/10 text-core-green border-core-green/20';
  if (s >= 50)
    return 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800';
  return 'bg-red-50 text-red-500 border-red-200 dark:bg-red-950/20 dark:border-red-800';
}

function scoreLabel(s: number) {
  if (s >= 85) return 'Excelente';
  if (s >= 70) return 'Saudável';
  if (s >= 50) return 'Atenção';
  if (s >= 30) return 'Em risco';
  return 'Crítico';
}

function mesLabel(m: string) {
  return new Date(m + '-02')
    .toLocaleString('pt-BR', { month: 'short', year: '2-digit' })
    .replace('.', '');
}

// ─── Gauge arc (SVG) ──────────────────────────────────────────────────────────

function Gauge({ score }: { score: number }) {
  const r = 70;
  const cx = 90;
  const cy = 90;
  const startAngle = -210;
  const totalAngle = 240;
  const angle = startAngle + (score / 100) * totalAngle;

  function polarToXY(deg: number) {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function arc(fromDeg: number, toDeg: number, color: string, width: number) {
    const start = polarToXY(fromDeg);
    const end = polarToXY(toDeg);
    const large = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
    return (
      <path
        d={`M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
      />
    );
  }

  const needle = polarToXY(angle);

  return (
    <svg viewBox="0 0 180 120" className="w-44 h-28">
      {/* Track */}
      {arc(startAngle, startAngle + totalAngle, 'rgba(148,163,184,0.2)', 12)}
      {/* Fill */}
      {arc(startAngle, angle, scoreColor(score), 12)}
      {/* Needle */}
      <line
        x1={cx}
        y1={cy}
        x2={needle.x}
        y2={needle.y}
        stroke={scoreColor(score)}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r={4} fill={scoreColor(score)} />
      {/* Score text */}
      <text
        x={cx}
        y={cy + 24}
        textAnchor="middle"
        fontSize={26}
        fontWeight={700}
        fill={scoreColor(score)}
      >
        {Math.round(score)}
      </text>
      <text x={cx} y={cy + 38} textAnchor="middle" fontSize={9} fill={C.slate}>
        {scoreLabel(score)}
      </text>
    </svg>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Saude() {
  const pedidosAll = useStore((s) => s.pedidos);
  const produtosAll = useStore((s) => s.produtos);
  const historico = useStore((s) => s.historico);

  const mesFull = new Date().toISOString().slice(0, 7);

  // ── Current month KPIs ────────────────────────────────────────────────────

  const kpiAtual = useMemo(() => getKPIsMes(pedidosAll, mesFull), [pedidosAll, mesFull]);
  const kpiAnterior = useMemo(
    () => getKPIsMes(pedidosAll, getMesAnterior(mesFull)),
    [pedidosAll, mesFull]
  );

  // ── Crescimento MoM ───────────────────────────────────────────────────────

  const crescimento =
    kpiAnterior.faturamento > 0
      ? ((kpiAtual.faturamento - kpiAnterior.faturamento) / kpiAnterior.faturamento) * 100
      : 0;

  // ── Return rate ───────────────────────────────────────────────────────────

  const { totalPedidos, devolvidos } = useMemo(() => {
    const last90 = new Date();
    last90.setDate(last90.getDate() - 90);
    const cutoff = last90.toISOString().slice(0, 10);
    const recentes = pedidosAll.filter((p) => p.data >= cutoff);
    return {
      totalPedidos: recentes.filter((p) => p.status !== 'Em processo').length,
      devolvidos: recentes.filter((p) => p.status === 'Devolvido').length,
    };
  }, [pedidosAll]);

  const taxaDev = totalPedidos > 0 ? (devolvidos / totalPedidos) * 100 : 0;

  // ── Inventory health ──────────────────────────────────────────────────────

  const estoqueScore = useMemo(() => {
    const ativos = produtosAll.filter((p) => p.ativo !== false);
    if (ativos.length === 0) return 0;

    const cutoff90 = new Date();
    cutoff90.setDate(cutoff90.getDate() - 90);
    const c90 = cutoff90.toISOString().slice(0, 10);

    const saudaveis = ativos.filter((p) => {
      const vendas90 = pedidosAll
        .filter(
          (x) =>
            x.sku === p.sku && x.data >= c90 && (x.status === 'Concluído' || x.status === 'Enviado')
        )
        .reduce((s, x) => s + x.unidadesEstoque, 0);
      const vendaDia = vendas90 / 90;
      const status = getStatusEstoque(p.estoqueAtual, vendaDia, p.estoqueSeguranca);
      return status === 'Estoque Estável' || status === 'Estoque Acima';
    });

    return (saudaveis.length / ativos.length) * 100;
  }, [produtosAll, pedidosAll]);

  // ── Revenue concentration (HHI-based) ────────────────────────────────────

  const concentracao = useMemo(() => {
    const ranking = getRankingProdutos(
      pedidosAll.filter((p) => {
        const d = new Date();
        d.setDate(d.getDate() - 90);
        return p.data >= d.toISOString().slice(0, 10);
      })
    );
    if (ranking.length === 0) return 100; // no data → worst case
    return ranking[0]?.percentReceita ?? 100; // top product % of revenue
  }, [pedidosAll]);

  // ── Dimensions ────────────────────────────────────────────────────────────

  const dimensions: Dimension[] = useMemo(
    () => [
      {
        key: 'rentabilidade',
        label: 'Rentabilidade',
        icon: Percent,
        weight: 0.25,
        maxPts: 25,
        score: clamp01(kpiAtual.margem / 20) * 100,
        valor: fmtPct(kpiAtual.margem / 100),
        meta: 'Meta: ≥ 20%',
        status: kpiAtual.margem >= 20 ? 'ok' : kpiAtual.margem >= 10 ? 'warn' : 'bad',
        melhorias: [
          'Revise o custo de embalagem e frete — são os mais fáceis de reduzir.',
          'Use o Simulador para testar preços com margem > 20%.',
          'Priorize SKUs curva A com margem abaixo da média.',
        ],
      },
      {
        key: 'crescimento',
        label: 'Crescimento',
        icon: TrendingUp,
        weight: 0.2,
        maxPts: 20,
        score: clamp01((crescimento + 20) / 35) * 100,
        valor: `${crescimento >= 0 ? '+' : ''}${crescimento.toFixed(1)}% MoM`,
        meta: 'Meta: ≥ +15%',
        status: crescimento >= 15 ? 'ok' : crescimento >= 0 ? 'warn' : 'bad',
        melhorias: [
          'Crie campanhas relâmpago em dias de baixo volume (análise Sazonalidade).',
          'Ative ADS nos produtos A que têm margem suficiente.',
          'Considere ampliar o mix de produtos (Curva ABC: SKUs B promissores).',
        ],
      },
      {
        key: 'estoque',
        label: 'Estoque',
        icon: Package,
        weight: 0.2,
        maxPts: 20,
        score: estoqueScore,
        valor: `${estoqueScore.toFixed(0)}% saudável`,
        meta: 'Meta: ≥ 80%',
        status: estoqueScore >= 80 ? 'ok' : estoqueScore >= 50 ? 'warn' : 'bad',
        melhorias: [
          'Acesse Reposição para ver os SKUs com cobertura < 7 dias.',
          'Ajuste o estoque de segurança nos produtos de maior giro.',
          'Revise produtos parados — considere liquidação ou bundle.',
        ],
      },
      {
        key: 'qualidade',
        label: 'Qualidade',
        icon: ShieldCheck,
        weight: 0.2,
        maxPts: 20,
        score: clamp01(1 - taxaDev / 15) * 100,
        valor: `${taxaDev.toFixed(1)}% devoluções`,
        meta: 'Meta: ≤ 2%',
        status: taxaDev <= 2 ? 'ok' : taxaDev <= 8 ? 'warn' : 'bad',
        melhorias: [
          'Analise os motivos de devolução por SKU em Devoluções.',
          'Melhore as fotos e descrição dos produtos com maior taxa.',
          'Revise embalagem de produtos frágeis ou de tamanho variável.',
        ],
      },
      {
        key: 'diversificacao',
        label: 'Diversificação',
        icon: Layers,
        weight: 0.15,
        maxPts: 15,
        score: clamp01(1 - (concentracao - 20) / 50) * 100,
        valor: `Top SKU: ${concentracao.toFixed(0)}% receita`,
        meta: 'Meta: top SKU ≤ 30%',
        status: concentracao <= 30 ? 'ok' : concentracao <= 60 ? 'warn' : 'bad',
        melhorias: [
          'Invista em desenvolver 2-3 novos SKUs nos próximos meses.',
          'Expanda o catálogo para reduzir dependência de um único produto.',
          'Analise os produtos B na Curva ABC — podem virar produtos A.',
        ],
      },
    ],
    [kpiAtual, crescimento, estoqueScore, taxaDev, concentracao]
  );

  // ── Total score ───────────────────────────────────────────────────────────

  const totalScore = useMemo(
    () => dimensions.reduce((s, d) => s + d.score * d.weight, 0),
    [dimensions]
  );

  // ── Radar data ────────────────────────────────────────────────────────────

  const radarData = dimensions.map((d) => ({ label: d.label, score: Math.round(d.score) }));

  // ── Historical scores (from historico) ────────────────────────────────────

  const historyData = useMemo(() => {
    const sorted = [...historico].sort((a, b) => a.mesAno.localeCompare(b.mesAno)).slice(-6);
    return sorted.map((h) => {
      const rentScore = clamp01(h.margemPercentual / 20) * 100;
      const devScore = 80; // no return data in historico — assume neutral
      const histScore = rentScore * 0.25 + devScore * 0.2 + 75 * 0.2 + 70 * 0.2 + 70 * 0.15;
      return { mes: mesLabel(h.mesAno), score: Math.round(histScore) };
    });
  }, [historico]);

  // ── Weakest dimensions (for improvement list) ─────────────────────────────

  const sorted = [...dimensions].sort((a, b) => a.score - b.score);
  const weak = sorted.slice(0, 2);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-core-green/10 flex items-center justify-center">
          <HeartPulse size={18} className="text-core-green" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Saúde do Negócio
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Score composto de 5 dimensões — atualizado em tempo real
          </p>
        </div>
      </div>

      {/* Score + Radar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gauge card */}
        <div className="card p-6 flex flex-col items-center justify-center gap-2">
          <Gauge score={totalScore} />
          <div
            className={`text-sm font-semibold px-3 py-1 rounded-full border ${scoreBg(totalScore)}`}
          >
            {scoreLabel(totalScore)}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center max-w-xs mt-1">
            Score baseado em rentabilidade, crescimento, estoque, qualidade e diversificação
          </p>
        </div>

        {/* Radar */}
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
            Radar por dimensão
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={80}>
              <PolarGrid stroke="rgba(148,163,184,0.2)" />
              <PolarAngleAxis dataKey="label" tick={{ fontSize: 10, fill: C.slate }} />
              <Radar
                dataKey="score"
                stroke={C.primary}
                fill={C.primary}
                fillOpacity={0.2}
                strokeWidth={2}
                dot={{ r: 3, fill: C.primary }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dimension cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {dimensions.map((d) => {
          const Icon = d.icon;
          const statusIcon =
            d.status === 'ok' ? (
              <CheckCircle2 size={13} className="text-green-500" />
            ) : d.status === 'warn' ? (
              <AlertTriangle size={13} className="text-amber-500" />
            ) : (
              <AlertTriangle size={13} className="text-red-500" />
            );

          return (
            <div
              key={d.key}
              className={`card p-4 border ${
                d.status === 'ok'
                  ? 'border-green-100 dark:border-green-900/30'
                  : d.status === 'warn'
                    ? 'border-amber-100 dark:border-amber-900/30'
                    : 'border-red-100 dark:border-red-900/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Icon size={13} className="text-slate-400" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {d.label}
                  </span>
                </div>
                {statusIcon}
              </div>

              {/* Score bar */}
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${d.score}%`, background: scoreColor(d.score) }}
                />
              </div>

              <p className="text-base font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                {Math.round(d.score)}
                <span className="text-xs font-normal text-slate-400 ml-0.5">/100</span>
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{d.valor}</p>
              <p className="text-[10px] text-slate-300 dark:text-slate-600">{d.meta}</p>
            </div>
          );
        })}
      </div>

      {/* Two columns: improvements + history */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Priority improvements */}
        <div className="card p-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-500" />
            Prioridades de melhoria
          </p>
          <div className="space-y-4">
            {weak.map((d) => (
              <div key={d.key}>
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: scoreColor(d.score) }}
                  />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {d.label}
                  </span>
                  <span className="text-[10px] text-slate-400">({Math.round(d.score)}/100)</span>
                </div>
                <ul className="space-y-1.5 pl-4">
                  {d.melhorias.map((m, i) => (
                    <li
                      key={i}
                      className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2"
                    >
                      <span className="text-slate-300 dark:text-slate-600 mt-0.5">→</span>
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Historical trend */}
        <div className="card p-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
            Tendência histórica
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
            Score estimado dos últimos meses
          </p>
          {historyData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={historyData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: C.slate }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: C.slate }} width={28} />
                <Tooltip
                  contentStyle={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '11px',
                  }}
                  formatter={(v: unknown) => [`${v}/100`, 'Score']}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke={C.primary}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: C.primary }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-center">
              <BarChart2 size={28} className="text-slate-200 dark:text-slate-700" />
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Feche pelo menos 2 meses no Histórico Mensal para ver a tendência
              </p>
              <Link
                to="/financeiro"
                className="text-xs text-core-green hover:underline flex items-center gap-1 mt-1"
              >
                Abrir Histórico Mensal <ArrowRight size={11} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="card p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
          Páginas relacionadas
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { to: '/analise', label: 'Análise Financeira' },
            { to: '/abc', label: 'Curva ABC' },
            { to: '/devolucoes', label: 'Devoluções' },
            { to: '/reposicao', label: 'Reposição' },
            { to: '/simulador', label: 'Simulador de Preços' },
            { to: '/previsao', label: 'Previsão de Vendas' },
          ].map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:border-core-green/50 hover:text-core-green transition-colors"
            >
              {label}
              <ArrowRight size={11} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
