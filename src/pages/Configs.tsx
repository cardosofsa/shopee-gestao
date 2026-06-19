import { useState } from 'react';
import { Plus, Trash2, RotateCcw, Save } from 'lucide-react';
import { useStore } from '../store';
import { fmt } from '../utils/calculations';
import type { Produto } from '../types';

export default function Configs() {
  const produtos = useStore((s) => s.produtos);
  const configuracoes = useStore((s) => s.configuracoes);
  const addProduto = useStore((s) => s.addProduto);
  const updateProduto = useStore((s) => s.updateProduto);
  const deleteProduto = useStore((s) => s.deleteProduto);
  const updateConfiguracoes = useStore((s) => s.updateConfiguracoes);
  const resetToSeed = useStore((s) => s.resetToSeed);

  const [cfg, setCfg] = useState(configuracoes);
  const [showAdd, setShowAdd] = useState(false);
  const [newProd, setNewProd] = useState<Partial<Produto>>({
    sku: '', nome: '', categoria: 'Perfumaria', loja: 'Cardoso e-Shop',
    custoUnitario: 0, estoqueSeguranca: 10, estoqueAtual: 0, ativo: true,
  });

  const saveCfg = () => {
    updateConfiguracoes(cfg);
    alert('Configurações salvas!');
  };

  const addProd = () => {
    if (!newProd.sku || !newProd.nome) return alert('Preencha SKU e Nome.');
    addProduto(newProd as Produto);
    setNewProd({ sku: '', nome: '', categoria: 'Perfumaria', loja: 'Cardoso e-Shop', custoUnitario: 0, estoqueSeguranca: 10, estoqueAtual: 0, ativo: true });
    setShowAdd(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-500 text-sm">Base de dados e premissas gerais</p>
      </div>

      {/* Premissas */}
      <div className="card p-5 space-y-4">
        <h2 className="text-slate-700 font-semibold text-sm">Premissas Gerais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">Alíquota DAS / Simples (%)</label>
            <input type="number" step="0.1" min="0" max="20" className="input"
              value={cfg.aliquotaDAS}
              onChange={(e) => setCfg((p) => ({ ...p, aliquotaDAS: parseFloat(e.target.value) || 0 }))}
            />
            <p className="text-slate-400 text-xs mt-1">MEI: deixe 0% (DAS fixo, lance em Despesas). ME/EPP: alíquota do Simples.</p>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">Marketing / Ads (% sobre receita)</label>
            <input type="number" step="0.1" min="0" max="20" className="input"
              value={cfg.percentualMarketing}
              onChange={(e) => setCfg((p) => ({ ...p, percentualMarketing: parseFloat(e.target.value) || 0 }))}
            />
            <p className="text-slate-400 text-xs mt-1">Provisão aplicada sobre toda venda.</p>
          </div>
        </div>
        <button className="btn-primary w-fit" onClick={saveCfg}>
          <Save size={14} /> Salvar Configurações
        </button>
      </div>

      {/* Simples Nacional Reference */}
      <div className="card p-5">
        <h2 className="text-slate-700 font-semibold text-sm mb-3">Simples Nacional — Anexo I (referência)</h2>
        <table className="text-sm w-full max-w-lg">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="py-2 text-left text-xs text-slate-500 font-medium">Faixa</th>
              <th className="py-2 text-left text-xs text-slate-500 font-medium">Rec. 12m (De)</th>
              <th className="py-2 text-left text-xs text-slate-500 font-medium">Rec. 12m (Até)</th>
              <th className="py-2 text-left text-xs text-slate-500 font-medium">Alíquota Nominal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {[
              { faixa: '1ª', de: 0, ate: 180000, aliq: '4,0%' },
              { faixa: '2ª', de: 180000, ate: 360000, aliq: '7,3%' },
              { faixa: '3ª', de: 360000, ate: 720000, aliq: '9,5%' },
              { faixa: '4ª', de: 720000, ate: 1800000, aliq: '10,7%' },
            ].map((r) => (
              <tr key={r.faixa} className="hover:bg-slate-50">
                <td className="py-2 text-slate-600 font-medium">{r.faixa}</td>
                <td className="py-2 text-slate-500">{fmt(r.de)}</td>
                <td className="py-2 text-slate-500">{fmt(r.ate)}</td>
                <td className="py-2 text-shopee-600 font-medium">{r.aliq}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SKU Cadastro */}
      <div className="card">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-slate-700 font-semibold text-sm">Cadastro de SKUs</h2>
          <button className="btn-primary" onClick={() => setShowAdd(!showAdd)}>
            <Plus size={14} /> Novo SKU
          </button>
        </div>

        {showAdd && (
          <div className="p-5 border-b border-slate-100 bg-slate-50">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div><label className="text-xs text-slate-500 mb-1 block">SKU *</label><input className="input" value={newProd.sku} onChange={(e) => setNewProd((p) => ({ ...p, sku: e.target.value }))} /></div>
              <div className="lg:col-span-2"><label className="text-xs text-slate-500 mb-1 block">Nome *</label><input className="input" value={newProd.nome} onChange={(e) => setNewProd((p) => ({ ...p, nome: e.target.value }))} /></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Categoria</label>
                <select className="select" value={newProd.categoria} onChange={(e) => setNewProd((p) => ({ ...p, categoria: e.target.value }))}>
                  <option>Perfumaria</option><option>Moto/Bike</option><option>Eletrônico</option><option>Acessórios</option><option>Kit/Combo</option>
                </select>
              </div>
              <div><label className="text-xs text-slate-500 mb-1 block">Loja</label>
                <select className="select" value={newProd.loja} onChange={(e) => setNewProd((p) => ({ ...p, loja: e.target.value as Produto['loja'] }))}>
                  <option>Cardoso e-Shop</option><option>Projetando</option><option>Ambas</option>
                </select>
              </div>
              <div><label className="text-xs text-slate-500 mb-1 block">Custo Unit. (R$)</label><input type="number" step="0.01" className="input" value={newProd.custoUnitario} onChange={(e) => setNewProd((p) => ({ ...p, custoUnitario: parseFloat(e.target.value) || 0 }))} /></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Estoque Inicial</label><input type="number" className="input" value={newProd.estoqueAtual} onChange={(e) => setNewProd((p) => ({ ...p, estoqueAtual: parseInt(e.target.value) || 0 }))} /></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Est. Segurança</label><input type="number" className="input" value={newProd.estoqueSeguranca} onChange={(e) => setNewProd((p) => ({ ...p, estoqueSeguranca: parseInt(e.target.value) || 0 }))} /></div>
            </div>
            <div className="flex gap-2 mt-3">
              <button className="btn-primary" onClick={addProd}>Salvar SKU</button>
              <button className="btn-secondary" onClick={() => setShowAdd(false)}>Cancelar</button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['SKU', 'Nome', 'Categoria', 'Loja', 'Custo Unit.', 'Est. Segurança', 'Est. Atual', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {produtos.map((p) => (
                <tr key={p.sku} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">{p.sku}</td>
                  <td className="px-4 py-3 text-slate-800 font-medium">{p.nome}</td>
                  <td className="px-4 py-3 text-slate-500">{p.categoria}</td>
                  <td className="px-4 py-3 text-slate-500">{p.loja}</td>
                  <td className="px-4 py-3">
                    <input type="number" step="0.01" className="input w-24 py-1 text-xs" value={p.custoUnitario}
                      onChange={(e) => updateProduto(p.sku, { custoUnitario: parseFloat(e.target.value) || 0 })} />
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" className="input w-20 py-1 text-xs" value={p.estoqueSeguranca}
                      onChange={(e) => updateProduto(p.sku, { estoqueSeguranca: parseInt(e.target.value) || 0 })} />
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900">{p.estoqueAtual}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => { if (confirm(`Excluir ${p.sku}?`)) deleteProduto(p.sku); }}
                      className="text-slate-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card p-5 border-red-100">
        <h2 className="text-red-600 font-semibold text-sm mb-2">Zona de Perigo</h2>
        <p className="text-slate-500 text-xs mb-3">Restaurar todos os dados para o estado inicial da planilha original.</p>
        <button
          onClick={() => { if (confirm('Tem certeza? Todos os dados adicionados serão perdidos.')) resetToSeed(); }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
        >
          <RotateCcw size={14} /> Restaurar dados da planilha
        </button>
      </div>
    </div>
  );
}
