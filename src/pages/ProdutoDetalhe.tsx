import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  ChevronDown,
  ChevronUp,
  Download,
  Package,
  ShoppingCart,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { useStore } from '../store';
import type { StatusEstoque } from '../types';
import { fmt, fmtPct, getRankingProdutos, getStatusEstoque } from '../utils/calculations';
import { C } from '../utils/chartColors';
import { exportXlsx, xlsxNum } from '../utils/exportXlsx';

// ─── Styles ───────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<StatusEstoque, string> = {
  Comprar: 'bg-red-50 text-red-700 border border-red-200',
  'Estoque Baixo': 'bg-amber-50 text-amber-700 border border-amber-200',
  'Estoque Estável': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'Estoque Acima': 'bg-blue-50 text-blue-700 border border-blue-200',
};

const ABC_STYLE: Record<string, string> = {
  A: 'bg-emerald-100 text-emerald-700',
  B: 'bg-blue-100 text-blue-700',
  C: 'bg-slate-100 text-slate-600',
  '—': 'bg-slate-100 text-slate-400',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMes(mes: string): string {
  const [y, m] = mes.split('-');
  const labels = [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ];
  return `${labels[parseInt(m) - 1]}/${y.slice(2)}`;
}

const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

// ─── Tooltip ──────────────────────────────────────────────────────────────────

type REntry = { dataKey?: string; value?: number; color?: string; name?: string };
type RTip = { active?: boolean; payload?: REntry[]; label?: string };

function ChartTooltip({ active, payload, label }: RTip) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs">
      <p className="font-medium text-slate-600 dark:text-slate-300 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {fmt(Number(p.value))}
        </p>
      ))}
    </div>
  );
}

// ─── KPI mini card ────────────────────────────────────────────────────────────

function KCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="card p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
        {label}
      </p>
      <p className={`text-2xl font-bold ${accent ?? 'text-slate-900 dark:text-slate-100'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ProdutoDetalhe() {
  const { sku } = useParams<{ sku: string }>();
  const produtos = useStore((s) => s.produtos);
  const pedidosAll = useStore((s) => s.pedidos);
  const comprasAll = useStore((s) => s.compras);
  const ajustesAll = useStore((s) => s.ajustes);
  const configuracoes = useStore((s) => s.configuracoes);

  const [showSim, setShowSim] = useState(false);
  const [simMargem, setSimMargem] = useState(25);
  const [showVendas, setShowVendas] = useState(false);

  const produto = produtos.find((p) => p.sku === sku);

  const vendas = useMemo(
    () =>
      pedidosAll.filter(
        (p) => p.sku === sku && (p.status === 'Concluído' || p.status === 'Enviado')
      ),
    [pedidosAll, sku]
  );

  const todasVendas = useMemo(
    () => [...pedidosAll.filter((p) => p.sku === sku)].sort((a, b) => b.data.localeCompare(a.data)),
    [pedidosAll, sku]
  );

  const comprasSku = useMemo(
    () => comprasAll.filter((c) => c.sku === sku).sort((a, b) => b.data.localeCompare(a.data)),
    [comprasAll, sku]
  );

  const ajustesSku = useMemo(
    () =>
      ajustesAll.filter((a) => a.sku === sku).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)),
    [ajustesAll, sku]
  );

  // Velocidades
  const limite7d = useMemo(() => daysAgo(7), []);
  const limite14d = useMemo(() => daysAgo(14), []);
  const limite30d = useMemo(() => daysAgo(30), []);

  const vdDia7 = useMemo(
    () => vendas.filter((p) => p.data >= limite7d).reduce((s, p) => s + p.unidadesEstoque, 0) / 7,
    [vendas, limite7d]
  );
  const vdDia14 = useMemo(
    () => vendas.filter((p) => p.data >= limite14d).reduce((s, p) => s + p.unidadesEstoque, 0) / 14,
    [vendas, limite14d]
  );
  const vdDia30 = useMemo(
    () => vendas.filter((p) => p.data >= limite30d).reduce((s, p) => s + p.unidadesEstoque, 0) / 30,
    [vendas, limite30d]
  );

  const { vdDia, diasCobertura } = useMemo(() => {
    const vd = vdDia30;
    const dc = vd > 0 ? (produto?.estoqueAtual ?? 0) / vd : Infinity;
    return { vdDia: vd, diasCobertura: dc };
  }, [vdDia30, produto]);

  // Reposição
  const LEAD_TIME_PADRAO = 7;
  const COBERTURA_ALVO = 45;
  const pontoReposicao = useMemo(
    () =>
      vdDia > 0 ? Math.ceil(vdDia * (LEAD_TIME_PADRAO + (produto?.estoqueSeguranca ?? 0))) : null,
    [vdDia, produto]
  );

  const qtdSugerida = useMemo(() => {
    if (!produto || vdDia <= 0) return null;
    const alvo = Math.ceil(vdDia * COBERTURA_ALVO);
    return Math.max(0, alvo - produto.estoqueAtual);
  }, [vdDia, produto]);

  // Ranking
  const curvaABC = useMemo(
    () => getRankingProdutos(pedidosAll).find((r) => r.sku === sku)?.curvaABC ?? '—',
    [pedidosAll, sku]
  );

  const status = useMemo(
    () =>
      produto
        ? getStatusEstoque(produto.estoqueAtual, vdDia, produto.estoqueSeguranca)
        : ('Estoque Estável' as StatusEstoque),
    [produto, vdDia]
  );

  // Totais
  const totais = useMemo(() => {
    const faturamento = vendas.reduce((s, p) => s + p.receita, 0);
    const lucro = vendas.reduce((s, p) => s + p.lucroOperacional, 0);
    const custo = vendas.reduce((s, p) => s + p.custoTotal, 0);
    const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0;
    const roi = custo > 0 ? (lucro / custo) * 100 : 0;
    return { faturamento, lucro, margem, roi, pedidos: vendas.length };
  }, [vendas]);

  // Gráfico mensal
  const vendasMes = useMemo(() => {
    const map = new Map<string, { fat: number; lucro: number; qtd: number }>();
    vendas.forEach((p) => {
      const mes = p.data.slice(0, 7);
      const prev = map.get(mes) ?? { fat: 0, lucro: 0, qtd: 0 };
      map.set(mes, {
        fat: prev.fat + p.receita,
        lucro: prev.lucro + p.lucroOperacional,
        qtd: prev.qtd + p.unidadesEstoque,
      });
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([mes, d]) => ({
        name: fmtMes(mes),
        Faturamento: d.fat,
        'Lucro Op.': d.lucro,
        Unidades: d.qtd,
      }));
  }, [vendas]);

  // Evolução do custo de compra
  const evolucaoCusto = useMemo(
    () =>
      [...comprasSku]
        .sort((a, b) => a.data.localeCompare(b.data))
        .map((c) => ({ name: c.data.slice(0, 7), 'Custo Unit.': c.custoUnitario })),
    [comprasSku]
  );

  // Simulador de preço
  const simPrecos = useMemo(() => {
    if (!produto) return null;
    const custo = produto.custoUnitario;
    const comissao = 0.2;
    const das = (configuracoes.aliquotaDAS || 0) / 100;
    const ads = (configuracoes.percentualMarketing || 2) / 100;

    const preco = (marg: number) => {
      const m = marg / 100;
      const denom = 1 - comissao - das - ads - m;
      if (denom <= 0) return null;
      return custo / denom;
    };

    const alvo = preco(simMargem);
    const breakEven = preco(0);
    const ultra = preco(30);
    return { alvo, breakEven, ultra, custo };
  }, [produto, simMargem, configuracoes]);

  // Top clientes
  const topClientes = useMemo(() => {
    const map = new Map<string, { pedidos: number; receita: number; lucro: number }>();
    const names = new Map<string, string>();
    todasVendas
      .filter((p) => p.nomeCliente?.trim() && (p.status === 'Concluído' || p.status === 'Enviado'))
      .forEach((p) => {
        const key = p.nomeCliente!.trim().toLowerCase();
        const prev = map.get(key) ?? { pedidos: 0, receita: 0, lucro: 0 };
        map.set(key, {
          pedidos: prev.pedidos + 1,
          receita: prev.receita + p.receita,
          lucro: prev.lucro + p.lucroOperacional,
        });
        names.set(key, p.nomeCliente!.trim());
      });
    return [...map.entries()]
      .map(([key, v]) => ({ nome: names.get(key) ?? key, ...v }))
      .sort((a, b) => b.receita - a.receita)
      .slice(0, 5);
  }, [todasVendas]);

  // Export
  const handleExport = () => {
    if (!produto) return;
    exportXlsx(`produto_${sku}_${new Date().toISOString().slice(0, 10)}.xlsx`, [
      {
        name: 'Vendas',
        headers: ['Data', 'Nº Pedido', 'Cliente', 'Qtd', 'Receita', 'Lucro Op.', 'Status'],
        rows: todasVendas.map((p) => [
          p.data,
          p.numeroPedido,
          p.nomeCliente ?? '',
          p.unidadesEstoque,
          xlsxNum(p.receita),
          xlsxNum(p.lucroOperacional),
          p.status,
        ]),
      },
      {
        name: 'Compras',
        headers: ['Data', 'Qtd', 'Custo Unit.', 'Total', 'Fornecedor', 'Pagamento'],
        rows: comprasSku.map((c) => [
          c.data,
          c.quantidadeEntrada,
          xlsxNum(c.custoUnitario),
          xlsxNum(c.custoTotal),
          c.fornecedor,
          c.pagamento,
        ]),
      },
    ]);
  };

  // ── Not found ────────────────────────────────────────────────────────────────
  if (!produto) {
    return (
      <div className="p-6">
        <Link
          to="/estoque"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-6 transition-colors"
        >
          <ArrowLeft size={14} /> Voltar ao Estoque
        </Link>
        <div className="card p-12 text-center">
          <Package size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">
            Produto não encontrado: <span className="font-mono font-bold">{sku}</span>
          </p>
        </div>
      </div>
    );
  }

  const valorEstoque = produto.estoqueAtual * produto.custoUnitario;

  return (
    <div className="p-6 space-y-5">
      {/* Breadcrumb + actions */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <Breadcrumbs
          crumbs={[
            { label: 'Estoque', to: '/estoque' },
            { label: produto.nome, to: undefined },
          ]}
        />
        <button onClick={handleExport} className="btn-secondary text-xs py-1.5 px-3">
          <Download size={13} /> Exportar dados
        </button>
      </div>

      {/* Product header */}
      <div className="card p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{produto.nome}</h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="font-mono text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                {produto.sku}
              </span>
              {produto.categoria && (
                <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 px-2 py-0.5 rounded">
                  {produto.categoria}
                </span>
              )}
              <span className="text-xs text-slate-400 dark:text-slate-500">{produto.loja}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[status]}`}
            >
              {status}
            </span>
            <span
              className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${ABC_STYLE[String(curvaABC)] ?? ABC_STYLE['—']}`}
              title="Curva ABC"
            >
              {curvaABC}
            </span>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${produto.ativo ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}
            >
              {produto.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Row 1 — Estoque */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KCard
          label="Estoque Atual"
          value={String(produto.estoqueAtual)}
          sub={`Seg.: ${produto.estoqueSeguranca} un.`}
        />
        <KCard
          label="Cobertura"
          value={isFinite(diasCobertura) ? `${Math.round(diasCobertura)}d` : '∞'}
          sub="dias de cobertura"
          accent={
            !isFinite(diasCobertura)
              ? 'text-slate-300 dark:text-slate-600'
              : diasCobertura < 7
                ? 'text-red-500'
                : diasCobertura < 30
                  ? 'text-amber-500'
                  : 'text-emerald-600'
          }
        />
        <KCard
          label="Valor em Estoque"
          value={fmt(valorEstoque)}
          sub={`Custo: ${fmt(produto.custoUnitario)}/un.`}
        />
        <KCard
          label="Venda / Dia (30d)"
          value={vdDia > 0 ? vdDia.toFixed(2) : '—'}
          sub="últ. 30 dias"
        />
      </div>

      {/* KPI Row 2 — Financeiro */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KCard
          label="Faturamento Total"
          value={fmt(totais.faturamento)}
          sub={`${totais.pedidos} pedido${totais.pedidos !== 1 ? 's' : ''}`}
        />
        <KCard
          label="Lucro Operacional"
          value={totais.faturamento > 0 ? fmt(totais.lucro) : '—'}
          sub="acumulado"
          accent={totais.lucro >= 0 ? 'text-emerald-600' : 'text-red-500'}
        />
        <KCard
          label="Margem"
          value={totais.faturamento > 0 ? fmtPct(totais.margem) : '—'}
          sub="sobre receita"
          accent={
            totais.margem >= 20
              ? 'text-emerald-600'
              : totais.margem >= 10
                ? 'text-amber-500'
                : 'text-red-500'
          }
        />
        <KCard
          label="ROI"
          value={totais.roi > 0 ? fmtPct(totais.roi) : '—'}
          sub="retorno sobre custo"
          accent={
            totais.roi >= 30
              ? 'text-emerald-600'
              : totais.roi >= 15
                ? 'text-amber-500'
                : 'text-red-500'
          }
        />
      </div>

      {/* Painel de Inteligência de Reposição */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={14} className="text-core-green" />
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Inteligência de Reposição
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Velocidade */}
          <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-2.5">
              Velocidade de Venda
            </p>
            <div className="space-y-2">
              {[
                { label: '7 dias', v: vdDia7 },
                { label: '14 dias', v: vdDia14 },
                { label: '30 dias', v: vdDia30 },
              ].map(({ label, v }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-14 flex-shrink-0">{label}</span>
                  <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-core-green rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (v / Math.max(vdDia7, vdDia14, vdDia30, 0.01)) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 w-12 text-right">
                    {v > 0 ? `${v.toFixed(2)}/d` : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Ponto de Reposição */}
          <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-2.5">
              Ponto de Reposição
            </p>
            {pontoReposicao !== null ? (
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Repor quando</span>
                  <span className="font-bold text-orange-500 text-sm">≤ {pontoReposicao} un.</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Qtd. sugerida</span>
                  <span className="font-bold text-core-green text-sm">{qtdSugerida ?? 0} un.</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Lead time est.</span>
                  <span className="text-xs text-slate-600 dark:text-slate-300">
                    {LEAD_TIME_PADRAO} dias
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Cobertura alvo</span>
                  <span className="text-xs text-slate-600 dark:text-slate-300">
                    {COBERTURA_ALVO} dias
                  </span>
                </div>
                {produto.estoqueAtual <= (pontoReposicao ?? 0) && (
                  <div className="flex items-center gap-1.5 pt-1 text-orange-500">
                    <AlertTriangle size={11} />
                    <span className="text-[11px] font-medium">Abaixo do ponto de reposição</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Sem dados suficientes de venda para calcular.
              </p>
            )}
          </div>

          {/* Custo investido compras */}
          <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-2.5">
              Resumo de Compras
            </p>
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-slate-500 dark:text-slate-400">Entradas</span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {comprasSku.reduce((s, c) => s + c.quantidadeEntrada, 0)} un.
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-slate-500 dark:text-slate-400">Total investido</span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {fmt(comprasSku.reduce((s, c) => s + c.custoTotal, 0))}
                </span>
              </div>
              {comprasSku[0] && (
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Última compra</span>
                  <span className="text-xs text-slate-600 dark:text-slate-300">
                    {comprasSku[0].data}
                  </span>
                </div>
              )}
              {comprasSku.length > 1 && (
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Custo médio</span>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    {fmt(comprasSku.reduce((s, c) => s + c.custoUnitario, 0) / comprasSku.length)}
                    /un.
                  </span>
                </div>
              )}
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-slate-500 dark:text-slate-400">Nº compras</span>
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  {comprasSku.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Simulador de Preço */}
      <div className="card overflow-hidden">
        <button
          onClick={() => setShowSim(!showSim)}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Calculator size={14} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Simulador de Preço
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              · custo atual: {fmt(produto.custoUnitario)}
            </span>
          </div>
          {showSim ? (
            <ChevronUp size={14} className="text-slate-400" />
          ) : (
            <ChevronDown size={14} className="text-slate-400" />
          )}
        </button>
        {showSim && simPrecos && (
          <div className="px-5 pb-5 space-y-4 border-t border-slate-100 dark:border-slate-700 pt-4">
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                Margem alvo:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={1}
                  value={simMargem}
                  onChange={(e) => setSimMargem(Number(e.target.value))}
                  className="w-36 accent-core-green"
                />
                <span className="text-sm font-bold text-core-green w-10">{simMargem}%</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  label: 'Break-even',
                  v: simPrecos.breakEven,
                  sub: '0% de margem',
                  cls: 'text-slate-600 dark:text-slate-300',
                },
                {
                  label: `Margem ${simMargem}% (alvo)`,
                  v: simPrecos.alvo,
                  sub: 'preço sugerido',
                  cls: 'text-core-green',
                },
                {
                  label: 'Margem 30%',
                  v: simPrecos.ultra,
                  sub: 'premium',
                  cls: 'text-emerald-600',
                },
              ].map(({ label, v, sub, cls }) => (
                <div key={label} className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-3">
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">{label}</p>
                  <p className={`text-lg font-bold ${cls}`}>{v != null ? fmt(v) : 'inviável'}</p>
                  <p className="text-[11px] text-slate-400">{sub}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Cálculo: comissão marketplace 20% + DAS {configuracoes.aliquotaDAS ?? 0}% + Ads{' '}
              {configuracoes.percentualMarketing ?? 2}% + custo {fmt(simPrecos.custo)}
            </p>
          </div>
        )}
      </div>

      {/* Gráfico de vendas mensais */}
      {vendasMes.length > 0 && (
        <div className="card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
            Histórico de Vendas por Mês
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={vendasMes} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: C.slate }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: C.slate }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148,163,184,0.06)' }} />
              <Bar dataKey="Faturamento" fill={C.primary} radius={[3, 3, 0, 0]} />
              <Bar dataKey="Lucro Op." fill="#34d399" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Evolução do custo de compra */}
      {evolucaoCusto.length >= 2 && (
        <div className="card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
            Evolução do Custo de Compra
          </p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={evolucaoCusto} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: C.slate }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `R$${v.toFixed(2)}`}
                tick={{ fontSize: 11, fill: C.slate }}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <Tooltip
                formatter={(v: any) => [fmt(Number(v)), 'Custo Unit.']}
                contentStyle={{ fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="Custo Unit."
                stroke={C.orange}
                strokeWidth={2}
                dot={{ r: 4, fill: C.orange }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Clientes */}
      {topClientes.length > 0 && (
        <div className="card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
            Top Clientes — este produto
          </p>
          <div className="space-y-2">
            {topClientes.map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-4 text-right flex-shrink-0">{i + 1}</span>
                <span className="flex-1 text-sm text-slate-700 dark:text-slate-200 truncate">
                  {c.nome}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {c.pedidos}× ped.
                </span>
                <span className="text-xs font-medium text-core-green w-24 text-right">
                  {fmt(c.receita)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vendas recentes */}
      {todasVendas.length > 0 && (
        <div className="card overflow-hidden">
          <button
            className="w-full px-5 py-3.5 flex items-center justify-between text-left border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors"
            onClick={() => setShowVendas(!showVendas)}
          >
            <div className="flex items-center gap-2">
              <ShoppingCart size={13} className="text-slate-400" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Vendas ({todasVendas.length})
              </p>
            </div>
            {showVendas ? (
              <ChevronUp size={13} className="text-slate-400" />
            ) : (
              <ChevronDown size={13} className="text-slate-400" />
            )}
          </button>
          {showVendas && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                  <tr>
                    {['Data', 'Nº Pedido', 'Cliente', 'Qtd.', 'Receita', 'Lucro Op.', 'Status'].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {todasVendas.slice(0, 30).map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {p.data}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono text-slate-600 dark:text-slate-300">
                        {p.numeroPedido || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400 max-w-32 truncate">
                        {p.nomeCliente || '—'}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-100">
                        {p.unidadesEstoque}
                      </td>
                      <td className="px-4 py-2.5 text-core-green font-medium">{fmt(p.receita)}</td>
                      <td
                        className={`px-4 py-2.5 font-medium ${p.lucroOperacional >= 0 ? 'text-emerald-600' : 'text-red-500'}`}
                      >
                        {fmt(p.lucroOperacional)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            p.status === 'Concluído'
                              ? 'bg-emerald-50 text-emerald-700'
                              : p.status === 'Enviado'
                                ? 'bg-blue-50 text-blue-700'
                                : p.status === 'Devolvido'
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {todasVendas.length > 30 && (
                <p className="px-4 py-2 text-xs text-slate-400 text-center border-t border-slate-100 dark:border-slate-700">
                  Exibindo 30 de {todasVendas.length} vendas · use Exportar para ver todas
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tabela de compras */}
      {comprasSku.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Histórico de Compras ({comprasSku.length})
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  {['Data', 'Qtd.', 'Custo Unit.', 'Total', 'Fornecedor', 'Pagamento'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {comprasSku.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors"
                  >
                    <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                      {c.data}
                    </td>
                    <td className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-100">
                      {c.quantidadeEntrada}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                      {fmt(c.custoUnitario)}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-100">
                      {fmt(c.custoTotal)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">
                      {c.fornecedor || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">
                      {c.pagamento}
                      {c.parcelas > 1 ? ` ${c.parcelas}×` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                <tr>
                  <td
                    className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide"
                    colSpan={3}
                  >
                    Total investido
                  </td>
                  <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-slate-100">
                    {fmt(comprasSku.reduce((s, c) => s + c.custoTotal, 0))}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Tabela de ajustes */}
      {ajustesSku.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Ajustes Manuais de Estoque ({ajustesSku.length})
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  {['Data', 'Tipo', 'Qtd.', 'Antes', 'Depois', 'Motivo'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {ajustesSku.map((a) => (
                  <tr
                    key={a.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors"
                  >
                    <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                      {a.criadoEm.slice(0, 10)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.tipo === 'entrada' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}
                      >
                        {a.tipo === 'entrada' ? '+ Entrada' : '− Saída'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-100">
                      {a.quantidade}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">
                      {a.estoqueAntes}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200">
                      {a.estoqueDepois}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-400 dark:text-slate-500">
                      {a.motivo || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {todasVendas.length === 0 && comprasSku.length === 0 && ajustesSku.length === 0 && (
        <div className="card p-10 text-center">
          <TrendingUp size={28} className="text-slate-200 dark:text-slate-700 mx-auto mb-2" />
          <p className="text-slate-400 dark:text-slate-500 text-sm">
            Nenhuma venda, compra ou ajuste registrado para este SKU.
          </p>
        </div>
      )}
    </div>
  );
}
