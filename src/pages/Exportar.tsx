import {
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Database,
  Download,
  FileSpreadsheet,
  Megaphone,
  Package,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  Target,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { useToast } from '../components/Toast';
import { useStore } from '../store';
import { C } from '../utils/chartColors';
import { exportXlsx, xlsxData, xlsxNum } from '../utils/exportXlsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR');
}

function dateRange(dates: string[]): string {
  if (!dates.length) return '—';
  const sorted = [...dates].sort();
  const first = fmtDate(sorted[0]);
  const last = fmtDate(sorted[sorted.length - 1]);
  return first === last ? first : `${first} – ${last}`;
}

function now() {
  return new Date().toISOString().slice(0, 10);
}
function fname(base: string) {
  return `${base}_${now()}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = '30' | '90' | '180' | '365' | '0';
const PERIODS: { key: Period; label: string }[] = [
  { key: '30', label: '30 dias' },
  { key: '90', label: '90 dias' },
  { key: '180', label: '6 meses' },
  { key: '365', label: '1 ano' },
  { key: '0', label: 'Tudo' },
];

function cutoff(p: Period): string | null {
  if (p === '0') return null;
  const d = new Date();
  d.setDate(d.getDate() - parseInt(p));
  return d.toISOString().slice(0, 10);
}

// ─── Entity card ──────────────────────────────────────────────────────────────

function EntityCard({
  icon: Icon,
  label,
  count,
  range,
  color,
  onExport,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  range?: string;
  color: string;
  onExport: () => void;
  loading: boolean;
}) {
  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15` }}
        >
          <Icon size={15} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</p>
          {range && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{range}</p>
          )}
        </div>
        <span className="text-lg font-bold text-slate-800 dark:text-slate-100 tabular-nums">
          {count.toLocaleString('pt-BR')}
        </span>
      </div>
      <button
        onClick={onExport}
        disabled={count === 0 || loading}
        className="flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-core-green/50 hover:text-core-green disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Download size={12} />
        {loading ? 'Exportando…' : count === 0 ? 'Sem dados' : 'Exportar XLSX'}
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Exportar() {
  const pedidos = useStore((s) => s.pedidos);
  const produtos = useStore((s) => s.produtos);
  const compras = useStore((s) => s.compras);
  const despesas = useStore((s) => s.despesas);
  const historico = useStore((s) => s.historico);
  const metas = useStore((s) => s.metasProduto);
  const contas = useStore((s) => s.contasPagar);
  const campanhas = useStore((s) => s.campanhas);

  const showToast = useToast();

  const [period, setPeriod] = useState<Period>('0');
  const [loading, setLoading] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<string | null>(null);

  const from = cutoff(period);

  // ── Filtered counts ───────────────────────────────────────────────────────

  const filteredPedidos = useMemo(
    () => pedidos.filter((p) => (from ? p.data >= from : true)),
    [pedidos, from]
  );
  const filteredCompras = useMemo(
    () => compras.filter((c) => (from ? c.data >= from : true)),
    [compras, from]
  );
  const filteredDespesas = useMemo(
    () => despesas.filter((d) => (from ? d.data >= from : true)),
    [despesas, from]
  );

  // ── Individual export functions ───────────────────────────────────────────

  const doExport = (key: string, fn: () => void) => {
    setLoading(key);
    setTimeout(() => {
      try {
        fn();
        setLastExport(new Date().toISOString());
        showToast('Arquivo exportado com sucesso', 'success');
      } catch {
        showToast('Erro ao exportar', 'error');
      } finally {
        setLoading(null);
      }
    }, 50);
  };

  const exportPedidos = () =>
    doExport('pedidos', () =>
      exportXlsx(fname('pedidos'), [
        {
          name: 'Pedidos',
          headers: [
            'ID',
            'Nº Pedido',
            'Data',
            'Status',
            'Loja',
            'SKU',
            'Produto',
            'Qtd',
            'Unidades',
            'Receita',
            'Desconto',
            'CMV',
            'Taxa Shopee',
            'DAS',
            'ADS',
            'Lucro Op.',
            'Margem%',
            'Cliente',
          ],
          rows: filteredPedidos.map((p) => [
            p.id,
            p.numeroPedido,
            xlsxData(p.data),
            p.status,
            p.loja,
            p.sku,
            p.produto,
            p.quantidade,
            p.unidadesEstoque,
            xlsxNum(p.receita),
            xlsxNum(p.desconto),
            xlsxNum(p.custoTotal),
            xlsxNum(p.taxaShopee),
            xlsxNum(p.dasImposto),
            xlsxNum(p.adsMarketing),
            xlsxNum(p.lucroOperacional),
            xlsxNum(p.margemSCustoTotal),
            p.nomeCliente ?? '',
          ]),
        },
      ])
    );

  const exportProdutos = () =>
    doExport('produtos', () =>
      exportXlsx(fname('produtos'), [
        {
          name: 'Produtos',
          headers: [
            'SKU',
            'Nome',
            'Categoria',
            'Loja',
            'Custo Unitário',
            'Estoque Atual',
            'Estoque Segurança',
            'Ativo',
          ],
          rows: produtos.map((p) => [
            p.sku,
            p.nome,
            p.categoria,
            p.loja,
            xlsxNum(p.custoUnitario),
            p.estoqueAtual,
            p.estoqueSeguranca,
            p.ativo ? 'Sim' : 'Não',
          ]),
        },
      ])
    );

  const exportCompras = () =>
    doExport('compras', () =>
      exportXlsx(fname('compras'), [
        {
          name: 'Compras',
          headers: [
            'ID',
            'SKU',
            'Produto',
            'Data',
            'Qtd',
            'Custo Unit.',
            'Custo Total',
            'Fornecedor',
            'NF',
            'Pagamento',
            'Parcelas',
            'Loja',
          ],
          rows: filteredCompras.map((c) => [
            c.id,
            c.sku,
            c.produto,
            xlsxData(c.data),
            c.quantidadeEntrada,
            xlsxNum(c.custoUnitario),
            xlsxNum(c.custoTotal),
            c.fornecedor,
            c.nfRef,
            c.pagamento,
            c.parcelas,
            c.loja,
          ]),
        },
      ])
    );

  const exportDespesas = () =>
    doExport('despesas', () =>
      exportXlsx(fname('despesas'), [
        {
          name: 'Despesas',
          headers: ['ID', 'Data', 'Categoria', 'Descrição', 'Valor', 'Loja'],
          rows: filteredDespesas.map((d) => [
            d.id,
            xlsxData(d.data),
            d.categoria,
            d.descricao,
            xlsxNum(d.valor),
            d.loja,
          ]),
        },
      ])
    );

  const exportHistorico = () =>
    doExport('historico', () =>
      exportXlsx(fname('historico_mensal'), [
        {
          name: 'Histórico Mensal',
          headers: [
            'Mês/Ano',
            'Fat. Bruto',
            'Pedidos',
            'Ticket Médio',
            'Unidades',
            'CMV',
            'Taxas Shopee',
            'DAS',
            'Marketing',
            'Desp. Op.',
            'Lucro Bruto',
            'Lucro Op.',
            'Lucro Líq.',
            'Margem%',
          ],
          rows: historico.map((h) => [
            h.mesAno,
            xlsxNum(h.faturamentoBruto),
            h.pedidosQtd,
            xlsxNum(h.ticketMedio),
            h.unidadesVendidas,
            xlsxNum(h.cmv),
            xlsxNum(h.taxasShopee),
            xlsxNum(h.dasImposto),
            xlsxNum(h.marketingAds),
            xlsxNum(h.despesasOperacionais),
            xlsxNum(h.lucroBruto),
            xlsxNum(h.lucroOperacional),
            xlsxNum(h.lucroLiquido),
            xlsxNum(h.margemPercentual),
          ]),
        },
      ])
    );

  const exportContas = () =>
    doExport('contas', () =>
      exportXlsx(fname('contas_pagar'), [
        {
          name: 'Contas a Pagar',
          headers: [
            'ID',
            'Descrição',
            'Categoria',
            'Valor',
            'Vencimento',
            'Status',
            'Loja',
            'Recorrente',
          ],
          rows: contas.map((c) => [
            c.id,
            c.descricao,
            c.categoria,
            xlsxNum(c.valor),
            xlsxData(c.vencimento),
            c.status,
            c.loja,
            c.recorrente ? 'Sim' : 'Não',
          ]),
        },
      ])
    );

  const exportCampanhas = () =>
    doExport('campanhas', () =>
      exportXlsx(fname('campanhas'), [
        {
          name: 'Campanhas',
          headers: ['ID', 'Nome', 'Início', 'Fim', 'Desconto%', 'SKUs', 'Cor'],
          rows: campanhas.map((c) => [
            c.id,
            c.nome,
            xlsxData(c.inicio),
            xlsxData(c.fim),
            c.desconto,
            c.skus.join(', '),
            c.cor,
          ]),
        },
      ])
    );

  // ── Full backup ───────────────────────────────────────────────────────────

  const exportBackup = () =>
    doExport('backup', () => {
      exportXlsx(`backup_core_${now()}`, [
        {
          name: 'Pedidos',
          headers: [
            'ID',
            'Nº Pedido',
            'Data',
            'Status',
            'Loja',
            'SKU',
            'Produto',
            'Qtd',
            'Receita',
            'CMV',
            'Lucro Op.',
            'Margem%',
          ],
          rows: pedidos.map((p) => [
            p.id,
            p.numeroPedido,
            xlsxData(p.data),
            p.status,
            p.loja,
            p.sku,
            p.produto,
            p.quantidade,
            xlsxNum(p.receita),
            xlsxNum(p.custoTotal),
            xlsxNum(p.lucroOperacional),
            xlsxNum(p.margemSCustoTotal),
          ]),
        },
        {
          name: 'Produtos',
          headers: ['SKU', 'Nome', 'Categoria', 'Loja', 'Custo', 'Estoque', 'Ativo'],
          rows: produtos.map((p) => [
            p.sku,
            p.nome,
            p.categoria,
            p.loja,
            xlsxNum(p.custoUnitario),
            p.estoqueAtual,
            p.ativo ? 'Sim' : 'Não',
          ]),
        },
        {
          name: 'Compras',
          headers: ['SKU', 'Produto', 'Data', 'Qtd', 'Custo Total', 'Fornecedor'],
          rows: compras.map((c) => [
            c.sku,
            c.produto,
            xlsxData(c.data),
            c.quantidadeEntrada,
            xlsxNum(c.custoTotal),
            c.fornecedor,
          ]),
        },
        {
          name: 'Despesas',
          headers: ['Data', 'Categoria', 'Descrição', 'Valor', 'Loja'],
          rows: despesas.map((d) => [
            xlsxData(d.data),
            d.categoria,
            d.descricao,
            xlsxNum(d.valor),
            d.loja,
          ]),
        },
        {
          name: 'Histórico Mensal',
          headers: ['Mês/Ano', 'Fat. Bruto', 'Lucro Op.', 'Margem%'],
          rows: historico.map((h) => [
            h.mesAno,
            xlsxNum(h.faturamentoBruto),
            xlsxNum(h.lucroOperacional),
            xlsxNum(h.margemPercentual),
          ]),
        },
        {
          name: 'Contas a Pagar',
          headers: ['Descrição', 'Valor', 'Vencimento', 'Status'],
          rows: contas.map((c) => [
            c.descricao,
            xlsxNum(c.valor),
            xlsxData(c.vencimento),
            c.status,
          ]),
        },
        {
          name: 'Metas Produto',
          headers: ['SKU', 'Mês/Ano', 'Meta Unidades', 'Meta Receita'],
          rows: metas.map((m) => [m.sku, m.mesAno, m.metaUnidades ?? '', m.metaReceita ?? '']),
        },
      ]);
      setLastExport(new Date().toISOString());
    });

  // ── Totals ────────────────────────────────────────────────────────────────

  const totalRecords =
    pedidos.length +
    produtos.length +
    compras.length +
    despesas.length +
    historico.length +
    contas.length +
    campanhas.length;

  const entities = [
    {
      key: 'pedidos',
      icon: ShoppingCart,
      label: 'Pedidos',
      color: C.primary,
      count: filteredPedidos.length,
      range: dateRange(filteredPedidos.map((p) => p.data)),
      onExport: exportPedidos,
    },
    {
      key: 'produtos',
      icon: Package,
      label: 'Produtos (todos)',
      color: '#6366f1',
      count: produtos.length,
      range: `${produtos.filter((p) => p.ativo !== false).length} ativos`,
      onExport: exportProdutos,
    },
    {
      key: 'compras',
      icon: ShoppingBag,
      label: 'Compras',
      color: C.amber,
      count: filteredCompras.length,
      range: dateRange(filteredCompras.map((c) => c.data)),
      onExport: exportCompras,
    },
    {
      key: 'despesas',
      icon: Receipt,
      label: 'Despesas',
      color: C.red,
      count: filteredDespesas.length,
      range: dateRange(filteredDespesas.map((d) => d.data)),
      onExport: exportDespesas,
    },
    {
      key: 'historico',
      icon: CalendarDays,
      label: 'Histórico Mensal',
      color: '#06b6d4',
      count: historico.length,
      range: dateRange(historico.map((h) => h.mesAno + '-01')),
      onExport: exportHistorico,
    },
    {
      key: 'contas',
      icon: CreditCard,
      label: 'Contas a Pagar',
      color: '#8b5cf6',
      count: contas.length,
      range: `${contas.filter((c) => c.status === 'pendente').length} pendentes`,
      onExport: exportContas,
    },
    {
      key: 'campanhas',
      icon: Megaphone,
      label: 'Campanhas',
      color: '#ec4899',
      count: campanhas.length,
      range: `${
        campanhas.filter((c) => {
          const t = new Date().toISOString().slice(0, 10);
          return c.inicio <= t && c.fim >= t;
        }).length
      } ativas`,
      onExport: exportCampanhas,
    },
    {
      key: 'metas',
      icon: Target,
      label: 'Metas por Produto',
      color: '#84cc16',
      count: metas.length,
      range: metas.length > 0 ? `${new Set(metas.map((m) => m.mesAno)).size} meses` : undefined,
      onExport: () =>
        doExport('metas', () =>
          exportXlsx(fname('metas_produto'), [
            {
              name: 'Metas Produto',
              headers: ['SKU', 'Mês/Ano', 'Meta Unidades', 'Meta Receita'],
              rows: metas.map((m) => [m.sku, m.mesAno, m.metaUnidades ?? '', m.metaReceita ?? '']),
            },
          ])
        ),
    },
  ];

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
          <Download size={18} className="text-slate-600 dark:text-slate-300" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Central de Exportação
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Exporte dados individuais ou faça backup completo em XLSX
          </p>
        </div>
      </div>

      {/* Backup hero */}
      <div className="card p-6 border-2 border-dashed border-core-green/30 bg-core-green/5 dark:bg-core-green/10">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-core-green/15 flex items-center justify-center">
              <FileSpreadsheet size={22} className="text-core-green" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-100">Backup Completo</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {totalRecords.toLocaleString('pt-BR')} registros em {entities.length} categorias —
                arquivo único com múltiplas abas
              </p>
              {lastExport && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-1">
                  <Clock size={9} />
                  Último export: {new Date(lastExport).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={exportBackup}
            disabled={totalRecords === 0 || loading === 'backup'}
            className="flex items-center gap-2 px-5 py-2.5 bg-core-green text-white text-sm font-semibold rounded-xl hover:bg-core-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <Download size={15} />
            {loading === 'backup' ? 'Exportando…' : 'Exportar Backup'}
          </button>
        </div>

        {/* Summary badges */}
        <div className="flex flex-wrap gap-2 mt-4">
          {entities.map((e) => (
            <div
              key={e.key}
              className="flex items-center gap-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg px-2.5 py-1"
            >
              <e.icon size={11} style={{ color: e.color }} />
              <span className="text-slate-600 dark:text-slate-300">{e.label}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">{e.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Period filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Período para pedidos/compras/despesas:
        </span>
        <div className="flex items-center gap-1 card px-1 py-1">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                period === key
                  ? 'bg-core-green text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {period !== '0' && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            Produtos, histórico, contas e campanhas exportam sempre completos
          </span>
        )}
      </div>

      {/* Entity grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {entities.map((e) => (
          <EntityCard
            key={e.key}
            icon={e.icon}
            label={e.label}
            count={e.count}
            range={e.range}
            color={e.color}
            onExport={e.onExport}
            loading={loading === e.key}
          />
        ))}
      </div>

      {/* Data health */}
      <div className="card p-4">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
          <Database size={14} className="text-slate-400" />
          Integridade dos dados
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            {
              label: 'Pedidos sem SKU',
              count: pedidos.filter((p) => !p.sku).length,
              ok: pedidos.filter((p) => !p.sku).length === 0,
            },
            {
              label: 'Produtos sem categoria',
              count: produtos.filter((p) => !p.categoria?.trim()).length,
              ok: produtos.filter((p) => !p.categoria?.trim()).length === 0,
            },
            {
              label: 'Compras sem fornecedor',
              count: compras.filter((c) => !c.fornecedor?.trim()).length,
              ok: compras.filter((c) => !c.fornecedor?.trim()).length === 0,
            },
            {
              label: 'Despesas sem categoria',
              count: despesas.filter((d) => !d.categoria?.trim()).length,
              ok: despesas.filter((d) => !d.categoria?.trim()).length === 0,
            },
            {
              label: 'Produtos inativos',
              count: produtos.filter((p) => p.ativo === false).length,
              ok: true,
            },
            {
              label: 'Contas em atraso',
              count: contas.filter(
                (c) =>
                  c.status === 'pendente' && c.vencimento < new Date().toISOString().slice(0, 10)
              ).length,
              ok:
                contas.filter(
                  (c) =>
                    c.status === 'pendente' && c.vencimento < new Date().toISOString().slice(0, 10)
                ).length === 0,
            },
          ].map(({ label, count, ok }) => (
            <div
              key={label}
              className={`flex items-center gap-2.5 p-3 rounded-xl ${ok ? 'bg-green-50 dark:bg-green-950/20' : 'bg-amber-50 dark:bg-amber-950/20'}`}
            >
              {ok ? (
                <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
              ) : (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {count}
                </span>
              )}
              <span
                className={`text-xs font-medium ${ok ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}
              >
                {ok ? `OK — ${label}` : `${label}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
