import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileBarChart2,
  Info,
  Lightbulb,
  Lock,
  Minus,
  ToggleLeft,
  ToggleRight,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { useStore } from '../../../store';
import type { Pedido } from '../../../types';
import { fmt, getMesAnterior } from '../../../utils/calculations';
import { C } from '../../../utils/chartColors';
import type { Recomendacao } from '../../../utils/dreInteligente';
import { generateAnaliseGestorOp } from '../../../utils/dreInteligente';
import { exportXlsx, xlsxNum } from '../../../utils/exportXlsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mesLabelLongo(mesAno: string) {
  return new Date(mesAno + '-02').toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
}

function mesLabelCurto(mesAno: string) {
  return new Date(mesAno + '-02')
    .toLocaleString('pt-BR', { month: 'short', year: '2-digit' })
    .replace('.', '');
}

function pctDe(valor: number, base: number) {
  if (base === 0) return 0;
  return (valor / base) * 100;
}

function fmtPctSinal(pct: number) {
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

// ─── Tipos de linha DRE ───────────────────────────────────────────────────────

type TipoLinha = 'section' | 'item' | 'subtotal' | 'total';

interface LinhaConfig {
  tipo: TipoLinha;
  label: string;
  valor: number;
  valorAnt?: number;
  base: number;
  negativo?: boolean; // exibe entre parênteses e vermelho quando negativo
  destacar?: boolean; // usa cor core-green
}

// ─── Waterfall ────────────────────────────────────────────────────────────────

interface WSegmento {
  label: string;
  valor: number;
  cor: string;
}

function Waterfall({ segmentos, total }: { segmentos: WSegmento[]; total: number }) {
  if (total <= 0) return null;
  return (
    <div className="card p-5 space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Composição da Receita Bruta
      </p>
      <div className="flex h-8 w-full rounded-xl overflow-hidden gap-[2px]">
        {segmentos.map((s, i) => {
          const pct = Math.max(0, pctDe(s.valor, total));
          if (pct < 0.5) return null;
          return (
            <div
              key={i}
              title={`${s.label}: ${fmt(s.valor)} (${pct.toFixed(1)}%)`}
              style={{ width: `${pct}%`, backgroundColor: s.cor }}
              className="h-full transition-all"
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {segmentos.map((s, i) => {
          const pct = pctDe(s.valor, total);
          if (pct < 0.5) return null;
          return (
            <div key={i} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: s.cor }}
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {s.label}{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {pct.toFixed(1)}%
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── LinhasDRE ────────────────────────────────────────────────────────────────

function DRELinha({ linha, showComp }: { linha: LinhaConfig; showComp: boolean }) {
  const { tipo, label, valor, valorAnt, base, negativo, destacar } = linha;

  const exibeParenteses = negativo && valor > 0;
  const valorExibido = exibeParenteses ? -valor : valor;

  // Cor do valor principal
  const corValor =
    tipo === 'total'
      ? destacar
        ? valorExibido >= 0
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-red-600 dark:text-red-400'
        : 'text-slate-800 dark:text-slate-100'
      : tipo === 'subtotal'
        ? valorExibido >= 0
          ? 'text-emerald-700 dark:text-emerald-400'
          : 'text-red-600 dark:text-red-400'
        : negativo
          ? 'text-slate-600 dark:text-slate-400'
          : 'text-slate-700 dark:text-slate-300';

  // Delta vs mês anterior
  const delta = valorAnt !== undefined ? valor - valorAnt : undefined;
  const deltaPct =
    delta !== undefined && valorAnt !== 0 ? (delta / Math.abs(valorAnt!)) * 100 : undefined;
  const DeltaIcon =
    deltaPct === undefined
      ? null
      : deltaPct > 2
        ? TrendingUp
        : deltaPct < -2
          ? TrendingDown
          : Minus;
  const deltaColor =
    deltaPct === undefined
      ? ''
      : (negativo ? deltaPct > 0 : deltaPct > 0)
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-red-500 dark:text-red-400';

  // Layout por tipo
  if (tipo === 'section') {
    return (
      <div className="flex items-center gap-2 px-5 pt-5 pb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex-1">
          {label}
        </p>
      </div>
    );
  }

  const isSubOrTotal = tipo === 'subtotal' || tipo === 'total';

  return (
    <div
      className={`
      flex items-center gap-3 px-5 py-2.5 transition-colors
      ${tipo === 'total' ? 'bg-slate-50 dark:bg-slate-700/30 border-t-2 border-slate-200 dark:border-slate-600 mt-1' : ''}
      ${tipo === 'subtotal' ? 'border-t border-slate-100 dark:border-slate-700/50 mt-0.5' : ''}
      ${tipo === 'item' ? 'hover:bg-slate-50/50 dark:hover:bg-slate-700/10' : ''}
    `}
    >
      {/* Indent para items */}
      {tipo === 'item' && <span className="w-3 flex-shrink-0" />}

      {/* Label */}
      <p
        className={`flex-1 text-[13px] leading-snug ${
          isSubOrTotal
            ? 'font-bold text-slate-800 dark:text-slate-100'
            : 'text-slate-600 dark:text-slate-300'
        }`}
      >
        {isSubOrTotal && (
          <span className="text-slate-400 dark:text-slate-500 mr-1.5 font-normal text-[11px]">
            =
          </span>
        )}
        {label}
      </p>

      {/* % da receita bruta */}
      <span
        className={`w-14 text-right text-[11px] font-mono ${
          isSubOrTotal
            ? 'font-semibold text-slate-500 dark:text-slate-400'
            : 'text-slate-400 dark:text-slate-500'
        }`}
      >
        {base > 0 ? `${pctDe(Math.abs(valor), base).toFixed(1)}%` : '—'}
      </span>

      {/* Valor principal */}
      <span className={`w-32 text-right text-[13px] font-mono font-semibold ${corValor}`}>
        {exibeParenteses ? `(${fmt(valor)})` : fmt(Math.abs(valorExibido))}
      </span>

      {/* Coluna comparação */}
      {showComp && (
        <div className="w-28 flex items-center justify-end gap-1.5">
          {DeltaIcon && delta !== undefined && (
            <>
              <DeltaIcon size={11} className={deltaColor} />
              <span className={`text-[11px] font-semibold font-mono ${deltaColor}`}>
                {deltaPct !== undefined ? fmtPctSinal(negativo ? -deltaPct : deltaPct) : '—'}
              </span>
            </>
          )}
          {valorAnt !== undefined && (
            <span className="text-[11px] text-slate-300 dark:text-slate-600 font-mono ml-1">
              {negativo && valorAnt > 0 ? `(${fmt(valorAnt)})` : fmt(Math.abs(valorAnt))}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Computação DRE ───────────────────────────────────────────────────────────

function computarDRE(
  pedidos: Pedido[],
  despesas: { data: string; categoria: string; valor: number }[],
  mes: string
) {
  const ped: Pedido[] = pedidos;
  const desp: typeof despesas = despesas;

  const pedMes = ped.filter((p) => p.data.startsWith(mes));
  const concluido = pedMes.filter((p) => p.status === 'Concluído' || p.status === 'Enviado');
  const devolvido = pedMes.filter((p) => p.status === 'Devolvido');
  const despMes = desp.filter((d) => d.data.startsWith(mes));

  const receitaBruta = concluido.reduce((s: number, p) => s + p.receita, 0);
  const descontos = concluido.reduce((s: number, p) => s + (p.desconto ?? 0), 0);
  const devolucoes = devolvido.reduce((s: number, p) => s + p.receita, 0);
  const receitaLiquida = receitaBruta - descontos - devolucoes;
  const cmv = concluido.reduce((s: number, p) => s + p.custoTotal, 0);
  const taxas = concluido.reduce((s: number, p) => s + p.taxaShopee, 0);
  const ads = concluido.reduce((s: number, p) => s + p.adsMarketing, 0);
  const das = concluido.reduce((s: number, p) => s + p.dasImposto, 0);
  const lucroOpBruto = receitaLiquida - cmv - taxas - ads - das;
  const pedidosQtd = concluido.length;

  const despesasPorCat = despMes.reduce((acc: Record<string, number>, d) => {
    acc[d.categoria] = (acc[d.categoria] ?? 0) + d.valor;
    return acc;
  }, {});
  const despesasTotal = despMes.reduce((s: number, d) => s + d.valor, 0);
  const resultado = lucroOpBruto - despesasTotal;
  const margem = receitaBruta > 0 ? (resultado / receitaBruta) * 100 : 0;
  const margemOp = receitaBruta > 0 ? (lucroOpBruto / receitaBruta) * 100 : 0;

  return {
    receitaBruta,
    descontos,
    devolucoes,
    receitaLiquida,
    cmv,
    taxas,
    ads,
    das,
    lucroOpBruto,
    despesasPorCat,
    despesasTotal,
    resultado,
    margem,
    margemOp,
    pedidosQtd,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function DREContent({ embedded = false }: { embedded?: boolean }) {
  const pedidosAll = useStore((s) => s.pedidos);
  const despesasAll = useStore((s) => s.despesas);
  const lojaFiltro = useStore((s) => s.lojaFiltro);
  const historico = useStore((s) => s.historico);
  const produtosAll = useStore((s) => s.produtos);
  const configuracoes = useStore((s) => s.configuracoes);

  const pedidos = useMemo(
    () =>
      lojaFiltro
        ? pedidosAll.filter((p) => p.loja === lojaFiltro || p.loja === 'Ambas')
        : pedidosAll,
    [pedidosAll, lojaFiltro]
  );

  const despesas = useMemo(
    () =>
      lojaFiltro
        ? despesasAll.filter((d) => d.loja === lojaFiltro || d.loja === 'Ambas')
        : despesasAll,
    [despesasAll, lojaFiltro]
  );

  const produtos = useMemo(
    () =>
      lojaFiltro
        ? produtosAll.filter((p) => p.loja === lojaFiltro || p.loja === 'Ambas')
        : produtosAll,
    [produtosAll, lojaFiltro]
  );

  // Meses disponíveis
  const mesesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    for (const p of pedidos) set.add(p.data.slice(0, 7));
    for (const d of despesas) set.add(d.data.slice(0, 7));
    return [...set].sort().reverse();
  }, [pedidos, despesas]);

  const hoje = new Date().toISOString().slice(0, 7);
  const [mes, setMes] = useState(mesesDisponiveis[0] ?? hoje);
  const [showComp, setShowComp] = useState(false);
  const [dismissed, setDismiss] = useState<Set<string>>(new Set());

  const mesAnt = getMesAnterior(mes);
  const idxMes = mesesDisponiveis.indexOf(mes);
  const temAntes = idxMes < mesesDisponiveis.length - 1;
  const temDepois = idxMes > 0;

  const dre = useMemo(() => computarDRE(pedidos, despesas, mes), [pedidos, despesas, mes]);
  const dreAnt = useMemo(() => computarDRE(pedidos, despesas, mesAnt), [pedidos, despesas, mesAnt]);

  const analise = useMemo(
    () =>
      generateAnaliseGestorOp({
        dre,
        dreAnt,
        historico,
        produtos,
        pedidos,
        configuracoes,
        mes,
      }),
    [dre, dreAnt, historico, produtos, pedidos, configuracoes, mes]
  );

  const temDados = dre.receitaBruta > 0 || dre.despesasTotal > 0;

  // Linhas DRE
  const linhas: LinhaConfig[] = useMemo(() => {
    const b = dre.receitaBruta;
    const rows: LinhaConfig[] = [
      { tipo: 'section', label: 'Receita', valor: 0, base: b },
      {
        tipo: 'item',
        label: 'Vendas de produtos',
        valor: dre.receitaBruta,
        valorAnt: dreAnt.receitaBruta,
        base: b,
      },
      ...(dre.descontos > 0
        ? [
            {
              tipo: 'item' as TipoLinha,
              label: 'Descontos concedidos',
              valor: dre.descontos,
              valorAnt: dreAnt.descontos,
              base: b,
              negativo: true,
            },
          ]
        : []),
      ...(dre.devolucoes > 0
        ? [
            {
              tipo: 'item' as TipoLinha,
              label: 'Devoluções / reembolsos',
              valor: dre.devolucoes,
              valorAnt: dreAnt.devolucoes,
              base: b,
              negativo: true,
            },
          ]
        : []),
      {
        tipo: 'subtotal',
        label: 'Receita Líquida',
        valor: dre.receitaLiquida,
        valorAnt: dreAnt.receitaLiquida,
        base: b,
      },

      { tipo: 'section', label: 'Custos de Venda (CMV)', valor: 0, base: b },
      {
        tipo: 'item',
        label: 'Custo das Mercadorias (CMV)',
        valor: dre.cmv,
        valorAnt: dreAnt.cmv,
        base: b,
        negativo: true,
      },
      {
        tipo: 'item',
        label: 'Taxas do marketplace',
        valor: dre.taxas,
        valorAnt: dreAnt.taxas,
        base: b,
        negativo: true,
      },
      {
        tipo: 'item',
        label: 'Marketing / Ads',
        valor: dre.ads,
        valorAnt: dreAnt.ads,
        base: b,
        negativo: true,
      },
      {
        tipo: 'item',
        label: 'Impostos (DAS / Simples)',
        valor: dre.das,
        valorAnt: dreAnt.das,
        base: b,
        negativo: true,
      },
      {
        tipo: 'subtotal',
        label: 'Lucro Operacional Bruto',
        valor: dre.lucroOpBruto,
        valorAnt: dreAnt.lucroOpBruto,
        base: b,
        destacar: true,
      },

      ...(Object.keys(dre.despesasPorCat).length > 0
        ? [
            { tipo: 'section' as TipoLinha, label: 'Despesas Operacionais', valor: 0, base: b },
            ...Object.entries(dre.despesasPorCat).map(([cat, val]) => ({
              tipo: 'item' as TipoLinha,
              label: cat,
              valor: val,
              valorAnt: dreAnt.despesasPorCat[cat] ?? 0,
              base: b,
              negativo: true,
            })),
            {
              tipo: 'subtotal' as TipoLinha,
              label: 'Total Despesas Operacionais',
              valor: dre.despesasTotal,
              valorAnt: dreAnt.despesasTotal,
              base: b,
              negativo: true,
            },
          ]
        : []),

      {
        tipo: 'total',
        label: 'Resultado Líquido do Período',
        valor: dre.resultado,
        valorAnt: dreAnt.resultado,
        base: b,
        destacar: true,
      },
    ];
    return rows;
  }, [dre, dreAnt]);

  // Waterfall segmentos
  const waterfall: WSegmento[] = useMemo(
    () => [
      { label: 'CMV', valor: dre.cmv, cor: '#f87171' },
      { label: 'Taxas', valor: dre.taxas, cor: '#fb923c' },
      { label: 'Ads', valor: dre.ads, cor: '#fbbf24' },
      { label: 'DAS', valor: dre.das, cor: '#a78bfa' },
      { label: 'Despesas', valor: dre.despesasTotal, cor: C.slate },
      {
        label: dre.resultado >= 0 ? 'Resultado' : 'Prejuízo',
        valor: Math.abs(dre.resultado),
        cor: dre.resultado >= 0 ? C.primary : C.red,
      },
    ],
    [dre]
  );

  if (mesesDisponiveis.length === 0) {
    return (
      <div className="p-6">
        <div className="card p-14 text-center">
          <FileBarChart2 size={36} className="text-slate-200 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">
            Nenhum dado disponível
          </h3>
          <p className="text-slate-400 dark:text-slate-500 text-sm">
            Importe pedidos para gerar o DRE.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? 'space-y-5' : 'p-6 space-y-5'}>
      {/* Header — hidden when embedded in fullscreen modal (modal has its own header) */}
      {!embedded && (
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 mb-0.5">
              <FileBarChart2 size={18} className="text-slate-400" />
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">DRE</h1>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                Demonstrativo de Resultados
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm pl-7 capitalize">
              {mesLabelLongo(mes)}
              {dre.pedidosQtd > 0 && ` · ${dre.pedidosQtd} pedidos`}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Export */}
            {temDados && (
              <button
                onClick={() => {
                  const rows = linhas
                    .filter((l) => l.tipo !== 'section')
                    .map((l) => [
                      l.tipo === 'subtotal' || l.tipo === 'total' ? `= ${l.label}` : `  ${l.label}`,
                      dre.receitaBruta > 0
                        ? `${((Math.abs(l.valor) / dre.receitaBruta) * 100).toFixed(1)}%`
                        : '',
                      xlsxNum(l.valor),
                    ]);
                  exportXlsx(`DRE_${mes}`, [
                    {
                      name: `DRE ${mes}`,
                      headers: ['Descrição', '% Receita Bruta', mesLabelCurto(mes)],
                      rows,
                    },
                  ]);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 transition-colors"
              >
                <Download size={13} /> Exportar
              </button>
            )}
            {/* Toggle comparação */}
            <button
              onClick={() => setShowComp(!showComp)}
              className={`inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-xl border transition-colors ${
                showComp
                  ? 'bg-core-green text-white border-core-green'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              {showComp ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
              vs {mesLabelCurto(mesAnt)}
            </button>

            {/* Seletor de mês */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => temAntes && setMes(mesesDisponiveis[idxMes + 1])}
                disabled={!temAntes}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={16} className="text-slate-500" />
              </button>
              <select
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className="text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-core-green/30"
              >
                {mesesDisponiveis.map((m) => (
                  <option key={m} value={m}>
                    {new Date(m + '-02').toLocaleString('pt-BR', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </option>
                ))}
              </select>
              <button
                onClick={() => temDepois && setMes(mesesDisponiveis[idxMes - 1])}
                disabled={!temDepois}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={16} className="text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI strip — resultado em destaque */}
      {temDados && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'Receita Bruta',
              val: dre.receitaBruta,
              ant: dreAnt.receitaBruta,
              cor: 'border-t-slate-300',
            },
            {
              label: 'Lucro Op. Bruto',
              val: dre.lucroOpBruto,
              ant: dreAnt.lucroOpBruto,
              cor: 'border-t-emerald-400',
            },
            {
              label: 'Margem Op.',
              val: dre.margemOp,
              ant: dreAnt.margemOp,
              cor: 'border-t-blue-400',
              isMargem: true,
            },
            {
              label: 'Resultado Líquido',
              val: dre.resultado,
              ant: dreAnt.resultado,
              cor: dre.resultado >= 0 ? 'border-t-core-green' : 'border-t-red-500',
            },
          ].map(({ label, val, ant, cor, isMargem }) => {
            const delta = ant !== 0 ? ((val - ant) / Math.abs(ant)) * 100 : 0;
            const isPos = delta >= 0;
            return (
              <div key={label} className={`card border-t-[3px] ${cor} p-4`}>
                <p
                  className={`text-lg font-bold leading-none ${
                    val < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-slate-800 dark:text-slate-100'
                  }`}
                >
                  {isMargem ? `${val.toFixed(1)}%` : fmt(val)}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
                  {label}
                </p>
                {showComp && ant !== 0 && (
                  <p
                    className={`text-[10px] font-semibold mt-1 flex items-center gap-0.5 ${isPos ? 'text-emerald-600' : 'text-red-500'}`}
                  >
                    {isPos ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {fmtPctSinal(delta)} vs {mesLabelCurto(mesAnt)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── DRE Inteligente ─────────────────────────────────────────────── */}
      {temDados &&
        (analise.pontosFortes.length > 0 ||
          analise.pontosAtencao.length > 0 ||
          analise.recomendacoes.length > 0) && (
          <div className="space-y-4">
            {/* Tabs de visão */}
            <div className="flex items-center gap-2 flex-wrap">
              <button className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 transition-colors">
                <Lightbulb size={12} />
                Gestor Operacional
              </button>
              {(['Consultor E-commerce', 'Investidor'] as const).map((v) => (
                <button
                  key={v}
                  disabled
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                >
                  <Lock size={11} />
                  {v}
                  <span className="ml-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded-full">
                    Em breve
                  </span>
                </button>
              ))}
            </div>

            {/* Pontos fortes + Atenção */}
            {(analise.pontosFortes.length > 0 || analise.pontosAtencao.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Pontos Fortes */}
                <div className="card p-4 space-y-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                      Pontos Fortes
                    </span>
                    {analise.pontosFortes.length > 0 && (
                      <span className="ml-auto text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 rounded-full">
                        {analise.pontosFortes.length}
                      </span>
                    )}
                  </div>
                  {analise.pontosFortes.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      Nenhum ponto forte identificado neste período.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {analise.pontosFortes.map((pf) => (
                        <li
                          key={pf.id}
                          className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300"
                        >
                          <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                          <span className="leading-snug">
                            {pf.texto}
                            {pf.valor && (
                              <span className="ml-1 font-bold text-emerald-600 dark:text-emerald-400">
                                {pf.valor}
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Pontos de Atenção */}
                <div className="card p-4 space-y-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                      Pontos de Atenção
                    </span>
                    {analise.pontosAtencao.length > 0 && (
                      <span className="ml-auto text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 rounded-full">
                        {analise.pontosAtencao.length}
                      </span>
                    )}
                  </div>
                  {analise.pontosAtencao.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      Nenhum ponto de atenção identificado.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {analise.pontosAtencao.map((pa) => (
                        <li
                          key={pa.id}
                          className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300"
                        >
                          <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                          <span className="leading-snug">
                            {pa.texto}
                            {pa.valor && (
                              <span className="ml-1 font-bold text-amber-600 dark:text-amber-400">
                                {pa.valor}
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* Recomendações */}
            {analise.recomendacoes.filter((r) => !dismissed.has(r.id)).length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <Lightbulb size={14} className="text-slate-500" />
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Recomendações
                  </span>
                </div>
                {analise.recomendacoes
                  .filter((r) => !dismissed.has(r.id))
                  .map((rec: Recomendacao) => {
                    const urgClr =
                      rec.urgencia === 'alta'
                        ? {
                            border: 'border-l-red-400',
                            badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                            icon: <AlertCircle size={12} />,
                          }
                        : rec.urgencia === 'media'
                          ? {
                              border: 'border-l-amber-400',
                              badge:
                                'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                              icon: <AlertTriangle size={12} />,
                            }
                          : {
                              border: 'border-l-blue-300',
                              badge:
                                'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
                              icon: <Info size={12} />,
                            };

                    return (
                      <div key={rec.id} className={`card p-4 border-l-4 ${urgClr.border}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${urgClr.badge}`}
                              >
                                {urgClr.icon}
                                {rec.urgencia}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                              {rec.acao}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                              {rec.racional}
                            </p>
                            {rec.impacto && (
                              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                ↑ {rec.impacto}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => setDismiss((prev) => new Set([...prev, rec.id]))}
                            className="flex-shrink-0 p-1 text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 rounded transition-colors"
                            title="Ignorar recomendação"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Disclaimer */}
            <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-start gap-1.5">
              <Info size={11} className="flex-shrink-0 mt-0.5" />
              Análise baseada nos dados disponíveis no sistema. Não substitui avaliação profissional
              contábil ou financeira.
            </p>
          </div>
        )}

      {/* DRE Table */}
      {temDados ? (
        <div className="card overflow-hidden">
          {/* Table header */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <p className="flex-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Descrição
            </p>
            <p className="w-14 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
              % RB
            </p>
            <p className="w-32 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {mesLabelCurto(mes)}
            </p>
            {showComp && (
              <p className="w-28 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Δ vs {mesLabelCurto(mesAnt)}
              </p>
            )}
          </div>

          {/* Linhas */}
          <div className="divide-y-0">
            {linhas.map((l, i) => (
              <DRELinha key={i} linha={l} showComp={showComp} />
            ))}
          </div>

          {/* Footer rodapé informativo */}
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              % RB = percentual em relação à Receita Bruta · Pedidos com status Concluído e Enviado
              · Devolvidos excluídos do lucro
            </p>
          </div>
        </div>
      ) : (
        <div className="card p-12 text-center">
          <FileBarChart2 size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Nenhum pedido ou despesa para este período.</p>
        </div>
      )}

      {/* Waterfall */}
      {temDados && dre.receitaBruta > 0 && (
        <Waterfall segmentos={waterfall} total={dre.receitaBruta} />
      )}
    </div>
  );
}

export default function DRE() {
  return <DREContent />;
}
