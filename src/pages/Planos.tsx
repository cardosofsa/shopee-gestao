import {
  ArrowRight,
  Check,
  CheckCircle2,
  Crown,
  Puzzle,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useState } from 'react';

import type { ModuleKey } from '../config/modules';
import { MODULE_GROUPS } from '../config/modules';
import type { SegmentKey } from '../config/segments';
import { SEGMENTS } from '../config/segments';
import { useStore } from '../store';
import type { PlanFeatures } from '../types';

const BASE_PRICE = 29.9;
const PRICE_PER_MODULE = 9.9;

// Editar preços aqui quando Stripe estiver configurado
const PLAN_PRICES: Record<string, string> = {
  free: 'Grátis',
  starter: 'R$ 29/mês',
  pro: 'R$ 79/mês',
  max: 'R$ 149/mês',
  cowork_starter: 'R$ 99/mês',
  cowork_titanium: 'R$ 299/mês',
};

const PLANS = [
  {
    id: 'free',
    nome: 'Free',
    grupo: 'Individual',
    limitePedidosMes: 100,
    limiteSKUs: 20,
    limiteUsuarios: 1,
    descricao: 'Para quem está começando',
    features: {
      dre: false,
      importAuto: false,
      exportXlsx: false,
      kanban: true,
      calculadora: true,
      relatoriosPdf: false,
      api: false,
      multiLoja: false,
    } as PlanFeatures,
  },
  {
    id: 'starter',
    nome: 'Starter',
    grupo: 'Individual',
    limitePedidosMes: 500,
    limiteSKUs: 50,
    limiteUsuarios: 1,
    descricao: 'Para lojas em crescimento',
    features: {
      dre: false,
      importAuto: false,
      exportXlsx: true,
      kanban: true,
      calculadora: true,
      relatoriosPdf: false,
      api: false,
      multiLoja: false,
    } as PlanFeatures,
  },
  {
    id: 'pro',
    nome: 'Pro',
    grupo: 'Individual',
    limitePedidosMes: 3000,
    limiteSKUs: null,
    limiteUsuarios: 1,
    descricao: 'Para vendedores profissionais',
    destaque: true,
    features: {
      dre: true,
      importAuto: false,
      exportXlsx: true,
      kanban: true,
      calculadora: true,
      relatoriosPdf: false,
      api: false,
      multiLoja: false,
    } as PlanFeatures,
  },
  {
    id: 'max',
    nome: 'Max',
    grupo: 'Individual',
    limitePedidosMes: 10000,
    limiteSKUs: null,
    limiteUsuarios: 1,
    descricao: 'Para alto volume de vendas',
    features: {
      dre: true,
      importAuto: true,
      exportXlsx: true,
      kanban: true,
      calculadora: true,
      relatoriosPdf: true,
      api: false,
      multiLoja: false,
    } as PlanFeatures,
  },
  {
    id: 'cowork_starter',
    nome: 'CoWork Starter',
    grupo: 'Equipe',
    limitePedidosMes: 5000,
    limiteSKUs: null,
    limiteUsuarios: 3,
    descricao: 'Para equipes pequenas',
    features: {
      dre: true,
      importAuto: false,
      exportXlsx: true,
      kanban: true,
      calculadora: true,
      relatoriosPdf: false,
      api: false,
      multiLoja: true,
    } as PlanFeatures,
  },
  {
    id: 'cowork_titanium',
    nome: 'CoWork Titanium',
    grupo: 'Equipe',
    limitePedidosMes: null,
    limiteSKUs: null,
    limiteUsuarios: 10,
    descricao: 'Sem limites, com suporte prioritário',
    features: {
      dre: true,
      importAuto: true,
      exportXlsx: true,
      kanban: true,
      calculadora: true,
      relatoriosPdf: true,
      api: true,
      multiLoja: true,
    } as PlanFeatures,
  },
];

const FEATURE_ROWS: { key: keyof PlanFeatures; label: string }[] = [
  { key: 'kanban', label: 'Kanban de tarefas' },
  { key: 'calculadora', label: 'Calculadora de preços' },
  { key: 'exportXlsx', label: 'Export XLSX' },
  { key: 'dre', label: 'DRE / Financeiro completo' },
  { key: 'relatoriosPdf', label: 'Relatórios PDF' },
  { key: 'importAuto', label: 'Import automático (cron diário)' },
  { key: 'multiLoja', label: 'Multi-loja' },
  { key: 'api', label: 'Acesso via API' },
];

const PLAN_STYLES: Record<
  string,
  { icon: React.ReactNode; badge: string; ring: string; btn: string }
> = {
  free: {
    icon: <Zap size={16} />,
    badge: 'bg-slate-100 text-slate-600 border-slate-200',
    ring: 'ring-slate-200',
    btn: 'btn-secondary',
  },
  starter: {
    icon: <Zap size={16} />,
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    ring: 'ring-sky-200',
    btn: 'bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors',
  },
  pro: {
    icon: <Crown size={16} />,
    badge: 'bg-core-green/5 text-core-green border-core-green/20',
    ring: 'ring-core-green/40',
    btn: 'btn-primary',
  },
  max: {
    icon: <Crown size={16} />,
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    ring: 'ring-amber-300',
    btn: 'bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors',
  },
  cowork_starter: {
    icon: <Users size={16} />,
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ring: 'ring-emerald-300',
    btn: 'bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors',
  },
  cowork_titanium: {
    icon: <Sparkles size={16} />,
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    ring: 'ring-indigo-300',
    btn: 'bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors',
  },
};

function fmtLimite(val: number | null) {
  if (val === null) return '∞';
  return val.toLocaleString('pt-BR');
}

const SEGMENT_OPTIONS: { key: SegmentKey; label: string; icon: string }[] = [
  { key: 'ecommerce', label: 'E-commerce', icon: '🛒' },
  { key: 'varejo', label: 'Varejo', icon: '🏪' },
  { key: 'atacado', label: 'Atacado', icon: '📦' },
  { key: 'servicos', label: 'Serviços', icon: '🔧' },
  { key: 'industria', label: 'Indústria', icon: '🏭' },
];

function CustomPlanCard({ currentPlanId }: { currentPlanId: string }) {
  const isCurrent = currentPlanId === 'custom';

  const [segment, setSegment] = useState<SegmentKey>('ecommerce');
  const [selected, setSelected] = useState<Set<ModuleKey>>(
    () => new Set<ModuleKey>([...SEGMENTS.ecommerce.modulosPadrao])
  );

  function handleSegmentChange(seg: SegmentKey) {
    setSegment(seg);
    setSelected(new Set<ModuleKey>([...SEGMENTS[seg].modulosPadrao]));
  }

  function toggle(key: ModuleKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const total = BASE_PRICE + selected.size * PRICE_PER_MODULE;

  return (
    <div
      className={`card p-0 overflow-hidden ring-2 transition-all ${
        isCurrent ? 'ring-violet-400' : 'ring-transparent'
      }`}
    >
      {/* Header banner */}
      <div className="bg-gradient-to-r from-violet-600/20 to-indigo-600/20 border-b border-white/[0.06] px-6 py-4 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-violet-500/10 text-violet-400 border-violet-500/20">
              <Puzzle size={12} /> Monte do seu jeito
            </span>
            {isCurrent && (
              <span className="text-xs text-violet-400 font-medium flex items-center gap-1">
                <CheckCircle2 size={12} /> Plano atual
              </span>
            )}
          </div>
          <p className="text-slate-400 text-sm max-w-lg">
            Escolha exatamente os módulos que você precisa. Pague só pelo que usar, sem módulos
            desnecessários.
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-3xl font-bold text-slate-100">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
          </p>
          <p className="text-xs text-slate-500">
            /mês · {selected.size} módulo{selected.size !== 1 ? 's' : ''}
          </p>
          <p className="text-[10px] text-slate-600 mt-0.5">
            Base R$ {BASE_PRICE.toFixed(2).replace('.', ',')} + R${' '}
            {PRICE_PER_MODULE.toFixed(2).replace('.', ',')}/módulo
          </p>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Left: configurações */}
        <div className="space-y-5">
          {/* Segmento */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Começa como padrão de
            </p>
            <div className="grid grid-cols-1 gap-1">
              {SEGMENT_OPTIONS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => handleSegmentChange(s.key)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-medium transition-colors ${
                    segment === s.key
                      ? 'bg-violet-500/10 text-violet-300 border border-violet-500/20'
                      : 'text-slate-400 hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <span>{s.icon}</span>
                  {s.label}
                  {segment === s.key && <Check size={11} className="ml-auto text-violet-400" />}
                </button>
              ))}
            </div>
          </div>

          {/* Resumo de preço */}
          <div className="bg-slate-800/50 rounded-xl p-4 space-y-2 border border-white/[0.04]">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Plataforma base</span>
              <span className="text-slate-300">R$ {BASE_PRICE.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">
                {selected.size} módulo{selected.size !== 1 ? 's' : ''} × R${' '}
                {PRICE_PER_MODULE.toFixed(2).replace('.', ',')}
              </span>
              <span className="text-slate-300">
                R$ {(selected.size * PRICE_PER_MODULE).toFixed(2).replace('.', ',')}
              </span>
            </div>
            <div className="border-t border-white/[0.06] pt-2 flex justify-between">
              <span className="text-xs font-semibold text-slate-300">Total</span>
              <span className="text-sm font-bold text-violet-400">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  total
                )}
                /mês
              </span>
            </div>
          </div>

          <button
            disabled
            title="Pagamentos em breve!"
            className="w-full py-2.5 rounded-xl text-sm font-semibold bg-violet-600 text-white opacity-60 cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isCurrent ? 'Plano atual' : 'Montar meu plano'}
            {!isCurrent && <ArrowRight size={14} />}
          </button>
        </div>

        {/* Right: seletor de módulos */}
        <div className="space-y-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Módulos selecionados ({selected.size})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(MODULE_GROUPS).map(([group, mods]) => (
              <div key={group} className="space-y-1">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 px-1 mb-1.5">
                  {group}
                </p>
                {mods.map((mod) => {
                  const on = selected.has(mod.key);
                  return (
                    <button
                      key={mod.key}
                      onClick={() => toggle(mod.key)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                        on
                          ? 'bg-violet-500/10 border border-violet-500/20 text-slate-200'
                          : 'bg-slate-800/40 border border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/80'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                          on ? 'bg-violet-500' : 'bg-slate-700'
                        }`}
                      >
                        {on && <Check size={10} className="text-white" />}
                      </div>
                      <span className="text-xs font-medium truncate">{mod.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlanosContent() {
  const subscription = useStore((s) => s.subscription);
  const currentPlanId = subscription?.planId ?? 'free';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 pb-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Escolha seu plano</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xl mx-auto">
          Comece gratuitamente. Faça upgrade conforme sua operação crescer. Trial de 14 dias em
          todos os planos pagos — sem cartão de crédito.
        </p>
        {subscription && (
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${PLAN_STYLES[currentPlanId]?.badge ?? 'bg-violet-50 text-violet-700 border-violet-200'}`}
          >
            {PLAN_STYLES[currentPlanId]?.icon ?? <Puzzle size={14} />}
            Você está no plano <span className="font-semibold">{subscription.plan.nome}</span>
          </div>
        )}
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const style = PLAN_STYLES[plan.id];
          const isCurrent = plan.id === currentPlanId;
          const price = PLAN_PRICES[plan.id];
          return (
            <div
              key={plan.id}
              className={`card p-5 flex flex-col gap-4 ring-2 transition-all ${
                isCurrent ? style.ring : 'ring-transparent'
              } ${plan.destaque ? 'border-core-green/30 dark:border-core-green/30' : ''}`}
            >
              {/* Plan header */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${style.badge}`}
                  >
                    {style.icon} {plan.nome}
                  </span>
                  {isCurrent && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 size={12} /> Plano atual
                    </span>
                  )}
                  {plan.destaque && !isCurrent && (
                    <span className="text-xs text-core-green font-medium">Mais popular</span>
                  )}
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-xs">{plan.descricao}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{price}</p>
              </div>

              {/* Limites */}
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Pedidos/mês</span>
                  <span className="font-semibold">{fmtLimite(plan.limitePedidosMes)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">SKUs</span>
                  <span className="font-semibold">{fmtLimite(plan.limiteSKUs)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Usuários</span>
                  <span className="font-semibold">
                    {plan.limiteUsuarios === 10 ? '10+' : plan.limiteUsuarios}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-700" />

              {/* Features */}
              <ul className="space-y-1.5 flex-1">
                {FEATURE_ROWS.map(({ key, label }) => {
                  const on = plan.features[key];
                  return (
                    <li
                      key={key}
                      className={`flex items-center gap-2 text-xs ${on ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600'}`}
                    >
                      {on ? (
                        <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                      ) : (
                        <X size={13} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />
                      )}
                      {label}
                    </li>
                  );
                })}
              </ul>

              {/* CTA */}
              {isCurrent ? (
                <button
                  disabled
                  className="w-full py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-default font-medium"
                >
                  Plano atual
                </button>
              ) : (
                <button
                  disabled
                  title="Pagamentos em breve — aguarde!"
                  className={`w-full flex items-center justify-center gap-2 opacity-60 cursor-not-allowed ${style.btn}`}
                >
                  {plan.id === 'free' ? 'Fazer downgrade' : 'Assinar'}
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Card "Monte do seu jeito" */}
      <CustomPlanCard currentPlanId={currentPlanId} />

      {/* Feature comparison table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
            Comparação completa de features
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                <th className="px-4 py-3 text-left text-slate-500 dark:text-slate-400 font-medium w-48">
                  Feature
                </th>
                {PLANS.map((p) => (
                  <th
                    key={p.id}
                    className={`px-3 py-3 text-center font-semibold ${p.id === currentPlanId ? 'text-core-green' : 'text-slate-600 dark:text-slate-300'}`}
                  >
                    {p.nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              <tr>
                <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">Pedidos/mês</td>
                {PLANS.map((p) => (
                  <td
                    key={p.id}
                    className="px-3 py-2.5 text-center font-medium text-slate-700 dark:text-slate-200"
                  >
                    {fmtLimite(p.limitePedidosMes)}
                  </td>
                ))}
              </tr>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">SKUs</td>
                {PLANS.map((p) => (
                  <td
                    key={p.id}
                    className="px-3 py-2.5 text-center font-medium text-slate-700 dark:text-slate-200"
                  >
                    {fmtLimite(p.limiteSKUs)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">Usuários</td>
                {PLANS.map((p) => (
                  <td
                    key={p.id}
                    className="px-3 py-2.5 text-center font-medium text-slate-700 dark:text-slate-200"
                  >
                    {p.limiteUsuarios === 10 ? '10+' : p.limiteUsuarios}
                  </td>
                ))}
              </tr>
              {FEATURE_ROWS.map(({ key, label }, i) => (
                <tr key={key} className={i % 2 === 0 ? 'bg-slate-50/50 dark:bg-slate-800/50' : ''}>
                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{label}</td>
                  {PLANS.map((p) => (
                    <td key={p.id} className="px-3 py-2.5 text-center">
                      {p.features[key] ? (
                        <CheckCircle2 size={14} className="text-emerald-500 mx-auto" />
                      ) : (
                        <X size={14} className="text-slate-300 dark:text-slate-600 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400 dark:text-slate-500">
        Precisa de algo diferente?{' '}
        <a href="mailto:contato@exemplo.com" className="text-core-green hover:underline">
          Entre em contato.
        </a>{' '}
        Cobrança em R$ (BRL). Cancele quando quiser com export completo dos dados.
      </p>
    </div>
  );
}

export default function Planos() {
  return <PlanosContent />;
}
