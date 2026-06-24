import {
  ChevronLeft,
  ChevronRight,
  Info,
  Megaphone,
  Minus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useStore } from '../../../store';
import { fmt } from '../../../utils/calculations';
import {
  type AcosAnalise,
  type AcosRating,
  computeAcosAnalise,
  computeProjecao,
} from '../utils/acosAnalysis';

// ── Helpers ───────────────────────────────────────────────────────────────────

function mesLabelLongo(mesAno: string) {
  return new Date(mesAno + '-02').toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
}

const RATING_META: Record<AcosRating, { label: string; bg: string; text: string; dot: string }> = {
  excelente: {
    label: 'Excelente',
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  bom: { label: 'Bom', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  atencao: { label: 'Atenção', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  critico: { label: 'Crítico', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
};

const RATING_VALUE_COLOR: Record<AcosRating, string> = {
  excelente: 'text-emerald-600',
  bom: 'text-blue-600',
  atencao: 'text-amber-600',
  critico: 'text-red-600',
};

function DeltaBadge({ delta, suffix = 'pp' }: { delta: number; suffix?: string }) {
  if (Math.abs(delta) < 0.1) return <Minus className="w-3.5 h-3.5 text-slate-400" />;
  const up = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-red-600' : 'text-emerald-600'}`}
    >
      {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
      {up ? '+' : ''}
      {delta.toFixed(1)}
      {suffix}
    </span>
  );
}

// ── Tooltip do gráfico ────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  value: number;
  dataKey: string;
}

function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">{label}</p>
      {d && (
        <p className="text-slate-600 dark:text-slate-400">
          ACOS:{' '}
          <span className="font-bold text-slate-900 dark:text-white">{d.value.toFixed(1)}%</span>
        </p>
      )}
    </div>
  );
}

// ── Cartão de métrica simples ─────────────────────────────────────────────────

function MetricCard({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 ${className}`}
    >
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
        {title}
      </p>
      {children}
    </div>
  );
}

// ── Simulador ────────────────────────────────────────────────────────────────

function Simulador({ analise }: { analise: AcosAnalise }) {
  const [delta, setDelta] = useState(15);
  const proj = useMemo(() => computeProjecao(analise, delta), [analise, delta]);

  const temDados = analise.receitaTotal > 0;

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">
        Simulador de Projeção
      </p>

      {!temDados ? (
        <p className="text-sm text-slate-400">Sem receita no mês para simular.</p>
      ) : (
        <>
          <div className="flex items-center gap-4 mb-5">
            <span className="text-sm text-slate-600 dark:text-slate-300 shrink-0">
              Aumentar investimento em
            </span>
            <input
              type="range"
              min={5}
              max={50}
              step={5}
              value={delta}
              onChange={(e) => setDelta(Number(e.target.value))}
              className="flex-1 accent-core-green"
            />
            <span className="text-base font-bold text-slate-800 dark:text-slate-100 w-12 text-right shrink-0">
              +{delta}%
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Receita projetada</p>
              <p className="text-base font-bold text-slate-800 dark:text-slate-100">
                {fmt(proj.novaReceita)}
              </p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ganho de receita</p>
              <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                +{fmt(proj.deltaReceita)}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Novo gasto em ads</p>
              <p className="text-base font-bold text-slate-800 dark:text-slate-100">
                {fmt(proj.novoAds)}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">ACOS permanece</p>
              <p className="text-base font-bold text-slate-800 dark:text-slate-100">
                {analise.acosAtual.toFixed(1)}%
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
            Modelo: ROAS constante — assume que receita e ads crescem na mesma proporção. Não
            considera sazonalidade ou saturação de mercado.
          </p>
        </>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export function AdsContent({ embedded = false }: { embedded?: boolean }) {
  const pedidos = useStore((s) => s.pedidos);
  const historico = useStore((s) => s.historico);
  const configuracoes = useStore((s) => s.configuracoes);

  const hoje = new Date();
  const mesHoje = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

  const mesesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    set.add(mesHoje);
    historico.forEach((h) => set.add(h.mesAno));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [historico, mesHoje]);

  const [mes, setMes] = useState(mesesDisponiveis[0] ?? mesHoje);

  const idxMes = mesesDisponiveis.indexOf(mes);

  const analise = useMemo(
    () =>
      computeAcosAnalise({
        pedidos,
        historico,
        configuracoes,
        mes,
      }),
    [pedidos, historico, configuracoes, mes]
  );

  const ratingMeta = RATING_META[analise.rating];
  const temDados = analise.receitaTotal > 0;

  // Dados do gráfico: série histórica + linha de referências
  const chartData = analise.serie12m.map((m) => ({ ...m }));

  return (
    <div className={embedded ? 'max-w-5xl mx-auto space-y-6' : 'p-6 max-w-5xl mx-auto space-y-6'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-slate-500" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            ACOS Intelligence
          </h1>
          {analise.isMesAtivo && (
            <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
              ao vivo
            </span>
          )}
        </div>

        {/* Seletor de mês */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMes(mesesDisponiveis[idxMes + 1] ?? mes)}
            disabled={idxMes >= mesesDisponiveis.length - 1}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 capitalize px-2 min-w-40 text-center">
            {mesLabelLongo(mes)}
          </span>
          <button
            onClick={() => setMes(mesesDisponiveis[idxMes - 1] ?? mes)}
            disabled={idxMes <= 0}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Aviso dados estimados */}
      <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Investimento em ads estimado com base no percentual configurado (
          {configuracoes.percentualMarketing.toFixed(1)}% da receita). Para análise mais precisa,
          edite o histórico com os valores reais de cada mês em{' '}
          <strong>Financeiro → Fechar mês</strong>.
        </span>
      </div>

      {/* Hero: ACOS do mês */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-6">
          {/* Valor principal */}
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              ACOS / TACOS
            </p>
            {!temDados ? (
              <p className="text-slate-400 text-sm">Sem dados para {mesLabelLongo(mes)}.</p>
            ) : (
              <>
                <div className="flex items-baseline gap-3 mb-3">
                  <span className={`text-5xl font-black ${RATING_VALUE_COLOR[analise.rating]}`}>
                    {analise.acosAtual.toFixed(1)}%
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${ratingMeta.bg} ${ratingMeta.text}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${ratingMeta.dot}`} />
                    {ratingMeta.label}
                  </span>
                </div>

                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">
                      Referência saudável
                    </p>
                    <p className="font-semibold text-slate-700 dark:text-slate-200">≤ 10%</p>
                  </div>
                  {analise.hasHistorico && (
                    <div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">
                        Sua média histórica
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {analise.benchmarkInterno.toFixed(1)}%
                        </span>
                        <DeltaBadge delta={analise.deltaVsBenchmark} />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Mini sparkline */}
          {chartData.length > 1 && (
            <div className="w-full sm:w-48 h-20 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="acosGradMini" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="acos"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#acosGradMini)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <p className="text-xs text-slate-400 text-center mt-1">
                últimos {chartData.length} meses
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 3 cartões de detalhe */}
      {temDados && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Quanto custa vender */}
          <MetricCard title="Quanto custa vender">
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-1">
              {fmt(analise.adsTotal)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              investido em ads no mês
            </p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Por pedido</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {analise.pedidosQtd > 0 ? fmt(analise.custoPorPedido) : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Por R$100 vendidos</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  R${analise.custoPorCem.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Receita gerada</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {fmt(analise.receitaTotal)}
                </span>
              </div>
            </div>
          </MetricCard>

          {/* Quanto poderia investir */}
          <MetricCard title="Quanto poderia investir">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Com ACOS ≤ 10% (referência saudável)
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Máximo saudável</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {fmt(analise.investimentoMaximo)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Atual estimado</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {fmt(analise.adsTotal)}
                </span>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-700 pt-2 flex justify-between">
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  Saldo disponível
                </span>
                <span
                  className={`font-bold ${analise.saldoDisponivel >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                >
                  {analise.saldoDisponivel >= 0 ? '+' : ''}
                  {fmt(analise.saldoDisponivel)}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
              {analise.saldoDisponivel >= 0
                ? 'Há espaço para aumentar o investimento sem ultrapassar a referência.'
                : 'Investimento atual acima da referência saudável.'}
            </p>
          </MetricCard>

          {/* Ganhou / Perdeu vs benchmark */}
          <MetricCard
            title={
              analise.hasHistorico ? 'Ganhou / Perdeu vs. histórico' : 'Histórico insuficiente'
            }
          >
            {!analise.hasHistorico ? (
              <p className="text-sm text-slate-400">
                É necessário pelo menos 2 meses fechados para calcular o benchmark interno.
              </p>
            ) : (
              <>
                <div className="flex items-baseline gap-2 mb-3">
                  <span
                    className={`text-2xl font-black ${analise.custoExtraVsBenchmark > 0 ? 'text-red-600' : 'text-emerald-600'}`}
                  >
                    {analise.custoExtraVsBenchmark > 0 ? '+' : ''}
                    {fmt(analise.custoExtraVsBenchmark)}
                  </span>
                  <span className="text-xs text-slate-400">
                    {analise.custoExtraVsBenchmark > 0 ? 'gasto a mais' : 'economizou'}
                  </span>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">ACOS atual</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {analise.acosAtual.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Média histórica</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {analise.benchmarkInterno.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Diferença</span>
                    <DeltaBadge delta={analise.deltaVsBenchmark} />
                  </div>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                  Comparado à sua própria média dos últimos meses fechados.
                </p>
              </>
            )}
          </MetricCard>
        </div>
      )}

      {/* Gráfico 12 meses */}
      {chartData.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">
            Evolução ACOS — últimos {chartData.length} meses fechados
          </p>

          {chartData.length < 2 ? (
            <p className="text-sm text-slate-400 py-6 text-center">
              Feche pelo menos 2 meses para visualizar a evolução.
            </p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="acosGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                    domain={[0, 'auto']}
                  />
                  <Tooltip content={<ChartTip />} />
                  {/* Linhas de referência */}
                  <ReferenceLine
                    y={8}
                    stroke="#10b981"
                    strokeDasharray="4 3"
                    strokeWidth={1}
                    label={{
                      value: '8% excelente',
                      position: 'insideTopRight',
                      fontSize: 10,
                      fill: '#10b981',
                    }}
                  />
                  <ReferenceLine
                    y={10}
                    stroke="#f59e0b"
                    strokeDasharray="4 3"
                    strokeWidth={1}
                    label={{
                      value: '10% referência',
                      position: 'insideTopRight',
                      fontSize: 10,
                      fill: '#f59e0b',
                    }}
                  />
                  <ReferenceLine
                    y={12}
                    stroke="#ef4444"
                    strokeDasharray="4 3"
                    strokeWidth={1}
                    label={{
                      value: '12% crítico',
                      position: 'insideTopRight',
                      fontSize: 10,
                      fill: '#ef4444',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="acos"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#acosGrad)"
                    dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>

              {/* Legenda */}
              <div className="flex flex-wrap gap-4 mt-3 justify-center text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-emerald-500 inline-block" />
                  ≤8% Excelente
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-amber-400 inline-block" />
                  ≤10% Bom
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-red-400 inline-block" />
                  &gt;12% Crítico
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Simulador */}
      <Simulador analise={analise} />
    </div>
  );
}

export default function Ads() {
  return <AdsContent />;
}
