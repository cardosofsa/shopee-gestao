import { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, ShoppingCart, DollarSign, AlertTriangle, Package, Target, Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../store';
import { fmt, fmtNum, fmtPct, getKPIsMes, agruparPorDia, getRankingProdutos, getStatusEstoque } from '../utils/calculations';

function KPICard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">{label}</p>
        <p className="text-slate-900 text-2xl font-bold mt-0.5">{value}</p>
        {sub && <p className="text-slate-400 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-medium text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
};

const BarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-medium text-slate-700 mb-1">{label}</p>
      <p style={{ color: payload[0].color }}>{payload[0].name}: {fmtNum(payload[0].value)}</p>
    </div>
  );
};

export default function Dashboard() {
  const pedidos = useStore((s) => s.pedidos);
  const produtos = useStore((s) => s.produtos);
  const despesas = useStore((s) => s.despesas);

  const [mesFiltro, setMesFiltro] = useState(() => new Date().toISOString().slice(0, 7));

  const mesAtual = new Date().toISOString().slice(0, 7);
  const isCurrentMonth = mesFiltro === mesAtual;
  const mesLabel = new Date(mesFiltro + '-02').toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    const [y, m] = mesFiltro.split('-').map(Number);
    setMesFiltro(new Date(y, m - 2, 1).toISOString().slice(0, 7));
  };
  const nextMonth = () => {
    const [y, m] = mesFiltro.split('-').map(Number);
    setMesFiltro(new Date(y, m, 1).toISOString().slice(0, 7));
  };

  const kpis = useMemo(() => getKPIsMes(pedidos, mesFiltro), [pedidos, mesFiltro]);
  const chartData = useMemo(() => agruparPorDia(pedidos, mesFiltro), [pedidos, mesFiltro]);
  const ranking = useMemo(() => getRankingProdutos(pedidos.filter((p) => p.data.startsWith(mesFiltro))), [pedidos, mesFiltro]);

  const despesasDoMes = useMemo(
    () => despesas.filter((d) => d.data.startsWith(mesFiltro)).reduce((s, d) => s + d.valor, 0),
    [despesas, mesFiltro]
  );

  const limite30d = useMemo(() => new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10), []);

  const getVendaDia = (sku: string) => {
    const total = pedidos
      .filter((o) => o.sku === sku && (o.status === 'Concluído' || o.status === 'Enviado') && o.data >= limite30d)
      .reduce((s, o) => s + o.unidadesEstoque, 0);
    return total / 30;
  };

  const rupturas = useMemo(
    () => produtos.filter((p) => {
      const vdDia = getVendaDia(p.sku);
      return getStatusEstoque(p.estoqueAtual, vdDia, p.estoqueSeguranca) !== 'OK' && p.estoqueAtual < p.estoqueSeguranca;
    }),
    [pedidos, produtos, limite30d]
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm">Cardoso e-Shop + Projetando</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-slate-700 capitalize px-2 min-w-36 text-center">{mesLabel}</span>
          <button onClick={nextMonth} disabled={isCurrentMonth} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight size={16} />
          </button>
          {isCurrentMonth && (
            <span className="text-xs bg-shopee-100 text-shopee-700 font-medium px-2.5 py-1 rounded-full ml-1">
              Mês atual
            </span>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard label="Faturamento" value={fmt(kpis.faturamento)} icon={DollarSign} color="bg-shopee-500" />
        <KPICard label="Pedidos" value={fmtNum(kpis.pedidosMes)} sub="concluídos + enviados" icon={ShoppingCart} color="bg-blue-500" />
        <KPICard label="Lucro Operacional" value={fmt(kpis.lucroOp)} icon={TrendingUp} color="bg-emerald-500" />
        <KPICard label="Despesas Op." value={fmt(despesasDoMes)} sub={despesasDoMes === 0 ? 'não lançadas' : undefined} icon={Target} color="bg-slate-400" />
        <KPICard label="Ticket Médio" value={fmt(kpis.ticket)} icon={Tag} color="bg-amber-500" />
        <KPICard label="Lucro Líquido" value={fmt(kpis.lucroLiquido)} icon={TrendingUp} color="bg-emerald-600" />
      </div>

      {/* Alertas */}
      {rupturas.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-red-700 font-medium text-sm">Alerta de Estoque</p>
            <p className="text-red-600 text-xs mt-0.5">
              {rupturas.length} produto(s) com estoque crítico ou em ruptura:{' '}
              <span className="font-medium">{rupturas.map((p) => p.sku).join(', ')}</span>
            </p>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-slate-700 font-semibold text-sm mb-4 capitalize">Faturamento Diário — {mesLabel}</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradLucro" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="receita" name="Receita" stroke="#f97316" strokeWidth={2} fill="url(#gradReceita)" />
              <Area type="monotone" dataKey="lucro" name="Lucro Op." stroke="#10b981" strokeWidth={2} fill="url(#gradLucro)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="text-slate-700 font-semibold text-sm mb-4 capitalize">Pedidos por Dia — {mesLabel}</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip content={<BarTooltip />} />
              <Bar dataKey="pedidos" name="Pedidos" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ranking de Produtos */}
      <div className="card">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-slate-700 font-semibold text-sm capitalize">Ranking de Produtos · {mesLabel}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['SKU', 'Produto', 'Pedidos', 'Unid.', 'Receita', 'Ticket Médio', 'Lucro Op.', 'Margem', '% Receita', 'Curva'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {ranking.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-10 text-slate-300 text-sm">Nenhum pedido concluído neste mês.</td></tr>
              ) : ranking.map((r) => (
                <tr key={r.sku} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600 font-medium">{r.sku}</td>
                  <td className="px-4 py-3 text-slate-800 font-medium">{r.produto}</td>
                  <td className="px-4 py-3 text-slate-600">{r.pedidos}</td>
                  <td className="px-4 py-3 text-slate-600">{r.unidades}</td>
                  <td className="px-4 py-3 text-slate-800 font-medium">{fmt(r.receita)}</td>
                  <td className="px-4 py-3 text-slate-600">{fmt(r.ticketMedio)}</td>
                  <td className="px-4 py-3 text-emerald-600 font-medium">{fmt(r.lucroOperacional)}</td>
                  <td className="px-4 py-3">
                    <span className={r.margem >= 30 ? 'text-emerald-600 font-medium' : r.margem >= 15 ? 'text-amber-600' : 'text-red-500'}>
                      {fmtPct(r.margem)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{fmtPct(r.percentReceita)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                      r.curvaABC === 'A' ? 'bg-emerald-100 text-emerald-700' :
                      r.curvaABC === 'B' ? 'bg-amber-100 text-amber-700' :
                      r.curvaABC === 'C' ? 'bg-slate-100 text-slate-600' : 'bg-slate-50 text-slate-400'
                    }`}>{r.curvaABC}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status de Estoque */}
      <div className="card p-5">
        <h2 className="text-slate-700 font-semibold text-sm mb-4 flex items-center gap-2">
          <Package size={16} /> Status de Estoque
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {produtos.map((p) => {
            const vdDia = getVendaDia(p.sku);
            const status = getStatusEstoque(p.estoqueAtual, vdDia, p.estoqueSeguranca);
            return (
              <div key={p.sku} className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs text-slate-500">{p.sku}</span>
                  <span className={
                    status === 'OK' ? 'badge-ok' :
                    status === 'Crítico' ? 'badge-critico' :
                    status === 'Excesso' ? 'badge-excesso' : 'badge-ruptura'
                  }>{status}</span>
                </div>
                <p className="text-slate-800 font-semibold text-lg">{p.estoqueAtual}</p>
                <p className="text-slate-400 text-xs">{p.nome.substring(0, 22)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
