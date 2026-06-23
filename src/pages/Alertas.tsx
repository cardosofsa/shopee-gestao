import { useMemo, useState } from 'react';
// useMemo used in catsPresentes + alertasFiltrados
import {
  AlertTriangle, AlertCircle, Info, CheckCircle2,
  Package, CreditCard, Target,
  ShoppingBag, ArrowRight, Shield, Bell, Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../store';
import { useAlertas, type AlertaItem, type Severidade, type Categoria } from '../hooks/useAlertas';
import { C } from '../utils/chartColors';

// ─── Config visual ────────────────────────────────────────────────────────────

const SEV_CFG = {
  critico: {
    Icon:       AlertCircle,
    label:      'Crítico',
    accentFrom: C.red,
    accentTo:   '#dc2626',
    cardBg:     'bg-gradient-to-r from-red-50/70 to-transparent dark:from-red-950/25 dark:to-transparent',
    cardBorder: 'border-red-100 dark:border-red-900/30',
    iconBg:     'bg-red-100 dark:bg-red-900/40',
    iconColor:  'text-red-600 dark:text-red-400',
    badge:      'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    valueBg:    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    actionCls:  'text-red-600 dark:text-red-400 hover:text-red-700',
    sectionCls: 'text-red-600 dark:text-red-400',
    dotCls:     'bg-red-500',
    statBorder: 'border-t-red-500',
    statText:   'text-red-600 dark:text-red-400',
    statBg:     'bg-red-50 dark:bg-red-950/20',
  },
  aviso: {
    Icon:       AlertTriangle,
    label:      'Aviso',
    accentFrom: C.amber,
    accentTo:   '#d97706',
    cardBg:     'bg-gradient-to-r from-amber-50/70 to-transparent dark:from-amber-950/25 dark:to-transparent',
    cardBorder: 'border-amber-100 dark:border-amber-900/30',
    iconBg:     'bg-amber-100 dark:bg-amber-900/40',
    iconColor:  'text-amber-600 dark:text-amber-400',
    badge:      'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    valueBg:    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    actionCls:  'text-amber-600 dark:text-amber-400 hover:text-amber-700',
    sectionCls: 'text-amber-600 dark:text-amber-400',
    dotCls:     'bg-amber-400',
    statBorder: 'border-t-amber-400',
    statText:   'text-amber-600 dark:text-amber-400',
    statBg:     'bg-amber-50 dark:bg-amber-950/20',
  },
  info: {
    Icon:       Info,
    label:      'Informação',
    accentFrom: '#60a5fa',
    accentTo:   C.blue,
    cardBg:     'bg-gradient-to-r from-blue-50/70 to-transparent dark:from-blue-950/25 dark:to-transparent',
    cardBorder: 'border-blue-100 dark:border-blue-900/30',
    iconBg:     'bg-blue-100 dark:bg-blue-900/40',
    iconColor:  'text-blue-600 dark:text-blue-400',
    badge:      'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    valueBg:    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    actionCls:  'text-blue-600 dark:text-blue-400 hover:text-blue-700',
    sectionCls: 'text-blue-600 dark:text-blue-400',
    dotCls:     'bg-blue-400',
    statBorder: 'border-t-blue-400',
    statText:   'text-blue-600 dark:text-blue-400',
    statBg:     'bg-blue-50 dark:bg-blue-950/20',
  },
} satisfies Record<Severidade, object>;

const CAT_CFG: Record<Categoria, { label: string; Icon: typeof Package }> = {
  estoque:    { label: 'Estoque',     Icon: Package },
  produtos:   { label: 'Produtos',    Icon: ShoppingBag },
  fiscal:     { label: 'Fiscal',      Icon: CreditCard },
  desempenho: { label: 'Desempenho',  Icon: Target },
  financeiro: { label: 'Financeiro',  Icon: Wallet },
};


// ─── AlertCard — premium ──────────────────────────────────────────────────────

function AlertCard({ alerta }: { alerta: AlertaItem }) {
  const sev = SEV_CFG[alerta.severidade];
  const cat = CAT_CFG[alerta.categoria];
  const SevIcon = sev.Icon;
  const CatIcon = cat.Icon;

  const inner = (
    <div className={`
      group relative overflow-hidden rounded-2xl border transition-all duration-200
      hover:shadow-lg hover:-translate-y-[1px] cursor-default
      ${alerta.link ? 'cursor-pointer' : ''}
      ${sev.cardBg} ${sev.cardBorder}
    `}>
      {/* Accent bar — gradient left */}
      <div
        className="absolute left-0 inset-y-0 w-[3px] rounded-l-2xl"
        style={{ background: `linear-gradient(180deg, ${sev.accentFrom}, ${sev.accentTo})` }}
      />

      <div className="pl-5 pr-4 py-4 flex items-start gap-3.5">
        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${sev.iconBg}`}>
          <SevIcon size={18} className={sev.iconColor} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {/* Pulsing dot para críticos */}
            {alerta.severidade === 'critico' && (
              <span className="relative flex-shrink-0 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-70" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
            )}
            <p className="font-semibold text-[13px] leading-snug text-slate-800 dark:text-slate-100 truncate">
              {alerta.titulo}
            </p>
          </div>
          <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            {alerta.descricao}
          </p>

          {/* Tags row */}
          <div className="flex items-center gap-1.5 mt-2.5">
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${sev.badge}`}>
              <SevIcon size={9} />
              {sev.label}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400">
              <CatIcon size={9} />
              {cat.label}
            </span>
            {alerta.link && (
              <span className={`
                inline-flex items-center gap-1 text-[10px] font-semibold
                opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0
                transition-all duration-200 ml-auto ${sev.actionCls}
              `}>
                Investigar <ArrowRight size={10} />
              </span>
            )}
          </div>
        </div>

        {/* Valor badge */}
        {alerta.valor && (
          <div className="flex-shrink-0 self-start mt-0.5">
            <span className={`inline-block text-[11px] font-bold font-mono px-2.5 py-1 rounded-lg ${sev.valueBg}`}>
              {alerta.valor}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return alerta.link
    ? <Link to={alerta.link} className="block">{inner}</Link>
    : inner;
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

function SectionHeader({ sev, count }: { sev: Severidade; count: number }) {
  const cfg = SEV_CFG[sev];
  const Icon = cfg.Icon;
  return (
    <div className="flex items-center gap-2.5 px-1">
      <span className={`relative flex h-2 w-2 ${sev === 'critico' ? '' : 'hidden'}`}>
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
      </span>
      {sev !== 'critico' && <span className={`h-2 w-2 rounded-full ${cfg.dotCls}`} />}
      <Icon size={13} className={cfg.sectionCls} />
      <h2 className={`text-[11px] font-bold uppercase tracking-widest ${cfg.sectionCls}`}>
        {cfg.label}{count > 1 ? 's' : ''}
      </h2>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
        {count}
      </span>
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  count, label, sub, sev, empty,
}: {
  count: number; label: string; sub: string;
  sev: Severidade; empty?: boolean;
}) {
  const cfg = SEV_CFG[sev];
  const Icon = cfg.Icon;
  return (
    <div className={`card border-t-[3px] p-4 ${cfg.statBorder} ${empty ? '' : cfg.statBg}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={`text-2xl font-bold leading-none ${empty ? 'text-slate-300 dark:text-slate-600' : cfg.statText}`}>
            {count}
          </p>
          <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mt-1.5">{label}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>
        </div>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${empty ? 'bg-slate-100 dark:bg-slate-700/40' : cfg.iconBg}`}>
          <Icon size={15} className={empty ? 'text-slate-300 dark:text-slate-600' : cfg.iconColor} />
        </div>
      </div>
    </div>
  );
}

// ─── Filtro de categoria ──────────────────────────────────────────────────────

const CAT_ORDER: Categoria[] = ['estoque', 'produtos', 'fiscal', 'desempenho', 'financeiro'];

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Alertas() {
  const produtosAll = useStore((s) => s.produtos);
  const alertas     = useAlertas();

  const criticos = alertas.filter((a) => a.severidade === 'critico');
  const avisos   = alertas.filter((a) => a.severidade === 'aviso');

  const [catFiltro, setCatFiltro] = useState<Categoria | null>(null);

  const catsPresentes = useMemo(
    () => CAT_ORDER.filter((c) => alertas.some((a) => a.categoria === c)),
    [alertas],
  );

  const alertasFiltrados = catFiltro
    ? alertas.filter((a) => a.categoria === catFiltro)
    : alertas;

  const criticosFilt = alertasFiltrados.filter((a) => a.severidade === 'critico');
  const avisosFilt   = alertasFiltrados.filter((a) => a.severidade === 'aviso');
  const infosFilt    = alertasFiltrados.filter((a) => a.severidade === 'info');

  const statusGeral = criticos.length > 0 ? 'Crítico' : avisos.length > 0 ? 'Atenção' : 'Operacional';
  const totalMon    = produtosAll.filter((p) => p.ativo).length * 4 + 6;

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-0.5">
          <Bell size={18} className="text-slate-400" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Central de Alertas</h1>
          {alertas.length > 0 && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse ${
              criticos.length > 0
                ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
            }`}>
              {alertas.length} ativo{alertas.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm pl-7">
          {totalMon} indicadores monitorados em tempo real · estoque, margens, fiscal e metas
        </p>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          count={criticos.length} label="Críticos" sev="critico"
          sub={criticos.length > 0 ? 'Ação imediata' : 'Nenhuma ocorrência'}
          empty={criticos.length === 0}
        />
        <StatCard
          count={avisos.length} label="Avisos" sev="aviso"
          sub={avisos.length > 0 ? 'Requer atenção' : 'Nenhum aviso'}
          empty={avisos.length === 0}
        />
        {/* Status geral */}
        <div className={`card border-t-[3px] p-4 ${
          alertas.length === 0
            ? 'border-t-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
            : criticos.length > 0
              ? 'border-t-red-500 bg-red-50/60 dark:bg-red-950/15'
              : 'border-t-amber-400 bg-amber-50/60 dark:bg-amber-950/15'
        }`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className={`text-sm font-bold leading-none ${
                alertas.length === 0 ? 'text-emerald-600 dark:text-emerald-400'
                : criticos.length > 0 ? 'text-red-600 dark:text-red-400'
                : 'text-amber-600 dark:text-amber-400'
              }`}>
                {statusGeral}
              </p>
              <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mt-1.5">Status Geral</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                {alertas.length === 0 ? 'Tudo dentro dos parâmetros' : `${alertas.length} ocorrência${alertas.length !== 1 ? 's' : ''} detectada${alertas.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              alertas.length === 0
                ? 'bg-emerald-100 dark:bg-emerald-900/40'
                : criticos.length > 0 ? 'bg-red-100 dark:bg-red-900/40'
                : 'bg-amber-100 dark:bg-amber-900/40'
            }`}>
              {alertas.length === 0
                ? <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
                : criticos.length > 0
                  ? <AlertCircle size={15} className="text-red-600 dark:text-red-400" />
                  : <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400" />
              }
            </div>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {alertas.length === 0 && (
        <div className="card p-16 flex flex-col items-center text-center">
          <div className="relative mb-5">
            <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
              <Shield size={36} className="text-emerald-400 dark:text-emerald-500" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow">
              <CheckCircle2 size={18} className="text-emerald-500" />
            </div>
          </div>
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1.5">
            Nenhum alerta ativo
          </h3>
          <p className="text-slate-400 dark:text-slate-500 text-sm max-w-xs">
            Estoque, margens, metas e obrigações fiscais estão dentro dos parâmetros definidos.
          </p>
          <p className="text-[11px] text-slate-300 dark:text-slate-600 mt-3 font-medium uppercase tracking-wider">
            {totalMon} indicadores OK
          </p>
        </div>
      )}

      {/* Filtro por categoria */}
      {catsPresentes.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCatFiltro(null)}
            className={`text-xs px-3.5 py-1.5 rounded-full font-semibold transition-all ${
              catFiltro === null
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Todos — {alertas.length}
          </button>
          {catsPresentes.map((cat) => {
            const { label, Icon } = CAT_CFG[cat];
            const cnt = alertas.filter((a) => a.categoria === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setCatFiltro(catFiltro === cat ? null : cat)}
                className={`inline-flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full font-semibold transition-all ${
                  catFiltro === cat
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Icon size={11} />
                {label} — {cnt}
              </button>
            );
          })}
        </div>
      )}

      {/* Seções */}
      {alertasFiltrados.length > 0 && (
        <div className="space-y-6">
          {criticosFilt.length > 0 && (
            <section className="space-y-2.5">
              <SectionHeader sev="critico" count={criticosFilt.length} />
              {criticosFilt.map((a) => <AlertCard key={a.id} alerta={a} />)}
            </section>
          )}
          {avisosFilt.length > 0 && (
            <section className="space-y-2.5">
              <SectionHeader sev="aviso" count={avisosFilt.length} />
              {avisosFilt.map((a) => <AlertCard key={a.id} alerta={a} />)}
            </section>
          )}
          {infosFilt.length > 0 && (
            <section className="space-y-2.5">
              <SectionHeader sev="info" count={infosFilt.length} />
              {infosFilt.map((a) => <AlertCard key={a.id} alerta={a} />)}
            </section>
          )}
        </div>
      )}

      {/* Nenhum resultado no filtro ativo */}
      {alertas.length > 0 && alertasFiltrados.length === 0 && (
        <div className="card p-10 text-center">
          <p className="text-slate-400 text-sm">Nenhum alerta nesta categoria.</p>
        </div>
      )}

    </div>
  );
}
