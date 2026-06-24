import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  DollarSign,
  Filter,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  TrendingDown,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { useToast } from '../components/Toast';
import { useStore } from '../store';
import type { ContaPagar } from '../types';
import { fmt } from '../utils/calculations';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIAS = [
  'DAS / Imposto',
  'Fornecedor',
  'Aluguel',
  'Marketing',
  'Embalagem',
  'Frete',
  'Serviço',
  'Outro',
];
const today = () => new Date().toISOString().slice(0, 10);

function diasAte(vencimento: string): number {
  const diff =
    new Date(vencimento + 'T00:00:00').getTime() - new Date(today() + 'T00:00:00').getTime();
  return Math.ceil(diff / 864e5);
}

function statusEfetivo(c: ContaPagar): 'pago' | 'vencido' | 'urgente' | 'pendente' {
  if (c.status === 'pago') return 'pago';
  const d = diasAte(c.vencimento);
  if (d < 0) return 'vencido';
  if (d <= 3) return 'urgente';
  return 'pendente';
}

// ─── Status chip ──────────────────────────────────────────────────────────────

const STATUS_CFG = {
  pago: {
    label: 'Pago',
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800',
    dot: 'bg-emerald-400',
  },
  vencido: {
    label: 'Vencida',
    cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800',
    dot: 'bg-red-500 animate-pulse',
  },
  urgente: {
    label: 'Urgente',
    cls: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-800',
    dot: 'bg-orange-400 animate-pulse',
  },
  pendente: {
    label: 'Pendente',
    cls: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-700/30 dark:text-slate-300 dark:border-slate-600',
    dot: 'bg-slate-400',
  },
} as const;

function StatusChip({ c }: { c: ContaPagar }) {
  const se = statusEfetivo(c);
  const { label, cls, dot } = STATUS_CFG[se];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
      {label}
    </span>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="card p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {label}
        </p>
        <Icon size={13} className={accent} />
      </div>
      <p className={`text-xl font-bold ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500">{sub}</p>}
    </div>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

const EMPTY: Omit<ContaPagar, 'id'> = {
  descricao: '',
  categoria: 'Fornecedor',
  valor: 0,
  vencimento: '',
  status: 'pendente',
  recorrente: false,
  loja: 'Ambas',
  observacoes: '',
};

function ContaForm({
  initial,
  lojas,
  onSave,
  onClose,
}: {
  initial?: ContaPagar;
  lojas: string[];
  onSave: (c: Omit<ContaPagar, 'id'>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<ContaPagar, 'id'>>(
    initial ? { ...initial } : { ...EMPTY, vencimento: today() }
  );
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const valid = form.descricao.trim() && form.valor > 0 && form.vencimento;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
            {initial ? 'Editar Conta' : 'Nova Conta a Pagar'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">
              Descrição *
            </label>
            <input
              className="input"
              placeholder="Ex: DAS Julho, Fornecedor Binho…"
              value={form.descricao}
              onChange={(e) => set('descricao', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">
                Valor (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={form.valor || ''}
                onChange={(e) => set('valor', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">
                Vencimento *
              </label>
              <input
                type="date"
                className="input"
                value={form.vencimento}
                onChange={(e) => set('vencimento', e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">
                Categoria
              </label>
              <div className="relative">
                <select
                  className="input appearance-none pr-8"
                  value={form.categoria}
                  onChange={(e) => set('categoria', e.target.value)}
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Loja</label>
              <div className="relative">
                <select
                  className="input appearance-none pr-8"
                  value={form.loja}
                  onChange={(e) => set('loja', e.target.value as ContaPagar['loja'])}
                >
                  {lojas.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">
              Observações
            </label>
            <input
              className="input"
              placeholder="Notas opcionais…"
              value={form.observacoes ?? ''}
              onChange={(e) => set('observacoes', e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <div
              className={`w-8 h-4.5 rounded-full relative transition-colors ${form.recorrente ? 'bg-core-green' : 'bg-slate-200 dark:bg-slate-600'}`}
              onClick={() => set('recorrente', !form.recorrente)}
            >
              <div
                className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${form.recorrente ? 'translate-x-4' : 'translate-x-0.5'}`}
              />
            </div>
            <span className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <RefreshCw size={12} /> Conta recorrente mensal
            </span>
          </label>
        </div>
        <div className="px-6 pb-5 flex gap-3">
          <button className="btn-secondary flex-1 justify-center" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn-primary flex-1 justify-center"
            disabled={!valid}
            onClick={() => valid && onSave(form)}
          >
            {initial ? 'Salvar alterações' : 'Criar conta'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Delete ───────────────────────────────────────────────────────────

function ConfirmDelete({
  descricao,
  onConfirm,
  onCancel,
}: {
  descricao: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 bg-red-50 dark:bg-red-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 size={20} className="text-red-500" />
        </div>
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-center mb-1">
          Excluir conta?
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm text-center mb-5">{descricao}</p>
        <div className="flex gap-3">
          <button className="btn-secondary flex-1 justify-center" onClick={onCancel}>
            Cancelar
          </button>
          <button
            className="flex-1 py-2 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center gap-1.5"
            onClick={onConfirm}
          >
            <Trash2 size={13} /> Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type TabFiltro = 'pendentes' | 'pagas' | 'todas';

export default function ContasPagar() {
  const toast = useToast();
  const contasPagar = useStore((s) => s.contasPagar);
  const pedidosAll = useStore((s) => s.pedidos);
  const lojaFiltro = useStore((s) => s.lojaFiltro);
  const configuracoes = useStore((s) => s.configuracoes);
  const lojas = useMemo(() => [...configuracoes.lojas, 'Ambas'], [configuracoes.lojas]);
  const addContaPagar = useStore((s) => s.addContaPagar);
  const updateContaPagar = useStore((s) => s.updateContaPagar);
  const deleteContaPagar = useStore((s) => s.deleteContaPagar);
  const pagarConta = useStore((s) => s.pagarConta);

  const [tab, setTab] = useState<TabFiltro>('pendentes');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<ContaPagar | null>(null);
  const [delItem, setDelItem] = useState<ContaPagar | null>(null);
  const [catFiltro, setCatFiltro] = useState<string | null>(null);

  const contas = useMemo(
    () =>
      lojaFiltro
        ? contasPagar.filter((c) => c.loja === lojaFiltro || c.loja === 'Ambas')
        : contasPagar,
    [contasPagar, lojaFiltro]
  );

  // KPIs
  const todayStr = today();
  const pendentes = useMemo(() => contas.filter((c) => c.status === 'pendente'), [contas]);
  const vencidas = useMemo(
    () => pendentes.filter((c) => c.vencimento < todayStr),
    [pendentes, todayStr]
  );
  const proximas7 = useMemo(
    () =>
      pendentes.filter((c) => {
        const d = diasAte(c.vencimento);
        return d >= 0 && d <= 7;
      }),
    [pendentes]
  );
  const pagasMes = useMemo(() => {
    const mes = todayStr.slice(0, 7);
    return contas.filter((c) => c.status === 'pago' && (c.pagoEm ?? '').startsWith(mes));
  }, [contas, todayStr]);

  const totalPendente = useMemo(() => pendentes.reduce((s, c) => s + c.valor, 0), [pendentes]);
  const totalVencido = useMemo(() => vencidas.reduce((s, c) => s + c.valor, 0), [vencidas]);
  const totalProximas = useMemo(() => proximas7.reduce((s, c) => s + c.valor, 0), [proximas7]);
  const totalPagoMes = useMemo(() => pagasMes.reduce((s, c) => s + c.valor, 0), [pagasMes]);

  // Saldo futuro: a receber (pedidos Enviados) – pendentes nos próximos 30d
  const aReceber = useMemo(() => {
    const pedidos = lojaFiltro ? pedidosAll.filter((p) => p.loja === lojaFiltro) : pedidosAll;
    return pedidos.filter((p) => p.status === 'Enviado').reduce((s, p) => s + p.receita, 0);
  }, [pedidosAll, lojaFiltro]);
  const saldoFuturo = aReceber - totalPendente;

  // Lista filtrada por tab e categoria
  const listaFiltrada = useMemo(() => {
    let lista = contas;
    if (tab === 'pendentes') lista = lista.filter((c) => c.status === 'pendente');
    else if (tab === 'pagas') lista = lista.filter((c) => c.status === 'pago');
    if (catFiltro) lista = lista.filter((c) => c.categoria === catFiltro);
    return [...lista].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'pendente' ? -1 : 1;
      return a.vencimento.localeCompare(b.vencimento);
    });
  }, [contas, tab, catFiltro]);

  const uid = () => `cp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const handleSave = (data: Omit<ContaPagar, 'id'>) => {
    if (editItem) {
      updateContaPagar(editItem.id, data);
      toast('Conta atualizada.', 'success');
      setEditItem(null);
    } else {
      addContaPagar({ id: uid(), ...data });
      toast('Conta adicionada.', 'success');
      setShowForm(false);
    }
  };

  const handlePagar = (c: ContaPagar) => {
    pagarConta(c.id);
    toast(`"${c.descricao}" marcada como paga.`, 'success');
  };

  const handleDelete = () => {
    if (!delItem) return;
    deleteContaPagar(delItem.id);
    toast('Conta excluída.', 'info');
    setDelItem(null);
  };

  const categorias = useMemo(() => [...new Set(contas.map((c) => c.categoria))].sort(), [contas]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Contas a Pagar</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Gestão de obrigações financeiras e projeção de saldo
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={15} /> Nova Conta
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard
          label="Total Pendente"
          value={fmt(totalPendente)}
          sub={`${pendentes.length} conta${pendentes.length !== 1 ? 's' : ''}`}
          icon={CreditCard}
          accent={totalPendente > 0 ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'}
        />
        <KpiCard
          label="Vencidas"
          value={fmt(totalVencido)}
          sub={`${vencidas.length} conta${vencidas.length !== 1 ? 's' : ''} em atraso`}
          icon={AlertTriangle}
          accent={vencidas.length > 0 ? 'text-red-500' : 'text-slate-400'}
        />
        <KpiCard
          label="Próximos 7 dias"
          value={fmt(totalProximas)}
          sub={`${proximas7.length} vencendo em breve`}
          icon={Clock}
          accent={proximas7.length > 0 ? 'text-orange-500' : 'text-slate-400'}
        />
        <KpiCard
          label="Pagas este mês"
          value={fmt(totalPagoMes)}
          sub={`${pagasMes.length} conta${pagasMes.length !== 1 ? 's' : ''} liquidadas`}
          icon={CheckCircle2}
          accent="text-emerald-500"
        />
      </div>

      {/* Saldo Futuro */}
      <div
        className={`card p-4 flex items-center gap-4 flex-wrap ${saldoFuturo >= 0 ? 'border-l-4 border-l-emerald-400' : 'border-l-4 border-l-red-400'}`}
      >
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${saldoFuturo >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-red-50 dark:bg-red-950/20'}`}
        >
          {saldoFuturo >= 0 ? (
            <DollarSign size={18} className="text-emerald-500" />
          ) : (
            <TrendingDown size={18} className="text-red-500" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Saldo Futuro Estimado
          </p>
          <p
            className={`text-2xl font-bold mt-0.5 ${saldoFuturo >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}
          >
            {fmt(saldoFuturo)}
          </p>
        </div>
        <div className="flex gap-6 text-sm text-slate-500 dark:text-slate-400 flex-wrap">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide mb-0.5">A Receber</p>
            <p className="font-semibold text-core-green">+ {fmt(aReceber)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide mb-0.5">Pendente</p>
            <p className="font-semibold text-slate-600 dark:text-slate-300">
              − {fmt(totalPendente)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs + filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        {(['pendentes', 'pagas', 'todas'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              tab === t
                ? 'bg-core-green text-white'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-400'
            }`}
          >
            {t}
          </button>
        ))}
        {categorias.length > 0 && (
          <div className="flex items-center gap-1.5 ml-2">
            <Filter size={12} className="text-slate-400" />
            {[null, ...categorias].map((cat) => (
              <button
                key={cat ?? '_all'}
                onClick={() => setCatFiltro(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  catFiltro === cat
                    ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                    : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {cat ?? 'Todas'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lista */}
      {listaFiltrada.length === 0 ? (
        <div className="card p-12 text-center">
          <CreditCard size={32} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">
            {contas.length === 0 ? 'Nenhuma conta cadastrada.' : 'Nenhuma conta neste filtro.'}
          </p>
          {contas.length === 0 && (
            <button
              className="mt-3 text-xs text-core-green hover:underline"
              onClick={() => setShowForm(true)}
            >
              Adicionar primeira conta →
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                  {['Descrição', 'Categoria', 'Valor', 'Vencimento', 'Status', 'Loja', ''].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/40">
                {listaFiltrada.map((c) => {
                  const se = statusEfetivo(c);
                  const d = diasAte(c.vencimento);
                  const urg = se === 'vencido' || se === 'urgente';
                  return (
                    <tr
                      key={c.id}
                      className={`transition-colors ${urg ? 'bg-red-50/30 dark:bg-red-950/5 hover:bg-red-50/60 dark:hover:bg-red-950/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/20'}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {c.recorrente && (
                            <span title="Recorrente">
                              <RefreshCw
                                size={11}
                                className="text-slate-300 dark:text-slate-600 flex-shrink-0"
                              />
                            </span>
                          )}
                          <span className="font-medium text-slate-800 dark:text-slate-100 truncate max-w-48">
                            {c.descricao}
                          </span>
                        </div>
                        {c.observacoes && (
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-48">
                            {c.observacoes}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-md text-slate-600 dark:text-slate-300 font-medium">
                          {c.categoria}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                        {fmt(c.valor)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={11} className="text-slate-400" />
                          <span className="text-slate-600 dark:text-slate-300">
                            {new Date(c.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        {c.status === 'pendente' && (
                          <p
                            className={`text-[11px] mt-0.5 ${se === 'vencido' ? 'text-red-500' : se === 'urgente' ? 'text-orange-500' : 'text-slate-400'}`}
                          >
                            {se === 'vencido'
                              ? `${Math.abs(d)}d em atraso`
                              : d === 0
                                ? 'vence hoje'
                                : `${d}d restantes`}
                          </p>
                        )}
                        {c.status === 'pago' && c.pagoEm && (
                          <p className="text-[11px] text-emerald-500 mt-0.5">
                            pago em {new Date(c.pagoEm + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusChip c={c} />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {c.loja}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {c.status === 'pendente' && (
                            <button
                              onClick={() => handlePagar(c)}
                              title="Marcar como paga"
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-950/40 transition-colors"
                            >
                              <CheckCircle2 size={12} /> Pagar
                            </button>
                          )}
                          <button
                            onClick={() => setEditItem(c)}
                            className="text-slate-300 hover:text-core-green transition-colors"
                            title="Editar"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setDelItem(c)}
                            className="text-slate-300 hover:text-red-400 transition-colors"
                            title="Excluir"
                          >
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
          <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between text-xs text-slate-400 dark:text-slate-500">
            <span>
              {listaFiltrada.length} conta{listaFiltrada.length !== 1 ? 's' : ''}
            </span>
            <span className="font-medium text-slate-600 dark:text-slate-300">
              Total: {fmt(listaFiltrada.reduce((s, c) => s + c.valor, 0))}
            </span>
          </div>
        </div>
      )}

      {/* Modals */}
      {showForm && !editItem && (
        <ContaForm lojas={lojas} onSave={handleSave} onClose={() => setShowForm(false)} />
      )}
      {editItem && (
        <ContaForm
          initial={editItem}
          lojas={lojas}
          onSave={handleSave}
          onClose={() => setEditItem(null)}
        />
      )}
      {delItem && (
        <ConfirmDelete
          descricao={delItem.descricao}
          onConfirm={handleDelete}
          onCancel={() => setDelItem(null)}
        />
      )}
    </div>
  );
}
