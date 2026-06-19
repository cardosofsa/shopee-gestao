import { useState, useMemo } from 'react';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { useStore } from '../store';
import { fmt, getStatusEstoque } from '../utils/calculations';

function AddCompraModal({ onClose }: { onClose: () => void }) {
  const produtos = useStore((s) => s.produtos);
  const addCompra = useStore((s) => s.addCompra);
  const [form, setForm] = useState({
    sku: 'ALF-118', data: new Date().toISOString().slice(0, 10),
    quantidadeEntrada: 1, custoUnitario: 0,
    fornecedor: '', nfRef: '', pagamento: 'Pix',
    parcelas: 1, loja: 'Cardoso e-Shop', observacoes: '',
  });

  const prod = produtos.find((p) => p.sku === form.sku);
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }));

  const custoTotal = form.quantidadeEntrada * form.custoUnitario;

  const save = () => {
    const id = crypto.randomUUID();
    addCompra({
      id, ...form,
      produto: prod?.nome ?? '',
      custoTotal,
      valorParcela: custoTotal / form.parcelas,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Registrar Compra</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">SKU</label>
            <select className="select" value={form.sku} onChange={f('sku')}>
              {produtos.map((p) => <option key={p.sku} value={p.sku}>{p.sku} — {p.nome}</option>)}
            </select>
          </div>
          <div><label className="text-xs text-slate-500 mb-1 block">Data</label><input type="date" className="input" value={form.data} onChange={f('data')} /></div>
          <div><label className="text-xs text-slate-500 mb-1 block">Qtd. Entrada</label><input type="number" min={1} className="input" value={form.quantidadeEntrada} onChange={f('quantidadeEntrada')} /></div>
          <div><label className="text-xs text-slate-500 mb-1 block">Custo Unit. (R$)</label><input type="number" step="0.01" className="input" value={form.custoUnitario} onChange={f('custoUnitario')} /></div>
          <div><label className="text-xs text-slate-500 mb-1 block">Fornecedor</label><input className="input" value={form.fornecedor} onChange={f('fornecedor')} /></div>
          <div><label className="text-xs text-slate-500 mb-1 block">NF / Ref.</label><input className="input" value={form.nfRef} onChange={f('nfRef')} /></div>
          <div><label className="text-xs text-slate-500 mb-1 block">Pagamento</label>
            <select className="select" value={form.pagamento} onChange={f('pagamento')}>
              <option>Pix</option><option>Boleto</option><option>Cartão</option><option>Dinheiro</option>
            </select>
          </div>
          <div><label className="text-xs text-slate-500 mb-1 block">Parcelas</label><input type="number" min={1} className="input" value={form.parcelas} onChange={f('parcelas')} /></div>
          <div className="col-span-2"><label className="text-xs text-slate-500 mb-1 block">Observações</label><textarea className="input" rows={2} value={form.observacoes} onChange={f('observacoes')} /></div>
          <div className="col-span-2 bg-slate-50 rounded-lg p-3 text-sm">
            <span className="text-slate-500">Custo Total: </span><span className="font-bold text-slate-800">{fmt(custoTotal)}</span>
            {form.parcelas > 1 && <span className="text-slate-400 ml-3">{form.parcelas}x de {fmt(custoTotal / form.parcelas)}</span>}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={save}>Salvar Compra</button>
        </div>
      </div>
    </div>
  );
}

export default function Estoque() {
  const produtos = useStore((s) => s.produtos);
  const pedidos = useStore((s) => s.pedidos);
  const compras = useStore((s) => s.compras);
  const deleteCompra = useStore((s) => s.deleteCompra);
  const [showAdd, setShowAdd] = useState(false);
  const [tab, setTab] = useState<'posicao' | 'compras'>('posicao');

  const estoqueData = useMemo(() => {
    const limite30d = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    return produtos.map((p) => {
      const vendas = pedidos.filter((o) =>
        o.sku === p.sku &&
        (o.status === 'Concluído' || o.status === 'Enviado') &&
        o.data >= limite30d
      );
      const totalUnidades = vendas.reduce((s, o) => s + o.unidadesEstoque, 0);
      const vendaDia = totalUnidades / 30;
      const diasCobertura = vendaDia > 0 ? Math.round(p.estoqueAtual / vendaDia) : Infinity;
      const ptReposicao = Math.ceil(vendaDia * 14);
      const status = getStatusEstoque(p.estoqueAtual, vendaDia, p.estoqueSeguranca);
      const valorEstoque = p.estoqueAtual * p.custoUnitario;
      const entradas = compras.filter((c) => c.sku === p.sku).reduce((s, c) => s + c.quantidadeEntrada, 0);
      return { ...p, vendaDia, diasCobertura, ptReposicao, status, valorEstoque, entradas, saidas: totalUnidades };
    });
  }, [produtos, pedidos, compras]);

  const totalEstoque = estoqueData.reduce((s, p) => s + p.valorEstoque, 0);
  const rupturas = estoqueData.filter((p) => p.status === 'Ruptura').length;
  const criticos = estoqueData.filter((p) => p.status === 'Crítico').length;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Estoque</h1>
          <p className="text-slate-500 text-sm">Posição em tempo real</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={15} /> Registrar Compra
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4"><p className="text-slate-500 text-xs mb-1">Valor em Estoque</p><p className="text-slate-900 font-bold text-xl">{fmt(totalEstoque)}</p></div>
        <div className="card p-4"><p className="text-slate-500 text-xs mb-1">SKUs Ativos</p><p className="text-slate-900 font-bold text-xl">{produtos.length}</p></div>
        <div className="card p-4"><p className="text-amber-600 text-xs mb-1 flex items-center gap-1"><AlertTriangle size={12} /> Crítico</p><p className="text-amber-600 font-bold text-xl">{criticos}</p></div>
        <div className="card p-4"><p className="text-red-600 text-xs mb-1 flex items-center gap-1"><AlertTriangle size={12} /> Ruptura</p><p className="text-red-600 font-bold text-xl">{rupturas}</p></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {(['posicao', 'compras'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t === 'posicao' ? 'Posição Atual' : 'Registro de Compras'}
          </button>
        ))}
      </div>

      {tab === 'posicao' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['SKU', 'Produto', 'Inicial', 'Entradas', 'Saídas', 'Atual', 'Custo Unit.', 'Valor Est.', 'Venda/Dia', 'Dias Cobertura', 'Pt. Reposição', 'Status'].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {estoqueData.map((p) => (
                  <tr key={p.sku} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 font-mono text-xs font-medium text-slate-700">{p.sku}</td>
                    <td className="px-3 py-3 text-slate-800 font-medium whitespace-nowrap">{p.nome}</td>
                    <td className="px-3 py-3 text-slate-600">—</td>
                    <td className="px-3 py-3 text-emerald-600 font-medium">{p.entradas}</td>
                    <td className="px-3 py-3 text-red-500">{p.saidas}</td>
                    <td className="px-3 py-3 font-bold text-slate-900">{p.estoqueAtual}</td>
                    <td className="px-3 py-3 text-slate-600">{fmt(p.custoUnitario)}</td>
                    <td className="px-3 py-3 text-slate-700 font-medium">{fmt(p.valorEstoque)}</td>
                    <td className="px-3 py-3 text-slate-600">{p.vendaDia.toFixed(2)}</td>
                    <td className="px-3 py-3 text-slate-600">{isFinite(p.diasCobertura) ? `${p.diasCobertura}d` : '∞'}</td>
                    <td className="px-3 py-3 text-slate-600">{p.ptReposicao}</td>
                    <td className="px-3 py-3">
                      <span className={
                        p.status === 'OK' ? 'badge-ok' :
                        p.status === 'Crítico' ? 'badge-critico' :
                        p.status === 'Excesso' ? 'badge-excesso' : 'badge-ruptura'
                      }>{p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'compras' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['SKU', 'Produto', 'Data', 'Qtd.', 'Custo Unit.', 'Custo Total', 'Fornecedor', 'NF/Ref.', 'Pagamento', 'Parcelas', 'Valor Parcela', ''].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {compras.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 font-mono text-xs font-medium text-slate-700">{c.sku}</td>
                    <td className="px-3 py-3 text-slate-800 whitespace-nowrap">{c.produto}</td>
                    <td className="px-3 py-3 text-slate-500 whitespace-nowrap">{c.data}</td>
                    <td className="px-3 py-3 text-emerald-600 font-medium">{c.quantidadeEntrada}</td>
                    <td className="px-3 py-3 text-slate-600">{fmt(c.custoUnitario)}</td>
                    <td className="px-3 py-3 text-slate-800 font-medium">{fmt(c.custoTotal)}</td>
                    <td className="px-3 py-3 text-slate-600">{c.fornecedor}</td>
                    <td className="px-3 py-3 text-slate-500">{c.nfRef}</td>
                    <td className="px-3 py-3 text-slate-600">{c.pagamento}</td>
                    <td className="px-3 py-3 text-slate-600">{c.parcelas}</td>
                    <td className="px-3 py-3 text-slate-600">{fmt(c.valorParcela)}</td>
                    <td className="px-3 py-3">
                      <button onClick={() => deleteCompra(c.id)} className="text-slate-300 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200 font-semibold">
                  <td colSpan={5} className="px-3 py-3 text-slate-700">TOTAL COMPRAS</td>
                  <td className="px-3 py-3 text-slate-900">{fmt(compras.reduce((s, c) => s + c.custoTotal, 0))}</td>
                  <td colSpan={6} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {showAdd && <AddCompraModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
