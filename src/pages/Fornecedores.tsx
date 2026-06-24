import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  Mail,
  Pencil,
  Phone,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { useStore } from '../store';
import type { Fornecedor } from '../types';
import { fmt } from '../utils/calculations';
import { exportXlsx } from '../utils/exportXlsx';

// ─── Tipos derivados ──────────────────────────────────────────────────────────

interface FornecedorStats {
  nome: string;
  totalGasto: number;
  nCompras: number;
  ultimaCompra: string;
  produtos: string[];
  ficha?: Fornecedor;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function diasDesde(iso: string): number {
  return Math.floor((Date.now() - new Date(iso + 'T12:00:00').getTime()) / 86_400_000);
}

function formatDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Form modal ───────────────────────────────────────────────────────────────

const EMPTY: Omit<Fornecedor, 'id'> = {
  nome: '',
  telefone: '',
  email: '',
  cnpj: '',
  leadTimeDias: 7,
  termosPagamento: '',
  observacoes: '',
};

function FornecedorForm({
  initial,
  title,
  onSave,
  onClose,
}: {
  initial: Omit<Fornecedor, 'id'>;
  title: string;
  onSave: (f: Omit<Fornecedor, 'id'>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState(initial);
  const f =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({
        ...p,
        [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value,
      }));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md max-h-[94vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{title}</h3>
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
              Nome *
            </label>
            <input
              value={form.nome}
              onChange={f('nome')}
              placeholder="Nome do fornecedor"
              className="input-field w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Telefone / WhatsApp
              </label>
              <input
                value={form.telefone ?? ''}
                onChange={f('telefone')}
                placeholder="(11) 99999-9999"
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                E-mail
              </label>
              <input
                type="email"
                value={form.email ?? ''}
                onChange={f('email')}
                placeholder="email@fornecedor.com"
                className="input-field w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                CNPJ / CPF
              </label>
              <input
                value={form.cnpj ?? ''}
                onChange={f('cnpj')}
                placeholder="00.000.000/0001-00"
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Lead time (dias)
              </label>
              <input
                type="number"
                min="0"
                value={form.leadTimeDias}
                onChange={f('leadTimeDias')}
                className="input-field w-full"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Termos de pagamento
            </label>
            <input
              value={form.termosPagamento ?? ''}
              onChange={f('termosPagamento')}
              placeholder="Ex: Pix à vista, 30/60 dias"
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Observações
            </label>
            <textarea
              value={form.observacoes ?? ''}
              onChange={f('observacoes')}
              rows={2}
              placeholder="Contato, horário, condições especiais…"
              className="input-field w-full resize-none"
            />
          </div>
        </div>
        <div className="px-5 pb-4 flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary text-sm px-4 py-2 rounded-xl">
            Cancelar
          </button>
          <button
            onClick={() => {
              if (form.nome.trim()) onSave(form);
            }}
            className="btn-primary text-sm px-4 py-2 rounded-xl flex items-center gap-1.5"
          >
            <Check size={13} /> Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card de fornecedor ───────────────────────────────────────────────────────

function FornecedorCard({
  stats,
  onEdit,
  onDelete,
  onAdd,
}: {
  stats: FornecedorStats;
  onEdit: (f: Fornecedor) => void;
  onDelete: (id: string) => void;
  onAdd: (nome: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { ficha } = stats;
  const diasAgo = diasDesde(stats.ultimaCompra);

  const urgencia =
    diasAgo > 60 ? 'text-amber-500' : diasAgo > 30 ? 'text-slate-400' : 'text-emerald-500';

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-xl bg-core-green/10 flex items-center justify-center flex-shrink-0 font-bold text-core-green text-sm">
          {stats.nome.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">{stats.nome}</h3>
            {(ficha?.leadTimeDias ?? 0) > 0 && (
              <span className="text-[9px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                <Clock size={8} /> {ficha?.leadTimeDias}d lead
              </span>
            )}
          </div>
          {/* Contact row */}
          {ficha && (
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              {ficha.telefone && (
                <a
                  href={`tel:${ficha.telefone}`}
                  className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-core-green transition-colors"
                >
                  <Phone size={10} /> {ficha.telefone}
                </a>
              )}
              {ficha.email && (
                <a
                  href={`mailto:${ficha.email}`}
                  className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-core-green transition-colors"
                >
                  <Mail size={10} /> {ficha.email}
                </a>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {ficha ? (
            <>
              <button
                onClick={() => onEdit(ficha)}
                className="p-1.5 text-slate-400 hover:text-core-green rounded-lg transition-colors"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => onDelete(ficha.id)}
                className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </>
          ) : (
            <button
              onClick={() => onAdd(stats.nome)}
              className="flex items-center gap-1 text-xs text-core-green hover:underline px-2 py-1 rounded-lg hover:bg-core-green/5 transition-colors"
            >
              <Plus size={11} /> Ficha
            </button>
          )}
          <button
            onClick={() => setExpanded((e) => !e)}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 border-t border-slate-100 dark:border-slate-700">
        {[
          {
            label: 'Total gasto',
            value: fmt(stats.totalGasto),
            icon: DollarSign,
            cls: 'text-slate-700 dark:text-slate-200',
          },
          {
            label: 'Compras',
            value: String(stats.nCompras),
            icon: ShoppingBag,
            cls: 'text-slate-700 dark:text-slate-200',
          },
          { label: 'Última compra', value: `${diasAgo}d atrás`, icon: Calendar, cls: urgencia },
        ].map(({ label, value, icon: Icon, cls }) => (
          <div key={label} className="p-3 text-center">
            <Icon size={12} className={`mx-auto mb-0.5 ${cls}`} />
            <p className={`text-sm font-bold ${cls}`}>{value}</p>
            <p className="text-[9px] text-slate-400 uppercase tracking-wide">{label}</p>
          </div>
        ))}
      </div>

      {/* Expandido: produtos + histórico + obs */}
      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-700 p-4 space-y-3">
          {/* Produtos fornecidos */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
              Produtos fornecidos
            </p>
            <div className="flex flex-wrap gap-1.5">
              {stats.produtos.map((p) => (
                <span
                  key={p}
                  className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
          {/* Última compra */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Calendar size={11} />
            <span>Última compra em {formatDate(stats.ultimaCompra)}</span>
            {diasAgo > 45 && (
              <span className="flex items-center gap-0.5 text-amber-500 ml-1">
                <AlertTriangle size={10} /> Inativo há mais de 45 dias
              </span>
            )}
          </div>
          {ficha?.termosPagamento && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-600 dark:text-slate-300">Pagamento:</span>{' '}
              {ficha.termosPagamento}
            </p>
          )}
          {ficha?.observacoes && (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
              "{ficha.observacoes}"
            </p>
          )}
          {ficha?.cnpj && <p className="text-xs text-slate-400 font-mono">{ficha.cnpj}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type SortKey = 'gasto' | 'compras' | 'recente' | 'nome';

export default function Fornecedores() {
  const comprasAll = useStore((s) => s.compras);
  const fornecedores = useStore((s) => s.fornecedores);
  const addFornecedor = useStore((s) => s.addFornecedor);
  const updateFornecedor = useStore((s) => s.updateFornecedor);
  const deleteFornecedor = useStore((s) => s.deleteFornecedor);
  const lojaFiltro = useStore((s) => s.lojaFiltro);

  const [busca, setBusca] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('gasto');
  const [form, setForm] = useState<{
    open: boolean;
    initial: Omit<Fornecedor, 'id'>;
    editId?: string;
  }>({ open: false, initial: EMPTY });

  const compras = useMemo(
    () =>
      lojaFiltro
        ? comprasAll.filter((c) => c.loja === lojaFiltro || c.loja === 'Ambas')
        : comprasAll,
    [comprasAll, lojaFiltro]
  );

  // Aggregate stats per supplier from compras
  const statsMap = useMemo(() => {
    const map = new Map<string, FornecedorStats>();
    compras.forEach((c) => {
      const nome = c.fornecedor?.trim() || 'Sem fornecedor';
      const cur = map.get(nome) ?? {
        nome,
        totalGasto: 0,
        nCompras: 0,
        ultimaCompra: c.data,
        produtos: [],
      };
      cur.totalGasto += c.custoTotal;
      cur.nCompras += 1;
      if (c.data > cur.ultimaCompra) cur.ultimaCompra = c.data;
      if (!cur.produtos.includes(c.produto)) cur.produtos.push(c.produto);
      map.set(nome, cur);
    });
    // Attach fichas
    fornecedores.forEach((f) => {
      const cur = map.get(f.nome);
      if (cur) cur.ficha = f;
    });
    // Also add fornecedores that have no compras yet
    fornecedores.forEach((f) => {
      if (!map.has(f.nome)) {
        map.set(f.nome, {
          nome: f.nome,
          totalGasto: 0,
          nCompras: 0,
          ultimaCompra: '',
          produtos: [],
          ficha: f,
        });
      }
    });
    return map;
  }, [compras, fornecedores]);

  const stats: FornecedorStats[] = useMemo(() => {
    let list = [...statsMap.values()];
    if (busca) {
      const q = busca.toLowerCase();
      list = list.filter((s) => s.nome.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (sortKey === 'gasto') return b.totalGasto - a.totalGasto;
      if (sortKey === 'compras') return b.nCompras - a.nCompras;
      if (sortKey === 'recente') return (b.ultimaCompra || '').localeCompare(a.ultimaCompra || '');
      return a.nome.localeCompare(b.nome);
    });
    return list;
  }, [statsMap, busca, sortKey]);

  // KPIs
  const totalGastoAll = useMemo(() => compras.reduce((s, c) => s + c.custoTotal, 0), [compras]);
  const topFornecedor = stats[0];
  const semFicha = stats.filter((s) => !s.ficha).length;
  const inativos = stats.filter((s) => s.ultimaCompra && diasDesde(s.ultimaCompra) > 45).length;

  const openAdd = (nome = '') =>
    setForm({ open: true, initial: { ...EMPTY, nome }, editId: undefined });
  const openEdit = (f: Fornecedor) =>
    setForm({
      open: true,
      initial: {
        nome: f.nome,
        telefone: f.telefone,
        email: f.email,
        cnpj: f.cnpj,
        leadTimeDias: f.leadTimeDias,
        termosPagamento: f.termosPagamento,
        observacoes: f.observacoes,
      },
      editId: f.id,
    });

  const saveForm = (data: Omit<Fornecedor, 'id'>) => {
    if (form.editId) updateFornecedor(form.editId, data);
    else addFornecedor({ id: crypto.randomUUID(), ...data });
    setForm((p) => ({ ...p, open: false }));
  };

  const handleExport = () => {
    const headers = [
      'Fornecedor',
      'Total Gasto (R$)',
      'Nº Compras',
      'Última Compra',
      'Produtos',
      'Telefone',
      'Email',
      'Lead Time (dias)',
      'Pagamento',
    ];
    const rows = stats.map((s) => [
      s.nome,
      s.totalGasto.toFixed(2),
      s.nCompras,
      s.ultimaCompra,
      s.produtos.join(', '),
      s.ficha?.telefone ?? '',
      s.ficha?.email ?? '',
      s.ficha?.leadTimeDias ?? '',
      s.ficha?.termosPagamento ?? '',
    ]);
    exportXlsx('fornecedores', [{ name: 'Fornecedores', headers, rows }]);
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-core-green/10 flex items-center justify-center">
            <Truck size={18} className="text-core-green" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Fornecedores</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {stats.length} fornecedor{stats.length !== 1 ? 'es' : ''} identificado
              {stats.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="text-xs px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium"
          >
            Exportar
          </button>
          <button
            onClick={() => openAdd()}
            className="btn-primary flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl"
          >
            <Plus size={14} /> Novo Fornecedor
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          {
            label: 'Total em compras',
            value: fmt(totalGastoAll),
            sub: `${compras.length} registros`,
            icon: DollarSign,
          },
          {
            label: 'Top fornecedor',
            value: topFornecedor?.nome ?? '—',
            sub: topFornecedor ? fmt(topFornecedor.totalGasto) : '',
            icon: Truck,
          },
          {
            label: 'Sem ficha cadastrada',
            value: String(semFicha),
            sub: 'clique em "Ficha" para adicionar',
            icon: Plus,
          },
          {
            label: 'Inativos (+45 dias)',
            value: String(inativos),
            sub: 'sem compras recentes',
            icon: AlertTriangle,
          },
        ].map(({ label, value, sub, icon: Icon }) => (
          <div key={label} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {label}
              </p>
              <Icon size={13} className="text-slate-400" />
            </div>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate">{value}</p>
            {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Controles */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar fornecedor…"
          className="input-field text-sm w-52"
        />
        <div className="flex gap-1.5">
          {(
            [
              ['gasto', 'Maior gasto'],
              ['compras', 'Mais compras'],
              ['recente', 'Mais recente'],
              ['nome', 'Nome'],
            ] as [SortKey, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setSortKey(k)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap ${
                sortKey === k
                  ? 'bg-core-green text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      {stats.length === 0 ? (
        <div className="card p-12 text-center">
          <Truck size={32} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">
            Nenhum fornecedor encontrado.
          </p>
          <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
            Registre compras com o campo "fornecedor" preenchido para que apareçam aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {stats.map((s) => (
            <FornecedorCard
              key={s.nome}
              stats={s}
              onEdit={openEdit}
              onDelete={deleteFornecedor}
              onAdd={openAdd}
            />
          ))}
        </div>
      )}

      {form.open && (
        <FornecedorForm
          title={form.editId ? 'Editar Fornecedor' : 'Novo Fornecedor'}
          initial={form.initial}
          onSave={saveForm}
          onClose={() => setForm((p) => ({ ...p, open: false }))}
        />
      )}
    </div>
  );
}
