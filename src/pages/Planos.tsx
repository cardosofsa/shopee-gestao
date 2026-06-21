import { CheckCircle2, X, Crown, Users, Zap, ArrowRight, Sparkles } from 'lucide-react';
import { useStore } from '../store';
import type { PlanFeatures } from '../types';

// Editar preços aqui quando Stripe estiver configurado
const PLAN_PRICES: Record<string, string> = {
  free:            'Grátis',
  starter:         'R$ 29/mês',
  pro:             'R$ 79/mês',
  max:             'R$ 149/mês',
  cowork_starter:  'R$ 99/mês',
  cowork_titanium: 'R$ 299/mês',
};

const PLANS = [
  {
    id: 'free', nome: 'Free', grupo: 'Individual',
    limitePedidosMes: 100, limiteSKUs: 20, limiteUsuarios: 1,
    descricao: 'Para quem está começando',
    features: { dre: false, importAuto: false, exportXlsx: false, kanban: true, calculadora: true, relatoriosPdf: false, api: false, multiLoja: false } as PlanFeatures,
  },
  {
    id: 'starter', nome: 'Starter', grupo: 'Individual',
    limitePedidosMes: 500, limiteSKUs: 50, limiteUsuarios: 1,
    descricao: 'Para lojas em crescimento',
    features: { dre: false, importAuto: false, exportXlsx: true, kanban: true, calculadora: true, relatoriosPdf: false, api: false, multiLoja: false } as PlanFeatures,
  },
  {
    id: 'pro', nome: 'Pro', grupo: 'Individual',
    limitePedidosMes: 3000, limiteSKUs: null, limiteUsuarios: 1,
    descricao: 'Para vendedores profissionais',
    destaque: true,
    features: { dre: true, importAuto: false, exportXlsx: true, kanban: true, calculadora: true, relatoriosPdf: false, api: false, multiLoja: false } as PlanFeatures,
  },
  {
    id: 'max', nome: 'Max', grupo: 'Individual',
    limitePedidosMes: 10000, limiteSKUs: null, limiteUsuarios: 1,
    descricao: 'Para alto volume de vendas',
    features: { dre: true, importAuto: true, exportXlsx: true, kanban: true, calculadora: true, relatoriosPdf: true, api: false, multiLoja: false } as PlanFeatures,
  },
  {
    id: 'cowork_starter', nome: 'CoWork Starter', grupo: 'Equipe',
    limitePedidosMes: 5000, limiteSKUs: null, limiteUsuarios: 3,
    descricao: 'Para equipes pequenas',
    features: { dre: true, importAuto: false, exportXlsx: true, kanban: true, calculadora: true, relatoriosPdf: false, api: false, multiLoja: true } as PlanFeatures,
  },
  {
    id: 'cowork_titanium', nome: 'CoWork Titanium', grupo: 'Equipe',
    limitePedidosMes: null, limiteSKUs: null, limiteUsuarios: 10,
    descricao: 'Sem limites, com suporte prioritário',
    features: { dre: true, importAuto: true, exportXlsx: true, kanban: true, calculadora: true, relatoriosPdf: true, api: true, multiLoja: true } as PlanFeatures,
  },
];

const FEATURE_ROWS: { key: keyof PlanFeatures; label: string; tooltip?: string }[] = [
  { key: 'kanban',       label: 'Kanban de tarefas' },
  { key: 'calculadora',  label: 'Calculadora de preços' },
  { key: 'exportXlsx',   label: 'Export XLSX' },
  { key: 'dre',          label: 'DRE / Financeiro completo' },
  { key: 'relatoriosPdf',label: 'Relatórios PDF' },
  { key: 'importAuto',   label: 'Import automático (cron diário)' },
  { key: 'multiLoja',    label: 'Multi-loja' },
  { key: 'api',          label: 'Acesso via API' },
];

const PLAN_STYLES: Record<string, { icon: React.ReactNode; badge: string; ring: string; btn: string }> = {
  free:            { icon: <Zap size={16} />,      badge: 'bg-slate-100 text-slate-600 border-slate-200',         ring: 'ring-slate-200',    btn: 'btn-secondary' },
  starter:         { icon: <Zap size={16} />,      badge: 'bg-sky-50 text-sky-700 border-sky-200',                ring: 'ring-sky-200',      btn: 'bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors' },
  pro:             { icon: <Crown size={16} />,    badge: 'bg-shopee-50 text-shopee-700 border-shopee-200',        ring: 'ring-shopee-400',   btn: 'btn-primary' },
  max:             { icon: <Crown size={16} />,    badge: 'bg-amber-50 text-amber-700 border-amber-200',           ring: 'ring-amber-300',    btn: 'bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors' },
  cowork_starter:  { icon: <Users size={16} />,    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',     ring: 'ring-emerald-300',  btn: 'bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors' },
  cowork_titanium: { icon: <Sparkles size={16} />, badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',        ring: 'ring-indigo-300',   btn: 'bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors' },
};

function fmtLimite(val: number | null) {
  if (val === null) return '∞';
  return val.toLocaleString('pt-BR');
}

export default function Planos() {
  const subscription = useStore((s) => s.subscription);
  const currentPlanId = subscription?.planId ?? 'free';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 pb-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Escolha seu plano</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xl mx-auto">
          Comece gratuitamente. Faça upgrade conforme sua operação crescer.
          Trial de 14 dias em todos os planos pagos — sem cartão de crédito.
        </p>
        {subscription && (
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${PLAN_STYLES[currentPlanId]?.badge ?? ''}`}>
            {PLAN_STYLES[currentPlanId]?.icon}
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
              } ${plan.destaque ? 'border-shopee-300 dark:border-shopee-700' : ''}`}
            >
              {/* Plan header */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${style.badge}`}>
                    {style.icon} {plan.nome}
                  </span>
                  {isCurrent && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 size={12} /> Plano atual
                    </span>
                  )}
                  {plan.destaque && !isCurrent && (
                    <span className="text-xs text-shopee-600 dark:text-shopee-400 font-medium">Mais popular</span>
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
                  <span className="font-semibold">{plan.limiteUsuarios === 10 ? '10+' : plan.limiteUsuarios}</span>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-700" />

              {/* Features */}
              <ul className="space-y-1.5 flex-1">
                {FEATURE_ROWS.map(({ key, label }) => {
                  const on = plan.features[key];
                  return (
                    <li key={key} className={`flex items-center gap-2 text-xs ${on ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600'}`}>
                      {on
                        ? <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                        : <X size={13} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />}
                      {label}
                    </li>
                  );
                })}
              </ul>

              {/* CTA */}
              {isCurrent ? (
                <button disabled className="w-full py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-default font-medium">
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

      {/* Feature comparison table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Comparação completa de features</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                <th className="px-4 py-3 text-left text-slate-500 dark:text-slate-400 font-medium w-48">Feature</th>
                {PLANS.map((p) => (
                  <th key={p.id} className={`px-3 py-3 text-center font-semibold ${p.id === currentPlanId ? 'text-shopee-600 dark:text-shopee-400' : 'text-slate-600 dark:text-slate-300'}`}>
                    {p.nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              <tr>
                <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">Pedidos/mês</td>
                {PLANS.map((p) => (
                  <td key={p.id} className="px-3 py-2.5 text-center font-medium text-slate-700 dark:text-slate-200">
                    {fmtLimite(p.limitePedidosMes)}
                  </td>
                ))}
              </tr>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">SKUs</td>
                {PLANS.map((p) => (
                  <td key={p.id} className="px-3 py-2.5 text-center font-medium text-slate-700 dark:text-slate-200">
                    {fmtLimite(p.limiteSKUs)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">Usuários</td>
                {PLANS.map((p) => (
                  <td key={p.id} className="px-3 py-2.5 text-center font-medium text-slate-700 dark:text-slate-200">
                    {p.limiteUsuarios === 10 ? '10+' : p.limiteUsuarios}
                  </td>
                ))}
              </tr>
              {FEATURE_ROWS.map(({ key, label }, i) => (
                <tr key={key} className={i % 2 === 0 ? 'bg-slate-50/50 dark:bg-slate-800/50' : ''}>
                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{label}</td>
                  {PLANS.map((p) => (
                    <td key={p.id} className="px-3 py-2.5 text-center">
                      {p.features[key]
                        ? <CheckCircle2 size={14} className="text-emerald-500 mx-auto" />
                        : <X size={14} className="text-slate-300 dark:text-slate-600 mx-auto" />}
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
        <a href="mailto:contato@exemplo.com" className="text-shopee-500 hover:underline">Entre em contato.</a>
        {' '}Cobrança em R$ (BRL). Cancele quando quiser com export completo dos dados.
      </p>
    </div>
  );
}
