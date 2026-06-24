import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bookmark,
  Calendar,
  CalendarRange,
  CalendarSearch,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  DollarSign,
  FlaskConical,
  HeartPulse,
  Layers,
  Package,
  PackagePlus,
  Percent,
  PieChart,
  Plus,
  ShoppingCart,
  Sun,
  Tag,
  Target,
  Telescope,
  TrendingUp,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import Onboarding from '../../../components/Onboarding';
import { useToast } from '../../../components/Toast';
import { useAlertas } from '../../../hooks/useAlertas';
import { useStore } from '../../../store';
import type { Compra, Pedido, Produto, Tarefa } from '../../../types';
import {
  agruparPorDia,
  fmt,
  fmtNum,
  fmtPct,
  getCapitalEstoque,
  getKPIsMes,
  getMesAnterior,
  getProjecaoMensal,
  getRankingProdutos,
  getStatusEstoque,
} from '../../../utils/calculations';
import { C } from '../../../utils/chartColors';

type QuickAction = 'compra' | 'venda' | 'tarefa';

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function diaSemana(): string {
  return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function QuickActionModal({
  produto,
  action,
  tarefasCount,
  onSaveCompra,
  onSaveVenda,
  onSaveTarefa,
  onClose,
}: {
  produto: Produto;
  action: QuickAction;
  tarefasCount: number;
  onSaveCompra: (c: Compra) => void;
  onSaveVenda: (p: Pedido) => void;
  onSaveTarefa: (t: Tarefa) => void;
  onClose: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    // compra
    qtd: 1,
    custoUnit: produto.custoUnitario,
    fornecedor: '',
    // venda
    numeroPedido: '',
    receita: 0,
    // tarefa
    titulo: `Reabastecer ${produto.sku}`,
    prioridade: 'media' as 'alta' | 'media' | 'baixa',
    dataVencimento: '',
    // shared
    data: today,
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const f =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((s) => ({
        ...s,
        [k]: e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value,
      }));

  const titles: Record<QuickAction, string> = {
    compra: 'Registrar Compra',
    venda: 'Registrar Venda',
    tarefa: 'Criar Tarefa',
  };

  const handleSave = () => {
    if (action === 'compra') {
      const custo = form.qtd * form.custoUnit;
      onSaveCompra({
        id: crypto.randomUUID(),
        sku: produto.sku,
        produto: produto.nome,
        data: form.data,
        quantidadeEntrada: form.qtd,
        custoUnitario: form.custoUnit,
        custoTotal: custo,
        fornecedor: form.fornecedor,
        nfRef: '',
        pagamento: 'À vista',
        parcelas: 1,
        valorParcela: custo,
        loja: produto.loja,
        observacoes: '',
      });
    } else if (action === 'venda') {
      const lucro = form.receita - produto.custoUnitario;
      onSaveVenda({
        id: crypto.randomUUID(),
        numeroPedido: form.numeroPedido || `MANUAL-${Date.now()}`,
        data: form.data,
        status: 'Concluído',
        loja: produto.loja,
        sku: produto.sku,
        produto: produto.nome,
        quantidade: form.qtd,
        multiplicadorKit: 1,
        unidadesEstoque: form.qtd,
        receita: form.receita,
        desconto: 0,
        custoTotal: produto.custoUnitario * form.qtd,
        taxaShopee: 0,
        dasImposto: 0,
        adsMarketing: 0,
        lucroOperacional: lucro,
        margemSCustoProduto:
          produto.custoUnitario > 0 ? (lucro / (produto.custoUnitario * form.qtd)) * 100 : 0,
        margemSCustoTotal: form.receita > 0 ? (lucro / form.receita) * 100 : 0,
      });
    } else {
      onSaveTarefa({
        id: crypto.randomUUID(),
        titulo: form.titulo,
        descricao: '',
        coluna: 'todo',
        posicao: tarefasCount,
        prioridade: form.prioridade,
        criadoEm: new Date().toISOString(),
        dataVencimento: form.dataVencimento || undefined,
      });
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
              {titles[action]}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {produto.sku} · {produto.nome.slice(0, 30)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {action === 'compra' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Quantidade</span>
                  <input
                    className="input mt-1"
                    type="number"
                    min="1"
                    value={form.qtd}
                    onChange={f('qtd')}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Custo Unit. (R$)
                  </span>
                  <input
                    className="input mt-1"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.custoUnit}
                    onChange={f('custoUnit')}
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs text-slate-500 dark:text-slate-400">Fornecedor</span>
                <input
                  className="input mt-1"
                  type="text"
                  placeholder="Opcional"
                  value={form.fornecedor}
                  onChange={f('fornecedor')}
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-500 dark:text-slate-400">Data</span>
                <input className="input mt-1" type="date" value={form.data} onChange={f('data')} />
              </label>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                Total:{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {fmt(form.qtd * form.custoUnit)}
                </span>
              </div>
            </>
          )}

          {action === 'venda' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Quantidade</span>
                  <input
                    className="input mt-1"
                    type="number"
                    min="1"
                    value={form.qtd}
                    onChange={f('qtd')}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Receita (R$)</span>
                  <input
                    className="input mt-1"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.receita}
                    onChange={f('receita')}
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs text-slate-500 dark:text-slate-400">Nº Pedido</span>
                <input
                  className="input mt-1"
                  type="text"
                  placeholder="Ex: 2411234567890"
                  value={form.numeroPedido}
                  onChange={f('numeroPedido')}
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-500 dark:text-slate-400">Data</span>
                <input className="input mt-1" type="date" value={form.data} onChange={f('data')} />
              </label>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                Lucro estimado:{' '}
                <span
                  className={`font-semibold ${form.receita - produto.custoUnitario * form.qtd >= 0 ? 'text-emerald-600' : 'text-red-500'}`}
                >
                  {fmt(form.receita - produto.custoUnitario * form.qtd)}
                </span>
              </div>
            </>
          )}

          {action === 'tarefa' && (
            <>
              <label className="block">
                <span className="text-xs text-slate-500 dark:text-slate-400">Título</span>
                <input
                  className="input mt-1"
                  type="text"
                  value={form.titulo}
                  onChange={f('titulo')}
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-500 dark:text-slate-400">Prioridade</span>
                <select className="select mt-1" value={form.prioridade} onChange={f('prioridade')}>
                  <option value="alta">Alta</option>
                  <option value="media">Média</option>
                  <option value="baixa">Baixa</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Vencimento (opcional)
                </span>
                <input
                  className="input mt-1"
                  type="date"
                  value={form.dataVencimento}
                  onChange={f('dataVencimento')}
                />
              </label>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-3">
          <button className="btn-secondary flex-1 justify-center" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary flex-1 justify-center" onClick={handleSave}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function calcDelta(curr: number, prev: number): number | undefined {
  return prev > 0 ? ((curr - prev) / prev) * 100 : undefined;
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const W = 56;
  const H = 18;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - ((v - min) / range) * (H - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const isUp = data[data.length - 1] >= data[0];
  return (
    <svg width={W} height={H} className="overflow-visible opacity-70">
      <polyline
        points={pts}
        fill="none"
        stroke={isUp ? C.primary : C.red}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function KPICard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  delta,
  sparkData,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  delta?: number;
  sparkData?: number[];
}) {
  return (
    <div className="card p-4 flex flex-col">
      <div className="flex items-start justify-between mb-2">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}
        >
          <Icon size={15} className="text-white" />
        </div>
        {sparkData && <Sparkline data={sparkData} />}
      </div>
      <p className="text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-wider leading-tight">
        {label}
      </p>
      <p className="text-slate-900 dark:text-slate-100 text-base font-bold mt-0.5 leading-tight">
        {value}
      </p>
      <div className="flex items-center gap-2 flex-wrap mt-0.5">
        {sub && <p className="text-slate-400 dark:text-slate-500 text-xs">{sub}</p>}
        {delta !== undefined && (
          <span
            className={`text-[10px] font-medium ${delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}
          >
            {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

function InsightCard({
  label,
  value,
  description,
  icon: Icon,
  iconColor,
  children,
}: {
  label: string;
  value: string;
  description?: string;
  icon: React.ElementType;
  iconColor: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <Icon size={13} className={iconColor} />
      </div>
      <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      {description && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{description}</p>
      )}
      {children}
    </div>
  );
}

type REntry = { dataKey?: string; value?: number; color?: string; name?: string };
type RTip = { active?: boolean; payload?: REntry[]; label?: string };

const CustomTooltip = ({ active, payload, label }: RTip) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-medium text-slate-700 dark:text-slate-200 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {fmt(p.value ?? 0)}
        </p>
      ))}
    </div>
  );
};

const BarTooltip = ({ active, payload, label }: RTip) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-medium text-slate-700 dark:text-slate-200 mb-1">{label}</p>
      <p style={{ color: payload[0].color }}>
        {payload[0].name}: {fmtNum(payload[0].value ?? 0)}
      </p>
    </div>
  );
};

function EmptyRanking({ mesLabel }: { mesLabel: string }) {
  return (
    <tr>
      <td colSpan={10}>
        <div className="py-14 flex flex-col items-center gap-4 text-center px-4">
          <div className="w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center">
            <ShoppingCart size={24} className="text-slate-300 dark:text-slate-500" />
          </div>
          <div>
            <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">
              Nenhum pedido em {mesLabel}
            </p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
              Registre pedidos na aba Vendas ou importe uma planilha.
            </p>
          </div>
          <Link
            to="/vendas"
            className="inline-flex items-center gap-2 px-4 py-2 bg-core-green text-white text-xs font-medium rounded-xl hover:bg-core-green-h transition-colors"
          >
            <Plus size={13} /> Registrar pedidos
          </Link>
        </div>
      </td>
    </tr>
  );
}

export default function Dashboard() {
  const toast = useToast();
  const pedidosAll = useStore((s) => s.pedidos);
  const produtosAll = useStore((s) => s.produtos);
  const despesas = useStore((s) => s.despesas);
  const tarefas = useStore((s) => s.tarefas);
  const historico = useStore((s) => s.historico);
  const lojaFiltro = useStore((s) => s.lojaFiltro);
  const configuracoes = useStore((s) => s.configuracoes);
  const addCompra = useStore((s) => s.addCompra);
  const addPedido = useStore((s) => s.addPedido);
  const addTarefa = useStore((s) => s.addTarefa);

  const pedidos = useMemo(
    () => (lojaFiltro ? pedidosAll.filter((p) => p.loja === lojaFiltro) : pedidosAll),
    [pedidosAll, lojaFiltro]
  );
  const produtos = useMemo(
    () =>
      lojaFiltro
        ? produtosAll.filter((p) => p.loja === lojaFiltro || p.loja === 'Ambas')
        : produtosAll,
    [produtosAll, lojaFiltro]
  );

  const [mesFiltro, setMesFiltro] = useState(() => new Date().toISOString().slice(0, 7));
  const [quickAction, setQuickAction] = useState<{ produto: Produto; action: QuickAction } | null>(
    null
  );

  const mesAtual = new Date().toISOString().slice(0, 7);
  const isCurrentMonth = mesFiltro === mesAtual;
  const mesLabel = new Date(mesFiltro + '-02').toLocaleString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  const prevMonth = () => {
    const [y, m] = mesFiltro.split('-').map(Number);
    setMesFiltro(new Date(y, m - 2, 1).toISOString().slice(0, 7));
  };
  const nextMonth = () => {
    const [y, m] = mesFiltro.split('-').map(Number);
    setMesFiltro(new Date(y, m, 1).toISOString().slice(0, 7));
  };

  const alertas = useAlertas();
  const kpis = useMemo(() => getKPIsMes(pedidos, mesFiltro), [pedidos, mesFiltro]);
  const kpisPrev = useMemo(
    () => getKPIsMes(pedidos, getMesAnterior(mesFiltro)),
    [pedidos, mesFiltro]
  );
  const capitalEstoque = useMemo(() => getCapitalEstoque(produtos), [produtos]);

  const projecao = useMemo(
    () => getProjecaoMensal(kpis.faturamento, mesFiltro),
    [kpis.faturamento, mesFiltro]
  );
  const chartData = useMemo(() => agruparPorDia(pedidos, mesFiltro), [pedidos, mesFiltro]);
  const ranking = useMemo(
    () => getRankingProdutos(pedidos.filter((p) => p.data.startsWith(mesFiltro))),
    [pedidos, mesFiltro]
  );
  const despesasDoMes = useMemo(
    () => despesas.filter((d) => d.data.startsWith(mesFiltro)).reduce((s, d) => s + d.valor, 0),
    [despesas, mesFiltro]
  );

  const chartAnual = useMemo(
    () =>
      [...historico]
        .sort((a, b) => a.mesAno.localeCompare(b.mesAno))
        .slice(-12)
        .map((h) => ({
          name: new Date(h.mesAno + '-02').toLocaleString('pt-BR', {
            month: 'short',
            year: '2-digit',
          }),
          faturamento: h.faturamentoBruto,
          lucro: h.lucroLiquido,
        })),
    [historico]
  );
  const limite30d = useMemo(() => new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10), []);

  const hoje7d = useMemo(() => {
    const d = new Date(Date.now() + 7 * 864e5);
    return d.toISOString().slice(0, 10);
  }, []);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const pedidosHoje = useMemo(() => pedidos.filter((p) => p.data === today), [pedidos, today]);
  const receitaHoje = useMemo(() => pedidosHoje.reduce((s, p) => s + p.receita, 0), [pedidosHoje]);
  const lucroHoje = useMemo(
    () => pedidosHoje.reduce((s, p) => s + p.lucroOperacional, 0),
    [pedidosHoje]
  );

  const proximasTarefas = useMemo(
    () =>
      tarefas
        .filter((t) => t.coluna !== 'done' && t.dataVencimento && t.dataVencimento <= hoje7d)
        .sort((a, b) => (a.dataVencimento ?? '').localeCompare(b.dataVencimento ?? ''))
        .slice(0, 6),
    [tarefas, hoje7d]
  );

  const [calMonth, setCalMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const prevCalMonth = () => {
    const [y, m] = calMonth.split('-').map(Number);
    setCalMonth(new Date(y, m - 2, 1).toISOString().slice(0, 7));
  };
  const nextCalMonth = () => {
    const [y, m] = calMonth.split('-').map(Number);
    setCalMonth(new Date(y, m, 1).toISOString().slice(0, 7));
  };
  const calMonthLabel = useMemo(() => {
    const [y, m] = calMonth.split('-').map(Number);
    return new Date(y, m - 1, 2).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  }, [calMonth]);
  const calTasksByDate = useMemo(() => {
    const map = new Map<string, Tarefa[]>();
    tarefas.forEach((t) => {
      if (!t.dataVencimento || !t.dataVencimento.startsWith(calMonth)) return;
      const list = map.get(t.dataVencimento) ?? [];
      list.push(t);
      map.set(t.dataVencimento, list);
    });
    return map;
  }, [tarefas, calMonth]);

  const produtosComStatus = useMemo(
    () =>
      produtos.map((p) => {
        const total = pedidos
          .filter(
            (o) =>
              o.sku === p.sku &&
              (o.status === 'Concluído' || o.status === 'Enviado') &&
              o.data >= limite30d
          )
          .reduce((s, o) => s + o.unidadesEstoque, 0);
        const vdDia = total / 30;
        const status = getStatusEstoque(p.estoqueAtual, vdDia, p.estoqueSeguranca);
        return { ...p, vdDia, status };
      }),
    [produtos, pedidos, limite30d]
  );

  const produtosRuptura = produtosComStatus.filter((p) => p.estoqueAtual === 0).length;
  const produtosAcabando = produtosComStatus.filter((p) => p.status === 'Estoque Baixo').length;
  const produtosParados = produtosComStatus.filter(
    (p) => p.vdDia === 0 && p.estoqueAtual > 0
  ).length;

  // Sparklines — last 30 days daily aggregates
  const sparklines = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const iso = d.toISOString().slice(0, 10);
      const dp = pedidos.filter(
        (p) => p.data === iso && (p.status === 'Concluído' || p.status === 'Enviado')
      );
      return {
        receita: dp.reduce((s, p) => s + p.receita, 0),
        pedidos: dp.length,
        lucro: dp.reduce((s, p) => s + p.lucroOperacional, 0),
        ticket: dp.length > 0 ? dp.reduce((s, p) => s + p.receita, 0) / dp.length : 0,
      };
    });
  }, [pedidos]);

  const FERRAMENTAS = [
    {
      to: '/analise',
      label: 'Análise',
      desc: 'DRE por período',
      icon: CalendarSearch,
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      fg: 'text-blue-600 dark:text-blue-400',
    },
    {
      to: '/previsao',
      label: 'Previsão',
      desc: 'Forecast de receita',
      icon: Telescope,
      bg: 'bg-sky-50 dark:bg-sky-950/30',
      fg: 'text-sky-600 dark:text-sky-400',
    },
    {
      to: '/abc',
      label: 'Curva ABC',
      desc: 'Ranking de produtos',
      icon: PieChart,
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      fg: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      to: '/simulador',
      label: 'Simulador',
      desc: 'Cenários de preço',
      icon: FlaskConical,
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      fg: 'text-amber-600 dark:text-amber-400',
    },
    {
      to: '/saude',
      label: 'Saúde',
      desc: 'Score do negócio',
      icon: HeartPulse,
      bg: 'bg-rose-50 dark:bg-rose-950/30',
      fg: 'text-rose-600 dark:text-rose-400',
    },
    {
      to: '/mapa-calor',
      label: 'Mapa Calor',
      desc: 'Padrões diários',
      icon: Activity,
      bg: 'bg-cyan-50 dark:bg-cyan-950/30',
      fg: 'text-cyan-600 dark:text-cyan-400',
    },
    {
      to: '/categorias',
      label: 'Categorias',
      desc: 'Por grupo de produto',
      icon: Bookmark,
      bg: 'bg-teal-50 dark:bg-teal-950/30',
      fg: 'text-teal-600 dark:text-teal-400',
    },
    {
      to: '/anual',
      label: 'Ano a Ano',
      desc: 'Comparativo anual',
      icon: CalendarRange,
      bg: 'bg-pink-50 dark:bg-pink-950/30',
      fg: 'text-pink-600 dark:text-pink-400',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <Onboarding />
      {/* Header — greeting + today KPIs */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-11 h-11 rounded-2xl bg-amber-400/20 flex items-center justify-center shrink-0">
          <Sun size={20} className="text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {saudacao()}, vendedor!
          </h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 capitalize">{diaSemana()}</p>
        </div>
        <div className="hidden sm:flex items-center gap-6 text-right ml-auto">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Receita hoje
            </p>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {fmt(receitaHoje)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Lucro hoje
            </p>
            <p
              className={`text-lg font-bold ${lucroHoje >= 0 ? 'text-core-green' : 'text-red-500'}`}
            >
              {fmt(lucroHoje)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Pedidos
            </p>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {pedidosHoje.length}
            </p>
          </div>
        </div>
      </div>

      {/* Mini Calendar + Agenda */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="card p-4 flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 capitalize flex items-center gap-2">
              <Calendar size={14} className="text-core-green" />
              {calMonthLabel}
            </h2>
            <div className="flex items-center gap-0.5">
              <button
                onClick={prevCalMonth}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors"
              >
                <ChevronLeft size={13} />
              </button>
              <button
                onClick={nextCalMonth}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors"
              >
                <ChevronRight size={13} />
              </button>
              <Link
                to="/calendario"
                className="text-xs text-core-green hover:text-core-green font-medium ml-2"
              >
                Ver tudo →
              </Link>
            </div>
          </div>
          {(() => {
            const [cy, cm0] = calMonth.split('-').map(Number);
            const cMonth = cm0 - 1;
            const offset = new Date(cy, cMonth, 1).getDay();
            const days = new Date(cy, cMonth + 1, 0).getDate();
            const count = Math.ceil((offset + days) / 7) * 7;
            const MINI_D = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
            return (
              <div className="grid grid-cols-7 gap-0.5 text-center">
                {MINI_D.map((d, i) => (
                  <div key={i} className="text-[9px] font-semibold text-slate-400 uppercase py-0.5">
                    {d}
                  </div>
                ))}
                {Array.from({ length: count }, (_, i) => {
                  const day = i - offset + 1;
                  const valid = day >= 1 && day <= days;
                  const date = valid
                    ? `${String(cy).padStart(4, '0')}-${String(cm0).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    : null;
                  const tasks = date ? (calTasksByDate.get(date) ?? []) : [];
                  const isToday = date === today;
                  return (
                    <div key={i} className="flex flex-col items-center py-1">
                      <span
                        className={`text-[11px] font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                          isToday
                            ? 'bg-core-green text-white'
                            : valid
                              ? 'text-slate-700 dark:text-slate-300'
                              : 'text-slate-200 dark:text-slate-700'
                        }`}
                      >
                        {valid ? day : ''}
                      </span>
                      {tasks.length > 0 && (
                        <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                          {tasks.slice(0, 3).map((t) => (
                            <span
                              key={t.id}
                              className={`w-1.5 h-1.5 rounded-full ${
                                t.prioridade === 'alta'
                                  ? 'bg-red-500'
                                  : t.prioridade === 'media'
                                    ? 'bg-amber-500'
                                    : 'bg-slate-400'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        <div className="card p-4 sm:w-64 flex flex-col gap-2 self-start">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Próximos 7 dias
          </h3>
          {proximasTarefas.length === 0 ? (
            <p className="text-xs text-slate-400 py-2 text-center">
              Sem tarefas com vencimento esta semana.
            </p>
          ) : (
            <div className="space-y-2">
              {proximasTarefas.map((t) => {
                const vencida = t.dataVencimento! < today;
                const hoje = t.dataVencimento === today;
                return (
                  <div key={t.id} className="flex items-start gap-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                        t.prioridade === 'alta'
                          ? 'bg-red-500'
                          : t.prioridade === 'media'
                            ? 'bg-amber-500'
                            : 'bg-slate-400'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700 dark:text-slate-200 truncate">
                        {t.titulo}
                      </p>
                      <p
                        className={`text-[11px] flex items-center gap-0.5 ${
                          vencida
                            ? 'text-red-500 font-medium'
                            : hoje
                              ? 'text-amber-500 font-medium'
                              : 'text-slate-400'
                        }`}
                      >
                        {vencida && <AlertCircle size={9} />}
                        {vencida ? 'Vencida' : hoje ? 'Hoje' : t.dataVencimento}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <Link
            to="/calendario"
            className="text-xs text-core-green hover:text-core-green font-medium mt-1"
          >
            Ver calendário →
          </Link>
        </div>
      </div>

      {/* Seletor de mês de referência */}
      <div className="flex items-center gap-1">
        <button
          onClick={prevMonth}
          className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs text-slate-500 dark:text-slate-400 capitalize font-medium px-1 min-w-28 text-center">
          {mesLabel}
        </span>
        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-30"
        >
          <ChevronRight size={14} />
        </button>
        {!isCurrentMonth && (
          <button
            onClick={() => setMesFiltro(mesAtual)}
            className="text-xs text-core-green hover:underline ml-1"
          >
            voltar ao mês atual
          </button>
        )}
      </div>

      {/* KPI Cards — Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KPICard
          label="Faturamento"
          value={fmt(kpis.faturamento)}
          icon={DollarSign}
          color="bg-core-green"
          delta={calcDelta(kpis.faturamento, kpisPrev.faturamento)}
          sparkData={sparklines.map((d) => d.receita)}
        />
        <KPICard
          label="Pedidos"
          value={fmtNum(kpis.pedidosMes)}
          icon={ShoppingCart}
          color="bg-blue-500"
          delta={calcDelta(kpis.pedidosMes, kpisPrev.pedidosMes)}
          sub="concluídos + enviados"
          sparkData={sparklines.map((d) => d.pedidos)}
        />
        <KPICard
          label="Lucro Operacional"
          value={fmt(kpis.lucroOp)}
          icon={TrendingUp}
          color="bg-emerald-500"
          delta={calcDelta(kpis.lucroOp, kpisPrev.lucroOp)}
          sparkData={sparklines.map((d) => d.lucro)}
        />
        <KPICard
          label="Despesas Op."
          value={fmt(despesasDoMes)}
          icon={Target}
          color="bg-slate-400"
          sub={despesasDoMes === 0 ? 'não lançadas' : undefined}
        />
        <KPICard
          label="Ticket Médio"
          value={fmt(kpis.ticket)}
          icon={Tag}
          color="bg-amber-500"
          delta={calcDelta(kpis.ticket, kpisPrev.ticket)}
          sparkData={sparklines.map((d) => d.ticket)}
        />
        <KPICard
          label="Lucro Líquido"
          value={fmt(kpis.lucroLiquido)}
          icon={TrendingUp}
          color="bg-emerald-600"
          delta={calcDelta(kpis.lucroLiquido, kpisPrev.lucroLiquido)}
        />
      </div>

      {/* KPI Cards — Row 2: Insights */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <InsightCard
          label="Margem Bruta"
          value={kpis.faturamento > 0 ? fmtPct(kpis.margem) : '—'}
          description="sobre o faturamento"
          icon={Percent}
          iconColor="text-slate-400"
        />
        <InsightCard
          label="ROI"
          value={kpis.custoTotal > 0 ? fmtPct(kpis.roi) : '—'}
          description="retorno sobre custo de produto"
          icon={TrendingUp}
          iconColor="text-slate-400"
        />
        <InsightCard
          label="Capital em Estoque"
          value={fmt(capitalEstoque)}
          description={`${produtos.filter((p) => p.estoqueAtual > 0).length} SKUs com saldo`}
          icon={Layers}
          iconColor="text-slate-400"
        >
          {produtosParados > 0 && (
            <p className="text-[10px] text-amber-500 font-medium mt-1">
              {produtosParados} SKUs parados sem venda
            </p>
          )}
        </InsightCard>
        {isCurrentMonth && projecao && projecao > 0 ? (
          <InsightCard
            label="Projeção Mensal"
            value={fmt(projecao)}
            description="estimado até fim do mês"
            icon={TrendingUp}
            iconColor="text-core-green"
          >
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 mb-1">
                <span>Realizado</span>
                <span>{fmtPct(Math.min(100, (kpis.faturamento / projecao) * 100))}</span>
              </div>
              <div className="bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                <div
                  className="bg-core-green h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (kpis.faturamento / projecao) * 100)}%` }}
                />
              </div>
            </div>
          </InsightCard>
        ) : (
          <InsightCard
            label="Alertas de Estoque"
            value={String(produtosRuptura + produtosAcabando)}
            description={`${produtosRuptura} em ruptura · ${produtosAcabando} estoque baixo`}
            icon={AlertTriangle}
            iconColor={
              produtosRuptura > 0
                ? 'text-red-500'
                : produtosAcabando > 0
                  ? 'text-amber-500'
                  : 'text-slate-400'
            }
          >
            <Link
              to="/estoque"
              className="text-[10px] text-core-green font-medium mt-2 inline-block"
            >
              Ver estoque →
            </Link>
          </InsightCard>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-slate-700 dark:text-slate-200 font-semibold text-sm mb-4 capitalize">
            Faturamento Diário — {mesLabel}
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#18B37A" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#18B37A" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradLucro" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.slate }} />
              <YAxis
                tick={{ fontSize: 11, fill: C.slate }}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="receita"
                name="Receita"
                stroke={C.primary}
                strokeWidth={2}
                fill="url(#gradReceita)"
              />
              <Area
                type="monotone"
                dataKey="lucro"
                name="Lucro Op."
                stroke={C.secondary}
                strokeWidth={2}
                fill="url(#gradLucro)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="text-slate-700 dark:text-slate-200 font-semibold text-sm mb-4 capitalize">
            Pedidos por Dia — {mesLabel}
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.slate }} />
              <YAxis tick={{ fontSize: 11, fill: C.slate }} allowDecimals={false} />
              <Tooltip content={<BarTooltip />} />
              <Bar dataKey="pedidos" name="Pedidos" fill={C.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ferramentas Rápidas */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-slate-700 dark:text-slate-200 font-semibold text-sm">
            Ferramentas Rápidas
          </h2>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            {FERRAMENTAS.length} ferramentas
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2">
          {FERRAMENTAS.map((f) => {
            const Icon = f.icon;
            return (
              <Link
                key={f.to}
                to={f.to}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all hover:shadow-sm group ${f.bg}`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${f.bg}`}>
                  <Icon size={18} className={f.fg} />
                </div>
                <div className="text-center">
                  <p className={`text-[11px] font-semibold leading-tight ${f.fg}`}>{f.label}</p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-tight mt-0.5">
                    {f.desc}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Widgets — Alertas + Metas */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Widget: Alertas */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertCircle
                size={15}
                className={
                  alertas.filter((a) => a.severidade === 'critico').length > 0
                    ? 'text-red-500'
                    : 'text-slate-300 dark:text-slate-600'
                }
              />
              <h2 className="text-slate-700 dark:text-slate-200 font-semibold text-sm">
                Alertas Ativos
              </h2>
              {alertas.length > 0 && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    alertas.filter((a) => a.severidade === 'critico').length > 0
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}
                >
                  {alertas.length}
                </span>
              )}
            </div>
            <Link
              to="/alertas"
              className="text-xs text-core-green font-medium flex items-center gap-1"
            >
              Ver todos <ArrowRight size={11} />
            </Link>
          </div>
          {alertas.length === 0 ? (
            <div className="flex items-center gap-3 py-3">
              <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center flex-shrink-0">
                <AlertCircle size={14} className="text-emerald-400" />
              </div>
              <p className="text-sm text-slate-400 dark:text-slate-500">
                Nenhum alerta ativo — tudo dentro dos parâmetros.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {alertas.slice(0, 4).map((a) => (
                <Link key={a.id} to={a.link ?? '/alertas'} className="block group">
                  <div
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl transition-colors ${
                      a.severidade === 'critico'
                        ? 'bg-red-50/60 dark:bg-red-950/15 hover:bg-red-50 dark:hover:bg-red-950/25'
                        : 'bg-amber-50/60 dark:bg-amber-950/15 hover:bg-amber-50 dark:hover:bg-amber-950/25'
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                        a.severidade === 'critico' ? 'bg-red-500' : 'bg-amber-400'
                      } ${a.severidade === 'critico' ? 'animate-pulse' : ''}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                        {a.titulo}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                        {a.descricao}
                      </p>
                    </div>
                    {a.valor && (
                      <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 flex-shrink-0">
                        {a.valor}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
              {alertas.length > 4 && (
                <Link
                  to="/alertas"
                  className="text-xs text-slate-400 hover:text-core-green transition-colors pl-5"
                >
                  +{alertas.length - 4} mais →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Widget: Metas do Mês */}
        {(() => {
          const cfg = configuracoes;
          const hoje = new Date();
          const diaAtual = hoje.getDate();
          const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
          const diasRestantes = diasNoMes - diaAtual;
          const kpisAtual = isCurrentMonth
            ? kpis
            : getKPIsMes(pedidos, hoje.toISOString().slice(0, 7));
          const metas = [
            {
              label: 'Faturamento',
              meta: cfg.metaFaturamento,
              atual: kpisAtual.faturamento,
              fmt: fmt,
            },
            {
              label: 'Pedidos',
              meta: cfg.metaPedidos,
              atual: kpisAtual.pedidosMes,
              fmt: (v: number) => String(Math.round(v)),
            },
            { label: 'Lucro Op.', meta: cfg.metaLucro, atual: kpisAtual.lucroOp, fmt: fmt },
            {
              label: 'Margem',
              meta: cfg.metaMargem,
              atual: kpisAtual.margem,
              fmt: (v: number) => `${v.toFixed(1)}%`,
            },
          ].filter((m) => m.meta && m.meta > 0);

          return (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target size={15} className="text-slate-400" />
                  <h2 className="text-slate-700 dark:text-slate-200 font-semibold text-sm">
                    Metas do Mês
                  </h2>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {diasRestantes}d restantes
                  </span>
                </div>
                <Link
                  to="/metas"
                  className="text-xs text-core-green font-medium flex items-center gap-1"
                >
                  Detalhar <ArrowRight size={11} />
                </Link>
              </div>
              {metas.length === 0 ? (
                <div className="flex items-center gap-3 py-3">
                  <Target size={20} className="text-slate-200 dark:text-slate-700 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-slate-400 dark:text-slate-500">
                      Nenhuma meta definida.
                    </p>
                    <Link to="/metas" className="text-xs text-core-green hover:underline">
                      Definir metas →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {metas.map(({ label, meta, atual, fmt: f }) => {
                    const pct = Math.min(100, (atual / meta!) * 100);
                    const cor =
                      pct >= 100
                        ? 'bg-emerald-500'
                        : pct >= 75
                          ? 'bg-amber-400'
                          : pct >= 50
                            ? 'bg-orange-400'
                            : 'bg-red-400';
                    return (
                      <div key={label}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-600 dark:text-slate-300 font-medium">
                            {label}
                          </span>
                          <span className="font-mono text-slate-500 dark:text-slate-400">
                            {f(atual)} <span className="text-slate-300 dark:text-slate-600">/</span>{' '}
                            {f(meta!)}
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${cor}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-right text-slate-400 dark:text-slate-500 mt-0.5">
                          {pct.toFixed(0)}%
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Gráfico Anual — historico_mensal */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-slate-700 dark:text-slate-200 font-semibold text-sm">
            Visão Anual — Faturamento &amp; Lucro Líquido
          </h2>
          <Link
            to="/financeiro"
            className="text-xs text-core-green hover:text-core-green font-medium flex items-center gap-1"
          >
            Fechar mês <ArrowRight size={12} />
          </Link>
        </div>
        {chartAnual.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center gap-2">
            <p className="text-slate-400 dark:text-slate-500 text-sm">Nenhum mês fechado ainda.</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs">
              Vá em{' '}
              <Link to="/financeiro" className="text-core-green hover:underline">
                Financeiro
              </Link>{' '}
              e clique em &ldquo;Lançar manualmente&rdquo; para registrar o histórico mensal.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartAnual} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.slate }} />
              <YAxis
                tick={{ fontSize: 11, fill: C.slate }}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value, name) => [
                  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    Number(value)
                  ),
                  name === 'faturamento' ? 'Faturamento' : 'Lucro Líquido',
                ]}
              />
              <Legend
                formatter={(v) => (v === 'faturamento' ? 'Faturamento' : 'Lucro Líquido')}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="faturamento" fill={C.primary} radius={[4, 4, 0, 0]} />
              <Bar dataKey="lucro" fill={C.secondary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Ranking de Produtos */}
      <div className="card">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-slate-700 dark:text-slate-200 font-semibold text-sm capitalize">
            Ranking de Produtos · {mesLabel}
          </h2>
          {ranking.length > 0 && (
            <Link
              to="/vendas"
              className="text-xs text-core-green hover:text-core-green font-medium flex items-center gap-1"
            >
              Ver vendas <ArrowRight size={12} />
            </Link>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                {[
                  'SKU',
                  'Produto',
                  'Pedidos',
                  'Unid.',
                  'Receita',
                  'Ticket Médio',
                  'Lucro Op.',
                  'Margem',
                  '% Receita',
                  'Curva',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {ranking.length === 0 ? (
                <EmptyRanking mesLabel={mesLabel} />
              ) : (
                ranking.map((r) => (
                  <tr
                    key={r.sku}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300 font-medium">
                      {r.sku}
                    </td>
                    <td className="px-4 py-3 text-slate-800 dark:text-slate-200 font-medium">
                      {r.produto}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.pedidos}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.unidades}</td>
                    <td className="px-4 py-3 text-slate-800 dark:text-slate-200 font-medium">
                      {fmt(r.receita)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {fmt(r.ticketMedio)}
                    </td>
                    <td className="px-4 py-3 text-emerald-600 font-medium">
                      {fmt(r.lucroOperacional)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          r.margem >= 30
                            ? 'text-emerald-600 font-medium'
                            : r.margem >= 15
                              ? 'text-amber-600'
                              : 'text-red-500'
                        }
                      >
                        {fmtPct(r.margem)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {fmtPct(r.percentReceita)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                          r.curvaABC === 'A'
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                            : r.curvaABC === 'B'
                              ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                              : r.curvaABC === 'C'
                                ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-400'
                        }`}
                      >
                        {r.curvaABC}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status de Estoque */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-slate-700 dark:text-slate-200 font-semibold text-sm flex items-center gap-2">
            <Package size={16} /> Status de Estoque
          </h2>
          <Link
            to="/estoque"
            className="text-xs text-core-green hover:text-core-green font-medium flex items-center gap-1"
          >
            Gerenciar <ArrowRight size={12} />
          </Link>
        </div>
        {produtos.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-slate-400 dark:text-slate-500 text-sm">Nenhum produto cadastrado.</p>
            <Link
              to="/configs"
              className="text-xs text-core-green hover:text-core-green mt-1 inline-block"
            >
              Cadastrar produtos →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {produtosComStatus.map((p) => {
              return (
                <div
                  key={p.sku}
                  className="relative group bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                      {p.sku}
                    </span>
                    <span
                      className={
                        p.status === 'Estoque Estável'
                          ? 'badge-ok'
                          : p.status === 'Estoque Baixo'
                            ? 'badge-critico'
                            : p.status === 'Estoque Acima'
                              ? 'badge-excesso'
                              : 'badge-ruptura'
                      }
                    >
                      {p.status}
                    </span>
                  </div>
                  <p className="text-slate-800 dark:text-slate-100 font-semibold text-lg">
                    {p.estoqueAtual}
                  </p>
                  <p className="text-slate-400 dark:text-slate-500 text-xs">
                    {p.nome.substring(0, 22)}
                  </p>

                  {/* Hover overlay com ações rápidas */}
                  <div className="absolute inset-0 rounded-lg bg-slate-900/70 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center gap-2">
                    {[
                      { action: 'compra' as const, icon: PackagePlus, title: 'Registrar compra' },
                      { action: 'venda' as const, icon: ShoppingCart, title: 'Registrar venda' },
                      { action: 'tarefa' as const, icon: ClipboardList, title: 'Criar tarefa' },
                    ].map(({ action, icon: Icon, title }) => (
                      <button
                        key={action}
                        title={title}
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickAction({ produto: p, action });
                        }}
                        className="w-9 h-9 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center justify-center transition-colors"
                      >
                        <Icon size={16} />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {quickAction && (
        <QuickActionModal
          produto={quickAction.produto}
          action={quickAction.action}
          tarefasCount={tarefas.length}
          onSaveCompra={(c) => {
            addCompra(c);
            toast('Compra registrada.', 'success');
          }}
          onSaveVenda={(p) => {
            addPedido(p);
            toast('Venda registrada.', 'success');
          }}
          onSaveTarefa={(t) => {
            addTarefa(t);
            toast('Tarefa criada.', 'success');
          }}
          onClose={() => setQuickAction(null)}
        />
      )}
    </div>
  );
}
