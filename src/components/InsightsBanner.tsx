import { AlertCircle, AlertTriangle, CheckCircle, ChevronRight, Lightbulb } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { Insight } from '../utils/insights';

interface InsightsBannerProps {
  insights: Insight[];
}

const TIPO_ICON = {
  critico: <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />,
  atencao: <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />,
  positivo: <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />,
};

const TIPO_BG = {
  critico: 'bg-red-50 border-red-200',
  atencao: 'bg-amber-50 border-amber-200',
  positivo: 'bg-emerald-50 border-emerald-200',
};

const TIPO_VALOR = {
  critico: 'text-red-700',
  atencao: 'text-amber-700',
  positivo: 'text-emerald-700',
};

export default function InsightsBanner({ insights }: InsightsBannerProps) {
  if (insights.length === 0) return null;

  const top3 = insights.slice(0, 3);
  const restante = insights.length - top3.length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
      {/* Label */}
      <div className="flex items-center gap-1.5 text-slate-500 flex-shrink-0">
        <Lightbulb className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">Insights</span>
      </div>

      {/* Chips */}
      <div className="flex flex-wrap gap-2 flex-1 min-w-0">
        {top3.map((ins) => (
          <span
            key={ins.id}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${TIPO_BG[ins.tipo]}`}
          >
            {TIPO_ICON[ins.tipo]}
            <span className="truncate max-w-[160px]">{ins.titulo}</span>
            {ins.valor && (
              <span className={`font-bold ml-0.5 ${TIPO_VALOR[ins.tipo]}`}>{ins.valor}</span>
            )}
          </span>
        ))}
        {restante > 0 && (
          <span className="inline-flex items-center text-xs text-slate-400 font-medium">
            +{restante} mais
          </span>
        )}
      </div>

      {/* Link */}
      <Link
        to="/insights"
        className="flex items-center gap-0.5 text-xs font-semibold text-blue-600 hover:text-blue-800 flex-shrink-0 whitespace-nowrap"
      >
        Ver todos
        <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
