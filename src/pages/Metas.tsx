import { useState, useMemo, useRef } from 'react';
import {
  Target, Pencil, X, CheckCircle2, TrendingUp, TrendingDown,
  Minus, Zap, AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import { useStore } from '../store';
import { fmt, fmtPct, getKPIsMes } from '../utils/calculations';
import { useToast } from '../components/Toast';
import type { Configuracoes } from '../types';
import { C } from '../utils/chartColors';

// ─── Constants & helpers ──────────────────────────────────────────────────────

const R    = 40;
const SW   = 9;
const CIRC = 2 * Math.PI * R; // ≈ 251.33

const mesLabel = (mesAno: string) =>
  new Date(mesAno + '-02').toLocaleString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');

const mesLabelLongo = (mesAno: string) =>
  new Date(mesAno + '-02').toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

function ringColor(pct: number): string {
  if (pct >= 100) return C.secondary;
  if (pct >= 80)  return C.amber;
  if (pct >= 50)  return C.orange;
  return C.red;
}

function pctColor(pct: number): string {
  if (pct >= 100) return 'text-emerald-600';
  if (pct >= 80)  return 'text-amber-500';
  if (pct >= 50)  return 'text-orange-500';
  return 'text-red-500';
}

// ─── ProgressRing (SVG) ───────────────────────────────────────────────────────

function ProgressRing({ pct, semMeta }: { pct: number; semMeta: boolean }) {
  if (semMeta) {
    return (
      <svg width="96" height="96" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={R} fill="none" strokeWidth={SW} className="stroke-slate-100 dark:stroke-slate-700" />
        <text x="50" y="47" textAnchor="middle" dominantBaseline="middle" fontSize="10" className="fill-slate-300 dark:fill-slate-600">sem</text>
        <text x="50" y="59" textAnchor="middle" dominantBaseline="middle" fontSize="10" className="fill-slate-300 dark:fill-slate-600">meta</text>
      </svg>
    );
  }
  const capped = Math.min(100, pct);
  const offset = CIRC * (1 - capped / 100);
  const color  = ringColor(pct);
  const done   = pct >= 100;
  return (
    <svg width="96" height="96" viewBox="0 0 100 100">
      {/* Track */}
      <circle cx="50" cy="50" r={R} fill="none" strokeWidth={SW} className="stroke-slate-100 dark:stroke-slate-700" />
      {/* Progress arc */}
      <circle
        cx="50" cy="50" r={R} fill="none"
        stroke={color} strokeWidth={SW} strokeLinecap="round"
        strokeDasharray={CIRC}
        strokeDashoffset={offset}
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 0.75s cubic-bezier(0.4,0,0.2,1)' }}
      />
      {/* Center text */}
      {done ? (
        <>
          <text x="50" y="46" textAnchor="middle" dominantBaseline="middle" fontSize="18" fill={color}>✓</text>
          <text x="50" y="61" textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="600" fill={color}>ATINGIDA</text>
        </>
      ) : (
        <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" fontSize="17" fontWeight="700" fill={color}>
          {Math.round(pct)}%
        </text>
      )}
    </svg>
  );
}

// ─── PaceBadge ────────────────────────────────────────────────────────────────

function PaceBadge({
  noRitmo, projetado, formatValue, suffix,
}: {
  noRitmo: boolean; projetado: number; formatValue: (v: number) => string; suffix: string;
}) {
  return (
    <div className={`inline-flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-full mt-2 ${
      noRitmo
        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
        : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
    }`}>
      {noRitmo ? <Zap size={10} /> : <AlertCircle size={10} />}
      {noRitmo ? 'No ritmo' : 'Fora do ritmo'}
      <span className="opacity-60 mx-0.5">·</span>
      proj. {formatValue(projetado)}{suffix}
    </div>
  );
}

// ─── ResultBadge ─────────────────────────────────────────────────────────────

function ResultBadge({ pct, semMeta }: { pct: number; semMeta?: boolean }) {
  if (semMeta) return <span className="text-xs text-slate-300 dark:text-slate-600">—</span>;
  if (pct >= 100) return <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><CheckCircle2 size={11} /> Atingida</span>;
  if (pct >= 80)  return <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-500"><TrendingUp size={11} /> Próximo</span>;
  if (pct >= 50)  return <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-500"><Minus size={11} /> Andamento</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500"><TrendingDown size={11} /> Abaixo</span>;
}

// ─── ProgressRingCard ─────────────────────────────────────────────────────────

type MetaKey = 'metaFaturamento' | 'metaPedidos' | 'metaLucro' | 'metaMargem';

function ProgressRingCard({
  label, atual, meta, projetado, diasRestantes, formatValue, suffix = '', metaKey, step, skipPace = false,
}: {
  label: string;
  atual: number;
  meta: number | undefined;
  projetado: number | null;
  diasRestantes: number;
  formatValue: (v: number) => string;
  suffix?: string;
  metaKey: MetaKey;
  step: string;
  skipPace?: boolean;
}) {
  const toast               = useToast();
  const updateConfiguracoes = useStore((s) => s.updateConfiguracoes);
  const inputRef            = useRef<HTMLInputElement>(null);
  const [editing,  setEditing]  = useState(false);
  const [inputVal, setInputVal] = useState(String(meta ?? ''));

  const pct     = meta && meta > 0 ? Math.min(150, (atual / meta) * 100) : 0;
  const semMeta = !meta || meta === 0;
  const noRitmo = projetado !== null && meta ? projetado >= meta : false;
  const falta   = meta ? Math.max(0, meta - atual) : 0;

  const startEditing = () => {
    setInputVal(String(meta ?? ''));
    setEditing(true);
    setTimeout(() => { inputRef.current?.select(); inputRef.current?.focus(); }, 40);
  };

  const saveEdit = () => {
    const val = parseFloat(inputVal.replace(',', '.'));
    updateConfiguracoes({ [metaKey]: val > 0 ? val : undefined } as Partial<Configuracoes>);
    toast(`Meta de ${label} atualizada.`, 'success');
    setEditing(false);
  };

  const cancelEdit = () => { setInputVal(String(meta ?? '')); setEditing(false); };

  return (
    <div className="card p-5 flex flex-col items-center text-center relative group">
      {/* Label */}
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 self-start mb-3">
        {label}
      </p>

      {/* Ring */}
      <ProgressRing pct={pct} semMeta={semMeta} />

      {/* Current value */}
      <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-3 leading-tight">
        {formatValue(atual)}{suffix}
      </p>

      {/* Meta — inline edit */}
      <div className="mt-1.5 flex items-center justify-center gap-1.5 min-h-[26px]">
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              type="number" step={step}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter')  saveEdit();
                if (e.key === 'Escape') cancelEdit();
              }}
              onBlur={saveEdit}
              className="w-28 text-xs text-center border-2 border-core-green rounded-xl px-2 py-1.5 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono"
              placeholder={step === '1' ? '0' : '0,00'}
            />
            <button
              onMouseDown={(e) => { e.preventDefault(); saveEdit(); }}
              className="text-emerald-500 hover:text-emerald-700 transition-colors"
            >
              <CheckCircle2 size={15} />
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); cancelEdit(); }}
              className="text-slate-300 hover:text-slate-500 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={startEditing}
            className="flex items-center gap-1.5 group/edit"
            title="Clique para editar a meta"
          >
            <span className="text-xs text-slate-400 dark:text-slate-500 group-hover/edit:text-slate-600 dark:group-hover/edit:text-slate-300 transition-colors">
              {semMeta ? 'Clique para definir meta' : `Meta: ${formatValue(meta!)}${suffix}`}
            </span>
            <Pencil
              size={11}
              className={`transition-colors ${semMeta
                ? 'text-core-green opacity-70 group-hover/edit:opacity-100'
                : 'text-slate-300 opacity-0 group-hover/edit:opacity-100 group-hover/edit:text-core-green'
              }`}
            />
          </button>
        )}
      </div>

      {/* Pace badge */}
      {!semMeta && !editing && !skipPace && projetado !== null && (
        <PaceBadge noRitmo={noRitmo} projetado={projetado} formatValue={formatValue} suffix={suffix} />
      )}

      {/* Falta / Atingida */}
      {!semMeta && !editing && (
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
          {pct >= 100
            ? <span className="text-emerald-600 font-medium">Meta do mês atingida</span>
            : `Faltam ${formatValue(falta)}${suffix} · ${diasRestantes}d restantes`
          }
        </p>
      )}
    </div>
  );
}

// ─── ChartTooltip ─────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs">
      <p className="font-medium text-slate-600 dark:text-slate-300 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? fmt(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Metas() {
  const pedidosAll    = useStore((s) => s.pedidos);
  const historicoAll  = useStore((s) => s.historico);
  const configuracoes = useStore((s) => s.configuracoes);
  const lojaFiltro    = useStore((s) => s.lojaFiltro);

  const pedidos = useMemo(
    () => lojaFiltro ? pedidosAll.filter((p) => p.loja === lojaFiltro || p.loja === 'Ambas') : pedidosAll,
    [pedidosAll, lojaFiltro],
  );

  const hoje = new Date();
  const mesMes       = hoje.toISOString().slice(0, 7);
  const diaAtual     = hoje.getDate();
  const diasNoMes    = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const diasRestantes = diasNoMes - diaAtual;

  const kpis = useMemo(() => getKPIsMes(pedidos, mesMes), [pedidos, mesMes]);

  const { metaFaturamento: metaFat, metaPedidos, metaLucro, metaMargem } = configuracoes;

  // Projeção pace-based (só para valores acumuláveis)
  const pace = diaAtual > 0 ? 1 / diaAtual * diasNoMes : 1;
  const projFat     = kpis.faturamento > 0 ? kpis.faturamento * pace : null;
  const projPedidos = kpis.pedidosMes  > 0 ? kpis.pedidosMes  * pace : null;
  const projLucro   = kpis.lucroOp !== 0   ? kpis.lucroOp     * pace : null;

  // Histórico com mês atual
  const historicoOrdenado = useMemo(() => {
    const hist = [...historicoAll].sort((a, b) => a.mesAno.localeCompare(b.mesAno));
    const temMesAtual = hist.some((h) => h.mesAno === mesMes);
    const linhas = hist.map((h) => ({
      mes: h.mesAno, faturamento: h.faturamentoBruto, pedidos: h.pedidosQtd,
      lucro: h.lucroOperacional, margem: h.margemPercentual, isLive: false,
    }));
    if (!temMesAtual && (kpis.faturamento > 0 || kpis.pedidosMes > 0)) {
      linhas.push({ mes: mesMes, faturamento: kpis.faturamento, pedidos: kpis.pedidosMes,
        lucro: kpis.lucroOp, margem: kpis.margem, isLive: true });
    }
    return linhas;
  }, [historicoAll, mesMes, kpis]);

  const chartData = useMemo(() =>
    historicoOrdenado.map((h) => ({ name: mesLabel(h.mes), Faturamento: h.faturamento })),
    [historicoOrdenado],
  );

  const temMeta = metaFat || metaPedidos || metaLucro || metaMargem;
  const temHistorico = historicoOrdenado.length > 0;

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Sistema de Metas</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          {mesLabelLongo(mesMes)} · dia {diaAtual} de {diasNoMes} · clique na meta para editar
        </p>
      </div>

      {/* Cards com rings */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <ProgressRingCard
          label="Faturamento"
          atual={kpis.faturamento}
          meta={metaFat}
          projetado={projFat}
          diasRestantes={diasRestantes}
          formatValue={fmt}
          metaKey="metaFaturamento"
          step="0.01"
        />
        <ProgressRingCard
          label="Pedidos"
          atual={kpis.pedidosMes}
          meta={metaPedidos}
          projetado={projPedidos}
          diasRestantes={diasRestantes}
          formatValue={(v) => String(Math.round(v))}
          suffix=" ped."
          metaKey="metaPedidos"
          step="1"
        />
        <ProgressRingCard
          label="Lucro Operacional"
          atual={kpis.lucroOp}
          meta={metaLucro}
          projetado={projLucro}
          diasRestantes={diasRestantes}
          formatValue={fmt}
          metaKey="metaLucro"
          step="0.01"
        />
        <ProgressRingCard
          label="Margem"
          atual={kpis.margem}
          meta={metaMargem}
          projetado={null}
          diasRestantes={diasRestantes}
          formatValue={(v) => v.toFixed(1)}
          suffix="%"
          metaKey="metaMargem"
          step="0.1"
          skipPace
        />
      </div>

      {/* Chart faturamento vs meta */}
      {temHistorico && (
        <div className="card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
            Faturamento Mensal{metaFat ? ' — vs Meta' : ''}
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.slate }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: C.slate }} axisLine={false} tickLine={false} width={48}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc' }} />
              {metaFat && metaFat > 0 && (
                <ReferenceLine
                  y={metaFat} stroke={C.primary} strokeDasharray="6 3" strokeWidth={1.5}
                  label={{ value: `Meta ${fmt(metaFat)}`, position: 'insideTopRight', fontSize: 10, fill: C.primary }}
                />
              )}
              <Bar dataKey="Faturamento" fill={C.primary} radius={[3, 3, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabela histórica */}
      {temHistorico && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Desempenho vs Metas — Histórico
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Mês</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Faturamento</th>
                  {metaFat     && <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">% Fat.</th>}
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Pedidos</th>
                  {metaPedidos && <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">% Ped.</th>}
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Lucro Op.</th>
                  {metaLucro   && <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">% Lucro</th>}
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Margem</th>
                  {metaMargem  && <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">% Marg.</th>}
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {[...historicoOrdenado].reverse().map((h) => {
                  const pF = metaFat     ? (h.faturamento / metaFat)    * 100 : 0;
                  const pP = metaPedidos ? (h.pedidos     / metaPedidos) * 100 : 0;
                  const pL = metaLucro   ? (h.lucro       / metaLucro)   * 100 : 0;
                  const pM = metaMargem  ? (h.margem      / metaMargem)  * 100 : 0;
                  const resultado = temMeta
                    ? Math.min(pF || 999, pP || 999, pL || 999, pM || 999)
                    : 999;
                  return (
                    <tr key={h.mes} className={`hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors ${h.isLive ? 'bg-emerald-50/40 dark:bg-emerald-950/10' : ''}`}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-slate-700 dark:text-slate-200">{mesLabel(h.mes)}</span>
                          {h.isLive && <span className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-bold tracking-wide">AO VIVO</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">{fmt(h.faturamento)}</td>
                      {metaFat     && <td className={`px-4 py-2.5 font-bold text-xs ${pctColor(pF)}`}>{pF.toFixed(0)}%</td>}
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{h.pedidos}</td>
                      {metaPedidos && <td className={`px-4 py-2.5 font-bold text-xs ${pctColor(pP)}`}>{pP.toFixed(0)}%</td>}
                      <td className={`px-4 py-2.5 font-medium ${h.lucro >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(h.lucro)}</td>
                      {metaLucro   && <td className={`px-4 py-2.5 font-bold text-xs ${pctColor(pL)}`}>{pL.toFixed(0)}%</td>}
                      <td className={`px-4 py-2.5 font-medium ${h.margem >= 20 ? 'text-emerald-600' : h.margem >= 10 ? 'text-amber-500' : 'text-red-500'}`}>{fmtPct(h.margem)}</td>
                      {metaMargem  && <td className={`px-4 py-2.5 font-bold text-xs ${pctColor(pM)}`}>{pM.toFixed(0)}%</td>}
                      <td className="px-4 py-2.5"><ResultBadge pct={resultado} semMeta={!temMeta} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state inicial */}
      {!temHistorico && !temMeta && (
        <div className="card p-12 text-center">
          <Target size={32} className="text-slate-200 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">Defina suas metas</h3>
          <p className="text-slate-400 dark:text-slate-500 text-sm max-w-sm mx-auto">
            Clique em <span className="font-medium text-slate-600 dark:text-slate-300">"Clique para definir meta"</span> em cada card acima para começar.
          </p>
        </div>
      )}
    </div>
  );
}
