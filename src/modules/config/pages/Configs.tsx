import {
  CalendarCheck,
  CheckCircle2,
  Crown,
  Download,
  Link2,
  Link2Off,
  Plus,
  RotateCcw,
  Store,
  Tag,
  Trash2,
  Users,
  Wifi,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { LimparDadosModal } from '../../../components/LimparDadosModal';
import { useToast } from '../../../components/Toast';
import { connectGoogleCalendar, downloadICS, getCalendarToken } from '../../../lib/gcal';
import { supabase } from '../../../lib/supabase';
import { PlanosContent } from '../../../pages/Planos';
import { useStore } from '../../../store';
import type { Configuracoes } from '../../../types';
import { fmt } from '../../../utils/calculations';

export default function Configs() {
  const toast = useToast();
  const produtos = useStore((s) => s.produtos);
  const configuracoes = useStore((s) => s.configuracoes);
  const categoriasDesp = useStore((s) => s.categoriasDesp);
  const categoriasProd = useStore((s) => s.categoriasProd);
  const updateCategoriasProd = useStore((s) => s.updateCategoriasProd);
  const updateConfiguracoes = useStore((s) => s.updateConfiguracoes);
  const updateCategoriasDesp = useStore((s) => s.updateCategoriasDesp);
  const resetToSeed = useStore((s) => s.resetToSeed);

  const historico = useStore((s) => s.historico);
  const [cfg, setCfg] = useState(configuracoes);
  const [savedFlag, setSavedFlag] = useState(false);

  const faturamento12m = historico
    .slice()
    .sort((a, b) => b.mesAno.localeCompare(a.mesAno))
    .slice(0, 12)
    .reduce((s, h) => s + h.faturamentoBruto, 0);
  const [showReset, setShowReset] = useState(false);
  const [showLimpar, setShowLimpar] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [newCategoria, setNewCategoria] = useState('');
  const [newCategoriaProd, setNewCategoriaProd] = useState('');
  const [newLoja, setNewLoja] = useState('');
  const [syncStatus, setSyncStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [gcalToken, setGcalToken] = useState<string | null | 'checking'>('checking');

  useEffect(() => {
    (async () => {
      try {
        const { error } = await supabase
          .from('produtos')
          .select('count', { count: 'exact', head: true });
        setSyncStatus(error ? 'offline' : 'online');
      } catch {
        setSyncStatus('offline');
      }
    })();
  }, []);

  useEffect(() => {
    getCalendarToken().then(setGcalToken);
  }, []);
  const subscription = useStore((s) => s.subscription);
  const tarefas = useStore((s) => s.tarefas);
  const pedidos = useStore((s) => s.pedidos);
  const despesas = useStore((s) => s.despesas);

  const pedidosMes = useMemo(() => {
    const mes = new Date().toISOString().slice(0, 7);
    return pedidos.filter((p) => p.data.startsWith(mes)).length;
  }, [pedidos]);

  const exportBackup = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        [
          'SKU',
          'Nome',
          'Categoria',
          'Loja',
          'Custo Unit.',
          'Est. Segurança',
          'Est. Atual',
          'Ativo',
        ],
        ...produtos.map((p) => [
          p.sku,
          p.nome,
          p.categoria,
          p.loja,
          p.custoUnitario,
          p.estoqueSeguranca,
          p.estoqueAtual,
          p.ativo ? 'Sim' : 'Não',
        ]),
      ]),
      'SKUs'
    );

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        [
          'ID',
          'Nº Pedido',
          'Data',
          'Status',
          'Loja',
          'SKU',
          'Produto',
          'Qtd',
          'Receita',
          'Lucro Operacional',
          'Margem (%)',
        ],
        ...pedidos.map((p) => [
          p.id,
          p.numeroPedido,
          p.data,
          p.status,
          p.loja,
          p.sku,
          p.produto,
          p.quantidade,
          p.receita,
          p.lucroOperacional,
          p.margemSCustoTotal,
        ]),
      ]),
      'Pedidos'
    );

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ['ID', 'Data', 'Categoria', 'Descrição', 'Valor', 'Loja'],
        ...despesas.map((d) => [d.id, d.data, d.categoria, d.descricao, d.valor, d.loja]),
      ]),
      'Despesas'
    );

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        [
          'Mês/Ano',
          'Faturamento Bruto',
          'Pedidos',
          'CMV',
          'Taxas Shopee',
          'DAS',
          'Marketing',
          'Desp. Op.',
          'Lucro Líquido',
          'Margem (%)',
        ],
        ...historico.map((h) => [
          h.mesAno,
          h.faturamentoBruto,
          h.pedidosQtd,
          h.cmv,
          h.taxasShopee,
          h.dasImposto,
          h.marketingAds,
          h.despesasOperacionais,
          h.lucroLiquido,
          h.margemPercentual,
        ]),
      ]),
      'Histórico'
    );

    XLSX.writeFile(wb, `backup-shopee-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const autoSaveCfg = (next: typeof cfg) => {
    updateConfiguracoes(next);
    setSavedFlag(true);
    setTimeout(() => setSavedFlag(false), 2000);
  };

  return (
    <>
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Configurações</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Base de dados e premissas gerais
            </p>
          </div>
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${
              syncStatus === 'online'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : syncStatus === 'offline'
                  ? 'bg-red-50 border-red-200 text-red-600'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
            }`}
          >
            {syncStatus === 'online' ? (
              <Wifi size={13} />
            ) : syncStatus === 'offline' ? (
              <WifiOff size={13} />
            ) : null}
            {syncStatus === 'online'
              ? 'Supabase conectado'
              : syncStatus === 'offline'
                ? 'Supabase offline'
                : 'Verificando…'}
          </div>
        </div>

        {/* Meu Plano */}
        {(() => {
          const plan = subscription?.plan;
          const planId = plan?.id ?? 'free';
          const planNome = plan?.nome ?? 'Free';
          const limPedidos = plan?.limitePedidosMes ?? 100;
          const limSKUs = plan?.limiteSKUs ?? 20;
          const pctPedidos = limPedidos
            ? Math.min(100, Math.round((pedidosMes / limPedidos) * 100))
            : 0;
          const pctSKUs = limSKUs
            ? Math.min(100, Math.round((produtos.length / limSKUs) * 100))
            : 0;

          const PLAN_STYLES: Record<string, { badge: string; icon: React.ReactNode }> = {
            free: {
              badge: 'bg-slate-100 text-slate-700 border-slate-200',
              icon: <Zap size={14} />,
            },
            starter: { badge: 'bg-sky-50 text-sky-700 border-sky-200', icon: <Zap size={14} /> },
            pro: {
              badge: 'bg-core-green/5 text-core-green border-core-green/20',
              icon: <Crown size={14} />,
            },
            max: {
              badge: 'bg-amber-50 text-amber-700 border-amber-200',
              icon: <Crown size={14} />,
            },
            cowork_starter: {
              badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              icon: <Users size={14} />,
            },
            cowork_titanium: {
              badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
              icon: <Users size={14} />,
            },
          };
          const style = PLAN_STYLES[planId] ?? PLAN_STYLES.free;

          const barColor = (pct: number) =>
            pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-core-green';

          const FEATURE_LABELS: {
            key: keyof NonNullable<typeof plan>['features'];
            label: string;
          }[] = [
            { key: 'dre', label: 'DRE / Financeiro completo' },
            { key: 'importAuto', label: 'Import automático' },
            { key: 'exportXlsx', label: 'Export XLSX' },
            { key: 'kanban', label: 'Kanban de tarefas' },
            { key: 'calculadora', label: 'Calculadora de preços' },
            { key: 'relatoriosPdf', label: 'Relatórios PDF' },
            { key: 'multiLoja', label: 'Multi-loja' },
            { key: 'api', label: 'Acesso via API' },
          ];

          return (
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-slate-700 dark:text-slate-300 font-semibold text-sm">
                    Meu Plano
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${style.badge}`}
                  >
                    {style.icon} {planNome}
                  </span>
                  {subscription?.status === 'trialing' && (
                    <span className="text-xs text-amber-600 font-medium">Trial ativo</span>
                  )}
                </div>
                <button
                  className="btn-secondary text-xs opacity-50 cursor-not-allowed"
                  disabled
                  title="Em breve"
                >
                  Ver planos
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Pedidos este mês</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {pedidosMes.toLocaleString('pt-BR')}
                      {limPedidos ? ` / ${limPedidos.toLocaleString('pt-BR')}` : ' / ∞'}
                    </span>
                  </div>
                  {limPedidos && (
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor(pctPedidos)}`}
                        style={{ width: `${pctPedidos}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">SKUs cadastrados</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {produtos.length}
                      {limSKUs ? ` / ${limSKUs}` : ' / ∞'}
                    </span>
                  </div>
                  {limSKUs && (
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor(pctSKUs)}`}
                        style={{ width: `${pctSKUs}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {plan?.features && (
                <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-2 font-medium">
                    Features incluídas
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {FEATURE_LABELS.map(({ key, label }) => {
                      const enabled = plan.features[key as keyof typeof plan.features];
                      return (
                        <span
                          key={key}
                          className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                            enabled
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                              : 'bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-600 line-through'
                          }`}
                        >
                          <CheckCircle2
                            size={11}
                            className={enabled ? 'text-emerald-500' : 'text-slate-300'}
                          />
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Premissas */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-slate-700 dark:text-slate-300 font-semibold text-sm">
              Premissas Gerais
            </h2>
            {savedFlag && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <CheckCircle2 size={13} /> Salvo automaticamente
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-xl">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-500 dark:text-slate-400">
                  Alíquota DAS / Simples (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="20"
                  className="w-16 px-2 py-1 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md text-xs text-right text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-core-green/40"
                  value={cfg.aliquotaDAS}
                  onChange={(e) =>
                    setCfg((p) => ({ ...p, aliquotaDAS: parseFloat(e.target.value) || 0 }))
                  }
                  onBlur={() => autoSaveCfg(cfg)}
                />
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="0.1"
                value={cfg.aliquotaDAS}
                className="w-full h-1.5 rounded-full accent-[#18B37A] cursor-pointer"
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setCfg((p) => ({ ...p, aliquotaDAS: v }));
                }}
                onMouseUp={() => autoSaveCfg(cfg)}
                onTouchEnd={() => autoSaveCfg(cfg)}
              />
              <p className="text-slate-400 text-xs">
                MEI: deixe 0% (DAS fixo, lance em Despesas). ME/EPP: alíquota do Simples.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-500 dark:text-slate-400">
                  Marketing / Ads (% sobre receita)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="20"
                  className="w-16 px-2 py-1 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md text-xs text-right text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-core-green/40"
                  value={cfg.percentualMarketing}
                  onChange={(e) =>
                    setCfg((p) => ({ ...p, percentualMarketing: parseFloat(e.target.value) || 0 }))
                  }
                  onBlur={() => autoSaveCfg(cfg)}
                />
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="0.1"
                value={cfg.percentualMarketing}
                className="w-full h-1.5 rounded-full accent-[#18B37A] cursor-pointer"
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setCfg((p) => ({ ...p, percentualMarketing: v }));
                }}
                onMouseUp={() => autoSaveCfg(cfg)}
                onTouchEnd={() => autoSaveCfg(cfg)}
              />
              <p className="text-slate-400 text-xs">Provisão aplicada sobre toda venda.</p>
            </div>
          </div>
        </div>

        {/* Dados da Empresa */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-slate-700 dark:text-slate-300 font-semibold text-sm">
              Dados da Empresa
            </h2>
            {savedFlag && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <CheckCircle2 size={13} /> Salvo automaticamente
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
            <div className="md:col-span-1">
              <label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block">
                Tipo de Empresa
              </label>
              <select
                className="select"
                value={cfg.tipoEmpresa ?? ''}
                onChange={(e) => {
                  const next = {
                    ...cfg,
                    tipoEmpresa: e.target.value as Configuracoes['tipoEmpresa'],
                  };
                  setCfg(next);
                  autoSaveCfg(next);
                }}
              >
                <option value="">Selecionar…</option>
                <option value="MEI">MEI</option>
                <option value="ME">ME</option>
                <option value="EPP">EPP</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block">
                Nome / Razão Social
              </label>
              <input
                className="input"
                placeholder="Ex: João Silva MEI"
                value={cfg.nomeEmpresa ?? ''}
                onChange={(e) => setCfg((p) => ({ ...p, nomeEmpresa: e.target.value }))}
                onBlur={() => autoSaveCfg(cfg)}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block">
                CNPJ
              </label>
              <input
                className="input"
                placeholder="00.000.000/0000-00"
                value={cfg.cnpj ?? ''}
                onChange={(e) => setCfg((p) => ({ ...p, cnpj: e.target.value }))}
                onBlur={() => autoSaveCfg(cfg)}
              />
            </div>
          </div>
        </div>

        {/* Lojas */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Store size={15} className="text-slate-400" />
            <h2 className="text-slate-700 dark:text-slate-300 font-semibold text-sm">Lojas</h2>
          </div>
          <p className="text-slate-400 dark:text-slate-500 text-xs">
            Nomes das lojas usados para filtrar vendas, despesas e compras. "Ambas" é reservado e
            não precisa ser cadastrado.
          </p>
          <div className="flex flex-wrap gap-2">
            {configuracoes.lojas.map((l) => (
              <span
                key={l}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium"
              >
                {l}
                {configuracoes.lojas.length > 1 && (
                  <button
                    className="text-slate-400 hover:text-red-500 transition-colors"
                    onClick={() => {
                      const next = {
                        ...configuracoes,
                        lojas: configuracoes.lojas.filter((x) => x !== l),
                      };
                      setCfg(next);
                      updateConfiguracoes(next);
                    }}
                  >
                    <X size={11} />
                  </button>
                )}
              </span>
            ))}
          </div>
          <div className="flex gap-2 items-center max-w-sm">
            <input
              className="input flex-1"
              placeholder="Nome da nova loja…"
              value={newLoja}
              onChange={(e) => setNewLoja(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const v = newLoja.trim();
                  if (v && !configuracoes.lojas.includes(v)) {
                    const next = { ...configuracoes, lojas: [...configuracoes.lojas, v] };
                    setCfg(next);
                    updateConfiguracoes(next);
                    setNewLoja('');
                  }
                }
              }}
            />
            <button
              className="btn-primary text-xs"
              onClick={() => {
                const v = newLoja.trim();
                if (v && !configuracoes.lojas.includes(v)) {
                  const next = { ...configuracoes, lojas: [...configuracoes.lojas, v] };
                  setCfg(next);
                  updateConfiguracoes(next);
                  setNewLoja('');
                }
              }}
            >
              <Plus size={13} /> Adicionar
            </button>
          </div>
        </div>

        {/* Simples Nacional Reference */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-slate-700 dark:text-slate-300 font-semibold text-sm">
              Simples Nacional
            </h2>
            {faturamento12m > 0 && (
              <span className="text-xs text-slate-400 dark:text-slate-500">
                Rec. 12m cadastrada:{' '}
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  {fmt(faturamento12m)}
                </span>
              </span>
            )}
          </div>
          <table className="text-sm w-full max-w-lg">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="py-2 text-left text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Faixa
                </th>
                <th className="py-2 text-left text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Rec. 12m (De)
                </th>
                <th className="py-2 text-left text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Rec. 12m (Até)
                </th>
                <th className="py-2 text-left text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Alíquota Nominal
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {[
                { faixa: '1ª', de: 0, ate: 180000, aliq: '4,0%' },
                { faixa: '2ª', de: 180000, ate: 360000, aliq: '7,3%' },
                { faixa: '3ª', de: 360000, ate: 720000, aliq: '9,5%' },
                { faixa: '4ª', de: 720000, ate: 1800000, aliq: '10,7%' },
              ].map((r) => {
                const isCurrent =
                  faturamento12m > 0 && faturamento12m >= r.de && faturamento12m < r.ate;
                return (
                  <tr
                    key={r.faixa}
                    className={
                      isCurrent
                        ? 'bg-core-green/5 dark:bg-core-green/10'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/20'
                    }
                  >
                    <td className="py-2 pl-2 text-slate-600 dark:text-slate-300 font-medium">
                      {r.faixa}
                      {isCurrent && (
                        <span className="ml-2 text-[10px] bg-core-green/10 text-core-green px-1.5 py-0.5 rounded font-semibold">
                          atual
                        </span>
                      )}
                    </td>
                    <td
                      className={`py-2 ${isCurrent ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                      {fmt(r.de)}
                    </td>
                    <td
                      className={`py-2 ${isCurrent ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                      {fmt(r.ate)}
                    </td>
                    <td
                      className={`py-2 font-semibold ${isCurrent ? 'text-core-green' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                      {r.aliq}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {faturamento12m === 0 && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
              Cadastre histórico mensal no Financeiro para ver sua faixa atual destacada.
            </p>
          )}
        </div>

        {/* Metas mensais */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-slate-700 dark:text-slate-300 font-semibold text-sm">
              Metas Mensais
            </h2>
            {savedFlag && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <CheckCircle2 size={13} /> Salvo automaticamente
              </span>
            )}
          </div>
          <p className="text-slate-400 text-xs">Usadas nas barras de progresso do Financeiro.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block">
                Meta de Faturamento Mensal (R$)
              </label>
              <input
                type="number"
                step="100"
                min="0"
                className="input"
                placeholder="Ex: 10000"
                value={cfg.metaFaturamento ?? ''}
                onChange={(e) =>
                  setCfg((p) => ({
                    ...p,
                    metaFaturamento: parseFloat(e.target.value) || undefined,
                  }))
                }
                onBlur={() => autoSaveCfg(cfg)}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block">
                Meta de Margem Mensal (%)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                className="input"
                placeholder="Ex: 25"
                value={cfg.metaMargem ?? ''}
                onChange={(e) =>
                  setCfg((p) => ({ ...p, metaMargem: parseFloat(e.target.value) || undefined }))
                }
                onBlur={() => autoSaveCfg(cfg)}
              />
            </div>
          </div>
        </div>

        {/* Categorias de Despesas */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-slate-700 font-semibold text-sm flex items-center gap-2">
              <Tag size={15} /> Categorias de Despesas
            </h2>
          </div>
          <p className="text-slate-400 text-xs">
            Adicione ou remova categorias usadas nos lançamentos de despesas.
          </p>
          <div className="flex flex-wrap gap-2">
            {categoriasDesp.map((cat) => {
              const emUso = despesas.some((d) => d.categoria === cat);
              return (
                <div
                  key={cat}
                  className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 rounded-full pl-3 pr-1.5 py-1"
                >
                  <span className="text-sm text-slate-700 dark:text-slate-300">{cat}</span>
                  <button
                    onClick={() => {
                      if (emUso) {
                        toast(
                          `"${cat}" está em uso em despesas e não pode ser removida.`,
                          'warning'
                        );
                        return;
                      }
                      updateCategoriasDesp(categoriasDesp.filter((c) => c !== cat));
                    }}
                    className={`rounded-full w-4 h-4 flex items-center justify-center transition-colors ${emUso ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-red-500'}`}
                    title={
                      emUso ? `"${cat}" está em uso — não pode ser removida` : `Remover ${cat}`
                    }
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 items-center max-w-xs">
            <input
              className="input"
              placeholder="Nova categoria…"
              value={newCategoria}
              onChange={(e) => setNewCategoria(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const v = newCategoria.trim();
                  if (v && !categoriasDesp.includes(v)) {
                    updateCategoriasDesp([...categoriasDesp, v]);
                    setNewCategoria('');
                  }
                }
              }}
            />
            <button
              className="btn-primary whitespace-nowrap"
              onClick={() => {
                const v = newCategoria.trim();
                if (v && !categoriasDesp.includes(v)) {
                  updateCategoriasDesp([...categoriasDesp, v]);
                  setNewCategoria('');
                }
              }}
            >
              <Plus size={14} /> Adicionar
            </button>
          </div>
        </div>

        {/* Categorias de Produtos */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-slate-700 font-semibold text-sm flex items-center gap-2">
              <Tag size={15} /> Categorias de Produtos
            </h2>
          </div>
          <p className="text-slate-400 text-xs">
            Categorias disponíveis no cadastro e edição de SKUs.
          </p>
          <div className="flex flex-wrap gap-2">
            {categoriasProd.map((cat) => (
              <div
                key={cat}
                className="flex items-center gap-1.5 bg-slate-100 rounded-full pl-3 pr-1.5 py-1"
              >
                <span className="text-sm text-slate-700">{cat}</span>
                <button
                  onClick={() => updateCategoriasProd(categoriasProd.filter((c) => c !== cat))}
                  className="text-slate-400 hover:text-red-500 transition-colors rounded-full w-4 h-4 flex items-center justify-center"
                  title={`Remover ${cat}`}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 items-center max-w-xs">
            <input
              className="input"
              placeholder="Nova categoria de produto…"
              value={newCategoriaProd}
              onChange={(e) => setNewCategoriaProd(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const v = newCategoriaProd.trim();
                  if (v && !categoriasProd.includes(v)) {
                    updateCategoriasProd([...categoriasProd, v]);
                    setNewCategoriaProd('');
                  }
                }
              }}
            />
            <button
              className="btn-primary whitespace-nowrap"
              onClick={() => {
                const v = newCategoriaProd.trim();
                if (v && !categoriasProd.includes(v)) {
                  updateCategoriasProd([...categoriasProd, v]);
                  setNewCategoriaProd('');
                }
              }}
            >
              <Plus size={14} /> Adicionar
            </button>
          </div>
        </div>

        {/* Integrações */}
        <div className="card p-5 space-y-4">
          <h2 className="text-slate-700 dark:text-slate-300 font-semibold text-sm">Integrações</h2>

          {/* Google Calendar */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                <CalendarCheck size={18} className="text-slate-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  Google Calendar
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {gcalToken === 'checking'
                    ? 'Verificando…'
                    : gcalToken
                      ? 'Conectado — tarefas com data de vencimento podem ser sincronizadas'
                      : 'Não conectado'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {gcalToken && gcalToken !== 'checking' && (
                <button
                  className="btn-secondary text-xs"
                  onClick={() => {
                    const comData = tarefas.filter((t) => !!t.dataVencimento);
                    if (comData.length === 0) {
                      toast('Nenhuma tarefa com data para exportar.', 'warning');
                      return;
                    }
                    downloadICS(tarefas);
                    toast(`${comData.length} tarefa(s) exportadas como .ICS.`, 'success');
                  }}
                >
                  <Download size={13} /> Baixar .ICS
                </button>
              )}
              {gcalToken && gcalToken !== 'checking' ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  <Link2 size={13} /> Conectado
                </div>
              ) : (
                <button
                  className="btn-secondary text-xs"
                  title="Requer Google OAuth configurado no Supabase Dashboard (Settings → Auth → Providers → Google → Additional scopes: https://www.googleapis.com/auth/calendar)"
                  onClick={async () => {
                    const { error } = await connectGoogleCalendar();
                    if (error) toast(`Erro ao conectar: ${error}`, 'error');
                  }}
                >
                  <Link2Off size={13} /> Conectar
                </button>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-700 pt-3">
            Mais integrações em breve: UpSeller, Shopee API, WhatsApp, Stripe.
          </p>
        </div>

        {/* Upgrade */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm mb-1 flex items-center gap-2">
            <Crown size={15} className="text-core-green" /> Plano e Assinatura
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-3">
            Gerencie seu plano ou faça upgrade para desbloquear mais recursos.
          </p>
          <button onClick={() => setShowUpgrade(true)} className="btn-primary text-sm">
            <Crown size={14} /> Ver planos e fazer upgrade
          </button>
        </div>

        {/* Danger Zone */}
        <div className="card p-5 border border-red-100 dark:border-red-900/50">
          <h2 className="text-red-600 font-semibold text-sm mb-1">Zona de Perigo</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-3">
            Exporte um backup antes de restaurar os dados.
          </p>
          <button
            onClick={exportBackup}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors mb-3"
          >
            <Download size={14} /> Exportar Backup Completo (XLSX)
          </button>
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-3">
            Apague categorias de dados específicas de forma permanente.
          </p>
          <button
            onClick={() => setShowLimpar(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors mb-4"
          >
            <Trash2 size={14} /> Limpar dados selecionados
          </button>
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-3">
            Restaurar todos os dados para o estado inicial da planilha original.
          </p>
          {!showReset ? (
            <button
              onClick={() => setShowReset(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              <RotateCcw size={14} /> Restaurar dados da planilha
            </button>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900/50">
              <p className="text-sm text-red-700 dark:text-red-400 flex-1">
                Tem certeza? Todos os dados adicionados serão perdidos.
              </p>
              <button
                onClick={() => {
                  resetToSeed();
                  setShowReset(false);
                  toast('Dados restaurados para o estado inicial.', 'info');
                }}
                className="px-3 py-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors flex-shrink-0"
              >
                Confirmar
              </button>
              <button
                onClick={() => setShowReset(false)}
                className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      {showLimpar && <LimparDadosModal onClose={() => setShowLimpar(false)} />}

      {showUpgrade && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex flex-col z-[400]"
          onClick={() => setShowUpgrade(false)}
        >
          <div
            className="flex-1 bg-white dark:bg-slate-900 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Crown size={18} className="text-core-green" />
                Planos e Assinatura
              </h2>
              <button
                onClick={() => setShowUpgrade(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <PlanosContent />
          </div>
        </div>
      )}
    </>
  );
}
