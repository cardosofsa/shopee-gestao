import { useState, useMemo } from 'react';
import {
  RotateCcw, TrendingDown, AlertTriangle, Package, Download,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, LineChart, Line, Legend,
} from 'recharts';
import { useStore } from '../store';
import { fmt, fmtPct } from '../utils/calculations';
import { exportXlsx } from '../utils/exportXlsx';
import { C } from '../utils/chartColors';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function monthLabel(m: string) {
  return new Date(m + '-02').toLocaleString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KCard({ label, value, sub, warn, icon: Icon }: {
  label: string; value: string; sub?: string; warn?: boolean; icon: React.ElementType;
}) {
  return (
    <div className={`card p-4 ${warn ? 'ring-1 ring-red-200 dark:ring-red-800' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
        <Icon size={13} className={warn ? 'text-red-400' : 'text-slate-400'} />
      </div>
      <p className={`text-xl font-bold ${warn ? 'text-red-500' : 'text-slate-900 dark:text-slate-100'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const JANELA_OPTS = [
  { label: 'Últimos 3 meses', value: 3 },
  { label: 'Últimos 6 meses', value: 6 },
  { label: 'Últimos 12 meses', value: 12 },
  { label: 'Todo o histórico', value: 999 },
];

export default function Devolucoes() {
  const pedidosAll = useStore((s) => s.pedidos);
  const lojaFiltro = useStore((s) => s.lojaFiltro);

  const [janela,   setJanela]   = useState(6);
  const [buscaSku, setBuscaSku] = useState('');

  const hoje = new Date();
  const cutoff = useMemo(() => {
    if (janela === 999) return '1970-01-01';
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - janela + 1, 1);
    return d.toISOString().slice(0, 7) + '-01';
  }, [janela]);

  const pedidos = useMemo(
    () => (lojaFiltro ? pedidosAll.filter((p) => p.loja === lojaFiltro) : pedidosAll)
      .filter((p) => p.data >= cutoff),
    [pedidosAll, lojaFiltro, cutoff],
  );

  // Devolvidos vs concluídos/enviados
  const devolvidos   = useMemo(() => pedidos.filter((p) => p.status === 'Devolvido'),   [pedidos]);
  const concluidos   = useMemo(() => pedidos.filter((p) => p.status === 'Concluído' || p.status === 'Enviado'), [pedidos]);
  const emProcesso   = useMemo(() => pedidos.filter((p) => p.status === 'Em processo'), [pedidos]);

  const totalDev     = devolvidos.length;
  const receitaPerdida = useMemo(() => devolvidos.reduce((s, p) => s + p.receita, 0), [devolvidos]);
  const taxaDev      = (concluidos.length + totalDev) > 0
    ? (totalDev / (concluidos.length + totalDev)) * 100 : 0;
  const ticketMedioDev = totalDev > 0 ? receitaPerdida / totalDev : 0;

  // ── Por produto ──────────────────────────────────────────────────────────
  const porProduto = useMemo(() => {
    const devMap  = new Map<string, { nome: string; dev: number; recPerd: number }>();
    const totMap  = new Map<string, number>(); // total (dev + concl) per sku

    pedidos.forEach((p) => {
      const cur = totMap.get(p.sku) ?? 0;
      if (p.status === 'Devolvido') {
        const d = devMap.get(p.sku) ?? { nome: p.produto, dev: 0, recPerd: 0 };
        devMap.set(p.sku, { nome: p.produto, dev: d.dev + 1, recPerd: d.recPerd + p.receita });
      }
      if (p.status !== 'Em processo') totMap.set(p.sku, cur + 1);
    });

    return [...devMap.entries()]
      .map(([sku, d]) => ({
        sku, nome: d.nome, dev: d.dev, recPerd: d.recPerd,
        taxa: totMap.get(sku) ? (d.dev / totMap.get(sku)!) * 100 : 100,
      }))
      .sort((a, b) => b.dev - a.dev);
  }, [pedidos]);

  // ── Por mês ──────────────────────────────────────────────────────────────
  const porMes = useMemo(() => {
    const N = Math.min(janela === 999 ? 24 : janela, 24);
    return Array.from({ length: N }, (_, i) => {
      const d   = new Date(hoje.getFullYear(), hoje.getMonth() - (N - 1 - i), 1);
      const mes = d.toISOString().slice(0, 7);
      const dev = pedidos.filter((p) => p.data.startsWith(mes) && p.status === 'Devolvido').length;
      const tot = pedidos.filter((p) => p.data.startsWith(mes) && p.status !== 'Em processo').length;
      const taxa = tot > 0 ? (dev / tot) * 100 : 0;
      return { name: monthLabel(mes), dev, tot, taxa: parseFloat(taxa.toFixed(1)) };
    });
  }, [pedidos, janela]);

  // ── Lista filtrada de devoluções ─────────────────────────────────────────
  const listaFiltrada = useMemo(() => {
    return devolvidos
      .filter((p) => {
        if (!buscaSku) return true;
        const q = buscaSku.toLowerCase();
        return p.sku.toLowerCase().includes(q) || p.produto.toLowerCase().includes(q);
      })
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [devolvidos, buscaSku]);

  const exportar = () => {
    const headers = ['Data', 'Pedido', 'SKU', 'Produto', 'Loja', 'Receita Perdida (R$)', 'Quantidade'];
    const rows = listaFiltrada.map((p) => [p.data, p.numeroPedido, p.sku, p.produto, p.loja, p.receita.toFixed(2), p.quantidade]);
    exportXlsx('devolucoes', [{ name: 'Devoluções', headers, rows }]);
  };

  // Produtos com taxa acima do dobro da média geral
  const taxaMedia = taxaDev;
  const alertaProdutos = porProduto.filter((p) => p.taxa > taxaMedia * 2 && p.dev >= 2);

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/20 flex items-center justify-center">
            <RotateCcw size={18} className="text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Devoluções</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Pedidos devolvidos e impacto na receita</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Janela selector */}
          <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
            {JANELA_OPTS.map((o) => (
              <button
                key={o.value}
                onClick={() => setJanela(o.value)}
                className={`px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  janela === o.value
                    ? 'bg-core-green text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <button onClick={exportar} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium">
            <Download size={12} /> Exportar
          </button>
        </div>
      </div>

      {/* Alerta produtos problemáticos */}
      {alertaProdutos.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl">
          <AlertTriangle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              {alertaProdutos.length} produto{alertaProdutos.length > 1 ? 's' : ''} com taxa de devolução acima do dobro da média
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {alertaProdutos.map((p) => (
                <span key={p.sku} className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full">
                  {p.nome} ({fmtPct(p.taxa)})
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KCard label="Devoluções"       value={String(totalDev)}          sub={`em ${janela === 999 ? 'todo o histórico' : `${janela} meses`}`} warn={totalDev > 0} icon={RotateCcw} />
        <KCard label="Receita perdida"  value={fmt(receitaPerdida)}        sub="soma dos pedidos devolvidos"       warn={receitaPerdida > 0}     icon={TrendingDown} />
        <KCard label="Taxa de devolução" value={taxaDev > 0 ? fmtPct(taxaDev) : '0%'} sub="% do total de pedidos finalizados" warn={taxaDev >= 5}          icon={AlertTriangle} />
        <KCard label="Ticket médio dev." value={ticketMedioDev > 0 ? fmt(ticketMedioDev) : '—'} sub="valor médio devolvido"              icon={Package} />
      </div>

      {totalDev === 0 ? (
        <div className="card p-14 text-center">
          <RotateCcw size={36} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">Nenhuma devolução encontrada</h3>
          <p className="text-slate-400 dark:text-slate-500 text-sm">
            {janela !== 999 ? 'Tente ampliar o período de análise.' : 'Ótimo — nenhum pedido com status Devolvido.'}
          </p>
          {emProcesso.length > 0 && (
            <p className="text-xs text-amber-500 mt-3 flex items-center justify-center gap-1">
              <AlertTriangle size={11} /> {emProcesso.length} pedido{emProcesso.length > 1 ? 's' : ''} ainda em processamento
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

            {/* Tendência mensal */}
            <div className="card p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
                Devoluções por Mês
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={porMes} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.slate }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left"  tick={{ fontSize: 9, fill: C.slate }} axisLine={false} tickLine={false} width={24} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: C.slate }} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} width={32} />
                  <Tooltip formatter={(v: unknown, name: unknown) => [name === 'taxa' ? `${v}%` : String(v), name === 'taxa' ? 'Taxa (%)' : 'Devoluções']} contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line yAxisId="left"  type="monotone" dataKey="dev"  name="Devoluções" stroke={C.red} strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="taxa" name="Taxa (%)"    stroke={C.orange} strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Top produtos devolvidos */}
            <div className="card p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
                Produtos com Mais Devoluções
              </p>
              {porProduto.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Sem dados</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={porProduto.slice(0, 8).map((p) => ({
                      name: p.nome.length > 14 ? p.nome.slice(0, 14) + '…' : p.nome,
                      dev: p.dev,
                      taxa: parseFloat(p.taxa.toFixed(1)),
                    }))}
                    layout="vertical"
                    margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 9, fill: C.slate }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 9, fill: C.slate }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v: unknown, name: unknown) => [name === 'taxa' ? `${v}%` : String(v), name === 'taxa' ? 'Taxa' : 'Qtd devolvida']}
                      contentStyle={{ fontSize: 11 }}
                    />
                    <Bar dataKey="dev" name="Devoluções" radius={[0, 3, 3, 0]}>
                      {porProduto.slice(0, 8).map((p, i) => (
                        <Cell key={i} fill={p.taxa > taxaMedia * 2 ? C.red : C.slate} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Tabela por produto */}
          {porProduto.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Análise por Produto
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800">
                      {['Produto', 'Devoluções', 'Receita perdida', 'Taxa dev.', 'Risco'].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {porProduto.map((p) => {
                      const risco = p.taxa >= 15 ? 'Alto' : p.taxa >= 7 ? 'Médio' : 'Baixo';
                      const riscoClr = risco === 'Alto' ? 'text-red-500 bg-red-50 dark:bg-red-950/20' : risco === 'Médio' ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/20' : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20';
                      return (
                        <tr key={p.sku} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-slate-800 dark:text-slate-100 truncate max-w-[200px]">{p.nome}</p>
                            <p className="text-xs text-slate-400 font-mono">{p.sku}</p>
                          </td>
                          <td className="px-4 py-2.5 font-bold text-red-500">{p.dev}</td>
                          <td className="px-4 py-2.5 font-mono text-slate-700 dark:text-slate-200">{fmt(p.recPerd)}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${p.taxa >= 15 ? 'bg-red-400' : p.taxa >= 7 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                                  style={{ width: `${Math.min(100, p.taxa * 4)}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{fmtPct(p.taxa)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${riscoClr}`}>{risco}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Lista de devoluções */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pedidos Devolvidos ({listaFiltrada.length})
              </p>
              <input
                value={buscaSku}
                onChange={(e) => setBuscaSku(e.target.value)}
                placeholder="Filtrar por SKU ou produto…"
                className="input-field text-xs py-1.5 w-52"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800">
                    {['Data', 'Nº Pedido', 'Produto', 'Qtd', 'Receita perdida'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {listaFiltrada.slice(0, 50).map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
                        {new Date(p.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-600 dark:text-slate-300">{p.numeroPedido || '—'}</td>
                      <td className="px-4 py-2.5">
                        <p className="text-slate-700 dark:text-slate-200 truncate max-w-[200px]">{p.produto}</p>
                        <p className="text-xs text-slate-400 font-mono">{p.sku}</p>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{p.quantidade}</td>
                      <td className="px-4 py-2.5 font-mono font-semibold text-red-500">{fmt(p.receita)}</td>
                    </tr>
                  ))}
                  {listaFiltrada.length > 50 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-2.5 text-xs text-slate-400 text-center">
                        +{listaFiltrada.length - 50} registros — use Exportar para ver todos
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {listaFiltrada.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">Nenhuma devolução encontrada com esse filtro.</p>
              )}
            </div>
          </div>

          {/* Em Processo */}
          {emProcesso.length > 0 && (
            <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              <AlertTriangle size={15} className="text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                <span className="font-semibold">{emProcesso.length} pedido{emProcesso.length > 1 ? 's' : ''} em processamento</span> — ainda não finalizados, não computados na taxa de devolução.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
