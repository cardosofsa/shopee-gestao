import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart2, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle2, Download, ChevronUp, ChevronDown,
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { useStore } from '../store';
import { fmt, fmtPct, getRankingProdutos } from '../utils/calculations';
import { exportXlsx, xlsxNum } from '../utils/exportXlsx';
import type { RankingProduto } from '../types';
import { C } from '../utils/chartColors';
import { EmptyState } from '../components/ui';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIER_CONFIG = {
  A: {
    label: 'Curva A',
    color: C.primary,
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-700 dark:text-emerald-300',
    badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
    desc: 'Produtos vitais — representam a maior parte da receita. Prioridade máxima de estoque e atenção.',
    actions: [
      'Manter estoque elevado — nunca pode faltar',
      'Negociar melhores condições com fornecedor',
      'Monitorar margem semanalmente',
      'Proteger com backup de fornecedor',
    ],
  },
  B: {
    label: 'Curva B',
    color: C.amber,
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-300',
    badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
    desc: 'Produtos importantes — contribuição intermediária. Potencial de crescimento com atenção moderada.',
    actions: [
      'Estoque calculado — sem excessos',
      'Testar campanhas para elevar para A',
      'Revisar custo para melhorar margem',
      'Avaliar potencial de variações',
    ],
  },
  C: {
    label: 'Curva C',
    color: C.slate,
    bg: 'bg-slate-50 dark:bg-slate-800/60',
    border: 'border-slate-200 dark:border-slate-700',
    text: 'text-slate-600 dark:text-slate-400',
    badge: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
    desc: 'Produtos de baixo volume. Avaliar continuidade — podem gerar custo de gestão superior ao retorno.',
    actions: [
      'Considerar descontinuar SKUs sem margem',
      'Liquidar estoque parado com promoção',
      'Avaliar se produto ainda tem demanda',
      'Agrupar em kits com produtos A/B',
    ],
  },
} as const;

const PERIODOS = [
  { label: '30 dias',  dias: 30  },
  { label: '60 dias',  dias: 60  },
  { label: '90 dias',  dias: 90  },
  { label: 'Tudo',     dias: 0   },
];

type SortKey = 'receita' | 'lucroOperacional' | 'margem' | 'pedidos' | 'percentReceita';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function subDays(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ─── Donut tooltip ────────────────────────────────────────────────────────────

function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { name, value, qtd } = payload[0].payload;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 dark:text-slate-200">{name}</p>
      <p className="text-slate-500 dark:text-slate-400">{fmt(value)} · {fmtPct(payload[0].payload.pct)}</p>
      <p className="text-slate-400 dark:text-slate-500">{qtd} SKU{qtd !== 1 ? 's' : ''}</p>
    </div>
  );
}

// ─── Product row ──────────────────────────────────────────────────────────────

function ProdRow({ p, acumPct }: { p: RankingProduto; acumPct: number }) {
  const tier = p.curvaABC as 'A' | 'B' | 'C' | '—';
  const cfg  = tier !== '—' ? TIER_CONFIG[tier] : null;
  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-50 dark:border-slate-800">
      <td className="px-4 py-2.5">
        {cfg ? (
          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold ${cfg.badge}`}>
            {tier}
          </span>
        ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
      </td>
      <td className="px-4 py-2.5">
        <Link to={`/estoque/${p.sku}`} className="font-mono text-xs text-core-green hover:underline">{p.sku}</Link>
      </td>
      <td className="px-4 py-2.5 text-slate-700 dark:text-slate-200 max-w-[200px] truncate text-xs">{p.produto}</td>
      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 text-center text-xs">{p.pedidos}</td>
      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 text-center text-xs">{p.unidades}</td>
      <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-100 tabular-nums text-xs text-right">{fmt(p.receita)}</td>
      <td className="px-4 py-2.5 text-green-600 dark:text-green-400 tabular-nums text-xs text-right">{fmt(p.lucroOperacional)}</td>
      <td className="px-4 py-2.5 text-xs text-right">
        <span className={p.margem >= 20 ? 'text-green-600 font-semibold' : p.margem >= 10 ? 'text-amber-600' : 'text-red-500'}>
          {p.margem.toFixed(1)}%
        </span>
      </td>
      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 tabular-nums text-xs text-right">{fmtPct(p.percentReceita)}</td>
      <td className="px-4 py-2.5 text-slate-400 dark:text-slate-500 tabular-nums text-xs text-right">{fmtPct(acumPct)}%</td>
    </tr>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CurvaABC() {
  const pedidosAll = useStore((s) => s.pedidos);
  const produtos   = useStore((s) => s.produtos);

  const [periodo,    setPeriodo]    = useState(90);
  const [limA,       setLimA]       = useState(80);
  const [limB,       setLimB]       = useState(95);
  const [sortKey,    setSortKey]    = useState<SortKey>('receita');
  const [sortDir,    setSortDir]    = useState<'desc' | 'asc'>('desc');
  const [tierFilter, setTierFilter] = useState<'A' | 'B' | 'C' | 'all'>('all');

  // ── Filter pedidos by period ──────────────────────────────────────────────

  const pedidos = useMemo(() => {
    if (periodo === 0) return pedidosAll;
    const corte = subDays(periodo);
    return pedidosAll.filter((p) => p.data >= corte);
  }, [pedidosAll, periodo]);

  // ── Ranking with custom thresholds ────────────────────────────────────────

  const ranking = useMemo(() => {
    const base = getRankingProdutos(pedidos);
    // Re-classify with custom thresholds
    let acum = 0;
    return base.map((r) => {
      const prev = acum;
      acum += r.percentReceita;
      return { ...r, curvaABC: prev < limA ? 'A' : prev < limB ? 'B' : 'C' } as RankingProduto;
    });
  }, [pedidos, limA, limB]);

  // ── Tier stats ────────────────────────────────────────────────────────────

  const tierStats = useMemo(() => {
    const s = { A: { qtd: 0, receita: 0, lucro: 0 }, B: { qtd: 0, receita: 0, lucro: 0 }, C: { qtd: 0, receita: 0, lucro: 0 } };
    ranking.forEach((r) => {
      const t = r.curvaABC as 'A' | 'B' | 'C';
      if (!s[t]) return;
      s[t].qtd    += 1;
      s[t].receita += r.receita;
      s[t].lucro   += r.lucroOperacional;
    });
    return s;
  }, [ranking]);

  const totalReceita = tierStats.A.receita + tierStats.B.receita + tierStats.C.receita;

  const donutData = useMemo(() => (['A', 'B', 'C'] as const).map((t) => ({
    name: `Curva ${t}`, value: tierStats[t].receita,
    pct: totalReceita > 0 ? (tierStats[t].receita / totalReceita) * 100 : 0,
    qtd: tierStats[t].qtd,
    fill: TIER_CONFIG[t].color,
  })), [tierStats, totalReceita]);

  // Produtos sem venda no período
  const semVenda = useMemo(() => {
    const comVenda = new Set(ranking.map((r) => r.sku));
    return produtos.filter((p) => !comVenda.has(p.sku));
  }, [ranking, produtos]);

  // ── Sort + filter ─────────────────────────────────────────────────────────

  const sorted = useMemo(() => {
    const list = tierFilter === 'all' ? ranking : ranking.filter((r) => r.curvaABC === tierFilter);
    return [...list].sort((a, b) => {
      const va = a[sortKey as keyof RankingProduto] as number;
      const vb = b[sortKey as keyof RankingProduto] as number;
      return sortDir === 'desc' ? vb - va : va - vb;
    });
  }, [ranking, tierFilter, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (sortDir === 'desc' ? <ChevronDown size={11} /> : <ChevronUp size={11} />) : null;

  // ── Export ────────────────────────────────────────────────────────────────

  const handleExport = async () => {
    const headers = ['Curva', 'SKU', 'Produto', 'Pedidos', 'Unidades', 'Receita', 'Lucro Op.', 'Margem (%)', '% Receita'];
    const rows = sorted.map((r) => [r.curvaABC, r.sku, r.produto, xlsxNum(r.pedidos), xlsxNum(r.unidades), xlsxNum(r.receita), xlsxNum(r.lucroOperacional), xlsxNum(r.margem), xlsxNum(r.percentReceita)]);
    exportXlsx('curva-abc', [{ name: 'Curva ABC', headers, rows }]);
  };

  // ── Acumulado ─────────────────────────────────────────────────────────────

  const acumulados = useMemo(() => {
    let a = 0;
    return sorted.map((r) => { a += r.percentReceita; return a; });
  }, [sorted]);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-core-green/10 flex items-center justify-center">
            <BarChart2 size={18} className="text-core-green" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Curva ABC</h1>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Análise de Pareto — identifique os produtos vitais, importantes e de baixo retorno
            </p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-core-green hover:border-core-green/50 rounded-lg transition-colors"
        >
          <Download size={13} /> Exportar XLSX
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Período:</span>
          {PERIODOS.map(({ label, dias }) => (
            <button
              key={label}
              onClick={() => setPeriodo(dias)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                periodo === dias
                  ? 'bg-core-green text-white'
                  : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-core-green/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Custom thresholds */}
        <div className="flex items-center gap-3 ml-auto text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>A até</span>
            <input
              type="number" min={50} max={90} step={5}
              value={limA}
              onChange={(e) => setLimA(Math.min(parseInt(e.target.value) || 80, limB - 1))}
              className="w-14 text-xs border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-center"
            />
            <span>%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>B até</span>
            <input
              type="number" min={limA + 1} max={99} step={1}
              value={limB}
              onChange={(e) => setLimB(Math.max(parseInt(e.target.value) || 95, limA + 1))}
              className="w-14 text-xs border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-center"
            />
            <span>%</span>
          </div>
        </div>
      </div>

      {ranking.length === 0 ? (
        <EmptyState
          icon={<BarChart2 size={20} />}
          title="Nenhuma venda no período"
          description="Importe pedidos para visualizar a curva ABC."
          className="card"
        />
      ) : (
        <>
          {/* Donut + tier cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Donut */}
            <div className="card p-5 flex flex-col items-center justify-center">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2 self-start">Distribuição de Receita</h2>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {donutData.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<DonutTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 text-xs mt-1">
                {donutData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} />
                    <span className="text-slate-500 dark:text-slate-400">{d.name.slice(-1)}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{fmtPct(d.pct)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tier cards */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(['A', 'B', 'C'] as const).map((tier) => {
                const cfg  = TIER_CONFIG[tier];
                const stat = tierStats[tier];
                const pct  = totalReceita > 0 ? (stat.receita / totalReceita) * 100 : 0;
                return (
                  <button
                    key={tier}
                    onClick={() => setTierFilter(tierFilter === tier ? 'all' : tier)}
                    className={`text-left p-4 rounded-2xl border-2 transition-all ${cfg.bg} ${
                      tierFilter === tier ? `${cfg.border} shadow-md` : 'border-transparent hover:border-opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                      <span className={`text-lg font-bold ${cfg.text}`}>{fmtPct(pct)}</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{fmt(stat.receita)}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {stat.qtd} SKU{stat.qtd !== 1 ? 's' : ''} · Lucro: {fmt(stat.lucro)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tier recommendations */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(['A', 'B', 'C'] as const).map((tier) => {
              const cfg = TIER_CONFIG[tier];
              const Icon = tier === 'A' ? CheckCircle2 : tier === 'B' ? TrendingUp : AlertTriangle;
              return (
                <div key={tier} className={`p-4 rounded-xl border ${cfg.border} ${cfg.bg}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={14} className={cfg.text} />
                    <p className={`text-xs font-semibold ${cfg.text}`}>{cfg.label} — O que fazer</p>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2.5 leading-relaxed">{cfg.desc}</p>
                  <ul className="space-y-1">
                    {cfg.actions.map((a, i) => (
                      <li key={i} className="text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                        <span className={`mt-0.5 shrink-0 text-[8px] font-bold ${cfg.text}`}>▸</span>
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Bar chart: receita por SKU top 15 */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Receita por Produto</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={ranking.slice(0, 15).map((r) => ({
                  name: r.sku, receita: r.receita,
                  fill: r.curvaABC === 'A' ? C.primary : r.curvaABC === 'B' ? C.amber : C.slate,
                }))}
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.slate }} />
                <YAxis tick={{ fontSize: 10, fill: C.slate }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: unknown) => fmt(v as number)} />
                <Bar dataKey="receita" name="Receita" radius={[4,4,0,0]}>
                  {ranking.slice(0, 15).map((r, i) => (
                    <Cell key={i} fill={r.curvaABC === 'A' ? C.primary : r.curvaABC === 'B' ? C.amber : C.slate} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="card">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Todos os Produtos
                {tierFilter !== 'all' && (
                  <span className={`ml-2 text-xs font-normal ${TIER_CONFIG[tierFilter].text}`}>
                    filtrando Curva {tierFilter}
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-2">
                {(['all', 'A', 'B', 'C'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTierFilter(t)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                      tierFilter === t
                        ? t === 'all' ? 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900'
                          : `${TIER_CONFIG[t].badge}`
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    {t === 'all' ? 'Todos' : t}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                    {[
                      { key: null,           label: 'Curva'   },
                      { key: null,           label: 'SKU'     },
                      { key: null,           label: 'Produto' },
                      { key: 'pedidos',      label: 'Ped.'    },
                      { key: 'unidades',     label: 'Un.'     },
                      { key: 'receita',      label: 'Receita' },
                      { key: 'lucroOperacional', label: 'Lucro Op.' },
                      { key: 'margem',       label: 'Margem'  },
                      { key: 'percentReceita', label: '% Total' },
                      { key: null,           label: '% Acum.' },
                    ].map(({ key, label }) => (
                      <th
                        key={label}
                        className={`text-left px-4 py-3 font-medium whitespace-nowrap ${key ? 'cursor-pointer hover:text-slate-700 dark:hover:text-slate-200' : ''}`}
                        onClick={() => key && handleSort(key as SortKey)}
                      >
                        <span className="flex items-center gap-1">
                          {label}
                          {key && <SortIcon k={key as SortKey} />}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((p, i) => (
                    <ProdRow key={p.sku} p={p} acumPct={acumulados[i]} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sem venda */}
          {semVenda.length > 0 && (
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown size={14} className="text-slate-400" />
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Sem venda no período ({semVenda.length} SKU{semVenda.length !== 1 ? 's' : ''})
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {semVenda.map((p) => (
                  <Link
                    key={p.sku}
                    to={`/estoque/${p.sku}`}
                    className="px-2.5 py-1 text-[11px] font-mono bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    {p.sku}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
