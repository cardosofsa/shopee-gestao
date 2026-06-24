import {
  AlertTriangle,
  Loader2,
  Megaphone,
  Package,
  ShoppingCart,
  Target,
  Trash2,
  TrendingDown,
  X,
} from 'lucide-react';
import { useState } from 'react';

import {
  dbAjustes,
  dbCampanhas,
  dbCompras,
  dbContasPagar,
  dbDespesas,
  dbFornecedores,
  dbHistorico,
  dbImportacoes,
  dbMetasProduto,
  dbPedidos,
  dbProdutos,
  dbTarefas,
} from '../lib/db';
import { useStore } from '../store';
import { useToast } from './Toast';
import { Modal } from './ui/Modal';

// ─── Types ────────────────────────────────────────────────────────────────────

type CategoryKey = 'vendas' | 'estoque' | 'financeiro' | 'tarefas' | 'campanhas' | 'metas';

interface CategoryDef {
  key: CategoryKey;
  label: string;
  desc: string;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  count: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function plural(n: number) {
  return `${n} registro${n !== 1 ? 's' : ''}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

export function LimparDadosModal({ onClose }: Props) {
  const toast = useToast();

  const userId = useStore((s) => s.userId);
  const pedidos = useStore((s) => s.pedidos);
  const produtos = useStore((s) => s.produtos);
  const compras = useStore((s) => s.compras);
  const ajustes = useStore((s) => s.ajustes);
  const despesas = useStore((s) => s.despesas);
  const contasPagar = useStore((s) => s.contasPagar);
  const historico = useStore((s) => s.historico);
  const tarefas = useStore((s) => s.tarefas);
  const campanhas = useStore((s) => s.campanhas);
  const metasProduto = useStore((s) => s.metasProduto);
  const fornecedores = useStore((s) => s.fornecedores);
  const clearSelectedData = useStore((s) => s.clearSelectedData);

  const categories: CategoryDef[] = [
    {
      key: 'vendas',
      label: 'Vendas & Pedidos',
      desc: 'Pedidos importados e histórico de importações',
      icon: ShoppingCart,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      count: pedidos.length,
    },
    {
      key: 'estoque',
      label: 'Estoque & Produtos',
      desc: 'Produtos, ordens de compra e ajustes de estoque',
      icon: Package,
      iconColor: 'text-emerald-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      count: produtos.length + compras.length + ajustes.length,
    },
    {
      key: 'financeiro',
      label: 'Financeiro',
      desc: 'Despesas, contas a pagar e histórico mensal',
      icon: TrendingDown,
      iconColor: 'text-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      count: despesas.length + contasPagar.length + historico.length,
    },
    {
      key: 'tarefas',
      label: 'Tarefas',
      desc: 'Todas as tarefas do kanban',
      icon: X,
      iconColor: 'text-violet-500',
      bgColor: 'bg-violet-50 dark:bg-violet-900/20',
      count: tarefas.length,
    },
    {
      key: 'campanhas',
      label: 'Campanhas',
      desc: 'Campanhas de marketing e promoções',
      icon: Megaphone,
      iconColor: 'text-pink-500',
      bgColor: 'bg-pink-50 dark:bg-pink-900/20',
      count: campanhas.length,
    },
    {
      key: 'metas',
      label: 'Metas & Fornecedores',
      desc: 'Metas por SKU e cadastro de fornecedores',
      icon: Target,
      iconColor: 'text-slate-500',
      bgColor: 'bg-slate-50 dark:bg-slate-700/40',
      count: metasProduto.length + fornecedores.length,
    },
  ];

  const [selected, setSelected] = useState<Set<CategoryKey>>(new Set());
  const [step, setStep] = useState<'select' | 'confirm'>('select');
  const [loading, setLoading] = useState(false);

  const toggleCategory = (key: CategoryKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === categories.length) setSelected(new Set());
    else setSelected(new Set(categories.map((c) => c.key)));
  };

  const selectedCategories = categories.filter((c) => selected.has(c.key));
  const totalRecords = selectedCategories.reduce((n, c) => n + c.count, 0);

  const handleConfirm = async () => {
    if (!userId || selected.size === 0) return;
    setLoading(true);
    try {
      const tasks: Promise<unknown>[] = [];

      if (selected.has('vendas')) {
        tasks.push(dbPedidos.deleteAll(userId), dbImportacoes.deleteAll(userId));
      }
      if (selected.has('estoque')) {
        tasks.push(
          dbProdutos.deleteAll(userId),
          dbCompras.deleteAll(userId),
          dbAjustes.deleteAll(userId)
        );
      }
      if (selected.has('financeiro')) {
        tasks.push(
          dbDespesas.deleteAll(userId),
          dbContasPagar.deleteAll(userId),
          dbHistorico.deleteAll(userId)
        );
      }
      if (selected.has('tarefas')) {
        tasks.push(dbTarefas.deleteAll(userId));
      }
      if (selected.has('campanhas')) {
        tasks.push(dbCampanhas.deleteAll(userId));
      }
      if (selected.has('metas')) {
        tasks.push(dbMetasProduto.deleteAll(userId), dbFornecedores.deleteAll(userId));
      }

      await Promise.all(tasks);

      clearSelectedData({
        vendas: selected.has('vendas'),
        estoque: selected.has('estoque'),
        financeiro: selected.has('financeiro'),
        tarefas: selected.has('tarefas'),
        campanhas: selected.has('campanhas'),
        metas: selected.has('metas'),
      });

      toast(
        `${selectedCategories.length} categoria${selectedCategories.length > 1 ? 's' : ''} apagada${selectedCategories.length > 1 ? 's' : ''} com sucesso.`,
        'success'
      );
      onClose();
    } catch {
      toast('Erro ao apagar os dados. Tente novamente.', 'error');
      setLoading(false);
    }
  };

  // ── Step: Select ────────────────────────────────────────────

  if (step === 'select') {
    return (
      <Modal onClose={onClose} maxWidth="max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <Trash2 size={15} className="text-red-500" />
            </div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
              Limpar Dados
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Selecione as categorias que deseja apagar permanentemente.
          </p>

          <div className="space-y-2">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isChecked = selected.has(cat.key);
              return (
                <button
                  key={cat.key}
                  onClick={() => toggleCategory(cat.key)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border text-left transition-all ${
                    isChecked
                      ? 'border-red-300 dark:border-red-700/50 bg-red-50 dark:bg-red-900/10'
                      : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/30'
                  }`}
                >
                  {/* Checkbox */}
                  <div
                    className={`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition-all ${
                      isChecked
                        ? 'bg-red-500 border-red-500'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {isChecked && (
                      <svg
                        viewBox="0 0 10 8"
                        fill="none"
                        className="w-2.5 h-2"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="1 4 3.5 6.5 9 1" />
                      </svg>
                    )}
                  </div>

                  {/* Icon */}
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cat.bgColor}`}
                  >
                    <Icon size={13} className={cat.iconColor} />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-none mb-0.5">
                      {cat.label}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                      {cat.desc}
                    </p>
                  </div>

                  {/* Count */}
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      cat.count === 0
                        ? 'text-slate-300 dark:text-slate-600 bg-slate-100 dark:bg-slate-700/50'
                        : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700'
                    }`}
                  >
                    {plural(cat.count)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Select all */}
          <button
            onClick={toggleAll}
            className="mt-3 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            {selected.size === categories.length ? 'Desmarcar tudo' : 'Selecionar tudo'}
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {selected.size === 0
              ? 'Nenhuma categoria selecionada'
              : `${selected.size} categoria${selected.size > 1 ? 's' : ''} · ${plural(totalRecords)}`}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => setStep('confirm')}
              disabled={selected.size === 0}
              className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              Avançar →
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // ── Step: Confirm ───────────────────────────────────────────

  return (
    <Modal onClose={onClose} maxWidth="max-w-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
            <AlertTriangle size={15} className="text-red-500" />
          </div>
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
            Confirmar limpeza
          </h2>
        </div>
        <button
          onClick={() => setStep('select')}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="px-6 py-5">
        <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800/50 mb-5">
          <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
            Esta ação é <strong>irreversível</strong>. Os dados serão apagados do banco de dados e
            do armazenamento local.
          </p>
        </div>

        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
          Serão apagados permanentemente:
        </p>
        <ul className="space-y-1.5 mb-2">
          {selectedCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <li
                key={cat.key}
                className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300"
              >
                <Icon size={12} className={cat.iconColor} />
                <span className="font-medium">{cat.label}</span>
                <span className="text-slate-400 dark:text-slate-500">— {plural(cat.count)}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Footer */}
      <div className="flex gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <button
          onClick={() => setStep('select')}
          disabled={loading}
          className="flex-1 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-40"
        >
          ← Voltar
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-70 flex items-center justify-center gap-1.5"
        >
          {loading ? (
            <>
              <Loader2 size={12} className="animate-spin" /> Apagando…
            </>
          ) : (
            <>
              <Trash2 size={12} /> Confirmar limpeza
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}
