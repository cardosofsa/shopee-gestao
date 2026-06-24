import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  Waves,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useStore } from '../store';
import { fmt } from '../utils/calculations';
import { C } from '../utils/chartColors';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LancamentoManual {
  id: string;
  descricao: string;
  valor: number;
  tipo: 'entrada' | 'saida';
  data: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(base: Date, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function dayLabel(iso: string, compact = false) {
  const d = new Date(iso + 'T12:00:00');
  if (compact) return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KCard({
  label,
  value,
  sub,
  pos,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  pos?: boolean;
  icon: React.ElementType;
}) {
  const color =
    pos === undefined
      ? 'text-slate-800 dark:text-slate-100'
      : pos
        ? 'text-emerald-600'
        : 'text-red-500';
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <Icon
          size={13}
          className={
            pos === undefined ? 'text-slate-400' : pos ? 'text-emerald-500' : 'text-red-400'
          }
        />
      </div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Tooltip customizado ──────────────────────────────────────────────────────

type REntry = { dataKey?: string; value?: number; color?: string; name?: string };
type RTip = { active?: boolean; payload?: REntry[]; label?: string };

const ChartTip = ({ active, payload, label }: RTip) => {
  if (!active || !payload?.length) return null;
  const saldo = payload.find((p) => p.dataKey === 'saldo')?.value ?? 0;
  const ent = payload.find((p) => p.dataKey === 'entradas')?.value ?? 0;
  const sai = payload.find((p) => p.dataKey === 'saidas')?.value ?? 0;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-lg text-xs space-y-1 min-w-40">
      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">{label}</p>
      <p className="text-emerald-600 flex items-center gap-1">
        <ArrowUpRight size={10} /> Entradas: {fmt(ent)}
      </p>
      <p className="text-red-500 flex items-center gap-1">
        <ArrowDownRight size={10} /> Saídas: {fmt(sai)}
      </p>
      <p className={`font-bold ${saldo >= 0 ? 'text-core-green' : 'text-red-500'}`}>
        Saldo: {fmt(saldo)}
      </p>
    </div>
  );
};

// ─── Form modal ───────────────────────────────────────────────────────────────

function NovoLancamento({
  onSave,
  onClose,
}: {
  onSave: (l: LancamentoManual) => void;
  onClose: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    descricao: '',
    valor: '',
    tipo: 'entrada' as 'entrada' | 'saida',
    data: today,
  });
  const f =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));
  const save = () => {
    if (!form.descricao || !form.valor || !form.data) return;
    onSave({ id: crypto.randomUUID(), ...form, valor: parseFloat(form.valor) });
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
            Novo Lançamento
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors"
          >
            <X size={15} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Tipo
            </label>
            <select value={form.tipo} onChange={f('tipo')} className="input-field w-full">
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Descrição
            </label>
            <input
              value={form.descricao}
              onChange={f('descricao')}
              placeholder="Ex: Pagamento cliente"
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Valor (R$)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.valor}
              onChange={f('valor')}
              placeholder="0,00"
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Data
            </label>
            <input
              type="date"
              value={form.data}
              onChange={f('data')}
              className="input-field w-full"
            />
          </div>
        </div>
        <div className="px-5 pb-4 flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary text-sm px-4 py-2 rounded-xl">
            Cancelar
          </button>
          <button onClick={save} className="btn-primary text-sm px-4 py-2 rounded-xl">
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const HORIZONTE_OPTS = [
  { label: '30 dias', value: 30 },
  { label: '60 dias', value: 60 },
  { label: '90 dias', value: 90 },
];

export default function FluxoCaixa() {
  const pedidosAll = useStore((s) => s.pedidos);
  const despesasAll = useStore((s) => s.despesas);
  const contasPagar = useStore((s) => s.contasPagar);
  const lojaFiltro = useStore((s) => s.lojaFiltro);

  const [horizonte, setHorizonte] = useState(60);
  const [manuais, setManuais] = useState<LancamentoManual[]>([]);
  const [showForm, setShowForm] = useState(false);

  const hoje = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // ── Pedidos filtrados (últimos 30d para calcular média diária) ─────────────
  const pedidos30d = useMemo(() => {
    const cutoff = toISO(addDays(hoje, -30));
    return (lojaFiltro ? pedidosAll.filter((p) => p.loja === lojaFiltro) : pedidosAll).filter(
      (p) => p.data >= cutoff && (p.status === 'Concluído' || p.status === 'Enviado')
    );
  }, [pedidosAll, lojaFiltro, hoje]);

  // Receita diária média (últimos 30 dias)
  const receitaDiaria = useMemo(() => {
    const total = pedidos30d.reduce((s, p) => s + p.receita, 0);
    return total / 30;
  }, [pedidos30d]);

  // ── Despesas: média mensal → diária ───────────────────────────────────────
  const despesasDiaria = useMemo(() => {
    const cutoff = toISO(addDays(hoje, -60));
    const filtered = (
      lojaFiltro
        ? despesasAll.filter((d) => d.loja === lojaFiltro || d.loja === 'Ambas')
        : despesasAll
    ).filter((d) => d.data >= cutoff);
    const total = filtered.reduce((s, d) => s + d.valor, 0);
    return total / 60;
  }, [despesasAll, lojaFiltro, hoje]);

  // ── Contas a pagar pendentes com data futura ──────────────────────────────
  const contasFuturas = useMemo(() => {
    const cutoffFim = toISO(addDays(hoje, horizonte));
    return contasPagar.filter((c) => {
      if (c.status === 'pago') return false;
      if (lojaFiltro && c.loja !== lojaFiltro && c.loja !== 'Ambas') return false;
      return c.vencimento <= cutoffFim;
    });
  }, [contasPagar, lojaFiltro, horizonte, hoje]);

  // ── Linha do tempo dia-a-dia ──────────────────────────────────────────────
  const timeline = useMemo(() => {
    const days: {
      iso: string;
      label: string;
      entradas: number;
      saidas: number;
      saldo: number;
      items: { descricao: string; valor: number; tipo: 'entrada' | 'saida' }[];
    }[] = [];

    let saldoAcum = 0;

    for (let i = 0; i < horizonte; i++) {
      const d = addDays(hoje, i);
      const iso = toISO(d);

      const items: { descricao: string; valor: number; tipo: 'entrada' | 'saida' }[] = [];

      // Receita projetada (exceto passado)
      items.push({ descricao: 'Receita projetada', valor: receitaDiaria, tipo: 'entrada' });

      // Despesas operacionais médias
      items.push({ descricao: 'Despesas operacionais', valor: despesasDiaria, tipo: 'saida' });

      // Contas a pagar neste dia
      contasFuturas
        .filter((c) => c.vencimento === iso)
        .forEach((c) => items.push({ descricao: c.descricao, valor: c.valor, tipo: 'saida' }));

      // Lançamentos manuais
      manuais
        .filter((m) => m.data === iso)
        .forEach((m) => items.push({ descricao: m.descricao, valor: m.valor, tipo: m.tipo }));

      const entradas = items.filter((x) => x.tipo === 'entrada').reduce((s, x) => s + x.valor, 0);
      const saidas = items.filter((x) => x.tipo === 'saida').reduce((s, x) => s + x.valor, 0);
      saldoAcum += entradas - saidas;

      days.push({ iso, label: dayLabel(iso, true), entradas, saidas, saldo: saldoAcum, items });
    }
    return days;
  }, [horizonte, hoje, receitaDiaria, despesasDiaria, contasFuturas, manuais]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalEntradas = useMemo(() => timeline.reduce((s, d) => s + d.entradas, 0), [timeline]);
  const totalSaidas = useMemo(() => timeline.reduce((s, d) => s + d.saidas, 0), [timeline]);
  const saldoFinal = timeline[timeline.length - 1]?.saldo ?? 0;
  const diasAteNeg = useMemo(() => {
    const idx = timeline.findIndex((d) => d.saldo < 0);
    return idx === -1 ? null : idx + 1;
  }, [timeline]);
  const minimoSaldo = Math.min(...timeline.map((d) => d.saldo));

  // Dias em negativo
  const diasNeg = timeline.filter((d) => d.saldo < 0).length;

  // ── Próximas saídas grandes (top 5) ──────────────────────────────────────
  const proximasSaidas = useMemo(() => {
    const next14 = toISO(addDays(hoje, 14));
    return contasFuturas
      .filter((c) => c.vencimento <= next14)
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
      .slice(0, 8);
  }, [contasFuturas, hoje]);

  // Chart data: aggregate by week to avoid too many bars
  const chartData = useMemo(() => {
    if (horizonte <= 30) return timeline;
    // group by 2-day blocks
    const blocks: typeof timeline = [];
    for (let i = 0; i < timeline.length; i += 2) {
      const a = timeline[i];
      const b = timeline[i + 1];
      if (!b) {
        blocks.push(a);
        break;
      }
      blocks.push({
        iso: b.iso,
        label: a.label + '–' + b.label,
        entradas: a.entradas + b.entradas,
        saidas: a.saidas + b.saidas,
        saldo: b.saldo,
        items: [...a.items, ...b.items],
      });
    }
    return blocks;
  }, [timeline, horizonte]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-core-green/10 flex items-center justify-center">
            <Waves size={18} className="text-core-green" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Fluxo de Caixa</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Projeção das entradas e saídas dos próximos dias
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Horizonte */}
          <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
            {HORIZONTE_OPTS.map((o) => (
              <button
                key={o.value}
                onClick={() => setHorizonte(o.value)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  horizonte === o.value
                    ? 'bg-core-green text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl"
          >
            <Plus size={14} /> Lançamento
          </button>
        </div>
      </div>

      {/* Alerta saldo negativo */}
      {diasAteNeg !== null && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl">
          <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              Saldo projetado entra no negativo em {diasAteNeg} dia{diasAteNeg !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-0.5">
              Mínimo previsto: {fmt(minimoSaldo)} em {diasNeg} dia{diasNeg !== 1 ? 's' : ''}{' '}
              negativos. Revise as contas a pagar ou antecipe receitas.
            </p>
          </div>
        </div>
      )}

      {saldoFinal >= 0 && diasAteNeg === null && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
          <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            Fluxo positivo nos próximos {horizonte} dias — saldo projetado:{' '}
            <span className="font-bold">{fmt(saldoFinal)}</span>
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KCard
          label="Total Entradas"
          value={fmt(totalEntradas)}
          sub={`próximos ${horizonte}d`}
          pos={true}
          icon={ArrowUpRight}
        />
        <KCard
          label="Total Saídas"
          value={fmt(totalSaidas)}
          sub={`próximos ${horizonte}d`}
          pos={false}
          icon={ArrowDownRight}
        />
        <KCard
          label="Saldo Projetado"
          value={fmt(saldoFinal)}
          sub={
            saldoFinal >= 0
              ? `positivo ao fim de ${horizonte}d`
              : `negativo ao fim de ${horizonte}d`
          }
          pos={saldoFinal >= 0}
          icon={saldoFinal >= 0 ? TrendingUp : TrendingDown}
        />
        <KCard
          label="Receita Média/Dia"
          value={fmt(receitaDiaria)}
          sub={`base: últimos 30 dias`}
          icon={TrendingUp}
        />
      </div>

      {/* Gráfico saldo acumulado */}
      <div className="card p-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
          Saldo Acumulado — próximos {horizonte} dias
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradPos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#18B37A" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#18B37A" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradNeg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: C.slate }}
              axisLine={false}
              tickLine={false}
              interval={Math.floor(chartData.length / 8)}
            />
            <YAxis
              tick={{ fontSize: 9, fill: C.slate }}
              tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              axisLine={false}
              tickLine={false}
              width={46}
            />
            <Tooltip content={<ChartTip />} />
            <ReferenceLine y={0} stroke={C.red} strokeDasharray="4 4" strokeWidth={1.5} />
            <Area
              type="monotone"
              dataKey="saldo"
              stroke={saldoFinal >= 0 ? C.primary : C.red}
              strokeWidth={2}
              fill={saldoFinal >= 0 ? 'url(#gradPos)' : 'url(#gradNeg)'}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Dois painéis: próximas contas + lançamentos manuais */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Próximas saídas (14d) */}
        <div className="card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            Próximas Saídas — 14 dias
          </p>
          {proximasSaidas.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">
              Nenhuma conta pendente nos próximos 14 dias
            </p>
          ) : (
            <div className="space-y-1.5">
              {proximasSaidas.map((c) => {
                const diff = Math.ceil(
                  (new Date(c.vencimento + 'T12:00:00').getTime() - hoje.getTime()) / 86_400_000
                );
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-slate-700/50 last:border-0"
                  >
                    <div className="min-w-0 mr-2">
                      <p className="text-sm text-slate-700 dark:text-slate-200 truncate">
                        {c.descricao}
                      </p>
                      <p
                        className={`text-xs ${diff < 0 ? 'text-red-500' : diff <= 2 ? 'text-amber-500' : 'text-slate-400'}`}
                      >
                        {diff < 0
                          ? `Vencida há ${Math.abs(diff)}d`
                          : diff === 0
                            ? 'Vence hoje'
                            : `Em ${diff} dia${diff !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-red-500 font-mono flex-shrink-0">
                      {fmt(c.valor)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Lançamentos manuais */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Lançamentos Manuais
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="text-xs text-core-green hover:underline flex items-center gap-1"
            >
              <Plus size={11} /> Adicionar
            </button>
          </div>
          {manuais.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">
              Nenhum lançamento manual.
              <br />
              Use para planejar receitas ou despesas pontuais.
            </p>
          ) : (
            <div className="space-y-1.5">
              {manuais.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-slate-700/50 last:border-0"
                >
                  <div className="min-w-0 mr-2">
                    <p className="text-sm text-slate-700 dark:text-slate-200 truncate">
                      {m.descricao}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(m.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`text-sm font-semibold font-mono ${m.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-500'}`}
                    >
                      {m.tipo === 'entrada' ? '+' : '-'}
                      {fmt(m.valor)}
                    </span>
                    <button
                      onClick={() => setManuais((p) => p.filter((x) => x.id !== m.id))}
                      className="p-1 text-slate-300 hover:text-red-400 rounded transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabela dia-a-dia (primeiros 14 dias) */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Detalhamento — Próximos 14 dias
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800">
                {['Data', 'Entradas', 'Saídas', 'Resultado do dia', 'Saldo Acumulado'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {timeline.slice(0, 14).map((d) => {
                const res = d.entradas - d.saidas;
                return (
                  <tr
                    key={d.iso}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors"
                  >
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {dayLabel(d.iso)}
                    </td>
                    <td className="px-4 py-2.5 text-emerald-600 font-medium font-mono">
                      {fmt(d.entradas)}
                    </td>
                    <td className="px-4 py-2.5 text-red-500 font-medium font-mono">
                      {fmt(d.saidas)}
                    </td>
                    <td
                      className={`px-4 py-2.5 font-medium font-mono ${res >= 0 ? 'text-emerald-600' : 'text-red-500'}`}
                    >
                      {res >= 0 ? '+' : ''}
                      {fmt(res)}
                    </td>
                    <td
                      className={`px-4 py-2.5 font-bold font-mono ${d.saldo >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-red-600'}`}
                    >
                      {fmt(d.saldo)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nota metodológica */}
      <p className="text-xs text-slate-400 dark:text-slate-600 text-center">
        Entradas: média diária dos últimos 30 dias · Saídas: média de despesas dos últimos 60 dias +
        contas a pagar programadas · Lançamentos manuais são session-only e não persistem.
      </p>

      {showForm && (
        <NovoLancamento
          onSave={(l) => setManuais((p) => [...p, l])}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
