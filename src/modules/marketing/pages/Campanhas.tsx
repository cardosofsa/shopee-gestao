import { useState, useMemo } from 'react';
import {
  Megaphone, Plus, X, Pencil, Trash2, Zap, TrendingUp,
  TrendingDown, Calendar, ChevronDown, ChevronUp, Check,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ReferenceLine,
} from 'recharts';
import { useStore } from '../../../store';
import type { Campanha } from '../../../types';
import { fmt } from '../../../utils/calculations';
import { C } from '../../../utils/chartColors';

// ─── Paleta de cores ──────────────────────────────────────────────────────────

const CORES = [
  C.primary, '#6366f1', C.amber, C.red, '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', C.orange, '#14b8a6',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDate(iso: string) { return new Date(iso + 'T12:00:00'); }

function duracao(ini: string, fim: string): number {
  return Math.max(1, Math.round((parseDate(fim).getTime() - parseDate(ini).getTime()) / 86_400_000) + 1);
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function statusCampanha(c: Campanha): 'ativa' | 'futura' | 'encerrada' {
  const hoje = new Date().toISOString().slice(0, 10);
  if (c.fim < hoje) return 'encerrada';
  if (c.inicio > hoje) return 'futura';
  return 'ativa';
}

const STATUS_CFG = {
  ativa:     { label: 'Ativa',     cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400', dot: 'bg-emerald-500 animate-pulse' },
  futura:    { label: 'Futura',    cls: 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400',           dot: 'bg-blue-400' },
  encerrada: { label: 'Encerrada', cls: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',         dot: 'bg-slate-400' },
};

// ─── Form modal ───────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  nome: '', inicio: new Date().toISOString().slice(0, 10), fim: '', desconto: 10, skus: [] as string[], cor: CORES[0], observacoes: '',
};

function CampanhaForm({ initial, title, produtos, onSave, onClose }: {
  initial: typeof EMPTY_FORM;
  title: string;
  produtos: { sku: string; nome: string }[];
  onSave: (c: typeof EMPTY_FORM) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState(initial);
  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value }));

  const toggleSku = (sku: string) =>
    setForm((p) => ({ ...p, skus: p.skus.includes(sku) ? p.skus.filter((s) => s !== sku) : [...p.skus, sku] }));

  const valid = form.nome.trim() && form.inicio && form.fim && form.fim >= form.inicio;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[94vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{title}</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors"><X size={15} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Nome da campanha *</label>
            <input value={form.nome} onChange={f('nome')} placeholder="Ex: Black Friday, Aniversário Shopee…" className="input-field w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Data de início *</label>
              <input type="date" value={form.inicio} onChange={f('inicio')} className="input-field w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Data de término *</label>
              <input type="date" value={form.fim} min={form.inicio} onChange={f('fim')} className="input-field w-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Desconto (%)</label>
              <input type="number" min="0" max="100" value={form.desconto} onChange={f('desconto')} className="input-field w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Cor</label>
              <div className="flex gap-1.5 flex-wrap pt-1">
                {CORES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm((p) => ({ ...p, cor: c }))}
                    className={`w-5 h-5 rounded-full transition-transform ${form.cor === c ? 'ring-2 ring-offset-1 ring-slate-400 scale-110' : 'hover:scale-105'}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          {/* SKUs (opcional) */}
          {produtos.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                Produtos envolvidos <span className="text-slate-400 font-normal">(deixe em branco = todos)</span>
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {produtos.map((p) => {
                  const sel = form.skus.includes(p.sku);
                  return (
                    <button
                      key={p.sku}
                      onClick={() => toggleSku(p.sku)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        sel
                          ? 'border-core-green bg-core-green/10 text-core-green font-medium'
                          : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      {sel && <Check size={9} className="inline mr-0.5" />}
                      {p.nome}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Observações</label>
            <textarea value={form.observacoes ?? ''} onChange={f('observacoes')} rows={2} placeholder="Estratégia, metas, notas…" className="input-field w-full resize-none" />
          </div>
        </div>
        <div className="px-5 pb-4 flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary text-sm px-4 py-2 rounded-xl">Cancelar</button>
          <button onClick={() => valid && onSave(form)} disabled={!valid} className="btn-primary text-sm px-4 py-2 rounded-xl disabled:opacity-40 flex items-center gap-1.5">
            <Check size={13} /> Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card de campanha ─────────────────────────────────────────────────────────

function CampanhaCard({ campanha, receita, baseline, pedidos, baselinePedidos, onEdit, onDelete }: {
  campanha: Campanha;
  receita: number; baseline: number;
  pedidos: number; baselinePedidos: number;
  onEdit: () => void; onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status  = statusCampanha(campanha);
  const cfg     = STATUS_CFG[status];
  const dur     = duracao(campanha.inicio, campanha.fim);
  const liftRec = baseline > 0 ? ((receita - baseline) / baseline) * 100 : null;
  const liftPed = baselinePedidos > 0 ? ((pedidos - baselinePedidos) / baselinePedidos) * 100 : null;

  const fmtDate = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  return (
    <div className="card overflow-hidden">
      {/* Color bar */}
      <div className="h-1" style={{ background: campanha.cor }} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: campanha.cor + '20' }}>
            <Megaphone size={16} style={{ color: campanha.cor }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">{campanha.nome}</h3>
              <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${cfg.cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </span>
              {campanha.desconto > 0 && (
                <span className="text-[9px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                  -{campanha.desconto}%
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400">
              <Calendar size={10} />
              {fmtDate(campanha.inicio)} – {fmtDate(campanha.fim)} · {dur} dia{dur !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-core-green rounded-lg transition-colors"><Pencil size={13} /></button>
            <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={13} /></button>
            <button onClick={() => setExpanded((e) => !e)} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors">
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        </div>

        {/* Metrics */}
        {status !== 'futura' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Receita no período</p>
              <p className="text-base font-bold text-slate-800 dark:text-slate-100">{fmt(receita)}</p>
              {liftRec !== null && (
                <p className={`text-xs font-medium flex items-center gap-0.5 mt-0.5 ${liftRec >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {liftRec >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {liftRec >= 0 ? '+' : ''}{liftRec.toFixed(1)}% vs período anterior
                </p>
              )}
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Pedidos</p>
              <p className="text-base font-bold text-slate-800 dark:text-slate-100">{pedidos}</p>
              {liftPed !== null && (
                <p className={`text-xs font-medium flex items-center gap-0.5 mt-0.5 ${liftPed >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {liftPed >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {liftPed >= 0 ? '+' : ''}{liftPed.toFixed(1)}% vs período anterior
                </p>
              )}
            </div>
          </div>
        )}

        {status === 'futura' && (
          <div className="rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-800 p-3 text-xs text-blue-600 dark:text-blue-400">
            Campanha não iniciada — o lift será calculado após o término.
          </div>
        )}

        {/* Expanded detail */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2">
            {baseline > 0 && status !== 'futura' && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Receita baseline (mesmo período anterior)</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">{fmt(baseline)}</span>
              </div>
            )}
            {campanha.skus.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Produtos</p>
                <div className="flex flex-wrap gap-1">
                  {campanha.skus.map((s) => (
                    <span key={s} className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-mono">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {campanha.observacoes && (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">"{campanha.observacoes}"</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Timeline bar ─────────────────────────────────────────────────────────────

function Timeline({ campanhas }: { campanhas: Campanha[] }) {
  if (campanhas.length === 0) return null;

  // Show last 6 months + future
  const hoje = new Date();
  const start = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1);
  const end   = new Date(hoje.getFullYear(), hoje.getMonth() + 2, 0);
  const totalDias = Math.ceil((end.getTime() - start.getTime()) / 86_400_000);
  const startISO  = start.toISOString().slice(0, 10);
  const endISO    = end.toISOString().slice(0, 10);

  const hojeOffset = Math.max(0, Math.ceil((hoje.getTime() - start.getTime()) / 86_400_000));
  const hojeLeft = (hojeOffset / totalDias) * 100;

  // Month labels
  const labels: { left: number; label: string }[] = [];
  for (let m = 0; m <= 7; m++) {
    const d = new Date(start.getFullYear(), start.getMonth() + m, 1);
    if (d > end) break;
    const offset = Math.ceil((d.getTime() - start.getTime()) / 86_400_000);
    labels.push({
      left: (offset / totalDias) * 100,
      label: d.toLocaleString('pt-BR', { month: 'short' }),
    });
  }

  const visible = campanhas.filter((c) => c.fim >= startISO && c.inicio <= endISO);

  return (
    <div className="card p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
        Linha do Tempo — 6 meses
      </p>
      {/* Month labels */}
      <div className="relative h-4 mb-1">
        {labels.map(({ left, label }) => (
          <span key={label} className="absolute text-[9px] text-slate-400 -translate-x-1/2" style={{ left: `${left}%` }}>{label}</span>
        ))}
      </div>
      {/* Bars */}
      <div className="relative bg-slate-50 dark:bg-slate-800 rounded-lg overflow-hidden" style={{ height: `${Math.max(32, visible.length * 28 + 8)}px` }}>
        {/* Hoje linha */}
        <div className="absolute top-0 bottom-0 w-px bg-red-400 z-10" style={{ left: `${hojeLeft}%` }}>
          <span className="absolute top-0 left-1 text-[8px] text-red-400 font-medium whitespace-nowrap">hoje</span>
        </div>
        {/* Campaign bars */}
        {visible.map((c, i) => {
          const s = Math.max(0, Math.ceil((parseDate(c.inicio).getTime() - start.getTime()) / 86_400_000));
          const e = Math.min(totalDias, Math.ceil((parseDate(c.fim).getTime() - start.getTime()) / 86_400_000) + 1);
          const left  = (s / totalDias) * 100;
          const width = ((e - s) / totalDias) * 100;
          return (
            <div
              key={c.id}
              className="absolute rounded-md flex items-center px-2 text-[10px] font-semibold text-white overflow-hidden"
              style={{ left: `${left}%`, width: `${width}%`, top: `${4 + i * 28}px`, height: '22px', background: c.cor, opacity: 0.9 }}
              title={c.nome}
            >
              <span className="truncate">{c.nome}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Campanhas() {
  const pedidosAll   = useStore((s) => s.pedidos);
  const produtosAll  = useStore((s) => s.produtos);
  const campanhas    = useStore((s) => s.campanhas);
  const addCampanha  = useStore((s) => s.addCampanha);
  const updateCampanha = useStore((s) => s.updateCampanha);
  const deleteCampanha = useStore((s) => s.deleteCampanha);
  const lojaFiltro   = useStore((s) => s.lojaFiltro);

  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Campanha | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'ativa' | 'futura' | 'encerrada'>('todas');

  const pedidos = useMemo(
    () => (lojaFiltro ? pedidosAll.filter((p) => p.loja === lojaFiltro) : pedidosAll)
      .filter((p) => p.status === 'Concluído' || p.status === 'Enviado'),
    [pedidosAll, lojaFiltro],
  );

  const produtos = useMemo(
    () => (lojaFiltro ? produtosAll.filter((p) => p.loja === lojaFiltro || p.loja === 'Ambas') : produtosAll)
      .filter((p) => p.ativo)
      .map((p) => ({ sku: p.sku, nome: p.nome })),
    [produtosAll, lojaFiltro],
  );

  // Compute metrics per campanha
  const metricas = useMemo(() => {
    return campanhas.map((c) => {
      const dur = duracao(c.inicio, c.fim);
      const baselineInicio = addDays(c.inicio, -dur);
      const baselineFim    = addDays(c.inicio, -1);

      const filtra = (ini: string, fim: string) =>
        pedidos.filter((p) => {
          if (p.data < ini || p.data > fim) return false;
          if (c.skus.length > 0 && !c.skus.includes(p.sku)) return false;
          return true;
        });

      const durante  = filtra(c.inicio, c.fim);
      const baseline = filtra(baselineInicio, baselineFim);

      return {
        id: c.id,
        receita:          durante.reduce((s, p) => s + p.receita, 0),
        baseline:         baseline.reduce((s, p) => s + p.receita, 0),
        pedidos:          durante.length,
        baselinePedidos:  baseline.length,
      };
    });
  }, [campanhas, pedidos]);

  // Lift comparison chart data
  const chartData = useMemo(() =>
    campanhas.map((c, i) => {
      const m = metricas[i];
      const lift = m.baseline > 0 ? ((m.receita - m.baseline) / m.baseline) * 100 : 0;
      return { nome: c.nome.length > 15 ? c.nome.slice(0, 15) + '…' : c.nome, lift, cor: c.cor };
    }).filter((d) => statusCampanha(campanhas.find((c) => c.nome.startsWith(d.nome.replace('…', '')))!) !== 'futura'),
    [campanhas, metricas],
  );

  const campanhasFiltradas = useMemo(() => {
    if (filtroStatus === 'todas') return campanhas;
    return campanhas.filter((c) => statusCampanha(c) === filtroStatus);
  }, [campanhas, filtroStatus]);

  const ativas    = campanhas.filter((c) => statusCampanha(c) === 'ativa').length;
  const futuras   = campanhas.filter((c) => statusCampanha(c) === 'futura').length;
  const melhorLift = metricas.reduce((best, m, i) => {
    const lift = m.baseline > 0 ? ((m.receita - m.baseline) / m.baseline) * 100 : -Infinity;
    return lift > (best?.lift ?? -Infinity) ? { lift, nome: campanhas[i].nome } : best;
  }, null as { lift: number; nome: string } | null);

  const openEdit = (c: Campanha) => {
    setEditando(c);
    setShowForm(true);
  };

  const saveForm = (data: typeof EMPTY_FORM) => {
    if (editando) {
      updateCampanha(editando.id, data);
    } else {
      addCampanha({ id: crypto.randomUUID(), ...data });
    }
    setShowForm(false);
    setEditando(null);
  };

  const EMPTY_FORM = {
    nome: '', inicio: new Date().toISOString().slice(0, 10), fim: '',
    desconto: 10, skus: [] as string[], cor: CORES[campanhas.length % CORES.length], observacoes: '',
  };

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-core-green/10 flex items-center justify-center">
            <Megaphone size={18} className="text-core-green" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Campanhas</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Promoções e seu impacto nas vendas</p>
          </div>
        </div>
        <button
          onClick={() => { setEditando(null); setShowForm(true); }}
          className="btn-primary flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl"
        >
          <Plus size={14} /> Nova Campanha
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: 'Total campanhas', value: String(campanhas.length), sub: 'criadas', icon: Megaphone },
          { label: 'Ativas agora',    value: String(ativas),  sub: ativas > 0 ? 'em andamento' : 'nenhuma ativa',        icon: Zap,        color: ativas > 0 ? 'text-emerald-600' : 'text-slate-400' },
          { label: 'Próximas',        value: String(futuras), sub: futuras > 0 ? 'agendadas' : 'nenhuma planejada',       icon: Calendar,   color: 'text-blue-500' },
          { label: 'Melhor lift',     value: melhorLift ? `+${melhorLift.lift.toFixed(1)}%` : '—', sub: melhorLift?.nome ?? 'sem dados', icon: TrendingUp, color: 'text-emerald-600' },
        ].map(({ label, value, sub, icon: Icon, color = 'text-slate-700 dark:text-slate-200' }) => (
          <div key={label} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
              <Icon size={13} className={color} />
            </div>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {campanhas.length === 0 ? (
        <div className="card p-14 text-center">
          <Megaphone size={36} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">Nenhuma campanha criada</h3>
          <p className="text-slate-400 dark:text-slate-500 text-sm mb-4">Registre promoções para ver o impacto real nas suas vendas.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm px-4 py-2 rounded-xl inline-flex items-center gap-1.5">
            <Plus size={14} /> Criar primeira campanha
          </button>
        </div>
      ) : (
        <>
          {/* Timeline */}
          <Timeline campanhas={campanhas} />

          {/* Lift chart */}
          {chartData.length > 0 && (
            <div className="card p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
                Lift de Receita vs Período Anterior (%)
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                  <XAxis dataKey="nome" tick={{ fontSize: 10, fill: C.slate }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: C.slate }} tickFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`} axisLine={false} tickLine={false} width={40} />
                  <Tooltip formatter={(v: any) => [`${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(1)}%`, 'Lift receita']} contentStyle={{ fontSize: 12 }} />
                  <ReferenceLine y={0} stroke={C.slate} strokeDasharray="3 3" />
                  <Bar dataKey="lift" radius={[4, 4, 0, 0]}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={d.lift >= 0 ? d.cor : C.red} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Filter + Cards */}
          <div className="flex gap-1.5 flex-wrap">
            {(['todas', 'ativa', 'futura', 'encerrada'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFiltroStatus(f)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium capitalize transition-colors ${
                  filtroStatus === f ? 'bg-core-green text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {f === 'todas' ? 'Todas' : STATUS_CFG[f].label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {campanhasFiltradas
              .slice()
              .sort((a, b) => b.inicio.localeCompare(a.inicio))
              .map((c) => {
                const idx = campanhas.findIndex((x) => x.id === c.id);
                const m   = metricas[idx] ?? { receita: 0, baseline: 0, pedidos: 0, baselinePedidos: 0 };
                return (
                  <CampanhaCard
                    key={c.id}
                    campanha={c}
                    receita={m.receita}
                    baseline={m.baseline}
                    pedidos={m.pedidos}
                    baselinePedidos={m.baselinePedidos}
                    onEdit={() => openEdit(c)}
                    onDelete={() => deleteCampanha(c.id)}
                  />
                );
              })}
          </div>
        </>
      )}

      {showForm && (
        <CampanhaForm
          title={editando ? 'Editar Campanha' : 'Nova Campanha'}
          initial={editando
            ? { nome: editando.nome, inicio: editando.inicio, fim: editando.fim, desconto: editando.desconto, skus: editando.skus, cor: editando.cor, observacoes: editando.observacoes ?? '' }
            : EMPTY_FORM}
          produtos={produtos}
          onSave={saveForm}
          onClose={() => { setShowForm(false); setEditando(null); }}
        />
      )}

    </div>
  );
}
