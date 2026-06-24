import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Package,
  RefreshCw,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { useStore } from '../store';
import { fmt } from '../utils/calculations';
import { exportXlsx } from '../utils/exportXlsx';

// ─── Constants ────────────────────────────────────────────────────────────────

const LEAD_TIME = 7; // days until stock arrives
const COBERTURA = 45; // target days of coverage
const JANELA_VEND = 30; // days of sales history for velocity

// ─── Types ────────────────────────────────────────────────────────────────────

type Urgencia = 'critico' | 'atencao' | 'ok';

interface ItemReposicao {
  sku: string;
  nome: string;
  loja: string;
  categoria: string;
  estoqueAtual: number;
  estoqueSeguranca: number;
  custoUnitario: number;
  vendaDia: number;
  diasCobertura: number;
  pontoReposicao: number;
  qtdSugerida: number;
  custoEstimado: number;
  fornecedor: string;
  urgencia: Urgencia;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const URG_CFG: Record<
  Urgencia,
  { label: string; dot: string; row: string; badge: string; icon: React.ElementType }
> = {
  critico: {
    label: 'Crítico',
    dot: 'bg-red-500 animate-pulse',
    row: 'bg-red-50/50 dark:bg-red-950/10',
    badge: 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400',
    icon: AlertTriangle,
  },
  atencao: {
    label: 'Atenção',
    dot: 'bg-amber-400',
    row: 'bg-amber-50/50 dark:bg-amber-950/10',
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400',
    icon: Clock,
  },
  ok: {
    label: 'OK',
    dot: 'bg-emerald-400',
    row: '',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400',
    icon: CheckCircle2,
  },
};

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KCard({
  label,
  value,
  sub,
  color,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <Icon size={13} className={color ?? 'text-slate-400'} />
      </div>
      <p className={`text-xl font-bold ${color ?? 'text-slate-900 dark:text-slate-100'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Grupo de fornecedor ──────────────────────────────────────────────────────

function GrupoFornecedor({ fornecedor, itens }: { fornecedor: string; itens: ItemReposicao[] }) {
  const [expanded, setExpanded] = useState(true);
  const totalCusto = itens.reduce((s, i) => s + i.custoEstimado, 0);
  const temCritico = itens.some((i) => i.urgencia === 'critico');

  return (
    <div className="card overflow-hidden">
      {/* Header do fornecedor */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Truck size={14} className="text-slate-500 dark:text-slate-400" />
          <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">
            {fornecedor}
          </span>
          {temCritico && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
          <span className="text-xs text-slate-500 dark:text-slate-400">
            · {itens.length} SKU{itens.length > 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200 font-mono">
            {fmt(totalCusto)}
          </span>
          {expanded ? (
            <ChevronUp size={13} className="text-slate-400" />
          ) : (
            <ChevronDown size={13} className="text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700">
              {[
                'Status',
                'Produto',
                'Estoque',
                'Cobertura',
                'Ponto Rep.',
                'Qtd sugerida',
                'Custo unit.',
                'Custo total',
              ].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {itens.map((item) => {
              const cfg = URG_CFG[item.urgencia];
              return (
                <tr
                  key={item.sku}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors ${cfg.row}`}
                >
                  <td className="px-3 py-2.5">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit ${cfg.badge}`}
                    >
                      <span className={`w-1 h-1 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-slate-800 dark:text-slate-100 truncate max-w-[160px]">
                      {item.nome}
                    </p>
                    <p className="text-xs text-slate-400 font-mono">{item.sku}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <span
                        className={`font-bold text-sm ${item.estoqueAtual <= item.estoqueSeguranca ? 'text-red-500' : 'text-slate-700 dark:text-slate-200'}`}
                      >
                        {item.estoqueAtual}
                      </span>
                      {item.estoqueSeguranca > 0 && (
                        <span className="text-[9px] text-slate-400">
                          / min {item.estoqueSeguranca}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`text-sm font-medium ${
                        item.diasCobertura < 7
                          ? 'text-red-500'
                          : item.diasCobertura < 30
                            ? 'text-amber-500'
                            : 'text-emerald-600'
                      }`}
                    >
                      {item.vendaDia > 0
                        ? item.diasCobertura === Infinity
                          ? '∞'
                          : `${Math.round(item.diasCobertura)}d`
                        : '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 text-sm">
                    {item.vendaDia > 0 ? Math.ceil(item.pontoReposicao) : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`font-bold text-sm ${item.qtdSugerida > 0 ? 'text-core-green' : 'text-slate-400'}`}
                    >
                      {item.qtdSugerida > 0 ? item.qtdSugerida : '0'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-slate-600 dark:text-slate-300 text-sm">
                    {fmt(item.custoUnitario)}
                  </td>
                  <td className="px-3 py-2.5 font-mono font-semibold text-slate-800 dark:text-slate-100 text-sm">
                    {item.custoEstimado > 0 ? fmt(item.custoEstimado) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
              <td colSpan={6} />
              <td className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Total pedido
              </td>
              <td className="px-3 py-2 font-mono font-bold text-core-green">{fmt(totalCusto)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type FiltroUrgencia = 'todos' | 'critico' | 'atencao' | 'ok';

export default function Reposicao() {
  const produtosAll = useStore((s) => s.produtos);
  const pedidosAll = useStore((s) => s.pedidos);
  const comprasAll = useStore((s) => s.compras);
  const lojaFiltro = useStore((s) => s.lojaFiltro);

  const [filtro, setFiltro] = useState<FiltroUrgencia>('todos');
  const [busca, setBusca] = useState('');
  const [showOK, setShowOK] = useState(false);

  const hoje = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const produtos = useMemo(
    () =>
      (lojaFiltro
        ? produtosAll.filter((p) => p.loja === lojaFiltro || p.loja === 'Ambas')
        : produtosAll
      ).filter((p) => p.ativo),
    [produtosAll, lojaFiltro]
  );

  const pedidos = useMemo(
    () =>
      (lojaFiltro ? pedidosAll.filter((p) => p.loja === lojaFiltro) : pedidosAll).filter(
        (p) => p.status === 'Concluído' || p.status === 'Enviado'
      ),
    [pedidosAll, lojaFiltro]
  );

  const compras = useMemo(
    () =>
      lojaFiltro
        ? comprasAll.filter((c) => c.loja === lojaFiltro || c.loja === 'Ambas')
        : comprasAll,
    [comprasAll, lojaFiltro]
  );

  // Most recent supplier per SKU
  const fornecedorPorSku = useMemo(() => {
    const map = new Map<string, string>();
    compras
      .slice()
      .sort((a, b) => a.data.localeCompare(b.data))
      .forEach((c) => {
        if (c.fornecedor) map.set(c.sku, c.fornecedor);
      });
    return map;
  }, [compras]);

  // Build items
  const items: ItemReposicao[] = useMemo(() => {
    const cutoff = new Date(hoje);
    cutoff.setDate(hoje.getDate() - JANELA_VEND);
    const cutISO = cutoff.toISOString().slice(0, 10);

    // Vendas por SKU nos últimos JANELA_VEND dias
    const vendaMap = new Map<string, number>();
    pedidos
      .filter((p) => p.data >= cutISO)
      .forEach((p) => vendaMap.set(p.sku, (vendaMap.get(p.sku) ?? 0) + p.quantidade));

    return produtos.map((prod) => {
      const vendaTotal = vendaMap.get(prod.sku) ?? 0;
      const vendaDia = vendaTotal / JANELA_VEND;
      const diasCob = vendaDia > 0 ? prod.estoqueAtual / vendaDia : Infinity;
      const pontRep = vendaDia * (LEAD_TIME + 7); // lead time + safety
      const qtdSug = Math.max(0, Math.ceil(vendaDia * COBERTURA) - prod.estoqueAtual);
      const custoEst = qtdSug * prod.custoUnitario;

      let urgencia: Urgencia;
      if (prod.estoqueAtual <= prod.estoqueSeguranca || diasCob < LEAD_TIME) {
        urgencia = 'critico';
      } else if (diasCob < 30 || prod.estoqueAtual < pontRep) {
        urgencia = 'atencao';
      } else {
        urgencia = 'ok';
      }

      return {
        sku: prod.sku,
        nome: prod.nome,
        loja: prod.loja,
        categoria: prod.categoria,
        estoqueAtual: prod.estoqueAtual,
        estoqueSeguranca: prod.estoqueSeguranca,
        custoUnitario: prod.custoUnitario,
        vendaDia,
        diasCobertura: diasCob,
        pontoReposicao: pontRep,
        qtdSugerida: qtdSug,
        custoEstimado: custoEst,
        fornecedor: fornecedorPorSku.get(prod.sku) ?? 'Sem fornecedor',
        urgencia,
      };
    });
  }, [produtos, pedidos, fornecedorPorSku, hoje]);

  // Filtered items
  const itemsFiltrados = useMemo(() => {
    return items
      .filter((i) => {
        if (filtro !== 'todos' && i.urgencia !== filtro) return false;
        if (!showOK && filtro === 'todos' && i.urgencia === 'ok' && i.qtdSugerida === 0)
          return false;
        if (busca) {
          const q = busca.toLowerCase();
          if (!i.nome.toLowerCase().includes(q) && !i.sku.toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const order: Record<Urgencia, number> = { critico: 0, atencao: 1, ok: 2 };
        if (order[a.urgencia] !== order[b.urgencia]) return order[a.urgencia] - order[b.urgencia];
        return a.diasCobertura - b.diasCobertura;
      });
  }, [items, filtro, busca, showOK]);

  // Group by supplier
  const grupos = useMemo(() => {
    const map = new Map<string, ItemReposicao[]>();
    itemsFiltrados.forEach((i) => {
      const list = map.get(i.fornecedor) ?? [];
      list.push(i);
      map.set(i.fornecedor, list);
    });
    // Sort groups: those with critical items first, then by total cost desc
    return [...map.entries()].sort(([, a], [, b]) => {
      const aCrit = a.some((x) => x.urgencia === 'critico') ? 1 : 0;
      const bCrit = b.some((x) => x.urgencia === 'critico') ? 1 : 0;
      if (aCrit !== bCrit) return bCrit - aCrit;
      return (
        b.reduce((s, i) => s + i.custoEstimado, 0) - a.reduce((s, i) => s + i.custoEstimado, 0)
      );
    });
  }, [itemsFiltrados]);

  // KPIs
  const criticos = items.filter((i) => i.urgencia === 'critico').length;
  const atencao = items.filter((i) => i.urgencia === 'atencao').length;
  const custoTotal = itemsFiltrados.reduce((s, i) => s + i.custoEstimado, 0);
  const nFornecedores = grupos.length;

  const exportar = () => {
    const headers = [
      'SKU',
      'Produto',
      'Fornecedor',
      'Estoque Atual',
      'Estoque Mín.',
      'Venda/Dia (30d)',
      'Cobertura (dias)',
      'Qtd Sugerida',
      'Custo Unit. (R$)',
      'Custo Total (R$)',
      'Urgência',
    ];
    const rows = itemsFiltrados.map((i) => [
      i.sku,
      i.nome,
      i.fornecedor,
      i.estoqueAtual,
      i.estoqueSeguranca,
      i.vendaDia.toFixed(2),
      i.diasCobertura === Infinity ? '∞' : Math.round(i.diasCobertura),
      i.qtdSugerida,
      i.custoUnitario.toFixed(2),
      i.custoEstimado.toFixed(2),
      URG_CFG[i.urgencia].label,
    ]);
    exportXlsx('reposicao', [{ name: 'Reposição', headers, rows }]);
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-core-green/10 flex items-center justify-center">
            <RefreshCw size={18} className="text-core-green" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Reposição de Estoque
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Velocidade dos últimos {JANELA_VEND} dias · cobertura alvo {COBERTURA} dias · lead
              time {LEAD_TIME} dias
            </p>
          </div>
        </div>
        <button
          onClick={exportar}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium"
        >
          <Download size={12} /> Exportar lista de compra
        </button>
      </div>

      {/* Alertas críticos */}
      {criticos > 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl">
          <AlertTriangle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">
            <span className="font-semibold">
              {criticos} produto{criticos > 1 ? 's' : ''} em estado crítico
            </span>{' '}
            — estoque abaixo do mínimo ou cobertura inferior a {LEAD_TIME} dias. Pedido urgente
            necessário.
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KCard
          label="Críticos"
          value={String(criticos)}
          sub="abaixo do mínimo ou < 7d"
          color={criticos > 0 ? 'text-red-500' : 'text-slate-400'}
          icon={AlertTriangle}
        />
        <KCard
          label="Atenção"
          value={String(atencao)}
          sub="cobertura entre 7 e 30 dias"
          color={atencao > 0 ? 'text-amber-500' : 'text-slate-400'}
          icon={Clock}
        />
        <KCard
          label="Custo do pedido"
          value={fmt(custoTotal)}
          sub={`${itemsFiltrados.filter((i) => i.qtdSugerida > 0).length} SKUs a repor`}
          color="text-slate-900 dark:text-slate-100"
          icon={ShoppingBag}
        />
        <KCard
          label="Fornecedores"
          value={String(nFornecedores)}
          sub="agrupados na lista"
          color="text-slate-900 dark:text-slate-100"
          icon={Truck}
        />
      </div>

      {/* Controles */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar SKU ou produto…"
          className="input-field text-sm w-52"
        />
        <div className="flex gap-1.5">
          {(
            [
              ['todos', 'Todos'],
              ['critico', 'Crítico'],
              ['atencao', 'Atenção'],
              ['ok', 'OK'],
            ] as [FiltroUrgencia, string][]
          ).map(([f, label]) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap ${
                filtro === f
                  ? 'bg-core-green text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {filtro === 'todos' && (
          <button
            onClick={() => setShowOK((v) => !v)}
            className="ml-auto text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            {showOK ? 'Ocultar OK sem pedido' : 'Mostrar todos (incl. OK)'}
          </button>
        )}
      </div>

      {/* Grupos por fornecedor */}
      {grupos.length === 0 ? (
        <div className="card p-14 text-center">
          <Package size={36} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">
            Nenhum produto encontrado
          </h3>
          <p className="text-slate-400 dark:text-slate-500 text-sm">
            {filtro !== 'todos'
              ? 'Nenhum produto com esse status.'
              : 'Cadastre produtos e importe pedidos para gerar a lista de reposição.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {grupos.map(([fornecedor, itens]) => (
            <GrupoFornecedor key={fornecedor} fornecedor={fornecedor} itens={itens} />
          ))}

          {/* Total geral */}
          {custoTotal > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-core-green/5 border border-core-green/20 rounded-xl">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Investimento total estimado —{' '}
                {itemsFiltrados.filter((i) => i.qtdSugerida > 0).length} SKUs de {nFornecedores}{' '}
                fornecedor{nFornecedores > 1 ? 'es' : ''}
              </span>
              <span className="text-lg font-bold text-core-green font-mono">{fmt(custoTotal)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
