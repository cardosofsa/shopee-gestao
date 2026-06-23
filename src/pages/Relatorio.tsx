import { useMemo, useRef, useState } from 'react';
import {
  Printer, ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  ShoppingCart, DollarSign, Percent, Package, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell,
} from 'recharts';
import { useStore } from '../store';
import { computeDRE } from '../domain/dre';
import { fmt, fmtPct } from '../utils/calculations';
import { useAlertas } from '../hooks/useAlertas';
import { C } from '../utils/chartColors';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function monthLabel(mes: string) {
  return new Date(mes + '-02').toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
}
function monthShort(mes: string) {
  return new Date(mes + '-02').toLocaleString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
}
function prevMes(mes: string) {
  const [y, m] = mes.split('-').map(Number);
  return new Date(y, m - 2, 1).toISOString().slice(0, 7);
}

// ─── DRE line ─────────────────────────────────────────────────────────────────

function DRELine({ label, value, indent = 0, bold = false, total = false }: {
  label: string; value: number; indent?: number; bold?: boolean; total?: boolean;
}) {
  const color = total ? (value >= 0 ? 'text-emerald-600' : 'text-red-500') : (bold ? 'text-slate-800 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300');
  return (
    <div className={`flex items-center justify-between py-1 ${indent > 0 ? `pl-${indent * 4}` : ''} ${total ? 'border-t border-b border-slate-200 dark:border-slate-600 my-1' : ''}`}>
      <span className={`text-sm ${bold || total ? 'font-semibold' : ''} ${color}`}>{label}</span>
      <span className={`text-sm font-mono ${color} ${bold || total ? 'font-bold' : ''}`}>{fmt(value)}</span>
    </div>
  );
}

// ─── Print styles injected into <head> ────────────────────────────────────────

const PRINT_STYLE = `
@media print {
  body * { visibility: hidden !important; }
  #relatorio-printarea, #relatorio-printarea * { visibility: visible !important; }
  #relatorio-printarea {
    position: fixed !important;
    inset: 0 !important;
    background: white !important;
    z-index: 9999 !important;
    overflow: visible !important;
    padding: 24px 32px !important;
  }
  .no-print { display: none !important; }
}
`;

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Relatorio() {
  const pedidosAll    = useStore((s) => s.pedidos);
  const despesasAll   = useStore((s) => s.despesas);
  const configuracoes = useStore((s) => s.configuracoes);
  const lojaFiltro    = useStore((s) => s.lojaFiltro);
  const alertas       = useAlertas();

  const mesAtual = new Date().toISOString().slice(0, 7);
  const [mes, setMes] = useState(mesAtual);

  const printRef = useRef<HTMLDivElement>(null);

  const pedidos = useMemo(
    () => (lojaFiltro ? pedidosAll.filter((p) => p.loja === lojaFiltro) : pedidosAll),
    [pedidosAll, lojaFiltro],
  );
  const despesas = useMemo(
    () => (lojaFiltro ? despesasAll.filter((d) => d.loja === lojaFiltro || d.loja === 'Ambas') : despesasAll),
    [despesasAll, lojaFiltro],
  );

  const dre    = useMemo(() => computeDRE(pedidos, despesas, mes),              [pedidos, despesas, mes]);
  const dreAnt = useMemo(() => computeDRE(pedidos, despesas, prevMes(mes)),     [pedidos, despesas, mes]);

  const delta = (cur: number, prev: number) => prev !== 0 ? ((cur - prev) / Math.abs(prev)) * 100 : 0;
  const deltaFat    = delta(dre.faturamentoBruto, dreAnt.faturamentoBruto);
  const deltaMargem = dre.margemPercentual - dreAnt.margemPercentual;

  // ── Tendência 6 meses ────────────────────────────────────────────────────
  const tendencia = useMemo(() => {
    const [y0, m0] = mes.split('-').map(Number);
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(y0, m0 - 1 - (5 - i), 1);
      const m = d.toISOString().slice(0, 7);
      const r = computeDRE(pedidos, despesas, m);
      return { name: monthShort(m), receita: r.faturamentoBruto, lucro: r.lucroLiquido };
    });
  }, [pedidos, despesas, mes]);

  // ── Top 5 produtos ────────────────────────────────────────────────────────
  const topProdutos = useMemo(() => {
    const map = new Map<string, { nome: string; receita: number; qtd: number; lucro: number }>();
    pedidos
      .filter((p) => p.data.startsWith(mes) && (p.status === 'Concluído' || p.status === 'Enviado'))
      .forEach((p) => {
        const cur = map.get(p.sku) ?? { nome: p.produto, receita: 0, qtd: 0, lucro: 0 };
        map.set(p.sku, { nome: p.produto, receita: cur.receita + p.receita, qtd: cur.qtd + p.quantidade, lucro: cur.lucro + p.lucroOperacional });
      });
    return [...map.entries()]
      .map(([sku, v]) => ({ sku, ...v, margem: v.receita > 0 ? (v.lucro / v.receita) * 100 : 0 }))
      .sort((a, b) => b.receita - a.receita)
      .slice(0, 5);
  }, [pedidos, mes]);

  // ── Alertas contagem ─────────────────────────────────────────────────────
  const criticos = alertas.filter((a) => a.severidade === 'critico').length;
  const avisos   = alertas.filter((a) => a.severidade === 'aviso').length;

  const nomeEmpresa = configuracoes.nomeEmpresa || (lojaFiltro ?? 'CORE Business OS');
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const handlePrint = () => window.print();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLE }} />

      <div className="p-6 space-y-4">

        {/* Controles — ocultos na impressão */}
        <div className="no-print flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-core-green/10 flex items-center justify-center">
              <Printer size={18} className="text-core-green" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Relatório Executivo</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm capitalize">{monthLabel(mes)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
              <button onClick={() => { const [y,m]=mes.split('-').map(Number); setMes(new Date(y,m-2,1).toISOString().slice(0,7)); }} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"><ChevronLeft size={15} /></button>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200 capitalize px-2 min-w-36 text-center">{monthLabel(mes)}</span>
              <button onClick={() => { const [y,m]=mes.split('-').map(Number); setMes(new Date(y,m,1).toISOString().slice(0,7)); }} disabled={mes===mesAtual} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight size={15} /></button>
            </div>
            <button
              onClick={handlePrint}
              className="btn-primary flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl"
            >
              <Printer size={14} /> Imprimir / PDF
            </button>
          </div>
        </div>

        {/* ────────────── ÁREA IMPRIMÍVEL ────────────── */}
        <div id="relatorio-printarea" ref={printRef} className="space-y-5 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">

          {/* Cabeçalho do relatório */}
          <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-full border-2 border-core-green flex-shrink-0" />
                <span className="text-xs font-light tracking-[0.25em] text-slate-500 uppercase">CORE Business OS</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 capitalize">{monthLabel(mes)}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{nomeEmpresa}{lojaFiltro ? ` · ${lojaFiltro}` : ''}</p>
            </div>
            <div className="text-right text-xs text-slate-400 dark:text-slate-500">
              <p>Gerado em {hoje}</p>
              <p className="mt-0.5 font-mono">Ref: {mes}</p>
            </div>
          </div>

          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {[
              { label: 'Faturamento', value: fmt(dre.faturamentoBruto), delta: deltaFat,    icon: DollarSign },
              { label: 'Pedidos',     value: String(dre.pedidosQtd),    delta: delta(dre.pedidosQtd, dreAnt.pedidosQtd), icon: ShoppingCart },
              { label: 'Ticket Médio',value: fmt(dre.ticketMedio),      delta: delta(dre.ticketMedio, dreAnt.ticketMedio), icon: DollarSign },
              { label: 'Margem',      value: fmtPct(dre.margemPercentual), delta: deltaMargem, icon: Percent },
              { label: 'Lucro Líq.',  value: fmt(dre.lucroLiquido),     delta: delta(dre.lucroLiquido, dreAnt.lucroLiquido), icon: TrendingUp },
              { label: 'Despesas',    value: fmt(dre.despesasOperacionais), delta: -delta(dre.despesasOperacionais, dreAnt.despesasOperacionais), icon: Package },
            ].map(({ label, value, delta: d, icon: Icon }) => (
              <div key={label} className="rounded-xl border border-slate-100 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                  <Icon size={11} className="text-slate-300" />
                </div>
                <p className="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">{value}</p>
                {d !== 0 && (
                  <p className={`text-[9px] font-medium flex items-center gap-0.5 mt-0.5 ${d >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {d >= 0 ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
                    {d >= 0 ? '+' : ''}{d.toFixed(1)}% vs mês ant.
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Tendência + DRE */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

            {/* Gráfico tendência 6m */}
            <div className="rounded-xl border border-slate-100 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Tendência — 6 meses</p>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={tendencia} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#18B37A" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#18B37A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: C.slate }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: C.slate }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} width={38} />
                  <Tooltip formatter={(v: unknown, n: unknown) => [fmt(Number(v)), n === 'receita' ? 'Receita' : 'Lucro']} contentStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="receita" stroke={C.primary} strokeWidth={2} fill="url(#rGrad)" />
                  <Area type="monotone" dataKey="lucro"   stroke={C.amber} strokeWidth={1.5} fill="none" strokeDasharray="3 2" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-1 text-[9px] text-slate-400 justify-end">
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-core-green inline-block rounded" /> Receita</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-400 inline-block rounded" style={{ borderTop: '1.5px dashed #f59e0b', background: 'transparent' }} /> Lucro</span>
              </div>
            </div>

            {/* DRE resumida */}
            <div className="rounded-xl border border-slate-100 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">DRE Resumida</p>
              <div className="space-y-0.5">
                <DRELine label="Faturamento bruto"       value={dre.faturamentoBruto}       bold />
                <DRELine label="(-) CMV"                 value={-dre.cmv}                   indent={1} />
                <DRELine label="= Lucro bruto"           value={dre.lucroBruto}             bold />
                <DRELine label="(-) Taxas Shopee"        value={-dre.taxasShopee}           indent={1} />
                <DRELine label="(-) Ads / Marketing"     value={-dre.marketingAds}          indent={1} />
                <DRELine label="= Lucro operacional"     value={dre.lucroOperacional}       bold />
                <DRELine label="(-) DAS / Impostos"      value={-dre.dasImposto}            indent={1} />
                <DRELine label="(-) Despesas operac."    value={-dre.despesasOperacionais}  indent={1} />
                <DRELine label="= Lucro líquido"         value={dre.lucroLiquido}           bold total />
                <DRELine label="Margem líquida"          value={dre.margemPercentual} />
              </div>
            </div>
          </div>

          {/* Top Produtos */}
          {topProdutos.length > 0 && (
            <div className="rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Top 5 Produtos — {monthLabel(mes)}</p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50/50 dark:bg-slate-800/50">
                  <tr>
                    {['#', 'Produto', 'Receita', 'Unidades', 'Margem'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {topProdutos.map((p, i) => (
                    <tr key={p.sku}>
                      <td className="px-3 py-2 text-slate-400 text-xs">{i + 1}</td>
                      <td className="px-3 py-2">
                        <p className="font-medium text-slate-800 dark:text-slate-100 truncate max-w-[200px]">{p.nome}</p>
                        <p className="text-xs text-slate-400 font-mono">{p.sku}</p>
                      </td>
                      <td className="px-3 py-2 font-mono text-sm text-slate-700 dark:text-slate-200">{fmt(p.receita)}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{p.qtd}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs font-bold ${p.margem >= 20 ? 'text-emerald-600' : p.margem >= 10 ? 'text-amber-500' : 'text-red-500'}`}>
                          {fmtPct(p.margem)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Mini bar chart */}
              <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                <ResponsiveContainer width="100%" height={70}>
                  <BarChart data={topProdutos} layout="horizontal" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                    <XAxis dataKey="nome" tick={{ fontSize: 8, fill: C.slate }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => v.length > 12 ? v.slice(0, 12) + '…' : v} />
                    <YAxis hide />
                    <Tooltip formatter={(v: unknown) => [fmt(Number(v)), 'Receita']} contentStyle={{ fontSize: 11 }} />
                    <Bar dataKey="receita" radius={[3, 3, 0, 0]}>
                      {topProdutos.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? C.primary : C.slate} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Alertas + Rodapé */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-100 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Status de Alertas</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm font-bold text-red-500">{criticos}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">crítico{criticos !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-sm font-bold text-amber-500">{avisos}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">aviso{avisos !== 1 ? 's' : ''}</span>
                </div>
                {criticos === 0 && avisos === 0 && (
                  <div className="flex items-center gap-1.5 text-emerald-600">
                    <CheckCircle2 size={14} />
                    <span className="text-xs font-medium">Tudo em ordem</span>
                  </div>
                )}
                {criticos > 0 && (
                  <div className="flex items-center gap-1.5 text-red-500 ml-auto">
                    <AlertTriangle size={13} />
                    <span className="text-xs">Ação necessária</span>
                  </div>
                )}
              </div>
              {alertas.filter((a) => a.severidade === 'critico').slice(0, 3).map((a) => (
                <p key={a.id} className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-start gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1 flex-shrink-0" />
                  {a.titulo}
                </p>
              ))}
            </div>

            <div className="rounded-xl border border-core-green/20 p-4 bg-core-green/5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-core-green mb-3">Resumo do Período</p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Melhor métrica</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {deltaFat > 0 && deltaMargem > 0 ? 'Receita e margem ↑' :
                     deltaFat > 0 ? `Receita +${deltaFat.toFixed(1)}%` :
                     deltaMargem > 0 ? `Margem +${deltaMargem.toFixed(1)}pp` : 'Abaixo do mês ant.'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Resultado</span>
                  <span className={`font-bold ${dre.lucroLiquido >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {dre.lucroLiquido >= 0 ? 'Lucro' : 'Prejuízo'} de {fmt(Math.abs(dre.lucroLiquido))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Margem líquida</span>
                  <span className={`font-bold ${dre.margemPercentual >= 15 ? 'text-emerald-600' : dre.margemPercentual >= 5 ? 'text-amber-500' : 'text-red-500'}`}>
                    {fmtPct(dre.margemPercentual)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500">
            <span>Relatório gerado em {hoje} · CORE Business OS</span>
            <span className="font-mono">{nomeEmpresa}</span>
          </div>

        </div>
        {/* ────────────────────────────────────── */}

      </div>
    </>
  );
}
