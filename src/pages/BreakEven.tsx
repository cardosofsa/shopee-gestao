import { useState, useMemo } from 'react';
import {
  Crosshair, ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  Info, Zap, DollarSign, ShoppingCart, Percent, AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts';
import { useStore } from '../store';
import { fmt, fmtPct } from '../utils/calculations';
import { C } from '../utils/chartColors';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const monthLabel = (m: string) =>
  new Date(m + '-02').toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

const monthShort = (m: string) =>
  new Date(m + '-02').toLocaleString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');

// ─── SVG Gauge ────────────────────────────────────────────────────────────────

function Gauge({ pct, label, cor }: { pct: number; label: string; cor: string }) {
  const R   = 70;
  const SW  = 12;
  const CIRC = Math.PI * R; // semicircle
  const capped = Math.min(pct, 100);
  const dash   = (capped / 100) * CIRC;

  return (
    <div className="flex flex-col items-center">
      <svg width={180} height={110} viewBox="0 0 180 100">
        {/* Track */}
        <path
          d={`M ${90 - R} 90 A ${R} ${R} 0 0 1 ${90 + R} 90`}
          fill="none" stroke="currentColor" strokeWidth={SW}
          className="text-slate-100 dark:text-slate-700"
          strokeLinecap="round"
        />
        {/* Progress */}
        <path
          d={`M ${90 - R} 90 A ${R} ${R} 0 0 1 ${90 + R} 90`}
          fill="none" stroke={cor} strokeWidth={SW}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${CIRC}`}
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
        {/* Center text */}
        <text x="90" y="78" textAnchor="middle" className="fill-slate-800 dark:fill-slate-100" fontSize="20" fontWeight="700">
          {capped.toFixed(0)}%
        </text>
      </svg>
      <p className={`text-xs font-semibold mt-1 ${pct >= 100 ? 'text-emerald-600' : pct >= 75 ? 'text-amber-500' : 'text-slate-500'}`}>
        {label}
      </p>
    </div>
  );
}

// ─── KPI mini card ─────────────────────────────────────────────────────────────

function KCard({ label, value, sub, accent, icon: Icon }: {
  label: string; value: string; sub?: string; accent?: string; icon: React.ElementType;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
        <Icon size={13} className={accent ?? 'text-slate-400'} />
      </div>
      <p className={`text-xl font-bold ${accent ?? 'text-slate-900 dark:text-slate-100'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── EditableRow ──────────────────────────────────────────────────────────────

function EditableRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(String(value > 0 ? value.toFixed(2) : ''));

  const save = () => {
    const v = parseFloat(draft) || 0;
    onChange(v);
    setEditing(false);
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
      {editing ? (
        <div className="flex items-center gap-1">
          <input
            type="number" min="0" step="0.01"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
            className="w-28 text-sm text-right px-2 py-0.5 border border-core-green rounded focus:outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-mono"
            autoFocus
          />
        </div>
      ) : (
        <button
          onClick={() => { setDraft(String(value > 0 ? value.toFixed(2) : '')); setEditing(true); }}
          className="text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-core-green transition-colors font-mono"
        >
          {value > 0 ? fmt(value) : <span className="text-slate-300 dark:text-slate-600 text-xs">+ definir</span>}
        </button>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function BreakEven() {
  const pedidosAll    = useStore((s) => s.pedidos);
  const despesasAll   = useStore((s) => s.despesas);
  const contasPagar   = useStore((s) => s.contasPagar);
  const configuracoes = useStore((s) => s.configuracoes);
  const lojaFiltro    = useStore((s) => s.lojaFiltro);

  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7));

  // Overrides manuais de custo fixo
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const setOverride = (k: string, v: number) => setOverrides((p) => ({ ...p, [k]: v }));

  const mesAtual = new Date().toISOString().slice(0, 7);
  const prevMonth = () => { const [y, m] = mes.split('-').map(Number); setMes(new Date(y, m - 2, 1).toISOString().slice(0, 7)); };
  const nextMonth = () => { const [y, m] = mes.split('-').map(Number); setMes(new Date(y, m, 1).toISOString().slice(0, 7)); };

  const pedidos = useMemo(
    () => (lojaFiltro ? pedidosAll.filter((p) => p.loja === lojaFiltro) : pedidosAll)
      .filter((p) => p.data.startsWith(mes) && (p.status === 'Concluído' || p.status === 'Enviado')),
    [pedidosAll, lojaFiltro, mes],
  );

  const despesas = useMemo(
    () => (lojaFiltro ? despesasAll.filter((d) => d.loja === lojaFiltro || d.loja === 'Ambas') : despesasAll)
      .filter((d) => d.data.startsWith(mes)),
    [despesasAll, lojaFiltro, mes],
  );

  const contasMes = useMemo(
    () => contasPagar.filter((c) => {
      if (lojaFiltro && c.loja !== lojaFiltro && c.loja !== 'Ambas') return false;
      return c.vencimento.startsWith(mes);
    }),
    [contasPagar, lojaFiltro, mes],
  );

  // ── Custos Fixos (auto-detectados + ajustáveis) ──────────────────────────
  const custosDespesas   = useMemo(() => despesas.reduce((s, d) => s + d.valor, 0),             [despesas]);
  const custosContas     = useMemo(() => contasMes.reduce((s, c) => s + c.valor, 0),            [contasMes]);
  const custosDAS        = useMemo(() => {
    const receita   = pedidos.reduce((s, p) => s + p.receita, 0);
    const aliquota  = (configuracoes.aliquotaDAS ?? 0) / 100;
    return receita * aliquota;
  }, [pedidos, configuracoes]);

  const despCfg  = overrides['despesas']    ?? custosDespesas;
  const contasCfg = overrides['contas']     ?? custosContas;
  const dasCfg    = overrides['das']        ?? custosDAS;
  const outroCfg  = overrides['outro']      ?? 0;

  const custoFixoTotal = despCfg + contasCfg + dasCfg + outroCfg;

  // ── Métricas de receita ───────────────────────────────────────────────────
  const receita        = useMemo(() => pedidos.reduce((s, p) => s + p.receita, 0),             [pedidos]);
  const lucroOp        = useMemo(() => pedidos.reduce((s, p) => s + p.lucroOperacional, 0),    [pedidos]);
  const mcr            = receita > 0 ? lucroOp / receita : 0; // Contribution Margin Ratio
  const ticketMedio    = pedidos.length > 0 ? receita / pedidos.length : 0;
  const mcUnit         = ticketMedio * mcr; // contribution per order

  // ── Break-Even ────────────────────────────────────────────────────────────
  const beReceita  = mcr > 0 ? custoFixoTotal / mcr : null;
  const bePedidos  = beReceita !== null && ticketMedio > 0 ? Math.ceil(beReceita / ticketMedio) : null;
  const progPct    = beReceita !== null && beReceita > 0 ? (receita / beReceita) * 100 : 0;
  const lucroPosBreak = beReceita !== null && receita > beReceita ? receita - beReceita : 0;

  // Dias para atingir no ritmo atual
  const hoje          = new Date();
  const diaAtual      = mes === mesAtual ? hoje.getDate() : 30;
  const diasNoMes     = new Date(parseInt(mes.slice(0, 4)), parseInt(mes.slice(5)) , 0).getDate();
  const receitaDia    = diaAtual > 0 ? receita / diaAtual : 0;
  const diasParaBE    = beReceita !== null && receitaDia > 0 && receita < beReceita
    ? Math.ceil((beReceita - receita) / receitaDia)
    : null;
  const projecao      = receitaDia * diasNoMes;

  // ── Progresso diário (para gráfico) ──────────────────────────────────────
  const dailyData = useMemo(() => {
    const map = new Map<string, number>();
    pedidos.forEach((p) => {
      const dia = p.data.slice(8, 10);
      map.set(dia, (map.get(dia) ?? 0) + p.receita);
    });
    const diasN = new Date(parseInt(mes.slice(0, 4)), parseInt(mes.slice(5)), 0).getDate();
    let acum = 0;
    return Array.from({ length: diasN }, (_, i) => {
      const d = String(i + 1).padStart(2, '0');
      acum += map.get(d) ?? 0;
      return { dia: `${i + 1}`, acumulado: acum, beRef: beReceita ?? 0 };
    });
  }, [pedidos, mes, beReceita]);

  // ── Sensibilidade ─────────────────────────────────────────────────────────
  const sensibilidade = [-10, -5, 0, 5, 10].map((delta) => {
    const mcrAdj = mcr + delta / 100;
    const be     = mcrAdj > 0 ? custoFixoTotal / mcrAdj : null;
    return { delta, mcr: mcrAdj * 100, be };
  });

  // ── Histórico 6 meses ─────────────────────────────────────────────────────
  const historico6m = useMemo(() => {
    const meses: string[] = [];
    const [y0, m0] = mes.split('-').map(Number);
    for (let i = 5; i >= 0; i--) {
      meses.push(new Date(y0, m0 - 1 - i, 1).toISOString().slice(0, 7));
    }
    return meses.map((m) => {
      const peds = (lojaFiltro ? pedidosAll.filter((p) => p.loja === lojaFiltro) : pedidosAll)
        .filter((p) => p.data.startsWith(m) && (p.status === 'Concluído' || p.status === 'Enviado'));
      const rec   = peds.reduce((s, p) => s + p.receita, 0);
      const lucro = peds.reduce((s, p) => s + p.lucroOperacional, 0);
      const desp  = (lojaFiltro ? despesasAll.filter((d) => d.loja === lojaFiltro || d.loja === 'Ambas') : despesasAll)
        .filter((d) => d.data.startsWith(m)).reduce((s, d) => s + d.valor, 0);
      const mcrM  = rec > 0 ? lucro / rec : 0;
      const beMes = mcrM > 0 ? (desp + (rec * ((configuracoes.aliquotaDAS ?? 0) / 100))) / mcrM : 0;
      return { name: monthShort(m), receita: rec, breakeven: beMes };
    });
  }, [pedidosAll, despesasAll, lojaFiltro, mes, configuracoes]);

  const gaugeColor = progPct >= 100 ? C.secondary : progPct >= 75 ? C.amber : C.red;

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-core-green/10 flex items-center justify-center">
            <Crosshair size={18} className="text-core-green" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Ponto de Equilíbrio</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Quanto preciso vender para cobrir todos os custos</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
          <button onClick={prevMonth} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"><ChevronLeft size={15} /></button>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200 capitalize px-2 min-w-36 text-center">{monthLabel(mes)}</span>
          <button onClick={nextMonth} disabled={mes === mesAtual} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight size={15} /></button>
        </div>
      </div>

      {/* Gauge + Custos lado a lado */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Gauge de progresso */}
        <div className="card p-6 flex flex-col items-center justify-center text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-4">Progresso até o Equilíbrio</p>
          <Gauge
            pct={progPct}
            label={progPct >= 100 ? 'Equilíbrio atingido' : progPct >= 75 ? 'Quase lá' : 'Abaixo do equilíbrio'}
            cor={gaugeColor}
          />
          <div className="mt-4 space-y-1">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <span className="font-bold text-core-green">{fmt(receita)}</span> de{' '}
              <span className="font-bold">{beReceita != null ? fmt(beReceita) : '—'}</span> necessários
            </p>
            {diasParaBE !== null && diasParaBE > 0 && (
              <p className="text-xs text-amber-500 flex items-center justify-center gap-1">
                <AlertTriangle size={11} />
                Faltam ~{diasParaBE} dias para atingir no ritmo atual
              </p>
            )}
            {progPct >= 100 && lucroPosBreak > 0 && (
              <p className="text-xs text-emerald-600 flex items-center justify-center gap-1">
                <Zap size={11} />
                {fmt(lucroPosBreak)} acima do equilíbrio
              </p>
            )}
          </div>
        </div>

        {/* Custos fixos ajustáveis */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={14} className="text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Estrutura de Custos</h2>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto">clique para ajustar</span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Valores auto-calculados do mês · ajustáveis manualmente</p>
          <div>
            <EditableRow label="Despesas operacionais" value={despCfg}   onChange={(v) => setOverride('despesas', v)} />
            <EditableRow label="Contas a pagar do mês" value={contasCfg} onChange={(v) => setOverride('contas',   v)} />
            <EditableRow label="DAS / Imposto estimado" value={dasCfg}   onChange={(v) => setOverride('das',      v)} />
            <EditableRow label="Outros custos fixos"   value={outroCfg}  onChange={(v) => setOverride('outro',    v)} />
            <div className="flex items-center justify-between pt-3 mt-1">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Total Custos Fixos</span>
              <span className="text-sm font-bold text-red-500 font-mono">{fmt(custoFixoTotal)}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1"><Info size={11} /> Margem de Contribuição</span>
            <span className={`font-bold ${mcr >= 0.2 ? 'text-emerald-600' : mcr >= 0.1 ? 'text-amber-500' : 'text-red-500'}`}>
              {receita > 0 ? fmtPct(mcr * 100) : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KCard
          label="PE em Receita"
          value={beReceita != null ? fmt(beReceita) : '—'}
          sub="faturamento necessário"
          icon={DollarSign}
          accent={beReceita != null && receita >= beReceita ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-200'}
        />
        <KCard
          label="PE em Pedidos"
          value={bePedidos != null ? String(bePedidos) : '—'}
          sub={`pedidos (ticket ${ticketMedio > 0 ? fmt(ticketMedio) : '—'})`}
          icon={ShoppingCart}
          accent={bePedidos != null && pedidos.length >= bePedidos ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-200'}
        />
        <KCard
          label="Margem Contribuição"
          value={receita > 0 ? fmtPct(mcr * 100) : '—'}
          sub={`${fmt(mcUnit)} por pedido`}
          icon={Percent}
          accent={mcr >= 0.2 ? 'text-emerald-600' : mcr >= 0.1 ? 'text-amber-500' : 'text-red-500'}
        />
        <KCard
          label="Projeção do Mês"
          value={fmt(projecao)}
          sub={beReceita != null ? (projecao >= beReceita ? 'acima do PE' : `faltam ${fmt(beReceita - projecao)}`) : '—'}
          icon={projecao >= (beReceita ?? 0) ? TrendingUp : TrendingDown}
          accent={projecao >= (beReceita ?? 0) ? 'text-emerald-600' : 'text-amber-500'}
        />
      </div>

      {/* Gráfico acumulado do mês */}
      {pedidos.length > 0 && beReceita !== null && (
        <div className="card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
            Evolução Diária — {monthLabel(mes)}
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradAcum" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#18B37A" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#18B37A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 10, fill: C.slate }} axisLine={false} tickLine={false}
                tickFormatter={(v) => v % 5 === 0 || v === '1' ? v : ''} />
              <YAxis tick={{ fontSize: 10, fill: C.slate }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} width={48} />
              <Tooltip formatter={(v: unknown, name: unknown) => [fmt(Number(v)), name === 'acumulado' ? 'Receita Acum.' : 'PE']} contentStyle={{ fontSize: 12 }} />
              <ReferenceLine y={beReceita} stroke={C.red} strokeDasharray="4 4" label={{ value: 'Equilíbrio', position: 'right', fontSize: 10, fill: C.red }} />
              <Area type="monotone" dataKey="acumulado" name="acumulado" stroke={C.primary} strokeWidth={2} fill="url(#gradAcum)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Histórico 6 meses */}
      {historico6m.some((d) => d.receita > 0 || d.breakeven > 0) && (
        <div className="card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
            Histórico vs Break-Even — 6 Meses
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={historico6m} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradHist" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#18B37A" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#18B37A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.slate }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: C.slate }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} width={48} />
              <Tooltip formatter={(v: unknown, name: unknown) => [fmt(Number(v)), name === 'receita' ? 'Receita' : 'Break-Even']} contentStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="receita"    name="receita"    stroke={C.primary} strokeWidth={2} fill="url(#gradHist)" />
              <Area type="monotone" dataKey="breakeven"  name="breakeven"  stroke={C.red} strokeWidth={1.5} fill="none" strokeDasharray="4 3" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-400 justify-end">
            <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-core-green inline-block rounded" /> Receita</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-red-400 inline-block rounded" style={{ borderTop: '2px dashed #f87171', background: 'transparent' }} /> Break-Even</span>
          </div>
        </div>
      )}

      {/* Tabela de Sensibilidade */}
      {mcr > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Info size={14} className="text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Análise de Sensibilidade</h2>
            <span className="text-xs text-slate-400 dark:text-slate-500">— impacto da margem de contribuição no PE</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                  {['Cenário', 'MC Ajustada', 'PE em Receita', 'PE em Pedidos', 'Vs atual'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {sensibilidade.map(({ delta, mcr: mcrAdj, be }) => {
                  const isBase = delta === 0;
                  const bePeds = be != null && ticketMedio > 0 ? Math.ceil(be / ticketMedio) : null;
                  const diff   = be != null && beReceita != null ? be - beReceita : null;
                  return (
                    <tr key={delta} className={`transition-colors ${isBase ? 'bg-core-green/5 dark:bg-core-green/5' : 'hover:bg-slate-50 dark:hover:bg-slate-700/20'}`}>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          delta < 0 ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400' :
                          delta > 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' :
                          'bg-core-green/10 text-core-green'
                        }`}>
                          {delta === 0 ? 'Atual' : delta > 0 ? `+${delta}% MC` : `${delta}% MC`}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-700 dark:text-slate-200">{fmtPct(mcrAdj)}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-100">{be != null ? fmt(be) : 'inviável'}</td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{bePeds ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        {diff != null && !isBase && (
                          <span className={`text-xs font-medium ${diff < 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {diff < 0 ? '↓ ' : '↑ '}{fmt(Math.abs(diff))}
                          </span>
                        )}
                        {isBase && <span className="text-xs text-slate-400">base</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {pedidos.length === 0 && (
        <div className="card p-12 text-center">
          <Crosshair size={32} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">Sem pedidos neste mês para calcular o equilíbrio.</p>
          <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Você ainda pode ajustar os custos fixos para estimar o ponto de equilíbrio.</p>
        </div>
      )}

    </div>
  );
}
