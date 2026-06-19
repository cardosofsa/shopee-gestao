import { useState, useMemo } from 'react';
import { Calculator, TrendingUp, Percent } from 'lucide-react';
import { fmt, fmtPct } from '../utils/calculations';
import { useStore } from '../store';

export default function Calculadora() {
  const configuracoes = useStore((s) => s.configuracoes);
  const produtos = useStore((s) => s.produtos);

  const [custo, setCusto] = useState(6.08);
  const [margemDesejada, setMargemDesejada] = useState(30);
  const [comissaoShopee, setComissaoShopee] = useState(20);
  const [taxaFixa, setTaxaFixa] = useState(0);
  const [percentualAds, setPercentualAds] = useState(configuracoes.percentualMarketing);
  const [aliquotaDAS, setAliquotaDAS] = useState(configuracoes.aliquotaDAS);
  const [skuRef, setSkuRef] = useState('');

  const calc = useMemo(() => {
    const com = comissaoShopee / 100;
    const ads = percentualAds / 100;
    const das = aliquotaDAS / 100;
    const mg = margemDesejada / 100;
    const denom = 1 - com - ads - das - mg;
    if (denom <= 0) return null;

    const preco = (custo + taxaFixa) / denom;
    const taxaShopee = preco * com + taxaFixa;
    const adsVal = preco * ads;
    const dasVal = preco * das;
    const lucro = preco - custo - taxaShopee - adsVal - dasVal;
    const margemReal = lucro / preco;

    return { preco, taxaShopee, adsVal, dasVal, lucro, margemReal, custo };
  }, [custo, margemDesejada, comissaoShopee, taxaFixa, percentualAds, aliquotaDAS]);

  // Simulation for different sale prices
  const simulacao = useMemo(() => {
    if (!calc) return [];
    const precos = [calc.preco * 0.85, calc.preco * 0.90, calc.preco * 0.95, calc.preco, calc.preco * 1.05, calc.preco * 1.10, calc.preco * 1.20];
    return precos.map((p) => {
      const taxa = p * (comissaoShopee / 100) + taxaFixa;
      const ads = p * (percentualAds / 100);
      const das = p * (aliquotaDAS / 100);
      const lucro = p - custo - taxa - ads - das;
      return { preco: p, lucro, margem: (lucro / p) * 100 };
    });
  }, [calc, custo, comissaoShopee, taxaFixa, percentualAds, aliquotaDAS]);

  const loadSku = (sku: string) => {
    const prod = produtos.find((p) => p.sku === sku);
    if (prod) setCusto(prod.custoUnitario);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Calculadora de Precificação</h1>
        <p className="text-slate-500 text-sm">Calcule o preço ideal para maximizar sua margem na Shopee</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="card p-5 space-y-5">
          <h2 className="text-slate-700 font-semibold text-sm flex items-center gap-2"><Calculator size={16} /> Parâmetros</h2>

          {/* SKU Ref */}
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">Carregar custo por SKU (opcional)</label>
            <div className="flex gap-2">
              <select className="select" value={skuRef} onChange={(e) => { setSkuRef(e.target.value); loadSku(e.target.value); }}>
                <option value="">Selecionar SKU…</option>
                {produtos.map((p) => <option key={p.sku} value={p.sku}>{p.sku} — {p.nome} (R${p.custoUnitario.toFixed(2)})</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Custo do Produto (R$)</label>
              <input type="number" step="0.01" min="0" className="input" value={custo} onChange={(e) => setCusto(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Taxa Fixa Shopee (R$)</label>
              <input type="number" step="0.01" min="0" className="input" value={taxaFixa} onChange={(e) => setTaxaFixa(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Comissão Shopee (%)</label>
              <div className="relative">
                <input type="number" step="0.1" min="0" max="100" className="input pr-8" value={comissaoShopee} onChange={(e) => setComissaoShopee(parseFloat(e.target.value) || 0)} />
                <Percent size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Alíquota DAS (%)</label>
              <div className="relative">
                <input type="number" step="0.1" min="0" max="100" className="input pr-8" value={aliquotaDAS} onChange={(e) => setAliquotaDAS(parseFloat(e.target.value) || 0)} />
                <Percent size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Marketing/Ads (%)</label>
              <div className="relative">
                <input type="number" step="0.1" min="0" max="100" className="input pr-8" value={percentualAds} onChange={(e) => setPercentualAds(parseFloat(e.target.value) || 0)} />
                <Percent size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Margem Desejada (%)</label>
              <div className="relative">
                <input type="number" step="1" min="0" max="100" className="input pr-8" value={margemDesejada} onChange={(e) => setMargemDesejada(parseFloat(e.target.value) || 0)} />
                <Percent size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Result */}
        <div className="space-y-4">
          {calc ? (
            <>
              <div className="card p-5 bg-shopee-500 text-white">
                <p className="text-shopee-100 text-sm font-medium mb-2">Preço de Venda Ideal</p>
                <p className="text-5xl font-bold">{fmt(calc.preco)}</p>
                <p className="text-shopee-200 text-sm mt-2">Margem real: {fmtPct(calc.margemReal * 100)}</p>
              </div>

              <div className="card p-5 space-y-3">
                <h3 className="text-slate-700 font-semibold text-sm flex items-center gap-2"><TrendingUp size={15} /> Decomposição do Preço</h3>
                {[
                  { label: 'Custo do Produto', value: calc.custo, color: 'bg-red-400' },
                  { label: `Comissão Shopee (${comissaoShopee}%)`, value: calc.taxaShopee, color: 'bg-orange-400' },
                  { label: `Ads/Marketing (${percentualAds}%)`, value: calc.adsVal, color: 'bg-amber-400' },
                  { label: `DAS/Imposto (${aliquotaDAS}%)`, value: calc.dasVal, color: 'bg-slate-400' },
                  { label: `Lucro Líquido (${fmtPct(calc.margemReal * 100)})`, value: calc.lucro, color: 'bg-emerald-500' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.color}`} />
                    <span className="text-slate-600 text-sm flex-1">{item.label}</span>
                    <span className={`font-medium text-sm ${item.label.includes('Lucro') ? 'text-emerald-600' : 'text-slate-700'}`}>{fmt(item.value)}</span>
                    <span className="text-slate-400 text-xs w-12 text-right">{fmtPct((item.value / calc.preco) * 100)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="card p-8 text-center text-slate-400">
              <Calculator size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Ajuste os parâmetros para calcular o preço ideal.</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabela de simulação */}
      {calc && (
        <div className="card">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-slate-700 font-semibold text-sm">Simulação de Preços</h2>
            <p className="text-slate-400 text-xs mt-0.5">Veja como o lucro muda com diferentes preços de venda</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Preço de Venda</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Lucro Líquido</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Margem</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Indicação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {simulacao.map((s, i) => {
                  const isIdeal = i === 3;
                  return (
                    <tr key={i} className={isIdeal ? 'bg-shopee-50' : 'hover:bg-slate-50'}>
                      <td className={`px-4 py-3 font-medium ${isIdeal ? 'text-shopee-700' : 'text-slate-800'}`}>
                        {fmt(s.preco)} {isIdeal && <span className="text-xs bg-shopee-100 text-shopee-600 px-1.5 py-0.5 rounded ml-2">ideal</span>}
                      </td>
                      <td className={`px-4 py-3 font-medium ${s.lucro >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(s.lucro)}</td>
                      <td className={`px-4 py-3 font-medium ${s.margem >= 30 ? 'text-emerald-600' : s.margem >= 15 ? 'text-amber-500' : 'text-red-500'}`}>{fmtPct(s.margem)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {s.margem >= 30 ? '✅ Excelente' : s.margem >= 20 ? '🟡 Bom' : s.margem >= 10 ? '⚠️ Margem baixa' : '❌ Prejuízo'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
