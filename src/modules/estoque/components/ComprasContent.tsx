import {
  BarChart2,
  ChevronDown,
  Package,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { EmptyState } from '../../../components/ui';
import { useStore } from '../../../store';
import { fmt } from '../../../utils/calculations';
import { C } from '../../../utils/chartColors';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mesLabel(mesAno: string) {
  const [y, m] = mesAno.split('-');
  const nomes = [
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
  return `${nomes[parseInt(m) - 1]}/${y.slice(2)}`;
}

function subMonths(n: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 7);
}

function isoToMes(data: string) {
  return data.slice(0, 7);
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 px-3 py-2.5 text-xs space-y-1">
      <p className="font-semibold text-slate-600 dark:text-slate-300">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-slate-500 dark:text-slate-400">{p.name}:</span>
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {typeof p.value === 'number' && p.name !== 'Compras' ? fmt(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KCard({
  label,
  value,
  sub,
  delta,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: number | null;
  icon: React.ElementType;
}) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className="w-9 h-9 rounded-xl bg-core-green/10 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={16} className="text-core-green" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">
          {label}
        </p>
        <p className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate">{value}</p>
        {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
        {delta != null && (
          <div
            className={`flex items-center gap-1 mt-1 text-[11px] font-medium ${delta >= 0 ? 'text-red-500' : 'text-green-600'}`}
          >
            {delta >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {delta >= 0 ? '+' : ''}
            {delta.toFixed(1)}% vs mês anterior
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const PERIODOS = [
  { label: '3 meses', meses: 3 },
  { label: '6 meses', meses: 6 },
  { label: '12 meses', meses: 12 },
  { label: 'Tudo', meses: 0 },
];

export function ComprasContent({ embedded = false }: { embedded?: boolean }) {
  const comprasAll = useStore((s) => s.compras);
  const produtos = useStore((s) => s.produtos);

  const [periodo, setPeriodo] = useState(6);
  const [skuSel, setSkuSel] = useState<string>('');
  const [showTop, setShowTop] = useState(false);

  // ── Filtro por período ────────────────────────────────────────────────────

  const dataCorte = useMemo(() => (periodo > 0 ? subMonths(periodo) : ''), [periodo]);

  const compras = useMemo(
    () => (periodo > 0 ? comprasAll.filter((c) => isoToMes(c.data) >= dataCorte) : comprasAll),
    [comprasAll, dataCorte, periodo]
  );

  // ── KPIs ─────────────────────────────────────────────────────────────────

  const mesAtual = new Date().toISOString().slice(0, 7);
  const mesAnt = subMonths(1);

  const cmvMes = useMemo(
    () =>
      comprasAll.filter((c) => isoToMes(c.data) === mesAtual).reduce((s, c) => s + c.custoTotal, 0),
    [comprasAll, mesAtual]
  );
  const cmvMesAnt = useMemo(
    () =>
      comprasAll.filter((c) => isoToMes(c.data) === mesAnt).reduce((s, c) => s + c.custoTotal, 0),
    [comprasAll, mesAnt]
  );
  const deltaCmv = cmvMesAnt > 0 ? ((cmvMes - cmvMesAnt) / cmvMesAnt) * 100 : null;

  const totalPeriodo = useMemo(() => compras.reduce((s, c) => s + c.custoTotal, 0), [compras]);
  const ticketMedio = compras.length > 0 ? totalPeriodo / compras.length : 0;
  const qtdMes = comprasAll.filter((c) => isoToMes(c.data) === mesAtual).length;

  const fornecedorLider = useMemo(() => {
    const map: Record<string, number> = {};
    compras.forEach((c) => {
      map[c.fornecedor || '(sem fornecedor)'] =
        (map[c.fornecedor || '(sem fornecedor)'] ?? 0) + c.custoTotal;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
  }, [compras]);

  // ── CMV por mês ─────────────────────────────────────────────────────────

  const cmvMensal = useMemo(() => {
    const map: Record<string, { custo: number; qtd: number }> = {};
    comprasAll.forEach((c) => {
      const m = isoToMes(c.data);
      if (!map[m]) map[m] = { custo: 0, qtd: 0 };
      map[m].custo += c.custoTotal;
      map[m].qtd += 1;
    });
    const limit = periodo > 0 ? periodo : 24;
    const months: string[] = [];
    for (let i = limit - 1; i >= 0; i--) months.push(subMonths(i));
    return months.map((m) => ({
      name: mesLabel(m),
      'CMV (R$)': map[m]?.custo ?? 0,
      Compras: map[m]?.qtd ?? 0,
    }));
  }, [comprasAll, periodo]);

  // ── Por fornecedor ────────────────────────────────────────────────────────

  const porFornecedor = useMemo(() => {
    const map: Record<string, number> = {};
    compras.forEach((c) => {
      const k = c.fornecedor || '(sem fornecedor)';
      map[k] = (map[k] ?? 0) + c.custoTotal;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, valor]) => ({ name, valor }));
  }, [compras]);

  // ── Evolução custo unitário ───────────────────────────────────────────────

  const skusDisponiveis = useMemo(() => {
    const set = new Set(comprasAll.map((c) => c.sku));
    return [...set].sort();
  }, [comprasAll]);

  const skuAtual = skuSel || skusDisponiveis[0] || '';

  const evolucaoCusto = useMemo(() => {
    if (!skuAtual) return [];
    return comprasAll
      .filter((c) => c.sku === skuAtual)
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((c) => ({
        name: c.data.slice(5),
        'Custo Unit. (R$)': c.custoUnitario,
        Qtd: c.quantidadeEntrada,
      }));
  }, [comprasAll, skuAtual]);

  const produtoNome = useMemo(
    () => produtos.find((p) => p.sku === skuAtual)?.nome ?? skuAtual,
    [produtos, skuAtual]
  );

  // custo unitário: variação do primeiro ao último registro
  const custoTrend = useMemo(() => {
    if (evolucaoCusto.length < 2) return null;
    const first = evolucaoCusto[0]['Custo Unit. (R$)'] as number;
    const last = evolucaoCusto[evolucaoCusto.length - 1]['Custo Unit. (R$)'] as number;
    return first > 0 ? ((last - first) / first) * 100 : null;
  }, [evolucaoCusto]);

  // ── Top compras recentes ─────────────────────────────────────────────────

  const recentes = useMemo(
    () => [...comprasAll].sort((a, b) => b.data.localeCompare(a.data)).slice(0, showTop ? 15 : 5),
    [comprasAll, showTop]
  );

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className={embedded ? 'space-y-6' : 'flex-1 p-6 space-y-6'}>
      {/* Header — hidden when embedded inside Estoque tab */}
      {!embedded && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-core-green/10 flex items-center justify-center">
              <ShoppingBag size={18} className="text-core-green" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                Análise de Compras
              </h1>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                CMV, evolução de custo e gasto por fornecedor
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Período */}
      <div className="flex items-center gap-2">
        {PERIODOS.map(({ label, meses }) => (
          <button
            key={label}
            onClick={() => setPeriodo(meses)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              periodo === meses
                ? 'bg-core-green text-white'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-core-green/50'
            }`}
          >
            {label}
          </button>
        ))}
        <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">
          {compras.length} compra{compras.length !== 1 ? 's' : ''} no período
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KCard label="CMV este mês" value={fmt(cmvMes)} delta={deltaCmv} icon={ShoppingBag} />
        <KCard
          label="Total no período"
          value={fmt(totalPeriodo)}
          sub={`${compras.length} nota${compras.length !== 1 ? 's' : ''} de compra`}
          icon={BarChart2}
        />
        <KCard
          label="Ticket médio"
          value={fmt(ticketMedio)}
          sub={`${qtdMes} compra${qtdMes !== 1 ? 's' : ''} este mês`}
          icon={TrendingUp}
        />
        <KCard
          label="Fornecedor líder"
          value={fornecedorLider.length > 18 ? fornecedorLider.slice(0, 16) + '…' : fornecedorLider}
          sub="por valor no período"
          icon={Package}
        />
      </div>

      {/* CMV por mês */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">
          CMV Mensal
        </h2>
        {cmvMensal.every((d) => d['CMV (R$)'] === 0) ? (
          <div className="h-40 flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500 text-sm">
            <ShoppingBag size={28} className="opacity-30" />
            <p>Nenhuma compra registrada.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cmvMensal} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.slate }} />
              <YAxis
                tick={{ fontSize: 11, fill: C.slate }}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="CMV (R$)" fill={C.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Por fornecedor + Evolução custo unitário */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Por fornecedor */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">
            Gasto por Fornecedor
          </h2>
          {porFornecedor.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
              Nenhuma compra no período.
            </div>
          ) : (
            <div className="space-y-2.5">
              {porFornecedor.map(({ name, valor }) => {
                const max = porFornecedor[0].valor;
                const pct = max > 0 ? (valor / max) * 100 : 0;
                return (
                  <div key={name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-600 dark:text-slate-300 truncate max-w-[60%]">
                        {name}
                      </span>
                      <span className="font-medium text-slate-700 dark:text-slate-200 tabular-nums">
                        {fmt(valor)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-core-green rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Evolução custo unitário */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Evolução do Custo Unitário
            </h2>
            {custoTrend != null && (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  custoTrend > 0
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                }`}
              >
                {custoTrend > 0 ? '+' : ''}
                {custoTrend.toFixed(1)}% total
              </span>
            )}
          </div>

          {skusDisponiveis.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <select
                  value={skuAtual}
                  onChange={(e) => setSkuSel(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 pr-7 text-slate-700 dark:text-slate-200 appearance-none outline-none"
                >
                  {skusDisponiveis.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[120px]">
                {produtoNome}
              </span>
            </div>
          )}

          {evolucaoCusto.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
              {skusDisponiveis.length === 0
                ? 'Nenhuma compra registrada.'
                : 'Sem histórico para este SKU.'}
            </div>
          ) : evolucaoCusto.length === 1 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-1">
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {fmt(evolucaoCusto[0]['Custo Unit. (R$)'] as number)}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">única compra registrada</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={185}>
              <LineChart data={evolucaoCusto} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.slate }} />
                <YAxis
                  tick={{ fontSize: 10, fill: C.slate }}
                  tickFormatter={(v) => `R$${v}`}
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="Custo Unit. (R$)"
                  stroke={C.primary}
                  strokeWidth={2}
                  dot={{ r: 4, fill: C.primary }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Compras recentes */}
      <div className="card">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Compras Recentes
          </h2>
        </div>
        {recentes.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag size={20} />}
            title="Nenhuma compra registrada ainda."
            action={
              !embedded ? (
                <Link to="/estoque" className="text-xs text-core-green hover:underline">
                  Registrar primeira compra →
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wide">
                    {[
                      'Data',
                      'SKU',
                      'Produto',
                      'Qtd',
                      'Custo Unit.',
                      'Custo Total',
                      'Fornecedor',
                      'Pagamento',
                    ].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {recentes.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
                        {c.data}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/estoque/${c.sku}`}
                          className="font-mono text-xs text-core-green hover:underline"
                        >
                          {c.sku}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200 max-w-[200px] truncate text-xs">
                        {c.produto}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-center text-xs">
                        {c.quantidadeEntrada}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 tabular-nums text-xs">
                        {fmt(c.custoUnitario)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100 tabular-nums text-xs">
                        {fmt(c.custoTotal)}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-[140px] truncate text-xs">
                        {c.fornecedor || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {c.pagamento ? (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-medium">
                            {c.pagamento}
                            {c.parcelas > 1 ? ` ${c.parcelas}×` : ''}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {comprasAll.length > 5 && (
              <div className="px-5 py-3 border-t border-slate-50 dark:border-slate-800">
                <button
                  onClick={() => setShowTop((v) => !v)}
                  className="text-xs text-slate-400 dark:text-slate-500 hover:text-core-green transition-colors flex items-center gap-1"
                >
                  {showTop
                    ? 'Mostrar menos'
                    : `Ver mais ${comprasAll.length - 5} compra${comprasAll.length - 5 !== 1 ? 's' : ''}`}
                  <ChevronDown
                    size={11}
                    className={`transition-transform ${showTop ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function Compras() {
  return <ComprasContent />;
}
