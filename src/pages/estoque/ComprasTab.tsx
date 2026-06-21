import { useState, useMemo, useEffect } from 'react';
import { Search, Download, CalendarDays, X, Pencil, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Compra } from '../../types';
import { useStore } from '../../store';
import { fmt } from '../../utils/calculations';
import { useToast } from '../../components/Toast';
import { PaginationBar } from './PaginationBar';

interface ComprasTabProps {
  onEdit: (c: Compra) => void;
  onDelete: (id: string) => void;
}

export function ComprasTab({ onEdit, onDelete }: ComprasTabProps) {
  const toast   = useToast();
  const compras = useStore((s) => s.compras);

  const [compSearch,   setCompSearch]   = useState('');
  const [compDateFrom, setCompDateFrom] = useState('');
  const [compDateTo,   setCompDateTo]   = useState('');
  const [compPage,     setCompPage]     = useState(1);
  const [compPageSize, setCompPageSize] = useState(20);

  useEffect(() => setCompPage(1), [compSearch, compDateFrom, compDateTo]);

  const compFiltered = useMemo(() => {
    const q = compSearch.toLowerCase();
    return compras.filter((c) => {
      if (compDateFrom && c.data < compDateFrom) return false;
      if (compDateTo   && c.data > compDateTo)   return false;
      if (q && !c.sku.toLowerCase().includes(q) && !c.produto.toLowerCase().includes(q) && !c.fornecedor.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [compras, compSearch, compDateFrom, compDateTo]);

  const compPaginados = compFiltered.slice((compPage - 1) * compPageSize, compPage * compPageSize);

  const exportCompras = () => {
    const data = compFiltered.map((c) => ({
      Data: c.data, SKU: c.sku, Produto: c.produto,
      'Qtd.': c.quantidadeEntrada, 'Custo Unit. (R$)': c.custoUnitario,
      'Custo Total (R$)': c.custoTotal, Fornecedor: c.fornecedor,
      'NF/Ref.': c.nfRef, Pagamento: c.pagamento,
      Parcelas: c.parcelas, 'Valor Parcela (R$)': c.valorParcela,
      Loja: c.loja, Observações: c.observacoes,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Compras');
    XLSX.writeFile(wb, `compras_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast(`${compFiltered.length} compra(s) exportada(s).`, 'success');
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-8" placeholder="Buscar SKU, produto ou fornecedor…" value={compSearch}
            onChange={(e) => setCompSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5">
          <CalendarDays size={13} className="text-slate-400 flex-shrink-0" />
          <input type="date" className="text-xs text-slate-600 dark:text-slate-300 bg-transparent border-none outline-none w-32"
            value={compDateFrom} onChange={(e) => setCompDateFrom(e.target.value)} />
          <span className="text-slate-300 text-xs">–</span>
          <input type="date" className="text-xs text-slate-600 dark:text-slate-300 bg-transparent border-none outline-none w-32"
            value={compDateTo} onChange={(e) => setCompDateTo(e.target.value)} />
          {(compDateFrom || compDateTo) && (
            <button onClick={() => { setCompDateFrom(''); setCompDateTo(''); }}
              className="text-slate-300 hover:text-red-400 transition-colors ml-1">
              <X size={12} />
            </button>
          )}
        </div>
        <button className="btn-secondary" onClick={exportCompras}>
          <Download size={15} /> Exportar
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-440px)]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
              <tr>
                {['Data', 'SKU', 'Produto', 'Qtd.', 'Custo Unit.', 'Custo Total', 'Fornecedor', 'NF/Ref.', 'Pagamento', 'Parcelas', 'Valor Parcela', ''].map((h) => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {compPaginados.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-12 text-slate-400 text-sm">Nenhuma compra encontrada.</td></tr>
              ) : compPaginados.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{c.data}</td>
                  <td className="px-3 py-3 font-mono text-xs font-medium text-slate-700 dark:text-slate-300">{c.sku}</td>
                  <td className="px-3 py-3 text-slate-800 dark:text-slate-200 whitespace-nowrap">{c.produto}</td>
                  <td className="px-3 py-3 text-emerald-600 font-medium">{c.quantidadeEntrada}</td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{fmt(c.custoUnitario)}</td>
                  <td className="px-3 py-3 text-slate-800 dark:text-slate-200 font-medium">{fmt(c.custoTotal)}</td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{c.fornecedor || '—'}</td>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{c.nfRef || '—'}</td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{c.pagamento}</td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{c.parcelas}</td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{fmt(c.valorParcela)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => onEdit(c)}
                        className="text-slate-300 hover:text-shopee-500 transition-colors" title="Editar">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => onDelete(c.id)}
                        className="text-slate-300 hover:text-red-400 transition-colors" title="Excluir">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {compPaginados.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 sticky bottom-0">
                <tr className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <td colSpan={5} className="px-3 py-2.5">Total página</td>
                  <td className="px-3 py-2.5 text-slate-900 dark:text-slate-100">{fmt(compPaginados.reduce((s, c) => s + c.custoTotal, 0))}</td>
                  <td colSpan={6} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <PaginationBar page={compPage} total={compFiltered.length} pageSize={compPageSize}
          onPage={setCompPage} onPageSize={setCompPageSize} />
      </div>
    </div>
  );
}
