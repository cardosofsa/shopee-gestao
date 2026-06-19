import { useState, useMemo } from 'react';
import { Plus, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useStore } from '../store';
import { fmt, fmtPct } from '../utils/calculations';
import { exportarRelatorioMensal } from '../utils/exportRelatorio';
import type { HistoricoMensal } from '../types';

function AddHistoricoModal({ onClose }: { onClose: () => void }) {
  const addHistorico = useStore((s) => s.addHistorico);
  const [form, setForm] = useState<Omit<HistoricoMensal, 'lucroBruto' | 'lucroOperacional' | 'lucroLiquido' | 'margemPercentual'>>({
    mesAno: '', faturamentoBruto: 0, pedidosQtd: 0, ticketMedio: 0,
    unidadesVendidas: 0, cmv: 0, taxasShopee: 0, dasImposto: 0,
    marketingAds: 0, despesasOperacionais: 0,
  });

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }));

  const lucroBruto = form.faturamentoBruto - form.cmv;
  const lucroOp = lucroBruto - form.taxasShopee - form.marketingAds;
  const lucroLiq = lucroOp - form.dasImposto - form.despesasOperacionais;
  const margem = form.faturamentoBruto > 0 ? (lucroLiq / form.faturamentoBruto) * 100 : 0;

  const save = () => {
    if (!form.mesAno) return;
    addHistorico({ ...form, lucroBruto, lucroOperacional: lucroOp, lucroLiquido: lucroLiq, margemPercentual: margem });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Lançar Mês Fechado</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="text-xs text-slate-500 mb-1 block">Mês/Ano (YYYY-MM)</label><input className="input" placeholder="2026-05" value={form.mesAno} onChange={f('mesAno')} /></div>
          <div><label className="text-xs text-slate-500 mb-1 block">Faturamento Bruto</label><input type="number" step="0.01" className="input" value={form.faturamentoBruto} onChange={f('faturamentoBruto')} /></div>
          <div><label className="text-xs text-slate-500 mb-1 block">Pedidos</label><input type="number" className="input" value={form.pedidosQtd} onChange={f('pedidosQtd')} /></div>
          <div><label className="text-xs text-slate-500 mb-1 block">Ticket Médio</label><input type="number" step="0.01" className="input" value={form.ticketMedio} onChange={f('ticketMedio')} /></div>
          <div><label className="text-xs text-slate-500 mb-1 block">Unidades Vendidas</label><input type="number" className="input" value={form.unidadesVendidas} onChange={f('unidadesVendidas')} /></div>
          <div><label className="text-xs text-slate-500 mb-1 block">CMV (Custo Mercadoria)</label><input type="number" step="0.01" className="input" value={form.cmv} onChange={f('cmv')} /></div>
          <div><label className="text-xs text-slate-500 mb-1 block">Taxas Shopee</label><input type="number" step="0.01" className="input" value={form.taxasShopee} onChange={f('taxasShopee')} /></div>
          <div><label className="text-xs text-slate-500 mb-1 block">DAS / Imposto</label><input type="number" step="0.01" className="input" value={form.dasImposto} onChange={f('dasImposto')} /></div>
          <div><label className="text-xs text-slate-500 mb-1 block">Marketing / Ads</label><input type="number" step="0.01" className="input" value={form.marketingAds} onChange={f('marketingAds')} /></div>
          <div><label className="text-xs text-slate-500 mb-1 block">Despesas Operacionais</label><input type="number" step="0.01" className="input" value={form.despesasOperacionais} onChange={f('despesasOperacionais')} /></div>
          <div className="col-span-2 bg-slate-50 rounded-lg p-3 grid grid-cols-4 gap-3 text-sm">
            <div><p className="text-slate-400 text-xs">Lucro Bruto</p><p className="font-bold text-slate-800">{fmt(lucroBruto)}</p></div>
            <div><p className="text-slate-400 text-xs">Lucro Op.</p><p className="font-bold text-slate-800">{fmt(lucroOp)}</p></div>
            <div><p className="text-slate-400 text-xs">Lucro Líq.</p><p className={`font-bold ${lucroLiq >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(lucroLiq)}</p></div>
            <div><p className="text-slate-400 text-xs">Margem</p><p className={`font-bold ${margem >= 20 ? 'text-emerald-600' : 'text-amber-600'}`}>{fmtPct(margem)}</p></div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={save}>Salvar Mês</button>
        </div>
      </div>
    </div>
  );
}

export default function Financeiro() {
  const historico = useStore((s) => s.historico);
  const pedidos = useStore((s) => s.pedidos);
  const despesas = useStore((s) => s.despesas);
  const produtos = useStore((s) => s.produtos);
  const [showAdd, setShowAdd] = useState(false);
  const [mesDRE, setMesDRE] = useState(() => new Date().toISOString().slice(0, 7));

  const mesAtual = new Date().toISOString().slice(0, 7);
  const isCurrentMonth = mesDRE === mesAtual;
  const mesLabel = new Date(mesDRE + '-02').toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    const [y, m] = mesDRE.split('-').map(Number);
    setMesDRE(new Date(y, m - 2, 1).toISOString().slice(0, 7));
  };
  const nextMonth = () => {
    const [y, m] = mesDRE.split('-').map(Number);
    setMesDRE(new Date(y, m, 1).toISOString().slice(0, 7));
  };

  const dreLive = useMemo(() => {
    const doMes = pedidos.filter((p) => p.data.startsWith(mesDRE) && (p.status === 'Concluído' || p.status === 'Enviado'));
    const fat = doMes.reduce((s, p) => s + p.receita, 0);
    const cmv = doMes.reduce((s, p) => s + p.custoTotal, 0);
    const taxas = doMes.reduce((s, p) => s + p.taxaShopee, 0);
    const ads = doMes.reduce((s, p) => s + p.adsMarketing, 0);
    const das = doMes.reduce((s, p) => s + p.dasImposto, 0);
    const despesasOp = despesas.filter((d) => d.data.startsWith(mesDRE)).reduce((s, d) => s + d.valor, 0);
    const lucroBruto = fat - cmv;
    const lucroOp = lucroBruto - taxas - ads;
    const lucroLiq = lucroOp - das - despesasOp;
    return { fat, cmv, taxas, ads, das, despesasOp, lucroBruto, lucroOp, lucroLiq, margem: fat > 0 ? (lucroLiq / fat) * 100 : 0, pedidos: doMes.length };
  }, [pedidos, despesas, mesDRE]);

  const handleExport = () => {
    exportarRelatorioMensal(mesDRE, pedidos, despesas, produtos, {
      fat: dreLive.fat, cmv: dreLive.cmv, taxas: dreLive.taxas, ads: dreLive.ads,
      das: dreLive.das, despesasOp: dreLive.despesasOp, lucroBruto: dreLive.lucroBruto,
      lucroOp: dreLive.lucroOp, lucroLiq: dreLive.lucroLiq, margem: dreLive.margem,
      pedidosQtd: dreLive.pedidos, mesLabel,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Financeiro</h1>
          <p className="text-slate-500 text-sm">DRE mensal e histórico</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-slate-700 capitalize px-2 min-w-36 text-center">{mesLabel}</span>
            <button onClick={nextMonth} disabled={isCurrentMonth} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronRight size={16} />
            </button>
          </div>
          <button className="btn-secondary" onClick={handleExport}>
            <Download size={15} /> Exportar Excel
          </button>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={15} /> Lançar Mês Fechado
          </button>
        </div>
      </div>

      {/* DRE */}
      <div className="card p-5">
        <h2 className="text-slate-700 font-semibold text-sm mb-4 capitalize">
          DRE · {mesLabel}{isCurrentMonth ? ' (em andamento)' : ''}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
          {[
            { label: 'Faturamento Bruto', value: dreLive.fat, color: 'text-shopee-600' },
            { label: 'Pedidos', value: dreLive.pedidos, isNum: true, color: 'text-blue-600' },
            { label: 'Ticket Médio', value: dreLive.pedidos > 0 ? dreLive.fat / dreLive.pedidos : 0, color: 'text-slate-700' },
            { label: 'Lucro Operacional', value: dreLive.lucroOp, color: 'text-emerald-600' },
            { label: 'Lucro Líquido', value: dreLive.lucroLiq, color: dreLive.lucroLiq >= 0 ? 'text-emerald-700 font-extrabold' : 'text-red-500' },
          ].map((item) => (
            <div key={item.label} className="bg-slate-50 rounded-lg p-3">
              <p className="text-slate-400 text-xs mb-1 leading-tight">{item.label}</p>
              <p className={`font-bold text-xl ${item.color}`}>
                {item.isNum ? item.value : fmt(item.value as number)}
              </p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'CMV', value: dreLive.cmv, color: 'text-red-500' },
            { label: 'Taxas Shopee', value: dreLive.taxas, color: 'text-red-400' },
            { label: 'Marketing / Ads', value: dreLive.ads, color: 'text-slate-500' },
            { label: 'DAS / Imposto', value: dreLive.das, color: 'text-slate-500' },
            { label: 'Despesas Op.', value: dreLive.despesasOp, color: dreLive.despesasOp > 0 ? 'text-amber-600' : 'text-slate-400' },
            { label: 'Margem Líquida', value: dreLive.margem, isPct: true, color: dreLive.margem >= 20 ? 'text-emerald-600' : dreLive.margem >= 0 ? 'text-amber-500' : 'text-red-500' },
          ].map((item) => (
            <div key={item.label} className="bg-slate-50 rounded-lg p-3">
              <p className="text-slate-400 text-xs mb-1 leading-tight">{item.label}</p>
              <p className={`font-bold text-base ${item.color}`}>
                {item.isPct ? fmtPct(item.value) : fmt(item.value as number)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Histórico Mensal */}
      <div className="card">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-slate-700 font-semibold text-sm">Histórico Mensal · Evolução da Operação</h2>
          <p className="text-slate-400 text-xs">{historico.length} meses lançados</p>
        </div>
        {historico.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-300 text-sm">Nenhum mês fechado lançado ainda.</p>
            <p className="text-slate-300 text-xs mt-1">Clique em "Lançar Mês Fechado" ao encerrar cada mês.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Mês/Ano', 'Fat. Bruto', 'Pedidos', 'Ticket Médio', 'Unidades', 'CMV', 'Taxas', 'DAS', 'Marketing', 'Desp. Op.', 'Lucro Bruto', 'Lucro Op.', 'Lucro Líq.', 'Margem %', 'Δ Fat.'].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[...historico].sort((a, b) => b.mesAno.localeCompare(a.mesAno)).map((h, i, arr) => {
                  const prev = arr[i + 1];
                  const deltaFat = prev ? ((h.faturamentoBruto - prev.faturamentoBruto) / prev.faturamentoBruto) * 100 : null;
                  return (
                    <tr key={h.mesAno} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-3 font-medium text-slate-800">{h.mesAno}</td>
                      <td className="px-3 py-3 text-shopee-600 font-medium">{fmt(h.faturamentoBruto)}</td>
                      <td className="px-3 py-3 text-slate-600">{h.pedidosQtd}</td>
                      <td className="px-3 py-3 text-slate-600">{fmt(h.ticketMedio)}</td>
                      <td className="px-3 py-3 text-slate-600">{h.unidadesVendidas}</td>
                      <td className="px-3 py-3 text-red-400">{fmt(h.cmv)}</td>
                      <td className="px-3 py-3 text-red-400">{fmt(h.taxasShopee)}</td>
                      <td className="px-3 py-3 text-slate-500">{fmt(h.dasImposto)}</td>
                      <td className="px-3 py-3 text-slate-500">{fmt(h.marketingAds)}</td>
                      <td className="px-3 py-3 text-slate-500">{fmt(h.despesasOperacionais)}</td>
                      <td className="px-3 py-3 text-slate-700 font-medium">{fmt(h.lucroBruto)}</td>
                      <td className="px-3 py-3 text-emerald-600 font-medium">{fmt(h.lucroOperacional)}</td>
                      <td className={`px-3 py-3 font-bold ${h.lucroLiquido >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(h.lucroLiquido)}</td>
                      <td className={`px-3 py-3 font-medium ${h.margemPercentual >= 20 ? 'text-emerald-600' : 'text-amber-500'}`}>{fmtPct(h.margemPercentual)}</td>
                      <td className="px-3 py-3">
                        {deltaFat !== null && (
                          <span className={`text-xs font-medium ${deltaFat >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {deltaFat >= 0 ? '+' : ''}{fmtPct(deltaFat)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && <AddHistoricoModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
