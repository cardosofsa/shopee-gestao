import { useState, useMemo } from 'react';
import {
  Plus, ChevronLeft, ChevronRight, Download, Pencil, Trash2, X,
  Target, Settings, ChevronDown, TrendingUp, TrendingDown, Lock,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import * as XLSX from 'xlsx';
import { useStore } from '../store';
import { fmt, fmtPct } from '../utils/calculations';
import { exportarRelatorioMensal } from '../utils/exportRelatorio';
import { computeDRE } from '../domain/dre';
import type { DREResult } from '../domain/dre';
import type { HistoricoMensal } from '../types';
import { useToast } from '../components/Toast';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const monthLabel = (mesAno: string) =>
  new Date(mesAno + '-02').toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

const monthShort = (mesAno: string) =>
  new Date(mesAno + '-02').toLocaleString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');

function calcLucros(f: Omit<HistoricoMensal, 'lucroBruto' | 'lucroOperacional' | 'lucroLiquido' | 'margemPercentual'>) {
  const lucroBruto       = f.faturamentoBruto - f.cmv;
  const lucroOperacional = lucroBruto - f.taxasShopee - f.marketingAds;
  const lucroLiquido     = lucroOperacional - f.dasImposto - f.despesasOperacionais;
  const margemPercentual = f.faturamentoBruto > 0 ? (lucroLiquido / f.faturamentoBruto) * 100 : 0;
  return { lucroBruto, lucroOperacional, lucroLiquido, margemPercentual };
}

// ─── DeltaBadge ──────────────────────────────────────────────────────────────

function DeltaBadge({ cur, prev }: { cur: number; prev: number }) {
  if (prev === 0 || cur === 0) return null;
  const d = ((cur - prev) / Math.abs(prev)) * 100;
  const pos = d >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium mt-0.5 ${pos ? 'text-emerald-600' : 'text-red-500'}`}>
      {pos ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
      {pos ? '+' : ''}{d.toFixed(1)}% vs mês ant.
    </span>
  );
}

// ─── ChartTooltip ─────────────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-medium text-slate-700 dark:text-slate-200 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  );
};

// ─── HistoricoForm ────────────────────────────────────────────────────────────

type FormBase = Omit<HistoricoMensal, 'lucroBruto' | 'lucroOperacional' | 'lucroLiquido' | 'margemPercentual'>;

function HistoricoForm({ title, initial, lockMes, onSave, onClose }: {
  title: string; initial: FormBase; lockMes: boolean;
  onSave: (h: HistoricoMensal) => void; onClose: () => void;
}) {
  const [form, setForm] = useState<FormBase>(initial);
  const f = (k: keyof FormBase) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }));
  const { lucroBruto, lucroOperacional, lucroLiquido, margemPercentual } = calcLucros(form);
  const save = () => { if (!form.mesAno) return; onSave({ ...form, lucroBruto, lucroOperacional, lucroLiquido, margemPercentual }); };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-xl max-h-[94vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Mês/Ano (YYYY-MM)</label>
            <input className="input" placeholder="2026-05" value={form.mesAno} onChange={f('mesAno')} disabled={lockMes} readOnly={lockMes} />
          </div>
          <div><label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Faturamento Bruto</label>
            <input type="number" step="0.01" className="input" value={form.faturamentoBruto} onChange={f('faturamentoBruto')} /></div>
          <div><label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Pedidos</label>
            <input type="number" className="input" value={form.pedidosQtd} onChange={f('pedidosQtd')} /></div>
          <div><label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Ticket Médio</label>
            <input type="number" step="0.01" className="input" value={form.ticketMedio} onChange={f('ticketMedio')} /></div>
          <div><label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Unidades Vendidas</label>
            <input type="number" className="input" value={form.unidadesVendidas} onChange={f('unidadesVendidas')} /></div>
          <div><label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">CMV</label>
            <input type="number" step="0.01" className="input" value={form.cmv} onChange={f('cmv')} /></div>
          <div><label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Taxas Shopee</label>
            <input type="number" step="0.01" className="input" value={form.taxasShopee} onChange={f('taxasShopee')} /></div>
          <div><label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">DAS / Imposto</label>
            <input type="number" step="0.01" className="input" value={form.dasImposto} onChange={f('dasImposto')} /></div>
          <div><label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Marketing / Ads</label>
            <input type="number" step="0.01" className="input" value={form.marketingAds} onChange={f('marketingAds')} /></div>
          <div><label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Despesas Operacionais</label>
            <input type="number" step="0.01" className="input" value={form.despesasOperacionais} onChange={f('despesasOperacionais')} /></div>
          <div className="col-span-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 grid grid-cols-4 gap-3 text-sm">
            <div><p className="text-slate-400 text-xs mb-0.5">Lucro Bruto</p><p className="font-bold text-slate-800 dark:text-slate-100">{fmt(lucroBruto)}</p></div>
            <div><p className="text-slate-400 text-xs mb-0.5">Lucro Op.</p><p className="font-bold text-slate-800 dark:text-slate-100">{fmt(lucroOperacional)}</p></div>
            <div><p className="text-slate-400 text-xs mb-0.5">Lucro Líq.</p>
              <p className={`font-bold ${lucroLiquido >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(lucroLiquido)}</p></div>
            <div><p className="text-slate-400 text-xs mb-0.5">Margem</p>
              <p className={`font-bold ${margemPercentual >= 20 ? 'text-emerald-600' : 'text-amber-600'}`}>{fmtPct(margemPercentual)}</p></div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={save}>Salvar Mês</button>
        </div>
      </div>
    </div>
  );
}

// ─── ConfirmDeleteModal ───────────────────────────────────────────────────────

function ConfirmDeleteModal({ mesAno, onConfirm, onCancel }: {
  mesAno: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-5 text-center">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <Trash2 size={20} className="text-red-500" />
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Excluir mês {mesAno}?</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Esta ação não pode ser desfeita.</p>
        </div>
        <div className="px-6 pb-5 flex gap-3">
          <button className="btn-secondary flex-1 justify-center" onClick={onCancel}>Cancelar</button>
          <button className="btn-danger flex-1 justify-center" onClick={onConfirm}>Excluir</button>
        </div>
      </div>
    </div>
  );
}

// ─── DRE Cascata ─────────────────────────────────────────────────────────────

function DreCascata({ dre, despesasPorCategoria }: {
  dre: DREResult;
  despesasPorCategoria: [string, number][];
}) {
  const [showDesp, setShowDesp] = useState(false);
  const { faturamentoBruto: fat, cmv, taxasShopee, marketingAds, dasImposto, despesasOperacionais, lucroLiquido: lucroLiq } = dre;
  if (fat === 0) return null;

  const pct = (v: number) => Math.max(0, Math.min(100, (v / fat) * 100));
  const lucroPositivo = Math.max(0, lucroLiq);

  const items = [
    { label: 'CMV',           value: cmv,                  color: 'bg-red-400',    text: 'text-red-500',    bar: 'bg-red-400'    },
    { label: 'Taxas Shopee',  value: taxasShopee,          color: 'bg-orange-400', text: 'text-orange-500', bar: 'bg-orange-400' },
    { label: 'Marketing/Ads', value: marketingAds,         color: 'bg-amber-400',  text: 'text-amber-600',  bar: 'bg-amber-400'  },
    { label: 'DAS/Imposto',   value: dasImposto,           color: 'bg-slate-400',  text: 'text-slate-500',  bar: 'bg-slate-400'  },
    { label: 'Despesas Op.',  value: despesasOperacionais, color: 'bg-sky-400',    text: 'text-sky-600',    bar: 'bg-sky-400'    },
  ];

  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="w-full h-5 flex rounded-lg overflow-hidden gap-px">
        {items.map((it) => (
          <div key={it.label} style={{ width: `${pct(it.value)}%` }}
            className={`${it.color} flex-shrink-0 transition-all`} title={`${it.label}: ${fmt(it.value)}`} />
        ))}
        <div style={{ width: `${pct(lucroPositivo)}%` }}
          className="bg-emerald-500 flex-shrink-0 rounded-r-lg transition-all" title={`Lucro Líquido: ${fmt(lucroLiq)}`} />
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
        {items.map((it) => (
          <span key={it.label} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-sm flex-shrink-0 ${it.color}`} />
            {it.label} · {fmtPct(pct(it.value))}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm flex-shrink-0 bg-emerald-500" />
          Lucro Líq. · {fmtPct(pct(lucroPositivo))}
        </span>
      </div>

      {/* Linhas detalhadas */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center gap-3">
          <span className="w-28 text-xs text-slate-600 dark:text-slate-300 font-medium text-right flex-shrink-0">Faturamento</span>
          <div className="flex-1 h-1.5 bg-shopee-400 rounded-full" />
          <span className="w-20 text-right text-xs font-bold text-shopee-600">{fmt(fat)}</span>
          <span className="w-10 text-right text-xs text-slate-400">100%</span>
        </div>
        <div className="h-px bg-slate-100 dark:bg-slate-700 mx-28" />
        {items.map((it) => (
          <div key={it.label}>
            <div className="flex items-center gap-3">
              <span className="w-28 text-xs text-slate-500 dark:text-slate-400 text-right flex-shrink-0">− {it.label}</span>
              <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full ${it.bar} rounded-full`} style={{ width: `${pct(it.value)}%` }} />
              </div>
              <span className={`w-20 text-right text-xs font-medium ${it.text}`}>{fmt(it.value)}</span>
              <span className="w-10 text-right text-xs text-slate-400">{fmtPct(pct(it.value))}</span>
            </div>
            {/* Breakdown de despesas */}
            {it.label === 'Despesas Op.' && despesasPorCategoria.length > 0 && (
              <div className="ml-28 mt-1 pl-4">
                <button onClick={() => setShowDesp(!showDesp)}
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                  <ChevronDown size={10} className={`transition-transform ${showDesp ? 'rotate-180' : ''}`} />
                  {showDesp ? 'Ocultar detalhamento' : 'Ver detalhamento por categoria'}
                </button>
                {showDesp && (
                  <div className="mt-1.5 space-y-1 border-l-2 border-slate-100 dark:border-slate-700 pl-3">
                    {despesasPorCategoria.map(([cat, val]) => (
                      <div key={cat} className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">{cat}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">{fmt(val)}</span>
                          <span className="text-[10px] text-slate-400 w-8 text-right">{fmtPct(pct(val))}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div className="h-px bg-slate-200 dark:bg-slate-600 mx-28" />
        <div className="flex items-center gap-3">
          <span className={`w-28 text-xs font-semibold text-right flex-shrink-0 ${lucroLiq >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>= Lucro Líq.</span>
          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full ${lucroLiq >= 0 ? 'bg-emerald-500' : 'bg-red-400'} rounded-full`}
              style={{ width: `${pct(lucroPositivo)}%` }} />
          </div>
          <span className={`w-20 text-right text-xs font-bold ${lucroLiq >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(lucroLiq)}</span>
          <span className={`w-10 text-right text-xs font-medium ${lucroLiq >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
            {fmtPct((lucroLiq / fat) * 100)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Financeiro() {
  const toast               = useToast();
  const historico           = useStore((s) => s.historico);
  const pedidosAll          = useStore((s) => s.pedidos);
  const despesasAll         = useStore((s) => s.despesas);
  const produtos            = useStore((s) => s.produtos);
  const lojaFiltro          = useStore((s) => s.lojaFiltro);
  const pedidos  = useMemo(
    () => lojaFiltro ? pedidosAll.filter((p) => p.loja === lojaFiltro) : pedidosAll,
    [pedidosAll, lojaFiltro],
  );
  const despesas = useMemo(
    () => lojaFiltro ? despesasAll.filter((d) => d.loja === lojaFiltro || d.loja === 'Ambas') : despesasAll,
    [despesasAll, lojaFiltro],
  );
  const configuracoes       = useStore((s) => s.configuracoes);
  const addHistorico        = useStore((s) => s.addHistorico);
  const updateHistorico     = useStore((s) => s.updateHistorico);
  const deleteHistorico     = useStore((s) => s.deleteHistorico);
  const updateConfiguracoes = useStore((s) => s.updateConfiguracoes);

  const [showAdd,          setShowAdd]          = useState(false);
  const [editMes,          setEditMes]          = useState<HistoricoMensal | null>(null);
  const [deleteMes,        setDeleteMes]        = useState<string | null>(null);
  const [showMeta,         setShowMeta]         = useState(false);
  const [showFecharMes,    setShowFecharMes]    = useState(false);
  const [metaFatInput,     setMetaFatInput]     = useState(String(configuracoes.metaFaturamento ?? ''));
  const [metaMargemInput,  setMetaMargemInput]  = useState(String(configuracoes.metaMargem ?? ''));

  const [mesDRE, setMesDRE] = useState(() => new Date().toISOString().slice(0, 7));

  const mesAtual       = new Date().toISOString().slice(0, 7);
  const isCurrentMonth = mesDRE === mesAtual;
  const mesLabelStr    = monthLabel(mesDRE);

  const prevMonth = () => { const [y, m] = mesDRE.split('-').map(Number); setMesDRE(new Date(y, m - 2, 1).toISOString().slice(0, 7)); };
  const nextMonth = () => { const [y, m] = mesDRE.split('-').map(Number); setMesDRE(new Date(y, m, 1).toISOString().slice(0, 7)); };

  // ── Mês anterior para comparativo (melhoria 2) ───────────────────────────
  const prevMesDRE = useMemo(() => {
    const [y, m] = mesDRE.split('-').map(Number);
    return new Date(y, m - 2, 1).toISOString().slice(0, 7);
  }, [mesDRE]);

  const dreLive = useMemo(() => computeDRE(pedidos, despesas, mesDRE),     [pedidos, despesas, mesDRE]);
  const drePrev = useMemo(() => computeDRE(pedidos, despesas, prevMesDRE), [pedidos, despesas, prevMesDRE]);

  // ── Breakdown de despesas por categoria (melhoria 1) ─────────────────────
  const despesasPorCategoria = useMemo(() => {
    const grouped = new Map<string, number>();
    despesas
      .filter((d) => d.data.startsWith(mesDRE))
      .forEach((d) => grouped.set(d.categoria, (grouped.get(d.categoria) ?? 0) + d.valor));
    return [...grouped.entries()].sort((a, b) => b[1] - a[1]);
  }, [despesas, mesDRE]);

  // ── Projeção ──────────────────────────────────────────────────────────────
  const projecao = useMemo(() => {
    if (!isCurrentMonth || dreLive.faturamentoBruto === 0) return null;
    const hoje      = new Date();
    const diasDecor = hoje.getDate();
    const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
    const fatProj   = (dreLive.faturamentoBruto / diasDecor) * diasNoMes;
    const lucroProj = (dreLive.lucroLiquido / diasDecor) * diasNoMes;
    return { diasDecor, diasNoMes, fatProj, lucroProj, margemProj: fatProj > 0 ? (lucroProj / fatProj) * 100 : 0 };
  }, [isCurrentMonth, dreLive]);

  // ── Meta ──────────────────────────────────────────────────────────────────
  const metaFat        = configuracoes.metaFaturamento ?? 0;
  const metaMargem     = configuracoes.metaMargem ?? 0;
  const pctMetaFat     = metaFat    > 0 ? Math.min(100, (dreLive.faturamentoBruto  / metaFat)    * 100) : 0;
  const pctMetaMargem  = metaMargem > 0 ? Math.min(100, (dreLive.margemPercentual  / metaMargem) * 100) : 0;

  const saveMeta = () => {
    updateConfiguracoes({ metaFaturamento: parseFloat(metaFatInput) || undefined, metaMargem: parseFloat(metaMargemInput) || undefined });
    setShowMeta(false);
    toast('Meta salva.', 'success');
  };

  // ── Gráfico evolução ──────────────────────────────────────────────────────
  const chartData = useMemo(() =>
    [...historico]
      .sort((a, b) => a.mesAno.localeCompare(b.mesAno))
      .map((h) => ({ name: monthShort(h.mesAno), Faturamento: h.faturamentoBruto, 'Lucro Op.': h.lucroOperacional, 'Lucro Líq.': h.lucroLiquido })),
    [historico]
  );

  // ── Resumo anual (melhoria 3) ─────────────────────────────────────────────
  const resumoAnual = useMemo(() => {
    const byYear = new Map<string, { fat: number; lucro: number; margens: number[]; pedidos: number; meses: number }>();
    historico.forEach((h) => {
      const ano  = h.mesAno.slice(0, 4);
      const prev = byYear.get(ano) ?? { fat: 0, lucro: 0, margens: [], pedidos: 0, meses: 0 };
      byYear.set(ano, { fat: prev.fat + h.faturamentoBruto, lucro: prev.lucro + h.lucroLiquido,
        margens: [...prev.margens, h.margemPercentual], pedidos: prev.pedidos + h.pedidosQtd, meses: prev.meses + 1 });
    });
    return [...byYear.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([ano, d]) => ({
        ano, fat: d.fat, lucro: d.lucro,
        margemMedia: d.margens.reduce((s, m) => s + m, 0) / d.margens.length,
        pedidos: d.pedidos, meses: d.meses,
      }));
  }, [historico]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const historicoOrdenado = useMemo(
    () => [...historico].sort((a, b) => b.mesAno.localeCompare(a.mesAno)),
    [historico]
  );

  const handleExport = () => {
    exportarRelatorioMensal(mesDRE, pedidos, despesas, produtos, dreLive, mesLabelStr);
  };

  const jaFechado = historico.some((h) => h.mesAno === mesDRE);

  const confirmarFecharMes = () => {
    if (jaFechado) {
      updateHistorico(mesDRE, dreLive);
      toast(`${mesLabelStr} re-fechado com valores atualizados.`, 'success');
    } else {
      addHistorico(dreLive);
      toast(`${mesLabelStr} fechado com sucesso.`, 'success');
    }
    setShowFecharMes(false);
  };

  // Exportar histórico completo (melhoria 4)
  const exportHistorico = () => {
    const data = historicoOrdenado.map((h) => ({
      'Mês/Ano':          h.mesAno,
      'Fat. Bruto (R$)':  h.faturamentoBruto,
      'Pedidos':          h.pedidosQtd,
      'Ticket Médio (R$)': h.ticketMedio,
      'Unidades':         h.unidadesVendidas,
      'CMV (R$)':         h.cmv,
      'Taxas Shopee (R$)': h.taxasShopee,
      'DAS/Imposto (R$)': h.dasImposto,
      'Marketing/Ads (R$)': h.marketingAds,
      'Despesas Op. (R$)': h.despesasOperacionais,
      'Lucro Bruto (R$)': h.lucroBruto,
      'Lucro Op. (R$)':   h.lucroOperacional,
      'Lucro Líq. (R$)':  h.lucroLiquido,
      'Margem %':         h.margemPercentual.toFixed(2),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Histórico');
    XLSX.writeFile(wb, `historico_financeiro_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast(`${historico.length} meses exportados.`, 'success');
  };

  const emptyHistorico: FormBase = {
    mesAno: '', faturamentoBruto: 0, pedidosQtd: 0, ticketMedio: 0,
    unidadesVendidas: 0, cmv: 0, taxasShopee: 0, dasImposto: 0,
    marketingAds: 0, despesasOperacionais: 0,
  };

  // ── KPIs com comparativo ──────────────────────────────────────────────────
  const kpis = [
    { label: 'Faturamento Bruto', value: dreLive.faturamentoBruto,  prev: drePrev.faturamentoBruto,  color: 'text-shopee-600' },
    { label: 'Pedidos',           value: dreLive.pedidosQtd,        prev: drePrev.pedidosQtd,        color: 'text-blue-600',  isNum: true },
    { label: 'Ticket Médio',      value: dreLive.ticketMedio,       prev: drePrev.ticketMedio,       color: 'text-slate-700' },
    { label: 'Lucro Operacional', value: dreLive.lucroOperacional,  prev: drePrev.lucroOperacional,  color: 'text-emerald-600' },
    { label: 'Lucro Líquido',     value: dreLive.lucroLiquido,      prev: drePrev.lucroLiquido,      color: dreLive.lucroLiquido >= 0 ? 'text-emerald-700' : 'text-red-500' },
  ];

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">

      {/* Dialog: Fechar Mês */}
      {showFecharMes && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[300] p-4" onClick={() => setShowFecharMes(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-1">
              <Lock size={16} className={jaFechado ? 'text-amber-500' : 'text-emerald-500'} />
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                {jaFechado ? 'Re-fechar mês?' : 'Fechar mês?'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 capitalize">{mesLabelStr}</p>
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 space-y-1.5 mb-4">
              {[
                { label: 'Faturamento', value: dreLive.faturamentoBruto },
                { label: 'Lucro Bruto', value: dreLive.lucroBruto },
                { label: 'Lucro Operacional', value: dreLive.lucroOperacional },
                { label: 'Lucro Líquido', value: dreLive.lucroLiquido },
                { label: 'Margem', value: null, pct: dreLive.margemPercentual },
              ].map(({ label, value, pct: p }) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">{label}</span>
                  <span className={`font-semibold ${value !== null && value < 0 ? 'text-red-500' : 'text-slate-800 dark:text-slate-100'}`}>
                    {p !== undefined ? fmtPct(p) : fmt(value!)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-600">
                <span className="text-slate-500 dark:text-slate-400">Pedidos</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{dreLive.pedidosQtd}</span>
              </div>
            </div>
            {jaFechado && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-4">Este mês já foi fechado. Os valores serão substituídos pelos atuais.</p>
            )}
            <div className="flex gap-2">
              <button onClick={() => setShowFecharMes(false)} className="flex-1 py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                Cancelar
              </button>
              <button onClick={confirmarFecharMes}
                className={`flex-1 py-2 rounded-xl text-sm font-medium text-white transition-colors ${jaFechado ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Financeiro</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">DRE mensal e histórico</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 capitalize px-2 min-w-36 text-center">{mesLabelStr}</span>
            <button onClick={nextMonth} disabled={isCurrentMonth} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronRight size={16} />
            </button>
          </div>
          <button className="btn-secondary" onClick={handleExport}><Download size={15} /> Exportar mês</button>
          {dreLive.faturamentoBruto > 0 && (
            <button
              onClick={() => setShowFecharMes(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                jaFechado
                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30'
              }`}
            >
              <Lock size={13} /> {jaFechado ? 'Re-fechar mês' : 'Fechar mês'}
            </button>
          )}
          <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus size={15} /> Lançar manualmente</button>
        </div>
      </div>

      {/* DRE Card */}
      <div className="card p-5 space-y-5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-slate-700 dark:text-slate-200 font-semibold text-sm capitalize">
            DRE · {mesLabelStr}
            {isCurrentMonth && <span className="ml-2 text-xs font-normal text-shopee-500 bg-shopee-50 dark:bg-shopee-900/20 px-2 py-0.5 rounded-full">em andamento</span>}
          </h2>
          <button onClick={() => setShowMeta(!showMeta)}
            className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-shopee-500 transition-colors">
            <Settings size={13} /> {metaFat > 0 ? 'Editar meta' : 'Definir meta'}
          </button>
        </div>

        {/* Meta config inline */}
        {showMeta && (
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Meta de Faturamento (R$)</label>
              <input type="number" step="100" className="input w-44" placeholder="Ex: 15000"
                value={metaFatInput} onChange={(e) => setMetaFatInput(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Meta de Margem (%)</label>
              <input type="number" step="1" className="input w-36" placeholder="Ex: 25"
                value={metaMargemInput} onChange={(e) => setMetaMargemInput(e.target.value)} />
            </div>
            <button className="btn-primary py-2 px-4" onClick={saveMeta}>Salvar</button>
            <button className="btn-secondary py-2 px-4" onClick={() => setShowMeta(false)}>Cancelar</button>
          </div>
        )}

        {/* Meta progress */}
        {(metaFat > 0 || metaMargem > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {metaFat > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><Target size={11} /> Meta de Faturamento</span>
                  <span className={`text-xs font-bold ${pctMetaFat >= 100 ? 'text-emerald-600' : pctMetaFat >= 70 ? 'text-amber-600' : 'text-slate-600'}`}>
                    {fmt(dreLive.faturamentoBruto)} / {fmt(metaFat)} · {pctMetaFat.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${pctMetaFat >= 100 ? 'bg-emerald-500' : pctMetaFat >= 70 ? 'bg-amber-400' : 'bg-shopee-400'}`}
                    style={{ width: `${pctMetaFat}%` }} />
                </div>
              </div>
            )}
            {metaMargem > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-500 flex items-center gap-1"><Target size={11} /> Meta de Margem</span>
                  <span className={`text-xs font-bold ${pctMetaMargem >= 100 ? 'text-emerald-600' : pctMetaMargem >= 70 ? 'text-amber-600' : 'text-slate-600'}`}>
                    {fmtPct(dreLive.margemPercentual)} / {fmtPct(metaMargem)} · {pctMetaMargem.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${pctMetaMargem >= 100 ? 'bg-emerald-500' : pctMetaMargem >= 70 ? 'bg-amber-400' : 'bg-shopee-400'}`}
                    style={{ width: `${pctMetaMargem}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* KPIs + comparativo mês a mês (melhoria 2) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {kpis.map((item) => (
            <div key={item.label} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
              <p className="text-slate-400 dark:text-slate-500 text-xs mb-1 leading-tight">{item.label}</p>
              <p className={`font-bold text-xl ${item.color}`}>
                {item.isNum ? item.value : fmt(item.value as number)}
              </p>
              <DeltaBadge cur={item.value} prev={item.prev} />
            </div>
          ))}
        </div>

        {/* Projeção */}
        {projecao && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">Projeção do Mês</p>
                <p className="text-xs text-blue-600">
                  {projecao.diasDecor} de {projecao.diasNoMes} dias · pace de {fmt(dreLive.faturamentoBruto / projecao.diasDecor)}/dia
                </p>
              </div>
              <div className="flex gap-6 flex-wrap">
                <div className="text-right">
                  <p className="text-xs text-blue-500 mb-0.5">Fat. projetado</p>
                  <p className="text-base font-bold text-blue-700">{fmt(projecao.fatProj)}</p>
                  {metaFat > 0 && (
                    <p className={`text-xs ${projecao.fatProj >= metaFat ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {projecao.fatProj >= metaFat ? '✓ acima da meta' : `${fmt(metaFat - projecao.fatProj)} abaixo da meta`}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-500 mb-0.5">Lucro Líq. projetado</p>
                  <p className={`text-base font-bold ${projecao.lucroProj >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {fmt(projecao.lucroProj)}
                  </p>
                  <p className="text-xs text-blue-500">{fmtPct(projecao.margemProj)} margem proj.</p>
                </div>
              </div>
            </div>
            <div className="mt-3 w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-400 rounded-full transition-all"
                style={{ width: `${(projecao.diasDecor / projecao.diasNoMes) * 100}%` }} />
            </div>
          </div>
        )}

        {/* DRE Cascata */}
        {dreLive.faturamentoBruto > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">Composição do Resultado</p>
            <DreCascata dre={dreLive} despesasPorCategoria={despesasPorCategoria} />
          </div>
        )}
      </div>

      {/* Resumo Anual (melhoria 3) — só quando há histórico */}
      {resumoAnual.length > 0 && (
        <div className="card p-5">
          <h2 className="text-slate-700 dark:text-slate-200 font-semibold text-sm mb-4">Resumo Anual</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {resumoAnual.map((r) => (
              <div key={r.ano} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-lg">{r.ano}</p>
                  <span className="text-xs text-slate-400 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-0.5 rounded-full">
                    {r.meses} {r.meses === 1 ? 'mês' : 'meses'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-slate-400 text-xs mb-0.5">Faturamento</p>
                    <p className="font-bold text-shopee-600 text-sm">{fmt(r.fat)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-0.5">Lucro Líq.</p>
                    <p className={`font-bold text-sm ${r.lucro >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(r.lucro)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-0.5">Margem Média</p>
                    <p className={`font-bold text-sm ${r.margemMedia >= 20 ? 'text-emerald-600' : r.margemMedia >= 0 ? 'text-amber-600' : 'text-red-500'}`}>
                      {fmtPct(r.margemMedia)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-0.5">Pedidos</p>
                    <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">{r.pedidos}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gráfico Evolução Histórica */}
      {chartData.length >= 2 && (
        <div className="card p-5">
          <h2 className="text-slate-700 dark:text-slate-200 font-semibold text-sm mb-4">Evolução Histórica</h2>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradFat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradLucroOp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradLucroLiq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="Faturamento"  stroke="#f97316" strokeWidth={2} fill="url(#gradFat)" />
              <Area type="monotone" dataKey="Lucro Op."   stroke="#10b981" strokeWidth={2} fill="url(#gradLucroOp)" />
              <Area type="monotone" dataKey="Lucro Líq."  stroke="#3b82f6" strokeWidth={2} fill="url(#gradLucroLiq)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabela histórico */}
      <div className="card">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-slate-700 dark:text-slate-200 font-semibold text-sm">Histórico Mensal · Evolução da Operação</h2>
          <div className="flex items-center gap-3">
            <p className="text-slate-400 dark:text-slate-500 text-xs">{historico.length} meses lançados</p>
            {historico.length > 0 && (
              <button onClick={exportHistorico} className="btn-secondary py-1.5 px-3 text-xs">
                <Download size={12} /> Exportar histórico
              </button>
            )}
          </div>
        </div>
        {historico.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-300 dark:text-slate-600 text-sm">Nenhum mês fechado lançado ainda.</p>
            <p className="text-slate-300 dark:text-slate-600 text-xs mt-1">Clique em "Lançar Mês Fechado" ao encerrar cada mês.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                  {['Mês/Ano', 'Fat. Bruto', 'Pedidos', 'Ticket Médio', 'Unidades', 'CMV', 'Taxas', 'DAS', 'Marketing', 'Desp. Op.', 'Lucro Bruto', 'Lucro Op.', 'Lucro Líq.', 'Margem %', 'Δ Fat.', ''].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {historicoOrdenado.map((h, i, arr) => {
                  const prev     = arr[i + 1];
                  const deltaFat = prev ? ((h.faturamentoBruto - prev.faturamentoBruto) / prev.faturamentoBruto) * 100 : null;
                  return (
                    <tr key={h.mesAno} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                      <td className="px-3 py-3 font-medium text-slate-800 dark:text-slate-100 capitalize whitespace-nowrap">{monthLabel(h.mesAno)}</td>
                      <td className="px-3 py-3 text-shopee-600 font-medium">{fmt(h.faturamentoBruto)}</td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{h.pedidosQtd}</td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{fmt(h.ticketMedio)}</td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{h.unidadesVendidas}</td>
                      <td className="px-3 py-3 text-red-400">{fmt(h.cmv)}</td>
                      <td className="px-3 py-3 text-red-400">{fmt(h.taxasShopee)}</td>
                      <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{fmt(h.dasImposto)}</td>
                      <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{fmt(h.marketingAds)}</td>
                      <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{fmt(h.despesasOperacionais)}</td>
                      <td className="px-3 py-3 text-slate-700 dark:text-slate-200 font-medium">{fmt(h.lucroBruto)}</td>
                      <td className="px-3 py-3 text-emerald-600 font-medium">{fmt(h.lucroOperacional)}</td>
                      <td className={`px-3 py-3 font-bold ${h.lucroLiquido >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(h.lucroLiquido)}</td>
                      <td className={`px-3 py-3 font-medium ${h.margemPercentual >= 20 ? 'text-emerald-600' : h.margemPercentual >= 0 ? 'text-amber-500' : 'text-red-500'}`}>{fmtPct(h.margemPercentual)}</td>
                      <td className="px-3 py-3">
                        {deltaFat !== null && (
                          <span className={`text-xs font-medium ${deltaFat >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {deltaFat >= 0 ? '+' : ''}{fmtPct(deltaFat)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setEditMes(h)} className="text-slate-300 hover:text-shopee-500 transition-colors" title="Editar">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => setDeleteMes(h.mesAno)} className="text-slate-300 hover:text-red-400 transition-colors" title="Excluir">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAdd && (
        <HistoricoForm title="Lançar Mês Fechado" initial={emptyHistorico} lockMes={false}
          onSave={(h) => { addHistorico(h); toast(`Mês ${h.mesAno} lançado.`, 'success'); setShowAdd(false); }}
          onClose={() => setShowAdd(false)} />
      )}
      {editMes && (
        <HistoricoForm title={`Editar · ${monthLabel(editMes.mesAno)}`} initial={editMes} lockMes={true}
          onSave={(h) => { updateHistorico(h.mesAno, h); toast(`Mês ${h.mesAno} atualizado.`, 'success'); setEditMes(null); }}
          onClose={() => setEditMes(null)} />
      )}
      {deleteMes && (
        <ConfirmDeleteModal mesAno={deleteMes}
          onConfirm={() => { deleteHistorico(deleteMes); toast(`Mês ${deleteMes} excluído.`, 'info'); setDeleteMes(null); }}
          onCancel={() => setDeleteMes(null)} />
      )}
    </div>
  );
}
