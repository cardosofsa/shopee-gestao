import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Target,
  TrendingUp,
  X,
  XCircle,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '../components/ui';
import { useStore } from '../store';
import { fmt } from '../utils/calculations';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mesLabel(mesAno: string) {
  const [y, m] = mesAno.split('-');
  const nomes = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];
  return `${nomes[parseInt(m) - 1]} ${y}`;
}

function prevMes(m: string) {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function nextMes(m: string) {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function diasNoMes(mesAno: string) {
  const [y, m] = mesAno.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function diaAtualDoMes(mesAno: string) {
  const today = new Date().toISOString().slice(0, 7);
  if (mesAno !== today) return null;
  return new Date().getDate();
}

// Projeção simples: linear com dias corridos
function projetar(atual: number, mesAno: string): number | null {
  const diaAtual = diaAtualDoMes(mesAno);
  if (!diaAtual || diaAtual === 0) return null;
  return (atual / diaAtual) * diasNoMes(mesAno);
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

// ─── Inline editable number ───────────────────────────────────────────────────

function EditableNumber({
  value,
  placeholder,
  onSave,
  prefix,
}: {
  value?: number;
  placeholder: string;
  onSave: (v: number | undefined) => void;
  prefix?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const start = () => {
    setRaw(value ? String(value) : '');
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };
  const save = () => {
    const v = parseFloat(raw.replace(',', '.'));
    onSave(isNaN(v) || v <= 0 ? undefined : v);
    setEditing(false);
  };
  const cancel = () => setEditing(false);

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        {prefix && <span className="text-xs text-slate-400">{prefix}</span>}
        <input
          ref={inputRef}
          type="number"
          min={0}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') cancel();
          }}
          onBlur={save}
          className="w-24 text-xs border border-core-green rounded px-1.5 py-0.5 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 outline-none"
        />
        <button onMouseDown={save} className="text-core-green">
          <Check size={12} />
        </button>
        <button onMouseDown={cancel} className="text-slate-400">
          <X size={12} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={start}
      className="group flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-core-green transition-colors"
    >
      {value != null ? (
        <span className="font-semibold tabular-nums">
          {prefix}
          {prefix === 'R$ ' ? fmt(value) : value.toLocaleString('pt-BR')}
        </span>
      ) : (
        <span className="text-slate-300 dark:text-slate-600 italic">{placeholder}</span>
      )}
      <Pencil size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MetasProduto() {
  const produtos = useStore((s) => s.produtos);
  const pedidosAll = useStore((s) => s.pedidos);
  const metasProduto = useStore((s) => s.metasProduto);
  const upsertMeta = useStore((s) => s.upsertMetaProduto);
  const deleteMeta = useStore((s) => s.deleteMetaProduto);

  const mesAtual = new Date().toISOString().slice(0, 7);
  const [mes, setMes] = useState(mesAtual);
  const [filter, setFilter] = useState<'all' | 'com-meta' | 'risco' | 'ok'>('all');

  const isCurrent = mes === mesAtual;

  // ── Compute actual per SKU ───────────────────────────────────────────────

  const realizadoMap = useMemo(() => {
    const map: Record<string, { unidades: number; receita: number }> = {};
    pedidosAll
      .filter((p) => p.data.startsWith(mes) && (p.status === 'Concluído' || p.status === 'Enviado'))
      .forEach((p) => {
        if (!map[p.sku]) map[p.sku] = { unidades: 0, receita: 0 };
        map[p.sku].unidades += p.unidadesEstoque;
        map[p.sku].receita += p.receita;
      });
    return map;
  }, [pedidosAll, mes]);

  const metaMap = useMemo(() => {
    const m: Record<string, { metaUnidades?: number; metaReceita?: number }> = {};
    metasProduto
      .filter((x) => x.mesAno === mes)
      .forEach((x) => {
        m[x.sku] = { metaUnidades: x.metaUnidades, metaReceita: x.metaReceita };
      });
    return m;
  }, [metasProduto, mes]);

  // ── Rows ─────────────────────────────────────────────────────────────────

  const rows = useMemo(() => {
    return produtos
      .filter((p) => p.ativo !== false)
      .map((p) => {
        const real = realizadoMap[p.sku] ?? { unidades: 0, receita: 0 };
        const meta = metaMap[p.sku] ?? {};
        const projU = projetar(real.unidades, mes);
        const projR = projetar(real.receita, mes);

        const pctU =
          meta.metaUnidades && meta.metaUnidades > 0
            ? (real.unidades / meta.metaUnidades) * 100
            : null;
        const pctR =
          meta.metaReceita && meta.metaReceita > 0 ? (real.receita / meta.metaReceita) * 100 : null;

        // Overall status based on projection vs goal
        const projetoAtingeU =
          projU != null && meta.metaUnidades ? projU >= meta.metaUnidades : null;
        const projetoAtingeR = projR != null && meta.metaReceita ? projR >= meta.metaReceita : null;

        const hasMeta = meta.metaUnidades != null || meta.metaReceita != null;
        const emRisco =
          hasMeta && isCurrent && (projetoAtingeU === false || projetoAtingeR === false);
        const ok = hasMeta && isCurrent && projetoAtingeU !== false && projetoAtingeR !== false;

        return { ...p, real, meta, pctU, pctR, projU, projR, hasMeta, emRisco, ok };
      });
  }, [produtos, realizadoMap, metaMap, mes, isCurrent]);

  const filtered = useMemo(() => {
    if (filter === 'com-meta') return rows.filter((r) => r.hasMeta);
    if (filter === 'risco') return rows.filter((r) => r.emRisco);
    if (filter === 'ok') return rows.filter((r) => r.ok);
    return rows;
  }, [rows, filter]);

  // ── Summary ─────────────────────────────────────────────────────────────

  const comMeta = rows.filter((r) => r.hasMeta).length;
  const emRisco = rows.filter((r) => r.emRisco).length;
  const okCount = rows.filter((r) => r.ok).length;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-core-green/10 flex items-center justify-center">
            <Target size={18} className="text-core-green" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Metas por Produto
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Defina e acompanhe metas mensais por SKU — clique no valor para editar
            </p>
          </div>
        </div>
        <Link
          to="/metas"
          className="text-xs text-core-green hover:underline flex items-center gap-1"
        >
          Ver metas globais →
        </Link>
      </div>

      {/* Month nav */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMes(prevMes(mes))}
          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 min-w-40 text-center capitalize">
          {mesLabel(mes)}
        </span>
        <button
          onClick={() => setMes(nextMes(mes))}
          disabled={mes >= mesAtual}
          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={16} />
        </button>
        {isCurrent && (
          <span className="text-xs bg-core-green/10 text-core-green font-medium px-2.5 py-1 rounded-full">
            Mês atual
          </span>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{comMeta}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">com meta definida</p>
        </div>
        <div
          className={`card p-4 text-center ${emRisco > 0 ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10' : ''}`}
        >
          <p
            className={`text-2xl font-bold ${emRisco > 0 ? 'text-amber-600' : 'text-slate-300 dark:text-slate-600'}`}
          >
            {emRisco}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            em risco de não atingir
          </p>
        </div>
        <div
          className={`card p-4 text-center ${okCount > 0 ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10' : ''}`}
        >
          <p
            className={`text-2xl font-bold ${okCount > 0 ? 'text-green-600' : 'text-slate-300 dark:text-slate-600'}`}
          >
            {okCount}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">no ritmo certo</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {(
          [
            { key: 'all', label: `Todos (${rows.length})` },
            { key: 'com-meta', label: `Com meta (${comMeta})` },
            { key: 'risco', label: `Em risco (${emRisco})` },
            { key: 'ok', label: `No ritmo (${okCount})` },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === key
                ? 'bg-core-green text-white'
                : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-core-green/50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Product rows */}
      <div className="space-y-2">
        {filtered.map((row) => {
          const StatusIcon = row.emRisco ? AlertTriangle : row.ok ? CheckCircle2 : null;
          const statusColor = row.emRisco
            ? 'text-amber-500'
            : row.ok
              ? 'text-green-500'
              : 'text-slate-200 dark:text-slate-700';

          return (
            <div
              key={row.sku}
              className={`card p-4 transition-all ${
                row.emRisco
                  ? 'border-amber-200 dark:border-amber-800/50'
                  : row.ok
                    ? 'border-green-200 dark:border-green-800/50'
                    : ''
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Status icon */}
                <div className="pt-0.5">
                  {StatusIcon ? (
                    <StatusIcon size={16} className={statusColor} />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-slate-200 dark:border-slate-700" />
                  )}
                </div>

                {/* Product info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <Link
                      to={`/estoque/${row.sku}`}
                      className="font-mono text-xs text-core-green hover:underline"
                    >
                      {row.sku}
                    </Link>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                      {row.nome}
                    </span>
                    {row.hasMeta &&
                      row.meta.metaUnidades == null &&
                      row.meta.metaReceita == null && (
                        <button
                          onClick={() => deleteMeta(row.sku, mes)}
                          className="text-slate-300 hover:text-red-400 transition-colors"
                        >
                          <XCircle size={12} />
                        </button>
                      )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Meta de unidades */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">
                          Unidades vendidas
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-200">
                            {row.real.unidades}
                          </span>
                          <span className="text-slate-300 dark:text-slate-600">/</span>
                          <EditableNumber
                            value={row.meta.metaUnidades}
                            placeholder="definir meta"
                            onSave={(v) =>
                              upsertMeta({
                                sku: row.sku,
                                mesAno: mes,
                                metaUnidades: v,
                                metaReceita: row.meta.metaReceita,
                              })
                            }
                          />
                        </div>
                      </div>
                      {row.pctU != null && (
                        <>
                          <ProgressBar
                            pct={row.pctU}
                            color={
                              row.pctU >= 100
                                ? 'bg-green-500'
                                : row.pctU >= 70
                                  ? 'bg-core-green'
                                  : row.pctU >= 40
                                    ? 'bg-amber-500'
                                    : 'bg-red-400'
                            }
                          />
                          <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                            <span>{row.pctU.toFixed(0)}% atingido</span>
                            {isCurrent && row.projU != null && row.meta.metaUnidades && (
                              <span
                                className={`flex items-center gap-0.5 ${row.projU >= row.meta.metaUnidades ? 'text-green-500' : 'text-amber-500'}`}
                              >
                                <TrendingUp size={9} />
                                projeção: {Math.round(row.projU)} un.
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Meta de receita */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">
                          Receita
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-200">
                            {fmt(row.real.receita)}
                          </span>
                          <span className="text-slate-300 dark:text-slate-600">/</span>
                          <EditableNumber
                            value={row.meta.metaReceita}
                            placeholder="definir meta"
                            prefix="R$ "
                            onSave={(v) =>
                              upsertMeta({
                                sku: row.sku,
                                mesAno: mes,
                                metaUnidades: row.meta.metaUnidades,
                                metaReceita: v,
                              })
                            }
                          />
                        </div>
                      </div>
                      {row.pctR != null && (
                        <>
                          <ProgressBar
                            pct={row.pctR}
                            color={
                              row.pctR >= 100
                                ? 'bg-green-500'
                                : row.pctR >= 70
                                  ? 'bg-core-green'
                                  : row.pctR >= 40
                                    ? 'bg-amber-500'
                                    : 'bg-red-400'
                            }
                          />
                          <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                            <span>{row.pctR.toFixed(0)}% atingido</span>
                            {isCurrent && row.projR != null && row.meta.metaReceita && (
                              <span
                                className={`flex items-center gap-0.5 ${row.projR >= row.meta.metaReceita ? 'text-green-500' : 'text-amber-500'}`}
                              >
                                <TrendingUp size={9} />
                                projeção: {fmt(row.projR)}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <EmptyState
          icon={<Target size={20} />}
          title={filter === 'all' ? 'Nenhum produto cadastrado.' : 'Nenhum produto neste filtro.'}
          action={
            filter !== 'all' ? (
              <button
                onClick={() => setFilter('all')}
                className="text-xs text-core-green hover:underline"
              >
                Ver todos →
              </button>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
