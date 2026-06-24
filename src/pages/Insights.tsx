import {
  AlertCircle,
  AlertTriangle,
  BarChart2,
  CheckCircle,
  Lightbulb,
  Megaphone,
  Package,
  RefreshCw,
  ShoppingBag,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useHeavyCalc } from '../hooks/useHeavyCalc';
import { useStore } from '../store';
import type { Insight, InsightCategoria, InsightTipo } from '../utils/insights';

const TIPO_META: Record<
  InsightTipo,
  {
    label: string;
    icon: React.ReactNode;
    border: string;
    badge: string;
    text: string;
  }
> = {
  critico: {
    label: 'Crítico',
    icon: <AlertCircle className="w-5 h-5 text-red-500" />,
    border: 'border-l-red-400',
    badge: 'bg-red-100 text-red-700',
    text: 'text-red-700',
  },
  atencao: {
    label: 'Atenção',
    icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    border: 'border-l-amber-400',
    badge: 'bg-amber-100 text-amber-700',
    text: 'text-amber-700',
  },
  positivo: {
    label: 'Positivo',
    icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    border: 'border-l-emerald-400',
    badge: 'bg-emerald-100 text-emerald-700',
    text: 'text-emerald-700',
  },
};

const CAT_ICON: Record<InsightCategoria, React.ReactNode> = {
  receita: <TrendingUp className="w-3.5 h-3.5" />,
  margem: <BarChart2 className="w-3.5 h-3.5" />,
  estoque: <Package className="w-3.5 h-3.5" />,
  ads: <Megaphone className="w-3.5 h-3.5" />,
  produtos: <ShoppingBag className="w-3.5 h-3.5" />,
  metas: <Target className="w-3.5 h-3.5" />,
  giro: <RefreshCw className="w-3.5 h-3.5" />,
};

const CAT_LABEL: Record<InsightCategoria, string> = {
  receita: 'Receita',
  margem: 'Margem',
  estoque: 'Estoque',
  ads: 'Ads',
  produtos: 'Produtos',
  metas: 'Metas',
  giro: 'Giro',
};

const TIPO_ORDER: InsightTipo[] = ['critico', 'atencao', 'positivo'];

function InsightCard({ insight }: { insight: Insight }) {
  const m = TIPO_META[insight.tipo];
  return (
    <div
      className={`flex gap-4 p-4 rounded-xl border-l-4 ${m.border} bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700`}
    >
      <div className="flex-shrink-0 mt-0.5">{m.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${m.badge}`}
          >
            {CAT_ICON[insight.categoria]}
            {CAT_LABEL[insight.categoria]}
          </span>
          {insight.valor && <span className={`text-sm font-bold ${m.text}`}>{insight.valor}</span>}
        </div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-0.5">
          {insight.titulo}
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {insight.descricao}
        </p>
        {insight.diagnostico && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-700 pt-2">
            <span className="font-semibold text-slate-600 dark:text-slate-300">Por quê: </span>
            {insight.diagnostico}
          </p>
        )}
      </div>
    </div>
  );
}

function Section({ tipo, insights }: { tipo: InsightTipo; insights: Insight[] }) {
  if (insights.length === 0) return null;
  const m = TIPO_META[tipo];
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        {m.icon}
        <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">{m.label}</h2>
        <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-full px-2 py-0.5">
          {insights.length}
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {insights.map((i) => (
          <InsightCard key={i.id} insight={i} />
        ))}
      </div>
    </section>
  );
}

export default function Insights() {
  const pedidos = useStore((s) => s.pedidos);
  const historico = useStore((s) => s.historico);
  const produtos = useStore((s) => s.produtos);
  const configuracoes = useStore((s) => s.configuracoes);
  const [mesAtual] = useState(() => new Date().toISOString().slice(0, 7));
  const [insights, setInsights] = useState<Insight[]>([]);
  const { computeInsights } = useHeavyCalc();

  useEffect(() => {
    let cancelled = false;
    computeInsights({ pedidos, historico, produtos, configuracoes, mesAtual })
      .then((result) => {
        if (!cancelled) setInsights(result);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pedidos, historico, produtos, configuracoes, mesAtual, computeInsights]);

  const byTipo = useMemo(() => {
    const map: Record<InsightTipo, Insight[]> = { critico: [], atencao: [], positivo: [] };
    for (const ins of insights) map[ins.tipo].push(ins);
    return map;
  }, [insights]);

  const criticos = byTipo.critico.length;
  const atencoes = byTipo.atencao.length;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Lightbulb className="w-5 h-5 text-slate-500" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Insights Automáticos
          </h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {insights.length === 0
            ? 'Nenhum insight detectado com os dados atuais.'
            : `${insights.length} insight${insights.length > 1 ? 's' : ''} detectado${insights.length > 1 ? 's' : ''}${criticos > 0 ? ` — ${criticos} crítico${criticos > 1 ? 's' : ''}` : ''}${atencoes > 0 ? `, ${atencoes} atenção` : ''}.`}
        </p>
      </div>

      {insights.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-300" />
          <p className="font-medium text-slate-600 dark:text-slate-300">Tudo em ordem!</p>
          <p className="text-sm text-slate-400 mt-1">
            Nenhum desvio ou oportunidade identificada com os dados atuais.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {TIPO_ORDER.map((tipo) => (
            <Section key={tipo} tipo={tipo} insights={byTipo[tipo]} />
          ))}
        </div>
      )}
    </div>
  );
}
