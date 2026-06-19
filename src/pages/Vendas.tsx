import { useState, useRef, useMemo } from 'react';
import { Upload, Search, Plus, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useStore } from '../store';
import { fmt } from '../utils/calculations';
import type { Pedido, StatusPedido } from '../types';

const STATUS_OPTIONS: StatusPedido[] = ['Em processo', 'Enviado', 'Concluído', 'Devolvido'];

function StatusSelect({ id, current }: { id: string; current: StatusPedido }) {
  const updatePedidoStatus = useStore((s) => s.updatePedidoStatus);
  return (
    <select
      value={current}
      onChange={(e) => updatePedidoStatus(id, e.target.value as StatusPedido)}
      className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-shopee-400 bg-white"
    >
      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}

function AddPedidoModal({ onClose }: { onClose: () => void }) {
  const produtos = useStore((s) => s.produtos);
  const addPedido = useStore((s) => s.addPedido);
  const [form, setForm] = useState({
    numeroPedido: '', data: new Date().toISOString().slice(0, 10),
    status: 'Em processo' as StatusPedido, loja: 'Cardoso e-Shop',
    sku: 'ALF-118', quantidade: 1, multiplicadorKit: 1, receita: 0,
    desconto: 0, taxaShopee: 0, adsMarketing: 0,
  });

  const produto = produtos.find((p) => p.sku === form.sku);
  const custoTotal = (produto?.custoUnitario ?? 0) * form.quantidade * form.multiplicadorKit;
  const lucroOp = form.receita - form.desconto - custoTotal - form.taxaShopee - form.adsMarketing;

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }));

  const save = () => {
    const id = crypto.randomUUID();
    addPedido({
      id, ...form,
      produto: produto?.nome ?? '',
      unidadesEstoque: form.quantidade * form.multiplicadorKit,
      custoTotal, dasImposto: 0, lucroOperacional: lucroOp,
      margemSCustoProduto: custoTotal > 0 ? (lucroOp / custoTotal) * 100 : 0,
      margemSCustoTotal: custoTotal > 0 ? (lucroOp / custoTotal) * 100 : 0,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Novo Pedido</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="text-xs text-slate-500 mb-1 block">Nº Pedido</label><input className="input" value={form.numeroPedido} onChange={f('numeroPedido')} placeholder="260601XXXXXXXX" /></div>
          <div><label className="text-xs text-slate-500 mb-1 block">Data</label><input type="date" className="input" value={form.data} onChange={f('data')} /></div>
          <div><label className="text-xs text-slate-500 mb-1 block">Loja</label>
            <select className="select" value={form.loja} onChange={f('loja')}>
              <option>Cardoso e-Shop</option><option>Projetando</option>
            </select>
          </div>
          <div><label className="text-xs text-slate-500 mb-1 block">SKU</label>
            <select className="select" value={form.sku} onChange={f('sku')}>
              {produtos.map((p) => <option key={p.sku} value={p.sku}>{p.sku} — {p.nome}</option>)}
            </select>
          </div>
          <div><label className="text-xs text-slate-500 mb-1 block">Status</label>
            <select className="select" value={form.status} onChange={f('status')}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div><label className="text-xs text-slate-500 mb-1 block">Qtd. Pedido</label><input type="number" min={1} className="input" value={form.quantidade} onChange={f('quantidade')} /></div>
          <div><label className="text-xs text-slate-500 mb-1 block">Mult. Kit (unid./pedido)</label><input type="number" min={1} className="input" value={form.multiplicadorKit} onChange={f('multiplicadorKit')} /></div>
          <div><label className="text-xs text-slate-500 mb-1 block">Receita (R$)</label><input type="number" step="0.01" className="input" value={form.receita} onChange={f('receita')} /></div>
          <div><label className="text-xs text-slate-500 mb-1 block">Desconto (R$)</label><input type="number" step="0.01" className="input" value={form.desconto} onChange={f('desconto')} /></div>
          <div><label className="text-xs text-slate-500 mb-1 block">Taxa Shopee (R$)</label><input type="number" step="0.01" className="input" value={form.taxaShopee} onChange={f('taxaShopee')} /></div>
          <div><label className="text-xs text-slate-500 mb-1 block">ADS (R$)</label><input type="number" step="0.01" className="input" value={form.adsMarketing} onChange={f('adsMarketing')} /></div>
          <div className="col-span-2 bg-slate-50 rounded-lg p-3 text-sm">
            <span className="text-slate-500">Custo Total: </span><span className="font-medium">{fmt(custoTotal)}</span>
            <span className="ml-4 text-slate-500">Lucro Op.: </span>
            <span className={`font-medium ${lucroOp >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(lucroOp)}</span>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={save}>Salvar Pedido</button>
        </div>
      </div>
    </div>
  );
}

export default function Vendas() {
  const pedidos = useStore((s) => s.pedidos);
  const deletePedido = useStore((s) => s.deletePedido);
  const addPedidos = useStore((s) => s.addPedidos);
  const produtos = useStore((s) => s.produtos);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterLoja, setFilterLoja] = useState('Todas');
  const [filterMes, setFilterMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [showAdd, setShowAdd] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const mesesDisponiveis = useMemo(() => {
    const set = new Set(pedidos.map((p) => p.data.slice(0, 7)));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [pedidos]);

  const filtrados = useMemo(() => {
    return pedidos
      .filter((p) => {
        const matchMes = filterMes === 'todos' || p.data.startsWith(filterMes);
        const matchSearch = !search || p.numeroPedido.toLowerCase().includes(search.toLowerCase()) || p.produto.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === 'Todos' || p.status === filterStatus;
        const matchLoja = filterLoja === 'Todas' || p.loja === filterLoja;
        return matchMes && matchSearch && matchStatus && matchLoja;
      })
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [pedidos, search, filterStatus, filterLoja, filterMes]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (rows.length === 0) { alert('Arquivo vazio.'); e.target.value = ''; return; }

    // Detecta export nativo da Shopee
    const isShopeeNativo = 'ID do pedido' in rows[0] || 'Número de referência SKU' in rows[0];

    const mapearSKU = (s: string): { sku: string; kit: number } => {
      if (s.includes('FITA-BIKE-KIT3')) return { sku: 'FITA-BIKE', kit: 3 };
      if (s.includes('FITA-BIKE-KIT2')) return { sku: 'FITA-BIKE', kit: 2 };
      if (s.includes('FITA-BIKE') || s.includes('BIKE-UN')) return { sku: 'FITA-BIKE', kit: 1 };
      if (s.includes('FITA-MOTO') || s.includes('MOTO-UN')) return { sku: 'FITA-MOTO', kit: 1 };
      if (s.includes('FITA-PCX') || s.includes('PCX-UN')) return { sku: 'FITA-PCX', kit: 1 };
      if (s.includes('BAINHAC') || s.toLowerCase().includes('bainha')) return { sku: 'BAINHAC', kit: 1 };
      if (s.includes('CANMAD')) return { sku: 'CANMAD', kit: 1 };
      if (s.includes('ALF-500')) return { sku: 'ALF-500', kit: 1 };
      if (s.includes('ALF-118') || s.toLowerCase().includes('alfazema')) return { sku: 'ALF-118', kit: 1 };
      return { sku: s, kit: 1 };
    };

    const mapearStatus = (s: string): StatusPedido => {
      const l = s.toLowerCase();
      if (l.includes('cancelado')) return 'Devolvido';
      if (l.includes('a enviar') || l.includes('para entregar')) return 'Em processo';
      if (l.includes('enviado')) return 'Enviado';
      return 'Concluído'; // entregue, concluído, devolução pendente
    };

    const novos: Pedido[] = rows
      .filter((r) => {
        if (isShopeeNativo) return !!(r['ID do pedido']);
        return !!(r['Nº Pedido'] || r['numeroPedido']);
      })
      .map((r, i): Pedido => {
        if (isShopeeNativo) {
          const skuRaw = String(r['Número de referência SKU'] || r['SKU'] || '');
          const nomeRaw = String(r['Nome do Produto'] || '');
          const { sku, kit } = mapearSKU(skuRaw || nomeRaw);
          const prod = produtos.find((p) => p.sku === sku);
          const qtd = Math.max(1, parseInt(String(r['Quantidade'] || 1)) || 1);
          const unidades = qtd * kit;
          const receita = parseFloat(String(r['Preço original'] || 0)) || 0;
          const desconto = parseFloat(String(r['Desconto do vendedor'] || 0)) || 0;
          const receitaLiq = receita - desconto;
          const custo = (prod?.custoUnitario ?? 0) * unidades;
          const taxa = receitaLiq * 0.20;
          const ads = receitaLiq * 0.02;
          const lucro = receitaLiq - custo - taxa - ads;
          const dataRaw = String(r['Hora do pagamento do pedido'] || '').slice(0, 10);
          const data = /^\d{4}-\d{2}-\d{2}$/.test(dataRaw) ? dataRaw : new Date().toISOString().slice(0, 10);
          return {
            id: crypto.randomUUID(),
            numeroPedido: String(r['ID do pedido'] || `IMP-${i}`),
            data, status: mapearStatus(String(r['Status do pedido'] || '')),
            loja: 'Projetando', sku,
            produto: prod?.nome || nomeRaw.slice(0, 60),
            quantidade: qtd, multiplicadorKit: kit, unidadesEstoque: unidades,
            receita, desconto, custoTotal: custo, taxaShopee: taxa, dasImposto: 0, adsMarketing: ads,
            lucroOperacional: lucro,
            margemSCustoProduto: custo > 0 ? (lucro / custo) * 100 : 0,
            margemSCustoTotal: receita > 0 ? (lucro / receita) * 100 : 0,
          };
        }
        // Formato planilha interna
        const sku = String(r['SKU'] || r['sku'] || '');
        const prod = produtos.find((p) => p.sku === sku);
        const receita = parseFloat(String(r['Receita (R$)'] || r['receita'] || 0)) || 0;
        const desconto = parseFloat(String(r['Desconto(R$)'] || r['desconto'] || 0)) || 0;
        const custo = parseFloat(String(r['CustoTotal'] || r['custo_total'] || prod?.custoUnitario || 0)) || 0;
        const taxa = parseFloat(String(r['Taxa Shopee'] || r['taxa_shopee'] || 0)) || 0;
        const ads = parseFloat(String(r['ADS'] || r['ads'] || 0)) || 0;
        const lucro = receita - desconto - custo - taxa - ads;
        return {
          id: crypto.randomUUID(),
          numeroPedido: String(r['Nº Pedido'] || r['numeroPedido'] || `IMP-${i}`),
          data: String(r['Data'] || r['data'] || new Date().toISOString().slice(0, 10)),
          status: (r['Status'] || r['status'] || 'Concluído') as StatusPedido,
          loja: String(r['Loja'] || r['loja'] || 'Cardoso e-Shop'),
          sku, produto: String(r['Produto'] || r['produto'] || prod?.nome || ''),
          quantidade: parseInt(String(r['Qtd.'] || r['quantidade'] || 1)) || 1,
          multiplicadorKit: parseInt(String(r['Mult. Kit'] || r['multiplicador_kit'] || 1)) || 1,
          unidadesEstoque: parseInt(String(r['Unid. Estoque'] || r['unidades_estoque'] || 1)) || 1,
          receita, desconto, custoTotal: custo, taxaShopee: taxa, dasImposto: 0, adsMarketing: ads,
          lucroOperacional: lucro,
          margemSCustoProduto: custo > 0 ? (lucro / custo) * 100 : 0,
          margemSCustoTotal: custo > 0 ? (lucro / custo) * 100 : 0,
        };
      });

    if (novos.length > 0) {
      addPedidos(novos);
      alert(`${novos.length} pedidos importados com sucesso!`);
    } else {
      alert('Nenhum pedido válido encontrado. Verifique o arquivo.');
    }
    e.target.value = '';
  };

  const totais = useMemo(() => ({
    receita: filtrados.reduce((s, p) => s + p.receita, 0),
    lucro: filtrados.reduce((s, p) => s + p.lucroOperacional, 0),
    pedidos: filtrados.length,
  }), [filtrados]);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Vendas</h1>
          <p className="text-slate-500 text-sm">{pedidos.length} pedidos no total</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
          <button className="btn-secondary" onClick={() => fileRef.current?.click()}>
            <Upload size={15} /> Importar XLSX/CSV
          </button>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={15} /> Novo Pedido
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-8" placeholder="Buscar pedido, SKU ou produto…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select w-auto" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="Todos">Todos os status</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="select w-auto" value={filterLoja} onChange={(e) => setFilterLoja(e.target.value)}>
          <option value="Todas">Todas as lojas</option>
          <option>Cardoso e-Shop</option>
          <option>Projetando</option>
        </select>
        <select className="select w-auto" value={filterMes} onChange={(e) => setFilterMes(e.target.value)}>
          <option value="todos">Todos os meses</option>
          {mesesDisponiveis.map((m) => (
            <option key={m} value={m}>{new Date(m + '-02').toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</option>
          ))}
        </select>
      </div>

      {/* Totais */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-slate-500 text-xs mb-1">Pedidos filtrados</p>
          <p className="text-slate-900 font-bold text-xl">{totais.pedidos}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-slate-500 text-xs mb-1">Receita</p>
          <p className="text-shopee-600 font-bold text-xl">{fmt(totais.receita)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-slate-500 text-xs mb-1">Lucro Operacional</p>
          <p className="text-emerald-600 font-bold text-xl">{fmt(totais.lucro)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Data', 'Nº Pedido', 'Status', 'Loja', 'SKU', 'Produto', 'Unid.', 'Receita', 'Desconto', 'Custo', 'Taxa', 'ADS', 'Lucro Op.', 'Margem', ''].map((h) => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtrados.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{p.data.slice(0, 10)}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-600 whitespace-nowrap">{p.numeroPedido}</td>
                  <td className="px-3 py-2.5"><StatusSelect id={p.id} current={p.status} /></td>
                  <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{p.loja}</td>
                  <td className="px-3 py-2.5 font-mono text-xs font-medium text-slate-700">{p.sku}</td>
                  <td className="px-3 py-2.5 text-slate-800 whitespace-nowrap">{p.produto}</td>
                  <td className="px-3 py-2.5 text-slate-600 text-center">{p.unidadesEstoque}</td>
                  <td className="px-3 py-2.5 text-slate-800 font-medium whitespace-nowrap">{fmt(p.receita)}</td>
                  <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{p.desconto > 0 ? fmt(p.desconto) : '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{fmt(p.custoTotal)}</td>
                  <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{fmt(p.taxaShopee)}</td>
                  <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{fmt(p.adsMarketing)}</td>
                  <td className={`px-3 py-2.5 font-medium whitespace-nowrap ${p.lucroOperacional >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(p.lucroOperacional)}</td>
                  <td className={`px-3 py-2.5 whitespace-nowrap ${p.margemSCustoTotal >= 30 ? 'text-emerald-600' : p.margemSCustoTotal >= 0 ? 'text-amber-600' : 'text-red-500'}`}>
                    {p.margemSCustoTotal.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => deletePedido(p.id)} className="text-slate-300 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtrados.length === 0 && (
            <div className="text-center py-12 text-slate-400">Nenhum pedido encontrado.</div>
          )}
        </div>
      </div>

      {showAdd && <AddPedidoModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
