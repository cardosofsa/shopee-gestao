import { useState, useMemo } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, Receipt } from 'lucide-react';
import { useStore } from '../store';
import { fmt } from '../utils/calculations';
import type { CategoriaDespesa, Despesa } from '../types';

const CATEGORIAS: CategoriaDespesa[] = ['Embalagem', 'Combustível', 'Insumos', 'Mercadoria', 'Marketing', 'Outro'];

const CATEGORIA_COLOR: Record<CategoriaDespesa, string> = {
  Embalagem: 'bg-blue-100 text-blue-700',
  Combustível: 'bg-amber-100 text-amber-700',
  Insumos: 'bg-purple-100 text-purple-700',
  Mercadoria: 'bg-emerald-100 text-emerald-700',
  Marketing: 'bg-shopee-100 text-shopee-700',
  Outro: 'bg-slate-100 text-slate-600',
};

function AddDespesaModal({ onClose }: { onClose: () => void }) {
  const addDespesa = useStore((s) => s.addDespesa);
  const [form, setForm] = useState<Omit<Despesa, 'id'>>({
    data: new Date().toISOString().slice(0, 10),
    categoria: 'Embalagem',
    descricao: '',
    valor: 0,
    loja: 'Ambas',
  });

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }));

  const save = () => {
    if (!form.descricao || form.valor <= 0) return;
    addDespesa(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Nova Despesa</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Data</label>
              <input type="date" className="input" value={form.data} onChange={f('data')} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Valor (R$)</label>
              <input type="number" step="0.01" min="0" className="input" value={form.valor || ''} onChange={f('valor')} />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Categoria</label>
            <select className="select" value={form.categoria} onChange={f('categoria')}>
              {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Descrição</label>
            <input className="input" placeholder="Ex: Caixas de papelão 20x20cm" value={form.descricao} onChange={f('descricao')} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Loja</label>
            <select className="select" value={form.loja} onChange={f('loja')}>
              <option value="Ambas">Ambas</option>
              <option>Cardoso e-Shop</option>
              <option>Projetando</option>
            </select>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
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
  const despesas = useStore((s) => s.despesas);
  const deleteDespesa = useStore((s) => s.deleteDespesa);
  const [showAdd, setShowAdd] = useState(false);
  const [mesFiltro, setMesFiltro] = useState(() => new Date().toISOString().slice(0, 7));
  const [filterCat, setFilterCat] = useState<CategoriaDespesa | 'Todas'>('Todas');

  const mesAtual = new Date().toISOString().slice(0, 7);
  const isCurrentMonth = mesFiltro === mesAtual;
  const mesLabel = new Date(mesFiltro + '-02').toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

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

  const filtradas = useMemo(
    () => doMes.filter((d) => filterCat === 'Todas' || d.categoria === filterCat).sort((a, b) => b.data.localeCompare(a.data)),
    [doMes, filterCat]
  );

  const totalMes = doMes.reduce((s, d) => s + d.valor, 0);

  const porCategoria = useMemo(() => {
    const map = new Map<CategoriaDespesa, number>();
    for (const d of doMes) map.set(d.categoria, (map.get(d.categoria) ?? 0) + d.valor);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [doMes]);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Despesas</h1>
          <p className="text-slate-500 text-sm">Custos operacionais e compras</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
            <button onClick={prevMonth} className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors">
              <ChevronLeft size={15} />
            </button>
            <span className="text-sm font-medium text-slate-700 capitalize px-1 min-w-32 text-center">{mesLabel}</span>
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
        <div className="card p-4 col-span-2 md:col-span-1 lg:col-span-2">
          <p className="text-slate-500 text-xs mb-1">Total do Mês</p>
          <p className="text-red-500 font-bold text-2xl">{fmt(totalMes)}</p>
          <p className="text-slate-400 text-xs mt-0.5">{doMes.length} lançamentos</p>
        </div>
        {porCategoria.slice(0, 4).map(([cat, val]) => (
          <div key={cat} className="card p-4">
            <p className="text-slate-500 text-xs mb-1">{cat}</p>
            <p className="text-slate-800 font-bold text-lg">{fmt(val)}</p>
            <p className="text-slate-400 text-xs mt-0.5">{totalMes > 0 ? ((val / totalMes) * 100).toFixed(0) : 0}%</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="card p-4 flex flex-wrap gap-2 items-center">
        <span className="text-xs text-slate-500 font-medium">Categoria:</span>
        {(['Todas', ...CATEGORIAS] as const).map((c) => (
          <button
            key={c}
            onClick={() => setFilterCat(c as CategoriaDespesa | 'Todas')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterCat === c
                ? 'bg-shopee-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Data', 'Categoria', 'Descrição', 'Loja', 'Valor', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <Receipt size={32} className="text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-300 text-sm">Nenhuma despesa neste período.</p>
                    <p className="text-slate-300 text-xs mt-1">Compras de mercadoria aparecem aqui automaticamente.</p>
                  </td>
                </tr>
              ) : filtradas.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{d.data.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CATEGORIA_COLOR[d.categoria]}`}>
                      {d.categoria}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-800">{d.descricao}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{d.loja}</td>
                  <td className="px-4 py-3 text-red-500 font-medium whitespace-nowrap">{fmt(d.valor)}</td>
                  <td className="px-4 py-3">
                    {!d.compraRef && (
                      <button onClick={() => deleteDespesa(d.id)} className="text-slate-300 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                    {d.compraRef && (
                      <span className="text-xs text-slate-300 italic">via Estoque</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {filtradas.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200 font-semibold">
                  <td colSpan={4} className="px-4 py-3 text-slate-700">TOTAL FILTRADO</td>
                  <td className="px-4 py-3 text-red-500">{fmt(filtradas.reduce((s, d) => s + d.valor, 0))}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {showAdd && <AddDespesaModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
