import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Pencil,
  Tag,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import { useStore } from '../../../store';
import { calcularPrecoIdeal, fmt, fmtPct } from '../../../utils/calculations';
import { exportXlsx } from '../../../utils/exportXlsx';

// ─── Constants ────────────────────────────────────────────────────────────────

const COMISSAO_SHOPEE = 0.2;
const TAXA_FIXA = 0;
const MARGEM_OPTS = [10, 15, 20, 25, 30];

type Filtro = 'todos' | 'critica' | 'baixa' | 'boa';

const FILTRO_CFG: Record<Filtro, { label: string; min: number; max: number }> = {
  todos: { label: 'Todos', min: -Infinity, max: Infinity },
  critica: { label: 'Margem crítica (<10%)', min: -Infinity, max: 10 },
  baixa: { label: 'Margem baixa (10–20%)', min: 10, max: 20 },
  boa: { label: 'Boa margem (>20%)', min: 20, max: Infinity },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function margemClass(m: number): string {
  if (m < 10) return 'text-red-500';
  if (m < 20) return 'text-amber-500';
  return 'text-emerald-600';
}

function margemBadge(m: number): string {
  if (m < 10) return 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400';
  if (m < 20) return 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400';
  return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400';
}

// ─── Inline cost editor ───────────────────────────────────────────────────────

function CustoCell({ valor, onChange }: { valor: number; onChange: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const open = () => {
    setDraft(valor > 0 ? valor.toFixed(2) : '');
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };
  const save = () => {
    const v = parseFloat(draft);
    if (!isNaN(v) && v >= 0) onChange(v);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="number"
          min="0"
          step="0.01"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') setEditing(false);
          }}
          className="w-24 text-sm text-right px-1.5 py-0.5 border border-core-green rounded focus:outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-mono"
          autoFocus
        />
        <button
          onClick={save}
          className="p-0.5 text-core-green hover:opacity-70 transition-opacity"
        >
          <Check size={12} />
        </button>
        <button
          onClick={() => setEditing(false)}
          className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={12} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={open}
      className="flex items-center gap-1.5 group text-sm font-mono text-slate-700 dark:text-slate-200 hover:text-core-green transition-colors"
    >
      {fmt(valor)}
      <Pencil size={10} className="opacity-0 group-hover:opacity-50 transition-opacity" />
    </button>
  );
}

// ─── Linha da tabela ──────────────────────────────────────────────────────────

type ProdRow = {
  sku: string;
  nome: string;
  loja: string;
  custo: number;
  estoqueAtual: number;
  precoIdeal: number;
  precoMedioReal: number;
  margemReal: number; // %
  capitalImob: number;
  nVendas: number;
};

function TableRow({
  row,
  margemAlvo,
  onCustoChange,
}: {
  row: ProdRow;
  margemAlvo: number;
  onCustoChange: (sku: string, v: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const diff =
    row.precoIdeal > 0 && row.precoMedioReal > 0
      ? ((row.precoMedioReal - row.precoIdeal) / row.precoIdeal) * 100
      : null;

  return (
    <>
      <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
        <td className="px-4 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate max-w-[200px]">
              {row.nome}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">{row.sku}</p>
          </div>
        </td>
        <td className="px-4 py-2.5">
          <CustoCell valor={row.custo} onChange={(v) => onCustoChange(row.sku, v)} />
        </td>
        <td className="px-4 py-2.5 font-mono text-sm text-slate-700 dark:text-slate-200">
          {row.precoIdeal > 0 ? fmt(row.precoIdeal) : '—'}
        </td>
        <td className="px-4 py-2.5 font-mono text-sm">
          {row.precoMedioReal > 0 ? (
            <span className="flex items-center gap-1">
              {fmt(row.precoMedioReal)}
              {diff !== null && (
                <span
                  className={`text-[9px] font-bold ${diff >= 0 ? 'text-emerald-500' : 'text-red-400'}`}
                >
                  {diff >= 0 ? '+' : ''}
                  {diff.toFixed(0)}%
                </span>
              )}
            </span>
          ) : (
            <span className="text-slate-300 dark:text-slate-600 text-xs">sem dados</span>
          )}
        </td>
        <td className="px-4 py-2.5">
          {row.margemReal !== 0 || row.nVendas > 0 ? (
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${margemBadge(row.margemReal)}`}
            >
              {fmtPct(row.margemReal)}
            </span>
          ) : (
            <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
          )}
        </td>
        <td className="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 font-mono">
          {row.estoqueAtual > 0 ? (
            fmt(row.capitalImob)
          ) : (
            <span className="text-slate-300 dark:text-slate-600 text-xs">0</span>
          )}
        </td>
        <td className="px-4 py-2.5">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50 dark:bg-slate-800/50">
          <td colSpan={7} className="px-4 py-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {MARGEM_OPTS.map((m) => {
                const { precoVenda } = calcularPrecoIdeal({
                  custo: row.custo,
                  margemDesejada: m / 100,
                  comissaoShopee: COMISSAO_SHOPEE,
                  taxaFixa: TAXA_FIXA,
                  percentualAds: 0.02,
                  aliquotaDAS: 0.06,
                });
                return (
                  <div
                    key={m}
                    className={`rounded-lg px-3 py-2 ${m === margemAlvo ? 'bg-core-green/10 ring-1 ring-core-green/30' : 'bg-white dark:bg-slate-700'}`}
                  >
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Margem {m}%
                    </p>
                    <p
                      className={`text-base font-bold font-mono ${m === margemAlvo ? 'text-core-green' : 'text-slate-700 dark:text-slate-100'}`}
                    >
                      {precoVenda > 0 ? fmt(precoVenda) : '—'}
                    </p>
                  </div>
                );
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Precificacao() {
  const produtosAll = useStore((s) => s.produtos);
  const pedidosAll = useStore((s) => s.pedidos);
  const configuracoes = useStore((s) => s.configuracoes);
  const updateProduto = useStore((s) => s.updateProduto);
  const lojaFiltro = useStore((s) => s.lojaFiltro);

  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [margemAlvo, setMargemAlvo] = useState(20);
  const [busca, setBusca] = useState('');
  const [sortKey, setSortKey] = useState<'margem' | 'custo' | 'capital'>('margem');
  const [sortAsc, setSortAsc] = useState(true);

  const aliquotaDAS = (configuracoes.aliquotaDAS ?? 6) / 100;
  const percAds = (configuracoes.percentualMarketing ?? 2) / 100;

  const produtos = useMemo(
    () =>
      (lojaFiltro
        ? produtosAll.filter((p) => p.loja === lojaFiltro || p.loja === 'Ambas')
        : produtosAll
      ).filter((p) => p.ativo),
    [produtosAll, lojaFiltro]
  );

  // Receita e lucro por SKU a partir de pedidos concluídos
  const skuStats = useMemo(() => {
    const map = new Map<string, { receita: number; lucro: number; qtd: number; n: number }>();
    (lojaFiltro ? pedidosAll.filter((p) => p.loja === lojaFiltro) : pedidosAll)
      .filter((p) => p.status === 'Concluído' || p.status === 'Enviado')
      .forEach((p) => {
        const cur = map.get(p.sku) ?? { receita: 0, lucro: 0, qtd: 0, n: 0 };
        map.set(p.sku, {
          receita: cur.receita + p.receita,
          lucro: cur.lucro + p.lucroOperacional,
          qtd: cur.qtd + p.quantidade,
          n: cur.n + 1,
        });
      });
    return map;
  }, [pedidosAll, lojaFiltro]);

  // Build rows
  const rows: ProdRow[] = useMemo(() => {
    return produtos.map((p) => {
      const stats = skuStats.get(p.sku);
      const precoMedioReal = stats && stats.qtd > 0 ? stats.receita / stats.qtd : 0;
      const margemReal = stats && stats.receita > 0 ? (stats.lucro / stats.receita) * 100 : 0;
      const { precoVenda: precoIdeal } = calcularPrecoIdeal({
        custo: p.custoUnitario,
        margemDesejada: margemAlvo / 100,
        comissaoShopee: COMISSAO_SHOPEE,
        taxaFixa: TAXA_FIXA,
        percentualAds: percAds,
        aliquotaDAS,
      });
      return {
        sku: p.sku,
        nome: p.nome,
        loja: p.loja,
        custo: p.custoUnitario,
        estoqueAtual: p.estoqueAtual,
        precoIdeal,
        precoMedioReal,
        margemReal,
        capitalImob: p.custoUnitario * p.estoqueAtual,
        nVendas: stats?.n ?? 0,
      };
    });
  }, [produtos, skuStats, margemAlvo, aliquotaDAS, percAds]);

  // Filter + search + sort
  const rowsFiltradas = useMemo(() => {
    const cfg = FILTRO_CFG[filtro];
    return rows
      .filter((r) => {
        if (busca) {
          const q = busca.toLowerCase();
          if (!r.nome.toLowerCase().includes(q) && !r.sku.toLowerCase().includes(q)) return false;
        }
        if (filtro !== 'todos' && r.nVendas === 0) return false;
        return r.margemReal >= cfg.min && r.margemReal < cfg.max;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortKey === 'margem') diff = a.margemReal - b.margemReal;
        if (sortKey === 'custo') diff = a.custo - b.custo;
        if (sortKey === 'capital') diff = a.capitalImob - b.capitalImob;
        return sortAsc ? diff : -diff;
      });
  }, [rows, filtro, busca, sortKey, sortAsc]);

  // KPIs
  const margemMedia = useMemo(() => {
    const c = rows.filter((r) => r.nVendas > 0);
    return c.length > 0 ? c.reduce((s, r) => s + r.margemReal, 0) / c.length : 0;
  }, [rows]);
  const criticos = rows.filter((r) => r.nVendas > 0 && r.margemReal < 10).length;
  const capitalTotal = rows.reduce((s, r) => s + r.capitalImob, 0);
  const comDados = rows.filter((r) => r.nVendas > 0).length;

  const toggleSort = (k: typeof sortKey) => {
    if (sortKey === k) setSortAsc((a) => !a);
    else {
      setSortKey(k);
      setSortAsc(true);
    }
  };

  const SortIcon = ({ k }: { k: typeof sortKey }) =>
    sortKey === k ? (
      sortAsc ? (
        <ChevronUp size={10} className="inline ml-0.5" />
      ) : (
        <ChevronDown size={10} className="inline ml-0.5" />
      )
    ) : null;

  const exportar = () => {
    const headers = [
      'SKU',
      'Produto',
      'Custo (R$)',
      `Preço Ideal ${margemAlvo}% (R$)`,
      'Preço Médio Real (R$)',
      'Margem Real (%)',
      'Estoque',
      'Capital Imob. (R$)',
    ];
    const rows = rowsFiltradas.map((r) => [
      r.sku,
      r.nome,
      r.custo.toFixed(2),
      r.precoIdeal.toFixed(2),
      r.precoMedioReal.toFixed(2),
      r.margemReal.toFixed(1),
      r.estoqueAtual,
      r.capitalImob.toFixed(2),
    ]);
    exportXlsx('precificacao', [{ name: 'Precificação', headers, rows }]);
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-core-green/10 flex items-center justify-center">
            <Tag size={18} className="text-core-green" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Precificação</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Custos, margens e preços ideais por produto
            </p>
          </div>
        </div>
        <button
          onClick={exportar}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium"
        >
          <Download size={13} /> Exportar XLSX
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          {
            label: 'Margem média real',
            value: comDados > 0 ? fmtPct(margemMedia) : '—',
            sub: `${comDados} produtos com vendas`,
            icon: TrendingUp,
            accent: margemClass(margemMedia),
          },
          {
            label: 'Margem crítica',
            value: String(criticos),
            sub: 'produtos abaixo de 10%',
            icon: AlertTriangle,
            accent: criticos > 0 ? 'text-red-500' : 'text-slate-400',
          },
          {
            label: 'Capital em estoque',
            value: fmt(capitalTotal),
            sub: 'custo × estoque atual',
            icon: TrendingDown,
            accent: 'text-slate-700 dark:text-slate-200',
          },
          {
            label: 'Produtos analisados',
            value: String(rows.length),
            sub: `${comDados} com histórico de vendas`,
            icon: Tag,
            accent: 'text-slate-700 dark:text-slate-200',
          },
        ].map(({ label, value, sub, icon: Icon, accent }) => (
          <div key={label} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {label}
              </p>
              <Icon size={13} className={accent} />
            </div>
            <p className={`text-xl font-bold ${accent}`}>{value}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Controles */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Busca */}
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar produto ou SKU…"
          className="input-field text-sm w-56"
        />
        {/* Filtros */}
        <div className="flex gap-1.5 flex-wrap">
          {(Object.keys(FILTRO_CFG) as Filtro[]).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap ${
                filtro === f
                  ? 'bg-core-green text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {FILTRO_CFG[f].label}
            </button>
          ))}
        </div>
        {/* Margem alvo */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
            Margem alvo:
          </span>
          <select
            value={margemAlvo}
            onChange={(e) => setMargemAlvo(Number(e.target.value))}
            className="input-field text-sm py-1.5 pr-7"
          >
            {MARGEM_OPTS.map((m) => (
              <option key={m} value={m}>
                {m}%
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Produto
                </th>
                <th
                  onClick={() => toggleSort('custo')}
                  className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 select-none"
                >
                  Custo <SortIcon k="custo" />
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  Preço ideal ({margemAlvo}%)
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  Preço médio real
                </th>
                <th
                  onClick={() => toggleSort('margem')}
                  className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 select-none whitespace-nowrap"
                >
                  Margem real <SortIcon k="margem" />
                </th>
                <th
                  onClick={() => toggleSort('capital')}
                  className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 select-none whitespace-nowrap"
                >
                  Capital imob. <SortIcon k="capital" />
                </th>
                <th className="px-4 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {rowsFiltradas.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-slate-400 dark:text-slate-500 text-sm"
                  >
                    Nenhum produto encontrado com esses filtros.
                  </td>
                </tr>
              ) : (
                rowsFiltradas.map((r) => (
                  <TableRow
                    key={r.sku}
                    row={r}
                    margemAlvo={margemAlvo}
                    onCustoChange={(sku, v) => updateProduto(sku, { custoUnitario: v })}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500">
          {rowsFiltradas.length} produto{rowsFiltradas.length !== 1 ? 's' : ''} · Clique no custo
          para editar · ˅ para ver simulador de margens
        </div>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-600 text-center">
        Preço ideal calculado com: comissão Shopee 20% + ads {(percAds * 100).toFixed(0)}% + DAS{' '}
        {(aliquotaDAS * 100).toFixed(0)}% · ajuste nas Configurações
      </p>
    </div>
  );
}
