import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Bookmark, TrendingUp, TrendingDown, Award,
  ChevronRight, BarChart2, Package,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, LineChart, Line, Legend, RadarChart, PolarGrid,
  PolarAngleAxis, Radar,
} from 'recharts';
import { useStore } from '../store';
import { fmt, fmtPct } from '../utils/calculations';
import { C } from '../utils/chartColors';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Periodo = '30' | '90' | '180' | '0';

const PERIODOS: { key: Periodo; label: string }[] = [
  { key: '30',  label: '30 dias' },
  { key: '90',  label: '90 dias' },
  { key: '180', label: '6 meses' },
  { key: '0',   label: 'Tudo'    },
];

const CAT_COLORS = [
  C.primary, '#6366f1', C.amber, C.red, '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', C.orange, '#14b8a6',
];

function cutoff(dias: Periodo): string | null {
  if (dias === '0') return null;
  const d = new Date();
  d.setDate(d.getDate() - parseInt(dias));
  return d.toISOString().slice(0, 10);
}

function monthKey(iso: string) { return iso.slice(0, 7); }

function monthLabel(m: string) {
  return new Date(m + '-02').toLocaleString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
}

interface CatStats {
  categoria: string;
  skus: string[];
  pedidos: number;
  unidades: number;
  receita: number;
  cmv: number;
  lucroOp: number;
  margem: number;
  taxaDev: number;
  color: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KCard({ label, value, sub, up }: { label: string; value: string; sub?: string; up?: boolean | null }) {
  return (
    <div className="card p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">{value}</p>
      {sub != null && (
        <p className={`text-xs mt-0.5 flex items-center gap-0.5 ${up == null ? 'text-slate-400' : up ? 'text-emerald-600' : 'text-red-500'}`}>
          {up != null && (up ? <TrendingUp size={10} /> : <TrendingDown size={10} />)}
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Categorias() {
  const pedidosAll  = useStore((s) => s.pedidos);
  const produtosAll = useStore((s) => s.produtos);

  const [periodo, setPeriodo] = useState<Periodo>('90');
  const [selected, setSelected] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<'receita' | 'margem' | 'pedidos' | 'skus'>('receita');

  // ── Category map (produtos) ───────────────────────────────────────────────

  const catProdMap = useMemo<Map<string, string[]>>(() => {
    const m = new Map<string, string[]>();
    produtosAll.filter((p) => p.ativo !== false).forEach((p) => {
      const cat = p.categoria?.trim() || 'Sem categoria';
      const prev = m.get(cat) ?? [];
      if (!prev.includes(p.sku)) m.set(cat, [...prev, p.sku]);
    });
    return m;
  }, [produtosAll]);

  // ── Filtered pedidos ──────────────────────────────────────────────────────

  const from = cutoff(periodo);
  const pedidosFiltrados = useMemo(
    () => pedidosAll.filter(
      (p) =>
        (p.status === 'Concluído' || p.status === 'Enviado') &&
        (from ? p.data >= from : true)
    ),
    [pedidosAll, from]
  );

  const devolvidos = useMemo(
    () => pedidosAll.filter(
      (p) => p.status === 'Devolvido' && (from ? p.data >= from : true)
    ),
    [pedidosAll, from]
  );

  // ── Build category stats ──────────────────────────────────────────────────

  const stats = useMemo<CatStats[]>(() => {
    const skuToCat = new Map<string, string>();
    catProdMap.forEach((skus, cat) => skus.forEach((sku) => skuToCat.set(sku, cat)));

    const map = new Map<string, Omit<CatStats, 'margem' | 'taxaDev' | 'color'>>();

    pedidosFiltrados.forEach((p) => {
      const cat = skuToCat.get(p.sku) ?? 'Sem categoria';
      const prev = map.get(cat) ?? { categoria: cat, skus: [], pedidos: 0, unidades: 0, receita: 0, cmv: 0, lucroOp: 0 };
      map.set(cat, {
        ...prev,
        skus: prev.skus.includes(p.sku) ? prev.skus : [...prev.skus, p.sku],
        pedidos: prev.pedidos + 1,
        unidades: prev.unidades + p.unidadesEstoque,
        receita: prev.receita + p.receita,
        cmv: prev.cmv + p.custoTotal,
        lucroOp: prev.lucroOp + p.lucroOperacional,
      });
    });

    // Add categories with no sales (but have products)
    catProdMap.forEach((skus, cat) => {
      if (!map.has(cat)) {
        map.set(cat, { categoria: cat, skus, pedidos: 0, unidades: 0, receita: 0, cmv: 0, lucroOp: 0 });
      }
    });

    // Devoluções por categoria
    const devMap = new Map<string, number>();
    devolvidos.forEach((p) => {
      const cat = skuToCat.get(p.sku) ?? 'Sem categoria';
      devMap.set(cat, (devMap.get(cat) ?? 0) + 1);
    });

    const result = Array.from(map.values()).map((c, i) => {
      const totalVendas = c.pedidos + (devMap.get(c.categoria) ?? 0);
      return {
        ...c,
        margem: c.receita > 0 ? (c.lucroOp / c.receita) * 100 : 0,
        taxaDev: totalVendas > 0 ? ((devMap.get(c.categoria) ?? 0) / totalVendas) * 100 : 0,
        color: CAT_COLORS[i % CAT_COLORS.length],
      };
    });

    result.sort((a, b) => {
      if (sortKey === 'receita') return b.receita - a.receita;
      if (sortKey === 'margem')  return b.margem - a.margem;
      if (sortKey === 'pedidos') return b.pedidos - a.pedidos;
      return b.skus.length - a.skus.length;
    });

    return result;
  }, [pedidosFiltrados, devolvidos, catProdMap, sortKey]);

  // ── Totals ────────────────────────────────────────────────────────────────

  const totais = useMemo(() => ({
    receita: stats.reduce((s, c) => s + c.receita, 0),
    lucroOp: stats.reduce((s, c) => s + c.lucroOp, 0),
    pedidos: stats.reduce((s, c) => s + c.pedidos, 0),
  }), [stats]);

  const margemGeral = totais.receita > 0 ? (totais.lucroOp / totais.receita) * 100 : 0;
  const bestCat = stats[0];

  // ── Monthly trend (last 6 months, per category) ───────────────────────────

  const trendData = useMemo(() => {
    const skuToCat = new Map<string, string>();
    catProdMap.forEach((skus, cat) => skus.forEach((sku) => skuToCat.set(sku, cat)));

    const months = new Map<string, Map<string, number>>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.set(key, new Map());
    }

    pedidosAll
      .filter((p) => p.status === 'Concluído' || p.status === 'Enviado')
      .forEach((p) => {
        const mk = monthKey(p.data);
        if (!months.has(mk)) return;
        const cat = skuToCat.get(p.sku) ?? 'Sem categoria';
        const mmap = months.get(mk)!;
        mmap.set(cat, (mmap.get(cat) ?? 0) + p.receita);
      });

    return Array.from(months.entries()).map(([mk, mmap]) => {
      const row: Record<string, string | number> = { mes: monthLabel(mk) };
      stats.slice(0, 5).forEach((c) => {
        row[c.categoria] = mmap.get(c.categoria) ?? 0;
      });
      return row;
    });
  }, [pedidosAll, catProdMap, stats]);

  // ── Radar data (top 5 cats, normalised to 100) ────────────────────────────

  const radarData = useMemo(() => {
    const top5 = stats.slice(0, 5);
    const maxR = Math.max(...top5.map((c) => c.receita), 1);
    const maxM = 40; // cap margin at 40%
    const maxP = Math.max(...top5.map((c) => c.pedidos), 1);

    return [
      { dim: 'Receita',  ...Object.fromEntries(top5.map((c) => [c.categoria, (c.receita / maxR) * 100])) },
      { dim: 'Margem',   ...Object.fromEntries(top5.map((c) => [c.categoria, Math.max(0, (c.margem / maxM) * 100)])) },
      { dim: 'Pedidos',  ...Object.fromEntries(top5.map((c) => [c.categoria, (c.pedidos / maxP) * 100])) },
      { dim: 'Qualidade',...Object.fromEntries(top5.map((c) => [c.categoria, Math.max(0, 100 - c.taxaDev * 5)])) },
    ];
  }, [stats]);

  // ── Selected category detail ──────────────────────────────────────────────

  const selectedStats = useMemo(
    () => stats.find((c) => c.categoria === selected) ?? null,
    [stats, selected]
  );

  const selectedProdutos = useMemo(() => {
    if (!selectedStats) return [];
    return selectedStats.skus.map((sku) => {
      const prod = produtosAll.find((p) => p.sku === sku);
      const pedidos = pedidosFiltrados.filter((p) => p.sku === sku);
      const receita = pedidos.reduce((s, p) => s + p.receita, 0);
      const lucro   = pedidos.reduce((s, p) => s + p.lucroOperacional, 0);
      return {
        sku,
        nome: prod?.nome ?? sku,
        pedidos: pedidos.length,
        receita,
        lucro,
        margem: receita > 0 ? (lucro / receita) * 100 : 0,
      };
    }).sort((a, b) => b.receita - a.receita);
  }, [selectedStats, produtosAll, pedidosFiltrados]);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 p-6 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center">
            <Bookmark size={18} className="text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Análise por Categoria</h1>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Rentabilidade e composição agrupadas por categoria de produto
            </p>
          </div>
        </div>
        <Link to="/abc" className="text-xs text-core-green hover:underline">Ver Curva ABC →</Link>
      </div>

      {/* Period + Sort */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 card px-1 py-1">
          {PERIODOS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriodo(key)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                periodo === key
                  ? 'bg-core-green text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span>Ordenar:</span>
          {(['receita', 'margem', 'pedidos', 'skus'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setSortKey(k)}
              className={`px-2.5 py-1 rounded-lg border transition-colors ${
                sortKey === k
                  ? 'border-core-green/50 text-core-green bg-core-green/5'
                  : 'border-slate-200 dark:border-slate-700 hover:border-core-green/30'
              }`}
            >
              {k === 'skus' ? 'SKUs' : k.charAt(0).toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KCard label="Receita total"      value={fmt(totais.receita)} />
        <KCard label="Lucro Operacional"  value={fmt(totais.lucroOp)} up={totais.lucroOp > 0} sub={fmtPct(margemGeral / 100)} />
        <KCard label="Pedidos"            value={String(totais.pedidos)} />
        <KCard label="Categoria líder"    value={bestCat?.categoria ?? '—'} sub={bestCat ? fmt(bestCat.receita) : undefined} />
      </div>

      {/* Category bars + radar */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

        {/* Bar chart */}
        <div className="card p-4 md:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
            Receita por categoria
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={stats.map((c) => ({ name: c.categoria, receita: c.receita, margem: c.margem }))}
              margin={{ top: 4, right: 12, left: 0, bottom: 40 }}
              onClick={(d) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const ap = (d as any)?.activePayload;
                if (ap) setSelected(selected === ap[0]?.payload?.name ? null : ap[0]?.payload?.name ?? null);
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: C.slate }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 9, fill: C.slate }} width={50}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '11px' }}
                formatter={(v: unknown, name: unknown) => [name === 'receita' ? fmt(v as number) : `${(v as number).toFixed(1)}%`, name === 'receita' ? 'Receita' : 'Margem']}
              />
              <Bar dataKey="receita" radius={[4, 4, 0, 0]} cursor="pointer">
                {stats.map((c) => (
                  <Cell
                    key={c.categoria}
                    fill={selected === null || selected === c.categoria ? c.color : `${c.color}50`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-slate-400 text-center -mt-1">Clique em uma barra para ver o detalhe da categoria</p>
        </div>

        {/* Radar */}
        <div className="card p-4 md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
            Radar top 5 categorias
          </p>
          {stats.length >= 2 ? (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={75}>
                <PolarGrid stroke="rgba(148,163,184,0.2)" />
                <PolarAngleAxis dataKey="dim" tick={{ fontSize: 9, fill: C.slate }} />
                {stats.slice(0, 5).map((c) => (
                  <Radar
                    key={c.categoria}
                    dataKey={c.categoria}
                    stroke={c.color}
                    fill={c.color}
                    fillOpacity={0.08}
                    strokeWidth={1.5}
                    dot={false}
                  />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <BarChart2 size={28} className="text-slate-200 dark:text-slate-700" />
              <p className="text-xs text-slate-400 text-center">Cadastre produtos com categorias diferentes para ver o radar</p>
            </div>
          )}
        </div>
      </div>

      {/* Trend lines (last 6 months) */}
      {trendData.length > 0 && stats.length > 0 && (
        <div className="card p-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Tendência de receita — últimos 6 meses</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: C.slate }} />
              <YAxis tick={{ fontSize: 9, fill: C.slate }} width={50}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '11px' }}
                formatter={(v: unknown, name: unknown) => [fmt(v as number), String(name)]}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              {stats.slice(0, 5).map((c) => (
                <Line
                  key={c.categoria}
                  type="monotone"
                  dataKey={c.categoria}
                  stroke={c.color}
                  strokeWidth={2}
                  dot={{ r: 3, fill: c.color }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Category table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Todas as categorias</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left px-4 py-2 font-semibold text-slate-500 dark:text-slate-400">Categoria</th>
                <th className="text-right px-4 py-2 font-semibold text-slate-500 dark:text-slate-400">SKUs</th>
                <th className="text-right px-4 py-2 font-semibold text-slate-500 dark:text-slate-400">Pedidos</th>
                <th className="text-right px-4 py-2 font-semibold text-slate-500 dark:text-slate-400">Receita</th>
                <th className="text-right px-4 py-2 font-semibold text-slate-500 dark:text-slate-400">Lucro Op.</th>
                <th className="text-right px-4 py-2 font-semibold text-slate-500 dark:text-slate-400">Margem</th>
                <th className="text-right px-4 py-2 font-semibold text-slate-500 dark:text-slate-400">Dev.</th>
                <th className="text-right px-4 py-2 font-semibold text-slate-500 dark:text-slate-400">% Receita</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {stats.map((c) => {
                const pctReceita = totais.receita > 0 ? (c.receita / totais.receita) * 100 : 0;
                const isSelected = selected === c.categoria;
                return (
                  <tr
                    key={c.categoria}
                    className={`border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${isSelected ? 'bg-core-green/5 dark:bg-core-green/10' : ''}`}
                    onClick={() => setSelected(isSelected ? null : c.categoria)}
                  >
                    <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                        {c.categoria}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-500 dark:text-slate-400">{c.skus.length}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">{c.pedidos}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{fmt(c.receita)}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${c.lucroOp >= 0 ? 'text-core-green' : 'text-red-500'}`}>
                      {fmt(c.lucroOp)}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${c.margem >= 15 ? 'text-core-green' : c.margem >= 0 ? 'text-amber-500' : 'text-red-500'}`}>
                      {fmtPct(c.margem / 100)}
                    </td>
                    <td className={`px-4 py-2.5 text-right tabular-nums ${c.taxaDev > 5 ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
                      {c.taxaDev.toFixed(1)}%
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pctReceita}%`, background: c.color }} />
                        </div>
                        <span className="text-slate-400 tabular-nums w-8 text-right">{pctReceita.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-300 dark:text-slate-600">
                      <ChevronRight size={12} className={isSelected ? 'text-core-green rotate-90' : ''} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category drill-down */}
      {selectedStats && (
        <div className="card p-4 border-2 border-core-green/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ background: selectedStats.color }} />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{selectedStats.categoria}</p>
              <span className="text-xs text-slate-400 dark:text-slate-500">— {selectedStats.skus.length} SKU{selectedStats.skus.length !== 1 ? 's' : ''}</span>
            </div>
            <button onClick={() => setSelected(null)} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              Fechar
            </button>
          </div>

          {selectedProdutos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    <th className="text-left pb-2 font-semibold text-slate-500 dark:text-slate-400">SKU</th>
                    <th className="text-left pb-2 font-semibold text-slate-500 dark:text-slate-400">Nome</th>
                    <th className="text-right pb-2 font-semibold text-slate-500 dark:text-slate-400">Pedidos</th>
                    <th className="text-right pb-2 font-semibold text-slate-500 dark:text-slate-400">Receita</th>
                    <th className="text-right pb-2 font-semibold text-slate-500 dark:text-slate-400">Lucro Op.</th>
                    <th className="text-right pb-2 font-semibold text-slate-500 dark:text-slate-400">Margem</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {selectedProdutos.map((p, i) => (
                    <tr key={p.sku} className="border-b border-slate-50 dark:border-slate-800">
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-1.5">
                          {i === 0 && <Award size={10} className="text-amber-500" />}
                          <span className="font-mono text-core-green">{p.sku}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-slate-600 dark:text-slate-300 max-w-[160px] truncate">{p.nome}</td>
                      <td className="py-2 text-right text-slate-500 dark:text-slate-400">{p.pedidos}</td>
                      <td className="py-2 text-right font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{fmt(p.receita)}</td>
                      <td className={`py-2 text-right font-semibold tabular-nums ${p.lucro >= 0 ? 'text-core-green' : 'text-red-500'}`}>
                        {fmt(p.lucro)}
                      </td>
                      <td className={`py-2 text-right font-semibold tabular-nums ${p.margem >= 15 ? 'text-core-green' : p.margem >= 0 ? 'text-amber-500' : 'text-red-500'}`}>
                        {fmtPct(p.margem / 100)}
                      </td>
                      <td className="py-2 pl-3">
                        <Link to={`/estoque/${p.sku}`} className="text-slate-300 hover:text-core-green transition-colors">
                          <Package size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-4">
              Nenhuma venda neste período para essa categoria.
            </p>
          )}
        </div>
      )}

    </div>
  );
}
