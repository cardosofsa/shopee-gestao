import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { X, CheckCircle2, Circle, ArrowRight, Rocket } from 'lucide-react';
import { useStore } from '../store';

interface Step {
  id: string;
  title: string;
  desc: string;
  action: string;
  href: string;
  done: boolean;
}

export default function Onboarding() {
  const onboardingCompleted   = useStore((s) => s.onboardingCompleted);
  const setOnboardingCompleted = useStore((s) => s.setOnboardingCompleted);
  const produtos   = useStore((s) => s.produtos);
  const pedidos    = useStore((s) => s.pedidos);
  const despesas   = useStore((s) => s.despesas);
  const configuracoes = useStore((s) => s.configuracoes);

  const steps: Step[] = useMemo(() => [
    {
      id: 'produtos',
      title: 'Cadastre seus produtos',
      desc: 'Adicione SKU, custo unitário e estoque de segurança para cada item que você vende.',
      action: 'Ir para Configurações',
      href: '/configs',
      done: produtos.some((p) => !['ALF-118','ALF-500','FITA-PCX','FITA-BIKE','FITA-MOTO','CJ13-3','CJ13-2','L14-4','CANMAD','BAINHAC','BAINHAC-PREMIUM','CANMAD-BAINHAC'].includes(p.sku)),
    },
    {
      id: 'das',
      title: 'Configure sua alíquota DAS',
      desc: 'Defina a alíquota do Simples Nacional para que os impostos sejam calculados corretamente.',
      action: 'Ir para Configurações',
      href: '/configs',
      done: configuracoes.aliquotaDAS > 0,
    },
    {
      id: 'pedidos',
      title: 'Importe seus pedidos',
      desc: 'Faça upload de uma planilha ou cadastre pedidos manualmente para ver o Dashboard.',
      action: 'Ir para Vendas',
      href: '/vendas',
      done: pedidos.length > 0,
    },
    {
      id: 'despesas',
      title: 'Lance suas despesas operacionais',
      desc: 'Registre custos fixos (embalagem, combustível, etc.) para ter o lucro líquido real.',
      action: 'Ir para Despesas',
      href: '/despesas',
      done: despesas.filter((d) => !d.compraRef).length > 0,
    },
    {
      id: 'calculadora',
      title: 'Precifique seus produtos',
      desc: 'Use a Calculadora para descobrir o preço ideal com base nos custos reais da Shopee.',
      action: 'Abrir Calculadora',
      href: '/calculadora',
      done: useStore.getState().precificacoesSalvas.length > 0,
    },
  ], [produtos, pedidos, despesas, configuracoes]);

  const completedCount = steps.filter((s) => s.done).length;
  const allDone        = completedCount === steps.length;

  if (onboardingCompleted) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-core-green rounded-xl flex items-center justify-center flex-shrink-0">
              <Rocket size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base">Bem-vindo ao Gestão Shopee!</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                {completedCount}/{steps.length} passos concluídos
              </p>
            </div>
          </div>
          <button
            onClick={setOnboardingCompleted}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex-shrink-0 mt-0.5"
            title="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-100 dark:bg-slate-700">
          <div
            className="h-full bg-core-green transition-all duration-500"
            style={{ width: `${(completedCount / steps.length) * 100}%` }}
          />
        </div>

        {/* Steps */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          {steps.map((step, i) => (
            <div
              key={step.id}
              className={`flex gap-3 p-4 rounded-xl border transition-colors ${
                step.done
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/40'
                  : 'bg-white dark:bg-slate-700/50 border-slate-100 dark:border-slate-700'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {step.done
                  ? <CheckCircle2 size={18} className="text-emerald-500" />
                  : <Circle size={18} className="text-slate-300 dark:text-slate-500" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Passo {i + 1}</span>
                  {step.done && (
                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full font-medium">Concluído</span>
                  )}
                </div>
                <p className={`text-sm font-semibold leading-tight ${step.done ? 'text-slate-500 dark:text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100'}`}>
                  {step.title}
                </p>
                {!step.done && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{step.desc}</p>
                )}
              </div>
              {!step.done && (
                <Link
                  to={step.href}
                  onClick={setOnboardingCompleted}
                  className="flex-shrink-0 self-center flex items-center gap-1 text-xs font-medium text-core-green hover:text-core-green whitespace-nowrap"
                >
                  {step.action} <ArrowRight size={11} />
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700">
          {allDone ? (
            <button
              onClick={setOnboardingCompleted}
              className="w-full py-2.5 bg-core-green hover:bg-core-green-h text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Tudo pronto — ir para o Dashboard
            </button>
          ) : (
            <button
              onClick={setOnboardingCompleted}
              className="w-full py-2.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-sm transition-colors"
            >
              Pular configuração inicial
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
