import { useState, useMemo, useEffect } from 'react';
import {
  Plus, Trash2, Pencil,
  X, SlidersHorizontal, Download,
} from 'lucide-react';
import { exportXlsx, xlsxNum } from '../../../utils/exportXlsx';
import { useStore } from '../../../store';
import { fmt, getStatusEstoque } from '../../../utils/calculations';
import type { PrioridadeTarefa, AjusteEstoque, Compra } from '../../../types';
import { useToast } from '../../../components/Toast';
import { PosicaoTab } from '../components/PosicaoTab';
import type { EstoqueItem } from '../components/PosicaoTab';
import { ComprasTab } from '../components/ComprasTab';
import { MovimentacoesTab } from '../components/MovimentacoesTab';

// ─── ConfirmDeleteModal ───────────────────────────────────────────────────────

function ConfirmDeleteModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-5 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Trash2 size={20} className="text-red-500" />
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Excluir esta compra?</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">O estoque do SKU será revertido automaticamente.</p>
        </div>
        <div className="px-6 pb-5 flex gap-3">
          <button className="btn-secondary flex-1 justify-center" onClick={onCancel}>Cancelar</button>
          <button className="btn-danger flex-1 justify-center" onClick={onConfirm}>Excluir</button>
        </div>
      </div>
    </div>
  );
}

// ─── AjusteModal ─────────────────────────────────────────────────────────────

function AjusteModal({ onClose }: { onClose: () => void }) {
  const toast         = useToast();
  const produtos      = useStore((s) => s.produtos);
  const updateEstoque = useStore((s) => s.updateEstoque);
  const addAjuste     = useStore((s) => s.addAjuste);

  const [form, setForm] = useState({
    sku:       produtos[0]?.sku ?? '',
    tipo:      'entrada' as 'entrada' | 'saida',
    quantidade: 1,
    motivo:    '',
  });

  const prod              = produtos.find((p) => p.sku === form.sku);
  const delta             = form.tipo === 'entrada' ? form.quantidade : -form.quantidade;
  const estoqueAtual      = prod?.estoqueAtual ?? 0;
  const estoqueResultante = Math.max(0, estoqueAtual + delta);

  const save = () => {
    updateEstoque(form.sku, delta);
    const ajuste: AjusteEstoque = {
      id: crypto.randomUUID(),
      sku: form.sku, produto: prod?.nome ?? '', tipo: form.tipo,
      quantidade: form.quantidade, estoqueAntes: estoqueAtual,
      estoqueDepois: estoqueResultante, motivo: form.motivo,
      criadoEm: new Date().toISOString(),
    };
    addAjuste(ajuste);
    toast(`${form.sku}: ${estoqueAtual} → ${estoqueResultante} un.`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Ajuste Manual de Estoque</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">SKU</label>
            <select className="select" value={form.sku} onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}>
              {produtos.map((p) => <option key={p.sku} value={p.sku}>{p.sku} — {p.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block">Tipo de ajuste</label>
            <div className="flex gap-2">
              {(['entrada', 'saida'] as const).map((t) => (
                <button key={t} onClick={() => setForm((p) => ({ ...p, tipo: t }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                    form.tipo === t ? (t === 'entrada' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-red-500 text-white border-red-500')
                      : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}>
                  {t === 'entrada' ? '+ Entrada' : '− Saída'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Quantidade</label>
            <input type="number" min={1} className="input" value={form.quantidade}
              onChange={(e) => setForm((p) => ({ ...p, quantidade: Math.max(1, parseInt(e.target.value) || 1) }))} />
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Motivo (opcional)</label>
            <input className="input" placeholder="Ex: Inventário físico, perda, brinde…" value={form.motivo}
              onChange={(e) => setForm((p) => ({ ...p, motivo: e.target.value }))} />
          </div>
          {prod && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 flex items-center justify-between text-sm">
              <div className="text-center">
                <p className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">Atual</p>
                <p className="font-bold text-slate-800 dark:text-slate-100 text-lg">{estoqueAtual}</p>
              </div>
              <span className="text-slate-300 dark:text-slate-600 text-xl font-light">→</span>
              <div className="text-center">
                <p className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">Após ajuste</p>
                <p className={`font-bold text-lg ${form.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-500'}`}>{estoqueResultante}</p>
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={save}>Confirmar Ajuste</button>
        </div>
      </div>
    </div>
  );
}

// ─── AddCompraModal (Task 4: custo diff) ─────────────────────────────────────

type LinhaCompra = { sku: string; quantidadeEntrada: number; custoUnitario: number };
type CustoDiff   = { sku: string; nome: string; custoAnterior: number; custoNovo: number };

function AddCompraModal({ onClose }: { onClose: () => void }) {
  const toast         = useToast();
  const produtos      = useStore((s) => s.produtos);
  const addCompra     = useStore((s) => s.addCompra);
  const updateProduto = useStore((s) => s.updateProduto);
  const configuracoes = useStore((s) => s.configuracoes);

  const primeiroSku   = produtos[0]?.sku ?? '';
  const primeiroCusto = produtos[0]?.custoUnitario ?? 0;

  const [cab, setCab] = useState({
    data: new Date().toISOString().slice(0, 10),
    fornecedor: '', nfRef: '', pagamento: 'Pix', parcelas: 1,
    loja: configuracoes.lojas[0] ?? 'Ambas', observacoes: '',
  });
  const [linhas, setLinhas]       = useState<LinhaCompra[]>([
    { sku: primeiroSku, quantidadeEntrada: 1, custoUnitario: primeiroCusto },
  ]);
  const [custoDiffs, setCustoDiffs] = useState<CustoDiff[]>([]);

  const fc = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setCab((prev) => ({ ...prev, [k]: e.target.type === 'number' ? parseInt(e.target.value) || 1 : e.target.value }));

  const updateLinha = (i: number, field: keyof LinhaCompra, raw: string) => {
    setLinhas((prev) => {
      const next = [...prev];
      if (field === 'sku') {
        const prod = produtos.find((p) => p.sku === raw);
        next[i] = { ...next[i], sku: raw, custoUnitario: prod?.custoUnitario ?? next[i].custoUnitario };
      } else {
        next[i] = { ...next[i], [field]: parseFloat(raw) || 0 };
      }
      return next;
    });
  };

  const addLinha    = () => setLinhas((prev) => [...prev, { sku: primeiroSku, quantidadeEntrada: 1, custoUnitario: primeiroCusto }]);
  const removeLinha = (i: number) => setLinhas((prev) => prev.filter((_, idx) => idx !== i));
  const custoGeral  = linhas.reduce((s, l) => s + l.quantidadeEntrada * l.custoUnitario, 0);

  const save = () => {
    const diffs: CustoDiff[] = [];
    linhas.forEach((l) => {
      const prod     = produtos.find((p) => p.sku === l.sku);
      const custoTot = l.quantidadeEntrada * l.custoUnitario;
      addCompra({
        id: crypto.randomUUID(), ...cab,
        sku: l.sku, produto: prod?.nome ?? '',
        quantidadeEntrada: l.quantidadeEntrada, custoUnitario: l.custoUnitario,
        custoTotal: custoTot, valorParcela: custoTot / Math.max(1, cab.parcelas),
      });
      if (prod && Math.abs(prod.custoUnitario - l.custoUnitario) > 0.001) {
        diffs.push({ sku: l.sku, nome: prod.nome, custoAnterior: prod.custoUnitario, custoNovo: l.custoUnitario });
      }
    });
    toast(linhas.length === 1 ? `Compra de ${linhas[0].quantidadeEntrada} un. de ${linhas[0].sku} registrada.` : `${linhas.length} itens registrados na nota.`, 'success');
    if (diffs.length > 0) { setCustoDiffs(diffs); return; }
    onClose();
  };

  const applyDiffs = () => {
    custoDiffs.forEach((d) => updateProduto(d.sku, { custoUnitario: d.custoNovo }));
    toast(`Custo atualizado para ${custoDiffs.length} produto(s).`, 'info');
    onClose();
  };

  // ── custo diff screen ──
  if (custoDiffs.length > 0) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md">
          <div className="px-6 py-5 text-center">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Pencil size={18} className="text-amber-600" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Custo diferente detectado</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Deseja atualizar o custo cadastrado dos seguintes SKUs?</p>
            <div className="space-y-2 text-left">
              {custoDiffs.map((d) => (
                <div key={d.sku} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3 text-sm flex items-center justify-between">
                  <div>
                    <p className="font-mono font-medium text-slate-800 dark:text-slate-100">{d.sku}</p>
                    <p className="text-slate-400 dark:text-slate-500 text-xs">{d.nome}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 dark:text-slate-500 text-xs line-through">{fmt(d.custoAnterior)}</p>
                    <p className="text-emerald-600 font-bold">{fmt(d.custoNovo)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="px-6 pb-5 flex gap-3">
            <button className="btn-secondary flex-1 justify-center" onClick={onClose}>Não atualizar</button>
            <button className="btn-primary flex-1 justify-center" onClick={applyDiffs}>Sim, atualizar</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Registrar Nota de Compra</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 pb-0 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Data</label>
            <input type="date" className="input" value={cab.data} onChange={fc('data')} /></div>
          <div><label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Loja</label>
            <select className="select" value={cab.loja} onChange={fc('loja')}>
              {configuracoes.lojas.map((l) => <option key={l}>{l}</option>)}
            </select></div>
          <div><label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Fornecedor</label>
            <input className="input" placeholder="Ex: Lindomar" value={cab.fornecedor} onChange={fc('fornecedor')} /></div>
          <div><label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">NF / Ref.</label>
            <input className="input" value={cab.nfRef} onChange={fc('nfRef')} /></div>
          <div><label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Pagamento</label>
            <select className="select" value={cab.pagamento} onChange={fc('pagamento')}>
              <option>Pix</option><option>Boleto</option><option>Cartão</option><option>Dinheiro</option>
            </select></div>
          <div><label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Parcelas</label>
            <input type="number" min={1} className="input" value={cab.parcelas} onChange={fc('parcelas')} /></div>
          <div className="col-span-2"><label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Observações</label>
            <input className="input" value={cab.observacoes} onChange={fc('observacoes')} /></div>
        </div>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Itens</p>
            <button onClick={addLinha} className="btn-secondary py-1 px-3 text-xs"><Plus size={12} /> Adicionar item</button>
          </div>
          <div className="space-y-2">
            {linhas.map((l, i) => {
              const prod = produtos.find((p) => p.sku === l.sku);
              return (
                <div key={i} className="grid grid-cols-[1fr_80px_90px_80px_auto] gap-2 items-center bg-slate-50 dark:bg-slate-700/50 rounded-xl px-3 py-2.5">
                  <div>
                    <select className="select text-xs py-1.5" value={l.sku} onChange={(e) => updateLinha(i, 'sku', e.target.value)}>
                      {produtos.map((p) => <option key={p.sku} value={p.sku}>{p.sku} — {p.nome}</option>)}
                    </select>
                    {prod && <p className="text-[10px] text-slate-400 mt-0.5 pl-0.5">Custo cadastrado: {fmt(prod.custoUnitario)} · Estoque: {prod.estoqueAtual} un.</p>}
                  </div>
                  <div><label className="text-[10px] text-slate-400 block mb-0.5">Qtd.</label>
                    <input type="number" min={1} className="input text-xs py-1.5" value={l.quantidadeEntrada}
                      onChange={(e) => updateLinha(i, 'quantidadeEntrada', e.target.value)} /></div>
                  <div><label className="text-[10px] text-slate-400 block mb-0.5">Custo unit.</label>
                    <input type="number" step="0.01" className="input text-xs py-1.5" value={l.custoUnitario}
                      onChange={(e) => updateLinha(i, 'custoUnitario', e.target.value)} /></div>
                  <div className="text-right"><p className="text-[10px] text-slate-400 mb-0.5">Subtotal</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{fmt(l.quantidadeEntrada * l.custoUnitario)}</p></div>
                  <button onClick={() => removeLinha(i)} disabled={linhas.length === 1}
                    className="text-slate-300 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        <div className="px-6 pb-4">
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 flex gap-5 text-sm flex-wrap">
            <span className="text-slate-500 dark:text-slate-400">{linhas.length} item(ns) · Total: <span className="font-bold text-slate-900 dark:text-slate-100 ml-1">{fmt(custoGeral)}</span></span>
            {cab.parcelas > 1 && <span className="text-slate-400 dark:text-slate-500">{cab.parcelas}× de {fmt(custoGeral / cab.parcelas)}</span>}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={save}>Salvar {linhas.length > 1 ? `${linhas.length} itens` : 'Compra'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── EditCompraModal (Task 2) ─────────────────────────────────────────────────

function EditCompraModal({ compra, onClose }: { compra: Compra; onClose: () => void }) {
  const toast         = useToast();
  const produtos      = useStore((s) => s.produtos);
  const updateCompra  = useStore((s) => s.updateCompra);
  const updateProduto = useStore((s) => s.updateProduto);
  const configuracoes = useStore((s) => s.configuracoes);

  const [form, setForm] = useState({
    sku:              compra.sku,
    data:             compra.data,
    quantidadeEntrada: compra.quantidadeEntrada,
    custoUnitario:    compra.custoUnitario,
    fornecedor:       compra.fornecedor,
    nfRef:            compra.nfRef,
    pagamento:        compra.pagamento,
    parcelas:         compra.parcelas,
    loja:             compra.loja,
    observacoes:      compra.observacoes,
  });
  const [custoDiff, setCustoDiff] = useState<CustoDiff | null>(null);

  const prod     = produtos.find((p) => p.sku === form.sku);
  const custoTot = form.quantidadeEntrada * form.custoUnitario;

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const val = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    if (k === 'sku') {
      const p = produtos.find((x) => x.sku === e.target.value);
      setForm((prev) => ({ ...prev, sku: e.target.value, custoUnitario: p?.custoUnitario ?? prev.custoUnitario }));
    } else {
      setForm((prev) => ({ ...prev, [k]: val }));
    }
  };

  const save = () => {
    updateCompra(compra.id, { ...form, custoTotal: custoTot, valorParcela: custoTot / Math.max(1, form.parcelas) });
    if (prod && Math.abs(prod.custoUnitario - form.custoUnitario) > 0.001) {
      setCustoDiff({ sku: form.sku, nome: prod.nome, custoAnterior: prod.custoUnitario, custoNovo: form.custoUnitario });
      return;
    }
    toast(`Compra atualizada.`, 'success');
    onClose();
  };

  if (custoDiff) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm">
          <div className="px-6 py-5 text-center">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Pencil size={18} className="text-amber-600" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Custo diferente detectado</h3>
            <p className="text-slate-400 dark:text-slate-500 text-xs mb-3">Deseja atualizar o custo cadastrado de <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{custoDiff.sku}</span>?</p>
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl px-4 py-3 flex justify-around text-sm mb-4">
              <div className="text-center">
                <p className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">Anterior</p>
                <p className="text-slate-500 dark:text-slate-400 line-through">{fmt(custoDiff.custoAnterior)}</p>
              </div>
              <div className="text-center">
                <p className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">Novo</p>
                <p className="text-emerald-600 font-bold">{fmt(custoDiff.custoNovo)}</p>
              </div>
            </div>
          </div>
          <div className="px-6 pb-5 flex gap-3">
            <button className="btn-secondary flex-1 justify-center" onClick={() => { toast('Compra atualizada.', 'success'); onClose(); }}>Não atualizar</button>
            <button className="btn-primary flex-1 justify-center" onClick={() => { updateProduto(custoDiff.sku, { custoUnitario: custoDiff.custoNovo }); toast('Compra e custo atualizados.', 'success'); onClose(); }}>Sim, atualizar</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Editar Compra</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">SKU</label>
            <select className="select" value={form.sku} onChange={f('sku')}>
              {produtos.map((p) => <option key={p.sku} value={p.sku}>{p.sku} — {p.nome}</option>)}
            </select></div>
          <div><label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Data</label>
            <input type="date" className="input" value={form.data} onChange={f('data')} /></div>
          <div><label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Loja</label>
            <select className="select" value={form.loja} onChange={f('loja')}>
              {configuracoes.lojas.map((l) => <option key={l}>{l}</option>)}
            </select></div>
          <div><label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Qtd. Entrada</label>
            <input type="number" min={1} className="input" value={form.quantidadeEntrada} onChange={f('quantidadeEntrada')} /></div>
          <div><label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Custo Unit. (R$)</label>
            <input type="number" step="0.01" className="input" value={form.custoUnitario} onChange={f('custoUnitario')} /></div>
          <div><label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Fornecedor</label>
            <input className="input" value={form.fornecedor} onChange={f('fornecedor')} /></div>
          <div><label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">NF / Ref.</label>
            <input className="input" value={form.nfRef} onChange={f('nfRef')} /></div>
          <div><label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Pagamento</label>
            <select className="select" value={form.pagamento} onChange={f('pagamento')}>
              <option>Pix</option><option>Boleto</option><option>Cartão</option><option>Dinheiro</option>
            </select></div>
          <div><label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Parcelas</label>
            <input type="number" min={1} className="input" value={form.parcelas} onChange={f('parcelas')} /></div>
          <div className="col-span-2"><label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Observações</label>
            <textarea className="input resize-none" rows={2} value={form.observacoes} onChange={f('observacoes')} /></div>
          <div className="col-span-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-sm flex gap-5">
            <span className="text-slate-500 dark:text-slate-400">Custo Total: <span className="font-bold text-slate-800 dark:text-slate-100">{fmt(custoTot)}</span></span>
            {form.parcelas > 1 && <span className="text-slate-400 dark:text-slate-500">{form.parcelas}× de {fmt(custoTot / form.parcelas)}</span>}
            {prod && <span className="text-slate-500 dark:text-slate-400">Estoque após: <span className="font-bold text-emerald-600">{prod.estoqueAtual + (form.quantidadeEntrada - compra.quantidadeEntrada)} un.</span></span>}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={save}>Salvar Alterações</button>
        </div>
      </div>
    </div>
  );
}

// ─── EditProdutoModal (Task 5) ────────────────────────────────────────────────

function EditProdutoModal({ sku, onClose }: { sku: string; onClose: () => void }) {
  const toast         = useToast();
  const produtos      = useStore((s) => s.produtos);
  const updateProduto = useStore((s) => s.updateProduto);
  const configuracoes = useStore((s) => s.configuracoes);

  const prod = produtos.find((p) => p.sku === sku);
  const [form, setForm] = useState({
    nome:             prod?.nome ?? '',
    categoria:        prod?.categoria ?? '',
    custoUnitario:    prod?.custoUnitario ?? 0,
    estoqueSeguranca: prod?.estoqueSeguranca ?? 0,
    loja:             prod?.loja ?? configuracoes.lojas[0] ?? 'Ambas',
    ativo:            prod?.ativo ?? true,
  });

  if (!prod) return null;

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.type === 'number' ? parseFloat(e.target.value) || 0
              : e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked
              : e.target.value;
    setForm((prev) => ({ ...prev, [k]: val }));
  };

  const save = () => {
    updateProduto(sku, form);
    toast(`${sku} atualizado.`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Editar Produto</h3>
            <p className="text-xs font-mono text-slate-400">{sku}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div><label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Nome</label>
            <input className="input" value={form.nome} onChange={f('nome')} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Categoria</label>
              <input className="input" value={form.categoria} onChange={f('categoria')} /></div>
            <div><label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Loja</label>
              <select className="select" value={form.loja} onChange={f('loja')}>
                {[...configuracoes.lojas, 'Ambas'].map((l) => <option key={l}>{l}</option>)}
              </select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Custo Unitário (R$)</label>
              <input type="number" step="0.01" className="input" value={form.custoUnitario} onChange={f('custoUnitario')} /></div>
            <div><label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Estoque de Segurança</label>
              <input type="number" min={0} className="input" value={form.estoqueSeguranca} onChange={f('estoqueSeguranca')} /></div>
          </div>
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
            <input type="checkbox" id="ativo" checked={form.ativo} onChange={f('ativo')}
              className="w-4 h-4 accent-[#18B37A]" />
            <label htmlFor="ativo" className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer">Produto ativo</label>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={save}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Estoque() {
  const toast         = useToast();
  const produtosAll   = useStore((s) => s.produtos);
  const pedidos       = useStore((s) => s.pedidos);
  const compras       = useStore((s) => s.compras);
  const lojaFiltro    = useStore((s) => s.lojaFiltro);
  const produtos      = useMemo(
    () => lojaFiltro ? produtosAll.filter((p) => p.loja === lojaFiltro || p.loja === 'Ambas') : produtosAll,
    [produtosAll, lojaFiltro],
  );
  const deleteCompra  = useStore((s) => s.deleteCompra);
  const tarefas       = useStore((s) => s.tarefas);
  const addTarefa     = useStore((s) => s.addTarefa);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [tab,            setTab]           = useState<'posicao' | 'compras' | 'movimentacoes'>('posicao');
  const [showAdd,        setShowAdd]       = useState(false);
  const [showAjuste,     setShowAjuste]    = useState(false);
  const [deleteId,       setDeleteId]      = useState<string | null>(null);
  const [editCompra,     setEditCompra]    = useState<Compra | null>(null);
  const [editProdutoSku, setEditProdutoSku]= useState<string | null>(null);

  // ── Computed: Posição ──────────────────────────────────────────────────────
  const estoqueData = useMemo((): EstoqueItem[] => {
    const limite30d = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    return produtos.map((p) => {
      const vendas        = pedidos.filter((o) => o.sku === p.sku && (o.status === 'Concluído' || o.status === 'Enviado') && o.data >= limite30d);
      const totalUnid     = vendas.reduce((s, o) => s + o.unidadesEstoque, 0);
      const vendaDia      = totalUnid / 30;
      const diasCobertura = vendaDia > 0 ? Math.round(p.estoqueAtual / vendaDia) : Infinity;
      const ptReposicao   = Math.ceil(vendaDia * 14);
      const status        = getStatusEstoque(p.estoqueAtual, vendaDia, p.estoqueSeguranca);
      const entradas      = compras.filter((c) => c.sku === p.sku).reduce((s, c) => s + c.quantidadeEntrada, 0);
      return { ...p, vendaDia, diasCobertura, ptReposicao, status, valorEstoque: p.estoqueAtual * p.custoUnitario, entradas, saidas: totalUnid };
    });
  }, [produtos, pedidos, compras]);

  // Auto-create tasks for low/out-of-stock SKUs
  useEffect(() => {
    const PREFIXO = '[Estoque]';
    estoqueData.forEach((p) => {
      if (p.status !== 'Comprar' && p.status !== 'Estoque Baixo') return;
      const titulo   = `${PREFIXO} Repor: ${p.sku}`;
      const jaExiste = tarefas.some((t) => t.titulo === titulo && t.coluna !== 'done');
      if (jaExiste) return;
      const prioridade: PrioridadeTarefa = p.status === 'Comprar' ? 'alta' : 'media';
      addTarefa({ id: crypto.randomUUID(), titulo,
        descricao: `${p.nome} · ${p.estoqueAtual} un. em estoque${isFinite(p.diasCobertura) ? ` · ${p.diasCobertura}d de cobertura` : ''}`,
        coluna: 'todo', posicao: Date.now(), prioridade, criadoEm: new Date().toISOString() });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estoqueData]);

  // ── Computed: KPIs ─────────────────────────────────────────────────────────
  const totalEstoque    = estoqueData.reduce((s, p) => s + p.valorEstoque, 0);
  const precisamComprar = estoqueData.filter((p) => p.status === 'Comprar');

  const coberturaMedia = useMemo(() => {
    const comVenda = estoqueData.filter((p) => isFinite(p.diasCobertura));
    if (comVenda.length === 0) return null;
    return Math.round(comVenda.reduce((s, p) => s + (p.diasCobertura as number), 0) / comVenda.length);
  }, [estoqueData]);

  // Task 6: chart data
  const chartData = useMemo(() => {
    if (totalEstoque === 0) return [];
    return [...estoqueData]
      .filter((p) => p.valorEstoque > 0)
      .sort((a, b) => b.valorEstoque - a.valorEstoque)
      .slice(0, 8)
      .map((p) => ({ sku: p.sku, valor: p.valorEstoque, pct: (p.valorEstoque / totalEstoque) * 100, status: p.status }));
  }, [estoqueData, totalEstoque]);

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    exportXlsx(`estoque_${new Date().toISOString().slice(0, 10)}`, [{
      name: 'Posição de Estoque',
      headers: ['SKU', 'Produto', 'Categoria', 'Loja', 'Estoque Atual', 'Estoque Mínimo', 'Status',
        'Venda/Dia', 'Dias Cobertura', 'Custo Unit. (R$)', 'Valor Estoque (R$)'],
      rows: estoqueData.map((p) => [
        p.sku, p.nome, p.categoria, p.loja,
        p.estoqueAtual, p.estoqueSeguranca, p.status,
        xlsxNum(p.vendaDia), isFinite(p.diasCobertura) ? p.diasCobertura : '',
        xlsxNum(p.custoUnitario), xlsxNum(p.valorEstoque),
      ]),
    }]);
    toast(`${estoqueData.length} produtos exportados.`, 'success');
  };

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Estoque</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Posição em tempo real · últimos 30 dias</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn-secondary" onClick={handleExport}>
            <Download size={15} /> Exportar
          </button>
          <button className="btn-secondary" onClick={() => setShowAjuste(true)}>
            <SlidersHorizontal size={15} /> Ajuste Manual
          </button>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={15} /> Registrar Compra
          </button>
        </div>
      </div>

      {/* Tabs nav */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg p-1 w-fit">
        {([
          { key: 'posicao',       label: 'Posição Atual' },
          { key: 'compras',       label: 'Compras' },
          { key: 'movimentacoes', label: 'Movimentações' },
        ] as const).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t.key ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Posição ── */}
      {tab === 'posicao' && (
        <PosicaoTab
          estoqueData={estoqueData}
          totalEstoque={totalEstoque}
          chartData={chartData}
          precisamComprar={precisamComprar}
          coberturaMedia={coberturaMedia}
          produtosCount={produtos.length}
          onEditProduto={setEditProdutoSku}
          onAjuste={() => setShowAjuste(true)}
        />
      )}

      {/* ── Tab: Compras ── */}
      {tab === 'compras' && (
        <ComprasTab
          onEdit={setEditCompra}
          onDelete={setDeleteId}
        />
      )}

      {/* ── Tab: Movimentações ── */}
      {tab === 'movimentacoes' && (
        <MovimentacoesTab />
      )}

      {/* Modals */}
      {showAdd    && <AddCompraModal   onClose={() => setShowAdd(false)} />}
      {showAjuste && <AjusteModal      onClose={() => setShowAjuste(false)} />}
      {editCompra && <EditCompraModal  compra={editCompra} onClose={() => setEditCompra(null)} />}
      {editProdutoSku && <EditProdutoModal sku={editProdutoSku} onClose={() => setEditProdutoSku(null)} />}
      {deleteId && (
        <ConfirmDeleteModal
          onConfirm={() => { deleteCompra(deleteId); toast('Compra excluída e estoque revertido.', 'info'); setDeleteId(null); }}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
