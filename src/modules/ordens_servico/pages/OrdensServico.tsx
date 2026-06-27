import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Edit2,
  Phone,
  Plus,
  Save,
  Search,
  User,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

type OSStatus =
  | 'aberta'
  | 'em_analise'
  | 'orcada'
  | 'aprovada'
  | 'em_execucao'
  | 'concluida'
  | 'entregue';
type OSPriority = 'baixa' | 'normal' | 'alta' | 'urgente';

interface OS {
  id: string;
  titulo: string;
  descricao: string | null;
  cliente_nome: string | null;
  cliente_tel: string | null;
  status: OSStatus;
  prioridade: OSPriority;
  valor_orcado: number | null;
  valor_final: number | null;
  data_entrada: string;
  data_prevista: string | null;
  data_conclusao: string | null;
  tecnico: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_CONFIG: Record<OSStatus, { label: string; color: string; dot: string }> = {
  aberta: {
    label: 'Aberta',
    color: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
    dot: 'bg-slate-400',
  },
  em_analise: {
    label: 'Em Análise',
    color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    dot: 'bg-blue-400',
  },
  orcada: {
    label: 'Orçada',
    color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    dot: 'bg-amber-400',
  },
  aprovada: {
    label: 'Aprovada',
    color: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
    dot: 'bg-indigo-400',
  },
  em_execucao: {
    label: 'Em Execução',
    color: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
    dot: 'bg-violet-400',
  },
  concluida: {
    label: 'Concluída',
    color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    dot: 'bg-emerald-400',
  },
  entregue: {
    label: 'Entregue',
    color: 'text-core-green bg-core-green/10 border-core-green/20',
    dot: 'bg-core-green',
  },
};

const PRIORITY_CONFIG: Record<OSPriority, { label: string; color: string }> = {
  baixa: { label: 'Baixa', color: 'text-slate-500' },
  normal: { label: 'Normal', color: 'text-blue-400' },
  alta: { label: 'Alta', color: 'text-amber-400' },
  urgente: { label: 'Urgente', color: 'text-red-400' },
};

const STATUS_ORDER: OSStatus[] = [
  'aberta',
  'em_analise',
  'orcada',
  'aprovada',
  'em_execucao',
  'concluida',
  'entregue',
];

const EMPTY_FORM = {
  titulo: '',
  descricao: '',
  cliente_nome: '',
  cliente_tel: '',
  status: 'aberta' as OSStatus,
  prioridade: 'normal' as OSPriority,
  valor_orcado: '',
  data_prevista: '',
  tecnico: '',
  observacoes: '',
};

function StatusBadge({ status }: { status: OSStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function fmt(val: number | null) {
  if (val == null) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
}

// ── Modal Nova/Editar OS ──────────────────────────────────────────────────────
function OSModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: OS;
  onSave: (data: typeof EMPTY_FORM) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<typeof EMPTY_FORM>(
    initial
      ? {
          titulo: initial.titulo,
          descricao: initial.descricao ?? '',
          cliente_nome: initial.cliente_nome ?? '',
          cliente_tel: initial.cliente_tel ?? '',
          status: initial.status,
          prioridade: initial.prioridade,
          valor_orcado: initial.valor_orcado != null ? String(initial.valor_orcado) : '',
          data_prevista: initial.data_prevista ?? '',
          tecnico: initial.tecnico ?? '',
          observacoes: initial.observacoes ?? '',
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);

  const set =
    (k: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  const inputCls =
    'w-full h-9 bg-slate-800 border border-white/[0.08] rounded-lg px-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-core-green/40 transition-colors';
  const selectCls =
    'w-full h-9 bg-slate-800 border border-white/[0.08] rounded-lg px-3 text-sm text-slate-100 focus:outline-none focus:border-core-green/40';
  const labelCls = 'text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/[0.08] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-slate-900 border-b border-white/[0.06] px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <ClipboardList size={16} className="text-core-green" />
            <h2 className="text-sm font-bold text-slate-100">
              {initial ? 'Editar OS' : 'Nova Ordem de Serviço'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Título *</label>
              <input
                required
                value={form.titulo}
                onChange={set('titulo')}
                placeholder="Ex: Manutenção bomba d'água"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Cliente</label>
              <input
                value={form.cliente_nome}
                onChange={set('cliente_nome')}
                placeholder="Nome do cliente"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Telefone</label>
              <input
                value={form.cliente_tel}
                onChange={set('cliente_tel')}
                placeholder="(11) 99999-0000"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select value={form.status} onChange={set('status')} className={selectCls}>
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_CONFIG[s].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Prioridade</label>
              <select value={form.prioridade} onChange={set('prioridade')} className={selectCls}>
                {(['baixa', 'normal', 'alta', 'urgente'] as OSPriority[]).map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_CONFIG[p].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Valor orçado (R$)</label>
              <input
                type="number"
                step="0.01"
                value={form.valor_orcado}
                onChange={set('valor_orcado')}
                placeholder="0,00"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Data prevista</label>
              <input
                type="date"
                value={form.data_prevista}
                onChange={set('data_prevista')}
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Técnico responsável</label>
              <input
                value={form.tecnico}
                onChange={set('tecnico')}
                placeholder="Nome do técnico"
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Descrição / Problema relatado</label>
              <textarea
                value={form.descricao}
                onChange={set('descricao')}
                rows={3}
                placeholder="Descreva o problema ou serviço solicitado…"
                className="w-full bg-slate-800 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-core-green/40 transition-colors resize-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Observações internas</label>
              <textarea
                value={form.observacoes}
                onChange={set('observacoes')}
                rows={2}
                placeholder="Notas internas, diagnóstico, peças usadas…"
                className="w-full bg-slate-800 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-core-green/40 transition-colors resize-none"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-core-green text-slate-950 text-sm font-semibold rounded-lg hover:bg-core-green-h transition-colors disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Linha expandível da OS ────────────────────────────────────────────────────
function OSRow({
  os,
  onEdit,
  onStatusChange,
}: {
  os: OS;
  onEdit: (os: OS) => void;
  onStatusChange: (id: string, status: OSStatus) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const priority = PRIORITY_CONFIG[os.prioridade];

  return (
    <>
      <div
        className="grid grid-cols-[1fr_140px_120px_110px_100px_80px] gap-0 hover:bg-white/[0.02] cursor-pointer transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="px-4 py-3 flex items-center gap-2 min-w-0">
          {expanded ? (
            <ChevronUp size={13} className="text-slate-500 flex-shrink-0" />
          ) : (
            <ChevronDown size={13} className="text-slate-500 flex-shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-xs text-slate-200 truncate font-medium">{os.titulo}</p>
            {os.cliente_nome && (
              <p className="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                <User size={9} /> {os.cliente_nome}
              </p>
            )}
          </div>
        </div>
        <div className="px-4 py-3 flex items-center">
          <StatusBadge status={os.status} />
        </div>
        <div className="px-4 py-3 flex items-center">
          <span className={`text-xs font-medium ${priority.color}`}>{priority.label}</span>
        </div>
        <div className="px-4 py-3 flex items-center">
          <span className="text-xs text-slate-400">{fmt(os.valor_orcado)}</span>
        </div>
        <div className="px-4 py-3 flex items-center">
          <span className="text-xs text-slate-500">{fmtDate(os.data_prevista)}</span>
        </div>
        <div
          className="px-2 py-3 flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(os);
          }}
        >
          <button className="w-7 h-7 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-slate-500 hover:text-slate-200 transition-colors">
            <Edit2 size={13} />
          </button>
        </div>
      </div>

      {/* Detail row */}
      {expanded && (
        <div className="bg-slate-900/50 border-t border-white/[0.04] px-6 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {os.descricao && (
            <div className="sm:col-span-2 lg:col-span-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Descrição
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">{os.descricao}</p>
            </div>
          )}
          {os.cliente_tel && (
            <div className="flex items-center gap-2">
              <Phone size={11} className="text-slate-500 flex-shrink-0" />
              <span className="text-xs text-slate-400">{os.cliente_tel}</span>
            </div>
          )}
          {os.tecnico && (
            <div>
              <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">Técnico</p>
              <p className="text-xs text-slate-300">{os.tecnico}</p>
            </div>
          )}
          {os.valor_final != null && (
            <div>
              <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">
                Valor final
              </p>
              <p className="text-xs text-slate-300">{fmt(os.valor_final)}</p>
            </div>
          )}
          {os.data_conclusao && (
            <div>
              <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">
                Conclusão
              </p>
              <p className="text-xs text-slate-300">{fmtDate(os.data_conclusao)}</p>
            </div>
          )}
          {os.observacoes && (
            <div className="sm:col-span-2 lg:col-span-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Observações
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">{os.observacoes}</p>
            </div>
          )}
          {/* Status avançar */}
          <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-2 pt-1">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider">Avançar para:</p>
            {STATUS_ORDER.slice(
              STATUS_ORDER.indexOf(os.status) + 1,
              STATUS_ORDER.indexOf(os.status) + 3
            ).map((next) => (
              <button
                key={next}
                onClick={() => onStatusChange(os.id, next)}
                className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors hover:opacity-80 ${STATUS_CONFIG[next].color}`}
              >
                → {STATUS_CONFIG[next].label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
const EM_ANDAMENTO: OSStatus[] = ['em_analise', 'orcada', 'aprovada', 'em_execucao'];

export default function OrdensServico() {
  const { user } = useAuth();
  const [list, setList] = useState<OS[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<
    'todas' | 'abertas' | 'andamento' | 'concluidas'
  >('todas');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<OS | undefined>();

  useEffect(() => {
    if (!user) return;
    supabase
      .from('ordens_servico')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setList((data as OS[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return list.filter((os) => {
      if (q && !os.titulo.toLowerCase().includes(q) && !os.cliente_nome?.toLowerCase().includes(q))
        return false;
      if (filterStatus === 'abertas' && os.status !== 'aberta') return false;
      if (filterStatus === 'andamento' && !EM_ANDAMENTO.includes(os.status)) return false;
      if (filterStatus === 'concluidas' && os.status !== 'concluida' && os.status !== 'entregue')
        return false;
      return true;
    });
  }, [list, search, filterStatus]);

  const mesAtual = new Date().toISOString().slice(0, 7);
  const kpis = {
    total: list.length,
    abertas: list.filter((o) => o.status === 'aberta').length,
    andamento: list.filter((o) => EM_ANDAMENTO.includes(o.status)).length,
    concluidasMes: list.filter(
      (o) =>
        (o.status === 'concluida' || o.status === 'entregue') && o.updated_at?.startsWith(mesAtual)
    ).length,
  };

  async function handleSave(form: typeof EMPTY_FORM) {
    if (!user) return;
    const payload = {
      user_id: user.id,
      titulo: form.titulo,
      descricao: form.descricao || null,
      cliente_nome: form.cliente_nome || null,
      cliente_tel: form.cliente_tel || null,
      status: form.status,
      prioridade: form.prioridade,
      valor_orcado: form.valor_orcado ? parseFloat(form.valor_orcado) : null,
      data_prevista: form.data_prevista || null,
      tecnico: form.tecnico || null,
      observacoes: form.observacoes || null,
    };

    if (editing) {
      const { data } = await supabase
        .from('ordens_servico')
        .update(payload)
        .eq('id', editing.id)
        .select()
        .single();
      if (data) setList((prev) => prev.map((o) => (o.id === editing.id ? (data as OS) : o)));
    } else {
      const { data } = await supabase.from('ordens_servico').insert(payload).select().single();
      if (data) setList((prev) => [data as OS, ...prev]);
    }
    setShowModal(false);
    setEditing(undefined);
  }

  async function handleStatusChange(id: string, status: OSStatus) {
    const extra =
      status === 'concluida' || status === 'entregue'
        ? { data_conclusao: new Date().toISOString().split('T')[0] }
        : {};
    await supabase
      .from('ordens_servico')
      .update({ status, ...extra })
      .eq('id', id);
    setList((prev) => prev.map((o) => (o.id === id ? { ...o, status, ...extra } : o)));
  }

  const TAB_CONFIG = [
    { key: 'todas', label: 'Todas', count: list.length },
    { key: 'abertas', label: 'Abertas', count: kpis.abertas },
    { key: 'andamento', label: 'Em andamento', count: kpis.andamento },
    { key: 'concluidas', label: 'Concluídas', count: kpis.concluidasMes },
  ] as const;

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Ordens de Serviço</h1>
          <p className="text-slate-500 text-sm mt-0.5">{list.length} OS cadastradas</p>
        </div>
        <button
          onClick={() => {
            setEditing(undefined);
            setShowModal(true);
          }}
          className="flex items-center gap-2 h-9 px-4 bg-core-green text-slate-950 text-sm font-semibold rounded-lg hover:bg-core-green-h transition-colors"
        >
          <Plus size={14} /> Nova OS
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total OS', value: kpis.total, icon: ClipboardList, color: 'text-slate-400' },
          { label: 'Abertas', value: kpis.abertas, icon: AlertCircle, color: 'text-amber-400' },
          { label: 'Em andamento', value: kpis.andamento, icon: Edit2, color: 'text-violet-400' },
          {
            label: 'Concluídas (mês)',
            value: kpis.concluidasMes,
            icon: CheckCircle2,
            color: 'text-core-green',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-slate-900 border border-white/[0.06] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {label}
              </span>
              <Icon size={13} className={color} />
            </div>
            <p className="text-2xl font-bold text-slate-100">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex gap-1 border-b border-white/[0.06] w-full sm:w-auto">
          {TAB_CONFIG.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilterStatus(t.key)}
              className={`flex items-center gap-1.5 px-3 h-9 text-xs font-medium border-b-2 -mb-px transition-colors ${
                filterStatus === t.key
                  ? 'text-core-green border-core-green'
                  : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              {t.label}
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${filterStatus === t.key ? 'bg-core-green/10 text-core-green' : 'bg-slate-800 text-slate-500'}`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título ou cliente…"
            className="h-9 bg-slate-900 border border-white/[0.06] rounded-lg pl-8 pr-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-core-green/40 transition-colors w-72"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-white/[0.06] rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-core-green border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-36 gap-3 text-slate-500">
            <ClipboardList size={24} className="opacity-30" />
            <p className="text-sm">
              {list.length === 0 ? 'Nenhuma OS ainda — crie a primeira!' : 'Nenhuma OS encontrada'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_140px_120px_110px_100px_80px] border-b border-white/[0.06]">
              {['OS / Cliente', 'Status', 'Prioridade', 'Orçamento', 'Previsão', ''].map((h) => (
                <div
                  key={h}
                  className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500"
                >
                  {h}
                </div>
              ))}
            </div>
            <div className="divide-y divide-white/[0.04]">
              {filtered.map((os) => (
                <OSRow
                  key={os.id}
                  os={os}
                  onEdit={(o) => {
                    setEditing(o);
                    setShowModal(true);
                  }}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {showModal && (
        <OSModal
          initial={editing}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setEditing(undefined);
          }}
        />
      )}
    </div>
  );
}
