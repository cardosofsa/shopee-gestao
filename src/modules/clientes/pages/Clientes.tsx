import { useMemo, useState } from 'react';
import {
  Users, Trophy, RefreshCw, UserCheck, AlertTriangle, UserX,
  ChevronDown, ChevronUp, X, Download, Search,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Cell, AreaChart, Area,
} from 'recharts';
import { useStore } from '../../../store';
import { fmt, fmtPct } from '../../../utils/calculations';
import { exportXlsx } from '../../../utils/exportXlsx';
import { useToast } from '../../../components/Toast';
import type { Pedido } from '../../../types';
import { C } from '../../../utils/chartColors';

// ─── Types ───────────────────────────────────────────────────────────────────

type Segmento = 'VIP' | 'Fiel' | 'Novo' | 'Em Risco' | 'Inativo';

interface ClienteProfile {
  nome: string;
  pedidos: Pedido[];
  faturamento: number;
  lucro: number;
  margem: number;
  ticketMedio: number;
  ultimoPedido: string;
  diasDesdeUltimo: number;
  recorrente: boolean;
  devolveu: boolean;
  segmento: Segmento;
  primeiroPedido: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SEG_CONFIG: Record<Segmento, { label: string; icon: React.ElementType; badge: string; dot: string; color: string }> = {
  'VIP':      { label: 'VIP',      icon: Trophy,        badge: 'bg-amber-50  text-amber-700  border-amber-200',    dot: 'bg-amber-400',   color: C.amber },
  'Fiel':     { label: 'Fiel',     icon: UserCheck,     badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400', color: C.secondary },
  'Novo':     { label: 'Novo',     icon: Users,         badge: 'bg-blue-50   text-blue-700    border-blue-200',     dot: 'bg-blue-400',    color: C.blue },
  'Em Risco': { label: 'Em Risco', icon: AlertTriangle, badge: 'bg-orange-50 text-orange-700 border-orange-200',   dot: 'bg-orange-400',  color: C.orange },
  'Inativo':  { label: 'Inativo',  icon: UserX,         badge: 'bg-red-50    text-red-700     border-red-200',      dot: 'bg-red-400',     color: C.red },
};

const SEGMENTOS_ORDEM: Segmento[] = ['VIP', 'Fiel', 'Novo', 'Em Risco', 'Inativo'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function construirPerfis(pedidos: Pedido[]): ClienteProfile[] {
  const hoje = Date.now();
  const map  = new Map<string, Pedido[]>();

  pedidos.forEach((p) => {
    const nome = p.nomeCliente?.trim();
    if (!nome) return;
    const key = nome.toLowerCase();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  });

  const concluidos = (ps: Pedido[]) => ps.filter((p) => p.status === 'Concluído' || p.status === 'Enviado');

  const perfis = Array.from(map.entries()).map(([, ps]): ClienteProfile => {
    const nome    = ps[0].nomeCliente!;
    const validos = concluidos(ps);
    const fat     = validos.reduce((s, p) => s + p.receita, 0);
    const lucro   = validos.reduce((s, p) => s + p.lucroOperacional, 0);
    const datas   = ps.map((p) => p.data).sort();
    const ultimoPedido  = datas.at(-1) ?? '';
    const primeiroPedido = datas[0] ?? '';
    const diasUlt = Math.floor((hoje - new Date(ultimoPedido).getTime()) / 864e5);
    const devolveu = ps.some((p) => p.status === 'Devolvido');
    return {
      nome,
      pedidos: [...ps].sort((a, b) => b.data.localeCompare(a.data)),
      faturamento: fat,
      lucro,
      margem: fat > 0 ? (lucro / fat) * 100 : 0,
      ticketMedio: validos.length > 0 ? fat / validos.length : 0,
      ultimoPedido,
      primeiroPedido,
      diasDesdeUltimo: diasUlt,
      recorrente: validos.length >= 2,
      devolveu,
      segmento: 'Novo',
    };
  });

  const sorted    = [...perfis].sort((a, b) => b.faturamento - a.faturamento);
  const vipCutIdx = Math.max(0, Math.floor(sorted.length * 0.2) - 1);
  const vipCutFat = sorted[vipCutIdx]?.faturamento ?? Infinity;

  perfis.forEach((p) => {
    if (p.faturamento >= vipCutFat && perfis.length >= 5) {
      p.segmento = 'VIP';
    } else if (p.diasDesdeUltimo > 60) {
      p.segmento = 'Inativo';
    } else if (p.diasDesdeUltimo > 30) {
      p.segmento = 'Em Risco';
    } else if (p.recorrente) {
      p.segmento = 'Fiel';
    } else {
      p.segmento = 'Novo';
    }
  });

  return perfis.sort((a, b) => b.faturamento - a.faturamento);
}

// ─── SegBadge ─────────────────────────────────────────────────────────────────

function SegBadge({ seg }: { seg: Segmento }) {
  const { badge, dot, label } = SEG_CONFIG[seg];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
      {label}
    </span>
  );
}

// ─── ClienteModal ─────────────────────────────────────────────────────────────

function ClienteModal({ cliente, onClose }: { cliente: ClienteProfile; onClose: () => void }) {
  const validPedidos = cliente.pedidos.filter((p) => p.status !== 'Devolvido');

  const topProdutos = useMemo(() => {
    const map = new Map<string, { nome: string; qtd: number; receita: number }>();
    validPedidos.forEach((p) => {
      const prev = map.get(p.sku) ?? { nome: p.produto, qtd: 0, receita: 0 };
      map.set(p.sku, { nome: p.produto, qtd: prev.qtd + p.unidadesEstoque, receita: prev.receita + p.receita });
    });
    return [...map.values()].sort((a, b) => b.receita - a.receita).slice(0, 4);
  }, [validPedidos]);

  const diasComoCliente = useMemo(() => {
    if (!cliente.primeiroPedido) return 0;
    return Math.floor((Date.now() - new Date(cliente.primeiroPedido).getTime()) / 864e5);
  }, [cliente.primeiroPedido]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-300 flex-shrink-0">
                {cliente.nome.slice(0, 1).toUpperCase()}
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">{cliente.nome}</h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap ml-10">
              <SegBadge seg={cliente.segmento} />
              {cliente.recorrente && <span className="text-xs text-emerald-600 flex items-center gap-1"><RefreshCw size={10} /> recorrente</span>}
              {cliente.devolveu && <span className="text-xs text-red-400">teve devolução</span>}
              <span className="text-xs text-slate-400">{diasComoCliente}d como cliente</span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* KPIs */}
        <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
          {[
            { label: 'Pedidos', value: validPedidos.length.toString() },
            { label: 'Faturamento', value: fmt(cliente.faturamento) },
            { label: 'Ticket Médio', value: fmt(cliente.ticketMedio) },
            { label: 'Margem', value: fmtPct(cliente.margem) },
          ].map((k) => (
            <div key={k.label}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">{k.label}</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{k.value}</p>
            </div>
          ))}
        </div>

        {/* Top produtos */}
        {topProdutos.length > 0 && (
          <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-700">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Produtos Favoritos</p>
            <div className="flex flex-wrap gap-2">
              {topProdutos.map((p) => (
                <div key={p.nome} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate max-w-32">{p.nome}</span>
                  <span className="text-[10px] text-slate-400">{p.qtd}×</span>
                  <span className="text-[10px] text-core-green font-medium">{fmt(p.receita)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pedidos list */}
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
              <tr>
                {['Data', 'Nº Pedido', 'Produto', 'Status', 'Receita', 'Lucro'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {cliente.pedidos.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">{p.data}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-600 dark:text-slate-300">{p.numeroPedido}</td>
                  <td className="px-4 py-2.5 text-slate-700 dark:text-slate-200 max-w-[180px] truncate">{p.produto}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      p.status === 'Concluído' ? 'bg-emerald-50 text-emerald-700' :
                      p.status === 'Enviado'   ? 'bg-blue-50 text-blue-700' :
                      p.status === 'Devolvido' ? 'bg-red-50 text-red-600' :
                                                 'bg-slate-100 text-slate-500'
                    }`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-700 dark:text-slate-200">{fmt(p.receita)}</td>
                  <td className={`px-4 py-2.5 font-medium ${p.lucroOperacional >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {fmt(p.lucroOperacional)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 shadow-lg text-xs">
      <p className="font-medium text-slate-600 dark:text-slate-300 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color ?? p.fill }}>{p.name}: {typeof p.value === 'number' && p.value > 100 ? fmt(p.value) : p.value}</p>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Clientes() {
  const toast       = useToast();
  const pedidosAll  = useStore((s) => s.pedidos);
  const lojaFiltro  = useStore((s) => s.lojaFiltro);

  const [segFiltro,    setSegFiltro]    = useState<Segmento | null>(null);
  const [busca,        setBusca]        = useState('');
  const [sortCol,      setSortCol]      = useState<'faturamento' | 'pedidos' | 'ticket' | 'diasDesdeUltimo'>('faturamento');
  const [sortDir,      setSortDir]      = useState<'asc' | 'desc'>('desc');
  const [clienteModal, setClienteModal] = useState<ClienteProfile | null>(null);

  const pedidos = useMemo(
    () => lojaFiltro ? pedidosAll.filter((p) => p.loja === lojaFiltro || p.loja === 'Ambas') : pedidosAll,
    [pedidosAll, lojaFiltro],
  );

  const perfis = useMemo(() => construirPerfis(pedidos), [pedidos]);
  const temNomes = perfis.length > 0;

  const kpis = useMemo(() => {
    const total        = perfis.length;
    const recorrentes  = perfis.filter((p) => p.recorrente).length;
    const fat          = perfis.reduce((s, p) => s + p.faturamento, 0);
    const pedidosValidos = pedidos.filter((p) => p.status === 'Concluído' || p.status === 'Enviado');
    const ticketGeral  = pedidosValidos.length > 0 ? fat / pedidosValidos.length : 0;
    const porSeg       = Object.fromEntries(SEGMENTOS_ORDEM.map((s) => [s, perfis.filter((p) => p.segmento === s).length]));
    const vips         = perfis.filter((p) => p.segmento === 'VIP');
    const ltvVip       = vips.length > 0 ? vips.reduce((s, p) => s + p.faturamento, 0) / vips.length : 0;
    const taxaRetencao = total > 0 ? (recorrentes / total) * 100 : 0;
    return { total, recorrentes, ticketGeral, porSeg, ltvVip, taxaRetencao };
  }, [perfis, pedidos]);

  const segChartData = useMemo(() =>
    SEGMENTOS_ORDEM
      .map((seg) => {
        const grupo = perfis.filter((p) => p.segmento === seg);
        return {
          seg,
          label: SEG_CONFIG[seg].label,
          clientes: grupo.length,
          receita: grupo.reduce((s, p) => s + p.faturamento, 0),
          fill: SEG_CONFIG[seg].color,
        };
      })
      .filter((d) => d.clientes > 0),
  [perfis]);

  const aquisicaoMes = useMemo(() => {
    const map = new Map<string, { novos: number; recorrentes: number }>();
    perfis.forEach((c) => {
      if (!c.primeiroPedido) return;
      const mes = c.primeiroPedido.slice(0, 7);
      const prev = map.get(mes) ?? { novos: 0, recorrentes: 0 };
      map.set(mes, {
        novos: prev.novos + 1,
        recorrentes: prev.recorrentes + (c.recorrente ? 1 : 0),
      });
    });
    const labels = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([mes, d]) => {
        const [y, m] = mes.split('-');
        return { name: `${labels[parseInt(m) - 1]}/${y.slice(2)}`, ...d };
      });
  }, [perfis]);

  const ltvPorSeg = useMemo(() =>
    SEGMENTOS_ORDEM.map((seg) => {
      const grupo = perfis.filter((p) => p.segmento === seg);
      return {
        seg, label: SEG_CONFIG[seg].label,
        ltv: grupo.length > 0 ? grupo.reduce((s, p) => s + p.faturamento, 0) / grupo.length : 0,
        fill: SEG_CONFIG[seg].color,
      };
    }).filter((d) => d.ltv > 0),
  [perfis]);

  const filtrados = useMemo(() => {
    let res = perfis;
    if (segFiltro) res = res.filter((p) => p.segmento === segFiltro);
    if (busca.trim()) {
      const q = busca.toLowerCase();
      res = res.filter((p) => p.nome.toLowerCase().includes(q));
    }
    return [...res].sort((a, b) => {
      const va = sortCol === 'pedidos'         ? a.pedidos.length
               : sortCol === 'ticket'          ? a.ticketMedio
               : sortCol === 'diasDesdeUltimo' ? a.diasDesdeUltimo
               :                                 a.faturamento;
      const vb = sortCol === 'pedidos'         ? b.pedidos.length
               : sortCol === 'ticket'          ? b.ticketMedio
               : sortCol === 'diasDesdeUltimo' ? b.diasDesdeUltimo
               :                                 b.faturamento;
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [perfis, segFiltro, busca, sortCol, sortDir]);

  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const SortIcon = ({ col }: { col: typeof sortCol }) =>
    sortCol !== col ? null :
    sortDir === 'asc' ? <ChevronUp size={11} className="text-core-green" /> : <ChevronDown size={11} className="text-core-green" />;

  const SortTh = ({ col, label }: { col: typeof sortCol; label: string }) => (
    <th onClick={() => toggleSort(col)}
      className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
      <span className="flex items-center gap-1">{label}<SortIcon col={col} /></span>
    </th>
  );

  const handleExport = () => {
    exportXlsx(`clientes_${new Date().toISOString().slice(0, 10)}.xlsx`, [{
      name: 'Clientes',
      headers: ['Nome', 'Segmento', 'Pedidos', 'Faturamento', 'Ticket Médio', 'Margem %', 'Lucro Op.', 'Último Pedido', 'Dias Inativo', 'Recorrente', 'Devolução'],
      rows: filtrados.map((c) => [
        c.nome, c.segmento,
        c.pedidos.filter((p) => p.status !== 'Devolvido').length,
        c.faturamento, c.ticketMedio, parseFloat(c.margem.toFixed(2)),
        c.lucro, c.ultimoPedido, c.diasDesdeUltimo,
        c.recorrente ? 'Sim' : 'Não',
        c.devolveu ? 'Sim' : 'Não',
      ]),
    }]);
    toast(`${filtrados.length} clientes exportados.`, 'success');
  };

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">CRM de Clientes</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Segmentação, LTV e histórico · extraído dos pedidos</p>
        </div>
        {temNomes && (
          <button onClick={handleExport} className="btn-secondary text-xs py-1.5 px-3">
            <Download size={13} /> Exportar
          </button>
        )}
      </div>

      {/* Empty state */}
      {!temNomes && (
        <div className="card p-12 text-center">
          <Users size={36} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">Nenhum cliente identificado</h3>
          <p className="text-slate-400 dark:text-slate-500 text-sm max-w-sm mx-auto">
            Os dados são extraídos automaticamente ao importar CSVs do Shopee Seller Center.
            O campo <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-1 rounded">Nome do Destinatário</span> precisa estar preenchido.
          </p>
        </div>
      )}

      {temNomes && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="card p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Total Clientes</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{kpis.total}</p>
              <p className="text-xs text-slate-400 mt-0.5">identificados nos pedidos</p>
            </div>
            <div className="card p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Taxa de Retenção</p>
              <p className="text-2xl font-bold text-emerald-600">{kpis.taxaRetencao.toFixed(0)}%</p>
              <p className="text-xs text-slate-400 mt-0.5">{kpis.recorrentes} recorrentes</p>
            </div>
            <div className="card p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Ticket Médio Geral</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{fmt(kpis.ticketGeral)}</p>
              <p className="text-xs text-slate-400 mt-0.5">por pedido</p>
            </div>
            <div className="card p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">LTV Médio VIP</p>
              <p className="text-2xl font-bold text-amber-500">{kpis.ltvVip > 0 ? fmt(kpis.ltvVip) : '—'}</p>
              <p className="text-xs text-slate-400 mt-0.5">{kpis.porSeg['VIP'] ?? 0} clientes VIP</p>
            </div>
          </div>

          {/* Analytics Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

            {/* Receita por Segmento */}
            <div className="card p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Receita por Segmento</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={segChartData} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: C.slate }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: C.slate }} axisLine={false} tickLine={false} width={56} />
                  <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(148,163,184,0.06)' }} />
                  <Bar dataKey="receita" name="Receita" radius={[0, 4, 4, 0]}>
                    {segChartData.map((d) => <Cell key={d.seg} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Aquisição de Clientes por Mês */}
            {aquisicaoMes.length >= 2 ? (
              <div className="card p-5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Novos Clientes por Mês</p>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={aquisicaoMes} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradNovos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#18B37A" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#18B37A" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.slate }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: C.slate }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip content={<ChartTip />} />
                    <Area type="monotone" dataKey="novos" name="Novos" stroke={C.primary} strokeWidth={2} fill="url(#gradNovos)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="card p-5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">LTV Médio por Segmento</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={ltvPorSeg} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: C.slate }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: C.slate }} axisLine={false} tickLine={false} width={56} />
                    <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(148,163,184,0.06)' }} />
                    <Bar dataKey="ltv" name="LTV Médio" radius={[0, 4, 4, 0]}>
                      {ltvPorSeg.map((d) => <Cell key={d.seg} fill={d.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Segment filter chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setSegFiltro(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                segFiltro === null
                  ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-800 dark:border-slate-200'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}>
              Todos ({kpis.total})
            </button>
            {SEGMENTOS_ORDEM.map((seg) => {
              const { badge, dot, label } = SEG_CONFIG[seg];
              const count = kpis.porSeg[seg] ?? 0;
              if (count === 0) return null;
              return (
                <button key={seg} onClick={() => setSegFiltro(segFiltro === seg ? null : seg)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    segFiltro === seg ? badge : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                  {label} ({count})
                  {segFiltro === seg && <X size={10} />}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-8" placeholder="Buscar cliente…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Segmento</th>
                    <SortTh col="pedidos"         label="Pedidos" />
                    <SortTh col="faturamento"     label="Faturamento" />
                    <SortTh col="ticket"          label="Ticket Médio" />
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Margem</th>
                    <SortTh col="diasDesdeUltimo" label="Último Pedido" />
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {filtrados.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400 text-sm">Nenhum cliente encontrado.</td>
                    </tr>
                  ) : filtrados.map((c) => (
                    <tr key={c.nome}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors cursor-pointer"
                      onClick={() => setClienteModal(c)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                            {c.nome.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800 dark:text-slate-200 text-sm leading-tight">{c.nome}</p>
                            {c.devolveu && <p className="text-[10px] text-red-400 leading-tight">teve devolução</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><SegBadge seg={c.segmento} /></td>
                      <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100">
                        {c.pedidos.filter((p) => p.status !== 'Devolvido').length}
                        {c.recorrente && <span title="Recorrente"><RefreshCw size={10} className="inline ml-1 text-emerald-400" /></span>}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{fmt(c.faturamento)}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{fmt(c.ticketMedio)}</td>
                      <td className={`px-4 py-3 font-medium ${c.margem >= 20 ? 'text-emerald-600' : c.margem >= 10 ? 'text-amber-500' : 'text-red-500'}`}>
                        {fmtPct(c.margem)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-slate-600 dark:text-slate-300">{c.ultimoPedido}</p>
                        <p className={`text-[10px] ${c.diasDesdeUltimo > 60 ? 'text-red-400' : c.diasDesdeUltimo > 30 ? 'text-amber-500' : 'text-slate-400'}`}>
                          {c.diasDesdeUltimo === 0 ? 'hoje' : `${c.diasDesdeUltimo}d atrás`}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-300 dark:text-slate-600">›</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtrados.length > 0 && (
              <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between text-xs text-slate-400 dark:text-slate-500">
                <span>{filtrados.length} cliente{filtrados.length !== 1 ? 's' : ''}</span>
                <span>LTV total: <span className="font-medium text-slate-600 dark:text-slate-300">{fmt(filtrados.reduce((s, c) => s + c.faturamento, 0))}</span></span>
              </div>
            )}
          </div>
        </>
      )}

      {clienteModal && (
        <ClienteModal cliente={clienteModal} onClose={() => setClienteModal(null)} />
      )}
    </div>
  );
}
