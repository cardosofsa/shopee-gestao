import { useState, useMemo } from 'react';
import { Plus, Trash2, Pencil, ChevronLeft, ChevronRight, Receipt, TrendingUp, TrendingDown, X } from 'lucide-react';
import { useStore } from '../store';
import { fmt } from '../utils/calculations';
import type { Despesa } from '../types';
import { useToast } from '../components/Toast';

const PALETTE = [
  'bg-blue-100 text-blue-700',
  'bg-amber-100 text-amber-700',
  'bg-purple-100 text-purple-700',
  'bg-emerald-100 text-emerald-700',
  'bg-shopee-100 text-shopee-700',
  'bg-slate-100 text-slate-600',
  'bg-pink-100 text-pink-700',
  'bg-cyan-100 text-cyan-700',
  'bg-indigo-100 text-indigo-700',
  'bg-rose-100 text-rose-700',
];

function getCategoriaColor(cat: string, allCats: string[]) {
  const idx = allCats.indexOf(cat);
  return idx >= 0 ? PALETTE[idx % PALETTE.length] : 'bg-slate-100 text-slate-600';
}

function DespesaModal({
  title, initial, categorias, onSave, onClose,
}: {
  title: string;
  initial: Omit<Despesa, 'id'>;
  categorias: string[];
  onSave: (d: Omit<Despesa, 'id'>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<Despesa, 'id'>>(initial);

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }));

  const save = () => {
    if (!form.descricao || form.valor <= 0) return;
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Data</label>
              <input type="date" className="input" value={form.data} onChange={f('data')} />
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Valor (R$)</label>
              <input type="number" step="0.01" min="0" className="input" value={form.valor || ''} onChange={f('valor')} />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Categoria</label>
            <select className="select" value={form.categoria} onChange={f('categoria')}>
              {categorias.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Descrição</label>
            <input className="input" placeholder="Ex: Caixas de papelão 20x20cm" value={form.descricao} onChange={f('descricao')} />
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Loja</label>
            <select className="select" value={form.loja} onChange={f('loja')}>
              <option value="Ambas">Ambas</option>
              <option>Cardoso e-Shop</option>
              <option>Projetando</option>
            </select>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={save} disabled={!form.descricao || form.valor <= 0}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Despesas() {
  const toast          = useToast();
  const despesasAll    = useStore((s) => s.despesas);
  const lojaFiltro     = useStore((s) => s.lojaFiltro);
  const despesas       = useMemo(
    () => lojaFiltro ? despesasAll.filter((d) => d.loja === lojaFiltro || d.loja === 'Ambas') : despesasAll,
    [despesasAll, lojaFiltro],
  );
  const addDespesa     = useStore((s) => s.addDespesa);
  const updateDespesa  = useStore((s) => s.updateDespesa);
  const deleteDespesa  = useStore((s) => s.deleteDespesa);
  const categorias     = useStore((s) => s.categoriasDesp);
  const [showAdd,    setShowAdd]    = useState(false);
  const [editTarget, setEditTarget] = useState<Despesa | null>(null);
  const [mesFiltro, setMesFiltro] = useState(() => new Date().toISOString().slice(0, 7));
  const [filterCat, setFilterCat] = useState<string>('Todas');

  const mesAtual = new Date().toISOString().slice(0, 7);
  const isCurrentMonth = mesFiltro === mesAtual;
  const mesLabel = new Date(mesFiltro + '-02').toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  const prevMes = useMemo(() => {
    const [y, m] = mesFiltro.split('-').map(Number);
    return new Date(y, m - 2, 1).toISOString().slice(0, 7);
  }, [mesFiltro]);

  const prevMonth = () => {
    const [y, m] = mesFiltro.split('-').map(Number);
    setMesFiltro(new Date(y, m - 2, 1).toISOString().slice(0, 7));
  };
  const nextMonth = () => {
    const [y, m] = mesFiltro.split('-').map(Number);
    setMesFiltro(new Date(y, m, 1).toISOString().slice(0, 7));
  };

  const doMes = useMemo(
    () => despesas.filter((d) => d.data.startsWith(mesFiltro)),
    [despesas, mesFiltro]
  );

  const doMesAnterior = useMemo(
    () => despesas.filter((d) => d.data.startsWith(prevMes)),
    [despesas, prevMes]
  );

  const filtradas = useMemo(
    () => doMes.filter((d) => filterCat === 'Todas' || d.categoria === filterCat).sort((a, b) => b.data.localeCompare(a.data)),
    [doMes, filterCat]
  );

  const totalMes = doMes.reduce((s, d) => s + d.valor, 0);
  const totalMesAnterior = doMesAnterior.reduce((s, d) => s + d.valor, 0);
  const delta = totalMes - totalMesAnterior;
  const deltaPct = totalMesAnterior > 0 ? (delta / totalMesAnterior) * 100 : 0;

  const porCategoria = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of doMes) map.set(d.categoria, (map.get(d.categoria) ?? 0) + d.valor);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [doMes]);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Despesas</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Custos operacionais e compras</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
            <button onClick={prevMonth} className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors">
              <ChevronLeft size={15} />
            </button>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 capitalize px-1 min-w-32 text-center">{mesLabel}</span>
            <button onClick={nextMonth} disabled={isCurrentMonth} className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronRight size={15} />
            </button>
          </div>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={15} /> Nova Despesa
          </button>
        </div>
      </div>

      {/* KPIs do mês */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total do Mês com comparação */}
        <div className="card p-4 col-span-2 md:col-span-1 lg:col-span-2">
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">Total do Mês</p>
          <p className="text-red-500 font-bold text-2xl">{fmt(totalMes)}</p>
          <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">{doMes.length} lançamentos</p>
          {totalMesAnterior > 0 && (
            <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${delta > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
              {delta > 0
                ? <TrendingUp size={12} />
                : <TrendingDown size={12} />}
              {fmt(Math.abs(delta))} ({Math.abs(deltaPct).toFixed(0)}%) vs mês anterior
            </div>
          )}
        </div>
        {porCategoria.slice(0, 4).map(([cat, val]) => (
          <div key={cat} className="card p-4">
            <p className="text-slate-500 dark:text-slate-400 text-xs mb-1 truncate">{cat}</p>
            <p className="text-slate-800 dark:text-slate-100 font-bold text-lg">{fmt(val)}</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">{totalMes > 0 ? ((val / totalMes) * 100).toFixed(0) : 0}%</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="card p-4 flex flex-wrap gap-2 items-center">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Categoria:</span>
        {(['Todas', ...categorias]).map((c) => (
          <button
            key={c}
            onClick={() => setFilterCat(c)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterCat === c
                ? 'bg-shopee-500 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                {['Data', 'Categoria', 'Descrição', 'Loja', 'Valor', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {filtradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <Receipt size={32} className="text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-300 text-sm">Nenhuma despesa neste período.</p>
                    <p className="text-slate-300 text-xs mt-1">Compras de mercadoria aparecem aqui automaticamente.</p>
                  </td>
                </tr>
              ) : filtradas.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{d.data.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCategoriaColor(d.categoria, categorias)}`}>
                      {d.categoria}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{d.descricao}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{d.loja}</td>
                  <td className="px-4 py-3 text-red-500 font-medium whitespace-nowrap">{fmt(d.valor)}</td>
                  <td className="px-4 py-3">
                    {!d.compraRef ? (
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditTarget(d)} className="text-slate-300 hover:text-shopee-500 transition-colors" title="Editar">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => { deleteDespesa(d.id); toast('Despesa excluída.', 'info'); }} className="text-slate-300 hover:text-red-400 transition-colors" title="Excluir">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300 dark:text-slate-600 italic">via Estoque</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {filtradas.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 font-semibold">
                  <td colSpan={4} className="px-4 py-3 text-slate-700 dark:text-slate-200">TOTAL FILTRADO</td>
                  <td className="px-4 py-3 text-red-500">{fmt(filtradas.reduce((s, d) => s + d.valor, 0))}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {showAdd && (
        <DespesaModal
          title="Nova Despesa"
          initial={{ data: new Date().toISOString().slice(0, 10), categoria: categorias[0] ?? 'Outro', descricao: '', valor: 0, loja: 'Ambas' }}
          categorias={categorias}
          onSave={(d) => { addDespesa(d); toast('Despesa adicionada.', 'success'); setShowAdd(false); }}
          onClose={() => setShowAdd(false)}
        />
      )}
      {editTarget && (
        <DespesaModal
          title="Editar Despesa"
          initial={{ data: editTarget.data, categoria: editTarget.categoria, descricao: editTarget.descricao, valor: editTarget.valor, loja: editTarget.loja }}
          categorias={categorias}
          onSave={(d) => { updateDespesa(editTarget.id, d); toast('Despesa atualizada.', 'success'); setEditTarget(null); }}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}
